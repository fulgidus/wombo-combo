/**
 * test-baseline-capture.ts — Capture a quest's test baseline from its base branch.
 *
 * Responsibilities:
 *   - Resolve quest.baseBranch to a pinned commit SHA
 *   - Run the configured install + test commands in a capture-owned,
 *     detached temporary worktree outside the project (never in the user's
 *     checkout, never on a quest/task branch)
 *   - Persist only a completed, usable snapshot via test-baseline.ts
 *   - Reuse an existing compatible snapshot across launches and restarts
 *     without rerunning tests, even when the base branch has advanced
 *   - Deduplicate concurrent captures for the same project + quest
 *   - Always clean up the temporary worktree and directory
 *
 * Failures throw BaselineCaptureError with an actionable message; an
 * established baseline is never silently regenerated.
 */

import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WomboConfig } from "../config";
import { installDeps, resolveCanonicalProjectRoot } from "./worktree";
import { runTests } from "./test-runner";
import {
  checkBaselineUsable,
  createTestBaseline,
  loadTestBaseline,
  saveTestBaseline,
  type TestBaseline,
} from "./test-baseline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnsureQuestTestBaselineOptions {
  /** Project root (any linked worktree; resolved to the canonical root) */
  projectRoot: string;
  questId: string;
  /** quest.baseBranch — the branch to snapshot (normally "main") */
  baseBranch: string;
  /** Effective config (tdd.testCommand, tdd.testTimeout, install.*) */
  config: WomboConfig;
  /** Optional progress logger */
  log?: (msg: string) => void;
}

export type EnsureQuestTestBaselineResult =
  | { status: "disabled" }
  | { status: "reused"; baseline: TestBaseline; path: string }
  | { status: "captured"; baseline: TestBaseline; path: string };

export type BaselineCaptureErrorCode =
  | "corrupt"
  | "incompatible"
  | "resolve-failed"
  | "worktree-failed"
  | "install-failed"
  | "run-failed"
  | "not-usable";

export class BaselineCaptureError extends Error {
  constructor(
    public readonly code: BaselineCaptureErrorCode,
    message: string
  ) {
    super(message);
    this.name = "BaselineCaptureError";
  }
}

// ---------------------------------------------------------------------------
// Git helpers (argument-safe: execFile, no shell)
// ---------------------------------------------------------------------------

function git(args: string[], cwd: string, timeoutMs = 60_000): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      "git",
      args,
      { cwd, encoding: "utf-8", timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git ${args.join(" ")} failed: ${(stderr || error.message).trim()}`));
        } else {
          resolvePromise(stdout);
        }
      }
    );
  });
}

/** Resolve a branch (or any rev) to a full commit SHA */
export async function resolveCommitSha(projectRoot: string, rev: string): Promise<string> {
  if (!rev || rev.startsWith("-")) {
    throw new BaselineCaptureError("resolve-failed", `Invalid base branch "${rev}"`);
  }
  try {
    const out = await git(["rev-parse", "--verify", "--end-of-options", `${rev}^{commit}`], projectRoot);
    return out.trim();
  } catch (err: any) {
    throw new BaselineCaptureError(
      "resolve-failed",
      `Cannot resolve base branch "${rev}" to a commit: ${err.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

const inFlight = new Map<string, Promise<EnsureQuestTestBaselineResult>>();

/**
 * Ensure a test baseline exists for a TDD-enabled quest, capturing it on
 * first use. Concurrent calls for the same canonical project + quest share
 * one capture.
 */
export function ensureQuestTestBaseline(
  opts: EnsureQuestTestBaselineOptions
): Promise<EnsureQuestTestBaselineResult> {
  if (!opts.config.tdd?.enabled) {
    return Promise.resolve({ status: "disabled" });
  }
  const root = resolveCanonicalProjectRoot(opts.projectRoot);
  const key = `${root}\0${opts.questId}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = ensureInner({ ...opts, projectRoot: root }).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/** Reuse an existing snapshot or fail with a diagnostic; null when missing */
function reuseExisting(
  opts: EnsureQuestTestBaselineOptions,
  testCommand: string
): Extract<EnsureQuestTestBaselineResult, { status: "reused" }> | null {
  const loaded = loadTestBaseline(opts.projectRoot, opts.questId);
  switch (loaded.status) {
    case "missing":
      return null;
    case "corrupt":
      throw new BaselineCaptureError(
        "corrupt",
        `Test baseline for quest "${opts.questId}" is corrupt (${loaded.error}). ` +
          `Inspect or delete ${loaded.path} to recapture it.`
      );
    case "incompatible":
      throw new BaselineCaptureError(
        "incompatible",
        `Test baseline for quest "${opts.questId}" is incompatible (${loaded.error}). ` +
          `Delete ${loaded.path} to recapture it.`
      );
    case "ok":
      if (loaded.baseline.testCommand !== testCommand) {
        throw new BaselineCaptureError(
          "incompatible",
          `Test baseline for quest "${opts.questId}" was captured with "${loaded.baseline.testCommand}" ` +
            `but tdd.testCommand is now "${testCommand}". Delete ${loaded.path} to recapture it.`
        );
      }
      return { status: "reused", baseline: loaded.baseline, path: loaded.path };
  }
}

async function ensureInner(
  opts: EnsureQuestTestBaselineOptions
): Promise<EnsureQuestTestBaselineResult> {
  const { projectRoot, questId, baseBranch, config } = opts;
  const log = opts.log ?? (() => {});
  const testCommand = config.tdd.testCommand || "bun test";
  const timeoutMs = config.tdd.testTimeout;

  const reused = reuseExisting(opts, testCommand);
  if (reused) {
    log(`reusing test baseline for quest ${questId} (${reused.baseline.commitSha.slice(0, 8)})`);
    return reused;
  }

  const commitSha = await resolveCommitSha(projectRoot, baseBranch);
  log(`capturing test baseline for quest ${questId} from ${baseBranch} @ ${commitSha.slice(0, 8)}`);

  // Capture-owned temp dir; the worktree is a subdirectory so cleanup can
  // remove exactly what we created.
  const tempDir = mkdtempSync(join(tmpdir(), "wombo-baseline-"));
  const wtPath = join(tempDir, "worktree");
  let worktreeAdded = false;

  try {
    try {
      await git(["worktree", "add", "--detach", wtPath, commitSha], projectRoot);
      worktreeAdded = true;
    } catch (err: any) {
      throw new BaselineCaptureError("worktree-failed", `Cannot create baseline worktree: ${err.message}`);
    }

    if (config.install?.command) {
      try {
        await installDeps(wtPath, `baseline:${questId}`, config);
      } catch (err: any) {
        throw new BaselineCaptureError(
          "install-failed",
          `Installing dependencies for the baseline of ${baseBranch} failed: ${err.message}`
        );
      }
    }

    const run = await runTests(wtPath, testCommand, timeoutMs);
    const baseline = createTestBaseline(
      { questId, sourceBranch: baseBranch, commitSha, testCommand, timeoutMs },
      run
    );

    if (baseline.results.execution !== "completed") {
      throw new BaselineCaptureError(
        "run-failed",
        `Baseline test run on ${baseBranch} did not complete (${baseline.results.execution}). ` +
          `Check tdd.testCommand / tdd.testTimeout.`
      );
    }
    const usable = checkBaselineUsable(baseline);
    if (!usable.usable) {
      throw new BaselineCaptureError(
        "not-usable",
        `Baseline test results on ${baseBranch} cannot be used: ${usable.reason}`
      );
    }

    try {
      const path = saveTestBaseline(projectRoot, baseline);
      log(
        `test baseline saved: ${baseline.results.structured?.failingTestIds.length ?? 0} pre-existing failure(s)`
      );
      return { status: "captured", baseline, path };
    } catch (err) {
      // Another process captured it first — the established snapshot wins.
      const raced = reuseExisting(opts, testCommand);
      if (raced) return raced;
      throw err;
    }
  } finally {
    if (worktreeAdded) {
      await git(["worktree", "remove", "--force", wtPath], projectRoot).catch(() => {});
    }
    rmSync(tempDir, { recursive: true, force: true });
    await git(["worktree", "prune"], projectRoot).catch(() => {});
  }
}
