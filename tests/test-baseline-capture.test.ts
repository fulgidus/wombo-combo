/**
 * test-baseline-capture.test.ts — Integration tests for test-baseline-capture.ts
 *
 * Every test runs against a disposable Git repository with real `bun test`
 * runs, so these cover the actual worktree, install, run and persistence path.
 *
 * Coverage:
 *   - disabled TDD: no snapshot, no worktree
 *   - first capture from the base branch, pinned SHA and failing ids
 *   - passing-only base branch captures zero failures
 *   - second call reuses the snapshot without rerunning (base branch advanced)
 *   - captures the base branch, not the user's checkout (dirty tree untouched)
 *   - concurrent calls share one capture
 *   - linked worktree as projectRoot stores the snapshot in the main repo
 *   - temp worktree and directory are cleaned up on success and failure
 *   - failures throw BaselineCaptureError with the right code, no snapshot saved
 *   - existing snapshots are never regenerated (corrupt / incompatible)
 */

import { describe, test, expect, afterEach } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { WomboConfig } from "../src/config";
import {
  BaselineCaptureError,
  ensureQuestTestBaseline,
  type EnsureQuestTestBaselineResult,
} from "../src/lib/test-baseline-capture";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUEST = "q1";
const TEST_FILE = "tests/a.test.ts";
const BROKEN_ID = `${TEST_FILE} > broken`;

const createdDirs: string[] = [];

function tmpDir(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function git(cwd: string, ...args: string[]): string {
  const r = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr.toString()}`);
  }
  return r.stdout.toString().trim();
}

/** Bun test source where each case is [name, passes] */
function testSource(cases: Array<[string, boolean]>): string {
  const lines = [`import { test, expect } from "bun:test";`];
  for (const [name, passes] of cases) {
    lines.push(`test(${JSON.stringify(name)}, () => { expect(1).toBe(${passes ? 1 : 2}); });`);
  }
  return lines.join("\n") + "\n";
}

/** Write files and commit only those paths */
function commitFiles(repo: string, files: Record<string, string>, message: string): void {
  const paths: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(repo, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf-8");
    paths.push(rel);
  }
  git(repo, "add", "--", ...paths);
  git(repo, "commit", "-m", message);
}

/** Disposable repo on `main` with a .gitignore for runtime artifacts */
function makeRepo(files: Record<string, string>): string {
  const repo = tmpDir("wombo-cap-repo-");
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "Baseline Test");
  git(repo, "config", "commit.gpgsign", "false");
  commitFiles(repo, { ".gitignore": ".wombo-combo/\n", ...files }, "init");
  return repo;
}

function makeConfig(
  tdd: Partial<{ enabled: boolean; testCommand: string; testTimeout: number }> = {},
  install: Partial<{ command: string; timeout: number }> = {}
): WomboConfig {
  return {
    tdd: { enabled: true, testCommand: "bun test", testTimeout: 60_000, strictTdd: false, ...tdd },
    install: { command: "", timeout: 60_000, ...install },
  } as any as WomboConfig;
}

function snapshotPath(repo: string, questId = QUEST): string {
  return join(repo, ".wombo-combo", "baselines", questId, "tests.json");
}

function womboBaselineDirs(): Set<string> {
  return new Set(readdirSync(tmpdir()).filter((name) => name.startsWith("wombo-baseline-")));
}

function worktreeCount(repo: string): number {
  return git(repo, "worktree", "list", "--porcelain")
    .split("\n")
    .filter((line) => line.startsWith("worktree ")).length;
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

function expectCaptured(
  result: EnsureQuestTestBaselineResult
): Extract<EnsureQuestTestBaselineResult, { status: "captured" }> {
  if (result.status !== "captured") {
    throw new Error(`expected captured, got ${result.status}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ensureQuestTestBaseline: disabled", () => {
  test("tdd disabled returns disabled without touching git or storage", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true]]) });

    const result = await ensureQuestTestBaseline({
      projectRoot: repo,
      questId: QUEST,
      baseBranch: "main",
      config: makeConfig({ enabled: false }),
    });

    expect(result).toEqual({ status: "disabled" });
    expect(existsSync(join(repo, ".wombo-combo", "baselines"))).toBe(false);
    expect(worktreeCount(repo)).toBe(1);
  }, 60_000);
});

describe("ensureQuestTestBaseline: capture and reuse", () => {
  test("first call captures the base branch and persists the snapshot", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true], ["broken", false]]) });
    const mainSha = git(repo, "rev-parse", "main");

    const result = expectCaptured(
      await ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig(),
      })
    );

    expect(result.baseline.commitSha).toBe(mainSha);
    expect(result.baseline.sourceBranch).toBe("main");
    expect(result.baseline.questId).toBe(QUEST);
    expect(result.baseline.results.passed).toBe(false);
    expect(result.baseline.results.structured?.failingTestIds).toContain(BROKEN_ID);
    expect(result.path).toBe(snapshotPath(repo));
    expect(existsSync(snapshotPath(repo))).toBe(true);

    const onDisk = JSON.parse(readFileSync(snapshotPath(repo), "utf-8"));
    expect(onDisk.commitSha).toBe(mainSha);
    expect(onDisk.results.structured.failingTestIds).toContain(BROKEN_ID);
  }, 60_000);

  test("passing-only base branch captures with zero failures", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true], ["also ok", true]]) });

    const result = expectCaptured(
      await ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig(),
      })
    );

    expect(result.baseline.results.passed).toBe(true);
    expect(result.baseline.results.structured?.failingTestIds ?? []).toEqual([]);
    expect(existsSync(snapshotPath(repo))).toBe(true);
  }, 60_000);

  test("second call reuses the snapshot even after the base branch advanced", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true], ["broken", false]]) });
    const config = makeConfig();

    const first = expectCaptured(
      await ensureQuestTestBaseline({ projectRoot: repo, questId: QUEST, baseBranch: "main", config })
    );
    const originalFailures = [...(first.baseline.results.structured?.failingTestIds ?? [])];

    // Advance main with a new failing test; a rerun would now report two failures
    commitFiles(repo, { "tests/b.test.ts": testSource([["extra", false]]) }, "add failing test");
    const advancedSha = git(repo, "rev-parse", "main");
    expect(advancedSha).not.toBe(first.baseline.commitSha);

    const second = await ensureQuestTestBaseline({
      projectRoot: repo,
      questId: QUEST,
      baseBranch: "main",
      config,
    });

    expect(second.status).toBe("reused");
    if (second.status !== "reused") return;
    expect(second.baseline.commitSha).toBe(first.baseline.commitSha);
    expect(second.baseline.results.structured?.failingTestIds).toEqual(originalFailures);
    expect(second.baseline.results.structured?.failingTestIds).not.toContain("tests/b.test.ts > extra");
    expect(second.path).toBe(snapshotPath(repo));
  }, 60_000);

  test("captures the base branch, not the user's dirty checkout", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true], ["broken", false]]) });

    // Quest branch with an extra committed failure
    git(repo, "checkout", "-b", "quest/x");
    commitFiles(repo, { "tests/b.test.ts": testSource([["quest only", false]]) }, "quest failure");

    // Uncommitted modification making "ok" fail, plus an untracked scratch file
    const modifiedContent = testSource([["ok", false], ["broken", false]]);
    writeFileSync(join(repo, TEST_FILE), modifiedContent, "utf-8");
    writeFileSync(join(repo, "scratch.txt"), "user notes\n", "utf-8");

    const branchBefore = git(repo, "branch", "--show-current");
    const statusBefore = git(repo, "status", "--porcelain");
    expect(branchBefore).toBe("quest/x");
    expect(statusBefore).not.toBe("");

    const result = expectCaptured(
      await ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig(),
      })
    );

    expect(result.baseline.sourceBranch).toBe("main");
    expect(result.baseline.commitSha).toBe(git(repo, "rev-parse", "main"));
    expect(result.baseline.results.structured?.failingTestIds).toEqual([BROKEN_ID]);

    // User's checkout is untouched
    expect(git(repo, "branch", "--show-current")).toBe(branchBefore);
    expect(readFileSync(join(repo, TEST_FILE), "utf-8")).toBe(modifiedContent);
    expect(readFileSync(join(repo, "scratch.txt"), "utf-8")).toBe("user notes\n");
    expect(git(repo, "status", "--porcelain")).toBe(statusBefore);
  }, 60_000);

  test("concurrent calls for the same quest share one capture", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true], ["broken", false]]) });
    const config = makeConfig();
    const logA: string[] = [];
    const logB: string[] = [];

    const [a, b] = await Promise.all([
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config,
        log: (m) => logA.push(m),
      }),
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config,
        log: (m) => logB.push(m),
      }),
    ]);

    expect(a.status).toBe("captured");
    expect(b.status).toBe("captured");
    if (a.status !== "captured" || b.status !== "captured") return;
    expect(a.baseline.commitSha).toBe(b.baseline.commitSha);
    expect(a.baseline.capturedAt).toBe(b.baseline.capturedAt);
    expect(a.path).toBe(b.path);

    // Only one capture ran: exactly one "capturing" line across both logs
    const captureLines = [...logA, ...logB].filter((m) => m.startsWith("capturing test baseline"));
    expect(captureLines.length).toBe(1);
  }, 60_000);

  test("linked worktree as projectRoot stores the snapshot in the main repo", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true], ["broken", false]]) });
    const linked = join(tmpDir("wombo-cap-wt-"), "wt");
    git(repo, "worktree", "add", linked, "-b", "wt");

    const result = expectCaptured(
      await ensureQuestTestBaseline({
        projectRoot: linked,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig(),
      })
    );

    expect(result.path).toBe(snapshotPath(repo));
    expect(existsSync(snapshotPath(repo))).toBe(true);
    expect(existsSync(join(linked, ".wombo-combo", "baselines"))).toBe(false);
    expect(result.baseline.results.structured?.failingTestIds).toContain(BROKEN_ID);
  }, 60_000);
});

describe("ensureQuestTestBaseline: cleanup", () => {
  test("success leaves no temp worktree or wombo-baseline dir behind", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true], ["broken", false]]) });
    const dirsBefore = womboBaselineDirs();

    expectCaptured(
      await ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig(),
      })
    );

    expect(worktreeCount(repo)).toBe(1);
    expect(womboBaselineDirs()).toEqual(dirsBefore);
  }, 60_000);

  test("failure leaves no temp worktree or wombo-baseline dir behind", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true]]) });
    const dirsBefore = womboBaselineDirs();

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig({}, { command: "false" }),
      })
    );

    expect(err.code).toBe("install-failed");
    expect(worktreeCount(repo)).toBe(1);
    expect(womboBaselineDirs()).toEqual(dirsBefore);
  }, 60_000);
});

describe("ensureQuestTestBaseline: failures", () => {
  test("unknown base branch throws resolve-failed", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true]]) });

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "does-not-exist",
        config: makeConfig(),
      })
    );

    expect(err.code).toBe("resolve-failed");
    expect(existsSync(snapshotPath(repo))).toBe(false);
  }, 60_000);

  test("base branch starting with '--' throws resolve-failed", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true]]) });

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "--evil",
        config: makeConfig(),
      })
    );

    expect(err.code).toBe("resolve-failed");
    expect(existsSync(snapshotPath(repo))).toBe(false);
  }, 60_000);

  test("failing install command throws install-failed", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true]]) });

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig({}, { command: "false" }),
      })
    );

    expect(err.code).toBe("install-failed");
    expect(existsSync(snapshotPath(repo))).toBe(false);
  }, 60_000);

  test("test run exceeding testTimeout throws run-failed", async () => {
    const repo = makeRepo({
      [TEST_FILE]: `import { test } from "bun:test";\ntest("slow", async () => { await Bun.sleep(2000); });\n`,
    });

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig({ testTimeout: 50 }),
      })
    );

    expect(err.code).toBe("run-failed");
    expect(existsSync(snapshotPath(repo))).toBe(false);
  }, 60_000);

  test("test file that fails to load throws not-usable", async () => {
    const repo = makeRepo({
      [TEST_FILE]: `import { test } from "bun:test";\nimport "./missing-module";\ntest("ok", () => {});\n`,
    });

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig(),
      })
    );

    expect(err.code).toBe("not-usable");
    expect(existsSync(snapshotPath(repo))).toBe(false);
  }, 60_000);

  test("nonexistent test command throws run-failed", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true]]) });

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig({ testCommand: "definitely-not-a-cmd" }),
      })
    );

    expect(err.code).toBe("run-failed");
    expect(existsSync(snapshotPath(repo))).toBe(false);
  }, 60_000);
});

describe("ensureQuestTestBaseline: existing snapshots are never regenerated", () => {
  test("corrupt snapshot throws corrupt and is left unchanged", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true]]) });
    mkdirSync(dirname(snapshotPath(repo)), { recursive: true });
    const garbage = "{ this is not json";
    writeFileSync(snapshotPath(repo), garbage, "utf-8");

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig(),
      })
    );

    expect(err.code).toBe("corrupt");
    expect(readFileSync(snapshotPath(repo), "utf-8")).toBe(garbage);
  }, 60_000);

  test("snapshot captured with another testCommand throws incompatible and is unchanged", async () => {
    const repo = makeRepo({ [TEST_FILE]: testSource([["ok", true], ["broken", false]]) });

    expectCaptured(
      await ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig({ testCommand: "bun test" }),
      })
    );
    const before = readFileSync(snapshotPath(repo), "utf-8");

    const err = await captureError(
      ensureQuestTestBaseline({
        projectRoot: repo,
        questId: QUEST,
        baseBranch: "main",
        config: makeConfig({ testCommand: "bun test --bail" }),
      })
    );

    expect(err.code).toBe("incompatible");
    expect(err.message).toContain(snapshotPath(repo));
    expect(readFileSync(snapshotPath(repo), "utf-8")).toBe(before);
  }, 60_000);
});
