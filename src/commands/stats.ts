/**
 * stats.ts — Show task statistics from wave history and token usage.
 *
 * Usage:
 *   woco stats                                          Show overall stats
 *   woco stats --trend                                  Show trend over time
 *   woco stats --by-model                               Breakdown by model
 *   woco stats --since 2026-01-01                       Filter by start date
 *   woco stats --until 2026-03-01                       Filter by end date
 *   woco stats --format json                            Output as JSON
 *
 * Combines data from:
 *   - .wombo-combo/history/wave-*.json (task success/failure, retries, conflicts)
 *   - .wombo-combo/usage.db (token usage and cost)
 */

import type { WomboConfig } from "../config";
import { loadUsageRecords, totalUsage } from "../lib/token-usage";
import { output, type OutputFormat } from "../lib/output";
import { resolve } from "node:path";
import { readdirSync, readFileSync, existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatsOptions {
  projectRoot: string;
  config: WomboConfig;
  /** Show trend over time */
  trend?: boolean;
  /** Breakdown by model */
  byModel?: boolean;
  /** Start of date range filter (ISO 8601) */
  since?: string;
  /** End of date range filter (ISO 8601) */
  until?: string;
  /** Output format: table or json */
  format: "table" | "json";
  /** Global output format (--output text|json|toon) */
  outputFmt: OutputFormat;
}

/** Aggregated statistics for a time period */
export interface PeriodStats {
  period: string;
  /** Number of waves in this period */
  waveCount: number;
  /** Total tasks attempted */
  totalTasks: number;
  /** Tasks that succeeded */
  succeeded: number;
  /** Tasks that failed */
  failed: number;
  /** Total retries across all tasks */
  totalRetries: number;
  /** Tasks that had merge conflicts */
  conflicts: number;
  /** Tasks where build passed */
  buildPassed: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Total cost in USD */
  totalCost: number;
  /** Total tokens used */
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Wave History Parsing
// ---------------------------------------------------------------------------

interface WaveData {
  wave_id: string;
  started_at: string;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    merged: number;
    verified: number;
    total_retries: number;
    total_duration_ms: number;
  };
  agents: {
    feature_id: string;
    status: string;
    retries: number;
    build_passed: boolean;
    duration_ms: number;
    had_merge_conflict: boolean;
  }[];
}

/** Load all wave history files */
function loadWaveHistory(projectRoot: string): WaveData[] {
  const historyDir = resolve(projectRoot, ".wombo-combo/history");
  if (!existsSync(historyDir)) return [];

  const files = readdirSync(historyDir).filter((f) => f.endsWith(".json"));
  const waves: WaveData[] = [];

  for (const file of files) {
    try {
      const raw = readFileSync(resolve(historyDir, file), "utf-8");
      waves.push(JSON.parse(raw));
    } catch {
      // Skip malformed files
    }
  }

  return waves.sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
}

/** Filter waves by date range */
function filterWavesByDate(
  waves: WaveData[],
  since?: string,
  until?: string
): WaveData[] {
  const sinceMs = since ? new Date(since).getTime() : -Infinity;
  const untilMs = until ? new Date(until).getTime() : Infinity;

  return waves.filter((w) => {
    const ts = new Date(w.started_at).getTime();
    return ts >= sinceMs && ts <= untilMs;
  });
}

/** Aggregate statistics from waves */
function aggregateStats(waves: WaveData[], usageRecords: ReturnType<typeof loadUsageRecords>): PeriodStats {
  let totalTasks = 0;
  let succeeded = 0;
  let failed = 0;
  let totalRetries = 0;
  let conflicts = 0;
  let buildPassed = 0;
  let totalDurationMs = 0;

  for (const wave of waves) {
    totalTasks += wave.summary.total;
    succeeded += wave.summary.succeeded;
    failed += wave.summary.failed;
    totalRetries += wave.summary.total_retries;
    totalDurationMs += wave.summary.total_duration_ms;

    for (const agent of wave.agents) {
      if (agent.had_merge_conflict) conflicts++;
      if (agent.build_passed) buildPassed++;
    }
  }

  const usageTotals = totalUsage(usageRecords);

  return {
    period: "all",
    waveCount: waves.length,
    totalTasks,
    succeeded,
    failed,
    totalRetries,
    conflicts,
    buildPassed,
    totalDurationMs,
    totalCost: usageTotals.total_cost,
    totalTokens: usageTotals.total_tokens,
  };
}

/** Aggregate stats by model */
function aggregateByModel(waves: WaveData[]): Map<string, PeriodStats> {
  const byModel = new Map<string, PeriodStats>();

  for (const wave of waves) {
    const model = wave.summary.total > 0 ? "unknown" : "unknown"; // Waves don't store model per-task

    const existing = byModel.get(model) || {
      period: model,
      waveCount: 0,
      totalTasks: 0,
      succeeded: 0,
      failed: 0,
      totalRetries: 0,
      conflicts: 0,
      buildPassed: 0,
      totalDurationMs: 0,
      totalCost: 0,
      totalTokens: 0,
    };

    existing.waveCount++;
    existing.totalTasks += wave.summary.total;
    existing.succeeded += wave.summary.succeeded;
    existing.failed += wave.summary.failed;
    existing.totalRetries += wave.summary.total_retries;
    existing.totalDurationMs += wave.summary.total_duration_ms;

    for (const agent of wave.agents) {
      if (agent.had_merge_conflict) existing.conflicts++;
      if (agent.build_passed) existing.buildPassed++;
    }

    byModel.set(model, existing);
  }

  return byModel;
}

/** Compute trend data (daily aggregates) */
function computeTrend(waves: WaveData[]): PeriodStats[] {
  const daily = new Map<string, WaveData[]>();

  for (const wave of waves) {
    const date = wave.started_at.split("T")[0];
    if (!daily.has(date)) daily.set(date, []);
    daily.get(date)!.push(wave);
  }

  const usageRecords = loadUsageRecords(".");
  const trend: PeriodStats[] = [];

  for (const [date, dayWaves] of daily) {
    const stats = aggregateStats(dayWaves, usageRecords);
    stats.period = date;
    trend.push(stats);
  }

  return trend;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function formatPercent(n: number, total: number): string {
  if (total === 0) return "-";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function formatStatsTable(stats: PeriodStats, showTrend: boolean = false): string {
  const lines: string[] = [];
  const BOLD = "\x1b[1m";
  const RESET = "\x1b[0m";
  const GREEN = "\x1b[32m";
  const RED = "\x1b[31m";
  const YELLOW = "\x1b[33m";

  if (showTrend) {
    lines.push(`${BOLD}Stats Trend${RESET}`);
    lines.push(`Date       | Waves | Tasks | Success  | Retries | Conflicts | Build%  | Duration`);
    lines.push(`-----------|-------|-------|----------|---------|-----------|---------|---------`);
  } else {
    lines.push(`${BOLD}Overall Statistics${RESET}`);
    lines.push(`| Metric            | Value       |`);
    lines.push(`|-------------------|-------------|`);
  }

  const formatRow = (s: PeriodStats) => {
    const successRate = formatPercent(s.succeeded, s.totalTasks);
    const retryRate = s.totalTasks > 0 ? formatPercent(s.totalRetries, s.totalTasks) : "-";
    const conflictRate = s.totalTasks > 0 ? formatPercent(s.conflicts, s.totalTasks) : "-";
    const buildRate = s.totalTasks > 0 ? formatPercent(s.buildPassed, s.totalTasks) : "-";
    const avgDuration = s.waveCount > 0 ? formatDuration(s.totalDurationMs / s.waveCount) : "-";

    if (showTrend) {
      lines.push(
        `${s.period}  | ${s.waveCount.toString().padStart(5)} | ${s.totalTasks.toString().padStart(5)} | ` +
        `${successRate.padStart(8)} | ${retryRate.padStart(7)} | ${conflictRate.padStart(9)} | ` +
        `${buildRate.padStart(7)} | ${avgDuration}`
      );
    } else {
      const successColor = s.totalTasks > 0 && s.succeeded / s.totalTasks > 0.7 ? GREEN : RED;
      lines.push(
        `| Success Rate      | ${successColor}${successRate}${RESET}       |`
      );
      lines.push(`| Retry Rate        | ${retryRate}       |`);
      lines.push(`| Conflict Rate     | ${conflictRate}       |`);
      lines.push(`| Build Pass Rate   | ${buildRate}       |`);
      lines.push(`| Wave Count        | ${s.waveCount}          |`);
      lines.push(`| Total Tasks       | ${s.totalTasks}          |`);
      lines.push(`| Avg Duration      | ${avgDuration}        |`);
      lines.push(`| Total Cost        | $${s.totalCost.toFixed(4)}    |`);
      lines.push(`| Total Tokens      | ${s.totalTokens.toLocaleString()}   |`);
    }
  };

  formatRow(stats);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Command Implementation
// ---------------------------------------------------------------------------

export async function cmdStats(opts: StatsOptions): Promise<void> {
  const { projectRoot, trend, byModel, since, until, format, outputFmt } = opts;

  // Load data
  const waves = loadWaveHistory(projectRoot);
  const filteredWaves = filterWavesByDate(waves, since, until);
  const usageRecords = loadUsageRecords(projectRoot);
  const filteredUsage = usageRecords.filter((r) => {
    const ts = new Date(r.timestamp).getTime();
    const sinceMs = since ? new Date(since).getTime() : -Infinity;
    const untilMs = until ? new Date(until).getTime() : Infinity;
    return ts >= sinceMs && ts <= untilMs;
  });

  // Compute stats
  if (trend) {
    const trendData = computeTrend(filteredWaves);
    if (format === "json") {
      output(outputFmt, JSON.stringify(trendData, null, 2), () => console.log(JSON.stringify(trendData, null, 2)));
    } else {
      for (const s of trendData) {
        output(outputFmt, formatStatsTable(s, true), () => console.log(formatStatsTable(s, true)));
        output(outputFmt, "", () => console.log(""));
      }
    }
  } else if (byModel) {
    const byModelData = aggregateByModel(filteredWaves);
    if (format === "json") {
      output(outputFmt, JSON.stringify(Array.from(byModelData.entries()), null, 2), () => console.log(JSON.stringify(Array.from(byModelData.entries()), null, 2)));
    } else {
      for (const [model, stats] of byModelData) {
        output(outputFmt, `Model: ${model}`, () => console.log(`Model: ${model}`));
        output(outputFmt, formatStatsTable(stats, false), () => console.log(formatStatsTable(stats, false)));
        output(outputFmt, "", () => console.log(""));
      }
    }
  } else {
    const stats = aggregateStats(filteredWaves, filteredUsage);
    if (format === "json") {
      output(outputFmt, JSON.stringify(stats, null, 2), () => console.log(JSON.stringify(stats, null, 2)));
    } else {
      output(outputFmt, formatStatsTable(stats, false), () => console.log(formatStatsTable(stats, false)));
    }
  }
}