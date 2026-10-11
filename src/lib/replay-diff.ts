/**
 * replay-diff.ts — Bounded, read-only capture of an agent worktree's diff.
 *
 * `git diff <baseline>` in the worktree covers committed changes since the
 * execution's baseline plus uncommitted changes to tracked files. Untracked
 * files are not included. Wombo-combo runtime paths are excluded (same list
 * as analytics measurement). The diff text is cut at REPLAY_LIMITS.diff with
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

function runGit(cwd: string, args: string[]): { ok: boolean; stdout: string; error: string } {
  try {
    const res = spawnSync("git", args, {
      cwd,
      encoding: "utf-8",
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
    if (res.error) return { ok: false, stdout: "", error: res.error.message };
    if (res.status !== 0) return { ok: false, stdout: "", error: (res.stderr ?? "").trim() || `git exited with ${res.status}` };
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
  const cut = truncateText(diff.stdout, REPLAY_LIMITS.diff);
  out.diff = cut.text;
  out.truncated = cut.truncated;

  const stat = runGit(worktree, [...base, "--numstat", rev, ...pathspecs()]);
  if (!stat.ok) {
    out.diagnostics.push(`git diff --numstat failed: ${stat.error}`);
    return out;
  }
  for (const line of stat.stdout.split("\n")) {
    if (!line) continue;
    const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
    if (!m) continue;
    out.files.push({
      path: m[3],
      additions: m[1] === "-" ? null : Number(m[1]),
      deletions: m[2] === "-" ? null : Number(m[2]),
    });
  }
  return out;
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
