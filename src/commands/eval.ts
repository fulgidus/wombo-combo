/**
 * eval.ts — Eval-style scoring of a completed daemon session.
 *
 * Usage:
 *   woco eval                     Score the most recent session
 *   woco eval <wave-id>           Score a specific session
 *   woco eval --output json       Output as JSON
 *
 * Reads .wombo-combo/history/<wave-id>.json (auto-exported on session
 * completion), correlates it with the task store (planner estimates:
 * difficulty/effort/priority/paths), scores weighting/routing/steering/flow,
 * and persists a comparable report to .wombo-combo/evals/<wave-id>.json.
 */

import type { WomboConfig } from "../config";
import {
  listHistory,
  loadHistory,
  type WaveHistoryRecord,
} from "../lib/history";
import { loadFeatures } from "../lib/tasks";
import type { Task } from "../lib/tasks";
import {
  scoreSession,
  saveEvalReport,
  type ScoreReport,
} from "../lib/eval-score";
import { output, outputError, type OutputFormat } from "../lib/output";
import { renderEval } from "../lib/toon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  /** Specific wave ID to score; omit to score the newest session */
  waveId?: string;
  outputFmt: OutputFormat;
}

// ---------------------------------------------------------------------------
// Formatting Helpers (same palette as history.ts)
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const FG = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
};

function scoreColor(score: number | null): string {
  if (score === null) return FG.gray;
  if (score >= 80) return FG.green;
  if (score >= 50) return FG.yellow;
  return FG.red;
}

function formatScore(score: number | null): string {
  return score === null ? "n/a" : `${score}`;
}

function renderScorecard(report: ScoreReport, savedPath: string): void {
  const pad = (s: string, w: number): string =>
    s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);

  console.log("");
  console.log(`${BOLD}Eval Report — ${report.wave_id}${RESET}`);
  console.log(`${DIM}schema ${report.schema}, evaluated ${report.evaluated_at}${RESET}`);
  console.log("");

  // Weighting
  const w = report.weighting;
  console.log(
    `  ${pad("weighting", 12)} ${scoreColor(w.score)}${formatScore(w.score)}${RESET}` +
    `  (${w.concordant_pairs}/${w.comparable_pairs} concordant weight→duration pairs, n/a = not comparable)`
  );

  // Routing
  const r = report.routing;
  console.log(
    `  ${pad("routing", 12)} ${scoreColor(r.score)}${formatScore(r.score)}${RESET}` +
    `  (${r.routed}/${r.total} agents model-routed, ${r.mismatches.length} mismatch(es))`
  );
  for (const m of r.mismatches.slice(0, 10)) {
    console.log(
      `    ${FG.gray}mismatch:${RESET} ${m.feature_id} (${m.weight}) expected=${m.expected_model ?? "null"} actual=${m.actual_model ?? "null"}`
    );
  }

  // Steering
  const s = report.steering;
  console.log(
    `  ${pad("steering", 12)} ${scoreColor(s.score)}${formatScore(s.score)}${RESET}` +
    `  (${s.scoped_tasks} scoped task(s), ${s.violations.length} overlap violation(s), ${s.conflicts} conflict(s))`
  );
  for (const v of s.violations.slice(0, 10)) {
    console.log(`    ${FG.red}overlap:${RESET} ${v.a} ↔ ${v.b} share "${v.path}"`);
  }

  // Flow
  const f = report.flow;
  console.log(
    `  ${pad("flow", 12)} ${scoreColor(f.score)}${formatScore(f.score)}${RESET}` +
    `  (${f.succeeded}/${f.total} succeeded, ${f.failed} failed, ${f.total_retries} retries, peak concurrency ${f.max_concurrent_observed})`
  );

  // Overall
  const oc = scoreColor(report.overall);
  console.log("");
  console.log(`  ${pad("overall", 12)} ${oc}${BOLD}${formatScore(report.overall)}${RESET}`);
  console.log("");
  console.log(`${DIM}Report saved to ${savedPath}${RESET}`);
  console.log("");
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdEval(opts: EvalCommandOptions): Promise<void> {
  const { projectRoot, config, outputFmt } = opts;

  // Pick the session to score
  let record: WaveHistoryRecord | null;
  if (opts.waveId) {
    record = loadHistory(projectRoot, opts.waveId);
    if (!record) {
      outputError(outputFmt, `No history record found for wave "${opts.waveId}".`);
      return;
    }
  } else {
    // Pick the NEWEST session by started_at — listHistory's filename order
    // is unreliable (daemon-* vs wave-* prefixes sort differently).
    const records = listHistory(projectRoot);
    record =
      records.reduce<WaveHistoryRecord | null>((newest, r) => {
        if (!newest) return r;
        return (r.started_at ?? "") > (newest.started_at ?? "") ? r : newest;
      }, null) ?? null;
    if (!record) {
      outputError(
        outputFmt,
        "No wave history found. History is auto-exported when a daemon session completes."
      );
      return;
    }
  }

  // Correlate with the task store (active + archive) for planner estimates
  const tasksById = new Map<string, Task>();
  try {
    const data = loadFeatures(projectRoot, config);
    for (const t of [...data.tasks, ...data.archive]) {
      if (!tasksById.has(t.id)) tasksById.set(t.id, t);
    }
  } catch {
    // No task store — weighting/steering degrade to n/a, flow still scores
  }

  const report = scoreSession(record, tasksById, config);
  const savedPath = saveEvalReport(projectRoot, report);

  output(outputFmt, report, () => renderScorecard(report, savedPath), () =>
    renderEval(report)
  );
}
