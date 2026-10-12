/**
 * retro.ts — `woco retro`: collect failure signals, group them into the retro
 * skill's improvement categories and print (or save) suggestions by severity.
 *
 *   woco retro [--task <id>] [--quest <id>] [--since <Nd>] [--save] [-o json|toon]
 *
 * `--save` writes .wombo-combo/retros/<YYYY-MM-DD>-<scope>.md (git-tracked).
 * Saved retros are always English and stripped of AI attribution.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { WOMBO_DIR } from "../config";
import { stripAiAttribution } from "../lib/attribution";
import { getFixedT, msg, t, type TFunction } from "../lib/i18n";
import { output, outputError, type OutputFormat } from "../lib/output";
import {
  RETRO_CATEGORIES,
  collectRetroInput,
  deriveCandidates,
  type RetroCandidate,
  type RetroInput,
  type RetroScope,
} from "../lib/retro";

export const RETROS_DIR = "retros";

export interface RetroOptions {
  projectRoot: string;
  scope: RetroScope;
  save?: boolean;
  /** Clock override for deterministic tests (ms since epoch). */
  now?: number;
}

export interface RetroResult {
  input: RetroInput;
  candidates: RetroCandidate[];
  markdown: string;
  savedPath?: string;
}

/** Parse `--since`: `7d` or `7` -> 7. Throws on anything else. */
export function parseSince(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const m = /^(\d+)d?$/.exec(value.trim());
  const days = m ? Number(m[1]) : 0;
  if (days <= 0) throw new Error(`invalid since: ${value}`);
  return days;
}

/** Filename-safe description of the scope; `all` when unscoped. */
export function retroSlug(scope: RetroScope): string {
  const parts: string[] = [];
  if (scope.task) parts.push(scope.task);
  if (scope.quest) parts.push(`quest-${scope.quest}`);
  if (scope.sinceDays !== undefined) parts.push(`${scope.sinceDays}d`);
  return parts.length > 0 ? parts.join("-") : "all";
}

/** Candidates grouped by category (canonical order), keeping severity order inside. */
function groupByCategory(candidates: RetroCandidate[]): { category: string; items: RetroCandidate[] }[] {
  return RETRO_CATEGORIES.map((category) => ({ category, items: candidates.filter((c) => c.category === category) }))
    .filter((g) => g.items.length > 0);
}

function renderBody(tr: TFunction, candidates: RetroCandidate[], md: boolean): string[] {
  const lines: string[] = [];
  for (const { category, items } of groupByCategory(candidates)) {
    lines.push(md ? `## ${tr(`cli.retro.category.${category}`)} (${category})` : `${tr(`cli.retro.category.${category}`)} (${category})`, "");
    for (const c of items) {
      const sev = tr(`cli.retro.severity.${c.severity}`);
      lines.push(md ? `### [${sev}] ${c.title}` : `  [${sev}] ${c.title}`);
      lines.push(md ? `**${tr("cli.retro.suggestion")}:** ${c.suggestion}` : `    ${tr("cli.retro.suggestion")}: ${c.suggestion}`);
      if (c.evidence.length > 0) {
        lines.push(md ? `**${tr("cli.retro.evidence")}:**` : `    ${tr("cli.retro.evidence")}:`);
        for (const e of c.evidence) {
          const where = e.executionId ? `${e.taskId}/${e.executionId}` : e.taskId;
          lines.push(md ? `- \`${where}\`: ${e.quote}` : `      - ${where}: ${e.quote}`);
        }
      }
      lines.push("");
    }
  }
  return lines;
}

function scopeLabel(input: RetroInput): string {
  return retroSlug(input.scope);
}

/** The text report in the active locale. */
export function renderRetroText(candidates: RetroCandidate[], input: RetroInput): string {
  if (candidates.length === 0) return t("cli.retro.noSignals", { scope: scopeLabel(input) });
  const head = t("cli.retro.summary", { count: candidates.length, scope: scopeLabel(input) });
  return [head, "", ...renderBody(t, candidates, false)].join("\n").trimEnd();
}

/** The saved report: English, Markdown, deterministic for a given `now`. */
export function renderRetroMarkdown(candidates: RetroCandidate[], input: RetroInput, now: number): string {
  const tr = getFixedT("en");
  const date = new Date(now).toISOString().slice(0, 10);
  const lines = [`# ${tr("cli.retro.mdTitle", { scope: scopeLabel(input) })}`, "", `${tr("cli.retro.mdDate")}: ${date}`, ""];
  if (candidates.length === 0) lines.push(tr("cli.retro.noSignals", { scope: scopeLabel(input) }));
  else lines.push(tr("cli.retro.summary", { count: candidates.length, scope: scopeLabel(input) }), "", ...renderBody(tr, candidates, true));
  return stripAiAttribution(lines.join("\n").trimEnd()) + "\n";
}

/** Collect, derive, render and optionally save. Nothing is saved without signals. */
export function runRetro(opts: RetroOptions): RetroResult {
  const now = opts.now ?? Date.now();
  const input = collectRetroInput({ projectRoot: opts.projectRoot, scope: opts.scope, now });
  const candidates = deriveCandidates(input);
  const markdown = renderRetroMarkdown(candidates, input, now);
  const result: RetroResult = { input, candidates, markdown };
  if (opts.save && candidates.length > 0) {
    const date = new Date(now).toISOString().slice(0, 10);
    const dir = join(opts.projectRoot, WOMBO_DIR, RETROS_DIR);
    mkdirSync(dir, { recursive: true });
    result.savedPath = join(dir, `${date}-${retroSlug(opts.scope)}.md`);
    writeFileSync(result.savedPath, markdown);
  }
  return result;
}

export interface CmdRetroOptions {
  projectRoot: string;
  outputFmt?: OutputFormat;
  task?: string;
  quest?: string;
  since?: string;
  save?: boolean;
}

export function cmdRetro(opts: CmdRetroOptions): void {
  const fmt = opts.outputFmt ?? "text";
  let sinceDays: number | undefined;
  try {
    sinceDays = parseSince(opts.since);
  } catch {
    return outputError(fmt, msg("cli.retro.invalidSince", { value: opts.since ?? "" }));
  }
  const scope: RetroScope = {};
  if (opts.task) scope.task = opts.task;
  if (opts.quest) scope.quest = opts.quest;
  if (sinceDays !== undefined) scope.sinceDays = sinceDays;

  const res = runRetro({ projectRoot: opts.projectRoot, scope, save: opts.save });
  const saved = res.savedPath ? relative(opts.projectRoot, res.savedPath) : null;
  const data = { scope, since: res.input.since, candidates: res.candidates, saved };
  output(fmt, data, () => {
    console.log(renderRetroText(res.candidates, res.input));
    if (saved) console.log("\n" + t("cli.retro.saved", { path: saved }));
  });
}
