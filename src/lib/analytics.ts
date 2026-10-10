/**
 * analytics.ts — Durable per-execution agent analytics storage.
 *
 * One JSON snapshot per agent *execution* is stored under
 * `<projectRoot>/.wombo-combo/analytics/` (never inside an agent worktree).
 * An execution is a single submitted run of a task; running the same task
 * twice yields two distinct `execution_id`s and therefore two records.
 * Upserting an existing execution replaces its snapshot and never adds a
 * record.
 *
 * Conventions
 * -----------
 * - Durations are milliseconds. Timestamps are ISO 8601 strings.
 * - `first_started_at` is the first process start; `verified_at` is the
 *   moment verification succeeded. `duration_ms` = verified_at - first_started_at
 *   (includes ordinary retries, excludes merge waiting). It is null until a
 *   successful verification happened. Process exit (DaemonState.completed)
 *   must not be used to derive it.
 * - `outcome` describes the agent lifecycle up to verification. Merge result
 *   is tracked separately in `merge_outcome` so verified work that later
 *   fails to merge stays accurately represented.
 * - `retry_count` is cumulative across the whole execution (ordinary retries).
 *   An explicit user rerun of a finished execution is a NEW execution.
 * - `usage` holds the full token totals (UsageTotals). `usage_coverage`
 *   states how complete they are: "full" when every token stream was
 *   monitored, "partial" when some streams (e.g. conflict resolvers) were
 *   not, "none" when nothing was recorded.
 * - `build_attempts`/`build_passes` count only real build runs (fake agents
 *   skip builds and contribute 0 attempts).
 * - `additions`/`deletions` are committed line changes between the immutable
 *   `baseline_head` and `measured_head`; null means unknown (never 0 by guess).
 * - `revision` is a monotonically increasing snapshot counter. A caller must
 *   upsert a record whose `revision` equals the stored revision (a record
 *   obtained from `get`/`upsert`/`createAnalyticsRecord` with revision 0 for a
 *   new execution). The store bumps it by one on every write. A write based on
 *   an older revision is rejected with `StaleRevisionError`.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { resolve, join } from "node:path";
import { WOMBO_DIR } from "../config";
import type { UsageTotals } from "./token-usage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const ANALYTICS_SCHEMA_VERSION = 1;

/** Relative directory (from project root) holding analytics snapshots. */
export const ANALYTICS_DIR = `${WOMBO_DIR}/analytics`;

export type AnalyticsOutcome = "running" | "succeeded" | "failed" | "stopped";
export type AnalyticsMergeOutcome = "pending" | "merged" | "failed" | "not_applicable";
export type AnalyticsUsageCoverage = "none" | "partial" | "full";
/**
 * Where line-change measurement stands: "pending" (not yet measured),
 * "measured" (measured at successful verification, or best-effort before a
 * failure), "replacement" (re-measured after a tier-four conflict re-run reset
 * the worktree; the diff then describes the replacement implementation while
 * verified_at/duration_ms keep describing the original verification), or
 * "unavailable" (git could not provide a measurement).
 */
export type AnalyticsMeasurementPhase = "pending" | "measured" | "replacement" | "unavailable";

export const ANALYTICS_OUTCOMES: readonly AnalyticsOutcome[] = ["running", "succeeded", "failed", "stopped"];
export const ANALYTICS_MERGE_OUTCOMES: readonly AnalyticsMergeOutcome[] = ["pending", "merged", "failed", "not_applicable"];
export const ANALYTICS_USAGE_COVERAGES: readonly AnalyticsUsageCoverage[] = ["none", "partial", "full"];
export const ANALYTICS_MEASUREMENT_PHASES: readonly AnalyticsMeasurementPhase[] = ["pending", "measured", "replacement", "unavailable"];

export interface AgentAnalyticsRecord {
  schema_version: number;
  /** Unique id of this execution (distinct per run, even for the same task). */
  execution_id: string;
  wave_id: string;
  task_id: string;
  quest_id: string | null;
  /** Agent identity (e.g. agent/session id); null if unknown. */
  agent_id: string | null;
  /** Resolved model; null = session default/unknown. */
  model: string | null;

  outcome: AnalyticsOutcome;
  merge_outcome: AnalyticsMergeOutcome;

  /** First process start (ISO) or null if never started. */
  first_started_at: string | null;
  /** Successful verification time (ISO) or null. */
  verified_at: string | null;
  /** verified_at - first_started_at in ms; null until verified. */
  duration_ms: number | null;
  /** Cumulative ordinary retries for this execution. */
  retry_count: number;

  usage: UsageTotals;
  usage_coverage: AnalyticsUsageCoverage;

  build_attempts: number;
  build_passes: number;

  additions: number | null;
  deletions: number | null;
  /** Immutable commit the execution started from. */
  baseline_head: string | null;
  /** HEAD at measurement time. */
  measured_head: string | null;
  measurement_phase: AnalyticsMeasurementPhase;

  /** Snapshot revision, see module docs. */
  revision: number;
  /** ISO time of the last write (set by the store). */
  updated_at: string | null;
}

export type AnalyticsLoadDiagnosticKind = "malformed" | "unsupported_version" | "invalid";

export interface AnalyticsDiagnostic {
  /** File name (relative to the analytics directory). */
  file: string;
  kind: AnalyticsLoadDiagnosticKind;
  message: string;
}

export interface AnalyticsLoadResult {
  records: AgentAnalyticsRecord[];
  diagnostics: AnalyticsDiagnostic[];
}

export class StaleRevisionError extends Error {
  constructor(
    public readonly executionId: string,
    public readonly attempted: number,
    public readonly current: number,
  ) {
    super(
      `Stale analytics revision for ${executionId}: attempted ${attempted}, stored ${current}`,
    );
    this.name = "StaleRevisionError";
  }
}

// ---------------------------------------------------------------------------
// Construction & validation
// ---------------------------------------------------------------------------

export function emptyUsageTotals(): UsageTotals {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read: 0,
    cache_write: 0,
    reasoning_tokens: 0,
    total_tokens: 0,
    total_cost: 0,
    record_count: 0,
  };
}

export type NewAnalyticsRecordInput = Pick<AgentAnalyticsRecord, "execution_id" | "wave_id" | "task_id"> &
  Partial<AgentAnalyticsRecord>;

/** Create a fresh (revision 0) record; unknown measurements are null. */
export function createAnalyticsRecord(input: NewAnalyticsRecordInput): AgentAnalyticsRecord {
  return {
    schema_version: ANALYTICS_SCHEMA_VERSION,
    quest_id: null,
    agent_id: null,
    model: null,
    outcome: "running",
    merge_outcome: "pending",
    first_started_at: null,
    verified_at: null,
    duration_ms: null,
    retry_count: 0,
    usage: emptyUsageTotals(),
    usage_coverage: "none",
    build_attempts: 0,
    build_passes: 0,
    additions: null,
    deletions: null,
    baseline_head: null,
    measured_head: null,
    measurement_phase: "pending",
    revision: 0,
    updated_at: null,
    ...input,
  };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const USAGE_KEYS: (keyof UsageTotals)[] = [
  "input_tokens",
  "output_tokens",
  "cache_read",
  "cache_write",
  "reasoning_tokens",
  "total_tokens",
  "total_cost",
  "record_count",
];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNullableNum = (v: unknown) => v === null || isNum(v);
const isNullableStr = (v: unknown) => v === null || typeof v === "string";

export function validateAnalyticsRecord(value: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, errors: ["record must be an object"] };
  }
  const r = value as Record<string, unknown>;
  for (const k of ["execution_id", "wave_id", "task_id"]) {
    if (typeof r[k] !== "string" || (r[k] as string).length === 0) errors.push(`${k} must be a non-empty string`);
  }
  for (const k of ["quest_id", "agent_id", "model", "first_started_at", "verified_at", "baseline_head", "measured_head", "updated_at"]) {
    if (!isNullableStr(r[k])) errors.push(`${k} must be a string or null`);
  }
  for (const k of ["duration_ms", "additions", "deletions"]) {
    if (!isNullableNum(r[k])) errors.push(`${k} must be a number or null`);
  }
  for (const k of ["retry_count", "build_attempts", "build_passes", "revision"]) {
    if (!isNum(r[k]) || (r[k] as number) < 0) errors.push(`${k} must be a non-negative number`);
  }
  const enums: [string, readonly string[]][] = [
    ["outcome", ANALYTICS_OUTCOMES],
    ["merge_outcome", ANALYTICS_MERGE_OUTCOMES],
    ["usage_coverage", ANALYTICS_USAGE_COVERAGES],
    ["measurement_phase", ANALYTICS_MEASUREMENT_PHASES],
  ];
  for (const [k, allowed] of enums) {
    if (typeof r[k] !== "string" || !allowed.includes(r[k] as string)) errors.push(`${k} must be one of ${allowed.join("|")}`);
  }
  const usage = r.usage as Record<string, unknown> | null | undefined;
  if (typeof usage !== "object" || usage === null) {
    errors.push("usage must be an object");
  } else {
    for (const k of USAGE_KEYS) if (!isNum(usage[k])) errors.push(`usage.${k} must be a number`);
  }
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export function analyticsDir(projectRoot: string): string {
  return resolve(projectRoot, ANALYTICS_DIR);
}

/** Safe, collision-free file name derived from an execution id. */
export function analyticsFileName(executionId: string): string {
  const slug = executionId.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "exec";
  const hash = createHash("sha256").update(executionId).digest("hex").slice(0, 12);
  return `${slug}.${hash}.json`;
}

export class AnalyticsStore {
  readonly dir: string;

  constructor(projectRoot: string) {
    this.dir = analyticsDir(projectRoot);
  }

  private pathFor(executionId: string): string {
    return join(this.dir, analyticsFileName(executionId));
  }

  /** Load all valid records; malformed/unsupported files become diagnostics. */
  load(): AnalyticsLoadResult {
    const records: AgentAnalyticsRecord[] = [];
    const diagnostics: AnalyticsDiagnostic[] = [];
    if (!existsSync(this.dir)) return { records, diagnostics };
    let files: string[];
    try {
      files = readdirSync(this.dir).filter((f) => f.endsWith(".json")).sort();
    } catch (err) {
      return { records, diagnostics: [{ file: ".", kind: "malformed", message: String(err) }] };
    }
    for (const file of files) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(join(this.dir, file), "utf-8"));
      } catch (err) {
        diagnostics.push({ file, kind: "malformed", message: err instanceof Error ? err.message : String(err) });
        continue;
      }
      const version = (parsed as { schema_version?: unknown } | null)?.schema_version;
      if (typeof parsed === "object" && parsed !== null && typeof version === "number" && version !== ANALYTICS_SCHEMA_VERSION) {
        diagnostics.push({ file, kind: "unsupported_version", message: `unsupported schema_version ${version}` });
        continue;
      }
      const v = validateAnalyticsRecord(parsed);
      if (!v.ok || (parsed as AgentAnalyticsRecord).schema_version !== ANALYTICS_SCHEMA_VERSION) {
        diagnostics.push({ file, kind: "invalid", message: v.errors.join("; ") || "missing schema_version" });
        continue;
      }
      records.push(parsed as AgentAnalyticsRecord);
    }
    return { records, diagnostics };
  }

  /** Look up one execution; null if absent or unreadable. */
  get(executionId: string): AgentAnalyticsRecord | null {
    const p = this.pathFor(executionId);
    if (!existsSync(p)) return null;
    try {
      const parsed = JSON.parse(readFileSync(p, "utf-8"));
      const v = validateAnalyticsRecord(parsed);
      return v.ok && parsed.schema_version === ANALYTICS_SCHEMA_VERSION && parsed.execution_id === executionId ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Atomically insert or replace the snapshot for `record.execution_id`.
   * `record.revision` must equal the stored revision (0 for a new execution);
   * otherwise a StaleRevisionError is thrown. Returns the stored record with
   * its revision bumped.
   */
  upsert(record: AgentAnalyticsRecord): AgentAnalyticsRecord {
    const v = validateAnalyticsRecord(record);
    if (!v.ok) throw new Error(`Invalid analytics record: ${v.errors.join("; ")}`);
    const existing = this.get(record.execution_id);
    const current = existing?.revision ?? 0;
    if (record.revision < current) {
      throw new StaleRevisionError(record.execution_id, record.revision, current);
    }
    const next: AgentAnalyticsRecord = {
      ...record,
      schema_version: ANALYTICS_SCHEMA_VERSION,
      revision: current + 1,
      updated_at: new Date().toISOString(),
    };
    mkdirSync(this.dir, { recursive: true });
    const target = this.pathFor(record.execution_id);
    const tmp = `${target}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    try {
      writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n", "utf-8");
      renameSync(tmp, target);
    } catch (err) {
      try {
        rmSync(tmp, { force: true });
      } catch {
        /* ignore */
      }
      throw err;
    }
    return next;
  }
}
