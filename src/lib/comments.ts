/**
 * comments.ts — Git-tracked comments on tasks and quests.
 *
 * One YAML file per comment at
 *   .wombo-combo/comments/<task|quest>/<ref-id>/<timestamp>-<author-slug>-<rand4>.yml
 * so concurrent teammates never conflict and git history is the audit trail.
 * The comment id is the filename stem. Timestamps in filenames are ISO-8601
 * with ":" replaced by "-" so names sort chronologically and stay portable.
 * Comments of archived or deleted refs are kept. No network access.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { userInfo } from "node:os";
import { join } from "node:path";
import YAML from "yaml";
import { WOMBO_DIR, loadConfig } from "../config";
import { findFeatureById, loadFeatures } from "./tasks";
import { loadArchivedQuest, loadQuest } from "./quest-store";

export const COMMENTS_DIR = "comments";
/** Maximum comment body length in characters */
export const MAX_COMMENT_CHARS = 20_000;

export type CommentRole = "agent" | "human" | "system";
const ROLES: readonly CommentRole[] = ["agent", "human", "system"];

export type CommentRef = { kind: "task" | "quest"; id: string };

export interface Comment {
  id: string;
  ref_kind: "task" | "quest";
  ref_id: string;
  author: string;
  role: "agent" | "human" | "system";
  created_at: string;
  body: string;
  reply_to?: string;
  github_url?: string;
}

export interface AddCommentInput {
  body: string;
  author?: string;
  role?: CommentRole;
  reply_to?: string;
  github_url?: string;
}

export interface ListCommentsOptions {
  /** Only comments created strictly after this ISO timestamp */
  since?: string;
  /** Keep only the newest n comments (still returned oldest first) */
  limit?: number;
  author?: string;
}

function assertSafeId(id: string, what: string): void {
  if (!id || !/^[A-Za-z0-9._-]+$/.test(id) || id.startsWith(".")) {
    throw new Error(`invalid ${what}: ${JSON.stringify(id)}`);
  }
}

/** Parse "<task-id>" or "quest:<quest-id>" into a CommentRef. Throws on invalid input. */
export function parseRef(s: string): CommentRef {
  const raw = (s ?? "").trim();
  if (raw.startsWith("quest:")) {
    const id = raw.slice("quest:".length);
    assertSafeId(id, "quest id");
    return { kind: "quest", id };
  }
  assertSafeId(raw, "task id");
  return { kind: "task", id: raw };
}

export function commentsDir(projectRoot: string): string {
  return join(projectRoot, WOMBO_DIR, COMMENTS_DIR);
}

function refDir(projectRoot: string, ref: CommentRef): string {
  if (ref.kind !== "task" && ref.kind !== "quest") throw new Error(`invalid ref kind: ${ref.kind}`);
  assertSafeId(ref.id, `${ref.kind} id`);
  return join(commentsDir(projectRoot), ref.kind, ref.id);
}

/** Comment author: WOMBO_AUTHOR env > git config user.email > OS user name. */
export function resolveAuthor(projectRoot: string): string {
  const env = process.env.WOMBO_AUTHOR;
  if (env && env.trim()) return env.trim();
  try {
    const res = spawnSync("git", ["config", "user.email"], { cwd: projectRoot, encoding: "utf-8" });
    const email = res.status === 0 ? res.stdout.trim() : "";
    if (email) return email;
  } catch {
    // fall through
  }
  try {
    return userInfo().username;
  } catch {
    return "unknown";
  }
}

function slugify(author: string): string {
  const s = author.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  return s.replace(/-+$/, "") || "anon";
}

/** Whether the task (active or archived) or quest (active or archived) exists. */
export function refExists(projectRoot: string, ref: CommentRef): boolean {
  if (ref.kind === "quest") {
    return loadQuest(projectRoot, ref.id) !== null || loadArchivedQuest(projectRoot, ref.id) !== null;
  }
  try {
    const data = loadFeatures(projectRoot, loadConfig(projectRoot));
    return findFeatureById(data, ref.id) !== undefined;
  } catch {
    return false;
  }
}

function compareComments(a: Comment, b: Comment): number {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function readCommentFile(path: string, id: string, kind: "task" | "quest", refId: string): Comment | null {
  try {
    const p = YAML.parse(readFileSync(path, "utf-8"));
    if (!p || typeof p !== "object") return null;
    if (typeof p.body !== "string" || typeof p.created_at !== "string") return null;
    const c: Comment = {
      id,
      ref_kind: kind,
      ref_id: refId,
      author: String(p.author ?? ""),
      role: ROLES.includes(p.role) ? p.role : "agent",
      created_at: p.created_at,
      body: p.body,
    };
    if (typeof p.reply_to === "string" && p.reply_to) c.reply_to = p.reply_to;
    if (typeof p.github_url === "string" && p.github_url) c.github_url = p.github_url;
    return c;
  } catch {
    return null;
  }
}

/** Add a comment to a task or quest. Throws on a missing ref, empty/oversized body or bad input. */
export function addComment(projectRoot: string, ref: CommentRef, input: AddCommentInput): Comment {
  const dir = refDir(projectRoot, ref);
  const body = input.body;
  if (typeof body !== "string" || body.trim() === "") throw new Error("comment body is empty");
  if (body.length > MAX_COMMENT_CHARS) {
    throw new Error(`comment body too long: ${body.length} > ${MAX_COMMENT_CHARS} characters`);
  }
  const role = input.role ?? "agent";
  if (!ROLES.includes(role)) throw new Error(`invalid role: ${JSON.stringify(role)}`);
  if (!refExists(projectRoot, ref)) {
    throw new Error(`${ref.kind} not found: ${ref.id}`);
  }
  if (input.reply_to) {
    const parent = getComment(projectRoot, input.reply_to);
    if (!parent || parent.ref_kind !== ref.kind || parent.ref_id !== ref.id) {
      throw new Error(`reply_to comment not found on ${ref.kind} ${ref.id}: ${input.reply_to}`);
    }
  }
  const author = input.author && input.author.trim() ? input.author.trim() : resolveAuthor(projectRoot);
  const createdAt = new Date().toISOString();
  mkdirSync(dir, { recursive: true });

  let id = "";
  let path = "";
  for (let i = 0; i < 20; i++) {
    const rand = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
    id = `${createdAt.replace(/:/g, "-")}-${slugify(author)}-${rand}`;
    path = join(dir, `${id}.yml`);
    if (!existsSync(path)) break;
  }

  const comment: Comment = {
    id,
    ref_kind: ref.kind,
    ref_id: ref.id,
    author,
    role,
    created_at: createdAt,
    body,
  };
  if (input.reply_to) comment.reply_to = input.reply_to;
  if (input.github_url) comment.github_url = input.github_url;

  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, YAML.stringify(comment));
  renameSync(tmp, path);
  return comment;
}

/**
 * List comments of a ref, oldest first. Works for archived or deleted refs.
 * `limit` keeps the NEWEST n comments, still returned oldest first.
 */
export function listComments(
  projectRoot: string,
  ref: CommentRef,
  opts: ListCommentsOptions = {},
): Comment[] {
  const dir = refDir(projectRoot, ref);
  if (!existsSync(dir)) return [];
  let out: Comment[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".yml")) continue;
    const c = readCommentFile(join(dir, file), file.slice(0, -4), ref.kind, ref.id);
    if (c) out.push(c);
  }
  out.sort(compareComments);
  if (opts.since) {
    const since = Date.parse(opts.since);
    if (Number.isNaN(since)) throw new Error(`invalid since timestamp: ${JSON.stringify(opts.since)}`);
    out = out.filter((c) => Date.parse(c.created_at) > since);
  }
  if (opts.author) out = out.filter((c) => c.author === opts.author);
  if (opts.limit !== undefined && opts.limit >= 0 && out.length > opts.limit) {
    out = opts.limit === 0 ? [] : out.slice(-opts.limit);
  }
  return out;
}

/** Find a comment by id (filename stem) across all refs; null when absent. */
export function getComment(projectRoot: string, id: string): Comment | null {
  if (!id || !/^[A-Za-z0-9._-]+$/.test(id) || id.startsWith(".")) return null;
  for (const kind of ["task", "quest"] as const) {
    const kindDir = join(commentsDir(projectRoot), kind);
    if (!existsSync(kindDir)) continue;
    for (const refId of readdirSync(kindDir).sort()) {
      const path = join(kindDir, refId, `${id}.yml`);
      if (existsSync(path)) {
        const c = readCommentFile(path, id, kind, refId);
        if (c) return c;
      }
    }
  }
  return null;
}

/** The newest n comments of a ref, oldest first. */
export function recentComments(projectRoot: string, ref: CommentRef, n: number): Comment[] {
  return listComments(projectRoot, ref, { limit: n });
}
