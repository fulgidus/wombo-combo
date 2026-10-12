/**
 * usage.ts — Citty command definition for `woco usage`.
 *
 * Wraps the existing cmdUsage() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 *
 * Default mode shows token usage (legacy behavior). `--analytics` switches to
 * per-execution agent analytics; --task/--quest/--wave only apply there.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { cmdUsage, validateUsageOptions, type UsageGroupBy } from "../usage";
import type { AnalyticsGroupBy } from "../../lib/analytics-summary";
import { t } from "../../lib/i18n";

export const usageCommand = defineCommand({
  meta: {
    name: "usage",
    description: "Show token usage statistics",
  },
  args: {
    by: {
      type: "string",
      description:
        "Group by: task, model, provider, quest, or harness (with --analytics: task, quest, wave, agent, or model)",
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
    analytics: {
      type: "boolean",
      description: "Show per-execution agent analytics (duration, retries, builds, lines) instead of token usage",
      required: false,
    },
    task: {
      type: "string",
      description: "Only executions of this task ID (requires --analytics)",
      required: false,
    },
    quest: {
      type: "string",
      description: "Only executions recorded under this quest ID (requires --analytics)",
      required: false,
    },
    wave: {
      type: "string",
      description: "Only executions from this wave/session ID (requires --analytics)",
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
      console.error(t("cli.common.notInitializedShort"));
      process.exit(1);
    }
    const config = loadConfig(projectRoot);
    validateConfig(config);

    // Validate option combinations separately for each mode
    const invalid = validateUsageOptions({
      by: args.by,
      analytics: args.analytics,
      task: args.task,
      quest: args.quest,
      wave: args.wave,
    });
    if (invalid) {
      console.error(invalid);
      process.exit(1);
    }

    // Validate --format value
    const usageFormat = (args.format === "json" ? "json" : "table") as "table" | "json";

    await cmdUsage({
      projectRoot,
      config,
      by: args.by as UsageGroupBy | AnalyticsGroupBy | undefined,
      analytics: args.analytics === true,
      task: args.task,
      quest: args.quest,
      wave: args.wave,
      since: args.since,
      until: args.until,
      usageFormat,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
