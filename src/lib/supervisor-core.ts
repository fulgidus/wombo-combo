/**
 * Pure restart-policy primitives for supervised agent children.
 * No daemon, state or worktree imports.
 */

/** "transient": restart only on abnormal exit. Others are typed for extensibility. */
export type RestartPolicy = "transient" | "permanent" | "temporary";

export type ExitReason =
  | { kind: "normal" }
  | { kind: "crash"; error: string }
  | { kind: "hang"; idleMs: number }
  | { kind: "verify-failed"; error: string };

export type RestartDecision =
  | { action: "restart"; attempt: number; max: number }
  | { action: "stop-normal" }
  | { action: "give-up"; reason: "intensity" };

export interface RestartTrackerOptions {
  /** Same meaning as config.defaults.maxRetries (restarts after the first attempt). */
  maxRestarts: number;
  /** Restarts already used, e.g. rehydrated from agent.retries. */
  initialRestarts?: number;
}

export interface RestartTracker {
  readonly restarts: number;
  readonly maxRestarts: number;
  decide(reason: ExitReason): RestartDecision;
}

/**
 * Counts restarts (no time window). A restart is allowed while
 * restarts < maxRestarts, mirroring `agent.retries < agent.maxRetries`.
 */
export function createRestartTracker(opts: RestartTrackerOptions): RestartTracker {
  const max = opts.maxRestarts;
  let restarts = opts.initialRestarts ?? 0;
  return {
    get restarts() { return restarts; },
    get maxRestarts() { return max; },
    decide(reason) {
      if (reason.kind === "normal") return { action: "stop-normal" };
      if (restarts >= max) return { action: "give-up", reason: "intensity" };
      restarts++;
      return { action: "restart", attempt: restarts, max };
    },
  };
}

export interface ChildSpec {
  id: string;
  policy: RestartPolicy;
  start(): void | Promise<void>;
  /** Cleanup hook (kill process, remove worktree). Runs at most once. */
  shutdown(): void | Promise<void>;
  /** Receives errors thrown by shutdown(); they never propagate. */
  onShutdownError?(error: unknown): void;
}

export interface SupervisedChild {
  readonly id: string;
  readonly policy: RestartPolicy;
  start(): void | Promise<void>;
  /** Invokes the shutdown hook once; later and concurrent calls share the result. */
  stop(): Promise<void>;
}

export function createSupervisedChild(spec: ChildSpec): SupervisedChild {
  let stopping: Promise<void> | null = null;
  return {
    id: spec.id,
    policy: spec.policy,
    start: () => spec.start(),
    stop() {
      stopping ??= (async () => {
        try {
          await spec.shutdown();
        } catch (err) {
          try { spec.onShutdownError?.(err); } catch { /* contained */ }
        }
      })();
      return stopping;
    },
  };
}
