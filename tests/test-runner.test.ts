/**
 * test-runner.test.ts — Unit tests for test-runner.ts
 *
 * Coverage:
 *   - parseTestCounts: Bun format, Jest format, unparseable output
 *   - extractTestErrorSummary: error line extraction, context lines, fallback
 *   - runTests: integration test with real commands (echo, exit codes)
 *   - classifyExecution: timeout, signal, buffer overflow, command-not-found
 *   - parseStructuredResults: per-test outcomes from real Bun output fixtures
 *     (tests/fixtures/test-runner/, captured from bun v1.4.2 with the worktree
 *     root rewritten to /work/tree)
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseTestCounts,
  extractTestErrorSummary,
  runTests,
  classifyExecution,
  parseStructuredResults,
  normalizeTestPath,
  stripAnsi,
} from "../src/lib/test-runner";

const FIXTURES = join(import.meta.dir, "fixtures", "test-runner");
const fixture = (name: string) =>
  readFileSync(join(FIXTURES, `${name}.txt`), "utf-8");
const COMPLETED = { status: "completed" as const };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wombo-test-runner-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// parseTestCounts — Bun format
// ---------------------------------------------------------------------------

describe("parseTestCounts — Bun format", () => {
  test("parses pass count", () => {
    const result = parseTestCounts("42 pass", "");
    expect(result.parsed).toBe(true);
    expect(result.passed).toBe(42);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(42);
  });

  test("parses pass and fail counts", () => {
    const result = parseTestCounts("10 pass\n3 fail", "");
    expect(result.parsed).toBe(true);
    expect(result.passed).toBe(10);
    expect(result.failed).toBe(3);
    expect(result.total).toBe(13);
  });

  test("parses pass, fail, and skip counts", () => {
    const result = parseTestCounts("10 pass\n3 fail\n2 skip", "");
    expect(result.parsed).toBe(true);
    expect(result.passed).toBe(10);
    expect(result.failed).toBe(3);
    expect(result.skipped).toBe(2);
    expect(result.total).toBe(15);
  });

  test("parses counts from stderr", () => {
    const result = parseTestCounts("", "5 pass\n1 fail");
    expect(result.parsed).toBe(true);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(1);
  });

  test("handles case-insensitive matching", () => {
    const result = parseTestCounts("10 PASS", "");
    expect(result.parsed).toBe(true);
    expect(result.passed).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// parseTestCounts — Jest format
// ---------------------------------------------------------------------------

describe("parseTestCounts — stray output from tests", () => {
  test("prefers Bun's own summary lines over nested report text printed by tests", () => {
    const out = [
      "tests/a.test.ts:",
      "    Results: 10 passed, 0 failed, 0 skipped (10 total)",
      "(fail) boom [1.00ms]",
      "",
      " 5 pass",
      " 1 fail",
      "Ran 6 tests across 1 file. [10.00ms]",
    ].join("\n");
    const r = parseTestCounts(out, "");
    expect(r.passed).toBe(5);
    expect(r.failed).toBe(1);
  });

  test("uses the last summary when the output contains several", () => {
    const r = parseTestCounts(" 3 pass\n 0 fail\n\nsomething\n 7 pass\n 2 fail\n", "");
    expect(r.passed).toBe(7);
    expect(r.failed).toBe(2);
  });
});

describe("parseTestCounts — Jest format", () => {
  test("parses Tests: X passed, Y total format", () => {
    const result = parseTestCounts("Tests:  5 passed, 5 total", "");
    // The Bun format regex also matches "5 passed" so it may catch this first
    expect(result.parsed).toBe(true);
    expect(result.passed).toBe(5);
  });

  test("parses Tests with failures", () => {
    const result = parseTestCounts("Tests:  3 passed, 2 failed, 5 total", "");
    expect(result.parsed).toBe(true);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// parseTestCounts — Unparseable
// ---------------------------------------------------------------------------

describe("parseTestCounts — Unparseable", () => {
  test("returns parsed=false for empty output", () => {
    const result = parseTestCounts("", "");
    expect(result.parsed).toBe(false);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  test("returns parsed=false for unrecognized format", () => {
    const result = parseTestCounts("All checks completed successfully", "");
    expect(result.parsed).toBe(false);
  });

  test("returns parsed=false for only 'fail' without match pattern", () => {
    // Just the word 'fail' alone won't match because the regex needs \d+\s+fail
    const result = parseTestCounts("Some tests failed\nno counts here", "");
    expect(result.parsed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractTestErrorSummary
// ---------------------------------------------------------------------------

describe("extractTestErrorSummary", () => {
  test("extracts error lines with context", () => {
    const stdout = [
      "test 1 passed",
      "error: expected true but got false",
      "  at test.ts:42",
      "  at suite.ts:10",
      "test 2 passed",
    ].join("\n");
    const summary = extractTestErrorSummary(stdout, "");
    expect(summary).toContain("error");
    expect(summary).toContain("expected true but got false");
  });

  test("extracts FAIL markers", () => {
    const stdout = "FAIL tests/foo.test.ts\n  some failure details\n  more details";
    const summary = extractTestErrorSummary(stdout, "");
    expect(summary).toContain("FAIL");
  });

  test("falls back to last 30 lines when no error patterns found", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `output line ${i}`);
    const stdout = lines.join("\n");
    const summary = extractTestErrorSummary(stdout, "");
    // Should contain the last lines as fallback (last 30 lines of combined stdout+stderr)
    expect(summary).toContain("output line 49");
    expect(summary).toContain("output line 21");
  });

  test("truncates long error output", () => {
    const longError = "error: ".padEnd(4000, "x");
    const summary = extractTestErrorSummary(longError, "");
    expect(summary.length).toBeLessThanOrEqual(3020); // 3000 + some context
  });

  test("handles empty output", () => {
    const summary = extractTestErrorSummary("", "");
    expect(typeof summary).toBe("string");
  });

  test("captures expect() patterns", () => {
    const stdout = "expect(received).toBe(expected)\n  Expected: true\n  Received: false";
    const summary = extractTestErrorSummary(stdout, "");
    expect(summary).toContain("expect");
  });
});

// ---------------------------------------------------------------------------
// runTests — Integration
// ---------------------------------------------------------------------------

describe("runTests", () => {
  test("captures successful command output", async () => {
    const result = await runTests(tmpDir, "echo '5 pass'");
    expect(result.passed).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("5 pass");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.testCounts.parsed).toBe(true);
    expect(result.testCounts.passed).toBe(5);
  });

  test("captures failing command", async () => {
    const result = await runTests(tmpDir, "exit 1");
    expect(result.passed).toBe(false);
    // Exit code may vary depending on shell
    expect(result.errorSummary).toBeDefined();
  });

  test("captures command with stderr output", async () => {
    const result = await runTests(tmpDir, "echo 'output' && echo 'error' >&2");
    expect(result.passed).toBe(true);
    expect(result.stdout).toContain("output");
    expect(result.stderr).toContain("error");
  });

  test("returns error summary for failed tests", async () => {
    const result = await runTests(
      tmpDir,
      "echo 'error: test failed' && exit 1"
    );
    expect(result.passed).toBe(false);
    expect(result.errorSummary).toContain("error");
  });

  test("respects timeout", async () => {
    // Use a very short timeout
    const result = await runTests(tmpDir, "sleep 10", 100);
    expect(result.passed).toBe(false);
  });

  test("measures duration", async () => {
    const result = await runTests(tmpDir, "echo done");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeLessThan(5000);
  });
});

// ---------------------------------------------------------------------------
// classifyExecution
// ---------------------------------------------------------------------------

describe("classifyExecution", () => {
  test("no error is completed", () => {
    expect(classifyExecution(null)).toEqual({ status: "completed" });
  });

  test("numeric exit code is completed, not a failure kind", () => {
    expect(classifyExecution({ code: 1, signal: null, killed: false })).toEqual({
      status: "completed",
    });
  });

  test("signal sent by exec is a timeout", () => {
    expect(
      classifyExecution({ code: null, signal: "SIGTERM", killed: true })
    ).toEqual({ status: "timeout", signal: "SIGTERM" });
  });

  test("external signal is reported as signal", () => {
    expect(
      classifyExecution({ code: null, signal: "SIGKILL", killed: false })
    ).toEqual({ status: "signal", signal: "SIGKILL" });
  });

  test("maxBuffer overflow", () => {
    expect(
      classifyExecution({ code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" })
    ).toEqual({ status: "buffer-overflow" });
  });

  test("exit 127 is command-not-found", () => {
    expect(classifyExecution({ code: 127, signal: null })).toEqual({
      status: "command-not-found",
    });
  });

  test("non-numeric code is a spawn error", () => {
    expect(classifyExecution({ code: "ENOENT" })).toEqual({
      status: "spawn-error",
    });
  });
});

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

describe("normalizeTestPath", () => {
  test("strips worktree root and converts separators", () => {
    expect(normalizeTestPath("/work/tree/tests/a.test.ts", "/work/tree")).toBe(
      "tests/a.test.ts"
    );
    expect(normalizeTestPath("C:\\wt\\tests\\a.test.ts", "C:\\wt\\")).toBe(
      "tests/a.test.ts"
    );
    expect(normalizeTestPath("./tests/a.test.ts")).toBe("tests/a.test.ts");
  });

  test("stripAnsi removes color codes", () => {
    expect(stripAnsi("\x1b[31m\u2717\x1b[0m a\x1b[2m > \x1b[0mb\r")).toBe(
      "\u2717 a > b"
    );
  });
});

// ---------------------------------------------------------------------------
// parseStructuredResults — Bun fixtures
// ---------------------------------------------------------------------------

describe("parseStructuredResults — Bun", () => {
  const ctx = { passed: false, execution: COMPLETED, rootPath: "/work/tree" };

  test("extracts failing identities with nested suites and duplicates", () => {
    const r = parseStructuredResults("", fixture("bun-failures"), ctx);
    expect(r.runner).toBe("bun");
    expect(r.comparable).toBe(true);
    expect(r.incompleteReasons).toEqual([]);
    expect(r.failureKind).toBe("assertions");
    expect(r.passesListed).toBe(false);
    // Two distinct tests share the name "dup" — both are kept
    expect(r.failingTestIds).toEqual([
      "tests/a.test.ts > outer > inner > dup",
      "tests/a.test.ts > outer > inner > dup",
      "tests/sub/b.test.ts > fails here",
    ]);
    expect(r.tests.map((t) => t.occurrence)).toEqual([1, 2, 1]);
    expect(r.tests[0]).toMatchObject({
      file: "tests/a.test.ts",
      name: "outer > inner > dup",
      outcome: "fail",
    });
  });

  test("TTY output with ANSI codes yields the same identities", () => {
    const plain = parseStructuredResults("", fixture("bun-failures"), ctx);
    const tty = parseStructuredResults("", fixture("bun-failures-tty"), ctx);
    expect(fixture("bun-failures-tty")).toContain("\x1b[");
    expect(tty.comparable).toBe(true);
    expect(tty.failingTestIds).toEqual(plain.failingTestIds);
  });

  test("timing noise does not affect identities", () => {
    const a = fixture("bun-failures");
    const b = a.replace(/\[[\d.]+ms\]/g, "[999.99ms]");
    expect(parseStructuredResults("", b, ctx).failingTestIds).toEqual(
      parseStructuredResults("", a, ctx).failingTestIds
    );
  });

  test("load errors make results non-comparable", () => {
    const r = parseStructuredResults("", fixture("bun-load-error"), ctx);
    expect(r.loadErrors).toBe(1);
    expect(r.failureKind).toBe("load-error");
    expect(r.comparable).toBe(false);
    expect(r.incompleteReasons.join("\n")).toContain("load or unhandled");
  });

  test("all-pass run is comparable with no failures", () => {
    const r = parseStructuredResults("", fixture("bun-all-pass"), {
      ...ctx,
      passed: true,
    });
    expect(r.comparable).toBe(true);
    expect(r.failureKind).toBe("none");
    expect(r.failingTestIds).toEqual([]);
  });

  test("lists passes, skips, and todos when Bun prints them", () => {
    // Older Bun versions print every result line in non-TTY mode
    const out = [
      "bun test v1.1.0",
      "",
      "tests/x.test.ts:",
      "(pass) suite > ok [0.10ms]",
      "(skip) suite > later",
      "(todo) suite > someday",
      "(fail) suite > broken [0.20ms]",
      "",
      " 1 pass",
      " 1 skip",
      " 1 todo",
      " 1 fail",
      "Ran 4 tests across 1 files. [5.00ms]",
    ].join("\n");
    const r = parseStructuredResults("", out, ctx);
    expect(r.passesListed).toBe(true);
    expect(r.comparable).toBe(true);
    expect(r.tests.map((t) => t.outcome)).toEqual([
      "pass",
      "skip",
      "todo",
      "fail",
    ]);
    expect(r.failingTestIds).toEqual(["tests/x.test.ts > suite > broken"]);
  });

  test("GitHub Actions output (##[group] headers, listed passes, failure recap)", () => {
    // Trimmed from a real GitHub Actions log (bun v1.4.2); summary counts
    // adjusted to the excerpt
    const r = parseStructuredResults("", fixture("bun-failures-gha"), ctx);
    expect(r.incompleteReasons).toEqual([]);
    expect(r.comparable).toBe(true);
    expect(r.passesListed).toBe(true);
    expect(r.tests.filter((t) => t.outcome === "pass").length).toBe(44);
    // The recap repeats the failure; it must not be counted twice
    expect(r.failingTestIds).toEqual([
      "tests/test-runner.test.ts > runTests — execution metadata > real bun run with a failing test yields its identity",
    ]);
  });

  test("raw GitHub Actions workflow commands (::group:: / ::endgroup::)", () => {
    // What Bun actually writes under GitHub Actions; the log viewer renders
    // these as ##[group] (reconstructed from a CI debug run, bun v1.4.2)
    const r = parseStructuredResults("", fixture("bun-failures-gha-raw"), ctx);
    expect(r.incompleteReasons).toEqual([]);
    expect(r.comparable).toBe(true);
    expect(r.failingTestIds).toEqual(["tests/x.test.ts > bad"]);
    expect(r.tests.map((t) => t.outcome)).toEqual(["pass", "fail"]);
  });

  test("truncated output (missing summary) is non-comparable", () => {
    const cut = fixture("bun-failures").split("\n").slice(0, 20).join("\n");
    const r = parseStructuredResults("", cut, ctx);
    expect(r.comparable).toBe(false);
    expect(r.failureKind).toBe("unknown");
  });

  test("failure count mismatch is non-comparable", () => {
    const out = fixture("bun-failures").replace(" 3 fail", " 4 fail");
    const r = parseStructuredResults("", out, ctx);
    expect(r.comparable).toBe(false);
    expect(r.failureKind).toBe("unknown");
  });

  test("incomplete execution never reports assertion failures", () => {
    for (const status of ["timeout", "signal", "buffer-overflow"] as const) {
      const r = parseStructuredResults("", fixture("bun-failures"), {
        ...ctx,
        execution: { status },
      });
      expect(r.comparable).toBe(false);
      expect(r.failureKind).toBe(status);
    }
  });

  test("nonzero exit without reported failures is unknown", () => {
    const r = parseStructuredResults("", fixture("bun-all-pass"), ctx);
    expect(r.comparable).toBe(false);
    expect(r.failureKind).toBe("unknown");
  });

  test("unsupported runner output is non-comparable", () => {
    const r = parseStructuredResults("Tests: 3 passed, 1 failed, 4 total", "", ctx);
    expect(r.runner).toBe("unknown");
    expect(r.comparable).toBe(false);
    expect(r.failureKind).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// runTests — execution metadata
// ---------------------------------------------------------------------------

describe("runTests — execution metadata", () => {
  test("timeout is classified and non-comparable", async () => {
    const result = await runTests(tmpDir, "sleep 10", 100);
    expect(result.execution?.status).toBe("timeout");
    expect(result.exitCode).toBe(1);
    expect(result.structured?.comparable).toBe(false);
    expect(result.structured?.failureKind).toBe("timeout");
  });

  test("missing command is command-not-found", async () => {
    const result = await runTests(tmpDir, "definitely-not-a-command-xyz");
    expect(result.execution?.status).toBe("command-not-found");
    expect(result.structured?.failureKind).toBe("command-not-found");
  });

  test("real bun run with a failing test yields its identity", async () => {
    mkdirSync(join(tmpDir, "tests", "nested"), { recursive: true });
    writeFileSync(
      join(tmpDir, "tests", "nested", "x.test.ts"),
      [
        'import { describe, test, expect } from "bun:test";',
        'describe("group", () => {',
        '  test("ok", () => expect(1).toBe(1));',
        '  test("bad", () => expect(1).toBe(2));',
        "});",
      ].join("\n")
    );
    const result = await runTests(tmpDir, "bun test", 30_000);
    expect(result.passed).toBe(false);
    expect(result.execution?.status).toBe("completed");
    expect(result.structured?.comparable).toBe(true);
    expect(result.structured?.failureKind).toBe("assertions");
    expect(result.structured?.failingTestIds).toEqual([
      "tests/nested/x.test.ts > group > bad",
    ]);
  });
});
