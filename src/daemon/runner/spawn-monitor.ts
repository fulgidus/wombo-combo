/**
 * spawn-monitor.ts — Spawn and monitor stage for the daemon.
 *
 * Extracted from agent-runner.ts as a behaviour-preserving move: launching an
 * agent (baseline → worktree → install → prompt → spawn), the process monitor
 * callbacks, and relaunching a failed attempt ("handleRetry" in the facade).
 *
 * The monitor-failure retry/fail branch is isolated as onProcessFailed so it
 * and its verification sibling can be replaced by a restart policy in one
 * follow-up. Collaborators that tests swap on the runner after construction
 * (monitor, rescue, retry, verification) are resolved lazily.
 */

import { execSync } from "node:child_process";
import { normalizeCommentsConfig, type WomboConfig } from "../../config";
import type { Task, Feature } from "../../lib/tasks";
import { saveTaskToStore } from "../../lib/task-store";
import { createWorktree, installDeps, worktreeExists } from "../../lib/worktree";
import { launchHeadless, retryHeadless, FAKE_AGENT_SENTINEL } from "../../lib/launcher";
import type { LaunchResult } from "../../lib/launcher";
import type { ProcessMonitor, MonitorCallbacks } from "../../lib/monitor";
import { generatePrompt, type QuestPromptContext } from "../../lib/prompt";
import type { ResolvedRoute } from "../../lib/harness/routing";
import { prepareAgentDefinitions, writeAgentToWorktree, isSpecializedAgent } from "../../lib/agent-registry";
import { resolveQuestConfig, applyQuestConstraintsToTask } from "../../lib/quest";
import type { QuestHitlMode } from "../../lib/quest";
import { loadQuest } from "../../lib/quest-store";
import { patchImportedAgent } from "../../lib/templates";
import { loadProjectContext } from "../../lib/project-store";
import { loadTestBaseline, type TestBaseline } from "../../lib/test-baseline";
import { normalizeHarnessEvent } from "../../lib/replay";
import { recentComments } from "../../lib/comments";
import type { UsageRecord } from "../../lib/token-collector";
import type { DaemonState } from "../state";
import type { AnalyticsTracker } from "../analytics-tracker";
import type { ReplayRecorder } from "../replay-recorder";
import { resolveAgentRoute, selectRoute } from "./routes";
import type { FeedbackStore } from "./feedback-store";
import { ensureTaskTestBaseline, questPromptContext, resolveTaskQuestScope } from "./quest-scope";

/** Collaborators the spawn/monitor stage needs from the AgentRunner. */
export interface SpawnMonitorDeps {
  projectRoot: string;
  config: WomboConfig;
  state: DaemonState;
  analytics: AnalyticsTracker;
  replay: ReplayRecorder;
  monitor(): ProcessMonitor;
  /** Findings to hand to the implementing agent on its next retry (shared with the review gate). */
  reviewFeedback: FeedbackStore;
  loadTask(featureId: string): Task | null;
  /** Relaunch entry point (the facade's handleRetry). */
  relaunch(featureId: string): void;
  handleBuildVerification(featureId: string): Promise<void>;
  rescueChainPredecessors(featureId: string): void;
  /** Shutdown hook for an agent the restart policy gave up on (keeps its worktree). */
  giveUp?(featureId: string): void;
}

export class SpawnMonitorStage {
  constructor(private readonly deps: SpawnMonitorDeps) {}

  // -------------------------------------------------------------------------
  // Monitor callbacks
  // -------------------------------------------------------------------------

  buildCallbacks(): MonitorCallbacks {
    const { state, analytics, replay } = this.deps;
    return {
      onSessionId: (featureId, sessionId) => {
        // Uniqueness assertion: warn if another agent in the daemon state
        // already holds this session ID (cross-agent session reuse detection).
        const conflicting = state.getAllAgents().find(
          (a) => a.featureId !== featureId && a.sessionId === sessionId
        );
        if (conflicting) {
          console.warn(
            `[WARN] session ID ${sessionId} is already in use by agent ${conflicting.featureId} — possible opencode session reuse bug`
          );
        }
        state.updateAgent(featureId, { sessionId });
      },

      onComplete: (featureId) => {
        state.updateAgentStatus(featureId, "completed", "Agent process exited cleanly");

        // Fire-and-forget build verification → merge pipeline
        this.deps.handleBuildVerification(featureId).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          state.updateAgentStatus(featureId, "failed", `Verification error: ${msg}`);
          state.updateAgent(featureId, { error: msg });
          this.deps.rescueChainPredecessors(featureId);
        });
      },

      onError: (featureId, error) => this.onProcessFailed(featureId, error),

      onEvent: (featureId, event) => {
        // Harness-specific normalization happens here only; the recorder
        // stores harness-neutral events.
        const normalized = normalizeHarnessEvent(state.getAgent(featureId)?.harness, event);
        if (normalized) replay.recordEvent(featureId, normalized);
      },

      onActivity: (featureId, activity) => {
        state.updateAgentActivity(featureId, activity);
      },

      onOutput: (featureId, data) => {
        state.emit("evt:agent-output", { featureId, data });
      },

      onQuestion: (featureId, questionText) => {
        const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const agent = state.getAgent(featureId);
        if (agent) {
          agent.pendingQuestions.push({
            questionId,
            questionText,
            askedAt: new Date().toISOString(),
          });
          state.emit("evt:hitl-question", {
            featureId,
            questionId,
            questionText,
          });
        }
      },

      onUsage: (featureId, record) => {
        // The monitor already persisted this record to usage.jsonl; analytics
        // only accumulates totals and must not append it again.
        analytics.recordUsage(featureId, record as UsageRecord);
        const agent = state.getAgent(featureId);
        if (agent) {
          if (!agent.tokenUsage) {
            agent.tokenUsage = { inputTokens: 0, outputTokens: 0, totalCost: 0 };
          }
          agent.tokenUsage.inputTokens += record.input_tokens ?? 0;
          agent.tokenUsage.outputTokens += record.output_tokens ?? 0;
          state.emit("evt:token-usage", {
            featureId,
            inputTokens: agent.tokenUsage.inputTokens,
            outputTokens: agent.tokenUsage.outputTokens,
            totalTokens: agent.tokenUsage.inputTokens + agent.tokenUsage.outputTokens,
          });
        }
      },
    };
  }

  /**
   * The monitored process failed (crash, hang, abnormal exit): retry while the
   * counter allows, otherwise fail the agent and unblock its chain.
   */
  onProcessFailed(featureId: string, error: string): void {
    const { state } = this.deps;
    const agent = state.getAgent(featureId);
    if (!agent) return;

    if (agent.retries < agent.maxRetries) {
      // Retry
      state.updateAgent(featureId, {
        retries: agent.retries + 1,
        error,
      });
      state.updateAgentStatus(
        featureId,
        "retry",
        `Retry ${agent.retries + 1}/${agent.maxRetries}: ${error}`
      );
      this.deps.relaunch(featureId);
    } else {
      // Final failure
      state.updateAgentStatus(featureId, "failed", error);
      state.updateAgent(featureId, { error });
      state.cancelDownstream(featureId);
      this.deps.giveUp?.(featureId);
      this.deps.rescueChainPredecessors(featureId);
    }
  }

  // -------------------------------------------------------------------------
  // Launch pipeline
  // -------------------------------------------------------------------------

  /** Actually launch an agent: worktree → install → prompt → spawn. */
  async doLaunch(featureId: string, task: Task): Promise<void> {
    const { state, config, projectRoot, analytics, replay } = this.deps;
    const agent = state.getAgent(featureId);
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
        state.updateAgentStatus(featureId, "installing", "Preparing quest test baseline");
        try {
          testBaseline = await ensureTaskTestBaseline(this.deps, featureId, task);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          state.updateAgentStatus(featureId, "failed", `Test baseline unavailable: ${msg}`);
          state.updateAgent(featureId, { error: `Test baseline unavailable: ${msg}` });
          return;
        }
      }

      state.updateAgentStatus(featureId, "installing", "Creating worktree");

      // Reflect in task file so TUI shows in-progress immediately
      const taskOnDisk = this.deps.loadTask(featureId);
      if (taskOnDisk && taskOnDisk.status === "planned") {
        taskOnDisk.status = "in_progress";
        taskOnDisk.started_at = new Date().toISOString();
        saveTaskToStore(projectRoot, config, taskOnDisk);
      }

      // Create the worktree. Chain members (dependent tasks that share a
      // stream head's worktree) reuse the predecessor's worktree and branch
      // from its tip via `git checkout -B` so the chain accumulates work
      // instead of forking fresh from base.
      const depAgent = (agent.dependsOn ?? [])
        .map((depId) => state.getAgent(depId))
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
          wt = await createWorktree(projectRoot, featureId, agent.baseBranch, config);
        }
      } else {
        wt = await createWorktree(projectRoot, featureId, agent.baseBranch, config);
      }
      state.updateAgent(featureId, { worktree: wt });

      // Install dependencies (skip for fake-agent — it has no deps)
      if (agent.agentName !== FAKE_AGENT_SENTINEL) {
        state.updateAgentActivity(featureId, "Installing dependencies...");
        await installDeps(wt, featureId, config);
      }

      // Resolve quest context if applicable
      let questContext: QuestPromptContext | undefined = undefined;
      let hitlMode: string | undefined = undefined;
      let promptConfig = config;
      if (task.quest) {
        const quest = loadQuest(projectRoot, task.quest);
        if (quest) {
          const resolvedTask = applyQuestConstraintsToTask(task, quest);
          Object.assign(task, resolvedTask);
          hitlMode = quest.hitlMode;
          promptConfig = resolveQuestConfig(config, quest);
          questContext = questPromptContext(this.deps, quest, testBaseline);
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
          const agentDefs = await prepareAgentDefinitions([effectiveTask], config, projectRoot);
          const resolution = agentDefs.get(task.id);
          if (resolution && isSpecializedAgent(resolution)) {
            const patchedContent = patchImportedAgent(
              resolution.rawContent,
              config,
              projectRoot,
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
        loadProjectContext(projectRoot),
        this.loadPromptComments(featureId, task.quest)
      );

      // Capture the immutable analytics baseline after worktree preparation
      // and before the first agent process (preserved across retries; chain
      // members start from their predecessor's tip).
      analytics.captureBaseline(featureId);

      // Resolve the agent profile (walking its fallback chain when a binary or
      // account variable is unavailable). The fake agent bypasses routing.
      let route: ResolvedRoute | undefined;
      let launchModel = agent.model ?? state.getModel() ?? undefined;
      if (agent.agentName !== FAKE_AGENT_SENTINEL) {
        const selected = selectRoute(this.deps, "code", featureId, task);
        route = selected.route;
        if (selected.skipped.length > 0) {
          const why = selected.skipped.map((x) => `${x.profile}: ${x.reason}`).join("; ");
          state.updateAgentActivity(featureId, `profile fallback -> ${route.profile} (${why})`.slice(0, 200));
          launchModel = route.model ?? launchModel;
          state.updateAgent(featureId, { model: route.model ?? agent.model ?? null });
        }
        state.updateAgent(featureId, { profile: route.profile, harness: route.harness });
      }

      // Launch the agent process
      state.updateAgentStatus(featureId, "running", "Agent spawned");

      const result: LaunchResult = launchHeadless({
        worktreePath: wt,
        featureId,
        prompt,
        model: launchModel,
        config,
        agentName: agent.agentName ?? undefined,
        hitlMode,
        projectRoot,
        route,
      });

      state.updateAgent(featureId, {
        pid: result.pid,
        sessionId: result.sessionId ?? null,
        startedAt: new Date().toISOString(),
      });

      analytics.recordProcessStart(featureId);
      replay.recordPrompt(featureId, prompt);
      replay.recordAttempt(featureId, "start");

      // Register usage context before attaching the process so every record
      // carries quest/model, then register with the monitor.
      this.registerUsageContext(featureId, result.route);
      this.deps.monitor().addProcess(featureId, result.process, { normalize: result.normalize });

      state.emit("evt:task-picked", {
        taskId: featureId,
        queuePosition: 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      state.updateAgentStatus(featureId, "failed", `Launch error: ${msg}`);
      state.updateAgent(featureId, { error: msg });
    }
  }

  // -------------------------------------------------------------------------
  // Relaunch (retry)
  // -------------------------------------------------------------------------

  relaunch(featureId: string): void {
    const { state, replay, reviewFeedback } = this.deps;
    const agent = state.getAgent(featureId);
    if (!agent) return;

    if (!agent.sessionId) {
      // No session — queue for fresh launch (doLaunch enforces the baseline)
      state.updateAgentStatus(featureId, "queued", "No session, re-queuing");
      return;
    }

    // Session-reusing retries bypass doLaunch, so enforce the quest baseline
    // prerequisite here too. Retries reuse the original snapshot; it is
    // never recaptured, even if the base branch has advanced.
    if (agent.agentName !== FAKE_AGENT_SENTINEL) {
      const scope = resolveTaskQuestScope(this.deps, this.deps.loadTask(featureId), agent);
      if (scope?.config.tdd?.enabled) {
        const loaded = loadTestBaseline(this.deps.projectRoot, scope.quest.id);
        if (loaded.status !== "ok") {
          const msg = `Test baseline for quest "${scope.quest.id}" unavailable (${loaded.status}); retry blocked`;
          state.updateAgentStatus(featureId, "failed", msg);
          state.updateAgent(featureId, { error: msg });
          return;
        }
      }
    }

    try {
      // A session belongs to one harness: retries reuse the profile it started with
      const route =
        agent.agentName === FAKE_AGENT_SENTINEL
          ? undefined
          : resolveAgentRoute(this.deps, "code", featureId, this.deps.loadTask(featureId));
      const feedback = reviewFeedback.take(featureId);
      const result = retryHeadless({
        worktreePath: agent.worktree,
        featureId,
        sessionId: agent.sessionId,
        buildErrors: agent.error ?? "Previous attempt failed",
        retryMessage: feedback,
        model: agent.model ?? state.getModel() ?? undefined,
        config: this.deps.config,
        agentName: agent.agentName ?? undefined,
        route,
      });

      state.updateAgent(featureId, { pid: result.pid });
      state.updateAgentStatus(featureId, "running", "Retry launched");
      replay.recordAttempt(featureId, "retry", agent.error ?? "Previous attempt failed");
      this.registerUsageContext(featureId, result.route);
      this.deps.monitor().addProcess(featureId, result.process, { normalize: result.normalize });
    } catch {
      // Retry launch failed — queue for fresh launch
      state.updateAgentStatus(featureId, "queued", "Retry launch failed, re-queuing");
    }
  }

  /** Register the token collector's per-agent context (quest, model). */
  registerUsageContext(featureId: string, route?: ResolvedRoute): void {
    const { state } = this.deps;
    const agent = state.getAgent(featureId);
    this.deps.monitor().tokenCollector.registerAgent(featureId, {
      quest_id: agent?.analytics?.quest_id ?? null,
      model: agent?.model ?? state.getModel() ?? null,
      provider: route?.provider ?? null,
      harness: route?.harness ?? agent?.harness ?? null,
    });
  }

  /** Recent task and quest comments for the agent prompt (empty when disabled). */
  private loadPromptComments(featureId: string, questId?: string | null) {
    const { config, projectRoot, state } = this.deps;
    const cfg = normalizeCommentsConfig(config.comments);
    if (!cfg.enabled) return null;
    try {
      return {
        task: recentComments(projectRoot, { kind: "task", id: featureId }, cfg.promptMaxItems),
        quest: questId ? recentComments(projectRoot, { kind: "quest", id: questId }, cfg.promptMaxItems) : [],
      };
    } catch (err) {
      state.emit("evt:log", {
        level: "warn",
        message: `[comments] could not load comments for ${featureId}: ${err instanceof Error ? err.message : String(err)}`,
      });
      return null;
    }
  }
}
