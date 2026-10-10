/**
 * merge-report.ts — Structured, deterministic merge reports.
 *
 * Responsibilities:
 *   - Convert FullVerificationResult into the compact VerificationSummary
 *   - Derive affected files from explicit before/after SHAs (never from the
 *     user's current checkout) via NUL-delimited `git diff --name-status -z`
 *   - Render Markdown with Summary, Affected Files and Test Results sections
 *   - Render cumulative reports for branch-pair PRs, where affected files come
 *     from the real PR comparison (target...head) and task summaries combine
 *     the recorded successful operations
 *
 * Output is deterministic (sorted, deduplicated, no timestamps) and escaped so
 * task titles and file names cannot inject Markdown. Reports never contain raw
 * build logs, environment values or credentials: only compact outcomes.
 *
 * This module does not write CHANGELOG.md, push branches or invoke GitHub.
 */

import { spawnSync } from "node:child_process";
import type { FullVerificationResult } from "./verifier";
import type {
  ChangedFile,
  ChangedFileStatus,
  MergeReport,
  MergeReportInput,
  MergeReportTask,
  VerificationCheckSummary,
  VerificationSummary,
} from "./post-merge-types";

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/** Maximum number of files listed in a rendered report */
export const MAX_REPORTED_FILES = 500;
const MAX_REASON_LENGTH = 160;
const MAX_TITLE_LENGTH = 200;

// ---------------------------------------------------------------------------
// Text sanitizing and Markdown escaping
// ---------------------------------------------------------------------------

const ANSI_RE = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/g;
const SECRET_RE =
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b|\b[\w-]*(?:token|secret|password|passwd|api[_-]?key)[\w-]*\s*[=:]\s*\S+/gi;

/**
 * Collapse text to one short, printable line with credential-looking values
 * redacted. Used for every free-form string that ends up in a report.
 */
export function sanitizeInline(text: string, max = MAX_REASON_LENGTH): string {
  let out = String(text ?? "")
    .replace(ANSI_RE, "")
    .replace(SECRET_RE, "[redacted]")
    .replace(CONTROL_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (out.length > max) out = out.slice(0, max - 1).trimEnd() + "…";
  return out;
}

/** Escape Markdown-sensitive characters in inline prose (titles, reasons). */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/[\\`*_\[\]<>#|~&]/g, (c) => `\\${c}`)
    .replace(/@/g, "@​"); // never trigger @mentions
}

/** Render text as an inline code span that survives backticks and control characters. */
export function codeSpan(text: string): string {
  const visible = text.replace(/[\u0000-\u001f\u007f]/g, (c) => {
    if (c === "\n") return "\\n";
    if (c === "\r") return "\\r";
    if (c === "\t") return "\\t";
    return `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`;
  });
  const runs = visible.match(/`+/g) ?? [];
  const longest = runs.reduce((m, r) => Math.max(m, r.length), 0);
  const fence = "`".repeat(longest + 1);
  const pad = visible.startsWith("`") || visible.endsWith("`") ? " " : "";
  return `${fence}${pad}${visible}${pad}${fence}`;
}

function tableCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

// ---------------------------------------------------------------------------
// FullVerificationResult -> VerificationSummary
// ---------------------------------------------------------------------------

function reasonOf(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = sanitizeInline(text);
  return cleaned || undefined;
}

/**
 * Convert a full verification result to compact evidence. Tests are only
 * "passed" when a test run actually completed and passed: a passing build
 * never implies passing unit tests.
 */
export function verificationSummaryFromResult(
  result: FullVerificationResult
): VerificationSummary {
  const build: VerificationCheckSummary = {
    status: result.build.passed ? "passed" : "failed",
    durationMs: result.build.durationMs,
  };

  const tdd = result.tdd;
  let unitTests: VerificationCheckSummary;
  if (!tdd.ran) {
    unitTests = { status: "skipped", reason: reasonOf(tdd.skipReason) ?? "not run" };
  } else if (!tdd.testRun) {
    unitTests = { status: "failed", reason: reasonOf(tdd.summary) ?? "test command did not run" };
  } else {
    const run = tdd.testRun;
    const acceptedByBaseline =
      !run.passed && tdd.baselineComparison?.verdict === "pass";
    unitTests = {
      status: run.passed || acceptedByBaseline ? "passed" : "failed",
      durationMs: run.durationMs,
    };
    if (run.testCounts.parsed) {
      unitTests.total = run.testCounts.total;
      unitTests.passed = run.testCounts.passed;
      unitTests.failed = run.testCounts.failed;
      unitTests.skipped = run.testCounts.skipped;
    }
    if (acceptedByBaseline) unitTests.reason = "only known baseline failures";
    if (!tdd.passed && run.passed) unitTests.reason = "tests passed; test-coverage check failed";
  }

  let browser: VerificationCheckSummary;
  if (!result.browser.ran || !result.browser.browserResult) {
    browser = {
      status: "skipped",
      reason: reasonOf(result.browser.skipReason) ?? "not run",
    };
  } else {
    const br = result.browser.browserResult;
    const failed = br.results.filter((r) => !r.passed).length;
    browser = {
      status: br.allPassed ? "passed" : "failed",
      durationMs: br.totalDurationMs,
      total: br.results.length,
      passed: br.results.length - failed,
      failed,
    };
  }

  return { build, unitTests, browser };
}

// ---------------------------------------------------------------------------
// Verification rendering
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** Human-readable outcome of one check; absent evidence is "unknown". */
export function formatCheck(check?: VerificationCheckSummary): string {
  if (!check) return "unknown";
  const parts: string[] = [];
  if (check.total !== undefined) {
    parts.push(`${check.passed ?? 0}/${check.total} passed`);
    if (check.failed) parts.push(`${check.failed} failed`);
    if (check.skipped) parts.push(`${check.skipped} skipped`);
  }
  if (check.durationMs !== undefined) parts.push(formatDuration(check.durationMs));
  if (check.reason) parts.push(sanitizeInline(check.reason));
  const status = ["passed", "failed", "skipped", "unknown"].includes(check.status)
    ? check.status
    : "unknown";
  return parts.length ? `${status} (${parts.join(", ")})` : status;
}

// ---------------------------------------------------------------------------
// Git file collection
// ---------------------------------------------------------------------------

function assertSafeRef(ref: string, label: string): void {
  if (!ref || ref.startsWith("-") || /[\u0000- ]/.test(ref)) {
    throw new Error(`Invalid ${label} for git comparison: ${JSON.stringify(ref)}`);
  }
}

const STATUS_BY_LETTER: Record<string, ChangedFileStatus> = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed",
  C: "copied",
  T: "type-changed",
};

/** Parse `git diff --name-status -z` output (NUL-delimited). */
export function parseNameStatusZ(output: string): ChangedFile[] {
  const tokens = output.split("\0");
  if (tokens.length && tokens[tokens.length - 1] === "") tokens.pop();
  const files: ChangedFile[] = [];
  for (let i = 0; i < tokens.length; ) {
    const code = tokens[i++]!;
    const status = STATUS_BY_LETTER[code.charAt(0)] ?? "other";
    if (code.startsWith("R") || code.startsWith("C")) {
      const oldPath = tokens[i++];
      const path = tokens[i++];
      if (oldPath === undefined || path === undefined) break;
      files.push({ path, status, oldPath });
    } else {
      const path = tokens[i++];
      if (path === undefined) break;
      files.push({ path, status });
    }
  }
  return normalizeFiles(files);
}

/** Sort and deduplicate files (stable, deterministic). */
export function normalizeFiles(files: ChangedFile[]): ChangedFile[] {
  const seen = new Map<string, ChangedFile>();
  for (const f of files) {
    seen.set(`${f.status}\0${f.oldPath ?? ""}\0${f.path}`, f);
  }
  return [...seen.values()].sort(
    (a, b) =>
      compareStrings(a.path, b.path) ||
      compareStrings(a.status, b.status) ||
      compareStrings(a.oldPath ?? "", b.oldPath ?? "")
  );
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function runGit(repoPath: string, args: string[]): string {
  const res = spawnSync("git", args, {
    cwd: repoPath,
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (res.error) throw new Error(`git ${(args.find((a) => !a.startsWith("-") && !a.startsWith("core.")) ?? "command")} failed: ${res.error.message}`);
  if (res.status !== 0) {
    throw new Error(
      `git ${(args.find((a) => !a.startsWith("-") && !a.startsWith("core.")) ?? "command")} failed (exit ${res.status}): ${sanitizeInline(res.stderr ?? "")}`
    );
  }
  return res.stdout;
}

/** Files changed between two explicit commits (operation-level affected files). */
export function collectChangedFiles(
  repoPath: string,
  beforeSha: string,
  afterSha: string
): ChangedFile[] {
  assertSafeRef(beforeSha, "before SHA");
  assertSafeRef(afterSha, "after SHA");
  if (beforeSha === afterSha) return [];
  const out = runGit(repoPath, [
    "-c",
    "core.quotepath=off",
    "diff",
    "--name-status",
    "-z",
    "-M",
    "--no-ext-diff",
    "--no-color",
    beforeSha,
    afterSha,
    "--",
  ]);
  return parseNameStatusZ(out);
}

/**
 * Files in the PR-style comparison of `head` against `base`
 * (merge-base of the two, to `head`), matching what GitHub shows.
 */
export function collectComparisonFiles(
  repoPath: string,
  base: string,
  head: string
): ChangedFile[] {
  assertSafeRef(base, "base ref");
  assertSafeRef(head, "head ref");
  const out = runGit(repoPath, [
    "-c",
    "core.quotepath=off",
    "diff",
    "--name-status",
    "-z",
    "-M",
    "--no-ext-diff",
    "--no-color",
    `${base}...${head}`,
    "--",
  ]);
  return parseNameStatusZ(out);
}

// ---------------------------------------------------------------------------
// Task helpers
// ---------------------------------------------------------------------------

/** Sort tasks by id; later entries for the same id win. */
export function normalizeTasks(tasks: MergeReportTask[]): MergeReportTask[] {
  const byId = new Map<string, MergeReportTask>();
  for (const t of tasks) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) => compareStrings(a.id, b.id));
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function renderTaskList(tasks: MergeReportTask[]): string[] {
  if (tasks.length === 0) return ["_No tasks recorded._"];
  return tasks.map(
    (t) => `- ${codeSpan(t.id)} — ${escapeMarkdown(sanitizeInline(t.title, MAX_TITLE_LENGTH))}`
  );
}

function renderFileList(files: ChangedFile[]): string[] {
  if (files.length === 0) return ["_No files changed._"];
  const lines = files.slice(0, MAX_REPORTED_FILES).map((f) =>
    f.oldPath !== undefined
      ? `- ${f.status} ${codeSpan(f.oldPath)} → ${codeSpan(f.path)}`
      : `- ${f.status} ${codeSpan(f.path)}`
  );
  if (files.length > MAX_REPORTED_FILES) {
    lines.push(`- … and ${files.length - MAX_REPORTED_FILES} more file(s)`);
  }
  return lines;
}

function renderTestResults(tasks: MergeReportTask[]): string[] {
  if (tasks.length === 0) return ["_No test results recorded._"];
  const lines = [
    "| Task | Build | Unit tests | Browser tests |",
    "| --- | --- | --- | --- |",
  ];
  for (const t of tasks) {
    const v = t.verification;
    lines.push(
      `| ${tableCell(codeSpan(t.id))} | ${tableCell(escapeMarkdown(formatCheck(v?.build)))} | ` +
        `${tableCell(escapeMarkdown(formatCheck(v?.unitTests)))} | ` +
        `${tableCell(escapeMarkdown(formatCheck(v?.browser)))} |`
    );
  }
  return lines;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Render the Markdown for a single merge operation. */
export function renderMergeReport(
  input: MergeReportInput,
  files: ChangedFile[]
): string {
  const tasks = normalizeTasks(input.tasks);
  const sortedFiles = normalizeFiles(files);
  const lines = [
    "## Summary",
    "",
    `Merged ${plural(tasks.length, "task")} into ${codeSpan(input.destinationBranch)} ` +
      `(${codeSpan(`${shortSha(input.beforeSha)}..${shortSha(input.afterSha)}`)}), ` +
      `changing ${plural(sortedFiles.length, "file")}.`,
    "",
    ...renderTaskList(tasks),
    "",
    `Operation: ${codeSpan(input.operationId)}`,
    "",
    "## Affected Files",
    "",
    ...renderFileList(sortedFiles),
    "",
    "## Test Results",
    "",
    ...renderTestResults(tasks),
    "",
  ];
  return lines.join("\n");
}

/** Collect affected files from the explicit SHAs and render the report. */
export function collectMergeReport(
  repoPath: string,
  input: MergeReportInput
): MergeReport {
  const files = collectChangedFiles(repoPath, input.beforeSha, input.afterSha);
  return {
    operationId: input.operationId,
    destinationBranch: input.destinationBranch,
    beforeSha: input.beforeSha,
    afterSha: input.afterSha,
    tasks: normalizeTasks(input.tasks),
    files,
    markdown: renderMergeReport(input, files),
  };
}

// ---------------------------------------------------------------------------
// Cumulative (branch-pair PR) reports
// ---------------------------------------------------------------------------

export interface CumulativeReportInput {
  /** PR head: the branch that received the merges */
  head: string;
  /** PR target branch */
  base: string;
  /** Recorded successful operations for this head/base pair, oldest first */
  operations: MergeReportInput[];
}

export interface CumulativeMergeReport {
  head: string;
  base: string;
  operationIds: string[];
  tasks: MergeReportTask[];
  files: ChangedFile[];
  markdown: string;
}

/** Render a cumulative report from already-collected PR comparison files. */
export function renderCumulativeReport(
  input: CumulativeReportInput,
  files: ChangedFile[]
): string {
  const tasks = normalizeTasks(input.operations.flatMap((o) => o.tasks));
  const operationIds = [...new Set(input.operations.map((o) => o.operationId))].sort(
    compareStrings
  );
  const sortedFiles = normalizeFiles(files);
  const lines = [
    "## Summary",
    "",
    `${plural(tasks.length, "task")} merged into ${codeSpan(input.head)} ` +
      `for ${codeSpan(input.base)} across ${plural(operationIds.length, "merge operation")}, ` +
      `changing ${plural(sortedFiles.length, "file")} compared with the target.`,
    "",
    ...renderTaskList(tasks),
    "",
    ...(operationIds.length
      ? [`Operations: ${operationIds.map((id) => codeSpan(id)).join(", ")}`, ""]
      : []),
    "## Affected Files",
    "",
    ...renderFileList(sortedFiles),
    "",
    "## Test Results",
    "",
    ...renderTestResults(tasks),
    "",
  ];
  return lines.join("\n");
}

/** Collect the PR comparison (base...head) and render the cumulative report. */
export function collectCumulativeReport(
  repoPath: string,
  input: CumulativeReportInput
): CumulativeMergeReport {
  const files = collectComparisonFiles(repoPath, input.base, input.head);
  return {
    head: input.head,
    base: input.base,
    operationIds: [...new Set(input.operations.map((o) => o.operationId))].sort(compareStrings),
    tasks: normalizeTasks(input.operations.flatMap((o) => o.tasks)),
    files,
    markdown: renderCumulativeReport(input, files),
  };
}
