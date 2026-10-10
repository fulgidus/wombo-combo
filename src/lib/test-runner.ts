/**
 * test-runner.ts — Run test commands and capture results.
 *
 * Responsibilities:
 *   - Run the configured test command (e.g. `bun test`) in a worktree
 *   - Capture exit code, stdout, stderr
 *   - Parse test output to extract pass/fail counts
 *   - Produce structured TestRunResult for the TDD verification pipeline
 *   - Classify how the command ended (completed, timeout, signal, ...) and
 *     extract per-test outcomes so runs can be compared test-by-test
 *
 * This module is used by tdd-verifier.ts as part of the TDD verification step.
 */

import { exec } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of running the test command */
export interface TestRunResult {
  /** Whether the test command exited successfully (exit code 0) */
  passed: boolean;
  /** Process exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Parsed test counts (best-effort extraction from output) */
  testCounts: TestCounts;
  /** Error summary for retry prompts (empty if passed) */
  errorSummary: string;
  /** How the test command ended (absent for results built by hand) */
  execution?: TestExecution;
  /** Per-test outcomes, when the runner output could be parsed */
  structured?: StructuredTestResults;
}

/**
 * How the test command process ended.
 *
 *   - completed:         the process exited on its own (any exit code)
 *   - timeout:           killed after exceeding the configured timeout
 *   - signal:            terminated by a signal we did not send
 *   - buffer-overflow:   stdout/stderr exceeded maxBuffer and was cut off
 *   - command-not-found: the shell could not find the command (exit 126/127)
 *   - spawn-error:       any other failure to run the command
 */
export type TestExecutionStatus =
  | "completed"
  | "timeout"
  | "signal"
  | "buffer-overflow"
  | "command-not-found"
  | "spawn-error";

export interface TestExecution {
  status: TestExecutionStatus;
  /** Terminating signal, when status is "timeout" or "signal" */
  signal?: string;
}

/**
 * Why a test run did not pass. A nonzero exit code alone is never treated as
 * completed assertion failures — that requires parsed, consistent output.
 *
 *   - none:          the command passed
 *   - assertions:    the run completed and reported only test failures
 *   - load-error:    a test file failed to load, or an error escaped a test
 *   - <execution>:   the command did not complete (see TestExecutionStatus)
 *   - unknown:       nonzero exit that the output does not explain
 */
export type TestFailureKind =
  | "none"
  | "assertions"
  | "load-error"
  | "timeout"
  | "signal"
  | "buffer-overflow"
  | "command-not-found"
  | "spawn-error"
  | "unknown";

export type TestOutcome = "pass" | "fail" | "skip" | "todo";

/** One test case as reported by the runner */
export interface TestCaseResult {
  /** Stable identity: "<file> > <suite> > ... > <test name>" */
  id: string;
  /** Repository-relative file path with forward slashes */
  file: string;
  /** Full test name including enclosing suites, joined by " > " */
  name: string;
  /**
   * 1-based occurrence among reported cases sharing this id, so duplicate
   * test names stay distinct instead of collapsing into one entry.
   */
  occurrence: number;
  outcome: TestOutcome;
}

/** Per-test results plus the metadata needed to decide if they can be trusted */
export interface StructuredTestResults {
  /** Runner whose output format was recognized */
  runner: "bun" | "unknown";
  failureKind: TestFailureKind;
  /** Reported test cases, in output order */
  tests: TestCaseResult[];
  /** Ids of failing tests; duplicates are preserved (one entry per failure) */
  failingTestIds: string[];
  /**
   * Whether passing tests are individually listed. Bun only lists failures
   * when stdout is not a TTY, so passing identities are usually unavailable.
   */
  passesListed: boolean;
  /** Number of load/unhandled errors reported outside of any test */
  loadErrors: number;
  /**
   * True only when the run completed, the output format is supported, and
   * every reported failure is accounted for by an identified test case.
   * Consumers must not exempt failures from non-comparable results.
   */
  comparable: boolean;
  /** Human-readable reasons the results are not comparable (empty if they are) */
  incompleteReasons: string[];
}

/** Parsed test pass/fail counts from test runner output */
export interface TestCounts {
  /** Total number of tests detected */
  total: number;
  /** Number of passing tests */
  passed: number;
  /** Number of failing tests */
  failed: number;
  /** Number of skipped tests */
  skipped: number;
  /** Whether counts could be parsed from output */
  parsed: boolean;
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------

/**
 * Run the test command in a worktree directory.
 *
 * @param worktreePath - Absolute path to the worktree
 * @param testCommand - Test command to run (e.g., "bun test")
 * @param timeout - Timeout in milliseconds (default: 120_000)
 * @returns Structured test run result
 */
export function runTests(
  worktreePath: string,
  testCommand: string,
  timeout: number = 120_000
): Promise<TestRunResult> {
  return new Promise((resolvePromise) => {
    const start = Date.now();

    exec(
      testCommand,
      {
        cwd: worktreePath,
        encoding: "utf-8",
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - start;
        const code = error ? (error as any).code : 0;
        // error.code is a string for spawn/maxBuffer errors and null for signals
        const exitCode = typeof code === "number" ? code : error ? 1 : 0;
        const passed = !error;

        const testCounts = parseTestCounts(stdout ?? "", stderr ?? "");
        const execution = classifyExecution(error);
        const structured = parseStructuredResults(stdout ?? "", stderr ?? "", {
          passed,
          execution,
          testCounts,
          rootPath: worktreePath,
        });

        let errorSummary = "";
        if (!passed) {
          errorSummary = extractTestErrorSummary(stdout ?? "", stderr ?? "");
        }

        resolvePromise({
          passed,
          exitCode,
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          durationMs,
          testCounts,
          errorSummary,
          execution,
          structured,
        });
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Output Parsing
// ---------------------------------------------------------------------------

/**
 * Parse test counts from test runner output.
 *
 * Supports common formats:
 *   - Bun test: "42 pass, 3 fail, 2 skip" or "X pass\nY fail"
 *   - Generic: "Tests: X passed, Y failed, Z skipped, W total"
 *   - Jest-like: "Tests:  X passed, Y failed, Z total"
 */
export function parseTestCounts(stdout: string, stderr: string): TestCounts {
  const combined = stdout + "\n" + stderr;
  const result: TestCounts = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    parsed: false,
  };

  // Bun test format: "42 pass" and "3 fail" on separate or same lines
  const bunPassMatch = combined.match(/(\d+)\s+pass/i);
  const bunFailMatch = combined.match(/(\d+)\s+fail/i);
  const bunSkipMatch = combined.match(/(\d+)\s+skip/i);

  if (bunPassMatch || bunFailMatch) {
    result.passed = bunPassMatch ? parseInt(bunPassMatch[1], 10) : 0;
    result.failed = bunFailMatch ? parseInt(bunFailMatch[1], 10) : 0;
    result.skipped = bunSkipMatch ? parseInt(bunSkipMatch[1], 10) : 0;
    result.total = result.passed + result.failed + result.skipped;
    result.parsed = true;
    return result;
  }

  // Jest-like format: "Tests:  X passed, Y failed, Z total"
  const jestMatch = combined.match(
    /Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+skipped)?(?:,\s+(\d+)\s+total)?/i
  );
  if (jestMatch) {
    result.passed = parseInt(jestMatch[1], 10);
    result.failed = jestMatch[2] ? parseInt(jestMatch[2], 10) : 0;
    result.skipped = jestMatch[3] ? parseInt(jestMatch[3], 10) : 0;
    result.total = jestMatch[4]
      ? parseInt(jestMatch[4], 10)
      : result.passed + result.failed + result.skipped;
    result.parsed = true;
    return result;
  }

  return result;
}

/**
 * Classify how a child process ended from the node:child_process exec error.
 */
export function classifyExecution(error: unknown): TestExecution {
  if (!error) return { status: "completed" };
  const e = error as { code?: unknown; signal?: unknown; killed?: unknown };
  if (e.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
    return { status: "buffer-overflow" };
  }
  if (typeof e.signal === "string" && e.signal) {
    // exec sets killed=true when it sent the signal itself (timeout)
    return e.killed
      ? { status: "timeout", signal: e.signal }
      : { status: "signal", signal: e.signal };
  }
  if (e.code === 126 || e.code === 127) return { status: "command-not-found" };
  if (typeof e.code === "number") return { status: "completed" };
  return { status: "spawn-error" };
}

/** Remove ANSI escape sequences and carriage returns */
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r/g, "");
}

/**
 * Normalize a test file path to repository-relative form with forward
 * slashes, stripping the worktree root when the runner printed it.
 */
export function normalizeTestPath(path: string, rootPath?: string): string {
  let p = path.trim().replace(/\\/g, "/");
  if (rootPath) {
    const root = rootPath.replace(/\\/g, "/").replace(/\/+$/, "") + "/";
    if (p.startsWith(root)) p = p.slice(root.length);
  }
  return p.replace(/^\.\//, "");
}

/** Build the stable identity for a test case */
export function testCaseId(file: string, name: string): string {
  return `${file} > ${name}`;
}

// Bun file header, e.g. "tests/foo.test.ts:"
const BUN_FILE_HEADER = /^(\S[^:]*?\.(?:[cm]?[jt]sx?)):$/;
// Bun result line: "(fail) a > b [1.23ms]" (non-TTY) or "✗ a > b [1.23ms]" (TTY)
const BUN_RESULT_LINE =
  /^(?:\((pass|fail|skip|todo)\)|([✓✗»✎]))\s+(.+?)(?:\s+\[[\d.]+\s*m?s\])?\s*$/;
const BUN_GLYPHS: Record<string, TestOutcome> = {
  "✓": "pass",
  "✗": "fail",
  "»": "skip",
  "✎": "todo",
};
const BUN_SUMMARY = /^Ran (\d+) tests? across (\d+) files?\./m;

/**
 * Extract per-test outcomes from runner output and decide whether they are
 * complete enough to compare against another run.
 *
 * Only Bun output is understood today; anything else is marked
 * non-comparable while counts parsing keeps working as before.
 */
export function parseStructuredResults(
  stdout: string,
  stderr: string,
  context: {
    passed: boolean;
    execution: TestExecution;
    testCounts?: TestCounts;
    rootPath?: string;
  }
): StructuredTestResults {
  const text = stripAnsi(stdout + "\n" + stderr);
  const counts = context.testCounts ?? parseTestCounts(stdout, stderr);
  const reasons: string[] = [];

  const isBun = /^bun test v\d/m.test(text) || BUN_SUMMARY.test(text);
  const tests: TestCaseResult[] = [];
  let loadErrors = 0;
  let unattributed = 0;

  if (isBun) {
    let file: string | null = null;
    const seen = new Map<string, number>();
    for (const line of text.split("\n")) {
      const header = line.match(BUN_FILE_HEADER);
      if (header) {
        file = normalizeTestPath(header[1], context.rootPath);
        continue;
      }
      if (/^# Unhandled error/.test(line)) {
        loadErrors++;
        continue;
      }
      const m = line.match(BUN_RESULT_LINE);
      if (!m) continue;
      const outcome = (m[1] as TestOutcome | undefined) ?? BUN_GLYPHS[m[2]];
      if (!file) {
        unattributed++;
        continue;
      }
      const name = m[3].replace(/\s+>\s+/g, " > ").trim();
      const id = testCaseId(file, name);
      const occurrence = (seen.get(id) ?? 0) + 1;
      seen.set(id, occurrence);
      tests.push({ id, file, name, occurrence, outcome });
    }
    // Bun's summary also reports "N error(s)" for errors outside tests
    const summaryErrors = text.match(/^\s*(\d+) errors?$/m);
    if (summaryErrors) {
      loadErrors = Math.max(loadErrors, parseInt(summaryErrors[1], 10));
    }
  } else {
    reasons.push("unsupported test runner output");
  }

  const failing = tests.filter((t) => t.outcome === "fail");
  const passesListed = tests.some((t) => t.outcome === "pass");

  if (context.execution.status !== "completed") {
    reasons.push(`test command did not complete (${context.execution.status})`);
  }
  if (isBun) {
    if (!BUN_SUMMARY.test(text)) reasons.push("missing run summary");
    if (!counts.parsed) reasons.push("missing pass/fail counts");
    if (loadErrors > 0) reasons.push(`${loadErrors} load or unhandled error(s)`);
    if (unattributed > 0) {
      reasons.push(`${unattributed} result(s) without a test file`);
    }
    if (counts.parsed && failing.length !== counts.failed) {
      reasons.push(
        `listed failures (${failing.length}) do not match reported fail count (${counts.failed})`
      );
    }
    if (
      counts.parsed &&
      passesListed &&
      tests.filter((t) => t.outcome === "pass").length !== counts.passed
    ) {
      reasons.push("listed passes do not match reported pass count");
    }
    if (!context.passed && context.execution.status === "completed" && failing.length === 0 && loadErrors === 0) {
      reasons.push("nonzero exit without any reported failure");
    }
  }

  const comparable = reasons.length === 0;

  let failureKind: TestFailureKind;
  if (context.passed) failureKind = "none";
  else if (context.execution.status !== "completed") failureKind = context.execution.status;
  else if (loadErrors > 0) failureKind = "load-error";
  else if (comparable && failing.length > 0) failureKind = "assertions";
  else failureKind = "unknown";

  return {
    runner: isBun ? "bun" : "unknown",
    failureKind,
    tests,
    failingTestIds: failing.map((t) => t.id),
    passesListed,
    loadErrors,
    comparable,
    incompleteReasons: reasons,
  };
}

/**
 * Extract a concise error summary from test output.
 * Used for retry prompts when tests fail.
 */
export function extractTestErrorSummary(
  stdout: string,
  stderr: string
): string {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");

  const errorLines: string[] = [];
  let capturing = false;
  let contextLines = 0;

  for (const line of lines) {
    const isError =
      /(?:error|fail|FAIL|Error|AssertionError|expect\()/i.test(line) &&
      !/warning/i.test(line);

    if (isError) {
      capturing = true;
      contextLines = 0;
      errorLines.push(line);
    } else if (capturing) {
      contextLines++;
      if (contextLines <= 5) {
        errorLines.push(line);
      } else {
        capturing = false;
      }
    }
  }

  if (errorLines.length === 0) {
    // Fall back to last 30 lines
    const tail = lines.slice(-30).join("\n");
    return truncate(tail, 3000);
  }

  return truncate(errorLines.join("\n"), 3000);
}

/**
 * Truncate a string to maxLen characters.
 */
function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + "\n\n[... truncated]";
}
