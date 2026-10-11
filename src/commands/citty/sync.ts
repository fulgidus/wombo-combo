/**
 * sync.ts — Citty command definition for `woco sync`.
 *
 * Subcommands:
 *   push    — Create/update GitHub issues for tasks and quests, mirror comments
 *   status  — Compare local and GitHub state without writing
 *   labels  — Ensure the woco label catalog exists on GitHub
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { isProjectInitialized, WOMBO_DIR } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { t } from "../../lib/i18n";
import { cmdSyncLabels, cmdSyncPush, cmdSyncStatus } from "../sync";

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

const pushCommand = defineCommand({
  meta: { name: "push", description: "Push tasks, quests and comments to GitHub issues" },
  args: {
    dryRun: { type: "boolean", description: "Show what would change without writing anything", required: false },
    only: { type: "string", description: "Push a single item: a task ID or quest:<quest-id>", required: false },
    output: outputArg,
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    await cmdSyncPush({
      projectRoot,
      outputFmt: resolveOutputFormat(args.output),
      dryRun: args.dryRun,
      only: args.only,
    });
  },
});

const statusCommand = defineCommand({
  meta: { name: "status", description: "Compare local tasks and quests with GitHub issues (read-only)" },
  args: { output: outputArg },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    await cmdSyncStatus({ projectRoot, outputFmt: resolveOutputFormat(args.output) });
  },
});

const labelsCommand = defineCommand({
  meta: { name: "labels", description: "Ensure the woco label catalog exists on GitHub" },
  args: {
    dryRun: { type: "boolean", description: "Show which labels would be created without creating them", required: false },
    output: outputArg,
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    await cmdSyncLabels({ projectRoot, outputFmt: resolveOutputFormat(args.output), dryRun: args.dryRun });
  },
});

/** Sync parent command; a subcommand is required. */
export const syncCommand = defineCommand({
  meta: { name: "sync", description: "Sync tasks and quests with GitHub issues: push, status, labels" },
  subCommands: {
    push: pushCommand,
    status: statusCommand,
    labels: labelsCommand,
  },
});
