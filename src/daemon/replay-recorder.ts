/**
 * replay-recorder.ts — Records each agent execution into a replay file.
 *
 * Mirrors AnalyticsTracker: it subscribes to DaemonState's INTERNAL status and
 * removal observers and keys everything on the analytics execution id
 * (`agent.analytics.execution_id`), so one replay file exists per execution
 * and ordinary retries append to it. A user rerun of a finished execution gets
 * a new analytics execution and therefore a new replay file.
 *
 * The recorder only sees harness-neutral ReplayEvents. The caller (AgentRunner)
 * converts raw monitor events with a harness normalizer such as
 * `normalizeOpenCodeEvent`.
 *
 * Failures are reported through `onDiagnostic` and never thrown into the
 * execution path. Nothing is written for executions that never launch.
 */

import { ReplayStore, DEFAULT_KEEP_PER_TASK, truncateText, REPLAY_LIMITS, type ReplayEvent, type ReplayEndOutcome } from "../lib/replay";
import { captureWorktreeDiff } from "../lib/replay-diff";
import type { AgentStatus } from "./agent-status";
import type { DaemonState, InternalAgentState } from "./state";

export interface ReplayRecorderOptions {
  projectRoot: string;
  state: DaemonState;
  store?: ReplayStore;
  /** Executions kept per task after pruning (default DEFAULT_KEEP_PER_TASK). */
  keepPerTask?: number;
  onDiagnostic?: (message: string) => void;
}

interface Tracked {
  taskId: string;
  executionId: string;
  attempts: number;
  ended: boolean;
}

/** Failure details written by the daemon for cancellations (not real failures). */
const STOP_DETAIL = /downstream cancelled|skipped by user|cancelled by user/i;

export class ReplayRecorder {
  readonly store: ReplayStore;
  readonly diagnostics: string[] = [];

  private readonly state: DaemonState;
  private readonly keepPerTask: number;
  private readonly onDiagnostic?: (message: string) => void;
  private readonly tracked = new Map<string, Tracked>();
  private readonly stopRequests = new Set<string>();
  private readonly unsubscribe: Array<() => void> = [];
  private closed = false;

  constructor(opts: ReplayRecorderOptions) {
    this.state = opts.state;
    this.store = opts.store ?? new ReplayStore(opts.projectRoot);
    this.keepPerTask = opts.keepPerTask ?? DEFAULT_KEEP_PER_TASK;
    this.onDiagnostic = opts.onDiagnostic;
    this.unsubscribe.push(
      this.state.observeStatus((agent, _prev, next, detail) => this.onStatus(agent, next, detail)),
      this.state.observeRemoval((agent, reason) => this.finalize(agent.featureId, "stopped", `agent removed (${reason})`, agent)),
    );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Record the prompt of the current execution (creates the replay file). */
  recordPrompt(featureId: string, prompt: string): void {
    this.guard(featureId, (t) => {
      const cut = truncateText(prompt, REPLAY_LIMITS.prompt);
      this.store.append(t.taskId, t.executionId, { kind: "prompt", text: cut.text, truncated: cut.truncated });
    });
  }

  /** Record the start of an attempt: 1st launch ("start") or an ordinary retry. */
  recordAttempt(featureId: string, reason: "start" | "retry", text?: string): void {
    this.guard(featureId, (t) => {
      t.attempts += 1;
      const cut = text === undefined ? null : truncateText(text, REPLAY_LIMITS.error);
      this.store.append(t.taskId, t.executionId, {
        kind: "attempt",
        n: t.attempts,
        reason,
        ...(cut ? { text: cut.text, truncated: cut.truncated } : {}),
      });
    });
  }

  /** Record one normalized agent event. */
  recordEvent(featureId: string, event: ReplayEvent): void {
    this.guard(featureId, (t) => {
      this.store.append(t.taskId, t.executionId, { kind: "event", event });
    });
  }

  /**
   * Finish every unfinished execution as stopped (cancel-all / kill /
   * shutdown), capturing a best-effort diff.
   */
  interruptAll(reason: string): void {
    for (const featureId of [...this.tracked.keys()]) {
      this.finalize(featureId, "stopped", reason);
    }
  }

  /** Mark that the next failure of this agent is a user cancellation. */
  markStopRequested(featureId: string): void {
    this.stopRequests.add(featureId);
  }

  /** Stop recording (teardown); later callbacks are ignored. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private onStatus(agent: InternalAgentState, next: AgentStatus, detail: string | undefined): void {
    if (this.closed) return;
    switch (next) {
      case "verified":
        this.finalize(agent.featureId, "succeeded", detail ?? "verified", agent);
        break;
      case "merged":
        // Merged without an observed verification (recovery); no-op otherwise.
        this.finalize(agent.featureId, "succeeded", detail ?? "merged", agent);
        break;
      case "failed":
        this.finalize(
          agent.featureId,
          this.stopRequests.has(agent.featureId) || STOP_DETAIL.test(detail ?? "") ? "stopped" : "failed",
          detail,
          agent,
        );
        break;
      default:
        break;
    }
  }

  /** Resolve (or lazily start) the tracked replay of the agent's current execution. */
  private current(featureId: string): Tracked | null {
    const agent = this.state.getAgent(featureId);
    const executionId = agent?.analytics?.execution_id;
    if (!agent || !executionId) return null;
    const existing = this.tracked.get(featureId);
    if (existing && existing.executionId === executionId) return existing;
    // A different execution superseded the tracked one: close it out first.
    if (existing && !existing.ended) this.finalize(featureId, "stopped", "superseded by a new execution", agent);
    const t: Tracked = { taskId: featureId, executionId, attempts: 0, ended: false };
    this.tracked.set(featureId, t);
    this.store.begin({
      execution_id: executionId,
      task_id: featureId,
      quest_id: agent.analytics?.quest_id ?? null,
      wave_id: agent.analytics?.wave_id ?? null,
      agent: agent.agentName ?? null,
      model: agent.model ?? null,
      started_at: new Date().toISOString(),
    });
    return t;
  }

  private guard(featureId: string, fn: (t: Tracked) => void): void {
    if (this.closed) return;
    try {
      const t = this.current(featureId);
      if (!t || t.ended) return;
      fn(t);
    } catch (err) {
      this.report(`record ${featureId}: ${errMsg(err)}`);
    }
  }

  private finalize(featureId: string, outcome: ReplayEndOutcome, detail?: string, agent?: InternalAgentState): void {
    if (this.closed) return;
    const t = this.tracked.get(featureId);
    if (!t || t.ended) return;
    t.ended = true;
    this.stopRequests.delete(featureId);
    try {
      const a = agent ?? this.state.getAgent(featureId);
      if (a?.worktree) {
        const d = captureWorktreeDiff(a.worktree, a.analytics?.baseline_head ?? null);
        for (const m of d.diagnostics) this.report(`diff ${featureId}: ${m}`);
        if (d.diff || d.files.length > 0) {
          this.store.append(t.taskId, t.executionId, {
            kind: "diff",
            diff: d.diff,
            truncated: d.truncated,
            files: d.files,
            baseline: d.baseline,
          });
        }
      }
      const cut = detail === undefined ? null : truncateText(detail, REPLAY_LIMITS.error);
      this.store.append(t.taskId, t.executionId, { kind: "end", outcome, ...(cut ? { detail: cut.text } : {}) });
      this.store.prune({ keepPerFeature: this.keepPerTask, protect: this.activeExecutionIds() });
    } catch (err) {
      this.report(`finalize ${featureId}: ${errMsg(err)}`);
    }
  }

  private activeExecutionIds(): string[] {
    return [...this.tracked.values()].filter((t) => !t.ended).map((t) => t.executionId);
  }

  private report(message: string): void {
    this.diagnostics.push(message);
    try {
      this.onDiagnostic?.(message);
    } catch {
      /* diagnostics must never throw */
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
