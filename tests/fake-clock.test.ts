import { describe, test, expect } from "bun:test";
import { FakeClock } from "./helpers/fake-clock";

describe("FakeClock", () => {
  test("now starts at configured start", () => {
    expect(new FakeClock().now()).toBe(0);
    expect(new FakeClock(100).now()).toBe(100);
  });

  test("fires timers in time order, ties by registration order", () => {
    const c = new FakeClock();
    const log: string[] = [];
    c.setTimeout(() => log.push("c"), 20);
    c.setTimeout(() => log.push("a"), 10);
    c.setTimeout(() => log.push("b"), 10);
    c.advance(20);
    expect(log).toEqual(["a", "b", "c"]);
  });

  test("now() equals due time during callback and target afterwards", () => {
    const c = new FakeClock(5);
    const seen: number[] = [];
    c.setTimeout(() => seen.push(c.now()), 10);
    c.advance(30);
    expect(seen).toEqual([15]);
    expect(c.now()).toBe(35);
  });

  test("does not fire timers beyond the window", () => {
    const c = new FakeClock();
    let fired = false;
    c.setTimeout(() => (fired = true), 50);
    c.advance(49);
    expect(fired).toBe(false);
    expect(c.pendingTimers()).toBe(1);
    expect(c.nextDueAt()).toBe(50);
    c.advance(1);
    expect(fired).toBe(true);
    expect(c.pendingTimers()).toBe(0);
    expect(c.nextDueAt()).toBeUndefined();
  });

  test("clearTimeout cancels a timer", () => {
    const c = new FakeClock();
    let fired = false;
    const h = c.setTimeout(() => (fired = true), 10);
    c.clearTimeout(h);
    expect(c.pendingTimers()).toBe(0);
    c.advance(100);
    expect(fired).toBe(false);
  });

  test("a timer can cancel a later timer in the same window", () => {
    const c = new FakeClock();
    let fired = false;
    const h = c.setTimeout(() => (fired = true), 20);
    c.setTimeout(() => c.clearTimeout(h), 10);
    c.advance(30);
    expect(fired).toBe(false);
  });

  test("nested timers inside the window fire; outside stay pending", () => {
    const c = new FakeClock();
    const log: number[] = [];
    c.setTimeout(() => {
      log.push(c.now());
      c.setTimeout(() => log.push(c.now()), 5);
      c.setTimeout(() => log.push(c.now()), 100);
    }, 10);
    c.advance(20);
    expect(log).toEqual([10, 15]);
    expect(c.pendingTimers()).toBe(1);
    expect(c.nextDueAt()).toBe(110);
  });

  test("zero-delay nested timer fires in the same advance", () => {
    const c = new FakeClock();
    const log: string[] = [];
    c.setTimeout(() => {
      log.push("outer");
      c.setTimeout(() => log.push("inner"), 0);
    }, 1);
    c.advance(1);
    expect(log).toEqual(["outer", "inner"]);
  });

  test("flush settles promise chains", async () => {
    const c = new FakeClock();
    let done = false;
    Promise.resolve().then(() => {}).then(() => {}).then(() => (done = true));
    await c.flush();
    expect(done).toBe(true);
  });

  test("advanceAsync runs promise continuations between timers", async () => {
    const c = new FakeClock();
    const log: string[] = [];
    const run = async () => {
      await new Promise<void>((r) => c.setTimeout(r, 10));
      log.push(`first@${c.now()}`);
      await new Promise<void>((r) => c.setTimeout(r, 10));
      log.push(`second@${c.now()}`);
    };
    const p = run();
    await c.advanceAsync(25);
    await p;
    expect(log).toEqual(["first@10", "second@20"]);
    expect(c.now()).toBe(25);
  });

  test("sync advance does not run continuation before it returns", async () => {
    const c = new FakeClock();
    const log: string[] = [];
    const run = async () => {
      await new Promise<void>((r) => c.setTimeout(r, 10));
      c.setTimeout(() => log.push("late"), 5);
    };
    void run();
    c.advance(20);
    await c.flush();
    expect(log).toEqual([]);
    expect(c.pendingTimers()).toBe(1);
  });
});
