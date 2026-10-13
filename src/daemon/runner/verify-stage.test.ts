import { describe, test, expect } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState } from "../state";
import { DEFAULT_CONFIG } from "../../config";
import { hasChainSuccessor, onVerifyFailed, type VerifyStageContext } from "./verify-stage";

function setup(maxRetries: number) {
  const root = mkdtempSync(join(tmpdir(), "verify-stage-"));
  const state = new DaemonState(root);
  state.addAgent(
    createDaemonAgentState({
      featureId: "t1", taskTitle: "T", branch: "feature/t1", baseBranch: "main", worktree: join(root, "wt"), maxRetries,
    }),
  );
  const calls: string[] = [];
  const ctx = {
    projectRoot: root,
    config: DEFAULT_CONFIG,
    state,
    handleRetry: (id: string) => calls.push(`retry:${id}`),
    rescueChainPredecessors: (id: string) => calls.push(`rescue:${id}`),
  } as unknown as VerifyStageContext;
  return { root, state, ctx, calls };
}

describe("onVerifyFailed", () => {
  test("retries with build context while retries remain", () => {
    const { root, state, ctx, calls } = setup(2);
    onVerifyFailed(ctx, "t1", "boom");
    const agent = state.getAgent("t1")!;
    expect(agent.status).toBe("retry");
    expect(agent.retries).toBe(1);
    expect(agent.error).toBe("Build failed: boom");
    expect(calls).toEqual(["retry:t1"]);
    rmSync(root, { recursive: true, force: true });
  });

  test("fails and unwinds when retries are exhausted", () => {
    const { root, state, ctx, calls } = setup(0);
    onVerifyFailed(ctx, "t1", "x".repeat(600));
    const agent = state.getAgent("t1")!;
    expect(agent.status).toBe("failed");
    expect(agent.error).toBe(`Build failed: ${"x".repeat(500)}`);
    expect(calls).toEqual(["rescue:t1"]);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("hasChainSuccessor", () => {
  test("honours the scheduler flag and false for unknown tasks", () => {
    const { root, state } = setup(0);
    expect(hasChainSuccessor({ state }, "t1")).toBe(false);
    expect(hasChainSuccessor({ state }, "nope")).toBe(false);
    state.updateAgent("t1", { hasChainSuccessor: true });
    expect(hasChainSuccessor({ state }, "t1")).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });
});
