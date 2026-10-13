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
import type { Task, Feature, FeaturesFile } from "../lib/tasks";
import { loadFeatures, parseDurationMinutes } from "../lib/tasks";
import { resolveTaskModel } from "../lib/task-weight";
import { resolveRoute, selectAvailableRoute, RouteError, type ResolvedRoute, type RouteSelection } from "../lib/harness/routing";
import { saveTaskToStore } from "../lib/task-store";
import { createWorktree, installDeps, worktreePath, featureBranchName, removeWorktree, worktreeExists } from "../lib/worktree";
import { launchHeadless, retryHeadless, isProcessRunning, FAKE_AGENT_SENTINEL } from "../lib/launcher";
import type { LaunchResult } from "../lib/launcher";
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
import { buildDepGraph, buildSchedulePlan } from "../lib/dependency-graph";
import { prepareAgentDefinitions, writeAgentToWorktree, isSpecializedAgent } from "../lib/agent-registry";
import { resolveQuestConfig, applyQuestConstraintsToTask, getQuestTaskIds } from "../lib/quest";
import { loadQuest, loadQuestKnowledge } from "../lib/quest-store";
import { patchImportedAgent } from "../lib/templates";
import { ensureQuestTestBaseline } from "../lib/test-baseline-capture";
import { loadProjectContext } from "../lib/project-store";
import { loadTestBaseline, toTestBaselineSummary, type TestBaseline } from "../lib/test-baseline";
import type { Quest } from "../lib/quest";
import type { QuestHitlMode } from "../lib/quest";
import type { DaemonState, InternalAgentState } from "./state";
import { createDaemonAgentState } from "./state";
import { AnalyticsTracker } from "./analytics-tracker";
import { ReplayRecorder } from "./replay-recorder";
import { normalizeHarnessEvent } from "../lib/replay";
import { addComment, recentComments } from "../lib/comments";
import type { ReviewerOutput } from "../lib/review-runner";
import { captureWorktreeDiff } from "../lib/replay-diff";
import { runReviewGate, type ReviewGateContext, type ReviewStageDeps } from "./review-stage";
import { FeedbackStore } from "./runner/feedback-store";
import { handleBuildVerification, trackedBuild, type VerifyStageContext } from "./runner/verify-stage";
import { claimTask, isTeamEnabled, releaseTask } from "../lib/claims";
import type { UsageRecord } from "../lib/token-collector";

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
  private reviewFeedback = new FeedbackStore();
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

  /** Recent task and quest comments for the agent prompt (empty when disabled). */
  private loadPromptComments(featureId: string, questId?: string | null) {
    const cfg = normalizeCommentsConfig(this.config.comments);
    if (!cfg.enabled) return null;
    try {
      return {
        task: recentComments(this.projectRoot, { kind: "task", id: featureId }, cfg.promptMaxItems),
        quest: questId ? recentComments(this.projectRoot, { kind: "quest", id: questId }, cfg.promptMaxItems) : [],
      };
    } catch (err) {
      this.state.emit("evt:log", {
        level: "warn",
        message: `[comments] could not load comments for ${featureId}: ${err instanceof Error ? err.message : String(err)}`,
      });
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Monitor callbacks
  // -------------------------------------------------------------------------

  private buildCallbacks(): MonitorCallbacks {
    return {
      onSessionId: (featureId, sessionId) => {
        // Uniqueness assertion: warn if another agent in the daemon state
        // already holds this session ID (cross-agent session reuse detection).
        const conflicting = this.state.getAllAgents().find(
          (a) => a.featureId !== featureId && a.sessionId === sessionId
        );
        if (conflicting) {
          console.warn(
            `[WARN] session ID ${sessionId} is already in use by agent ${conflicting.featureId} — possible opencode session reuse bug`
          );
        }
        this.state.updateAgent(featureId, { sessionId });
      },

      onComplete: (featureId) => {
        this.state.updateAgentStatus(featureId, "completed", "Agent process exited cleanly");

        // Fire-and-forget build verification → merge pipeline
        this.handleBuildVerification(featureId).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.state.updateAgentStatus(featureId, "failed", `Verification error: ${msg}`);
          this.state.updateAgent(featureId, { error: msg });
          this.rescueChainPredecessors(featureId);
        });
      },

      onError: (featureId, error) => {
        const agent = this.state.getAgent(featureId);
        if (!agent) return;

        if (agent.retries < agent.maxRetries) {
          // Retry
          this.state.updateAgent(featureId, {
            retries: agent.retries + 1,
            error,
          });
          this.state.updateAgentStatus(
            featureId,
            "retry",
            `Retry ${agent.retries + 1}/${agent.maxRetries}: ${error}`
          );
          this.handleRetry(featureId);
        } else {
          // Final failure
          this.state.updateAgentStatus(featureId, "failed", error);
          this.state.updateAgent(featureId, { error });
          this.state.cancelDownstream(featureId);
          this.rescueChainPredecessors(featureId);
        }
      },

      onEvent: (featureId, event) => {
        // Harness-specific normalization happens here only; the recorder
        // stores harness-neutral events.
        const normalized = normalizeHarnessEvent(this.state.getAgent(featureId)?.harness, event);
        if (normalized) this.replay.recordEvent(featureId, normalized);
      },

      onActivity: (featureId, activity) => {
        this.state.updateAgentActivity(featureId, activity);
      },

      onOutput: (featureId, data) => {
        this.state.emit("evt:agent-output", { featureId, data });
      },

      onQuestion: (featureId, questionText) => {
        const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const agent = this.state.getAgent(featureId);
        if (agent) {
          agent.pendingQuestions.push({
            questionId,
            questionText,
            askedAt: new Date().toISOString(),
          });
          this.state.emit("evt:hitl-question", {
            featureId,
            questionId,
            questionText,
          });
        }
      },

      onUsage: (featureId, record) => {
        // The monitor already persisted this record to usage.jsonl; analytics
        // only accumulates totals and must not append it again.
        this.analytics.recordUsage(featureId, record as UsageRecord);
        const agent = this.state.getAgent(featureId);
        if (agent) {
          if (!agent.tokenUsage) {
            agent.tokenUsage = { inputTokens: 0, outputTokens: 0, totalCost: 0 };
          }
          agent.tokenUsage.inputTokens += record.input_tokens ?? 0;
          agent.tokenUsage.outputTokens += record.output_tokens ?? 0;
          this.state.emit("evt:token-usage", {
            featureId,
            inputTokens: agent.tokenUsage.inputTokens,
            outputTokens: agent.tokenUsage.outputTokens,
            totalTokens: agent.tokenUsage.inputTokens + agent.tokenUsage.outputTokens,
          });
        }
      },
    };
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

  /** Actually launch an agent: worktree → install → prompt → spawn. */
  private async doLaunch(featureId: string, task: Task): Promise<void> {
    const agent = this.state.getAgent(featureId);
    if (!agent) return;
    // Re-entrancy guard: if a duplicate doLaunch was enqueued (e.g. the
    // scheduler tick fired before the first fire-and-forget set us to
    // "installing"), bail out silently. Single-threaded JS ensures the first
    // call already advanced the status before any await yields.
    if (agent.status !== "queued") return;

    try {
      // Quest test baseline prerequisite: no real TDD quest agent may spawn
      // before a valid snapshot of quest.baseBranch is persisted. Selected by
      // task.quest (not the mutable session quest) to avoid cross-quest leakage.
      let testBaseline: TestBaseline | null = null;
      if (agent.agentName !== FAKE_AGENT_SENTINEL) {
        this.state.updateAgentStatus(featureId, "installing", "Preparing quest test baseline");
        try {
          testBaseline = await this.ensureTaskTestBaseline(featureId, task);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.state.updateAgentStatus(featureId, "failed", `Test baseline unavailable: ${msg}`);
          this.state.updateAgent(featureId, { error: `Test baseline unavailable: ${msg}` });
          return;
        }
      }

      this.state.updateAgentStatus(featureId, "installing", "Creating worktree");

      // Reflect in task file so TUI shows in-progress immediately
      const taskOnDisk = this.loadTask(featureId);
      if (taskOnDisk && taskOnDisk.status === "planned") {
        taskOnDisk.status = "in_progress";
        taskOnDisk.started_at = new Date().toISOString();
        saveTaskToStore(this.projectRoot, this.config, taskOnDisk);
      }

      // Create the worktree. Chain members (dependent tasks that share a
      // stream head's worktree) reuse the predecessor's worktree and branch
      // from its tip via `git checkout -B` so the chain accumulates work
      // instead of forking fresh from base.
      const depAgent = (agent.dependsOn ?? [])
        .map((depId) => this.state.getAgent(depId))
        .find((dep) => dep && dep.worktree === agent.worktree);
      // NOTE: worktreeExists (valid git worktree), not worktreeReady —
      // fake agents skip dependency installs, so node_modules may be absent
      // while the worktree is perfectly reusable for branch continuity.
      const isChainReuse =
        depAgent !== undefined && worktreeExists(agent.worktree);

      let wt: string;
      if (isChainReuse) {
        try {
          execSync(`git checkout -B "${agent.branch}"`, {
            cwd: agent.worktree,
            stdio: "pipe",
          });
          wt = agent.worktree;
        } catch {
          // Branch continuity failed — fall back to a fresh worktree from base
          wt = await createWorktree(
            this.projectRoot,
            featureId,
            agent.baseBranch,
            this.config
          );
        }
      } else {
        wt = await createWorktree(
          this.projectRoot,
          featureId,
          agent.baseBranch,
          this.config
        );
      }
      this.state.updateAgent(featureId, { worktree: wt });

      // Install dependencies (skip for fake-agent — it has no deps)
      if (agent.agentName !== FAKE_AGENT_SENTINEL) {
        this.state.updateAgentActivity(featureId, "Installing dependencies...");
        await installDeps(wt, featureId, this.config);
      }

      // Resolve quest context if applicable
      let questContext: QuestPromptContext | undefined = undefined;
      let hitlMode: string | undefined = undefined;
      let promptConfig = this.config;
      if (task.quest) {
        const quest = loadQuest(this.projectRoot, task.quest);
        if (quest) {
          const resolvedTask = applyQuestConstraintsToTask(task, quest);
          Object.assign(task, resolvedTask);
          hitlMode = quest.hitlMode;
          promptConfig = resolveQuestConfig(this.config, quest);
          questContext = this.questPromptContext(quest, testBaseline);
        }
      }

      // Write agent definition if using a specialized agent. The session
      // override (CLI --agent) is persisted onto the agent state, so apply it
      // to the task copy used for agent resolution and prompt generation.
      const effectiveTask = agent.agentName
        ? ({ ...task, agent: agent.agentName } as Task)
        : task;

      if (agent.agentName) {
        try {
          const agentDefs = await prepareAgentDefinitions(
            [effectiveTask],
            this.config,
            this.projectRoot
          );
          const resolution = agentDefs.get(task.id);
          if (resolution && isSpecializedAgent(resolution)) {
            const patchedContent = patchImportedAgent(
              resolution.rawContent,
              this.config,
              this.projectRoot,
              hitlMode as QuestHitlMode | undefined
            );
            writeAgentToWorktree(wt, resolution.name, patchedContent);
          }
        } catch {
          // Non-fatal: fall back to generalist
        }
      }

      // Generate prompt
      const prompt = generatePrompt(
        effectiveTask as Feature,
        agent.baseBranch,
        promptConfig,
        questContext,
        hitlMode as any,
        loadProjectContext(this.projectRoot),
        this.loadPromptComments(featureId, task.quest)
      );

      // Capture the immutable analytics baseline after worktree preparation
      // and before the first agent process (preserved across retries; chain
      // members start from their predecessor's tip).
      this.analytics.captureBaseline(featureId);

      // Resolve the agent profile (walking its fallback chain when a binary or
      // account variable is unavailable). The fake agent bypasses routing.
      let route: ResolvedRoute | undefined;
      let launchModel = agent.model ?? this.state.getModel() ?? undefined;
      if (agent.agentName !== FAKE_AGENT_SENTINEL) {
        const selected = this.selectRoute("code", featureId, task);
        route = selected.route;
        if (selected.skipped.length > 0) {
          const why = selected.skipped.map((x) => `${x.profile}: ${x.reason}`).join("; ");
          this.state.updateAgentActivity(featureId, `profile fallback -> ${route.profile} (${why})`.slice(0, 200));
          launchModel = route.model ?? launchModel;
          this.state.updateAgent(featureId, { model: route.model ?? agent.model ?? null });
        }
        this.state.updateAgent(featureId, { profile: route.profile, harness: route.harness });
      }

      // Launch the agent process
      this.state.updateAgentStatus(featureId, "running", "Agent spawned");

      const result: LaunchResult = launchHeadless({
        worktreePath: wt,
        featureId,
        prompt,
        model: launchModel,
        config: this.config,
        agentName: agent.agentName ?? undefined,
        hitlMode,
        projectRoot: this.projectRoot,
        route,
      });

      this.state.updateAgent(featureId, {
        pid: result.pid,
        sessionId: result.sessionId ?? null,
        startedAt: new Date().toISOString(),
      });

      this.analytics.recordProcessStart(featureId);
      this.replay.recordPrompt(featureId, prompt);
      this.replay.recordAttempt(featureId, "start");

      // Register usage context before attaching the process so every record
      // carries quest/model, then register with the monitor.
      this.registerUsageContext(featureId, result.route);
      this.monitor.addProcess(featureId, result.process, { normalize: result.normalize });

      this.state.emit("evt:task-picked", {
        taskId: featureId,
        queuePosition: 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.updateAgentStatus(featureId, "failed", `Launch error: ${msg}`);
      this.state.updateAgent(featureId, { error: msg });
    }
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

  /**
   * Quest + effective config for a task's own quest (null when unquested).
   *
   * When the task file is gone (e.g. archived mid-run), fall back to the
   * agent's quest base branch ("quest/<id>") so baseline checks fail closed
   * instead of silently treating the task as unquested.
   */
  private resolveTaskQuestScope(
    task: Task | null,
    agent?: InternalAgentState
  ): { quest: Quest; config: WomboConfig } | null {
    const questId =
      task?.quest ??
      (task === null && agent?.baseBranch.startsWith("quest/")
        ? agent.baseBranch.slice("quest/".length)
        : undefined);
    if (!questId) return null;
    const quest = loadQuest(this.projectRoot, questId);
    if (!quest) return null;
    return { quest, config: resolveQuestConfig(this.config, quest) };
  }

  /**
   * Ensure the quest test baseline for a task exists (capturing it on first
   * use). Returns null for unquested tasks or when the quest's effective
   * config has TDD disabled. Throws when a snapshot cannot be established.
   */
  private async ensureTaskTestBaseline(
    featureId: string,
    task: Task
  ): Promise<TestBaseline | null> {
    const scope = this.resolveTaskQuestScope(task);
    if (!scope || !scope.config.tdd?.enabled) return null;
    const { quest, config } = scope;
    this.state.updateAgentActivity(
      featureId,
      `Ensuring test baseline for quest ${quest.id} (${quest.baseBranch})...`
    );
    const result = await ensureQuestTestBaseline({
      projectRoot: this.projectRoot,
      questId: quest.id,
      baseBranch: quest.baseBranch,
      config,
      log: (msg) => this.state.updateAgentActivity(featureId, msg),
    });
    return result.status === "disabled" ? null : result.baseline;
  }

  /** Prompt context for a task's quest, including the baseline summary */
  private questPromptContext(quest: Quest, baseline: TestBaseline | null): QuestPromptContext {
    return {
      questId: quest.id,
      goal: quest.goal,
      addedConstraints: quest.constraints.add ?? [],
      addedForbidden: quest.constraints.ban ?? [],
      knowledge: loadQuestKnowledge(this.projectRoot, quest.id),
      ...(baseline ? { testBaseline: toTestBaselineSummary(baseline) } : {}),
    };
  }

  /**
   * Build quest context for conflict resolution prompts.
   */
  private buildQuestContext(): QuestPromptContext | undefined {
    const questId = this.state.getQuestId();
    if (!questId) return undefined;

    const quest = loadQuest(this.projectRoot, questId);
    if (!quest) return undefined;

    const knowledge = loadQuestKnowledge(this.projectRoot, questId);
    return {
      questId: quest.id,
      goal: quest.goal,
      addedConstraints: quest.constraints.add ?? [],
      addedForbidden: quest.constraints.ban ?? [],
      knowledge,
    };
  }

  // -------------------------------------------------------------------------
  // Retry
  // -------------------------------------------------------------------------

  private handleRetry(featureId: string): void {
    const agent = this.state.getAgent(featureId);
    if (!agent) return;

    if (!agent.sessionId) {
      // No session — queue for fresh launch (doLaunch enforces the baseline)
      this.state.updateAgentStatus(featureId, "queued", "No session, re-queuing");
      return;
    }

    // Session-reusing retries bypass doLaunch, so enforce the quest baseline
    // prerequisite here too. Retries reuse the original snapshot; it is
    // never recaptured, even if the base branch has advanced.
    if (agent.agentName !== FAKE_AGENT_SENTINEL) {
      const scope = this.resolveTaskQuestScope(this.loadTask(featureId), agent);
      if (scope?.config.tdd?.enabled) {
        const loaded = loadTestBaseline(this.projectRoot, scope.quest.id);
        if (loaded.status !== "ok") {
          const msg = `Test baseline for quest "${scope.quest.id}" unavailable (${loaded.status}); retry blocked`;
          this.state.updateAgentStatus(featureId, "failed", msg);
          this.state.updateAgent(featureId, { error: msg });
          return;
        }
      }
    }

    try {
      // A session belongs to one harness: retries reuse the profile it started with
      const route =
        agent.agentName === FAKE_AGENT_SENTINEL
          ? undefined
          : this.resolveAgentRoute("code", featureId, this.loadTask(featureId));
      const reviewFeedback = this.reviewFeedback.take(featureId);
      const result = retryHeadless({
        worktreePath: agent.worktree,
        featureId,
        sessionId: agent.sessionId,
        buildErrors: agent.error ?? "Previous attempt failed",
        retryMessage: reviewFeedback,
        model: agent.model ?? this.state.getModel() ?? undefined,
        config: this.config,
        agentName: agent.agentName ?? undefined,
        route,
      });

      this.state.updateAgent(featureId, { pid: result.pid });
      this.state.updateAgentStatus(featureId, "running", "Retry launched");
      this.replay.recordAttempt(featureId, "retry", agent.error ?? "Previous attempt failed");
      this.registerUsageContext(featureId, result.route);
      this.monitor.addProcess(featureId, result.process, { normalize: result.normalize });
    } catch {
      // Retry launch failed — queue for fresh launch
      this.state.updateAgentStatus(featureId, "queued", "Retry launch failed, re-queuing");
    }
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
    const agent = this.state.getAgent(featureId);
    this.monitor.tokenCollector.registerAgent(featureId, {
      quest_id: agent?.analytics?.quest_id ?? null,
      model: agent?.model ?? this.state.getModel() ?? null,
      provider: route?.provider ?? null,
      harness: route?.harness ?? agent?.harness ?? null,
    });
  }

  /**
   * Resolve the route for an operation on a task. The profile recorded on the
   * agent state is forced so retries and later operations stay on the same
   * profile; "default" (the synthesized legacy profile) is never forced.
   */
  private resolveAgentRoute(
    operation: "code" | "conflict" | "review",
    featureId: string,
    task: Task | null | undefined,
    sessionModel?: string | null,
  ): ResolvedRoute {
    const agent = this.state.getAgent(featureId);
    const forced = operation === "code" && agent?.profile && agent.profile !== "default" ? agent.profile : undefined;
    return resolveRoute(this.config, {
      operation,
      task: task ?? null,
      sessionModel: sessionModel ?? agent?.model ?? this.state.getModel(),
      profile: forced,
    });
  }

  /** Resolve the route and walk its fallback chain; legacy routes are not probed. */
  private selectRoute(operation: "code" | "conflict" | "review", featureId: string, task: Task | null, sessionModel?: string | null): RouteSelection {
    const route = this.resolveAgentRoute(operation, featureId, task, sessionModel);
    if (route.legacy) return { route, skipped: [] };
    const agent = this.state.getAgent(featureId);
    return selectAvailableRoute(this.config, route, {
      operation,
      task,
      sessionModel: sessionModel ?? agent?.model ?? this.state.getModel(),
      profile: route.profile,
    });
  }

  /**
   * Route for a conflict-resolver launch (operation "conflict"). When no
   * configured profile can start, the failure is logged on the agent and the
   * launcher falls back to the legacy agent.bin route.
   */
  private conflictRoute(featureId: string, task: Task, model: string | undefined): ResolvedRoute | undefined {
    try {
      return this.selectRoute("conflict", featureId, task, model ?? null).route;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.updateAgentActivity(featureId, `conflict profile unavailable, using default agent: ${msg}`.slice(0, 200));
      return undefined;
    }
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

  /** Kill a specific agent's process. */
  cancelAgent(featureId: string): void {
    this.analytics.markStopRequested(featureId, "cancelled");
    this.replay.markStopRequested(featureId);
    this.monitor.remove(featureId);
  }

  /** Kill all running agents. */
  async killAll(): Promise<void> {
    // Mark executions stopped first so exit callbacks from the killed
    // processes cannot alter their snapshots.
    this.analytics.interruptAll("killed");
    this.replay.interruptAll("killed");
    this.monitor.killAll();
    // Wait for processes to actually die
    await this.monitor.waitAll(500);
  }

  /** Detect dead agent processes and handle them. */
  reapDeadProcesses(): void {
    for (const agent of this.state.getAgentsByStatus("running", "installing")) {
      if (agent.pid && !isProcessRunning(agent.pid)) {
        this.state.emit("evt:log", { level: "warn", message: `Agent ${agent.featureId} PID ${agent.pid} is dead — reaping` });
        // Reset task back to "planned" so scheduler picks it up again
        this.resetTaskToPlanned(agent.featureId);
        // Persist a best-effort diff before the worktree disappears
        this.analytics.captureBestEffort(agent.featureId);
        // Clean up worktree if present
        if (agent.worktree) {
          try { removeWorktree({ projectRoot: this.projectRoot, wtPath: agent.worktree }); } catch { /* best-effort */ }
        }
        // Remove from daemon state entirely (scheduler will re-submit from disk)
        this.state.removeAgent(agent.featureId);
      }
    }

    // Safety net: agents stuck in "retry" with no process
    for (const agent of this.state.getAgentsByStatus("retry")) {
      if (!agent.pid || !isProcessRunning(agent.pid)) {
        if (agent.retries >= agent.maxRetries) {
          this.analytics.captureBestEffort(agent.featureId);
          this.resetTaskToPlanned(agent.featureId);
          if (agent.worktree) {
            try { removeWorktree({ projectRoot: this.projectRoot, wtPath: agent.worktree }); } catch { /* best-effort */ }
          }
          this.state.removeAgent(agent.featureId);
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
    this.monitor.killAll();
    this.launchQueue = [];
  }
}
