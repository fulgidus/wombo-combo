import { describe, test, expect } from "bun:test";
import {
  MAX_ACTIVITY_ENTRIES,
  MAX_THROUGHPUT_BUCKETS,
  THROUGHPUT_BUCKET_MS,
  advanceThroughput,
  applyDashboardEvent,
  applySnapshot,
  categorize,
  createDashboardMetrics,
  createThroughput,
  estimateRemaining,
  parseTimestamp,
  recordCompletion,
  sanitizeLine,
  tickDashboardMetrics,
  type DashboardMetricsState,
} from "../src/lib/dashboard-metrics";
import type { DaemonAgentState, EvtStateSnapshot } from "../src/daemon/protocol";
import type { AgentStatus } from "../src/daemon/agent-status";

const MIN = THROUGHPUT_BUCKET_MS;
const T0 = Date.UTC(2026, 0, 1, 12, 0, 0); // minute-aligned

function agent(id: string, status: AgentStatus, extra: Partial<DaemonAgentState> = {}): DaemonAgentState {
  return {
    featureId: id,
    taskTitle: id,
    branch: `feature/${id}`,
    baseBranch: "main",
    worktree: "/tmp/x",
    status,
    pid: null,
    sessionId: null,
    activity: null,
    activityUpdatedAt: null,
    retries: 0,
    maxRetries: 3,
    startedAt: null,
    completedAt: null,
    buildPassed: null,
    error: null,
    effortEstimateMs: null,
    streamIndex: null,
    dependsOn: [],
    dependedOnBy: [],
    agentName: null,
    agentType: null,
    pendingQuestions: [],
    tokenUsage: null,
    ...extra,
  };
}

function snap(agents: DaemonAgentState[], maxConcurrent = 2, status: any = "running"): EvtStateSnapshot {
  return {
    scheduler: {
      status,
      maxConcurrent,
      model: null,
      baseBranch: "main",
      questId: "q1",
      startedAt: null,
      pinnedTasks: [],
      skippedTasks: [],
      totalProcessed: 0,
      totalCompleted: 0,
      totalFailed: 0,
    },
    agents,
    uptime: 1,
  };
}

function status(
  state: DashboardMetricsState,
  id: string,
  prev: AgentStatus,
  next: AgentStatus,
  now: number,
  detail?: string,
) {
  return applyDashboardEvent(
    state,
    { type: "evt:agent-status-change", payload: { featureId: id, previousStatus: prev, newStatus: next, detail } },
    now,
  );
}

const total = (s: DashboardMetricsState) => s.throughput.buckets.reduce((a, b) => a + b, 0);

describe("categorize", () => {
  test("maps statuses to dashboard buckets", () => {
    for (const s of ["installing", "running", "resolving_conflict"] as const) expect(categorize(s)).toBe("running");
    for (const s of ["completed", "verified", "merged"] as const) expect(categorize(s)).toBe("done");
    expect(categorize("failed")).toBe("failed");
    expect(categorize("queued")).toBe("queued");
    expect(categorize("retry")).toBe("retry");
  });
});

describe("counts", () => {
  test("running/done/failed follow lifecycle; queued and retry stay visible but uncounted", () => {
    const s = applySnapshot(
      createDashboardMetrics(T0),
      snap([
        agent("a", "running"),
        agent("b", "installing"),
        agent("c", "resolving_conflict"),
        agent("d", "completed"),
        agent("e", "verified"),
        agent("f", "merged"),
        agent("g", "failed"),
        agent("h", "queued"),
        agent("i", "retry"),
      ]),
      T0,
    );
    expect(s.counts).toEqual({ running: 3, done: 3, failed: 1, queued: 1, retry: 1, total: 9 });
    expect(s.hasSnapshot).toBe(true);
  });

  test("snapshot drops agents that are no longer tracked", () => {
    let s = applySnapshot(createDashboardMetrics(T0), snap([agent("a", "running"), agent("b", "running")]), T0);
    s = applySnapshot(s, snap([agent("a", "running")]), T0 + 1000);
    expect(Object.keys(s.agents)).toEqual(["a"]);
  });

  test("ignores malformed snapshot rows", () => {
    const bad = snap([agent("a", "running"), null as any, { status: "running" } as any]);
    const s = applySnapshot(createDashboardMetrics(T0), bad, T0);
    expect(s.counts.total).toBe(1);
    expect(applySnapshot(createDashboardMetrics(T0), { agents: null } as any, T0).counts.total).toBe(0);
  });
});

describe("throughput", () => {
  test("history is bounded to 60 minute buckets and starts empty", () => {
    const h = createThroughput();
    expect(h.buckets).toHaveLength(MAX_THROUGHPUT_BUCKETS);
    expect(MAX_THROUGHPUT_BUCKETS).toBe(60);
    const adv = advanceThroughput(h, T0);
    expect(adv.newestBucketStart).toBe(T0);
    expect(adv.buckets.every((b) => b === 0)).toBe(true);
  });

  test("empty buckets advance without events", () => {
    let s = createDashboardMetrics(T0);
    s = status(s, "a", "running", "completed", T0 + 10_000);
    expect(s.throughput.buckets[59]).toBe(1);
    s = tickDashboardMetrics(s, T0 + 3 * MIN + 5);
    expect(s.throughput.newestBucketStart).toBe(T0 + 3 * MIN);
    expect(s.throughput.buckets[56]).toBe(1);
    expect(s.throughput.buckets.slice(57)).toEqual([0, 0, 0]);
    s = tickDashboardMetrics(s, T0 + 500 * MIN);
    expect(total(s)).toBe(0);
    expect(s.throughput.buckets).toHaveLength(60);
  });

  test("clock moving backwards does not rewind", () => {
    const h = advanceThroughput(createThroughput(), T0 + 5 * MIN);
    expect(advanceThroughput(h, T0)).toBe(h);
  });

  test("invalid now is ignored", () => {
    const h = advanceThroughput(createThroughput(), T0);
    expect(advanceThroughput(h, NaN)).toBe(h);
    expect(advanceThroughput(h, Infinity)).toBe(h);
    expect(recordCompletion(h, NaN, T0)).toEqual(h);
  });

  test("completed -> verified -> merged counts once", () => {
    let s = createDashboardMetrics(T0);
    s = status(s, "a", "running", "completed", T0 + 1000);
    s = status(s, "a", "completed", "verified", T0 + 2000);
    s = status(s, "a", "verified", "merged", T0 + 3000);
    expect(total(s)).toBe(1);
  });

  test("repeated snapshots never recount", () => {
    let s = createDashboardMetrics(T0);
    s = applySnapshot(s, snap([agent("a", "running")]), T0);
    const done = snap([agent("a", "completed", { completedAt: new Date(T0 + 5000).toISOString() })]);
    s = applySnapshot(s, done, T0 + 6000);
    s = applySnapshot(s, done, T0 + 7000);
    s = applySnapshot(s, snap([agent("a", "merged", { completedAt: new Date(T0 + 5000).toISOString() })]), T0 + 8000);
    expect(total(s)).toBe(1);
  });

  test("snapshot after live completion does not double count", () => {
    let s = createDashboardMetrics(T0);
    s = status(s, "a", "running", "completed", T0 + 1000);
    s = applySnapshot(s, snap([agent("a", "completed", { completedAt: new Date(T0 + 1000).toISOString() })]), T0 + 2000);
    expect(total(s)).toBe(1);
  });

  test("initial snapshot seeds history from real completion timestamps only", () => {
    const s = applySnapshot(
      createDashboardMetrics(T0 + 10 * MIN),
      snap([
        agent("a", "merged", { completedAt: new Date(T0 + 8 * MIN + 1000).toISOString() }),
        agent("b", "merged", { completedAt: null }),
        agent("c", "merged", { completedAt: "not a date" }),
        agent("d", "merged", { completedAt: new Date(T0 - 5 * 60 * MIN).toISOString() }),
      ]),
      T0 + 10 * MIN,
    );
    expect(total(s)).toBe(1);
    expect(s.throughput.buckets[57]).toBe(1);
    expect(s.counts.done).toBe(4);
  });

  test("retry then completion counts a second successful execution", () => {
    let s = createDashboardMetrics(T0);
    s = status(s, "a", "running", "completed", T0 + 1000);
    s = status(s, "a", "completed", "failed", T0 + 2000, "verify failed");
    s = status(s, "a", "failed", "retry", T0 + 3000);
    s = status(s, "a", "retry", "running", T0 + 4000);
    s = status(s, "a", "running", "completed", T0 + 5000);
    expect(total(s)).toBe(2);
    expect(s.agents.a!.retries).toBe(1);
  });

  test("failures never count", () => {
    let s = createDashboardMetrics(T0);
    s = status(s, "a", "running", "failed", T0 + 1000);
    expect(total(s)).toBe(0);
    expect(s.counts.failed).toBe(1);
  });

  test("future and stale timestamps are clamped / dropped", () => {
    let h = advanceThroughput(createThroughput(), T0);
    h = recordCompletion(h, T0 + 99 * MIN, T0);
    expect(h.buckets[59]).toBe(1);
    h = recordCompletion(h, T0 - 61 * MIN, T0);
    expect(h.buckets.reduce((a, b) => a + b, 0)).toBe(1);
    h = recordCompletion(h, T0 - 59 * MIN, T0);
    expect(h.buckets[0]).toBe(1);
  });
});

describe("activity", () => {
  test("is newest-first, timestamped and bounded to 100", () => {
    let s = createDashboardMetrics(T0);
    for (let i = 0; i < 150; i++) s = status(s, `a${i}`, "queued", "running", T0 + i);
    expect(s.activity).toHaveLength(MAX_ACTIVITY_ENTRIES);
    expect(s.activity[0]!.featureId).toBe("a149");
    expect(s.activity[0]!.at).toBe(T0 + 149);
    expect(s.activity[99]!.featureId).toBe("a50");
  });

  test("captures status, activity, build, merge, scheduler and task-picked events", () => {
    let s = createDashboardMetrics(T0);
    s = status(s, "a", "running", "completed", T0 + 1);
    s = applyDashboardEvent(s, { type: "evt:agent-activity", payload: { featureId: "a", activity: "editing x.ts" } }, T0 + 2);
    s = applyDashboardEvent(s, { type: "evt:build-result", payload: { featureId: "a", passed: false } }, T0 + 3);
    s = applyDashboardEvent(s, { type: "evt:merge-result", payload: { featureId: "a", success: false, error: "conflict" } }, T0 + 4);
    s = applyDashboardEvent(s, { type: "evt:scheduler-status", payload: { status: "paused", reason: "user" } }, T0 + 5);
    s = applyDashboardEvent(s, { type: "evt:task-picked", payload: { taskId: "b", queuePosition: 0 } }, T0 + 6);
    expect(s.activity.map((e) => e.kind)).toEqual(["task", "scheduler", "merge", "build", "activity", "status"]);
    expect(s.activity[3]!.text).toBe("build failed");
    expect(s.activity[2]!.text).toContain("conflict");
  });

  test("consecutive activity from one agent replaces rather than floods", () => {
    let s = createDashboardMetrics(T0);
    for (let i = 0; i < 20; i++) {
      s = applyDashboardEvent(s, { type: "evt:agent-activity", payload: { featureId: "a", activity: `step ${i}` } }, T0 + i);
    }
    expect(s.activity).toHaveLength(1);
    expect(s.activity[0]!.text).toBe("step 19");
  });

  test("sanitizes control sequences and bounds length", () => {
    expect(sanitizeLine("a\x1b[31mred\x1b[0m\nline\t2")).not.toMatch(/[\u0000-\u001f]/);
    expect(sanitizeLine("x".repeat(500)).length).toBeLessThanOrEqual(200);
    const s = applyDashboardEvent(
      createDashboardMetrics(T0),
      { type: "evt:agent-activity", payload: { featureId: "a", activity: "\x1b]0;title\x07boom\r\nnext" } },
      T0,
    );
    expect(s.activity[0]!.text).not.toMatch(/[\u0000-\u001f]/);
  });

  test("malformed events are ignored", () => {
    const s = createDashboardMetrics(T0);
    expect(applyDashboardEvent(s, { type: "evt:agent-status-change", payload: null } as any, T0)).toBe(s);
    expect(applyDashboardEvent(s, { type: "evt:nope", payload: {} } as any, T0)).toBe(s);
    expect(applyDashboardEvent(s, null as any, T0)).toBe(s);
  });
});

describe("estimateRemaining", () => {
  test("none when nothing unfinished", () => {
    const s = applySnapshot(createDashboardMetrics(T0), snap([agent("a", "merged"), agent("b", "failed")]), T0);
    expect(estimateRemaining(s, T0)).toEqual({ kind: "none" });
    expect(estimateRemaining(createDashboardMetrics(T0), T0)).toEqual({ kind: "none" });
  });

  test("unknown without effort estimates or scheduler", () => {
    const s = applySnapshot(createDashboardMetrics(T0), snap([agent("a", "running")]), T0);
    expect(estimateRemaining(s, T0)).toEqual({ kind: "unknown", reason: "no-estimates" });
    const noSched = status(createDashboardMetrics(T0), "a", "queued", "running", T0);
    expect(estimateRemaining(noSched, T0)).toEqual({ kind: "unknown", reason: "no-scheduler" });
  });

  test("unknown while paused", () => {
    const s = applySnapshot(
      createDashboardMetrics(T0),
      snap([agent("a", "queued", { effortEstimateMs: 1000 })], 2, "paused"),
      T0,
    );
    expect(estimateRemaining(s, T0)).toEqual({ kind: "unknown", reason: "paused" });
  });

  test("subtracts elapsed time for running agents and divides by concurrency", () => {
    const s = applySnapshot(
      createDashboardMetrics(T0),
      snap(
        [
          agent("a", "running", { effortEstimateMs: 10 * MIN, startedAt: new Date(T0 - 4 * MIN).toISOString() }),
          agent("b", "queued", { effortEstimateMs: 6 * MIN }),
          agent("c", "queued", { effortEstimateMs: 6 * MIN }),
        ],
        2,
      ),
      T0,
    );
    // remaining 6 + 6 + 6 = 18 over 2 workers = 9 min; longest 6
    expect(estimateRemaining(s, T0)).toEqual({
      kind: "estimate",
      ms: 9 * MIN,
      approximate: true,
      scope: "tracked-agents",
      agents: 3,
      unestimated: 0,
    });
  });

  test("never negative when overrun; longest agent is a lower bound", () => {
    const s = applySnapshot(
      createDashboardMetrics(T0),
      snap(
        [
          agent("a", "running", { effortEstimateMs: MIN, startedAt: new Date(T0 - 10 * MIN).toISOString() }),
          agent("b", "queued", { effortEstimateMs: 30 * MIN }),
        ],
        8,
      ),
      T0,
    );
    expect((estimateRemaining(s, T0) as any).ms).toBe(30 * MIN);
  });

  test("concurrency zero means unlimited", () => {
    const s = applySnapshot(
      createDashboardMetrics(T0),
      snap([agent("a", "queued", { effortEstimateMs: 5 * MIN }), agent("b", "queued", { effortEstimateMs: 5 * MIN })], 0),
      T0,
    );
    expect(s.scheduler!.maxConcurrent).toBe(0);
    expect((estimateRemaining(s, T0) as any).ms).toBe(5 * MIN);
  });

  test("counts agents missing estimates separately", () => {
    const s = applySnapshot(
      createDashboardMetrics(T0),
      snap([agent("a", "queued", { effortEstimateMs: 5 * MIN }), agent("b", "queued", { effortEstimateMs: null })], 1),
      T0,
    );
    const e = estimateRemaining(s, T0) as any;
    expect(e.unestimated).toBe(1);
    expect(e.agents).toBe(2);
    expect(e.ms).toBe(5 * MIN);
  });

  test("ticks as time passes", () => {
    const s = applySnapshot(
      createDashboardMetrics(T0),
      snap([agent("a", "running", { effortEstimateMs: 10 * MIN, startedAt: new Date(T0).toISOString() })], 1),
      T0,
    );
    expect((estimateRemaining(s, T0) as any).ms).toBe(10 * MIN);
    expect((estimateRemaining(s, T0 + 4 * MIN) as any).ms).toBe(6 * MIN);
  });
});

describe("timestamps", () => {
  test("parseTimestamp rejects invalid values", () => {
    expect(parseTimestamp("nope")).toBeNull();
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp(NaN)).toBeNull();
    expect(parseTimestamp("2026-01-01T00:00:00.000Z")).toBe(Date.UTC(2026, 0, 1));
  });

  test("invalid receipt time does not corrupt state", () => {
    let s = createDashboardMetrics(T0);
    s = status(s, "a", "running", "completed", NaN);
    expect(Number.isFinite(s.throughput.newestBucketStart ?? 0)).toBe(true);
    expect(total(s)).toBe(0);
    expect(s.lastUpdatedAt).toBeNull();
  });
});
