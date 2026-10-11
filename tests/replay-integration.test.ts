/**
 * replay-integration.test.ts — End-to-end recording with a real fake agent
 * (zero LLM calls): AgentRunner launches the built-in fake-agent-runner in a
 * real git worktree and the replay captures prompt, events and diff.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentRunner } from "../src/daemon/agent-runner";
import { DaemonState } from "../src/daemon/state";
import { loadConfig, WOMBO_DIR } from "../src/config";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import { ReplayStore } from "../src/lib/replay";
import { saveTaskToStore } from "../src/lib/task-store";
import type { Task } from "../src/lib/tasks";

const dirs: string[] = [];
const runners: AgentRunner[] = [];
const states: DaemonState[] = [];

afterEach(() => {
  for (const r of runners.splice(0)) r.destroy();
  for (const s of states.splice(0)) s.destroy();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
}

async function waitFor(cond: () => boolean, label: string, timeoutMs = 45_000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await Bun.sleep(25);
  }
}

describe("replay recording with fake agents", () => {
  test("a fake-agent execution is recorded end to end", async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "replay-int-")));
    dirs.push(root);
    git(root, "init", "-q", "-b", "main");
    git(root, "config", "user.email", "t@example.com");
    git(root, "config", "user.name", "T");
    writeFileSync(join(root, "README.md"), "# fixture\n");
    mkdirSync(join(root, WOMBO_DIR, "tasks"), { recursive: true });
    writeFileSync(
      join(root, WOMBO_DIR, "config.json"),
      JSON.stringify({ baseBranch: "main", install: { command: "true" }, build: { command: "true" }, portless: { enabled: false } }),
    );
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "init");

    const config = loadConfig(root);
    const state = new DaemonState(root);
    state.setBaseBranch("main");
    states.push(state);
    const runner = new AgentRunner({ projectRoot: root, config, sessionId: "wave-int" }, state);
    runners.push(runner);

    const task: Task = {
      id: "fake-1",
      title: "Fake one",
      description: "FAKE_SLEEP_MS=50",
      status: "planned",
      completion: 0,
      difficulty: "easy",
      priority: "medium",
      effort: "PT1H",
      depends_on: [],
      started_at: null,
      ended_at: null,
      constraints: [],
      forbidden: [],
      references: [],
      notes: [],
      subtasks: [],
      agent: FAKE_AGENT_SENTINEL,
    } as Task;
    saveTaskToStore(root, config, task);
    runner.submitTask(task);
    const executionId = state.getAgent("fake-1")!.analytics!.execution_id;

    const store = new ReplayStore(root);
    await waitFor(() => store.load("fake-1", executionId)?.end != null, "replay end record");

    const replay = store.load("fake-1", executionId)!;
    expect(replay.diagnostics).toEqual([]);
    expect(replay.header).toMatchObject({ task_id: "fake-1", execution_id: executionId, wave_id: "wave-int", agent: FAKE_AGENT_SENTINEL });
    expect(replay.prompt).toContain("FAKE_SLEEP_MS=50");
    const kinds = replay.records.map((r) => r.kind);
    expect(kinds[0]).toBe("header");
    expect(kinds).toContain("attempt");
    const events = replay.records.filter((r) => r.kind === "event").map((r: any) => r.event);
    expect(events.map((e) => e.type)).toContain("step_start");
    expect(events.map((e) => e.type)).toContain("step_finish");
    expect(events.some((e) => e.type === "step_finish" && e.reason === "stop")).toBe(true);
    expect(replay.diff?.files.length).toBeGreaterThan(0);
    expect(replay.diff?.diff).toContain("diff --git");
    expect(replay.end?.outcome).toBe("succeeded");
    // timestamps are monotonic
    const ts = replay.records.map((r) => Date.parse(r.t));
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    // replay file name matches the analytics execution
    expect(replay.path.endsWith(`fake-1/${executionId}.jsonl`)).toBe(true);
  }, 60_000);
});
