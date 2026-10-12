import type { Clock } from "./clock";

export type ExitReason =
  | { kind: "normal" }
  | { kind: "shutdown" }
  | { kind: "crash"; error: unknown };

export const NORMAL: ExitReason = { kind: "normal" };
export const SHUTDOWN: ExitReason = { kind: "shutdown" };

export function crash(error: unknown): ExitReason {
  return { kind: "crash", error };
}

/**
 * A running child. `exit` never rejects: failures resolve as
 * `{ kind: "crash", error }`. `abort()` requests a graceful stop; the child
 * should then resolve with `{ kind: "shutdown" }` (or any reason).
 */
export interface ChildHandle {
  readonly exit: Promise<ExitReason>;
  abort(reason?: unknown): void;
}

export interface ChildContext {
  signal: AbortSignal;
  clock: Clock;
  attempt: number;
}

/** permanent: always restart; transient: only on crash; temporary: never. */
export type RestartType = "permanent" | "transient" | "temporary";

export interface ChildSpec {
  id: string;
  start(ctx: ChildContext): ChildHandle | Promise<ChildHandle>;
  /** Default "permanent". */
  restart?: RestartType;
  /** Default 5000. */
  shutdownTimeoutMs?: number;
}

export type RestartStrategy = "one_for_one" | "one_for_all" | "rest_for_one";

export interface BackoffOptions {
  initialMs: number;
  maxMs: number;
  factor: number;
  /** 0..1; applied with an injectable random fn. */
  jitter?: number;
}

export interface IntensityOptions {
  maxRestarts: number;
  periodMs: number;
}

export interface SupervisorOptions {
  name?: string;
  /** Default one_for_one. */
  strategy?: RestartStrategy;
  /** Default 3 restarts / 5000ms. */
  intensity?: IntensityOptions;
  /** Default initial 100ms, max 5000ms, factor 2, jitter 0. */
  backoff?: BackoffOptions;
  clock?: Clock;
  random?: () => number;
  children?: ChildSpec[];
}

export type EscalationReason =
  | { kind: "max_intensity"; childId: string; restarts: number; periodMs: number }
  | { kind: "start_failed"; childId: string; error: unknown };

export interface SupervisorEvents {
  child_started: { supervisor: string; childId: string; attempt: number };
  child_exited: { supervisor: string; childId: string; reason: ExitReason };
  child_restarted: { supervisor: string; childId: string; attempt: number; delayMs: number };
  supervisor_escalated: { supervisor: string; reason: EscalationReason };
}

export type ChildState = "starting" | "running" | "backoff" | "stopping" | "stopped" | "terminated";

export interface ChildSnapshot {
  id: string;
  state: ChildState;
  restart: RestartType;
  attempt: number;
  restarts: number;
  lastExit?: ExitReason;
  lastExitAt?: number;
  startedAt?: number;
  nextRestartAt?: number;
}

export type SupervisorState = "running" | "stopping" | "stopped" | "escalated";

export interface SupervisorSnapshot {
  name: string;
  strategy: RestartStrategy;
  state: SupervisorState;
  intensity: IntensityOptions;
  recentRestarts: number;
  children: ChildSnapshot[];
  /** Nested child supervisors. */
  supervisors?: SupervisorSnapshot[];
  escalation?: EscalationReason;
}
