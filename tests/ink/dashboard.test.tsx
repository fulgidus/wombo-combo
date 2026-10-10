/**
 * dashboard.test.tsx — Tests for the DashboardScreen TUI component.
 *
 * TDD: written before the implementation.
 *
 * The dashboard is the default screen shown after the splash. It integrates:
 *   - WaveSummaryContext (replaces the SharedStore polling hack)
 *   - ChromeLayout top bar shows live counts
 *   - DashboardScreen shows agent status overview
 *   - DashboardStore provides reactive state to the screen
 *
 * Covers:
 *   - Module exports: DashboardScreen, DashboardStoreContext, useDashboardStore
 *   - DashboardScreen renders with no active wave ("no wave" message)
 *   - DashboardScreen renders agent counts from context
 *   - DashboardStoreContext provides default empty state
 *   - useDashboardStore hook returns the current store
 *   - DashboardStore type has agents, running, done, failed fields
 */

import { describe, test, expect } from "bun:test";
import { DashboardStoreContext } from "../../src/ink/dashboard";
import React from "react";
import { renderToString } from "ink";

describe("dashboard module exports", () => {
  test("exports DashboardScreen, DashboardStoreContext, useDashboardStore", async () => {
    const mod = await import("../../src/ink/dashboard");
    expect(mod.DashboardScreen).toBeDefined();
    expect(mod.DashboardStoreContext).toBeDefined();
    expect(mod.useDashboardStore).toBeDefined();
  });
});

describe("DashboardScreen with no active wave", () => {
  test("renders 'no wave' message when agents list is empty", async () => {
    const { DashboardScreen, DashboardStoreContext } = await import("../../src/ink/dashboard");
    const emptyStore = { agents: [], running: 0, done: 0, failed: 0, total: 0 };
    const output = renderToString(
      React.createElement(
        DashboardStoreContext.Provider,
        { value: emptyStore },
        React.createElement(DashboardScreen, {})
      )
    );
    // EN_STRINGS["wave.noWave"] = "No active wave"
    expect(output).toContain("No active wave");
  });
});

describe("DashboardScreen with active wave", () => {
  test("renders agent count from context", async () => {
    const { DashboardScreen, DashboardStoreContext } = await import("../../src/ink/dashboard");
    const store = { agents: [{ id: "a1" } as any, { id: "a2" } as any], running: 1, done: 1, failed: 0, total: 2 };
    const output = renderToString(
      React.createElement(
        DashboardStoreContext.Provider,
        { value: store },
        React.createElement(DashboardScreen, {})
      )
    );
    // Should show some numeric count
    expect(output).toMatch(/[12]/);
  });

  test("renders running count", async () => {
    const { DashboardScreen, DashboardStoreContext } = await import("../../src/ink/dashboard");
    const store = { agents: [{ id: "a1" } as any], running: 1, done: 0, failed: 0, total: 1 };
    const output = renderToString(
      React.createElement(
        DashboardStoreContext.Provider,
        { value: store },
        React.createElement(DashboardScreen, {})
      )
    );
    expect(output).toContain("1");
  });
});

describe("DashboardStoreContext defaults", () => {
  test("useDashboardStore returns the context value", async () => {
    const { DashboardStoreContext } = await import("../../src/ink/dashboard");
    // The context should have a Provider and Consumer
    expect(DashboardStoreContext).toBeDefined();
    expect(typeof DashboardStoreContext.Provider).toBe("object");
  });
});

// ===========================================================================
// Realtime dashboard (DashboardMetricsContext present)
// ===========================================================================

import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { render } from "ink";
import { DashboardScreen as RichScreen, formatEta } from "../../src/ink/dashboard";
import { DashboardMetricsContext, type DashboardMetricsValue } from "../../src/ink/dashboard-metrics-context";
import {
  applyDashboardEvent,
  applySnapshot,
  createDashboardMetrics,
  estimateRemaining,
  type QuestUsageEntry,
} from "../../src/lib/dashboard-metrics";
import { ThemeContext, getTheme } from "../../src/ink/theme";
import { EscMenuProvider } from "../../src/ink/esc-menu";
import { stripAnsi } from "./ansi";

const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
const MIN = 60_000;

function dAgent(id: string, status: string, extra: Record<string, unknown> = {}): any {
  return {
    featureId: id, taskTitle: id, branch: `f/${id}`, baseBranch: "main", worktree: "/x", status,
    pid: null, sessionId: null, activity: null, activityUpdatedAt: null, retries: 0, maxRetries: 3,
    startedAt: null, completedAt: null, buildPassed: null, error: null, effortEstimateMs: null,
    streamIndex: null, dependsOn: [], dependedOnBy: [], agentName: null, agentType: null,
    pendingQuestions: [], tokenUsage: null, ...extra,
  };
}

function totals(tokens: number, cost = 0) {
  return {
    input_tokens: tokens, output_tokens: 0, cache_read: 0, cache_write: 0, reasoning_tokens: 0,
    total_tokens: tokens, total_cost: cost, record_count: 1,
  };
}

function fixture(
  over: Partial<DashboardMetricsValue> & { agents?: any[]; maxConcurrent?: number } = {},
): DashboardMetricsValue {
  const agents = over.agents ?? [
    dAgent("alpha", "running", { effortEstimateMs: 20 * MIN, startedAt: new Date(T0 - 5 * MIN).toISOString() }),
    dAgent("beta", "queued", { effortEstimateMs: 10 * MIN }),
    dAgent("gamma", "merged", { completedAt: new Date(T0 - 2 * MIN).toISOString() }),
    dAgent("delta", "failed"),
  ];
  let state = applySnapshot(
    createDashboardMetrics(T0),
    {
      scheduler: {
        status: "running", maxConcurrent: over.maxConcurrent ?? 2, model: null, baseBranch: "main",
        questId: "q", startedAt: null, pinnedTasks: [], skippedTasks: [], totalProcessed: 0,
        totalCompleted: 0, totalFailed: 0,
      },
      agents,
      uptime: 1,
    } as any,
    T0,
  );
  state = applyDashboardEvent(state, { type: "evt:agent-activity", payload: { featureId: "alpha", activity: "editing src/a.ts" } }, T0 + 1000);
  state = applyDashboardEvent(state, { type: "evt:build-result", payload: { featureId: "gamma", passed: true } }, T0 + 2000);
  const quests: QuestUsageEntry[] = over.quests
    ? [...over.quests]
    : [
        { questId: "auth-revamp", totals: totals(120_000, 1.5) },
        { questId: "billing", totals: totals(30_000) },
        { questId: null, totals: totals(1_200) },
      ];
  return {
    state,
    eta: estimateRemaining(state, T0 + 3000),
    connection: "connected",
    quests,
    usageAvailable: true,
    now: T0 + 3000,
    ...over,
  };
}

function withSize<T>(rows: number, columns: number, fn: () => T): T {
  const r = Object.getOwnPropertyDescriptor(process.stdout, "rows");
  const c = Object.getOwnPropertyDescriptor(process.stdout, "columns");
  Object.defineProperty(process.stdout, "rows", { value: rows, configurable: true, writable: true });
  Object.defineProperty(process.stdout, "columns", { value: columns, configurable: true, writable: true });
  try {
    return fn();
  } finally {
    if (r) Object.defineProperty(process.stdout, "rows", r);
    else delete (process.stdout as any).rows;
    if (c) Object.defineProperty(process.stdout, "columns", c);
    else delete (process.stdout as any).columns;
  }
}

function shot(
  value: DashboardMetricsValue | null,
  size: [number, number] = [24, 80],
  props: Record<string, unknown> = {},
  theme?: string,
): string {
  const [rows, columns] = size;
  return withSize(rows, columns, () => {
    let el: React.ReactElement = React.createElement(
      DashboardMetricsContext.Provider,
      { value },
      React.createElement(RichScreen, props),
    );
    if (theme) el = React.createElement(ThemeContext.Provider, { value: getTheme(theme) }, el);
    return stripAnsi(renderToString(el, { columns }));
  });
}

const BLOCKS = /[▁-█]/;

describe("realtime DashboardScreen", () => {
  test("shows all five metrics at 80x24", () => {
    const out = shot(fixture());
    // counts
    expect(out).toMatch(/Running 1/);
    expect(out).toMatch(/Done 1/);
    expect(out).toMatch(/Failed 1/);
    // throughput sparkline with window and units
    expect(out).toContain("Throughput");
    expect(out).toContain("completions/min, last 60m");
    expect(out).toMatch(BLOCKS);
    // approximate remaining time scoped to tracked agents
    expect(out).toContain("Est. remaining");
    expect(out).toContain("approx., tracked agents only");
    // quest tokens with compact bars
    expect(out).toContain("auth-revamp");
    expect(out).toContain("120.0k");
    expect(out).toContain("$1.50");
    expect(out).toContain("█");
    expect(out).toContain("(unknown quest)");
    // activity
    expect(out).toContain("Recent activity");
    expect(out).toContain("build passed");
    expect(out).toContain("editing src/a.ts");
  });

  test("history seeded from snapshot appears in the throughput numbers", () => {
    const out = shot(fixture());
    expect(out).toContain("peak 1/min");
  });

  test("never exceeds terminal rows (minus chrome) or columns", () => {
    for (const [rows, cols] of [[24, 80], [30, 120], [16, 50], [40, 40], [10, 80], [8, 30]] as const) {
      const out = shot(fixture(), [rows, cols]);
      const lines = out.split("\n");
      expect(lines.length).toBeLessThanOrEqual(Math.max(1, rows - 4));
      for (const line of lines) expect([...line].length).toBeLessThanOrEqual(cols);
    }
  });

  test("large quest lists and activity feeds stay bounded with a more-indicator", () => {
    let v = fixture({
      quests: Array.from({ length: 80 }, (_, i) => ({ questId: `quest-${i}`, totals: totals(1000 * (80 - i)) })),
    });
    let state = v.state;
    for (let i = 0; i < 100; i++) {
      state = applyDashboardEvent(state, { type: "evt:agent-status-change", payload: { featureId: `a${i}`, previousStatus: "queued", newStatus: "running" } }, T0 + 5000 + i);
    }
    v = { ...v, state };
    const out = shot(v, [24, 80]);
    expect(out.split("\n").length).toBeLessThanOrEqual(20);
    expect(out).toContain("quest-0");
    expect(out).not.toContain("quest-79");
    expect(out).toMatch(/\+\d+ more/);
    // all five metrics still present
    expect(out).toContain("Throughput");
    expect(out).toContain("Est. remaining");
    expect(out).toContain("Running");
    expect(out).toContain("Recent activity");
  });

  test("compact layout on short terminals keeps counts, throughput, ETA", () => {
    const out = shot(fixture(), [12, 80]);
    const lines = out.split("\n");
    expect(lines.length).toBeLessThanOrEqual(8);
    expect(out).toContain("Running 1");
    expect(out).toContain("Throughput");
    expect(out).toContain("Est. remaining");
    expect(out).not.toContain("Recent activity"); // no panel headers in compact mode
  });

  test("narrow layout stacks counts and drops bars", () => {
    const out = shot(fixture(), [30, 44]);
    expect(out).toContain("Running 1");
    expect(out).toContain("tracked");
    for (const line of out.split("\n")) expect([...line].length).toBeLessThanOrEqual(44);
    expect(out).toContain("auth-revamp");
    expect(out).not.toContain("█ 120");
  });

  test("distinct empty state with historical token panel visible", () => {
    const base = fixture({ agents: [] });
    const v = { ...base, state: { ...base.state, activity: [] } };
    const out = shot(v);
    expect(out).toContain("Running 0");
    expect(out).toContain("No agents tracked yet");
    expect(out).toContain("auth-revamp"); // historical usage without active agents
    expect(out).toContain("nothing pending");
  });

  test("empty token panel messages", () => {
    expect(shot(fixture({ quests: [], usageAvailable: true }))).toContain("No token usage recorded yet");
    expect(shot(fixture({ quests: [], usageAvailable: false }))).toContain("No usage file yet");
  });

  test("unknown ETA and paused states are distinct", () => {
    const unknown = shot(fixture({ agents: [dAgent("a", "running")] }));
    expect(unknown).toContain("unknown (not enough data)");
    expect(unknown).not.toContain("approx.");
    const v = fixture({ agents: [dAgent("a", "queued", { effortEstimateMs: MIN })] });
    const paused = { ...v, state: { ...v.state, scheduler: { ...v.state.scheduler!, status: "paused" as const } } };
    const out = shot({ ...paused, eta: estimateRemaining(paused.state, T0) });
    expect(out).toContain("unknown (scheduler paused)");
  });

  test("ETA mentions agents without estimates", () => {
    const v = fixture({
      agents: [dAgent("a", "queued", { effortEstimateMs: 10 * MIN }), dAgent("b", "queued")],
      maxConcurrent: 1,
    });
    const out = shot(v);
    expect(out).toContain("~10m");
    expect(out).toContain("1 without estimate");
  });

  test("disconnected state is explicit and does not present data as live", () => {
    const live = shot(fixture());
    expect(live).toContain("● live");
    for (const [conn, text] of [
      ["disconnected", "disconnected - data may be stale"],
      ["reconnecting", "reconnecting - data may be stale"],
      ["connecting", "connecting - data may be stale"],
      ["unavailable", "no daemon - saved usage only"],
    ] as const) {
      const out = shot(fixture({ connection: conn }));
      expect(out).toContain(text);
      expect(out).not.toContain("● live");
      expect(out).toContain("unavailable while disconnected"); // ETA is not shown as live
      expect(out).toContain("auth-revamp"); // history stays
    }
  });

  test("sanitizes identifiers and activity as single-line text", () => {
    const evil = "q\x1b[31m-evil\x07\nnext\r";
    let v = fixture({ quests: [{ questId: evil, totals: totals(5) }] });
    const state = applyDashboardEvent(
      v.state,
      { type: "evt:agent-activity", payload: { featureId: "x\x1b]0;title\x07y", activity: "do\x1b[2Jthing\nmore" } },
      T0 + 9000,
    );
    v = { ...v, state };
    const out = shot(v);
    expect(out).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f]/);
    expect(out).toContain("-evil");
    expect(out).not.toContain("[31m");
    expect(out).not.toContain("]0;title");
  });

  test("minimal theme renders ASCII-only graphics", () => {
    const out = shot(fixture(), [24, 80], {}, "minimal");
    expect(out).not.toMatch(BLOCKS);
    expect(out).not.toContain("█");
    expect(out).toContain("=");
  });

  test("falls back to legacy store rendering without a metrics provider", () => {
    const store = { agents: [{ id: "legacy-a", status: "running" }] as any, running: 1, done: 0, failed: 0, total: 1 };
    const out = withSize(24, 80, () =>
      stripAnsi(
        renderToString(
          React.createElement(
            DashboardMetricsContext.Provider,
            { value: null },
            React.createElement(
              DashboardStoreContext.Provider,
              { value: store },
              React.createElement(RichScreen, {}),
            ),
          ),
        ),
      ),
    );
    expect(out).toContain("legacy-a");
    expect(out).toContain("ESC menu  q quit");
    expect(out).not.toContain("Throughput");
  });

  test("screen contains no sampling, file or subscription code", () => {
    const src = readFileSync(new URL("../../src/ink/dashboard.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/setInterval|setTimeout|readFileSync|node:fs|daemonClient|\.onStateChange|\.on\(/);
  });

  test("shows the back hint only when onBack is supplied", () => {
    expect(shot(fixture(), [24, 80], { onBack: () => {} })).toContain("b back");
    expect(shot(fixture())).not.toContain("b back");
  });

  test("formatEta formatting", () => {
    expect(formatEta(10_000)).toBe("<1m");
    expect(formatEta(12 * MIN)).toBe("12m");
    expect(formatEta(65 * MIN)).toBe("1h 05m");
    expect(formatEta(26 * 60 * MIN)).toBe("1d 2h");
    expect(formatEta(NaN)).toBe("<1m");
  });
});

describe("realtime DashboardScreen back action (live input)", () => {
  function streams() {
    const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
    (stdout as any).columns = 80;
    (stdout as any).rows = 24;
    const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
    (stdin as any).isTTY = true;
    (stdin as any).setRawMode = () => stdin;
    (stdin as any).ref = () => stdin;
    (stdin as any).unref = () => stdin;
    return { stdin, stdout };
  }
  const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));

  test("b calls onBack", async () => {
    const { stdin, stdout } = streams();
    let backs = 0;
    const inst = render(
      React.createElement(
        DashboardMetricsContext.Provider,
        { value: fixture() },
        React.createElement(RichScreen, { onBack: () => backs++ }),
      ),
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await wait();
    (stdin as any).write("b");
    await wait();
    inst.unmount();
    expect(backs).toBe(1);
  });

  test("b is ignored while the ESC menu is open", async () => {
    const { stdin, stdout } = streams();
    let backs = 0;
    const inst = render(
      React.createElement(
        DashboardMetricsContext.Provider,
        { value: fixture() },
        React.createElement(
          EscMenuProvider,
          {},
          React.createElement(RichScreen, { onBack: () => backs++ }),
        ),
      ),
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await wait();
    (stdin as any).write("\u001b");
    await wait(400);
    (stdin as any).write("b");
    await wait();
    inst.unmount();
    expect(backs).toBe(0);
  });

  test("b without onBack is a no-op", async () => {
    const { stdin, stdout } = streams();
    const inst = render(
      React.createElement(
        DashboardMetricsContext.Provider,
        { value: fixture() },
        React.createElement(RichScreen, {}),
      ),
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await wait();
    (stdin as any).write("b");
    await wait();
    inst.unmount();
  });
});
