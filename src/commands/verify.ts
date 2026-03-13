/**
 * verify.ts — Run build verification on completed agents.
 *
 * Usage: woco verify [feature-id] [--browser] [--output json]
 *
 * Runs the build command in each completed agent's worktree. If a specific
 * feature-id is given, verifies only that agent. Otherwise verifies all
 * agents with status "completed".
 *
 * When --browser is passed (or browser.enabled is true in config), also
 * runs browser-based verification after the build passes.
 */

import type { WomboConfig } from "../config.js";
import { loadFeatures, type Feature } from "../lib/tasks.js";
import { loadState, saveState } from "../lib/state.js";
import { printDashboard } from "../lib/ui.js";
import { handleBuildVerification } from "./launch.js";
import { output, outputMessage, type OutputFormat } from "../lib/output.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VerifyCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  featureId?: string;
  model?: string;
  maxRetries?: number;
  /** Enable browser verification (overrides config.browser.enabled) */
  browserVerify?: boolean;
  outputFmt?: OutputFormat;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdVerify(opts: VerifyCommandOptions): Promise<void> {
  const { projectRoot, config } = opts;
  const fmt = opts.outputFmt ?? "text";

  // Apply browser verification override if --browser flag was passed
  if (opts.browserVerify !== undefined) {
    config.browser.enabled = opts.browserVerify;
  }

  const state = loadState(projectRoot);
  if (!state) {
    outputMessage(fmt, "No active wave.", {
      wave_id: null,
      agents: [],
      verified: 0,
    });
    return;
  }

  const toVerify = opts.featureId
    ? state.agents.filter((a) => a.feature_id === opts.featureId)
    : state.agents.filter((a) => a.status === "completed");

  if (toVerify.length === 0) {
    outputMessage(fmt, "No agents to verify.", {
      wave_id: state.wave_id,
      agents: [],
      verified: 0,
    });
    return;
  }

  if (fmt === "text") {
    console.log(`\nVerifying ${toVerify.length} agent(s)...\n`);
  }

  const data = loadFeatures(projectRoot, config);

  for (const agent of toVerify) {
    const feature = data.tasks.find((f: Feature) => f.id === agent.feature_id);
    if (!feature) continue;

    await handleBuildVerification(projectRoot, state, agent, feature, config, opts.model);
  }

  // Collect results for JSON output
  const results = toVerify.map((agent) => {
    // Re-read agent state after verification (it was mutated in place)
    const updatedAgent = state.agents.find((a) => a.feature_id === agent.feature_id);
    return {
      feature_id: agent.feature_id,
      branch: agent.branch,
      status: updatedAgent?.status ?? agent.status,
      build_passed: updatedAgent?.build_passed ?? agent.build_passed,
      error: updatedAgent?.error ?? agent.error,
    };
  });

  output(fmt, {
    wave_id: state.wave_id,
    verified: results.filter((r) => r.status === "verified").length,
    failed: results.filter((r) => r.status === "failed").length,
    agents: results,
  }, () => {
    printDashboard(state);
  });
}
