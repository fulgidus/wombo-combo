/**
 * Condition-polling helpers for async UI tests. Prefer these over fixed sleeps:
 * they return as soon as the condition holds and tolerate heavy CPU load via a
 * generous deadline.
 */

/** Poll `assertions` until it stops throwing; rethrows the last error at the deadline. */
export async function eventually(
  assertions: () => void,
  timeoutMs = 20_000,
  intervalMs = 20,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      assertions();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

/** Poll until `pred()` is truthy; throws with `what` at the deadline. */
export async function waitFor(
  pred: () => boolean,
  what = "condition",
  timeoutMs = 20_000,
  intervalMs = 20,
): Promise<void> {
  await eventually(() => {
    if (!pred()) throw new Error(`timed out waiting for ${what}`);
  }, timeoutMs, intervalMs);
}

/** Label currently under the ESC menu cursor (">" prefix), or null. */
export function escMenuCursor(frame: string): string | null {
  const m = frame.match(/>\s+([A-Za-z][A-Za-z ]*?)(?:\s{2,}|\s*[│\n]|$)/);
  return m ? m[1]!.trim() : null;
}

/**
 * Drive the global ESC menu to `label` (cursor shown as a ">" prefix) and press
 * Enter. Waits for the menu to open and for every cursor move to render before
 * the next key. A Down key sent right after the menu first paints can be lost
 * (its input handler attaches a tick later), so an unacknowledged key is
 * re-sent after a short grace period rather than slept for.
 */
export async function selectFromEscMenu(
  app: { key: (s: string) => void; frame: () => string },
  label: string,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  app.key("\u001b");
  await waitFor(
    () => app.frame().includes("Return to app") && escMenuCursor(app.frame()) !== null,
    "ESC menu to open",
    timeoutMs,
  );
  while (escMenuCursor(app.frame()) !== label) {
    if (Date.now() > deadline) {
      throw new Error(`timed out moving ESC menu cursor to ${label}; frame:\n${app.frame()}`);
    }
    const before = escMenuCursor(app.frame());
    app.key("\u001b[B");
    const ackBy = Date.now() + 1_000;
    while (Date.now() < ackBy) {
      const now = escMenuCursor(app.frame());
      if (now !== null && now !== before) break;
      await new Promise((r) => setTimeout(r, 20));
    }
  }
  app.key("\r");
  // Done once the overlay has closed (the menu is the only place this text renders).
  await waitFor(() => !app.frame().includes("Return to app"), "ESC menu to close after selecting " + label, timeoutMs);
}
