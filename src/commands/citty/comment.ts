/**
 * comment.ts — Citty command definition for `woco comment`.
 *
 * Subcommands:
 *   add <ref> <text...>   — Add a comment to a task or quest
 *   list <ref>            — List comments, oldest first
 *   show <comment-id>     — Show one comment
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { isProjectInitialized, WOMBO_DIR } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { t } from "../../lib/i18n";
import { cmdCommentAdd, cmdCommentList, cmdCommentShow } from "../comment";

function ensureInitialized(projectRoot: string): void {
  if (!isProjectInitialized(projectRoot)) {
    console.error(t("cli.common.notInitialized", { dir: WOMBO_DIR }));
    process.exit(1);
  }
}

const outputArg = {
  type: "string",
  alias: "o",
  description: "Output format: text (default), json, or toon",
  required: false,
} as const;

const refArg = {
  type: "positional",
  description: "Task ID or quest:<quest-id>",
  required: true,
} as const;

const addCommand = defineCommand({
  meta: { name: "add", description: "Add a comment to a task or quest" },
  args: {
    ref: refArg,
    text: { type: "positional", description: "Comment text (remaining words are joined)", required: false },
    role: { type: "string", description: "Author role: agent (default), human, or system", required: false },
    author: { type: "string", description: "Author (default: WOMBO_AUTHOR, git user.email, OS user)", required: false },
    "reply-to": { type: "string", description: "Comment ID this comment replies to", required: false },
    stdin: { type: "boolean", description: "Read the comment text from stdin", required: false },
    output: outputArg,
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    // citty's `_` holds every positional: [ref, ...text words]
    const words = (args._ as string[]).slice(1);
    await cmdCommentAdd({
      projectRoot,
      outputFmt: resolveOutputFormat(args.output),
      ref: args.ref,
      text: words.join(" "),
      role: args.role,
      author: args.author,
      replyTo: args["reply-to"],
      stdin: args.stdin,
    });
  },
});

const listCommand = defineCommand({
  meta: { name: "list", description: "List comments of a task or quest, oldest first" },
  args: {
    ref: refArg,
    since: { type: "string", description: "Only comments created after this ISO timestamp", required: false },
    limit: { type: "string", description: "Only the newest N comments", required: false },
    author: { type: "string", description: "Only comments by this author", required: false },
    output: outputArg,
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    cmdCommentList({
      projectRoot,
      outputFmt: resolveOutputFormat(args.output),
      ref: args.ref,
      since: args.since,
      limit: args.limit,
      author: args.author,
    });
  },
});

const showCommand = defineCommand({
  meta: { name: "show", description: "Show one comment" },
  args: {
    id: { type: "positional", description: "Comment ID", required: true },
    output: outputArg,
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    cmdCommentShow({ projectRoot, outputFmt: resolveOutputFormat(args.output), id: args.id });
  },
});

/** Comment parent command; a subcommand is required. */
export const commentCommand = defineCommand({
  meta: { name: "comment", description: "Comments on tasks and quests: add, list, show" },
  subCommands: {
    add: addCommand,
    list: listCommand,
    show: showCommand,
  },
});
