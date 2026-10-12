/**
 * replay-diff.ts — Bounded, read-only capture of an agent worktree's diff.
 *
 * `git diff <baseline>` in the worktree covers committed changes since the
 * execution's baseline plus uncommitted changes to tracked files. Untracked,
 * non-ignored files are appended as new-file diffs (`git diff --no-index`
 * against /dev/null, so the index is never touched; at most
 * MAX_UNTRACKED_FILES files). Wombo-combo runtime paths are excluded (same
 * list as analytics measurement). The diff text is cut at REPLAY_LIMITS.diff with
 * an explicit marker. Never throws; failures become diagnostics. Only
 * read-only git commands run, with argument arrays (no shell).
 */

import { spawnSync } from "node:child_process";
import { EXCLUDED_PATH_PREFIXES } from "./analytics-git";
import { REPLAY_LIMITS, truncateText, type DiffFileStat } from "./replay";

export interface WorktreeDiff {
  diff: string;
  truncated: boolean;
  files: DiffFileStat[];
  baseline: string | null;
  diagnostics: string[];
}

function pathspecs(): string[] {
  return ["--", ".", ...EXCLUDED_PATH_PREFIXES.map((p) => `:(exclude)${p}`)];
}

/** Upper bound on untracked files diffed individually. */
export const MAX_UNTRACKED_FILES = 200;

function runGit(
  cwd: string,
  args: string[],
  okStatuses: number[] = [0],
): { ok: boolean; stdout: string; error: string } {
  try {
    const res = spawnSync("git", args, {
      cwd,
      encoding: "utf-8",
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
    if (res.error) return { ok: false, stdout: "", error: res.error.message };
    if (res.status === null || !okStatuses.includes(res.status)) return { ok: false, stdout: "", error: (res.stderr ?? "").trim() || `git exited with ${res.status}` };
    return { ok: true, stdout: res.stdout ?? "", error: "" };
  } catch (err) {
    return { ok: false, stdout: "", error: err instanceof Error ? err.message : String(err) };
  }
}

export function captureWorktreeDiff(worktree: string, baselineHead: string | null): WorktreeDiff {
  const out: WorktreeDiff = { diff: "", truncated: false, files: [], baseline: baselineHead, diagnostics: [] };
  const rev = baselineHead ?? "HEAD";
  const base = ["diff", "--no-color", "--no-ext-diff", "--no-renames"];

  const diff = runGit(worktree, [...base, rev, ...pathspecs()]);
  if (!diff.ok) {
    out.diagnostics.push(`git diff failed: ${diff.error}`);
    return out;
  }
  const untracked = untrackedPaths(worktree, out.diagnostics);
  let fullDiff = diff.stdout;
  for (const file of untracked) {
    if (fullDiff.length > REPLAY_LIMITS.diff) break; // already truncated; numstat still lists the rest
    const d = runGit(worktree, [...base, "--no-index", "--", "/dev/null", file], [0, 1]);
    if (d.ok) fullDiff += (fullDiff && !fullDiff.endsWith("\n") ? "\n" : "") + d.stdout;
    else out.diagnostics.push(`git diff (untracked ${file}) failed: ${d.error}`);
  }
  const cut = truncateText(fullDiff, REPLAY_LIMITS.diff);
  out.diff = cut.text;
  out.truncated = cut.truncated;

  const stat = runGit(worktree, [...base, "--numstat", rev, ...pathspecs()]);
  if (!stat.ok) {
    out.diagnostics.push(`git diff --numstat failed: ${stat.error}`);
    return out;
  }
  parseNumstat(stat.stdout, out.files);
  for (const file of untracked) {
    if (out.files.some((f) => f.path === file)) continue;
    const s = runGit(worktree, [...base, "--numstat", "--no-index", "--", "/dev/null", file], [0, 1]);
    if (s.ok) parseNumstat(s.stdout, out.files, file);
  }
  return out;
}

function parseNumstat(text: string, files: DiffFileStat[], forcePath?: string): void {
  for (const line of text.split("\n")) {
    if (!line) continue;
    const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
    if (!m) continue;
    files.push({
      path: forcePath ?? m[3],
      additions: m[1] === "-" ? null : Number(m[1]),
      deletions: m[2] === "-" ? null : Number(m[2]),
    });
  }
}

/** Untracked, non-ignored files (runtime paths excluded), sorted, bounded. */
function untrackedPaths(worktree: string, diagnostics: string[]): string[] {
  const res = runGit(worktree, ["ls-files", "--others", "--exclude-standard", "-z", ...pathspecs()]);
  if (!res.ok) {
    diagnostics.push(`git ls-files failed: ${res.error}`);
    return [];
  }
  const all = res.stdout.split("\0").filter(Boolean).sort();
  if (all.length > MAX_UNTRACKED_FILES) diagnostics.push(`${all.length - MAX_UNTRACKED_FILES} untracked files not included in diff`);
  return all.slice(0, MAX_UNTRACKED_FILES);
}

export type DiffLineKind = "add" | "del" | "hunk" | "meta" | "ctx";

/** Classify one unified-diff line for coloring. */
export function classifyDiffLine(line: string): DiffLineKind {
  if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ")) return "meta";
  if (line.startsWith("new file mode") || line.startsWith("deleted file mode") || line.startsWith("Binary files")) return "meta";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  return "ctx";
}
