/**
 * agents-routing.ts — Pure draft model behind the "Agents & routing" TUI screen.
 *
 * A Draft is the editable copy of config.agentProfiles and config.routing.
 * Edits never touch disk; saveDraft validates with the config validator
 * (which rejects dangling profile references) and only then persists.
 */

import { existsSync } from "node:fs";
import {
  resolveAgentBin,
  saveConfig,
  validateConfig,
  type AgentProfile,
  type RoutingConfig,
  type WomboConfig,
} from "../config";
import { detectHarnessFromBin, getHarness, HARNESS_IDS, OPERATIONS, type HarnessId } from "./harness";
import { LEGACY_PROFILE } from "./harness/routing";

export interface Draft {
  profiles: Record<string, AgentProfile>;
  routing: RoutingConfig;
}

export const WEIGHT_KEYS = ["light", "medium", "heavy"] as const;
export const DIFFICULTY_KEYS = ["trivial", "easy", "medium", "hard", "very_hard"] as const;

export type RouteSlot =
  | { kind: "default" }
  | { kind: "byWeight"; key: string }
  | { kind: "byDifficulty"; key: string }
  | { kind: "byOperation"; key: string }
  | { kind: "fallback"; key: string };

export function draftFromConfig(config: Pick<WomboConfig, "agentProfiles" | "routing">): Draft {
  return {
    profiles: structuredClone(config.agentProfiles ?? {}),
    routing: structuredClone(config.routing ?? {}),
  };
}

/** Trim optional string fields; blank means absent. */
function clean(profile: AgentProfile): AgentProfile {
  const out: AgentProfile = { ...profile };
  for (const f of ["bin", "model", "provider"] as const) {
    const v = out[f]?.trim();
    if (v) out[f] = v;
    else delete out[f];
  }
  return out;
}

export function upsertProfile(draft: Draft, name: string, profile: AgentProfile): Draft {
  return { ...draft, profiles: { ...draft.profiles, [name]: clean(profile) } };
}

/** Remove a profile. References are left alone: saving refuses until they are reassigned. */
export function deleteProfile(draft: Draft, name: string): Draft {
  const { [name]: _gone, ...rest } = draft.profiles;
  return { ...draft, profiles: rest };
}

/** Every routing slot the screen edits, in display order. Fallbacks get one slot per profile. */
export function routeSlots(draft: Draft): RouteSlot[] {
  return [
    { kind: "default" },
    ...WEIGHT_KEYS.map((key): RouteSlot => ({ kind: "byWeight", key })),
    ...DIFFICULTY_KEYS.map((key): RouteSlot => ({ kind: "byDifficulty", key })),
    ...OPERATIONS.map((key): RouteSlot => ({ kind: "byOperation", key })),
    ...Object.keys(draft.profiles).map((key): RouteSlot => ({ kind: "fallback", key })),
  ];
}

export function getRoute(draft: Draft, slot: RouteSlot): string | null {
  const r = draft.routing;
  switch (slot.kind) {
    case "default":
      return r.default ?? null;
    case "fallback":
      return r.fallbacks?.[slot.key]?.[0] ?? null;
    default:
      return ((r[slot.kind] as Record<string, string> | undefined)?.[slot.key]) ?? null;
  }
}

/** Point a slot at a profile name (null clears it; empty tables are dropped). A fallback slot holds a single next profile. */
export function setRoute(draft: Draft, slot: RouteSlot, name: string | null): Draft {
  const routing: RoutingConfig = { ...draft.routing };
  if (slot.kind === "default") {
    if (name) routing.default = name;
    else delete routing.default;
    return { ...draft, routing };
  }
  const table = { ...((routing[slot.kind === "fallback" ? "fallbacks" : slot.kind] as Record<string, unknown> | undefined) ?? {}) };
  if (name) table[slot.key] = slot.kind === "fallback" ? [name] : name;
  else delete table[slot.key];
  const field = slot.kind === "fallback" ? "fallbacks" : slot.kind;
  if (Object.keys(table).length > 0) (routing as Record<string, unknown>)[field] = table;
  else delete (routing as Record<string, unknown>)[field];
  return { ...draft, routing };
}

export interface HarnessRow {
  id: HarnessId;
  onPath: boolean;
  /** Provider-reported cost: from the adapter's capabilities, never a price table */
  reportsCost: boolean;
  /** True when at least one profile (or the implicit legacy "default") uses it */
  configured: boolean;
  profiles: string[];
}

export interface HarnessProbes {
  binExists?: (bin: string) => boolean;
}

function defaultBinExists(bin: string): boolean {
  if (!bin) return false;
  if (bin.includes("/") || bin.includes("\\")) return existsSync(bin);
  return Bun.which(bin) !== null;
}

/**
 * One row per harness. With no explicit profiles the implicit legacy "default"
 * profile (agent.bin / modelRouting) counts as the configured harness, so a
 * project that already runs through the legacy path is never asked to set up.
 */
export function harnessRows(
  config: WomboConfig,
  probes: HarnessProbes = {},
  profiles: Record<string, AgentProfile> = config.agentProfiles ?? {},
): HarnessRow[] {
  const exists = probes.binExists ?? defaultBinExists;
  const legacyBin = resolveAgentBin(config);
  const legacyHarness = detectHarnessFromBin(legacyBin);
  // pi first, then the rest in registry order
  const order: HarnessId[] = ["pi", ...HARNESS_IDS.filter((h) => h !== "pi")];
  return order.map((id) => {
    const adapter = getHarness(id);
    const used = Object.entries(profiles).filter(([, p]) => p.harness === id);
    const names = used.map(([n]) => n);
    const legacy = !config.routing?.default && id === legacyHarness;
    if (legacy) names.unshift(LEGACY_PROFILE);
    const bins = used.map(([, p]) => p.bin ?? (id === "opencode" ? legacyBin : adapter.defaultBin));
    if (legacy) bins.push(legacyBin);
    if (bins.length === 0) bins.push(id === "opencode" ? legacyBin : adapter.defaultBin);
    return {
      id,
      onPath: bins.some((b) => exists(b)),
      reportsCost: adapter.capabilities.cost,
      configured: names.length > 0,
      profiles: names,
    };
  });
}

/** Validate the draft merged into the config; returns the error message or null. */
export function validateDraft(config: WomboConfig, draft: Draft): string | null {
  const next: WomboConfig = { ...config };
  if (Object.keys(draft.profiles).length > 0) next.agentProfiles = draft.profiles;
  else delete next.agentProfiles;
  if (Object.keys(draft.routing).length > 0) next.routing = draft.routing;
  else delete next.routing;
  try {
    validateConfig(next);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/** Validate, then persist. Returns the validation error (nothing written) or null. */
export function saveDraft(projectRoot: string, config: WomboConfig, draft: Draft): string | null {
  const error = validateDraft(config, draft);
  if (error) return error;
  saveConfig(
    projectRoot,
    {
      agentProfiles: Object.keys(draft.profiles).length > 0 ? draft.profiles : undefined,
      routing: Object.keys(draft.routing).length > 0 ? draft.routing : undefined,
    },
    { replace: ["agentProfiles", "routing"] },
  );
  return null;
}
