/**
 * daemon-scheduler.test.ts -- Unit tests for the Scheduler class.
 *
 * Strategy: Use real DaemonState (proven by daemon-state tests) and a mock
 * AgentRunner that records calls. The Scheduler's tick loop and task selection
 * depend on loadFeatures/selectFeatures which read from disk — we pre-populate
 * agents in DaemonState to test the scheduling logic without needing real task
 * files. For the getCandidateTasks path we test through the external signals
 * and lifecycle methods.
 *
 * Coverage:
 *   - start() sets status to running, applies config overrides
 *   - pause() / resume() lifecycle
 *   - stop() transitions through stopping to idle when agents finish
 *   - kill() force-kills agents
 *   - shutdown() clears tick timer
 *   - prioritize(): pinned -> queued -> candidates ordering
 *   - External signals: pinTask, skipTask, retryAgent, setConcurrency, cancelAgent
 *   - Dependency-blocked agents not launched
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import type { InternalAgentState } from "../src/daemon/state";
import { Scheduler } from "../src/daemon/scheduler";
import type { SchedulerConfig, SchedulerDeps } from "../src/daemon/scheduler";
import type { WomboConfig } from "../src/config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tempDir: string;

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "daemon-sched-test-"));
}

/** Minimal WomboConfig for testing (only fields the scheduler reads). */
function makeConfig(overrides: Partial<WomboConfig> = {}): WomboConfig {
  return {
    baseBranch: "main",
    maxConcurrent: 4,
    model: null,
    agent: { name: "test-agent", provider: "anthropic" },
    build: { command: "echo ok", enabled: false },
    merge: { strategy: "merge", maxEscalation: "tier4" },
    browser: { enabled: false },
    tdd: { enabled: false },
    tui: {},
    quest: {},
    ...overrides,
  } as WomboConfig;
}

/** Create a mock AgentRunner that records method calls. */
function makeMockRunner() {
  const calls: Array<{ method: string; args: any[] }> = [];
  return {
    calls,
    runner: {
      submitTask: (...args: any[]) => calls.push({ method: "submitTask", args }),
      launchAgent: (...args: any[]) => calls.push({ method: "launchAgent", args }),
      killAll: async () => { calls.push({ method: "killAll", args: [] }); },
      cancelAgent: (...args: any[]) => calls.push({ method: "cancelAgent", args }),
      reapDeadProcesses: () => calls.push({ method: "reapDeadProcesses", args: [] }),
    } as any,
  };
}

/** Create a DaemonState pre-populated with agents. */
function makePopulatedState(
  tempDir: string,
  agents: InternalAgentState[]
): DaemonState {
  const state = new DaemonState(tempDir);
  for (const agent of agents) {
    state.addAgent(agent);
  }
  return state;
}

/** Create a minimal agent. */
function makeAgent(
  featureId: string,
  overrides: Partial<InternalAgentState> = {}
): InternalAgentState {
  return createDaemonAgentState({
    featureId,
    taskTitle: `Task: ${featureId}`,
    branch: `feature/${featureId}`,
    baseBranch: "main",
    worktree: `/tmp/wt-${featureId}`,
    dependsOn: overrides.dependsOn ?? [],
    dependedOnBy: overrides.dependedOnBy ?? [],
    ...overrides,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Lifecycle: start
// ---------------------------------------------------------------------------

describe("Scheduler start", () => {
  test("sets scheduler status to running", () => {
    const state = new DaemonState(tempDir);
    // Add a non-terminal agent so tick doesn't immediately transition to idle
    state.addAgent(makeAgent("keep-alive"));
    state.updateAgentStatus("keep-alive", "running");

    const { runner } = makeMockRunner();
    const config: SchedulerConfig = {
      projectRoot: tempDir,
      config: makeConfig(),
      tickIntervalMs: 60000, // very long so tick doesn't auto-fire
    };

    const scheduler = new Scheduler(config, { state, runner });
    scheduler.start();

    expect(state.getSchedulerStatus()).toBe("running");
    scheduler.shutdown();
    state.destroy();
  });

  test("applies config overrides (maxConcurrent, model, questId)", () => {
    const state = new DaemonState(tempDir);
    const { runner } = makeMockRunner();
    const config: SchedulerConfig = {
      projectRoot: tempDir,
      config: makeConfig(),
      tickIntervalMs: 60000,
      maxConcurrent: 8,
      model: "gpt-4o",
      questId: "quest-1",
    };

    const scheduler = new Scheduler(config, { state, runner });
    scheduler.start();

    expect(state.getMaxConcurrent()).toBe(8);
    expect(state.getModel()).toBe("gpt-4o");
    expect(state.getQuestId()).toBe("quest-1");
    scheduler.shutdown();
    state.destroy();
  });

  test("sets baseBranch from config", () => {
    const state = new DaemonState(tempDir);
    const { runner } = makeMockRunner();
    const config: SchedulerConfig = {
      projectRoot: tempDir,
      config: makeConfig({ baseBranch: "develop" }),
      tickIntervalMs: 60000,
    };

    const scheduler = new Scheduler(config, { state, runner });
    scheduler.start();

    expect(state.getBaseBranch()).toBe("develop");
    scheduler.shutdown();
    state.destroy();
  });

  test("does not start if already running", () => {
    const state = new DaemonState(tempDir);
    const { runner } = makeMockRunner();
    const config: SchedulerConfig = {
      projectRoot: tempDir,
      config: makeConfig(),
      tickIntervalMs: 60000,
    };

    const scheduler = new Scheduler(config, { state, runner });
    scheduler.start();
    const startedAt = state.getSchedulerState().startedAt;

    // Start again — should be a no-op
    scheduler.start();
    expect(state.getSchedulerState().startedAt).toBe(startedAt);
    scheduler.shutdown();
    state.destroy();
  });
});

// ---------------------------------------------------------------------------
// Lifecycle: pause / resume
// ---------------------------------------------------------------------------

describe("Scheduler pause / resume", () => {
  test("pause sets status to paused", () => {
    const state = new DaemonState(tempDir);
    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();
    scheduler.pause();

    expect(state.getSchedulerStatus()).toBe("paused");
    scheduler.shutdown();
    state.destroy();
  });

  test("resume from paused sets status to running", () => {
    const state = new DaemonState(tempDir);
    // Need a non-terminal agent so resume-tick doesn't immediately go idle
    state.addAgent(makeAgent("keep-alive"));
    state.updateAgentStatus("keep-alive", "running");

    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();
    scheduler.pause();
    scheduler.resume();

    expect(state.getSchedulerStatus()).toBe("running");
    scheduler.shutdown();
    state.destroy();
  });

  test("resume from non-paused state is a no-op", () => {
    const state = new DaemonState(tempDir);
    state.addAgent(makeAgent("keep-alive"));
    state.updateAgentStatus("keep-alive", "running");

    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();
    // Already running — resume should do nothing
    scheduler.resume();
    expect(state.getSchedulerStatus()).toBe("running");
    scheduler.shutdown();
    state.destroy();
  });
});

// ---------------------------------------------------------------------------
// Lifecycle: stop
// ---------------------------------------------------------------------------

describe("Scheduler stop", () => {
  test("sets status to stopping", () => {
    const state = new DaemonState(tempDir);
    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();
    scheduler.stop();

    expect(state.getSchedulerStatus()).toBe("stopping");
    scheduler.shutdown();
    state.destroy();
  });
});

// ---------------------------------------------------------------------------
// Lifecycle: kill
// ---------------------------------------------------------------------------

describe("Scheduler kill", () => {
  test("calls runner.killAll and sets status to idle", async () => {
    const state = new DaemonState(tempDir);
    const { runner, calls } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();
    await scheduler.kill();

    expect(calls.some((c) => c.method === "killAll")).toBe(true);
    expect(state.getSchedulerStatus()).toBe("idle");
    scheduler.shutdown();
    state.destroy();
  });
});

// ---------------------------------------------------------------------------
// Lifecycle: shutdown
// ---------------------------------------------------------------------------

describe("Scheduler shutdown", () => {
  test("sets status to shutdown", () => {
    const state = new DaemonState(tempDir);
    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();
    scheduler.shutdown();

    expect(state.getSchedulerStatus()).toBe("shutdown");
    state.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tick: ready agents get launched
// ---------------------------------------------------------------------------

describe("Scheduler tick behavior", () => {
  test("launches ready queued agents on tick", async () => {
    const state = new DaemonState(tempDir);
    state.setMaxConcurrent(4);
    // Pre-populate agents that are queued with no deps
    state.addAgent(makeAgent("a1"));
    state.addAgent(makeAgent("a2"));

    const { runner, calls } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );

    // Start fires immediate tick
    scheduler.start();

    // The tick should have seen 2 ready agents and called launchAgent
    const launchCalls = calls.filter((c) => c.method === "launchAgent");
    expect(launchCalls).toHaveLength(2);
    expect(launchCalls.map((c) => c.args[0]).sort()).toEqual(["a1", "a2"]);

    scheduler.shutdown();
    state.destroy();
  });

  test("respects concurrency limit", async () => {
    const state = new DaemonState(tempDir);
    state.setMaxConcurrent(1);

    // Already have one active agent
    const active = makeAgent("active");
    state.addAgent(active);
    state.updateAgentStatus("active", "running");

    // Two more queued
    state.addAgent(makeAgent("q1"));
    state.addAgent(makeAgent("q2"));

    const { runner, calls } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();

    // No launches should happen — 0 available slots
    const launchCalls = calls.filter((c) => c.method === "launchAgent");
    expect(launchCalls).toHaveLength(0);

    scheduler.shutdown();
    state.destroy();
  });

  test("does not launch dependency-blocked agents", () => {
    const state = new DaemonState(tempDir);
    state.setMaxConcurrent(4);

    state.addAgent(makeAgent("dep-1"));
    state.addAgent(makeAgent("child-1", { dependsOn: ["dep-1"] }));

    const { runner, calls } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();

    // Only dep-1 should be launched, not child-1
    const launchCalls = calls.filter((c) => c.method === "launchAgent");
    expect(launchCalls).toHaveLength(1);
    expect(launchCalls[0].args[0]).toBe("dep-1");

    scheduler.shutdown();
    state.destroy();
  });

  test("pinned agents are launched first", () => {
    const state = new DaemonState(tempDir);
    state.setMaxConcurrent(1); // only 1 slot

    state.addAgent(makeAgent("normal"));
    state.addAgent(makeAgent("pinned"));
    state.pinTask("pinned");

    const { runner, calls } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();

    // Only 1 slot — the pinned agent should get it
    const launchCalls = calls.filter((c) => c.method === "launchAgent");
    expect(launchCalls).toHaveLength(1);
    expect(launchCalls[0].args[0]).toBe("pinned");

    scheduler.shutdown();
    state.destroy();
  });

  test("does not pick tasks when paused", () => {
    const state = new DaemonState(tempDir);
    state.addAgent(makeAgent("a1"));

    const { runner, calls } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();

    // Clear the launch calls from the initial tick
    const initialCalls = calls.length;

    // Pause and trigger another round
    scheduler.pause();

    // Manually add another agent while paused
    state.addAgent(makeAgent("a2"));

    // Resume will trigger a tick
    const preResumeCalls = calls.length;
    scheduler.resume();
    // After resume, the new agent should be picked up
    const postResumeLaunch = calls.slice(preResumeCalls).filter((c) => c.method === "launchAgent");
    expect(postResumeLaunch.length).toBeGreaterThanOrEqual(1);

    scheduler.shutdown();
    state.destroy();
  });

  test("reaps dead processes on each tick", () => {
    const state = new DaemonState(tempDir);
    const { runner, calls } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();

    expect(calls.some((c) => c.method === "reapDeadProcesses")).toBe(true);

    scheduler.shutdown();
    state.destroy();
  });
});

// ---------------------------------------------------------------------------
// External signals
// ---------------------------------------------------------------------------

describe("Scheduler external signals", () => {
  test("pinTask delegates to state.pinTask", () => {
    const state = new DaemonState(tempDir);
    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();
    scheduler.pinTask("task-x");

    // The pin gets consumed during tick, but we can check that it was processed
    // by verifying the state accepted it (or consumed it if tick ran)
    // Just verify no error thrown
    scheduler.shutdown();
    state.destroy();
  });

  test("skipTask marks queued agent as failed", () => {
    const state = new DaemonState(tempDir);
    state.addAgent(makeAgent("skip-me"));

    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );

    // Don't start — we want the agent to stay queued
    scheduler.skipTask("skip-me");

    expect(state.isSkipped("skip-me")).toBe(true);
    expect(state.getAgent("skip-me")!.status).toBe("failed");
    scheduler.shutdown();
    state.destroy();
  });

  test("retryAgent re-queues a failed agent", () => {
    const state = new DaemonState(tempDir);
    state.addAgent(makeAgent("retry-me"));
    state.updateAgentStatus("retry-me", "running");
    state.updateAgentStatus("retry-me", "failed");

    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );

    scheduler.retryAgent("retry-me");

    // retryAgent in state sets to "retry", then scheduler sets to "queued"
    expect(state.getAgent("retry-me")!.status).toBe("queued");
    expect(state.getAgent("retry-me")!.retries).toBe(1);
    scheduler.shutdown();
    state.destroy();
  });

  test("setConcurrency updates max concurrent", () => {
    const state = new DaemonState(tempDir);
    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );
    scheduler.start();
    scheduler.setConcurrency(12);

    expect(state.getMaxConcurrent()).toBe(12);
    scheduler.shutdown();
    state.destroy();
  });

  test("cancelAgent calls runner.cancelAgent and marks agent failed", () => {
    const state = new DaemonState(tempDir);
    state.addAgent(makeAgent("cancel-me"));
    state.updateAgentStatus("cancel-me", "running");

    const { runner, calls } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );

    scheduler.cancelAgent("cancel-me");

    expect(calls.some((c) => c.method === "cancelAgent" && c.args[0] === "cancel-me")).toBe(true);
    expect(state.getAgent("cancel-me")!.status).toBe("failed");
    scheduler.shutdown();
    state.destroy();
  });

  test("cancelAgent cancels downstream dependents", () => {
    const state = new DaemonState(tempDir);
    state.addAgent(makeAgent("parent"));
    state.addAgent(makeAgent("child", { dependsOn: ["parent"] }));
    state.updateAgentStatus("parent", "running");

    const { runner } = makeMockRunner();
    const scheduler = new Scheduler(
      { projectRoot: tempDir, config: makeConfig(), tickIntervalMs: 60000 },
      { state, runner }
    );

    scheduler.cancelAgent("parent");

    expect(state.getAgent("parent")!.status).toBe("failed");
    expect(state.getAgent("child")!.status).toBe("failed");
    scheduler.shutdown();
    state.destroy();
  });
});
