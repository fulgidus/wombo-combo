/**
 * usage.ts — Show token usage statistics.
 *
 * Usage:
 *   woco usage                                          Show total usage
 *   woco usage --by task                                Group by task
 *   woco usage --by model                               Group by model
 *   woco usage --by provider                            Group by provider
 *   woco usage --by quest                               Group by quest
 *   woco usage --by harness                             Group by harness
 *   woco usage --since 2026-01-01                       Filter by start date
 *   woco usage --until 2026-03-01                       Filter by end date
 *   woco usage --format json                            Output as JSON
 *   woco usage --format table                           Output as aligned table (default)
 *
 *   woco usage --analytics                              Agent analytics (per-execution) total
 *   woco usage --analytics --by task|quest|wave|agent|model
 *   woco usage --analytics --task <id> --quest <id> --wave <id>   Exact filters
 *
 * Reads from .wombo-combo/usage.jsonl and aggregates token counts. With
 * --analytics it reads the per-execution snapshots in .wombo-combo/analytics/.
 */

import type { WomboConfig } from "../config";
import {
  loadUsageRecords,
  filterByDateRange,
  groupBy,
  totalUsage,
  type UsageTotals,
  type GroupableField,
} from "../lib/token-usage";
import { output, outputError, type OutputFormat } from "../lib/output";
import { t, getFixedT, type TFunction } from "../lib/i18n";
import { AnalyticsStore, type AnalyticsDiagnostic } from "../lib/analytics";
import {
  summarizeAnalytics,
  type AggregateMetrics,
  type AnalyticsFilter,
  type AnalyticsGroupBy,
  type AnalyticsSummary,
} from "../lib/analytics-summary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** CLI-facing grouping key names (mapped to internal GroupableField) */
export type UsageGroupBy = "task" | "quest" | "model" | "provider" | "harness";

/** Valid --by values for validation */
export const VALID_USAGE_GROUP_BY: readonly string[] = [
  "task",
  "quest",
  "model",
  "provider",
  "harness",
];

export interface UsageCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  /** Grouping key (default: total — no grouping) */
  by?: UsageGroupBy | AnalyticsGroupBy;
  /** Opt-in: aggregate per-execution analytics instead of token usage */
  analytics?: boolean;
  /** Analytics-only exact filters */
  task?: string;
  quest?: string;
  wave?: string;
  /** Start of date range filter (ISO 8601) */
  since?: string;
  /** End of date range filter (ISO 8601) */
  until?: string;
  /** Output format: table or json (maps from the CLI's --format flag) */
  usageFormat: "table" | "json";
  /** Global output format (--output text|json|toon) */
  outputFmt: OutputFormat;
}

// ---------------------------------------------------------------------------
// Helpers — CLI group name → internal GroupableField
// ---------------------------------------------------------------------------

function toGroupableField(by: UsageGroupBy): GroupableField {
  switch (by) {
    case "task":
      return "task_id";
    case "quest":
      return "quest_id";
    case "model":
      return "model";
    case "provider":
      return "provider";
    case "harness":
      return "harness";
  }
}

// ---------------------------------------------------------------------------
// Formatting — Table Output
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const FG = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
};

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatCost(cost: number): string {
  if (cost === 0) return "-";
  return `$${cost.toFixed(4)}`;
}

function pad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

/** Label column padding that never truncates (translations may be longer). */
function lbl(text: string, width: number): string {
  return text.padEnd(width - 1) + " ";
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return " ".repeat(width - text.length) + text;
}

/**
 * Render total usage as a summary block.
 */
function renderTotalUsage(totals: UsageTotals): void {
  console.log("");
  console.log(`${BOLD}${t("cli.usage.totalTitle")}${RESET}`);
  console.log("");
  console.log(`  ${lbl(t("cli.usage.inputTokens"), 18)}${FG.cyan}${formatNumber(totals.input_tokens)}${RESET}`);
  console.log(`  ${lbl(t("cli.usage.outputTokens"), 18)}${FG.green}${formatNumber(totals.output_tokens)}${RESET}`);
  console.log(`  ${lbl(t("cli.usage.cacheRead"), 18)}${FG.gray}${formatNumber(totals.cache_read)}${RESET}`);
  console.log(`  ${lbl(t("cli.usage.cacheWrite"), 18)}${FG.gray}${formatNumber(totals.cache_write)}${RESET}`);
  console.log(`  ${lbl(t("cli.usage.reasoning"), 18)}${FG.yellow}${formatNumber(totals.reasoning_tokens)}${RESET}`);
  console.log(`  ${BOLD}${lbl(t("cli.usage.totalTokens"), 18)}${formatNumber(totals.total_tokens)}${RESET}`);
  console.log(`  ${lbl(t("cli.usage.totalCost"), 18)}${formatCost(totals.total_cost)}`);
  console.log(`  ${lbl(t("cli.usage.stepsRecorded"), 18)}${totals.record_count}`);
  console.log("");
}

/**
 * Render grouped usage as an aligned table.
 */
function renderGroupedTable(
  groups: Map<string, UsageTotals>,
  groupLabel: string
): void {
  if (groups.size === 0) {
    console.log(`\n${t("cli.usage.noData")}\n`);
    return;
  }

  console.log("");
  console.log(`${BOLD}${t("cli.usage.byTitle", { group: groupLabel })}${RESET}`);
  console.log("");

  // Build column widths
  const keyWidth = Math.max(
    groupLabel.length,
    ...Array.from(groups.keys()).map((k) => k.length),
    8
  );

  const header = [
    pad(groupLabel.charAt(0).toUpperCase() + groupLabel.slice(1), keyWidth),
    padLeft(t("cli.usage.colInput"), 12),
    padLeft(t("cli.usage.colOutput"), 12),
    padLeft(t("cli.usage.colCacheRead"), 12),
    padLeft(t("cli.usage.colCacheWrite"), 12),
    padLeft(t("cli.usage.colTotal"), 14),
    padLeft(t("cli.usage.colCost"), 10),
  ].join("  ");

  console.log(`${BOLD}${header}${RESET}`);
  console.log("-".repeat(header.length));

  // Sort by total tokens descending for readability
  const sorted = Array.from(groups.entries()).sort(
    (a, b) => b[1].total_tokens - a[1].total_tokens
  );

  for (const [key, totals] of sorted) {
    const row = [
      pad(key, keyWidth),
      padLeft(formatNumber(totals.input_tokens), 12),
      padLeft(formatNumber(totals.output_tokens), 12),
      padLeft(formatNumber(totals.cache_read), 12),
      padLeft(formatNumber(totals.cache_write), 12),
      padLeft(formatNumber(totals.total_tokens), 14),
      padLeft(formatCost(totals.total_cost), 10),
    ].join("  ");

    console.log(row);
  }

  // Grand total row
  const grandTotal: UsageTotals = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read: 0,
    cache_write: 0,
    reasoning_tokens: 0,
    total_tokens: 0,
    total_cost: 0,
    record_count: 0,
  };
  for (const totals of groups.values()) {
    grandTotal.input_tokens += totals.input_tokens;
    grandTotal.output_tokens += totals.output_tokens;
    grandTotal.cache_read += totals.cache_read;
    grandTotal.cache_write += totals.cache_write;
    grandTotal.total_tokens += totals.total_tokens;
    grandTotal.total_cost += totals.total_cost;
    grandTotal.record_count += totals.record_count;
  }

  console.log("-".repeat(header.length));
  const totalRow = [
    pad(`${BOLD}${t("cli.usage.totalRow")}${RESET}`, keyWidth + BOLD.length + RESET.length),
    padLeft(formatNumber(grandTotal.input_tokens), 12),
    padLeft(formatNumber(grandTotal.output_tokens), 12),
    padLeft(formatNumber(grandTotal.cache_read), 12),
    padLeft(formatNumber(grandTotal.cache_write), 12),
    padLeft(formatNumber(grandTotal.total_tokens), 14),
    padLeft(formatCost(grandTotal.total_cost), 10),
  ].join("  ");
  console.log(totalRow);

  console.log("");
}

// ---------------------------------------------------------------------------
// JSON Output Helpers
// ---------------------------------------------------------------------------

function totalsToJSON(totals: UsageTotals): Record<string, unknown> {
  return {
    input_tokens: totals.input_tokens,
    output_tokens: totals.output_tokens,
    cache_read: totals.cache_read,
    cache_write: totals.cache_write,
    reasoning_tokens: totals.reasoning_tokens,
    total_tokens: totals.total_tokens,
    total_cost: totals.total_cost,
    record_count: totals.record_count,
  };
}

function groupedToJSON(
  groups: Map<string, UsageTotals>,
  groupLabel: string
): Record<string, unknown> {
  const entries: Record<string, unknown>[] = [];
  for (const [key, totals] of groups) {
    entries.push({
      [groupLabel]: key,
      ...totalsToJSON(totals),
    });
  }
  return { by: groupLabel, groups: entries };
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdUsage(opts: UsageCommandOptions): Promise<void> {
  const { projectRoot, outputFmt, usageFormat } = opts;

  const invalid = validateUsageOptions(
    {
      by: opts.by,
      analytics: opts.analytics,
      task: opts.task,
      quest: opts.quest,
      wave: opts.wave,
    },
    outputFmt === "text" ? t : getFixedT("en"),
  );
  if (invalid) outputError(outputFmt, invalid);

  if (opts.analytics) return cmdUsageAnalytics(opts);

  // Load all records
  let records = loadUsageRecords(projectRoot);

  // Apply date range filter
  if (opts.since || opts.until) {
    try {
      records = filterByDateRange(records, opts.since, opts.until);
    } catch (err: any) {
      outputError(outputFmt, err.message);
      return; // unreachable
    }
  }

  if (records.length === 0) {
    if (usageFormat === "json" || outputFmt === "json") {
      console.log(JSON.stringify({ message: "No usage data found.", groups: [] }));
    } else {
      console.log(`\n${t("cli.usage.noData")}`);
      console.log(`${t("cli.usage.noDataHint")}\n`);
    }
    return;
  }

  // Grouped or total?
  if (opts.by) {
    const byLabel = opts.by as UsageGroupBy;
    const field = toGroupableField(byLabel);
    const groups = groupBy(records, field);
    const jsonData = groupedToJSON(groups, byLabel);

    if (usageFormat === "json" || outputFmt === "json") {
      // JSON output
      output(outputFmt, jsonData, () => {
        console.log(JSON.stringify(jsonData, null, 2));
      });
    } else {
      // Table output
      output(outputFmt, jsonData, () => {
        renderGroupedTable(groups, byLabel);
      });
    }
  } else {
    // Total (no grouping)
    const totals = totalUsage(records);

    if (usageFormat === "json" || outputFmt === "json") {
      output(outputFmt, totalsToJSON(totals), () => {
        console.log(JSON.stringify(totalsToJSON(totals), null, 2));
      });
    } else {
      output(outputFmt, totalsToJSON(totals), () => {
        renderTotalUsage(totals);
      });
    }
  }
}

// ===========================================================================
// Analytics mode (--analytics)
// ===========================================================================

/** Valid --by values in analytics mode. */
export const VALID_ANALYTICS_GROUP_BY: readonly string[] = ["task", "quest", "wave", "agent", "model"];

/** Raw option bag used for cross-mode validation. */
export interface UsageOptionInput {
  by?: string;
  analytics?: boolean;
  task?: string;
  quest?: string;
  wave?: string;
}

/**
 * Validate option combinations separately for each mode. Returns an error
 * message, or null when the combination is valid.
 *
 * - Analytics-only options (--task/--quest/--wave) require --analytics.
 * - --by values are validated against the mode's own list.
 */
export function validateUsageOptions(input: UsageOptionInput, tf: TFunction = t): string | null {
  if (input.analytics) {
    if (input.by !== undefined && !VALID_ANALYTICS_GROUP_BY.includes(input.by)) {
      return tf("cli.usage.invalidByAnalytics", { value: input.by, valid: VALID_ANALYTICS_GROUP_BY.join(", ") });
    }
    return null;
  }
  const analyticsOnly = (["task", "quest", "wave"] as const).filter((k) => input[k] !== undefined);
  if (analyticsOnly.length > 0) {
    return tf("cli.usage.analyticsOnly", { flags: analyticsOnly.map((k) => `--${k}`).join(", ") });
  }
  if (input.by !== undefined && !VALID_USAGE_GROUP_BY.includes(input.by)) {
    return tf("cli.usage.invalidBy", { value: input.by, valid: VALID_USAGE_GROUP_BY.join(", ") });
  }
  return null;
}

/** Localised "n/a" placeholder. */
const na = (): string => t("cli.usage.a.na");

export function formatAnalyticsDuration(ms: number | null): string {
  if (ms === null) return na();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatAnalyticsRate(rate: number | null): string {
  return rate === null ? na() : `${(rate * 100).toFixed(1)}%`;
}

// TOON rendering: one row per scope (total + each group), null = empty field.
const TOON_FIELDS = [
  "scope", "key", "executions",
  "succeeded", "failed", "stopped", "running",
  "merged", "merge_failed",
  "duration_samples", "duration_total_ms", "duration_mean_ms",
  "retries",
  "usage_samples", "usage_missing", "coverage_none", "coverage_partial", "coverage_full",
  "input_tokens", "output_tokens", "cache_read", "cache_write", "reasoning_tokens", "total_tokens", "total_cost", "usage_records",
  "build_attempts", "build_passes", "build_pass_rate", "build_samples",
  "additions", "deletions", "lines_changed", "line_samples",
] as const;

function toonMetricsRow(scope: string, key: string | null, m: AggregateMetrics): string {
  const cells: Array<string | number | null> = [
    scope, key, m.executions,
    m.outcomes.succeeded, m.outcomes.failed, m.outcomes.stopped, m.outcomes.running,
    m.merge_outcomes.merged, m.merge_outcomes.failed,
    m.duration.samples, m.duration.total_ms, m.duration.mean_ms,
    m.retries.total,
    m.usage.samples, m.usage.missing, m.usage.coverage.none, m.usage.coverage.partial, m.usage.coverage.full,
    m.usage.totals.input_tokens, m.usage.totals.output_tokens, m.usage.totals.cache_read, m.usage.totals.cache_write,
    m.usage.totals.reasoning_tokens, m.usage.totals.total_tokens, m.usage.totals.total_cost, m.usage.totals.record_count,
    m.builds.attempts, m.builds.passes, m.builds.pass_rate, m.builds.samples,
    m.lines.additions, m.lines.deletions, m.lines.changed, m.lines.samples,
  ];
  return cells.map((c) => (c === null ? "" : String(c))).join("|");
}

/** Compact TOON form carrying the same numbers as the JSON summary. */
export function renderAnalyticsToon(summary: AnalyticsSummary): string {
  const f = summary.filter;
  const filter = (["task", "quest", "wave", "since", "until"] as const)
    .filter((k) => f[k] !== undefined)
    .map((k) => `${k}=${String(f[k])}`)
    .join(",");
  return [
    `#ANALYTICS group_by=${summary.groupBy ?? ""}${filter ? ` filter=${filter}` : ""}`,
    `#FIELDS ${TOON_FIELDS.join("|")}`,
    toonMetricsRow("total", null, summary.total),
    ...summary.groups.map((g) => toonMetricsRow("group", g.key, g.metrics)),
  ].join("\n");
}

function groupKeyLabel(key: string | null): string {
  return key === null ? t("cli.usage.none") : key;
}

function coverageNote(m: AggregateMetrics): string {
  const parts: string[] = [];
  if (m.usage.coverage.partial > 0) parts.push(t("cli.usage.covPartial", { count: m.usage.coverage.partial }));
  if (m.usage.missing > 0) parts.push(t("cli.usage.covMissing", { count: m.usage.missing }));
  return parts.join(", ");
}

/** Render the total block as plain text lines (no ANSI). */
export function renderAnalyticsTotalLines(m: AggregateMetrics): string[] {
  const o = m.outcomes;
  const u = m.usage.totals;
  const lines = [
    `  ${lbl(t("cli.usage.a.executions"), 19)}${t("cli.usage.a.executionsValue", { total: m.executions, succeeded: o.succeeded, failed: o.failed, stopped: o.stopped, running: o.running })}`,
    `  ${lbl(t("cli.usage.a.completionTime"), 19)}${m.duration.samples > 0 ? t("cli.usage.a.completionValue", { mean: formatAnalyticsDuration(m.duration.mean_ms), total: formatAnalyticsDuration(m.duration.total_ms), samples: m.duration.samples }) : t("cli.usage.a.completionNone", { na: na() })}`,
    `  ${lbl(t("cli.usage.a.retries"), 19)}${m.retries.total}`,
    m.usage.samples > 0
      ? `  ${lbl(t("cli.usage.a.tokens"), 19)}${t("cli.usage.a.tokensValue", { total: formatNumber(u.total_tokens), input: formatNumber(u.input_tokens), output: formatNumber(u.output_tokens), cacheRead: formatNumber(u.cache_read), cacheWrite: formatNumber(u.cache_write), reasoning: formatNumber(u.reasoning_tokens), cost: formatCost(u.total_cost), samples: m.usage.samples, executions: m.executions })}`
      : `  ${lbl(t("cli.usage.a.tokens"), 19)}${t("cli.usage.a.tokensNone", { na: na() })}`,
    `  ${lbl(t("cli.usage.a.buildPassRate"), 19)}${m.builds.attempts > 0 ? t("cli.usage.a.buildValue", { rate: formatAnalyticsRate(m.builds.pass_rate), passes: m.builds.passes, attempts: m.builds.attempts, samples: m.builds.samples }) : t("cli.usage.a.buildNone", { na: na() })}`,
    `  ${lbl(t("cli.usage.a.linesChanged"), 19)}${m.lines.samples > 0 ? t("cli.usage.a.linesValue", { additions: formatNumber(m.lines.additions), deletions: formatNumber(m.lines.deletions), changed: formatNumber(m.lines.changed), samples: m.lines.samples, executions: m.executions }) : t("cli.usage.a.linesNone", { na: na() })}`,
  ];
  const cov = coverageNote(m);
  if (cov) lines.push(`  ${lbl(t("cli.usage.a.coverage"), 19)}${t("cli.usage.a.coverageWarning", { note: cov })}`);
  return lines;
}

/** Render a grouped table as plain text lines (no ANSI). */
export function renderAnalyticsGroupLines(summary: AnalyticsSummary): string[] {
  const label = summary.groupBy ?? "group";
  const rows = summary.groups.map((g) => {
    const m = g.metrics;
    return [
      groupKeyLabel(g.key),
      String(m.executions),
      `${m.outcomes.succeeded}/${m.outcomes.failed}/${m.outcomes.stopped}`,
      formatAnalyticsDuration(m.duration.mean_ms),
      String(m.retries.total),
      m.usage.samples > 0 ? formatNumber(m.usage.totals.total_tokens) : na(),
      formatAnalyticsRate(m.builds.pass_rate),
      m.lines.samples > 0 ? `+${m.lines.additions}/-${m.lines.deletions}` : na(),
      coverageNote(m) || t("cli.usage.a.ok"),
    ];
  });
  const header = [
    label,
    t("cli.usage.a.colExec"),
    t("cli.usage.a.colOutcomes"),
    t("cli.usage.a.colMeanTime"),
    t("cli.usage.a.colRetries"),
    t("cli.usage.a.colTokens"),
    t("cli.usage.a.colBuild"),
    t("cli.usage.a.colLines"),
    t("cli.usage.a.colCoverage"),
  ];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const fmt = (cells: string[]) => cells.map((c, i) => (i === 0 ? pad(c, widths[i]) : padLeft(c, widths[i]))).join("  ");
  return [fmt(header.map((h, i) => (i === 0 ? h.charAt(0).toUpperCase() + h.slice(1) : h))), "-".repeat(widths.reduce((a, b) => a + b + 2, -2)), ...rows.map(fmt)];
}

/** Plain-text report for a summary. */
export function renderAnalyticsText(summary: AnalyticsSummary): string {
  const scope: string[] = [];
  const f = summary.filter;
  if (f.task) scope.push(`task=${f.task}`);
  if (f.quest) scope.push(`quest=${f.quest}`);
  if (f.wave) scope.push(`wave=${f.wave}`);
  if (f.since) scope.push(`since=${String(f.since)}`);
  if (f.until) scope.push(`until=${String(f.until)}`);
  const title = `${summary.groupBy ? t("cli.usage.a.titleBy", { group: summary.groupBy }) : t("cli.usage.a.titleTotal")}${scope.length ? ` (${scope.join(", ")})` : ""}`;
  if (summary.total.executions === 0) {
    return `\n${title}\n\n  ${t("cli.usage.a.noData")}\n  ${t("cli.usage.a.noDataHint")}\n  ${t("cli.usage.a.noBackfill")}\n`;
  }
  const out = ["", title, ""];
  if (summary.groupBy) {
    out.push(...renderAnalyticsGroupLines(summary), "", t("cli.usage.a.totalHeading"), "");
  }
  out.push(...renderAnalyticsTotalLines(summary.total), "");
  return out.join("\n");
}

/** Build the structured summary for the given options (throws on bad ranges). */
export function buildAnalyticsSummary(opts: UsageCommandOptions): { summary: AnalyticsSummary; diagnostics: AnalyticsDiagnostic[] } {
  const { records, diagnostics } = new AnalyticsStore(opts.projectRoot).load();
  const filter: AnalyticsFilter = {};
  if (opts.since) filter.since = opts.since;
  if (opts.until) filter.until = opts.until;
  if (opts.task) filter.task = opts.task;
  if (opts.quest) filter.quest = opts.quest;
  if (opts.wave) filter.wave = opts.wave;
  const summary = summarizeAnalytics(records, {
    filter,
    groupBy: opts.by as AnalyticsGroupBy | undefined,
  });
  return { summary, diagnostics };
}

async function cmdUsageAnalytics(opts: UsageCommandOptions): Promise<void> {
  const { outputFmt, usageFormat } = opts;
  let built: ReturnType<typeof buildAnalyticsSummary>;
  try {
    built = buildAnalyticsSummary(opts);
  } catch (err: any) {
    outputError(outputFmt, err.message);
    return; // unreachable
  }
  // Storage diagnostics always go to stderr so structured stdout stays clean.
  for (const d of built.diagnostics) {
    console.error(t("cli.usage.a.storageWarning", { file: d.file, kind: d.kind, message: d.message }));
  }
  const { summary } = built;
  if (usageFormat === "json" && outputFmt === "text") {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  output(
    outputFmt,
    summary,
    () => console.log(renderAnalyticsText(summary)),
    () => console.log(renderAnalyticsToon(summary)),
  );
}
