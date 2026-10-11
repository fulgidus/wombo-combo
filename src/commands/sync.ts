/**
 * sync.ts — `woco sync` commands: push, status, labels.
 *
 *   woco sync push   [--dry-run] [--only <task-id|quest:id>]
 *   woco sync status
 *   woco sync labels [--dry-run]
 *
 * The repo comes from config `sync.github.repo` (read defensively, the config
 * block is typed elsewhere) else the git `origin` remote; the token from
 * GITHUB_TOKEN, GH_TOKEN or `gh auth token`. The token is never printed.
 */

import { loadConfig } from "../config";
import { msg, t, type Msg } from "../lib/i18n";
import { output, outputError, type OutputFormat } from "../lib/output";
import { renderGeneric } from "../lib/toon";
import {
  LABEL_CATALOG,
  createGitHubClient,
  detectRepo,
  ensureLabels,
  resolveToken,
  type GitHubClient,
} from "../lib/sync/github-client";
import { parseSyncRef, pushToGitHub, syncStatus, type PushReport, type SyncStatusReport } from "../lib/sync/push";

export interface SyncOptions {
  projectRoot: string;
  outputFmt?: OutputFormat;
  dryRun?: boolean;
  only?: string;
  /** Test seam: use this client instead of resolving token and repo */
  client?: GitHubClient;
}

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

/** `sync.github.repo` from config, tolerating an absent or malformed block. */
export function configuredRepo(projectRoot: string): string | { owner: string; name: string; host?: string } | null {
  try {
    const cfg = loadConfig(projectRoot) as unknown as { sync?: { github?: { repo?: unknown } } };
    const repo = cfg.sync?.github?.repo;
    if (typeof repo === "string" && repo.trim()) return repo.trim();
    if (repo && typeof repo === "object") {
      const r = repo as { owner?: unknown; name?: unknown; host?: unknown };
      if (typeof r.owner === "string" && typeof r.name === "string") {
        return { owner: r.owner, name: r.name, ...(typeof r.host === "string" ? { host: r.host } : {}) };
      }
    }
  } catch {
    // unreadable config: fall back to the git remote
  }
  return null;
}

export type SyncContext = { ok: true; client: GitHubClient } | { ok: false; error: Msg };

/** Resolve repo and token into a client; ok:false carries a clear message. */
export async function resolveSyncContext(
  projectRoot: string,
  env: Record<string, string | undefined> = process.env,
): Promise<SyncContext> {
  const repo = detectRepo(projectRoot, configuredRepo(projectRoot));
  if (!repo) return { ok: false, error: msg("cli.sync.noRepo") };
  const token = await resolveToken(env);
  if (!token) return { ok: false, error: msg("cli.sync.noToken") };
  return { ok: true, client: createGitHubClient({ token, repo }) };
}

async function clientFor(opts: SyncOptions, fmt: OutputFormat): Promise<GitHubClient> {
  if (opts.client) return opts.client;
  const ctx = await resolveSyncContext(opts.projectRoot);
  if (!ctx.ok) return outputError(fmt, ctx.error);
  return ctx.client;
}

function failure(fmt: OutputFormat, err: unknown): never {
  return outputError(fmt, msg("cli.sync.failed", { error: err instanceof Error ? err.message : String(err) }));
}

function repoLabel(c: GitHubClient): string {
  return `${c.repo.owner}/${c.repo.name}`;
}

// ---------------------------------------------------------------------------
// push
// ---------------------------------------------------------------------------

function printPush(report: PushReport, repo: string): void {
  console.log(`${BOLD}${t(report.dryRun ? "cli.sync.push.headingDry" : "cli.sync.push.heading", { repo })}${RESET}`);
  const section = (key: string, lines: string[]) => {
    if (lines.length === 0) return;
    console.log(`${t(key, { count: lines.length })}`);
    for (const l of lines) console.log(`  ${l}`);
  };
  const item = (i: { ref: string; issue?: number; url?: string }) =>
    `${i.ref}${i.issue ? ` #${i.issue}` : ""}${i.url ? ` ${DIM}${i.url}${RESET}` : ""}`;
  section("cli.sync.push.created", report.created.map(item));
  section("cli.sync.push.updated", report.updated.map(item));
  section("cli.sync.push.commented", report.commented.map((c) => `${c.ref} ${DIM}${c.comment}${RESET}`));
  section("cli.sync.push.labels", report.labelsCreated);
  console.log(t("cli.sync.push.unchanged", { count: report.unchanged.length }));
  if (report.errors.length > 0) {
    console.error(t("cli.sync.push.errors", { count: report.errors.length }));
    for (const e of report.errors) console.error(`  ${e.ref}: ${e.error}`);
  }
}

export async function cmdSyncPush(opts: SyncOptions): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  let only: ReturnType<typeof parseSyncRef> | undefined;
  if (opts.only) {
    try {
      only = parseSyncRef(opts.only);
    } catch {
      return outputError(fmt, msg("cli.sync.invalidOnly", { ref: opts.only }));
    }
  }
  const client = await clientFor(opts, fmt);
  let report: PushReport;
  try {
    report = await pushToGitHub({
      projectRoot: opts.projectRoot,
      client,
      dryRun: opts.dryRun,
      only,
      warn: (m) => console.error(m),
    });
  } catch (err) {
    return failure(fmt, err);
  }
  output(fmt, report, () => printPush(report, repoLabel(client)), () => console.log(renderGeneric(report)));
  if (report.errors.length > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

function printStatus(report: SyncStatusReport, repo: string): void {
  console.log(`${BOLD}${t("cli.sync.status.heading", { repo })}${RESET}`);
  if (report.items.length === 0) console.log(t("cli.sync.status.none"));
  for (const i of report.items) {
    const extra = i.pendingComments > 0 ? ` ${DIM}${t("cli.sync.status.pendingComments", { count: i.pendingComments })}${RESET}` : "";
    console.log(`  ${i.ref}  ${t(`cli.sync.status.state.${i.state}`)}${i.issue ? ` #${i.issue}` : ""}${extra}`);
  }
  if (report.remoteOnly.length > 0) {
    console.log(t("cli.sync.status.remoteOnly", { count: report.remoteOnly.length }));
    for (const r of report.remoteOnly) console.log(`  #${r.issue} ${r.title}`);
  }
  if (report.labelsMissing.length > 0) {
    console.log(t("cli.sync.status.labelsMissing", { count: report.labelsMissing.length, labels: report.labelsMissing.join(", ") }));
  }
}

export async function cmdSyncStatus(opts: SyncOptions): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  const client = await clientFor(opts, fmt);
  let report: SyncStatusReport;
  try {
    report = await syncStatus({ projectRoot: opts.projectRoot, client });
  } catch (err) {
    return failure(fmt, err);
  }
  output(fmt, report, () => printStatus(report, repoLabel(client)), () => console.log(renderGeneric(report)));
}

// ---------------------------------------------------------------------------
// labels
// ---------------------------------------------------------------------------

export async function cmdSyncLabels(opts: SyncOptions): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  const client = await clientFor(opts, fmt);
  let result: { created: string[]; existing: string[]; skipped: string[] };
  try {
    if (opts.dryRun) {
      const have = new Set((await client.listLabels()).map((l) => l.name.toLowerCase()));
      const missing = LABEL_CATALOG.filter((l) => !have.has(l.name.toLowerCase())).map((l) => l.name);
      result = {
        created: missing,
        existing: LABEL_CATALOG.map((l) => l.name).filter((n) => !missing.includes(n)),
        skipped: [],
      };
    } else {
      result = await ensureLabels(client, LABEL_CATALOG, { warn: (m) => console.error(m) });
    }
  } catch (err) {
    return failure(fmt, err);
  }
  const data = { dryRun: opts.dryRun === true, ...result };
  output(fmt, data, () => {
    console.log(
      t(opts.dryRun ? "cli.sync.labels.summaryDry" : "cli.sync.labels.summary", {
        created: result.created.length,
        existing: result.existing.length,
        skipped: result.skipped.length,
      }),
    );
    for (const n of result.created) console.log(`  + ${n}`);
  }, () => console.log(renderGeneric(data)));
}
