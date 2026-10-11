/**
 * replay.ts — Citty command definition for `woco replay`.
 *
 * Subcommands:
 *   list (ls)   — List recorded agent session replays
 *   show (view) — Show one execution's replay
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { isProjectInitialized, WOMBO_DIR } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { cmdReplayList, cmdReplayShow } from "../replay";

function ensureInitialized(projectRoot: string): void {
  if (!isProjectInitialized(projectRoot)) {
    console.error(
      `\nThis project hasn't been initialized yet.\n` +
        `Run \`woco init\` to set up ${WOMBO_DIR}/ with config, tasks, and archive stores.\n`,
    );
    process.exit(1);
  }
}

const listCommand = defineCommand({
  meta: { name: "list", description: "List recorded agent session replays (also: ls)" },
  args: {
    featureId: {
      type: "positional",
      description: "Only replays of this feature/task ID",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    cmdReplayList({
      projectRoot,
      outputFmt: resolveOutputFormat(args.output),
      featureId: args.featureId || undefined,
    });
  },
});

const showCommand = defineCommand({
  meta: { name: "show", description: "Show a recorded agent session (also: view)" },
  args: {
    featureId: {
      type: "positional",
      description: "Feature/task ID",
      required: true,
    },
    execution: {
      type: "string",
      description: "Execution: 1-based index (oldest first) or full execution ID (default: latest)",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    ensureInitialized(projectRoot);
    cmdReplayShow({
      projectRoot,
      outputFmt: resolveOutputFormat(args.output),
      featureId: args.featureId,
      execution: args.execution,
    });
  },
});

/**
 * Replay parent command. No run() handler: the router injects the default
 * "list" subcommand when none is given.
 */
export const replayCommand = defineCommand({
  meta: {
    name: "replay",
    description: "Recorded agent sessions: list and show replays (also: rp)",
  },
  subCommands: {
    list: listCommand,
    show: showCommand,
    ls: listCommand,
    view: showCommand,
  },
});
