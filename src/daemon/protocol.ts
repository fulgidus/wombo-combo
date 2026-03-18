/**
 * protocol.ts — WebSocket message types for daemon ↔ client communication.
 *
 * Every message is a JSON envelope: { type: string, payload: ... }
 * Client → Daemon messages are "commands" (prefixed Cmd*).
 * Daemon → Client messages are "events" (prefixed Evt*).
 *
 * The protocol is versioned so future changes can be detected.
 */

import type { AgentStatus } from "../lib/state";

// ---------------------------------------------------------------------------
// Protocol version
// ---------------------------------------------------------------------------

export const PROTOCOL_VERSION = 1;

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

/** Every WebSocket message is wrapped in this envelope. */
export interface Envelope<T extends string = string, P = unknown> {
  /** Message type discriminator */
  type: T;
  /** Message payload */
  payload: P;
  /** Monotonic sequence number (daemon sets for events, client sets for commands) */
  seq: number;
  /** ISO 8601 timestamp */
  ts: string;
}

// ---------------------------------------------------------------------------
// Client → Daemon commands
// ---------------------------------------------------------------------------

/** Handshake: first message from client after connecting. */
export interface CmdHandshake {
  protocolVersion: number;
  /** Client identifier (e.g. "tui", "cli", "remote") */
  clientId: string;
}

/** Request the daemon to start processing tasks. */
export interface CmdStart {
  /** Optional: only process tasks for this quest */
  questId?: string;
  /** Optional: override max concurrency */
  maxConcurrent?: number;
  /** Optional: override model */
  model?: string;
  /** Optional: specific task IDs to run (empty = auto-pick) */
  taskIds?: string[];
}

/** Pause the scheduler — no new tasks will be picked up. Running agents continue. */
export interface CmdPause {}

/** Resume a paused scheduler. */
export interface CmdResume {}

/** Gracefully stop: finish running agents, don't pick new tasks, then idle. */
export interface CmdStop {}

/** Force-kill all running agents and stop immediately. */
export interface CmdKill {}

/** Pin a task to run next (jump the priority queue). */
export interface CmdPinTask {
  taskId: string;
}

/** Skip a task — move it to the back of the queue. */
export interface CmdSkipTask {
  taskId: string;
}

/** Pause a specific running agent. */
export interface CmdPauseAgent {
  featureId: string;
}

/** Retry a failed agent. */
export interface CmdRetryAgent {
  featureId: string;
}

/** Cancel a queued or running agent. */
export interface CmdCancelAgent {
  featureId: string;
}

/** Answer a HITL question from an agent. */
export interface CmdHitlAnswer {
  featureId: string;
  questionId: string;
  answer: string;
}

/** Request full state snapshot. */
export interface CmdGetState {}

/** Update scheduler concurrency at runtime. */
export interface CmdSetConcurrency {
  maxConcurrent: number;
}

/** Shutdown the daemon process entirely. */
export interface CmdShutdown {
  /** If true, force-kill running agents first */
  force?: boolean;
}

// ---------------------------------------------------------------------------
// Daemon → Client events
// ---------------------------------------------------------------------------

/** Handshake response from daemon. */
export interface EvtHandshakeAck {
  protocolVersion: number;
  daemonPid: number;
  uptime: number;
}

/** Full state snapshot (sent on connect and on CmdGetState). */
export interface EvtStateSnapshot {
  /** Current scheduler state */
  scheduler: SchedulerState;
  /** All tracked agents */
  agents: DaemonAgentState[];
  /** Daemon uptime in ms */
  uptime: number;
}

/** Scheduler status changed (started, paused, stopping, idle). */
export interface EvtSchedulerStatus {
  status: SchedulerStatus;
  /** Reason for the change */
  reason?: string;
}

/** An agent's status changed. */
export interface EvtAgentStatusChange {
  featureId: string;
  previousStatus: AgentStatus;
  newStatus: AgentStatus;
  /** Additional context (error message, etc.) */
  detail?: string;
}

/** Agent activity update (tool use, file edit, etc.). */
export interface EvtAgentActivity {
  featureId: string;
  activity: string;
}

/** Agent produced output (for log streaming). */
export interface EvtAgentOutput {
  featureId: string;
  data: string;
}

/** Agent is asking a HITL question. */
export interface EvtHitlQuestion {
  featureId: string;
  questionId: string;
  questionText: string;
}

/** Build verification result for an agent. */
export interface EvtBuildResult {
  featureId: string;
  passed: boolean;
  output?: string;
  /** Which tier of conflict resolution was attempted (1-4), if any */
  conflictTier?: number;
}

/** Merge result for an agent. */
export interface EvtMergeResult {
  featureId: string;
  success: boolean;
  error?: string;
}

/** A task was picked from the queue and will be launched. */
export interface EvtTaskPicked {
  taskId: string;
  /** Position in queue when it was picked */
  queuePosition: number;
}

/** Token usage update for an agent. */
export interface EvtTokenUsage {
  featureId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Cumulative cost in USD (if model pricing is known) */
  cost?: number;
}

/** Generic log message from the daemon. */
export interface EvtLog {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  /** Optional structured data */
  data?: Record<string, unknown>;
}

/** Daemon is shutting down. */
export interface EvtShutdown {
  reason: string;
  /** Whether agents were force-killed */
  forced: boolean;
}

/** Error response to a client command. */
export interface EvtError {
  /** The command type that caused the error */
  commandType: string;
  /** The seq of the command that caused the error */
  commandSeq: number;
  message: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Composite type maps for discriminated union handling
// ---------------------------------------------------------------------------

export interface CommandMap {
  "cmd:handshake": CmdHandshake;
  "cmd:start": CmdStart;
  "cmd:pause": CmdPause;
  "cmd:resume": CmdResume;
  "cmd:stop": CmdStop;
  "cmd:kill": CmdKill;
  "cmd:pin-task": CmdPinTask;
  "cmd:skip-task": CmdSkipTask;
  "cmd:pause-agent": CmdPauseAgent;
  "cmd:retry-agent": CmdRetryAgent;
  "cmd:cancel-agent": CmdCancelAgent;
  "cmd:hitl-answer": CmdHitlAnswer;
  "cmd:get-state": CmdGetState;
  "cmd:set-concurrency": CmdSetConcurrency;
  "cmd:shutdown": CmdShutdown;
}

export interface EventMap {
  "evt:handshake-ack": EvtHandshakeAck;
  "evt:state-snapshot": EvtStateSnapshot;
  "evt:scheduler-status": EvtSchedulerStatus;
  "evt:agent-status-change": EvtAgentStatusChange;
  "evt:agent-activity": EvtAgentActivity;
  "evt:agent-output": EvtAgentOutput;
  "evt:hitl-question": EvtHitlQuestion;
  "evt:build-result": EvtBuildResult;
  "evt:merge-result": EvtMergeResult;
  "evt:task-picked": EvtTaskPicked;
  "evt:token-usage": EvtTokenUsage;
  "evt:log": EvtLog;
  "evt:shutdown": EvtShutdown;
  "evt:error": EvtError;
}

export type CommandType = keyof CommandMap;
export type EventType = keyof EventMap;
export type MessageType = CommandType | EventType;

/** A fully typed command message. */
export type CommandMessage<T extends CommandType = CommandType> =
  T extends CommandType ? Envelope<T, CommandMap[T]> : never;

/** A fully typed event message. */
export type EventMessage<T extends EventType = EventType> =
  T extends EventType ? Envelope<T, EventMap[T]> : never;

/** Any message (command or event). */
export type Message = CommandMessage | EventMessage;

// ---------------------------------------------------------------------------
// Daemon-side state types (extended from WaveState for continuous model)
// ---------------------------------------------------------------------------

/** Scheduler operating status. */
export type SchedulerStatus =
  | "idle"          // No tasks to run, waiting
  | "running"       // Actively processing tasks
  | "paused"        // User paused, running agents continue
  | "stopping"      // Finishing running agents, no new picks
  | "draining"      // Like stopping but waiting for merges too
  | "shutdown";     // Daemon is exiting

/** Agent state as exposed to clients (extends core AgentState with daemon info). */
export interface DaemonAgentState {
  featureId: string;
  taskTitle: string;
  branch: string;
  baseBranch: string;
  worktree: string;
  status: AgentStatus;
  pid: number | null;
  sessionId: string | null;
  activity: string | null;
  activityUpdatedAt: string | null;
  retries: number;
  maxRetries: number;
  startedAt: string | null;
  completedAt: string | null;
  buildPassed: boolean | null;
  error: string | null;
  effortEstimateMs: number | null;
  streamIndex: number | null;
  dependsOn: string[];
  dependedOnBy: string[];
  agentName: string | null;
  agentType: string | null;
  /** Pending HITL questions for this agent */
  pendingQuestions: Array<{
    questionId: string;
    questionText: string;
    askedAt: string;
  }>;
  /** Token usage stats */
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  } | null;
}

/** Top-level scheduler state broadcast to clients. */
export interface SchedulerState {
  status: SchedulerStatus;
  maxConcurrent: number;
  model: string | null;
  baseBranch: string;
  questId: string | null;
  startedAt: string | null;
  /** IDs of tasks pinned to run next */
  pinnedTasks: string[];
  /** IDs of tasks explicitly skipped */
  skippedTasks: string[];
  /** Total tasks processed since daemon start */
  totalProcessed: number;
  /** Total tasks completed (verified+merged) since daemon start */
  totalCompleted: number;
  /** Total tasks failed since daemon start */
  totalFailed: number;
}

// ---------------------------------------------------------------------------
// Connection constants
// ---------------------------------------------------------------------------

/** Default WebSocket port for the daemon. */
export const DEFAULT_WS_PORT = 19420;

/** PID file name (inside .wombo-combo/). */
export const PID_FILE = "daemon.pid";

/** Daemon idle timeout before auto-shutdown (5 minutes). */
export const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a command envelope. */
export function makeCommand<T extends CommandType>(
  type: T,
  payload: CommandMap[T],
  seq: number
): CommandMessage<T> {
  return {
    type,
    payload,
    seq,
    ts: new Date().toISOString(),
  } as CommandMessage<T>;
}

/** Create an event envelope. */
export function makeEvent<T extends EventType>(
  type: T,
  payload: EventMap[T],
  seq: number
): EventMessage<T> {
  return {
    type,
    payload,
    seq,
    ts: new Date().toISOString(),
  } as EventMessage<T>;
}

/** Parse a raw WebSocket message into a typed envelope. */
export function parseMessage(raw: string): Message | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.type === "string" &&
      typeof parsed.seq === "number"
    ) {
      return parsed as Message;
    }
    return null;
  } catch {
    return null;
  }
}
