/**
 * replay-viewer.test.tsx — ReplayViewer: timeline scrubbing, playback and
 * speed control, detail and diff panes, bounded rendering and timer hygiene.
 * Uses the PassThrough stdin/stdout pattern (no ink-testing-library).
 */

import { describe, test, expect, afterEach } from "bun:test";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { stripAnsi } from "./ansi";
import { ReplayViewer, ReplayViewerView } from "../../src/ink/replay-viewer";
import { parseReplay, type ReplayPayload } from "../../src/lib/replay";
import { buildTimeline, createPlayer } from "../../src/lib/replay-player";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await wait(10);
  }
}

const BASE = Date.parse("2026-03-01T10:00:00.000Z");

function makeReplay(items: Array<[number, ReplayPayload]>, taskId = "feat-a") {
  const lines = [
    { v: 1, seq: 0, t: new Date(BASE).toISOString(), kind: "header", execution_id: "e1", task_id: taskId, quest_id: null, wave_id: null, agent: "fake-agent", model: null, started_at: new Date(BASE).toISOString() },
    ...items.map(([off, p], i) => ({ v: 1, seq: i + 1, t: new Date(BASE + off).toISOString(), ...p })),
  ];
  return parseReplay(lines.map((l) => JSON.stringify(l)).join("\n"), "/x/e1.jsonl", taskId, "e1");
}

const tool = (name: string, command: string, extra: any = {}): ReplayPayload => ({
  kind: "event",
  event: { type: "tool", tool: name, status: "completed", input: { command }, output: `out of ${command}`, ...extra },
});
const text = (t: string): ReplayPayload => ({ kind: "event", event: { type: "text", text: t } });

function smallReplay() {
  return makeReplay([
    [0, { kind: "prompt", text: "Implement the thing", truncated: false }],
    [10, { kind: "attempt", n: 1, reason: "start" }],
    [20, { kind: "event", event: { type: "step_start" } }],
    [30, tool("bash", "ls -la")],
    [40, text("looking good")],
    [50, tool("read", "src/a.ts", { status: "error", error: "ENOENT: no such file" })],
    [60, { kind: "event", event: { type: "step_finish", reason: "stop" } }],
    [70, { kind: "diff", diff: "diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old line\n+new line\n", truncated: false, files: [{ path: "x", additions: 1, deletions: 1 }], baseline: "abc" }],
    [80, { kind: "end", outcome: "succeeded", detail: "verified" }],
  ]);
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface Harness {
  frames: string[];
  last(): string;
  press(data: string): Promise<void>;
  rerender(el: React.ReactElement): void;
  unmount(): Promise<void>;
}

let live: Harness[] = [];
afterEach(async () => {
  for (const h of live.splice(0)) await h.unmount().catch(() => {});
});

function mount(el: React.ReactElement): Harness {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 120;
  (stdout as any).rows = 50;
  const stdin = new PassThrough();
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  const frames: string[] = [];
  (stdout as any as PassThrough).on("data", (c: Buffer) => frames.push(stripAnsi(c.toString())));
  const instance = render(el, { stdout, stdin: stdin as unknown as NodeJS.ReadStream, debug: true, exitOnCtrlC: false, patchConsole: false });
  let unmounted = false;
  const h: Harness = {
    frames,
    last: () => frames[frames.length - 1] ?? "",
    press: async (d) => {
      stdin.write(d);
      await wait(60);
    },
    rerender: (e) => instance.rerender(e),
    unmount: async () => {
      if (unmounted) return;
      unmounted = true;
      instance.unmount();
      await instance.waitUntilExit();
    },
  };
  live.push(h);
  return h;
}

const noop = () => {};

function viewer(props: Partial<React.ComponentProps<typeof ReplayViewer>> = {}) {
  return <ReplayViewer replay={smallReplay()} rows={40} columns={110} onClose={noop} {...props} />;
}

// ---------------------------------------------------------------------------
// View rendering
// ---------------------------------------------------------------------------

describe("ReplayViewerView", () => {
  test("renders status, timeline and detail of the selected entry", async () => {
    const replay = smallReplay();
    const timeline = buildTimeline(replay);
    const h = mount(<ReplayViewerView replay={replay} timeline={timeline} player={createPlayer(timeline, { index: 3 })} showDiff={false} diffScroll={0} rows={40} columns={110} executionLabel="1/2" />);
    await wait(30);
    const out = h.last();
    expect(out).toContain("Replay  feat-a  exec 1/2  succeeded");
    expect(out).toContain("paused");
    expect(out).toContain("4/");
    expect(out).toContain("1x");
    expect(out).toContain("tool bash ls -la");
    expect(out).toContain("tool: bash [completed]");
    expect(out).toContain("out of ls -la");
  });

  test("empty states", async () => {
    const h = mount(<ReplayViewerView replay={null} timeline={[]} player={createPlayer([])} showDiff={false} diffScroll={0} rows={30} columns={100} />);
    await wait(30);
    expect(h.last()).toContain("No replay recorded for this task.");
  });

  test("rendering is bounded on huge replays and tiny terminals", async () => {
    const items: Array<[number, ReplayPayload]> = [];
    for (let i = 0; i < 5000; i++) items.push([i * 10, tool("bash", `cmd-${i}`)]);
    const replay = makeReplay(items);
    const timeline = buildTimeline(replay);
    const big = mount(<ReplayViewerView replay={replay} timeline={timeline} player={createPlayer(timeline, { index: 2500 })} showDiff={false} diffScroll={0} rows={30} columns={100} />);
    await wait(30);
    const frame = big.last();
    expect(frame.split("\n").length).toBeLessThanOrEqual(30);
    expect(frame).toContain("2501/5000");
    expect(frame).toContain("cmd-2500");
    expect(frame).not.toContain("cmd-10 ");
    expect(frame).not.toContain("cmd-4000");

    const tiny = mount(<ReplayViewerView replay={replay} timeline={timeline} player={createPlayer(timeline, { index: 40 })} showDiff={false} diffScroll={0} rows={14} columns={40} />);
    await wait(30);
    const tf = tiny.last();
    expect(tf.split("\n").length).toBeLessThanOrEqual(14);
    for (const line of tf.split("\n")) expect(line.length).toBeLessThanOrEqual(40);
    expect(tf).toContain("cmd-40");
  });
});

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

describe("ReplayViewer keys", () => {
  test("arrows and jumps scrub the timeline", async () => {
    const h = mount(viewer());
    await wait(40);
    expect(h.last()).toContain("1/9");
    await h.press("\x1b[C"); // right
    expect(h.last()).toContain("2/9");
    await h.press("j");
    expect(h.last()).toContain("3/9");
    await h.press("\x1b[D"); // left
    expect(h.last()).toContain("2/9");
    await h.press("G");
    expect(h.last()).toContain("9/9");
    expect(h.last()).toContain("outcome: succeeded");
    await h.press("g");
    expect(h.last()).toContain("1/9");
    await h.press("\x1b[6~"); // PgDn clamps
    expect(h.last()).toContain("9/9");
    await h.press("\x1b[5~"); // PgUp
    expect(h.last()).toContain("1/9");
  });

  test("n / N jump between tool calls and errors", async () => {
    const h = mount(viewer());
    await wait(40);
    await h.press("n"); // attempt marker
    expect(h.last()).toContain("attempt 1 started");
    await h.press("n");
    expect(h.last()).toContain("tool: bash [completed]");
    await h.press("n");
    expect(h.last()).toContain("ENOENT: no such file");
    await h.press("N");
    expect(h.last()).toContain("tool: bash [completed]");
  });

  test("space toggles play/pause and +/- change the speed (0.5x to 8x)", async () => {
    const h = mount(viewer({ tickMs: 1000 }));
    await wait(40);
    await h.press(" ");
    expect(h.last()).toContain("playing");
    await h.press(" ");
    expect(h.last()).toContain("paused");
    for (const expected of ["2x", "4x", "8x", "8x"]) {
      await h.press("+");
      expect(h.last()).toContain(expected);
    }
    for (let i = 0; i < 6; i++) await h.press("-");
    expect(h.last()).toContain("0.5x");
  });

  test("d shows a scrollable, colored diff pane and d returns", async () => {
    const h = mount(viewer());
    await wait(40);
    await h.press("d");
    expect(h.last()).toContain("Diff: 1 file(s)");
    expect(h.last()).toContain("+new line");
    expect(h.last()).toContain("-old line");
    expect(h.last()).not.toContain("tool bash ls -la");
    await h.press("j");
    expect(h.last()).toContain("lines 1-");
    await h.press("d");
    expect(h.last()).toContain("tool bash ls -la");
  });

  test("diff pane without a captured diff says so", async () => {
    const r = makeReplay([[0, text("hi")]]);
    const h = mount(viewer({ replay: r }));
    await wait(40);
    await h.press("d");
    expect(h.last()).toContain("No diff was captured");
  });

  test("Esc/q close; [ and ] request neighbouring executions", async () => {
    let closed = 0, prev = 0, next = 0;
    const h = mount(viewer({ onClose: () => closed++, onPrevExecution: () => prev++, onNextExecution: () => next++ }));
    await wait(40);
    await h.press("[");
    await h.press("]");
    await h.press("]");
    expect([prev, next]).toEqual([1, 2]);
    await h.press("q");
    await h.press("\x1b");
    await waitFor(() => closed >= 2);
    expect(closed).toBe(2);
  });

  test("switching to another replay resets to the start", async () => {
    const h = mount(viewer());
    await wait(40);
    await h.press("G");
    expect(h.last()).toContain("9/9");
    h.rerender(viewer({ replay: makeReplay([[0, text("other")], [10, text("second")]], "feat-b") }));
    await waitFor(() => h.last().includes("feat-b") && h.last().includes("1/2"));
    expect(h.last()).toContain("1/2");
  });
});

// ---------------------------------------------------------------------------
// Playback & timer hygiene
// ---------------------------------------------------------------------------

describe("playback and timers", () => {
  function trackIntervals() {
    const realSet = globalThis.setInterval;
    const realClear = globalThis.clearInterval;
    const active = new Set<unknown>();
    (globalThis as any).setInterval = (fn: any, ms?: number, ...rest: any[]) => {
      const id = realSet(fn, ms, ...rest);
      active.add(id);
      return id;
    };
    (globalThis as any).clearInterval = (id: any) => {
      active.delete(id);
      return realClear(id);
    };
    return { active, restore: () => { globalThis.setInterval = realSet; globalThis.clearInterval = realClear; } };
  }

  test("playing advances to the end at speed and then pauses by itself", async () => {
    const items: Array<[number, ReplayPayload]> = [];
    for (let i = 0; i < 6; i++) items.push([i * 300, text(`t${i}`)]);
    const h = mount(viewer({ replay: makeReplay(items), tickMs: 10 }));
    await wait(40);
    await h.press("+");
    await h.press("+");
    await h.press("+"); // 8x
    await h.press(" ");
    await waitFor(() => h.last().includes("6/6"));
    await waitFor(() => h.last().includes("paused"));
  });

  test("the playback interval exists only while playing and is cleared on pause and unmount", async () => {
    const t = trackIntervals();
    try {
      const slow = makeReplay([0, 1, 2, 3, 4, 5].map((i) => [i * 5000, text(`slow${i}`)] as [number, ReplayPayload]));
      const h = mount(viewer({ replay: slow, tickMs: 20 }));
      await wait(40);
      const baseline = t.active.size; // other intervals (e.g. none from the viewer)
      await h.press(" ");
      expect(t.active.size).toBe(baseline + 1);
      await h.press(" ");
      expect(t.active.size).toBe(baseline);
      await h.press(" ");
      expect(t.active.size).toBe(baseline + 1);
      await h.unmount();
      expect(t.active.size).toBe(baseline);
    } finally {
      t.restore();
    }
  });

  test("reaching the end releases the interval", async () => {
    const t = trackIntervals();
    try {
      const items: Array<[number, ReplayPayload]> = [[0, text("a")], [50, text("b")]];
      const h = mount(viewer({ replay: makeReplay(items), tickMs: 10 }));
      await wait(40);
      const baseline = t.active.size;
      await h.press("+");
      await h.press(" ");
      await waitFor(() => h.last().includes("paused") && h.last().includes("2/2"));
      expect(t.active.size).toBe(baseline);
    } finally {
      t.restore();
    }
  });
});
