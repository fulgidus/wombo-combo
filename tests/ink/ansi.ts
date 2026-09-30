/**
 * ansi.ts — Shared helper for Ink rendering tests.
 *
 * Ink disables colors when stdout is not a TTY (CI, piped runs) but emits
 * per-character 24-bit color codes in interactive terminals — the splash
 * and menu block art colors every glyph individually, so literal substrings
 * like "███╗" never appear contiguously in colored output. Assertions on
 * block art must run on the stripped text to pass in both environments.
 */
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}
