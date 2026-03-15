/**
 * status.ts — Citty command definition for `woco status`.
 *
 * Wraps the existing cmdStatus() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config.js";
import { resolveOutputFormat } from "../../lib/output.js";
import { cmdStatus } from "../status.js";

export const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Show the status of the current wave",
  },
  args: {
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

    await cmdStatus({
      projectRoot,
      config,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
