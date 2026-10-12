import { describe, expect, test } from "bun:test";
import { FakeClock, stubAgent } from "./fakes";

describe("FakeClock", () => {
  test("fires timers only when advanced past them, in order", async () => {
    const clock = new FakeClock();
    const fired: number[] = [];
    clock.setTimeout(() => fired.push(2), 20);
    clock.setTimeout(() => fired.push(1), 10);
    await clock.advance(9);
    expect(fired).toEqual([]);
    await clock.advance(11);
    expect(fired).toEqual([1, 2]);
    expect(clock.now()).toBe(20);
  });

  test("cleared timers do not fire", async () => {
    const clock = new FakeClock();
    let fired = false;
    clock.clearTimeout(clock.setTimeout(() => (fired = true), 5));
    await clock.advance(10);
    expect(fired).toBe(false);
  });
});

describe("stubAgent", () => {
  test("crash rejects the run and exit resolves it", async () => {
    const a = stubAgent("A");
    const run = a.spec.start(new AbortController().signal);
    expect(a.running).toBe(true);
    a.crash(new Error("boom"));
    await expect(run).rejects.toThrow("boom");
    const run2 = a.spec.start(new AbortController().signal);
    a.exit();
    await expect(run2).resolves.toBeUndefined();
    expect(a.starts).toBe(2);
  });
});
