import { describe, test, expect } from "bun:test";
import { systemClock } from "../src/lib/supervision/clock";
import { crash, NORMAL, SHUTDOWN } from "../src/lib/supervision/types";

describe("exit reason helpers", () => {
  test("NORMAL and SHUTDOWN are the expected kinds", () => {
    expect(NORMAL).toEqual({ kind: "normal" });
    expect(SHUTDOWN).toEqual({ kind: "shutdown" });
  });

  test("crash wraps the error", () => {
    const err = new Error("boom");
    const reason = crash(err);
    expect(reason.kind).toBe("crash");
    if (reason.kind === "crash") expect(reason.error).toBe(err);
  });
});

describe("systemClock", () => {
  test("now() is monotonic non-decreasing and increments over time", async () => {
    const a = systemClock.now();
    await new Promise((r) => setTimeout(r, 15));
    expect(systemClock.now()).toBeGreaterThan(a);
  });

  test("setTimeout fires the callback", async () => {
    let fired = false;
    systemClock.setTimeout(() => {
      fired = true;
    }, 5);
    await new Promise((r) => setTimeout(r, 30));
    expect(fired).toBe(true);
  });

  test("clearTimeout cancels the callback", async () => {
    let fired = false;
    const h = systemClock.setTimeout(() => {
      fired = true;
    }, 5);
    systemClock.clearTimeout(h);
    await new Promise((r) => setTimeout(r, 30));
    expect(fired).toBe(false);
  });
});
