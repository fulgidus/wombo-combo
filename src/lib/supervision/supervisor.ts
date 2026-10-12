import { computeBackoff, DEFAULT_BACKOFF, DEFAULT_BACKOFF_RESET_MS } from "./backoff";
import type { Clock } from "./clock";
import { systemClock } from "./clock";
import {
  makeRecord,
  serializeEscalation,
  snapshotChild,
  type ChildRecord,
} from "./child-state";
import { TypedEmitter } from "./events";
import type { SupervisorEmitter } from "./events";
import { DEFAULT_INTENSITY, IntensityTracker } from "./intensity";
import { stopChildrenInOrder } from "./shutdown";
import type { StopItem } from "./shutdown";
import { filterRestartable, planRestart, shouldRestart } from "./strategies";
import { SHUTDOWN, crash } from "./types";
import type {
  ChildHandle,
  ChildSpec,
  EscalationReason,
  ExitReason,
  RestartType,
  SupervisorEvents,
  SupervisorOptions,
  SupervisorSnapshot,
  SupervisorState,
} from "./types";

export class SupervisorEscalation extends Error {
  readonly reason: EscalationReason;

  constructor(reason: EscalationReason, supervisor?: string) {
    super(
      `supervisor${supervisor ? ` "${supervisor}"` : ""} escalated: ${
        reason.kind === "max_intensity"
          ? `child "${reason.childId}" exceeded ${reason.restarts - 1} restarts in ${reason.periodMs}ms`
          : `child "${reason.childId}" failed to start`
      }`,
    );
    this.name = "SupervisorEscalation";
    this.reason = reason;
  }
}

type Phase = "idle" | SupervisorState;
type StartResult = { status: "started" } | { status: "failed"; error: unknown } | { status: "aborted" };

/** A group of children waiting for one shared backoff delay before being started. */
interface Batch {
  ids: Set<string>;
  attempt: number;
  delayMs: number;
  pendingStops: number;
  timer?: unknown;
}

interface NestedLink {
  current?: Supervisor;
}

/** Spec -> the supervisor it currently runs, so snapshot() can nest them. */
const nestedLinks = new WeakMap<ChildSpec, NestedLink>();

export class Supervisor {
  readonly events: SupervisorEmitter = new TypedEmitter<SupervisorEvents>();
  /** Resolves with shutdown after stop(), or crash(SupervisorEscalation) on escalation. Never rejects. */
  readonly exit: Promise<ExitReason>;

  private readonly name: string;
  private readonly strategy;
  private readonly intensity;
  private readonly backoff;
  private readonly clock: Clock;
  private readonly random: () => number;
  private readonly tracker: IntensityTracker;
  private readonly records: ChildRecord[] = [];
  private readonly batches = new Set<Batch>();
  private readonly inflight = new Set<Promise<unknown>>();
  private resolveExit!: (reason: ExitReason) => void;
  private phase: Phase = "idle";
  private stopPromise?: Promise<void>;
  private escalation?: EscalationReason;

  constructor(opts: SupervisorOptions = {}) {
    this.name = opts.name ?? "supervisor";
    this.strategy = opts.strategy ?? "one_for_one";
    this.intensity = opts.intensity ?? DEFAULT_INTENSITY;
    this.backoff = opts.backoff ?? DEFAULT_BACKOFF;
    this.clock = opts.clock ?? systemClock;
    this.random = opts.random ?? Math.random;
    this.tracker = new IntensityTracker(this.intensity, this.clock);
    this.exit = new Promise<ExitReason>((resolve) => {
      this.resolveExit = resolve;
    });
    for (const spec of opts.children ?? []) this.addChild(spec);
  }

  /** Convenience for `supervisor.events.on`; returns an unsubscribe function. */
  on<K extends keyof SupervisorEvents>(event: K, listener: (payload: SupervisorEvents[K]) => void): () => void {
    return this.events.on(event, listener);
  }

  addChild(spec: ChildSpec): void {
    if (this.records.some((r) => r.id === spec.id)) throw new Error(`Duplicate child id: ${spec.id}`);
    const rec = makeRecord(spec);
    this.records.push(rec);
    if (this.phase === "running") void this.startInitial(rec).catch(() => {});
  }

  async start(): Promise<void> {
    if (this.phase !== "idle") return;
    this.phase = "running";
    for (const rec of [...this.records]) {
      // Group restarts triggered by an earlier failure move later children to "backoff".
      if (this.phase !== "running") break;
      if (rec.state !== "stopped") continue;
      await this.startInitial(rec);
    }
  }

  stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    if (this.phase === "idle") {
      this.phase = "stopped";
      this.resolveExit(SHUTDOWN);
      return (this.stopPromise = Promise.resolve());
    }
    if (this.phase === "stopped" || this.phase === "escalated") return Promise.resolve();
    return (this.stopPromise = this.shutdown().then(() => {
      this.phase = "stopped";
      this.resolveExit(SHUTDOWN);
    }));
  }

  /**
   * A ChildSpec that runs this very supervisor. It can only be started once;
   * use Supervisor.childSpec with a factory when the parent may restart it.
   */
  asChildSpec(id: string, opts?: { restart?: RestartType; shutdownTimeoutMs?: number }): ChildSpec {
    return Supervisor.makeSpec(id, () => {
      if (this.phase !== "idle") {
        throw new Error("Supervisor already started; use Supervisor.childSpec with a factory");
      }
      return this;
    }, opts);
  }

  /** A ChildSpec that builds a FRESH Supervisor on every (re)start. */
  static childSpec(
    id: string,
    factory: () => Supervisor,
    opts?: { restart?: RestartType; shutdownTimeoutMs?: number },
  ): ChildSpec {
    return Supervisor.makeSpec(id, factory, opts);
  }

  private static makeSpec(
    id: string,
    factory: () => Supervisor,
    opts?: { restart?: RestartType; shutdownTimeoutMs?: number },
  ): ChildSpec {
    const link: NestedLink = {};
    const spec: ChildSpec = {
      id,
      restart: opts?.restart,
      shutdownTimeoutMs: opts?.shutdownTimeoutMs,
      async start(): Promise<ChildHandle> {
        const sup = factory();
        link.current = sup;
        await sup.start();
        return {
          exit: sup.exit,
          abort: () => {
            void sup.stop().catch(() => {});
          },
        };
      },
    };
    nestedLinks.set(spec, link);
    return spec;
  }

  snapshot(): SupervisorSnapshot {
    const nested: SupervisorSnapshot[] = [];
    for (const rec of this.records) {
      const sup = nestedLinks.get(rec.spec)?.current;
      if (sup && sup !== this) nested.push(sup.snapshot());
    }
    const snap: SupervisorSnapshot = {
      name: this.name,
      strategy: this.strategy,
      state: this.phase === "idle" ? "stopped" : this.phase,
      intensity: { ...this.intensity },
      recentRestarts: this.tracker.count(),
      children: this.records.map(snapshotChild),
    };
    if (nested.length > 0) snap.supervisors = nested;
    if (this.escalation) snap.escalation = serializeEscalation(this.escalation);
    return snap;
  }

  // --- starting ---------------------------------------------------------

  private emit<K extends keyof SupervisorEvents>(event: K, payload: Omit<SupervisorEvents[K], "supervisor">): void {
    this.events.emit(event, { supervisor: this.name, ...payload } as SupervisorEvents[K]);
  }

  private async startInitial(rec: ChildRecord): Promise<void> {
    const res = await this.startChild(rec, 0);
    if (res.status === "started") this.emit("child_started", { childId: rec.id, attempt: 0 });
    else if (res.status === "failed") this.handleExit(rec, crash(res.error), true);
  }

  private async startChild(rec: ChildRecord, attempt: number): Promise<StartResult> {
    const token = ++rec.token;
    const controller = new AbortController();
    rec.controller = controller;
    rec.state = "starting";
    let handle: ChildHandle;
    try {
      handle = await rec.spec.start({ signal: controller.signal, clock: this.clock, attempt });
    } catch (error) {
      return rec.token === token ? { status: "failed", error } : { status: "aborted" };
    }
    if (rec.token !== token || this.phase !== "running") {
      try {
        handle.abort("shutdown");
      } catch {
        /* a late child that cannot abort is abandoned */
      }
      return { status: "aborted" };
    }
    rec.handle = handle;
    rec.state = "running";
    rec.attempt = attempt;
    rec.startedAt = this.clock.now();
    rec.nextRestartAt = undefined;
    const settle = (reason: ExitReason) => {
      try {
        this.onExit(rec, token, reason);
      } catch {
        /* supervision must survive internal errors */
      }
    };
    handle.exit.then(settle, (error) => settle(crash(error)));
    return { status: "started" };
  }

  // --- exits and restarts -----------------------------------------------

  private onExit(rec: ChildRecord, token: number, reason: ExitReason): void {
    if (rec.token !== token || this.phase !== "running") return;
    this.handleExit(rec, reason, false);
  }

  private handleExit(rec: ChildRecord, reason: ExitReason, startFailed: boolean): void {
    if (this.phase !== "running") return;
    const now = this.clock.now();
    const ranMs = rec.startedAt !== undefined ? now - rec.startedAt : 0;
    rec.handle = undefined;
    rec.controller = undefined;
    rec.startedAt = undefined;
    rec.lastExit = reason;
    rec.lastExitAt = now;
    this.emit("child_exited", { childId: rec.id, reason });
    if (!shouldRestart(rec.restart, reason)) {
      rec.state = "terminated";
      return;
    }
    const attempt = ranMs >= DEFAULT_BACKOFF_RESET_MS ? 1 : rec.attempt + 1;
    const { exceeded, count } = this.tracker.record();
    if (exceeded) {
      const error = reason.kind === "crash" ? reason.error : undefined;
      void this.escalate(
        startFailed
          ? { kind: "start_failed", childId: rec.id, error }
          : { kind: "max_intensity", childId: rec.id, restarts: count, periodMs: this.intensity.periodMs },
      ).catch(() => {});
      return;
    }
    this.scheduleRestart(rec, attempt);
  }

  private scheduleRestart(failed: ChildRecord, attempt: number): void {
    const delayMs = computeBackoff(attempt, this.backoff, this.random);
    const specs = new Map(this.records.map((r) => [r.id, { restart: r.restart }]));
    const plan = filterRestartable(
      planRestart(this.strategy, this.records.map((r) => r.id), failed.id),
      specs,
    );
    const byId = new Map(this.records.map((r) => [r.id, r]));

    // Coalesce group restarts into the pending batch; one_for_one children back off independently.
    let batch = this.strategy === "one_for_one" ? undefined : this.batches.values().next().value;
    if (batch) {
      if (batch.timer !== undefined) {
        this.clock.clearTimeout(batch.timer);
        batch.timer = undefined;
      }
      batch.attempt = Math.max(batch.attempt, attempt);
      batch.delayMs = Math.max(batch.delayMs, delayMs);
    } else {
      batch = { ids: new Set(), attempt, delayMs, pendingStops: 0 };
      this.batches.add(batch);
    }
    for (const id of plan.start) batch.ids.add(id);

    const items: StopItem[] = [];
    for (const id of plan.stop) {
      const item = this.detach(byId.get(id)!);
      if (item) items.push(item);
    }
    const restartAt = this.clock.now() + delayMs;
    for (const id of batch.ids) {
      const rec = byId.get(id)!;
      rec.attempt = batch.attempt;
      rec.nextRestartAt = restartAt;
      if (rec.state !== "stopping") rec.state = "backoff";
    }
    if (items.length === 0) {
      this.arm(batch);
      return;
    }
    batch.pendingStops++;
    const done = this.reportStops(items, batch.ids)
      .catch(() => {})
      .then(() => {
        batch.pendingStops--;
        this.arm(batch);
      });
    this.track(done);
  }

  /** Invalidates the child's current run and returns what is needed to stop it, if it is alive. */
  private detach(rec: ChildRecord): StopItem | undefined {
    rec.token++;
    const handle = rec.handle;
    if (!handle) {
      rec.controller?.abort();
      return undefined;
    }
    rec.handle = undefined;
    rec.state = "stopping";
    return { id: rec.id, handle, timeoutMs: rec.shutdownTimeoutMs, controller: rec.controller };
  }

  private async reportStops(items: StopItem[], restarting?: ReadonlySet<string>): Promise<void> {
    const results = await stopChildrenInOrder(items, this.clock);
    for (const [id, result] of results) {
      const rec = this.records.find((r) => r.id === id)!;
      rec.lastExit = result.reason;
      rec.lastExitAt = this.clock.now();
      rec.controller = undefined;
      rec.startedAt = undefined;
      rec.state = this.phase !== "running" ? "stopped" : restarting?.has(id) ? "backoff" : "terminated";
      this.emit("child_exited", { childId: id, reason: result.reason });
    }
  }

  private arm(batch: Batch): void {
    if (this.phase !== "running" || !this.batches.has(batch)) return;
    if (batch.pendingStops > 0 || batch.timer !== undefined) return;
    const restartAt = this.clock.now() + batch.delayMs;
    for (const rec of this.records) if (batch.ids.has(rec.id)) rec.nextRestartAt = restartAt;
    batch.timer = this.clock.setTimeout(() => {
      this.track(this.fire(batch).catch(() => {}));
    }, batch.delayMs);
  }

  private async fire(batch: Batch): Promise<void> {
    this.batches.delete(batch);
    for (const rec of [...this.records]) {
      if (this.phase !== "running") return;
      if (!batch.ids.has(rec.id) || rec.state !== "backoff") continue;
      const res = await this.startChild(rec, batch.attempt);
      if (res.status === "aborted") return;
      if (res.status === "failed") {
        this.handleExit(rec, crash(res.error), true);
        // A group restart triggered by this failure now owns the remaining children.
        if (this.strategy !== "one_for_one") return;
        continue;
      }
      rec.restarts++;
      this.emit("child_started", { childId: rec.id, attempt: batch.attempt });
      this.emit("child_restarted", { childId: rec.id, attempt: batch.attempt, delayMs: batch.delayMs });
    }
  }

  // --- stopping ---------------------------------------------------------

  private track(p: Promise<unknown>): void {
    this.inflight.add(p);
    void p.finally(() => this.inflight.delete(p));
  }

  /** Cancels pending restarts and stops every live child in reverse start order. */
  private async shutdown(): Promise<void> {
    this.phase = "stopping";
    for (const batch of this.batches) if (batch.timer !== undefined) this.clock.clearTimeout(batch.timer);
    this.batches.clear();
    const items: StopItem[] = [];
    for (const rec of [...this.records].reverse()) {
      const item = this.detach(rec);
      if (item) items.push(item);
      else if (rec.state !== "terminated") rec.state = "stopped";
    }
    await Promise.all([...this.inflight]);
    await this.reportStops(items);
  }

  private escalate(reason: EscalationReason): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    this.escalation = reason;
    return (this.stopPromise = this.shutdown().then(() => {
      this.phase = "escalated";
      this.emit("supervisor_escalated", { reason });
      this.resolveExit(crash(new SupervisorEscalation(reason, this.name)));
    }));
  }
}
