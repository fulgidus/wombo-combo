/**
 * merge.ts — Citty command definition for `woco merge`.
 *
 * Wraps the existing cmdMerge() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config.js";
import { resolveOutputFormat } from "../../lib/output.js";
import { cmdMerge } from "../merge.js";

export const mergeCommand = defineCommand({
  meta: {
    name: "merge",
    description: "Merge verified branches into the base branch",
  },
  args: {
    featureId: {
      type: "positional",
      description: "Feature ID to merge (optional — merges all verified if omitted)",
      required: false,
    },
    autoPush: {
      type: "boolean",
      description: "Push base branch to remote after merge",
      required: false,
    },
    dryRun: {
      type: "boolean",
      description: "Show what would be merged without merging",
      required: false,
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model to use for conflict resolution",
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

    await cmdMerge({
      projectRoot,
      config,
      featureId: args.featureId,
      autoPush: args.autoPush,
      dryRun: args.dryRun,
      model: args.model,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
