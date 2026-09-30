/**
 * status.ts — Show the status of the current daemon session.
 *
 * Usage:
 *   woco status                  # human-readable dashboard
 *   woco status --output json    # structured JSON for programmatic access
 *
 * Reads state from the live daemon when it is running (authoritative), or
 * falls back to the persisted daemon-state.json on disk. Prints a dashboard
 * or emits structured JSON with session metadata, agent states, timing info,
 * and summary statistics.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { WomboConfig } from "../config";
import { WOMBO_DIR } from "../config";
import type { DaemonAgentState, SchedulerState } from "../daemon/protocol";
import { getDaemonStatus } from "../daemon/launcher";
import type { DaemonSnapshotView } from "../lib/ui";
import { printDashboard } from "../lib/ui";
import { output, outputMessage, type OutputFormat } from "../lib/output";
import { renderStatus } from "../lib/toon";

export interface StatusOptions {
  projectRoot: string;
  config: WomboConfig;
  outputFmt?: OutputFormat;
}

// ---------------------------------------------------------------------------
// Snapshot loading (live daemon first, persisted state as fallback)
// ---------------------------------------------------------------------------

/**
 * Read a session snapshot from the persisted daemon-state.json.
 * Returns null when the file is missing or unparsable.
 */
function readPersistedSnapshot(projectRoot: string): DaemonSnapshotView | null {
  const path = resolve(projectRoot, WOMBO_DIR, "daemon-state.json");
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    if (!raw?.scheduler || !Array.isArray(raw?.agents)) return null;
    return { scheduler: raw.scheduler, agents: raw.agents };
  } catch {
    return null;
  }
}

/**
 * Load the current session snapshot: live daemon state when reachable,
 * otherwise the persisted daemon-state.json.
 */
export async function loadSessionSnapshot(projectRoot: string): Promise<DaemonSnapshotView | null> {
  const status = getDaemonStatus(projectRoot);
  if (status.running) {
    try {
      // Dynamic import — keeps the daemon client out of the synchronous
      // require() chain used by schema.ts / citty-registry.ts.
      const { DaemonClient } = await import("../daemon/client");
      const client = new DaemonClient({ clientId: "status", autoReconnect: false });
      try {
        await client.connect();
        const snapshot = await client.requestState(5_000);
        return { scheduler: snapshot.scheduler, agents: snapshot.agents };
      } finally {
        try { client.disconnect(); } catch { /* best-effort */ }
      }
    } catch {
      // Daemon marked running but not answering — fall through to disk
    }
  }
  return readPersistedSnapshot(projectRoot);
}

// ---------------------------------------------------------------------------
// JSON Output Builder
// ---------------------------------------------------------------------------

/**
 * Compute elapsed time in milliseconds from a start ISO timestamp to now.
 */
function elapsedMs(startedAt: string | null): number | null {
  if (!startedAt) return null;
  return Date.now() - new Date(startedAt).getTime();
}

/**
 * Format milliseconds as a human-readable duration string (e.g. "2h15m", "3m").
 */
function formatElapsed(ms: number | null): string | null {
  if (ms === null) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h${remMins}m`;
}

/**
 * Build the structured JSON representation of an agent's state.
 */
function agentToJson(agent: DaemonAgentState): Record<string, unknown> {
  const elapsed = elapsedMs(agent.startedAt);
  return {
    feature_id: agent.featureId,
    branch: agent.branch,
    worktree: agent.worktree,
    status: agent.status,
    pid: agent.pid,
    retries: agent.retries,
    max_retries: agent.maxRetries,
    started_at: agent.startedAt,
    completed_at: agent.completedAt,
    elapsed_ms: elapsed,
    elapsed_formatted: formatElapsed(elapsed),
    build_passed: agent.buildPassed,
    error: agent.error,
    activity: agent.activity,
    activity_updated_at: agent.activityUpdatedAt,
    effort_estimate_ms: agent.effortEstimateMs,
    agent_name: agent.agentName,
    agent_type: agent.agentType,
    stream_index: agent.streamIndex,
    model: agent.model ?? null,
    depends_on: agent.dependsOn,
  };
}

/**
 * Build the full structured JSON for the session status.
 * Schema:
 *   {
 *     wave_id: null (no wave concept — daemon tracks a continuous session),
 *     base_branch: string,
 *     started_at: string (ISO 8601),
 *     elapsed_ms: number,
 *     elapsed_formatted: string,
 *     max_concurrent: number,
 *     model: string | null,
 *     scheduler_status: string,
 *     quest_id: string | null,
 *     is_complete: boolean,
 *     agents: Agent[],
 *     summary: { total, queued, installing, running, completed, verified, failed, merged, retry, resolving_conflict }
 *   }
 */
function buildStatusJson(snapshot: DaemonSnapshotView): Record<string, unknown> {
  const { scheduler, agents } = snapshot;
  const counts: Record<string, number> = {};
  for (const a of agents) counts[a.status] = (counts[a.status] ?? 0) + 1;

  const terminalStatuses = new Set(["completed", "failed", "merged"]);
  const sessionElapsed = elapsedMs(scheduler.startedAt);

  return {
    wave_id: null,
    base_branch: scheduler.baseBranch,
    started_at: scheduler.startedAt,
    elapsed_ms: sessionElapsed,
    elapsed_formatted: formatElapsed(sessionElapsed),
    max_concurrent: scheduler.maxConcurrent,
    model: scheduler.model,
    scheduler_status: scheduler.status,
    quest_id: scheduler.questId,
    is_complete:
      agents.length > 0 && agents.every((a) => terminalStatuses.has(a.status)),
    agents: agents.map(agentToJson),
    summary: {
      total: agents.length,
      queued: counts.queued ?? 0,
      installing: counts.installing ?? 0,
      running: counts.running ?? 0,
      completed: counts.completed ?? 0,
      verified: counts.verified ?? 0,
      failed: counts.failed ?? 0,
      merged: counts.merged ?? 0,
      retry: counts.retry ?? 0,
      resolving_conflict: counts.resolving_conflict ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdStatus(opts: StatusOptions): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  const snapshot = await loadSessionSnapshot(opts.projectRoot);

  if (!snapshot || snapshot.agents.length === 0) {
    outputMessage(fmt, "No active daemon session. Use 'woco launch' to start one.", {
      wave_id: null,
      agents: [],
      summary: { total: 0 },
    });
    return;
  }

  output(fmt, buildStatusJson(snapshot), () => {
    printDashboard(snapshot);
  }, () => {
    // TOON renderer
    console.log(renderStatus(snapshot));
  });
}
