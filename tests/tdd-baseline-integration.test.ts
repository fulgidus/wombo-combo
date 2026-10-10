/**
 * tdd-baseline-integration.test.ts — End-to-end acceptance tests for quest test baselines.
 *
 * Every scenario uses a disposable git repository under os.tmpdir() (never
 * under this repository's tests/ directory, so intentionally failing fixture
 * suites are not discovered by the project's own test run), real `bun test`
 * subprocesses, real baseline capture through ensureQuestTestBaseline, and the
 * real verification pipeline through runFullVerification.
 *
 * Coverage:
 *   - capture of a pre-existing failure; identical failure on a branch is accepted
 *   - a different failure replacing the old one (equal count) is rejected by name
 *   - fixing a baseline failure is accepted
 *   - a passing test that starts failing is a regression
 *   - skipping / removing a passing test (behavior depends on whether Bun lists passes)
 *   - capture isolation: uncommitted checkout changes are not part of the baseline
 *   - snapshot reuse after the base branch advances
 *   - infrastructure failures (timeout, load error, missing command) block, never accept
 */

import { describe, test, expect, afterEach } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import type { WomboConfig } from "../src/config";
import {
  BaselineCaptureError,
  ensureQuestTestBaseline,
  type EnsureQuestTestBaselineResult,
} from "../src/lib/test-baseline-capture";
import type { TestBaseline } from "../src/lib/test-baseline";
import type { TddVerificationResult } from "../src/lib/tdd-verifier";
import { runFullVerification } from "../src/lib/verifier";

// ---------------------------------------------------------------------------
// Constants & fixtures
// ---------------------------------------------------------------------------

const QUEST = "quest-acceptance";
const SUITE = "tests/suite.test.ts";
const OTHER = "tests/other.test.ts";
const ID_OK = `${SUITE} > stays green`;
const ID_A = `${SUITE} > pre-existing failure A`;
const ID_B = `${SUITE} > new failure B`;
const ID_C = `${SUITE} > later failure C`;
const TEST_TIMEOUT = 120_000;

type Mode = "pass" | "fail" | "skip";
interface Case {
  name: string;
  mode: Mode;
}

/** Bun test source for a list of cases. "fail" asserts a false expectation. */
function suiteSource(cases: Case[]): string {
  const lines = [`import { test, expect } from "bun:test";`];
  for (const { name, mode } of cases) {
    const fn = mode === "skip" ? "test.skip" : "test";
    const expected = mode === "fail" ? 2 : 1;
    lines.push(`${fn}(${JSON.stringify(name)}, () => { expect(1).toBe(${expected}); });`);
  }
  return lines.join("\n") + "\n";
}

const MAIN_SUITE: Case[] = [
  { name: "stays green", mode: "pass" },
  { name: "pre-existing failure A", mode: "fail" },
];

// ---------------------------------------------------------------------------
// Repository helpers
// ---------------------------------------------------------------------------

const tmpDirs: string[] = [];

afterEach(() => {
  while (tmpDirs.length > 0) {
    rmSync(tmpDirs.pop()!, { recursive: true, force: true });
  }
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
}

function writeFiles(repo: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(repo, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf-8");
  }
}

/** Disposable repo on `main` with runtime artifacts ignored */
function makeRepo(files: Record<string, string>): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "wombo-tdd-accept-")));
  tmpDirs.push(dir);
  git(dir, "init", "-q");
  git(dir, "symbolic-ref", "HEAD", "refs/heads/main");
  git(dir, "config", "user.email", "tdd-acceptance@example.com");
  git(dir, "config", "user.name", "TDD Acceptance Test");
  git(dir, "config", "commit.gpgsign", "false");
  writeFiles(dir, { ".gitignore": ".wombo-combo/\n", ...files });
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "main");
  return dir;
}

/** Write files on the current branch and commit them */
function commit(repo: string, files: Record<string, string>, message: string): void {
  writeFiles(repo, files);
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", message);
}

function checkoutNewBranch(repo: string, name: string): void {
  git(repo, "checkout", "-q", "-b", name);
}

function worktreeCount(repo: string): number {
  return git(repo, "worktree", "list", "--porcelain")
    .split("\n")
    .filter((line) => line.startsWith("worktree ")).length;
}

function snapshotPath(repo: string): string {
  return join(repo, ".wombo-combo", "baselines", QUEST, "tests.json");
}

// ---------------------------------------------------------------------------
// Config & pipeline helpers
// ---------------------------------------------------------------------------

function makeConfig(
  tdd: Partial<{ testCommand: string; testTimeout: number }> = {}
): WomboConfig {
  return {
    tasksDir: "tasks",
    archiveDir: "archive",
    baseBranch: "main",
    build: { command: "true", timeout: 60_000, artifactDir: "dist" },
    install: { command: "", timeout: 60_000 },
    git: { branchPrefix: "feature/", remote: "origin", mergeStrategy: "--no-ff" },
    browser: {
      enabled: false,
      bin: null,
      headless: true,
      testCommand: null,
      launchTimeout: 30_000,
      testTimeout: 60_000,
      defaultViewport: { width: 1280, height: 720 },
    },
    tdd: {
      enabled: true,
      testCommand: "bun test",
      strictTdd: false,
      testTimeout: 60_000,
      ...tdd,
    },
  } as unknown as WomboConfig;
}

async function captureError(promise: Promise<unknown>): Promise<BaselineCaptureError> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof BaselineCaptureError) return err;
    throw err;
  }
  throw new Error("expected ensureQuestTestBaseline to fail");
}

async function captureMain(repo: string, config: WomboConfig): Promise<TestBaseline> {
  const result: EnsureQuestTestBaselineResult = await ensureQuestTestBaseline({
    projectRoot: repo,
    questId: QUEST,
    baseBranch: "main",
    config,
  });
  if (result.status !== "captured") {
    throw new Error(`expected a fresh capture, got ${result.status}`);
  }
  return result.baseline;
}

/** Verify the checked-out tree of `repo` against a baseline */
function verify(repo: string, baseline: TestBaseline | undefined, config: WomboConfig) {
  return runFullVerification(repo, "acceptance-feature", config, {
    testBaseline: baseline,
  });
}

/** Whether this Bun run lists passing tests individually (needed for pass-level checks) */
function passesListedIn(tdd: TddVerificationResult): boolean {
  return tdd.testRun?.structured?.passesListed === true;
}

// ---------------------------------------------------------------------------
// Acceptance: identical failure on a branch
// ---------------------------------------------------------------------------

describe("baseline acceptance: pre-existing failure", () => {
  test(
    "a branch carrying the same pre-existing failure verifies OK",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const config = makeConfig();
      const baseline = await captureMain(repo, config);

      expect(baseline.results.passed).toBe(false);
      expect(baseline.results.structured?.failingTestIds).toEqual([ID_A]);

      checkoutNewBranch(repo, "feature-same");
      commit(repo, { [OTHER]: suiteSource([{ name: "unrelated", mode: "pass" }]) }, "unrelated");

      const result = await verify(repo, baseline, config);

      expect(result.build.passed).toBe(true);
      expect(result.tdd.ran).toBe(true);
      expect(result.tdd.testRun!.passed).toBe(false);
      expect(result.tdd.baselineComparison!.verdict).toBe("pass");
      expect(result.tdd.baselineComparison!.unchangedFailures).toEqual([ID_A]);
      expect(result.tdd.baselineComparison!.newFailures).toEqual([]);
      expect(result.overallPassed).toBe(true);
    },
    TEST_TIMEOUT
  );

  test(
    "replacing the old failure with a different one (same count) is rejected and names the new test",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const config = makeConfig();
      const baseline = await captureMain(repo, config);

      checkoutNewBranch(repo, "feature-swap");
      commit(
        repo,
        {
          [SUITE]: suiteSource([
            { name: "stays green", mode: "pass" },
            { name: "pre-existing failure A", mode: "pass" },
            { name: "new failure B", mode: "fail" },
          ]),
        },
        "swap failures"
      );

      const result = await verify(repo, baseline, config);
      const c = result.tdd.baselineComparison!;

      // Same number of failing tests as the baseline, different identity
      expect(result.tdd.testRun!.structured!.failingTestIds).toEqual([ID_B]);
      expect(c.verdict).toBe("regression");
      expect(c.newFailures).toEqual([ID_B]);
      expect(c.unchangedFailures).toEqual([]);
      expect(result.overallPassed).toBe(false);
      expect(result.combinedErrorSummary).toContain(`NEW FAILURE: ${ID_B}`);
      expect(result.combinedErrorSummary).not.toContain(`NEW FAILURE: ${ID_A}`);
    },
    TEST_TIMEOUT
  );

  test(
    "fixing the baseline failure is accepted",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const config = makeConfig();
      const baseline = await captureMain(repo, config);

      checkoutNewBranch(repo, "feature-fix");
      commit(
        repo,
        { [SUITE]: suiteSource([
          { name: "stays green", mode: "pass" },
          { name: "pre-existing failure A", mode: "pass" },
        ]) },
        "fix A"
      );

      const result = await verify(repo, baseline, config);
      const c = result.tdd.baselineComparison!;

      expect(result.tdd.testRun!.passed).toBe(true);
      expect(c.verdict).toBe("pass");
      expect(c.newFailures).toEqual([]);
      expect(result.overallPassed).toBe(true);
      // Passing identities are only listed when Bun reports them; otherwise the
      // fix is indistinguishable from a removed test and is reported as "no longer reported".
      if (passesListedIn(result.tdd)) {
        expect(c.fixedFailures).toEqual([ID_A]);
      } else {
        expect(c.fixedFailures).toEqual([]);
        expect(c.missingBaselineFailures).toEqual([ID_A]);
      }
    },
    TEST_TIMEOUT
  );

  test(
    "a passing test that starts failing is a regression",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const config = makeConfig();
      const baseline = await captureMain(repo, config);

      checkoutNewBranch(repo, "feature-regress");
      commit(
        repo,
        { [SUITE]: suiteSource([
          { name: "stays green", mode: "fail" },
          { name: "pre-existing failure A", mode: "fail" },
        ]) },
        "break green"
      );

      const result = await verify(repo, baseline, config);
      const c = result.tdd.baselineComparison!;

      expect(c.verdict).toBe("regression");
      expect(c.newFailures).toEqual([ID_OK]);
      expect(c.unchangedFailures).toEqual([ID_A]);
      expect(result.overallPassed).toBe(false);
      expect(result.combinedErrorSummary).toContain(`NEW FAILURE: ${ID_OK}`);
    },
    TEST_TIMEOUT
  );
});

// ---------------------------------------------------------------------------
// Passing tests that are skipped or removed
// ---------------------------------------------------------------------------

describe("baseline acceptance: passing tests skipped or removed", () => {
  test(
    "skipping a passing test blocks when passes are listed, and warns otherwise",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const config = makeConfig();
      const baseline = await captureMain(repo, config);

      checkoutNewBranch(repo, "feature-skip");
      commit(
        repo,
        { [SUITE]: suiteSource([
          { name: "stays green", mode: "skip" },
          { name: "pre-existing failure A", mode: "fail" },
        ]) },
        "skip green"
      );

      const result = await verify(repo, baseline, config);
      const c = result.tdd.baselineComparison!;
      const run = result.tdd.testRun!;

      if (run.structured!.passesListed && baseline.results.structured!.passesListed) {
        // e.g. under GitHub Actions, where Bun lists every passing test
        expect(c.regressedPasses).toEqual(["tests/suite.test.ts > stays green"]);
        expect(c.verdict).toBe("regression");
        expect(result.overallPassed).toBe(false);
      } else {
        // The skip can't be tied to a test identity: surfaced, not blocked
        expect(c.regressedPasses).toEqual([]);
        expect(c.warnings.some((w) => w.includes("more skipped test(s) than in the baseline"))).toBe(true);
        expect(c.verdict).toBe("pass");
        expect(result.overallPassed).toBe(true);
      }
    },
    TEST_TIMEOUT
  );

  test(
    "removing a passing test yields a fewer-tests warning and, without listed passes, is not blocked",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const config = makeConfig();
      const baseline = await captureMain(repo, config);

      checkoutNewBranch(repo, "feature-remove");
      commit(
        repo,
        { [SUITE]: suiteSource([{ name: "pre-existing failure A", mode: "fail" }]) },
        "remove green"
      );

      const result = await verify(repo, baseline, config);
      const c = result.tdd.baselineComparison!;
      const run = result.tdd.testRun!;

      expect(run.testCounts.total).toBe(1);
      expect(baseline.results.counts.total).toBe(2);
      expect(c.warnings).toContain("fewer tests ran than in the baseline (1 < 2)");
      expect(c.newFailures).toEqual([]);
      expect(result.tdd.summary).toContain("Baseline: PASS");

      if (passesListedIn(result.tdd) && baseline.results.structured!.passesListed) {
        expect(c.verdict).toBe("regression");
        expect(c.regressedPasses).toEqual([ID_OK]);
      } else {
        expect(c.regressedPasses).toEqual([]);
        expect(c.verdict).toBe("pass");
        expect(result.overallPassed).toBe(true);
      }
    },
    TEST_TIMEOUT
  );
});

// ---------------------------------------------------------------------------
// Capture isolation & snapshot lifecycle
// ---------------------------------------------------------------------------

describe("baseline capture isolation and reuse", () => {
  test(
    "uncommitted checkout changes are not part of the baseline and the checkout is left untouched",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const config = makeConfig();
      const headBefore = git(repo, "rev-parse", "HEAD");
      const worktreesBefore = worktreeCount(repo);

      // Dirty change that would break "stays green" if it were captured
      const dirtyContent = suiteSource([
        { name: "stays green", mode: "fail" },
        { name: "pre-existing failure A", mode: "fail" },
      ]);
      writeFiles(repo, { [SUITE]: dirtyContent });

      const baseline = await captureMain(repo, config);

      expect(baseline.commitSha).toBe(headBefore);
      expect(baseline.results.structured!.failingTestIds).toEqual([ID_A]);

      // Checkout is exactly as the user left it
      expect(readFileSync(join(repo, SUITE), "utf-8")).toBe(dirtyContent);
      expect(git(repo, "status", "--porcelain")).toBe(`M ${SUITE}`);
      expect(git(repo, "rev-parse", "HEAD")).toBe(headBefore);
      expect(worktreeCount(repo)).toBe(worktreesBefore);

      // Verifying the dirty tree judges its change against the clean baseline
      const result = await verify(repo, baseline, config);
      expect(result.tdd.baselineComparison!.verdict).toBe("regression");
      expect(result.tdd.baselineComparison!.newFailures).toEqual([ID_OK]);
      expect(result.overallPassed).toBe(false);
    },
    TEST_TIMEOUT
  );

  test(
    "the snapshot is reused after the base branch advances, without re-running tests",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const config = makeConfig();
      const first = await captureMain(repo, config);
      const snapshotBefore = readFileSync(snapshotPath(repo), "utf-8");
      const worktreesBefore = worktreeCount(repo);

      // main advances: a new failure and a fix land on it
      commit(
        repo,
        { [SUITE]: suiteSource([
          { name: "stays green", mode: "pass" },
          { name: "pre-existing failure A", mode: "pass" },
          { name: "later failure C", mode: "fail" },
        ]) },
        "advance main"
      );
      const newHead = git(repo, "rev-parse", "HEAD");
      expect(newHead).not.toBe(first.commitSha);

      const again = await ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config,
      });

      expect(again.status).toBe("reused");
      expect(again.status === "reused" && again.baseline.commitSha).toBe(first.commitSha);
      expect(again.status === "reused" && again.baseline.results.structured!.failingTestIds).toEqual([ID_A]);
      expect(readFileSync(snapshotPath(repo), "utf-8")).toBe(snapshotBefore);
      expect(worktreeCount(repo)).toBe(worktreesBefore);
    },
    TEST_TIMEOUT
  );
});

// ---------------------------------------------------------------------------
// Infrastructure failures block
// ---------------------------------------------------------------------------

describe("baseline infrastructure failures block", () => {
  test(
    "a test command that times out is never captured and blocks verification",
    async () => {
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });
      const tinyTimeout = makeConfig({ testTimeout: 1 });

      // Capture refuses to persist an incomplete run
      const err = await captureError(
        ensureQuestTestBaseline({
          projectRoot: repo,
          questId: QUEST,
          baseBranch: "main",
          config: tinyTimeout,
        })
      );
      expect(err.code).toBe("run-failed");
      expect(existsSync(snapshotPath(repo))).toBe(false);

      // A valid baseline plus a branch verified with a tiny timeout is not comparable
      const baseline = await captureMain(repo, makeConfig());
      checkoutNewBranch(repo, "feature-timeout");
      commit(repo, { [OTHER]: suiteSource([{ name: "unrelated", mode: "pass" }]) }, "unrelated");

      const result = await verify(repo, baseline, tinyTimeout);
      expect(result.tdd.testRun!.execution.status).toBe("timeout");
      expect(result.tdd.baselineComparison!.verdict).toBe("not-comparable");
      expect(result.tdd.baselineComparison!.reasons.join(" ")).toContain("timeout");
      expect(result.tdd.passed).toBe(false);
      expect(result.overallPassed).toBe(false);
    },
    TEST_TIMEOUT
  );

  test(
    "a test file that fails to load is never captured and blocks a branch that adds it",
    async () => {
      const brokenFile = `import { thing } from "./does-not-exist";\nimport { test, expect } from "bun:test";\ntest("x", () => expect(thing).toBe(1));\n`;

      const badRepo = makeRepo({ [SUITE]: brokenFile });
      const err = await captureError(
        ensureQuestTestBaseline({
          projectRoot: badRepo,
          questId: QUEST,
          baseBranch: "main",
          config: makeConfig(),
        })
      );
      expect(["not-usable", "run-failed"]).toContain(err.code);
      expect(existsSync(snapshotPath(badRepo))).toBe(false);

      const repo = makeRepo({ [SUITE]: suiteSource([{ name: "stays green", mode: "pass" }]) });
      const config = makeConfig();
      const baseline = await captureMain(repo, config);
      expect(baseline.results.passed).toBe(true);

      checkoutNewBranch(repo, "feature-load-error");
      commit(repo, { [OTHER]: brokenFile }, "add broken test file");

      const result = await verify(repo, baseline, config);
      expect(result.tdd.testRun!.passed).toBe(false);
      expect(result.tdd.baselineComparison!.verdict).toBe("not-comparable");
      expect(result.tdd.baselineComparison!.reasons.join(" ")).toContain("not comparable");
      expect(result.overallPassed).toBe(false);
    },
    TEST_TIMEOUT
  );

  test(
    "a missing test command is never captured and blocks verification",
    async () => {
      const missing = "wombo-no-such-test-runner --run";
      const repo = makeRepo({ [SUITE]: suiteSource(MAIN_SUITE) });

      const err = await captureError(
        ensureQuestTestBaseline({
          projectRoot: repo,
          questId: QUEST,
          baseBranch: "main",
          config: makeConfig({ testCommand: missing }),
        })
      );
      expect(err.code).toBe("run-failed");
      expect(existsSync(snapshotPath(repo))).toBe(false);

      // Baseline captured with bun test; the configured command is now missing
      const baseline = await captureMain(repo, makeConfig());
      const broken = makeConfig({ testCommand: missing });
      const result = await verify(repo, baseline, broken);

      expect(result.tdd.testRun!.execution.status).toBe("command-not-found");
      expect(result.tdd.baselineComparison!.verdict).toBe("not-comparable");
      expect(result.tdd.baselineComparison!.reasons.join(" ")).toContain("test command changed");
      expect(result.tdd.passed).toBe(false);
      expect(result.overallPassed).toBe(false);
    },
    TEST_TIMEOUT
  );
});
