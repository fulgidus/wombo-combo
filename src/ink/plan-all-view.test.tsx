import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import { PlanAllView, visibleWindow, type PlanAllViewProps } from "./plan-all-view";
import { createBlankQuest } from "../lib/quest";
import type { PlanAllRow } from "../lib/quest-plan-all";

function row(id: string, over: Partial<PlanAllRow> = {}): PlanAllRow {
  return {
    quest: createBlankQuest(id, `Title ${id}`, "g", "main"),
    state: "queued",
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    cost: null,
    activity: "",
    ...over,
  };
}

function render(props: Partial<PlanAllViewProps>): string {
  return renderToString(
    <PlanAllView
      rows={[]}
      totals={{ tokensIn: 0, tokensOut: 0, cost: null }}
      finished={false}
      skipped={[]}
      spinFrame={0}
      height={20}
      {...props}
    />,
    { columns: 100 },
  );
}

describe("PlanAllView", () => {
  test("shows one row per quest with state, tokens and provider cost", () => {
    const out = render({
      rows: [
        row("alpha", { state: "running", tokensIn: 1500, tokensOut: 200, cost: 0.0123, activity: "reading src" }),
        row("beta", { state: "queued" }),
        row("gamma", { state: "done", tokensIn: 10, tokensOut: 5 }),
        row("delta", { state: "failed", error: "no yaml" }),
      ],
      totals: { tokensIn: 1510, tokensOut: 205, cost: 0.0123 },
    });
    expect(out).toContain("alpha");
    expect(out).toContain("↑1.5k ↓200");
    expect(out).toContain("$0.0123");
    expect(out).toContain("reading src");
    expect(out).toContain("beta");
    expect(out).toContain("no yaml");
    expect(out).toContain("↑1.5k ↓205");
  });

  test("omits cost when the provider reported none", () => {
    const out = render({ rows: [row("alpha", { state: "running", tokensIn: 5 })] });
    expect(out).not.toContain("$");
  });

  test("reports skipped quests", () => {
    const out = render({
      rows: [row("alpha")],
      skipped: [{ quest: createBlankQuest("planned-one", "P", "g", "main"), reason: "already-planned" }],
    });
    expect(out).toContain("planned-one");
  });

  test("shows abort hint while running and review keys once finished", () => {
    expect(render({ rows: [row("a", { state: "running" })] })).toContain("Esc");
    const fin = render({ rows: [row("a", { state: "done" })], finished: true, validCount: 1 });
    expect(fin).toContain("→");
    expect(fin).toContain("approve all valid");
    expect(fin).toContain("←");
  });

  test("never renders more lines than the given height", () => {
    const rows = Array.from({ length: 40 }, (_, i) => row(`q${i}`, { state: i < 2 ? "running" : "queued" }));
    const out = render({ rows, height: 12 });
    expect(out.split("\n").length).toBeLessThanOrEqual(12);
    expect(out).toContain("q0");
  });
});

describe("visibleWindow", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(`q${i}`, { state: i < 6 ? "done" : "queued" }));
  test("returns everything when it fits", () => {
    expect(visibleWindow(rows, 10)).toEqual({ start: 0, end: 10 });
  });
  test("keeps the first unfinished row in view", () => {
    const w = visibleWindow(rows, 4);
    expect(w.end - w.start).toBe(4);
    expect(w.start).toBeLessThanOrEqual(6);
    expect(w.end).toBeGreaterThan(6);
  });
});
