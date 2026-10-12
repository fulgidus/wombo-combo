/**
 * review-stage.ts — One review round for a task, free of daemon state.
 *
 * Captures nothing itself: the diff, the reviewer process and the comment
 * store are injected, so the round is testable and the AgentRunner owns only
 * the lifecycle (status, rounds, sending the implementer back).
 *
 * Failure policy: unparseable reviewer output never blocks a merge (pass plus a
 * warning comment); only harness errors that survive REVIEWER_ATTEMPTS fail.
 */

import type { ReviewConfig } from "../config";
import type { Task } from "../lib/tasks";
import {
  buildReviewPrompt,
  decideReview,
  parseReviewFindings,
  type ReviewFinding,
  type ReviewQuestContext,
} from "../lib/review";
import type { ReviewerOutput } from "../lib/review-runner";

/** Comment author for review findings */
export const REVIEWER_AUTHOR = "reviewer";
/** Reviewer launches per round before a harness error fails the run */
export const REVIEWER_ATTEMPTS = 2;

export interface ReviewStageDeps {
  /** Unified diff of the task against its base (empty = nothing to review) */
  captureDiff(worktree: string, baseBranch: string): string;
  /** Run the reviewer agent with this prompt and return its text */
  runReviewer(prompt: string): Promise<ReviewerOutput>;
  addComment(c: { body: string; author: string; role: "agent" }): void;
  log(level: "info" | "warn", message: string): void;
}

export interface ReviewStageInput {
  task: Task;
  worktree: string;
  baseBranch: string;
  config: ReviewConfig;
  standards: string | null;
  quest?: ReviewQuestContext;
}

export type ReviewOutcome =
  | { kind: "pass"; findings: ReviewFinding[] }
  | { kind: "blocked"; findings: ReviewFinding[]; blocking: ReviewFinding[] }
  | { kind: "error"; error: string };

/** `severity axis file:line message` */
export function formatFindingComment(f: ReviewFinding): string {
  const where = f.line ? `${f.file}:${f.line}` : f.file;
  return `${f.severity} ${f.axis} ${where} ${f.message}`;
}

/** Message handed to the implementing agent when its work is sent back. */
export function formatReviewFeedback(blocking: ReviewFinding[], round: number, maxRounds: number): string {
  const lines = [
    `A code review (round ${round}/${maxRounds}) found problems that must be fixed before this task can merge.`,
    "Address each finding below, commit the fix, and make sure the build and tests still pass.",
    "",
  ];
  for (const f of blocking) {
    lines.push(`- ${formatFindingComment(f)}`);
    if (f.suggestion) lines.push(`  Suggested fix: ${f.suggestion}`);
  }
  return lines.join("\n");
}

/** The task spec as the reviewer should read it. */
export function buildSpecText(task: Task): string {
  const lines = [`# ${task.title} (${task.id})`, "", task.description.trim()];
  const list = (heading: string, items: string[]) => {
    if (items.length === 0) return;
    lines.push("", `${heading}:`, ...items.map((i) => `- ${i}`));
  };
  const flat = (subs: Task["subtasks"], depth = 0): string[] =>
    subs.flatMap((s) => [`${"  ".repeat(depth)}${s.title}`, ...flat(s.subtasks ?? [], depth + 1)]);
  list("Subtasks", flat(task.subtasks));
  list("Constraints", task.constraints);
  list("Forbidden", task.forbidden);
  return lines.join("\n");
}

export async function reviewTask(input: ReviewStageInput, deps: ReviewStageDeps): Promise<ReviewOutcome> {
  const diff = deps.captureDiff(input.worktree, input.baseBranch);
  if (!diff.trim()) {
    deps.log("info", `[review] ${input.task.id}: empty diff, nothing to review`);
    return { kind: "pass", findings: [] };
  }

  const prompt = buildReviewPrompt({
    task: input.task,
    quest: input.quest,
    diff,
    standards: input.standards,
    specText: buildSpecText(input.task),
    maxDiffChars: input.config.maxDiffChars,
  });

  let output: ReviewerOutput = { ok: false, error: "reviewer did not run" };
  for (let attempt = 1; attempt <= REVIEWER_ATTEMPTS; attempt++) {
    try {
      output = await deps.runReviewer(prompt);
    } catch (err) {
      output = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    if (output.ok) break;
    deps.log("warn", `[review] ${input.task.id}: reviewer attempt ${attempt}/${REVIEWER_ATTEMPTS} failed: ${output.error}`);
  }
  if (!output.ok) return { kind: "error", error: output.error };

  const parsed = parseReviewFindings(output.text);
  if (!parsed.ok) {
    safeComment(deps, "Review skipped: the reviewer output could not be parsed, so the task continues to merge unreviewed.");
    deps.log("warn", `[review] ${input.task.id}: reviewer output could not be parsed; continuing`);
    return { kind: "pass", findings: [] };
  }
  if (parsed.dropped > 0) deps.log("warn", `[review] ${input.task.id}: dropped ${parsed.dropped} malformed finding(s)`);

  for (const f of parsed.findings) safeComment(deps, formatFindingComment(f));

  const decision = decideReview(parsed.findings, input.config);
  return decision.pass
    ? { kind: "pass", findings: parsed.findings }
    : { kind: "blocked", findings: parsed.findings, blocking: decision.blocking };
}

function safeComment(deps: ReviewStageDeps, body: string): void {
  try {
    deps.addComment({ body, author: REVIEWER_AUTHOR, role: "agent" });
  } catch (err) {
    deps.log("warn", `[review] could not post comment: ${err instanceof Error ? err.message : String(err)}`);
  }
}
