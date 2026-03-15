/**
 * upgrade.ts — Citty command definition for `woco upgrade`.
 *
 * Wraps the existing cmdUpgrade() with citty's defineCommand() for typed args.
 * Config-independent: does not require project initialization.
 */

import { defineCommand } from "citty";
import { cmdUpgrade } from "../upgrade";

export const upgradeCommand = defineCommand({
  meta: {
    name: "upgrade",
    description: "Self-upgrade wombo-combo to the latest version",
  },
  args: {
    force: {
      type: "boolean",
      description: "Skip confirmation prompt",
      required: false,
    },
    tag: {
      type: "string",
      description: "Install a specific version tag (e.g. v0.1.0)",
      required: false,
    },
    check: {
      type: "boolean",
      description: "Only check for updates, don't install",
      required: false,
    },
  },
  async run({ args }) {
    await cmdUpgrade({
      force: !!args.force,
      tag: args.tag,
      checkOnly: !!args.check,
    });
  },
});
