/**
 * agent-runner.ts — Agent lifecycle management for the daemon.
 *
 * Wraps the existing launch, monitoring, verification, merge, and retry logic
 * from src/commands/launch.ts into a clean interface that the scheduler calls.
 *
 * Responsibilities:
 * - Accept task submissions and manage the full lifecycle:
 *   worktree creation → agent launch → monitoring → build verification → merge
 * - Process monitoring via ProcessMonitor
 * - Build verification and tiered merge conflict resolution
 * - Retry logic with session reuse
 * - Chain predecessor rescue on failure
 * - Merge serialization via the merge stage's MergeQueue
 * - Dead process reaping
 */

import { execSync, spawnSync } from "node:child_process";
import { normalizeCommentsConfig, type ReviewConfig, replayRetentionOptions, type WomboConfig } from "../config";
import type { Task, Feature } from "../lib/tasks";
import { loadFeatures, parseDurationMinutes } from "../lib/tasks";
import { resolveTaskModel } from "../lib/task-weight";
import { resolveRoute, RouteError, type ResolvedRoute, type RouteSelection } from "../lib/harness/routing";
import { saveTaskToStore } from "../lib/task-store";
import { installDeps, worktreePath, featureBranchName } from "../lib/worktree";
import { isProcessRunning, FAKE_AGENT_SENTINEL } from "../lib/launcher";
import { ProcessMonitor } from "../lib/monitor";
import type { MonitorCallbacks } from "../lib/monitor";
import {
  generatePrompt,
  type QuestPromptContext,
} from "../lib/prompt";
import { runBuild } from "../lib/verifier";
import { pushBaseBranch } from "../lib/merger";
import { runPostMerge, type PostMergeDeps } from "../lib/post-merge";
import { handleMergeConflict, type ConflictResolverContext } from "./runner/conflict-resolution";
import { MergeStage } from "./runner/merge-stage";
import { SpawnMonitorStage } from "./runner/spawn-monitor";
import { AgentShutdown } from "./runner/agent-shutdown";
import { resolveAgentRoute, selectRoute, conflictRoute, type RouteOperation } from "./runner/routes";
import { resolveTaskQuestScope, buildSessionQuestContext } from "./runner/quest-scope";
import { loadTestBaseline, type TestBaseline } from "../lib/test-baseline";
import type { Quest } from "../lib/quest";
import type { DaemonState, InternalAgentState } from "./state";
import { createDaemonAgentState } from "./state";
import { AnalyticsTracker } from "./analytics-tracker";
import { ReplayRecorder } from "./replay-recorder";
import { addComment } from "../lib/comments";
import type { ReviewerOutput } from "../lib/review-runner";
import { captureWorktreeDiff } from "../lib/replay-diff";
import { runReviewGate, type ReviewGateContext, type ReviewStageDeps } from "./review-stage";
import { FeedbackStore } from "./runner/feedback-store";
import { mayRestart } from "./runner/restart-policy";
import { handleBuildVerification, trackedBuild, type VerifyStageContext } from "./runner/verify-stage";
import { claimTask, isTeamEnabled, releaseTask } from "../lib/claims";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Diff of the worktree against its merge base with the task's base branch. */
function defaultCaptureReviewDiff(worktree: string, baseBranch: string): string {
  const mb = spawnSync("git", ["merge-base", "HEAD", baseBranch], { cwd: worktree, encoding: "utf-8" });
  const base = mb.status === 0 ? (mb.stdout ?? "").trim() : baseBranch;
  return captureWorktreeDiff(worktree, base || null).diff;
}

export interface AgentRunnerConfig {
  projectRoot: string;
  config: WomboConfig;
  /** Injectable runner/clock for the post-merge coordinator (tests) */
  postMergeDeps?: PostMergeDeps;
  /** Injectable collaborators for post-merge handling (tests) */
  overrides?: {
    runPostMerge?: typeof runPostMerge;
    pushBaseBranch?: typeof pushBaseBranch;
    /** Run the reviewer agent for a prompt (default: launch through the "review" route) */
    runReviewer?: (prompt: string, featureId: string) => Promise<ReviewerOutput>;
    /** Task diff against its base for review (default: git diff from the merge base) */
    captureReviewDiff?: ReviewStageDeps["captureDiff"];
  };
  /**
   * Daemon session id (also the history wave_id). Newly submitted executions
   * are attributed to this wave in analytics.
   */
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// AgentRunner
// ---------------------------------------------------------------------------

export class AgentRunner {
  private projectRoot: string;
  private config: WomboConfig;
  private state: DaemonState;
  private monitor: ProcessMonitor;
  /** Shared read-only scope for the route and quest-scope helpers. */
  private readonly ctx: { projectRoot: string; config: WomboConfig; state: DaemonState };
  /** Spawn/monitor stage: launch, monitor callbacks, relaunch. */
  private readonly spawnMonitor: SpawnMonitorStage;

  /** Per-agent shutdown hook: kill, capture analytics, remove worktree/branch. */
  private readonly shutdown: AgentShutdown;

  /** Durable per-execution analytics (lifecycle, retries, usage). */
  readonly analytics: AnalyticsTracker;
  /** Per-execution session replay recording (prompt, events, final diff). */
  readonly replay: ReplayRecorder;

  /** Session-scoped agent-name override (CLI --agent). null = use task.agent. */
  private agentOverride: string | null = null;

  /** Auto-push the base branch to origin after merges (CLI --auto-push). */
  private autoPush = false;

  private maxRetriesOverride: number | null = null;

  /** Post-merge coordinator wiring (overridable in tests). */
  private postMergeDeps: PostMergeDeps | undefined;
  private runPostMergeFn: typeof runPostMerge;
  private pushBaseFn: typeof pushBaseBranch;

  /** Merge pipeline (serialized through one MergeQueue). */
  private readonly mergeStage: MergeStage;

  /** Review rounds already started per task (review gate) */
  private reviewRounds = new Map<string, number>();
  /** Findings to hand to the implementing agent on its next retry */
  private reviewFeedback: FeedbackStore;
  private readonly runReviewerFn?: (prompt: string, featureId: string) => Promise<ReviewerOutput>;
  private readonly captureReviewDiffFn: ReviewStageDeps["captureDiff"];

  /** Stagger delay between concurrent launch starts (ms). */
  private static readonly LAUNCH_STAGGER_MS = 250;

  /** Queue for staggered launches. */
  private launchQueue: Array<{ fn: () => Promise<void>; skipStagger: boolean }> = [];
  private isProcessingQueue = false;

  constructor(opts: AgentRunnerConfig, state: DaemonState) {
    this.projectRoot = opts.projectRoot;
    this.config = opts.config;
    this.state = state;
    this.reviewFeedback = new FeedbackStore(state);
    this.postMergeDeps = opts.postMergeDeps;
    this.runPostMergeFn = opts.overrides?.runPostMerge ?? runPostMerge;
    this.pushBaseFn = opts.overrides?.pushBaseBranch ?? pushBaseBranch;
    this.runReviewerFn = opts.overrides?.runReviewer;
    this.captureReviewDiffFn = opts.overrides?.captureReviewDiff ?? defaultCaptureReviewDiff;

    this.analytics = new AnalyticsTracker({
      projectRoot: this.projectRoot,
      state,
      waveId: opts.sessionId ?? `runner-${new Date().toISOString().replace(/[:.]/g, "-")}`,
      onDiagnostic: (message) =>
        state.emit("evt:log", { level: "warn", message: `[analytics] ${message}` }),
    });
    this.mergeStage = new MergeStage({
      projectRoot: this.projectRoot,
      config: this.config,
      state,
      analytics: this.analytics,
      // Resolved lazily: tests swap these on the runner after construction.
      postMergeDeps: () => this.postMergeDeps,
      runPostMerge: (input, deps) => this.runPostMergeFn(input, deps),
      pushBaseBranch: (root, branch, cfg) => this.pushBaseFn(root, branch, cfg),
      autoPush: () => this.autoPush,
      loadTask: (id) => this.loadTask(id),
      getChainPredecessors: (agent) => this.getChainPredecessors(agent),
      markFeatureDone: (id, base, skip) => this.markFeatureDone(id, base, skip),
      handleMergeConflict: (id, task, err) => this.handleMergeConflict(id, task, err),
    });

    this.replay = new ReplayRecorder({
      projectRoot: this.projectRoot,
      state,
      retention: replayRetentionOptions(this.config.replay),
      onDiagnostic: (message) =>
        state.emit("evt:log", { level: "warn", message: `[replay] ${message}` }),
    });

    // Team mode: claim a task when its agent starts, release when it ends
    state.observeStatus((agent, previous, next) => this.syncClaim(agent.featureId, previous, next));

    // Comments: optional system comments on lifecycle events
    state.observeStatus((agent, previous, next, detail) =>
      this.postLifecycleComment(agent.featureId, previous, next, detail ?? agent.error ?? undefined)
    );

    this.ctx = { projectRoot: this.projectRoot, config: this.config, state };
    this.shutdown = new AgentShutdown({
      projectRoot: this.projectRoot,
      state,
      killProcess: (id) => { this.spawnMonitor.untrack(id); this.monitor.remove(id); },
      captureAnalytics: (id) => this.analytics.captureBestEffort(id),
      resetTaskToPlanned: (id) => this.resetTaskToPlanned(id),
    });
    // A new execution (submit, retry, user retry) gets a fresh shutdown hook
    state.observeStatus((agent, _previous, next) => {
      if (next === "queued" || next === "installing" || next === "running") this.shutdown.reset(agent.featureId);
    });
    this.spawnMonitor = new SpawnMonitorStage({
      ...this.ctx,
      analytics: this.analytics,
      replay: this.replay,
      // Resolved lazily: tests swap these on the runner after construction.
      monitor: () => this.monitor,
      reviewFeedback: this.reviewFeedback,
      loadTask: (id) => this.loadTask(id),
      relaunch: (id) => this.handleRetry(id),
      handleBuildVerification: (id) => this.handleBuildVerification(id),
      rescueChainPredecessors: (id) => this.rescueChainPredecessors(id),
      giveUp: (id) => { void this.shutdown.shutdown(id, { phase: "fail" }); },
      pauseScheduler: (reason, autoResumeMs) => this.onPauseScheduler?.(reason, autoResumeMs),
    });

    // Create monitor with daemon-integrated callbacks
    this.monitor = new ProcessMonitor(this.projectRoot, this.buildCallbacks());
  }

  /**
   * Keep the task claim in step with the agent lifecycle (no-op unless
   * team.enabled). Claim when launch starts, release once merged or failed.
   * Claim errors never break the pipeline.
   */
  private syncClaim(featureId: string, previous: string, next: string): void {
    if (!isTeamEnabled(this.config)) return;
    try {
      if (next === "installing" && previous !== "installing") {
        const res = claimTask(this.projectRoot, this.config, featureId);
        if (!res.ok) {
          this.state.emit("evt:log", {
            level: "warn",
            message: `[team] ${featureId} is claimed by ${res.claim.owner}; launching anyway`,
          });
        }
      } else if (next === "merged" || next === "failed") {
        releaseTask(this.projectRoot, this.config, featureId);
      }
    } catch (err) {
      this.state.emit("evt:log", {
        level: "warn",
        message: `[team] claim sync failed for ${featureId}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  /**
   * Post a role=system comment (author "woco") on started, failed, merged and
   * retried (no-op unless comments.enabled && comments.autoLifecycle).
   * Comment errors only log a warning.
   */
  private postLifecycleComment(featureId: string, previous: string, next: string, detail?: string): void {
    const cfg = normalizeCommentsConfig(this.config.comments);
    if (!cfg.enabled || !cfg.autoLifecycle) return;
    let body: string | null = null;
    if (next === "installing" && previous !== "installing") body = "Agent started.";
    else if (next === "merged") body = "Merged into the base branch.";
    else if (next === "retry") body = `Retrying${detail ? `: ${detail}` : "."}`;
    else if (next === "failed") {
      const reason = (detail ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
      body = `Failed${reason ? `: ${reason}` : "."}`;
    }
    if (!body) return;
    try {
      addComment(this.projectRoot, { kind: "task", id: featureId }, { body, author: "woco", role: "system" });
    } catch (err) {
      this.state.emit("evt:log", {
        level: "warn",
        message: `[comments] lifecycle comment failed for ${featureId}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private buildCallbacks(): MonitorCallbacks {
    return this.spawnMonitor.buildCallbacks();
  }

  // -------------------------------------------------------------------------
  // Task submission (called by Scheduler)
  // -------------------------------------------------------------------------

  /** Set a session-scoped agent-name override (CLI --agent parity). */
  setAgentOverride(name: string | null): void {
    this.agentOverride = name;
  }

  /** Enable auto-push of the base branch after successful merges (CLI --auto-push). */
  setAutoPush(enabled: boolean): void {
    this.autoPush = enabled;
  }

  /** Set a session-scoped max-retries override (CLI --max-retries parity). */
  setMaxRetries(n: number | null): void {
    this.maxRetriesOverride = n;
  }

  private onPauseScheduler?: (reason: string, autoResumeMs?: number | null) => void;

  /** Wire scheduler pause callback for backoff / usage limit pauses. */
  setPauseScheduler(fn: ((reason: string, autoResumeMs?: number | null) => void) | undefined): void {
    this.onPauseScheduler = fn;
  }

  /**
   * Submit a new task for execution. Creates agent state, worktree, and launches.
   *
   * @param ctx chain context from the scheduler's schedule plan: non-head
   * members of a dependency stream share the stream head's worktree, so the
   * chain runs sequentially in one worktree and merges once at the terminal.
   */
  submitTask(
    task: Task,
    ctx?: { sharedWorktree?: string; streamIndex?: number; hasChainSuccessor?: boolean },
  ): void {
    const config = this.config;
    const branch = featureBranchName(task.id, config);
    const wt = ctx?.sharedWorktree ?? worktreePath(this.projectRoot, task.id, config);
    const baseBranch = this.resolveBaseBranch(task);

    // Per-task model routing: the weight-class table (config.modelRouting)
    // wins over the session model so heavy tasks get capable models and
    // light tasks don't waste them.
    // With agentProfiles/routing configured the profile's own model wins; the
    // legacy chain (modelRouting, then session model) still applies otherwise.
    let model: string | null;
    let route: ResolvedRoute | null = null;
    try {
      route = resolveRoute(config, { operation: "code", task, sessionModel: this.state.getModel() });
      model = route.model;
    } catch (err) {
      // Unknown profile etc.: keep the legacy model; doLaunch re-resolves and reports the error
      if (!(err instanceof RouteError)) throw err;
      model = resolveTaskModel(task, config.modelRouting, this.state.getModel());
    }

    const agentState = createDaemonAgentState({
      featureId: task.id,
      taskTitle: task.title,
      branch,
      baseBranch,
      worktree: wt,
      maxRetries: this.maxRetriesOverride ?? config.defaults.maxRetries,
      dependsOn: task.depends_on,
      dependedOnBy: this.findDependents(task.id),
      agentName: this.agentOverride ?? task.agent ?? null,
      agentType: task.agent_type ?? null,
      streamIndex: ctx?.streamIndex ?? null,
      hasChainSuccessor: ctx?.hasChainSuccessor ?? false,
      model,
      profile: route?.profile ?? null,
      harness: route?.harness ?? null,
      effortEstimateMs: parseDurationMinutes(task.effort) * 60_000,
    });

    // Allocate a new analytics execution on every submission.
    this.analytics.allocate(agentState, {
      questId: task.quest ?? null,
      agentId: agentState.agentName,
      model: model ?? this.state.getModel(),
    });

    this.shutdown.reset(task.id);
    this.state.addAgent(agentState);

    // Queue the launch (staggered to avoid SQLite races for real agents)
    this.enqueueLaunch(() => this.doLaunch(task.id, task), agentState.agentName === FAKE_AGENT_SENTINEL);
  }

  /** Launch a queued agent that's already in state (used for dependency-unblocked agents). */
  launchAgent(featureId: string): void {
    const agent = this.state.getAgent(featureId);
    if (!agent || agent.status !== "queued") return;

    // Load the task from disk
    const task = this.loadTask(featureId);
    if (!task) {
      this.state.updateAgentStatus(featureId, "failed", "Task not found on disk");
      return;
    }

    this.enqueueLaunch(() => this.doLaunch(featureId, task), agent.agentName === FAKE_AGENT_SENTINEL);
  }

  // -------------------------------------------------------------------------
  // Launch pipeline
  // -------------------------------------------------------------------------

  private doLaunch(featureId: string, task: Task): Promise<void> {
    return this.spawnMonitor.doLaunch(featureId, task);
  }

  // -------------------------------------------------------------------------
  // Build verification and review gate — see runner/verify-stage, review-stage
  // -------------------------------------------------------------------------

  private verifyContext(): VerifyStageContext {
    return {
      projectRoot: this.projectRoot,
      config: this.config,
      state: this.state,
      analytics: this.analytics,
      loadTask: this.loadTask.bind(this),
      resolveTaskQuestScope: this.resolveTaskQuestScope.bind(this),
      attemptMerge: this.attemptMerge.bind(this),
      handleRetry: this.handleRetry.bind(this),
      rescueChainPredecessors: this.rescueChainPredecessors.bind(this),
      runReviewGate: this.runReviewGate.bind(this),
    };
  }

  private reviewGateContext(): ReviewGateContext {
    return {
      projectRoot: this.projectRoot,
      config: this.config,
      state: this.state,
      reviewRounds: this.reviewRounds,
      reviewFeedback: this.reviewFeedback,
      runReviewer: this.runReviewerFn,
      captureDiff: this.captureReviewDiffFn,
      loadTask: this.loadTask.bind(this),
      selectRoute: this.selectRoute.bind(this),
      handleRetry: this.handleRetry.bind(this),
      rescueChainPredecessors: this.rescueChainPredecessors.bind(this),
    };
  }

  private handleBuildVerification(featureId: string): Promise<void> {
    return handleBuildVerification(this.verifyContext(), featureId);
  }

  private runReviewGate(featureId: string, reviewConfig: ReviewConfig, quest?: Quest): Promise<boolean> {
    return runReviewGate(this.reviewGateContext(), featureId, reviewConfig, quest);
  }

  private trackedBuild(featureId: string, wtPath: string): Promise<Awaited<ReturnType<typeof runBuild>>> {
    return trackedBuild({ config: this.config, analytics: this.analytics }, featureId, wtPath);
  }

  // -------------------------------------------------------------------------
  // Merge — see runner/merge-stage (serialized behind one MergeQueue)
  // -------------------------------------------------------------------------

  private attemptMerge(featureId: string): Promise<void> {
    return this.mergeStage.attemptMerge(featureId);
  }

  /**
   * Mark a task as "done" on disk. Optionally skips git ancestry check
   * (used when we already know the merge succeeded and the branch ref may
   * have been deleted).
   */
  private markFeatureDone(
    featureId: string,
    baseBranch: string,
    skipAncestryCheck = false
  ): void {
    try {
      if (!skipAncestryCheck) {
        const branch = featureBranchName(featureId, this.config);

        // Check if the branch ref even exists before testing ancestry.
        let branchExists = true;
        try {
          execSync(`git rev-parse --verify "${branch}"`, {
            cwd: this.projectRoot,
            stdio: "pipe",
          });
        } catch {
          branchExists = false;
        }

        if (branchExists) {
          // Verify baseBranch is a valid ref before testing ancestry.
          // If baseBranch doesn't exist (e.g. a deleted quest branch), skip
          // the check — we can't confirm ancestry but shouldn't block the update.
          let baseBranchExists = true;
          try {
            execSync(`git rev-parse --verify "${baseBranch}"`, {
              cwd: this.projectRoot,
              stdio: "pipe",
            });
          } catch {
            baseBranchExists = false;
          }

          if (baseBranchExists) {
            try {
              execSync(
                `git merge-base --is-ancestor "${branch}" "${baseBranch}"`,
                { cwd: this.projectRoot, stdio: "pipe" }
              );
            } catch {
              // Not an ancestor — refuse to mark as done
              return;
            }
          }
        }
        // Branch ref is gone — can't verify ancestry, but the branch was
        // likely already cleaned up after merge, so proceed.
      }

      const data = loadFeatures(this.projectRoot, this.config);
      const feature = data.tasks.find((f: Feature) => f.id === featureId);
      if (feature && feature.status !== "done") {
        feature.status = "done";
        feature.completion = 100;
        feature.ended_at = new Date().toISOString();
        saveTaskToStore(this.projectRoot, this.config, feature);
      }
    } catch {
      // Non-fatal — don't crash the pipeline
    }
  }

  // -------------------------------------------------------------------------
  // Merge conflict resolution (tiered escalation) — see runner/conflict-resolution
  // -------------------------------------------------------------------------

  private conflictContext(): ConflictResolverContext {
    return {
      config: this.config,
      state: this.state,
      analytics: this.analytics,
      trackedBuild: this.trackedBuild.bind(this),
      mergeIntoBase: (id, branch, base) => this.mergeStage.mergeIntoBase(id, branch, base),
      handleMergeSuccess: (id, hash, label) => this.mergeStage.handleMergeSuccess(id, hash, label),
      buildQuestContext: this.buildQuestContext.bind(this),
      conflictRoute: this.conflictRoute.bind(this),
    };
  }

  private handleMergeConflict(featureId: string, task: Task, mergeError: string): Promise<void> {
    return handleMergeConflict(this.conflictContext(), featureId, task, mergeError);
  }

  private resolveTaskQuestScope(
    task: Task | null,
    agent?: InternalAgentState
  ): { quest: Quest; config: WomboConfig } | null {
    return resolveTaskQuestScope(this.ctx, task, agent);
  }

  private buildQuestContext(): QuestPromptContext | undefined {
    return buildSessionQuestContext(this.ctx);
  }

  // -------------------------------------------------------------------------
  // Retry
  // -------------------------------------------------------------------------

  private handleRetry(featureId: string): void {
    this.spawnMonitor.relaunch(featureId);
  }

  // -------------------------------------------------------------------------
  // Chain predecessor helpers
  // -------------------------------------------------------------------------

  /**
   * Walk back through chain predecessors (agents sharing the same worktree
   * via depends_on links). Returns predecessors in reverse order (immediate
   * predecessor first, chain root last).
   */
  private getChainPredecessors(agent: InternalAgentState): InternalAgentState[] {
    const predecessors: InternalAgentState[] = [];
    let current: InternalAgentState | undefined = agent;

    while (current && current.dependsOn.length > 0) {
      const predId = current.dependsOn[0]; // Follow first dependency
      const pred = this.state.getAgent(predId);
      if (!pred || pred.worktree !== agent.worktree) break;
      predecessors.push(pred);
      current = pred;
    }

    return predecessors;
  }

  /**
   * Rescue verified chain predecessors when a chain member fails.
   *
   * If the failed agent has deferred-merge predecessors, merges the most
   * recent verified predecessor's branch so its work isn't stranded.
   * The predecessor's branch tip carries all earlier chain work, so one
   * merge rescues the entire verified portion of the chain.
   */
  private rescueChainPredecessors(failedFeatureId: string): void {
    const agent = this.state.getAgent(failedFeatureId);
    if (!agent) return;

    const predecessors = this.getChainPredecessors(agent);
    const verifiedPred = predecessors.find((p) => p.status === "verified");
    if (verifiedPred) {
      // Attempt merge of the verified predecessor
      this.attemptMerge(verifiedPred.featureId).catch(() => {
        // If rescue merge fails too, nothing more we can do
      });
    }
  }

  // -------------------------------------------------------------------------
  // Process management
  // -------------------------------------------------------------------------

  /** Register the token collector's per-agent context (quest, model). */
  private registerUsageContext(featureId: string, route?: ResolvedRoute): void {
    this.spawnMonitor.registerUsageContext(featureId, route);
  }

  private resolveAgentRoute(
    operation: RouteOperation,
    featureId: string,
    task: Task | null | undefined,
    sessionModel?: string | null,
  ): ResolvedRoute {
    return resolveAgentRoute(this.ctx, operation, featureId, task, sessionModel);
  }

  private selectRoute(operation: RouteOperation, featureId: string, task: Task | null, sessionModel?: string | null): RouteSelection {
    return selectRoute(this.ctx, operation, featureId, task, sessionModel);
  }

  private conflictRoute(featureId: string, task: Task, model: string | undefined): ResolvedRoute | undefined {
    return conflictRoute(this.ctx, featureId, task, model);
  }

  /** Restore persisted analytics snapshots (call before startup reconciliation). */
  restoreAnalytics(): void {
    this.analytics.restore();
  }

  /** Finish unfinished executions as interrupted and stop recording (shutdown). */
  interruptAnalytics(reason: string): void {
    this.analytics.interruptAll(reason);
    this.analytics.close();
    this.replay.interruptAll(reason);
    this.replay.close();
  }

  /** Cancel an agent: shut it down and discard its worktree and branch. */
  cancelAgent(featureId: string): void {
    this.analytics.markStopRequested(featureId, "cancelled");
    this.replay.markStopRequested(featureId);
    void this.shutdown.shutdown(featureId, { phase: "stop", removeWorktree: true });
  }

  /**
   * After a cancelled agent's dependents were failed, drop a chain worktree
   * that had to be kept for them while they were still live.
   */
  releaseCancelledWorktree(featureId: string): void {
    this.shutdown.releaseWorktree(featureId);
  }

  /** Kill all running agents and discard their worktrees and branches. */
  async killAll(): Promise<void> {
    // Mark executions stopped first so exit callbacks from the killed
    // processes cannot alter their snapshots.
    this.analytics.interruptAll("killed");
    this.replay.interruptAll("killed");
    this.spawnMonitor.dispose();
    this.monitor.killAll();
    // Wait for processes to actually die
    await this.monitor.waitAll(500);
    const releasing = new Set(this.state.getAllAgents().map((a) => a.featureId));
    for (const agent of this.state.getAgentsByStatus("running", "installing", "retry")) {
      void this.shutdown.shutdown(agent.featureId, { phase: "stop", removeWorktree: true, releasing });
    }
  }

  /** Detect dead agent processes and handle them. */
  reapDeadProcesses(): void {
    // Reset task back to "planned" so the scheduler picks it up again and
    // remove the agent from state (scheduler re-submits from disk).
    const reap = (featureId: string) =>
      void this.shutdown.shutdown(featureId, { phase: "reap", resetTask: true, removeWorktree: true, removeAgent: true });

    for (const agent of this.state.getAgentsByStatus("running", "installing")) {
      if (agent.pid && !isProcessRunning(agent.pid)) {
        this.state.emit("evt:log", { level: "warn", message: `Agent ${agent.featureId} PID ${agent.pid} is dead — reaping` });
        reap(agent.featureId);
      }
    }

    // Safety net: agents stuck in "retry" with no process
    for (const agent of this.state.getAgentsByStatus("retry")) {
      if (!agent.pid || !isProcessRunning(agent.pid)) {
        if (!mayRestart(agent)) {
          reap(agent.featureId);
        } else {
          this.state.updateAgentStatus(agent.featureId, "queued", "Re-queuing stuck retry");
        }
      }
    }
  }

  /**
   * On daemon startup, reset any task files with status "in_progress" that
   * have no corresponding active agent in state back to "planned".
   *
   * These are orphans left behind by a previous daemon crash or kill.  They
   * would otherwise never be picked up because the scheduler's getReadyTasks()
   * only selects tasks with status "planned".
   */
  reconcileOrphanedTasks(): void {
    let data: ReturnType<typeof loadFeatures>;
    try {
      data = loadFeatures(this.projectRoot, this.config);
    } catch {
      return; // best-effort
    }

    for (const task of data.tasks) {
      if (task.status !== "in_progress") continue;

      // If the daemon has an active agent for this task, leave it alone.
      const agent = this.state.getAgent(task.id);
      if (agent) continue;

      // No agent — orphan.  Reset to planned so scheduler picks it up.
      try {
        task.status = "planned";
        task.started_at = null;
        saveTaskToStore(this.projectRoot, this.config, task);
        this.state.emit("evt:log", {
          level: "info",
          message: `Reconciled orphaned task ${task.id} → planned`,
        });
      } catch { /* best-effort */ }
    }
  }

  /**
   * On daemon startup, re-trigger the merge pipeline for any agents that were
   * left in "completed" or "verified" state by a previous daemon run.
   *
   * Agents in "verified" state have completed their work and passed the build
   * verification, but the merge has not yet landed (e.g. the daemon was killed
   * while waiting in the merge queue).  Without this reconciliation they would
   * remain permanently stranded — the merge pipeline is only triggered from
   * within the agent lifecycle (onComplete → handleBuildVerification → attemptMerge),
   * and there is no other path to re-enter it after a restart.
   *
   * Similarly, agents stuck in "resolving_conflict" after a restart should be
   * retried — reset to "verified" so the next call to this method re-queues them
   * for merge on the following startup.  This prevents them from silently blocking
   * their downstream dependents indefinitely.
   */
  reconcileVerifiedAgents(): void {
    // Agents left in "completed" (process exited, verification and merge
    // pending) have no running pipeline after a restart.  Re-run verification
    // -> merge; handleBuildVerification applies the normal retry bounds.
    for (const agent of this.state.getAgentsByStatus("completed")) {
      this.state.emit("evt:log", {
        level: "info",
        message: `Reconciling completed agent ${agent.featureId} — re-running verification`,
      });
      this.state.updateAgentActivity(agent.featureId, "Resumed after daemon restart — re-running verification");
      this.handleBuildVerification(agent.featureId).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.state.updateAgentStatus(agent.featureId, "failed", `Verification error: ${msg}`);
        this.state.updateAgent(agent.featureId, { error: msg });
        this.rescueChainPredecessors(agent.featureId);
      });
    }

    const verifiedAgents = this.state.getAgentsByStatus("verified");
    for (const agent of verifiedAgents) {
      this.state.emit("evt:log", {
        level: "info",
        message: `Reconciling verified agent ${agent.featureId} — re-attempting merge`,
      });
      // Re-trigger the merge pipeline (fire-and-forget, errors handled inside)
      this.attemptMerge(agent.featureId).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.state.updateAgentStatus(agent.featureId, "failed", `Merge reconciliation error: ${msg}`);
        this.state.updateAgent(agent.featureId, { error: msg });
      });
    }

    // Agents stuck mid-conflict-resolution after a restart have no running
    // process to advance them.  Reset to "verified" so they join the merge
    // queue on the next reconciliation pass (next daemon start).
    const conflictAgents = this.state.getAgentsByStatus("resolving_conflict");
    for (const agent of conflictAgents) {
      this.state.emit("evt:log", {
        level: "info",
        message: `Resetting stale resolving_conflict agent ${agent.featureId} → verified for merge retry`,
      });
      this.state.updateAgentStatus(agent.featureId, "verified", "Reset from stale resolving_conflict on startup");
      // Now re-trigger merge for it too
      this.attemptMerge(agent.featureId).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.state.updateAgentStatus(agent.featureId, "failed", `Merge reconciliation error: ${msg}`);
        this.state.updateAgent(agent.featureId, { error: msg });
      });
    }
  }

  /** Reset a task file back to "planned" so the scheduler picks it up again. */
  private resetTaskToPlanned(featureId: string): void {
    try {
      const data = loadFeatures(this.projectRoot, this.config);
      const task = data.tasks.find((t) => t.id === featureId);
      if (task && task.status !== "done" && task.status !== "cancelled") {
        task.status = "planned";
        task.started_at = null;
        saveTaskToStore(this.projectRoot, this.config, task);
      }
    } catch { /* best-effort */ }
  }

  // -------------------------------------------------------------------------
  // Staggered launch queue
  // -------------------------------------------------------------------------

  protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
    this.launchQueue.push({ fn, skipStagger });
    if (!this.isProcessingQueue) {
      this.processLaunchQueue();
    }
  }

  private async processLaunchQueue(): Promise<void> {
    this.isProcessingQueue = true;
    while (this.launchQueue.length > 0) {
      const { fn, skipStagger } = this.launchQueue.shift()!;
      // Fire-and-forget: doLaunch (worktree creation + installDeps + agent spawn)
      // runs concurrently so multiple tasks can set up in parallel.
      // Errors are handled inside doLaunch itself.
      fn().catch(() => {});
      // Stagger next launch start to avoid concurrent worktree/fs write races
      // (SQLite session DB initialization in real agent processes).
      // Fake-agent tasks skip this wait — they never touch SQLite.
      if (!skipStagger && this.launchQueue.length > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, AgentRunner.LAUNCH_STAGGER_MS)
        );
      }
    }
    this.isProcessingQueue = false;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Resolve the base branch for a task (quest branch or project base). */
  private resolveBaseBranch(task: Task): string {
    if (task.quest) {
      const questBranch = `quest/${task.quest}`;
      // Only use the quest branch if it actually exists in git
      try {
        const result = execSync(`git branch --list "${questBranch}"`, {
          cwd: this.projectRoot,
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();
        if (result) return questBranch;
      } catch {
        // fall through
      }
    }
    return this.state.getBaseBranch();
  }

  /** Find task IDs that depend on the given task. */
  private findDependents(taskId: string): string[] {
    try {
      const data = loadFeatures(this.projectRoot, this.config);
      return data.tasks
        .filter((t) => t.depends_on.includes(taskId))
        .map((t) => t.id);
    } catch {
      return [];
    }
  }

  /** Load a single task by ID from disk. */
  private loadTask(featureId: string): Task | null {
    try {
      const data = loadFeatures(this.projectRoot, this.config);
      return data.tasks.find((t) => t.id === featureId) ?? null;
    } catch {
      return null;
    }
  }

  /** Destroy: clean up resources. */
  destroy(): void {
    this.analytics.close();
    this.replay.close();
    for (const agent of this.state.getAllAgents()) {
      void this.shutdown.shutdown(agent.featureId, { phase: "destroy" });
    }
    this.spawnMonitor.dispose();
    this.monitor.killAll();
    this.launchQueue = [];
  }
}
