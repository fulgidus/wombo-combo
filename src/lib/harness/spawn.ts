/**
 * spawn.ts — Shared process spawning for every harness (task agents, conflict
 * resolvers, planners).
 *
 * Lifecycle matches the historical launcher: `detached: false`, piped stdio,
 * no `unref()` (see launcher.ts module docs for the rationale).
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { GENERALIST_TEMPLATE_PATH } from "../templates";
import type { HarnessCommand } from "./types";

/**
 * Maximum prompt size (in bytes) that can safely be passed as a CLI argument.
 * Linux's ARG_MAX is ~2MB, but env vars also count against it. 128KB leaves
 * ample room for environment variables.
 */
export const PROMPT_ARG_MAX = 128 * 1024;

export interface SpawnTarget {
  cwd?: string;
  env?: Record<string, string | undefined>;
  /** Arguments placed before the command's own args (e.g. the fake-agent script path) */
  prefixArgs?: string[];
}

/**
 * Spawn a harness command, delivering the prompt as an argument (small
 * prompts), on stdin (large prompts or promptVia "stdin"), or not at all
 * (promptVia "embedded": the prompt is already inside args).
 */
export function spawnHarness(command: HarnessCommand, prompt: string, target: SpawnTarget): ChildProcess {
  const base = [...(target.prefixArgs ?? []), ...command.args];
  const env = target.env ? { ...target.env, ...command.env } : { ...process.env, ...command.env };
  const promptBytes = Buffer.byteLength(prompt, "utf-8");
  const opts = { stdio: ["pipe", "pipe", "pipe"] as ["pipe", "pipe", "pipe"], detached: false, cwd: target.cwd, env };

  if (command.promptVia === "embedded") {
    const child = spawn(command.bin, base, opts);
    child.stdin?.end();
    return child;
  }

  if (command.promptVia === "arg" && promptBytes <= PROMPT_ARG_MAX) {
    const child = spawn(command.bin, [...base, prompt], opts);
    child.stdin?.end();
    return child;
  }

  // Large prompt (or stdin harness) — pipe via stdin to avoid E2BIG
  if (command.promptVia === "arg") {
    console.log(`[launcher] Prompt too large for CLI arg (${Math.round(promptBytes / 1024)}KB) — piped via stdin`);
  }
  const child = spawn(command.bin, [...base, ...command.stdinArgs], opts);
  child.stdin?.write(prompt);
  child.stdin?.end();
  return child;
}

/** Strip a leading YAML frontmatter block. */
function stripFrontmatter(text: string): string {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  return end === -1 ? text : text.slice(end + 4).replace(/^\r?\n/, "");
}

const TEMPLATES_DIR = dirname(GENERALIST_TEMPLATE_PATH);

/**
 * For harnesses without named-agent selection: prefix the prompt with the body
 * of the agent definition (worktree `.opencode/agents/<name>.md`, else the
 * bundled template). Returns the prompt unchanged when no definition exists.
 */
export function inlineAgentDefinition(prompt: string, agentName: string | undefined, cwd: string): string {
  if (!agentName || !/^[A-Za-z0-9._-]+$/.test(agentName)) return prompt;
  const candidates = [join(cwd, ".opencode", "agents", `${agentName}.md`), join(TEMPLATES_DIR, `${agentName}.md`)];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const body = stripFrontmatter(readFileSync(file, "utf-8")).trim();
      if (body) return `# Agent instructions (${agentName})\n\n${body}\n\n---\n\n${prompt}`;
    } catch {
      // Unreadable definition: fall through to the plain prompt
    }
  }
  return prompt;
}
