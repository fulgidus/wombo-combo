/**
 * index.ts — Harness registry.
 */

import { basename } from "node:path";
import { HARNESS_IDS, type HarnessId } from "./ids";
import type { HarnessAdapter } from "./types";
import { opencodeHarness } from "./opencode";

export * from "./ids";
export * from "./types";
export { normalizeOutput } from "./output";

const REGISTRY = new Map<HarnessId, HarnessAdapter>([["opencode", opencodeHarness]]);

export function getHarness(id: HarnessId): HarnessAdapter {
  const adapter = REGISTRY.get(id);
  if (!adapter) {
    throw new Error(`Harness "${id}" is not available (known: ${HARNESS_IDS.join(", ")})`);
  }
  return adapter;
}

export function listHarnesses(): HarnessAdapter[] {
  return [...REGISTRY.values()];
}

/**
 * Detect the harness from a binary path (basename match, extension stripped).
 * Unknown binaries fall back to opencode (historical behavior).
 */
export function detectHarnessFromBin(binPath: string): HarnessId {
  const name = basename(binPath).replace(/\.(exe|cmd|bat)$/i, "").toLowerCase();
  if (name.startsWith("opencode")) return "opencode";
  if (name.startsWith("claude")) return "claude-code";
  if (name === "codex" || name.startsWith("codex-")) return "codex";
  if (name === "pi") return "pi";
  return "opencode";
}
