/**
 * analytics-browser.test.tsx — AnalyticsOverlayView wired into the task
 * browser adapter (TaskBrowserScreen): access via `u`, load-on-open, bounded
 * refresh only while visible, grouping, quest scoping, input isolation,
 * close, and timer cleanup. No daemon is connected in any test.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, Box } from "ink";
import { PassThrough } from "node:stream";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stripAnsi } from "./ansi";
import { TaskBrowserScreen, analyticsScopeFilter, ANALYTICS_REFRESH_MS } from "../../src/ink/run-task-browser";
import { AnalyticsStore, createAnalyticsRecord, type AgentAnalyticsRecord, type AnalyticsLoadResult } from "../../src/lib/analytics";
import { loadConfig } from "../../src/config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let root: string;
// useTerminalSize reads the real process.stdout (non-TTY under test => 24x80),
// which would clip the overlay; give the process a roomy terminal for these tests.
const realRows = process.stdout.rows;
const realColumns = process.stdout.columns;

beforeEach(() => {
  (process.stdout as any).rows = 60;
  (process.stdout as any).columns = 120;
  root = mkdtempSync(join(tmpdir(), "analytics-browser-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
});
afterEach(() => {
  (process.stdout as any).rows = realRows;
  (process.stdout as any).columns = realColumns;
  rmSync(root, { recursive: true, force: true });
});

function rec(id: string, over: Partial<AgentAnalyticsRecord> = {}): AgentAnalyticsRecord {
  return createAnalyticsRecord({
    execution_id: id,
    wave_id: "w1",
    task_id: `task-${id}`,
    first_started_at: "2026-03-01T10:00:00.000Z",
    ...over,
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll until `cond` holds (robust under a loaded full-suite run). */
async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await wait(10);
  }
}

interface Harness {
  stdin: PassThrough;
  frames: string[];
  last(): string;
  exits: number;
  press(data: string): Promise<void>;
  unmount(): Promise<void>;
}

function mount(props: Record<string, unknown> = {}): Harness {
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

  const h: Harness = {
    stdin,
    frames,
    last: () => frames[frames.length - 1] ?? "",
    exits: 0,
    press: async (data: string) => {
      stdin.write(data);
      await wait(70);
    },
    unmount: async () => {},
  };

  const instance = render(
    <Box flexDirection="column" width={120} height={60}>
    <TaskBrowserScreen
      projectRoot={root}
      config={loadConfig(root)}
      onExit={() => {
        h.exits++;
      }}
      {...(props as any)}
    />
    </Box>,
    { stdout, stdin: stdin as unknown as NodeJS.ReadStream, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  h.unmount = async () => {
    instance.unmount();
    await instance.waitUntilExit();
  };
  return h;
}

/** Loader that counts calls and returns the current value of `data`. */
function countingLoader(initial: AnalyticsLoadResult) {
  const state = { calls: 0, data: initial };
  return { state, load: () => { state.calls++; return state.data; } };
}

const result = (records: AgentAnalyticsRecord[]): AnalyticsLoadResult => ({ records, diagnostics: [] });

// ---------------------------------------------------------------------------
// Pure scope mapping
// ---------------------------------------------------------------------------

describe("analyticsScopeFilter", () => {
  test("undefined/null = all, empty string = unquested, id = that quest", () => {
    expect(analyticsScopeFilter(undefined)).toEqual({});
    expect(analyticsScopeFilter(null)).toEqual({});
    expect(analyticsScopeFilter("")).toEqual({ unquested: true });
    expect(analyticsScopeFilter("q1")).toEqual({ quest: "q1" });
  });
  test("refresh interval is bounded", () => {
    expect(ANALYTICS_REFRESH_MS).toBeGreaterThanOrEqual(1000);
  });
});

// ---------------------------------------------------------------------------
// Access, loading, refresh
// ---------------------------------------------------------------------------

describe("task browser analytics overlay", () => {
  test("u opens the overlay with persisted analytics (no daemon, default loader)", async () => {
    const store = new AnalyticsStore(root);
    store.upsert(rec("a", { outcome: "succeeded", duration_ms: 60_000, quest_id: "q1" }));
    const h = mount();
    await wait(80);
    expect(h.last()).not.toContain("Agent Analytics");
    await h.press("u");
    expect(h.last()).toContain("Agent Analytics");
    expect(h.last()).toContain("1 execution");
    expect(h.last()).toContain("task-a");
    await h.unmount();
  });

  test("nothing is loaded until opened, and rendering does not reload", async () => {
    const loader = countingLoader(result([rec("a")]));
    const h = mount({ analyticsLoader: loader.load, analyticsRefreshMs: 100_000 });
    await wait(80);
    expect(loader.state.calls).toBe(0);
    await h.press("u");
    expect(loader.state.calls).toBe(1);
    // overlay-internal state changes re-render without touching the loader
    await h.press("j");
    await h.press("\t");
    await h.press("\t");
    expect(loader.state.calls).toBe(1);
    await h.unmount();
  });

  test("refreshes on an interval only while visible and picks up new data", async () => {
    const loader = countingLoader(result([rec("a")]));
    const h = mount({ analyticsLoader: loader.load, analyticsRefreshMs: 30 });
    await h.press("u");
    expect(h.last()).toContain("1 execution");

    loader.state.data = result([rec("a"), rec("b")]);
    await waitFor(() => loader.state.calls > 2 && h.last().includes("2 executions"));

    // close: refresh stops
    await h.press("\x1b");
    expect(h.last()).not.toContain("Agent Analytics");
    const callsAtClose = loader.state.calls;
    await wait(200);
    expect(loader.state.calls).toBe(callsAtClose);

    // reopen: loads again and refresh resumes
    await h.press("u");
    expect(loader.state.calls).toBeGreaterThanOrEqual(callsAtClose + 1);
    const afterOpen = loader.state.calls;
    await waitFor(() => loader.state.calls > afterOpen);
    await h.unmount();
  });

  test("unmounting clears the refresh timer", async () => {
    const loader = countingLoader(result([rec("a")]));
    const h = mount({ analyticsLoader: loader.load, analyticsRefreshMs: 30 });
    await h.press("u");
    await wait(80);
    await h.unmount();
    const calls = loader.state.calls;
    await wait(150);
    expect(loader.state.calls).toBe(calls);
  });

  test("a throwing loader surfaces a storage issue instead of crashing", async () => {
    const h = mount({
      analyticsLoader: () => {
        throw new Error("disk exploded");
      },
    });
    await h.press("u");
    expect(h.last()).toContain("Agent Analytics");
    expect(h.last()).toContain("Storage issues");
    expect(h.last()).toContain("disk exploded");
    await h.unmount();
  });

  test("storage diagnostics are shown while valid records still render", async () => {
    const h = mount({
      analyticsLoader: () => ({
        records: [rec("a")],
        diagnostics: [{ file: "bad.json", kind: "malformed" as const, message: "Unexpected token" }],
      }),
    });
    await h.press("u");
    expect(h.last()).toContain("1 execution");
    expect(h.last()).toContain("bad.json: malformed");
    await h.unmount();
  });
});

// ---------------------------------------------------------------------------
// Grouping, selection, scoping
// ---------------------------------------------------------------------------

describe("grouping and selection", () => {
  test("Tab cycles grouping task -> quest -> wave", async () => {
    const loader = countingLoader(result([rec("a", { quest_id: "q1", wave_id: "wave-x" })]));
    const h = mount({ analyticsLoader: loader.load, analyticsRefreshMs: 100_000 });
    await h.press("u");
    expect(h.last()).toContain("By Task:");
    await h.press("\t");
    expect(h.last()).toContain("By Quest:");
    expect(h.last()).toContain("q1");
    await h.press("\t");
    expect(h.last()).toContain("By Wave:");
    expect(h.last()).toContain("wave-x");
    await h.unmount();
  });

  test("selection moves with j and is clamped after a refresh shrinks the list", async () => {
    const loader = countingLoader(result([rec("a"), rec("b"), rec("c")]));
    const h = mount({ analyticsLoader: loader.load, analyticsRefreshMs: 40 });
    await h.press("u");
    await h.press("j");
    await h.press("j");
    expect(h.last()).toMatch(/▸ task-c/);

    loader.state.data = result([rec("a")]);
    await waitFor(() => /▸ task-a/.test(h.last()));
    expect(h.last()).toMatch(/▸ task-a/);
    expect(h.last()).not.toContain("task-c");
    await h.unmount();
  });

  test("scope: no questId shows every execution", async () => {
    const records = [rec("a", { quest_id: "q1" }), rec("b", { quest_id: null }), rec("c", { quest_id: "q2" })];
    const h = mount({ analyticsLoader: () => result(records) });
    await h.press("u");
    expect(h.last()).toContain("3 executions");
    await h.unmount();
  });

  test("scope: empty questId shows only unquested errands", async () => {
    const records = [rec("a", { quest_id: "q1" }), rec("b", { quest_id: null }), rec("c", { quest_id: null })];
    const h = mount({ questId: "", analyticsLoader: () => result(records) });
    await h.press("u");
    expect(h.last()).toContain("2 executions");
    expect(h.last()).not.toContain("task-a");
    await h.unmount();
  });

  test("scope: questId uses recorded attribution, not currently active quest task IDs", async () => {
    const records = [
      rec("old", { quest_id: "q1" }), // task archived/removed: not among questTaskIds
      rec("cur", { quest_id: "q1" }),
      rec("other", { quest_id: "q2" }),
    ];
    const h = mount({ questId: "q1", questTaskIds: ["cur"], analyticsLoader: () => result(records) });
    await h.press("u");
    expect(h.last()).toContain("2 executions");
    expect(h.last()).toContain("task-old");
    expect(h.last()).not.toContain("task-other");
    await h.unmount();
  });
});

// ---------------------------------------------------------------------------
// Input isolation
// ---------------------------------------------------------------------------

describe("input isolation", () => {
  test("underlying browser input is disabled while open and restored on close", async () => {
    const loader = countingLoader(result([rec("a")]));
    const h = mount({ analyticsLoader: loader.load, analyticsRefreshMs: 100_000 });
    await h.press("u");

    // q would quit the browser if it were still receiving input
    await h.press("q");
    expect(h.exits).toBe(0);
    expect(h.last()).toContain("Agent Analytics");

    // close with U, then the browser handles input again
    await h.press("U");
    expect(h.last()).not.toContain("Agent Analytics");
    await h.press("q");
    expect(h.exits).toBe(1);
    await h.unmount();
  });

  test("u inside the overlay closes it (does not reopen)", async () => {
    const loader = countingLoader(result([rec("a")]));
    const h = mount({ analyticsLoader: loader.load, analyticsRefreshMs: 100_000 });
    await h.press("u");
    await h.press("u");
    expect(h.last()).not.toContain("Agent Analytics");
    expect(loader.state.calls).toBe(1);
    await h.unmount();
  });
});
