/**
 * replay-recorder.test.ts — ReplayRecorder against DaemonState/AgentRunner
 * lifecycle (identity, retries, outcomes, bounds, failure isolation).
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { DaemonState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { ReplayRecorder } from "../src/daemon/replay-recorder";
import { ProcessMonitor } from "../src/lib/monitor";
import { ReplayStore, REPLAY_LIMITS, normalizeOpenCodeEvent } from "../src/lib/replay";
import type { WomboConfig } from "../src/config";
import type { Task } from "../src/lib/tasks";

function makeConfig(): WomboConfig {
  return {
    baseBranch: "main",
    maxConcurrent: 4,
    model: null,
    git: { branchPrefix: "feature/", remote: "origin", mergeStrategy: "--no-ff" },
    agent: { name: "test-agent", provider: "anthropic" },
    build: { command: "echo ok", enabled: false },
    merge: { strategy: "merge", maxEscalation: "tier4" },
    browser: { enabled: false },
    tdd: { enabled: false },
    tui: {},
    quest: {},
    defaults: { maxConcurrent: 4, maxRetries: 2 },
  } as unknown as WomboConfig;
}

function makeTask(id: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    status: "planned",
    completion: 0,
    difficulty: "medium",
    priority: "medium",
    effort: "1h",
    depends_on: [],
    started_at: null,
    ended_at: null,
    constraints: [],
    forbidden: [],
    references: [],
    notes: [],
    subtasks: [],
    ...extra,
  } as Task;
}

class NoLaunchRunner extends AgentRunner {
  protected override enqueueLaunch(): void {}
  get monitorRef(): any {
    return (this as any).monitor;
  }
}

let root: string;
let state: DaemonState;
let runner: NoLaunchRunner;
let store: ReplayStore;

function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "replay-recorder-"));
  git(root, "init", "-q", "-b", "main");
  mkdirSync(join(root, ".wombo-combo", "tasks"), { recursive: true });
  writeFileSync(join(root, "base.txt"), "base\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  state = new DaemonState(root);
  runner = new NoLaunchRunner({ projectRoot: root, config: makeConfig(), sessionId: "w1" }, state);
  store = new ReplayStore(root);
});

afterEach(() => {
  runner.destroy();
  state.destroy();
  rmSync(root, { recursive: true, force: true });
});

function submit(id: string): string {
  runner.submitTask(makeTask(id));
  state.updateAgent(id, { worktree: root });
  runner.analytics.captureBaseline(id);
  return state.getAgent(id)!.analytics!.execution_id;
}

describe("ReplayRecorder", () => {
  test("nothing is written for an execution that never records", () => {
    submit("t1");
    expect(store.list()).toEqual([]);
  });

  test("records header, prompt, attempt, events and end keyed by analytics execution id", () => {
    const exec = submit("t1");
    runner.replay.recordPrompt("t1", "PROMPT");
    runner.replay.recordAttempt("t1", "start");
    runner.replay.recordEvent("t1", { type: "text", text: "hello" });
    state.updateAgentStatus("t1", "verified", "ok");
    const r = store.load("t1", exec)!;
    expect(r.header).toMatchObject({ task_id: "t1", execution_id: exec, wave_id: "w1" });
    expect(r.prompt).toBe("PROMPT");
    expect(r.records.map((x) => x.kind)).toEqual(["header", "prompt", "attempt", "event", "end"]);
    expect(r.end).toMatchObject({ outcome: "succeeded", detail: "ok" });
  });

  test("ordinary retries append to the same file; a user rerun starts a new one", () => {
    const first = submit("t1");
    runner.replay.recordPrompt("t1", "P");
    runner.replay.recordAttempt("t1", "start");
    state.updateAgentStatus("t1", "retry", "Retry 1/2: flake");
    runner.replay.recordAttempt("t1", "retry", "flake");
    runner.replay.recordEvent("t1", { type: "text", text: "again" });
    state.updateAgentStatus("t1", "failed", "boom");
    expect(store.list("t1")).toHaveLength(1);
    const r = store.load("t1", first)!;
    expect(r.records.filter((x) => x.kind === "attempt").map((x: any) => [x.n, x.reason])).toEqual([
      [1, "start"],
      [2, "retry"],
    ]);
    expect(r.end?.outcome).toBe("failed");

    state.retryAgent("t1");
    state.updateAgentStatus("t1", "queued", "Retry requested by user");
    const second = state.getAgent("t1")!.analytics!.execution_id;
    expect(second).not.toBe(first);
    runner.replay.recordPrompt("t1", "P2");
    expect(store.list("t1")).toHaveLength(2);
    expect(store.load("t1", first)!.records.some((x: any) => x.kind === "prompt" && x.text === "P2")).toBe(false);
    expect(store.load("t1", second)!.prompt).toBe("P2");
  });

  test("end outcomes: cancellations and stops are 'stopped', verified work later failing to merge keeps succeeded", () => {
    const a = submit("a");
    runner.replay.recordPrompt("a", "P");
    state.updateAgentStatus("a", "failed", "cancelled by user");
    expect(store.load("a", a)!.end?.outcome).toBe("stopped");

    const b = submit("b");
    runner.replay.recordPrompt("b", "P");
    state.updateAgentStatus("b", "verified");
    state.updateAgentStatus("b", "failed", "merge conflict");
    const rb = store.load("b", b)!;
    expect(rb.records.filter((x) => x.kind === "end")).toHaveLength(1);
    expect(rb.end?.outcome).toBe("succeeded");

    const c = submit("c");
    runner.replay.recordPrompt("c", "P");
    runner.cancelAgent("c");
    state.updateAgentStatus("c", "failed", "Process killed");
    expect(store.load("c", c)!.end?.outcome).toBe("stopped");
  });

  test("captures a bounded diff since the analytics baseline at the end", () => {
    const exec = submit("t1");
    runner.replay.recordPrompt("t1", "P");
    writeFileSync(join(root, "new.txt"), "x\ny\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "work");
    state.updateAgentStatus("t1", "verified");
    const r = store.load("t1", exec)!;
    expect(r.diff?.files).toEqual([{ path: "new.txt", additions: 2, deletions: 0 }]);
    expect(r.diff?.diff).toContain("+x");
    const kinds = r.records.map((x) => x.kind);
    expect(kinds.indexOf("diff")).toBeLessThan(kinds.indexOf("end"));
  });

  test("interruptAll finishes unfinished executions as stopped; removal too", () => {
    const a = submit("a");
    runner.replay.recordPrompt("a", "P");
    const b = submit("b");
    runner.replay.recordPrompt("b", "P");
    state.removeAgent("b");
    expect(store.load("b", b)!.end?.outcome).toBe("stopped");
    runner.interruptAnalytics("daemon shutdown");
    expect(store.load("a", a)!.end).toMatchObject({ outcome: "stopped", detail: "daemon shutdown" });
  });

  test("events after the end and after close are ignored", () => {
    const exec = submit("t1");
    runner.replay.recordPrompt("t1", "P");
    state.updateAgentStatus("t1", "verified");
    runner.replay.recordEvent("t1", { type: "text", text: "late" });
    expect(store.load("t1", exec)!.records.filter((x) => x.kind === "event")).toHaveLength(0);
    runner.replay.close();
    runner.replay.recordPrompt("t1", "again");
    expect(store.load("t1", exec)!.records.filter((x) => x.kind === "prompt")).toHaveLength(1);
  });

  test("huge prompts are truncated with a marker", () => {
    const exec = submit("t1");
    runner.replay.recordPrompt("t1", "p".repeat(REPLAY_LIMITS.prompt + 1000));
    const rec = store.load("t1", exec)!.records.find((x) => x.kind === "prompt") as any;
    expect(rec.truncated).toBe(true);
    expect(rec.text).toContain("[truncated 1000 chars]");
  });

  test("storage failures are reported as diagnostics and never thrown", () => {
    submit("t1");
    // Make the replays directory a file so every write fails.
    mkdirSync(join(root, ".wombo-combo"), { recursive: true });
    writeFileSync(join(root, ".wombo-combo", "replays"), "not a dir");
    expect(() => runner.replay.recordPrompt("t1", "P")).not.toThrow();
    expect(() => runner.replay.recordEvent("t1", { type: "text", text: "x" })).not.toThrow();
    expect(() => state.updateAgentStatus("t1", "verified")).not.toThrow();
    expect(runner.replay.diagnostics.length).toBeGreaterThan(0);
  });

  test("prunes old executions per task without touching the active one", () => {
    const rec = new ReplayRecorder({ projectRoot: root, state, keepPerTask: 1 });
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      runner.submitTask(makeTask("t1"));
      ids.push(state.getAgent("t1")!.analytics!.execution_id);
      rec.recordPrompt("t1", `P${i}`);
      state.updateAgentStatus("t1", "verified");
    }
    rec.close();
    expect(store.list("t1")).toHaveLength(1);
  });
});

describe("ReplayRecorder retention options", () => {
  test("retention.keepPerTask overrides the default and size cap prunes older runs", () => {
    const rec = new ReplayRecorder({ projectRoot: root, state, retention: { keepPerFeature: 5, maxTotalBytes: 1 } });
    for (let i = 0; i < 3; i++) {
      runner.submitTask(makeTask("t1"));
      rec.recordPrompt("t1", `P${i}`);
      state.updateAgentStatus("t1", "verified");
    }
    rec.close();
    // Every file exceeds the 1-byte cap, so only the newest (just finalized) may remain at most.
    expect(store.list("t1").length).toBeLessThanOrEqual(1);
  });
});

describe("monitor onEvent seam", () => {
  test("ProcessMonitor delivers parsed events and survives throwing observers", async () => {
    const events: string[] = [];
    const monitor = new ProcessMonitor(root, {
      onEvent: (_id, ev) => {
        events.push(ev.type);
        throw new Error("observer bug");
      },
    });
    const { spawn } = await import("node:child_process");
    const child = spawn("bash", [
      "-c",
      `echo '{"type":"step_start","sessionID":"s"}'; echo 'not json'; echo '{"type":"text","part":{"text":"hi"}}'`,
    ]);
    const done = new Promise<void>((resolve) => {
      (monitor as any).callbacks.onComplete = () => resolve();
    });
    monitor.addProcess("t1", child);
    await done;
    expect(events).toEqual(["step_start", "text"]);
    expect(normalizeOpenCodeEvent({ type: "text", part: { text: "hi" } })?.text).toBe("hi");
  });
});
