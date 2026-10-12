/**
 * history.ts — View wave history and summaries.
 *
 * Usage:
 *   woco history                    List all past waves
 *   woco history <wave-id>          Show details of a specific wave
 *   woco history --output json      Output as JSON
 *
 * Wave history is stored in .wombo-combo/history/<wave-id>.json and survives
 * `woco cleanup`. Records are auto-exported when a wave completes.
 */

import type { WomboConfig } from "../config";
import {
  listHistory,
  loadHistory,
  type WaveHistoryRecord,
} from "../lib/history";
import { output, outputError, type OutputFormat } from "../lib/output";
import { renderHistoryList, renderHistoryDetail } from "../lib/toon";
import { msg, t } from "../lib/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoryCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  /** Specific wave ID to show details for */
  waveId?: string;
  /** Output format */
  outputFmt: OutputFormat;
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const FG = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function pad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return " ".repeat(width - text.length) + text;
}

function formatDurationMs(ms: number | null): string {
  if (ms === null || ms === 0) return "-";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "merged":
      return FG.magenta;
    case "verified":
      return FG.green;
    case "failed":
      return FG.red;
    case "completed":
      return FG.yellow;
    default:
      return FG.gray;
  }
}

// ---------------------------------------------------------------------------
// List All Waves
// ---------------------------------------------------------------------------

function renderWaveList(records: WaveHistoryRecord[]): void {
  if (records.length === 0) {
    console.log(`\n${t("cli.history.empty")}`);
    console.log(`${t("cli.history.emptyHint")}\n`);
    return;
  }

  console.log("");
  console.log(`${BOLD}${t("cli.history.listTitle", { count: records.length })}${RESET}`);
  console.log("");

  const header = [
    pad(t("cli.history.colWaveId"), 24),
    pad(t("cli.history.colDate"), 22),
    padLeft(t("cli.history.colTotal"), 6),
    padLeft(t("cli.history.colOk"), 4),
    padLeft(t("cli.history.colFail"), 5),
    padLeft(t("cli.history.colMerged"), 7),
    padLeft(t("cli.history.colRetries"), 8),
    padLeft(t("cli.history.colDuration"), 10),
  ].join(" ");

  console.log(`${BOLD}${header}${RESET}`);
  console.log("-".repeat(90));

  for (const rec of records) {
    const s = rec.summary;
    const okColor = s.succeeded === s.total ? FG.green : FG.yellow;
    const failColor = s.failed > 0 ? FG.red : FG.gray;

    const row = [
      pad(rec.wave_id, 24),
      pad(formatDate(rec.started_at), 22),
      padLeft(String(s.total), 6),
      `${okColor}${padLeft(String(s.succeeded), 4)}${RESET}`,
      `${failColor}${padLeft(String(s.failed), 5)}${RESET}`,
      padLeft(String(s.merged), 7),
      padLeft(String(s.total_retries), 8),
      padLeft(formatDurationMs(s.total_duration_ms), 10),
    ].join(" ");

    console.log(row);
  }

  console.log("");
  console.log(`${DIM}${t("cli.history.detailsHint")}${RESET}`);
  console.log("");
}

// ---------------------------------------------------------------------------
// Show Single Wave Details
// ---------------------------------------------------------------------------

function renderWaveDetails(rec: WaveHistoryRecord): void {
  console.log("");
  console.log(`${BOLD}${t("cli.history.wave", { id: rec.wave_id })}${RESET}`);
  const mode = t(rec.interactive ? "cli.history.modeInteractive" : "cli.history.modeHeadless");
  console.log(`${DIM}${t("cli.history.meta", { base: rec.base_branch, concurrency: rec.max_concurrent, mode })}${RESET}`);
  if (rec.model) {
    console.log(`${DIM}${t("cli.history.model", { model: rec.model })}${RESET}`);
  }
  console.log(`${DIM}${t("cli.history.dates", { started: formatDate(rec.started_at), exported: formatDate(rec.exported_at) })}${RESET}`);
  console.log("");

  // Summary
  const s = rec.summary;
  const label = (key: string) => `  ${t(key).padEnd(17)}`;
  console.log(`${BOLD}${t("cli.history.summary")}${RESET}`);
  console.log(`${label("cli.history.totalAgents")}${s.total}`);
  console.log(`${label("cli.history.succeeded")}${FG.green}${s.succeeded}${RESET}`);
  console.log(`${label("cli.history.failed")}${s.failed > 0 ? FG.red : FG.gray}${s.failed}${RESET}`);
  console.log(`${label("cli.history.merged")}${FG.magenta}${s.merged}${RESET}`);
  console.log(`${label("cli.history.verified")}${FG.green}${s.verified}${RESET}`);
  console.log(`${label("cli.history.totalRetries")}${s.total_retries}`);
  console.log(`${label("cli.history.totalDuration")}${formatDurationMs(s.total_duration_ms)}`);
  console.log("");

  // Agent table
  console.log(`${BOLD}${t("cli.history.agents")}${RESET}`);
  console.log("");

  const header = [
    pad(t("cli.history.colFeature"), 30),
    pad(t("cli.history.colStatus"), 12),
    padLeft(t("cli.history.colRetries"), 8),
    padLeft(t("cli.history.colDuration"), 10),
    pad(t("cli.history.colBuild"), 6),
    pad(t("cli.history.colConflict"), 9),
    pad(t("cli.history.colError"), 30),
  ].join(" ");

  console.log(`${BOLD}${header}${RESET}`);
  console.log("-".repeat(109));

  for (const agent of rec.agents) {
    const color = statusColor(agent.status);
    const buildStr = agent.build_passed === true
      ? `${FG.green}${t("cli.history.buildPass")}${RESET}`
      : agent.build_passed === false
        ? `${FG.red}${t("cli.history.buildFail")}${RESET}`
        : `${FG.gray}-${RESET}`;
    const conflictStr = agent.had_merge_conflict
      ? `${FG.yellow}${t("cli.history.yes")}${RESET}`
      : `${FG.gray}${t("cli.history.no")}${RESET}`;
    const errorStr = agent.error
      ? agent.error.split("\n")[0].slice(0, 28)
      : "-";

    const row = [
      pad(agent.feature_id, 30),
      `${color}${pad(agent.status, 12)}${RESET}`,
      padLeft(
        agent.retries > 0 ? `${agent.retries}/${agent.max_retries}` : "-",
        8
      ),
      padLeft(formatDurationMs(agent.duration_ms), 10),
      pad(buildStr, 6),
      pad(conflictStr, 9),
      pad(errorStr, 30),
    ].join(" ");

    console.log(row);
  }

  console.log("");
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdHistory(opts: HistoryCommandOptions): Promise<void> {
  const { projectRoot, outputFmt } = opts;

  if (opts.waveId) {
    // Show details for a specific wave
    const record = loadHistory(projectRoot, opts.waveId);
    if (!record) {
      outputError(outputFmt, msg("cli.history.notFound", { id: opts.waveId }));
      return; // unreachable — helps TypeScript narrow
    }

    output(outputFmt, record, () => {
      renderWaveDetails(record);
    }, () => {
      // TOON renderer
      console.log(renderHistoryDetail(record));
    });
  } else {
    // List all waves
    const records = listHistory(projectRoot);

    output(outputFmt, records, () => {
      renderWaveList(records);
    }, () => {
      // TOON renderer
      console.log(renderHistoryList(records));
    });
  }
}
