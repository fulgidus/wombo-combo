import { describe, test, expect } from "bun:test";
import { MergeQueue } from "../src/lib/merger";
import { evidenceFor } from "../src/daemon/runner/merge-stage";

const tick = () => new Promise<void>((r) => setTimeout(r, 5));

describe("MergeQueue", () => {
  test("two concurrent merges never overlap", async () => {
    const queue = new MergeQueue();
    let active = 0;
    let maxActive = 0;
    const order: string[] = [];
    const job = (name: string) => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      order.push(`start:${name}`);
      await tick();
      order.push(`end:${name}`);
      active--;
      return name;
    };

    const results = await Promise.all([queue.enqueue(job("a")), queue.enqueue(job("b")), queue.enqueue(job("c"))]);

    expect(results).toEqual(["a", "b", "c"]);
    expect(maxActive).toBe(1);
    expect(order).toEqual(["start:a", "end:a", "start:b", "end:b", "start:c", "end:c"]);
  });

  test("a rejected merge does not block the next one", async () => {
    const queue = new MergeQueue();
    const failing = queue.enqueue(async () => {
      await tick();
      throw new Error("boom");
    });
    const next = queue.enqueue(async () => "ok");

    await expect(failing).rejects.toThrow("boom");
    expect(await next).toBe("ok");
  });
});

describe("evidenceFor", () => {
  const base = { verification: undefined } as any;

  test("returns persisted verification when present", () => {
    const verification = { build: { status: "passed" } } as any;
    expect(evidenceFor({ ...base, verification })).toBe(verification);
  });

  test("falls back to legacy buildPassed", () => {
    expect(evidenceFor({ ...base, buildPassed: true })).toEqual({ build: { status: "passed" } });
    expect(evidenceFor({ ...base, buildPassed: false })).toEqual({ build: { status: "failed" } });
    expect(evidenceFor({ ...base, buildPassed: null })).toEqual({ build: { status: "unknown" } });
  });
});
