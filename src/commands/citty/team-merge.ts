/**
 * team-merge.ts — citty commands for the wombo-combo git merge driver.
 *
 * Mount under the `team` command as:
 *   subCommands: { ...teamMergeCommands }   // -> `team setup`, `team merge-meta`
 */

import { defineCommand } from "citty";
import { mergeDriverMain, setupMergeDriver } from "../../lib/merge-driver";
import { t } from "../../lib/i18n";

export const teamSetup = defineCommand({
  meta: {
    name: "setup",
    description: "Configure the git merge driver for .wombo-combo task/meta files",
  },
  args: {
    command: {
      type: "string",
      description: "Override the merge driver command (default: woco team merge-meta %O %A %B)",
      required: false,
    },
  },
  run({ args }) {
    try {
      const res = setupMergeDriver(process.cwd(), args.command ? { command: args.command } : {});
      console.log(
        res.gitattributesChanged || res.configChanged
          ? t("cli.teamMerge.setupDone")
          : t("cli.teamMerge.setupAlready"),
      );
    } catch (e) {
      console.error(t("cli.teamMerge.setupFailed", { error: e instanceof Error ? e.message : String(e) }));
      process.exit(1);
    }
  },
});

export const teamMergeMeta = defineCommand({
  meta: {
    name: "merge-meta",
    description: "Git merge driver: merge <base> <ours> <theirs> into <ours> (exit 1 on conflict)",
  },
  args: {
    base: { type: "positional", description: "Common ancestor file (%O)", required: true },
    ours: { type: "positional", description: "Current version, result is written here (%A)", required: true },
    theirs: { type: "positional", description: "Other branch version (%B)", required: true },
  },
  run({ args }) {
    const code = mergeDriverMain([args.base, args.ours, args.theirs]);
    if (code !== 0) {
      console.error(t("cli.teamMerge.conflict", { file: args.ours }));
      process.exit(code);
    }
  },
});

export const teamMergeCommands = { setup: teamSetup, "merge-meta": teamMergeMeta };
