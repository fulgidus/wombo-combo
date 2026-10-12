import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import {
  AttributionTripped,
  attributionBreakerPath,
  clearAttributionTrip,
  readAttributionTrip,
  writeAttributionTrip,
} from "../src/lib/sync/attribution-breaker";
import { makeRepo } from "./helpers/git-repo";

let root: string;
beforeEach(() => {
  root = makeRepo();
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("attribution breaker state", () => {
  test("reads null when nothing was recorded", () => {
    expect(readAttributionTrip(root)).toBeNull();
  });

  test("round-trips a trip and clears it", () => {
    const trip = { trippedAt: "2026-01-01T00:00:00.000Z", ref: "t1", issue: 3, comment: 7 };
    writeAttributionTrip(root, trip);
    expect(readAttributionTrip(root)).toEqual(trip);
    clearAttributionTrip(root);
    expect(readAttributionTrip(root)).toBeNull();
    expect(existsSync(attributionBreakerPath(root))).toBe(false);
  });

  test("corrupt state reads as null", async () => {
    writeAttributionTrip(root, { trippedAt: "x", ref: "t1" });
    await Bun.write(attributionBreakerPath(root), "{nope");
    expect(readAttributionTrip(root)).toBeNull();
  });

  test("AttributionTripped carries the trip and a clear message", () => {
    const err = new AttributionTripped({ trippedAt: "x", ref: "t1", issue: 2 });
    expect(err.trip.ref).toBe("t1");
    expect(err.message).toContain("issue #2");
  });
});
