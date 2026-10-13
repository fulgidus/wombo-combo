/**
 * hang-watchdog.ts — Idle detection for supervised agent processes.
 *
 * Tracks the last activity per running agent (fed by the monitor's
 * onActivity/onEvent/onOutput callbacks). When an agent has been idle for
 * longer than the threshold the watchdog kills its process and reports an
 * ExitReason { kind: "hang" }, which the caller hands to the restart policy.
 * Disabled (no timers at all) unless config.defaults.agentIdleTimeoutMs > 0.
 */

import type { Clock } from "../../lib/supervision/clock";
import { systemClock } from "../../lib/supervision/clock";
import type { ExitReason } from "../../lib/supervisor-core";

export type HangReason = Extract<ExitReason, { kind: "hang" }>;

export interface HangWatchdogOptions {
  /** Idle threshold in ms; undefined, 0 or negative disables the watchdog. */
  idleTimeoutMs?: number;
  /** Injectable time source (defaults to the system clock). */
  clock?: Clock;
  /** Kill the agent's process. Errors are contained. */
  kill(featureId: string): void;
  /** While true the agent is waiting on something legitimate (e.g. a human answer) and is never declared hung. */
  isPaused?(featureId: string): boolean;
  /** Called after the kill with the hang exit reason. */
  onHang(featureId: string, reason: HangReason): void;
}

export interface HangWatchdog {
  readonly enabled: boolean;
  /** Start watching an agent (restarts the idle clock if already watched). */
  track(featureId: string): void;
  /** Record activity for a watched agent; ignored for unwatched ones. */
  touch(featureId: string): void;
  /** Stop watching an agent. */
  untrack(featureId: string): void;
  /** Stop watching everything. */
  dispose(): void;
}

interface Watch {
  lastActivity: number;
  timer: unknown;
}

export function createHangWatchdog(opts: HangWatchdogOptions): HangWatchdog {
  const threshold = opts.idleTimeoutMs ?? 0;
  const enabled = threshold > 0;
  const clock = opts.clock ?? systemClock;
  const watches = new Map<string, Watch>();

  function arm(featureId: string, watch: Watch, delay: number): void {
    watch.timer = clock.setTimeout(() => check(featureId), delay);
  }

  // One timer per agent: on expiry, re-arm for the remainder if activity
  // arrived meanwhile, so touch() never has to reschedule.
  function check(featureId: string): void {
    const watch = watches.get(featureId);
    if (!watch) return;
    const idleMs = clock.now() - watch.lastActivity;
    if (idleMs < threshold) {
      arm(featureId, watch, threshold - idleMs);
      return;
    }
    if (opts.isPaused?.(featureId)) {
      watch.lastActivity = clock.now();
      arm(featureId, watch, threshold);
      return;
    }
    watches.delete(featureId);
    try { opts.kill(featureId); } catch { /* the hang is reported regardless */ }
    opts.onHang(featureId, { kind: "hang", idleMs });
  }

  return {
    enabled,
    track(featureId) {
      if (!enabled) return;
      this.untrack(featureId);
      const watch: Watch = { lastActivity: clock.now(), timer: null };
      watches.set(featureId, watch);
      arm(featureId, watch, threshold);
    },
    touch(featureId) {
      const watch = watches.get(featureId);
      if (watch) watch.lastActivity = clock.now();
    },
    untrack(featureId) {
      const watch = watches.get(featureId);
      if (!watch) return;
      clock.clearTimeout(watch.timer);
      watches.delete(featureId);
    },
    dispose() {
      for (const watch of watches.values()) clock.clearTimeout(watch.timer);
      watches.clear();
    },
  };
}
