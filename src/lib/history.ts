/**
 * history.ts — Wave history persistence.
 *
 * Responsibilities:
 *   - Define the shape of wave history records
 *   - Save wave history to .wombo-combo/history/<wave-id>.json
 *   - Load individual history records
 *   - List all saved history records
 *   - Export wave state to history on completion
 *
 * History records survive `woco cleanup` because they are stored
 * separately from .wombo-combo/state.json. The .wombo-combo/history/
 * directory is gitignored.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  renameSync,
} from "node:fs";
import { resolve, basename } from "node:path";
import type { AgentStatus } from "../daemon/agent-status";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentHistoryRecord {
  feature_id: string;
  branch: string;
  status: AgentStatus;
  /** Number of retries attempted */
  retries: number;
  max_retries: number;
  /** Whether the build passed (null if never verified) */
  build_passed: boolean | null;
  /** ISO 8601 timestamp when the agent started */
  started_at: string | null;
  /** ISO 8601 timestamp when the agent finished */
  completed_at: string | null;
  /** Duration in milliseconds (computed from started_at → completed_at) */
  duration_ms: number | null;
  /** Error message if failed */
  error: string | null;
  /** Whether the agent encountered merge conflicts */
  had_merge_conflict: boolean;
  /** Build output summary (only for failed builds) */
  build_output: string | null;
}

export interface WaveHistoryRecord {
  /** Unique wave identifier */
  wave_id: string;
  /** Base branch used for this wave */
  base_branch: string;
  /** ISO 8601 timestamp when the wave started */
  started_at: string;
  /** ISO 8601 timestamp when the history was exported */
  exported_at: string;
  /** Model used (if any) */
  model: string | null;
  /** Max concurrency setting */
  max_concurrent: number;
  /** Whether the wave ran in interactive mode */
  interactive: boolean;
  /** Summary statistics */
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    merged: number;
    verified: number;
    total_retries: number;
    total_duration_ms: number;
  };
  /** Per-agent results */
  agents: AgentHistoryRecord[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HISTORY_DIR = ".wombo-combo/history";

// ---------------------------------------------------------------------------
// History Directory
// ---------------------------------------------------------------------------

function historyDir(projectRoot: string): string {
  return resolve(projectRoot, HISTORY_DIR);
}

function ensureHistoryDir(projectRoot: string): string {
  const dir = historyDir(projectRoot);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ---------------------------------------------------------------------------
// Export Daemon Session → History Record
// ---------------------------------------------------------------------------

/** Structural subset of the daemon's internal agent state needed for history. */
export interface HistoryAgentSource {
  featureId: string;
  branch: string;
  status: AgentStatus;
  retries: number;
  maxRetries: number;
  buildPassed: boolean | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  buildOutput?: string | null;
}

/**
 * Convert a completed daemon session to a WaveHistoryRecord for persistence.
 */
export function daemonSessionToHistory(session: {
  waveId: string;
  baseBranch: string;
  startedAt: string;
  model: string | null;
  maxConcurrent: number;
  agents: HistoryAgentSource[];
}): WaveHistoryRecord {
  const agents: AgentHistoryRecord[] = session.agents.map((agent) => {
    const durationMs = computeDuration(agent.startedAt, agent.completedAt);
    const hadConflict =
      agent.status === "resolving_conflict" ||
      (agent.error != null && agent.error.toLowerCase().includes("conflict"));

    return {
      feature_id: agent.featureId,
      branch: agent.branch,
      status: agent.status,
      retries: agent.retries,
      max_retries: agent.maxRetries,
      build_passed: agent.buildPassed,
      started_at: agent.startedAt,
      completed_at: agent.completedAt,
      duration_ms: durationMs,
      error: agent.error,
      had_merge_conflict: hadConflict,
      build_output: agent.buildPassed === false ? agent.buildOutput ?? null : null,
    };
  });

  const succeeded = agents.filter(
    (a) => a.status === "merged" || a.status === "verified"
  ).length;
  const failed = agents.filter((a) => a.status === "failed").length;
  const merged = agents.filter((a) => a.status === "merged").length;
  const verified = agents.filter((a) => a.status === "verified").length;
  const totalRetries = agents.reduce((sum, a) => sum + a.retries, 0);
  const totalDuration = agents.reduce(
    (sum, a) => sum + (a.duration_ms ?? 0),
    0
  );

  return {
    wave_id: session.waveId,
    base_branch: session.baseBranch,
    started_at: session.startedAt,
    exported_at: new Date().toISOString(),
    model: session.model,
    max_concurrent: session.maxConcurrent,
    interactive: false,
    summary: {
      total: agents.length,
      succeeded,
      failed,
      merged,
      verified,
      total_retries: totalRetries,
      total_duration_ms: totalDuration,
    },
    agents,
  };
}

// ---------------------------------------------------------------------------
// Save History
// ---------------------------------------------------------------------------

/**
 * Save a wave history record to .wombo-combo/history/<wave-id>.json.
 * Writes atomically (tmp + rename).
 */
export function saveHistory(
  projectRoot: string,
  record: WaveHistoryRecord
): string {
  const dir = ensureHistoryDir(projectRoot);
  const filename = `${record.wave_id}.json`;
  const filePath = resolve(dir, filename);
  const tmpPath = filePath + ".tmp";

  writeFileSync(tmpPath, JSON.stringify(record, null, 2) + "\n", "utf-8");
  renameSync(tmpPath, filePath);

  return filePath;
}

/**
 * Export the current daemon session state to history. This is the main entry
 * point called when a daemon session completes.
 *
 * Returns the path to the saved history file.
 */
export function exportDaemonHistory(
  projectRoot: string,
  session: Parameters<typeof daemonSessionToHistory>[0]
): string {
  const record = daemonSessionToHistory(session);
  const filePath = saveHistory(projectRoot, record);
  return filePath;
}

// ---------------------------------------------------------------------------
// Load History
// ---------------------------------------------------------------------------

/**
 * Load a single wave history record by wave ID.
 * Returns null if not found.
 */
export function loadHistory(
  projectRoot: string,
  waveId: string
): WaveHistoryRecord | null {
  const filePath = resolve(historyDir(projectRoot), `${waveId}.json`);
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as WaveHistoryRecord;
  } catch {
    return null;
  }
}

/**
 * List all wave history records, sorted by start time (newest first).
 * Returns lightweight summaries without full agent details.
 */
export function listHistory(projectRoot: string): WaveHistoryRecord[] {
  const dir = historyDir(projectRoot);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"))
    .sort()
    .reverse(); // newest first (wave IDs contain dates)

  const records: WaveHistoryRecord[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(resolve(dir, file), "utf-8");
      const record = JSON.parse(raw) as WaveHistoryRecord;
      records.push(record);
    } catch {
      // Skip corrupt files
    }
  }

  return records;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute duration in milliseconds between two ISO timestamps.
 * Returns null if either timestamp is missing.
 */
function computeDuration(
  startedAt: string | null,
  completedAt: string | null
): number | null {
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (isNaN(start) || isNaN(end)) return null;
  return Math.max(0, end - start);
}
