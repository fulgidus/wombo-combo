/**
 * verify-stage.ts — Build verification for the daemon.
 *
 * Extracted from agent-runner.ts as a behaviour-preserving move. Every
 * function takes an explicit VerifyStageContext; AgentRunner builds one and
 * keeps thin private wrappers.
 *
 * The build-failure retry branch is isolated in onVerifyFailed so the restart
 * policy can replace it in one place. Review-gate send-backs are not verify
 * failures and do not go through it.
 */

import type { ReviewConfig, WomboConfig } from "../../config";
import { normalizeReviewConfig } from "../../config";
import type { Task } from "../../lib/tasks";
import type { Quest } from "../../lib/quest";
import { FAKE_AGENT_SENTINEL } from "../../lib/launcher";
import { runBuild, runFullVerification } from "../../lib/verifier";
import { loadTestBaseline, type TestBaseline } from "../../lib/test-baseline";
import { verificationSummaryFromResult } from "../../lib/merge-report";
import type { VerificationSummary } from "../../lib/post-merge-types";
import { decideRestart } from "./restart-policy";
import type { DaemonState, InternalAgentState } from "../state";
import type { AnalyticsTracker } from "../analytics-tracker";

/**
 * Verification evidence for fake agents: nothing was actually built or tested,
 * so every check is explicitly skipped rather than passed.
 */
const FAKE_AGENT_VERIFICATION: VerificationSummary = {
  build: { status: "skipped", reason: "fake agent" },
  unitTests: { status: "skipped", reason: "fake agent" },
  browser: { status: "skipped", reason: "fake agent" },
};

/** Collaborators the verify stage needs from the AgentRunner. */
export interface VerifyStageContext {
  projectRoot: string;
  config: WomboConfig;
  state: DaemonState;
  analytics: AnalyticsTracker;
  loadTask(featureId: string): Task | null;
  resolveTaskQuestScope(
    task: Task | null,
    agent?: InternalAgentState,
  ): { quest: Quest; config: WomboConfig } | null;
  attemptMerge(featureId: string): Promise<void>;
  handleRetry(featureId: string): void;
  rescueChainPredecessors(featureId: string): void;
  /** Resolves true when the task may continue to "verified" and merge. */
  runReviewGate(featureId: string, reviewConfig: ReviewConfig, quest?: Quest): Promise<boolean>;
}

/**
 * True when a dependent task shares this agent's worktree — i.e. this agent
 * is a non-terminal member of an execution chain. Chain members defer their
 * merge to the chain terminal, whose branch tip carries all chain work.
 */
export function hasChainSuccessor(ctx: Pick<VerifyStageContext, "state">, featureId: string): boolean {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return false;
  // Scheduler-computed flag (primary): dependable in the incremental
  // submission flow where successors are not yet in daemon state when the
  // predecessor is created, so dependedOnBy would be empty.
  if (agent.hasChainSuccessor === true) return true;
  // Fallback for flows that bypass the scheduler (retry, recovery): scan
  // daemon state for a dependent sharing this agent's worktree.
  return (agent.dependedOnBy ?? []).some((succId) => {
    const succ = ctx.state.getAgent(succId);
    return succ !== undefined && succ.worktree === agent.worktree;
  });
}

/**
 * Build verification failed for a task: retry with the build error as context
 * while retries remain, otherwise fail it and unwind dependants. This is the
 * single place the restart policy replaces.
 */
export function onVerifyFailed(ctx: VerifyStageContext, featureId: string, summary: string): void {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return;
  const decision = decideRestart(featureId, agent, { kind: "verify-failed", error: summary });
  if (decision.action === "restart") {
    // Retry with build error context
    ctx.state.updateAgent(featureId, {
      retries: decision.attempt,
      error: `Build failed: ${summary.slice(0, 500)}`,
    });
    ctx.state.updateAgentStatus(
      featureId,
      "retry",
      `Build failed, retry ${agent.retries + 1}/${decision.max}` // QUIRK: agent already bumped, see restart-policy
    );
    ctx.handleRetry(featureId);
  } else {
    ctx.state.updateAgentStatus(featureId, "failed", "Build failed, retries exhausted");
    ctx.state.updateAgent(featureId, {
      error: `Build failed: ${summary.slice(0, 500)}`,
    });
    ctx.state.cancelDownstream(featureId);
    ctx.rescueChainPredecessors(featureId);
  }
}

export async function handleBuildVerification(ctx: VerifyStageContext, featureId: string): Promise<void> {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return;

  // Skip build verification for fake-agent tasks — go straight to merge
  if (agent.agentName === FAKE_AGENT_SENTINEL) {
    agent.buildPassed = true;
    ctx.state.updateAgent(featureId, { verification: FAKE_AGENT_VERIFICATION });
    // No actual build ran: zero build attempts. Measure before "verified"
    // makes chain successors eligible to reuse the worktree.
    ctx.analytics.measure(featureId);
    ctx.state.updateAgentStatus(featureId, "verified", "Build skipped (fake-agent)");
    if (hasChainSuccessor(ctx, featureId)) {
      ctx.state.updateAgentActivity(featureId, "chain member — deferring merge to chain terminal");
      return;
    }
    await ctx.attemptMerge(featureId);
    return;
  }

  ctx.state.updateAgentActivity(featureId, "Running build verification...");

  // Quest tasks verify with the quest's effective config and, when TDD is
  // enabled, against the established baseline. A missing or invalid
  // snapshot blocks verification — it is never recaptured from a modified
  // branch.
  let verifyConfig = ctx.config;
  let testBaseline: TestBaseline | undefined;
  const questScope = ctx.resolveTaskQuestScope(ctx.loadTask(featureId), agent);
  if (questScope) {
    verifyConfig = { ...questScope.config, baseBranch: agent.baseBranch };
    if (questScope.config.tdd?.enabled) {
      const loaded = loadTestBaseline(ctx.projectRoot, questScope.quest.id);
      if (loaded.status !== "ok") {
        const detail =
          loaded.status === "missing"
            ? `no snapshot at ${loaded.path}`
            : `${loaded.status}: ${loaded.error}`;
        const msg = `Test baseline for quest "${questScope.quest.id}" unavailable (${detail}); verification blocked`;
        agent.buildPassed = false;
        ctx.state.updateAgentStatus(featureId, "failed", msg);
        ctx.state.updateAgent(featureId, { error: msg });
        ctx.state.cancelDownstream(featureId);
        ctx.rescueChainPredecessors(featureId);
        return;
      }
      testBaseline = loaded.baseline;
    }
  }

  try {
    const result = await runFullVerification(agent.worktree, featureId, verifyConfig, {
      testBaseline,
    });
    ctx.state.updateAgent(featureId, { verification: verificationSummaryFromResult(result) });

    // Count the actual build result, independent of browser/TDD outcomes.
    ctx.analytics.recordBuild(featureId, result.build.passed);

    if (result.overallPassed) {
      const reviewConfig = normalizeReviewConfig(verifyConfig.review);
      if (reviewConfig.enabled && !(await ctx.runReviewGate(featureId, reviewConfig, questScope?.quest))) return;
      agent.buildPassed = true;
      agent.buildOutput = result.combinedErrorSummary || null;
      // Measure committed changes before "verified" is emitted: successors
      // can immediately reuse the shared worktree.
      ctx.analytics.measure(featureId);
      ctx.state.updateAgentStatus(featureId, "verified", "Build passed");

      ctx.state.emit("evt:build-result", {
        featureId,
        passed: true,
        output: result.combinedErrorSummary || undefined,
      });

      // Chain members defer their merge to the chain terminal
      if (hasChainSuccessor(ctx, featureId)) {
        ctx.state.updateAgentActivity(featureId, "chain member — deferring merge to chain terminal");
        return;
      }

      // Attempt merge
      await ctx.attemptMerge(featureId);
    } else {
      // Build failed
      agent.buildPassed = false;
      agent.buildOutput = result.combinedErrorSummary || null;

      ctx.state.emit("evt:build-result", {
        featureId,
        passed: false,
        output: result.combinedErrorSummary || undefined,
      });

      onVerifyFailed(ctx, featureId, result.combinedErrorSummary ?? "");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.analytics.reportDiagnostic(`verification of ${featureId} threw: ${msg}`);
    ctx.state.updateAgentStatus(featureId, "failed", `Verification error: ${msg}`);
    ctx.state.updateAgent(featureId, { error: msg });
    ctx.rescueChainPredecessors(featureId);
  }
}

/**
 * Run a build in a conflict-resolution tier, counting the invocation
 * exactly once. Exceptions are reported, counted as a failed attempt (never
 * a pass) and re-thrown so existing behavior is unchanged.
 */
export async function trackedBuild(
  ctx: Pick<VerifyStageContext, "config" | "analytics">,
  featureId: string,
  wtPath: string,
): Promise<Awaited<ReturnType<typeof runBuild>>> {
  try {
    const result = await runBuild(wtPath, ctx.config);
    ctx.analytics.recordBuild(featureId, result.passed);
    return result;
  } catch (err) {
    ctx.analytics.recordBuild(featureId, false);
    ctx.analytics.reportDiagnostic(
      `conflict-tier build for ${featureId} threw: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  }
}
