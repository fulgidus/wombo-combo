/**
 * replay-screen.tsx — Task picker for recorded agent sessions, reached from
 * the global ESC menu. Enter opens the newest execution of the selected task
 * in the ReplayViewer (`[` / `]` switch executions); Esc closes the viewer,
 * then leaves the screen. Replays are read on demand (no polling).
 */

import React, { useCallback, useMemo, useState } from "react";
import { Box, Text } from "ink";
import { useScreenInput } from "./esc-menu";
import { useI18n } from "./i18n";
import { useTerminalSize } from "./use-terminal-size";
import { ReplayViewer } from "./replay-viewer";
import { ReplayStore, type LoadedReplay, type ReplaySummary } from "../lib/replay";

export interface ReplayScreenProps {
  projectRoot: string;
  /** Leave the screen (Esc in the picker). */
  onBack?: () => void;
}

interface TaskRow {
  taskId: string;
  runs: ReplaySummary[];
}

function groupByTask(all: ReplaySummary[]): TaskRow[] {
  const map = new Map<string, ReplaySummary[]>();
  for (const s of all) {
    const list = map.get(s.task_id) ?? [];
    list.push(s);
    map.set(s.task_id, list);
  }
  return [...map.entries()]
    .map(([taskId, runs]) => ({ taskId, runs }))
    .sort((a, b) => a.taskId.localeCompare(b.taskId));
}

function latestWhen(runs: ReplaySummary[]): string {
  const last = runs[runs.length - 1];
  return (last?.started_at ?? "").replace("T", " ").slice(0, 16);
}

export function ReplayScreen({ projectRoot, onBack }: ReplayScreenProps): React.ReactElement {
  const t = useI18n();
  const { rows, columns } = useTerminalSize();
  const tasks = useMemo<TaskRow[]>(() => {
    try {
      return groupByTask(new ReplayStore(projectRoot).list());
    } catch {
      return [];
    }
  }, [projectRoot]);

  const [cursor, setCursor] = useState(0);
  const [open, setOpen] = useState<{ row: TaskRow; index: number; data: LoadedReplay | null } | null>(null);

  const loadAt = useCallback(
    (row: TaskRow, index: number) => {
      const pick = row.runs[index];
      let data: LoadedReplay | null = null;
      try {
        data = pick ? new ReplayStore(projectRoot).load(pick.task_id, pick.execution_id) : null;
      } catch {
        data = null;
      }
      setOpen({ row, index, data });
    },
    [projectRoot],
  );

  useScreenInput(
    (_input, key) => {
      if (key.escape) return onBack?.();
      if (key.upArrow) return setCursor((c) => Math.max(0, c - 1));
      if (key.downArrow) return setCursor((c) => Math.min(Math.max(tasks.length - 1, 0), c + 1));
      if (key.return) {
        const row = tasks[Math.min(cursor, tasks.length - 1)];
        if (row) loadAt(row, row.runs.length - 1);
      }
    },
    { isActive: open === null },
  );

  if (open) {
    const step = (delta: number): void => {
      const next = Math.min(Math.max(open.index + delta, 0), open.row.runs.length - 1);
      if (next !== open.index) loadAt(open.row, next);
    };
    return (
      <ReplayViewer
        replay={open.data}
        executionLabel={open.row.runs.length > 1 ? `${open.index + 1}/${open.row.runs.length}` : undefined}
        rows={rows}
        columns={columns}
        onClose={() => setOpen(null)}
        onPrevExecution={() => step(-1)}
        onNextExecution={() => step(1)}
      />
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>{t("replays.title")}</Text>
      <Box flexDirection="column" marginY={1}>
        {tasks.length === 0 && <Text dimColor>{t("replays.empty")}</Text>}
        {tasks.map((row, i) => (
          <Box key={row.taskId} flexDirection="row" gap={1}>
            <Text color={i === cursor ? "cyan" : undefined}>{i === cursor ? ">" : " "}</Text>
            <Text color={i === cursor ? "cyan" : undefined} bold={i === cursor}>
              {row.taskId}
            </Text>
            <Text dimColor>
              {t("replays.runs", { count: row.runs.length })} · {t("replays.latest", { when: latestWhen(row.runs) })}
            </Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>{t("replays.hint")}</Text>
    </Box>
  );
}
