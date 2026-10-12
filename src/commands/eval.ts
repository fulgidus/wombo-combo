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
import { msg, t } from "../lib/i18n";

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
  return score === null ? t("cli.eval.na") : `${score}`;
}

function renderScorecard(report: ScoreReport, savedPath: string): void {
  const pad = (s: string, w: number): string =>
    s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);

  console.log("");
  console.log(`${BOLD}${t("cli.eval.title", { wave: report.wave_id })}${RESET}`);
  console.log(`${DIM}${t("cli.eval.schema", { schema: report.schema, at: report.evaluated_at })}${RESET}`);
  console.log("");

  // Weighting
  const w = report.weighting;
  console.log(
    `  ${pad(t("cli.eval.label.weighting"), 12)} ${scoreColor(w.score)}${formatScore(w.score)}${RESET}` +
    `  (${t("cli.eval.weighting", { concordant: w.concordant_pairs, comparable: w.comparable_pairs })})`
  );

  // Routing
  const r = report.routing;
  console.log(
    `  ${pad(t("cli.eval.label.routing"), 12)} ${scoreColor(r.score)}${formatScore(r.score)}${RESET}` +
    `  (${t("cli.eval.routing", { routed: r.routed, total: r.total, mismatches: r.mismatches.length })})`
  );
  for (const m of r.mismatches.slice(0, 10)) {
    console.log(
      `    ${FG.gray}${t("cli.eval.mismatch")}${RESET} ${t("cli.eval.mismatchDetail", { id: m.feature_id, weight: m.weight, expected: m.expected_model ?? "null", actual: m.actual_model ?? "null" })}`
    );
  }

  // Steering
  const s = report.steering;
  console.log(
    `  ${pad(t("cli.eval.label.steering"), 12)} ${scoreColor(s.score)}${formatScore(s.score)}${RESET}` +
    `  (${t("cli.eval.steering", { scoped: s.scoped_tasks, violations: s.violations.length, conflicts: s.conflicts })})`
  );
  for (const v of s.violations.slice(0, 10)) {
    console.log(`    ${FG.red}${t("cli.eval.overlap")}${RESET} ${t("cli.eval.overlapDetail", { a: v.a, b: v.b, path: v.path })}`);
  }

  // Flow
  const f = report.flow;
  console.log(
    `  ${pad(t("cli.eval.label.flow"), 12)} ${scoreColor(f.score)}${formatScore(f.score)}${RESET}` +
    `  (${t("cli.eval.flow", { succeeded: f.succeeded, total: f.total, failed: f.failed, retries: f.total_retries, peak: f.max_concurrent_observed })})`
  );

  // Overall
  const oc = scoreColor(report.overall);
  console.log("");
  console.log(`  ${pad(t("cli.eval.label.overall"), 12)} ${oc}${BOLD}${formatScore(report.overall)}${RESET}`);
  console.log("");
  console.log(`${DIM}${t("cli.eval.saved", { path: savedPath })}${RESET}`);
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
      outputError(outputFmt, msg("cli.eval.noRecord", { wave: opts.waveId }));
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
        msg("cli.eval.noHistory")
      );
      return;
    }
  }

  // Correlate with the task store (active + archive) for planner estimates
  const tasksById = new Map<string, Task>();
  try {
    const data = loadFeatures(projectRoot, config);
    for (const task of [...data.tasks, ...data.archive]) {
      if (!tasksById.has(task.id)) tasksById.set(task.id, task);
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
