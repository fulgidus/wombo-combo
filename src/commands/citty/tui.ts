/**
 * tui.ts — Citty command definition for `woco tui` (default command).
 *
 * Wraps the existing cmdTui() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 *
 * The TUI is launched by default when no command is specified.
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { loadConfig, validateConfig, isProjectInitialized, WOMBO_DIR } from "../../config.js";
import { ensureTasksFile } from "../../lib/tasks.js";
import { cmdTui } from "../tui.js";

export const tuiCommand = defineCommand({
  meta: {
    name: "tui",
    description: "Launch the interactive TUI dashboard (default command)",
  },
  args: {
    maxConcurrent: {
      type: "string",
      description: "Maximum number of concurrent agents",
      required: false,
    },
    model: {
      type: "string",
      alias: "m",
      description: "AI model to use for agents",
      required: false,
    },
    baseBranch: {
      type: "string",
      description: "Base branch to create feature branches from",
      required: false,
    },
    maxRetries: {
      type: "string",
      description: "Maximum number of retries per agent",
      required: false,
    },
    autoPush: {
      type: "boolean",
      description: "Automatically push branches after merge",
      required: false,
    },
    skipTests: {
      type: "boolean",
      description: "Skip TDD tests",
      required: false,
    },
    strictTdd: {
      type: "boolean",
      description: "Strict TDD mode",
      required: false,
    },
    agent: {
      type: "string",
      description: "Agent definition override",
      required: false,
    },
    dev: {
      type: "boolean",
      description: "Enable developer mode (hidden TUI features)",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());

    if (!isProjectInitialized(projectRoot)) {
      console.error(
        `\nThis project hasn't been initialized yet.\n` +
          `Run \`woco init\` to set up ${WOMBO_DIR}/ with config, tasks, and archive stores.\n`
      );
      process.exit(1);
    }

    const config = loadConfig(projectRoot);
    validateConfig(config);

    if (args.dev) {
      config.devMode = true;
    }

    await ensureTasksFile(projectRoot, config);

    await cmdTui({
      projectRoot,
      config,
      maxConcurrent: args.maxConcurrent ? parseInt(args.maxConcurrent, 10) : undefined,
      model: args.model,
      baseBranch: args.baseBranch,
      maxRetries: args.maxRetries ? parseInt(args.maxRetries, 10) : undefined,
      autoPush: args.autoPush,
      skipTests: args.skipTests,
      strictTdd: args.strictTdd,
      agent: args.agent,
    });
  },
});
