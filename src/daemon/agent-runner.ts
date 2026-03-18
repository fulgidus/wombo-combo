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
 * - Merge serialization via enqueueMerge
 * - Dead process reaping
 */

import type { WomboConfig } from "../config";
import type { Task, Feature, FeaturesFile } from "../lib/tasks";
import { loadFeatures } from "../lib/tasks";
import { createWorktree, installDeps, worktreePath, featureBranchName, removeWorktree } from "../lib/worktree";
import { launchHeadless, retryHeadless, isProcessRunning } from "../lib/launcher";
import type { LaunchResult } from "../lib/launcher";
import { ProcessMonitor } from "../lib/monitor";
import type { MonitorCallbacks } from "../lib/monitor";
import { generatePrompt } from "../lib/prompt";
import { runFullVerification } from "../lib/verifier";
import { mergeBranch, enqueueMerge, canMerge } from "../lib/merger";
import { buildDepGraph, buildSchedulePlan } from "../lib/dependency-graph";
import { prepareAgentDefinitions, writeAgentToWorktree, isSpecializedAgent } from "../lib/agent-registry";
import { resolveQuestConfig, applyQuestConstraintsToTask, getQuestTaskIds } from "../lib/quest";
import { loadQuest } from "../lib/quest-store";
import { patchImportedAgent } from "../lib/templates";
import type { QuestHitlMode } from "../lib/quest";
import type { DaemonState, InternalAgentState } from "./state";
import { createDaemonAgentState } from "./state";
import { parseDurationMinutes } from "../lib/tasks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentRunnerConfig {
  projectRoot: string;
  config: WomboConfig;
}

// ---------------------------------------------------------------------------
// AgentRunner
// ---------------------------------------------------------------------------

export class AgentRunner {
  private projectRoot: string;
  private config: WomboConfig;
  private state: DaemonState;
  private monitor: ProcessMonitor;

  /** Stagger delay between launches to avoid SQLite races (ms). */
  private static readonly LAUNCH_STAGGER_MS = 800;

  /** Queue for staggered launches. */
  private launchQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor(opts: AgentRunnerConfig, state: DaemonState) {
    this.projectRoot = opts.projectRoot;
    this.config = opts.config;
    this.state = state;

    // Create monitor with daemon-integrated callbacks
    this.monitor = new ProcessMonitor(this.projectRoot, this.buildCallbacks());
  }

  // -------------------------------------------------------------------------
  // Monitor callbacks
  // -------------------------------------------------------------------------

  private buildCallbacks(): MonitorCallbacks {
    return {
      onSessionId: (featureId, sessionId) => {
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

  /** Submit a new task for execution. Creates agent state, worktree, and launches. */
  submitTask(task: Task): void {
    const config = this.config;
    const branch = featureBranchName(task.id, config);
    const wt = worktreePath(this.projectRoot, task.id, config);
    const baseBranch = this.resolveBaseBranch(task);

    const agentState = createDaemonAgentState({
      featureId: task.id,
      taskTitle: task.title,
      branch,
      baseBranch,
      worktree: wt,
      maxRetries: config.defaults.maxRetries,
      dependsOn: task.depends_on,
      dependedOnBy: this.findDependents(task.id),
      agentName: task.agent ?? null,
      agentType: task.agent_type ?? null,
      effortEstimateMs: parseDurationMinutes(task.effort) * 60_000,
    });

    this.state.addAgent(agentState);

    // Queue the launch (staggered to avoid SQLite races)
    this.enqueueLaunch(() => this.doLaunch(task.id, task));
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

    this.enqueueLaunch(() => this.doLaunch(featureId, task));
  }

  // -------------------------------------------------------------------------
  // Launch pipeline
  // -------------------------------------------------------------------------

  /** Actually launch an agent: worktree → install → prompt → spawn. */
  private async doLaunch(featureId: string, task: Task): Promise<void> {
    const agent = this.state.getAgent(featureId);
    if (!agent) return;

    try {
      this.state.updateAgentStatus(featureId, "installing", "Creating worktree");

      // Create worktree
      const wt = await createWorktree(
        this.projectRoot,
        featureId,
        agent.baseBranch,
        this.config
      );
      this.state.updateAgent(featureId, { worktree: wt });

      // Install dependencies
      this.state.updateAgentActivity(featureId, "Installing dependencies...");
      await installDeps(wt, featureId, this.config);

      // Resolve quest context if applicable
      let questContext: any = undefined;
      let hitlMode: string | undefined = undefined;
      if (task.quest) {
        const quest = loadQuest(this.projectRoot, task.quest);
        if (quest) {
          const resolvedTask = applyQuestConstraintsToTask(task, quest);
          Object.assign(task, resolvedTask);
          hitlMode = quest.hitlMode;
        }
      }

      // Write agent definition if using a specialized agent
      if (agent.agentName) {
        try {
          const agentDefs = await prepareAgentDefinitions(
            [task],
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
        task as Feature,
        agent.baseBranch,
        this.config,
        questContext,
        hitlMode as any
      );

      // Launch the agent process
      this.state.updateAgentStatus(featureId, "running", "Agent spawned");

      const result: LaunchResult = launchHeadless({
        worktreePath: wt,
        featureId,
        prompt,
        model: this.state.getModel() ?? undefined,
        config: this.config,
        agentName: agent.agentName ?? undefined,
        hitlMode,
        projectRoot: this.projectRoot,
      });

      this.state.updateAgent(featureId, {
        pid: result.pid,
        sessionId: result.sessionId ?? null,
        startedAt: new Date().toISOString(),
      });

      // Register with monitor
      this.monitor.addProcess(featureId, result.process);

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
  // Build verification
  // -------------------------------------------------------------------------

  private async handleBuildVerification(featureId: string): Promise<void> {
    const agent = this.state.getAgent(featureId);
    if (!agent) return;

    this.state.updateAgentActivity(featureId, "Running build verification...");

    try {
      const result = await runFullVerification(agent.worktree, featureId, this.config);

      if (result.overallPassed) {
        agent.buildPassed = true;
        agent.buildOutput = result.combinedErrorSummary || null;
        this.state.updateAgentStatus(featureId, "verified", "Build passed");

        this.state.emit("evt:build-result", {
          featureId,
          passed: true,
          output: result.combinedErrorSummary || undefined,
        });

        // Attempt merge
        await this.attemptMerge(featureId);
      } else {
        // Build failed
        agent.buildPassed = false;
        agent.buildOutput = result.combinedErrorSummary || null;

        this.state.emit("evt:build-result", {
          featureId,
          passed: false,
          output: result.combinedErrorSummary || undefined,
        });

        if (agent.retries < agent.maxRetries) {
          // Retry with build error context
          this.state.updateAgent(featureId, {
            retries: agent.retries + 1,
            error: `Build failed: ${(result.combinedErrorSummary ?? "").slice(0, 500)}`,
          });
          this.state.updateAgentStatus(
            featureId,
            "retry",
            `Build failed, retry ${agent.retries + 1}/${agent.maxRetries}`
          );
          this.handleRetry(featureId);
        } else {
          this.state.updateAgentStatus(featureId, "failed", "Build failed, retries exhausted");
          this.state.updateAgent(featureId, {
            error: `Build failed: ${(result.combinedErrorSummary ?? "").slice(0, 500)}`,
          });
          this.state.cancelDownstream(featureId);
          this.rescueChainPredecessors(featureId);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.updateAgentStatus(featureId, "failed", `Verification error: ${msg}`);
      this.state.updateAgent(featureId, { error: msg });
      this.rescueChainPredecessors(featureId);
    }
  }

  // -------------------------------------------------------------------------
  // Merge
  // -------------------------------------------------------------------------

  private async attemptMerge(featureId: string): Promise<void> {
    const agent = this.state.getAgent(featureId);
    if (!agent) return;

    await enqueueMerge(async () => {
      this.state.updateAgentActivity(featureId, "Merging...");

      try {
        // Pre-flight check
        const mergeCheck = await canMerge(
          this.projectRoot,
          agent.branch,
          agent.baseBranch
        );

        if (!mergeCheck.canMerge) {
          // For now, mark as needing conflict resolution
          // Full tiered conflict resolution can be added incrementally
          this.state.updateAgentStatus(
            featureId,
            "resolving_conflict",
            "Merge conflicts detected"
          );
          // TODO: implement tiered conflict resolution (tiers 1-4)
          // For now, fail and let user handle manually
          this.state.updateAgentStatus(featureId, "failed", "Merge conflicts — manual resolution needed");
          this.state.updateAgent(featureId, { error: "Merge conflicts detected" });
          return;
        }

        await mergeBranch(
          this.projectRoot,
          agent.branch,
          agent.baseBranch,
          this.config
        );

        this.state.updateAgentStatus(featureId, "merged", "Merge successful");
        this.state.emit("evt:merge-result", {
          featureId,
          success: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.state.updateAgentStatus(featureId, "failed", `Merge error: ${msg}`);
        this.state.updateAgent(featureId, { error: msg });
        this.state.emit("evt:merge-result", {
          featureId,
          success: false,
          error: msg,
        });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Retry
  // -------------------------------------------------------------------------

  private handleRetry(featureId: string): void {
    const agent = this.state.getAgent(featureId);
    if (!agent) return;

    if (!agent.sessionId) {
      // No session — queue for fresh launch
      this.state.updateAgentStatus(featureId, "queued", "No session, re-queuing");
      return;
    }

    try {
      const result = retryHeadless({
        worktreePath: agent.worktree,
        featureId,
        sessionId: agent.sessionId,
        buildErrors: agent.error ?? "Previous attempt failed",
        model: this.state.getModel() ?? undefined,
        config: this.config,
      });

      this.state.updateAgent(featureId, { pid: result.pid });
      this.state.updateAgentStatus(featureId, "running", "Retry launched");
      this.monitor.addProcess(featureId, result.process);
    } catch {
      // Retry launch failed — queue for fresh launch
      this.state.updateAgentStatus(featureId, "queued", "Retry launch failed, re-queuing");
    }
  }

  // -------------------------------------------------------------------------
  // Chain predecessor rescue
  // -------------------------------------------------------------------------

  private rescueChainPredecessors(failedFeatureId: string): void {
    // Walk back through dependencies to find verified predecessors sharing worktree
    const agent = this.state.getAgent(failedFeatureId);
    if (!agent) return;

    const predecessors: InternalAgentState[] = [];
    let current: InternalAgentState | undefined = agent;

    while (current && current.dependsOn.length > 0) {
      const predId = current.dependsOn[0]; // Follow first dependency
      const pred = this.state.getAgent(predId);
      if (!pred || pred.worktree !== agent.worktree) break;
      predecessors.push(pred);
      current = pred;
    }

    // Find most recent verified predecessor
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

  /** Kill a specific agent's process. */
  cancelAgent(featureId: string): void {
    this.monitor.remove(featureId);
  }

  /** Kill all running agents. */
  async killAll(): Promise<void> {
    this.monitor.killAll();
    // Wait for processes to actually die
    await this.monitor.waitAll(500);
  }

  /** Detect dead agent processes and handle them. */
  reapDeadProcesses(): void {
    for (const agent of this.state.getAgentsByStatus("running", "installing")) {
      if (agent.pid && !isProcessRunning(agent.pid)) {
        // Process is dead but state says running — treat as crash
        this.state.updateAgentStatus(
          agent.featureId,
          "failed",
          `Process ${agent.pid} died unexpectedly`
        );
        this.state.updateAgent(agent.featureId, {
          error: `Process ${agent.pid} died unexpectedly`,
        });
        this.state.cancelDownstream(agent.featureId);
      }
    }

    // Safety net: agents stuck in "retry" with no process
    for (const agent of this.state.getAgentsByStatus("retry")) {
      if (!agent.pid || !isProcessRunning(agent.pid)) {
        if (agent.retries >= agent.maxRetries) {
          this.state.updateAgentStatus(agent.featureId, "failed", "Retries exhausted (stuck)");
          this.state.cancelDownstream(agent.featureId);
        } else {
          this.state.updateAgentStatus(agent.featureId, "queued", "Re-queuing stuck retry");
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Staggered launch queue
  // -------------------------------------------------------------------------

  private enqueueLaunch(fn: () => Promise<void>): void {
    this.launchQueue.push(fn);
    if (!this.isProcessingQueue) {
      this.processLaunchQueue();
    }
  }

  private async processLaunchQueue(): Promise<void> {
    this.isProcessingQueue = true;
    while (this.launchQueue.length > 0) {
      const fn = this.launchQueue.shift()!;
      try {
        await fn();
      } catch {
        // Individual launch errors are handled inside doLaunch
      }
      // Stagger between launches
      if (this.launchQueue.length > 0) {
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
      // Quest tasks fork from the quest branch
      return `quest/${task.quest}`;
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
    this.monitor.killAll();
    this.launchQueue = [];
  }
}
