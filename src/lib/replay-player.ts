/**
 * replay-player.ts — Pure, timer-free playback model for a loaded replay.
 *
 * The viewer owns at most one interval and feeds elapsed wall time into
 * `playerReduce(state, { type: "tick", wallMs }, timeline)`. Everything here
 * is deterministic and free of React, timers and I/O.
 *
 * Playback clock: entries carry a recorded offset (ms since the first record).
 * Idle gaps are compressed: the gap between two consecutive entries counts for
 * at most MAX_GAP_MS of playback time, so a 10 minute silence does not stall
 * the viewer. `clockMs` is the playback position in that compressed time and
 * advances by `wallMs * speed` per tick.
 */

import { recordLabel, type LoadedReplay, type ReplayRecord } from "./replay";

export const SPEEDS: readonly number[] = [0.5, 1, 2, 4, 8];
export const DEFAULT_SPEED_INDEX = 1;
/** Max playback time (ms at 1x) a recorded gap between two entries may take. */
export const MAX_GAP_MS = 2000;

export interface TimelineEntry {
  record: ReplayRecord;
  /** Recorded ms since the first record. */
  offsetMs: number;
  /** Compressed playback time (ms at 1x) at which this entry appears. */
  playMs: number;
  label: string;
  /** Jump target for next/previous marker: tool call, error, attempt, end. */
  marker: boolean;
  /** Tool error or error event. */
  isError: boolean;
}

export interface PlayerState {
  index: number;
  playing: boolean;
  speed: number;
  /** Position on the compressed playback clock (ms). */
  clockMs: number;
}

export type PlayerAction =
  | { type: "seek"; index: number }
  | { type: "step"; delta: number }
  | { type: "first" }
  | { type: "last" }
  | { type: "toggle" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "faster" }
  | { type: "slower" }
  | { type: "setSpeed"; speed: number }
  | { type: "nextMarker" }
  | { type: "prevMarker" }
  | { type: "tick"; wallMs: number };

/** Build the playable timeline: every record except the header. */
export function buildTimeline(replay: LoadedReplay): TimelineEntry[] {
  const records = replay.records.filter((r) => r.kind !== "header");
  const t0 = Date.parse(replay.header?.t ?? replay.records[0]?.t ?? "") || Date.parse(records[0]?.t ?? "") || 0;
  const out: TimelineEntry[] = [];
  let prevOffset = 0;
  let playMs = 0;
  for (const r of records) {
    const parsed = Date.parse(r.t);
    const offsetMs = Math.max(prevOffset, Number.isNaN(parsed) ? prevOffset : parsed - t0);
    if (out.length > 0) playMs += Math.min(offsetMs - prevOffset, MAX_GAP_MS);
    prevOffset = offsetMs;
    const isError = r.kind === "event" && (r.event.type === "error" || (r.event.type === "tool" && r.event.status === "error"));
    const marker = isError || r.kind === "attempt" || r.kind === "end" || (r.kind === "event" && r.event.type === "tool");
    out.push({ record: r, offsetMs, playMs, label: recordLabel(r), marker, isError });
  }
  return out;
}

export function createPlayer(timeline: TimelineEntry[], init: Partial<PlayerState> = {}): PlayerState {
  const index = clampIndex(init.index ?? 0, timeline.length);
  return {
    index,
    playing: init.playing ?? false,
    speed: init.speed ?? SPEEDS[DEFAULT_SPEED_INDEX],
    clockMs: timeline[index]?.playMs ?? 0,
  };
}

function clampIndex(i: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(Math.trunc(i) || 0, 0), length - 1);
}

function nearestSpeedIndex(speed: number): number {
  let best = 0;
  SPEEDS.forEach((s, i) => {
    if (Math.abs(s - speed) < Math.abs(SPEEDS[best] - speed)) best = i;
  });
  return best;
}

function withIndex(state: PlayerState, timeline: TimelineEntry[], index: number): PlayerState {
  const i = clampIndex(index, timeline.length);
  const atEnd = timeline.length === 0 || i === timeline.length - 1;
  return { ...state, index: i, clockMs: timeline[i]?.playMs ?? 0, playing: state.playing && !atEnd };
}

export function playerReduce(state: PlayerState, action: PlayerAction, timeline: TimelineEntry[]): PlayerState {
  const n = timeline.length;
  switch (action.type) {
    case "seek":
      return withIndex(state, timeline, action.index);
    case "step":
      return withIndex(state, timeline, state.index + action.delta);
    case "first":
      return withIndex(state, timeline, 0);
    case "last":
      return withIndex(state, timeline, n - 1);
    case "play":
      if (n === 0) return state;
      // Playing from the end restarts from the beginning.
      return state.index >= n - 1 ? { ...state, index: 0, clockMs: 0, playing: n > 1 } : { ...state, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "toggle":
      return playerReduce(state, { type: state.playing ? "pause" : "play" }, timeline);
    case "faster":
      return { ...state, speed: SPEEDS[Math.min(nearestSpeedIndex(state.speed) + 1, SPEEDS.length - 1)] };
    case "slower":
      return { ...state, speed: SPEEDS[Math.max(nearestSpeedIndex(state.speed) - 1, 0)] };
    case "setSpeed":
      return { ...state, speed: SPEEDS[nearestSpeedIndex(action.speed)] };
    case "nextMarker": {
      for (let i = state.index + 1; i < n; i++) if (timeline[i].marker) return withIndex(state, timeline, i);
      return withIndex(state, timeline, n - 1);
    }
    case "prevMarker": {
      for (let i = state.index - 1; i >= 0; i--) if (timeline[i].marker) return withIndex(state, timeline, i);
      return withIndex(state, timeline, 0);
    }
    case "tick": {
      if (!state.playing || n === 0 || !(action.wallMs > 0)) return state;
      const clockMs = state.clockMs + action.wallMs * state.speed;
      let index = state.index;
      while (index < n - 1 && timeline[index + 1].playMs <= clockMs) index++;
      if (index >= n - 1) return { ...state, index: n - 1, clockMs: timeline[n - 1].playMs, playing: false };
      return { ...state, index, clockMs };
    }
  }
}

// ---------------------------------------------------------------------------
// Pure formatting helpers (bounded rendering)
// ---------------------------------------------------------------------------

export function formatOffset(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function formatSpeed(speed: number): string {
  return `${speed}x`;
}

/** Visible window [start, end) of `total` rows keeping `selected` in view. */
export function windowRange(total: number, selected: number, maxRows: number): { start: number; end: number } {
  const rows = Math.max(1, Math.trunc(maxRows));
  if (total <= rows) return { start: 0, end: Math.max(total, 0) };
  const start = Math.min(Math.max(0, selected - Math.floor(rows / 2)), total - rows);
  return { start, end: start + rows };
}

/** Text progress bar of `width` cells, e.g. "████░░░░". */
export function progressBar(index: number, total: number, width: number): string {
  const w = Math.max(1, width);
  if (total <= 1) return "█".repeat(w);
  const filled = Math.round((index / (total - 1)) * w);
  return "█".repeat(filled) + "░".repeat(w - filled);
}

/** Hard-wrap text to `width` columns; keeps blank lines. */
export function wrapLines(text: string, width: number): string[] {
  const w = Math.max(8, width);
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\t/g, "  ").replace(/\r$/, "");
    if (line.length <= w) out.push(line);
    else for (let i = 0; i < line.length; i += w) out.push(line.slice(i, i + w));
  }
  return out;
}

/**
 * Full (unbounded-length) detail lines for one entry; the view clamps them to
 * the available rows with clampLines.
 */
export function detailLines(entry: TimelineEntry, width: number): string[] {
  const r = entry.record;
  const head = [`#${r.seq} ${r.kind} @ ${formatOffset(entry.offsetMs)}`];
  switch (r.kind) {
    case "prompt":
      return [...head, "", ...wrapLines(r.text, width)];
    case "attempt":
      return [...head, `attempt ${r.n} (${r.reason})`, ...(r.text ? ["", ...wrapLines(r.text, width)] : [])];
    case "diff":
      return [
        ...head,
        `${r.files.length} file(s)${r.truncated ? ", diff truncated" : ""}`,
        ...r.files.map((f) => `  ${f.additions === null ? "bin" : `+${f.additions}/-${f.deletions}`}  ${f.path}`),
      ];
    case "end":
      return [...head, `outcome: ${r.outcome}`, ...(r.detail ? ["", ...wrapLines(r.detail, width)] : [])];
    case "header":
      return [...head, r.execution_id];
    case "event": {
      const e = r.event;
      const lines = [...head, `type: ${e.type}${e.truncated ? " (truncated)" : ""}`];
      if (e.tool) lines.push(`tool: ${e.tool}${e.status ? ` [${e.status}]` : ""}`);
      if (e.reason) lines.push(`reason: ${e.reason}`);
      if (e.tokens) lines.push(`tokens: in ${e.tokens.input} out ${e.tokens.output} cache ${e.tokens.cache_read}/${e.tokens.cache_write}`);
      if (e.cost !== undefined) lines.push(`cost: ${e.cost}`);
      if (e.input) {
        lines.push("", "input:");
        for (const [k, v] of Object.entries(e.input)) lines.push(...wrapLines(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`, width));
      }
      if (e.text) lines.push("", ...wrapLines(e.text, width));
      if (e.output) lines.push("", "output:", ...wrapLines(e.output, width));
      if (e.error) lines.push("", "error:", ...wrapLines(e.error, width));
      return lines;
    }
  }
}

/** Clamp lines to `max`, replacing the tail by a "… N more lines" marker. */
export function clampLines(lines: string[], max: number): string[] {
  const m = Math.max(1, Math.trunc(max));
  if (lines.length <= m) return lines;
  return [...lines.slice(0, m - 1), `… ${lines.length - (m - 1)} more lines`];
}
