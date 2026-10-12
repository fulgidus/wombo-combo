import type { BackoffOptions } from "./types";

export const DEFAULT_BACKOFF: Required<BackoffOptions> = {
  initialMs: 100,
  maxMs: 5000,
  factor: 2,
  jitter: 0,
};

/** A child that ran healthy this long gets its attempt counter reset. */
export const DEFAULT_BACKOFF_RESET_MS = 10000;

/**
 * Delay before restart number `attempt` (1-based):
 * min(maxMs, initialMs * factor^(attempt-1)), then symmetric jitter
 * `delay * (1 + jitter * (random()*2-1))`, clamped to [0, maxMs].
 * `attempt < 1` is treated as 1 and `factor < 1` as 1.
 */
export function computeBackoff(
  attempt: number,
  opts: BackoffOptions,
  random: () => number = Math.random,
): number {
  const n = Number.isFinite(attempt) ? Math.max(1, Math.floor(attempt)) : 1;
  const factor = opts.factor >= 1 ? opts.factor : 1;
  const base = Math.min(opts.maxMs, opts.initialMs * Math.pow(factor, n - 1));
  const jitter = opts.jitter ?? 0;
  if (jitter <= 0) return base;
  const delay = base * (1 + jitter * (random() * 2 - 1));
  return Math.min(opts.maxMs, Math.max(0, delay));
}

/** True when a child ran healthy for at least `resetAfterMs`. */
export function shouldResetAttempt(runMs: number, resetAfterMs: number): boolean {
  return runMs >= resetAfterMs;
}
