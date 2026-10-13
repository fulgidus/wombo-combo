/**
 * daemon-agent-supervision.test.ts — Acceptance tests for supervised agent
 * lifecycles: crash restart, hang detection, exhausted restart intensity.
 *
 * Real pieces: SpawnMonitorStage, the restart policy, a ProcessMonitor and the
 * built-in fake agent (src/lib/fake-agent-runner.ts, steered by FAKE_FAULT
 * directives carried in the retry prompt). Hang detection runs on an injected
 * FakeClock, so no test waits on a real idle timeout.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import { SpawnMonitorStage } from "../src/daemon/runner/spawn-monitor";
import { FeedbackStore } from "../src/daemon/runner/feedback-store";
import { ProcessMonitor } from "../src/lib/monitor";
import { DEFAULT_CONFIG, type WomboConfig } from "../src/config";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import { useHermeticGitEnv } from "./helpers/post-merge-fixture";
import { FakeClock } from "./helpers/fake-clock";
import { waitFor } from "./helpers/wait-for";

let restoreEnv: () => void;
beforeAll(() => { restoreEnv = useHermeticGitEnv().restore; });
afterAll(() => restoreEnv());

const dirs: string[] = [];
const states: DaemonState[] = [];
const monitors: ProcessMonitor[] = [];
const stages: SpawnMonitorStage[] = [];
afterEach(() => {
  for (const s of stages.splice(0)) s.dispose();
  for (const m of monitors.splice(0)) m.killAll();
  for (const s of states.splice(0)) s.destroy();
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function makeConfig(maxRetries: number, idleTimeoutMs?: number): WomboConfig {
  return {
    ...DEFAULT_CONFIG,
    baseBranch: "main",
    build: { command: "echo ok", enabled: false },
    tdd: { enabled: false },
    defaults: { ...DEFAULT_CONFIG.defaults, maxRetries, ...(idleTimeoutMs ? { agentIdleTimeoutMs: idleTimeoutMs } : {}) },
  } as WomboConfig;
}

function setup(opts: { maxRetries: number; idleTimeoutMs?: number }) {
  const root = mkdtempSync(join(tmpdir(), "agent-supervision-"));
  mkdirSync(join(root, ".wombo-combo", "tasks"), { recursive: true });
  dirs.push(root);
  const state = new DaemonState(root);
  states.push(state);

  const statuses: Array<{ status: string; detail?: string }> = [];
  state.subscribe((type, payload: any) => {
    if (type === "evt:agent-status-change") statuses.push({ status: payload.newStatus, detail: payload.detail });
  });

  const clock = new FakeClock();
  const calls = { verified: [] as string[], rescued: [] as string[], cancelled: [] as string[], gaveUp: [] as string[], relaunches: 0 };
  const realCancel = state.cancelDownstream.bind(state);
  state.cancelDownstream = (id: string) => { calls.cancelled.push(id); return realCancel(id); };

  const reviewFeedback = new FeedbackStore();
  let monitor!: ProcessMonitor;
  let stage!: SpawnMonitorStage;
  stage = new SpawnMonitorStage({
    projectRoot: root,
    config: makeConfig(opts.maxRetries, opts.idleTimeoutMs),
    state,
    analytics: { recordProcessStart() {}, recordUsage() {} } as any,
    replay: { recordAttempt() {}, recordEvent() {}, recordPrompt() {} } as any,
    monitor: () => monitor,
    reviewFeedback,
    loadTask: () => null,
    relaunch: (id) => { calls.relaunches++; stage.relaunch(id); },
    // A clean exit just records itself; verification/merge is outside this suite
    handleBuildVerification: async (id) => { calls.verified.push(id); },
    rescueChainPredecessors: (id) => { calls.rescued.push(id); },
    giveUp: (id) => { calls.gaveUp.push(id); },
    clock,
  });
  stages.push(stage);
  monitor = new ProcessMonitor(root, stage.buildCallbacks());
  monitors.push(monitor);

  const add = (id: string, extra: { dependsOn?: string[]; dependedOnBy?: string[] } = {}) => {
    const agent = createDaemonAgentState({
      featureId: id, taskTitle: id, branch: `feature/${id}`, baseBranch: "main", worktree: root,
      maxRetries: opts.maxRetries,
    });
    Object.assign(agent, { sessionId: "ses_1", agentName: FAKE_AGENT_SENTINEL, status: "retry" }, extra);
    state.addAgent(agent);
    statuses.length = 0; // seeding is not part of the behaviour under test
    return state.getAgent(id)!;
  };
  const seq = () => statuses.map((s) => s.status);
  return { state, stage, monitor, clock, calls, reviewFeedback, add, seq, statuses };
}

const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

describe("crash restart", () => {
  test("a crash is restarted with feedback: retry then running, and success ends completed", async () => {
    const env = setup({ maxRetries: 2 });
    env.add("a");
    // The retry prompt is the handed-over feedback: it makes the first restart crash
    env.reviewFeedback.set("a", "FAKE_FAULT=crash@start");

    env.stage.relaunch("a");
    await waitFor(() => env.state.getAgent("a")!.status === "completed", "restarted agent to complete");

    const agent = env.state.getAgent("a")!;
    expect(agent.retries).toBe(1);
    expect(agent.error).toBe("Process exited with code 1");
    expect(env.seq()).toEqual(["running", "retry", "running", "completed"]);
    expect(env.reviewFeedback.has("a")).toBe(false); // consumed by exactly one attempt
    expect(env.calls.verified).toEqual(["a"]);
    expect(env.calls.cancelled).toEqual([]);
  });

  test("a normal exit never restarts", async () => {
    const env = setup({ maxRetries: 3 });
    env.add("a");

    env.stage.relaunch("a");
    await waitFor(() => env.state.getAgent("a")!.status === "completed", "agent to complete");

    expect(env.state.getAgent("a")!.retries).toBe(0);
    expect(env.seq()).toEqual(["running", "completed"]);
    expect(env.calls.relaunches).toBe(0);
  });
});

describe("hang watchdog", () => {
  test("idle beyond the threshold kills the process and restarts it through the policy", async () => {
    const env = setup({ maxRetries: 2, idleTimeoutMs: 60_000 });
    env.add("a");
    env.reviewFeedback.set("a", "FAKE_FAULT=hang@start");

    env.stage.relaunch("a");
    const hungPid = env.state.getAgent("a")!.pid!;
    expect(alive(hungPid)).toBe(true);

    env.clock.advance(59_999);
    expect(env.state.getAgent("a")!.status).toBe("running");
    env.clock.advance(1);

    await waitFor(() => env.state.getAgent("a")!.status === "completed", "restart after hang to complete");
    const agent = env.state.getAgent("a")!;
    expect(agent.retries).toBe(1);
    expect(agent.error).toBe("Agent hung: no activity for 60s");
    expect(env.seq()).toEqual(["running", "retry", "running", "completed"]);
    await waitFor(() => !alive(hungPid), "hung process to be killed");
  });

  test("is disabled by default: no timers, no kill", () => {
    const env = setup({ maxRetries: 2 });
    env.add("a");
    env.reviewFeedback.set("a", "FAKE_FAULT=hang@start");

    env.stage.relaunch("a");
    expect(env.clock.pendingTimers()).toBe(0);
    env.clock.advance(10 * 60 * 60 * 1000);
    expect(env.state.getAgent("a")!.status).toBe("running");
    expect(env.state.getAgent("a")!.retries).toBe(0);
  });

  test("an agent that exits stops being watched", async () => {
    const env = setup({ maxRetries: 2, idleTimeoutMs: 1000 });
    env.add("a");

    env.stage.relaunch("a");
    await waitFor(() => env.state.getAgent("a")!.status === "completed", "agent to complete");
    expect(env.clock.pendingTimers()).toBe(0);
  });
});

describe("exhausted restart intensity", () => {
  test("repeated hangs beyond maxRetries end failed, cancel downstream and leave no process", async () => {
    const env = setup({ maxRetries: 1, idleTimeoutMs: 1000 });
    env.add("a", { dependedOnBy: ["b"] });
    env.add("b", { dependsOn: ["a"] });
    // Re-arm the hang on every restart (the restart prompt is otherwise the error text)
    const realRelaunch = env.stage.relaunch.bind(env.stage);
    const pids: number[] = [];
    env.stage.relaunch = (id: string) => {
      env.reviewFeedback.set(id, "FAKE_FAULT=hang@start");
      realRelaunch(id);
      pids.push(env.state.getAgent(id)!.pid!);
    };

    env.stage.relaunch("a");
    env.clock.advance(1000); // first hang -> restart
    await waitFor(() => pids.length === 2, "restart launch");
    env.clock.advance(1000); // second hang -> intensity exceeded

    await waitFor(() => env.state.getAgent("a")!.status === "failed", "agent to fail");
    expect(env.state.getAgent("a")!.retries).toBe(1);
    expect(env.calls.cancelled).toEqual(["a"]);
    expect(env.state.getAgent("b")!.status).toBe("failed");
    expect(env.calls.gaveUp).toEqual(["a"]);
    expect(env.calls.rescued).toEqual(["a"]);
    expect(env.clock.pendingTimers()).toBe(0);
    for (const pid of pids) await waitFor(() => !alive(pid), `pid ${pid} to die`);
  });

  test("repeated crashes beyond maxRetries end failed", async () => {
    const env = setup({ maxRetries: 2 });
    env.add("a");
    const realRelaunch = env.stage.relaunch.bind(env.stage);
    let launches = 0;
    env.stage.relaunch = (id: string) => {
      launches++;
      env.reviewFeedback.set(id, "FAKE_FAULT=crash@start");
      realRelaunch(id);
    };

    env.stage.relaunch("a");
    await waitFor(() => env.state.getAgent("a")!.status === "failed", "agent to exhaust restarts");

    expect(launches).toBe(3); // initial attempt plus maxRetries restarts
    expect(env.state.getAgent("a")!.retries).toBe(2);
    expect(env.seq().filter((s) => s === "retry")).toHaveLength(2);
    expect(env.calls.cancelled).toEqual(["a"]);
    expect(env.calls.gaveUp).toEqual(["a"]);
  });

  test("maxRetries 0 fails on the first crash", async () => {
    const env = setup({ maxRetries: 0 });
    env.add("a");
    env.reviewFeedback.set("a", "FAKE_FAULT=crash@start");

    env.stage.relaunch("a");
    await waitFor(() => env.state.getAgent("a")!.status === "failed", "agent to fail");

    expect(env.state.getAgent("a")!.retries).toBe(0);
    expect(env.seq()).toEqual(["running", "failed"]);
    expect(env.calls.relaunches).toBe(0);
  });
});
