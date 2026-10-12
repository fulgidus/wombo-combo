/**
 * review.ts — Review gate core (pure, no network).
 *
 * A reviewer agent reads a task diff on two axes:
 *   - Standards: does the diff follow the repo's documented coding standards?
 *   - Spec: does the diff do what the task asked, nothing less and nothing more?
 * It answers with a single JSON object of findings. This module builds the
 * prompt, parses the (possibly noisy) answer and decides pass/fail. Spawning
 * the reviewer, posting comments and the retry loop live in the daemon.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Task } from "./tasks";
import type { ReviewConfig } from "../config";
import { NO_AI_ATTRIBUTION_RULE } from "./prompt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const REVIEW_AXES = ["standards", "spec"] as const;
export type ReviewAxis = (typeof REVIEW_AXES)[number];

/** Most severe first */
export const REVIEW_SEVERITIES = ["blocking", "major", "minor", "nit"] as const;
export type ReviewSeverity = (typeof REVIEW_SEVERITIES)[number];

export interface ReviewFinding {
  axis: ReviewAxis;
  severity: ReviewSeverity;
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface ReviewQuestContext {
  id: string;
  goal: string;
}

export interface ReviewPromptInput {
  task: Task;
  quest?: ReviewQuestContext;
  diff: string;
  /** Documented standards, see loadStandards(); omitted = none documented */
  standards?: string | null;
  /** The task spec as shown to the implementing agent */
  specText: string;
  /** Defaults to DEFAULT_MAX_DIFF_CHARS */
  maxDiffChars?: number;
}

export interface ParsedFindings {
  /** False when no findings object could be extracted from the output */
  ok: boolean;
  findings: ReviewFinding[];
  /** Number of malformed entries that were dropped */
  dropped: number;
}

export interface ReviewDecision {
  pass: boolean;
  blocking: ReviewFinding[];
}

export const DEFAULT_MAX_DIFF_CHARS = 60000;
export const DIFF_TRUNCATION_MARKER = "[... diff truncated by wombo-combo review gate ...]";
/** Per-file cap when embedding standards documents in the prompt */
const MAX_STANDARDS_FILE_CHARS = 20000;

// ---------------------------------------------------------------------------
// Standards
// ---------------------------------------------------------------------------

const STANDARDS_FILES = ["CODING_STANDARDS.md", "AGENTS.md"] as const;

/**
 * Collect the repo's documented standards: CODING_STANDARDS.md (if present)
 * followed by the conventions in AGENTS.md. Returns null when neither exists.
 */
export function loadStandards(projectRoot: string): string | null {
  const parts: string[] = [];
  for (const name of STANDARDS_FILES) {
    const path = join(projectRoot, name);
    if (!existsSync(path)) continue;
    let text: string;
    try {
      text = readFileSync(path, "utf-8").trim();
    } catch {
      continue;
    }
    if (!text) continue;
    if (text.length > MAX_STANDARDS_FILE_CHARS) {
      text = text.slice(0, MAX_STANDARDS_FILE_CHARS) + "\n[... truncated ...]";
    }
    parts.push(`### ${name}\n\n${text}`);
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

/** Cut a diff to `maxChars`, appending a marker so the reviewer knows. */
export function truncateDiff(
  diff: string,
  maxChars: number
): { diff: string; truncated: boolean; omittedChars: number } {
  if (diff.length <= maxChars) return { diff, truncated: false, omittedChars: 0 };
  const omittedChars = diff.length - maxChars;
  return {
    diff: `${diff.slice(0, maxChars)}\n${DIFF_TRUNCATION_MARKER} (${omittedChars} more characters omitted)`,
    truncated: true,
    omittedChars,
  };
}

/** Build the prompt for a reviewer agent. */
export function buildReviewPrompt(input: ReviewPromptInput): string {
  const { task, quest, standards, specText } = input;
  const { diff, truncated } = truncateDiff(input.diff, input.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS);
  const lines: string[] = [];

  lines.push(`# Code review: ${task.title} (${task.id})`);
  lines.push("");
  lines.push(
    "You are a code reviewer. You do NOT modify files, run builds or commit anything. " +
      "Read the diff below and report problems on two axes."
  );
  lines.push("");
  lines.push("## Axes");
  lines.push("");
  lines.push(
    "- **Standards** (`standards`): does the diff follow the repository's documented coding standards " +
      "(CODING_STANDARDS.md if present, plus the conventions in AGENTS.md, reproduced below)?"
  );
  lines.push(
    "- **Spec** (`spec`): does the diff do what the task's description, constraints and forbidden list ask — " +
      "nothing less (missing requirements) and nothing more (scope creep, forbidden items)?"
  );
  lines.push("");

  if (quest) {
    lines.push("## Quest");
    lines.push("");
    lines.push(`Quest \`${quest.id}\`: ${quest.goal}`);
    lines.push("");
  }

  lines.push("## Task spec");
  lines.push("");
  lines.push(specText.trim());
  lines.push("");

  lines.push("## Documented standards");
  lines.push("");
  lines.push(standards && standards.trim() ? standards.trim() : "No documented coding standards were found; review the Standards axis against the conventions visible in the surrounding code only.");
  lines.push("");

  lines.push("## Diff");
  lines.push("");
  if (truncated) {
    lines.push("Note: the diff is too large and was truncated. Review what is shown; do not report the truncation itself as a finding.");
    lines.push("");
  }
  lines.push("```diff");
  lines.push(diff);
  lines.push("```");
  lines.push("");

  lines.push("## Severity");
  lines.push("");
  lines.push("- `blocking`: breaks the spec, a forbidden item, a hard rule, or is a correctness/security bug. Must be fixed before merge.");
  lines.push("- `major`: a significant deviation from the spec or standards that should be fixed.");
  lines.push("- `minor`: a small deviation worth fixing but not important.");
  lines.push("- `nit`: style or taste.");
  lines.push("Report only real problems in the changed code. Do not pad the list; an empty list is a valid review.");
  lines.push("");

  lines.push("## Output format");
  lines.push("");
  lines.push("Output ONLY a JSON object, with no prose before or after it and no code fence:");
  lines.push("");
  lines.push(
    '{"findings":[{"axis":"standards"|"spec","severity":"blocking"|"major"|"minor"|"nit",' +
      '"file":"path/relative/to/repo","line":123,"message":"what is wrong","suggestion":"how to fix it"}]}'
  );
  lines.push("");
  lines.push("`line` and `suggestion` are optional. `file` and `message` are required. If there are no problems output `{\"findings\":[]}`.");
  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push(NO_AI_ATTRIBUTION_RULE);
  lines.push("- Do not add attribution of any kind to your findings, messages or suggestions.");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Find every top-level balanced `{...}` span in `text`, string-aware. */
function* jsonObjectCandidates(text: string): Generator<string> {
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "{") { i++; continue; }
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { end = j; break; }
    }
    if (end === -1) { i++; continue; }
    yield text.slice(i, end + 1);
    i = end + 1;
  }
}

function toFinding(raw: unknown): ReviewFinding | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!REVIEW_AXES.includes(r.axis as ReviewAxis)) return null;
  if (!REVIEW_SEVERITIES.includes(r.severity as ReviewSeverity)) return null;
  if (typeof r.file !== "string" || !r.file.trim()) return null;
  if (typeof r.message !== "string" || !r.message.trim()) return null;
  const f: ReviewFinding = {
    axis: r.axis as ReviewAxis,
    severity: r.severity as ReviewSeverity,
    file: r.file.trim(),
    message: r.message.trim(),
  };
  if (typeof r.line === "number" && Number.isInteger(r.line) && r.line >= 1) f.line = r.line;
  if (typeof r.suggestion === "string" && r.suggestion.trim()) f.suggestion = r.suggestion.trim();
  return f;
}

/**
 * Extract findings from reviewer output. Tolerates surrounding prose and code
 * fences (the first balanced object with a `findings` array wins), validates
 * every entry and drops malformed ones, reporting how many.
 */
export function parseReviewFindings(agentOutput: string): ParsedFindings {
  for (const candidate of jsonObjectCandidates(agentOutput ?? "")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }
    const list = (parsed as { findings?: unknown } | null)?.findings;
    if (!Array.isArray(list)) continue;
    const findings: ReviewFinding[] = [];
    for (const entry of list) {
      const f = toFinding(entry);
      if (f) findings.push(f);
    }
    return { ok: true, findings, dropped: list.length - findings.length };
  }
  return { ok: false, findings: [], dropped: 0 };
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

/** Pass unless a finding is at or above the `blockOn` severity. */
export function decideReview(
  findings: ReviewFinding[],
  reviewConfig: Pick<ReviewConfig, "blockOn">
): ReviewDecision {
  const threshold = REVIEW_SEVERITIES.indexOf(reviewConfig.blockOn);
  const blocking = findings.filter((f) => REVIEW_SEVERITIES.indexOf(f.severity) <= threshold);
  return { pass: blocking.length === 0, blocking };
}
