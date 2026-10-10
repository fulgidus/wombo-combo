import { describe, test, expect } from "bun:test";
import { createAnalyticsRecord, type AgentAnalyticsRecord } from "../src/lib/analytics";
import {
  dedupeExecutions,
  filterExecutions,
  summarizeAnalytics,
  aggregateMetrics,
} from "../src/lib/analytics-summary";

function r(id: string, over: Partial<AgentAnalyticsRecord> = {}): AgentAnalyticsRecord {
  return createAnalyticsRecord({
    execution_id: id,
    wave_id: "w1",
    task_id: `t-${id}`,
    first_started_at: "2026-01-02T00:00:00.000Z",
    ...over,
  });
}
const usage = (total: number, cost = 0) => ({
  input_tokens: total / 2,
  output_tokens: total / 2,
  cache_read: 1,
  cache_write: 2,
  reasoning_tokens: 3,
  total_tokens: total,
  total_cost: cost,
  record_count: 1,
});

describe("dedupeExecutions", () => {
  test("keeps newest revision per execution id", () => {
    const out = dedupeExecutions([r("a", { revision: 1, retry_count: 0 }), r("a", { revision: 3, retry_count: 2 }), r("a", { revision: 2, retry_count: 1 })]);
    expect(out.length).toBe(1);
    expect(out[0].retry_count).toBe(2);
  });
  test("ties broken by updated_at", () => {
    const out = dedupeExecutions([
      r("a", { revision: 1, updated_at: "2026-01-01T00:00:00Z", retry_count: 1 }),
      r("a", { revision: 1, updated_at: "2026-01-02T00:00:00Z", retry_count: 2 }),
    ]);
    expect(out[0].retry_count).toBe(2);
  });
});

describe("filterExecutions", () => {
  const recs = [
    r("a", { quest_id: "q1", first_started_at: "2026-01-01T00:00:00Z", model: "m1", agent_id: "ag1" }),
    r("b", { quest_id: null, first_started_at: "2026-02-01T00:00:00Z", wave_id: "w2" }),
    r("c", { quest_id: "q2", first_started_at: null }),
  ];
  test("exact filters", () => {
    expect(filterExecutions(recs, { quest: "q1" }).map((x) => x.execution_id)).toEqual(["a"]);
    expect(filterExecutions(recs, { wave: "w2" }).map((x) => x.execution_id)).toEqual(["b"]);
    expect(filterExecutions(recs, { task: "t-c" }).map((x) => x.execution_id)).toEqual(["c"]);
    expect(filterExecutions(recs, { model: "m1" }).map((x) => x.execution_id)).toEqual(["a"]);
    expect(filterExecutions(recs, { agent: "ag1" }).map((x) => x.execution_id)).toEqual(["a"]);
  });
  test("unquested filter", () => {
    expect(filterExecutions(recs, { unquested: true }).map((x) => x.execution_id)).toEqual(["b"]);
  });
  test("inclusive date range on first start; never-started excluded when range given", () => {
    const ids = (f: object) => filterExecutions(recs, f).map((x) => x.execution_id);
    expect(ids({ since: "2026-01-01T00:00:00Z" })).toEqual(["a", "b"]);
    expect(ids({ until: "2026-01-01T00:00:00Z" })).toEqual(["a"]);
    expect(ids({ since: new Date("2026-01-01T00:00:00Z"), until: "2026-02-01T00:00:00Z" })).toEqual(["a", "b"]);
    expect(ids({})).toEqual(["a", "b", "c"]);
  });
  test("rejects invalid or reversed ranges", () => {
    expect(() => filterExecutions(recs, { since: "nope" })).toThrow();
    expect(() => filterExecutions(recs, { until: "nope" })).toThrow();
    expect(() => filterExecutions(recs, { since: "2026-03-01", until: "2026-01-01" })).toThrow();
  });
});

describe("aggregateMetrics", () => {
  test("empty input: counts zero, means and rates null", () => {
    const m = aggregateMetrics([]);
    expect(m.executions).toBe(0);
    expect(m.duration.mean_ms).toBeNull();
    expect(m.duration.samples).toBe(0);
    expect(m.builds.pass_rate).toBeNull();
    expect(m.lines.samples).toBe(0);
    expect(m.usage.samples).toBe(0);
  });

  test("outcome counts, durations only from succeeded with duration", () => {
    const m = aggregateMetrics([
      r("a", { outcome: "succeeded", duration_ms: 1000 }),
      r("b", { outcome: "succeeded", duration_ms: 3000 }),
      r("c", { outcome: "failed", duration_ms: 500 }),
      r("d", { outcome: "stopped" }),
      r("e", { outcome: "running" }),
      r("f", { outcome: "succeeded", duration_ms: null }),
      r("g", { outcome: "succeeded", duration_ms: 99, first_started_at: null }),
    ]);
    expect(m.executions).toBe(7);
    expect(m.outcomes).toEqual({ running: 1, succeeded: 4, failed: 1, stopped: 1 });
    expect(m.duration.samples).toBe(2);
    expect(m.duration.total_ms).toBe(4000);
    expect(m.duration.mean_ms).toBe(2000);
  });

  test("merge outcomes counted separately", () => {
    const m = aggregateMetrics([
      r("a", { outcome: "succeeded", merge_outcome: "merged" }),
      r("b", { outcome: "succeeded", merge_outcome: "failed" }),
    ]);
    expect(m.merge_outcomes.merged).toBe(1);
    expect(m.merge_outcomes.failed).toBe(1);
    expect(m.outcomes.succeeded).toBe(2);
  });

  test("build pass rate is total passes over total attempts", () => {
    const m = aggregateMetrics([
      r("a", { build_attempts: 1, build_passes: 1 }),
      r("b", { build_attempts: 3, build_passes: 0 }),
      r("c", { build_attempts: 0, build_passes: 0 }),
    ]);
    expect(m.builds.attempts).toBe(4);
    expect(m.builds.passes).toBe(1);
    expect(m.builds.pass_rate).toBeCloseTo(0.25, 10);
    expect(m.builds.samples).toBe(2);
  });

  test("retries total", () => {
    expect(aggregateMetrics([r("a", { retry_count: 2 }), r("b", { retry_count: 3 })]).retries.total).toBe(5);
  });

  test("usage distinguishes missing from observed zero and exposes coverage", () => {
    const m = aggregateMetrics([
      r("a", { usage: usage(100, 0.5), usage_coverage: "full" }),
      r("b", { usage: usage(50, 0.25), usage_coverage: "partial" }),
      r("c", { usage_coverage: "none" }),
      r("d", { usage: { ...usage(0), record_count: 0 }, usage_coverage: "full" }),
    ]);
    expect(m.usage.totals.total_tokens).toBe(150);
    expect(m.usage.totals.total_cost).toBeCloseTo(0.75, 10);
    expect(m.usage.totals.cache_read).toBe(3);
    expect(m.usage.totals.reasoning_tokens).toBe(9);
    expect(m.usage.samples).toBe(3);
    expect(m.usage.missing).toBe(1);
    expect(m.usage.coverage).toEqual({ none: 1, partial: 1, full: 2 });
  });

  test("lines only from eligible samples", () => {
    const m = aggregateMetrics([
      r("a", { additions: 10, deletions: 2 }),
      r("b", { additions: 5, deletions: 0 }),
      r("c", { additions: null, deletions: null }),
    ]);
    expect(m.lines).toEqual({ additions: 15, deletions: 2, changed: 17, samples: 2 });
  });
});

describe("summarizeAnalytics", () => {
  const recs = [
    r("a", { quest_id: "q1", model: "m1", outcome: "succeeded", duration_ms: 100, revision: 1 }),
    r("a", { quest_id: "q1", model: "m1", outcome: "succeeded", duration_ms: 200, revision: 2 }),
    r("b", { quest_id: "q1", model: "m2", outcome: "failed", task_id: "t-a" }),
    r("c", { quest_id: null, model: null, wave_id: "w2" }),
  ];

  test("no grouping returns total only, deduped", () => {
    const s = summarizeAnalytics(recs);
    expect(s.groupBy).toBeNull();
    expect(s.groups).toEqual([]);
    expect(s.total.executions).toBe(3);
    expect(s.total.duration.total_ms).toBe(200);
  });

  test("group by quest puts null key last", () => {
    const s = summarizeAnalytics(recs, { groupBy: "quest" });
    expect(s.groups.map((g) => g.key)).toEqual(["q1", null]);
    expect(s.groups[0].metrics.executions).toBe(2);
  });

  test("group by task keeps repeated task executions together", () => {
    const s = summarizeAnalytics(recs, { groupBy: "task" });
    const g = s.groups.find((x) => x.key === "t-a");
    expect(g?.metrics.executions).toBe(2);
  });

  test("group by wave, agent, model", () => {
    expect(summarizeAnalytics(recs, { groupBy: "wave" }).groups.map((g) => g.key)).toEqual(["w1", "w2"]);
    expect(summarizeAnalytics(recs, { groupBy: "model" }).groups.map((g) => g.key)).toEqual(["m1", "m2", null]);
    expect(summarizeAnalytics(recs, { groupBy: "agent" }).groups.map((g) => g.key)).toEqual([null]);
  });

  test("filter applied and echoed; result is JSON-serializable", () => {
    const s = summarizeAnalytics(recs, { filter: { quest: "q1" }, groupBy: "model" });
    expect(s.total.executions).toBe(2);
    expect(s.filter.quest).toBe("q1");
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  test("deterministic regardless of input order", () => {
    const a = summarizeAnalytics(recs, { groupBy: "task" });
    const b = summarizeAnalytics([...recs].reverse(), { groupBy: "task" });
    expect(b).toEqual(a);
  });
});
