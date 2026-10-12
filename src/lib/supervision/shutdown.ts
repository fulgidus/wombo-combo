import type { Clock } from "./clock";
import { crash } from "./types";
import type { ChildHandle, ExitReason } from "./types";

export class ShutdownTimeoutError extends Error {
  readonly childId?: string;
  readonly timeoutMs: number;

  constructor(timeoutMs: number, childId?: string) {
    super(
      childId !== undefined
        ? `child "${childId}" did not stop within ${timeoutMs}ms`
        : `child did not stop within ${timeoutMs}ms`,
    );
    this.name = "ShutdownTimeoutError";
    this.timeoutMs = timeoutMs;
    this.childId = childId;
  }
}

export interface StopResult {
  reason: ExitReason;
  forced: boolean;
}

export interface StopOptions {
  timeoutMs: number;
  clock: Clock;
  controller?: AbortController;
  /** Used only to label a ShutdownTimeoutError. */
  childId?: string;
}

/**
 * Ask a child to stop and wait for it, bounded by `timeoutMs` on the injected
 * clock. Never rejects. A child that outlives the timeout (or whose abort()
 * throws) is reported as a forced crash and is not waited on any longer.
 */
export async function stopChild(handle: ChildHandle, opts: StopOptions): Promise<StopResult> {
  const { timeoutMs, clock, controller, childId } = opts;

  try {
    handle.abort("shutdown");
    controller?.abort();
  } catch (error) {
    try {
      controller?.abort();
    } catch {
      /* the abort error is the one reported */
    }
    return { reason: crash(error), forced: true };
  }

  let timer: unknown;
  const timeout = new Promise<StopResult>((resolve) => {
    timer = clock.setTimeout(() => {
      resolve({
        reason: crash(new ShutdownTimeoutError(timeoutMs, childId)),
        forced: true,
      });
    }, timeoutMs);
  });
  // exit should never reject, but guard so we never leak an unhandled rejection.
  const exited = handle.exit.then(
    (reason): StopResult => ({ reason, forced: false }),
    (error): StopResult => ({ reason: crash(error), forced: false }),
  );

  try {
    return await Promise.race([exited, timeout]);
  } finally {
    clock.clearTimeout(timer);
  }
}

export interface StopItem {
  id: string;
  handle: ChildHandle;
  timeoutMs: number;
  controller?: AbortController;
}

/**
 * Stop children one at a time in the order given (callers pass reverse start
 * order). Each child gets its own timeout; a forced child does not stop the
 * sequence.
 */
export async function stopChildrenInOrder(
  items: StopItem[],
  clock: Clock,
): Promise<Map<string, StopResult>> {
  const results = new Map<string, StopResult>();
  for (const item of items) {
    results.set(
      item.id,
      await stopChild(item.handle, {
        timeoutMs: item.timeoutMs,
        clock,
        controller: item.controller,
        childId: item.id,
      }),
    );
  }
  return results;
}
