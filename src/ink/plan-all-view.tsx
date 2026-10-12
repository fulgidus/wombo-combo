/**
 * plan-all-view.tsx — aggregate progress view for `plan every unplanned quest`.
 *
 * Pure view: one row per quest (shared Spinner while running, state, tokens,
 * provider-reported cost), a running total, the skipped quests, and a key
 * hint line. Rows are windowed to fit `height` so the screen never scrolls.
 */

import React from "react";
import { Box, Text } from "ink";
import { Spinner } from "./spinner";
import { formatTokenCount } from "./usage-overlay";
import { useI18n } from "./i18n";
import type { PlanAllRow, PlanAllTotals, SkippedQuest } from "../lib/quest-plan-all";

export interface PlanAllViewProps {
  rows: PlanAllRow[];
  totals: PlanAllTotals;
  /** All planners settled (or were aborted) */
  finished: boolean;
  skipped: SkippedQuest[];
  spinFrame: number;
  /** Terminal rows available to this view */
  height: number;
  /** Number of plans that can be approved in one go (finished phase) */
  validCount?: number;
}

/** Lines used by header, total, skipped summary and key hints. */
const CHROME_LINES = 4;

/** Choose the slice of rows to show: keep the first unfinished row in view. */
export function visibleWindow(
  rows: PlanAllRow[],
  capacity: number,
): { start: number; end: number } {
  if (rows.length <= capacity) return { start: 0, end: rows.length };
  const active = rows.findIndex((r) => r.state === "running" || r.state === "queued");
  const focus = active === -1 ? 0 : active;
  const start = Math.max(0, Math.min(focus - Math.floor(capacity / 2), rows.length - capacity));
  return { start, end: start + capacity };
}

const STATE_COLOR: Record<PlanAllRow["state"], string> = {
  queued: "gray",
  running: "cyan",
  done: "green",
  failed: "red",
  aborted: "yellow",
};

function stats(tokensIn: number, tokensOut: number, cost: number | null): string {
  const parts: string[] = [];
  if (tokensIn || tokensOut) parts.push(`↑${formatTokenCount(tokensIn)} ↓${formatTokenCount(tokensOut)}`);
  if (cost !== null) parts.push(`$${cost.toFixed(4)}`);
  return parts.join(" · ");
}

function RowLine({ row, spinFrame }: { row: PlanAllRow; spinFrame: number }): React.ReactElement {
  const t = useI18n();
  const detail =
    row.state === "failed"
      ? (row.error ?? "")
      : row.state === "done"
        ? t("planAll.tasks", { count: row.result?.tasks.length ?? 0 })
        : row.activity;
  const s = stats(row.tokensIn, row.tokensOut, row.cost);
  return (
    <Box>
      <Box width={2}>
        {row.state === "running" ? <Spinner frame={spinFrame} color="magenta" /> : <Text> </Text>}
      </Box>
      <Box width={24}>
        <Text wrap="truncate-end">{row.quest.id}</Text>
      </Box>
      <Box width={9}>
        <Text color={STATE_COLOR[row.state] as any}>{t(`planAll.state.${row.state}`)}</Text>
      </Box>
      <Box width={22}>
        <Text color="cyan" wrap="truncate-end">{s}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text dimColor wrap="truncate-end">{detail}</Text>
      </Box>
    </Box>
  );
}

export function PlanAllView({
  rows,
  totals,
  finished,
  skipped,
  spinFrame,
  height,
  validCount = 0,
}: PlanAllViewProps): React.ReactElement {
  const t = useI18n();
  const capacity = Math.max(1, height - CHROME_LINES);
  // Reserve one line for the "+N more" marker when rows overflow
  const overflow = rows.length > capacity;
  const win = visibleWindow(rows, overflow ? Math.max(1, capacity - 1) : capacity);
  const hidden = rows.length - (win.end - win.start);
  const totalStats = stats(totals.tokensIn, totals.tokensOut, totals.cost);

  return (
    <Box flexDirection="column" paddingX={1} height={height}>
      <Text bold color="magenta">{t("planAll.title", { count: rows.length })}</Text>
      {rows.slice(win.start, win.end).map((r) => (
        <RowLine key={r.quest.id} row={r} spinFrame={spinFrame} />
      ))}
      {hidden > 0 && <Text dimColor>{t("planAll.more", { count: hidden })}</Text>}
      <Text>
        <Text bold>{t("planAll.total")}</Text> <Text color="cyan">{totalStats || "-"}</Text>
        {skipped.length > 0 && (
          <Text dimColor>
            {"  "}
            {t("planAll.skipped", { count: skipped.length, ids: skipped.map((s) => s.quest.id).join(", ") })}
          </Text>
        )}
      </Text>
      {finished ? (
        <Text dimColor>
          →/Enter {t("planAll.key.review")}  a {t("planAll.key.approveAll", { count: validCount })}  ←/q {t("planAll.key.back")}
        </Text>
      ) : (
        <Text dimColor>Esc {t("planAll.key.abort")}</Text>
      )}
    </Box>
  );
}
