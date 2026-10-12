import { describe, test, expect } from "bun:test";
import {
  computeBackoff,
  shouldResetAttempt,
  DEFAULT_BACKOFF,
  DEFAULT_BACKOFF_RESET_MS,
} from "../src/lib/supervision/backoff";

const opts = { initialMs: 100, maxMs: 5000, factor: 2 };

describe("computeBackoff", () => {
  test("attempt 1 yields initialMs", () => {
    expect(computeBackoff(1, opts)).toBe(100);
  });
  test("grows exponentially", () => {
    expect(computeBackoff(2, opts)).toBe(200);
    expect(computeBackoff(4, opts)).toBe(800);
  });
  test("caps at maxMs", () => {
    expect(computeBackoff(10, opts)).toBe(5000);
    expect(computeBackoff(1000, opts)).toBe(5000);
  });
  test("attempt < 1 is treated as 1", () => {
    expect(computeBackoff(0, opts)).toBe(100);
    expect(computeBackoff(-3, opts)).toBe(100);
  });
  test("factor < 1 is treated as 1", () => {
    expect(computeBackoff(5, { ...opts, factor: 0.5 })).toBe(100);
  });
  test("jitter bounds with random 0 / 0.5 / 1", () => {
    const j = { ...opts, jitter: 0.5 };
    expect(computeBackoff(2, j, () => 0)).toBe(100);
    expect(computeBackoff(2, j, () => 0.5)).toBe(200);
    expect(computeBackoff(2, j, () => 1)).toBe(300);
  });
  test("jitter result is clamped to [0, maxMs]", () => {
    expect(computeBackoff(10, { ...opts, jitter: 1 }, () => 1)).toBe(5000);
    expect(computeBackoff(1, { ...opts, jitter: 2 }, () => 0)).toBe(0);
  });
  test("no jitter ignores random", () => {
    expect(computeBackoff(3, opts, () => 1)).toBe(400);
  });
  test("defaults", () => {
    expect(DEFAULT_BACKOFF).toEqual({ initialMs: 100, maxMs: 5000, factor: 2, jitter: 0 });
    expect(DEFAULT_BACKOFF_RESET_MS).toBe(10000);
  });
});

describe("shouldResetAttempt", () => {
  test("true at or above threshold", () => {
    expect(shouldResetAttempt(10000, 10000)).toBe(true);
    expect(shouldResetAttempt(20000, 10000)).toBe(true);
  });
  test("false below threshold", () => {
    expect(shouldResetAttempt(9999, 10000)).toBe(false);
  });
});
