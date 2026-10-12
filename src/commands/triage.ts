/**
 * triage.ts — Triage commands for tasks.
 *
 *   woco triage list                                   Queue buckets (needs-triage, needs-info with news, ready-*)
 *   woco triage show <task>                            Task, triage state and comments
 *   woco triage set <task> <state> [--category c] [--comment text] [--reopen] [--force]
 *   woco triage brief <task>                           Add an agent-brief comment skeleton
 *
 * Rules live in lib/triage.ts; the brief follows .claude/skills/triage/AGENT-BRIEF.md.
 */

import type { OutputFormat } from "../lib/output";
import { output, outputError, outputMessage } from "../lib/output";
import { loadConfig } from "../config";
import { addComment, listComments } from "../lib/comments";
import { msg, t } from "../lib/i18n";
import { findFeatureById, loadFeatures } from "../lib/tasks";
import { renderGeneric } from "../lib/toon";
import { maybeSyncItem } from "../lib/sync/auto";
import {
  TRIAGE_CATEGORIES,
  TRIAGE_STATES,
  TriageError,
  getTriage,
  listTriageQueue,
  transition,
  type TriageCategory,
  type TriageEntry,
  type TriageState,
} from "../lib/triage";
import { printComment } from "./comment";

export interface TriageOptions {
  projectRoot: string;
  outputFmt?: OutputFormat;
  taskId?: string;
  state?: string;
  category?: string;
  comment?: string;
  author?: string;
  reopen?: boolean;
  force?: boolean;
}

const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

/** Agent brief skeleton, following .claude/skills/triage/AGENT-BRIEF.md */
export function agentBriefSkeleton(category: TriageCategory | null): string {
  return [
    "## Agent Brief",
    "",
    `**Category:** ${category ?? "bug / enhancement"}`,
    "**Summary:** <one-line description of what needs to happen>",
    "",
    "**Current behavior:**",
    "<what happens now; for bugs the broken behavior, for enhancements the status quo>",
    "",
    "**Desired behavior:**",
    "<what should happen after the work, including edge cases and error conditions>",
    "",
    "**Key interfaces:**",
    "- `<TypeName or functionName()>`: <what needs to change and why>",
    "",
    "**Acceptance criteria:**",
    "- [ ] <specific, testable criterion>",
    "",
    "**Out of scope:**",
    "- <thing that should NOT be changed in this task>",
  ].join("\n");
}

function failFrom(fmt: OutputFormat, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  return outputError(fmt, msg("cli.triage.failed", { error: message }));
}

const BUCKETS = [
  ["needsTriage", "cli.triage.list.needsTriage"],
  ["needsInfoWithNewComments", "cli.triage.list.needsInfo"],
  ["readyForAgent", "cli.triage.list.readyForAgent"],
  ["readyForHuman", "cli.triage.list.readyForHuman"],
] as const;

export function cmdTriageList(opts: TriageOptions): void {
  const fmt = opts.outputFmt ?? "text";
  let queue;
  try {
    queue = listTriageQueue(opts.projectRoot);
  } catch (err) {
    return failFrom(fmt, err);
  }
  output(fmt, queue, () => {
    for (const [key, label] of BUCKETS) {
      const entries: TriageEntry[] = queue[key];
      console.log(`${BOLD}${t(label, { count: entries.length })}${RESET}`);
      for (const e of entries) {
        const news = e.newComments.length > 0 ? ` ${t("cli.triage.list.newComments", { count: e.newComments.length })}` : "";
        console.log(`  ${e.task.id}  ${e.category ?? "-"}  ${e.task.title}${news}`);
      }
    }
    if (queue.problems.length > 0) {
      console.log(`${BOLD}${t("cli.triage.list.problems", { count: queue.problems.length })}${RESET}`);
      for (const p of queue.problems) console.log(`  ${p.id}  ${p.issues.join("; ")}`);
    }
  }, () => {
    for (const [key] of BUCKETS) {
      const rows = queue[key].map((e) => ({ id: e.task.id, category: e.category, title: e.task.title, since: e.since, new_comments: e.newComments.length }));
      if (rows.length > 0) console.log(`${key}:\n${renderGeneric(rows)}`);
    }
    if (queue.problems.length > 0) console.log(`problems:\n${renderGeneric(queue.problems)}`);
  });
}

export function cmdTriageShow(opts: TriageOptions): void {
  const fmt = opts.outputFmt ?? "text";
  const id = opts.taskId;
  if (!id) return outputError(fmt, msg("cli.triage.show.usage"));
  let task;
  try {
    task = findFeatureById(loadFeatures(opts.projectRoot, loadConfig(opts.projectRoot)), id);
  } catch (err) {
    return failFrom(fmt, err);
  }
  if (!task) return outputError(fmt, msg("cli.triage.notFound", { id }));
  const triage = getTriage(task);
  const comments = listComments(opts.projectRoot, { kind: "task", id });
  output(fmt, { task, triage, comments }, () => {
    console.log(`${BOLD}${task.id}${RESET}  ${task.title}`);
    console.log(t("cli.triage.show.status", { status: task.status, priority: task.priority }));
    console.log(t("cli.triage.show.state", { state: triage.state ?? t("cli.triage.untriaged"), category: triage.category ?? "-" }));
    for (const issue of triage.issues) console.log(t("cli.triage.show.issue", { issue }));
    if (task.description) console.log(`\n${task.description}`);
    console.log(`\n${BOLD}${t("cli.triage.show.comments", { count: comments.length })}${RESET}`);
    for (const c of comments) printComment(c, "  ");
  });
}

export function cmdTriageSet(opts: TriageOptions): void {
  const fmt = opts.outputFmt ?? "text";
  if (!opts.taskId || !opts.state) return outputError(fmt, msg("cli.triage.set.usage"));
  if (!(TRIAGE_STATES as readonly string[]).includes(opts.state)) {
    return outputError(fmt, msg("cli.triage.set.invalidState", { state: opts.state, states: TRIAGE_STATES.join("|") }));
  }
  if (opts.category !== undefined && !(TRIAGE_CATEGORIES as readonly string[]).includes(opts.category)) {
    return outputError(fmt, msg("cli.triage.set.invalidCategory", { category: opts.category, categories: TRIAGE_CATEGORIES.join("|") }));
  }
  let result;
  try {
    result = transition(opts.projectRoot, opts.taskId, opts.state as TriageState, {
      category: opts.category as TriageCategory | undefined,
      comment: opts.comment,
      author: opts.author || undefined,
      reopen: opts.reopen,
      force: opts.force,
    });
  } catch (err) {
    if (err instanceof TriageError) return outputError(fmt, msg("cli.triage.failed", { error: err.message }));
    return failFrom(fmt, err);
  }
  outputMessage(
    fmt,
    msg("cli.triage.set.done", { id: result.id, from: result.from ?? t("cli.triage.untriaged"), to: result.to }),
    { result },
  );
}

export function cmdTriageBrief(opts: TriageOptions): void {
  const fmt = opts.outputFmt ?? "text";
  const id = opts.taskId;
  if (!id) return outputError(fmt, msg("cli.triage.brief.usage"));
  let category: TriageCategory | null;
  try {
    const task = findFeatureById(loadFeatures(opts.projectRoot, loadConfig(opts.projectRoot)), id);
    if (!task) return outputError(fmt, msg("cli.triage.notFound", { id }));
    category = getTriage(task).category;
  } catch (err) {
    return failFrom(fmt, err);
  }
  let comment;
  try {
    comment = addComment(opts.projectRoot, { kind: "task", id }, {
      body: agentBriefSkeleton(category),
      author: opts.author || undefined,
      role: "human",
    });
  } catch (err) {
    return failFrom(fmt, err);
  }
  maybeSyncItem(opts.projectRoot, { kind: "task", id });
  outputMessage(fmt, msg("cli.triage.brief.done", { id, comment: comment.id }), { comment });
}
