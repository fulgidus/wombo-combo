/**
 * usage.ts — Citty command definition for `woco usage`.
 *
 * Wraps the existing cmdUsage() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config.js";
import { resolveOutputFormat } from "../../lib/output.js";
import { cmdUsage, type UsageGroupBy, VALID_USAGE_GROUP_BY } from "../usage.js";

export const usageCommand = defineCommand({
  meta: {
    name: "usage",
    description: "Show token usage statistics",
  },
  args: {
    by: {
      type: "string",
      description: "Group by: task, model, provider, quest, or harness",
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
      description: "Usage output format: table (default) or json",
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

    // Validate --by value
    const by = args.by as UsageGroupBy | undefined;
    if (by && !VALID_USAGE_GROUP_BY.includes(by)) {
      console.error(`Invalid --by value: "${by}". Valid values: ${VALID_USAGE_GROUP_BY.join(", ")}`);
      process.exit(1);
    }

    // Validate --format value
    const usageFormat = (args.format === "json" ? "json" : "table") as "table" | "json";

    await cmdUsage({
      projectRoot,
      config,
      by,
      since: args.since,
      until: args.until,
      usageFormat,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
