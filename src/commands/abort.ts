/**
 * abort.ts — Kill a single running agent without nuking the entire session.
 *
 * Usage: woco abort <feature-id> [--output json]
 *
 * Asks the daemon to cancel the agent: the daemon kills the agent process
 * and marks it as "failed". Use `woco retry <feature-id>` afterwards to
 * re-queue a failed agent.
 */

import type { WomboConfig } from "../config";
import { output, outputError, type OutputFormat } from "../lib/output";
import { renderAbort } from "../lib/toon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AbortCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  featureId: string;
  outputFmt: OutputFormat;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdAbort(opts: AbortCommandOptions): Promise<void> {
  const { projectRoot, featureId, outputFmt: fmt } = opts;

  // Dynamic imports — keep the daemon client out of the synchronous
  // require() chain used by schema.ts / citty-registry.ts.
  const { ensureDaemonRunning } = await import("../daemon/launcher");
  const { DaemonClient } = await import("../daemon/client");

  await ensureDaemonRunning(projectRoot);

  const client = new DaemonClient({ clientId: "abort", autoReconnect: false });
  try {
    await client.connect();
    const snapshot = await client.requestState(5_000);
    const agent = snapshot.agents.find((a) => a.featureId === featureId);

    if (!agent) {
      outputError(
        fmt,
        `Agent not found for feature: ${featureId}. Use 'woco status' to see active agents.`
      );
      return; // unreachable — helps TypeScript narrow
    }

    // Only abort agents that are actually active (running, installing, queued, resolving_conflict)
    const abortable = new Set(["running", "installing", "queued", "resolving_conflict"]);
    if (!abortable.has(agent.status)) {
      outputError(
        fmt,
        `Agent ${featureId} is not in an abortable state (current: ${agent.status}). ` +
          `Only running, installing, queued, or resolving_conflict agents can be aborted.`
      );
      return; // unreachable — helps TypeScript narrow
    }

    // The daemon kills the process and marks the agent failed
    client.cancelAgent(featureId);

    const result = {
      feature_id: featureId,
      previous_status: agent.status,
      new_status: "failed",
    };

    output(fmt, result, () => {
      console.log(`\nAborted agent: ${featureId}`);
      console.log(`  Previous status: ${agent.status}`);
      console.log(`  New status: failed`);
      console.log(`  Use \`woco retry ${featureId}\` to re-queue it.`);
    }, () => {
      console.log(renderAbort(result));
    });
  } finally {
    try { client.disconnect(); } catch { /* best-effort */ }
  }
}
