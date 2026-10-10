/**
 * dashboard-metrics.ts — Pure, deterministic model for the realtime dashboard.
 *
 * Holds typed dashboard state plus pure reducers fed with daemon snapshots and
 * typed events. Nothing here reads the wall clock, the filesystem or the
 * network: every function that depends on time receives an explicit `now`
 * (epoch milliseconds, the receipt time of the payload).
 *
 * Scope notes:
 *   - Throughput is the number of *successful* tracked-agent completions per
 *     minute, in fixed one-minute buckets (at most 60 buckets are kept).
 *     A single agent is counted once per execution: completed -> verified ->
 *     merged is one completion, and re-delivered snapshots never recount.
 *   - The remaining-time estimate is approximate and only covers *tracked
 *     unfinished agents*, never the whole project backlog.
 *   - Nothing is persisted.
 */

import type { AgentStatus } from "../daemon/agent-status";
import type {
  DaemonAgentState,
  EvtAgentActivity,
  EvtAgentStatusChange,
  EvtBuildResult,
  EvtMergeResult,
  EvtSchedulerStatus,
  EvtStateSnapshot,
  EvtTaskPicked,
  SchedulerStatus,
} from "../daemon/protocol";
import type { UsageTotals } from "./token-usage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Width of one throughput bucket. */
export const THROUGHPUT_BUCKET_MS = 60_000;
/** Maximum number of throughput buckets (one hour of history). */
export const MAX_THROUGHPUT_BUCKETS = 60;
/** Maximum number of retained activity entries. */
export const MAX_ACTIVITY_ENTRIES = 100;
/** Maximum stored length of an activity line. */
const MAX_ACTIVITY_TEXT = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Dashboard bucket for an agent lifecycle state. */
export type StatusCategory = "running" | "done" | "failed" | "queued" | "retry";

/** Whether the dashboard data may be presented as live. */
export type DashboardConnection =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected"
  /** No daemon client at all (historical data only). */
  | "unavailable";

export interface TrackedAgent {
  id: string;
  status: AgentStatus;
  /** Epoch ms when the current execution started, or null if unknown. */
  startedAt: number | null;
  /** Epoch ms of the last completion known from the daemon, or null. */
  completedAt: number | null;
  retries: number;
  /** Effort estimate in ms, or null when the task has none. */
  effortEstimateMs: number | null;
  /**
   * True once the current execution has been counted as a successful
   * completion. Cleared when the agent re-enters an execution state.
   */
  completionCounted: boolean;
}

export interface ActivityEntry {
  /** Receipt time, epoch ms. */
  at: number;
  kind: "status" | "activity" | "build" | "merge" | "scheduler" | "task";
  featureId: string | null;
  /** Single-line, control-character-free text. */
  text: string;
}

export interface ThroughputHistory {
  /** Start (epoch ms, aligned) of the newest bucket; null before first sample. */
  newestBucketStart: number | null;
  /** Completions per bucket, oldest first; always MAX_THROUGHPUT_BUCKETS long. */
  buckets: number[];
}

export interface SchedulerSummary {
  status: SchedulerStatus;
  /** 0 means unlimited. */
  maxConcurrent: number;
  questId: string | null;
}

export interface StatusCounts {
  running: number;
  done: number;
  failed: number;
  queued: number;
  retry: number;
  /** Number of tracked agents. */
  total: number;
}

export interface DashboardMetricsState {
  agents: Readonly<Record<string, TrackedAgent>>;
  counts: StatusCounts;
  throughput: ThroughputHistory;
  /** Newest first, at most MAX_ACTIVITY_ENTRIES. */
  activity: readonly ActivityEntry[];
  scheduler: SchedulerSummary | null;
  /** True once a snapshot has been applied. */
  hasSnapshot: boolean;
  /** Receipt time of the last applied input, or null. */
  lastUpdatedAt: number | null;
}

/** Quest-level persisted token totals (JSONL is the only source). */
export interface QuestUsageEntry {
  /** Quest id, or null for the explicit "unknown" group. */
  questId: string | null;
  totals: UsageTotals;
}

export type RemainingEstimate =
  /** Nothing unfinished is tracked. */
  | { kind: "none" }
  /** Not enough data. */
  | {
      kind: "unknown";
      reason: "no-scheduler" | "no-estimates" | "paused";
    }
  /** Approximate time left for tracked unfinished agents only. */
  | {
      kind: "estimate";
      ms: number;
      approximate: true;
      scope: "tracked-agents";
      /** Unfinished tracked agents. */
      agents: number;
      /** Of those, how many lacked an effort estimate (not included in ms). */
      unestimated: number;
    };

export type DashboardEvent =
  | { type: "evt:state-snapshot"; payload: EvtStateSnapshot }
  | { type: "evt:agent-status-change"; payload: EvtAgentStatusChange }
  | { type: "evt:agent-activity"; payload: EvtAgentActivity }
  | { type: "evt:build-result"; payload: EvtBuildResult }
  | { type: "evt:merge-result"; payload: EvtMergeResult }
  | { type: "evt:scheduler-status"; payload: EvtSchedulerStatus }
  | { type: "evt:task-picked"; payload: EvtTaskPicked };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse an ISO timestamp into epoch ms; null when missing or invalid. */
export function parseTimestamp(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value === "") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function isValidNow(now: number): boolean {
  return typeof now === "number" && Number.isFinite(now);
}

/** Collapse control characters / newlines into a bounded single line. */
export function sanitizeLine(value: unknown, max = MAX_ACTIVITY_TEXT): string {
  const raw = typeof value === "string" ? value : String(value ?? "");
  // eslint-disable-next-line no-control-regex
  const flat = raw.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, Math.max(0, max - 1)) + "…" : flat;
}

/** Map a lifecycle state onto the dashboard bucket. */
export function categorize(status: AgentStatus): StatusCategory {
  switch (status) {
    case "installing":
    case "running":
    case "resolving_conflict":
      return "running";
    case "completed":
    case "verified":
    case "merged":
      return "done";
    case "failed":
      return "failed";
    case "retry":
      return "retry";
    case "queued":
    default:
      return "queued";
  }
}

function isUnfinished(status: AgentStatus): boolean {
  const c = categorize(status);
  return c !== "done" && c !== "failed";
}

function computeCounts(agents: Readonly<Record<string, TrackedAgent>>): StatusCounts {
  const counts: StatusCounts = { running: 0, done: 0, failed: 0, queued: 0, retry: 0, total: 0 };
  for (const id in agents) {
    counts.total++;
    counts[categorize(agents[id]!.status)]++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Throughput
// ---------------------------------------------------------------------------

function alignBucket(ms: number): number {
  return Math.floor(ms / THROUGHPUT_BUCKET_MS) * THROUGHPUT_BUCKET_MS;
}

export function createThroughput(): ThroughputHistory {
  return { newestBucketStart: null, buckets: new Array(MAX_THROUGHPUT_BUCKETS).fill(0) };
}

/**
 * Advance the window so its newest bucket covers `now`. Empty buckets are
 * inserted for every elapsed minute even when no events arrived. A clock that
 * moves backwards never rewinds the window.
 */
export function advanceThroughput(history: ThroughputHistory, now: number): ThroughputHistory {
  if (!isValidNow(now)) return history;
  const target = alignBucket(now);
  if (history.newestBucketStart === null) {
    return { newestBucketStart: target, buckets: new Array(MAX_THROUGHPUT_BUCKETS).fill(0) };
  }
  if (target <= history.newestBucketStart) return history;
  const shift = Math.min(
    MAX_THROUGHPUT_BUCKETS,
    Math.round((target - history.newestBucketStart) / THROUGHPUT_BUCKET_MS),
  );
  const buckets = history.buckets.slice(shift);
  while (buckets.length < MAX_THROUGHPUT_BUCKETS) buckets.push(0);
  return { newestBucketStart: target, buckets };
}

/**
 * Record one completion at `at`. Completions older than the window are
 * dropped (not invented into a bucket); future timestamps clamp to `now`.
 */
export function recordCompletion(
  history: ThroughputHistory,
  at: number,
  now: number,
): ThroughputHistory {
  const advanced = advanceThroughput(history, now);
  if (advanced.newestBucketStart === null || !isValidNow(at)) return advanced;
  const newest = advanced.newestBucketStart;
  const bucketStart = Math.min(alignBucket(at), newest);
  const back = Math.round((newest - bucketStart) / THROUGHPUT_BUCKET_MS);
  if (back >= MAX_THROUGHPUT_BUCKETS) return advanced;
  const buckets = advanced.buckets.slice();
  buckets[MAX_THROUGHPUT_BUCKETS - 1 - back]! += 1;
  return { newestBucketStart: newest, buckets };
}

// ---------------------------------------------------------------------------
// State creation / activity
// ---------------------------------------------------------------------------

export function createDashboardMetrics(now?: number): DashboardMetricsState {
  const throughput = createThroughput();
  return {
    agents: {},
    counts: computeCounts({}),
    throughput: now !== undefined && isValidNow(now) ? advanceThroughput(throughput, now) : throughput,
    activity: [],
    scheduler: null,
    hasSnapshot: false,
    lastUpdatedAt: null,
  };
}

function pushActivity(
  list: readonly ActivityEntry[],
  entry: ActivityEntry,
): readonly ActivityEntry[] {
  // Consecutive activity lines from one agent replace each other so a chatty
  // agent cannot flush the rest of the feed.
  const head = list[0];
  if (
    entry.kind === "activity" &&
    head &&
    head.kind === "activity" &&
    head.featureId === entry.featureId
  ) {
    return [entry, ...list.slice(1)];
  }
  const next = [entry, ...list];
  if (next.length > MAX_ACTIVITY_ENTRIES) next.length = MAX_ACTIVITY_ENTRIES;
  return next;
}

// ---------------------------------------------------------------------------
// Agent transitions
// ---------------------------------------------------------------------------

function newAgent(id: string, status: AgentStatus): TrackedAgent {
  return {
    id,
    status,
    startedAt: null,
    completedAt: null,
    retries: 0,
    effortEstimateMs: null,
    completionCounted: false,
  };
}

function isActiveExecution(status: AgentStatus): boolean {
  return categorize(status) === "running";
}

/** Result of moving an agent to a status; `completed` says a new completion was earned. */
function transition(
  agent: TrackedAgent,
  status: AgentStatus,
  now: number,
): { agent: TrackedAgent; completed: boolean } {
  const next: TrackedAgent = { ...agent, status };
  const cat = categorize(status);
  let completed = false;

  if (cat === "done") {
    if (!next.completionCounted) {
      next.completionCounted = true;
      next.completedAt = isValidNow(now) ? now : next.completedAt;
      completed = true;
    }
  } else if (cat === "failed") {
    // Failure alone does not reset the counted flag; a new execution does.
  } else {
    // queued / retry / running: a new (or still running) execution.
    next.completionCounted = false;
    if (cat === "retry" && agent.status !== "retry") next.retries = agent.retries + 1;
    if (isActiveExecution(status) && next.startedAt === null && isValidNow(now)) {
      next.startedAt = now;
    }
    if (cat === "queued" || cat === "retry") next.startedAt = null;
  }
  return { agent: next, completed };
}

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

function finish(
  state: DashboardMetricsState,
  agents: Readonly<Record<string, TrackedAgent>>,
  throughput: ThroughputHistory,
  activity: readonly ActivityEntry[],
  scheduler: SchedulerSummary | null,
  now: number,
  hasSnapshot = state.hasSnapshot,
): DashboardMetricsState {
  return {
    agents,
    counts: computeCounts(agents),
    throughput,
    activity,
    scheduler,
    hasSnapshot,
    lastUpdatedAt: isValidNow(now) ? now : state.lastUpdatedAt,
  };
}

/**
 * Reconcile a full snapshot. Agents absent from the snapshot are dropped.
 * Completion timestamps from the snapshot seed throughput only for agents
 * not seen before; nothing is invented for agents without a valid
 * `completedAt`, and re-delivered snapshots never count twice.
 */
export function applySnapshot(
  state: DashboardMetricsState,
  snapshot: EvtStateSnapshot,
  now: number,
): DashboardMetricsState {
  let throughput = advanceThroughput(state.throughput, now);
  const agents: Record<string, TrackedAgent> = {};
  const list: readonly DaemonAgentState[] = Array.isArray(snapshot?.agents) ? snapshot.agents : [];

  for (const raw of list) {
    if (!raw || typeof raw.featureId !== "string" || raw.featureId === "") continue;
    const id = raw.featureId;
    const prev = state.agents[id];
    const cat = categorize(raw.status);
    const completedAt = parseTimestamp(raw.completedAt);
    const effort =
      typeof raw.effortEstimateMs === "number" && Number.isFinite(raw.effortEstimateMs) && raw.effortEstimateMs > 0
        ? raw.effortEstimateMs
        : null;

    let agent: TrackedAgent;
    if (prev) {
      const t = transition(prev, raw.status, now);
      agent = t.agent;
      if (t.completed) throughput = recordCompletion(throughput, completedAt ?? now, now);
    } else {
      agent = newAgent(id, raw.status);
      if (cat === "done") {
        agent.completionCounted = true;
        // Seed history only from a real completion timestamp.
        if (completedAt !== null) {
          throughput = recordCompletion(throughput, completedAt, now);
        }
      }
    }
    const startedAt = parseTimestamp(raw.startedAt);
    if (isActiveExecution(raw.status)) {
      agent.startedAt = startedAt ?? agent.startedAt ?? (isValidNow(now) ? now : null);
    } else if (startedAt !== null && cat === "done") {
      agent.startedAt = startedAt;
    }
    agent.completedAt = completedAt ?? agent.completedAt;
    agent.effortEstimateMs = effort;
    agent.retries = typeof raw.retries === "number" && Number.isFinite(raw.retries) ? raw.retries : agent.retries;
    agents[id] = agent;
  }

  const s = snapshot?.scheduler;
  const scheduler: SchedulerSummary | null = s
    ? {
        status: s.status,
        maxConcurrent:
          typeof s.maxConcurrent === "number" && Number.isFinite(s.maxConcurrent) && s.maxConcurrent > 0
            ? Math.floor(s.maxConcurrent)
            : 0,
        questId: s.questId ?? null,
      }
    : state.scheduler;

  return finish(state, agents, throughput, state.activity, scheduler, now, true);
}

function applyStatusChange(
  state: DashboardMetricsState,
  p: EvtAgentStatusChange,
  now: number,
): DashboardMetricsState {
  if (!p || typeof p.featureId !== "string" || p.featureId === "") return state;
  let throughput = advanceThroughput(state.throughput, now);
  const prev = state.agents[p.featureId] ?? newAgent(p.featureId, p.previousStatus ?? p.newStatus);
  const { agent, completed } = transition(prev, p.newStatus, now);
  if (completed) throughput = recordCompletion(throughput, now, now);
  const agents = { ...state.agents, [p.featureId]: agent };
  const detail = p.detail ? ` — ${sanitizeLine(p.detail, 80)}` : "";
  const activity = pushActivity(state.activity, {
    at: now,
    kind: "status",
    featureId: p.featureId,
    text: `${sanitizeLine(p.previousStatus, 24)} → ${sanitizeLine(p.newStatus, 24)}${detail}`,
  });
  return finish(state, agents, throughput, activity, state.scheduler, now);
}

/** Apply one typed daemon event at receipt time `now`. Unknown shapes are ignored. */
export function applyDashboardEvent(
  state: DashboardMetricsState,
  event: DashboardEvent,
  now: number,
): DashboardMetricsState {
  if (!event) return state;
  switch (event.type) {
    case "evt:state-snapshot":
      return applySnapshot(state, event.payload, now);
    case "evt:agent-status-change":
      return applyStatusChange(state, event.payload, now);
    case "evt:agent-activity": {
      const p = event.payload;
      if (!p || typeof p.featureId !== "string") return state;
      return {
        ...state,
        throughput: advanceThroughput(state.throughput, now),
        activity: pushActivity(state.activity, {
          at: now,
          kind: "activity",
          featureId: p.featureId,
          text: sanitizeLine(p.activity),
        }),
        lastUpdatedAt: isValidNow(now) ? now : state.lastUpdatedAt,
      };
    }
    case "evt:build-result": {
      const p = event.payload;
      if (!p || typeof p.featureId !== "string") return state;
      return {
        ...state,
        throughput: advanceThroughput(state.throughput, now),
        activity: pushActivity(state.activity, {
          at: now,
          kind: "build",
          featureId: p.featureId,
          text: p.passed ? "build passed" : "build failed",
        }),
        lastUpdatedAt: isValidNow(now) ? now : state.lastUpdatedAt,
      };
    }
    case "evt:merge-result": {
      const p = event.payload;
      if (!p || typeof p.featureId !== "string") return state;
      const err = !p.success && p.error ? ` — ${sanitizeLine(p.error, 80)}` : "";
      return {
        ...state,
        throughput: advanceThroughput(state.throughput, now),
        activity: pushActivity(state.activity, {
          at: now,
          kind: "merge",
          featureId: p.featureId,
          text: p.success ? "merged" : `merge failed${err}`,
        }),
        lastUpdatedAt: isValidNow(now) ? now : state.lastUpdatedAt,
      };
    }
    case "evt:scheduler-status": {
      const p = event.payload;
      if (!p) return state;
      const reason = p.reason ? ` — ${sanitizeLine(p.reason, 80)}` : "";
      return {
        ...state,
        throughput: advanceThroughput(state.throughput, now),
        scheduler: state.scheduler ? { ...state.scheduler, status: p.status } : state.scheduler,
        activity: pushActivity(state.activity, {
          at: now,
          kind: "scheduler",
          featureId: null,
          text: `scheduler ${sanitizeLine(p.status, 24)}${reason}`,
        }),
        lastUpdatedAt: isValidNow(now) ? now : state.lastUpdatedAt,
      };
    }
    case "evt:task-picked": {
      const p = event.payload;
      if (!p || typeof p.taskId !== "string") return state;
      return {
        ...state,
        throughput: advanceThroughput(state.throughput, now),
        activity: pushActivity(state.activity, {
          at: now,
          kind: "task",
          featureId: p.taskId,
          text: "picked from queue",
        }),
        lastUpdatedAt: isValidNow(now) ? now : state.lastUpdatedAt,
      };
    }
    default:
      return state;
  }
}

/** Advance time only (empty buckets keep scrolling without events). */
export function tickDashboardMetrics(state: DashboardMetricsState, now: number): DashboardMetricsState {
  const throughput = advanceThroughput(state.throughput, now);
  return throughput === state.throughput ? state : { ...state, throughput };
}

// ---------------------------------------------------------------------------
// Remaining-time estimate
// ---------------------------------------------------------------------------

/**
 * Approximate remaining time for the tracked unfinished agents only.
 *
 * Each unfinished agent with an effort estimate contributes
 * `effort - elapsed` (never negative) while running, or the full effort while
 * waiting. With `c` effective workers the estimate is
 * `max(longest remaining, total remaining / c)`. `maxConcurrent` of 0 means
 * unlimited concurrency.
 */
export function estimateRemaining(state: DashboardMetricsState, now: number): RemainingEstimate {
  const unfinished = Object.values(state.agents).filter((a) => isUnfinished(a.status));
  if (unfinished.length === 0) return { kind: "none" };
  if (!state.scheduler) return { kind: "unknown", reason: "no-scheduler" };
  if (state.scheduler.status === "paused") return { kind: "unknown", reason: "paused" };

  let total = 0;
  let longest = 0;
  let estimated = 0;
  for (const a of unfinished) {
    if (a.effortEstimateMs === null || !(a.effortEstimateMs > 0)) continue;
    estimated++;
    let remaining = a.effortEstimateMs;
    if (isActiveExecution(a.status) && a.startedAt !== null && isValidNow(now)) {
      remaining = Math.max(0, a.effortEstimateMs - Math.max(0, now - a.startedAt));
    }
    total += remaining;
    if (remaining > longest) longest = remaining;
  }
  if (estimated === 0) return { kind: "unknown", reason: "no-estimates" };

  const limit = state.scheduler.maxConcurrent;
  const workers = limit > 0 ? Math.min(limit, estimated) : estimated;
  const ms = Math.max(longest, total / Math.max(1, workers));
  return {
    kind: "estimate",
    ms: Math.round(ms),
    approximate: true,
    scope: "tracked-agents",
    agents: unfinished.length,
    unestimated: unfinished.length - estimated,
  };
}

/** Throughput samples (completions per minute), oldest first. */
export function throughputSamples(state: DashboardMetricsState): number[] {
  return state.throughput.buckets.slice();
}
