/**
 * analytics-tracker.ts — Keeps per-execution analytics snapshots in sync with
 * the daemon's agent lifecycle.
 *
 * Wiring: the tracker subscribes to DaemonState's INTERNAL status and removal
 * observers (not client-facing events), so measurements are captured
 * synchronously before the public event is emitted.
 *
 * Semantics (see src/lib/analytics.ts for field definitions):
 * - An execution is allocated on submission. Ordinary retries keep identity,
 *   first-start time and accumulated metrics. A user-requested retry of a
 *   FINISHED execution starts a NEW execution, even though the agent state
 *   object is reused and its retries counter resets.
 * - DaemonState status "completed" only means the process exited; it is NOT
 *   success. Success = reaching "verified"; duration runs from first process
 *   start to that moment and excludes later merge waiting. Merge outcome is
 *   tracked separately.
 * - Queued/never-started executions that are cancelled get no invented
 *   duration or usage.
 * - Persistence is incremental (every change) and independent of the
 *   daemon's write-once history export. Failures are reported through
 *   `onDiagnostic` and never thrown into the execution path.
 * - Usage totals are accumulated here from monitor usage callbacks; this
 *   module never appends to usage.jsonl (ProcessMonitor already does).
 */

import { randomBytes } from "node:crypto";
import {
  AnalyticsStore,
  StaleRevisionError,
  createAnalyticsRecord,
  type AgentAnalyticsRecord,
} from "../lib/analytics";
import { existsSync } from "node:fs";
import { captureHead, measureLineChanges } from "../lib/analytics-git";
import type { UsageRecord } from "../lib/token-collector";
import type { AgentStatus } from "./agent-status";
import type { DaemonState, InternalAgentState, StatusObserverInfo } from "./state";

export interface AnalyticsTrackerOptions {
  projectRoot: string;
  state: DaemonState;
  /** Daemon session id (history.wave_id) for newly submitted executions. */
  waveId: string;
  store?: AnalyticsStore;
  /** Called for every analytics failure; never blocks execution. */
  onDiagnostic?: (message: string) => void;
}

export interface ExecutionContext {
  questId: string | null;
  agentId: string | null;
  model: string | null;
}

/** Failure details written by the daemon for cancellations (not real failures). */
const STOP_DETAIL = /downstream cancelled|skipped by user|cancelled by user/i;
const USER_RETRY_DETAIL = /^Retry requested by user/;

export function allocateExecutionId(taskId: string): string {
  return `${taskId}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

export class AnalyticsTracker {
  readonly store: AnalyticsStore;
  /** Diagnostics collected so far (also forwarded to onDiagnostic). */
  readonly diagnostics: string[] = [];

  private readonly state: DaemonState;
  private readonly waveId: string;
  private readonly onDiagnostic?: (message: string) => void;
  private readonly stopRequests = new Map<string, string>();
  private readonly unsubscribe: Array<() => void> = [];
  private closed = false;

  constructor(opts: AnalyticsTrackerOptions) {
    this.state = opts.state;
    this.waveId = opts.waveId;
    this.store = opts.store ?? new AnalyticsStore(opts.projectRoot);
    this.onDiagnostic = opts.onDiagnostic;

    this.unsubscribe.push(
      this.state.observeStatus((agent, prev, next, detail, info) => this.onStatus(agent, prev, next, detail, info)),
      this.state.observeRemoval((agent, reason) => this.onRemoval(agent, reason)),
    );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Allocate a new execution for `agent` (call on submission, before the
   * agent is added to state). Finalizes a superseded unfinished execution.
   */
  allocate(agent: InternalAgentState, ctx: ExecutionContext): AgentAnalyticsRecord {
    const previous = this.state.getAgent(agent.featureId);
    if (previous && previous !== agent && previous.analytics && !isFinished(previous.analytics)) {
      this.finish(previous, "stopped", "superseded by a new submission");
    }
    const record = this.newExecution(agent.featureId, ctx);
    agent.analytics = record;
    agent.analyticsUnmonitored = false;
    this.persist(agent);
    return record;
  }

  /** Restore persisted snapshots into agent state (call before reconciliation). */
  restore(): void {
    for (const agent of this.state.getAllAgents()) {
      const meta = agent.analytics;
      if (!meta) {
        // Older state without analytics metadata: start a fresh execution
        // best-effort, seeded with what the agent state knows.
        const record = this.newExecution(agent.featureId, {
          questId: null,
          agentId: agent.agentName,
          model: agent.model ?? null,
        });
        record.first_started_at = agent.startedAt;
        agent.analytics = record;
        if (isActive(agent.status)) agent.analyticsUnmonitored = true;
        this.persist(agent);
        continue;
      }
      const snap = this.store.get(meta.execution_id);
      if (snap && snap.revision >= meta.revision) {
        agent.analytics = snap;
      } else {
        agent.analytics = meta;
        this.persist(agent);
      }
      // PID-only recovery cannot see the live token stream.
      if (isActive(agent.status) && !isFinished(agent.analytics)) {
        agent.analyticsUnmonitored = true;
      }
    }
  }

  /** Record the first process start for an execution (idempotent). */
  recordProcessStart(featureId: string): void {
    this.mutate(featureId, (rec) => {
      if (rec.first_started_at) return false;
      rec.first_started_at = new Date().toISOString();
      return true;
    });
  }

  /** Accumulate one monitored usage record into the execution totals. */
  recordUsage(featureId: string, record: UsageRecord): void {
    const agent = this.state.getAgent(featureId);
    this.mutate(featureId, (rec) => {
      const u = rec.usage;
      u.input_tokens += record.input_tokens ?? 0;
      u.output_tokens += record.output_tokens ?? 0;
      u.cache_read += record.cache_read ?? 0;
      u.cache_write += record.cache_write ?? 0;
      u.reasoning_tokens += record.reasoning_tokens ?? 0;
      u.total_tokens += record.total_tokens ?? 0;
      u.total_cost += record.cost ?? 0;
      u.record_count += 1;
      rec.usage_coverage = agent?.analyticsUnmonitored ? "partial" : "full";
      return true;
    });
  }

  /**
   * Flag that part of this execution's token stream is not monitored
   * (e.g. conflict resolvers), so observed usage can only be partial.
   */
  markUnmonitoredUsage(featureId: string): void {
    const agent = this.state.getAgent(featureId);
    if (!agent || this.closed) return;
    agent.analyticsUnmonitored = true;
    this.mutate(featureId, (rec) => {
      if (rec.usage.record_count > 0 && rec.usage_coverage !== "partial") {
        rec.usage_coverage = "partial";
      }
      return true;
    });
  }

  /** Apply a patch to the current execution snapshot (for later trackers). */
  update(featureId: string, patch: Partial<AgentAnalyticsRecord>): void {
    this.mutate(featureId, (rec) => {
      Object.assign(rec, patch);
      return true;
    });
  }

  // -------------------------------------------------------------------------
  // Build & diff measurements
  // -------------------------------------------------------------------------

  /**
   * Capture the immutable baseline HEAD (after worktree preparation, before
   * the first agent process). Preserved across ordinary retries; each chain
   * member captures its own starting HEAD. Never replaced by null.
   */
  captureBaseline(featureId: string): void {
    const agent = this.state.getAgent(featureId);
    if (!agent?.analytics || this.closed || agent.analytics.baseline_head) return;
    const head = captureHead(agent.worktree);
    if (!head.head) {
      this.report(`baseline ${featureId}: ${head.diagnostics.join("; ")}`);
      return;
    }
    this.update(featureId, { baseline_head: head.head });
  }

  /**
   * Tier-four re-run: the worktree was reset, so capture a replacement
   * baseline. Duration and verification timestamps are left untouched.
   */
  captureReplacementBaseline(featureId: string): void {
    const agent = this.state.getAgent(featureId);
    if (!agent?.analytics || this.closed) return;
    const head = captureHead(agent.worktree);
    if (!head.head) {
      this.report(`replacement baseline ${featureId}: ${head.diagnostics.join("; ")}`);
      return;
    }
    this.update(featureId, { baseline_head: head.head });
  }

  /** Count one actual build invocation (never fabricates passes). */
  recordBuild(featureId: string, passed: boolean): void {
    this.mutate(featureId, (rec) => {
      rec.build_attempts += 1;
      if (passed) rec.build_passes += 1;
      return true;
    });
  }

  /**
   * Measure committed changes baseline..HEAD now. Call at successful
   * verification BEFORE the verified status is applied ("measured"), or after
   * a tier-four replacement commit ("replacement"). A failed measurement never
   * replaces a valid one.
   */
  measure(featureId: string, phase: "measured" | "replacement" = "measured"): void {
    const agent = this.state.getAgent(featureId);
    if (!agent?.analytics || this.closed) return;
    if (this.measureInto(agent, phase, {})) this.persist(agent);
    else if (agent.analytics.measurement_phase === "pending") {
      agent.analytics.measurement_phase = "unavailable";
      this.persist(agent);
    }
  }

  /**
   * Best-effort measurement before failure, reaping or cleanup. Only fills in
   * executions that have no measurement yet.
   */
  captureBestEffort(featureId: string): void {
    const agent = this.state.getAgent(featureId);
    if (!agent?.analytics || this.closed) return;
    if (this.measureInto(agent, "measured", { onlyIfUnmeasured: true })) this.persist(agent);
  }

  /** True if the execution already has a valid (non-null) measurement. */
  hasMeasurement(featureId: string): boolean {
    const rec = this.state.getAgent(featureId)?.analytics;
    return !!rec && rec.additions !== null && rec.deletions !== null;
  }

  /** Mark that the next failure of this agent is a cancellation. */
  markStopRequested(featureId: string, reason: string): void {
    this.stopRequests.set(featureId, reason);
  }

  /**
   * Finish every unfinished execution as stopped (cancel-all / kill /
   * shutdown). Verified executions awaiting merge are left untouched.
   */
  interruptAll(reason: string): void {
    for (const agent of this.state.getAllAgents()) {
      if (agent.analytics && !isFinished(agent.analytics)) {
        this.finish(agent, "stopped", reason);
      }
    }
  }

  /** Flush interrupted state and ignore any later callbacks (teardown). */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
  }

  // -------------------------------------------------------------------------
  // Observers
  // -------------------------------------------------------------------------

  private onStatus(
    agent: InternalAgentState,
    _prev: AgentStatus,
    next: AgentStatus,
    detail: string | undefined,
    info: StatusObserverInfo,
  ): void {
    if (this.closed) return;
    if (!agent.analytics) {
      // Agent added without going through submission (legacy/recovered)
      agent.analytics = this.newExecution(agent.featureId, {
        questId: null,
        agentId: agent.agentName,
        model: agent.model ?? null,
      });
      agent.analytics.first_started_at = agent.startedAt;
    }
    const rec = agent.analytics;

    // A user retry of a finished execution is a new execution.
    if (isFinished(rec) && (next === "retry" || next === "queued")) {
      if (info.userRetry || USER_RETRY_DETAIL.test(detail ?? "")) {
        this.persist(agent); // make sure the finished one is stored
        agent.analytics = this.newExecution(agent.featureId, {
          questId: rec.quest_id,
          agentId: rec.agent_id,
          model: agent.model ?? rec.model,
        });
        agent.analyticsUnmonitored = false;
        this.stopRequests.delete(agent.featureId);
        this.persist(agent);
      }
      // Otherwise: a late callback after the execution finished; ignore.
      return;
    }

    switch (next) {
      case "retry":
        if (!isFinished(rec)) {
          rec.retry_count += 1;
          this.persist(agent);
        }
        break;

      case "verified":
        if (rec.verified_at === null && rec.outcome === "running") {
          const now = new Date();
          rec.outcome = "succeeded";
          rec.verified_at = now.toISOString();
          rec.duration_ms = rec.first_started_at
            ? Math.max(0, now.getTime() - new Date(rec.first_started_at).getTime())
            : null;
          this.persist(agent);
        }
        break;

      case "merged":
        if (rec.merge_outcome !== "merged" && (rec.outcome === "running" || rec.outcome === "succeeded")) {
          if (rec.outcome === "running") {
            // Merged without an observed verification (e.g. recovery)
            rec.outcome = "succeeded";
          }
          rec.merge_outcome = "merged";
          this.persist(agent);
        }
        break;

      case "failed": {
        if (rec.outcome === "succeeded") {
          // Verified work that later failed to merge
          rec.merge_outcome = "failed";
          this.persist(agent);
        } else if (rec.outcome === "running") {
          const stopReason = this.stopRequests.get(agent.featureId);
          const stopped = stopReason !== undefined || STOP_DETAIL.test(detail ?? "");
          this.finish(agent, stopped ? "stopped" : "failed", stopReason ?? detail);
        }
        this.stopRequests.delete(agent.featureId);
        break;
      }

      default:
        break;
    }
  }

  private onRemoval(agent: InternalAgentState, reason: string): void {
    if (this.closed || !agent.analytics) return;
    if (!isFinished(agent.analytics)) {
      this.finish(agent, "stopped", `agent removed (${reason})`);
    } else {
      this.persist(agent);
    }
    this.stopRequests.delete(agent.featureId);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private finish(agent: InternalAgentState, outcome: "failed" | "stopped", _reason?: string): void {
    const rec = agent.analytics;
    if (!rec || rec.outcome !== "running") return;
    // Best-effort diff before the worktree can be cleaned up.
    this.measureInto(agent, "measured", { onlyIfUnmeasured: true });
    rec.outcome = outcome;
    rec.merge_outcome = "not_applicable";
    this.persist(agent);
  }

  /**
   * Compute baseline..HEAD in the agent's worktree into the record (no
   * persist). Returns whether a valid measurement was stored. Unknown results
   * are reported and never overwrite existing values.
   */
  private measureInto(
    agent: InternalAgentState,
    phase: "measured" | "replacement",
    opts: { onlyIfUnmeasured?: boolean },
  ): boolean {
    const rec = agent.analytics;
    if (!rec || !rec.baseline_head || !agent.worktree) return false;
    if (opts.onlyIfUnmeasured && rec.measurement_phase !== "pending" && rec.measurement_phase !== "unavailable") {
      return false;
    }
    if (!existsSync(agent.worktree)) return false;
    try {
      const head = captureHead(agent.worktree);
      if (!head.head) {
        this.report(`measure ${agent.featureId}: ${head.diagnostics.join("; ")}`);
        return false;
      }
      const m = measureLineChanges(agent.worktree, rec.baseline_head, head.head);
      if (m.additions === null || m.deletions === null) {
        this.report(`measure ${agent.featureId}: ${m.diagnostics.join("; ")}`);
        return false;
      }
      rec.additions = m.additions;
      rec.deletions = m.deletions;
      rec.measured_head = head.head;
      rec.measurement_phase = phase;
      return true;
    } catch (err) {
      this.report(`measure ${agent.featureId}: ${errMsg(err)}`);
      return false;
    }
  }

  private newExecution(featureId: string, ctx: ExecutionContext): AgentAnalyticsRecord {
    const task = this.state.getAgent(featureId);
    return createAnalyticsRecord({
      execution_id: allocateExecutionId(featureId),
      wave_id: this.waveId,
      task_id: featureId,
      quest_id: ctx.questId,
      agent_id: ctx.agentId,
      model: ctx.model ?? task?.model ?? null,
    });
  }

  private mutate(featureId: string, fn: (rec: AgentAnalyticsRecord) => boolean): void {
    if (this.closed) return;
    const agent = this.state.getAgent(featureId);
    if (!agent?.analytics) return;
    // Finished executions are immutable except for merge bookkeeping handled
    // by status transitions; late callbacks must not corrupt them.
    if (isFinished(agent.analytics) && agent.analytics.outcome !== "succeeded") return;
    try {
      if (fn(agent.analytics)) this.persist(agent);
    } catch (err) {
      this.report(`mutate ${featureId}: ${errMsg(err)}`);
    }
  }

  private persist(agent: InternalAgentState): void {
    const rec = agent.analytics;
    if (!rec) return;
    try {
      let saved: AgentAnalyticsRecord;
      try {
        saved = this.store.upsert(rec);
      } catch (err) {
        if (!(err instanceof StaleRevisionError)) throw err;
        // Another writer advanced the snapshot: adopt its revision and retry once.
        rec.revision = err.current;
        saved = this.store.upsert(rec);
      }
      rec.revision = saved.revision;
      rec.updated_at = saved.updated_at;
    } catch (err) {
      this.report(`persist ${rec.execution_id}: ${errMsg(err)}`);
    }
    this.state.updateAgent(agent.featureId, { analytics: rec, analyticsUnmonitored: agent.analyticsUnmonitored });
  }

  /** Surface an analytics-relevant failure without affecting execution. */
  reportDiagnostic(message: string): void {
    this.report(message);
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

function isFinished(rec: AgentAnalyticsRecord): boolean {
  return rec.outcome !== "running";
}

function isActive(status: AgentStatus): boolean {
  return status === "installing" || status === "running" || status === "resolving_conflict" || status === "in_review" || status === "retry";
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
