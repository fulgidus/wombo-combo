/**
 * cleanup.ts — Citty command definition for `woco cleanup`.
 *
 * Wraps the existing cmdCleanup() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config.js";
import { resolveOutputFormat } from "../../lib/output.js";
import { cmdCleanup } from "../cleanup.js";

export const cleanupCommand = defineCommand({
  meta: {
    name: "cleanup",
    description: "Remove all wave-related resources (sessions, worktrees, state)",
  },
  args: {
    dryRun: {
      type: "boolean",
      description: "Show what would be cleaned up without doing it",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text, json, or toon",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = process.cwd();
    if (!isProjectInitialized(projectRoot)) {
      console.error("Project not initialized. Run 'woco init' first.");
      process.exit(1);
    }
    const config = loadConfig(projectRoot);
    validateConfig(config);

    await cmdCleanup({
      projectRoot,
      config,
      dryRun: args.dryRun,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
