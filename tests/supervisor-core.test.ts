import { describe, test, expect } from "bun:test";
import {
  createRestartTracker,
  createSupervisedChild,
  type ExitReason,
} from "../src/lib/supervisor-core";

const crash: ExitReason = { kind: "crash", error: "boom" };
const hang: ExitReason = { kind: "hang", idleMs: 1000 };
const verifyFailed: ExitReason = { kind: "verify-failed", error: "build" };

describe("createRestartTracker", () => {
  test("normal exit never restarts", () => {
    const t = createRestartTracker({ maxRestarts: 5 });
    expect(t.decide({ kind: "normal" })).toEqual({ action: "stop-normal" });
    expect(t.restarts).toBe(0);
  });

  test("crash restarts up to maxRestarts then gives up", () => {
    const t = createRestartTracker({ maxRestarts: 2 });
    expect(t.decide(crash)).toEqual({ action: "restart", attempt: 1, max: 2 });
    expect(t.decide(hang)).toEqual({ action: "restart", attempt: 2, max: 2 });
    expect(t.decide(verifyFailed)).toEqual({ action: "give-up", reason: "intensity" });
    expect(t.restarts).toBe(2);
  });

  test("maxRestarts 0 gives up immediately", () => {
    const t = createRestartTracker({ maxRestarts: 0 });
    expect(t.decide(crash)).toEqual({ action: "give-up", reason: "intensity" });
  });

  test("rehydrates from an initial restart count", () => {
    const t = createRestartTracker({ maxRestarts: 2, initialRestarts: 1 });
    expect(t.decide(crash)).toEqual({ action: "restart", attempt: 2, max: 2 });
    expect(t.decide(crash).action).toBe("give-up");
    const done = createRestartTracker({ maxRestarts: 2, initialRestarts: 2 });
    expect(done.decide(crash).action).toBe("give-up");
  });

  test("matches retries < maxRetries counter semantics", () => {
    for (let max = 0; max < 4; max++) {
      for (let retries = 0; retries <= max + 1; retries++) {
        const t = createRestartTracker({ maxRestarts: max, initialRestarts: retries });
        expect(t.decide(crash).action === "restart").toBe(retries < max);
      }
    }
  });
});

describe("createSupervisedChild", () => {
  function make(shutdown: () => Promise<void> | void, onShutdownError?: (e: unknown) => void) {
    let started = 0;
    const child = createSupervisedChild({
      id: "a",
      policy: "transient",
      start: () => { started++; },
      shutdown,
      onShutdownError,
    });
    return { child, started: () => started };
  }

  test("exposes id, policy and start", async () => {
    const { child, started } = make(() => {});
    await child.start();
    expect(child.id).toBe("a");
    expect(child.policy).toBe("transient");
    expect(started()).toBe(1);
  });

  test("shutdown hook runs once and stop is idempotent", async () => {
    let calls = 0;
    const { child } = make(() => { calls++; });
    await child.stop();
    await child.stop();
    await Promise.all([child.stop(), child.stop()]);
    expect(calls).toBe(1);
  });

  test("shutdown error is contained and reported", async () => {
    const errors: unknown[] = [];
    const { child } = make(() => { throw new Error("cleanup failed"); }, (e) => errors.push(e));
    await child.stop();
    await child.stop();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("cleanup failed");
  });

  test("async shutdown rejection is contained", async () => {
    const errors: unknown[] = [];
    const { child } = make(async () => { throw new Error("async fail"); }, (e) => errors.push(e));
    await expect(child.stop()).resolves.toBeUndefined();
    expect(errors).toHaveLength(1);
  });

  test("onShutdownError throwing is also contained", async () => {
    const { child } = make(() => { throw new Error("x"); }, () => { throw new Error("y"); });
    await expect(child.stop()).resolves.toBeUndefined();
  });
});
