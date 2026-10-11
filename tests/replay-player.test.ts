/**
 * replay-player.test.ts — Deterministic playback model and formatting helpers.
 */

import { describe, test, expect } from "bun:test";
import {
  buildTimeline,
  createPlayer,
  playerReduce,
  windowRange,
  progressBar,
  wrapLines,
  clampLines,
  detailLines,
  formatOffset,
  MAX_GAP_MS,
  SPEEDS,
  type PlayerAction,
  type PlayerState,
  type TimelineEntry,
} from "../src/lib/replay-player";
import { parseReplay, type ReplayPayload } from "../src/lib/replay";

function replayOf(items: Array<[number, ReplayPayload]>) {
  const base = Date.parse("2026-03-01T10:00:00.000Z");
  const lines = [
    { v: 1, seq: 0, t: new Date(base).toISOString(), kind: "header", execution_id: "e", task_id: "t", quest_id: null, wave_id: null, agent: null, model: null, started_at: new Date(base).toISOString() },
    ...items.map(([off, p], i) => ({ v: 1, seq: i + 1, t: new Date(base + off).toISOString(), ...p })),
  ];
  return parseReplay(lines.map((l) => JSON.stringify(l)).join("\n"), "/x/e.jsonl", "t", "e");
}

const ev = (type: any, extra: any = {}): ReplayPayload => ({ kind: "event", event: { type, ...extra } });

function sample(): TimelineEntry[] {
  return buildTimeline(
    replayOf([
      [0, { kind: "prompt", text: "p", truncated: false }],
      [100, ev("step_start")],
      [1100, ev("tool", { tool: "bash", status: "completed", input: { command: "ls" }, output: "a" })],
      [1200, ev("text", { text: "hi" })],
      [601_200, ev("tool", { tool: "read", status: "error", error: "ENOENT" })], // 10 min gap
      [601_300, ev("step_finish", { reason: "stop" })],
      [601_400, { kind: "end", outcome: "succeeded" }],
    ]),
  );
}

const run = (s: PlayerState, tl: TimelineEntry[], ...actions: PlayerAction[]) => actions.reduce((st, a) => playerReduce(st, a, tl), s);

describe("buildTimeline", () => {
  test("excludes the header, keeps order and labels", () => {
    const tl = sample();
    expect(tl.map((e) => e.record.kind)).toEqual(["prompt", "event", "event", "event", "event", "event", "end"]);
    expect(tl[2].label).toBe("tool bash ls");
    expect(tl[4].isError).toBe(true);
    expect(tl[4].marker).toBe(true);
    expect(tl[3].marker).toBe(false);
  });

  test("compresses long idle gaps in playback time but keeps real offsets", () => {
    const tl = sample();
    expect(tl[4].offsetMs).toBe(601_200);
    expect(tl[4].playMs - tl[3].playMs).toBe(MAX_GAP_MS);
    expect(tl[1].playMs).toBe(100);
  });

  test("empty and out-of-order timestamps never go backwards", () => {
    expect(buildTimeline(replayOf([]))).toEqual([]);
    const tl = buildTimeline(replayOf([[500, ev("step_start")], [100, ev("text", { text: "x" })]]));
    expect(tl[1].offsetMs).toBeGreaterThanOrEqual(tl[0].offsetMs);
  });
});

describe("playerReduce", () => {
  test("seek/step clamp to bounds", () => {
    const tl = sample();
    let s = createPlayer(tl);
    s = run(s, tl, { type: "step", delta: -5 });
    expect(s.index).toBe(0);
    s = run(s, tl, { type: "seek", index: 99 });
    expect(s.index).toBe(tl.length - 1);
    s = run(s, tl, { type: "first" });
    expect(s.index).toBe(0);
    expect(s.clockMs).toBe(0);
    s = run(s, tl, { type: "step", delta: 3 });
    expect(s.index).toBe(3);
    expect(s.clockMs).toBe(tl[3].playMs);
  });

  test("speed steps through 0.5x..8x and clamps", () => {
    const tl = sample();
    let s = createPlayer(tl);
    expect(s.speed).toBe(1);
    const seen: number[] = [];
    for (let i = 0; i < 6; i++) {
      s = run(s, tl, { type: "faster" });
      seen.push(s.speed);
    }
    expect(seen).toEqual([2, 4, 8, 8, 8, 8]);
    for (let i = 0; i < 6; i++) s = run(s, tl, { type: "slower" });
    expect(s.speed).toBe(SPEEDS[0]);
    expect(run(s, tl, { type: "setSpeed", speed: 3.9 }).speed).toBe(4);
  });

  test("tick advances by wall time scaled by speed and pauses at the end", () => {
    const tl = sample();
    let s = run(createPlayer(tl), tl, { type: "play" });
    s = run(s, tl, { type: "tick", wallMs: 1000 });
    const expected = tl.filter((e) => e.playMs <= 1000).length - 1;
    expect(s.index).toBe(expected);
    const fast = run(createPlayer(tl, { speed: 8 }), tl, { type: "play" }, { type: "tick", wallMs: 1000 });
    expect(fast.index).toBeGreaterThanOrEqual(s.index);
    const done = run(s, tl, { type: "tick", wallMs: 100_000 });
    expect(done.index).toBe(tl.length - 1);
    expect(done.playing).toBe(false);
  });

  test("tick is a no-op while paused or with non-positive time", () => {
    const tl = sample();
    const s = createPlayer(tl);
    expect(run(s, tl, { type: "tick", wallMs: 5000 })).toBe(s);
    const p = run(s, tl, { type: "play" });
    expect(run(p, tl, { type: "tick", wallMs: 0 })).toBe(p);
    expect(run(p, tl, { type: "tick", wallMs: -5 })).toBe(p);
  });

  test("tick after a manual seek continues from the sought position", () => {
    const tl = sample();
    let s = run(createPlayer(tl), tl, { type: "play" }, { type: "seek", index: 3 });
    expect(s.playing).toBe(true);
    s = run(s, tl, { type: "tick", wallMs: MAX_GAP_MS });
    expect(s.index).toBe(4); // gap compression: next entry is MAX_GAP_MS away
  });

  test("play from the end restarts; seeking to the end pauses", () => {
    const tl = sample();
    let s = run(createPlayer(tl), tl, { type: "play" }, { type: "last" });
    expect(s.playing).toBe(false);
    s = run(s, tl, { type: "toggle" });
    expect(s.playing).toBe(true);
    expect(s.index).toBe(0);
    s = run(s, tl, { type: "toggle" });
    expect(s.playing).toBe(false);
  });

  test("next/previous marker jump over plain events", () => {
    const tl = sample();
    let s = createPlayer(tl);
    s = run(s, tl, { type: "nextMarker" });
    expect(tl[s.index].label).toBe("tool bash ls");
    s = run(s, tl, { type: "nextMarker" });
    expect(tl[s.index].isError).toBe(true);
    s = run(s, tl, { type: "prevMarker" });
    expect(tl[s.index].label).toBe("tool bash ls");
    s = run(s, tl, { type: "prevMarker" }, { type: "prevMarker" });
    expect(s.index).toBe(0);
    s = run(s, tl, { type: "last" }, { type: "nextMarker" });
    expect(s.index).toBe(tl.length - 1);
  });

  test("empty timeline is safe", () => {
    const s = createPlayer([]);
    for (const a of [{ type: "play" }, { type: "step", delta: 1 }, { type: "tick", wallMs: 10 }, { type: "last" }, { type: "nextMarker" }] as PlayerAction[]) {
      expect(playerReduce(s, a, [])).toMatchObject({ index: 0, playing: false });
    }
  });
});

describe("formatting helpers", () => {
  test("windowRange keeps the selection visible and bounded", () => {
    expect(windowRange(5, 2, 10)).toEqual({ start: 0, end: 5 });
    expect(windowRange(100, 0, 10)).toEqual({ start: 0, end: 10 });
    expect(windowRange(100, 99, 10)).toEqual({ start: 90, end: 100 });
    const w = windowRange(100, 50, 7);
    expect(w.end - w.start).toBe(7);
    expect(w.start <= 50 && 50 < w.end).toBe(true);
    expect(windowRange(0, 0, 5)).toEqual({ start: 0, end: 0 });
    expect(windowRange(10, 3, 0)).toEqual({ start: 3, end: 4 });
  });

  test("progressBar", () => {
    expect(progressBar(0, 5, 8)).toBe("░".repeat(8));
    expect(progressBar(4, 5, 8)).toBe("█".repeat(8));
    expect(progressBar(2, 5, 8)).toBe("████░░░░");
    expect(progressBar(0, 1, 4)).toBe("████");
  });

  test("wrapLines and clampLines bound output", () => {
    expect(wrapLines("a".repeat(25), 10)).toEqual(["a".repeat(10), "a".repeat(10), "a".repeat(5)]);
    expect(wrapLines("x\n\ny", 10)).toEqual(["x", "", "y"]);
    expect(clampLines(["1", "2", "3", "4", "5"], 3)).toEqual(["1", "2", "… 3 more lines"]);
    expect(clampLines(["1", "2"], 3)).toEqual(["1", "2"]);
  });

  test("formatOffset", () => {
    expect(formatOffset(0)).toBe("0:00.0");
    expect(formatOffset(65_300)).toBe("1:05.3");
  });

  test("detailLines show tool input, output and errors", () => {
    const tl = sample();
    const tool = detailLines(tl[2], 60).join("\n");
    expect(tool).toContain("tool: bash [completed]");
    expect(tool).toContain("command: ls");
    expect(tool).toContain("output:");
    const err = detailLines(tl[4], 60).join("\n");
    expect(err).toContain("error:");
    expect(err).toContain("ENOENT");
    expect(detailLines(tl[0], 60).join("\n")).toContain("p");
    expect(detailLines(tl[6], 60).join("\n")).toContain("outcome: succeeded");
  });
});
