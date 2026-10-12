import type { Clock } from "./clock";
import type { IntensityOptions } from "./types";

export const DEFAULT_INTENSITY: IntensityOptions = { maxRestarts: 3, periodMs: 5000 };

/**
 * Sliding-window restart counter.
 *
 * Window semantics: a timestamp `t` is inside the window iff
 * `t > now - periodMs`. A restart exactly `periodMs` old is pruned; only
 * strictly newer ones count.
 */
export class IntensityTracker {
  private stamps: number[] = [];

  constructor(
    private readonly opts: IntensityOptions,
    private readonly clock: Clock,
  ) {}

  /** Records a restart now. `exceeded` is true when count > maxRestarts. */
  record(): { exceeded: boolean; count: number } {
    const now = this.clock.now();
    this.prune(now);
    this.stamps.push(now);
    return { exceeded: this.stamps.length > this.opts.maxRestarts, count: this.stamps.length };
  }

  /** Restarts currently inside the window. */
  count(): number {
    this.prune(this.clock.now());
    return this.stamps.length;
  }

  reset(): void {
    this.stamps = [];
  }

  private prune(now: number): void {
    const cutoff = now - this.opts.periodMs;
    this.stamps = this.stamps.filter((t) => t > cutoff);
  }
}
