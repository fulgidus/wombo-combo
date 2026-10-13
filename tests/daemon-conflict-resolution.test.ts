import { describe, test, expect } from "bun:test";
import {
  escalatingConflictResolution,
  handleMergeConflict,
  isTierAllowed,
  runSafeCmd,
  type ConflictResolverContext,
} from "../src/daemon/runner/conflict-resolution";

function fakeState(agent: any | undefined) {
  const calls: Array<[string, ...unknown[]]> = [];
  return {
    calls,
    state: {
      getAgent: () => agent,
      getModel: () => null,
      updateAgentActivity: (...a: unknown[]) => calls.push(["activity", ...a]),
      updateAgentStatus: (...a: unknown[]) => calls.push(["status", ...a]),
      updateAgent: (...a: unknown[]) => calls.push(["update", ...a]),
      cancelDownstream: (...a: unknown[]) => calls.push(["cancel", ...a]),
    },
  };
}

describe("isTierAllowed", () => {
  test("respects escalation ordering", () => {
    expect(isTierAllowed("tier3", "tier3")).toBe(true);
    expect(isTierAllowed("tier3.5", "tier3")).toBe(false);
    expect(isTierAllowed("tier4", "tier4")).toBe(true);
  });
});

describe("runSafeCmd", () => {
  test("returns ok with trimmed output", async () => {
    expect(await runSafeCmd("echo hi", process.cwd())).toEqual({ ok: true, output: "hi" });
  });
  test("returns not ok without throwing", async () => {
    const r = await runSafeCmd("exit 3", process.cwd());
    expect(r.ok).toBe(false);
  });
});

describe("escalatingConflictResolution", () => {
  test("is a no-op when the agent is unknown", async () => {
    const { state, calls } = fakeState(undefined);
    const ctx = { config: { merge: { maxEscalation: "tier3" } }, state } as unknown as ConflictResolverContext;
    await escalatingConflictResolution(ctx, "x", {} as any, "err", [], null);
    expect(calls).toEqual([]);
  });

  test("fails the agent when no tier is allowed to succeed (resolver exits, build fails)", async () => {
    const agent = { featureId: "x", worktree: "/nonexistent-wt", branch: "feature/x", baseBranch: "main" };
    const { state, calls } = fakeState(agent);
    const ctx = {
      config: { merge: { maxEscalation: "tier3" }, git: { remote: "origin" } },
      state,
      analytics: { markUnmonitoredUsage: () => {} },
      trackedBuild: async () => ({ passed: false }),
      buildQuestContext: () => undefined,
      conflictRoute: () => ({ __throw: true }),
    } as unknown as ConflictResolverContext;
    // launchConflictResolver with a bogus route/worktree either throws or fails;
    // either way the pipeline must not report a merge.
    await escalatingConflictResolution(ctx, "x", { id: "x", title: "t" } as any, "err", ["a.ts"], null).catch(() => {});
    expect(calls.some((c) => c[0] === "status" && c[2] === "merged")).toBe(false);
  });
});

describe("handleMergeConflict", () => {
  test("is a no-op when the agent is unknown", async () => {
    const { state, calls } = fakeState(undefined);
    await handleMergeConflict({ state } as unknown as ConflictResolverContext, "x", {} as any, "err");
    expect(calls).toEqual([]);
  });
});
