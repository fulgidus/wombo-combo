/**
 * analytics-git.ts — Read-only git helpers for execution-scoped line metrics.
 *
 * - captureHead() resolves HEAD to an immutable commit id.
 * - measureLineChanges() compares two immutable commits and reports
 *   additions/deletions (lines changed = additions + deletions).
 *
 * Limitations: only COMMITTED changes between the two commits are measured.
 * Uncommitted/staged/untracked work in the worktree is not counted. Binary
 * files are counted in `binaryFiles` but contribute no line counts.
 *
 * All git invocations use argument arrays (no shell) and never mutate refs,
 * the index, or worktree contents. Failures never throw; they yield null
 * measurements plus diagnostics.
 */

import { spawnSync } from "node:child_process";

export interface HeadCapture {
  /** Full commit SHA, or null when unavailable. */
  head: string | null;
  diagnostics: string[];
}

export interface LineChangeMeasurement {
  additions: number | null;
  deletions: number | null;
  /** additions + deletions; null when unknown. */
  linesChanged: number | null;
  filesChanged: number | null;
  binaryFiles: number | null;
  /** Resolved immutable commit ids used (null when unresolved). */
  baseline: string | null;
  completion: string | null;
  diagnostics: string[];
}

export interface NumstatEntry {
  /** null for binary files. */
  additions: number | null;
  deletions: number | null;
  path: string;
  /** Previous path for renames/copies. */
  oldPath?: string;
}

/** Paths (prefix match on repo-relative path) excluded from measurement. */
export const EXCLUDED_PATH_PREFIXES: readonly string[] = [
  ".wombo-combo/analytics/",
  ".wombo-combo/usage.jsonl",
  ".wombo-combo/state.json",
  ".wombo-combo/daemon-state.json",
  ".wombo-combo/history/",
  ".wombo-combo/logs/",
  ".wombo-combo/evals/",
  ".wombo-combo/baselines/",
  ".wombo-combo/tui-session.json",
];

export function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATH_PREFIXES.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));
}

interface GitResult {
  ok: boolean;
  stdout: string;
  error: string;
}

function git(cwd: string, args: string[]): GitResult {
  try {
    const res = spawnSync("git", args, {
      cwd,
      encoding: "utf-8",
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
    if (res.error) return { ok: false, stdout: "", error: res.error.message };
    if (res.status !== 0) {
      return { ok: false, stdout: res.stdout ?? "", error: (res.stderr ?? "").trim() || `git exited with ${res.status}` };
    }
    return { ok: true, stdout: res.stdout ?? "", error: "" };
  } catch (err) {
    return { ok: false, stdout: "", error: err instanceof Error ? err.message : String(err) };
  }
}

function resolveCommit(cwd: string, ref: string): { sha: string | null; error: string } {
  if (!ref || ref.startsWith("-")) return { sha: null, error: `invalid ref: ${JSON.stringify(ref)}` };
  const r = git(cwd, ["rev-parse", "--verify", "--quiet", "--end-of-options", `${ref}^{commit}`]);
  const sha = r.stdout.trim();
  if (!r.ok || !sha) return { sha: null, error: `cannot resolve commit for ref ${JSON.stringify(ref)}${r.error ? `: ${r.error}` : ""}` };
  return { sha, error: "" };
}

/** Capture the current HEAD commit of the repository/worktree at `cwd`. */
export function captureHead(cwd: string): HeadCapture {
  const r = resolveCommit(cwd, "HEAD");
  return r.sha ? { head: r.sha, diagnostics: [] } : { head: null, diagnostics: [r.error] };
}

/**
 * Parse `git diff --numstat -z` output. Format per entry:
 *   normal: "<add>\t<del>\t<path>\0"
 *   rename: "<add>\t<del>\t\0<old>\0<new>\0"
 * Binary entries use "-" for counts.
 */
export function parseNumstatZ(output: string): NumstatEntry[] {
  const entries: NumstatEntry[] = [];
  const parts = output.split("\0");
  let i = 0;
  while (i < parts.length) {
    const head = parts[i];
    if (!head) {
      i++;
      continue;
    }
    const m = /^(-|\d+)\t(-|\d+)\t([\s\S]*)$/.exec(head);
    if (!m) {
      i++;
      continue;
    }
    const additions = m[1] === "-" ? null : Number(m[1]);
    const deletions = m[2] === "-" ? null : Number(m[2]);
    if (m[3] === "") {
      const oldPath = parts[i + 1] ?? "";
      const path = parts[i + 2] ?? "";
      entries.push({ additions, deletions, path, oldPath });
      i += 3;
    } else {
      entries.push({ additions, deletions, path: m[3] });
      i++;
    }
  }
  return entries;
}

/**
 * Measure committed line changes from `baseline` to `completion`. Both refs
 * should be immutable commit ids (not a moving branch name). Each chain
 * member must pass its own starting HEAD as `baseline`.
 */
export function measureLineChanges(cwd: string, baseline: string, completion: string): LineChangeMeasurement {
  const unknown = (diagnostics: string[], b: string | null = null, c: string | null = null): LineChangeMeasurement => ({
    additions: null,
    deletions: null,
    linesChanged: null,
    filesChanged: null,
    binaryFiles: null,
    baseline: b,
    completion: c,
    diagnostics,
  });

  const b = resolveCommit(cwd, baseline);
  const c = resolveCommit(cwd, completion);
  const errs = [b.error, c.error].filter(Boolean);
  if (errs.length) return unknown(errs, b.sha, c.sha);

  const diff = git(cwd, ["diff", "--numstat", "-z", "--find-renames", "--no-color", "--no-ext-diff", b.sha!, c.sha!, "--"]);
  if (!diff.ok) return unknown([`git diff failed: ${diff.error}`], b.sha, c.sha);

  let additions = 0;
  let deletions = 0;
  let files = 0;
  let binary = 0;
  for (const e of parseNumstatZ(diff.stdout)) {
    if (isExcludedPath(e.path)) continue;
    files++;
    if (e.additions === null || e.deletions === null) {
      binary++;
      continue;
    }
    additions += e.additions;
    deletions += e.deletions;
  }
  return {
    additions,
    deletions,
    linesChanged: additions + deletions,
    filesChanged: files,
    binaryFiles: binary,
    baseline: b.sha,
    completion: c.sha,
    diagnostics: [],
  };
}
