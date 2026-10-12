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
import { msg, t } from "../lib/i18n";
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
    outputError(fmt, msg("cli.retry.usage"));
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
      outputError(fmt, msg("cli.retry.notFound", { id: opts.featureId }));
      return; // unreachable
    }

    if (agent.status !== "failed") {
      outputError(fmt, msg("cli.retry.notFailed", { id: opts.featureId, status: agent.status }));
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
        console.log(`\n${t("cli.retry.dryRunWould", { id: opts.featureId })}`);
        console.log(`  ${t("cli.retry.currentStatus", { status: agent.status })}`);
        console.log(`  ${t("cli.retry.retriesSoFar", { count: agent.retries })}`);
        console.log(`  ${t("cli.retry.worktree", { path: agent.worktree })}`);
        console.log(`  ${t("cli.retry.mode")}`);
        if (opts.model) console.log(`  ${t("cli.retry.model", { model: opts.model })}`);
      }, () => {
        console.log(renderRetry(dryRunResult));
      });
      return;
    }

    // Ask the daemon to retry (resets retries and re-launches)
    client.retryAgent(opts.featureId, opts.model);
    if (fmt === "text") {
      console.log(`${t("cli.retry.requested", { id: opts.featureId })}\n`);
    }

    // Wait for the retried agent to reach a terminal state
    const finalAgent = await waitForAgentTerminal(client, opts.featureId, fmt);
    if (!finalAgent) {
      outputError(fmt, msg("cli.retry.daemonStopped", { id: opts.featureId }));
      return; // unreachable
    }

    if (fmt === "text") {
      if (finalAgent.status === "failed") {
        console.log(`\n${t("cli.retry.failed", { id: opts.featureId, error: finalAgent.error ?? t("cli.retry.unknownError") })}`);
      } else {
        console.log(`\n${t("cli.retry.finished", { id: opts.featureId, status: finalAgent.status })}`);
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
      console.log(t("cli.retry.poll", { id: featureId, status: agent.status, retries: agent.retries, max: agent.maxRetries }));
    }
  }
}
