/**
 * routing.ts — Resolve which agent profile runs an operation.
 *
 * Pure apart from two injectable probes (binary resolution and existence), so
 * it is table-testable. With no `agentProfiles` and no `routing` in config the
 * result reproduces the historical behavior exactly: the binary comes from
 * resolveAgentBin(config), the harness is detected from the binary name
 * (opencode unless it is another known CLI), and the model from the
 * `modelRouting` weight table, then the session model.
 *
 * Profile precedence (first match wins):
 *   1. operation "code" and task.agent_profile
 *   2. routing.byOperation[operation]      (operations other than "code")
 *   3. operation "conflict"/"review" and task.agent_profile
 *   4. routing.byDifficulty[task.difficulty], then routing.byWeight[weight]
 *   5. routing.byOperation[operation]      (operation "code")
 *   6. routing.default
 *   7. the synthesized legacy profile "default"
 *
 * Model precedence: profile.model > modelRouting[weight] > session model > null.
 */

import { existsSync } from "node:fs";
import { resolveAgentBin, type AgentProfile, type WomboConfig } from "../../config";
import { computeTaskWeight, resolveTaskModel } from "../task-weight";
import type { Difficulty, Priority } from "../tasks";
import { detectHarnessFromBin, getHarness } from "./index";
import type { HarnessId, Operation } from "./ids";
import type { CustomCommandSpec, HarnessCapabilities } from "./types";

export const LEGACY_PROFILE = "default";

export interface RouteTask {
  difficulty: Difficulty;
  effort: string;
  priority: Priority;
  /** Explicit profile for this task */
  agent_profile?: string | null;
}

export interface ResolveRouteOptions {
  operation: Operation;
  task?: RouteTask | null;
  /** Session-wide model (CLI --model / daemon model) */
  sessionModel?: string | null;
  /** Force a specific profile name (skips selection; fallbacks still apply) */
  profile?: string;
  /** Binary resolution for profiles without `bin` on opencode (default: resolveAgentBin) */
  resolveBin?: (config: WomboConfig) => string;
}

export interface ResolvedRoute {
  /** Profile name ("default" for the synthesized legacy profile) */
  profile: string;
  harness: HarnessId;
  bin: string;
  model: string | null;
  provider: string | null;
  args: string[];
  /** Literal non-secret env */
  env: Record<string, string>;
  /** Child env var -> parent env var NAME; resolve with resolveRouteEnv */
  envFrom: Record<string, string>;
  account: string | null;
  capabilities: HarnessCapabilities;
  command?: CustomCommandSpec;
  /** Profile names to try, in order (this profile first) */
  chain: string[];
  /** True when synthesized from agent.bin / modelRouting (no agentProfiles used) */
  legacy: boolean;
}

export class RouteError extends Error {}

/** Thrown when an envFrom variable is not set. Names the variable, never a value. */
export class MissingEnvError extends RouteError {
  constructor(
    public readonly profile: string,
    public readonly variable: string,
  ) {
    super(`Profile "${profile}" needs environment variable ${variable}, which is not set`);
  }
}

function pickProfileName(config: WomboConfig, opts: ResolveRouteOptions): string | null {
  const r = config.routing;
  const task = opts.task ?? null;
  const op = opts.operation;
  if (opts.profile) return opts.profile;
  if (op === "code" && task?.agent_profile) return task.agent_profile;
  if (op !== "code" && r?.byOperation?.[op]) return r.byOperation[op]!;
  if (op !== "code" && task?.agent_profile) return task.agent_profile;
  if (task) {
    const byDiff = r?.byDifficulty?.[task.difficulty];
    if (byDiff) return byDiff;
    const byWeight = r?.byWeight?.[computeTaskWeight(task)];
    if (byWeight) return byWeight;
  }
  if (op === "code" && r?.byOperation?.code) return r.byOperation.code;
  if (r?.default) return r.default;
  return null;
}

function fallbackChain(config: WomboConfig, first: string): string[] {
  const graph = config.routing?.fallbacks ?? {};
  const chain: string[] = [];
  const visit = (n: string): void => {
    if (chain.includes(n)) return;
    chain.push(n);
    for (const next of graph[n] ?? []) visit(next);
  };
  visit(first);
  return chain;
}

function legacyModel(config: WomboConfig, opts: ResolveRouteOptions): string | null {
  return opts.task
    ? resolveTaskModel(opts.task, config.modelRouting, opts.sessionModel)
    : (opts.sessionModel ?? null);
}

function legacyRoute(config: WomboConfig, opts: ResolveRouteOptions): ResolvedRoute {
  const bin = (opts.resolveBin ?? resolveAgentBin)(config);
  const harness = detectHarnessFromBin(bin);
  return {
    profile: LEGACY_PROFILE,
    harness,
    bin,
    model: legacyModel(config, opts),
    provider: null,
    args: [],
    env: {},
    envFrom: {},
    account: null,
    capabilities: getHarness(harness).capabilities,
    chain: [LEGACY_PROFILE],
    legacy: true,
  };
}

/** Build the route for one named profile (used for the primary and each fallback). */
export function routeForProfile(
  config: WomboConfig,
  name: string,
  opts: ResolveRouteOptions,
  chain?: string[],
): ResolvedRoute {
  const profile: AgentProfile | undefined = config.agentProfiles?.[name];
  if (!profile) {
    throw new RouteError(`Unknown agent profile "${name}" (defined: ${Object.keys(config.agentProfiles ?? {}).join(", ") || "none"})`);
  }
  const adapter = getHarness(profile.harness);
  const bin =
    profile.bin ??
    (profile.harness === "opencode" ? (opts.resolveBin ?? resolveAgentBin)(config) : adapter.defaultBin);
  return {
    profile: name,
    harness: profile.harness,
    bin,
    model: profile.model ?? legacyModel(config, opts),
    provider: profile.provider ?? null,
    args: [...(profile.args ?? [])],
    env: { ...(profile.env ?? {}) },
    envFrom: { ...(profile.envFrom ?? {}) },
    account: profile.account ?? null,
    capabilities: { ...adapter.capabilities, ...(profile.capabilities ?? {}) },
    command: profile.command,
    chain: chain ?? fallbackChain(config, name),
    legacy: false,
  };
}

/** Resolve the primary route for an operation (no availability probing). */
export function resolveRoute(config: WomboConfig, opts: ResolveRouteOptions): ResolvedRoute {
  const name = pickProfileName(config, opts);
  if (!name) return legacyRoute(config, opts);
  return routeForProfile(config, name, opts);
}

/**
 * Resolve a route's environment: literal env plus envFrom variables read from
 * `source`. Throws MissingEnvError (naming the variable only) when unset.
 */
export function resolveRouteEnv(
  route: Pick<ResolvedRoute, "profile" | "env" | "envFrom">,
  source: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = { ...route.env };
  for (const [child, parent] of Object.entries(route.envFrom)) {
    const value = source[parent];
    if (value === undefined || value === "") throw new MissingEnvError(route.profile, parent);
    out[child] = value;
  }
  return out;
}

export interface AvailabilityProbes {
  /** Does this executable exist? (default: path check or Bun.which) */
  binExists?: (bin: string) => boolean;
  /** Environment to look envFrom variables up in (default: process.env) */
  env?: Record<string, string | undefined>;
}

function defaultBinExists(bin: string): boolean {
  if (!bin) return false;
  if (bin.includes("/") || bin.includes("\\")) return existsSync(bin);
  return Bun.which(bin) !== null;
}

/** Why a route cannot start, or null when it can. */
export function routeUnavailableReason(route: ResolvedRoute, probes: AvailabilityProbes = {}): string | null {
  const exists = probes.binExists ?? defaultBinExists;
  if (!exists(route.bin)) return `binary not found: ${route.bin || "(none)"}`;
  try {
    resolveRouteEnv(route, probes.env ?? process.env);
  } catch (err) {
    if (err instanceof MissingEnvError) return `environment variable ${err.variable} is not set`;
    throw err;
  }
  return null;
}

export interface RouteSelection {
  route: ResolvedRoute;
  /** Earlier chain candidates that were skipped, with the reason */
  skipped: { profile: string; reason: string }[];
}

/**
 * Pick the first startable route of the primary route's fallback chain.
 * Throws RouteError listing every skipped candidate when none can start.
 */
export function selectAvailableRoute(
  config: WomboConfig,
  primary: ResolvedRoute,
  opts: ResolveRouteOptions,
  probes: AvailabilityProbes = {},
): RouteSelection {
  const skipped: RouteSelection["skipped"] = [];
  for (const name of primary.chain) {
    const route = name === primary.profile ? primary : routeForProfile(config, name, opts, primary.chain);
    const reason = routeUnavailableReason(route, probes);
    if (!reason) return { route, skipped };
    skipped.push({ profile: name, reason });
  }
  throw new RouteError(
    `No agent profile could start for ${opts.operation}: ` +
      skipped.map((s) => `${s.profile} (${s.reason})`).join("; "),
  );
}
