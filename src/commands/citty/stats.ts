/**
 * stats.ts — Citty command definition for `woco stats`.
 *
 * Wraps cmdStats() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { cmdStats } from "../stats";

export const statsCommand = defineCommand({
  meta: {
    name: "stats",
    description: "Show task statistics (success rate, retries, conflicts, build pass rate)",
  },
  args: {
    trend: {
      type: "boolean",
      description: "Show trend over time (daily aggregates)",
      required: false,
    },
    "by-model": {
      type: "boolean",
      description: "Breakdown by model",
      required: false,
    },
    since: {
      type: "string",
      description: "Start of date range filter (ISO 8601)",
      required: false,
    },
    until: {
      type: "string",
      description: "End of date range filter (ISO 8601)",
      required: false,
    },
    format: {
      type: "string",
      description: "Output format: table (default) or json",
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

    const statsFormat = args.format === "json" ? "json" : "table";

    await cmdStats({
      projectRoot,
      config,
      trend: args.trend,
      byModel: args["by-model"],
      since: args.since,
      until: args.until,
      format: statsFormat,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});