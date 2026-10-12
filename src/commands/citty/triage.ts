/**
 * triage.ts — Citty command definition for `woco triage`.
 *
 * Subcommands:
 *   list                                  — Triage queue buckets
 *   show <task>                           — Task, triage state and comments
 *   set <task> <state> [--category c] [--comment text] — Transition a task
 *   brief <task>                          — Add an agent-brief comment skeleton
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { isProjectInitialized, WOMBO_DIR } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { t } from "../../lib/i18n";
import { cmdTriageBrief, cmdTriageList, cmdTriageSet, cmdTriageShow } from "../triage";

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

const taskArg = { type: "positional", description: "Task ID", required: true } as const;

const listCommand = defineCommand({
  meta: { name: "list", description: "List the triage queue by bucket" },
  args: { output: outputArg },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    cmdTriageList({ projectRoot, outputFmt: resolveOutputFormat(args.output) });
  },
});

const showCommand = defineCommand({
  meta: { name: "show", description: "Show a task, its triage state and comments" },
  args: { task: taskArg, output: outputArg },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    cmdTriageShow({ projectRoot, outputFmt: resolveOutputFormat(args.output), taskId: args.task });
  },
});

const setCommand = defineCommand({
  meta: { name: "set", description: "Move a task to a triage state" },
  args: {
    task: taskArg,
    state: { type: "positional", description: "Target state", required: true },
    category: { type: "string", description: "Category: bug or enhancement", required: false },
    comment: { type: "string", description: "Comment recorded with the transition", required: false },
    author: { type: "string", description: "Author (default: WOMBO_AUTHOR, git user.email, OS user)", required: false },
    reopen: { type: "boolean", description: "Allow wontfix -> needs-triage", required: false },
    force: { type: "boolean", description: "Skip the transition table (maintainer override)", required: false },
    output: outputArg,
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    cmdTriageSet({
      projectRoot,
      outputFmt: resolveOutputFormat(args.output),
      taskId: args.task,
      state: args.state,
      category: args.category,
      comment: args.comment,
      author: args.author,
      reopen: args.reopen,
      force: args.force,
    });
  },
});

const briefCommand = defineCommand({
  meta: { name: "brief", description: "Add an agent-brief comment skeleton to a task" },
  args: {
    task: taskArg,
    author: { type: "string", description: "Author (default: WOMBO_AUTHOR, git user.email, OS user)", required: false },
    output: outputArg,
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    cmdTriageBrief({ projectRoot, outputFmt: resolveOutputFormat(args.output), taskId: args.task, author: args.author });
  },
});

/** Triage parent command. The router injects the default "list" subcommand. */
export const triageCommand = defineCommand({
  meta: { name: "triage", description: "Triage tasks: list, show, set, brief" },
  subCommands: { list: listCommand, show: showCommand, set: setCommand, brief: briefCommand },
});
