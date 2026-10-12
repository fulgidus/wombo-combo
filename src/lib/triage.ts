/**
 * triage.ts — Triage state machine for tasks. Pure rules plus the task store
 * and git-tracked comments; no network (auto-sync is a fire-and-forget hook).
 *
 * Roles (docs/agents/triage-labels.md, .claude/skills/triage/SKILL.md):
 *   category: bug | enhancement
 *   state:    needs-triage | needs-info | ready-for-agent | ready-for-human | wontfix
 * Stored in task notes as `triage: <state>` and `category: <category>` lines;
 * every other note line is preserved. Unknown or conflicting values are
 * reported (TriageInfo.issues) and never silently repaired.
 */

import { loadConfig } from "../config";
import { addComment, listComments, type Comment } from "./comments";
import {
  applyTriageCategory,
  applyTriageRole,
  isFinishedTask,
  parseAllTriageCategories,
  parseAllTriageRoles,
} from "./sync/syncable";
import { maybeSyncItem } from "./sync/auto";
import { findFeatureById, loadFeatures, saveFeatures, type Task } from "./tasks";

export const TRIAGE_STATES = ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"] as const;
export const TRIAGE_CATEGORIES = ["bug", "enhancement"] as const;

export type TriageState = (typeof TRIAGE_STATES)[number];
export type TriageCategory = (typeof TRIAGE_CATEGORIES)[number];

/** Prefix of the system comment written by every transition. */
export const TRIAGE_COMMENT_PREFIX = "Triage: ";

export class TriageError extends Error {
  constructor(message: string, readonly issues: string[] = []) {
    super(message);
    this.name = "TriageError";
  }
}

export interface TriageInfo {
  /** null when untriaged, unknown or conflicting (see issues) */
  state: TriageState | null;
  category: TriageCategory | null;
  issues: string[];
}

const isState = (s: string): s is TriageState => (TRIAGE_STATES as readonly string[]).includes(s);
const isCategory = (s: string): s is TriageCategory => (TRIAGE_CATEGORIES as readonly string[]).includes(s);

function readOne<T extends string>(
  values: string[],
  valid: (s: string) => s is T,
  what: string,
  issues: string[],
): T | null {
  if (values.length === 0) return null;
  if (values.length > 1) {
    issues.push(`conflicting ${what} lines: ${values.map((v) => JSON.stringify(v)).join(", ")}`);
    return null;
  }
  if (!valid(values[0]!)) {
    issues.push(`unknown ${what}: ${JSON.stringify(values[0])}`);
    return null;
  }
  return values[0]!;
}

/** Read the triage state and category from a task's notes. */
export function getTriage(task: Pick<Task, "notes">): TriageInfo {
  const issues: string[] = [];
  const state = readOne(parseAllTriageRoles(task.notes), isState, "triage state", issues);
  const category = readOne(parseAllTriageCategories(task.notes), isCategory, "category", issues);
  return { state, category, issues };
}

const NEXT: Record<TriageState, readonly TriageState[]> = {
  "needs-triage": ["needs-info", "ready-for-agent", "ready-for-human", "wontfix"],
  "needs-info": ["needs-triage"],
  "ready-for-agent": ["needs-triage", "ready-for-human", "wontfix"],
  "ready-for-human": ["needs-triage", "ready-for-agent", "wontfix"],
  wontfix: [],
};

/**
 * Whether the normal machine allows from -> to. `from` null is an untriaged
 * item. wontfix is terminal unless `reopen` (then only back to needs-triage).
 */
export function canTransition(from: TriageState | null, to: TriageState, opts: { reopen?: boolean } = {}): boolean {
  if (from === null) return to === "needs-triage";
  if (from === "wontfix") return !!opts.reopen && to === "needs-triage";
  return NEXT[from].includes(to);
}

export interface TransitionOptions {
  category?: TriageCategory;
  comment?: string;
  author?: string;
  /** Allow wontfix -> needs-triage */
  reopen?: boolean;
  /** Maintainer override: skip the transition table (never the validity checks) */
  force?: boolean;
  /** Do not schedule an auto-sync push (the caller is the sync itself) */
  skipSync?: boolean;
}

export interface TransitionResult {
  id: string;
  from: TriageState | null;
  to: TriageState;
  category: TriageCategory | null;
  comment: Comment;
}

/**
 * Move a task to a new triage state: validates, rewrites the triage/category
 * note lines (other notes untouched), adds a system comment and schedules an
 * auto-sync push. wontfix also cancels the task; reopening restores backlog.
 * Throws TriageError and writes nothing on any violation.
 */
export function transition(
  projectRoot: string,
  taskId: string,
  to: TriageState,
  opts: TransitionOptions = {},
): TransitionResult {
  if (!isState(to)) throw new TriageError(`unknown triage state: ${JSON.stringify(to)}`);
  if (opts.category !== undefined && !isCategory(opts.category)) {
    throw new TriageError(`unknown category: ${JSON.stringify(opts.category)}`);
  }
  const config = loadConfig(projectRoot);
  const data = loadFeatures(projectRoot, config);
  const task = findFeatureById(data, taskId);
  if (!task) throw new TriageError(`task not found: ${taskId}`);

  const current = getTriage(task);
  if (current.issues.length > 0) {
    throw new TriageError(`task ${taskId} has invalid triage notes: ${current.issues.join("; ")}`, current.issues);
  }
  const from = current.state;
  if (!opts.force && !canTransition(from, to, { reopen: opts.reopen })) {
    throw new TriageError(
      `cannot move ${taskId} from ${from ?? "untriaged"} to ${to}` +
        (from === "wontfix" ? " (wontfix is terminal; reopen explicitly)" : ""),
    );
  }
  const category = opts.category ?? current.category;
  if (to !== "needs-triage" && !category) {
    throw new TriageError(`task ${taskId} needs a category (${TRIAGE_CATEGORIES.join("|")}) to move to ${to}`);
  }

  let notes = applyTriageRole(task.notes, to);
  if (category) notes = applyTriageCategory(notes, category);
  task.notes = notes;
  if (to === "wontfix") task.status = "cancelled";
  else if (from === "wontfix" && task.status === "cancelled") task.status = "backlog";
  saveFeatures(projectRoot, config, data);

  const lines = [`${TRIAGE_COMMENT_PREFIX}${from ?? "untriaged"} -> ${to}${category ? ` (${category})` : ""}`];
  if (opts.comment?.trim()) lines.push("", opts.comment.trim());
  const comment = addComment(projectRoot, { kind: "task", id: taskId }, {
    body: lines.join("\n"),
    author: opts.author,
    role: "system",
  });
  if (!opts.skipSync) maybeSyncItem(projectRoot, { kind: "task", id: taskId });
  return { id: taskId, from, to, category: category ?? null, comment };
}

export interface TriageEntry {
  task: Task;
  state: TriageState;
  category: TriageCategory | null;
  /** Timestamp of the last triage transition, null when none is recorded */
  since: string | null;
  /** Non-system comments newer than `since` */
  newComments: Comment[];
}

export interface TriageQueue {
  needsTriage: TriageEntry[];
  needsInfoWithNewComments: TriageEntry[];
  readyForAgent: TriageEntry[];
  readyForHuman: TriageEntry[];
  /** Tasks whose triage notes are unknown or conflicting; reported, not fixed */
  problems: { id: string; issues: string[] }[];
}

function lastTransitionAt(comments: Comment[]): string | null {
  let at: string | null = null;
  for (const c of comments) {
    if (c.role === "system" && c.body.startsWith(TRIAGE_COMMENT_PREFIX) && (!at || c.created_at > at)) at = c.created_at;
  }
  return at;
}

/** Open triaged tasks grouped into buckets, each oldest first (by last transition, then id). */
export function listTriageQueue(projectRoot: string): TriageQueue {
  const config = loadConfig(projectRoot);
  const data = loadFeatures(projectRoot, config);
  const q: TriageQueue = { needsTriage: [], needsInfoWithNewComments: [], readyForAgent: [], readyForHuman: [], problems: [] };
  for (const task of data.tasks) {
    const info = getTriage(task);
    if (info.issues.length > 0) {
      q.problems.push({ id: task.id, issues: info.issues });
      continue;
    }
    if (!info.state || isFinishedTask(task)) continue;
    const comments = listComments(projectRoot, { kind: "task", id: task.id });
    const since = lastTransitionAt(comments);
    const entry: TriageEntry = {
      task,
      state: info.state,
      category: info.category,
      since,
      newComments: comments.filter((c) => c.role !== "system" && (!since || c.created_at > since)),
    };
    if (info.state === "needs-triage") q.needsTriage.push(entry);
    else if (info.state === "ready-for-agent") q.readyForAgent.push(entry);
    else if (info.state === "ready-for-human") q.readyForHuman.push(entry);
    else if (info.state === "needs-info" && entry.newComments.length > 0) q.needsInfoWithNewComments.push(entry);
  }
  const byAge = (a: TriageEntry, b: TriageEntry) =>
    (a.since ?? "") < (b.since ?? "") ? -1 : (a.since ?? "") > (b.since ?? "") ? 1 : a.task.id < b.task.id ? -1 : 1;
  for (const k of ["needsTriage", "needsInfoWithNewComments", "readyForAgent", "readyForHuman"] as const) q[k].sort(byAge);
  return q;
}
