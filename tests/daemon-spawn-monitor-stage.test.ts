/**
 * daemon-spawn-monitor-stage.test.ts — SpawnMonitorStage in isolation, with
 * stubbed collaborators: the monitor-failure branch (onProcessFailed), the
 * relaunch entry point, the usage-context registration, and the extracted
 * route and quest-scope helpers.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import { SpawnMonitorStage, type SpawnMonitorDeps } from "../src/daemon/runner/spawn-monitor";
import { conflictRoute, resolveAgentRoute, selectRoute } from "../src/daemon/runner/routes";
import { buildSessionQuestContext, resolveTaskQuestScope } from "../src/daemon/runner/quest-scope";
import { DEFAULT_CONFIG, type WomboConfig } from "../src/config";
import { createBlankTask } from "../src/lib/tasks";

const dirs: string[] = [];
const states: DaemonState[] = [];
afterEach(() => {
  for (const s of states.splice(0)) s.destroy();
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function cfg(): WomboConfig {
  return { ...DEFAULT_CONFIG, baseBranch: "main", tdd: { enabled: false } } as WomboConfig;
}

function setup() {
  const root = mkdtempSync(join(tmpdir(), "spawn-monitor-"));
  mkdirSync(join(root, ".wombo-combo", "tasks"), { recursive: true });
  dirs.push(root);
  const state = new DaemonState(root);
  states.push(state);
  const calls = { relaunch: [] as string[], rescue: [] as string[], cancelled: [] as string[] };
  const realCancel = state.cancelDownstream.bind(state);
  state.cancelDownstream = (id: string) => { calls.cancelled.push(id); return realCancel(id); };
  const deps = {
    projectRoot: root,
    config: cfg(),
    state,
    analytics: {} as any,
    replay: {} as any,
    monitor: () => ({} as any),
    reviewFeedback: new Map<string, string>(),
    loadTask: () => null,
    relaunch: (id: string) => { calls.relaunch.push(id); },
    handleBuildVerification: async () => {},
    rescueChainPredecessors: (id: string) => { calls.rescue.push(id); },
  } satisfies SpawnMonitorDeps;
  const stage = new SpawnMonitorStage(deps);
  const add = (id: string, extra: { retries?: number; maxRetries?: number; sessionId?: string | null } = {}) => {
    const agent = createDaemonAgentState({
      featureId: id, taskTitle: id, branch: `feature/${id}`, baseBranch: "main", worktree: root,
      maxRetries: extra.maxRetries,
    });
    agent.retries = extra.retries ?? 0;
    agent.sessionId = extra.sessionId ?? null;
    state.addAgent(agent);
    return state.getAgent(id)!;
  };
  return { root, state, stage, deps, calls, add };
}

describe("SpawnMonitorStage.onProcessFailed", () => {
  test("below the limit: counts the retry, records the error and relaunches", () => {
    const { state, stage, calls, add } = setup();
    add("a", { maxRetries: 2 });
    stage.onProcessFailed("a", "crash");
    const a = state.getAgent("a")!;
    expect(a.retries).toBe(1);
    expect(a.error).toBe("crash");
    expect(a.status).toBe("retry");
    expect(calls.relaunch).toEqual(["a"]);
    expect(calls.rescue).toEqual([]);
  });

  test("exhausted: fails the agent, cancels downstream and rescues the chain", () => {
    const { state, stage, calls, add } = setup();
    add("a", { maxRetries: 1, retries: 1 });
    stage.onProcessFailed("a", "hang");
    const a = state.getAgent("a")!;
    expect(a.status).toBe("failed");
    expect(a.error).toBe("hang");
    expect(calls.cancelled).toEqual(["a"]);
    expect(calls.rescue).toEqual(["a"]);
    expect(calls.relaunch).toEqual([]);
  });

  test("maxRetries 0 fails on the first crash", () => {
    const { state, stage, add } = setup();
    add("a", { maxRetries: 0 });
    stage.onProcessFailed("a", "boom");
    expect(state.getAgent("a")!.status).toBe("failed");
  });

  test("unknown agent is ignored", () => {
    const { stage, calls } = setup();
    stage.onProcessFailed("ghost", "boom");
    expect(calls.relaunch).toEqual([]);
    expect(calls.rescue).toEqual([]);
  });

  test("buildCallbacks().onError routes to the same branch", () => {
    const { stage, calls, add } = setup();
    add("a", { maxRetries: 2 });
    stage.buildCallbacks().onError!("a", "x");
    expect(calls.relaunch).toEqual(["a"]);
  });

  test("repeated crashes walk retry then failed once the limit is reached", () => {
    const { state, stage, calls, add } = setup();
    add("a", { maxRetries: 2 });
    stage.onProcessFailed("a", "e1");
    stage.onProcessFailed("a", "e2");
    expect(calls.relaunch).toEqual(["a", "a"]);
    stage.onProcessFailed("a", "e3");
    expect(state.getAgent("a")!.status).toBe("failed");
    expect(calls.rescue).toEqual(["a"]);
  });
});

describe("SpawnMonitorStage.relaunch", () => {
  test("without a session the agent is re-queued for a fresh launch", () => {
    const { state, stage, add } = setup();
    add("a");
    stage.relaunch("a");
    expect(state.getAgent("a")!.status).toBe("queued");
  });

  test("unknown agent is ignored", () => {
    const { stage } = setup();
    expect(() => stage.relaunch("ghost")).not.toThrow();
  });

  test("a failing relaunch falls back to re-queuing", () => {
    const { state, stage, add } = setup();
    add("a", { sessionId: "s1" });
    // worktree is a plain dir and no harness binary is configured: launch throws
    state.getAgent("a")!.agentName = "no-such-agent";
    stage.relaunch("a");
    expect(["queued", "running"]).toContain(state.getAgent("a")!.status);
  });
});

describe("SpawnMonitorStage.registerUsageContext", () => {
  test("registers quest, model and harness with the token collector", () => {
    const { deps, add } = setup();
    const agent = add("a");
    agent.model = "m1";
    const registered: any[] = [];
    const stage = new SpawnMonitorStage({
      ...deps,
      monitor: () => ({ tokenCollector: { registerAgent: (id: string, ctx: unknown) => registered.push([id, ctx]) } }) as any,
    });
    stage.registerUsageContext("a", { provider: "p", harness: "h" } as any);
    expect(registered).toEqual([["a", { quest_id: null, model: "m1", provider: "p", harness: "h" }]]);
  });
});

describe("route helpers", () => {
  test("legacy config resolves a legacy route with no skipped profiles", () => {
    const { state } = setup();
    const ctx = { config: cfg(), state };
    const task = createBlankTask("t", "T");
    expect(resolveAgentRoute(ctx, "code", "t", task).legacy).toBe(true);
    expect(selectRoute(ctx, "code", "t", task)).toMatchObject({ skipped: [] });
    expect(conflictRoute(ctx, "t", task, undefined)).toBeDefined();
  });
});

describe("quest-scope helpers", () => {
  test("unquested task has no scope", () => {
    const { root, state } = setup();
    const ctx = { projectRoot: root, config: cfg(), state };
    expect(resolveTaskQuestScope(ctx, createBlankTask("t", "T"))).toBeNull();
    expect(buildSessionQuestContext(ctx)).toBeUndefined();
  });

  test("a missing task with a quest base branch fails closed to null for an unknown quest", () => {
    const { root, state, add } = setup();
    const ctx = { projectRoot: root, config: cfg(), state };
    const agent = add("a");
    agent.baseBranch = "quest/nope";
    expect(resolveTaskQuestScope(ctx, null, agent)).toBeNull();
  });
});
