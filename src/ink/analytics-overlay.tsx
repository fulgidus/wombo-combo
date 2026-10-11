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
import { Box, Text } from "ink";
import { Modal } from "./modal";
import { useTheme } from "./theme";
import { formatTokenCount, formatCost } from "./usage-overlay";
import type { AggregateMetrics, AnalyticsGroupBy, AnalyticsSummary } from "../lib/analytics-summary";
import { useScreenInput } from "./esc-menu";
import { useI18n, t as defaultT, type TFunction } from "./i18n";

// ---------------------------------------------------------------------------
// Constants & helpers (exported for testing and adapters)
// ---------------------------------------------------------------------------

/** Grouping order used when cycling with Tab. */
export const ANALYTICS_GROUPINGS: readonly AnalyticsGroupBy[] = ["task", "quest", "wave", "agent", "model"];

const GROUPING_LABEL_KEYS: Record<AnalyticsGroupBy, string> = {
  task: "usage.group.task",
  quest: "usage.group.quest",
  wave: "analytics.group.wave",
  agent: "analytics.group.agent",
  model: "usage.group.model",
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

function keyLabel(key: string | null, t: TFunction = defaultT): string {
  return key === null ? t("analytics.none") : key;
}

/** Visible window [start, end) of `total` rows keeping `selected` in view. */
export function visibleWindow(total: number, selected: number, maxRows: number): { start: number; end: number } {
  const rows = Math.max(1, maxRows);
  if (total <= rows) return { start: 0, end: total };
  const start = Math.min(Math.max(0, selected - Math.floor(rows / 2)), total - rows);
  return { start, end: start + rows };
}

/** Human-readable coverage warning, or null when usage coverage is complete. */
export function coverageWarning(m: AggregateMetrics, t: TFunction = defaultT): string | null {
  const parts: string[] = [];
  if (m.usage.coverage.partial > 0) parts.push(t("analytics.coveragePartial", { count: m.usage.coverage.partial }));
  if (m.usage.missing > 0) parts.push(t("analytics.coverageMissing", { count: m.usage.missing }));
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
  const t = useI18n();
  const theme = useTheme();
  const col = (c: string) => c || undefined;
  const u = m.usage.totals;
  const warning = coverageWarning(m, t);
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">{heading}</Text>
      <Box>
        <Text>  {t("analytics.executions", { count: m.executions })} </Text>
        <Text color={col(theme.statusColors.verified)}>{t("analytics.outcome.ok", { count: m.outcomes.succeeded })}</Text>
        <Text> </Text>
        <Text color={col(theme.statusColors.failed)}>{t("analytics.outcome.failed", { count: m.outcomes.failed })}</Text>
        <Text> </Text>
        <Text color={col(theme.statusColors.retry)}>{t("analytics.outcome.stopped", { count: m.outcomes.stopped })}</Text>
        <Text> {t("analytics.outcome.running", { count: m.outcomes.running })}</Text>
      </Box>
      <Text>
        {"  "}{t("analytics.completion")}{" "}
        {m.duration.samples > 0
          ? t("analytics.completionValue", { mean: formatAnalyticsDuration(m.duration.mean_ms), total: formatAnalyticsDuration(m.duration.total_ms), samples: m.duration.samples })
          : t("analytics.completionNone", { na: NA })}
        {"  "}{t("analytics.retries", { count: m.retries.total })}
      </Text>
      <Text>
        {"  "}{t("analytics.tokens")}{" "}
        {m.usage.samples > 0
          ? t("analytics.tokensValue", { total: formatTokenCount(u.total_tokens), cost: formatCost(u.total_cost), samples: m.usage.samples, executions: m.executions })
          : t("analytics.tokensNone", { na: NA })}
      </Text>
      {m.usage.samples > 0 && (
        <Text dimColor>
          {"    "}{t("analytics.tokenBreakdown", { input: formatTokenCount(u.input_tokens), output: formatTokenCount(u.output_tokens), cacheRead: formatTokenCount(u.cache_read), cacheWrite: formatTokenCount(u.cache_write), reasoning: formatTokenCount(u.reasoning_tokens) })}
        </Text>
      )}
      <Text>
        {"  "}{t("analytics.buildPassRate")}{" "}
        {m.builds.attempts > 0
          ? t("analytics.buildsValue", { rate: formatAnalyticsRate(m.builds.pass_rate), passes: m.builds.passes, attempts: m.builds.attempts })
          : t("analytics.buildsNone", { na: NA })}
        {"  "}{t("analytics.lines")}{" "}
        {m.lines.samples > 0
          ? t("analytics.linesValue", { additions: m.lines.additions, deletions: m.lines.deletions, changed: m.lines.changed, samples: m.lines.samples, executions: m.executions })
          : t("analytics.linesNone", { na: NA })}
      </Text>
      {warning && <Text color="yellow">  {t("analytics.coverageWarning", { warning })}</Text>}
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
  const t = useI18n();
  const cov = coverageWarning(m, t);
  return (
    <Box>
      <Text color={isSelected ? "blue" : undefined} bold={isSelected}>
        {isSelected ? "▸ " : "  "}
        {truncate(keyLabel(label, t), KEY_WIDTH)}
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
  const t = useI18n();
  const groups = summary?.groups ?? [];

  useScreenInput((input, key) => {
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

  const nextLabel = t(GROUPING_LABEL_KEYS[nextAnalyticsGrouping(groupBy)]);
  const total = summary?.total ?? null;
  const hasData = total !== null && total.executions > 0;
  const safeSelected = Math.min(Math.max(selectedIndex, 0), Math.max(groups.length - 1, 0));
  const { start, end } = visibleWindow(groups.length, safeSelected, maxVisibleRows);
  const selectedGroup = groups[safeSelected];

  return (
    <Modal
      title={hasData ? t("analytics.titleWithCount", { count: total!.executions }) : t("analytics.title")}
      borderColor="yellow"
      footer={
        <Box>
          <Text dimColor>Tab</Text>
          <Text> {t("usage.groupBy", { label: nextLabel })}  </Text>
          <Text dimColor>↑↓/jk</Text>
          <Text> {t("questPicker.key.select")}  </Text>
          <Text dimColor>Esc/U</Text>
          <Text> {t("questionPopup.close")}  </Text>
          <Text dimColor>|  {t("usage.groupedBy")} </Text>
          <Text color="yellow">{t(GROUPING_LABEL_KEYS[groupBy])}</Text>
        </Box>
      }
    >
      {!hasData ? (
        <Box flexDirection="column">
          <Text dimColor>{t("analytics.noData")}</Text>
          <Text dimColor>{t("analytics.noDataHint1")}</Text>
          <Text dimColor>{t("analytics.noDataHint2")}</Text>
        </Box>
      ) : (
        <>
          <MetricsBlock m={total!} heading={t("usage.total")} />

          {groups.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold dimColor>{t("usage.byGroup", { label: t(GROUPING_LABEL_KEYS[groupBy]) })}</Text>
              {start > 0 && <Text dimColor>  ↑ {t("analytics.more", { count: start })}</Text>}
              {groups.slice(start, end).map((g, i) => (
                <GroupRow key={`${g.key ?? "∅"}-${start + i}`} label={g.key} m={g.metrics} isSelected={start + i === safeSelected} />
              ))}
              {end < groups.length && <Text dimColor>  ↓ {t("analytics.more", { count: groups.length - end })}</Text>}
            </Box>
          )}

          {selectedGroup && (
            <Box marginTop={1}>
              <Text dimColor>
                {t("analytics.selectedSummary", {
                  label: truncate(keyLabel(selectedGroup.key, t), 30).trimEnd(),
                  executions: selectedGroup.metrics.executions,
                  retries: selectedGroup.metrics.retries.total,
                  input: formatTokenCount(selectedGroup.metrics.usage.totals.input_tokens),
                  output: formatTokenCount(selectedGroup.metrics.usage.totals.output_tokens),
                  passes: selectedGroup.metrics.builds.passes,
                  attempts: selectedGroup.metrics.builds.attempts,
                })}
              </Text>
            </Box>
          )}
        </>
      )}

      {diagnostics.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">{t("analytics.storageIssues", { count: diagnostics.length })}</Text>
          {diagnostics.slice(0, 3).map((d, i) => (
            <Text key={i} dimColor>  {d.length > 70 ? d.slice(0, 69) + "…" : d}</Text>
          ))}
          {diagnostics.length > 3 && <Text dimColor>  … {t("analytics.andMore", { count: diagnostics.length - 3 })}</Text>}
        </Box>
      )}
    </Modal>
  );
}
