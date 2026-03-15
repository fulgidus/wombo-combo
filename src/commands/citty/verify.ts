/**
 * verify.ts — Citty command definition for `woco verify`.
 *
 * Wraps the existing cmdVerify() with citty's defineCommand() for typed args.
 * Config-dependent: requires project initialization.
 */

import { defineCommand } from "citty";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config";
import { resolveOutputFormat } from "../../lib/output";
import { cmdVerify } from "../verify";

export const verifyCommand = defineCommand({
  meta: {
    name: "verify",
    description: "Run build verification on completed agents",
  },
  args: {
    featureId: {
      type: "positional",
      description: "Feature ID to verify (optional — verifies all completed if omitted)",
      required: false,
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model to use for retry",
      required: false,
    },
    maxRetries: {
      type: "string",
      description: "Max retries for build verification",
      required: false,
    },
    browser: {
      type: "boolean",
      description: "Enable browser verification",
      required: false,
    },
    skipTests: {
      type: "boolean",
      description: "Skip running tests during TDD verification",
      required: false,
    },
    strictTdd: {
      type: "boolean",
      description: "Strict TDD mode: fail if new files are missing tests",
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

    await cmdVerify({
      projectRoot,
      config,
      featureId: args.featureId,
      model: args.model,
      maxRetries: args.maxRetries ? parseInt(args.maxRetries, 10) : undefined,
      browserVerify: args.browser,
      skipTests: args.skipTests,
      strictTdd: args.strictTdd,
      outputFmt: resolveOutputFormat(args.output),
    });
  },
});
