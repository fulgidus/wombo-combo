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
import { msg, t } from "../lib/i18n";

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
      outputError(fmt, msg("cli.abort.notFound", { id: featureId }));
      return; // unreachable — helps TypeScript narrow
    }

    // Only abort agents that are actually active (running, installing, queued, resolving_conflict)
    const abortable = new Set(["running", "installing", "queued", "resolving_conflict"]);
    if (!abortable.has(agent.status)) {
      outputError(fmt, msg("cli.abort.notAbortable", { id: featureId, status: agent.status }));
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
      console.log(`\n${t("cli.abort.aborted", { id: featureId })}`);
      console.log(`  ${t("cli.abort.previousStatus", { status: agent.status })}`);
      console.log(`  ${t("cli.abort.newStatus", { status: "failed" })}`);
      console.log(`  ${t("cli.abort.retryHint", { id: featureId })}`);
    }, () => {
      console.log(renderAbort(result));
    });
  } finally {
    try { client.disconnect(); } catch { /* best-effort */ }
  }
}
