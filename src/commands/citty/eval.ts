/**
 * eval.ts — Citty command definition for `woco eval`.
 *
 * Wraps cmdEval() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { cmdEval } from "../eval";

export const evalCommand = defineCommand({
  meta: {
    name: "eval",
    description:
      "Score a completed session: task weighting, model routing, steering, and flow",
  },
  args: {
    waveId: {
      type: "positional",
      description: "Wave ID to score (defaults to the most recent session)",
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

    await cmdEval({
      projectRoot,
      config,
      waveId: args.waveId,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
