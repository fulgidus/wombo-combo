import { describe, test, expect } from "bun:test";
import { IntensityTracker, DEFAULT_INTENSITY } from "../src/lib/supervision/intensity";
import type { Clock } from "../src/lib/supervision/clock";

function makeClock(): Clock & { t: number; advance(ms: number): void } {
  return {
    t: 0,
    now() {
      return this.t;
    },
    advance(ms: number) {
      this.t += ms;
    },
    setTimeout: () => undefined,
    clearTimeout: () => undefined,
  };
}

describe("IntensityTracker", () => {
  test("defaults to 3 restarts per 5000ms", () => {
    expect(DEFAULT_INTENSITY).toEqual({ maxRestarts: 3, periodMs: 5000 });
  });

  test("not exceeded up to maxRestarts, exceeded on the next", () => {
    const clock = makeClock();
    const t = new IntensityTracker({ maxRestarts: 3, periodMs: 1000 }, clock);
    expect(t.record()).toEqual({ exceeded: false, count: 1 });
    expect(t.record()).toEqual({ exceeded: false, count: 2 });
    expect(t.record()).toEqual({ exceeded: false, count: 3 });
    expect(t.record()).toEqual({ exceeded: true, count: 4 });
  });

  test("restarts outside the window are pruned", () => {
    const clock = makeClock();
    const t = new IntensityTracker({ maxRestarts: 3, periodMs: 1000 }, clock);
    t.record();
    t.record();
    t.record();
    clock.advance(1001);
    expect(t.count()).toBe(0);
    expect(t.record()).toEqual({ exceeded: false, count: 1 });
  });

  test("boundary: a timestamp exactly periodMs old is pruned", () => {
    const clock = makeClock();
    const t = new IntensityTracker({ maxRestarts: 3, periodMs: 1000 }, clock);
    t.record(); // t=0
    clock.advance(500);
    t.record();
    t.record();
    clock.advance(500); // now=1000, first is exactly 1000 old -> pruned
    expect(t.record()).toEqual({ exceeded: false, count: 3 });
  });

  test("boundary: a timestamp periodMs-1 old is still inside", () => {
    const clock = makeClock();
    const t = new IntensityTracker({ maxRestarts: 3, periodMs: 1000 }, clock);
    t.record(); // t=0
    clock.advance(500);
    t.record();
    t.record();
    clock.advance(499); // now=999
    expect(t.record()).toEqual({ exceeded: true, count: 4 });
  });

  test("maxRestarts=0: first restart exceeds", () => {
    const t = new IntensityTracker({ maxRestarts: 0, periodMs: 1000 }, makeClock());
    expect(t.record()).toEqual({ exceeded: true, count: 1 });
  });

  test("count() prunes without recording", () => {
    const clock = makeClock();
    const t = new IntensityTracker({ maxRestarts: 3, periodMs: 1000 }, clock);
    t.record();
    expect(t.count()).toBe(1);
    clock.advance(1000);
    expect(t.count()).toBe(0);
  });

  test("reset clears history", () => {
    const t = new IntensityTracker({ maxRestarts: 1, periodMs: 1000 }, makeClock());
    t.record();
    t.reset();
    expect(t.count()).toBe(0);
    expect(t.record()).toEqual({ exceeded: false, count: 1 });
  });
});
