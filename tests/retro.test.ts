/**
 * retro.test.ts — Retro collectors and candidate derivation over synthetic
 * analytics/replay/eval/comment data written into a temp project.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import YAML from "yaml";
import { AnalyticsStore, createAnalyticsRecord } from "../src/lib/analytics";
import { ReplayStore, type ReplayEvent } from "../src/lib/replay";
import { saveEvalReport, type ScoreReport } from "../src/lib/eval-score";
import {
  collectRetroInput,
  deriveCandidates,
  NAV_READS_THRESHOLD,
  LARGE_OUTPUT_CHARS,
  REPEATED_FAILURE_THRESHOLD,
  MAX_EVIDENCE,
  type RetroInput,
} from "../src/lib/retro";

const NOW = Date.parse("2026-06-10T00:00:00.000Z");

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "retro-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const tool = (name: string, input: Record<string, unknown>, extra: Partial<ReplayEvent> = {}): ReplayEvent => ({
  type: "tool",
  tool: name,
  status: "completed",
  input,
  ...extra,
});

function addExecution(
  taskId: string,
  executionId: string,
  events: ReplayEvent[],
  opts: { quest?: string | null; startedAt?: string; retries?: string[]; outcome?: "succeeded" | "failed" } = {},
): void {
  const startedAt = opts.startedAt ?? "2026-06-08T10:00:00.000Z";
  const store = new ReplayStore(root);
  store.begin({
    execution_id: executionId,
    task_id: taskId,
    quest_id: opts.quest ?? null,
    wave_id: "w1",
    agent: "a",
    model: "m",
    started_at: startedAt,
  });
  (opts.retries ?? []).forEach((text, i) =>
    store.append(taskId, executionId, { kind: "attempt", n: i + 2, reason: "retry", text }, startedAt),
  );
  for (const event of events) store.append(taskId, executionId, { kind: "event", event }, startedAt);
  if (opts.outcome) store.append(taskId, executionId, { kind: "end", outcome: opts.outcome, detail: "boom" }, startedAt);
}

function addAnalytics(taskId: string, executionId: string, over: Record<string, unknown> = {}): void {
  new AnalyticsStore(root).upsert(
    createAnalyticsRecord({
      execution_id: executionId,
      wave_id: "w1",
      task_id: taskId,
      first_started_at: "2026-06-08T10:00:00.000Z",
      ...over,
    }),
  );
}

function addComment(kind: "task" | "quest", refId: string, id: string, body: string, createdAt = "2026-06-08T12:00:00.000Z"): void {
  const dir = join(root, ".wombo-combo", "comments", kind, refId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.yml`), YAML.stringify({ author: "bob", role: "human", created_at: createdAt, body }));
}

const reads = (n: number, path = "src/deep/thing.ts"): ReplayEvent[] =>
  Array.from({ length: n }, (_, i) => tool(i % 2 ? "grep" : "read", { filePath: i % 2 ? "x" : path, pattern: "x" }));

describe("collectRetroInput", () => {
  test("empty project yields empty input without errors", () => {
    const input = collectRetroInput({ projectRoot: root, now: NOW });
    expect(input.executions).toEqual([]);
    expect(input.comments).toEqual([]);
    expect(input.evals).toEqual([]);
    expect(deriveCandidates(input)).toEqual([]);
  });

  test("joins analytics and replay by execution id", () => {
    addAnalytics("t1", "e1", { outcome: "failed", retry_count: 2, build_attempts: 3, build_passes: 1 });
    addExecution("t1", "e1", reads(4));
    const [e] = collectRetroInput({ projectRoot: root, now: NOW }).executions;
    expect(e.outcome).toBe("failed");
    expect(e.retryCount).toBe(2);
    expect(e.replay).not.toBeNull();
  });

  test("replay-only executions are still collected", () => {
    addExecution("t1", "e1", [], { outcome: "failed" });
    const [e] = collectRetroInput({ projectRoot: root, now: NOW }).executions;
    expect(e.taskId).toBe("t1");
    expect(e.outcome).toBe("failed");
  });

  test("filters by task, quest and sinceDays", () => {
    addExecution("t1", "e1", [], { quest: "q1" });
    addExecution("t2", "e2", [], { quest: "q2" });
    addExecution("t3", "e3", [], { quest: "q1", startedAt: "2026-05-01T00:00:00.000Z" });
    const ids = (scope: object) =>
      collectRetroInput({ projectRoot: root, scope, now: NOW }).executions.map((e) => e.executionId);
    expect(ids({ task: "t2" })).toEqual(["e2"]);
    expect(ids({ quest: "q1" })).toEqual(["e3", "e1"]);
    expect(ids({ quest: "q1", sinceDays: 7 })).toEqual(["e1"]);
  });

  test("counts explore calls and paths before the first edit", () => {
    addExecution("t1", "e1", [...reads(5), tool("edit", { filePath: "a.ts" }), ...reads(10)]);
    const r = collectRetroInput({ projectRoot: root, now: NOW }).executions[0].replay!;
    expect(r.exploreCallsBeforeFirstEdit).toBe(5);
    expect(r.pathsReadBeforeFirstEdit).toContain("src/deep/thing.ts");
  });

  test("no edit means null explore count", () => {
    addExecution("t1", "e1", reads(3));
    expect(collectRetroInput({ projectRoot: root, now: NOW }).executions[0].replay!.exploreCallsBeforeFirstEdit).toBeNull();
  });

  test("collects comments for task and quest scope, skipping old ones", () => {
    addExecution("t1", "e1", [], { quest: "q1" });
    addComment("task", "t1", "c1", "I am blocked on the API docs");
    addComment("task", "t1", "c2", "ancient", "2026-01-01T00:00:00.000Z");
    addComment("quest", "q1", "c3", "quest note");
    const byQuest = collectRetroInput({ projectRoot: root, scope: { quest: "q1", sinceDays: 30 }, now: NOW });
    expect(byQuest.comments.map((c) => c.id)).toEqual(["c1", "c3"]);
    const byTask = collectRetroInput({ projectRoot: root, scope: { task: "t1" }, now: NOW });
    expect(byTask.comments.map((c) => c.id)).toEqual(["c2", "c1"]);
    expect(collectRetroInput({ projectRoot: root, now: NOW }).comments).toHaveLength(3);
  });

  test("collects eval steering violations and scopes them", () => {
    const report = {
      schema: "wombo-eval/1",
      wave_id: "w1",
      evaluated_at: "2026-06-08T00:00:00.000Z",
      weighting: { score: null, comparable_pairs: 0, concordant_pairs: 0, details: [] },
      routing: { score: null, routed: 0, total: 0, mismatches: [] },
      steering: { score: 50, scoped_tasks: 2, violations: [{ a: "t1", b: "t2", path: "src/shared.ts" }], conflicts: 1 },
      flow: { score: 80, total: 2, succeeded: 1, failed: 1, total_retries: 3, max_concurrent_observed: 2 },
      overall: 60,
    } as ScoreReport;
    saveEvalReport(root, report);
    expect(collectRetroInput({ projectRoot: root, now: NOW }).evals[0].steeringViolations).toHaveLength(1);
    expect(collectRetroInput({ projectRoot: root, scope: { task: "other" }, now: NOW }).evals).toEqual([]);
    expect(collectRetroInput({ projectRoot: root, scope: { task: "t2" }, now: NOW }).evals).toHaveLength(1);
  });

  test("malformed analytics files are skipped", () => {
    const dir = join(root, ".wombo-combo", "analytics");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "bad.json"), "{nope");
    expect(collectRetroInput({ projectRoot: root, now: NOW }).executions).toEqual([]);
  });
});

describe("deriveCandidates", () => {
  const derive = (scope = {}) => deriveCandidates(collectRetroInput({ projectRoot: root, scope, now: NOW }));
  const byId = (id: string) => derive().find((c) => c.id === id);

  test("navigation: flags many reads before first edit with a pointer suggestion", () => {
    for (const n of [1, 2, 3]) addExecution(`t${n}`, `e${n}`, [...reads(NAV_READS_THRESHOLD), tool("edit", {})]);
    const c = byId("navigation:explore-before-edit")!;
    expect(c.category).toBe("navigation");
    expect(c.severity).toBe("high");
    expect(c.suggestion).toContain("navigation pointer");
    expect(c.suggestion).toContain("src/deep/thing.ts");
    expect(c.evidence[0]).toMatchObject({ taskId: "t1", executionId: "e1" });
  });

  test("navigation: below threshold yields nothing", () => {
    addExecution("t1", "e1", [...reads(NAV_READS_THRESHOLD - 1), tool("edit", {})]);
    expect(byId("navigation:explore-before-edit")).toBeUndefined();
  });

  test("severity scales with number of executions", () => {
    addExecution("t1", "e1", [...reads(NAV_READS_THRESHOLD), tool("edit", {})]);
    expect(byId("navigation:explore-before-edit")!.severity).toBe("low");
    addExecution("t2", "e2", [...reads(NAV_READS_THRESHOLD), tool("edit", {})]);
    expect(byId("navigation:explore-before-edit")!.severity).toBe("medium");
  });

  test("navigation: missing-path read errors", () => {
    addExecution("t1", "e1", [tool("read", { filePath: "nope.ts" }, { status: "error", error: "ENOENT: no such file nope.ts" })]);
    expect(byId("navigation:missing-paths")!.evidence[0].quote).toContain("ENOENT");
  });

  test("automated checks: failing test run in a replay", () => {
    addExecution("t1", "e1", [tool("bash", { command: "bun test" }, { output: "3 fail\nerror: expected 1" })]);
    const c = byId("automated-checks:check-failures")!;
    expect(c.evidence[0].quote).toContain("bun test");
  });

  test("automated checks: verification failures from analytics", () => {
    addAnalytics("t1", "e1", { build_attempts: 3, build_passes: 1 });
    const c = byId("automated-checks:verification-failures")!;
    expect(c.evidence[0].quote).toContain("2 of 3");
  });

  test("passing check runs are not failures", () => {
    addExecution("t1", "e1", [tool("bash", { command: "bun run typecheck" }, { output: "ok" })]);
    expect(byId("automated-checks:check-failures")).toBeUndefined();
  });

  test("coding standards: reviewer comments", () => {
    addComment("task", "t1", "c1", "Reviewer finding: should use the shared helper instead of fs");
    expect(byId("coding-standards:reviewer-findings")!.suggestion).toContain("lint rule");
  });

  test("steering files: eval violations and retried executions", () => {
    addAnalytics("t1", "e1", { outcome: "failed", retry_count: 3 });
    addExecution("t1", "e1", [], { retries: ["typecheck failed"] });
    const c = byId("steering-files:retries-and-failures")!;
    expect(c.severity).toBe("medium");
    expect(c.evidence[0].quote).toBe("typecheck failed");
  });

  test("steering files: shared paths from eval violations", () => {
    const input: RetroInput = {
      scope: {},
      since: null,
      executions: [],
      comments: [],
      evals: [{ waveId: "w1", overall: 50, steeringViolations: [{ a: "t1", b: "t2", path: "src/shared.ts" }], routingMismatches: [], failed: 0, totalRetries: 0 }],
    };
    const c = deriveCandidates(input).find((x) => x.id === "steering-files:shared-paths")!;
    expect(c.suggestion).toContain("src/shared.ts");
    expect(c.evidence[0].quote).toContain("wave w1");
  });

  test("tool economy: large outputs and repeated failing commands", () => {
    const failing = Array.from({ length: REPEATED_FAILURE_THRESHOLD }, () =>
      tool("bash", { command: "bun dev tasks list" }, { status: "error", error: "unknown flag" }),
    );
    addExecution("t1", "e1", [tool("bash", { command: "ls" }, { output: "x".repeat(LARGE_OUTPUT_CHARS) }), ...failing]);
    expect(byId("tool-economy:large-outputs")).toBeDefined();
    expect(byId("tool-economy:repeated-failing-commands")!.evidence[0].quote).toContain(`${REPEATED_FAILURE_THRESHOLD} times`);
  });

  test("information access: blocker comment and access errors", () => {
    addComment("task", "t1", "c1", "Blocked: cannot access the staging logs");
    addExecution("t2", "e2", [tool("bash", { command: "curl x" }, { status: "error", error: "403 forbidden" })]);
    const c = byId("information-access:blocked-on-information")!;
    expect(c.evidence).toHaveLength(2);
  });

  test("evidence is capped and output is sorted by severity", () => {
    for (let i = 0; i < 8; i++) addExecution(`t${i}`, `e${i}`, [...reads(NAV_READS_THRESHOLD), tool("edit", {})]);
    addComment("task", "t0", "c1", "nit: rename this");
    const cs = derive();
    expect(cs[0].severity).toBe("high");
    expect(cs[0].evidence.length).toBe(MAX_EVIDENCE);
    const ranks = cs.map((c) => ["high", "medium", "low"].indexOf(c.severity));
    expect(ranks).toEqual([...ranks].sort());
  });

  test("deterministic: same files give identical output", () => {
    addExecution("t1", "e1", [...reads(NAV_READS_THRESHOLD), tool("edit", {})]);
    addComment("task", "t1", "c1", "Blocked on docs");
    expect(JSON.stringify(derive())).toBe(JSON.stringify(derive()));
  });

  test("works on a hand-built input", () => {
    const input: RetroInput = { scope: {}, since: null, executions: [], comments: [], evals: [] };
    expect(deriveCandidates(input)).toEqual([]);
  });
});
