/**
 * retry.ts — Retry a specific failed agent via the daemon.
 *
 * Usage: woco retry <feature-id> [--model <model>] [--output json] [--dry-run]
 *
 * Asks the daemon to reset the agent's retry count and re-launch it. The
 * daemon owns the process lifecycle; this command blocks until the retried
 * agent reaches a terminal state (matching the legacy one-shot semantics).
 */

import type { WomboConfig } from "../config";
import { output, outputError, outputMessage, type OutputFormat } from "../lib/output";
import { renderRetry } from "../lib/toon";
import type { DaemonAgentState } from "../daemon/protocol";

export interface RetryCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  featureId: string;
  model?: string;
  dryRun?: boolean;
  outputFmt?: OutputFormat;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdRetry(opts: RetryCommandOptions): Promise<void> {
  const { projectRoot } = opts;
  const fmt = opts.outputFmt ?? "text";

  if (!opts.featureId) {
    outputError(fmt, "Usage: woco retry <feature-id>");
    return; // unreachable — outputError calls process.exit
  }

  // Dynamic imports — keep the daemon client out of the synchronous
  // require() chain used by schema.ts / citty-registry.ts.
  const { ensureDaemonRunning } = await import("../daemon/launcher");
  const { DaemonClient } = await import("../daemon/client");

  await ensureDaemonRunning(projectRoot);

  const client = new DaemonClient({ clientId: "retry", autoReconnect: false });
  try {
    await client.connect();
    const snapshot = await client.requestState(5_000);
    const agent = snapshot.agents.find((a) => a.featureId === opts.featureId);

    if (!agent) {
      outputError(fmt, `Agent not found for feature: ${opts.featureId}`);
      return; // unreachable
    }

    if (agent.status !== "failed") {
      outputError(
        fmt,
        `Agent ${opts.featureId} is not in failed state (current: ${agent.status})`
      );
      return; // unreachable
    }

    // Dry-run: show what would be retried without doing it
    if (opts.dryRun) {
      const dryRunResult = {
        dry_run: true,
        feature_id: opts.featureId,
        current_status: agent.status,
        retries_so_far: agent.retries,
        worktree: agent.worktree,
        mode: "headless (daemon)",
        model: opts.model ?? null,
      };

      output(fmt, dryRunResult, () => {
        console.log(`\n[dry-run] Would retry agent: ${opts.featureId}`);
        console.log(`  Current status: ${agent.status}`);
        console.log(`  Retries so far: ${agent.retries}`);
        console.log(`  Worktree: ${agent.worktree}`);
        console.log(`  Mode: headless (daemon manages the process)`);
        if (opts.model) console.log(`  Model: ${opts.model}`);
      }, () => {
        console.log(renderRetry(dryRunResult));
      });
      return;
    }

    // Ask the daemon to retry (resets retries and re-launches)
    client.retryAgent(opts.featureId, opts.model);
    if (fmt === "text") {
      console.log(`Retry requested for ${opts.featureId}. Waiting for completion...\n`);
    }

    // Wait for the retried agent to reach a terminal state
    const finalAgent = await waitForAgentTerminal(client, opts.featureId, fmt);
    if (!finalAgent) {
      outputError(fmt, `Daemon stopped responding while retrying ${opts.featureId}.`);
      return; // unreachable
    }

    if (fmt === "text") {
      if (finalAgent.status === "failed") {
        console.log(`\n${opts.featureId}: retry failed — ${finalAgent.error ?? "unknown error"}`);
      } else {
        console.log(`\n${opts.featureId}: retry finished with status "${finalAgent.status}".`);
      }
    }
  } finally {
    try { client.disconnect(); } catch { /* best-effort */ }
  }
}

/**
 * Poll the daemon until the given agent reaches a terminal status
 * (merged/completed/failed) or the daemon stops responding.
 */
async function waitForAgentTerminal(
  client: { requestState(timeoutMs?: number): Promise<{ agents: DaemonAgentState[] }> },
  featureId: string,
  fmt: OutputFormat,
  pollMs = 3_000,
): Promise<DaemonAgentState | null> {
  const TERMINAL = new Set(["merged", "completed", "failed"]);
  let polls = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((r) => setTimeout(r, pollMs));
    polls++;

    let snapshot;
    try {
      snapshot = await client.requestState(5_000);
    } catch {
      return null; // daemon stopped responding
    }

    const agent = snapshot.agents.find((a) => a.featureId === featureId);
    if (!agent) return null;

    if (TERMINAL.has(agent.status)) return agent;

    if (fmt === "text" && polls % 4 === 0) {
      console.log(`[daemon] ${featureId}: ${agent.status} (retry ${agent.retries}/${agent.maxRetries})`);
    }
  }
}
