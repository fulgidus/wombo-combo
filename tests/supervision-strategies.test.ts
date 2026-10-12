import { describe, test, expect } from "bun:test";
import { filterRestartable, planRestart, shouldRestart } from "../src/lib/supervision/strategies";
import type { ExitReason, RestartType } from "../src/lib/supervision/types";

const order = ["a", "b", "c"] as const;

describe("shouldRestart", () => {
  const reasons: Record<string, ExitReason> = {
    normal: { kind: "normal" },
    shutdown: { kind: "shutdown" },
    crash: { kind: "crash", error: new Error("boom") },
  };
  const expected: Record<RestartType, Record<string, boolean>> = {
    permanent: { normal: true, shutdown: true, crash: true },
    transient: { normal: false, shutdown: false, crash: true },
    temporary: { normal: false, shutdown: false, crash: false },
  };
  for (const type of Object.keys(expected) as RestartType[]) {
    for (const name of Object.keys(reasons)) {
      test(`${type} on ${name} -> ${expected[type][name]}`, () => {
        expect(shouldRestart(type, reasons[name])).toBe(expected[type][name]);
      });
    }
  }
});

describe("planRestart one_for_one", () => {
  for (const id of order) {
    test(`failing ${id} restarts only itself`, () => {
      expect(planRestart("one_for_one", order, id)).toEqual({ stop: [], start: [id] });
    });
  }
});

describe("planRestart one_for_all", () => {
  test("first failing", () => {
    expect(planRestart("one_for_all", order, "a")).toEqual({ stop: ["c", "b"], start: ["a", "b", "c"] });
  });
  test("middle failing", () => {
    expect(planRestart("one_for_all", order, "b")).toEqual({ stop: ["c", "a"], start: ["a", "b", "c"] });
  });
  test("last failing", () => {
    expect(planRestart("one_for_all", order, "c")).toEqual({ stop: ["b", "a"], start: ["a", "b", "c"] });
  });
});

describe("planRestart rest_for_one", () => {
  test("first failing", () => {
    expect(planRestart("rest_for_one", order, "a")).toEqual({ stop: ["c", "b"], start: ["a", "b", "c"] });
  });
  test("middle failing", () => {
    expect(planRestart("rest_for_one", order, "b")).toEqual({ stop: ["c"], start: ["b", "c"] });
  });
  test("last failing", () => {
    expect(planRestart("rest_for_one", order, "c")).toEqual({ stop: [], start: ["c"] });
  });
});

describe("planRestart edge cases", () => {
  test("single child list for every strategy", () => {
    for (const s of ["one_for_one", "one_for_all", "rest_for_one"] as const) {
      expect(planRestart(s, ["only"], "only")).toEqual({ stop: [], start: ["only"] });
    }
  });
  test("unknown id throws", () => {
    for (const s of ["one_for_one", "one_for_all", "rest_for_one"] as const) {
      expect(() => planRestart(s, order, "zzz")).toThrow();
    }
  });
  test("does not mutate input order", () => {
    const o = ["a", "b", "c"];
    planRestart("one_for_all", o, "b");
    expect(o).toEqual(["a", "b", "c"]);
  });
});

describe("filterRestartable", () => {
  test("temporary siblings are stopped but not started under one_for_all", () => {
    const specs = new Map<string, { restart: RestartType }>([
      ["a", { restart: "permanent" }],
      ["b", { restart: "temporary" }],
      ["c", { restart: "transient" }],
    ]);
    const plan = planRestart("one_for_all", order, "a");
    expect(filterRestartable(plan, specs)).toEqual({ stop: ["c", "b"], start: ["a", "c"] });
  });
  test("temporary siblings are dropped from start under rest_for_one", () => {
    const specs = new Map<string, { restart: RestartType }>([
      ["a", { restart: "permanent" }],
      ["b", { restart: "temporary" }],
      ["c", { restart: "permanent" }],
    ]);
    const plan = planRestart("rest_for_one", order, "a");
    expect(filterRestartable(plan, specs)).toEqual({ stop: ["c", "b"], start: ["a", "c"] });
  });
  test("ids missing from specs are kept and input is not mutated", () => {
    const plan = { stop: ["b"], start: ["a", "b"] };
    const out = filterRestartable(plan, new Map());
    expect(out).toEqual({ stop: ["b"], start: ["a", "b"] });
    expect(out).not.toBe(plan);
  });
});
