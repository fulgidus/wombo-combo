/**
 * analytics-summary.ts — Pure filtering, deduplication, grouping and
 * aggregation over agent analytics snapshots.
 *
 * The result (`AnalyticsSummary`) is plain JSON-serializable data shared by
 * the CLI and the TUI.
 *
 * Semantics
 * - Executions are deduplicated by `execution_id`, newest revision wins
 *   (ties broken by `updated_at`).
 * - Date filters apply to `first_started_at` (inclusive). When a range is
 *   given, executions that never started are excluded.
 * - Duration samples: only `succeeded` executions with a start time and a
 *   non-null `duration_ms` (ends at successful verification; merge waiting
 *   excluded). Means are null without samples.
 * - Build pass rate = total passes / total attempts (null if no attempts).
 * - Usage totals sum only executions whose coverage is not "none"; those
 *   with coverage "none" are counted as `missing` (unknown, not zero).
 * - Line totals sum only executions with both additions and deletions known.
 */

import type { AgentAnalyticsRecord, AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage } from "./analytics";
import type { UsageTotals } from "./token-usage";

export type AnalyticsGroupBy = "task" | "quest" | "wave" | "agent" | "model";

export interface AnalyticsFilter {
  since?: string | Date;
  until?: string | Date;
  task?: string;
  quest?: string;
  wave?: string;
  agent?: string;
  model?: string;
  /** Only executions without a quest (errands). */
  unquested?: boolean;
}

export interface AggregateMetrics {
  executions: number;
  outcomes: Record<AnalyticsOutcome, number>;
  merge_outcomes: Record<AnalyticsMergeOutcome, number>;
  duration: { samples: number; total_ms: number; mean_ms: number | null };
  retries: { total: number };
  usage: {
    totals: UsageTotals;
    /** Executions that contributed usage (coverage != none). */
    samples: number;
    /** Executions with no usage data (coverage none). */
    missing: number;
    coverage: Record<AnalyticsUsageCoverage, number>;
  };
  builds: { attempts: number; passes: number; pass_rate: number | null; samples: number };
  lines: { additions: number; deletions: number; changed: number; samples: number };
}

export interface AnalyticsGroup {
  key: string | null;
  metrics: AggregateMetrics;
  /** Distinct models used by the group's executions, sorted; unknown models are omitted. */
  models: string[];
}

export interface AnalyticsSummary {
  filter: AnalyticsFilter;
  groupBy: AnalyticsGroupBy | null;
  total: AggregateMetrics;
  groups: AnalyticsGroup[];
  /** Distinct models used across all filtered executions, sorted. */
  models: string[];
}

export interface SummarizeOptions {
  filter?: AnalyticsFilter;
  groupBy?: AnalyticsGroupBy;
}

export function dedupeExecutions(records: AgentAnalyticsRecord[]): AgentAnalyticsRecord[] {
  const best = new Map<string, AgentAnalyticsRecord>();
  for (const rec of records) {
    const cur = best.get(rec.execution_id);
    if (!cur || isNewer(rec, cur)) best.set(rec.execution_id, rec);
  }
  return [...best.values()];
}

function isNewer(a: AgentAnalyticsRecord, b: AgentAnalyticsRecord): boolean {
  if (a.revision !== b.revision) return a.revision > b.revision;
  return (a.updated_at ?? "") > (b.updated_at ?? "");
}

function toMs(v: string | Date, label: string): number {
  const ms = new Date(v).getTime();
  if (Number.isNaN(ms)) throw new Error(`Invalid '${label}' date: ${String(v)}`);
  return ms;
}

export function filterExecutions(records: AgentAnalyticsRecord[], filter: AnalyticsFilter = {}): AgentAnalyticsRecord[] {
  const sinceMs = filter.since !== undefined ? toMs(filter.since, "since") : null;
  const untilMs = filter.until !== undefined ? toMs(filter.until, "until") : null;
  if (sinceMs !== null && untilMs !== null && sinceMs > untilMs) {
    throw new Error("Invalid date range: 'since' is after 'until'");
  }
  return records.filter((rec) => {
    if (filter.task !== undefined && rec.task_id !== filter.task) return false;
    if (filter.quest !== undefined && rec.quest_id !== filter.quest) return false;
    if (filter.wave !== undefined && rec.wave_id !== filter.wave) return false;
    if (filter.agent !== undefined && rec.agent_id !== filter.agent) return false;
    if (filter.model !== undefined && rec.model !== filter.model) return false;
    if (filter.unquested && rec.quest_id !== null) return false;
    if (sinceMs !== null || untilMs !== null) {
      if (!rec.first_started_at) return false;
      const t = new Date(rec.first_started_at).getTime();
      if (Number.isNaN(t)) return false;
      if (sinceMs !== null && t < sinceMs) return false;
      if (untilMs !== null && t > untilMs) return false;
    }
    return true;
  });
}

export function aggregateMetrics(records: AgentAnalyticsRecord[]): AggregateMetrics {
  const m: AggregateMetrics = {
    executions: records.length,
    outcomes: { running: 0, succeeded: 0, failed: 0, stopped: 0 },
    merge_outcomes: { pending: 0, merged: 0, failed: 0, not_applicable: 0 },
    duration: { samples: 0, total_ms: 0, mean_ms: null },
    retries: { total: 0 },
    usage: {
      totals: {
        input_tokens: 0,
        output_tokens: 0,
        cache_read: 0,
        cache_write: 0,
        reasoning_tokens: 0,
        total_tokens: 0,
        total_cost: 0,
        record_count: 0,
      },
      samples: 0,
      missing: 0,
      coverage: { none: 0, partial: 0, full: 0 },
    },
    builds: { attempts: 0, passes: 0, pass_rate: null, samples: 0 },
    lines: { additions: 0, deletions: 0, changed: 0, samples: 0 },
  };

  for (const rec of records) {
    m.outcomes[rec.outcome]++;
    m.merge_outcomes[rec.merge_outcome]++;
    m.retries.total += rec.retry_count;

    if (rec.outcome === "succeeded" && rec.first_started_at && rec.duration_ms !== null) {
      m.duration.samples++;
      m.duration.total_ms += rec.duration_ms;
    }

    m.usage.coverage[rec.usage_coverage]++;
    if (rec.usage_coverage === "none") {
      m.usage.missing++;
    } else {
      m.usage.samples++;
      const t = m.usage.totals;
      t.input_tokens += rec.usage.input_tokens;
      t.output_tokens += rec.usage.output_tokens;
      t.cache_read += rec.usage.cache_read;
      t.cache_write += rec.usage.cache_write;
      t.reasoning_tokens += rec.usage.reasoning_tokens;
      t.total_tokens += rec.usage.total_tokens;
      t.total_cost += rec.usage.total_cost;
      t.record_count += rec.usage.record_count;
    }

    if (rec.build_attempts > 0) {
      m.builds.samples++;
      m.builds.attempts += rec.build_attempts;
      m.builds.passes += rec.build_passes;
    }

    if (rec.additions !== null && rec.deletions !== null) {
      m.lines.samples++;
      m.lines.additions += rec.additions;
      m.lines.deletions += rec.deletions;
      m.lines.changed += rec.additions + rec.deletions;
    }
  }

  if (m.duration.samples > 0) m.duration.mean_ms = m.duration.total_ms / m.duration.samples;
  if (m.builds.attempts > 0) m.builds.pass_rate = m.builds.passes / m.builds.attempts;
  return m;
}

function distinctModels(records: AgentAnalyticsRecord[]): string[] {
  return [...new Set(records.map((r) => r.model).filter((m): m is string => !!m))].sort();
}

const GROUP_KEY: Record<AnalyticsGroupBy, (r: AgentAnalyticsRecord) => string | null> = {
  task: (r) => r.task_id,
  quest: (r) => r.quest_id,
  wave: (r) => r.wave_id,
  agent: (r) => r.agent_id,
  model: (r) => r.model,
};

/** Dedupe, filter, optionally group, and aggregate. Deterministic. */
export function summarizeAnalytics(records: AgentAnalyticsRecord[], options: SummarizeOptions = {}): AnalyticsSummary {
  const filter = options.filter ?? {};
  const deduped = dedupeExecutions(records);
  const filtered = filterExecutions(deduped, filter);
  const groupBy = options.groupBy ?? null;

  const groups: AnalyticsGroup[] = [];
  if (groupBy) {
    const buckets = new Map<string | null, AgentAnalyticsRecord[]>();
    for (const rec of filtered) {
      const k = GROUP_KEY[groupBy](rec);
      const arr = buckets.get(k);
      if (arr) arr.push(rec);
      else buckets.set(k, [rec]);
    }
    const keys = [...buckets.keys()].sort((a, b) => {
      if (a === null) return b === null ? 0 : 1;
      if (b === null) return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    for (const key of keys) groups.push({ key, metrics: aggregateMetrics(buckets.get(key)!), models: distinctModels(buckets.get(key)!) });
  }

  return { filter, groupBy, total: aggregateMetrics(filtered), groups, models: distinctModels(filtered) };
}
