/**
 * analytics-overlay.tsx — Ink AnalyticsOverlayView for agent performance analytics.
 *
 * A declarative, Modal-based view of a shared AnalyticsSummary (see
 * src/lib/analytics-summary.ts). The parent adapter owns filesystem loading,
 * aggregation, grouping state and selection; this component only renders and
 * dispatches key presses.
 *
 * Shows: execution outcomes, successful completion duration (mean/total),
 * retries, full token totals, weighted build pass rate, additions/deletions,
 * eligible sample counts, and partial/unavailable usage coverage. Unavailable
 * measurements render as "n/a" - never as zero or 100%.
 *
 * Keys: Tab cycles grouping (task, quest, wave, agent, model), Up/Down or
 * j/k navigate, Esc/u/U closes.
 */

import React from "react";
import { Box, Text, useInput } from "ink";
import { Modal } from "./modal";
import { useTheme } from "./theme";
import { formatTokenCount, formatCost } from "./usage-overlay";
import type { AggregateMetrics, AnalyticsGroupBy, AnalyticsSummary } from "../lib/analytics-summary";

// ---------------------------------------------------------------------------
// Constants & helpers (exported for testing and adapters)
// ---------------------------------------------------------------------------

/** Grouping order used when cycling with Tab. */
export const ANALYTICS_GROUPINGS: readonly AnalyticsGroupBy[] = ["task", "quest", "wave", "agent", "model"];

const GROUPING_LABELS: Record<AnalyticsGroupBy, string> = {
  task: "Task",
  quest: "Quest",
  wave: "Wave",
  agent: "Agent",
  model: "Model",
};

/** Default number of group rows rendered at once. */
export const DEFAULT_MAX_VISIBLE_ROWS = 8;

const NA = "n/a";
const KEY_WIDTH = 22;

export function nextAnalyticsGrouping(current: AnalyticsGroupBy): AnalyticsGroupBy {
  const idx = ANALYTICS_GROUPINGS.indexOf(current);
  return ANALYTICS_GROUPINGS[(idx + 1) % ANALYTICS_GROUPINGS.length];
}

export function formatAnalyticsDuration(ms: number | null): string {
  if (ms === null) return NA;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}m`;
}

export function formatAnalyticsRate(rate: number | null): string {
  return rate === null ? NA : `${(rate * 100).toFixed(0)}%`;
}

function truncate(text: string, width: number): string {
  return text.length > width ? text.slice(0, width - 1) + "…" : text.padEnd(width);
}

function keyLabel(key: string | null): string {
  return key === null ? "(none)" : key;
}

/** Visible window [start, end) of `total` rows keeping `selected` in view. */
export function visibleWindow(total: number, selected: number, maxRows: number): { start: number; end: number } {
  const rows = Math.max(1, maxRows);
  if (total <= rows) return { start: 0, end: total };
  const start = Math.min(Math.max(0, selected - Math.floor(rows / 2)), total - rows);
  return { start, end: start + rows };
}

/** Human-readable coverage warning, or null when usage coverage is complete. */
export function coverageWarning(m: AggregateMetrics): string | null {
  const parts: string[] = [];
  if (m.usage.coverage.partial > 0) parts.push(`${m.usage.coverage.partial} partial`);
  if (m.usage.missing > 0) parts.push(`${m.usage.missing} without usage`);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsOverlayViewProps {
  /** Shared summary (total + grouped entries), or null when nothing is loaded. */
  summary: AnalyticsSummary | null;
  /** Current grouping; grouped entries come from summary.groups. */
  groupBy: AnalyticsGroupBy;
  /** Selected index in the group list. */
  selectedIndex: number;
  /** Storage diagnostics (malformed/unsupported files) to surface. */
  diagnostics?: string[];
  /** Max group rows rendered at once (default 8). */
  maxVisibleRows?: number;
  onClose: () => void;
  onCycleGrouping: () => void;
  onSelectIndex: (index: number) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricsBlock({ m, heading }: { m: AggregateMetrics; heading: string }): React.ReactElement {
  const theme = useTheme();
  const col = (c: string) => c || undefined;
  const u = m.usage.totals;
  const warning = coverageWarning(m);
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">{heading}</Text>
      <Box>
        <Text>  Executions: {m.executions} </Text>
        <Text color={col(theme.statusColors.verified)}>{m.outcomes.succeeded} ok</Text>
        <Text> </Text>
        <Text color={col(theme.statusColors.failed)}>{m.outcomes.failed} failed</Text>
        <Text> </Text>
        <Text color={col(theme.statusColors.retry)}>{m.outcomes.stopped} stopped</Text>
        <Text> {m.outcomes.running} running</Text>
      </Box>
      <Text>
        {"  "}Completion:{" "}
        {m.duration.samples > 0
          ? `mean ${formatAnalyticsDuration(m.duration.mean_ms)}, total ${formatAnalyticsDuration(m.duration.total_ms)} (${m.duration.samples} successful)`
          : `${NA} (no successful runs)`}
        {"  "}Retries: {m.retries.total}
      </Text>
      <Text>
        {"  "}Tokens:{" "}
        {m.usage.samples > 0
          ? `${formatTokenCount(u.total_tokens)} total  ${formatCost(u.total_cost)}  [${m.usage.samples}/${m.executions} with usage]`
          : `${NA} (no usage data)`}
      </Text>
      {m.usage.samples > 0 && (
        <Text dimColor>
          {"    "}in {formatTokenCount(u.input_tokens)}  out {formatTokenCount(u.output_tokens)}  cache {formatTokenCount(u.cache_read)}/
          {formatTokenCount(u.cache_write)}  reasoning {formatTokenCount(u.reasoning_tokens)}
        </Text>
      )}
      <Text>
        {"  "}Build pass rate:{" "}
        {m.builds.attempts > 0
          ? `${formatAnalyticsRate(m.builds.pass_rate)} (${m.builds.passes}/${m.builds.attempts} builds)`
          : `${NA} (no builds)`}
        {"  "}Lines:{" "}
        {m.lines.samples > 0
          ? `+${m.lines.additions} / -${m.lines.deletions} (${m.lines.changed} changed) [${m.lines.samples}/${m.executions}]`
          : `${NA} (no measurements)`}
      </Text>
      {warning && <Text color="yellow">  Usage coverage: {warning}; totals may be incomplete</Text>}
    </Box>
  );
}

function GroupRow({
  label,
  m,
  isSelected,
}: {
  label: string | null;
  m: AggregateMetrics;
  isSelected: boolean;
}): React.ReactElement {
  const cov = coverageWarning(m);
  return (
    <Box>
      <Text color={isSelected ? "blue" : undefined} bold={isSelected}>
        {isSelected ? "▸ " : "  "}
        {truncate(keyLabel(label), KEY_WIDTH)}
      </Text>
      <Text> {String(m.executions).padStart(3)}x </Text>
      <Text color="cyan">{formatAnalyticsDuration(m.duration.mean_ms).padStart(7)}</Text>
      <Text> {(m.usage.samples > 0 ? formatTokenCount(m.usage.totals.total_tokens) : NA).padStart(7)}</Text>
      <Text> {formatAnalyticsRate(m.builds.pass_rate).padStart(4)}</Text>
      <Text> {(m.lines.samples > 0 ? `+${m.lines.additions}/-${m.lines.deletions}` : NA).padStart(10)}</Text>
      {cov && <Text color="yellow"> !</Text>}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnalyticsOverlayView({
  summary,
  groupBy,
  selectedIndex,
  diagnostics = [],
  maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS,
  onClose,
  onCycleGrouping,
  onSelectIndex,
}: AnalyticsOverlayViewProps): React.ReactElement {
  const groups = summary?.groups ?? [];

  useInput((input, key) => {
    if (key.escape || input === "u" || input === "U") {
      onClose();
      return;
    }
    if (key.tab) {
      onCycleGrouping();
      return;
    }
    if ((key.downArrow || input === "j") && groups.length > 0) {
      onSelectIndex(Math.min(selectedIndex + 1, groups.length - 1));
      return;
    }
    if ((key.upArrow || input === "k") && groups.length > 0) {
      onSelectIndex(Math.max(selectedIndex - 1, 0));
    }
  });

  const nextLabel = GROUPING_LABELS[nextAnalyticsGrouping(groupBy)];
  const total = summary?.total ?? null;
  const hasData = total !== null && total.executions > 0;
  const safeSelected = Math.min(Math.max(selectedIndex, 0), Math.max(groups.length - 1, 0));
  const { start, end } = visibleWindow(groups.length, safeSelected, maxVisibleRows);
  const selectedGroup = groups[safeSelected];

  return (
    <Modal
      title={hasData ? `Agent Analytics  ${total!.executions} executions` : "Agent Analytics"}
      borderColor="yellow"
      footer={
        <Box>
          <Text dimColor>Tab</Text>
          <Text> group by {nextLabel}  </Text>
          <Text dimColor>↑↓/jk</Text>
          <Text> select  </Text>
          <Text dimColor>Esc/U</Text>
          <Text> close  </Text>
          <Text dimColor>|  Grouped by: </Text>
          <Text color="yellow">{GROUPING_LABELS[groupBy]}</Text>
        </Box>
      }
    >
      {!hasData ? (
        <Box flexDirection="column">
          <Text dimColor>No analytics data found.</Text>
          <Text dimColor>Analytics are recorded per execution when agents run via the daemon.</Text>
          <Text dimColor>Earlier usage/history is not backfilled.</Text>
        </Box>
      ) : (
        <>
          <MetricsBlock m={total!} heading="Total:" />

          {groups.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold dimColor>By {GROUPING_LABELS[groupBy]}:</Text>
              {start > 0 && <Text dimColor>  ↑ {start} more</Text>}
              {groups.slice(start, end).map((g, i) => (
                <GroupRow key={`${g.key ?? "∅"}-${start + i}`} label={g.key} m={g.metrics} isSelected={start + i === safeSelected} />
              ))}
              {end < groups.length && <Text dimColor>  ↓ {groups.length - end} more</Text>}
            </Box>
          )}

          {selectedGroup && (
            <Box marginTop={1}>
              <MetricsBlock m={selectedGroup.metrics} heading={`Selected: ${truncate(keyLabel(selectedGroup.key), 40).trimEnd()}`} />
            </Box>
          )}
        </>
      )}

      {diagnostics.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">Storage issues ({diagnostics.length}):</Text>
          {diagnostics.slice(0, 3).map((d, i) => (
            <Text key={i} dimColor>  {d.length > 70 ? d.slice(0, 69) + "…" : d}</Text>
          ))}
          {diagnostics.length > 3 && <Text dimColor>  … and {diagnostics.length - 3} more</Text>}
        </Box>
      )}
    </Modal>
  );
}
