import type {
  ChildHandle,
  ChildSnapshot,
  ChildSpec,
  ChildState,
  EscalationReason,
  ExitReason,
  RestartType,
} from "./types";

/** Mutable bookkeeping for one supervised child; owned by the Supervisor. */
export interface ChildRecord {
  readonly spec: ChildSpec;
  readonly id: string;
  readonly restart: RestartType;
  readonly shutdownTimeoutMs: number;
  state: ChildState;
  /** Bumped on every start and every intentional stop; stale exits carry an older token. */
  token: number;
  handle?: ChildHandle;
  controller?: AbortController;
  /** Consecutive restart attempt (0 for the initial start). */
  attempt: number;
  /** Total restarts performed. */
  restarts: number;
  lastExit?: ExitReason;
  lastExitAt?: number;
  startedAt?: number;
  nextRestartAt?: number;
}

export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

export function makeRecord(spec: ChildSpec): ChildRecord {
  return {
    spec,
    id: spec.id,
    restart: spec.restart ?? "permanent",
    shutdownTimeoutMs: spec.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    state: "stopped",
    token: 0,
    attempt: 0,
    restarts: 0,
  };
}

/** Errors become plain { name, message } so snapshots are JSON/structuredClone safe. */
export function serializeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: "Error", message: String(error) };
}

export function serializeExit(reason: ExitReason): ExitReason {
  return reason.kind === "crash" ? { kind: "crash", error: serializeError(reason.error) } : { kind: reason.kind };
}

export function serializeEscalation(reason: EscalationReason): EscalationReason {
  return reason.kind === "start_failed" ? { ...reason, error: serializeError(reason.error) } : { ...reason };
}

export function snapshotChild(rec: ChildRecord): ChildSnapshot {
  const snap: ChildSnapshot = {
    id: rec.id,
    state: rec.state,
    restart: rec.restart,
    attempt: rec.attempt,
    restarts: rec.restarts,
  };
  if (rec.lastExit) snap.lastExit = serializeExit(rec.lastExit);
  if (rec.lastExitAt !== undefined) snap.lastExitAt = rec.lastExitAt;
  if (rec.startedAt !== undefined) snap.startedAt = rec.startedAt;
  if (rec.nextRestartAt !== undefined) snap.nextRestartAt = rec.nextRestartAt;
  return snap;
}
