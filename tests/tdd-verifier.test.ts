/**
 * tdd-verifier.test.ts — Unit tests for tdd-verifier.ts
 *
 * Coverage:
 *   - runTddVerification: disabled TDD config, skip-tests flag,
 *     test command execution, strict vs non-strict mode,
 *     overall pass/fail logic, summary building
 *   - extractTddErrorSummary: test failure extraction, missing tests in strict mode
 *   - renderTddVerificationReport: basic rendering (doesn't crash)
 *   - Quest test baseline: real `bun test` runs in temp git repos (accepted
 *     failures, regressions, fixes, not-comparable runs, timeouts, strict mode,
 *     skipping), summarizeBaselineComparison, baseline-aware error summaries
 *     and report rendering
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  runTddVerification,
  extractTddErrorSummary,
  renderTddVerificationReport,
  isNonTestableChangeOnly,
  summarizeBaselineComparison,
  type TddVerificationResult,
  type TddVerificationOptions,
} from "../src/lib/tdd-verifier";
import { createTestBaseline, type TestBaseline, type TestBaselineComparison } from "../src/lib/test-baseline";
import { runTests } from "../src/lib/test-runner";
import type { WomboConfig } from "../src/config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wombo-tdd-verifier-"));
  // Initialize a git repo so git diff commands work
  const { execSync } = require("node:child_process");
  execSync("git init && git commit --allow-empty -m 'init'", {
    cwd: tmpDir,
    stdio: "pipe",
  });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeConfig(overrides?: Partial<WomboConfig>): WomboConfig {
  return {
    tasksDir: "tasks",
    archiveDir: "archive",
    baseBranch: "main",
    build: { command: "echo build", timeout: 300_000, artifactDir: "dist" },
    install: { command: "echo install", timeout: 120_000 },
    git: {
      branchPrefix: "feature/",
      remote: "origin",
      mergeStrategy: "--no-ff",
    },
    agent: {
      bin: null,
      name: "generalist-agent",
      configFiles: [],
      tmuxPrefix: "wombo",
      multiplexer: "auto",
    },
    portless: {
      enabled: false,
      bin: null,
      proxyPort: 1355,
      https: false,
    },
    backup: { maxBackups: 5 },
    defaults: { maxConcurrent: 6, maxRetries: 2 },
    browser: {
      enabled: false,
      bin: null,
      headless: true,
      testCommand: null,
      launchTimeout: 30_000,
      testTimeout: 60_000,
      defaultViewport: { width: 1280, height: 720 },
    },
    agentRegistry: {
      mode: "auto",
      source: "msitarzewski/agency-agents",
      cacheDir: "agents-cache",
      cacheTTL: 24 * 60 * 60 * 1000,
    },
    tdd: {
      enabled: true,
      testCommand: "echo '3 pass'",
      strictTdd: false,
      testTimeout: 120_000,
    },
    ...overrides,
  } as WomboConfig;
}

// ---------------------------------------------------------------------------
// runTddVerification — Config-based skipping
// ---------------------------------------------------------------------------

describe("runTddVerification — skipping", () => {
  test("skips when TDD is disabled in config", async () => {
    const config = makeConfig({ tdd: { enabled: false, testCommand: "bun test", strictTdd: false, testTimeout: 120_000 } });
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
    });
    expect(result.ran).toBe(false);
    expect(result.skipReason).toContain("disabled");
    expect(result.passed).toBe(true);
    expect(result.testRun).toBeNull();
    expect(result.testDetection).toBeNull();
  });

  test("skips when --skip-tests flag is set", async () => {
    const config = makeConfig();
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
      skipTests: true,
    });
    expect(result.ran).toBe(false);
    expect(result.skipReason).toContain("--skip-tests");
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runTddVerification — Test execution
// ---------------------------------------------------------------------------

describe("runTddVerification — test execution", () => {
  test("runs test command and reports success", async () => {
    const config = makeConfig({
      tdd: { enabled: true, testCommand: "echo '5 pass'", strictTdd: false, testTimeout: 120_000 },
    });
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
    });
    expect(result.ran).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.testRun).not.toBeNull();
    expect(result.testRun!.passed).toBe(true);
    expect(result.testRun!.testCounts.passed).toBe(5);
  });

  test("reports failure when tests fail", async () => {
    const config = makeConfig({
      tdd: { enabled: true, testCommand: "echo '2 fail' && exit 1", strictTdd: false, testTimeout: 120_000 },
    });
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
    });
    expect(result.ran).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.testRun).not.toBeNull();
    expect(result.testRun!.passed).toBe(false);
  });

  test("uses custom test command from config", async () => {
    const config = makeConfig({
      tdd: { enabled: true, testCommand: "echo 'custom 10 pass'", strictTdd: false, testTimeout: 120_000 },
    });
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
    });
    expect(result.ran).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.testRun!.stdout).toContain("custom");
  });

  test("falls back to 'bun test' when testCommand is empty", async () => {
    const config = makeConfig({
      tdd: { enabled: true, testCommand: "", strictTdd: false, testTimeout: 120_000 },
    });
    // This will likely fail since there are no tests in tmpDir,
    // but it should still run (uses "bun test" fallback)
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
    });
    expect(result.ran).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runTddVerification — Strict mode
// ---------------------------------------------------------------------------

describe("runTddVerification — strict mode", () => {
  test("reports strictMode flag in result", async () => {
    const config = makeConfig();
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
      strictTdd: true,
    });
    expect(result.strictMode).toBe(true);
  });

  test("non-strict mode is default", async () => {
    const config = makeConfig();
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
    });
    expect(result.strictMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runTddVerification — Summary
// ---------------------------------------------------------------------------

describe("runTddVerification — summary", () => {
  test("includes test pass/fail info in summary", async () => {
    const config = makeConfig({
      tdd: { enabled: true, testCommand: "echo '5 pass'", strictTdd: false, testTimeout: 120_000 },
    });
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
    });
    expect(result.summary).toContain("5 passed");
    expect(result.summary).toContain("0 failed");
  });

  test("includes duration in summary", async () => {
    const config = makeConfig({
      tdd: { enabled: true, testCommand: "echo '1 pass'", strictTdd: false, testTimeout: 120_000 },
    });
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config,
    });
    // Summary includes duration like "(0s)"
    expect(result.summary).toMatch(/\d+s/);
  });
});

// ---------------------------------------------------------------------------
// extractTddErrorSummary
// ---------------------------------------------------------------------------

describe("extractTddErrorSummary", () => {
  test("extracts test run failures", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: {
        passed: false,
        exitCode: 1,
        stdout: "",
        stderr: "",
        durationMs: 100,
        testCounts: { total: 5, passed: 3, failed: 2, skipped: 0, parsed: true },
        errorSummary: "expect(true).toBe(false) at test.ts:42",
      },
      testDetection: null,
      passed: false,
      hasWarnings: false,
      summary: "",
      strictMode: false,
    };
    const summary = extractTddErrorSummary(result);
    expect(summary).toContain("Test Failures");
    expect(summary).toContain("expect(true).toBe(false)");
  });

  test("includes missing test files in strict mode", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: {
        passed: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
        durationMs: 100,
        testCounts: { total: 5, passed: 5, failed: 0, skipped: 0, parsed: true },
        errorSummary: "",
      },
      testDetection: {
        sourceFiles: [],
        withTests: [],
        missingTests: ["src/lib/new-module.ts", "src/lib/another.ts"],
        excludedFiles: [],
        testableCount: 3,
        coveredCount: 1,
        coverageRatio: 0.33,
        coveragePercent: "33.3%",
        comparedTo: "main",
      },
      passed: false,
      hasWarnings: false,
      summary: "",
      strictMode: true,
    };
    const summary = extractTddErrorSummary(result);
    expect(summary).toContain("Missing Tests");
    expect(summary).toContain("src/lib/new-module.ts");
    expect(summary).toContain("src/lib/another.ts");
  });

  test("does not include missing tests in non-strict mode", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: {
        passed: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
        durationMs: 100,
        testCounts: { total: 5, passed: 5, failed: 0, skipped: 0, parsed: true },
        errorSummary: "",
      },
      testDetection: {
        sourceFiles: [],
        withTests: [],
        missingTests: ["src/lib/new-module.ts"],
        excludedFiles: [],
        testableCount: 2,
        coveredCount: 1,
        coverageRatio: 0.5,
        coveragePercent: "50.0%",
        comparedTo: "main",
      },
      passed: true,
      hasWarnings: true,
      summary: "",
      strictMode: false,
    };
    const summary = extractTddErrorSummary(result);
    expect(summary).not.toContain("Missing Tests");
  });

  test("handles result with no test run errors", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: {
        passed: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
        durationMs: 100,
        testCounts: { total: 5, passed: 5, failed: 0, skipped: 0, parsed: true },
        errorSummary: "",
      },
      testDetection: null,
      passed: true,
      hasWarnings: false,
      summary: "",
      strictMode: false,
    };
    const summary = extractTddErrorSummary(result);
    expect(summary).toBe("");
  });

  test("truncates very long error summaries", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: {
        passed: false,
        exitCode: 1,
        stdout: "",
        stderr: "",
        durationMs: 100,
        testCounts: { total: 1, passed: 0, failed: 1, skipped: 0, parsed: true },
        errorSummary: "x".repeat(5000),
      },
      testDetection: null,
      passed: false,
      hasWarnings: false,
      summary: "",
      strictMode: false,
    };
    const summary = extractTddErrorSummary(result);
    expect(summary.length).toBeLessThanOrEqual(4000);
  });
});

// ---------------------------------------------------------------------------
// renderTddVerificationReport — smoke test
// ---------------------------------------------------------------------------

describe("renderTddVerificationReport", () => {
  test("renders skipped result without error", () => {
    const result: TddVerificationResult = {
      ran: false,
      skipReason: "TDD disabled",
      testRun: null,
      testDetection: null,
      passed: true,
      hasWarnings: false,
      summary: "Skipped",
      strictMode: false,
    };
    // Should not throw
    expect(() => renderTddVerificationReport(result)).not.toThrow();
  });

  test("renders full result without error", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: {
        passed: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
        durationMs: 500,
        testCounts: { total: 10, passed: 10, failed: 0, skipped: 0, parsed: true },
        errorSummary: "",
      },
      testDetection: {
        sourceFiles: [],
        withTests: ["src/lib/foo.ts"],
        missingTests: [],
        excludedFiles: ["src/types.d.ts"],
        testableCount: 1,
        coveredCount: 1,
        coverageRatio: 1.0,
        coveragePercent: "100.0%",
        comparedTo: "main",
      },
      passed: true,
      hasWarnings: false,
      summary: "Tests: 10 passed, 0 failed (0s)",
      strictMode: false,
    };
    expect(() => renderTddVerificationReport(result)).not.toThrow();
  });

  test("renders failed result with warnings without error", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: {
        passed: false,
        exitCode: 1,
        stdout: "",
        stderr: "",
        durationMs: 200,
        testCounts: { total: 5, passed: 3, failed: 2, skipped: 0, parsed: true },
        errorSummary: "2 tests failed",
      },
      testDetection: null,
      passed: false,
      hasWarnings: true,
      summary: "Tests: 3 passed, 2 failed (0s)",
      strictMode: true,
    };
    expect(() => renderTddVerificationReport(result)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// isNonTestableChangeOnly
// ---------------------------------------------------------------------------

describe("isNonTestableChangeOnly", () => {
  test("returns true when no source files changed", () => {
    const report = {
      sourceFiles: [],
      withTests: [],
      missingTests: [],
      excludedFiles: [],
      testableCount: 0,
      coveredCount: 0,
      coverageRatio: NaN,
      coveragePercent: "N/A",
      comparedTo: "main",
    };
    expect(isNonTestableChangeOnly(report)).toBe(true);
  });

  test("returns true when all source files are excluded", () => {
    const report = {
      sourceFiles: [
        {
          sourcePath: "src/config.json",
          hasTest: false,
          testFiles: [],
          excluded: true,
          excludeReason: "Non-testable file type (.json)",
        },
        {
          sourcePath: "src/types.d.ts",
          hasTest: false,
          testFiles: [],
          excluded: true,
          excludeReason: "Type declaration file (*.d.ts)",
        },
      ],
      withTests: [],
      missingTests: [],
      excludedFiles: ["src/config.json", "src/types.d.ts"],
      testableCount: 0,
      coveredCount: 0,
      coverageRatio: NaN,
      coveragePercent: "N/A",
      comparedTo: "main",
    };
    expect(isNonTestableChangeOnly(report)).toBe(true);
  });

  test("returns false when at least one source file is not excluded", () => {
    const report = {
      sourceFiles: [
        {
          sourcePath: "src/lib/utils.ts",
          hasTest: true,
          testFiles: ["tests/utils.test.ts"],
          excluded: false,
        },
        {
          sourcePath: "src/config.json",
          hasTest: false,
          testFiles: [],
          excluded: true,
          excludeReason: "Non-testable file type (.json)",
        },
      ],
      withTests: ["src/lib/utils.ts"],
      missingTests: [],
      excludedFiles: ["src/config.json"],
      testableCount: 1,
      coveredCount: 1,
      coverageRatio: 1,
      coveragePercent: "100.0%",
      comparedTo: "main",
    };
    expect(isNonTestableChangeOnly(report)).toBe(false);
  });

  test("returns false when a testable file is missing tests", () => {
    const report = {
      sourceFiles: [
        {
          sourcePath: "src/lib/new-feature.ts",
          hasTest: false,
          testFiles: [],
          excluded: false,
        },
      ],
      withTests: [],
      missingTests: ["src/lib/new-feature.ts"],
      excludedFiles: [],
      testableCount: 1,
      coveredCount: 0,
      coverageRatio: 0,
      coveragePercent: "0.0%",
      comparedTo: "main",
    };
    expect(isNonTestableChangeOnly(report)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Quest test baseline — real `bun test` runs in the temp git repo
// ---------------------------------------------------------------------------

const SUITE = "tests/a.test.ts";
const ID_A = `${SUITE} > fails A`;
const ID_B = `${SUITE} > fails B`;

const SUITE_ALL_PASS = `import { test, expect } from "bun:test";
test("passes A", () => expect(1).toBe(1));
test("fixed A", () => expect(1).toBe(1));
`;

const SUITE_FAILS_A = `import { test, expect } from "bun:test";
test("passes A", () => expect(1).toBe(1));
test("fails A", () => expect(1).toBe(2));
`;

const SUITE_FAILS_A_AND_B = SUITE_FAILS_A + `test("fails B", () => expect(1).toBe(3));
`;

const SUITE_A_FIXED = `import { test, expect } from "bun:test";
test("passes A", () => expect(1).toBe(1));
test("fails A", () => expect(1).toBe(1));
`;

const SUITE_SLOW = `import { test } from "bun:test";
test("slow", async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
});
`;

const BASELINE_QUEST = "quest-baseline";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
}

function writeRepoFiles(dir: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, "utf-8");
  }
}

/** Commit `files` as the `main` branch, configuring a local git identity */
function initMainRepo(dir: string, files: Record<string, string>): void {
  git(dir, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(dir, ["config", "user.email", "tdd-test@example.com"]);
  git(dir, ["config", "user.name", "TDD Test"]);
  writeRepoFiles(dir, files);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "baseline state"]);
}

/** Move to a feature branch and commit `files` on top of main */
function applyFeatureChanges(dir: string, files: Record<string, string>): void {
  git(dir, ["checkout", "-q", "-b", "feature"]);
  writeRepoFiles(dir, files);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "feature change"]);
}

/** Snapshot the current tree the way a quest does: run the real command, store the result */
async function captureBaseline(dir: string, testCommand = "bun test"): Promise<TestBaseline> {
  const run = await runTests(dir, "bun test");
  return createTestBaseline(
    {
      questId: BASELINE_QUEST,
      sourceBranch: "main",
      commitSha: git(dir, ["rev-parse", "HEAD"]),
      testCommand,
      timeoutMs: 120_000,
    },
    run
  );
}

function baselineConfig(overrides?: Partial<WomboConfig["tdd"]>): WomboConfig {
  return makeConfig({
    tdd: { enabled: true, testCommand: "bun test", strictTdd: false, testTimeout: 120_000, ...overrides },
  });
}

function makeComparison(overrides: Partial<TestBaselineComparison> = {}): TestBaselineComparison {
  return {
    verdict: "pass",
    newFailures: [],
    unchangedFailures: [],
    fixedFailures: [],
    skippedBaselineFailures: [],
    missingBaselineFailures: [],
    regressedPasses: [],
    reasons: [],
    warnings: [],
    ...overrides,
  };
}

function makeRunResult(passed: boolean, errorSummary = ""): TddVerificationResult["testRun"] {
  return {
    passed,
    exitCode: passed ? 0 : 1,
    stdout: "",
    stderr: "",
    durationMs: 10,
    testCounts: { total: 2, passed: passed ? 2 : 1, failed: passed ? 0 : 1, skipped: 0, parsed: true },
    errorSummary,
  };
}

describe("runTddVerification — test baseline (real bun test runs)", () => {
  test("without a baseline, a failing test fails and no comparison is attached", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig(),
    });
    expect(result.ran).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.baselineComparison).toBeUndefined();
    expect(result.testRun!.passed).toBe(false);
    expect(extractTddErrorSummary(result)).toContain("Test Failures");
  });

  test("failures recorded in the baseline are accepted when the run still fails only them", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(tmpDir);
    expect(baseline.results.structured?.failingTestIds).toEqual([ID_A]);

    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig(),
      testBaseline: baseline,
    });
    expect(result.passed).toBe(true);
    expect(result.testRun!.passed).toBe(false);
    expect(result.baselineComparison!.verdict).toBe("pass");
    expect(result.baselineComparison!.unchangedFailures).toEqual([ID_A]);
    expect(result.baselineComparison!.newFailures).toEqual([]);

    const summary = extractTddErrorSummary(result);
    expect(summary).not.toContain("Test Failures");
    expect(summary).not.toContain("NEW FAILURE");
  });

  test("a new failure fails verification; only the new one is listed as NEW FAILURE", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(tmpDir);
    applyFeatureChanges(tmpDir, { [SUITE]: SUITE_FAILS_A_AND_B });

    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig(),
      testBaseline: baseline,
    });
    expect(result.passed).toBe(false);
    expect(result.baselineComparison!.verdict).toBe("regression");
    expect(result.baselineComparison!.newFailures).toEqual([ID_B]);
    expect(result.baselineComparison!.unchangedFailures).toEqual([ID_A]);

    const summary = extractTddErrorSummary(result);
    expect(summary).toContain(`NEW FAILURE: ${ID_B}`);
    expect(summary).not.toContain(`NEW FAILURE: ${ID_A}`);
    expect(summary).toContain("accepted");
  });

  test("a baseline failure that is fixed does not fail verification", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(tmpDir);
    applyFeatureChanges(tmpDir, { [SUITE]: SUITE_A_FIXED });

    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig(),
      testBaseline: baseline,
    });
    expect(result.testRun!.passed).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.baselineComparison!.verdict).toBe("pass");
    expect(result.baselineComparison!.newFailures).toEqual([]);
    // Bun does not list passing tests in non-TTY output, so the fix shows up
    // as a missing baseline failure rather than a confirmed fixed one.
    const accounted = [
      ...result.baselineComparison!.fixedFailures,
      ...result.baselineComparison!.missingBaselineFailures,
      ...result.baselineComparison!.skippedBaselineFailures,
    ];
    expect(accounted).toContain(ID_A);
    expect(extractTddErrorSummary(result)).not.toContain("NEW FAILURE");
  });

  test("a baseline recorded with a different test command is not comparable and fails closed", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_ALL_PASS });
    const baseline = await captureBaseline(tmpDir, "npm test");

    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig(),
      testBaseline: baseline,
    });
    // The run itself is green, but the comparison cannot be trusted
    expect(result.testRun!.passed).toBe(true);
    expect(result.baselineComparison!.verdict).toBe("not-comparable");
    expect(result.baselineComparison!.reasons.join(" ")).toContain("test command changed");
    expect(result.passed).toBe(false);
    expect(result.summary).toContain("NOT COMPARABLE");

    const summary = extractTddErrorSummary(result);
    expect(summary).toContain("Could Not Be Compared To The Quest Baseline");
  });

  test("a run that exceeds testTimeout is not comparable even with a baseline", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(tmpDir);
    applyFeatureChanges(tmpDir, { [SUITE]: SUITE_SLOW });

    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig({ testTimeout: 50 }),
      testBaseline: baseline,
    });
    expect(result.testRun!.execution?.status).toBe("timeout");
    expect(result.passed).toBe(false);
    expect(result.baselineComparison!.verdict).toBe("not-comparable");
    expect(result.baselineComparison!.reasons.join(" ")).toContain("timeout");
  }, 30_000);

  test("strict mode still fails on missing tests when the baseline comparison passes", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(tmpDir);
    applyFeatureChanges(tmpDir, { "src/lib/new-mod.ts": "export const value = 1;\n" });

    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig(),
      strictTdd: true,
      testBaseline: baseline,
    });
    expect(result.baselineComparison!.verdict).toBe("pass");
    expect(result.testDetection!.missingTests).toContain("src/lib/new-mod.ts");
    expect(result.passed).toBe(false);
    expect(result.summary).toContain("FAIL");
    expect(extractTddErrorSummary(result)).toContain("Missing Tests (strict TDD mode)");
  }, 30_000);

  test("non-strict mode passes the same scenario and only warns about missing tests", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(tmpDir);
    applyFeatureChanges(tmpDir, { "src/lib/new-mod.ts": "export const value = 1;\n" });

    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig(),
      strictTdd: false,
      testBaseline: baseline,
    });
    expect(result.baselineComparison!.verdict).toBe("pass");
    expect(result.testDetection!.missingTests).toContain("src/lib/new-mod.ts");
    expect(result.passed).toBe(true);
    expect(result.hasWarnings).toBe(true);
  }, 30_000);

  test("--skip-tests still skips when a baseline is supplied", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(tmpDir);
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig(),
      skipTests: true,
      testBaseline: baseline,
    });
    expect(result.ran).toBe(false);
    expect(result.passed).toBe(true);
    expect(result.testRun).toBeNull();
    expect(result.baselineComparison).toBeUndefined();
  }, 30_000);

  test("disabled TDD still skips when a baseline is supplied", async () => {
    initMainRepo(tmpDir, { [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(tmpDir);
    const result = await runTddVerification({
      worktreePath: tmpDir,
      featureId: "test-feat",
      config: baselineConfig({ enabled: false }),
      testBaseline: baseline,
    });
    expect(result.ran).toBe(false);
    expect(result.passed).toBe(true);
    expect(result.testRun).toBeNull();
    expect(result.baselineComparison).toBeUndefined();
  }, 30_000);
});

describe("summarizeBaselineComparison", () => {
  test("pass with accepted failures", () => {
    const c = makeComparison({ unchangedFailures: ["a"] });
    expect(summarizeBaselineComparison(c)).toBe("Baseline: PASS — 1 accepted existing failure(s)");
  });

  test("pass reports fixed and no-longer-reported failures separately", () => {
    const c = makeComparison({ fixedFailures: ["a"], missingBaselineFailures: ["b"] });
    const line = summarizeBaselineComparison(c);
    expect(line).toContain("Baseline: PASS");
    expect(line).toContain("1 fixed");
    expect(line).toContain("1 no longer reported");
    expect(line).not.toContain("regression");
  });

  test("regression counts new failures and lost passes", () => {
    const c = makeComparison({
      verdict: "regression",
      newFailures: ["b"],
      regressedPasses: ["c"],
      unchangedFailures: ["a"],
    });
    expect(summarizeBaselineComparison(c)).toBe(
      "Baseline: REGRESSION — 2 regression(s), 1 accepted existing failure(s)"
    );
  });

  test("not-comparable shows the reasons", () => {
    const c = makeComparison({
      verdict: "not-comparable",
      reasons: ["test run did not complete (timeout)"],
    });
    expect(summarizeBaselineComparison(c)).toBe(
      "Baseline: NOT COMPARABLE — test run did not complete (timeout)"
    );
  });
});

describe("extractTddErrorSummary — baseline comparisons (hand-built)", () => {
  test("regression lists only new failures and skips accepted ones", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: makeRunResult(false, "error output"),
      testDetection: null,
      passed: false,
      hasWarnings: false,
      summary: "",
      strictMode: false,
      baselineComparison: makeComparison({
        verdict: "regression",
        newFailures: ["x.test.ts > new"],
        unchangedFailures: ["x.test.ts > old"],
      }),
    };
    const summary = extractTddErrorSummary(result);
    expect(summary).toContain("--- Test Regressions (vs quest baseline) ---");
    expect(summary).toContain("NEW FAILURE: x.test.ts > new");
    expect(summary).not.toContain("NEW FAILURE: x.test.ts > old");
    expect(summary).toContain("1 pre-existing baseline failure(s) are accepted");
    expect(summary).not.toContain("--- Test Failures ---");
  });

  test("not-comparable explains the reasons instead of listing failures", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: makeRunResult(false),
      testDetection: null,
      passed: false,
      hasWarnings: false,
      summary: "",
      strictMode: false,
      baselineComparison: makeComparison({
        verdict: "not-comparable",
        reasons: ["test command changed since baseline (\"npm test\" → \"bun test\")"],
      }),
    };
    const summary = extractTddErrorSummary(result);
    expect(summary).toContain("Could Not Be Compared To The Quest Baseline");
    expect(summary).toContain("test command changed");
    expect(summary).not.toContain("NEW FAILURE");
  });

  test("a passing baseline comparison produces no failure text even if the run failed", () => {
    const result: TddVerificationResult = {
      ran: true,
      skipReason: null,
      testRun: makeRunResult(false, "fails A details"),
      testDetection: null,
      passed: true,
      hasWarnings: false,
      summary: "",
      strictMode: false,
      baselineComparison: makeComparison({ unchangedFailures: ["x.test.ts > old"] }),
    };
    expect(extractTddErrorSummary(result)).toBe("");
  });
});

describe("renderTddVerificationReport — baseline comparison", () => {
  test("prints the baseline line and lists new failures", () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
    try {
      const result: TddVerificationResult = {
        ran: true,
        skipReason: null,
        testRun: makeRunResult(false, "error output"),
        testDetection: null,
        passed: false,
        hasWarnings: false,
        summary: "",
        strictMode: false,
        baselineComparison: makeComparison({
          verdict: "regression",
          newFailures: [ID_B],
          unchangedFailures: [ID_A],
          fixedFailures: ["x.test.ts > fixed one"],
        }),
      };
      renderTddVerificationReport(result);
    } finally {
      spy.mockRestore();
    }
    // Strip ANSI colour codes so assertions read plain text
    const text = logs.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
    expect(text).toContain("Baseline: REGRESSION — 1 regression(s), 1 accepted existing failure(s), 1 fixed");
    expect(text).toContain("New failures:");
    expect(text).toContain(`- ${ID_B}`);
    expect(text).toContain("Fixed baseline failures:");
    expect(text).toContain("TDD Overall: FAILED");
  });
});
