import { describe, test, expect } from "bun:test";
import { createPlannerTelemetry, formatPlannerTelemetry } from "../src/lib/planner-telemetry";

const stepFinish = (input: number, output: number, cost?: number) =>
  JSON.stringify({ type: "step_finish", part: { cost, tokens: { total: input + output, input, output, reasoning: 0 } } }) + "\n";

describe("planner telemetry", () => {
  test("accumulates tokens and provider-reported cost across steps", () => {
    const t = createPlannerTelemetry({ model: "m1" });
    t.feed(stepFinish(1000, 200, 0.01));
    t.feed(stepFinish(500, 100, 0.005));
    expect(t.snapshot()).toMatchObject({ model: "m1", tokensIn: 1500, tokensOut: 300 });
    expect(t.snapshot().cost).toBeCloseTo(0.015);
  });

  test("cost stays null when the provider reports none", () => {
    const t = createPlannerTelemetry({});
    t.feed(stepFinish(10, 5));
    expect(t.snapshot().cost).toBeNull();
  });

  test("handles lines split across chunks and flush of a trailing line", () => {
    const t = createPlannerTelemetry({});
    const line = stepFinish(7, 3, 0.1);
    t.feed(line.slice(0, 20));
    expect(t.snapshot().tokensIn).toBe(0);
    t.feed(line.slice(20).trimEnd());
    t.flush();
    expect(t.snapshot().tokensIn).toBe(7);
  });

  test("uses the harness normalizer when given and ignores non-JSON lines", () => {
    const t = createPlannerTelemetry({
      normalize: () => [{ type: "step_finish", part: { tokens: { total: 3, input: 2, output: 1, reasoning: 0 } } }],
    });
    t.feed("garbage\n");
    expect(t.snapshot().tokensIn).toBe(2);
    const t2 = createPlannerTelemetry({});
    t2.feed("not json\n");
    expect(t2.snapshot().tokensIn).toBe(0);
  });

  test("tracks the latest activity and notifies on updates", () => {
    const seen: string[] = [];
    const t = createPlannerTelemetry({ onUpdate: (s) => seen.push(formatPlannerTelemetry(s)) });
    t.feed(JSON.stringify({ type: "tool_use", part: { type: "tool", tool: "read", state: { status: "completed", input: { filePath: "a.ts" } } } }) + "\n");
    expect(t.snapshot().activity).toContain("read");
    expect(seen.length).toBe(1);
  });

  test("formats model, tokens, cost and activity", () => {
    expect(
      formatPlannerTelemetry({ model: "p/m", tokensIn: 1500, tokensOut: 300, cost: 0.0123, activity: "read a.ts" }),
    ).toBe("p/m · ↑1.5k ↓300 · $0.0123 · read a.ts");
    expect(formatPlannerTelemetry({ model: null, tokensIn: 0, tokensOut: 0, cost: null, activity: "" })).toBe("");
  });
});
