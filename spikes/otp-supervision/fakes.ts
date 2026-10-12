/**
 * Test doubles for the supervision spike: a manual clock and stub children that
 * mimic src/lib/fake-agent-runner.ts (that file is a CLI entry point that runs
 * on import, so it cannot be imported; the stubs reproduce its lifecycle:
 * work for a while, then exit cleanly or crash).
 */
import type { ChildSpec, Clock, RestartType } from "./supervisor";

interface Timer {
  id: number;
  at: number;
  fn: () => void;
}

/** Manual clock: time only moves when `advance` is called. */
export class FakeClock implements Clock {
  private t = 0;
  private nextId = 1;
  private timers: Timer[] = [];

  now(): number {
    return this.t;
  }

  setTimeout(fn: () => void, ms: number): unknown {
    const timer = { id: this.nextId++, at: this.t + ms, fn };
    this.timers.push(timer);
    return timer.id;
  }

  clearTimeout(handle: unknown): void {
    this.timers = this.timers.filter((x) => x.id !== handle);
  }

  /** Move time forward, firing due timers in order and letting promises settle after each. */
  async advance(ms: number): Promise<void> {
    const target = this.t + ms;
    for (;;) {
      await flush();
      const due = this.timers.filter((x) => x.at <= target).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.timers = this.timers.filter((x) => x !== due);
      this.t = Math.max(this.t, due.at);
      due.fn();
    }
    this.t = target;
    await flush();
  }
}

/** Let all pending promise continuations run. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => setImmediate(r));
}

export interface StubAgent {
  spec: ChildSpec;
  /** Times the supervisor started this child. */
  starts: number;
  /** Times the supervisor aborted a run of this child. */
  aborts: number;
  /** True while a run is in flight. */
  running: boolean;
  /** Finish the current run cleanly (normal exit). */
  exit(): void;
  /** Fail the current run. */
  crash(error?: Error): void;
}

export interface StubOptions {
  restart?: RestartType;
  shutdownMs?: number;
  /** Never settle on abort, to exercise the shutdown timeout. */
  ignoreAbort?: boolean;
  /** Called with each start (1-based) so a stub can script its own behaviour. */
  onStart?: (stub: StubAgent, attempt: number) => void;
  /** Called when the supervisor aborts a run, with the order key for shutdown assertions. */
  onAbort?: (id: string) => void;
}

export function stubAgent(id: string, opts: StubOptions = {}): StubAgent {
  let settle: { resolve: () => void; reject: (e: Error) => void } | null = null;
  const stub: StubAgent = {
    starts: 0,
    aborts: 0,
    running: false,
    exit: () => settle?.resolve(),
    crash: (error = new Error(`${id} crashed`)) => settle?.reject(error),
    spec: {
      id,
      restart: opts.restart ?? "permanent",
      shutdownMs: opts.shutdownMs ?? 100,
      start: (signal) =>
        new Promise<void>((resolve, reject) => {
          stub.starts++;
          stub.running = true;
          const end = (fn: () => void) => {
            stub.running = false;
            settle = null;
            fn();
          };
          settle = { resolve: () => end(resolve), reject: (e) => end(() => reject(e)) };
          signal.addEventListener(
            "abort",
            () => {
              stub.aborts++;
              opts.onAbort?.(id);
              if (!opts.ignoreAbort) settle?.resolve();
            },
            { once: true },
          );
          opts.onStart?.(stub, stub.starts);
        }),
    },
  };
  return stub;
}
