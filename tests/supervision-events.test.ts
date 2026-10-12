import { describe, test, expect } from "bun:test";
import { TypedEmitter, type SupervisorEmitter } from "../src/lib/supervision/events";
import type { SupervisorEvents } from "../src/lib/supervision/types";

interface Ev {
  a: { n: number };
  b: string;
}

describe("TypedEmitter", () => {
  test("on delivers payloads and unsubscribe stops delivery", () => {
    const em = new TypedEmitter<Ev>();
    const got: number[] = [];
    const off = em.on("a", (p) => got.push(p.n));
    em.emit("a", { n: 1 });
    expect(em.listenerCount("a")).toBe(1);
    off();
    em.emit("a", { n: 2 });
    expect(got).toEqual([1]);
    expect(em.listenerCount("a")).toBe(0);
  });

  test("off removes a specific listener", () => {
    const em = new TypedEmitter<Ev>();
    const got: string[] = [];
    const l = (p: string) => got.push(p);
    em.on("b", l);
    em.off("b", l);
    em.emit("b", "x");
    expect(got).toEqual([]);
  });

  test("once fires a single time", () => {
    const em = new TypedEmitter<Ev>();
    let calls = 0;
    em.once("b", () => calls++);
    em.emit("b", "x");
    em.emit("b", "y");
    expect(calls).toBe(1);
    expect(em.listenerCount("b")).toBe(0);
  });

  test("once can be unsubscribed before firing", () => {
    const em = new TypedEmitter<Ev>();
    let calls = 0;
    const off = em.once("b", () => calls++);
    off();
    em.emit("b", "x");
    expect(calls).toBe(0);
  });

  test("throwing listener does not break others and is reported", () => {
    const errors: Array<{ event: string; error: unknown }> = [];
    const em = new TypedEmitter<Ev>((event, error) => errors.push({ event, error }));
    const got: string[] = [];
    em.on("b", () => {
      throw new Error("boom");
    });
    em.on("b", (p) => got.push(p));
    expect(() => em.emit("b", "x")).not.toThrow();
    expect(got).toEqual(["x"]);
    expect(errors.length).toBe(1);
    expect(errors[0]!.event).toBe("b");
  });

  test("throwing onListenerError handler is swallowed", () => {
    const em = new TypedEmitter<Ev>(() => {
      throw new Error("handler");
    });
    const got: string[] = [];
    em.on("b", () => {
      throw new Error("boom");
    });
    em.on("b", (p) => got.push(p));
    expect(() => em.emit("b", "x")).not.toThrow();
    expect(got).toEqual(["x"]);
  });

  test("removal during emit neither skips nor double-calls", () => {
    const em = new TypedEmitter<Ev>();
    const calls: string[] = [];
    const offs: Array<() => void> = [];
    offs.push(
      em.on("b", () => {
        calls.push("first");
        offs[0]!();
        offs[1]!();
      }),
    );
    offs.push(em.on("b", () => calls.push("second")));
    em.on("b", () => calls.push("third"));
    em.emit("b", "x");
    expect(calls).toEqual(["first", "second", "third"]);
    em.emit("b", "y");
    expect(calls).toEqual(["first", "second", "third", "third"]);
  });

  test("listeners added during emit run only on next emit", () => {
    const em = new TypedEmitter<Ev>();
    const calls: string[] = [];
    em.once("b", () => em.on("b", () => calls.push("late")));
    em.emit("b", "x");
    expect(calls).toEqual([]);
    em.emit("b", "y");
    expect(calls).toEqual(["late"]);
  });

  test("same listener registered twice is called twice", () => {
    const em = new TypedEmitter<Ev>();
    let calls = 0;
    const l = () => calls++;
    em.on("b", l);
    em.on("b", l);
    em.emit("b", "x");
    expect(calls).toBe(2);
  });

  test("payload typing for SupervisorEmitter", () => {
    const em: SupervisorEmitter = new TypedEmitter<SupervisorEvents>();
    let seen = "";
    em.on("child_started", (p) => {
      seen = `${p.supervisor}/${p.childId}/${p.attempt}`;
    });
    const payload = { supervisor: "s", childId: "c", attempt: 1 } satisfies SupervisorEvents["child_started"];
    em.emit("child_started", payload);
    expect(seen).toBe("s/c/1");
    // @ts-expect-error wrong payload shape
    em.emit("child_started", { supervisor: "s" });
    // @ts-expect-error unknown event
    em.emit("nope", {});
  });
});
