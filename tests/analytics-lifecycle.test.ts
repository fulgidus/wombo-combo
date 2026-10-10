/**
 * analytics-lifecycle.test.ts — AgentRunner/DaemonState integration with the
 * durable analytics store (execution identity, lifecycle, retries, usage).
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { AnalyticsStore, analyticsDir } from "../src/lib/analytics";
import type { WomboConfig } from "../src/config";
import type { Task } from "../src/lib/tasks";
import type { UsageRecord } from "../src/lib/token-collector";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Runner whose launches are never executed (lifecycle driven by tests). */
class NoLaunchRunner extends AgentRunner {
  protected override enqueueLaunch(): void {}
  registerContext(id: string): void {
    (this as any).registerUsageContext(id);
  }
  get monitorRef(): any {
    return (this as any).monitor;
  }
}

function usageRecord(over: Partial<UsageRecord> = {}): UsageRecord {
  return {
    task_id: "t1",
    quest_id: null,
    model: null,
    provider: null,
    harness: null,
    input_tokens: 10,
    output_tokens: 5,
    cache_read: 2,
    cache_write: 1,
    reasoning_tokens: 3,
    total_tokens: 18,
    cost: 0.25,
    is_final_step: false,
    timestamp: new Date().toISOString(),
    ...over,
  };
}

let root: string;
let state: DaemonState;
let runner: NoLaunchRunner;
let store: AnalyticsStore;

function setup(): void {
  state = new DaemonState(root);
  runner = new NoLaunchRunner({ projectRoot: root, config: makeConfig(), sessionId: "daemon-wave-1" }, state);
  store = new AnalyticsStore(root);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "analytics-lifecycle-"));
  mkdirSync(join(root, ".wombo-combo", "tasks"), { recursive: true });
  setup();
});

afterEach(() => {
  runner.destroy();
  state.destroy();
  rmSync(root, { recursive: true, force: true });
});

function submit(id: string, extra: Partial<Task> = {}) {
  runner.submitTask(makeTask(id, extra));
  return state.getAgent(id)!;
}

function snap(id: string) {
  const a = state.getAgent(id)!;
  return store.get(a.analytics!.execution_id)!;
}

// ---------------------------------------------------------------------------
// Identity & submission
// ---------------------------------------------------------------------------

describe("execution identity", () => {
  test("submission allocates a persisted execution with wave, quest, agent and model", () => {
    const agent = submit("t1", { quest: "q1", agent: "reviewer" } as Partial<Task>);
    const rec = snap("t1");
    expect(rec.execution_id).toBe(agent.analytics!.execution_id);
    expect(rec.wave_id).toBe("daemon-wave-1");
    expect(rec.task_id).toBe("t1");
    expect(rec.quest_id).toBe("q1");
    expect(rec.agent_id).toBe("reviewer");
    expect(rec.outcome).toBe("running");
    expect(rec.first_started_at).toBeNull();
    expect(rec.duration_ms).toBeNull();
    expect(rec.usage.record_count).toBe(0);
    expect(rec.usage_coverage).toBe("none");
  });

  test("resubmitting the same task creates a distinct execution; superseded one is finalized", () => {
    const a1 = submit("t1").analytics!.execution_id;
    const a2 = submit("t1").analytics!.execution_id;
    expect(a2).not.toBe(a1);
    expect(store.get(a1)!.outcome).toBe("stopped");
    expect(store.load().records.length).toBe(2);
  });

  test("analytics metadata is stripped from client snapshots", () => {
    submit("t1");
    const client = state.getSnapshot().agents[0] as any;
    expect(client.analytics).toBeUndefined();
    expect(client.analyticsUnmonitored).toBeUndefined();
    expect(client.featureId).toBe("t1");
    expect(JSON.stringify(state.getSnapshot())).not.toContain("execution_id");
  });

  test("older persisted state without analytics metadata still loads and restores", () => {
    const legacy = createDaemonAgentState({
      featureId: "old",
      taskTitle: "Old",
      branch: "feature/old",
      baseBranch: "main",
      worktree: join(root, "wt"),
    });
    legacy.status = "verified";
    legacy.startedAt = "2026-01-01T00:00:00.000Z";
    const s = new DaemonState(root);
    s.addAgent(legacy);
    s.save();
    s.destroy();

    const s2 = new DaemonState(root);
    s2.load();
    expect(s2.getAgent("old")!.analytics).toBeUndefined();
    const r2 = new NoLaunchRunner({ projectRoot: root, config: makeConfig(), sessionId: "w2" }, s2);
    r2.restoreAnalytics();
    const rec = s2.getAgent("old")!.analytics!;
    expect(rec.wave_id).toBe("w2");
    expect(rec.first_started_at).toBe("2026-01-01T00:00:00.000Z");
    expect(store.get(rec.execution_id)).not.toBeNull();
    r2.destroy();
    s2.destroy();
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("lifecycle", () => {
  test("first start is recorded once and survives retries; ordinary retries keep identity", () => {
    const agent = submit("t1");
    const id = agent.analytics!.execution_id;
    state.updateAgentStatus("t1", "installing");
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    const first = snap("t1").first_started_at;
    expect(first).not.toBeNull();

    state.updateAgent("t1", { retries: 1 });
    state.updateAgentStatus("t1", "retry", "Retry 1/2: boom");
    state.updateAgentStatus("t1", "running", "Retry launched");
    runner.analytics.recordProcessStart("t1");
    state.updateAgent("t1", { retries: 2 });
    state.updateAgentStatus("t1", "retry", "Retry 2/2: boom");

    const rec = snap("t1");
    expect(rec.execution_id).toBe(id);
    expect(rec.first_started_at).toBe(first);
    expect(rec.retry_count).toBe(2);
    expect(rec.outcome).toBe("running");
  });

  test("completed is intermediate; verified sets success, duration, and merge stays separate", async () => {
    submit("t1");
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    state.updateAgent("t1", { analytics: { ...state.getAgent("t1")!.analytics!, first_started_at: new Date(Date.now() - 5000).toISOString() } });

    state.updateAgentStatus("t1", "completed", "Agent process exited cleanly");
    let rec = snap("t1");
    expect(rec.outcome).toBe("running");
    expect(rec.verified_at).toBeNull();
    expect(rec.duration_ms).toBeNull();

    state.updateAgentStatus("t1", "verified", "Build passed");
    rec = snap("t1");
    expect(rec.outcome).toBe("succeeded");
    expect(rec.verified_at).not.toBeNull();
    expect(rec.duration_ms!).toBeGreaterThanOrEqual(4900);
    expect(rec.merge_outcome).toBe("pending");

    const duration = rec.duration_ms;
    await new Promise((r) => setTimeout(r, 20));
    state.updateAgentStatus("t1", "merged", "MERGED");
    rec = snap("t1");
    expect(rec.merge_outcome).toBe("merged");
    expect(rec.duration_ms).toBe(duration); // merge waiting excluded
  });

  test("measurements are captured before the verified event is emitted", () => {
    submit("t1");
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    let outcomeAtEmit: string | undefined;
    state.subscribe((type, payload: any) => {
      if (type === "evt:agent-status-change" && payload.newStatus === "verified") {
        outcomeAtEmit = store.get(state.getAgent("t1")!.analytics!.execution_id)?.outcome;
      }
    });
    state.updateAgentStatus("t1", "verified");
    expect(outcomeAtEmit).toBe("succeeded");
  });

  test("verified work that later fails to merge stays succeeded with merge failed", () => {
    submit("t1");
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    state.updateAgentStatus("t1", "verified");
    state.updateAgentStatus("t1", "failed", "All conflict resolution tiers exhausted");
    const rec = snap("t1");
    expect(rec.outcome).toBe("succeeded");
    expect(rec.merge_outcome).toBe("failed");
  });

  test("genuine failure is outcome failed without a duration", () => {
    submit("t1");
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    state.updateAgentStatus("t1", "failed", "Build failed, retries exhausted");
    const rec = snap("t1");
    expect(rec.outcome).toBe("failed");
    expect(rec.duration_ms).toBeNull();
    expect(rec.merge_outcome).toBe("not_applicable");
  });

  test("launch errors are recorded as failed (real launch path)", async () => {
    // Real AgentRunner (no launch override): worktree creation fails in a non-git dir.
    const r = new AgentRunner({ projectRoot: root, config: makeConfig(), sessionId: "w-launch" }, state);
    r.submitTask(makeTask("lerr"));
    for (let i = 0; i < 100 && state.getAgent("lerr")!.status !== "failed"; i++) {
      await new Promise((res) => setTimeout(res, 50));
    }
    expect(state.getAgent("lerr")!.status).toBe("failed");
    const rec = store.get(state.getAgent("lerr")!.analytics!.execution_id)!;
    expect(rec.outcome).toBe("failed");
    expect(rec.first_started_at).toBeNull();
    expect(rec.duration_ms).toBeNull();
    r.destroy();
  }, 15000);
});

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

describe("cancellation", () => {
  test("queued user cancel is stopped with no invented duration or usage", () => {
    submit("t1");
    runner.cancelAgent("t1");
    state.updateAgentStatus("t1", "failed", "Cancelled by user");
    const rec = snap("t1");
    expect(rec.outcome).toBe("stopped");
    expect(rec.first_started_at).toBeNull();
    expect(rec.duration_ms).toBeNull();
    expect(rec.usage.total_tokens).toBe(0);
    expect(rec.usage_coverage).toBe("none");
  });

  test("downstream cancellation is stopped, not failed", () => {
    submit("up");
    runner.submitTask(makeTask("down", { depends_on: ["up"] }));
    state.cancelDownstream("up");
    expect(snap("down").outcome).toBe("stopped");
  });

  test("skipped queued agent is stopped", () => {
    submit("t1");
    state.updateAgentStatus("t1", "failed", "Skipped by user");
    expect(snap("t1").outcome).toBe("stopped");
  });

  test("killAll interrupts unfinished executions and late exit callbacks cannot alter them", async () => {
    submit("t1");
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    await runner.killAll();
    expect(snap("t1").outcome).toBe("stopped");
    // late callback: process exit handler reports an error -> retry event
    state.updateAgent("t1", { retries: 1 });
    state.updateAgentStatus("t1", "retry", "Retry 1/2: killed");
    const rec = snap("t1");
    expect(rec.outcome).toBe("stopped");
    expect(rec.retry_count).toBe(0);
    expect(state.getAgent("t1")!.analytics!.execution_id).toBe(rec.execution_id);
  });
});

// ---------------------------------------------------------------------------
// Reruns
// ---------------------------------------------------------------------------

describe("explicit reruns", () => {
  test("user retry of a failed execution starts a new execution with retries reset", () => {
    const agent = submit("t1");
    const firstId = agent.analytics!.execution_id;
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    state.updateAgentStatus("t1", "failed", "boom");
    expect(store.get(firstId)!.outcome).toBe("failed");

    expect(state.retryAgent("t1")).toBe(true); // user-initiated path
    const secondId = state.getAgent("t1")!.analytics!.execution_id;
    expect(secondId).not.toBe(firstId);
    const second = store.get(secondId)!;
    expect(second.retry_count).toBe(0);
    expect(second.first_started_at).toBeNull();
    expect(second.outcome).toBe("running");
    expect(second.usage.record_count).toBe(0);
    expect(store.get(firstId)!.outcome).toBe("failed");

    // scheduler then re-queues; must not allocate a third execution
    state.updateAgentStatus("t1", "queued", "Retry requested by user");
    expect(state.getAgent("t1")!.analytics!.execution_id).toBe(secondId);
    expect(store.load().records.length).toBe(2);
  });

  test("user rerun with exhausted retries (direct reset + queued) starts a new execution", () => {
    const agent = submit("t1");
    const firstId = agent.analytics!.execution_id;
    state.updateAgentStatus("t1", "failed", "boom");
    agent.retries = 0; // what Scheduler.retryAgent does when exhausted
    state.updateAgentStatus("t1", "queued", "Retry requested by user");
    expect(state.getAgent("t1")!.analytics!.execution_id).not.toBe(firstId);
    expect(store.load().records.length).toBe(2);
  });

  test("user rerun of a verified (merge-failed) execution is a new execution", () => {
    const agent = submit("t1");
    const firstId = agent.analytics!.execution_id;
    state.updateAgentStatus("t1", "verified");
    expect(state.retryAgent("t1")).toBe(true);
    expect(state.getAgent("t1")!.analytics!.execution_id).not.toBe(firstId);
    expect(store.get(firstId)!.outcome).toBe("succeeded");
  });
});

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

describe("usage", () => {
  test("accumulates every UsageTotals field and reports full coverage", () => {
    submit("t1");
    runner.analytics.recordUsage("t1", usageRecord());
    runner.analytics.recordUsage("t1", usageRecord({ input_tokens: 1, output_tokens: 1, cache_read: 0, cache_write: 0, reasoning_tokens: 0, total_tokens: 2, cost: 0.5 }));
    const rec = snap("t1");
    expect(rec.usage).toEqual({
      input_tokens: 11,
      output_tokens: 6,
      cache_read: 2,
      cache_write: 1,
      reasoning_tokens: 3,
      total_tokens: 20,
      total_cost: 0.75,
      record_count: 2,
    });
    expect(rec.usage_coverage).toBe("full");
  });

  test("conflict resolver activity makes coverage partial", () => {
    submit("t1");
    runner.analytics.recordUsage("t1", usageRecord());
    runner.analytics.markUnmonitoredUsage("t1");
    expect(snap("t1").usage_coverage).toBe("partial");
    runner.analytics.recordUsage("t1", usageRecord());
    expect(snap("t1").usage_coverage).toBe("partial");
  });

  test("usage flows through the monitor once: usage.jsonl has one line, analytics counts it once", () => {
    submit("t1", { quest: "q9" } as Partial<Task>);
    runner.registerContext("t1");
    runner.monitorRef.tokenCollector.ingestEvent("t1", {
      type: "step_finish",
      sessionID: "s",
      timestamp: Date.now(),
      part: { reason: "stop", cost: 0.1, tokens: { total: 15, input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } } },
    });
    const lines = readFileSync(join(root, ".wombo-combo", "usage.jsonl"), "utf-8").trim().split("\n");
    expect(lines.length).toBe(1);
    expect(JSON.parse(lines[0]).quest_id).toBe("q9");
    const rec = snap("t1");
    expect(rec.usage.record_count).toBe(1);
    expect(rec.usage.total_tokens).toBe(15);
  });

  test("usage totals are independent of the collector's in-memory history", () => {
    submit("t1");
    runner.analytics.recordUsage("t1", usageRecord());
    runner.monitorRef.tokenCollector.clearAll();
    runner.analytics.recordUsage("t1", usageRecord());
    expect(snap("t1").usage.record_count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Removal hooks, teardown, restore
// ---------------------------------------------------------------------------

describe("removal, teardown and recovery", () => {
  test("removeAgent / clearCompleted / reset finalize unfinished executions", () => {
    submit("a");
    submit("b");
    submit("c");
    state.updateAgentStatus("b", "failed", "x");
    const ids = ["a", "b", "c"].map((i) => state.getAgent(i)!.analytics!.execution_id);

    state.removeAgent("a");
    expect(store.get(ids[0])!.outcome).toBe("stopped");

    expect(state.clearCompleted()).toBe(1);
    expect(store.get(ids[1])!.outcome).toBe("failed");

    state.reset();
    expect(store.get(ids[2])!.outcome).toBe("stopped");
  });

  test("interruptAnalytics finalizes then ignores late callbacks; verified work keeps merge pending", () => {
    submit("run");
    submit("ver");
    state.updateAgentStatus("run", "running");
    state.updateAgentStatus("ver", "verified");
    runner.interruptAnalytics("daemon shutdown");
    expect(snap("run").outcome).toBe("stopped");
    expect(snap("ver").outcome).toBe("succeeded");
    expect(snap("ver").merge_outcome).toBe("pending");

    state.updateAgentStatus("run", "failed", "late error");
    state.updateAgentStatus("ver", "merged", "late merge");
    expect(snap("run").outcome).toBe("stopped");
    expect(snap("ver").merge_outcome).toBe("pending");
    runner.analytics.recordUsage("run", usageRecord());
    expect(snap("run").usage.record_count).toBe(0);
  });

  test("restore keeps execution and wave identity and adopts newer stored snapshots", () => {
    const agent = submit("t1");
    state.updateAgentStatus("t1", "verified");
    const id = agent.analytics!.execution_id;
    state.save();

    // Simulate a restart: new state/runner with a different wave.
    runner.destroy();
    state.destroy();
    const s2 = new DaemonState(root);
    s2.load();
    const r2 = new NoLaunchRunner({ projectRoot: root, config: makeConfig(), sessionId: "daemon-wave-2" }, s2);
    // a later snapshot exists in the store than in the persisted daemon state
    const stored = store.get(id)!;
    store.upsert({ ...stored, retry_count: 4 });
    r2.restoreAnalytics();
    const rec = s2.getAgent("t1")!.analytics!;
    expect(rec.execution_id).toBe(id);
    expect(rec.wave_id).toBe("daemon-wave-1");
    expect(rec.retry_count).toBe(4);

    s2.updateAgentStatus("t1", "merged", "MERGED");
    expect(store.get(id)!.merge_outcome).toBe("merged");
    expect(store.load().records.length).toBe(1);
    r2.destroy();
    s2.destroy();
    // keep afterEach happy
    state = new DaemonState(root);
    runner = new NoLaunchRunner({ projectRoot: root, config: makeConfig() }, state);
  });

  test("recovered active agents are marked unmonitored so usage coverage is partial", () => {
    submit("t1");
    state.updateAgentStatus("t1", "running");
    state.save();
    runner.destroy();
    state.destroy();
    const s2 = new DaemonState(root);
    s2.load();
    const r2 = new NoLaunchRunner({ projectRoot: root, config: makeConfig() }, s2);
    r2.restoreAnalytics();
    expect(s2.getAgent("t1")!.analyticsUnmonitored).toBe(true);
    r2.analytics.recordUsage("t1", usageRecord());
    expect(store.get(s2.getAgent("t1")!.analytics!.execution_id)!.usage_coverage).toBe("partial");
    r2.destroy();
    s2.destroy();
    state = new DaemonState(root);
    runner = new NoLaunchRunner({ projectRoot: root, config: makeConfig() }, state);
  });

  test("persistence failures are observable and never throw into execution", () => {
    // Make the analytics directory path a regular file so writes fail.
    mkdirSync(join(root, ".wombo-combo"), { recursive: true });
    rmSync(analyticsDir(root), { recursive: true, force: true });
    writeFileSync(analyticsDir(root), "not a directory");
    const logs: string[] = [];
    state.subscribe((type, payload: any) => {
      if (type === "evt:log") logs.push(payload.message);
    });
    expect(() => submit("t1")).not.toThrow();
    expect(() => state.updateAgentStatus("t1", "verified")).not.toThrow();
    expect(runner.analytics.diagnostics.length).toBeGreaterThan(0);
    expect(logs.some((m) => m.includes("[analytics]"))).toBe(true);
    // execution continues: in-memory state still advanced
    expect(state.getAgent("t1")!.status).toBe("verified");
    expect(existsSync(analyticsDir(root))).toBe(true);
  });

  test("persistence is incremental and does not depend on history export", () => {
    submit("t1");
    expect(store.load().records.length).toBe(1);
    state.updateAgentStatus("t1", "verified");
    // new work accepted after everything else finished
    state.updateAgentStatus("t1", "merged");
    submit("t2");
    expect(store.load().records.length).toBe(2);
    expect(existsSync(join(root, ".wombo-combo", "history"))).toBe(false);
  });
});
