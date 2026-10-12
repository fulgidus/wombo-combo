/**
 * retro.ts — Citty command definition for `woco retro`.
 *
 *   woco retro [--task <id>] [--quest <id>] [--since <Nd>] [--save] [-o json|toon]
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { isProjectInitialized, WOMBO_DIR } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { t } from "../../lib/i18n";
import { cmdRetro } from "../retro";

export const retroCommand = defineCommand({
  meta: { name: "retro", description: "Suggest environment improvements from failure signals" },
  args: {
    task: { type: "string", description: "Only signals of this task ID", required: false },
    quest: { type: "string", description: "Only signals of this quest ID", required: false },
    since: { type: "string", description: "Only signals from the last N days (e.g. 7d)", required: false },
    save: { type: "boolean", description: "Write the report to .wombo-combo/retros/<date>-<scope>.md", required: false },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },
  },
  run({ args }) {
    const projectRoot = resolve(process.cwd());
    if (!isProjectInitialized(projectRoot)) {
      console.error(t("cli.common.notInitialized", { dir: WOMBO_DIR }));
      process.exit(1);
    }
    cmdRetro({
      projectRoot,
      outputFmt: resolveOutputFormat(args.output),
      task: args.task,
      quest: args.quest,
      since: args.since,
      save: args.save,
    });
  },
});
