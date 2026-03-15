/**
 * init.ts — Citty command definition for `woco init`.
 *
 * Wraps the existing cmdInit() with citty's defineCommand() for typed args.
 * Config-independent: does not require project initialization.
 */

import { defineCommand } from "citty";
import { cmdInit } from "../init.js";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Interactive guided setup for .wombo-combo/config.json",
  },
  args: {
    force: {
      type: "boolean",
      description: "Overwrite existing config",
      required: false,
    },
  },
  async run({ args }) {
    await cmdInit({
      projectRoot: process.cwd(),
      force: args.force,
    });
  },
});
