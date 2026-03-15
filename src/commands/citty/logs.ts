/**
 * logs.ts — Citty command definition for `woco logs`.
 *
 * Wraps the existing cmdLogs() with citty's defineCommand() for typed args.
 * Config-independent: does not require project initialization (just reads log files).
 */

import { defineCommand } from "citty";
import { resolveOutputFormat } from "../../lib/output";
import { cmdLogs } from "../logs";

export const logsCommand = defineCommand({
  meta: {
    name: "logs",
    description: "Pretty-print agent logs from .wombo-combo/logs/",
  },
  args: {
    featureId: {
      type: "positional",
      description: "Feature ID whose logs to display",
      required: true,
    },
    tail: {
      type: "string",
      alias: "n",
      description: "Show only the last N lines",
      required: false,
    },
    follow: {
      type: "boolean",
      alias: "f",
      description: "Stream new output as it arrives (like tail -f)",
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

    await cmdLogs({
      projectRoot,
      featureId: args.featureId,
      tail: args.tail ? parseInt(args.tail, 10) : undefined,
      follow: args.follow,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
