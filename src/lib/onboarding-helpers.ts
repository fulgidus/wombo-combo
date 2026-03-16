/**
 * onboarding-helpers.ts — Pure business logic for the onboarding wizard.
 *
 * Extracted from tui-onboarding.ts so these functions can be used without
 * importing neo-blessed. Contains:
 *   - runBrownfieldScout()  — Auto-scout codebase structure
 *   - runLlmSynthesis()     — LLM-enhanced profile refinement
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { WomboConfig } from "../config";
import { resolveAgentBin } from "../config";
import { buildScoutIndex, formatScoutTree } from "./subagents/scout";
import {
  normalizeProfile,
  type ProjectProfile,
} from "./project-store";

// ---------------------------------------------------------------------------
// runBrownfieldScout
// ---------------------------------------------------------------------------

/**
 * Run the brownfield codebase scout and return a formatted tree string.
 *
 * Calls `buildScoutIndex(projectRoot)` and formats the result with
 * `formatScoutTree`. If scouting fails for any reason, returns an empty
 * string (graceful fallback).
 *
 * @param projectRoot — Absolute path to the project root directory.
 * @returns A compact file tree string suitable for prompt injection, or ""
 */
export async function runBrownfieldScout(projectRoot: string): Promise<string> {
  try {
    const index = await buildScoutIndex(projectRoot);
    return formatScoutTree(index, {
      maxDepth: 4,
      showSymbolCounts: true,
      maxLines: 150,
    });
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// runLlmSynthesis helpers
// ---------------------------------------------------------------------------

/**
 * Extract text content from the JSON event stream produced by the agent.
 * Looks for "text" type events and concatenates their part.text fields.
 * Non-JSON lines are included as-is (plain text fallback).
 */
function extractTextFromJsonEvents(rawOutput: string): string {
  const lines = rawOutput.split("\n");
  const textParts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const event = JSON.parse(trimmed);
      if (event.type === "text" && event.part?.text) {
        textParts.push(event.part.text);
      }
    } catch {
      // Not JSON — might be plain text output, include it
      textParts.push(trimmed);
    }
  }

  return textParts.join("");
}

/**
 * Extract YAML content from fenced code blocks in agent output.
 * Returns the content of the last ```yaml ... ``` block found, or null.
 */
function extractYamlFromFencedBlocks(text: string): string | null {
  const pattern = /```ya?ml\s*\n([\s\S]*?)```/gi;
  let lastMatch: string | null = null;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(text)) !== null) {
    lastMatch = m[1];
  }

  return lastMatch?.trim() ?? null;
}

/**
 * Format a ProjectProfile as a markdown document for the LLM prompt.
 */
function formatProfileAsMarkdown(profile: ProjectProfile): string {
  const sections: string[] = [];

  sections.push("# Current Project Profile\n");

  // Identity
  sections.push("## Identity\n");
  if (profile.name) sections.push(`- **Name:** ${profile.name}`);
  sections.push(`- **Type:** ${profile.type}`);
  if (profile.description) sections.push(`- **Description:** ${profile.description}`);
  sections.push("");

  // Vision
  if (profile.vision) {
    sections.push("## Vision\n");
    sections.push(profile.vision);
    sections.push("");
  }

  // Objectives
  if (profile.objectives.length > 0) {
    sections.push("## Objectives\n");
    for (const obj of profile.objectives) {
      sections.push(`- [${obj.priority}] ${obj.text} (status: ${obj.status})`);
    }
    sections.push("");
  }

  // Tech stack
  const ts = profile.tech_stack;
  sections.push("## Tech Stack\n");
  if (ts.runtime) sections.push(`- **Runtime:** ${ts.runtime}`);
  if (ts.language) sections.push(`- **Language:** ${ts.language}`);
  if (ts.frameworks.length > 0) sections.push(`- **Frameworks:** ${ts.frameworks.join(", ")}`);
  if (ts.tools.length > 0) sections.push(`- **Tools:** ${ts.tools.join(", ")}`);
  if (ts.notes) sections.push(`- **Notes:** ${ts.notes}`);
  sections.push("");

  // Conventions
  const conv = profile.conventions;
  const convEntries = Object.entries(conv).filter(([, v]) => v && v.trim());
  if (convEntries.length > 0) {
    sections.push("## Conventions\n");
    for (const [key, value] of convEntries) {
      const label = key.replace(/_/g, " ");
      sections.push(`- **${label.charAt(0).toUpperCase() + label.slice(1)}:** ${value}`);
    }
    sections.push("");
  }

  // Rules
  if (profile.rules.length > 0) {
    sections.push("## Rules\n");
    for (const rule of profile.rules) {
      const parts = [`- **[${rule.rigidity}] ${rule.scope}:** ${rule.text}`];
      if (rule.consequences) parts.push(`  - Consequences: ${rule.consequences}`);
      if (rule.tags.length > 0) parts.push(`  - Tags: ${rule.tags.join(", ")}`);
      sections.push(parts.join("\n"));
    }
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Build the full synthesis prompt for the LLM agent.
 */
function buildSynthesisPrompt(profile: ProjectProfile): string {
  const sections: string[] = [];

  sections.push("# Onboarding Profile Synthesis\n");
  sections.push(
    "You are enhancing a raw project profile collected from an onboarding wizard. " +
    "The user provided rough inputs that need to be refined into a well-structured " +
    "project profile.\n"
  );

  sections.push(formatProfileAsMarkdown(profile));

  if (profile.codebase_summary) {
    sections.push("## Codebase Summary\n");
    sections.push("The following is an auto-scanned codebase structure:\n");
    sections.push("```");
    sections.push(profile.codebase_summary);
    sections.push("```\n");
  }

  sections.push("## Instructions\n");
  sections.push(
    "Produce an enhanced YAML profile within a fenced ```yaml code block. " +
    "The YAML must conform to the ProjectProfile schema with these fields:\n"
  );
  sections.push("- **name**: string — Keep as-is unless clearly wrong");
  sections.push("- **type**: \"greenfield\" | \"brownfield\" — Keep as-is");
  sections.push("- **description**: string — Improve clarity if needed");
  sections.push("- **vision**: string — Expand into a compelling long-term vision statement");
  sections.push(
    "- **objectives**: array of {id, text, priority, status, quest_ids} — " +
    "Better-structured objectives with clear priorities (high/medium/low)"
  );
  sections.push(
    "- **tech_stack**: {runtime, language, frameworks, tools, notes} — " +
    "Infer missing details from the codebase summary if available"
  );
  sections.push(
    "- **conventions**: {commits, branches, testing, coding_style, naming} — " +
    "Infer from codebase patterns if not provided"
  );
  sections.push(
    "- **rules**: array of {id, text, scope, rigidity, consequences, tags} — " +
    "Expand rules with proper scope (e.g. 'runtime', 'distribution', 'tui'), " +
    "rigidity ('hard'/'soft'/'preference'), and meaningful consequences"
  );
  sections.push("");
  sections.push(
    "Keep the enhanced profile faithful to the user's intent. " +
    "Do not invent goals or rules the user didn't imply. " +
    "Preserve existing IDs where possible. " +
    "Output ONLY the YAML in a single fenced code block."
  );

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// runLlmSynthesis
// ---------------------------------------------------------------------------

/**
 * Spawn an LLM agent to enhance the raw project profile.
 *
 * Follows the same agent-spawning pattern as genesis-planner.ts:
 *   1. resolveAgentBin(config) to get the binary path.
 *   2. Check existsSync(agentBin), return original profile if not found.
 *   3. Build a prompt with all raw profile data + codebase_summary.
 *   4. spawn(agentBin, ['run', '--format', 'json', ...]).
 *   5. Capture stdout, extract text from JSON events, find YAML.
 *   6. Normalize parsed result with normalizeProfile.
 *   7. Return enhanced profile, falling back to original on error.
 */
export async function runLlmSynthesis(
  profile: ProjectProfile,
  config: WomboConfig,
  projectRoot: string,
  onProgress: (msg: string) => void
): Promise<ProjectProfile> {
  try {
    onProgress("Resolving agent binary...");
    const agentBin = resolveAgentBin(config);

    if (!existsSync(agentBin)) {
      onProgress("Agent binary not found — skipping LLM synthesis");
      return profile;
    }

    onProgress("Building synthesis prompt...");
    const prompt = buildSynthesisPrompt(profile);

    onProgress("Launching LLM synthesis agent...");
    const args = [
      "run",
      "--format", "json",
      "--agent", "genesis-planner-agent",
      "--dir", projectRoot,
      "--title", "woco: onboarding synthesis",
      prompt,
    ];

    const child = spawn(agentBin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
      env: {
        ...process.env,
        OPENCODE_DIR: projectRoot,
      },
    });

    child.stdin?.end();

    const chunks: Buffer[] = [];
    let stderrText = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrText += chunk.toString();
    });

    const SYNTHESIS_TIMEOUT_MS = 5 * 60 * 1000;
    const exitCode = await new Promise<number>((resolve) => {
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            child.kill("SIGTERM");
          } catch {
            // Best effort
          }
          resolve(-1);
        }
      }, SYNTHESIS_TIMEOUT_MS);

      child.on("close", (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(code ?? 1);
        }
      });

      child.on("error", (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          stderrText += `\nSpawn error: ${err.message}`;
          resolve(1);
        }
      });
    });

    const rawOutput = Buffer.concat(chunks).toString("utf-8");

    if (exitCode === -1) {
      onProgress("LLM synthesis timed out — using raw profile");
      return profile;
    }

    if (exitCode !== 0 && !rawOutput.trim()) {
      onProgress("LLM synthesis failed — using raw profile");
      return profile;
    }

    onProgress("Parsing LLM synthesis output...");
    const textContent = extractTextFromJsonEvents(rawOutput);

    const yamlStr = extractYamlFromFencedBlocks(textContent);

    if (!yamlStr) {
      onProgress("No YAML found in LLM output — using raw profile");
      return profile;
    }

    onProgress("Applying enhanced profile...");
    const parsed = parseYaml(yamlStr);

    if (!parsed || typeof parsed !== "object") {
      onProgress("Invalid YAML from LLM — using raw profile");
      return profile;
    }

    const enhanced = normalizeProfile(parsed as Record<string, unknown>);

    enhanced.created_at = profile.created_at;
    enhanced.updated_at = profile.updated_at;
    enhanced.genesis_count = profile.genesis_count;

    if (!enhanced.codebase_summary && profile.codebase_summary) {
      enhanced.codebase_summary = profile.codebase_summary;
    }

    onProgress("LLM synthesis complete");
    return enhanced;
  } catch {
    onProgress("LLM synthesis error — using raw profile");
    return profile;
  }
}
