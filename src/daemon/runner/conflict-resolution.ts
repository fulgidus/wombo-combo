/**
 * conflict-resolution.ts — Tiered merge-conflict resolution for the daemon.
 *
 * Extracted from agent-runner.ts as a behaviour-preserving move. Every
 * function takes an explicit ConflictResolverContext; AgentRunner builds one
 * and keeps thin private wrappers. Callers run these inside the serialized
 * merge lifecycle (enqueueMerge): conflict resolution mutates shared git
 * state and is never restarted by a retry policy.
 *
 * Tier ordering: 1/2/2.5 (auto) -> 3 (LLM) -> 3.5 (rebase) -> 4 (re-run).
 * The tier 3/3.5/4 runners live in ./conflict-tiers.
 */

import type { MaxEscalationTier, WomboConfig } from "../../config";
import type { Task } from "../../lib/tasks";
import type { ResolvedRoute } from "../../lib/harness/routing";
import type { QuestPromptContext } from "../../lib/prompt";
import type { runBuild } from "../../lib/verifier";
import { mergeBaseIntoFeature, tieredMergeBaseIntoFeature, type MergeResult } from "../../lib/merger";
import type { Tier25Result } from "../../lib/conflict-hunks";
import type { DaemonState } from "../state";
import type { AnalyticsTracker } from "../analytics-tracker";
import { runTier3, runTier35, runTier4 } from "./conflict-tiers";

/** Collaborators the conflict-resolution tiers need from the AgentRunner. */
export interface ConflictResolverContext {
  config: WomboConfig;
  state: DaemonState;
  analytics: AnalyticsTracker;
  trackedBuild(featureId: string, wtPath: string): Promise<Awaited<ReturnType<typeof runBuild>>>;
  mergeIntoBase(featureId: string, branch: string, baseBranch: string): Promise<MergeResult>;
  handleMergeSuccess(featureId: string, commitHash: string | null, label: string): Promise<void>;
  buildQuestContext(): QuestPromptContext | undefined;
  conflictRoute(featureId: string, task: Task, model: string | undefined): ResolvedRoute | undefined;
}

/**
 * Thin wrapper around exec for simple git commands in the escalation pipeline.
 * Returns { ok, output } without throwing.
 */
export function runSafeCmd(cmd: string, cwd: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const { exec: execFn } = require("node:child_process");
    execFn(cmd, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }, (error: any, stdout: string, stderr: string) => {
      if (error) {
        resolve({ ok: false, output: stderr?.trim() || stdout?.trim() || error.message });
      } else {
        resolve({ ok: true, output: (stdout ?? "").trim() });
      }
    });
  });
}

/**
 * Check if a given conflict resolution tier is allowed by the maxEscalation config.
 */
export function isTierAllowed(tier: "tier3" | "tier3.5" | "tier4", maxEscalation: MaxEscalationTier): boolean {
  const tierOrder: MaxEscalationTier[] = ["tier3", "tier3.5", "tier4"];
  return tierOrder.indexOf(tier) <= tierOrder.indexOf(maxEscalation);
}

/**
 * Get git diffs for enriched conflict resolution context.
 */
export async function getConflictDiffs(
  wtPath: string,
  baseBranch: string,
  remote: string
): Promise<{ featureDiff: string; upstreamDiff: string }> {
  const mergeBaseResult = await runSafeCmd(`git merge-base HEAD "${remote}/${baseBranch}"`, wtPath);
  const mergeBase = mergeBaseResult.ok ? mergeBaseResult.output.trim() : "";

  let featureDiff = "";
  let upstreamDiff = "";

  if (mergeBase) {
    const fdResult = await runSafeCmd(`git diff "${mergeBase}...HEAD" --stat -p`, wtPath);
    featureDiff = fdResult.ok ? fdResult.output : "";

    const udResult = await runSafeCmd(`git diff "${mergeBase}...${remote}/${baseBranch}" --stat -p`, wtPath);
    upstreamDiff = udResult.ok ? udResult.output : "";
  }

  return { featureDiff, upstreamDiff };
}

/**
 * Handle a merge conflict: use tiered merge strategy.
 *
 * Tier 1/2/2.5: Handled by tieredMergeBaseIntoFeature (auto-resolve)
 * Tier 3: Enriched single-shot LLM resolve
 * Tier 3.5: Rebase strategy with per-commit LLM resolution
 * Tier 4: Nuclear re-run (re-implement from scratch)
 */
export async function handleMergeConflict(
  ctx: ConflictResolverContext,
  featureId: string,
  task: Task,
  mergeError: string
): Promise<void> {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return;

  const baseBranch = agent.baseBranch;

  try {
    // Tiered merge: attempts tier 1 (clean merge), tier 2 (trivial auto-resolve),
    // and tier 2.5 (surgical per-hunk resolution)
    const tieredResult = await tieredMergeBaseIntoFeature(
      agent.worktree,
      baseBranch,
      ctx.config
    );

    if (tieredResult.success && (tieredResult.tier === 1 || tieredResult.tier === 2 || tieredResult.tier === 2.5)) {
      // Tier 1, 2, or 2.5 resolved the conflicts — retry merge into base
      const tierLabel = tieredResult.tier === 1
        ? "base merged cleanly into feature"
        : tieredResult.tier === 2
        ? "trivial conflicts auto-resolved (whitespace only)"
        : `tier 2.5 surgical resolution (${tieredResult.tier25Result?.resolvedHunkCount ?? 0}/${tieredResult.tier25Result?.totalHunks ?? 0} hunks)`;

      ctx.state.updateAgentActivity(featureId, `${tierLabel} — retrying merge...`);
      const retryMerge = await ctx.mergeIntoBase(featureId, agent.branch, baseBranch);
      if (retryMerge.success) {
        const successLabel = tieredResult.tier === 1
          ? "MERGED after rebase"
          : tieredResult.tier === 2
          ? "MERGED after trivial auto-resolve"
          : "MERGED after tier 2.5 surgical resolution";
        await ctx.handleMergeSuccess(featureId, retryMerge.commitHash, successLabel);
        return;
      }

      // Retry still failed — escalate to tier 3+
      ctx.state.updateAgentActivity(featureId, `retry merge still failed after tier ${tieredResult.tier} — escalating...`);
      mergeError = retryMerge.error ?? mergeError;

      // Re-merge base into feature to get fresh conflict state for escalation
      const freshConflict = await mergeBaseIntoFeature(
        agent.worktree,
        baseBranch,
        ctx.config
      );
      const conflictFiles = freshConflict.conflicting ? freshConflict.files : [];

      await escalatingConflictResolution(ctx, featureId, task, mergeError, conflictFiles, tieredResult.tier25Result ?? null
      );
      return;
    }

    if (tieredResult.tier === null && tieredResult.error) {
      // Setup itself failed — stay as "verified" (retryable) with error
      ctx.state.updateAgentStatus(featureId, "verified", "Conflict setup failed");
      ctx.state.updateAgent(featureId, {
        error: `Conflict setup failed: ${tieredResult.error}`,
      });
      return;
    }

    // Tier 3+: Real conflicts remain after tiers 1, 2, 2.5
    ctx.state.updateAgentActivity(
      featureId,
      `${tieredResult.conflictFiles.length} non-trivial conflict(s) — escalating...`
    );

    await escalatingConflictResolution(ctx, featureId, task, mergeError,
      tieredResult.conflictFiles, tieredResult.tier25Result ?? null
    );
  } catch (conflictErr: any) {
    // Unexpected error during conflict handling — stay "verified" with error
    const msg = conflictErr instanceof Error ? conflictErr.message : String(conflictErr);
    ctx.state.updateAgentStatus(featureId, "verified", "Conflict resolution error");
    ctx.state.updateAgent(featureId, {
      error: `Conflict resolution error: ${msg}`,
    });
  }
}

/**
 * Escalating conflict resolution pipeline (Tiers 3 → 3.5 → 4).
 * Runs through tiers, stopping at the first success or when maxEscalation is reached.
 */
export async function escalatingConflictResolution(
  ctx: ConflictResolverContext,
  featureId: string,
  task: Task,
  mergeError: string,
  conflictFiles: string[],
  tier25Result: Tier25Result | null
): Promise<void> {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return;

  const maxEscalation = ctx.config.merge.maxEscalation;
  const model = ctx.state.getModel() ?? undefined;

  // ── Tier 3: Enriched single-shot LLM resolve ──────────────────────
  if (isTierAllowed("tier3", maxEscalation)) {
    ctx.state.updateAgentActivity(featureId, "tier 3: launching enriched LLM conflict resolver...");

    const tier3Result = await runTier3(ctx, featureId, task, model, mergeError, conflictFiles, tier25Result
    );

    if (tier3Result === "merged") return;
    if (tier3Result === "build-failed" || tier3Result === "merge-failed") {
      ctx.state.updateAgentActivity(featureId, `tier 3 failed (${tier3Result}) — checking escalation options...`);
    }
  }

  // ── Tier 3.5: Rebase strategy ─────────────────────────────────────
  if (isTierAllowed("tier3.5", maxEscalation)) {
    ctx.state.updateAgentActivity(featureId, "tier 3.5: attempting rebase strategy...");

    // Abort any in-progress merge to start fresh for rebase
    await runSafeCmd("git merge --abort", agent.worktree);

    const tier35Result = await runTier35(ctx, featureId, task, model);

    if (tier35Result === "merged") return;
    if (tier35Result === "failed") {
      ctx.state.updateAgentActivity(featureId, "tier 3.5 rebase strategy failed — checking escalation options...");
    }
  }

  // ── Tier 4: Nuclear re-run ────────────────────────────────────────
  if (isTierAllowed("tier4", maxEscalation)) {
    ctx.state.updateAgentActivity(featureId, "tier 4: nuclear re-run — re-implementing feature from scratch...");

    const tier4Result = await runTier4(ctx, featureId, task, model);

    if (tier4Result === "merged") return;
    ctx.state.updateAgentActivity(featureId, "tier 4 nuclear re-run failed");
  }

  // ── All tiers exhausted ───────────────────────────────────────────
  ctx.state.updateAgentStatus(
    featureId,
    "failed",
    `All conflict resolution tiers exhausted (max: ${maxEscalation})`
  );
  ctx.state.updateAgent(featureId, {
    error: `All conflict resolution tiers exhausted (max escalation: ${maxEscalation})`,
    completedAt: new Date().toISOString(),
  });
  ctx.state.cancelDownstream(featureId);
}
