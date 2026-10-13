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
  test("repeated crashes count up then give up", () => {
    const { state, ctx, calls } = setup(2);
    onProcessFailed(ctx as never, "t1", "a");
    onProcessFailed(ctx as never, "t1", "b");
    onProcessFailed(ctx as never, "t1", "c");
    expect(state.getAgent("t1")!.retries).toBe(2);
    expect(state.getAgent("t1")!.status).toBe("failed");
    expect(calls).toEqual(["retry:t1", "retry:t1", "rescue:t1"]);
  });
});
