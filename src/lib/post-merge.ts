/**
 * post-merge.ts — Shared post-success pipeline for merges.
 *
 * Called by the merge command (once per fully successful batch) and by the
 * daemon (after each successful terminal merge). Pipeline:
 *
 *   1. Reject failed / unchanged operations
 *   2. Record the operation in the runtime journal (.wombo-combo/post-merge.json)
 *   3. Append a CHANGELOG.md entry and commit ONLY that file, using a temporary
 *      detached worktree — the user's checkout is never touched
 *   4. In open/draft mode: resolve the PR target, refuse same-branch PRs, check
 *      for meaningful changes, push the destination branch (never forced),
 *      and only after a confirmed push create/update ONE cumulative PR per
 *      head/base pair
 *
 * In skip mode only the local changelog work happens; any separately requested
 * auto-push stays with the caller. The coordinator never throws for publication
 * problems: they surface as phase outcomes and warnings so a successful merge is
 * never turned into a failure. The caller owns enqueueMerge; this module never
 * acquires the merge queue.
 *
 * The journal is runtime recovery metadata (gitignored), not a project file.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { WOMBO_DIR, normalizePostMergeConfig, type WomboConfig } from "../config";
import { appendChangelogEntry } from "./changelog";
import {
  createOrUpdatePullRequest,
  defaultCommandRunner,
  resolveRemoteDefaultBranch,
  type CommandResult,
  type CommandRunner,
} from "./github-pr";
import { collectCumulativeReport, sanitizeInline } from "./merge-report";
import type {
  ChangelogOutcome,
  MergeReportInput,
  PostMergeResult,
  PrOutcome,
  PushOutcome,
} from "./post-merge-types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export const POST_MERGE_JOURNAL = `${WOMBO_DIR}/post-merge.json`;
const JOURNAL_VERSION = 1;
const MAX_JOURNAL_OPERATIONS = 200;

export interface PostMergeRequest {
  /** Repository root holding the destination branch and .wombo-combo/ */
  projectRoot: string;
  config: WomboConfig;
  /** The successful operation (destination branch, SHAs, tasks, stable ID) */
  operation: MergeReportInput;
  /** False for failed merges: such operations are rejected */
  mergeSucceeded: boolean;
}

export interface PostMergeDeps {
  /** Command runner for git and gh (inject a fake gh in tests) */
  runner?: CommandRunner;
  /** ISO timestamp provider for changelog entries */
  now?: () => string;
}

interface JournalOperation {
  input: MergeReportInput;
  recordedAt: string;
  changelog?: ChangelogOutcome;
  push?: PushOutcome;
  pr?: PrOutcome;
  /** False while a configured phase failed and publication should be retried */
  complete: boolean;
}

interface Journal {
  version: number;
  operations: Record<string, JournalOperation>;
}

export class PostMergeJournalError extends Error {}

// ---------------------------------------------------------------------------
// Operation IDs
// ---------------------------------------------------------------------------

/** Stable operation ID derived from the destination branch and both SHAs. */
export function computeOperationId(
  destinationBranch: string,
  beforeSha: string,
  afterSha: string
): string {
  const slug =
    destinationBranch
      .replace(/[^A-Za-z0-9._]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "") || "branch";
  return `${slug}-${beforeSha.slice(0, 7)}-${afterSha.slice(0, 7)}`;
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

function journalPath(projectRoot: string): string {
  return resolve(projectRoot, POST_MERGE_JOURNAL);
}

function isJournal(v: any): v is Journal {
  return (
    v &&
    typeof v === "object" &&
    v.version === JOURNAL_VERSION &&
    v.operations &&
    typeof v.operations === "object" &&
    !Array.isArray(v.operations) &&
    Object.values(v.operations).every(
      (o: any) =>
        o &&
        typeof o === "object" &&
        o.input &&
        typeof o.input.operationId === "string" &&
        typeof o.input.destinationBranch === "string" &&
        Array.isArray(o.input.tasks)
    )
  );
}

/** Read the journal. A missing file is empty; a corrupt one raises (never silently reset). */
export function readJournal(projectRoot: string): Journal {
  const p = journalPath(projectRoot);
  if (!existsSync(p)) return { version: JOURNAL_VERSION, operations: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(p, "utf-8"));
  } catch (err: any) {
    throw new PostMergeJournalError(
      `Post-merge journal ${p} is corrupt (${err.message}). Inspect or delete it, then re-run.`
    );
  }
  if (!isJournal(parsed)) {
    throw new PostMergeJournalError(
      `Post-merge journal ${p} has an unexpected format. Inspect or delete it, then re-run.`
    );
  }
  return parsed;
}

function writeJournal(projectRoot: string, journal: Journal): void {
  const p = journalPath(projectRoot);
  mkdirSync(resolve(projectRoot, WOMBO_DIR), { recursive: true });
  // Cap growth: keep the most recent operations
  const entries = Object.entries(journal.operations);
  if (entries.length > MAX_JOURNAL_OPERATIONS) {
    entries.sort((a, b) => (a[1].recordedAt < b[1].recordedAt ? -1 : 1));
    journal.operations = Object.fromEntries(entries.slice(-MAX_JOURNAL_OPERATIONS));
  }
  const tmp = `${p}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(journal, null, 2) + "\n", "utf-8");
    renameSync(tmp, p);
  } finally {
    if (existsSync(tmp)) {
      try {
        unlinkSync(tmp);
      } catch {
        // best effort
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Git helpers (through the injectable runner)
// ---------------------------------------------------------------------------

const LOCAL_TIMEOUT_MS = 60_000;
const PUSH_TIMEOUT_MS = 180_000;

class Git {
  constructor(
    private readonly runner: CommandRunner,
    private readonly cwd: string
  ) {}

  run(args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<CommandResult> {
    return this.runner("git", args, {
      cwd: opts.cwd ?? this.cwd,
      timeoutMs: opts.timeoutMs ?? LOCAL_TIMEOUT_MS,
    });
  }

  /** Run and return trimmed stdout; throws a sanitized error on failure. */
  async out(args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<string> {
    const res = await this.run(args, opts);
    if (res.exitCode !== 0) {
      throw new Error(
        `git ${args[0]} failed: ${sanitizeInline(res.stderr || res.stdout || `exit ${res.exitCode}`, 300)}`
      );
    }
    return res.stdout.trim();
  }

  async ok(args: string[]): Promise<boolean> {
    return (await this.run(args)).exitCode === 0;
  }
}

function validBranchName(name: string): boolean {
  return !!name && !name.startsWith("-") && !/[\u0000- ~^:?*\[\\]/.test(name) && !name.includes("..");
}

// ---------------------------------------------------------------------------
// Changelog phase
// ---------------------------------------------------------------------------

async function removeTempWorktree(git: Git, dir: string): Promise<void> {
  try {
    await git.run(["worktree", "remove", "--force", dir]);
  } catch {
    // fall through to manual cleanup
  }
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
  try {
    await git.run(["worktree", "prune"]);
  } catch {
    // best effort
  }
}

async function runChangelogPhase(
  req: PostMergeRequest,
  git: Git,
  now: () => string
): Promise<ChangelogOutcome> {
  const { operation } = req;
  const branch = operation.destinationBranch;
  if (!validBranchName(branch)) {
    return { status: "failed", message: `Invalid destination branch ${JSON.stringify(branch)}.` };
  }

  let tmp: string | null = null;
  try {
    const tipSha = await git.out(["rev-parse", "--verify", `refs/heads/${branch}^{commit}`]);
    tmp = mkdtempSync(join(tmpdir(), "wombo-changelog-"));
    await git.out(["worktree", "add", "--detach", tmp, tipSha]);

    const result = appendChangelogEntry(tmp, {
      operationId: operation.operationId,
      timestamp: now(),
      tasks: operation.tasks.map((t) => ({ id: t.id, title: t.title })),
    });
    if (!result.changed) {
      return { status: "unchanged", message: "Changelog entry already recorded for this operation." };
    }

    await git.out(["add", "--", "CHANGELOG.md"], { cwd: tmp });

    // Commit with the repository identity when set; otherwise a neutral fallback.
    const identity: string[] = [];
    const name = (await git.run(["config", "user.name"], { cwd: tmp })).stdout.trim();
    const email = (await git.run(["config", "user.email"], { cwd: tmp })).stdout.trim();
    if (!name) identity.push("-c", "user.name=wombo-combo");
    if (!email) identity.push("-c", "user.email=wombo-combo@users.noreply.github.com");
    await git.out(
      [
        ...identity,
        "-c",
        "commit.gpgsign=false",
        "commit",
        "--no-verify",
        "-q",
        "-m",
        `docs(changelog): record merge ${operation.operationId}`,
      ],
      { cwd: tmp }
    );
    const newSha = await git.out(["rev-parse", "HEAD"], { cwd: tmp });

    // Compare-and-swap: only advance the branch if nothing else moved it.
    await git.out(["update-ref", `refs/heads/${branch}`, newSha, tipSha]);
    return { status: "written", commit: newSha };
  } catch (err: any) {
    return {
      status: "failed",
      message: sanitizeInline(`Changelog update failed: ${err?.message ?? err}`, 400),
    };
  } finally {
    if (tmp) await removeTempWorktree(git, tmp);
  }
}

// ---------------------------------------------------------------------------
// Publication phase
// ---------------------------------------------------------------------------

interface PublicationOutcome {
  push: PushOutcome;
  pr: PrOutcome;
}

async function refExists(git: Git, ref: string): Promise<boolean> {
  return git.ok(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
}

function prTitle(tasks: { id: string; title: string }[], head: string): string {
  if (tasks.length === 1) return `Merge ${tasks[0]!.title}`;
  return `Merge ${tasks.length} tasks into ${head}`;
}

async function runPublicationPhase(
  req: PostMergeRequest,
  git: Git,
  runner: CommandRunner,
  journal: Journal | null
): Promise<PublicationOutcome> {
  const pm = normalizePostMergeConfig(req.config.postMerge);
  const head = req.operation.destinationBranch;
  const remote = req.config.git.remote;
  const skipped = (message: string): PublicationOutcome => ({
    push: { status: "skipped", message },
    pr: { status: "skipped", head, message },
  });

  if (!journal) {
    return {
      push: { status: "skipped", message: "Publication skipped: post-merge journal is unavailable." },
      pr: {
        status: "failed",
        head,
        message: "Cannot build a cumulative PR report without a readable post-merge journal.",
      },
    };
  }

  // 1. Resolve the PR target (config, else the remote's default branch)
  let base = pm.prBaseBranch;
  if (!base) {
    const resolved = await resolveRemoteDefaultBranch({ cwd: req.projectRoot, runner }, remote);
    if ("error" in resolved) {
      return {
        push: { status: "skipped", message: "Push skipped: PR target could not be resolved." },
        pr: { status: "failed", head, message: resolved.error.message },
      };
    }
    base = resolved.branch;
  }
  if (!validBranchName(base)) {
    return {
      push: { status: "skipped", message: "Push skipped: invalid PR target." },
      pr: { status: "failed", head, base, message: `Invalid PR target branch ${JSON.stringify(base)}.` },
    };
  }

  // 2. Same-branch refusal: never push or invent a PR
  if (base === head) {
    const msg =
      `Merge destination "${head}" is the same as the PR target, so no meaningful PR can be created. ` +
      `Merge into an integration branch (e.g. a quest branch) or set postMerge.prBaseBranch to a different branch.`;
    return { push: { status: "skipped", message: msg }, pr: { status: "skipped", head, base, message: msg } };
  }

  // 3. Compare against the target as the remote sees it (best-effort refresh)
  const trackingRef = `refs/remotes/${remote}/${base}`;
  const fetchRes = await git.run(
    ["fetch", "--quiet", remote, `+refs/heads/${base}:${trackingRef}`],
    { timeoutMs: PUSH_TIMEOUT_MS }
  );
  let baseRef: string;
  if (await refExists(git, trackingRef)) {
    baseRef = trackingRef;
  } else if (await refExists(git, `refs/heads/${base}`)) {
    baseRef = `refs/heads/${base}`;
  } else {
    const detail = fetchRes.exitCode !== 0 ? ` (${sanitizeInline(fetchRes.stderr, 120)})` : "";
    return {
      push: { status: "skipped", message: "Push skipped: PR target branch not found." },
      pr: {
        status: "failed",
        head,
        base,
        message: `PR target branch "${base}" was not found locally or on remote "${remote}"${detail}. Create or push it, or set postMerge.prBaseBranch.`,
      },
    };
  }
  const headRef = `refs/heads/${head}`;
  if (!(await refExists(git, headRef))) {
    return {
      push: { status: "failed", message: `Destination branch "${head}" does not exist locally.` },
      pr: { status: "skipped", head, base, message: "PR skipped: nothing was pushed." },
    };
  }

  // 4. Meaningful changes?
  let ahead = 0;
  try {
    ahead = Number(await git.out(["rev-list", "--count", `${baseRef}..${headRef}`]));
  } catch (err: any) {
    return {
      push: { status: "skipped", message: "Push skipped: comparison with the PR target failed." },
      pr: { status: "failed", head, base, message: sanitizeInline(String(err?.message ?? err), 300) },
    };
  }
  if (!ahead) {
    return skipped(
      `No changes between ${base} and ${head}; nothing to publish.`
    );
  }

  // 5. Cumulative operations for this head/base pair (those not yet in the target)
  const operations: MergeReportInput[] = [];
  for (const op of Object.values(journal.operations)) {
    if (op.input.destinationBranch !== head) continue;
    const inTarget = await git.ok(["merge-base", "--is-ancestor", op.input.afterSha, baseRef]);
    if (!inTarget || op.input.operationId === req.operation.operationId) {
      operations.push(op.input);
    }
  }
  operations.sort((a, b) => {
    const ra = journal.operations[a.operationId]?.recordedAt ?? "";
    const rb = journal.operations[b.operationId]?.recordedAt ?? "";
    return ra < rb ? -1 : ra > rb ? 1 : a.operationId < b.operationId ? -1 : 1;
  });

  let report;
  try {
    report = collectCumulativeReport(req.projectRoot, { head: headRef, base: baseRef, operations });
  } catch (err: any) {
    return {
      push: { status: "skipped", message: "Push skipped: report generation failed." },
      pr: { status: "failed", head, base, message: sanitizeInline(`Report failed: ${err?.message ?? err}`, 300) },
    };
  }

  // 6. Push (never forced); a failed push prevents PR creation
  const pushRes = await git.run(["push", remote, `${headRef}:${headRef}`], { timeoutMs: PUSH_TIMEOUT_MS });
  if (pushRes.exitCode !== 0) {
    const reason = pushRes.timedOut ? "timed out" : sanitizeInline(pushRes.stderr || pushRes.stdout || `exit ${pushRes.exitCode}`, 300);
    return {
      push: {
        status: "failed",
        message: `Push of ${head} to ${remote} failed (${reason}). The merge and changelog are intact locally; fix the remote problem and re-run the merge to retry publication.`,
      },
      pr: { status: "skipped", head, base, message: "PR skipped because the push failed." },
    };
  }
  const push: PushOutcome = { status: "pushed", message: `Pushed ${head} to ${remote}.` };

  // 7. Create or update the single PR for this pair
  const result = await createOrUpdatePullRequest({
    cwd: req.projectRoot,
    runner,
    remote,
    mode: pm.prMode,
    head,
    base,
    title: prTitle(report.tasks, head),
    body: report.markdown,
  });
  const pr: PrOutcome = {
    status: result.status,
    head,
    base,
    ...(result.url ? { url: result.url } : {}),
    ...(result.message ? { message: result.message } : {}),
  };
  return { push, pr };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function rejected(operationId: string, reason: string): PostMergeResult {
  return {
    operationId,
    changelog: { status: "skipped", message: reason },
    push: { status: "skipped", message: reason },
    pr: { status: "skipped", message: reason },
    warnings: [reason],
  };
}

function isComplete(
  mode: string,
  changelogEnabled: boolean,
  changelog: ChangelogOutcome,
  push: PushOutcome,
  pr: PrOutcome
): boolean {
  if (changelogEnabled && changelog.status === "failed") return false;
  if (mode === "skip") return true;
  return push.status !== "failed" && pr.status !== "failed";
}

/**
 * Run the post-merge pipeline for one successful merge operation.
 * Never throws for changelog/publication problems.
 */
export async function runPostMerge(
  req: PostMergeRequest,
  deps: PostMergeDeps = {}
): Promise<PostMergeResult> {
  const { operation } = req;
  const opId = operation.operationId;

  if (!req.mergeSucceeded) {
    return rejected(opId, "Post-merge skipped: the merge did not succeed.");
  }
  if (!operation.beforeSha || !operation.afterSha || operation.beforeSha === operation.afterSha) {
    return rejected(opId, "Post-merge skipped: the merge produced no changes.");
  }

  const pm = normalizePostMergeConfig(req.config.postMerge);
  if (!pm.changelog && pm.prMode === "skip") {
    return {
      operationId: opId,
      changelog: { status: "skipped", message: "Changelog generation is disabled." },
      push: { status: "skipped", message: "PR mode is skip." },
      pr: { status: "skipped", message: "PR mode is skip." },
      warnings: [],
    };
  }

  const runner = deps.runner ?? defaultCommandRunner;
  const now = deps.now ?? (() => new Date().toISOString());
  const git = new Git(runner, req.projectRoot);
  const warnings: string[] = [];

  // Journal: record the operation before any side effect
  let journal: Journal | null = null;
  try {
    journal = readJournal(req.projectRoot);
    if (!journal.operations[opId]) {
      journal.operations[opId] = { input: operation, recordedAt: now(), complete: false };
      writeJournal(req.projectRoot, journal);
    }
  } catch (err: any) {
    warnings.push(sanitizeInline(String(err?.message ?? err), 400));
    journal = null;
  }

  // Changelog
  let changelog: ChangelogOutcome;
  if (pm.changelog) {
    changelog = await runChangelogPhase(req, git, now);
    if (changelog.status === "failed") warnings.push(changelog.message ?? "Changelog update failed.");
  } else {
    changelog = { status: "skipped", message: "Changelog generation is disabled." };
  }

  // Publication
  let push: PushOutcome = { status: "skipped", message: "PR mode is skip." };
  let pr: PrOutcome = { status: "skipped", message: "PR mode is skip." };
  if (pm.prMode !== "skip") {
    try {
      ({ push, pr } = await runPublicationPhase(req, git, runner, journal));
    } catch (err: any) {
      pr = { status: "failed", message: sanitizeInline(`Publication failed: ${err?.message ?? err}`, 400) };
      push = { status: "skipped", message: "Publication aborted." };
    }
    if (push.status === "failed" && push.message) warnings.push(push.message);
    if (pr.status === "failed" && pr.message) warnings.push(pr.message);
    if (pr.status === "skipped" && pr.message && push.status !== "pushed") warnings.push(pr.message);
  }

  // Persist phase outcomes
  if (journal) {
    try {
      const fresh = readJournal(req.projectRoot);
      const entry = fresh.operations[opId] ?? { input: operation, recordedAt: now(), complete: false };
      entry.changelog = changelog;
      entry.push = push;
      entry.pr = pr;
      entry.complete = isComplete(pm.prMode, pm.changelog, changelog, push, pr);
      fresh.operations[opId] = entry;
      writeJournal(req.projectRoot, fresh);
    } catch (err: any) {
      warnings.push(sanitizeInline(String(err?.message ?? err), 400));
    }
  }

  return { operationId: opId, changelog, push, pr, warnings: [...new Set(warnings)] };
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

/** Operations whose configured phases did not complete (e.g. failed push). */
export function listIncompleteOperations(projectRoot: string): MergeReportInput[] {
  const journal = readJournal(projectRoot);
  return Object.values(journal.operations)
    .filter((o) => !o.complete)
    .sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1))
    .map((o) => o.input);
}

/**
 * Re-run post-merge for operations whose publication was interrupted or failed.
 * Safe to repeat: changelog markers, push idempotence and PR lookup prevent
 * duplicates. Only acts when publication or changelog work is configured.
 */
export async function resumeIncompleteOperations(
  projectRoot: string,
  config: WomboConfig,
  deps: PostMergeDeps = {}
): Promise<PostMergeResult[]> {
  const pm = normalizePostMergeConfig(config.postMerge);
  if (!pm.changelog && pm.prMode === "skip") return [];
  let pending: MergeReportInput[];
  try {
    pending = listIncompleteOperations(projectRoot);
  } catch (err: any) {
    return [
      {
        operationId: "journal",
        changelog: { status: "skipped" },
        push: { status: "skipped" },
        pr: { status: "skipped" },
        warnings: [sanitizeInline(String(err?.message ?? err), 400)],
      },
    ];
  }
  const results: PostMergeResult[] = [];
  for (const operation of pending) {
    results.push(await runPostMerge({ projectRoot, config, operation, mergeSucceeded: true }, deps));
  }
  return results;
}
