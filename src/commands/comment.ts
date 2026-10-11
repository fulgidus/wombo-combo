/**
 * comment.ts — Comments on tasks and quests.
 *
 *   woco comment add <ref> <text...> [--role agent|human|system] [--author x] [--reply-to id] [--stdin]
 *   woco comment list <ref> [--since ts] [--limit n] [--author x]
 *   woco comment show <comment-id>
 *
 * <ref> is a task id or quest:<quest-id>. Stored one file per comment under
 * .wombo-combo/comments/ (see lib/comments.ts).
 */

import {
  addComment,
  getComment,
  listComments,
  parseRef,
  recentComments,
  type Comment,
  type CommentRef,
} from "../lib/comments";
import { msg, t } from "../lib/i18n";
import { renderGeneric } from "../lib/toon";
import { output, outputError, outputMessage, type OutputFormat } from "../lib/output";

/** How many comments `tasks show` / `quest show` print in text mode */
export const SHOWN_COMMENTS = 5;

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

export interface CommentOptions {
  projectRoot: string;
  outputFmt?: OutputFormat;
  ref?: string;
  text?: string;
  id?: string;
  role?: string;
  author?: string;
  replyTo?: string;
  since?: string;
  limit?: string | number;
}

function fmtWhen(iso: string): string {
  return iso.replace("T", " ").slice(0, 19);
}

function refLabel(ref: CommentRef): string {
  return ref.kind === "quest" ? `quest:${ref.id}` : ref.id;
}

function printComment(c: Comment, indent: string): void {
  console.log(
    `${indent}${BOLD}${t("cli.comment.entry", { when: fmtWhen(c.created_at), author: c.author, role: c.role })}${RESET} ${DIM}${c.id}${RESET}`,
  );
  if (c.reply_to) console.log(`${indent}  ${DIM}${t("cli.comment.replyTo", { id: c.reply_to })}${RESET}`);
  if (c.github_url) console.log(`${indent}  ${DIM}${c.github_url}${RESET}`);
  for (const line of c.body.split("\n")) console.log(`${indent}  ${line}`);
}

/** Recent comments of a ref for text-mode `show` views. Prints nothing when there are none. */
export function printRecentComments(projectRoot: string, ref: CommentRef): void {
  const recent = recentComments(projectRoot, ref, SHOWN_COMMENTS);
  if (recent.length === 0) return;
  const total = listComments(projectRoot, ref).length;
  console.log(`\n  ${BOLD}${t("cli.comment.recentHeading", { shown: recent.length, total })}${RESET}`);
  for (const c of recent) printComment(c, "    ");
}

/** All comments of a ref (for json output of `show` views); empty when none. */
export function commentsForShow(projectRoot: string, ref: CommentRef): Comment[] {
  try {
    return listComments(projectRoot, ref);
  } catch {
    return [];
  }
}

function parseRefOrFail(fmt: OutputFormat, ref: string | undefined): CommentRef {
  if (!ref) return outputError(fmt, msg("cli.comment.missingRef"));
  try {
    return parseRef(ref);
  } catch {
    return outputError(fmt, msg("cli.comment.invalidRef", { ref }));
  }
}

export async function cmdCommentAdd(opts: CommentOptions & { stdin?: boolean }): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  const ref = parseRefOrFail(fmt, opts.ref);
  let body = opts.text ?? "";
  if (opts.stdin) body = await Bun.stdin.text();
  if (!body.trim()) return outputError(fmt, msg("cli.comment.add.missingText"));
  const role = opts.role;
  if (role !== undefined && role !== "agent" && role !== "human" && role !== "system") {
    return outputError(fmt, msg("cli.comment.add.invalidRole", { role }));
  }
  let comment: Comment;
  try {
    comment = addComment(opts.projectRoot, ref, {
      body: opts.stdin ? body.replace(/\n+$/, "") : body,
      author: opts.author || undefined,
      role: role as Comment["role"] | undefined,
      reply_to: opts.replyTo || undefined,
    });
  } catch (err) {
    return outputError(fmt, msg("cli.comment.add.failed", { error: err instanceof Error ? err.message : String(err) }));
  }
  outputMessage(fmt, msg("cli.comment.add.done", { id: comment.id, ref: refLabel(ref) }), { comment });
}

export function cmdCommentList(opts: CommentOptions): void {
  const fmt = opts.outputFmt ?? "text";
  const ref = parseRefOrFail(fmt, opts.ref);
  let limit: number | undefined;
  if (opts.limit !== undefined && opts.limit !== "") {
    limit = Number(opts.limit);
    if (!Number.isInteger(limit) || limit < 0) {
      return outputError(fmt, msg("cli.comment.list.invalidLimit", { limit: String(opts.limit) }));
    }
  }
  let comments: Comment[];
  try {
    comments = listComments(opts.projectRoot, ref, { since: opts.since || undefined, limit, author: opts.author || undefined });
  } catch (err) {
    return outputError(fmt, msg("cli.comment.list.failed", { error: err instanceof Error ? err.message : String(err) }));
  }
  output(fmt, { ref: refLabel(ref), comments }, () => {
    if (comments.length === 0) {
      console.log(t("cli.comment.list.none", { ref: refLabel(ref) }));
      return;
    }
    for (const c of comments) printComment(c, "");
  }, () => {
    if (comments.length > 0) console.log(renderGeneric(comments));
  });
}

export function cmdCommentShow(opts: CommentOptions): void {
  const fmt = opts.outputFmt ?? "text";
  if (!opts.id) return outputError(fmt, msg("cli.comment.show.usage"));
  const comment = getComment(opts.projectRoot, opts.id);
  if (!comment) return outputError(fmt, msg("cli.comment.notFound", { id: opts.id }));
  output(fmt, comment, () => {
    console.log(`${BOLD}${comment.id}${RESET}`);
    console.log(t("cli.comment.show.ref", { ref: refLabel({ kind: comment.ref_kind, id: comment.ref_id }) }));
    console.log(t("cli.comment.show.author", { author: comment.author, role: comment.role }));
    console.log(t("cli.comment.show.created", { when: comment.created_at }));
    if (comment.reply_to) console.log(t("cli.comment.show.replyTo", { id: comment.reply_to }));
    if (comment.github_url) console.log(t("cli.comment.show.github", { url: comment.github_url }));
    console.log("");
    console.log(comment.body);
  });
}
