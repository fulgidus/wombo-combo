/**
 * merge-stage.ts — Merge pipeline for the daemon.
 *
 * Extracted from agent-runner.ts as a behaviour-preserving move: pre-flight
 * check, merge into base, success handling (chain promotion, cleanup), and
 * post-merge publication (changelog / PR / auto-push).
 *
 * Merge and conflict resolution mutate shared git state (the base/quest
 * branch), so attemptMerge runs inside the single process-wide MergeQueue and
 * everything it calls (mergeIntoBase, handleMergeSuccess, the conflict tiers)
 * runs inside that queued section without re-acquiring it. No restart policy
 * applies to merges.
 */

import { execSync } from "node:child_process";
import { normalizePostMergeConfig, type WomboConfig } from "../../config";
import type { Task } from "../../lib/tasks";
import { removeWorktree } from "../../lib/worktree";
import {
  mergeBranch,
  mergeQueue,
  canMerge,
  pushBaseBranch,
  type MergeQueue,
  type MergeResult,
} from "../../lib/merger";
import { computeOperationId, runPostMerge, type PostMergeDeps } from "../../lib/post-merge";
import type { MergeReportTask, PostMergeResult, VerificationSummary } from "../../lib/post-merge-types";
import type { DaemonState, InternalAgentState } from "../state";
import type { AnalyticsTracker } from "../analytics-tracker";
import { runSafeCmd } from "./conflict-resolution";

/** Collaborators the merge stage needs from the AgentRunner. */
export interface MergeStageDeps {
  projectRoot: string;
  config: WomboConfig;
  state: DaemonState;
  analytics: AnalyticsTracker;
  postMergeDeps(): PostMergeDeps | undefined;
  runPostMerge: typeof runPostMerge;
  pushBaseBranch: typeof pushBaseBranch;
  /** Whether to push the base branch after merges (read at publish time). */
  autoPush(): boolean;
  loadTask(featureId: string): Task | null;
  getChainPredecessors(agent: InternalAgentState): InternalAgentState[];
  markFeatureDone(featureId: string, baseBranch: string, skipAncestryCheck?: boolean): void;
  handleMergeConflict(featureId: string, task: Task, mergeError: string): Promise<void>;
  /** Defaults to the process-wide queue shared with the `merge` command. */
  queue?: MergeQueue;
}

/** Persisted evidence for the report; legacy records only know the build. */
export function evidenceFor(agent: InternalAgentState): VerificationSummary {
  if (agent.verification) return agent.verification;
  const b = agent.buildPassed;
  return { build: { status: b === true ? "passed" : b === false ? "failed" : "unknown" } };
}

export class MergeStage {
  /** Destination-branch tip captured just before each merge, keyed by feature ID. */
  private mergeBefore = new Map<string, string | null>();

  constructor(private readonly deps: MergeStageDeps) {}

  private get queue(): MergeQueue {
    return this.deps.queue ?? mergeQueue;
  }

  async attemptMerge(featureId: string): Promise<void> {
    const { state, projectRoot } = this.deps;
    const agent = state.getAgent(featureId);
    if (!agent) return;

    await this.queue.enqueue(async () => {
      state.updateAgentActivity(featureId, "Merging...");

      try {
        // Pre-flight check
        const mergeCheck = await canMerge(projectRoot, agent.branch, agent.baseBranch);

        if (!mergeCheck.canMerge) {
          // Merge conflicts detected — enter tiered resolution
          state.updateAgentStatus(featureId, "resolving_conflict", "Merge conflicts detected");

          const feature = this.deps.loadTask(featureId);
          if (!feature) {
            state.updateAgentStatus(featureId, "failed", "Task not found for conflict resolution");
            return;
          }

          await this.deps.handleMergeConflict(featureId, feature, mergeCheck.reason ?? "merge conflicts");
          return;
        }

        const mergeResult = await this.mergeIntoBase(featureId, agent.branch, agent.baseBranch);

        if (mergeResult.success) {
          await this.handleMergeSuccess(featureId, mergeResult.commitHash, "MERGED");
        } else {
          // Direct merge failed unexpectedly (canMerge said OK but merge failed)
          const feature = this.deps.loadTask(featureId);
          if (feature) {
            await this.deps.handleMergeConflict(featureId, feature, mergeResult.error ?? "merge failed");
          } else {
            state.updateAgentStatus(featureId, "failed", `Merge error: ${mergeResult.error}`);
            state.updateAgent(featureId, { error: mergeResult.error ?? "merge failed" });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        state.updateAgentStatus(featureId, "failed", `Merge error: ${msg}`);
        state.updateAgent(featureId, { error: msg });
        state.emit("evt:merge-result", {
          featureId,
          success: false,
          error: msg,
        });
      }
    });
  }

  /**
   * Merge a feature branch into its base, remembering the base tip taken just
   * before the merge so post-merge reporting has explicit before/after SHAs.
   * Runs inside the caller's queued section (never acquires the queue).
   */
  async mergeIntoBase(featureId: string, branch: string, baseBranch: string): Promise<MergeResult> {
    const { projectRoot, config } = this.deps;
    const before = await runSafeCmd(`git rev-parse --verify "refs/heads/${baseBranch}"`, projectRoot);
    const result = await mergeBranch(projectRoot, branch, baseBranch, config);
    if (result.success) {
      this.mergeBefore.set(featureId, before.ok ? before.output.trim() : null);
    }
    return result;
  }

  /**
   * Handle a successful merge: mark merged, promote chain predecessors,
   * mark tasks done, clean up worktrees and branches, then run post-merge
   * publication (changelog / PR / explicitly requested push).
   *
   * Every successful merge path (direct merge and all conflict-escalation
   * tiers) funnels through here and awaits it, inside the serialized merge
   * lifecycle. Publication problems never change the agent's merged state.
   */
  async handleMergeSuccess(featureId: string, commitHash: string | null, label: string): Promise<void> {
    const { state, projectRoot, analytics } = this.deps;
    const agent = state.getAgent(featureId);
    if (!agent) return;

    // Capture publication evidence BEFORE cleanup deletes branches/worktrees.
    const chainPredecessors = this.deps.getChainPredecessors(agent);
    const reportTasks: MergeReportTask[] = [
      { id: agent.featureId, title: agent.taskTitle, verification: evidenceFor(agent) },
      ...chainPredecessors
        .filter((p) => p.status === "verified")
        .map((p) => ({ id: p.featureId, title: p.taskTitle, verification: evidenceFor(p) })),
    ];
    const beforeSha = this.mergeBefore.get(featureId) ?? null;
    this.mergeBefore.delete(featureId);
    const destination = agent.baseBranch;
    // Persist a best-effort diff (only if none was captured at verification)
    // before the worktree and branches are cleaned up below.
    analytics.captureBestEffort(featureId);

    state.updateAgentStatus(featureId, "merged", `${label} (${commitHash?.slice(0, 7)})`);
    state.updateAgent(featureId, {
      completedAt: new Date().toISOString(),
      mergeCommitHash: commitHash,
    });
    state.emit("evt:merge-result", { featureId, success: true });

    // Mark the task as done on disk
    this.deps.markFeatureDone(featureId, agent.baseBranch);

    // Walk back the chain and mark all deferred predecessors as merged.
    // Their work was carried forward through branch continuity and is now
    // included in the terminal merge — no separate merge needed.
    for (const predAgent of chainPredecessors) {
      if (predAgent.status === "verified") {
        state.updateAgentStatus(
          predAgent.featureId,
          "merged",
          `MERGED (via chain terminal ${featureId})`
        );
        state.updateAgent(predAgent.featureId, {
          completedAt: new Date().toISOString(),
          mergeCommitHash: commitHash,
        });
        this.deps.markFeatureDone(predAgent.featureId, predAgent.baseBranch, true);

        // Clean up predecessor branch — its commits are now reachable via
        // the terminal branch's merge into base.
        try {
          execSync(`git branch -D "${predAgent.branch}"`, {
            cwd: projectRoot,
            stdio: "pipe",
          });
        } catch {
          // Branch may already be gone
        }
      }
    }

    // Clean up worktree — but preserve it if downstream agents in the same
    // chain share this worktree (scheduler flag or live state scan).
    const hasChainSuccessor =
      agent.hasChainSuccessor === true ||
      agent.dependedOnBy.some((depId) => {
        const depAgent = state.getAgent(depId);
        return depAgent && depAgent.worktree === agent.worktree;
      });

    if (!hasChainSuccessor) {
      try {
        removeWorktree({ projectRoot, wtPath: agent.worktree, deleteBranch: true });
      } catch {
        // Stale worktrees waste disk space but aren't fatal
      }
    }

    await this.publishAfterMerge(featureId, destination, beforeSha, commitHash, reportTasks);
  }

  private log(level: "info" | "warn" | "error", message: string): void {
    this.deps.state.emit("evt:log", { level, message });
  }

  /**
   * Post-merge publication: changelog + (open/draft) push and PR via the
   * shared coordinator, then the explicitly requested auto-push when the
   * coordinator did not already own the push. Never throws.
   */
  async publishAfterMerge(
    featureId: string,
    destination: string,
    beforeSha: string | null,
    afterSha: string | null,
    tasks: MergeReportTask[]
  ): Promise<void> {
    const { projectRoot, config } = this.deps;
    const pm = normalizePostMergeConfig(config.postMerge);
    let published: PostMergeResult | null = null;

    try {
      let before = beforeSha;
      if (!before && afterSha) {
        // Fallback: first parent of the merge commit
        const parent = await runSafeCmd(`git rev-parse --verify "${afterSha}^1"`, projectRoot);
        before = parent.ok ? parent.output.trim() : null;
      }
      if (afterSha && before && before !== afterSha) {
        published = await this.deps.runPostMerge(
          {
            projectRoot,
            config,
            operation: {
              operationId: computeOperationId(destination, before, afterSha),
              destinationBranch: destination,
              beforeSha: before,
              afterSha,
              tasks,
            },
            mergeSucceeded: true,
          },
          this.deps.postMergeDeps()
        );
        this.logPublication(featureId, destination, published);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log("warn", `Post-merge publication for ${featureId} failed: ${msg}`);
    }

    // Explicitly requested auto-push. In open/draft mode the coordinator owns
    // the awaited push, so only push here when it did not attempt one.
    if (this.deps.autoPush()) {
      const coordinatorOwnedPush =
        pm.prMode !== "skip" &&
        published !== null &&
        (published.push.status === "pushed" || published.push.status === "failed");
      if (!coordinatorOwnedPush) {
        try {
          const ok = await this.deps.pushBaseBranch(projectRoot, destination, config);
          if (!ok) {
            this.log("warn", `Auto-push of ${destination} to ${config.git.remote} failed`);
          } else {
            this.log("info", `Auto-pushed ${destination} to ${config.git.remote}`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.log("warn", `Auto-push of ${destination} failed: ${msg}`);
        }
      }
    }
  }

  private logPublication(featureId: string, destination: string, r: PostMergeResult): void {
    const pr = r.pr.url ? `${r.pr.status} ${r.pr.url}` : r.pr.status;
    this.log(
      "info",
      `Post-merge ${featureId} (${destination}): changelog ${r.changelog.status}, push ${r.push.status}, PR ${pr}`
    );
    for (const w of r.warnings) this.log("warn", `Post-merge ${featureId}: ${w}`);
  }
}
