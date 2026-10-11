/**
 * cycle.ts — One GitHub sync cycle (pull, post conflict notices, push) and the
 * process-wide serialisation shared by `sync run|watch`, the daemon loop and
 * the write-through hook.
 *
 *  - Everything that talks to the mapping files goes through runExclusive(),
 *    so two sync operations in one process never interleave (single-flight).
 *  - runCycleSingleFlight() additionally refuses to start a cycle while another
 *    is running (periodic callers just skip that tick).
 *  - Pull never writes to GitHub; its conflict notices are posted here, via the
 *    push side's postRemoteNotices().
 */

import { SYNC_MIN_INTERVAL_SECONDS } from "../../config";
import { pullFromGitHub, type PullReport } from "./pull";
import {
  postRemoteNotices,
  pushToGitHub,
  type NoticeReport,
  type PushReport,
} from "./push";
import type { GitHubClient } from "./github-client";

export interface CycleOptions {
  projectRoot: string;
  client: GitHubClient;
  /** Pull before pushing (default true) */
  pull?: boolean;
  dryRun?: boolean;
  warn?: (msg: string) => void;
}

export interface CycleReport {
  pull: PullReport | null;
  notices: NoticeReport;
  push: PushReport;
}

/**
 * Delay before the next periodic cycle: the interval plus up to 10% jitter,
 * doubling per consecutive failure (capped at 15 minutes).
 */
export function watchDelayMs(intervalSeconds: number, failures: number, random: () => number = Math.random): number {
  const base = Math.max(intervalSeconds, SYNC_MIN_INTERVAL_SECONDS) * 1000;
  const backoff = Math.min(base * 2 ** Math.max(0, failures), 15 * 60_000);
  return Math.round(Math.max(backoff, base) * (1 + 0.1 * random()));
}

let chain: Promise<unknown> = Promise.resolve();

/** Run fn after every previously queued sync operation in this process has settled. */
export function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

/** Pull (optional), post notices, push. Serialised with every other sync operation. Throws on transport failures. */
export function runSyncCycle(opts: CycleOptions): Promise<CycleReport> {
  return runExclusive(async () => {
    const dryRun = opts.dryRun === true;
    let pull: PullReport | null = null;
    let notices: NoticeReport = { posted: [], errors: [] };
    if (opts.pull !== false) {
      pull = await pullFromGitHub({ projectRoot: opts.projectRoot, client: opts.client, dryRun });
      if (pull.rateLimited) {
        return { pull, notices, push: emptyPush(dryRun) };
      }
      notices = await postRemoteNotices(opts.client, pull.pendingRemoteNotices, { dryRun, projectRoot: opts.projectRoot });
    }
    const push = await pushToGitHub({ projectRoot: opts.projectRoot, client: opts.client, dryRun, warn: opts.warn });
    return { pull, notices, push };
  });
}

let cycleInFlight: Promise<CycleReport> | null = null;

/** Like runSyncCycle, but returns null (does nothing) when a cycle started by this function is still running. */
export function runCycleSingleFlight(opts: CycleOptions): Promise<CycleReport> | null {
  if (cycleInFlight) return null;
  const p = runSyncCycle(opts).finally(() => {
    cycleInFlight = null;
  });
  cycleInFlight = p;
  return p;
}

export function emptyPush(dryRun = false): PushReport {
  return { dryRun, created: [], updated: [], unchanged: [], commented: [], labelsCreated: [], errors: [] };
}

/** Number of things a cycle changed, locally plus on GitHub. */
export function cycleChangeCount(r: CycleReport): { pulled: number; pushed: number } {
  const p = r.pull;
  const pulled = p
    ? p.tasksCreated.length + p.tasksUpdated.length + p.commentsAdded.length + p.conflicts.length
    : 0;
  const pushed =
    r.push.created.length + r.push.updated.length + r.push.commented.length + r.notices.posted.length;
  return { pulled, pushed };
}

/** Why a cycle counts as failed (for backoff), or null when it went fine. */
export function cycleProblem(r: CycleReport): string | null {
  if (r.pull?.rateLimited) return "GitHub rate limit reached";
  const first = r.pull?.errors[0] ?? r.push.errors[0] ?? r.notices.errors[0];
  return first ? `${first.ref}: ${first.error}` : null;
}
