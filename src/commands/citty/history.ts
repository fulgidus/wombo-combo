/**
 * history.ts — Citty command definition for `woco history`.
 *
 * Wraps the existing cmdHistory() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { cmdHistory } from "../history";

export const historyCommand = defineCommand({
  meta: {
    name: "history",
    description: "View wave history and summaries",
  },
  args: {
    waveId: {
      type: "positional",
      description: "Specific wave ID to show details for",
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

    await cmdHistory({
      projectRoot,
      config,
      waveId: args.waveId,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
