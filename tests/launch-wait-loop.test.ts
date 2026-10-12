import { describe, test, expect } from "bun:test";
import { evaluateDaemonProgress } from "../src/commands/launch";

const agents = (...statuses: string[]) => statuses.map((status) => ({ status })) as any;

describe("evaluateDaemonProgress", () => {
  test("idle scheduler with completed agents is not finished (verification pending)", () => {
    const p = evaluateDaemonProgress("idle", agents("completed", "completed", "completed"));
    expect(p.finished).toBe(false);
  });

  test("idle scheduler with verified agents is not finished (merge pending)", () => {
    expect(evaluateDaemonProgress("idle", agents("verified", "merged")).finished).toBe(false);
  });

  test("idle scheduler with only merged/failed agents is finished and counts them", () => {
    const p = evaluateDaemonProgress("idle", agents("merged", "merged", "failed"));
    expect(p.finished).toBe(true);
    expect(p.merged).toBe(2);
    expect(p.failed).toBe(1);
    expect(p.done).toBe(3);
  });

  test("running scheduler is never finished", () => {
    expect(evaluateDaemonProgress("running", agents("merged")).finished).toBe(false);
  });

  test("fake daemon state sequence only finishes at the end", () => {
    const seq: Array<[any, string[]]> = [
      ["running", ["running", "running", "running"]],
      ["idle", ["completed", "completed", "completed"]],
      ["idle", ["verified", "completed", "completed"]],
      ["idle", ["merged", "verified", "completed"]],
      ["idle", ["merged", "failed", "merged"]],
    ];
    const results = seq.map(([s, a]) => evaluateDaemonProgress(s, agents(...a)).finished);
    expect(results).toEqual([false, false, false, false, true]);
  });

  test("shutdown ends the wait once nothing is running", () => {
    expect(evaluateDaemonProgress("shutdown", agents("completed")).finished).toBe(true);
    expect(evaluateDaemonProgress("shutdown", agents("running")).finished).toBe(false);
  });
});
