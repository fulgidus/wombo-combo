import type { Clock, TimerHandle } from "../../src/lib/supervision/clock";

interface Timer {
  id: number;
  due: number;
  fn: () => void;
}

/** Deterministic virtual-time Clock; never touches real timers. */
export class FakeClock implements Clock {
  private time: number;
  private nextId = 0;
  private timers = new Map<number, Timer>();

  constructor(start = 0) {
    this.time = start;
  }

  now(): number {
    return this.time;
  }

  setTimeout(fn: () => void, ms: number): TimerHandle {
    const id = this.nextId++;
    this.timers.set(id, { id, due: this.time + Math.max(0, ms), fn });
    return id;
  }

  clearTimeout(h: TimerHandle): void {
    this.timers.delete(h as number);
  }

  pendingTimers(): number {
    return this.timers.size;
  }

  nextDueAt(): number | undefined {
    return this.peek()?.due;
  }

  /** Earliest timer by due time, ties by registration order (ids are monotonic). */
  private peek(): Timer | undefined {
    let best: Timer | undefined;
    for (const t of this.timers.values()) {
      if (!best || t.due < best.due || (t.due === best.due && t.id < best.id)) best = t;
    }
    return best;
  }

  /** Fire the next timer due at or before target; false if none. */
  private fireNext(target: number): boolean {
    const t = this.peek();
    if (!t || t.due > target) return false;
    this.timers.delete(t.id);
    this.time = Math.max(this.time, t.due);
    t.fn();
    return true;
  }

  advance(ms: number): void {
    const target = this.time + ms;
    while (this.fireNext(target)) {
      /* keep firing */
    }
    this.time = target;
  }

  /** Let pending promise continuations settle. */
  async flush(): Promise<void> {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }

  /** Like advance, but flushes microtasks after each fired timer. */
  async advanceAsync(ms: number): Promise<void> {
    const target = this.time + ms;
    await this.flush();
    while (this.fireNext(target)) {
      await this.flush();
    }
    this.time = target;
  }
}
