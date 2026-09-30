/**
 * resume.ts — Re-attach to the daemon session and continue processing.
 *
 * Usage: woco resume [options]
 *
 * The daemon persists its state continuously (daemon-state.json) and its
 * scheduler reloads that state on boot. Resume therefore only needs to:
 *   1. Ensure the daemon is running (auto-start reloads persisted state)
 *   2. Tell the scheduler to continue (applying any overrides)
 *   3. Attach a monitor (TUI or headless polling) until work completes
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { WomboConfig } from "../config";
import { WOMBO_DIR } from "../config";
import { outputError, type OutputFormat } from "../lib/output";
import type { DaemonClient } from "../daemon/client";

export interface ResumeCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  maxConcurrent?: number;
  model?: string;
  noTui: boolean;
  outputFmt?: OutputFormat;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdResume(opts: ResumeCommandOptions): Promise<void> {
  const { projectRoot } = opts;
  const fmt = opts.outputFmt ?? "text";

  // Nothing to resume: no daemon running AND no persisted session state
  const persisted = existsSync(resolve(projectRoot, WOMBO_DIR, "daemon-state.json"));
  const { getDaemonStatus } = await import("../daemon/launcher");
  if (!getDaemonStatus(projectRoot).running && !persisted) {
    outputError(fmt, "No daemon session found. Use 'woco launch' to start a new wave.");
    return; // unreachable — outputError calls process.exit
  }

  if (fmt === "text") {
    console.log("\n--- wombo-combo: Resume ---\n");
  }

  // Ensure the daemon is running (auto-start reloads persisted state)
  const { ensureDaemonRunning } = await import("../daemon/launcher");
  await ensureDaemonRunning(projectRoot);

  const { DaemonClient: DaemonClientImpl } = await import("../daemon/client");
  const client: DaemonClient = new DaemonClientImpl({ clientId: "resume", autoReconnect: false });
  try {
    await client.connect();

    // Snapshot before continuing — shows the operator what they're resuming
    const snapshot = await client.requestState(5_000);
    if (snapshot.agents.length === 0) {
      if (fmt === "text") {
        console.log("Daemon session has no agents. Use 'woco launch' to start a new wave.");
      }
      return;
    }

    if (fmt === "text") {
      const active = snapshot.agents.filter(
        (a) => a.status === "running" || a.status === "installing" ||
               a.status === "resolving_conflict" || a.status === "retry"
      ).length;
      const queued = snapshot.agents.filter((a) => a.status === "queued").length;
      console.log(`Resuming daemon session: ${snapshot.agents.length} agent(s) ` +
        `(${active} active, ${queued} queued) — scheduler: ${snapshot.scheduler.status}\n`);
    }

    // Continue the scheduler (applies overrides; no task filter — the
    // scheduler picks up from its persisted session state)
    client.start({
      maxConcurrent: opts.maxConcurrent,
      model: opts.model,
    });

    // Wait for work to finish (or user to quit)
    if (!opts.noTui) {
      const { InkDaemonTUI } = await import("../ink/run-daemon-monitor");
      const daemonTui = new InkDaemonTUI({
        client,
        projectRoot,
        config: opts.config,
        onQuit: () => {
          // User pressed Q — daemon keeps running, we just detach
        },
      });
      daemonTui.start();
      await daemonTui.waitForQuit();
      daemonTui.stop();
    } else {
      const { waitForDaemonCompletion } = await import("./launch");
      await waitForDaemonCompletion(client, fmt);
    }
  } finally {
    try { client.disconnect(); } catch { /* best-effort */ }
  }
}
