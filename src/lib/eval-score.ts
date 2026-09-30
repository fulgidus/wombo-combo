/**
 * eval-score.ts — Eval-style scoring of a completed daemon session.
 *
 * Rates a WaveHistoryRecord (plus the task store for planner estimates)
 * along four dimensions:
 *
 *   weighting — planner estimates (difficulty/effort/priority → task weight)
 *               vs observed outcome: do heavier tasks take longer? Scored by
 *               pairwise concordance of weight class vs observed duration.
 *   routing   — per-task model selection vs the config-declared routing
 *               table (modelRouting): were weight-appropriate models used?
 *   steering  — file-scope steering: tasks with overlapping `paths` must not
 *               run concurrently; merge conflicts indicate collisions.
 *   flow      — plain success rate with retry/conflict penalties.
 *
 * The report schema is versioned ("wombo-eval/1") and comparable across
 * runs; reports persist to .wombo-combo/evals/<wave-id>.json.
 *
 * Scoring conventions (documented, deterministic):
 *   - A component score is null when there is not enough data to judge it
 *     (e.g. no routing table configured, no scoped tasks). Null components
 *     are excluded from the overall mean.
 *   - Weighting ties (equal observed durations for different weights) count
 *     as concordant.
 */

import type { WaveHistoryRecord } from "./history";
import { type TaskWeight, computeTaskWeight } from "./task-weight";
import { pathsOverlap } from "./file-scopes";
import type { WomboConfig } from "../config";
import { existsSync, mkdirSync, writeFileSync, renameSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Task } from "./tasks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeightingDetailEntry {
  feature_id: string;
  weight: TaskWeight;
  /** Planner estimate parsed from the task's effort field */
  estimated_ms: number | null;
  observed_ms: number | null;
  model: string | null;
}

export interface RoutingMismatch {
  feature_id: string;
  weight: TaskWeight;
  expected_model: string | null;
  actual_model: string | null;
}

export interface SteeringViolation {
  a: string;
  b: string;
  /** The shared path that made these tasks conflict-prone */
  path: string;
}

export interface ScoreReport {
  schema: "wombo-eval/1";
  wave_id: string;
  evaluated_at: string;
  weighting: {
    /** 0-100, null when fewer than 1 comparable pair */
    score: number | null;
    comparable_pairs: number;
    concordant_pairs: number;
    details: WeightingDetailEntry[];
  };
  routing: {
    /** 0-100, null when no modelRouting table is configured */
    score: number | null;
    routed: number;
    total: number;
    mismatches: RoutingMismatch[];
  };
  steering: {
    /** 0-100, null when no scoped (paths-bearing) tasks */
    score: number | null;
    scoped_tasks: number;
    violations: SteeringViolation[];
    conflicts: number;
  };
  flow: {
    /** 0-100, null when the session has no agents */
    score: number | null;
    total: number;
    succeeded: number;
    failed: number;
    total_retries: number;
    max_concurrent_observed: number;
  };
  /** Mean of non-null component scores, rounded; null when all null */
  overall: number | null;
}

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------

function toInterval(
  startedAt: string | null,
  completedAt: string | null
): { start: number; end: number } | null {
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (isNaN(start) || isNaN(end)) return null;
  return { start, end };
}

function intervalsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Max number of simultaneously-open [start, end) intervals (sweep line). */
function maxConcurrent(intervals: Array<{ start: number; end: number }>): number {
  if (intervals.length === 0) return 0;
  const events: Array<{ t: number; d: number }> = [];
  for (const iv of intervals) {
    events.push({ t: iv.start, d: 1 });
    events.push({ t: iv.end, d: -1 });
  }
  // Process ends before starts at the same timestamp
  events.sort((x, y) => x.t - y.t || x.d - y.d);
  let cur = 0;
  let max = 0;
  for (const e of events) {
    cur += e.d;
    if (cur > max) max = cur;
  }
  return max;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Component scorers
// ---------------------------------------------------------------------------

/**
 * Weighting: pairwise concordance between weight class and observed
 * duration. A pair (i, j) with differing weights is comparable; it is
 * concordant when the heavier weight's observed duration is >= the
 * lighter's. Ties count as concordant.
 */
function scoreWeighting(
  details: WeightingDetailEntry[]
): { score: number | null; comparable: number; concordant: number } {
  const observed = details.filter((d) => d.observed_ms !== null);
  let comparable = 0;
  let concordant = 0;
  for (let i = 0; i < observed.length; i++) {
    for (let j = i + 1; j < observed.length; j++) {
      const a = observed[i];
      const b = observed[j];
      if (a.weight === b.weight) continue;
      comparable++;
      const heavy = a.weight === "heavy" || (a.weight === "medium" && b.weight === "light") ? a : b;
      const light = heavy === a ? b : a;
      if ((heavy.observed_ms ?? 0) >= (light.observed_ms ?? 0)) concordant++;
    }
  }
  return {
    score: comparable > 0 ? Math.round((100 * concordant) / comparable) : null,
    comparable,
    concordant,
  };
}

/**
 * Routing: share of agents whose resolved model matches the routing-table
 * expectation (routing[weight] with fallback to the session model — the
 * same chain resolveTaskModel applies at runtime).
 */
function scoreRouting(
  record: WaveHistoryRecord,
  details: WeightingDetailEntry[],
  config: WomboConfig
): { score: number | null; routed: number; mismatches: RoutingMismatch[] } {
  const table = config.modelRouting;
  const hasTable =
    !!table && Object.values(table).some((m) => m != null && m !== "");
  if (!hasTable) return { score: null, routed: 0, mismatches: [] };

  const mismatches: RoutingMismatch[] = [];
  let routed = 0;
  for (const d of details) {
    const expected = table![d.weight] ?? record.model ?? null;
    const actual = d.model;
    if (actual != null) routed++;
    if (expected !== actual) {
      mismatches.push({
        feature_id: d.feature_id,
        weight: d.weight,
        expected_model: expected,
        actual_model: actual,
      });
    }
  }
  const total = details.length;
  return {
    score: total > 0 ? Math.round((100 * (total - mismatches.length)) / total) : null,
    routed,
    mismatches,
  };
}

/**
 * Steering: overlapping-scoped pairs must not overlap in time. Penalties:
 * 25 per violation, 10 per merge conflict.
 */
function scoreSteering(
  record: WaveHistoryRecord,
  tasksById: Map<string, Task>
): {
  score: number | null;
  scopedTasks: number;
  violations: SteeringViolation[];
  conflicts: number;
} {
  const conflicts = record.agents.filter((a) => a.had_merge_conflict).length;

  const scoped = record.agents
    .map((a) => {
      const task = tasksById.get(a.feature_id);
      const paths = task?.paths ?? [];
      return { id: a.feature_id, paths, interval: toInterval(a.started_at, a.completed_at) };
    })
    .filter((e) => e.paths.length > 0);

  const violations: SteeringViolation[] = [];
  for (let i = 0; i < scoped.length; i++) {
    for (let j = i + 1; j < scoped.length; j++) {
      const a = scoped[i];
      const b = scoped[j];
      if (!a.interval || !b.interval || !intervalsOverlap(a.interval, b.interval)) continue;
      if (pathsOverlap(a.paths, b.paths)) {
        violations.push({ a: a.id, b: b.id, path: a.paths[0] });
      }
    }
  }

  if (scoped.length === 0) {
    return { score: null, scopedTasks: 0, violations, conflicts };
  }
  return {
    score: clampScore(100 - 25 * violations.length - 10 * conflicts),
    scopedTasks: scoped.length,
    violations,
    conflicts,
  };
}

/**
 * Flow: success share minus retry/conflict penalties, plus an observed
 * concurrency figure (report-only, not scored).
 */
function scoreFlow(
  record: WaveHistoryRecord
): {
  score: number | null;
  total: number;
  succeeded: number;
  failed: number;
  totalRetries: number;
  maxConcurrentObserved: number;
} {
  const total = record.agents.length;
  const succeeded = record.agents.filter(
    (a) => a.status === "merged" || a.status === "verified"
  ).length;
  const failed = record.agents.filter((a) => a.status === "failed").length;
  const totalRetries = record.agents.reduce((sum, a) => sum + a.retries, 0);
  const conflicts = record.agents.filter((a) => a.had_merge_conflict).length;
  const intervals = record.agents
    .map((a) => toInterval(a.started_at, a.completed_at))
    .filter((iv): iv is { start: number; end: number } => iv !== null);

  return {
    score:
      total > 0
        ? clampScore((100 * succeeded) / total - 2 * totalRetries - 5 * conflicts)
        : null,
    total,
    succeeded,
    failed,
    totalRetries,
    maxConcurrentObserved: maxConcurrent(intervals),
  };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Score a completed session. `tasksById` should map feature ids to their
 * task definitions from BOTH the active store and the archive (tasks are
 * frequently archived between the run and the evaluation).
 */
export function scoreSession(
  record: WaveHistoryRecord,
  tasksById: Map<string, Task>,
  config: WomboConfig
): ScoreReport {
  const details: WeightingDetailEntry[] = [];
  for (const agent of record.agents) {
    const task = tasksById.get(agent.feature_id);
    // No task definition → no planner estimates to grade against
    if (!task) continue;
    const weight = computeTaskWeight(task);
    const minutes = Number.isFinite(Number(task.effort))
      ? parseEffortMinutes(task.effort)
      : null;
    details.push({
      feature_id: agent.feature_id,
      weight,
      estimated_ms: minutes === null ? null : minutes * 60_000,
      observed_ms: agent.duration_ms,
      model: agent.model ?? null,
    });
  }

  const weighting = scoreWeighting(details);
  const routing = scoreRouting(record, details, config);
  const steering = scoreSteering(record, tasksById);
  const flow = scoreFlow(record);

  const components = [weighting.score, routing.score, steering.score, flow.score].filter(
    (s): s is number => s !== null
  );

  return {
    schema: "wombo-eval/1",
    wave_id: record.wave_id,
    evaluated_at: new Date().toISOString(),
    weighting: {
      score: weighting.score,
      comparable_pairs: weighting.comparable,
      concordant_pairs: weighting.concordant,
      details,
    },
    routing: {
      score: routing.score,
      routed: routing.routed,
      total: details.length,
      mismatches: routing.mismatches,
    },
    steering: {
      score: steering.score,
      scoped_tasks: steering.scopedTasks,
      violations: steering.violations,
      conflicts: steering.conflicts,
    },
    flow: {
      score: flow.score,
      total: flow.total,
      succeeded: flow.succeeded,
      failed: flow.failed,
      total_retries: flow.totalRetries,
      max_concurrent_observed: flow.maxConcurrentObserved,
    },
    overall:
      components.length > 0
        ? Math.round(components.reduce((s, n) => s + n, 0) / components.length)
        : null,
  };
}

/**
 * Parse an ISO-8601-ish duration ("PT1H", "2h", "45m") into minutes.
 * Returns null when unparseable. Mirrors parseDurationMinutes semantics
 * without importing lib/tasks (avoids a cycles risk in tests).
 */
function parseEffortMinutes(effort: string): number | null {
  const iso = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(effort.trim());
  if (iso) {
    const h = parseInt(iso[1] ?? "0", 10);
    const m = parseInt(iso[2] ?? "0", 10);
    return h * 60 + m;
  }
  const loose = /^(\d+(?:\.\d+)?)\s*(h|m|d)$/.exec(effort.trim().toLowerCase());
  if (loose) {
    const n = parseFloat(loose[1]);
    if (loose[2] === "h") return n * 60;
    if (loose[2] === "d") return n * 24 * 60;
    return n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Report persistence
// ---------------------------------------------------------------------------

const EVALS_DIR = ".wombo-combo/evals";

/**
 * Persist a score report to .wombo-combo/evals/<wave-id>.json (atomic).
 * Re-evaluating the same wave overwrites its report.
 */
export function saveEvalReport(projectRoot: string, report: ScoreReport): string {
  const dir = resolve(projectRoot, EVALS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filePath = resolve(dir, `${report.wave_id}.json`);
  const tmpPath = filePath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(report, null, 2) + "\n", "utf-8");
  renameSync(tmpPath, filePath);
  return filePath;
}

/** Load a previously persisted score report, or null. */
export function loadEvalReport(projectRoot: string, waveId: string): ScoreReport | null {
  const filePath = resolve(projectRoot, EVALS_DIR, `${waveId}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as ScoreReport;
  } catch {
    return null;
  }
}
