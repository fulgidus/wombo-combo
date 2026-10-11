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

import { msg, t } from "../lib/i18n";
import { output, outputError, type OutputFormat } from "../lib/output";
import { renderGeneric } from "../lib/toon";
import {
  LABEL_CATALOG,
  ensureLabels,
  type GitHubClient,
} from "../lib/sync/github-client";
import { loadConfig, normalizeSyncGithubConfig, SYNC_MIN_INTERVAL_SECONDS } from "../config";
import { configuredRepo, resolveSyncContext, type SyncContext } from "../lib/sync/context";
import {
  cycleChangeCount,
  cycleProblem,
  runSyncCycle,
  watchDelayMs,
  type CycleReport,
} from "../lib/sync/cycle";
import { pullFromGitHub, type PullReport } from "../lib/sync/pull";
import { postRemoteNotices, type NoticeReport } from "../lib/sync/push";
import { parseSyncRef, pushToGitHub, syncStatus, type PushReport, type SyncStatusReport } from "../lib/sync/push";

export { configuredRepo, resolveSyncContext, watchDelayMs };
export type { SyncContext };

export interface SyncOptions {
  projectRoot: string;
  outputFmt?: OutputFormat;
  dryRun?: boolean;
  only?: string;
  /** watch: run a single cycle and return */
  once?: boolean;
  /** watch: seconds between cycles (default: config sync.github.intervalSeconds) */
  intervalSeconds?: number;
  /** watch test seams */
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
  /** watch: external stop signal (tests); SIGINT/SIGTERM also stop it */
  signal?: AbortSignal;
  /** Test seam: use this client instead of resolving token and repo */
  client?: GitHubClient;
}

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

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

// ---------------------------------------------------------------------------
// pull
// ---------------------------------------------------------------------------

function printPull(report: PullReport, notices: NoticeReport, repo: string): void {
  console.log(`${BOLD}${t(report.dryRun ? "cli.sync.pull.headingDry" : "cli.sync.pull.heading", { repo })}${RESET}`);
  const section = (key: string, lines: string[]) => {
    if (lines.length === 0) return;
    console.log(t(key, { count: lines.length }));
    for (const l of lines) console.log(`  ${l}`);
  };
  section("cli.sync.pull.created", report.tasksCreated);
  section("cli.sync.pull.updated", report.tasksUpdated);
  section("cli.sync.pull.status", report.statusChanged.map((s) => `${s.ref}: ${s.from} -> ${s.to}`));
  section("cli.sync.pull.comments", report.commentsAdded.map((c) => `${c.ref} ${DIM}#${c.githubId}${RESET}`));
  section("cli.sync.pull.conflicts", report.conflicts.map((c) => `${c.ref}: ${c.fields.join(", ")}`));
  section("cli.sync.pull.skipped", report.skipped.map((s) => `${s.ref}: ${s.reason}`));
  if (notices.posted.length > 0) console.log(t("cli.sync.pull.notices", { count: notices.posted.length }));
  if (report.rateLimited) console.error(t("cli.sync.pull.rateLimited"));
  const errors = [...report.errors, ...notices.errors];
  if (errors.length > 0) {
    console.error(t("cli.sync.pull.errors", { count: errors.length }));
    for (const e of errors) console.error(`  ${e.ref}: ${e.error}`);
  }
}

export async function cmdSyncPull(opts: SyncOptions): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  const client = await clientFor(opts, fmt);
  let report: PullReport;
  let notices: NoticeReport;
  try {
    report = await pullFromGitHub({ projectRoot: opts.projectRoot, client, dryRun: opts.dryRun });
    // Pull never writes to GitHub itself; conflict notices go out through the push side.
    notices = await postRemoteNotices(client, report.pendingRemoteNotices, { dryRun: opts.dryRun, projectRoot: opts.projectRoot });
  } catch (err) {
    return failure(fmt, err);
  }
  const data = { ...report, noticesPosted: notices.posted, noticeErrors: notices.errors };
  output(fmt, data, () => printPull(report, notices, repoLabel(client)), () => console.log(renderGeneric(data)));
  if (report.errors.length > 0 || notices.errors.length > 0 || report.rateLimited) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// run (one cycle) and watch (loop)
// ---------------------------------------------------------------------------

function pullEnabled(projectRoot: string): boolean {
  try {
    return normalizeSyncGithubConfig(loadConfig(projectRoot).sync).pull;
  } catch {
    return true;
  }
}

function printCycle(r: CycleReport, repo: string): void {
  if (r.pull) printPull(r.pull, r.notices, repo);
  printPush(r.push, repo);
}

export async function cmdSyncRun(opts: SyncOptions): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  const client = await clientFor(opts, fmt);
  let report: CycleReport;
  try {
    report = await runSyncCycle({
      projectRoot: opts.projectRoot,
      client,
      dryRun: opts.dryRun,
      pull: pullEnabled(opts.projectRoot),
      warn: (m) => console.error(m),
    });
  } catch (err) {
    return failure(fmt, err);
  }
  output(fmt, report, () => printCycle(report, repoLabel(client)), () => console.log(renderGeneric(report)));
  if (cycleProblem(report)) process.exitCode = 1;
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done);
  });
}

export async function cmdSyncWatch(opts: SyncOptions): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  const client = await clientFor(opts, fmt);
  const cfg = normalizeSyncGithubConfig(loadConfig(opts.projectRoot).sync);
  const interval = Math.max(SYNC_MIN_INTERVAL_SECONDS, opts.intervalSeconds ?? cfg.intervalSeconds);
  const repo = repoLabel(client);
  const sleep = opts.sleep ?? abortableSleep;
  const random = opts.random ?? Math.random;

  const ac = new AbortController();
  const onStop = () => ac.abort();
  opts.signal?.addEventListener("abort", onStop);
  process.on("SIGINT", onStop);
  process.on("SIGTERM", onStop);

  if (fmt === "text" && !opts.once) console.log(t("cli.sync.watch.started", { repo, seconds: interval }));
  let failures = 0;
  let cycle = 0;
  let lastFailed = false;
  try {
    while (!ac.signal.aborted) {
      cycle++;
      const stamp = new Date().toISOString();
      let problem: string | null = null;
      try {
        const report = await runSyncCycle({
          projectRoot: opts.projectRoot,
          client,
          dryRun: opts.dryRun,
          pull: cfg.pull,
          warn: (m) => console.error(m),
        });
        problem = cycleProblem(report);
        const { pulled, pushed } = cycleChangeCount(report);
        if (fmt === "text") console.log(t("cli.sync.watch.cycle", { time: stamp, n: cycle, pulled, pushed }));
        else console.log(JSON.stringify({ cycle, time: stamp, ok: problem === null, ...(problem ? { error: problem } : {}), pulled, pushed }));
      } catch (err) {
        problem = err instanceof Error ? err.message : String(err);
      }
      lastFailed = problem !== null;
      failures = problem === null ? 0 : failures + 1;
      const delay = watchDelayMs(interval, failures, random);
      if (problem !== null) {
        if (fmt === "text") console.error(t("cli.sync.watch.failed", { time: stamp, error: problem, seconds: Math.round(delay / 1000) }));
        else console.log(JSON.stringify({ cycle, time: stamp, ok: false, error: problem, retryInSeconds: Math.round(delay / 1000) }));
      }
      if (opts.once) break;
      await sleep(delay, ac.signal);
    }
  } finally {
    process.off("SIGINT", onStop);
    process.off("SIGTERM", onStop);
    opts.signal?.removeEventListener("abort", onStop);
  }
  if (fmt === "text" && !opts.once) console.log(t("cli.sync.watch.stopped"));
  if (opts.once && lastFailed) process.exitCode = 1;
}
