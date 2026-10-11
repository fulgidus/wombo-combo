/**
 * launcher.ts — Process spawning for headless agent runs.
 *
 * Responsibilities:
 *   - Launch agent in headless mode through the harness adapter of a resolved
 *     route (opencode by default; claude-code, codex, pi or a custom command
 *     when agent profiles are configured — see src/lib/harness/)
 *   - Resume sessions for auto-retry
 *   - Launch conflict-resolver agents
 *
 * ## Agent Process Lifecycle (audit: wave-detach-audit)
 *
 * **Headless mode** (`launchHeadless`, `retryHeadless`, `launchConflictResolver`):
 *   - Agents are spawned with `detached: false` — they are child processes of
 *     the wombo parent and will be terminated when the parent exits.
 *   - `unref()` is NOT called — the child holds the parent's event loop alive,
 *     which is required for the ProcessMonitor to receive stdout/stderr events.
 *   - `stdio` is `["pipe", "pipe", "pipe"]` — stdout is piped for JSON event
 *     parsing by ProcessMonitor. This further ties the child to the parent.
 *   - **Consequence**: If the parent is killed (SIGKILL, crash, OOM), headless
 *     agents die immediately with no state saved.
 *   - **Recovery**: the daemon re-queues agents that died without producing
 *     code, and runs build verification on dead-but-productive agents
 *     (worktree exists with commits).
 *
 * **Design rationale for `detached: false`**:
 *   Headless agents MUST have their stdout piped to the parent for real-time
 *   JSON event parsing (session ID extraction, completion detection, activity
 *   tracking). Using `detached: true` + `unref()` would allow agents to
 *   outlive the parent, but the piped stdio streams would break when the
 *   parent exits, potentially causing agent crashes or lost output.
 */

import type { ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { WomboConfig } from "../config";
import { portlessEnv } from "./portless";
import { hitlDir } from "./hitl-channel";
import { getHarness, normalizeOutput } from "./harness";
import type { HarnessCommand, HarnessLaunchRequest, Normalizer } from "./harness/types";
import type { HarnessId, Operation } from "./harness/ids";
import { inlineAgentDefinition, spawnHarness } from "./harness/spawn";
import {
  resolveRoute,
  resolveRouteEnv,
  selectAvailableRoute,
  type ResolvedRoute,
} from "./harness/routing";

// ---------------------------------------------------------------------------
// Agent Type Detection
// ---------------------------------------------------------------------------

/**
 * Legacy agent CLI type (kept for existing callers). New code should use
 * `detectHarnessFromBin` from ./harness, which also knows codex and pi.
 *
 * - **opencode**: headless via `opencode run --format json` (operates on spawn cwd)
 * - **claude**: headless via `claude -p --output-format stream-json`
 * - **unknown**: Falls back to opencode-style args.
 */
export type AgentType = "opencode" | "claude" | "unknown";

/**
 * Detect agent type from the resolved binary path (basename match, extension
 * stripped; no probing of `--help` output).
 */
export function detectAgentType(binPath: string): AgentType {
  const name = basename(binPath).replace(/\.(exe|cmd|bat)$/i, "").toLowerCase();
  if (name === "opencode" || name.startsWith("opencode")) return "opencode";
  if (name === "claude" || name.startsWith("claude")) return "claude";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Fake Agent
// ---------------------------------------------------------------------------

/**
 * Sentinel agent name that triggers the built-in fake-agent-runner instead of
 * the real agent binary. Tasks with `agent: "fake-agent"` are executed by
 * `src/lib/fake-agent-runner.ts` — zero LLM calls, deterministic commits,
 * configurable sleep duration via FAKE_SLEEP_MS in the prompt.
 */
export const FAKE_AGENT_SENTINEL = "fake-agent";

/**
 * Resolve the fake-agent-runner script path relative to this module.
 * Both files live in `src/lib/`, so we use `import.meta.dir` to get a
 * stable path regardless of how wombo-combo was installed.
 */
function resolveFakeAgentBin(): string {
  // import.meta.dir gives the directory of the current source file in Bun
  return join(import.meta.dir, "fake-agent-runner.ts");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaunchResult {
  pid: number;
  process: ChildProcess;
  sessionId?: string;
  /** Harness that runs this process */
  harness: HarnessId;
  /** Profile name that was used ("default" for the legacy path, "fake-agent" for the fake agent) */
  profile: string;
  /** Stdout line normalizer to hand to ProcessMonitor.addProcess (absent for plain opencode streams) */
  normalize?: Normalizer;
  /** The route this process was started with */
  route: ResolvedRoute;
}

export interface LaunchOptions {
  worktreePath: string;
  featureId: string;
  prompt: string;
  model?: string;
  config: WomboConfig;
  /** Override the agent name (for specialized agents from the registry) */
  agentName?: string;
  /** HITL mode for this agent (from quest or config) */
  hitlMode?: string;
  /** Project root (for HITL directory path) */
  projectRoot?: string;
  /** Resolved route (profile/harness); default: the legacy route from config */
  route?: ResolvedRoute;
}

export interface RetryOptions {
  worktreePath: string;
  featureId: string;
  sessionId: string;
  buildErrors: string;
  model?: string;
  config: WomboConfig;
  /** HITL mode for this agent (from quest or config) */
  hitlMode?: string;
  /** Project root (for HITL directory path) */
  projectRoot?: string;
  /** Agent name (used to detect fake-agent sentinel) */
  agentName?: string;
  /** Resolved route; must be the same profile the session was started with */
  route?: ResolvedRoute;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build environment variables for an agent process.
 * Merges process.env with OPENCODE_DIR, portless env vars, HITL env vars and
 * the route's account variables (envFrom resolved from wombo's own env).
 */
function agentEnv(
  worktreePath: string,
  featureId: string,
  config: WomboConfig,
  hitlMode?: string,
  projectRoot?: string,
  route?: ResolvedRoute,
): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {
    ...process.env,
    OPENCODE_DIR: worktreePath,
    ...portlessEnv(featureId, config),
  };

  // HITL environment — always set so the hitl-ask script is available,
  // but the prompt controls whether the agent actually uses it.
  if (projectRoot) {
    env.WOMBO_HITL_DIR = hitlDir(projectRoot);
    env.WOMBO_AGENT_ID = featureId;
    env.WOMBO_HITL_MODE = hitlMode ?? "yolo";
    // Path to the hitl-ask script (relative to this module)
    // In development: src/lib/hitl-ask.ts
    // In production (bundled): same dir as this file
    const hitlAskPath = resolve(import.meta.dir, "hitl-ask.ts");
    env.WOMBO_HITL_ASK = hitlAskPath;
  }

  if (route) {
    Object.assign(env, resolveRouteEnv(route, process.env));
  }

  return env;
}

/**
 * Generate a unique title for an opencode agent session.
 *
 * Appends a timestamp suffix (milliseconds since epoch) to the base title
 * so that each invocation of launchHeadless gets a distinct title. This
 * prevents opencode from reusing a prior session that matches the title,
 * which would cause multiple agents to share the same session ID.
 *
 * Example: "woco: my-feature-1742413200000"
 */
export function makeAgentTitle(featureId: string): string {
  return `woco: ${featureId}-${Date.now()}`;
}

/** Route used for the fake agent: opencode-shaped args, executed by `bun`. */
function fakeRoute(config: WomboConfig): ResolvedRoute {
  return {
    profile: FAKE_AGENT_SENTINEL,
    harness: "opencode",
    bin: "bun",
    model: null,
    provider: null,
    args: [],
    env: {},
    envFrom: {},
    account: null,
    capabilities: getHarness("opencode").capabilities,
    chain: [FAKE_AGENT_SENTINEL],
    legacy: true,
  };
}

interface Prepared {
  route: ResolvedRoute;
  command: HarnessCommand;
  prompt: string;
  prefixArgs: string[];
}

/**
 * Turn a route plus request details into the concrete command and prompt.
 * Harnesses without named-agent selection get the agent definition inlined
 * into the prompt instead of an `--agent` flag.
 */
function prepare(
  route: ResolvedRoute,
  isFake: boolean,
  resume: boolean,
  req: Omit<HarnessLaunchRequest, "bin" | "extraArgs" | "command" | "provider" | "passDir">,
): Prepared {
  const adapter = getHarness(route.harness);
  const full: HarnessLaunchRequest = {
    ...req,
    bin: route.bin,
    provider: route.provider,
    extraArgs: route.args,
    command: route.command,
    passDir: isFake,
  };
  let prompt = req.prompt;
  if (!resume && !route.capabilities.agentSelection && !isFake) {
    prompt = inlineAgentDefinition(prompt, req.agentName, req.cwd);
  }
  full.prompt = prompt;
  return {
    route,
    command: resume ? adapter.buildResume(full) : adapter.buildLaunch(full),
    prompt,
    prefixArgs: isFake ? [resolveFakeAgentBin()] : [],
  };
}

function spawnPrepared(p: Prepared, env: Record<string, string | undefined>, cwd: string): LaunchResult {
  const adapter = getHarness(p.route.harness);
  const child = spawnHarness(p.command, p.prompt, { cwd, env, prefixArgs: p.prefixArgs });
  return {
    pid: child.pid!,
    process: child,
    harness: p.route.harness,
    profile: p.route.profile,
    route: p.route,
    // opencode streams are already canonical: no normalizer, so the monitor keeps its original code path
    normalize: p.route.harness === "opencode" ? undefined : adapter.createNormalizer({ command: p.route.command }),
  };
}

function routeFor(
  opts: { config: WomboConfig; agentName?: string; route?: ResolvedRoute; model?: string },
  operation: Operation,
): { route: ResolvedRoute; isFake: boolean } {
  const isFake = opts.agentName === FAKE_AGENT_SENTINEL;
  if (isFake) return { route: fakeRoute(opts.config), isFake };
  return {
    route: opts.route ?? resolveRoute(opts.config, { operation, sessionModel: opts.model }),
    isFake,
  };
}

// ---------------------------------------------------------------------------
// Headless Launch
// ---------------------------------------------------------------------------

/**
 * Launch agent in headless mode with JSON output.
 *
 * The child process is spawned with `detached: false` — it is tied to the
 * parent process and will die when the parent exits. This is intentional:
 * stdout must be piped for ProcessMonitor to parse JSON events in real-time.
 * See module-level documentation for the full lifecycle analysis.
 */
export function launchHeadless(opts: LaunchOptions): LaunchResult {
  const { route, isFake } = routeFor(opts, "code");
  const prepared = prepare(route, isFake, false, {
    operation: "code",
    cwd: opts.worktreePath,
    prompt: opts.prompt,
    model: opts.model ?? (isFake ? undefined : route.model),
    agentName: opts.agentName ?? opts.config.agent.name,
    title: makeAgentTitle(opts.featureId),
  });
  return spawnPrepared(
    prepared,
    agentEnv(opts.worktreePath, opts.featureId, opts.config, opts.hitlMode, opts.projectRoot, isFake ? undefined : route),
    opts.worktreePath,
  );
}

/**
 * Resume a headless session with a retry message (build errors).
 *
 * Same lifecycle as `launchHeadless` — spawned with `detached: false`,
 * piped stdio, no `unref()`. The child is tied to the parent process.
 * Harnesses that cannot resume (no session support, or a custom command
 * without resumeArgs) get a fresh run whose prompt is the retry message.
 */
export function retryHeadless(opts: RetryOptions): LaunchResult {
  const { route, isFake } = routeFor(opts, "code");

  const retryMessage = `The build failed. Please fix the following errors and run \`${opts.config.build.command}\` again:\n\n\`\`\`\n${opts.buildErrors}\n\`\`\`\n\nFix all errors, then verify the build passes.`;

  const canResume =
    !!opts.sessionId &&
    route.capabilities.sessionResume &&
    (route.harness !== "custom" || !!route.command?.resumeArgs);

  const prepared = prepare(route, isFake, canResume, {
    operation: "code",
    cwd: opts.worktreePath,
    prompt: retryMessage,
    model: opts.model ?? (isFake ? undefined : route.model),
    agentName: opts.agentName ?? opts.config.agent.name,
    title: makeAgentTitle(opts.featureId),
    sessionId: opts.sessionId,
  });
  return spawnPrepared(
    prepared,
    agentEnv(opts.worktreePath, opts.featureId, opts.config, opts.hitlMode, opts.projectRoot, isFake ? undefined : route),
    opts.worktreePath,
  );
}

// ---------------------------------------------------------------------------
// Conflict Resolution Launch
// ---------------------------------------------------------------------------

export interface ConflictResolverOptions {
  worktreePath: string;
  featureId: string;
  prompt: string;
  model?: string;
  config: WomboConfig;
  /** Override the agent name for conflict resolution (default: merge-resolver-agent) */
  agentName?: string;
  /** Resolved route for the "conflict" operation; default: legacy route from config */
  route?: ResolvedRoute;
}

/**
 * Launch a headless agent to resolve merge conflicts.
 *
 * This is similar to `launchHeadless`, but the prompt is a conflict-resolution
 * prompt generated by `generateConflictResolutionPrompt()`. The agent runs in
 * the feature worktree where `git merge <baseBranch>` has already been run,
 * leaving conflict markers in the working tree.
 *
 * By default uses the specialized "merge-resolver-agent" definition, which
 * has minimal context and is focused solely on conflict resolution.
 *
 * Same lifecycle as `launchHeadless` — spawned with `detached: false`,
 * piped stdio, no `unref()`. Note: conflict resolver processes are NOT
 * added to the ProcessMonitor (to avoid infinite recursion with
 * handleBuildVerification). They are awaited directly via process.on('exit').
 */
export function launchConflictResolver(opts: ConflictResolverOptions): LaunchResult {
  const route = opts.route ?? resolveRoute(opts.config, { operation: "conflict", sessionModel: opts.model });
  const agentName = opts.agentName ?? "merge-resolver-agent";
  const prepared = prepare(route, false, false, {
    operation: "conflict",
    cwd: opts.worktreePath,
    prompt: opts.prompt,
    model: opts.model ?? route.model,
    agentName,
    title: makeAgentTitle(`conflict-resolve-${opts.featureId}`),
  });
  return spawnPrepared(prepared, agentEnv(opts.worktreePath, opts.featureId, opts.config, undefined, undefined, route), opts.worktreePath);
}

// ---------------------------------------------------------------------------
// Planner Launch
// ---------------------------------------------------------------------------

export interface PlannerLaunchOptions {
  config: WomboConfig;
  projectRoot: string;
  prompt: string;
  /** Agent definition name (opencode `--agent`; inlined into the prompt elsewhere) */
  agentName: string;
  /** Fixed session title */
  title: string;
  model?: string;
}

export type PlannerLaunch =
  | { ok: true; result: LaunchResult }
  | { ok: false; error: string };

/**
 * Launch a planner-style agent (quest, errand, genesis, onboarding synthesis)
 * in the project root through the "plan" operation profile.
 *
 * Verifies the binary (and account env vars) before spawning, walking the
 * profile's fallback chain. With no profiles configured the error text for a
 * missing binary is the historical one.
 */
export function launchPlanner(opts: PlannerLaunchOptions): PlannerLaunch {
  const primary = resolveRoute(opts.config, { operation: "plan", sessionModel: opts.model });
  let route = primary;
  if (primary.legacy) {
    if (!existsSync(primary.bin)) {
      return {
        ok: false,
        error: `Agent binary not found at: ${primary.bin}. Check config.agent.bin or OPENCODE_BIN env var.`,
      };
    }
  } else {
    try {
      route = selectAvailableRoute(opts.config, primary, { operation: "plan", sessionModel: opts.model }).route;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  const prepared = prepare(route, false, false, {
    operation: "plan",
    cwd: opts.projectRoot,
    prompt: opts.prompt,
    model: opts.model ?? route.model,
    agentName: opts.agentName,
    title: opts.title,
  });
  const env: Record<string, string | undefined> = {
    ...process.env,
    OPENCODE_DIR: opts.projectRoot,
    ...resolveRouteEnv(route, process.env),
  };
  return { ok: true, result: spawnPrepared(prepared, env, opts.projectRoot) };
}

/**
 * Convert a planner's raw stdout into canonical opencode-shaped NDJSON for the
 * text extractors. opencode output is returned untouched.
 */
export function canonicalizeOutput(raw: string, route: ResolvedRoute): string {
  if (route.harness === "opencode") return raw;
  return normalizeOutput(raw, getHarness(route.harness), { command: route.command });
}

// ---------------------------------------------------------------------------
// Process Utilities
// ---------------------------------------------------------------------------

/**
 * Check if a process is still running by PID.
 */
export function isProcessRunning(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
