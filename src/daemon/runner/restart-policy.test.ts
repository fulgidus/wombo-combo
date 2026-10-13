import { describe, test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState } from "../state";
import { decideRestart, dropRestartTracker, mayRestart, onProcessFailed } from "./restart-policy";

function setup(maxRetries: number, retries = 0) {
  const root = mkdtempSync(join(tmpdir(), "restart-policy-"));
  const state = new DaemonState(root);
  state.addAgent(
    createDaemonAgentState({
      featureId: "t1", taskTitle: "T", branch: "feature/t1", baseBranch: "main", worktree: join(root, "wt"), maxRetries,
    }),
  );
  state.updateAgent("t1", { retries });
  const calls: string[] = [];
  const ctx = {
    state,
    handleRetry: (id: string) => calls.push(`retry:${id}`),
    rescueChainPredecessors: (id: string) => calls.push(`rescue:${id}`),
  };
  return { state, ctx, calls };
}

describe("mayRestart", () => {
  test("true below the bound, false at it", () => {
    expect(mayRestart({ retries: 1, maxRetries: 2 })).toBe(true);
    expect(mayRestart({ retries: 2, maxRetries: 2 })).toBe(false);
  });
});

describe("decideRestart", () => {
  test("normal exit never restarts and consumes nothing", () => {
    expect(decideRestart("n1", { retries: 0, maxRetries: 2 }, { kind: "normal" }).action).toBe("stop-normal");
  });
  test("rehydrates from persisted retries", () => {
    const d = decideRestart("n2", { retries: 1, maxRetries: 2 }, { kind: "hang", idleMs: 1 });
    expect(d).toEqual({ action: "restart", attempt: 2, max: 2 });
    dropRestartTracker("n2");
  });
});

describe("onProcessFailed", () => {
  test("crash restarts with Retry N/M message and relaunches", () => {
    const { state, ctx, calls } = setup(2);
    onProcessFailed(ctx as never, "t1", "boom");
    const a = state.getAgent("t1")!;
    expect(a.status).toBe("retry");
    expect(a.retries).toBe(1);
    expect(a.error).toBe("boom");
    expect(calls).toEqual(["retry:t1"]);
  });
  test("exhausted intensity fails the agent and unwinds dependants", () => {
    const { state, ctx, calls } = setup(1, 1);
    onProcessFailed(ctx as never, "t1", "boom");
    const a = state.getAgent("t1")!;
    expect(a.status).toBe("failed");
    expect(a.retries).toBe(1);
    expect(calls).toEqual(["rescue:t1"]);
  });
  test("usage-limit pauses scheduler without burning retries", () => {
    const { state, ctx, calls } = setup(2);
    let pausedReason: string | undefined;
    let pausedAutoResume: number | null | undefined;
    let alertRaised: string | undefined;
    (ctx as any).pauseScheduler = (reason: string, autoResumeMs?: number | null) => {
      pausedReason = reason;
      pausedAutoResume = autoResumeMs;
      calls.push(`pause:${reason}`);
    };
    (ctx as any).raiseNeedsYouAlert = (_id: string, text: string) => {
      alertRaised = text;
      calls.push(`alert:${text}`);
    };

    const limit = {
      isLimit: true as const,
      kind: "weekly_limit" as const,
      message: "You have hit your weekly limit, resets Oct 15, 7pm",
      resetsAt: new Date(1760547600000),
      resetsAtMs: 1760547600000,
      resetRaw: "Oct 15, 7pm",
    };

    onProcessFailed(ctx as never, "t1", limit.message, { kind: "usage-limit", error: limit.message, usageLimit: limit });

    const a = state.getAgent("t1")!;
    expect(a.status).toBe("retry");
    expect(a.retries).toBe(0); // retries untouched!
    expect(a.error).toBe(limit.message);
    expect(pausedReason).toContain("Oct 15, 7pm");
    expect(pausedAutoResume).toBe(1760547600000);
    expect(alertRaised).toContain("Usage limit reached");
    expect(calls.some((c) => c.startsWith("pause:"))).toBe(true);
    expect(calls.some((c) => c.startsWith("alert:"))).toBe(true);
    expect(calls).not.toContain("retry:t1");
  });
});

