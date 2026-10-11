/**
 * sync.ts — Citty command definition for `woco sync`.
 *
 * Subcommands:
 *   push    — Create/update GitHub issues for tasks and quests, mirror comments
 *   pull    — Import GitHub issue changes and comments into woco
 *   run     — One cycle: pull, then push
 *   watch   — Repeat the cycle on an interval until stopped
 *   status  — Compare local and GitHub state without writing
 *   labels  — Ensure the woco label catalog exists on GitHub
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { isProjectInitialized, WOMBO_DIR } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { t } from "../../lib/i18n";
import { cmdSyncLabels, cmdSyncPull, cmdSyncPush, cmdSyncRun, cmdSyncStatus, cmdSyncWatch } from "../sync";

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

const pullCommand = defineCommand({
  meta: { name: "pull", description: "Pull GitHub issue changes and comments into tasks" },
  args: {
    dryRun: { type: "boolean", description: "Show what would change without writing anything", required: false },
    output: outputArg,
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    await cmdSyncPull({ projectRoot, outputFmt: resolveOutputFormat(args.output), dryRun: args.dryRun });
  },
});

const runCommand = defineCommand({
  meta: { name: "run", description: "Run one sync cycle: pull from GitHub, then push" },
  args: {
    dryRun: { type: "boolean", description: "Show what would change without writing anything", required: false },
    output: outputArg,
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    await cmdSyncRun({ projectRoot, outputFmt: resolveOutputFormat(args.output), dryRun: args.dryRun });
  },
});

const watchCommand = defineCommand({
  meta: { name: "watch", description: "Keep syncing with GitHub on an interval until stopped" },
  args: {
    once: { type: "boolean", description: "Run a single cycle and exit", required: false },
    interval: { type: "string", description: "Seconds between cycles (default: sync.github.intervalSeconds, minimum 15)", required: false },
    output: outputArg,
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    const interval = args.interval !== undefined ? Number(args.interval) : undefined;
    await cmdSyncWatch({
      projectRoot,
      outputFmt: resolveOutputFormat(args.output),
      once: args.once,
      intervalSeconds: interval !== undefined && Number.isFinite(interval) ? interval : undefined,
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
  meta: { name: "sync", description: "Sync tasks and quests with GitHub issues: push, pull, run, watch, status, labels" },
  subCommands: {
    push: pushCommand,
    pull: pullCommand,
    run: runCommand,
    watch: watchCommand,
    status: statusCommand,
    labels: labelsCommand,
  },
});
