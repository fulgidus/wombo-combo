/**
 * review-stage.ts — One review round for a task, free of daemon state.
 *
 * reviewTask captures nothing itself: the diff, the reviewer process and the
 * comment store are injected, so the round is testable. runReviewGate wraps it
 * with the lifecycle (status, rounds, sending the implementer back) through an
 * explicit ReviewGateContext supplied by the AgentRunner.
 *
 * Failure policy: unparseable reviewer output never blocks a merge (pass plus a
 * warning comment); only harness errors that survive REVIEWER_ATTEMPTS fail.
 */

import type { ReviewConfig, WomboConfig } from "../config";
import type { Task } from "../lib/tasks";
import type { Quest } from "../lib/quest";
import type { ResolvedRoute, RouteSelection } from "../lib/harness/routing";
import { launchReviewer } from "../lib/launcher";
import { addComment } from "../lib/comments";
import { collectReviewerOutput, REVIEWER_TIMEOUT_MS } from "../lib/review-runner";
import { loadStandards } from "../lib/review";
import type { DaemonState } from "./state";
import type { FeedbackStore } from "./runner/feedback-store";
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

// ---------------------------------------------------------------------------
// Review gate (daemon lifecycle around reviewTask)
// ---------------------------------------------------------------------------

/** Collaborators the review gate needs from the AgentRunner. */
export interface ReviewGateContext {
  projectRoot: string;
  config: WomboConfig;
  state: DaemonState;
  /** Review rounds already started per task */
  reviewRounds: Map<string, number>;
  /** Findings to hand to the implementing agent on its next retry */
  reviewFeedback: FeedbackStore;
  runReviewer?: (prompt: string, featureId: string) => Promise<ReviewerOutput>;
  captureDiff: ReviewStageDeps["captureDiff"];
  loadTask(featureId: string): Task | null;
  selectRoute(operation: "review", featureId: string, task: Task, sessionModel: string | null): RouteSelection;
  handleRetry(featureId: string): void;
  rescueChainPredecessors(featureId: string): void;
}

/**
 * Review a verified task before merge (only called when review.enabled).
 * Returns true when the task may continue to "verified" and merge. Returns
 * false when it has been sent back to the implementing agent (the next
 * completion re-verifies and re-reviews) or failed.
 */
export async function runReviewGate(
  ctx: ReviewGateContext,
  featureId: string,
  reviewConfig: ReviewConfig,
  quest?: Quest,
): Promise<boolean> {
  const agent = ctx.state.getAgent(featureId);
  const task = ctx.loadTask(featureId);
  if (!agent) return false;
  if (!task) {
    ctx.state.emit("evt:log", { level: "warn", message: `[review] ${featureId}: task file not found, skipping review` });
    return true;
  }

  const round = (ctx.reviewRounds.get(featureId) ?? 0) + 1;
  ctx.reviewRounds.set(featureId, round);
  ctx.state.updateAgentStatus(featureId, "in_review", `Review round ${round}/${reviewConfig.maxRounds}`);
  ctx.state.updateAgentActivity(featureId, `Reviewing (round ${round}/${reviewConfig.maxRounds})...`);

  const outcome = await reviewTask(
    {
      task,
      worktree: agent.worktree,
      baseBranch: agent.baseBranch,
      config: reviewConfig,
      standards: loadStandards(ctx.projectRoot),
      quest: quest ? { id: quest.id, goal: quest.goal } : undefined,
    },
    {
      captureDiff: ctx.captureDiff,
      runReviewer: (prompt) => (ctx.runReviewer ?? ((p, id) => launchAndCollectReviewer(ctx, p, id, task)))(prompt, featureId),
      addComment: (c) => { addComment(ctx.projectRoot, { kind: "task", id: featureId }, c); },
      log: (level, message) => ctx.state.emit("evt:log", { level, message }),
    },
  );

  if (outcome.kind === "pass") {
    ctx.reviewRounds.delete(featureId);
    ctx.reviewFeedback.delete(featureId);
    return true;
  }

  if (outcome.kind === "blocked" && round < reviewConfig.maxRounds) {
    const feedback = formatReviewFeedback(outcome.blocking, round, reviewConfig.maxRounds);
    ctx.reviewFeedback.set(featureId, feedback);
    ctx.state.updateAgent(featureId, { error: feedback });
    ctx.state.updateAgentStatus(
      featureId,
      "retry",
      `Review found ${outcome.blocking.length} blocking finding(s), sending back (round ${round}/${reviewConfig.maxRounds})`,
    );
    ctx.handleRetry(featureId);
    return false;
  }

  const reason =
    outcome.kind === "blocked"
      ? `Review blocked after ${round} round(s): ${outcome.blocking.length} blocking finding(s) remain`
      : `Review failed: ${outcome.error}`;
  ctx.reviewRounds.delete(featureId);
  ctx.reviewFeedback.delete(featureId);
  try {
    addComment(ctx.projectRoot, { kind: "task", id: featureId }, { body: reason, author: "woco", role: "system" });
  } catch (err) {
    ctx.state.emit("evt:log", { level: "warn", message: `[review] summary comment failed for ${featureId}: ${err instanceof Error ? err.message : String(err)}` });
  }
  ctx.state.updateAgentStatus(featureId, "failed", reason);
  ctx.state.updateAgent(featureId, { error: reason });
  ctx.state.cancelDownstream(featureId);
  ctx.rescueChainPredecessors(featureId);
  return false;
}

/** Launch the reviewer through the "review" route and collect its answer. */
export async function launchAndCollectReviewer(
  ctx: Pick<ReviewGateContext, "config" | "state" | "selectRoute">,
  prompt: string,
  featureId: string,
  task: Task,
): Promise<ReviewerOutput> {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return { ok: false, error: "agent state not found" };
  let route: ResolvedRoute | undefined;
  try {
    route = ctx.selectRoute("review", featureId, task, null).route;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  try {
    const launch = launchReviewer({
      worktreePath: agent.worktree,
      featureId,
      prompt,
      model: agent.model ?? ctx.state.getModel() ?? undefined,
      config: ctx.config,
      route,
    });
    return await collectReviewerOutput(launch, { timeoutMs: REVIEWER_TIMEOUT_MS });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
