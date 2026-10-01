/**
 * bun-stdin.ts — Stable stdin wrapper for nested/sequential Ink renders.
 *
 * @deprecated Use `getStdin()` from `./tui-session` instead.
 *
 * This module is kept for backward compatibility with the existing standalone
 * run-*.tsx launchers (run-quest-wizard, run-progress, run-review, etc.) that
 * each call inkRender() independently — including ON TOP of the long-lived
 * main TUI instance (e.g. the quest-picker → plan → review flow). Once those
 * launchers are migrated to the ScreenRouter (tui-dashboard task), this file
 * can be deleted.
 *
 * Two problems with Bun's `process.stdin` under multiple Ink instances:
 *
 * 1. `process.stdin.isTTY` can become `undefined` after an Ink instance calls
 *    `stdin.setRawMode(false)` on unmount. The next `render()` call creates a
 *    new `App` that captures `isRawModeSupported = stdin.isTTY` — if that's
 *    falsy, `useInput` silently does nothing and no keys work.
 *
 * 2. Every Ink instance calls `stdin.setRawMode(false)` when IT unmounts —
 *    with no regard for other instances still holding the same stdin. In the
 *    main-TUI plan flow (progress instance unmounts → review instance mounts
 *    while the main instance stays alive), that teardown breaks the shared
 *    stream, the main instance dies, and the process exits silently mid-flow.
 *
 * Fixes, both applied in the Proxy below:
 *
 * 1. `isTTY` is hard-coded to the value captured at process startup.
 * 2. `setRawMode` is reference-counted: raw mode is only disabled for real
 *    when the last instance releases it. Ink pairs each enable with a
 *    disable (its own per-App raw-mode refcount), so the global count stays
 *    balanced.
 *
 * The wrapper is created once and reused across all `render()` calls.
 */

/** Whether stdin was a TTY at process startup (captured before Ink touches it). */
const IS_TTY: boolean = !!(process.stdin as NodeJS.ReadStream).isTTY;

/** Number of Ink instances currently holding the stdin in raw mode. */
let rawModeHolders = 0;

let _stdinWrapper: typeof process.stdin | null = null;

/**
 * Returns a stable stdin wrapper whose `isTTY` property always reflects
 * the startup value and whose `setRawMode` is reference-counted across all
 * Ink instances sharing it, regardless of what any one instance does
 * during its mount/unmount.
 *
 * Pass this as the `stdin` option to every `render()` call.
 */
export function getStableStdin(): typeof process.stdin {
  if (_stdinWrapper) return _stdinWrapper;

  _stdinWrapper = new Proxy(process.stdin, {
    get(target, prop) {
      if (prop === "isTTY") return IS_TTY;
      if (prop === "setRawMode") {
        return (enable: boolean): void => {
          if (enable) {
            rawModeHolders++;
            (target as typeof process.stdin).setRawMode(true);
          } else {
            // Only release raw mode when the LAST holder lets go —
            // a nested instance unmounting must not break the stream
            // for the instances that are still alive (e.g. the main TUI).
            rawModeHolders = Math.max(0, rawModeHolders - 1);
            if (rawModeHolders === 0) {
              (target as typeof process.stdin).setRawMode(false);
            }
          }
        };
      }
      const val = (target as any)[prop];
      return typeof val === "function" ? val.bind(target) : val;
    },
  });

  return _stdinWrapper;
}

/**
 * Returns a fresh stdout wrapper that is a distinct object from
 * `process.stdout` (prototype clone) but forwards all writes to it.
 *
 * Ink keys its render instances by the stdout object (instances.js
 * WeakMap): every `render()` on the SAME stdout reuses ONE Ink instance —
 * a nested render replaces the reconciler tree of the instance that is
 * already mounted (e.g. the main TUI), and that nested instance's
 * `unmount()` then unmounts the SHARED instance, resolving the main
 * session's `waitUntilExit()` and exiting the process mid-flow.
 *
 * Nested/standalone flows (run-progress, run-review, wizards, monitor)
 * must render on an isolated stdout so they get their own Ink instance
 * while the main TUI keeps its tree mounted on `process.stdout`.
 *
 * The prototype clone inherits `write`/`columns`/`isTTY`/`_writableState`
 * from the real stdout; only resize listeners would be shadowed, which
 * Ink tolerates via its terminal-size fallback.
 */
export function createIsolatedStdout(): typeof process.stdout {
  return Object.create(process.stdout) as typeof process.stdout;
}

/**
 * Test hook: current raw-mode holder count (0 = raw mode fully released).
 * Exposed for unit tests only.
 */
export function __rawModeHolderCount(): number {
  return rawModeHolders;
}
