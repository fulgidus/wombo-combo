/**
 * launcher.ts — Process spawning for headless agent runs.
 *
 * Responsibilities:
 *   - Launch agent in headless mode (agent run --format json)
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

import { spawn, execSync, type ChildProcess } from "node:child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import type { WomboConfig } from "../config";
import { resolveAgentBin } from "../config";
import { portlessEnv } from "./portless";
import { hitlDir } from "./hitl-channel";
import { resolve, dirname, join, basename } from "node:path";

// ---------------------------------------------------------------------------
// Agent Type Detection
// ---------------------------------------------------------------------------

/**
 * Supported agent CLI types. Each has different CLI argument syntax:
 *
 * - **opencode**: TUI via `opencode [project]` (positional path),
 *   headless via `opencode run --format json` (operates on spawn cwd —
 *   v2 removed the --dir flag; the built-in fake agent still parses it).
 *
 * - **claude**: TUI via `claude` (uses cwd, no path flag),
 *   headless via `claude -p --output-format stream-json`.
 *   Has NO `--dir` flag — always uses cwd.
 *
 * - **unknown**: Falls back to opencode-style args.
 */
export type AgentType = "opencode" | "claude" | "unknown";

/**
 * Detect agent type from the resolved binary path.
 *
 * Inspects the basename of the binary (stripping extension) to determine
 * whether it's opencode or claude. This is intentionally simple — we match
 * on the binary name, not on probing `--help` output.
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runSilent(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

/**
 * Maximum prompt size (in bytes) that can safely be passed as a CLI argument.
 * Linux's ARG_MAX is ~2MB, but env vars also count against it. Using 128KB
 * as a safe threshold leaves ample room for environment variables.
 */
const PROMPT_ARG_MAX = 128 * 1024;

/**
 * Spawn an agent process, passing the prompt either as a CLI argument (small
 * prompts) or via stdin (large prompts). This prevents E2BIG errors from
 * exceeding the OS argument length limit.
 *
 * @returns The spawned child process
 */
function spawnWithPrompt(
  agentBin: string,
  args: string[],
  prompt: string,
  spawnOpts: {
    cwd?: string;
    env?: Record<string, string | undefined>;
  }
): ChildProcess {
  const promptBytes = Buffer.byteLength(prompt, "utf-8");

  if (promptBytes <= PROMPT_ARG_MAX) {
    // Small prompt — pass as CLI argument (simpler, more reliable)
    const child = spawn(agentBin, [...args, prompt], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
      cwd: spawnOpts.cwd,
      env: spawnOpts.env,
    });
    child.stdin?.end();
    return child;
  }

  // Large prompt — write to temp file and pipe via stdin to avoid E2BIG
  const tmpDir = mkdtempSync(join(tmpdir(), "woco-prompt-"));
  const tmpFile = join(tmpDir, "prompt.txt");
  writeFileSync(tmpFile, prompt);

  const child = spawn(agentBin, args, {
    stdio: ["pipe", "pipe", "pipe"],
    detached: false,
    cwd: spawnOpts.cwd,
    env: spawnOpts.env,
  });

  // Pipe the prompt via stdin
  child.stdin?.write(prompt);
  child.stdin?.end();

  // Clean up temp file after process exits (or after 60s as fallback)
  const cleanup = () => {
    try { unlinkSync(tmpFile); } catch {}
    try { unlinkSync(tmpDir); } catch {}
  };
  child.on("exit", cleanup);
  setTimeout(cleanup, 60_000);

  console.log(`[launcher] Prompt too large for CLI arg (${Math.round(promptBytes / 1024)}KB) — piped via stdin`);

  return child;
}

/**
 * Build environment variables for an agent process.
 * Merges process.env with OPENCODE_DIR, portless env vars, and HITL env vars.
 */
function agentEnv(
  worktreePath: string,
  featureId: string,
  config: WomboConfig,
  hitlMode?: string,
  projectRoot?: string
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
  const isFake = opts.agentName === FAKE_AGENT_SENTINEL;
  const agentBin = isFake ? "bun" : resolveAgentBin(opts.config);
  const agentType = isFake ? "unknown" : detectAgentType(agentBin);

  const args: string[] = [];

  // When using fake-agent, the binary is `bun` and first arg is the script path
  if (isFake) {
    args.push(resolveFakeAgentBin());
  }

  // Agent-type-specific headless CLI construction:
  //
  // opencode: `opencode run --format json --agent NAME --title TITLE PROMPT`
  //           (operates on the spawn cwd — v2 dropped the --dir flag;
  //            the built-in fake agent still parses --dir itself)
  // claude:   `claude -p --output-format stream-json --agent NAME PROMPT`
  //           (uses cwd for directory, set via spawn options)
  //
  if (agentType === "claude") {
    args.push(
      "-p",
      "--output-format", "stream-json",
      "--agent", opts.agentName ?? opts.config.agent.name,
    );
  } else {
    // opencode / unknown / fake-agent
    args.push(
      "run",
      "--format", "json",
      "--agent", opts.agentName ?? opts.config.agent.name,
      "--title", makeAgentTitle(opts.featureId),
    );
    if (isFake) {
      args.push("--dir", opts.worktreePath);
    }
  }

  if (opts.model) {
    args.push("--model", opts.model);
  }

  const child = spawnWithPrompt(agentBin, args, opts.prompt, {
    cwd: opts.worktreePath,
    env: agentEnv(opts.worktreePath, opts.featureId, opts.config, opts.hitlMode, opts.projectRoot),
  });

  return {
    pid: child.pid!,
    process: child,
  };
}

/**
 * Resume a headless session with a retry message (build errors).
 *
 * Same lifecycle as `launchHeadless` — spawned with `detached: false`,
 * piped stdio, no `unref()`. The child is tied to the parent process.
 */
export function retryHeadless(opts: RetryOptions): LaunchResult {
  const isFake = opts.agentName === FAKE_AGENT_SENTINEL;
  const agentBin = isFake ? "bun" : resolveAgentBin(opts.config);
  const agentType = isFake ? "unknown" : detectAgentType(agentBin);

  const retryMessage = `The build failed. Please fix the following errors and run \`${opts.config.build.command}\` again:\n\n\`\`\`\n${opts.buildErrors}\n\`\`\`\n\nFix all errors, then verify the build passes.`;

  const args: string[] = [];

  if (isFake) {
    args.push(resolveFakeAgentBin());
  }

  // Agent-type-specific retry CLI construction:
  //
  // opencode: `opencode run --format json --session ID --continue MSG`
  // claude:   `claude -p --output-format stream-json --resume ID --continue MSG`
  //           (both operate on the spawn cwd)
  //
  if (agentType === "claude") {
    args.push(
      "-p",
      "--output-format", "stream-json",
      "--resume", opts.sessionId,
      "--continue",
    );
  } else {
    // opencode / unknown / fake-agent (opencode v2 operates on spawn cwd)
    args.push(
      "run",
      "--format", "json",
      "--session", opts.sessionId,
      "--continue",
    );
    if (isFake) {
      args.push("--dir", opts.worktreePath);
    }
  }

  if (opts.model) {
    args.push("--model", opts.model);
  }

  const child = spawnWithPrompt(agentBin, args, retryMessage, {
    cwd: opts.worktreePath,
    env: agentEnv(opts.worktreePath, opts.featureId, opts.config, opts.hitlMode, opts.projectRoot),
  });

  return {
    pid: child.pid!,
    process: child,
  };
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
 * has minimal context and is focused solely on conflict resolution. Falls back
 * to the generalist agent if no merge-resolver-agent is available.
 *
 * Same lifecycle as `launchHeadless` — spawned with `detached: false`,
 * piped stdio, no `unref()`. Note: conflict resolver processes are NOT
 * added to the ProcessMonitor (to avoid infinite recursion with
 * handleBuildVerification). They are awaited directly via process.on('exit').
 */
export function launchConflictResolver(opts: ConflictResolverOptions): LaunchResult {
  const agentBin = resolveAgentBin(opts.config);
  const agentType = detectAgentType(agentBin);

  // Use the specialized merge-resolver agent by default
  const agentName = opts.agentName ?? "merge-resolver-agent";

  // Agent-type-specific conflict resolver CLI:
  //
  // opencode: `opencode run --format json --agent NAME --title TITLE PROMPT`
  // claude:   `claude -p --output-format stream-json --agent NAME PROMPT`
  //           (both operate on the spawn cwd)
  const args: string[] = [];

  if (agentType === "claude") {
    args.push(
      "-p",
      "--output-format", "stream-json",
      "--agent", agentName,
    );
  } else {
    args.push(
      "run",
      "--format", "json",
      "--agent", agentName,
      "--title", makeAgentTitle(`conflict-resolve-${opts.featureId}`),
    );
  }

  if (opts.model) {
    args.push("--model", opts.model);
  }

  const child = spawnWithPrompt(agentBin, args, opts.prompt, {
    cwd: opts.worktreePath,
    env: agentEnv(opts.worktreePath, opts.featureId, opts.config),
  });

  return {
    pid: child.pid!,
    process: child,
  };
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
