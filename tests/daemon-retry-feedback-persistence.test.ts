/**
 * Retry feedback durability: review findings handed to the next attempt are
 * stored on the agent record (daemon-state.json) so a daemon restart, or a
 * failed relaunch, does not lose them.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { FeedbackStore } from "../src/daemon/runner/feedback-store";
import { DEFAULT_CONFIG, type WomboConfig } from "../src/config";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import { useHermeticGitEnv } from "./helpers/post-merge-fixture";
import { waitFor } from "./helpers/wait-for";

let restoreEnv: () => void;
beforeAll(() => { restoreEnv = useHermeticGitEnv().restore; });
afterAll(() => restoreEnv());

const dirs: string[] = [];
const closers: Array<() => void> = [];
afterEach(() => {
  for (const c of closers.splice(0)) c();
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function makeRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "retry-fb-"));
  mkdirSync(join(dir, ".wombo-combo", "tasks"), { recursive: true });
  dirs.push(dir);
  return dir;
}

const config = {
  ...DEFAULT_CONFIG,
  baseBranch: "main",
  build: { command: "echo ok", enabled: false },
  tdd: { enabled: false },
  defaults: { ...DEFAULT_CONFIG.defaults, maxConcurrent: 4, maxRetries: 2 },
  tasksDir: "tasks",
  archiveDir: "archive",
} as WomboConfig;

function openState(root: string): DaemonState {
  const state = new DaemonState(root);
  state.load();
  closers.push(() => state.destroy());
  return state;
}

function openRunner(root: string, state: DaemonState): AgentRunner {
  const runner = new AgentRunner({ projectRoot: root, config }, state);
  closers.push(() => runner.destroy());
  return runner;
}

function seed(state: DaemonState, root: string, extra: Record<string, unknown> = {}) {
  const agent = createDaemonAgentState({
    featureId: "t1", taskTitle: "Task t1", branch: "feature/t1", baseBranch: "main", worktree: root,
  });
  Object.assign(agent, { status: "retry", sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL, retries: 1 }, extra);
  state.addAgent(agent);
}

describe("FeedbackStore backed by daemon state", () => {
  test("set writes retryFeedback to the agent record; take is get-and-clear", () => {
    const root = makeRoot();
    const state = openState(root);
    seed(state, root);
    const store = new FeedbackStore(state);
    store.set("t1", "fix the edge case");
    expect(state.getAgent("t1")!.retryFeedback).toBe("fix the edge case");
    expect(store.take("t1")).toBe("fix the edge case");
    expect(state.getAgent("t1")!.retryFeedback).toBeUndefined();
    expect(store.take("t1")).toBeUndefined();
  });

  test("feedback survives a daemon restart through daemon-state.json", () => {
    const root = makeRoot();
    const first = openState(root);
    seed(first, root);
    new FeedbackStore(first).set("t1", "persist me");
    first.save();

    const second = openState(root);
    expect(new FeedbackStore(second).get("t1")).toBe("persist me");
    expect(second.getAgent("t1")!.retries).toBe(1);
  });

  test("old state files without the field still load", () => {
    const root = makeRoot();
    const first = openState(root);
    seed(first, root);
    first.save();
    const raw = readFileSync(join(root, ".wombo-combo", "daemon-state.json"), "utf-8");
    expect(raw).not.toContain("retryFeedback");
    const second = openState(root);
    expect(new FeedbackStore(second).get("t1")).toBeUndefined();
  });

  test("retryFeedback is never sent to clients", () => {
    const root = makeRoot();
    const state = openState(root);
    seed(state, root);
    new FeedbackStore(state).set("t1", "secret");
    const snap = state.getSnapshot();
    expect(JSON.stringify(snap)).not.toContain("retryFeedback");
    expect(JSON.stringify(snap)).not.toContain("secret");
  });
});

describe("relaunch after restart", () => {
  test("a new runner on reloaded state hands the persisted feedback to retryHeadless once", async () => {
    const root = makeRoot();
    const first = openState(root);
    seed(first, root, { error: "FAKE_SLEEP_MS=41" });
    new FeedbackStore(first).set("t1", "FAKE_SLEEP_MS=37 review says no");
    first.save();

    const state = openState(root);
    const runner = openRunner(root, state);
    const output: string[] = [];
    state.subscribe((type, payload: any) => { if (type === "evt:agent-output") output.push(payload.data); });

    (runner as any).handleRetry("t1");
    expect(state.getAgent("t1")!.retryFeedback).toBeUndefined();
    await waitFor(() => output.join("").includes("sleep: 37ms"), "fake agent to echo the persisted feedback");
  });

  test("a failed relaunch keeps the feedback for the next attempt", () => {
    const root = makeRoot();
    const state = openState(root);
    // An unknown forced profile makes route resolution throw before any spawn
    seed(state, root, { agentName: "codex", profile: "no-such-profile", error: "boom" });
    new FeedbackStore(state).set("t1", "keep me");
    const runner = openRunner(root, state);

    (runner as any).handleRetry("t1");
    expect(state.getAgent("t1")!.status).toBe("queued");
    expect(state.getAgent("t1")!.retryFeedback).toBe("keep me");
  });
});
