/**
 * replay.ts — List and show recorded agent session replays.
 *
 * Usage:
 *   woco replay list [feature-id]                          Recorded executions
 *   woco replay show <feature-id>                          Latest execution
 *   woco replay show <feature-id> --execution 2            2nd execution (1-based, oldest first)
 *   woco replay show <feature-id> --execution <exec-id>    A specific execution id
 *   woco replay show <feature-id> --output json            Structured replay
 *
 * Reads .wombo-combo/replays/<feature-id>/<execution-id>.jsonl.
 */

import { output, outputError, type OutputFormat } from "../lib/output";
import { msg, t, getFixedT, type TFunction } from "../lib/i18n";
import { ReplayStore, recordLabel, type LoadedReplay, type ReplaySummary } from "../lib/replay";

export interface ReplayCommandOptions {
  projectRoot: string;
  outputFmt: OutputFormat;
}

/** Resolve `--execution` (1-based index or full execution id); default latest. */
export function resolveExecution(
  summaries: ReplaySummary[],
  selector?: string,
  tf: TFunction = t,
): ReplaySummary | string {
  if (summaries.length === 0) return tf("cli.replay.noExecutions");
  if (selector === undefined || selector === "") return summaries[summaries.length - 1];
  if (/^\d+$/.test(selector)) {
    const n = Number(selector);
    if (n < 1 || n > summaries.length) return tf("cli.replay.outOfRange", { n, max: summaries.length });
    return summaries[n - 1];
  }
  const byId = summaries.find((s) => s.execution_id === selector);
  return byId ?? tf("cli.replay.unknownExecution", { selector });
}

function fmtTime(iso: string | null): string {
  return iso ? iso.replace("T", " ").slice(0, 19) : "-";
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

export function cmdReplayList(opts: ReplayCommandOptions & { featureId?: string }): void {
  const store = new ReplayStore(opts.projectRoot);
  const rows = store.list(opts.featureId);
  output(
    opts.outputFmt,
    { executions: rows.map(({ path: _path, ...rest }) => rest) },
    () => {
      if (rows.length === 0) {
        console.log(
          opts.featureId
            ? t("cli.replay.list.noneFor", { id: opts.featureId })
            : t("cli.replay.list.none"),
        );
        console.log(t("cli.replay.list.hint"));
        return;
      }
      const idx = new Map<string, number>();
      console.log(
        `${pad(t("cli.replay.list.colTask"), 28)} ${pad("#", 3)} ${pad(t("cli.replay.list.colOutcome"), 10)} ${pad(t("cli.replay.list.colEvents"), 7)} ${pad(t("cli.replay.list.colStarted"), 19)} ${t("cli.replay.list.colExecution")}`,
      );
      for (const r of rows) {
        const n = (idx.get(r.task_id) ?? 0) + 1;
        idx.set(r.task_id, n);
        console.log(
          `${pad(r.task_id, 28)} ${pad(String(n), 3)} ${pad(r.outcome, 10)} ${pad(String(r.event_count), 7)} ${pad(fmtTime(r.started_at), 19)} ${r.execution_id}`,
        );
      }
    },
  );
}

export function cmdReplayShow(opts: ReplayCommandOptions & { featureId: string; execution?: string }): void {
  const store = new ReplayStore(opts.projectRoot);
  const summaries = store.list(opts.featureId);
  if (summaries.length === 0) {
    outputError(opts.outputFmt, msg("cli.replay.list.noneFor", { id: opts.featureId }));
  }
  const picked = resolveExecution(
    summaries,
    opts.execution,
    opts.outputFmt === "text" ? t : getFixedT("en"),
  );
  if (typeof picked === "string") {
    outputError(opts.outputFmt, msg("cli.replay.show.pickFailed", { id: opts.featureId, reason: picked }));
  }
  const replay = store.load(picked.task_id, picked.execution_id);
  if (!replay) outputError(opts.outputFmt, msg("cli.replay.show.unreadable", { id: picked.execution_id }));

  const index = summaries.indexOf(picked) + 1;
  output(
    opts.outputFmt,
    {
      task_id: replay.task_id,
      execution_id: replay.execution_id,
      index,
      executions: summaries.length,
      outcome: picked.outcome,
      header: replay.header,
      prompt: replay.prompt,
      records: replay.records.filter((r) => r.kind === "event" || r.kind === "attempt" || r.kind === "end"),
      diff: replay.diff,
      end: replay.end,
      diagnostics: replay.diagnostics,
    },
    () => renderText(replay, index, summaries.length, picked),
  );
}

function renderText(replay: LoadedReplay, index: number, total: number, summary: ReplaySummary): void {
  const h = replay.header;
  console.log(t("cli.replay.show.heading", { task: replay.task_id, index, total, execution: replay.execution_id }));
  console.log(
    t("cli.replay.show.meta", {
      outcome: summary.outcome,
      agent: h?.agent ?? "-",
      model: h?.model ?? "-",
      started: fmtTime(summary.started_at),
    }),
  );
  if (replay.prompt !== null) {
    const lines = replay.prompt.split("\n");
    console.log(`\n${t("cli.replay.show.prompt")}`);
    for (const l of lines.slice(0, 12)) console.log(`  ${l}`);
    if (lines.length > 12) console.log(t("cli.replay.show.moreLines", { count: lines.length - 12 }));
  }
  const t0 = Date.parse(replay.records[0]?.t ?? "") || 0;
  console.log(`\n${t("cli.replay.show.timeline")}`);
  for (const r of replay.records) {
    if (r.kind === "header" || r.kind === "prompt") continue;
    const secs = Math.max(0, (Date.parse(r.t) - t0) / 1000);
    console.log(`  +${secs.toFixed(1).padStart(6)}s  ${recordLabel(r)}`);
  }
  if (replay.diff) {
    console.log(
      `\n${t(replay.diff.truncated ? "cli.replay.show.diffTruncated" : "cli.replay.show.diff", { count: replay.diff.files.length })}`,
    );
    for (const f of replay.diff.files) {
      console.log(`  ${f.additions === null ? t("cli.replay.show.binary") : `+${f.additions}/-${f.deletions}`}  ${f.path}`);
    }
  }
  if (replay.diagnostics.length > 0) {
    console.log(`\n${t("cli.replay.show.diagnostics", { count: replay.diagnostics.length })}`);
  }
  if (!replay.end) console.log(`\n${t("cli.replay.show.noEnd")}`);
}
