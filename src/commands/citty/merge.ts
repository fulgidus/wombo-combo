/**
 * merge.ts — Citty command definition for `woco merge`.
 *
 * Args/flags:
 *   --tasks <a,b>   comma-separated task IDs (default: all verified agents)
 *   --dry-run       show the plan without writing state, merging or publishing
 *   --output/-o     text (default), json, or toon
 *
 * Delegates to cmdMerge() in src/commands/merge.ts.
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { loadConfig, validateConfig, isProjectInitialized, WOMBO_DIR } from "../../config";
import { ensureTasksFile } from "../../lib/tasks";
import { resolveOutputFormat, type OutputFormat } from "../../lib/output";
import { cmdMerge, type MergeCommandOptions } from "../merge";
import { t } from "../../lib/i18n";

export interface ParsedMergeArgs {
  tasks?: string[];
  dryRun: boolean;
  outputFmt?: OutputFormat;
}

/** Split a comma-separated ID list: trimmed, non-empty, deduplicated. */
export function parseTaskList(raw: unknown): string[] | undefined {
  if (typeof raw !== "string") return undefined;
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  return ids.length > 0 ? ids : undefined;
}

/** Parse raw citty args into a typed intermediate representation (exported for tests). */
export function parseMergeArgs(args: Record<string, any>): ParsedMergeArgs {
  return {
    tasks: parseTaskList(args.tasks),
    dryRun: args.dryRun ?? false,
    outputFmt: args.output ? resolveOutputFormat(args.output) : undefined,
  };
}

export const mergeCommand = defineCommand({
  meta: {
    name: "merge",
    description: "Merge verified agents and publish a changelog entry / PR (also: m)",
  },
  args: {
    tasks: {
      type: "string",
      description: "Comma-separated task IDs to merge (default: all verified agents)",
      required: false,
    },
    dryRun: {
      type: "boolean",
      description: "Show what would be merged without merging or publishing",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },

    // --- Global ---
    dev: {
      type: "boolean",
      description: "Enable developer mode (hidden TUI features, etc.)",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    const parsed = parseMergeArgs(args);

    const config = loadConfig(projectRoot);
    validateConfig(config);
    if (args.dev) config.devMode = true;

    if (!isProjectInitialized(projectRoot)) {
      console.error(t("cli.common.notInitialized", { dir: WOMBO_DIR }));
      process.exit(1);
    }

    // A dry run must not write anything, including a missing tasks store
    if (!parsed.dryRun) await ensureTasksFile(projectRoot, config);

    const opts: MergeCommandOptions = {
      projectRoot,
      config,
      tasks: parsed.tasks,
      dryRun: parsed.dryRun,
      outputFmt: parsed.outputFmt,
    };
    await cmdMerge(opts);
  },
});
