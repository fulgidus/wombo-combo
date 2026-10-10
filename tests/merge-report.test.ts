import { describe, test, expect, afterEach } from "bun:test";
import {
  codeSpan,
  collectChangedFiles,
  collectComparisonFiles,
  collectCumulativeReport,
  collectMergeReport,
  escapeMarkdown,
  formatCheck,
  parseNameStatusZ,
  renderMergeReport,
  sanitizeInline,
  verificationSummaryFromResult,
} from "../src/lib/merge-report";
import type { FullVerificationResult } from "../src/lib/verifier";
import type { MergeReportInput } from "../src/lib/post-merge-types";
import {
  commitAll,
  git,
  makeRepo,
  removeDir,
  writeRepoFile,
} from "./helpers/git-repo";
import { unlinkSync } from "node:fs";
import { join } from "node:path";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});
function repo(): string {
  const r = makeRepo();
  dirs.push(r);
  return r;
}

// ---------------------------------------------------------------------------
// FullVerificationResult conversion
// ---------------------------------------------------------------------------

function fullResult(over: Partial<FullVerificationResult> = {}): FullVerificationResult {
  return {
    build: {
      passed: true,
      exitCode: 0,
      stdout: "SECRET RAW BUILD LOG",
      stderr: "",
      errorSummary: "",
      durationMs: 2500,
    },
    browser: { ran: false, skipReason: "browser testing disabled", browserResult: null },
    tdd: {
      ran: false,
      skipReason: "TDD is disabled",
      testRun: null,
      testDetection: null,
      passed: true,
      hasWarnings: false,
      summary: "skipped",
      strictMode: false,
    },
    overallPassed: true,
    combinedErrorSummary: "",
    ...over,
  };
}

describe("verificationSummaryFromResult", () => {
  test("passing build with disabled tests never reports passing unit tests", () => {
    const s = verificationSummaryFromResult(fullResult());
    expect(s.build?.status).toBe("passed");
    expect(s.unitTests?.status).toBe("skipped");
    expect(s.unitTests?.reason).toContain("TDD is disabled");
    expect(s.browser?.status).toBe("skipped");
  });

  test("never embeds raw logs", () => {
    const s = verificationSummaryFromResult(fullResult());
    expect(JSON.stringify(s)).not.toContain("SECRET RAW BUILD LOG");
  });

  test("failed build is failed", () => {
    const base = fullResult();
    const s = verificationSummaryFromResult(
      fullResult({ build: { ...base.build, passed: false, exitCode: 1 } })
    );
    expect(s.build?.status).toBe("failed");
  });

  test("completed test run carries counts and duration", () => {
    const s = verificationSummaryFromResult(
      fullResult({
        tdd: {
          ...fullResult().tdd,
          ran: true,
          skipReason: null,
          testRun: {
            passed: true,
            exitCode: 0,
            stdout: "",
            stderr: "",
            durationMs: 4000,
            testCounts: { total: 12, passed: 10, failed: 0, skipped: 2, parsed: true },
            errorSummary: "",
          },
        },
      })
    );
    expect(s.unitTests).toEqual({
      status: "passed",
      durationMs: 4000,
      total: 12,
      passed: 10,
      failed: 0,
      skipped: 2,
    });
  });

  test("failing test run is failed; unparsed counts are omitted", () => {
    const s = verificationSummaryFromResult(
      fullResult({
        tdd: {
          ...fullResult().tdd,
          ran: true,
          skipReason: null,
          passed: false,
          testRun: {
            passed: false,
            exitCode: 1,
            stdout: "",
            stderr: "",
            durationMs: 100,
            testCounts: { total: 0, passed: 0, failed: 0, skipped: 0, parsed: false },
            errorSummary: "boom",
          },
        },
      })
    );
    expect(s.unitTests?.status).toBe("failed");
    expect(s.unitTests?.total).toBeUndefined();
  });

  test("test command that did not execute is failed", () => {
    const s = verificationSummaryFromResult(
      fullResult({
        tdd: {
          ...fullResult().tdd,
          ran: true,
          skipReason: null,
          passed: false,
          testRun: null,
          summary: "Test command failed to execute: ENOENT",
        },
      })
    );
    expect(s.unitTests?.status).toBe("failed");
  });

  test("browser results are summarized with counts", () => {
    const mk = (name: string, passed: boolean) => ({
      testName: name,
      passed,
      exitCode: passed ? 0 : 1,
      stdout: "",
      stderr: "",
      durationMs: 10,
      screenshotPath: null,
    });
    const s = verificationSummaryFromResult(
      fullResult({
        browser: {
          ran: true,
          skipReason: null,
          browserResult: {
            allPassed: false,
            results: [mk("a", true), mk("b", false)],
            summary: "x",
            totalDurationMs: 20,
          },
        },
      })
    );
    expect(s.browser).toEqual({
      status: "failed",
      durationMs: 20,
      total: 2,
      passed: 1,
      failed: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

describe("text helpers", () => {
  test("sanitizeInline collapses lines, strips ANSI and redacts secrets", () => {
    const out = sanitizeInline("a\n\n b \u001b[31mred\u001b[0m token=abc123 ghp_" + "x".repeat(30));
    expect(out).not.toContain("\n");
    expect(out).not.toContain("\u001b");
    expect(out).not.toContain("abc123");
    expect(out).not.toContain("ghp_");
    expect(out).toContain("[redacted]");
  });

  test("sanitizeInline truncates long text", () => {
    expect(sanitizeInline("x".repeat(500), 50).length).toBeLessThanOrEqual(50);
  });

  test("escapeMarkdown neutralizes markup and mentions", () => {
    const out = escapeMarkdown("*bold* [x](y) <b> #1 a|b @user");
    expect(out).toContain("\\*bold\\*");
    expect(out).toContain("\\[x\\]");
    expect(out).toContain("\\<b\\>");
    expect(out).toContain("\\#1");
    expect(out).toContain("a\\|b");
    expect(out).not.toContain("@user");
  });

  test("codeSpan survives backticks and control characters", () => {
    expect(codeSpan("a`b")).toBe("``a`b``");
    expect(codeSpan("`x`")).toBe("`` `x` ``");
    expect(codeSpan("a\nb")).toBe("`a\\nb`");
  });

  test("formatCheck renders explicit unknown, skipped and counts", () => {
    expect(formatCheck(undefined)).toBe("unknown");
    expect(formatCheck({ status: "unknown" })).toBe("unknown");
    expect(formatCheck({ status: "skipped", reason: "disabled" })).toBe("skipped (disabled)");
    expect(
      formatCheck({ status: "passed", total: 5, passed: 4, skipped: 1, durationMs: 1500 })
    ).toBe("passed (4/5 passed, 1 skipped, 1.5s)");
    expect(formatCheck({ status: "failed", total: 3, passed: 1, failed: 2 })).toBe(
      "failed (1/3 passed, 2 failed)"
    );
  });
});

// ---------------------------------------------------------------------------
// parseNameStatusZ
// ---------------------------------------------------------------------------

describe("parseNameStatusZ", () => {
  test("parses statuses, renames and sorts deterministically", () => {
    const out = ["M", "z.ts", "A", "a.ts", "R100", "old.ts", "new.ts", "D", "gone.ts", ""].join("\0");
    expect(parseNameStatusZ(out)).toEqual([
      { path: "a.ts", status: "added" },
      { path: "gone.ts", status: "deleted" },
      { path: "new.ts", status: "renamed", oldPath: "old.ts" },
      { path: "z.ts", status: "modified" },
    ]);
  });

  test("deduplicates and tolerates empty or truncated output", () => {
    expect(parseNameStatusZ("")).toEqual([]);
    expect(parseNameStatusZ(["M", "a", "M", "a", ""].join("\0"))).toHaveLength(1);
    expect(parseNameStatusZ(["R100", "only-old"].join("\0"))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Git collection
// ---------------------------------------------------------------------------

describe("collectChangedFiles", () => {
  test("derives added, modified, deleted and renamed files from SHAs", () => {
    const r = repo();
    writeRepoFile(r, "keep.txt", "keep line one\nkeep line two\nkeep line three\n");
    writeRepoFile(r, "gone.txt", "gone\n");
    writeRepoFile(r, "old-name.txt", "a fairly long file body\nwith several lines\nso rename detection works\n");
    const before = commitAll(r, "setup");

    writeRepoFile(r, "keep.txt", "keep line one\nchanged\nkeep line three\n");
    unlinkSync(join(r, "gone.txt"));
    git(r, "mv", "old-name.txt", "new-name.txt");
    writeRepoFile(r, "added.txt", "new\n");
    const after = commitAll(r, "change");

    expect(collectChangedFiles(r, before, after)).toEqual([
      { path: "added.txt", status: "added" },
      { path: "gone.txt", status: "deleted" },
      { path: "keep.txt", status: "modified" },
      { path: "new-name.txt", status: "renamed", oldPath: "old-name.txt" },
    ]);
  });

  test("is independent of the working tree and index state", () => {
    const r = repo();
    const before = git(r, "rev-parse", "HEAD");
    writeRepoFile(r, "committed.txt", "x\n");
    const after = commitAll(r, "c");
    writeRepoFile(r, "dirty.txt", "uncommitted\n");
    writeRepoFile(r, "committed.txt", "locally edited\n");
    expect(collectChangedFiles(r, before, after).map((f) => f.path)).toEqual(["committed.txt"]);
    // user's dirty state is untouched
    expect(git(r, "status", "--porcelain")).toContain("dirty.txt");
  });

  test("handles unusual filenames (spaces, quotes, unicode, newline)", () => {
    const r = repo();
    const before = git(r, "rev-parse", "HEAD");
    const names = ['with space.txt', 'quote".txt', "caffè-日本.txt", "line\nbreak.txt", "`tick`.txt"];
    for (const n of names) writeRepoFile(r, n, "x\n");
    const after = commitAll(r, "odd names");
    const got = collectChangedFiles(r, before, after).map((f) => f.path);
    expect(got.sort()).toEqual([...names].sort());
  });

  test("same SHA yields no files; unsafe refs are rejected", () => {
    const r = repo();
    const sha = git(r, "rev-parse", "HEAD");
    expect(collectChangedFiles(r, sha, sha)).toEqual([]);
    expect(() => collectChangedFiles(r, "--output=/tmp/x", sha)).toThrow();
  });

  test("unknown commits raise a clear error", () => {
    const r = repo();
    expect(() => collectChangedFiles(r, "0".repeat(40), "1".repeat(40))).toThrow(/git diff failed/);
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function input(over: Partial<MergeReportInput> = {}): MergeReportInput {
  return {
    operationId: "op-abc",
    destinationBranch: "main",
    beforeSha: "1111111aaaaaaa",
    afterSha: "2222222bbbbbbb",
    tasks: [
      {
        id: "task-b",
        title: "Second *task* with <html> & [link](x)",
        verification: {
          build: { status: "passed", durationMs: 1000 },
          unitTests: { status: "passed", total: 3, passed: 3 },
          browser: { status: "skipped", reason: "browser disabled" },
        },
      },
      { id: "task-a", title: "First task", verification: { build: { status: "passed" } } },
      { id: "task-a", title: "First task", verification: { build: { status: "passed" } } },
    ],
    ...over,
  };
}

describe("renderMergeReport", () => {
  const files = [
    { path: "src/b.ts", status: "modified" as const },
    { path: "src/a.ts", status: "added" as const },
    { path: "src/a.ts", status: "added" as const },
    { path: "docs/new.md", status: "renamed" as const, oldPath: "docs/old.md" },
    { path: "x.ts", status: "deleted" as const },
  ];

  test("has the three required sections in order", () => {
    const md = renderMergeReport(input(), files);
    const i = (h: string) => md.indexOf(h);
    expect(i("## Summary")).toBeGreaterThanOrEqual(0);
    expect(i("## Affected Files")).toBeGreaterThan(i("## Summary"));
    expect(i("## Test Results")).toBeGreaterThan(i("## Affected Files"));
  });

  test("is deterministic regardless of input order and duplicates", () => {
    const a = renderMergeReport(input(), files);
    const b = renderMergeReport(
      input({ tasks: [...input().tasks].reverse() }),
      [...files].reverse()
    );
    expect(a).toBe(b);
  });

  test("sorts and deduplicates tasks and files, with ids and titles", () => {
    const md = renderMergeReport(input(), files);
    expect(md.indexOf("`task-a`")).toBeLessThan(md.indexOf("`task-b`"));
    expect(md.match(/- `task-a` — First task/g)).toHaveLength(1);
    expect(md.match(/`src\/a\.ts`/g)).toHaveLength(1);
    expect(md).toContain("2 tasks");
    expect(md).toContain("4 files");
  });

  test("renders renames and deletions", () => {
    const md = renderMergeReport(input(), files);
    expect(md).toContain("- renamed `docs/old.md` → `docs/new.md`");
    expect(md).toContain("- deleted `x.ts`");
  });

  test("escapes Markdown-sensitive titles", () => {
    const md = renderMergeReport(input(), files);
    expect(md).toContain("Second \\*task\\* with \\<html\\> \\& \\[link\\](x)");
    expect(md).not.toContain("<html>");
  });

  test("missing historical results render as unknown, never passed", () => {
    const md = renderMergeReport(
      input({
        tasks: [{ id: "legacy", title: "Legacy", verification: { build: { status: "passed" } } }],
      }),
      []
    );
    const row = md.split("\n").find((l) => l.includes("`legacy`") && l.startsWith("|"))!;
    expect(row).toContain("| passed |");
    const cells = row.split("|").map((c) => c.trim());
    expect(cells[3]).toBe("unknown"); // unit tests
    expect(cells[4]).toBe("unknown"); // browser
  });

  test("tasks without any verification are all unknown", () => {
    const md = renderMergeReport(input({ tasks: [{ id: "t", title: "T" }] }), []);
    expect(md).toContain("| `t` | unknown | unknown | unknown |");
  });

  test("skipped tests are shown as skipped with reason", () => {
    const md = renderMergeReport(input(), files);
    expect(md).toContain("skipped (browser disabled)");
    expect(md).not.toMatch(/unit tests[^\n]*passed[^\n]*skipped/i);
  });

  test("handles zero files and zero tasks", () => {
    const md = renderMergeReport(input({ tasks: [] }), []);
    expect(md).toContain("_No files changed._");
    expect(md).toContain("_No tasks recorded._");
  });

  test("odd file names cannot break out of code spans or tables", () => {
    const md = renderMergeReport(input(), [
      { path: "a`b|c\nd.ts", status: "added" },
    ]);
    expect(md).toContain("``a`b|c\\nd.ts``");
    expect(md.split("\n").filter((l) => l.startsWith("- added"))).toHaveLength(1);
  });

  test("never includes ai attribution or credentials", () => {
    const md = renderMergeReport(input(), files);
    expect(md.toLowerCase()).not.toContain("claude");
    expect(md.toLowerCase()).not.toContain("co-authored");
  });
});

describe("collectMergeReport", () => {
  test("combines git files with the rendered report", () => {
    const r = repo();
    const before = git(r, "rev-parse", "HEAD");
    writeRepoFile(r, "f.txt", "x\n");
    const after = commitAll(r, "c");
    const report = collectMergeReport(
      r,
      input({ beforeSha: before, afterSha: after, destinationBranch: "main" })
    );
    expect(report.files).toEqual([{ path: "f.txt", status: "added" }]);
    expect(report.tasks.map((t) => t.id)).toEqual(["task-a", "task-b"]);
    expect(report.markdown).toContain("`f.txt`");
    expect(report.markdown).toContain(before.slice(0, 7));
  });
});

// ---------------------------------------------------------------------------
// Cumulative reports
// ---------------------------------------------------------------------------

describe("cumulative reports", () => {
  test("files come from base...head; tasks combine all operations", () => {
    const r = repo();
    git(r, "checkout", "-q", "-b", "integration");
    const op1Before = git(r, "rev-parse", "HEAD");
    writeRepoFile(r, "one.txt", "1\n");
    const op1After = commitAll(r, "one");
    writeRepoFile(r, "two.txt", "2\n");
    const op2After = commitAll(r, "two");
    // Advance the target independently: its change must not appear in the PR file list
    git(r, "checkout", "-q", "main");
    writeRepoFile(r, "target-only.txt", "t\n");
    commitAll(r, "target advance");

    const ops: MergeReportInput[] = [
      { operationId: "op-1", destinationBranch: "integration", beforeSha: op1Before, afterSha: op1After,
        tasks: [{ id: "t1", title: "One", verification: { unitTests: { status: "passed" } } }] },
      { operationId: "op-2", destinationBranch: "integration", beforeSha: op1After, afterSha: op2After,
        tasks: [{ id: "t2", title: "Two" }, { id: "t1", title: "One", verification: { unitTests: { status: "failed" } } }] },
    ];
    expect(collectComparisonFiles(r, "main", "integration").map((f) => f.path)).toEqual([
      "one.txt",
      "two.txt",
    ]);
    const report = collectCumulativeReport(r, { head: "integration", base: "main", operations: ops });
    expect(report.files.map((f) => f.path)).toEqual(["one.txt", "two.txt"]);
    expect(report.operationIds).toEqual(["op-1", "op-2"]);
    expect(report.tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
    // most recent evidence wins for a repeated task
    expect(report.tasks[0]!.verification?.unitTests?.status).toBe("failed");
    expect(report.markdown).toContain("## Summary");
    expect(report.markdown).toContain("`op-1`, `op-2`");
    expect(report.markdown).not.toContain("target-only.txt");
  });
});
