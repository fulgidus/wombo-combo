/**
 * team.ts — Citty command definition for `woco team`.
 *
 * Subcommands:
 *   claim <task-id> [--force]   — Claim a task (git-tracked claim file)
 *   release <task-id>           — Release a claim
 *   status                      — Who owns what, expired claims, unclaimed tasks
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { loadConfig, validateConfig, isProjectInitialized, WOMBO_DIR } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { t } from "../../lib/i18n";
import { teamMergeCommands } from "./team-merge";
import { cmdTeamClaim, cmdTeamRelease, cmdTeamStatus } from "../team";

function loadProjectConfig(projectRoot: string) {
  if (!isProjectInitialized(projectRoot)) {
    console.error(t("cli.common.notInitialized", { dir: WOMBO_DIR }));
    process.exit(1);
  }
  const config = loadConfig(projectRoot);
  validateConfig(config);
  return config;
}

const outputArg = {
  type: "string",
  alias: "o",
  description: "Output format: text (default), json, or toon",
  required: false,
} as const;

const claimCommand = defineCommand({
  meta: { name: "claim", description: "Claim a task for yourself" },
  args: {
    taskId: { type: "positional", description: "Task ID to claim", required: true },
    force: { type: "boolean", description: "Take over a claim held by someone else", required: false },
    output: outputArg,
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    cmdTeamClaim({
      projectRoot,
      config: loadProjectConfig(projectRoot),
      taskId: args.taskId,
      force: args.force,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});

const releaseCommand = defineCommand({
  meta: { name: "release", description: "Release a task claim" },
  args: {
    taskId: { type: "positional", description: "Task ID to release", required: true },
    force: { type: "boolean", description: "Release a claim held by someone else", required: false },
    output: outputArg,
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    cmdTeamRelease({
      projectRoot,
      config: loadProjectConfig(projectRoot),
      taskId: args.taskId,
      force: args.force,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});

const statusCommand = defineCommand({
  meta: { name: "status", description: "Show task claims, expired claims and unclaimed tasks" },
  args: { output: outputArg },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    cmdTeamStatus({
      projectRoot,
      config: loadProjectConfig(projectRoot),
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});

/**
 * Team parent command. No run() handler: the router injects the default
 * "status" subcommand when none is given.
 */
export const teamCommand = defineCommand({
  meta: { name: "team", description: "Multi-developer task claims: claim, release, status" },
  subCommands: {
    claim: claimCommand,
    release: releaseCommand,
    status: statusCommand,
    ...teamMergeCommands,
  },
});
