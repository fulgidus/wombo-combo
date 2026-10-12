import { describe, test, expect } from "bun:test";
import { FakeClock } from "./helpers/fake-clock";
import {
  stopChild,
  stopChildrenInOrder,
  ShutdownTimeoutError,
} from "../src/lib/supervision/shutdown";
import type { ChildHandle, ExitReason } from "../src/lib/supervision/types";

interface FakeChild {
  handle: ChildHandle;
  aborts: unknown[];
  exit(reason: ExitReason): void;
}

function fakeChild(opts: { abortThrows?: unknown; exitOnAbort?: ExitReason } = {}): FakeChild {
  let resolve!: (r: ExitReason) => void;
  const exit = new Promise<ExitReason>((r) => (resolve = r));
  const aborts: unknown[] = [];
  const handle: ChildHandle = {
    exit,
    abort(reason?: unknown) {
      aborts.push(reason);
      if (opts.abortThrows !== undefined) throw opts.abortThrows;
      if (opts.exitOnAbort) resolve(opts.exitOnAbort);
    },
  };
  return { handle, aborts, exit: resolve };
}

describe("stopChild", () => {
  test("graceful exit before timeout clears the timer", async () => {
    const clock = new FakeClock();
    const c = fakeChild();
    const p = stopChild(c.handle, { timeoutMs: 1000, clock });
    expect(c.aborts).toEqual(["shutdown"]);
    expect(clock.pendingTimers()).toBe(1);
    c.exit({ kind: "shutdown" });
    expect(await p).toEqual({ reason: { kind: "shutdown" }, forced: false });
    expect(clock.pendingTimers()).toBe(0);
  });

  test("hung child hits the timeout", async () => {
    const clock = new FakeClock();
    const c = fakeChild();
    let settled = false;
    const p = stopChild(c.handle, { timeoutMs: 1000, clock }).then((r) => ((settled = true), r));
    await clock.advanceAsync(999);
    expect(settled).toBe(false);
    await clock.advanceAsync(1);
    const res = await p;
    expect(res.forced).toBe(true);
    expect(res.reason.kind).toBe("crash");
    const err = (res.reason as { kind: "crash"; error: unknown }).error;
    expect(err).toBeInstanceOf(ShutdownTimeoutError);
    expect((err as ShutdownTimeoutError).timeoutMs).toBe(1000);
    expect(clock.pendingTimers()).toBe(0);
  });

  test("late exit after timeout causes no unhandled rejection", async () => {
    const clock = new FakeClock();
    const c = fakeChild();
    const p = stopChild(c.handle, { timeoutMs: 10, clock });
    await clock.advanceAsync(10);
    await p;
    c.exit({ kind: "normal" });
    await clock.flush();
  });

  test("aborts the controller too", async () => {
    const clock = new FakeClock();
    const c = fakeChild({ exitOnAbort: { kind: "shutdown" } });
    const controller = new AbortController();
    await stopChild(c.handle, { timeoutMs: 10, clock, controller });
    expect(controller.signal.aborted).toBe(true);
  });

  test("already-exited handle resolves immediately", async () => {
    const clock = new FakeClock();
    const c = fakeChild();
    c.exit({ kind: "normal" });
    const res = await stopChild(c.handle, { timeoutMs: 1000, clock });
    expect(res).toEqual({ reason: { kind: "normal" }, forced: false });
    expect(clock.pendingTimers()).toBe(0);
  });

  test("abort throwing is a forced stop with that error", async () => {
    const clock = new FakeClock();
    const boom = new Error("boom");
    const c = fakeChild({ abortThrows: boom });
    const res = await stopChild(c.handle, { timeoutMs: 1000, clock });
    expect(res).toEqual({ reason: { kind: "crash", error: boom }, forced: true });
    expect(clock.pendingTimers()).toBe(0);
  });
});

describe("stopChildrenInOrder", () => {
  test("stops strictly sequentially", async () => {
    const clock = new FakeClock();
    const a = fakeChild();
    const b = fakeChild();
    const p = stopChildrenInOrder(
      [
        { id: "a", handle: a.handle, timeoutMs: 1000 },
        { id: "b", handle: b.handle, timeoutMs: 1000 },
      ],
      clock,
    );
    await clock.flush();
    expect(a.aborts.length).toBe(1);
    expect(b.aborts.length).toBe(0);
    a.exit({ kind: "shutdown" });
    await clock.flush();
    expect(b.aborts.length).toBe(1);
    b.exit({ kind: "shutdown" });
    const res = await p;
    expect([...res.keys()]).toEqual(["a", "b"]);
    expect(res.get("a")!.forced).toBe(false);
    expect(clock.pendingTimers()).toBe(0);
  });

  test("continues after a forced child, each with its own timeout", async () => {
    const clock = new FakeClock();
    const a = fakeChild();
    const b = fakeChild();
    const p = stopChildrenInOrder(
      [
        { id: "a", handle: a.handle, timeoutMs: 100 },
        { id: "b", handle: b.handle, timeoutMs: 500 },
      ],
      clock,
    );
    await clock.advanceAsync(100);
    expect(b.aborts.length).toBe(1);
    await clock.advanceAsync(499);
    b.exit({ kind: "shutdown" });
    const res = await p;
    expect(res.get("a")!.forced).toBe(true);
    expect(res.get("b")!.forced).toBe(false);
    expect(clock.pendingTimers()).toBe(0);
  });

  test("abort throwing does not stop the rest", async () => {
    const clock = new FakeClock();
    const a = fakeChild({ abortThrows: new Error("x") });
    const b = fakeChild({ exitOnAbort: { kind: "shutdown" } });
    const res = await stopChildrenInOrder(
      [
        { id: "a", handle: a.handle, timeoutMs: 100 },
        { id: "b", handle: b.handle, timeoutMs: 100 },
      ],
      clock,
    );
    expect(res.get("a")!.forced).toBe(true);
    expect(res.get("b")).toEqual({ reason: { kind: "shutdown" }, forced: false });
  });

  test("empty list resolves to empty map", async () => {
    expect((await stopChildrenInOrder([], new FakeClock())).size).toBe(0);
  });
});
