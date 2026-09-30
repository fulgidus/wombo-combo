/**
 * task-weight.test.ts — Task weight estimation and model routing table.
 */

import { describe, test, expect } from "bun:test";
import { computeTaskWeight, resolveTaskModel } from "../src/lib/task-weight";

describe("computeTaskWeight", () => {
  test("trivial + low priority + short effort → light", () => {
    expect(
      computeTaskWeight({ difficulty: "trivial", effort: "PT15M", priority: "low" })
    ).toBe("light"); // 0 + 1 + 0 = 1
  });

  test("medium + medium + 1h → medium", () => {
    expect(
      computeTaskWeight({ difficulty: "medium", effort: "PT1H", priority: "medium" })
    ).toBe("medium"); // 2 + 2 + 1 = 5
  });

  test("hard + high + 4h → heavy", () => {
    expect(
      computeTaskWeight({ difficulty: "hard", effort: "PT4H", priority: "high" })
    ).toBe("heavy"); // 3 + 3 + 2 = 8
  });

  test("very_hard + critical + >8h → heavy (max score)", () => {
    expect(
      computeTaskWeight({ difficulty: "very_hard", effort: "PT10H", priority: "critical" })
    ).toBe("heavy"); // 4 + 4 + 3 = 11
  });

  test("boundary: score 3 is light, 4 is medium", () => {
    // trivial(0) + critical(4) + PT15M(0) = 4 → medium
    expect(
      computeTaskWeight({ difficulty: "trivial", effort: "PT15M", priority: "critical" })
    ).toBe("medium");
    // easy(1) + medium(2) + PT15M(0) = 3 → light
    expect(
      computeTaskWeight({ difficulty: "easy", effort: "PT15M", priority: "medium" })
    ).toBe("light");
  });

  test("unparseable effort counts as heaviest effort band", () => {
    expect(
      computeTaskWeight({ difficulty: "trivial", effort: "bogus", priority: "low" })
    ).toBe("medium"); // 0 + 1 + 3 = 4
  });

  test("effort boundary: 30m light-band, 2h mid-band, 8h heavy-band", () => {
    const base = { difficulty: "trivial" as const, priority: "low" as const };
    expect(computeTaskWeight({ ...base, effort: "PT30M" })).toBe("light"); // 0+1+0
    expect(computeTaskWeight({ ...base, effort: "PT2H" })).toBe("light"); // 0+1+1=2
    expect(computeTaskWeight({ ...base, effort: "PT8H" })).toBe("light"); // 0+1+2=3 (still light band)
    expect(computeTaskWeight({ ...base, effort: "P3D" })).toBe("medium"); // 0+1+3=4
  });
});

describe("resolveTaskModel", () => {
  const lightTask = { difficulty: "trivial" as const, effort: "PT15M", priority: "low" as const };
  const heavyTask = { difficulty: "very_hard" as const, effort: "P2D", priority: "critical" as const };

  test("routing table entry for the task's weight wins", () => {
    const routing = { light: "glm-4-flash", heavy: "claude-opus-4" };
    expect(resolveTaskModel(lightTask, routing, "session-model")).toBe("glm-4-flash");
    expect(resolveTaskModel(heavyTask, routing, "session-model")).toBe("claude-opus-4");
  });

  test("weight class missing from the table falls back to the session model", () => {
    const routing = { heavy: "claude-opus-4" };
    expect(resolveTaskModel(lightTask, routing, "session-model")).toBe("session-model");
  });

  test("null table entry falls back to the session model", () => {
    const routing = { light: null, heavy: "claude-opus-4" };
    expect(resolveTaskModel(lightTask, routing, "session-model")).toBe("session-model");
  });

  test("no routing table → session model for everything", () => {
    expect(resolveTaskModel(lightTask, undefined, "session-model")).toBe("session-model");
  });

  test("no table and no session model → null (agent default)", () => {
    expect(resolveTaskModel(heavyTask, undefined, null)).toBeNull();
    expect(resolveTaskModel(heavyTask, undefined, undefined)).toBeNull();
  });
});
