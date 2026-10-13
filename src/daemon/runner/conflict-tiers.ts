/**
 * conflict-tiers.ts — Tier 3 (enriched LLM), 3.5 (rebase) and 4 (re-run)
 * conflict runners, split out of conflict-resolution.ts to keep modules small.
 */

import type { Task, Feature } from "../../lib/tasks";
import { launchConflictResolver } from "../../lib/launcher";
import {
  generateConflictResolutionPrompt,
  generateTier4RerunPrompt,
  generateRebaseCommitPrompt,
  type ConflictResolutionContext,
} from "../../lib/prompt";
import {
  startRebaseStrategy,
  beginRebase,
  getRebaseConflicts,
  continueRebase,
  abortRebase,
  cleanupRebaseBranch,
  finalizeRebase,
} from "../../lib/merger";
import type { Tier25Result } from "../../lib/conflict-hunks";
import { getConflictDiffs, runSafeCmd, type ConflictResolverContext } from "./conflict-resolution";

/**
 * Tier 3: Enriched single-shot LLM resolve.
 * ONE attempt with structured hunks, contextual diffs, and feature description.
 */
export async function runTier3(
  ctx: ConflictResolverContext,
  featureId: string,
  task: Task,
  model: string | undefined,
  mergeError: string,
  conflictFiles: string[],
  tier25Result: Tier25Result | null
): Promise<"merged" | "build-failed" | "merge-failed"> {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return "merge-failed";

  const baseBranch = agent.baseBranch;

  // Gather contextual diffs
  const diffs = await getConflictDiffs(agent.worktree, baseBranch, ctx.config.git.remote);

  const conflictContext: ConflictResolutionContext = {
    tier25Result: tier25Result ?? undefined,
    featureDiff: diffs.featureDiff || undefined,
    upstreamDiff: diffs.upstreamDiff || undefined,
  };

  const questContext = ctx.buildQuestContext();

  const conflictPrompt = generateConflictResolutionPrompt(
    task as Feature, baseBranch, mergeError, ctx.config,
    questContext,
    conflictContext
  );

  ctx.state.updateAgentStatus(featureId, "resolving_conflict",
    `tier 3: resolving ${conflictFiles.length} conflict(s)...`
  );

  // Resolver token streams are not monitored: usage can only be partial.
  ctx.analytics.markUnmonitoredUsage(featureId);
  const resolverResult = launchConflictResolver({
    route: ctx.conflictRoute(featureId, task, model),
    worktreePath: agent.worktree,
    featureId: agent.featureId,
    prompt: conflictPrompt,
    model,
    config: ctx.config,
  });

  ctx.state.updateAgent(featureId, { pid: resolverResult.pid });

  // Wait for resolver to complete
  const resolverExitCode = await new Promise<number | null>((resolve) => {
    resolverResult.process.on("exit", (code) => resolve(code));
    resolverResult.process.on("error", () => resolve(null));
  });

  ctx.state.updateAgentActivity(featureId, `tier 3 resolver exited (code ${resolverExitCode}) — re-verifying build...`);

  // Re-verify build
  const rebuildResult = await ctx.trackedBuild(featureId, agent.worktree);
  if (!rebuildResult.passed) {
    ctx.state.updateAgentActivity(featureId, "tier 3 POST-CONFLICT BUILD FAILED");
    return "build-failed";
  }

  // Retry merge into base
  ctx.state.updateAgentActivity(featureId, "tier 3 build passed — retrying merge...");
  const retryMerge = await ctx.mergeIntoBase(featureId, agent.branch, baseBranch);
  if (retryMerge.success) {
    await ctx.handleMergeSuccess(featureId, retryMerge.commitHash, "MERGED after tier 3 enriched resolution");
    return "merged";
  }

  ctx.state.updateAgentActivity(featureId, `tier 3 POST-CONFLICT MERGE FAILED: ${retryMerge.error?.slice(0, 100)}`);
  return "merge-failed";
}

/**
 * Tier 3.5: Rebase strategy — replay commits one-at-a-time on a throwaway branch.
 */
export async function runTier35(
  ctx: ConflictResolverContext,
  featureId: string,
  task: Task,
  model: string | undefined
): Promise<"merged" | "failed"> {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return "failed";

  const baseBranch = agent.baseBranch;
  const featureBranch = agent.branch;

  // Start the rebase on a throwaway branch
  const rebaseSetup = await startRebaseStrategy(
    agent.worktree, featureBranch, baseBranch, agent.featureId, ctx.config
  );

  if (rebaseSetup.error) {
    ctx.state.updateAgentActivity(featureId, `tier 3.5 setup failed: ${rebaseSetup.error.slice(0, 100)}`);
    return "failed";
  }

  const { tempBranch, commitsToReplay } = rebaseSetup;
  ctx.state.updateAgentActivity(featureId, `tier 3.5: rebasing ${commitsToReplay.length} commit(s) on ${tempBranch}...`);

  // Start the rebase
  const rebaseResult = await beginRebase(agent.worktree, baseBranch, ctx.config);

  if (rebaseResult.clean) {
    // Rebase completed cleanly — finalize
    ctx.state.updateAgentActivity(featureId, "tier 3.5: rebase completed cleanly!");
    const finalizeResult = await finalizeRebase(agent.worktree, tempBranch, featureBranch);
    if (!finalizeResult.success) {
      ctx.state.updateAgentActivity(featureId, `tier 3.5 finalize failed: ${finalizeResult.error?.slice(0, 100)}`);
      await cleanupRebaseBranch(agent.worktree, tempBranch, featureBranch);
      return "failed";
    }

    // Retry merge into base
    const retryMerge = await ctx.mergeIntoBase(featureId, featureBranch, baseBranch);
    if (retryMerge.success) {
      await ctx.handleMergeSuccess(featureId, retryMerge.commitHash, "MERGED after tier 3.5 rebase");
      return "merged";
    }
    ctx.state.updateAgentActivity(featureId, `tier 3.5 merge after rebase failed: ${retryMerge.error?.slice(0, 100)}`);
    return "failed";
  }

  if (rebaseResult.error) {
    ctx.state.updateAgentActivity(featureId, `tier 3.5 rebase error: ${rebaseResult.error.slice(0, 100)}`);
    await abortRebase(agent.worktree);
    await cleanupRebaseBranch(agent.worktree, tempBranch, featureBranch);
    return "failed";
  }

  // Rebase paused at a conflict — handle per-commit resolution
  let commitIndex = 0;
  const maxCommits = commitsToReplay.length;

  while (true) {
    const conflicts = await getRebaseConflicts(agent.worktree);
    if (conflicts.length === 0) break; // No more conflicts

    commitIndex++;
    const currentCommit = commitsToReplay[Math.min(commitIndex - 1, maxCommits - 1)];
    ctx.state.updateAgentActivity(
      featureId,
      `tier 3.5: resolving conflict in commit ${commitIndex}/${maxCommits}: ${currentCommit?.message?.slice(0, 50) ?? "unknown"}...`
    );

    // Launch a per-commit resolver
    const commitPrompt = generateRebaseCommitPrompt(
      task as Feature,
      currentCommit?.message ?? "unknown",
      currentCommit?.hash ?? "unknown",
      conflicts,
      maxCommits,
      commitIndex,
      ctx.config
    );

    ctx.analytics.markUnmonitoredUsage(featureId);
    const resolverResult = launchConflictResolver({
      route: ctx.conflictRoute(featureId, task, model),
      worktreePath: agent.worktree,
      featureId: agent.featureId,
      prompt: commitPrompt,
      model,
      config: ctx.config,
    });

    ctx.state.updateAgent(featureId, { pid: resolverResult.pid });

    // Wait for resolver
    const exitCode = await new Promise<number | null>((resolve) => {
      resolverResult.process.on("exit", (code) => resolve(code));
      resolverResult.process.on("error", () => resolve(null));
    });

    ctx.state.updateAgentActivity(featureId, `tier 3.5 commit resolver exited (code ${exitCode})`);

    // Check if conflicts are resolved
    const remainingConflicts = await getRebaseConflicts(agent.worktree);
    if (remainingConflicts.length > 0) {
      // Resolver didn't fully resolve — abort the whole rebase
      ctx.state.updateAgentActivity(featureId, `tier 3.5: resolver failed to resolve commit ${commitIndex} — aborting rebase`);
      await abortRebase(agent.worktree);
      await cleanupRebaseBranch(agent.worktree, tempBranch, featureBranch);
      return "failed";
    }

    // Continue the rebase
    const continueResult = await continueRebase(agent.worktree);
    if (continueResult.done) {
      break; // Rebase complete
    }
    if (continueResult.error) {
      ctx.state.updateAgentActivity(featureId, `tier 3.5 continue error: ${continueResult.error.slice(0, 100)}`);
      await abortRebase(agent.worktree);
      await cleanupRebaseBranch(agent.worktree, tempBranch, featureBranch);
      return "failed";
    }
    // If not clean, loop back to handle the next conflict
  }

  // Rebase completed — finalize
  ctx.state.updateAgentActivity(featureId, `tier 3.5: rebase completed after resolving ${commitIndex} conflict(s)`);

  const finalizeResult = await finalizeRebase(agent.worktree, tempBranch, featureBranch);
  if (!finalizeResult.success) {
    ctx.state.updateAgentActivity(featureId, `tier 3.5 finalize failed: ${finalizeResult.error?.slice(0, 100)}`);
    await cleanupRebaseBranch(agent.worktree, tempBranch, featureBranch);
    return "failed";
  }

  // Verify build after rebase
  const rebuildResult = await ctx.trackedBuild(featureId, agent.worktree);
  if (!rebuildResult.passed) {
    ctx.state.updateAgentActivity(featureId, "tier 3.5 POST-REBASE BUILD FAILED");
    return "failed";
  }

  // Retry merge into base
  const retryMerge = await ctx.mergeIntoBase(featureId, featureBranch, baseBranch);
  if (retryMerge.success) {
    await ctx.handleMergeSuccess(featureId, retryMerge.commitHash, "MERGED after tier 3.5 rebase");
    return "merged";
  }

  ctx.state.updateAgentActivity(featureId, `tier 3.5 merge after rebase failed: ${retryMerge.error?.slice(0, 100)}`);
  return "failed";
}

/**
 * Tier 4: Nuclear re-run — re-implement the feature from scratch.
 * Creates a fresh worktree state from the current base branch and re-launches.
 */
export async function runTier4(
  ctx: ConflictResolverContext,
  featureId: string,
  task: Task,
  model: string | undefined
): Promise<"merged" | "failed"> {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return "failed";

  const baseBranch = agent.baseBranch;

  // Get the feature's diff (what it changed vs the merge base)
  const diffResult = await runSafeCmd(
    `git log --format="" -p "${ctx.config.git.remote}/${baseBranch}..${agent.branch}"`,
    agent.worktree
  );
  const featureDiff = diffResult.ok ? diffResult.output : "(diff unavailable)";

  // Abort any in-progress merge/rebase
  await runSafeCmd("git merge --abort", agent.worktree);
  await runSafeCmd("git rebase --abort", agent.worktree);

  // Reset the worktree to a clean state on the base branch
  await runSafeCmd(`git fetch ${ctx.config.git.remote} "${baseBranch}"`, agent.worktree);
  const resetResult = await runSafeCmd(`git reset --hard "${ctx.config.git.remote}/${baseBranch}"`, agent.worktree);
  if (!resetResult.ok) {
    ctx.state.updateAgentActivity(featureId, `tier 4: failed to reset worktree to base: ${resetResult.output.slice(0, 100)}`);
    return "failed";
  }

  // The reset invalidated the original baseline: capture a replacement one.
  // Verification timestamps and duration are intentionally left unchanged.
  ctx.analytics.captureReplacementBaseline(featureId);

  ctx.state.updateAgentActivity(featureId, "tier 4: re-implementing feature from scratch...");

  // Generate the tier 4 prompt
  const questContext = ctx.buildQuestContext();
  const rerunPrompt = generateTier4RerunPrompt(
    task as Feature, baseBranch, featureDiff, ctx.config,
    questContext
  );

  // Launch the agent
  ctx.analytics.markUnmonitoredUsage(featureId);
  const resolverResult = launchConflictResolver({
    route: ctx.conflictRoute(featureId, task, model),
    worktreePath: agent.worktree,
    featureId: agent.featureId,
    prompt: rerunPrompt,
    model,
    config: ctx.config,
  });

  ctx.state.updateAgent(featureId, { pid: resolverResult.pid });

  // Wait for completion
  const exitCode = await new Promise<number | null>((resolve) => {
    resolverResult.process.on("exit", (code) => resolve(code));
    resolverResult.process.on("error", () => resolve(null));
  });

  ctx.state.updateAgentActivity(featureId, `tier 4 agent exited (code ${exitCode}) — verifying build...`);

  // Verify build
  const rebuildResult = await ctx.trackedBuild(featureId, agent.worktree);
  if (!rebuildResult.passed) {
    ctx.state.updateAgentActivity(featureId, "tier 4 BUILD FAILED");
    return "failed";
  }

  // Commit if the agent didn't already
  await runSafeCmd("git add -A", agent.worktree);
  await runSafeCmd(
    `git diff --cached --quiet || git commit -m "feat(${agent.featureId}): re-implement ${task.title} (tier 4)"`,
    agent.worktree
  );

  // Measure the replacement implementation after its commit and before
  // merge cleanup can remove the worktree/branch.
  ctx.analytics.measure(featureId, "replacement");

  // Merge into base
  ctx.state.updateAgentActivity(featureId, "tier 4 build passed — merging into base...");
  const retryMerge = await ctx.mergeIntoBase(featureId, agent.branch, baseBranch);
  if (retryMerge.success) {
    await ctx.handleMergeSuccess(featureId, retryMerge.commitHash, "MERGED after tier 4 nuclear re-run");
    return "merged";
  }

  ctx.state.updateAgentActivity(featureId, `tier 4 MERGE FAILED: ${retryMerge.error?.slice(0, 100)}`);
  return "failed";
}
