/**
 * genesis.ts — Citty command definition for `woco genesis`.
 *
 * Wraps the existing cmdGenesis() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 *
 * Usage:
 *   woco genesis "Project vision..." [--tech-stack "..."] [--constraint "..."]
 *   woco g "Vision text" --tech-stack "React, Node, Postgres"
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { loadConfig, validateConfig, isProjectInitialized, WOMBO_DIR } from "../../config.js";
import { resolveOutputFormat } from "../../lib/output.js";
import { cmdGenesis } from "../genesis.js";

export const genesisCommand = defineCommand({
  meta: {
    name: "genesis",
    description: "Decompose a project vision into quests (also: g)",
  },
  args: {
    vision: {
      type: "positional",
      description: "Project vision text",
      required: false,
    },
    techStack: {
      type: "string",
      description: "Tech stack description (e.g. \"React, Node, Postgres\")",
      required: false,
    },
    constraint: {
      type: "string",
      description: "Constraint (pass multiple times with separate --constraint flags)",
      required: false,
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model for the planner agent",
      required: false,
    },
    noTui: {
      type: "boolean",
      description: "Skip TUI review, auto-approve all quests",
      required: false,
    },
    dryRun: {
      type: "boolean",
      description: "Show what would happen without creating quests",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text (default), json, or toon",
      required: false,
    },
    dev: {
      type: "boolean",
      description: "Enable developer mode",
      required: false,
    },
  },
  async run({ args, rawArgs }) {
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

    // Collect multiple --constraint flags from rawArgs since citty
    // only returns the last value for non-array string types
    const constraints: string[] = [];
    for (let i = 0; i < rawArgs.length; i++) {
      if (rawArgs[i] === "--constraint" && i + 1 < rawArgs.length) {
        constraints.push(rawArgs[i + 1]);
        i++;
      }
    }

    await cmdGenesis({
      projectRoot,
      config,
      vision: args.vision,
      techStack: args.techStack,
      constraints: constraints.length > 0 ? constraints : undefined,
      model: args.model,
      dryRun: args.dryRun,
      noTui: args.noTui,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
