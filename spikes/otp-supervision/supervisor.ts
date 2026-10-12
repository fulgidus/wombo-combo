/**
 * OTP-style supervisor core. THROWAWAY spike: not imported by src/, does not
 * touch the daemon. Answers: is this expressible in a few hundred lines of TS?
 */

export type RestartType = "permanent" | "transient" | "temporary";
export type Strategy = "one_for_one" | "one_for_all" | "rest_for_one";

export interface ChildSpec {
  id: string;
  /** Resolves = normal exit, rejects = crash. Must settle soon after `signal` aborts. */
  start: (signal: AbortSignal) => Promise<void>;
  restart: RestartType;
  /** Grace period after abort before the child is abandoned. */
  shutdownMs: number;
}

export type SupervisorEvent =
  | { type: "child_started"; id: string }
  | { type: "child_exit"; id: string; crashed: boolean; error?: unknown; timedOut?: boolean }
  | { type: "child_restarted"; id: string; restarts: number }
  | { type: "intensity_exceeded"; maxRestarts: number; periodMs: number; restarts: number }
  | { type: "escalated"; reason: Error };

/** Injectable time source so tests can drive timers deterministically. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export interface SupervisorOptions {
  strategy: Strategy;
  maxRestarts: number;
  periodMs: number;
  children: ChildSpec[];
  clock?: Clock;
  onEvent?: (e: SupervisorEvent) => void;
  onEscalate?: (reason: Error) => void;
}

interface Slot {
  spec: ChildSpec;
  ctrl: AbortController | null;
  done: Promise<void> | null;
  /** Set when the supervisor itself is stopping the run; its exit is not a failure. */
  stopping: boolean;
  /** Temporary/transient child that ended and will not be restarted. */
  retired: boolean;
}

export class Supervisor {
  private slots: Slot[];
  private clock: Clock;
  private restartTimes: number[] = [];
  private restartCount = new Map<string, number>();
  private queue: Promise<void> = Promise.resolve();
  private closed = false;
  private settle: { resolve: () => void; reject: (e: Error) => void } | null = null;

  constructor(private opts: SupervisorOptions) {
    this.clock = opts.clock ?? realClock;
    this.slots = opts.children.map((spec) => ({ spec, ctrl: null, done: null, stopping: false, retired: false }));
  }

  /**
   * Run until `signal` aborts (resolves), every child has retired (resolves),
   * or restart intensity is exceeded (rejects). Usable as a ChildSpec.start,
   * which makes a Supervisor a valid child of a parent Supervisor.
   */
  run(signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.settle = { resolve, reject };
      signal?.addEventListener("abort", () => void this.shutdown().then(() => this.finish()), { once: true });
      for (const slot of this.slots) this.startSlot(slot);
    });
  }

  /** Stop all children in reverse start order and end `run`. */
  async stop(): Promise<void> {
    await this.shutdown();
    this.finish();
  }

  /** Wrap this supervisor as a child spec for a parent supervisor. */
  asChild(id: string, restart: RestartType = "permanent", shutdownMs = 5000): ChildSpec {
    return { id, restart, shutdownMs, start: (signal) => this.reset().run(signal) };
  }

  private reset(): this {
    this.closed = false;
    this.restartTimes = [];
    for (const s of this.slots) s.retired = false;
    return this;
  }

  private emit(e: SupervisorEvent): void {
    this.opts.onEvent?.(e);
  }

  private finish(error?: Error): void {
    const s = this.settle;
    this.settle = null;
    if (error) s?.reject(error);
    else s?.resolve();
  }

  private startSlot(slot: Slot): void {
    const ctrl = new AbortController();
    slot.ctrl = ctrl;
    slot.stopping = false;
    this.emit({ type: "child_started", id: slot.spec.id });
    const done = Promise.resolve()
      .then(() => slot.spec.start(ctrl.signal))
      .then(
        () => this.onExit(slot, ctrl, false),
        (error) => this.onExit(slot, ctrl, true, error),
      );
    slot.done = done;
  }

  private onExit(slot: Slot, ctrl: AbortController, crashed: boolean, error?: unknown): void {
    // Stale exit from a run the supervisor already replaced or stopped.
    if (slot.ctrl !== ctrl || slot.stopping || this.closed) return;
    slot.ctrl = null;
    this.emit({ type: "child_exit", id: slot.spec.id, crashed, ...(crashed ? { error } : {}) });
    // Serialize restart handling so concurrent crashes never interleave.
    this.queue = this.queue.then(() => this.handleExit(slot, crashed));
  }

  private async handleExit(slot: Slot, crashed: boolean): Promise<void> {
    if (this.closed) return;
    const { restart } = slot.spec;
    if (restart === "temporary" || (restart === "transient" && !crashed)) {
      slot.retired = true;
      if (this.slots.every((s) => s.retired)) this.finish();
      return;
    }
    const now = this.clock.now();
    this.restartTimes = this.restartTimes.filter((t) => now - t < this.opts.periodMs);
    this.restartTimes.push(now);
    if (this.restartTimes.length > this.opts.maxRestarts) {
      this.emit({
        type: "intensity_exceeded",
        maxRestarts: this.opts.maxRestarts,
        periodMs: this.opts.periodMs,
        restarts: this.restartTimes.length,
      });
      await this.shutdown();
      const reason = new Error(
        `restart intensity exceeded: more than ${this.opts.maxRestarts} restarts in ${this.opts.periodMs}ms`,
      );
      this.emit({ type: "escalated", reason });
      this.opts.onEscalate?.(reason);
      this.finish(reason);
      return;
    }
    const idx = this.slots.indexOf(slot);
    const affected = this.slots.filter((s, i) => {
      if (s.retired) return false;
      if (this.opts.strategy === "one_for_all") return true;
      if (this.opts.strategy === "rest_for_one") return i >= idx;
      return s === slot;
    });
    for (const s of [...affected].reverse()) await this.stopSlot(s);
    if (this.closed) return;
    for (const s of affected) {
      this.startSlot(s);
      const restarts = (this.restartCount.get(s.spec.id) ?? 0) + 1;
      this.restartCount.set(s.spec.id, restarts);
      this.emit({ type: "child_restarted", id: s.spec.id, restarts });
    }
  }

  /** Abort one child and wait for it to settle, or give up after shutdownMs. */
  private async stopSlot(slot: Slot): Promise<void> {
    const { ctrl, done } = slot;
    if (!ctrl || !done) return;
    slot.stopping = true;
    ctrl.abort();
    let handle: unknown;
    const timedOut = await Promise.race([
      done.then(() => false),
      new Promise<boolean>((r) => (handle = this.clock.setTimeout(() => r(true), slot.spec.shutdownMs))),
    ]);
    this.clock.clearTimeout(handle);
    slot.ctrl = null;
    slot.done = null;
    this.emit({ type: "child_exit", id: slot.spec.id, crashed: false, ...(timedOut ? { timedOut } : {}) });
  }

  private async shutdown(): Promise<void> {
    this.closed = true;
    for (const s of [...this.slots].reverse()) await this.stopSlot(s);
  }
}
