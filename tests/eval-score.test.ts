/**
 * eval-score.test.ts — Unit tests for the eval scoring library.
 *
 * Covers: weighting concordance, routing-table compliance, file-scope
 * steering violations, flow scoring, report persistence round-trip.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  scoreSession,
  saveEvalReport,
  loadEvalReport,
  type ScoreReport,
} from "../src/lib/eval-score";
import type { WaveHistoryRecord, AgentHistoryRecord } from "../src/lib/history";
import type { Task } from "../src/lib/tasks";
import type { WomboConfig } from "../src/config";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let tempDir: string;

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

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
    defaults: { maxConcurrent: 4, maxRetries: 2 },
    ...overrides,
  } as WomboConfig;
}

function makeAgent(overrides: Partial<AgentHistoryRecord> = {}): AgentHistoryRecord {
  return {
    feature_id: "task-a",
    branch: "feature/task-a",
    status: "merged",
    retries: 0,
    max_retries: 2,
    build_passed: true,
    started_at: "2026-09-30T10:00:00.000Z",
    completed_at: "2026-09-30T10:00:10.000Z",
    duration_ms: 10_000,
    error: null,
    had_merge_conflict: false,
    build_output: null,
    model: null,
    ...overrides,
  };
}

function makeRecord(agents: AgentHistoryRecord[], overrides: Partial<WaveHistoryRecord> = {}): WaveHistoryRecord {
  return {
    wave_id: "daemon-2026-09-30-10-00-00",
    base_branch: "main",
    started_at: "2026-09-30T10:00:00.000Z",
    exported_at: "2026-09-30T10:01:00.000Z",
    model: null,
    max_concurrent: 4,
    interactive: false,
    summary: {
      total: agents.length,
      succeeded: agents.length,
      failed: 0,
      merged: agents.length,
      verified: 0,
      total_retries: 0,
      total_duration_ms: 0,
    },
    agents,
    ...overrides,
  };
}

const LIGHT = "light";
const MEDIUM = "medium";
const HEAVY = "heavy";

function makeTask(id: string, weight: string, paths: string[] = []): Task {
  const presets: Record<string, { difficulty: string; priority: string; effort: string }> = {
    [LIGHT]: { difficulty: "trivial", priority: "low", effort: "PT15M" },
    [MEDIUM]: { difficulty: "medium", priority: "medium", effort: "PT1H" },
    [HEAVY]: { difficulty: "very_hard", priority: "critical", effort: "PT2D" },
  };
  const p = presets[weight];
  return {
    id,
    title: id,
    description: "",
    status: "done",
    completion: 100,
    difficulty: p.difficulty as Task["difficulty"],
    priority: p.priority as Task["priority"],
    effort: p.effort,
    depends_on: [],
    started_at: null,
    ended_at: null,
    constraints: [],
    forbidden: [],
    references: [],
    notes: [],
    subtasks: [],
    paths,
  } as unknown as Task;
}

function tasksById(...tasks: Task[]): Map<string, Task> {
  return new Map(tasks.map((t) => [t.id, t]));
}

// ---------------------------------------------------------------------------
// Weighting
// ---------------------------------------------------------------------------

describe("scoreSession weighting", () => {
  test("concordant weights→durations score 100", () => {
    const record = makeRecord([
      makeAgent({ feature_id: "light-1", duration_ms: 5_000 }),
      makeAgent({ feature_id: "heavy-1", duration_ms: 60_000 }),
    ]);
    const report = scoreSession(
      record,
      tasksById(makeTask("light-1", LIGHT), makeTask("heavy-1", HEAVY)),
      makeConfig()
    );
    expect(report.weighting.comparable_pairs).toBe(1);
    expect(report.weighting.concordant_pairs).toBe(1);
    expect(report.weighting.score).toBe(100);
  });

  test("inverted durations score 0", () => {
    const record = makeRecord([
      makeAgent({ feature_id: "light-1", duration_ms: 60_000 }),
      makeAgent({ feature_id: "heavy-1", duration_ms: 5_000 }),
    ]);
    const report = scoreSession(
      record,
      tasksById(makeTask("light-1", LIGHT), makeTask("heavy-1", HEAVY)),
      makeConfig()
    );
    expect(report.weighting.score).toBe(0);
  });

  test("ties count as concordant", () => {
    const record = makeRecord([
      makeAgent({ feature_id: "light-1", duration_ms: 10_000 }),
      makeAgent({ feature_id: "heavy-1", duration_ms: 10_000 }),
    ]);
    const report = scoreSession(
      record,
      tasksById(makeTask("light-1", LIGHT), makeTask("heavy-1", HEAVY)),
      makeConfig()
    );
    expect(report.weighting.score).toBe(100);
  });

  test("single comparable pair minimum: no pairs → null", () => {
    const record = makeRecord([makeAgent({ feature_id: "only-1" })]);
    const report = scoreSession(
      record,
      tasksById(makeTask("only-1", MEDIUM)),
      makeConfig()
    );
    expect(report.weighting.comparable_pairs).toBe(0);
    expect(report.weighting.score).toBeNull();
  });

  test("unknown tasks are excluded from details", () => {
    const record = makeRecord([makeAgent({ feature_id: "ghost" })]);
    const report = scoreSession(record, tasksById(), makeConfig());
    expect(report.weighting.details).toHaveLength(0);
    expect(report.weighting.score).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

describe("scoreSession routing", () => {
  test("no routing table → null score", () => {
    const record = makeRecord([makeAgent({ feature_id: "t1" })]);
    const report = scoreSession(
      record,
      tasksById(makeTask("t1", MEDIUM)),
      makeConfig()
    );
    expect(report.routing.score).toBeNull();
  });

  test("matching models score 100", () => {
    const config = makeConfig({ modelRouting: { light: "m-light", heavy: "m-heavy" } });
    const record = makeRecord([
      makeAgent({ feature_id: "l1", model: "m-light" }),
      makeAgent({ feature_id: "h1", model: "m-heavy" }),
    ]);
    const report = scoreSession(
      record,
      tasksById(makeTask("l1", LIGHT), makeTask("h1", HEAVY)),
      config
    );
    expect(report.routing.score).toBe(100);
    expect(report.routing.routed).toBe(2);
    expect(report.routing.mismatches).toHaveLength(0);
  });

  test("wrong model → mismatch recorded and score reduced", () => {
    const config = makeConfig({ modelRouting: { light: "m-light" } });
    const record = makeRecord([
      makeAgent({ feature_id: "l1", model: "oops-model" }),
    ]);
    const report = scoreSession(
      record,
      tasksById(makeTask("l1", LIGHT)),
      config
    );
    expect(report.routing.mismatches).toHaveLength(1);
    expect(report.routing.mismatches[0]).toMatchObject({
      feature_id: "l1",
      weight: LIGHT,
      expected_model: "m-light",
      actual_model: "oops-model",
    });
    expect(report.routing.score).toBe(0);
  });

  test("unrouted weight class falls back to session model", () => {
    const config = makeConfig({ modelRouting: { light: "m-light" } });
    const record = makeRecord(
      [makeAgent({ feature_id: "h1", model: "session-model" })],
      { model: "session-model" }
    );
    const report = scoreSession(
      record,
      tasksById(makeTask("h1", HEAVY)),
      config
    );
    expect(report.routing.mismatches).toHaveLength(0);
    expect(report.routing.score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Steering
// ---------------------------------------------------------------------------

describe("scoreSession steering", () => {
  test("no scoped tasks → null score", () => {
    const record = makeRecord([makeAgent({ feature_id: "t1" })]);
    const report = scoreSession(
      record,
      tasksById(makeTask("t1", MEDIUM)),
      makeConfig()
    );
    expect(report.steering.score).toBeNull();
    expect(report.steering.scoped_tasks).toBe(0);
  });

  test("overlapping paths running concurrently → violation", () => {
    const record = makeRecord([
      makeAgent({ feature_id: "a", started_at: "2026-09-30T10:00:00.000Z", completed_at: "2026-09-30T10:00:10.000Z" }),
      makeAgent({ feature_id: "b", started_at: "2026-09-30T10:00:05.000Z", completed_at: "2026-09-30T10:00:20.000Z" }),
    ]);
    const report = scoreSession(
      record,
      tasksById(
        makeTask("a", MEDIUM, ["src/"]),
        makeTask("b", MEDIUM, ["src/lib/x.ts"])
      ),
      makeConfig()
    );
    expect(report.steering.violations).toHaveLength(1);
    expect(report.steering.violations[0]).toMatchObject({ a: "a", b: "b", path: "src/" });
    expect(report.steering.score).toBe(75);
  });

  test("disjoint paths running concurrently → no violation", () => {
    const record = makeRecord([
      makeAgent({ feature_id: "a", started_at: "2026-09-30T10:00:00.000Z", completed_at: "2026-09-30T10:00:10.000Z" }),
      makeAgent({ feature_id: "b", started_at: "2026-09-30T10:00:00.000Z", completed_at: "2026-09-30T10:00:10.000Z" }),
    ]);
    const report = scoreSession(
      record,
      tasksById(
        makeTask("a", MEDIUM, ["src/a/"]),
        makeTask("b", MEDIUM, ["src/b/"])
      ),
      makeConfig()
    );
    expect(report.steering.violations).toHaveLength(0);
    expect(report.steering.score).toBe(100);
  });

  test("sequential execution of overlapping scopes → no violation", () => {
    const record = makeRecord([
      makeAgent({ feature_id: "a", started_at: "2026-09-30T10:00:00.000Z", completed_at: "2026-09-30T10:00:10.000Z" }),
      makeAgent({ feature_id: "b", started_at: "2026-09-30T10:00:10.000Z", completed_at: "2026-09-30T10:00:20.000Z" }),
    ]);
    const report = scoreSession(
      record,
      tasksById(
        makeTask("a", MEDIUM, ["src/"]),
        makeTask("b", MEDIUM, ["src/"])
      ),
      makeConfig()
    );
    expect(report.steering.violations).toHaveLength(0);
    expect(report.steering.score).toBe(100);
  });

  test("merge conflicts penalize the steering score", () => {
    const record = makeRecord([
      makeAgent({ feature_id: "a", had_merge_conflict: true }),
    ]);
    const report = scoreSession(
      record,
      tasksById(makeTask("a", MEDIUM, ["src/"])),
      makeConfig()
    );
    expect(report.steering.score).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// Flow + overall
// ---------------------------------------------------------------------------

describe("scoreSession flow and overall", () => {
  test("all merged, no retries → flow 100", () => {
    const record = makeRecord([makeAgent({ feature_id: "a" }), makeAgent({ feature_id: "b" })]);
    const report = scoreSession(record, tasksById(), makeConfig());
    expect(report.flow.score).toBe(100);
    expect(report.flow.total).toBe(2);
  });

  test("failed agents and retries reduce the flow score", () => {
    const record = makeRecord([
      makeAgent({ feature_id: "a" }),
      makeAgent({ feature_id: "b", status: "failed", retries: 2 } as Partial<AgentHistoryRecord>),
    ]);
    const report = scoreSession(record, tasksById(), makeConfig());
    expect(report.flow.succeeded).toBe(1);
    expect(report.flow.failed).toBe(1);
    expect(report.flow.total_retries).toBe(2);
    expect(report.flow.score).toBe(46); // 50 - 4
  });

  test("max_concurrent_observed counts overlapping intervals", () => {
    const base = "2026-09-30T10:00:0";
    const record = makeRecord([
      makeAgent({ feature_id: "a", started_at: `${base}0.000Z`, completed_at: `${base}9.000Z` }),
      makeAgent({ feature_id: "b", started_at: `${base}1.000Z`, completed_at: `${base}8.000Z` }),
      makeAgent({ feature_id: "c", started_at: `${base}2.000Z`, completed_at: `${base}5.000Z` }),
    ]);
    const report = scoreSession(record, tasksById(), makeConfig());
    expect(report.flow.max_concurrent_observed).toBe(3);
  });

  test("overall is the mean of non-null components", () => {
    // steering null (no scopes), routing null (no table) → mean(weighting, flow)
    const record = makeRecord([
      makeAgent({ feature_id: "l1", duration_ms: 5_000 }),
      makeAgent({ feature_id: "h1", duration_ms: 60_000 }),
    ]);
    const report = scoreSession(
      record,
      tasksById(makeTask("l1", LIGHT), makeTask("h1", HEAVY)),
      makeConfig()
    );
    expect(report.weighting.score).toBe(100);
    expect(report.flow.score).toBe(100);
    expect(report.overall).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe("eval report persistence", () => {
  test("saveEvalReport + loadEvalReport round-trip", () => {
    tempDir = mkdtempSync(join(tmpdir(), "eval-score-test-"));
    const record = makeRecord([makeAgent({ feature_id: "a" })]);
    const report = scoreSession(record, tasksById(), makeConfig());
    const path = saveEvalReport(tempDir, report);

    expect(existsSync(path)).toBe(true);
    expect(path).toContain(".wombo-combo/evals/");
    expect(path.endsWith(`${report.wave_id}.json`)).toBe(true);

    const loaded = loadEvalReport(tempDir, report.wave_id);
    expect(loaded).not.toBeNull();
    expect(loaded!.schema).toBe("wombo-eval/1");
    expect(loaded!.wave_id).toBe(report.wave_id);
    expect(loaded!.overall).toBe(report.overall);

    // Raw JSON is well-formed and versioned
    const raw = JSON.parse(readFileSync(path, "utf-8")) as ScoreReport;
    expect(raw.schema).toBe("wombo-eval/1");
  });
});
