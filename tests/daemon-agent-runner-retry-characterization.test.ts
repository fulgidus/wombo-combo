/**
 * daemon-agent-runner-retry-characterization.test.ts — Regression suite that
 * pins down TODAY's retry semantics of AgentRunner / DaemonState / Scheduler.
 *
 * These tests describe current behaviour, not desired behaviour. They are the
 * safety net for the agent-process-supervision quest: later refactors must
 * keep them green. Where current behaviour looks questionable the test says so
 * in a "QUIRK" comment (and a tracking task exists).
 *
 * Covered retry paths:
 *   1. monitor failure       — buildCallbacks().onError
 *   2. build failure         — handleBuildVerification
 *   3. handleRetry           — requeue / blocked / throw / success
 *   4. maxRetries resolution — config.defaults.maxRetries + setMaxRetries()
 *   5. reapDeadProcesses     — "retry" safety net
 *   6. review feedback       — handed to retryHeadless once, then cleared
 *   7. user retry            — DaemonState.retryAgent / Scheduler.retryAgent
 *   8. crash and restart     — real fake-agent process crashing, then restarting
 *
 * No real harness CLI and no network: processes are the built-in fake agent
 * (src/lib/fake-agent-runner.ts) and prompts steer it via FAKE_* directives.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState, type InternalAgentState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { Scheduler } from "../src/daemon/scheduler";
import { DEFAULT_CONFIG, type WomboConfig } from "../src/config";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import { createBlankQuest } from "../src/lib/quest";
import { saveQuest } from "../src/lib/quest-store";
import { createBlankTask, loadFeatures, saveTaskToStore } from "../src/lib/tasks";
import type { Task } from "../src/lib/tasks";
import { git, commitAll, makeRepo, writeRepoFile } from "./helpers/git-repo";
import { useHermeticGitEnv } from "./helpers/post-merge-fixture";
import { waitFor } from "./helpers/wait-for";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let restoreEnv: () => void;
beforeAll(() => { restoreEnv = useHermeticGitEnv().restore; });
afterAll(() => restoreEnv());

const dirs: string[] = [];
const runners: AgentRunner[] = [];
const states: DaemonState[] = [];
afterEach(() => {
  for (const r of runners.splice(0)) r.destroy();
  for (const s of states.splice(0)) s.destroy();
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "retry-char-"));
  mkdirSync(join(dir, ".wombo-combo", "tasks"), { recursive: true });
  dirs.push(dir);
  return dir;
}

function makeConfig(overrides: Partial<WomboConfig> = {}): WomboConfig {
  return {
    ...DEFAULT_CONFIG,
    baseBranch: "main",
    build: { command: "echo ok", enabled: false },
    tdd: { enabled: false },
    defaults: { ...DEFAULT_CONFIG.defaults, maxConcurrent: 4, maxRetries: 2 },
    tasksDir: "tasks",
    archiveDir: "archive",
    ...overrides,
  } as WomboConfig;
}

interface StatusEvent { featureId: string; previous: string; status: string; detail?: string }

interface Env {
  root: string;
  state: DaemonState;
  runner: AgentRunner;
  /** Every evt:agent-status-change, in order */
  events: StatusEvent[];
  /** Raw agent stdout chunks (evt:agent-output) */
  output: string[];
  /** cancelDownstream calls (the real implementation still runs) */
  cancelled: string[];
  /** rescueChainPredecessors calls (replaced by a recorder) */
  rescued: string[];
  /** attemptMerge calls (replaced by a recorder; no git merge happens) */
  merges: string[];
}

function makeEnv(opts: { root?: string; config?: WomboConfig } = {}): Env {
  const root = opts.root ?? makeTempDir();
  const config = opts.config ?? makeConfig();
  const state = new DaemonState(root);
  states.push(state);
  const runner = new AgentRunner({ projectRoot: root, config }, state);
  runners.push(runner);

  const env: Env = { root, state, runner, events: [], output: [], cancelled: [], rescued: [], merges: [] };
  state.subscribe((type, payload: any) => {
    if (type === "evt:agent-status-change") {
      env.events.push({
        featureId: payload.featureId,
        previous: payload.previousStatus,
        status: payload.newStatus,
        detail: payload.detail,
      });
    }
    if (type === "evt:agent-output") env.output.push(payload.data);
  });

  const realCancel = state.cancelDownstream.bind(state);
  state.cancelDownstream = (id: string) => {
    env.cancelled.push(id);
    return realCancel(id);
  };
  (runner as any).rescueChainPredecessors = (id: string) => { env.rescued.push(id); };
  (runner as any).attemptMerge = async (id: string) => { env.merges.push(id); };
  return env;
}

function addAgent(env: Env, id: string, extra: Partial<InternalAgentState> & { baseBranch?: string; maxRetries?: number } = {}): InternalAgentState {
  const { baseBranch, maxRetries, ...fields } = extra;
  const agent = createDaemonAgentState({
    featureId: id,
    taskTitle: `Task ${id}`,
    branch: `feature/${id}`,
    baseBranch: baseBranch ?? "main",
    worktree: env.root,
    maxRetries,
  });
  Object.assign(agent, fields);
  env.state.addAgent(agent);
  // Seeding is not part of the behaviour under test: drop its "added" event
  for (let i = env.events.length - 1; i >= 0; i--) {
    if (env.events[i]!.featureId === id && env.events[i]!.detail === "Agent added to daemon") env.events.splice(i, 1);
  }
  return env.state.getAgent(id)!;
}

const callbacks = (env: Env) => (env.runner as any).buildCallbacks() as {
  onError(id: string, error: string): void;
  onComplete(id: string): void;
};
const handleRetry = (env: Env, id: string) => (env.runner as any).handleRetry(id) as void;
const verify = (env: Env, id: string) => (env.runner as any).handleBuildVerification(id) as Promise<void>;
const detailsFor = (env: Env, id: string, status: string) =>
  env.events.filter((e) => e.featureId === id && e.status === status).map((e) => e.detail);

// ---------------------------------------------------------------------------
// 1. Monitor failure path — buildCallbacks().onError
//
// QUIRK (off-by-one in the retry message): getAgent() returns the live state
// object, so updateAgent({ retries: agent.retries + 1 }) mutates it before the
// status detail is formatted with `agent.retries + 1`. The detail therefore
// reads one ahead of the stored counter: the first retry says "Retry 2/2" while
// agent.retries is 1, and the last allowed one says "Retry 3/2". The same
// happens for "Build failed, retry N/M". Encoded as-is; tracked by the task
// bug-retry-message-off-by-one.
// ---------------------------------------------------------------------------

describe("onError (monitor failure)", () => {
  test("below the limit: retries+1, error set, status retry 'Retry N/M: <error>', then handleRetry runs", () => {
    const env = makeEnv();
    addAgent(env, "a", { maxRetries: 2, status: "running", activity: "coding" });

    callbacks(env).onError("a", "boom");

    const agent = env.state.getAgent("a")!;
    expect(agent.retries).toBe(1);
    expect(agent.error).toBe("boom");
    expect(detailsFor(env, "a", "retry")).toEqual(["Retry 2/2: boom"]); // QUIRK: stored counter is 1
    // handleRetry ran right after: no session id, so the agent is re-queued
    expect(agent.status).toBe("queued");
    expect(detailsFor(env, "a", "queued")).toEqual(["No session, re-queuing"]);
    expect(env.events.map((e) => e.status)).toEqual(["retry", "queued"]);
    // neither the activity nor the downstream/chain machinery is touched
    expect(agent.activity).toBe("coding");
    expect(env.cancelled).toEqual([]);
    expect(env.rescued).toEqual([]);
  });

  test("the counter keeps rising across consecutive failures until the limit", () => {
    const env = makeEnv();
    addAgent(env, "a", { maxRetries: 3, status: "running" });

    callbacks(env).onError("a", "e1");
    callbacks(env).onError("a", "e2");
    expect(env.state.getAgent("a")!.retries).toBe(2);
    expect(detailsFor(env, "a", "retry")).toEqual(["Retry 2/3: e1", "Retry 3/3: e2"]); // QUIRK: one ahead
    expect(env.state.getAgent("a")!.error).toBe("e2");
    expect(env.state.getAgent("a")!.status).toBe("queued");
  });

  test("at retries == maxRetries: failed, error set, cancelDownstream and rescueChainPredecessors called", () => {
    const env = makeEnv();
    addAgent(env, "a", { maxRetries: 2, retries: 2, status: "running", dependedOnBy: ["b"] });
    addAgent(env, "b", { dependsOn: ["a"] });

    callbacks(env).onError("a", "fatal");

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("failed");
    expect(agent.error).toBe("fatal");
    expect(agent.retries).toBe(2); // not incremented past the limit
    expect(detailsFor(env, "a", "failed")).toEqual(["fatal"]);
    expect(detailsFor(env, "a", "retry")).toEqual([]);
    expect(env.cancelled).toEqual(["a"]);
    expect(env.rescued).toEqual(["a"]);
    // downstream really was cancelled by the real cancelDownstream
    expect(env.state.getAgent("b")!.status).toBe("failed");
    expect(env.state.getAgent("b")!.error).toContain('Dependency "a" failed');
  });

  test("maxRetries 0: the very first failure is final", () => {
    const env = makeEnv();
    addAgent(env, "a", { maxRetries: 0, status: "running" });

    callbacks(env).onError("a", "nope");

    expect(env.state.getAgent("a")!.status).toBe("failed");
    expect(env.state.getAgent("a")!.retries).toBe(0);
    expect(env.cancelled).toEqual(["a"]);
  });

  test("unknown agent: ignored without events", () => {
    const env = makeEnv();
    callbacks(env).onError("ghost", "boom");
    expect(env.events).toEqual([]);
    expect(env.cancelled).toEqual([]);
    expect(env.rescued).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. Build-failure path — handleBuildVerification
// ---------------------------------------------------------------------------

describe("handleBuildVerification (build failure)", () => {
  const failingBuild = (script = "echo BUILD-BROKEN; exit 1") =>
    makeConfig({ build: { command: script, enabled: true, timeout: 20_000 } as any });

  test("below the limit: retries+1, 'Build failed: …' error, 'Build failed, retry N/M', then handleRetry", async () => {
    const env = makeEnv({ config: failingBuild() });
    addAgent(env, "a", { maxRetries: 2, status: "completed" });

    await verify(env, "a");

    const agent = env.state.getAgent("a")!;
    expect(agent.buildPassed).toBe(false);
    expect(agent.retries).toBe(1);
    expect(agent.error).toStartWith("Build failed: ");
    expect(agent.error).toContain("BUILD-BROKEN");
    expect(detailsFor(env, "a", "retry")).toEqual(["Build failed, retry 2/2"]); // QUIRK: stored counter is 1
    // handleRetry ran: no session id, so re-queued for a fresh launch
    expect(agent.status).toBe("queued");
    expect(detailsFor(env, "a", "queued")).toEqual(["No session, re-queuing"]);
    expect(agent.activity).toBe("Running build verification...");
    expect(env.merges).toEqual([]);
    expect(env.cancelled).toEqual([]);
  });

  test("error carries at most the first 500 chars of the combined error summary", async () => {
    const env = makeEnv({ config: failingBuild(`head -c 3000 /dev/zero | tr '\\0' 'x'; exit 1`) });
    addAgent(env, "a", { maxRetries: 1, status: "completed" });

    await verify(env, "a");

    const agent = env.state.getAgent("a")!;
    expect(agent.buildOutput!.length).toBeGreaterThan(500);
    expect(agent.error).toBe(`Build failed: ${agent.buildOutput!.slice(0, 500)}`);
  });

  test("emits evt:build-result passed=false", async () => {
    const env = makeEnv({ config: failingBuild() });
    addAgent(env, "a", { maxRetries: 1, status: "completed" });
    const results: any[] = [];
    env.state.subscribe((type, payload) => { if (type === "evt:build-result") results.push(payload); });

    await verify(env, "a");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ featureId: "a", passed: false });
    expect(results[0].output).toContain("BUILD-BROKEN");
  });

  test("at retries == maxRetries: failed 'Build failed, retries exhausted', error set, cancelDownstream + rescue", async () => {
    const env = makeEnv({ config: failingBuild() });
    addAgent(env, "a", { maxRetries: 1, retries: 1, status: "completed", dependedOnBy: ["b"] });
    addAgent(env, "b", { dependsOn: ["a"] });

    await verify(env, "a");

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("failed");
    expect(detailsFor(env, "a", "failed")).toEqual(["Build failed, retries exhausted"]);
    expect(agent.error).toStartWith("Build failed: ");
    expect(agent.retries).toBe(1);
    expect(env.cancelled).toEqual(["a"]);
    expect(env.rescued).toEqual(["a"]);
    expect(env.state.getAgent("b")!.status).toBe("failed");
    expect(env.merges).toEqual([]);
  });

  test("repeated build failures walk the counter to the limit, then fail", async () => {
    const env = makeEnv({ config: failingBuild() });
    addAgent(env, "a", { maxRetries: 2, status: "completed" });

    await verify(env, "a"); // retry 1/2 -> queued
    env.state.updateAgentStatus("a", "completed"); // the re-launched agent finished again
    await verify(env, "a"); // retry 2/2 -> queued
    env.state.updateAgentStatus("a", "completed");
    await verify(env, "a"); // exhausted

    // QUIRK: one ahead of the stored counter (1 and 2), so the last reads "3/2"
    expect(detailsFor(env, "a", "retry")).toEqual(["Build failed, retry 2/2", "Build failed, retry 3/2"]);
    expect(detailsFor(env, "a", "failed")).toEqual(["Build failed, retries exhausted"]);
    expect(env.state.getAgent("a")!.retries).toBe(2);
  });

  test("a passing build verifies and merges without touching the counters", async () => {
    const env = makeEnv({ config: makeConfig({ build: { command: "true", enabled: true, timeout: 20_000 } as any }) });
    addAgent(env, "a", { maxRetries: 2, status: "completed" });

    await verify(env, "a");

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("verified");
    expect(agent.retries).toBe(0);
    expect(agent.error).toBeNull();
    expect(env.merges).toEqual(["a"]);
  });
});

// ---------------------------------------------------------------------------
// 3. handleRetry
// ---------------------------------------------------------------------------

describe("handleRetry", () => {
  test("no sessionId: status queued 'No session, re-queuing'", () => {
    const env = makeEnv();
    addAgent(env, "a", { status: "retry" });

    handleRetry(env, "a");

    expect(env.state.getAgent("a")!.status).toBe("queued");
    expect(detailsFor(env, "a", "queued")).toEqual(["No session, re-queuing"]);
  });

  test("unknown agent: no-op", () => {
    const env = makeEnv();
    handleRetry(env, "ghost");
    expect(env.events).toEqual([]);
  });

  test("TDD quest with a missing baseline: failed, error contains 'retry blocked', no process spawned", () => {
    const root = makeTempDir();
    const config = makeConfig({ tdd: { enabled: true, testCommand: "true", testTimeout: 10_000 } as any });
    saveQuest(root, { ...createBlankQuest("q1", "Quest q1", "goal", "main"), status: "active" });
    const env = makeEnv({ root, config });
    // No task on disk and a quest/ base branch: the quest is derived from the branch
    addAgent(env, "a", { status: "retry", sessionId: "ses_1", baseBranch: "quest/q1" });

    handleRetry(env, "a");

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("failed");
    expect(agent.error).toContain('Test baseline for quest "q1" unavailable (missing); retry blocked');
    expect(detailsFor(env, "a", "failed")).toEqual([agent.error!]);
    expect(agent.pid).toBeNull();
    // QUIRK: the retry-blocked failure does not cancel downstream agents or
    // rescue chain predecessors, unlike every other terminal failure path.
    expect(env.cancelled).toEqual([]);
    expect(env.rescued).toEqual([]);
  });

  test("the baseline check is skipped for fake agents", () => {
    const root = makeTempDir();
    const config = makeConfig({ tdd: { enabled: true, testCommand: "true", testTimeout: 10_000 } as any });
    saveQuest(root, { ...createBlankQuest("q1", "Quest q1", "goal", "main"), status: "active" });
    const env = makeEnv({ root, config });
    addAgent(env, "a", {
      status: "retry", sessionId: "ses_1", baseBranch: "quest/q1",
      agentName: FAKE_AGENT_SENTINEL, error: "FAKE_SLEEP_MS=10",
    });

    handleRetry(env, "a");

    expect(env.state.getAgent("a")!.status).toBe("running");
  });

  test("retryHeadless throwing: status queued 'Retry launch failed, re-queuing'", () => {
    // An unknown forced profile makes route resolution throw before any spawn
    const env = makeEnv();
    addAgent(env, "a", { status: "retry", sessionId: "ses_1", profile: "no-such-profile" });

    handleRetry(env, "a");

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("queued");
    expect(detailsFor(env, "a", "queued")).toEqual(["Retry launch failed, re-queuing"]);
    expect(agent.pid).toBeNull();
    // The counters are not touched by handleRetry itself
    expect(agent.retries).toBe(0);
  });

  test("success: status running 'Retry launched', pid updated, process completes into verification", async () => {
    const env = makeEnv();
    addAgent(env, "a", {
      status: "retry", sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL,
      error: "FAKE_SLEEP_MS=20", retries: 1, maxRetries: 2,
    });
    expect(env.state.getAgent("a")!.pid).toBeNull();

    handleRetry(env, "a");

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("running");
    expect(detailsFor(env, "a", "running")).toEqual(["Retry launched"]);
    expect(typeof agent.pid).toBe("number");
    expect(agent.pid).toBeGreaterThan(0);
    // handleRetry does not touch the counters
    expect(agent.retries).toBe(1);

    await waitFor(() => env.state.getAgent("a")!.status === "verified", "retried fake agent to verify");
    expect(env.merges).toEqual(["a"]);
  });
});

// ---------------------------------------------------------------------------
// 4. maxRetries resolution at launch
// ---------------------------------------------------------------------------

describe("maxRetries resolution", () => {
  /** Runner whose launches are swallowed: only the submitted agent state matters. */
  function submitWith(maxRetriesDefault: number, override?: number | null): InternalAgentState {
    class NoLaunchRunner extends AgentRunner {
      protected enqueueLaunch(): void {}
    }
    const root = makeTempDir();
    const state = new DaemonState(root);
    states.push(state);
    const runner = new NoLaunchRunner(
      { projectRoot: root, config: makeConfig({ defaults: { maxConcurrent: 4, maxRetries: maxRetriesDefault } as any }) },
      state,
    );
    runners.push(runner);
    if (override !== undefined) runner.setMaxRetries(override);
    const task: Task = { ...createBlankTask("t", "Task t") };
    runner.submitTask(task);
    return state.getAgent("t")!;
  }

  test.each([0, 1, 3])("config.defaults.maxRetries=%i becomes agent.maxRetries (retries starts at 0)", (n) => {
    const agent = submitWith(n);
    expect(agent.maxRetries).toBe(n);
    expect(agent.retries).toBe(0);
  });

  test.each([0, 1, 3])("setMaxRetries(%i) overrides config.defaults.maxRetries", (n) => {
    expect(submitWith(2, n).maxRetries).toBe(n);
  });

  test("override 0 wins over a positive default (?? not ||)", () => {
    expect(submitWith(5, 0).maxRetries).toBe(0);
  });

  test("setMaxRetries(null) restores the config default", () => {
    expect(submitWith(4, null).maxRetries).toBe(4);
  });

  test("the limit is resolved once at submit: a later setMaxRetries does not change an existing agent", () => {
    const root = makeTempDir();
    class NoLaunchRunner extends AgentRunner {
      protected enqueueLaunch(): void {}
    }
    const state = new DaemonState(root);
    states.push(state);
    const runner = new NoLaunchRunner({ projectRoot: root, config: makeConfig() }, state);
    runners.push(runner);

    runner.submitTask(createBlankTask("first", "First"));
    runner.setMaxRetries(7);
    runner.submitTask(createBlankTask("second", "Second"));

    expect(state.getAgent("first")!.maxRetries).toBe(2);
    expect(state.getAgent("second")!.maxRetries).toBe(7);
  });

  test("DEFAULT_CONFIG ships maxRetries 2", () => {
    expect(DEFAULT_CONFIG.defaults.maxRetries).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 5. reapDeadProcesses "retry" safety net
// ---------------------------------------------------------------------------

describe("reapDeadProcesses (retry safety net)", () => {
  function seedTask(env: Env, id: string): void {
    const task = createBlankTask(id, `Task ${id}`);
    task.status = "in_progress";
    saveTaskToStore(env.root, makeConfig(), task);
  }
  const taskStatus = (env: Env, id: string) =>
    loadFeatures(env.root, makeConfig()).tasks.find((t) => t.id === id)?.status;

  test("exhausted: agent removed from state and its task reset to planned", () => {
    const env = makeEnv();
    seedTask(env, "a");
    addAgent(env, "a", { status: "retry", retries: 2, maxRetries: 2, worktree: join(env.root, "gone") });

    env.runner.reapDeadProcesses();

    expect(env.state.getAgent("a")).toBeUndefined();
    expect(taskStatus(env, "a")).toBe("planned");
  });

  test("exhausted with a dead pid behaves the same as no pid", () => {
    const env = makeEnv();
    seedTask(env, "a");
    addAgent(env, "a", { status: "retry", retries: 3, maxRetries: 2, pid: 2_147_483_000, worktree: join(env.root, "gone") });

    env.runner.reapDeadProcesses();

    expect(env.state.getAgent("a")).toBeUndefined();
    expect(taskStatus(env, "a")).toBe("planned");
  });

  test("not exhausted: re-queued 'Re-queuing stuck retry', task and counters untouched", () => {
    const env = makeEnv();
    seedTask(env, "a");
    addAgent(env, "a", { status: "retry", retries: 1, maxRetries: 2, error: "kept" });

    env.runner.reapDeadProcesses();

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("queued");
    expect(detailsFor(env, "a", "queued")).toEqual(["Re-queuing stuck retry"]);
    expect(agent.retries).toBe(1);
    expect(agent.error).toBe("kept");
    expect(taskStatus(env, "a")).toBe("in_progress");
  });

  test("a retry agent whose process is alive is left alone", () => {
    const env = makeEnv();
    addAgent(env, "a", { status: "retry", retries: 2, maxRetries: 2, pid: process.pid });

    env.runner.reapDeadProcesses();

    expect(env.state.getAgent("a")!.status).toBe("retry");
    expect(env.events).toEqual([]);
  });

  test("a running agent with a dead pid is removed regardless of its retry budget", () => {
    const env = makeEnv();
    seedTask(env, "a");
    addAgent(env, "a", { status: "running", retries: 0, maxRetries: 2, pid: 2_147_483_000, worktree: join(env.root, "gone") });

    env.runner.reapDeadProcesses();

    expect(env.state.getAgent("a")).toBeUndefined();
    expect(taskStatus(env, "a")).toBe("planned");
  });
});

// ---------------------------------------------------------------------------
// 6. Review feedback is handed to retryHeadless once, then cleared
// ---------------------------------------------------------------------------

describe("review feedback hand-off", () => {
  const blockingJson = (msg: string) =>
    JSON.stringify({ findings: [{ axis: "spec", severity: "blocking", file: "src/a.ts", line: 3, message: msg }] });

  function setupReview() {
    const repo = makeRepo("main");
    dirs.push(repo);
    const worktree = mkdtempSync(join(tmpdir(), "retry-char-wt-"));
    dirs.push(worktree);
    git(repo, "worktree", "add", "-q", "-b", "feature/t1", worktree, "main");
    writeRepoFile(worktree, "src/a.ts", "export const a = 1;\n");
    commitAll(worktree, "feat: a");

    const config = {
      ...DEFAULT_CONFIG,
      baseBranch: "main",
      build: { command: "true", timeout: 60000, maxRetries: 1 },
      tdd: { enabled: false },
      review: { ...DEFAULT_CONFIG.review!, enabled: true, maxRounds: 3 },
    } as WomboConfig;
    const task = createBlankTask("t1", "Task t1");
    task.status = "in_progress";
    saveTaskToStore(repo, config, task);

    const state = new DaemonState(repo);
    states.push(state);
    const agent = createDaemonAgentState({ featureId: "t1", taskTitle: "Task t1", branch: "feature/t1", baseBranch: "main", worktree });
    agent.status = "completed";
    state.addAgent(agent);

    const output: string[] = [];
    state.subscribe((type, payload: any) => { if (type === "evt:agent-output") output.push(payload.data); });
    const runner = new AgentRunner(
      {
        projectRoot: repo,
        config,
        overrides: { runReviewer: async () => ({ ok: true, text: blockingJson("FAKE_SLEEP_MS=37 handle empty input") }) },
      },
      state,
    );
    runners.push(runner);
    const merges: string[] = [];
    (runner as any).attemptMerge = async (id: string) => { merges.push(id); };
    return { runner, state, output, merges };
  }

  test("the gate stores feedback; handleRetry passes it as the retry prompt once and clears it", async () => {
    const { runner, state, output, merges } = setupReview();

    // Review blocks the first round: the agent is sent back (not a failure, no retry counted)
    await (runner as any).handleBuildVerification("t1");
    const feedbackMap = (runner as any).reviewFeedback as Map<string, string>;
    const agent = state.getAgent("t1")!;
    expect(agent.status).toBe("queued"); // no session: handleRetry re-queued it
    expect(agent.retries).toBe(0);
    expect(feedbackMap.get("t1")).toContain("handle empty input");
    expect(agent.error).toBe(feedbackMap.get("t1")!);

    // The process comes back with a session: the next handleRetry resumes it.
    // The fake agent echoes the sleep it parsed out of its prompt, which proves
    // the review feedback (not the generic build-error text) was the prompt.
    state.updateAgent("t1", { sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL });
    (runner as any).handleRetry("t1");
    expect(feedbackMap.has("t1")).toBe(false);
    expect(state.getAgent("t1")!.status).toBe("running");
    await waitFor(() => output.join("").includes("sleep: 37ms"), "fake agent to echo the review feedback prompt");
    await waitFor(() => state.getAgent("t1")!.status === "verified", "retried agent to finish");
    expect(merges).toEqual(["t1"]);
  });

  test("a second retry falls back to the generic message built from agent.error", async () => {
    const { runner, state, output } = setupReview();
    state.updateAgent("t1", { sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL, error: "FAKE_SLEEP_MS=41" });
    (runner as any).reviewFeedback.set("t1", "FAKE_SLEEP_MS=37 review says no");

    (runner as any).handleRetry("t1"); // consumes the feedback
    await waitFor(() => output.join("").includes("sleep: 37ms"), "first retry to use the feedback");
    await waitFor(() => state.getAgent("t1")!.status === "verified", "first retry to finish");
    output.length = 0;

    state.updateAgentStatus("t1", "retry");
    (runner as any).handleRetry("t1"); // nothing left: buildErrors = agent.error
    await waitFor(() => output.join("").includes("sleep: 41ms"), "second retry to use agent.error");
    expect(output.join("")).not.toContain("sleep: 37ms");
  });
});

// ---------------------------------------------------------------------------
// 7. User retry — DaemonState.retryAgent / Scheduler.retryAgent
// ---------------------------------------------------------------------------

describe("user retry", () => {
  function makeScheduler(env: Env): Scheduler {
    const scheduler = new Scheduler(
      { projectRoot: env.root, config: makeConfig({ tasksDir: "tasks", archiveDir: "archive" } as any), tickIntervalMs: 60_000 },
      { state: env.state, runner: env.runner as any },
    );
    return scheduler;
  }

  test("DaemonState.retryAgent below the limit: retries+1, fields reset, status retry 'Retry N/M'", () => {
    const env = makeEnv();
    addAgent(env, "a", { status: "failed", retries: 1, maxRetries: 2, error: "old", buildPassed: false, completedAt: "2026-01-01T00:00:00Z" });

    expect(env.state.retryAgent("a")).toBe(true);

    const agent = env.state.getAgent("a")!;
    expect(agent.retries).toBe(2);
    expect(agent.error).toBeNull();
    expect(agent.buildPassed).toBeNull();
    expect(agent.completedAt).toBeNull();
    expect(agent.status).toBe("retry");
    expect(detailsFor(env, "a", "retry")).toEqual(["Retry 2/2"]);
  });

  test("DaemonState.retryAgent with an exhausted counter: returns false and changes nothing", () => {
    const env = makeEnv();
    addAgent(env, "a", { status: "failed", retries: 2, maxRetries: 2, error: "old" });

    expect(env.state.retryAgent("a")).toBe(false);

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("failed");
    expect(agent.retries).toBe(2);
    expect(agent.error).toBe("old");
    expect(env.state.retryAgent("ghost")).toBe(false);
  });

  test("Scheduler.retryAgent resets an exhausted counter to 0 and re-queues", () => {
    const env = makeEnv();
    addAgent(env, "a", { status: "failed", retries: 2, maxRetries: 2, error: "old", buildPassed: false, completedAt: "2026-01-01T00:00:00Z" });
    const scheduler = makeScheduler(env);

    scheduler.retryAgent("a");

    const agent = env.state.getAgent("a")!;
    expect(agent.retries).toBe(0);
    expect(agent.maxRetries).toBe(2);
    expect(agent.error).toBeNull();
    expect(agent.buildPassed).toBeNull();
    expect(agent.completedAt).toBeNull();
    expect(agent.status).toBe("queued");
    expect(detailsFor(env, "a", "queued")).toEqual(["Retry requested by user"]);
    scheduler.shutdown();
  });

  test("Scheduler.retryAgent below the limit consumes a retry (counter +1, not reset) and re-queues", () => {
    // QUIRK: a user retry with budget left spends one automatic retry, while a
    // user retry on an exhausted agent resets the counter to 0. The same user
    // action therefore leaves different remaining budgets (1 vs 2 left here). Tracked by
    // bug-user-retry-budget-inconsistent.
    const env = makeEnv();
    addAgent(env, "a", { status: "failed", retries: 1, maxRetries: 2 });
    const scheduler = makeScheduler(env);

    scheduler.retryAgent("a");

    const agent = env.state.getAgent("a")!;
    expect(agent.retries).toBe(2);
    expect(agent.status).toBe("queued");
    expect(env.events.map((e) => e.status)).toEqual(["retry", "queued"]);
    expect(detailsFor(env, "a", "retry")).toEqual(["Retry 2/2"]);
    scheduler.shutdown();
  });

  test("after the exhausted reset, the full automatic budget is available again", () => {
    const env = makeEnv();
    addAgent(env, "a", { status: "running", retries: 1, maxRetries: 1 });
    const scheduler = makeScheduler(env);

    callbacks(env).onError("a", "final"); // exhausted -> failed
    expect(env.state.getAgent("a")!.status).toBe("failed");
    scheduler.retryAgent("a");
    expect(env.state.getAgent("a")!.retries).toBe(0);

    env.state.updateAgentStatus("a", "running");
    callbacks(env).onError("a", "again"); // retried instead of failed
    expect(env.state.getAgent("a")!.retries).toBe(1);
    expect(detailsFor(env, "a", "retry").at(-1)).toBe("Retry 2/1: again"); // QUIRK: one ahead of the counter
    scheduler.shutdown();
  });

  test("Scheduler.retryAgent for an agent no longer in state does not throw or create one", () => {
    const env = makeEnv();
    const scheduler = makeScheduler(env);
    expect(() => scheduler.retryAgent("ghost")).not.toThrow();
    expect(env.state.getAgent("ghost")).toBeUndefined();
    scheduler.shutdown();
  });
});

// ---------------------------------------------------------------------------
// 8. Crash and restart with the fake agent (real child processes)
// ---------------------------------------------------------------------------

describe("fake agent crash and restart", () => {
  test("crash then automatic restart: onError counts a retry, relaunches the session, and the restart verifies", async () => {
    const env = makeEnv();
    addAgent(env, "a", {
      status: "retry", sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL,
      maxRetries: 2, error: "FAKE_FAULT=crash@start",
    });

    handleRetry(env, "a"); // first (crashing) process

    await waitFor(() => env.state.getAgent("a")!.status === "verified", "restarted agent to verify");

    const agent = env.state.getAgent("a")!;
    expect(agent.retries).toBe(1);
    expect(agent.error).toBe("Process exited with code 1");
    expect(detailsFor(env, "a", "retry")).toEqual(["Retry 2/2: Process exited with code 1"]); // QUIRK: one ahead
    // running (crashing process) -> retry -> running (restart) -> completed -> verified
    expect(env.events.map((e) => e.status)).toEqual(["running", "retry", "running", "completed", "verified"]);
    expect(env.merges).toEqual(["a"]);
    expect(env.cancelled).toEqual([]);
  });

  test("a signal death is treated like any other crash", async () => {
    const env = makeEnv();
    addAgent(env, "a", {
      status: "retry", sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL,
      maxRetries: 1, error: "FAKE_FAULT=crash:SIGKILL@start",
    });

    handleRetry(env, "a");

    await waitFor(() => env.state.getAgent("a")!.status === "verified", "agent to restart after SIGKILL");
    expect(env.state.getAgent("a")!.retries).toBe(1);
    expect(env.state.getAgent("a")!.error).toBe("Process exited with code null");
  });

  test("crash with the budget already spent: failed, downstream cancelled, chain rescue attempted", async () => {
    const env = makeEnv();
    addAgent(env, "a", {
      status: "retry", sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL,
      maxRetries: 1, retries: 1, error: "FAKE_FAULT=crash:3@start", dependedOnBy: ["b"],
    });
    addAgent(env, "b", { dependsOn: ["a"] });

    handleRetry(env, "a");

    await waitFor(() => env.state.getAgent("a")!.status === "failed", "exhausted agent to fail");

    const agent = env.state.getAgent("a")!;
    expect(agent.retries).toBe(1);
    expect(agent.error).toBe("Process exited with code 3");
    expect(detailsFor(env, "a", "failed")).toEqual(["Process exited with code 3"]);
    expect(env.cancelled).toEqual(["a"]);
    expect(env.rescued).toEqual(["a"]);
    expect(env.state.getAgent("b")!.status).toBe("failed");
    expect(env.merges).toEqual([]);
  });

  test("every restart fails: the attempts stop at maxRetries and the agent ends failed", async () => {
    // The restart prompt is built from the monitor's error text, so a prompt
    // directive cannot survive a restart. Re-arm the fault on every relaunch
    // by wrapping handleRetry, the single restart entry point.
    const env = makeEnv();
    const runner = env.runner as any;
    const realRetry = runner.handleRetry.bind(runner);
    let launches = 0;
    runner.handleRetry = (id: string) => {
      launches++;
      env.state.updateAgent(id, { error: "FAKE_FAULT=crash@start" });
      realRetry(id);
    };
    addAgent(env, "a", {
      status: "retry", sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL, maxRetries: 2,
    });

    runner.handleRetry("a");

    await waitFor(() => env.state.getAgent("a")!.status === "failed", "agent to exhaust its restarts");
    expect(launches).toBe(3); // the initial launch plus maxRetries restarts
    expect(env.state.getAgent("a")!.retries).toBe(2);
    expect(detailsFor(env, "a", "retry")).toHaveLength(2);
    expect(env.cancelled).toEqual(["a"]);
  });
});
