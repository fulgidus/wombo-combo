/**
 * ids.ts — Harness identifiers. Pure and import-free so config.ts can use it
 * without creating module cycles.
 */

/** Supported agent CLI harnesses. */
export const HARNESS_IDS = ["opencode", "claude-code", "codex", "gemini", "antigravity", "pi", "custom"] as const;

export type HarnessId = (typeof HARNESS_IDS)[number];

/** Operations the routing layer can assign a profile to. */
export const OPERATIONS = ["plan", "code", "conflict", "review"] as const;

export type Operation = (typeof OPERATIONS)[number];

export function isHarnessId(value: unknown): value is HarnessId {
  return typeof value === "string" && (HARNESS_IDS as readonly string[]).includes(value);
}
