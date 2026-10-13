/**
 * agent-shutdown.ts — the supervised child's shutdown hook for one agent.
 *
 * One idempotent hook per agent execution: kill the process, capture a
 * best-effort analytics diff BEFORE the worktree goes away, then (when the
 * agent is abandoned) remove the worktree and task branch and optionally reset
 * the task to planned. Errors are contained and logged; a second call for the
 * same execution is a no-op.
 *
 * Chain semantics: a worktree shared through a depends_on chain is never
 * removed while another agent in a non-terminal state still uses it.
 */

import { existsSync } from "node:fs";
import { createSupervisedChild, type SupervisedChild } from "../../lib/supervisor-core";
import { removeWorktree } from "../../lib/worktree";
import type { DaemonState, InternalAgentState } from "../state";

export interface AgentShutdownDeps {
  projectRoot: string;
  state: DaemonState;
  /** Kill the agent's process (monitor.remove). */
  killProcess(featureId: string): void;
  /** analytics.captureBestEffort */
  captureAnalytics(featureId: string): void;
  /** Reset the task file back to "planned". */
  resetTaskToPlanned(featureId: string): void;
}

export interface ShutdownOptions {
  /**
   * Which cleanup this is ("stop", "reap", "fail", "destroy"). The hook runs at
   * most once per agent execution and phase, so a killed agent whose dead
   * process is reaped later still gets its reap cleanup.
   */
  phase: string;
  /** Agents that are going away too and so do not count as worktree sharers. */
  releasing?: ReadonlySet<string>;
  /** Remove the worktree and task branch (agent abandoned). Default false. */
  removeWorktree?: boolean;
  /** Reset the task file to planned. Default false. */
  resetTask?: boolean;
  /** Remove the agent from daemon state (scheduler re-submits from disk). Default false. */
  removeAgent?: boolean;
}

/** Statuses after which an agent no longer needs a shared chain worktree. */
const RELEASED: ReadonlySet<string> = new Set(["failed", "merged"]);

export class AgentShutdown {
  private children = new Map<string, SupervisedChild>();

  constructor(private readonly deps: AgentShutdownDeps) {}

  /** True if another live agent still needs this agent's worktree. */
  hasLiveWorktreeSharer(agent: InternalAgentState, releasing?: ReadonlySet<string>): boolean {
    if (!agent.worktree) return false;
    return this.deps.state.getAllAgents().some(
      (other) =>
        other.featureId !== agent.featureId &&
        !releasing?.has(other.featureId) &&
        other.worktree === agent.worktree &&
        !RELEASED.has(other.status),
    );
  }

  /** Forget a finished execution so a relaunch of the same id gets a fresh hook. */
  reset(featureId: string): void {
    for (const key of [...this.children.keys()]) {
      if (key.startsWith(`${featureId}:`)) this.children.delete(key);
    }
  }

  /** Run the hook for an agent (at most once per execution). Never throws. */
  shutdown(featureId: string, opts: ShutdownOptions): Promise<void> {
    const key = `${featureId}:${opts.phase}`;
    let child = this.children.get(key);
    if (!child) {
      child = createSupervisedChild({
        id: featureId,
        policy: "transient",
        start: () => {},
        shutdown: () => this.run(featureId, opts),
        onShutdownError: (err) => this.log(featureId, err),
      });
      this.children.set(key, child);
    }
    return child.stop();
  }

  private run(featureId: string, opts: ShutdownOptions): void {
    const { state, projectRoot } = this.deps;
    const agent = state.getAgent(featureId);
    this.step(featureId, () => this.deps.killProcess(featureId));
    if (opts.resetTask) this.step(featureId, () => this.deps.resetTaskToPlanned(featureId));
    // Persist a best-effort diff before the worktree disappears
    this.step(featureId, () => this.deps.captureAnalytics(featureId));
    if (opts.removeWorktree && agent?.worktree && !this.hasLiveWorktreeSharer(agent, opts.releasing)) {
      this.step(featureId, () => removeWorktree({ projectRoot, wtPath: agent.worktree }));
    }
    if (opts.removeAgent) this.step(featureId, () => state.removeAgent(featureId));
  }

  /** Each step is isolated so one failure cannot skip the rest. */
  private step(featureId: string, fn: () => void): void {
    try { fn(); } catch (err) { this.log(featureId, err); }
  }

  private log(featureId: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      this.deps.state.emit("evt:log", { level: "warn", message: `[shutdown] ${featureId}: ${msg}` });
    } catch { /* contained */ }
  }

  /**
   * Remove an already-shut-down agent's worktree once nothing shares it any
   * more (e.g. after a cancelled chain's successors were failed downstream).
   */
  releaseWorktree(featureId: string): void {
    const agent = this.deps.state.getAgent(featureId);
    if (!agent?.worktree || !existsSync(agent.worktree) || this.hasLiveWorktreeSharer(agent)) return;
    this.step(featureId, () => removeWorktree({ projectRoot: this.deps.projectRoot, wtPath: agent.worktree }));
  }
}
