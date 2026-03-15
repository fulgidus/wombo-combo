/**
 * abort.ts — Citty command definition for `woco abort`.
 *
 * Wraps the existing cmdAbort() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { cmdAbort } from "../abort";

export const abortCommand = defineCommand({
  meta: {
    name: "abort",
    description: "Kill a single running agent without nuking the entire wave",
  },
  args: {
    featureId: {
      type: "positional",
      description: "Feature ID of the agent to abort",
      required: true,
    },
    requeue: {
      type: "boolean",
      description: "Return the feature to queued instead of marking it failed",
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

    await cmdAbort({
      projectRoot,
      config,
      featureId: args.featureId,
      requeue: args.requeue,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
