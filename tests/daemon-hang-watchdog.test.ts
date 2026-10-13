import { describe, test, expect } from "bun:test";
import { FakeClock } from "./helpers/fake-clock";
import { createHangWatchdog } from "../src/daemon/runner/hang-watchdog";

function setup(idleTimeoutMs: number | undefined) {
  const clock = new FakeClock();
  const hung: Array<{ id: string; idleMs: number }> = [];
  const killed: string[] = [];
  const dog = createHangWatchdog({
    idleTimeoutMs,
    clock,
    kill: (id) => { killed.push(id); },
    onHang: (id, reason) => { hung.push({ id, idleMs: reason.idleMs }); },
  });
  return { clock, dog, hung, killed };
}

describe("createHangWatchdog", () => {
  test("idle beyond the threshold kills the process and reports a hang", () => {
    const { clock, dog, hung, killed } = setup(1000);
    dog.track("a");
    clock.advance(999);
    expect(hung).toEqual([]);
    clock.advance(1);
    expect(killed).toEqual(["a"]);
    expect(hung).toEqual([{ id: "a", idleMs: 1000 }]);
  });

  test("kill happens before the hang is reported", () => {
    const clock = new FakeClock();
    const order: string[] = [];
    const dog = createHangWatchdog({
      idleTimeoutMs: 10, clock,
      kill: () => order.push("kill"),
      onHang: () => order.push("hang"),
    });
    dog.track("a");
    clock.advance(10);
    expect(order).toEqual(["kill", "hang"]);
  });

  test("activity pushes the deadline out", () => {
    const { clock, dog, hung } = setup(1000);
    dog.track("a");
    clock.advance(800);
    dog.touch("a");
    clock.advance(800);
    expect(hung).toEqual([]);
    clock.advance(200);
    expect(hung).toEqual([{ id: "a", idleMs: 1000 }]);
  });

  test("fires once per tracking and needs a new track() to re-arm", () => {
    const { clock, dog, hung } = setup(100);
    dog.track("a");
    clock.advance(500);
    expect(hung).toHaveLength(1);
    dog.track("a");
    clock.advance(100);
    expect(hung).toHaveLength(2);
  });

  test("untrack cancels the watch", () => {
    const { clock, dog, hung } = setup(100);
    dog.track("a");
    dog.untrack("a");
    clock.advance(1000);
    expect(hung).toEqual([]);
    expect(clock.pendingTimers()).toBe(0);
  });

  test("touch on an untracked agent is ignored", () => {
    const { clock, dog, hung } = setup(100);
    dog.touch("a");
    clock.advance(1000);
    expect(hung).toEqual([]);
  });

  test.each([undefined, 0, -5])("disabled when threshold is %p", (threshold) => {
    const { clock, dog, hung } = setup(threshold as number | undefined);
    expect(dog.enabled).toBe(false);
    dog.track("a");
    expect(clock.pendingTimers()).toBe(0);
    clock.advance(1_000_000);
    expect(hung).toEqual([]);
  });

  test("agents are watched independently; dispose clears all", () => {
    const { clock, dog, hung } = setup(100);
    dog.track("a");
    clock.advance(50);
    dog.track("b");
    clock.advance(50);
    expect(hung.map((h) => h.id)).toEqual(["a"]);
    dog.dispose();
    clock.advance(1000);
    expect(hung.map((h) => h.id)).toEqual(["a"]);
  });

  test("a throwing kill does not stop the hang report", () => {
    const clock = new FakeClock();
    const hung: string[] = [];
    const dog = createHangWatchdog({
      idleTimeoutMs: 10, clock,
      kill: () => { throw new Error("nope"); },
      onHang: (id) => hung.push(id),
    });
    dog.track("a");
    clock.advance(10);
    expect(hung).toEqual(["a"]);
  });

  test("a paused agent is never declared hung and is re-armed", () => {
    const clock = new FakeClock();
    const hung: string[] = [];
    let paused = true;
    const dog = createHangWatchdog({
      idleTimeoutMs: 100, clock,
      kill: () => {},
      isPaused: () => paused,
      onHang: (id) => hung.push(id),
    });
    dog.track("a");
    clock.advance(1000);
    expect(hung).toEqual([]);
    paused = false;
    clock.advance(100);
    expect(hung).toEqual(["a"]);
  });
});
