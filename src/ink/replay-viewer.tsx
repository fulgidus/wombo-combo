/**
 * replay-viewer.tsx — Ink replay viewer for recorded agent sessions.
 *
 * ReplayViewerView is a props-driven, Modal-based renderer; ReplayViewer owns
 * the playback state and the SINGLE playback interval. The interval exists
 * only while playing (started on play, cleared on pause, at the end of the
 * recording, when the replay changes and on unmount).
 *
 * Panes: status bar (play state, speed, position, progress), timeline window,
 * event detail, and a scrollable diff pane (toggle with d). Rendering is
 * bounded by the terminal size: only a window of timeline rows, a clamped
 * detail pane and a clamped diff window are ever rendered. Tiny terminals
 * collapse the detail pane to a single summary line.
 *
 * Keys: Left/Right/h/l or Up/Down/j/k step (Up/Down scroll the diff while it
 * is shown), PgUp/PgDn jump 10, g/G first/last, n/N next/previous tool call
 * or error, Space play/pause, +/- speed (0.5x-8x), d diff pane, [ ] previous/
 * next execution, Esc/q close.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Text } from "ink";
import { Modal } from "./modal";
import { useScreenInput } from "./esc-menu";
import { useTerminalSize } from "./use-terminal-size";
import type { LoadedReplay } from "../lib/replay";
import { classifyDiffLine } from "../lib/replay-diff";
import {
  buildTimeline,
  clampLines,
  createPlayer,
  detailLines,
  formatOffset,
  formatSpeed,
  playerReduce,
  progressBar,
  windowRange,
  type PlayerAction,
  type PlayerState,
  type TimelineEntry,
} from "../lib/replay-player";

/** Playback interval granularity (ms). */
export const REPLAY_TICK_MS = 100;
/** Rows consumed by the modal chrome (border, title, footer). */
const CHROME_ROWS = 11;
/** Entries moved by PgUp/PgDn. */
const PAGE = 10;

function fit(text: string, width: number): string {
  const w = Math.max(4, width);
  return text.length > w ? `${text.slice(0, w - 1)}…` : text;
}

function entryColor(e: TimelineEntry): string | undefined {
  if (e.isError) return "red";
  const r = e.record;
  if (r.kind === "attempt") return "yellow";
  if (r.kind === "end") return r.outcome === "succeeded" ? "green" : r.outcome === "failed" ? "red" : "yellow";
  if (r.kind === "event" && r.event.type === "tool") return "cyan";
  if (r.kind === "diff") return "magenta";
  return undefined;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export interface ReplayViewerViewProps {
  replay: LoadedReplay | null;
  timeline: TimelineEntry[];
  player: PlayerState;
  showDiff: boolean;
  diffScroll: number;
  rows: number;
  columns: number;
  /** e.g. "2/3" when the task has several executions. */
  executionLabel?: string;
}

export function ReplayViewerView({
  replay,
  timeline,
  player: playerProp,
  showDiff,
  diffScroll,
  rows,
  columns,
  executionLabel,
}: ReplayViewerViewProps): React.ReactElement {
  let player = playerProp;
  const width = Math.max(30, Math.min(columns - 2, 110));
  const inner = width - 6;
  const body = Math.max(3, rows - CHROME_ROWS);
  const footerText =
    width >= 90
      ? "←→/jk step  n/N marker  Space play  +/- speed  d diff  [ ] execution  PgUp/PgDn  g/G  Esc close"
      : "←→ step  Space play  +/- speed  d diff  Esc close";

  const outcome = replay?.end?.outcome ?? (replay ? "unfinished" : "");
  const title = replay
    ? `Replay  ${replay.task_id}${executionLabel ? `  exec ${executionLabel}` : ""}  ${outcome}`
    : "Replay";
  const footer = (
    <Text dimColor wrap="truncate">
      {fit(footerText, inner)}
    </Text>
  );

  if (!replay || timeline.length === 0) {
    return (
      <Box width={width}>
        <Modal title={title} borderColor="magenta" footer={footer}>
          <Text dimColor>{replay ? "This replay has no recorded events." : "No replay recorded for this task."}</Text>
          <Text dimColor>Replays are recorded per execution when agents run via the daemon.</Text>
        </Modal>
      </Box>
    );
  }

  // Defensive: a stale index (replay swapped before the reset effect ran)
  // must never crash the render.
  const index = Math.min(Math.max(player.index, 0), timeline.length - 1);
  if (index !== player.index) player = { ...player, index };
  const current = timeline[player.index];
  const avail = body - 1; // status line
  const status = (
    <Box>
      <Text bold color={player.playing ? "green" : "yellow"}>
        {player.playing ? "▶ playing" : "⏸ paused "}
      </Text>
      <Text> {formatSpeed(player.speed).padEnd(4)} </Text>
      <Text>
        {player.index + 1}/{timeline.length}
      </Text>
      <Text dimColor> {formatOffset(current.offsetMs)} </Text>
      <Text color="magenta">{progressBar(player.index, timeline.length, Math.max(6, Math.min(30, inner - 40)))}</Text>
    </Box>
  );

  if (showDiff) {
    const diff = replay.diff;
    const lines = diff ? diff.diff.split("\n") : [];
    const view = Math.max(1, avail - 1);
    const maxScroll = Math.max(0, lines.length - view);
    const start = Math.min(Math.max(0, diffScroll), maxScroll);
    return (
      <Box width={width}>
        <Modal title={title} borderColor="magenta" footer={footer}>
          {status}
          <Text bold color="yellow" wrap="truncate">
            {diff
              ? `Diff: ${diff.files.length} file(s)${diff.truncated ? ", truncated" : ""}  lines ${lines.length === 0 ? 0 : start + 1}-${Math.min(start + view, lines.length)}/${lines.length}  (↑↓ scroll, d back)`
              : "No diff was captured for this execution (d back)"}
          </Text>
          {lines.slice(start, start + view).map((l, i) => {
            const kind = classifyDiffLine(l);
            const color = kind === "add" ? "green" : kind === "del" ? "red" : kind === "hunk" ? "cyan" : undefined;
            return (
              <Text key={start + i} color={color} dimColor={kind === "meta"} wrap="truncate">
                {fit(l || " ", inner)}
              </Text>
            );
          })}
        </Modal>
      </Box>
    );
  }

  const split = avail >= 12;
  const listRows = split ? Math.max(3, Math.floor(avail * 0.45)) : Math.max(1, avail - 1);
  const detailRows = split ? avail - listRows - 1 : 1;
  const { start, end } = windowRange(timeline.length, player.index, listRows);
  const detail = split ? clampLines(detailLines(current, inner), detailRows) : [fit(current.label, inner)];

  return (
    <Box width={width}>
      <Modal title={title} borderColor="magenta" footer={footer}>
        {status}
        {timeline.slice(start, end).map((e, i) => {
          const idx = start + i;
          const selected = idx === player.index;
          return (
            <Text key={e.record.seq} color={entryColor(e)} bold={selected} dimColor={idx > player.index} inverse={selected} wrap="truncate">
              {fit(`${selected ? "▸" : " "} ${formatOffset(e.offsetMs).padStart(7)}  ${e.label}`, inner)}
            </Text>
          );
        })}
        {split && (
          <Text dimColor wrap="truncate">
            {"─".repeat(Math.max(4, Math.min(inner, 60)))}
          </Text>
        )}
        {detail.map((l, i) => (
          <Text key={i} wrap="truncate">
            {fit(l || " ", inner)}
          </Text>
        ))}
      </Modal>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Stateful wrapper
// ---------------------------------------------------------------------------

export interface ReplayViewerProps {
  replay: LoadedReplay | null;
  executionLabel?: string;
  /** Override terminal size (default: live terminal size). */
  rows?: number;
  columns?: number;
  tickMs?: number;
  onClose: () => void;
  onPrevExecution?: () => void;
  onNextExecution?: () => void;
}

export function ReplayViewer({
  replay,
  executionLabel,
  rows: rowsProp,
  columns: columnsProp,
  tickMs = REPLAY_TICK_MS,
  onClose,
  onPrevExecution,
  onNextExecution,
}: ReplayViewerProps): React.ReactElement {
  const size = useTerminalSize();
  const rows = rowsProp ?? size.rows;
  const columns = columnsProp ?? size.columns;

  const timeline = useMemo(() => (replay ? buildTimeline(replay) : []), [replay]);
  const [player, setPlayer] = useState<PlayerState>(() => createPlayer(timeline));
  const [showDiff, setShowDiff] = useState(false);
  const [diffScroll, setDiffScroll] = useState(0);

  // A different replay (execution switch) starts from the beginning, paused.
  useEffect(() => {
    setPlayer(createPlayer(timeline));
    setShowDiff(false);
    setDiffScroll(0);
  }, [timeline]);

  const apply = useCallback(
    (action: PlayerAction) => setPlayer((p) => playerReduce(p, action, timeline)),
    [timeline],
  );

  // The only timer: alive strictly while playing.
  useEffect(() => {
    if (!player.playing) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const wallMs = now - last;
      last = now;
      apply({ type: "tick", wallMs });
    }, tickMs);
    return () => clearInterval(id);
  }, [player.playing, tickMs, apply]);

  const diffLineCount = replay?.diff ? replay.diff.diff.split("\n").length : 0;
  const diffView = Math.max(1, Math.max(3, rows - CHROME_ROWS) - 2);
  const maxDiffScroll = Math.max(0, diffLineCount - diffView);

  useScreenInput((input, key) => {
    if (key.escape || input === "q") {
      onClose();
      return;
    }
    if (input === " ") return apply({ type: "toggle" });
    if (input === "d") {
      setShowDiff((v) => !v);
      setDiffScroll(0);
      return;
    }
    if (input === "+" || input === "=") return apply({ type: "faster" });
    if (input === "-" || input === "_") return apply({ type: "slower" });
    if (input === "[") return onPrevExecution?.();
    if (input === "]") return onNextExecution?.();

    if (showDiff) {
      if (key.downArrow || input === "j") return setDiffScroll((s) => Math.min(s + 1, maxDiffScroll));
      if (key.upArrow || input === "k") return setDiffScroll((s) => Math.max(s - 1, 0));
      if (key.pageDown) return setDiffScroll((s) => Math.min(s + diffView, maxDiffScroll));
      if (key.pageUp) return setDiffScroll((s) => Math.max(s - diffView, 0));
      if (input === "g") return setDiffScroll(0);
      if (input === "G") return setDiffScroll(maxDiffScroll);
    } else {
      if (key.downArrow || input === "j") return apply({ type: "step", delta: 1 });
      if (key.upArrow || input === "k") return apply({ type: "step", delta: -1 });
      if (key.pageDown) return apply({ type: "step", delta: PAGE });
      if (key.pageUp) return apply({ type: "step", delta: -PAGE });
      if (input === "g") return apply({ type: "first" });
      if (input === "G") return apply({ type: "last" });
    }
    if (key.rightArrow || input === "l") return apply({ type: "step", delta: 1 });
    if (key.leftArrow || input === "h") return apply({ type: "step", delta: -1 });
    if (input === "n") return apply({ type: "nextMarker" });
    if (input === "N") return apply({ type: "prevMarker" });
  });

  return (
    <ReplayViewerView
      replay={replay}
      timeline={timeline}
      player={player}
      showDiff={showDiff}
      diffScroll={diffScroll}
      rows={rows}
      columns={columns}
      executionLabel={executionLabel}
    />
  );
}
