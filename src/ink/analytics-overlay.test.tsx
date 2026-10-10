/**
 * analytics-overlay.test.tsx — Tests for the AnalyticsOverlayView Ink component.
 */

import { describe, test, expect, mock } from "bun:test";
import React from "react";
import { render, renderToString } from "ink";
import { PassThrough } from "node:stream";
import {
  AnalyticsOverlayView,
  ANALYTICS_GROUPINGS,
  nextAnalyticsGrouping,
  formatAnalyticsDuration,
  formatAnalyticsRate,
  visibleWindow,
  type AnalyticsOverlayViewProps,
} from "./analytics-overlay";
import { UsageOverlayView, formatTokenCount, formatCost } from "./usage-overlay";
import { createAnalyticsRecord, type AgentAnalyticsRecord } from "../lib/analytics";
import { summarizeAnalytics, type AnalyticsGroupBy } from "../lib/analytics-summary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestStreams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 100;
  (stdout as any).rows = 40;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  return { stdin, stdout };
}

function rec(id: string, over: Partial<AgentAnalyticsRecord> = {}): AgentAnalyticsRecord {
  return createAnalyticsRecord({
    execution_id: id,
    wave_id: "w1",
    task_id: `task-${id}`,
    first_started_at: "2026-03-01T10:00:00.000Z",
    ...over,
  });
}

const FULL_USAGE = {
  input_tokens: 1_200_000,
  output_tokens: 450_300,
  cache_read: 800_000,
  cache_write: 10_000,
  reasoning_tokens: 50_200,
  total_tokens: 1_700_500,
  total_cost: 12.34,
  record_count: 9,
};

function sampleRecords(): AgentAnalyticsRecord[] {
  return [
    rec("a", {
      outcome: "succeeded",
      duration_ms: 125_000,
      retry_count: 2,
      build_attempts: 4,
      build_passes: 1,
      additions: 30,
      deletions: 12,
      usage: FULL_USAGE,
      usage_coverage: "full",
      quest_id: "q1",
    }),
    rec("b", { outcome: "failed", usage_coverage: "partial", usage: { ...FULL_USAGE, total_tokens: 10, total_cost: 0 }, quest_id: "q1" }),
    rec("c", { outcome: "stopped", usage_coverage: "none", quest_id: null }),
  ];
}

function props(over: Partial<AnalyticsOverlayViewProps> = {}): AnalyticsOverlayViewProps {
  return {
    summary: summarizeAnalytics(sampleRecords(), { groupBy: "task" }),
    groupBy: "task",
    selectedIndex: 0,
    onClose: () => {},
    onCycleGrouping: () => {},
    onSelectIndex: () => {},
    ...over,
  };
}

async function press(p: AnalyticsOverlayViewProps, data: string): Promise<void> {
  const { stdin, stdout } = createTestStreams();
  const instance = render(<AnalyticsOverlayView {...p} />, {
    stdout,
    stdin,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });
  await new Promise((r) => setTimeout(r, 50));
  (stdin as any as PassThrough).write(data);
  await new Promise((r) => setTimeout(r, 50));
  instance.unmount();
  await instance.waitUntilExit();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe("helpers", () => {
  test("grouping cycle covers task, quest, wave, agent, model", () => {
    expect([...ANALYTICS_GROUPINGS]).toEqual(["task", "quest", "wave", "agent", "model"]);
    let g: AnalyticsGroupBy = "task";
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      g = nextAnalyticsGrouping(g);
      seen.push(g);
    }
    expect(seen).toEqual(["quest", "wave", "agent", "model", "task"]);
  });

  test("duration and rate formatting; null is n/a", () => {
    expect(formatAnalyticsDuration(null)).toBe("n/a");
    expect(formatAnalyticsDuration(45_000)).toBe("45s");
    expect(formatAnalyticsDuration(125_000)).toBe("2m05s");
    expect(formatAnalyticsDuration(3_900_000)).toBe("1h05m");
    expect(formatAnalyticsRate(null)).toBe("n/a");
    expect(formatAnalyticsRate(0.25)).toBe("25%");
  });

  test("visibleWindow keeps the selection visible and bounded", () => {
    expect(visibleWindow(3, 0, 8)).toEqual({ start: 0, end: 3 });
    expect(visibleWindow(20, 0, 5)).toEqual({ start: 0, end: 5 });
    expect(visibleWindow(20, 10, 5)).toEqual({ start: 8, end: 13 });
    expect(visibleWindow(20, 19, 5)).toEqual({ start: 15, end: 20 });
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("AnalyticsOverlayView rendering", () => {
  test("empty data explains itself", () => {
    const out = renderToString(<AnalyticsOverlayView {...props({ summary: null })} />);
    expect(out).toContain("Agent Analytics");
    expect(out).toContain("No analytics data found");
    expect(out).toContain("not backfilled");
    const empty = renderToString(<AnalyticsOverlayView {...props({ summary: summarizeAnalytics([]) })} />);
    expect(empty).toContain("No analytics data found");
  });

  test("renders outcomes, duration, retries, full tokens, weighted build rate and lines with samples", () => {
    const out = renderToString(<AnalyticsOverlayView {...props()} />);
    expect(out).toContain("3 executions");
    expect(out).toContain("1 ok");
    expect(out).toContain("1 failed");
    expect(out).toContain("1 stopped");
    expect(out).toContain("mean 2m05s");
    expect(out).toContain("(1 successful)");
    expect(out).toContain("Retries: 2");
    // full token totals incl. cache and reasoning
    expect(out).toContain("1.70M total");
    expect(out).toContain("[2/3 with usage]");
    expect(out).toContain("in 2.40M"); // 1.2M + 1.2M (two records with usage)
    expect(out).toContain("reasoning 100.4k");
    // weighted build rate: 1 pass of 4 attempts
    expect(out).toContain("25% (1/4 builds)");
    expect(out).toContain("+30 / -12 (42 changed) [1/3]");
  });

  test("unavailable measurements render as n/a, never zero or 100%", () => {
    const s = summarizeAnalytics([rec("x")]);
    const out = renderToString(<AnalyticsOverlayView {...props({ summary: s })} />);
    expect(out).toContain("n/a (no successful runs)");
    expect(out).toContain("n/a (no usage data)");
    expect(out).toContain("n/a (no builds)");
    expect(out).toContain("n/a (no measurements)");
    expect(out).not.toContain("100%");
  });

  test("partial and missing usage coverage is flagged", () => {
    const out = renderToString(<AnalyticsOverlayView {...props()} />);
    expect(out).toContain("Usage coverage: 1 partial, 1 without usage");
    expect(out).toContain("totals may be incomplete");
  });

  test("full coverage shows no warning", () => {
    const s = summarizeAnalytics([rec("a", { usage: FULL_USAGE, usage_coverage: "full" })]);
    const out = renderToString(<AnalyticsOverlayView {...props({ summary: s })} />);
    expect(out).not.toContain("Usage coverage");
  });

  test("group rows, selection marker, null keys and grouping labels", () => {
    const s = summarizeAnalytics(sampleRecords(), { groupBy: "quest" });
    const out = renderToString(<AnalyticsOverlayView {...props({ summary: s, groupBy: "quest" })} />);
    expect(out).toContain("By Quest:");
    expect(out).toContain("q1");
    expect(out).toContain("(none)");
    expect(out).toContain("▸");
    expect(out).toContain("Tab");
    expect(out).toContain("group by Wave");
    expect(out).toContain("Esc/U");
  });

  test("long labels are truncated", () => {
    const long = "task-with-an-extremely-long-identifier-that-overflows";
    const s = summarizeAnalytics([rec("a", { task_id: long })], { groupBy: "task" });
    const out = renderToString(<AnalyticsOverlayView {...props({ summary: s })} />);
    expect(out).toContain("…");
    expect(out).not.toContain(long);
  });

  test("visible rows are bounded with more-indicators", () => {
    const many = Array.from({ length: 20 }, (_, i) => rec(`e${String(i).padStart(2, "0")}`, { task_id: `t${String(i).padStart(2, "0")}` }));
    const s = summarizeAnalytics(many, { groupBy: "task" });
    const top = renderToString(<AnalyticsOverlayView {...props({ summary: s, maxVisibleRows: 3 })} />);
    expect(top).toContain("t00");
    expect(top).toContain("t02");
    expect(top).not.toContain("t05");
    expect(top).toContain("↓ 17 more");
    const mid = renderToString(<AnalyticsOverlayView {...props({ summary: s, maxVisibleRows: 3, selectedIndex: 10 })} />);
    expect(mid).toContain("t10");
    expect(mid).not.toContain("t00");
    expect(mid).toContain("↑ 9 more");
    const end = renderToString(<AnalyticsOverlayView {...props({ summary: s, maxVisibleRows: 3, selectedIndex: 19 })} />);
    expect(end).toContain("t19");
    expect(end).not.toMatch(/↓ \d+ more/);
  });

  test("out-of-range selection is clamped", () => {
    const out = renderToString(<AnalyticsOverlayView {...props({ selectedIndex: 99 })} />);
    expect(out).toContain("▸");
  });

  test("storage diagnostics are shown", () => {
    const out = renderToString(
      <AnalyticsOverlayView {...props({ diagnostics: ["bad.json: malformed: Unexpected token", "b.json: invalid", "c.json: x", "d.json: y"] })} />,
    );
    expect(out).toContain("Storage issues (4)");
    expect(out).toContain("bad.json");
    expect(out).toContain("and 1 more");
  });

  test("existing usage overlay exports are preserved", () => {
    expect(typeof UsageOverlayView).toBe("function");
    expect(formatTokenCount(1500)).toBe("1.5k");
    expect(formatCost(12.34)).toBe("$12.34");
  });
});

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

describe("AnalyticsOverlayView interactions", () => {
  test("Escape, u and U close", async () => {
    for (const key of ["\x1b", "u", "U"]) {
      const onClose = mock(() => {});
      await press(props({ onClose }), key);
      expect(onClose).toHaveBeenCalled();
    }
  });

  test("Tab cycles grouping", async () => {
    const onCycleGrouping = mock(() => {});
    await press(props({ onCycleGrouping }), "\t");
    expect(onCycleGrouping).toHaveBeenCalled();
  });

  test("arrows and j/k navigate with clamping", async () => {
    const down = mock(() => {});
    await press(props({ onSelectIndex: down }), "\x1b[B");
    expect(down).toHaveBeenCalledWith(1);

    const j = mock(() => {});
    await press(props({ onSelectIndex: j }), "j");
    expect(j).toHaveBeenCalledWith(1);

    const up = mock(() => {});
    await press(props({ selectedIndex: 2, onSelectIndex: up }), "\x1b[A");
    expect(up).toHaveBeenCalledWith(1);

    const k = mock(() => {});
    await press(props({ selectedIndex: 0, onSelectIndex: k }), "k");
    expect(k).toHaveBeenCalledWith(0);

    const last = mock(() => {});
    await press(props({ selectedIndex: 2, onSelectIndex: last }), "j");
    expect(last).toHaveBeenCalledWith(2);
  });

  test("navigation is a no-op without groups", async () => {
    const onSelectIndex = mock(() => {});
    await press(props({ summary: summarizeAnalytics(sampleRecords()), onSelectIndex }), "j");
    expect(onSelectIndex).not.toHaveBeenCalled();
  });
});
