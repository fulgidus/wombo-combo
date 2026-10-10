/**
 * tdd-baseline-pipeline.test.ts — runFullVerification with a quest test baseline.
 *
 * Each test builds a real temp git repo (main, then a feature branch), runs the
 * real `bun test` command, and checks the combined pipeline verdict:
 *   - accepted pre-existing failures do not block
 *   - regressions block and are named in the combined error summary
 *   - a build failure blocks regardless of the baseline and skips TDD
 */

import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { runFullVerification } from "../src/lib/verifier";
import { createTestBaseline, type TestBaseline } from "../src/lib/test-baseline";
import { runTests } from "../src/lib/test-runner";
import type { WomboConfig } from "../src/config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUITE = "tests/a.test.ts";
const ID_A = `${SUITE} > fails A`;
const ID_B = `${SUITE} > fails B`;

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

const tmpDirs: string[] = [];

afterEach(() => {
  while (tmpDirs.length > 0) {
    rmSync(tmpDirs.pop()!, { recursive: true, force: true });
  }
});

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

/** Create a repo whose `main` branch holds `files` */
function makeMainRepo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "wombo-tdd-pipeline-"));
  tmpDirs.push(dir);
  git(dir, ["init", "-q"]);
  git(dir, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(dir, ["config", "user.email", "tdd-pipeline@example.com"]);
  git(dir, ["config", "user.name", "TDD Pipeline Test"]);
  writeRepoFiles(dir, files);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "baseline state"]);
  return dir;
}

/** Move to a feature branch and commit `files` on top of main */
function applyFeatureChanges(dir: string, files: Record<string, string>): void {
  git(dir, ["checkout", "-q", "-b", "feature"]);
  writeRepoFiles(dir, files);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "feature change"]);
}

/** Snapshot the current tree with the real test command, as a quest would */
async function captureBaseline(dir: string): Promise<TestBaseline> {
  const run = await runTests(dir, "bun test");
  return createTestBaseline(
    {
      questId: "quest-pipeline",
      sourceBranch: "main",
      commitSha: git(dir, ["rev-parse", "HEAD"]),
      testCommand: "bun test",
      timeoutMs: 120_000,
    },
    run
  );
}

function makeConfig(overrides?: Partial<WomboConfig>): WomboConfig {
  return {
    tasksDir: "tasks",
    archiveDir: "archive",
    baseBranch: "main",
    build: { command: "true", timeout: 300_000, artifactDir: "dist" },
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
      testCommand: "bun test",
      strictTdd: false,
      testTimeout: 120_000,
    },
    ...overrides,
  } as WomboConfig;
}

const TEST_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// runFullVerification with a baseline
// ---------------------------------------------------------------------------

describe("runFullVerification — test baseline", () => {
  test("no baseline: a failing test fails the pipeline (unchanged behavior)", async () => {
    const dir = makeMainRepo({ [SUITE]: SUITE_FAILS_A });
    const result = await runFullVerification(dir, "pipeline-feat", makeConfig());

    expect(result.build.passed).toBe(true);
    expect(result.tdd.ran).toBe(true);
    expect(result.tdd.passed).toBe(false);
    expect(result.tdd.baselineComparison).toBeUndefined();
    expect(result.overallPassed).toBe(false);
    expect(result.combinedErrorSummary).toContain("Test Failures");
    expect(result.combinedErrorSummary).toContain("fails A");
  }, TEST_TIMEOUT);

  test("accepted baseline failures do not block the pipeline", async () => {
    const dir = makeMainRepo({ [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(dir);

    const result = await runFullVerification(dir, "pipeline-feat", makeConfig(), {
      testBaseline: baseline,
    });

    expect(result.build.passed).toBe(true);
    expect(result.tdd.ran).toBe(true);
    expect(result.tdd.testRun!.passed).toBe(false);
    expect(result.tdd.baselineComparison!.verdict).toBe("pass");
    expect(result.tdd.baselineComparison!.unchangedFailures).toEqual([ID_A]);
    expect(result.overallPassed).toBe(true);
    // Nothing blocking: the accepted failure must not appear as an error
    expect(result.combinedErrorSummary).toBe("");
    expect(result.combinedErrorSummary).not.toContain("TDD Verification Errors");
    expect(result.combinedErrorSummary).not.toContain(ID_A);
  }, TEST_TIMEOUT);

  test("a regression fails the pipeline and the combined summary names the new failure", async () => {
    const dir = makeMainRepo({ [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(dir);
    applyFeatureChanges(dir, { [SUITE]: SUITE_FAILS_A_AND_B });

    const result = await runFullVerification(dir, "pipeline-feat", makeConfig(), {
      testBaseline: baseline,
    });

    expect(result.build.passed).toBe(true);
    expect(result.tdd.baselineComparison!.verdict).toBe("regression");
    expect(result.tdd.baselineComparison!.newFailures).toEqual([ID_B]);
    expect(result.overallPassed).toBe(false);
    expect(result.combinedErrorSummary).toContain("Test Regressions (vs quest baseline)");
    expect(result.combinedErrorSummary).toContain(`NEW FAILURE: ${ID_B}`);
    expect(result.combinedErrorSummary).not.toContain(`NEW FAILURE: ${ID_A}`);
  }, TEST_TIMEOUT);

  test("fixing a baseline failure keeps the pipeline green", async () => {
    const dir = makeMainRepo({ [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(dir);
    applyFeatureChanges(dir, { [SUITE]: SUITE_A_FIXED });

    const result = await runFullVerification(dir, "pipeline-feat", makeConfig(), {
      testBaseline: baseline,
    });

    expect(result.tdd.testRun!.passed).toBe(true);
    expect(result.tdd.baselineComparison!.verdict).toBe("pass");
    expect(result.overallPassed).toBe(true);
    expect(result.combinedErrorSummary).toBe("");
  }, TEST_TIMEOUT);

  test("a build failure fails the pipeline regardless of the baseline and skips TDD", async () => {
    const dir = makeMainRepo({ [SUITE]: SUITE_FAILS_A });
    const baseline = await captureBaseline(dir);

    const result = await runFullVerification(
      dir,
      "pipeline-feat",
      makeConfig({ build: { command: "false", timeout: 300_000, artifactDir: "dist" } }),
      { testBaseline: baseline }
    );

    expect(result.build.passed).toBe(false);
    expect(result.overallPassed).toBe(false);
    expect(result.tdd.ran).toBe(false);
    expect(result.tdd.testRun).toBeNull();
    expect(result.tdd.baselineComparison).toBeUndefined();
    expect(result.tdd.skipReason).toContain("build failed");
  }, TEST_TIMEOUT);
});
