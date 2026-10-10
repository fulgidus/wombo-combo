/**
 * test-baseline.test.ts — Unit tests for test-baseline.ts
 *
 * Coverage:
 *   - testBaselinePath: layout and quest id safety
 *   - canonical root: main repo and linked worktree share one snapshot file
 *   - save/load: roundtrip, pretty JSON, atomic write, immutability, validation
 *   - load: missing, corrupt, incompatible classification
 *   - validateTestBaseline shape checks
 *   - compareTestRunToBaseline: identity-based verdicts and warnings
 *   - checkBaselineUsable, toTestBaselineSummary
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  TEST_BASELINE_PARSER_FORMAT,
  TEST_BASELINE_VERSION,
  checkBaselineUsable,
  compareTestRunToBaseline,
  createTestBaseline,
  loadTestBaseline,
  saveTestBaseline,
  testBaselinePath,
  toTestBaselineSummary,
  validateTestBaseline,
  type TestBaseline,
} from "../src/lib/test-baseline";
import type {
  TestCaseResult,
  TestExecutionStatus,
  TestFailureKind,
  TestOutcome,
  TestRunResult,
} from "../src/lib/test-runner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAPTURED_AT = new Date("2026-01-01T00:00:00.000Z");

/** Split "file > name" ids back into their parts */
function splitId(id: string): { file: string; name: string } {
  const idx = id.indexOf(" > ");
  if (idx < 0) throw new Error(`test id must look like "file > name": ${id}`);
  return { file: id.slice(0, idx), name: id.slice(idx + 3) };
}

/** Build a TestRunResult with consistent structured results for synthetic runs */
function makeRun(opts: {
  passed: boolean;
  execution?: TestExecutionStatus;
  failing: string[];
  passes?: string[];
  skips?: string[];
  comparable?: boolean;
  passesListed?: boolean;
}): TestRunResult {
  const execution = opts.execution ?? "completed";
  const passes = opts.passes ?? [];
  const skips = opts.skips ?? [];
  const comparable = opts.comparable ?? true;
  const passesListed = opts.passesListed ?? opts.passes !== undefined;

  const seen = new Map<string, number>();
  const tests: TestCaseResult[] = [];
  const add = (id: string, outcome: TestOutcome) => {
    const { file, name } = splitId(id);
    const occurrence = (seen.get(id) ?? 0) + 1;
    seen.set(id, occurrence);
    tests.push({ id, file, name, occurrence, outcome });
  };
  for (const id of opts.failing) add(id, "fail");
  for (const id of passes) add(id, "pass");
  for (const id of skips) add(id, "skip");

  const failureKind: TestFailureKind = opts.passed
    ? "none"
    : execution !== "completed"
      ? execution
      : comparable
        ? "assertions"
        : "unknown";

  return {
    passed: opts.passed,
    exitCode: opts.passed ? 0 : 1,
    stdout: "",
    stderr: "",
    durationMs: 10,
    testCounts: {
      total: passes.length + opts.failing.length + skips.length,
      passed: passes.length,
      failed: opts.failing.length,
      skipped: skips.length,
      parsed: true,
    },
    errorSummary: "",
    execution: { status: execution },
    structured: {
      runner: "bun",
      failureKind,
      tests,
      failingTestIds: [...opts.failing],
      passesListed,
      loadErrors: 0,
      comparable,
      incompleteReasons: comparable ? [] : ["synthetic incomplete run"],
    },
  };
}

/** Build a baseline snapshot from a run with stable default metadata */
function makeBaseline(
  run: TestRunResult,
  overrides: Partial<{
    questId: string;
    sourceBranch: string;
    commitSha: string;
    testCommand: string;
    timeoutMs: number;
    capturedAt: Date;
  }> = {}
): TestBaseline {
  return createTestBaseline(
    {
      questId: "q1",
      sourceBranch: "main",
      commitSha: "abc123def",
      testCommand: "bun test",
      timeoutMs: 120_000,
      capturedAt: CAPTURED_AT,
      ...overrides,
    },
    run
  );
}

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function git(cwd: string, ...args: string[]): string {
  const r = Bun.spawnSync(
    ["git", "-c", "commit.gpgsign=false", ...args],
    { cwd, stdout: "pipe", stderr: "pipe" }
  );
  if (r.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr.toString()}`);
  }
  return r.stdout.toString();
}

/** Create a repo with one commit on main; returns its (real) path */
function makeRepo(): string {
  const base = makeTempDir("tb-repo-");
  const repo = join(base, "repo");
  mkdirSync(repo);
  git(repo, "init", "-q", "-b", "main");
  git(repo, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-q", "--allow-empty", "-m", "init");
  return realpathSync(repo);
}

function writeRawBaseline(root: string, questId: string, content: string): string {
  const path = testBaselinePath(root, questId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
  return path;
}

function compare(
  baseline: TestBaseline,
  run: TestRunResult,
  options: { testCommand?: string } = {}
) {
  return compareTestRunToBaseline(baseline, run, options);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Storage: paths
// ---------------------------------------------------------------------------

describe("testBaselinePath", () => {
  test("places the snapshot under .wombo-combo/baselines/<quest>/tests.json", () => {
    const root = makeRepo();
    expect(testBaselinePath(root, "q1")).toBe(
      resolve(root, ".wombo-combo", "baselines", "q1", "tests.json")
    );
  });

  test("accepts ids with dots, dashes and underscores", () => {
    const root = makeRepo();
    expect(() => testBaselinePath(root, "quest-1.a_b")).not.toThrow();
  });

  test.each(["../x", "a/b", "", "..", "-x", "a\\b", "a b"])(
    "rejects unsafe quest id %p",
    (questId) => {
      const root = makeRepo();
      expect(() => testBaselinePath(root, questId)).toThrow(/Invalid quest id/);
    }
  );
});

describe("canonical project root", () => {
  test("main repo and linked worktree resolve to the same snapshot file", () => {
    const repo = makeRepo();
    const wt = join(makeTempDir("tb-wt-"), "wt");
    git(repo, "worktree", "add", "-q", wt, "-b", "wt");

    expect(testBaselinePath(wt, "q1")).toBe(testBaselinePath(repo, "q1"));
  });

  test("save via worktree, load via main root", () => {
    const repo = makeRepo();
    const wt = join(makeTempDir("tb-wt-"), "wt");
    git(repo, "worktree", "add", "-q", wt, "-b", "wt");

    const baseline = makeBaseline(makeRun({ passed: true, failing: [] }));
    const savedPath = saveTestBaseline(wt, baseline);

    expect(savedPath).toBe(resolve(repo, ".wombo-combo", "baselines", "q1", "tests.json"));
    const loaded = loadTestBaseline(repo, "q1");
    expect(loaded.status).toBe("ok");
    expect(loaded.path).toBe(savedPath);
  });

  test("save via main root, load via worktree", () => {
    const repo = makeRepo();
    const wt = join(makeTempDir("tb-wt-"), "wt");
    git(repo, "worktree", "add", "-q", wt, "-b", "wt");

    const baseline = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    saveTestBaseline(repo, baseline);

    const loaded = loadTestBaseline(wt, "q1");
    expect(loaded.status).toBe("ok");
    if (loaded.status === "ok") expect(loaded.baseline).toEqual(baseline);
  });
});

// ---------------------------------------------------------------------------
// Storage: save / load
// ---------------------------------------------------------------------------

describe("save and load", () => {
  test("roundtrip returns status ok with a deep-equal baseline", () => {
    const root = makeRepo();
    const baseline = makeBaseline(
      makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > A"], passes: ["a.test.ts > P"] })
    );
    saveTestBaseline(root, baseline);

    const loaded = loadTestBaseline(root, "q1");
    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok") return;
    expect(loaded.baseline).toEqual(baseline);
    expect(loaded.path).toBe(testBaselinePath(root, "q1"));
  });

  test("file is pretty-printed JSON with a trailing newline", () => {
    const root = makeRepo();
    const baseline = makeBaseline(makeRun({ passed: true, failing: [] }));
    const path = saveTestBaseline(root, baseline);

    const text = readFileSync(path, "utf-8");
    expect(text).toBe(JSON.stringify(baseline, null, 2) + "\n");
    expect(text).toContain("\n  \"version\"");
  });

  test("leaves no temporary files behind", () => {
    const root = makeRepo();
    const path = saveTestBaseline(root, makeBaseline(makeRun({ passed: true, failing: [] })));
    const leftovers = readdirSync(dirname(path)).filter((f) => f.endsWith(".tmp"));
    expect(leftovers).toEqual([]);
    expect(readdirSync(dirname(path))).toEqual(["tests.json"]);
  });

  test("saving twice throws because snapshots are immutable", () => {
    const root = makeRepo();
    const baseline = makeBaseline(makeRun({ passed: true, failing: [] }));
    saveTestBaseline(root, baseline);
    expect(() => saveTestBaseline(root, baseline)).toThrow(/immutable/);
  });

  test("saving twice with overwrite succeeds and replaces the snapshot", () => {
    const root = makeRepo();
    saveTestBaseline(root, makeBaseline(makeRun({ passed: true, failing: [] })));
    const second = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }), {
      commitSha: "newsha",
    });
    expect(() => saveTestBaseline(root, second, { overwrite: true })).not.toThrow();

    const loaded = loadTestBaseline(root, "q1");
    expect(loaded.status === "ok" && loaded.baseline.commitSha).toBe("newsha");
  });

  test("refuses to save an invalid baseline (empty commitSha)", () => {
    const root = makeRepo();
    const bad = { ...makeBaseline(makeRun({ passed: true, failing: [] })), commitSha: "" };
    expect(() => saveTestBaseline(root, bad)).toThrow(/Refusing to save invalid test baseline/);
    expect(loadTestBaseline(root, "q1").status).toBe("missing");
  });

  test("save rejects an unsafe quest id", () => {
    const root = makeRepo();
    const bad = makeBaseline(makeRun({ passed: true, failing: [] }), { questId: "../x" });
    expect(() => saveTestBaseline(root, bad)).toThrow(/Invalid quest id/);
  });
});

describe("load classification", () => {
  test("missing file -> missing", () => {
    const root = makeRepo();
    const result = loadTestBaseline(root, "q1");
    expect(result).toEqual({ status: "missing", path: testBaselinePath(root, "q1") });
  });

  test("garbage text -> corrupt", () => {
    const root = makeRepo();
    writeRawBaseline(root, "q1", "this is not json {{{");
    const result = loadTestBaseline(root, "q1");
    expect(result.status).toBe("corrupt");
  });

  test("JSON array -> corrupt", () => {
    const root = makeRepo();
    writeRawBaseline(root, "q1", "[1, 2, 3]");
    const result = loadTestBaseline(root, "q1");
    expect(result.status).toBe("corrupt");
    if (result.status === "corrupt") expect(result.error).toMatch(/not an object/);
  });

  test("wrong version -> incompatible", () => {
    const root = makeRepo();
    const raw = { ...makeBaseline(makeRun({ passed: true, failing: [] })), version: 999 };
    writeRawBaseline(root, "q1", JSON.stringify(raw));
    const result = loadTestBaseline(root, "q1");
    expect(result.status).toBe("incompatible");
    if (result.status === "incompatible") expect(result.error).toMatch(/version/);
  });

  test("wrong parserFormat -> incompatible", () => {
    const root = makeRepo();
    const raw = { ...makeBaseline(makeRun({ passed: true, failing: [] })), parserFormat: "other/9" };
    writeRawBaseline(root, "q1", JSON.stringify(raw));
    const result = loadTestBaseline(root, "q1");
    expect(result.status).toBe("incompatible");
    if (result.status === "incompatible") expect(result.error).toMatch(/parser format/);
  });

  test("valid shape but a different questId -> incompatible", () => {
    const root = makeRepo();
    const other = makeBaseline(makeRun({ passed: true, failing: [] }), { questId: "other" });
    writeRawBaseline(root, "q1", JSON.stringify(other));
    const result = loadTestBaseline(root, "q1");
    expect(result.status).toBe("incompatible");
    if (result.status === "incompatible") expect(result.error).toMatch(/"other"/);
  });

  test("missing required field (results.counts) -> corrupt", () => {
    const root = makeRepo();
    const raw: any = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    delete raw.results.counts;
    writeRawBaseline(root, "q1", JSON.stringify(raw));
    const result = loadTestBaseline(root, "q1");
    expect(result.status).toBe("corrupt");
    if (result.status === "corrupt") expect(result.error).toMatch(/counts/);
  });

  test("a directory where the file should be -> corrupt, not a throw", () => {
    const root = makeRepo();
    mkdirSync(testBaselinePath(root, "q1"), { recursive: true });
    expect(loadTestBaseline(root, "q1").status).toBe("corrupt");
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("validateTestBaseline", () => {
  test("returns no errors for a valid failing baseline", () => {
    const baseline = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"], passes: ["a.test.ts > P"] }));
    expect(validateTestBaseline(baseline)).toEqual([]);
  });

  test("returns no errors for a valid clean baseline without structured results", () => {
    const run = { ...makeRun({ passed: true, failing: [] }), structured: undefined };
    expect(validateTestBaseline(makeBaseline(run))).toEqual([]);
  });

  test("rejects non-objects", () => {
    expect(validateTestBaseline(null)).toEqual(["baseline is not an object"]);
    expect(validateTestBaseline("x")).toEqual(["baseline is not an object"]);
    expect(validateTestBaseline([])).toEqual(["baseline is not an object"]);
  });

  test("reports an empty commitSha", () => {
    const bad = { ...makeBaseline(makeRun({ passed: true, failing: [] })), commitSha: "" };
    expect(validateTestBaseline(bad)).toEqual(["commitSha must be a non-empty string"]);
  });

  test("reports a version mismatch", () => {
    const bad = { ...makeBaseline(makeRun({ passed: true, failing: [] })), version: 2 };
    expect(validateTestBaseline(bad)).toContain("version mismatch");
  });

  test("reports an unparseable capturedAt", () => {
    const bad = { ...makeBaseline(makeRun({ passed: true, failing: [] })), capturedAt: "not a date" };
    expect(validateTestBaseline(bad)).toContain("capturedAt must be an ISO timestamp");
  });

  test("reports a non-positive timeout", () => {
    const bad = { ...makeBaseline(makeRun({ passed: true, failing: [] })), timeoutMs: 0 };
    expect(validateTestBaseline(bad)).toContain("timeoutMs must be a positive number");
  });

  test("reports an invalid execution status", () => {
    const base = makeBaseline(makeRun({ passed: true, failing: [] }));
    const bad = { ...base, results: { ...base.results, execution: "exploded" } };
    expect(validateTestBaseline(bad)).toContain("results.execution is invalid");
  });

  test("reports a non-object results field", () => {
    const bad = { ...makeBaseline(makeRun({ passed: true, failing: [] })), results: "nope" };
    expect(validateTestBaseline(bad)).toEqual(["results must be an object"]);
  });

  test("reports malformed structured results", () => {
    const base = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const bad = {
      ...base,
      results: { ...base.results, structured: { ...base.results.structured, failingTestIds: [1] } },
    };
    expect(validateTestBaseline(bad)).toContain("structured.failingTestIds must be a string array");
  });

  test("reports an invalid test outcome", () => {
    const base = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const tests = [{ ...base.results.structured!.tests[0], outcome: "weird" }];
    const bad = {
      ...base,
      results: { ...base.results, structured: { ...base.results.structured!, tests } },
    };
    expect(validateTestBaseline(bad)).toContain("structured.tests is invalid");
  });
});

// ---------------------------------------------------------------------------
// Usability and summary
// ---------------------------------------------------------------------------

describe("checkBaselineUsable", () => {
  test("clean completed baseline is usable", () => {
    expect(checkBaselineUsable(makeBaseline(makeRun({ passed: true, failing: [] })))).toEqual({ usable: true });
  });

  test("failing baseline with comparable results is usable", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    expect(checkBaselineUsable(b).usable).toBe(true);
  });

  test("baseline whose execution timed out is not usable", () => {
    const b = makeBaseline(makeRun({ passed: false, execution: "timeout", failing: [] }));
    const result = checkBaselineUsable(b);
    expect(result.usable).toBe(false);
    expect(result.reason).toMatch(/did not complete \(timeout\)/);
  });

  test("failing baseline with non-comparable results is not usable", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"], comparable: false }));
    expect(checkBaselineUsable(b).usable).toBe(false);
  });

  test("failing baseline without structured results is not usable", () => {
    const run = { ...makeRun({ passed: false, failing: [] }), structured: undefined };
    const result = checkBaselineUsable(makeBaseline(run));
    expect(result.usable).toBe(false);
    expect(result.reason).toMatch(/no per-test results/);
  });
});

describe("toTestBaselineSummary", () => {
  test("returns branch, sha and failing ids (duplicates preserved)", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > A"] }), {
      sourceBranch: "develop",
      commitSha: "deadbeef",
    });
    expect(toTestBaselineSummary(b)).toEqual({
      sourceBranch: "develop",
      commitSha: "deadbeef",
      failingTestIds: ["a.test.ts > A", "a.test.ts > A"],
    });
  });

  test("clean baseline has no failing ids", () => {
    const summary = toTestBaselineSummary(makeBaseline(makeRun({ passed: true, failing: [] })));
    expect(summary.failingTestIds).toEqual([]);
    expect(summary.sourceBranch).toBe("main");
    expect(summary.commitSha).toBe("abc123def");
  });
});

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

describe("compareTestRunToBaseline: failures", () => {
  test("same failure as baseline -> pass, unchanged", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    expect(r.verdict).toBe("pass");
    expect(r.unchangedFailures).toEqual(["a.test.ts > A"]);
    expect(r.newFailures).toEqual([]);
    expect(r.reasons).toEqual([]);
  });

  test("an extra failure -> regression with that failure as new", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > B"] }));
    expect(r.verdict).toBe("regression");
    expect(r.newFailures).toEqual(["a.test.ts > B"]);
    expect(r.unchangedFailures).toEqual(["a.test.ts > A"]);
  });

  test("one old failure replaced by one new failure (same counts) -> regression", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > B"] }));
    const run = makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > C"] });
    expect(run.testCounts.failed).toBe(2);
    const r = compare(b, run);
    expect(r.verdict).toBe("regression");
    expect(r.newFailures).toEqual(["a.test.ts > C"]);
  });

  test("a clean baseline accepts no failures", () => {
    const b = makeBaseline(makeRun({ passed: true, failing: [] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    expect(r.verdict).toBe("regression");
    expect(r.newFailures).toEqual(["a.test.ts > A"]);
  });

  test("a clean run after a clean baseline -> pass", () => {
    const b = makeBaseline(makeRun({ passed: true, failing: [] }));
    const r = compare(b, makeRun({ passed: true, failing: [] }));
    expect(r.verdict).toBe("pass");
  });
});

describe("compareTestRunToBaseline: duplicate test ids", () => {
  test("baseline [A, A] vs run [A, A] -> pass", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > A"] }));
    expect(r.verdict).toBe("pass");
    expect(r.unchangedFailures).toEqual(["a.test.ts > A", "a.test.ts > A"]);
    expect(r.newFailures).toEqual([]);
  });

  test("baseline [A, A] vs run [A, A, A] -> regression with one new A", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > A", "a.test.ts > A"] }));
    expect(r.verdict).toBe("regression");
    expect(r.newFailures).toEqual(["a.test.ts > A"]);
  });

  test("baseline [A] vs run [A, A] -> regression with one new A", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > A"] }));
    expect(r.verdict).toBe("regression");
    expect(r.newFailures).toEqual(["a.test.ts > A"]);
    expect(r.unchangedFailures).toEqual(["a.test.ts > A"]);
  });
});

describe("compareTestRunToBaseline: fixed, skipped, missing", () => {
  test("baseline failure now passing -> fixed", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: true, failing: [], passes: ["a.test.ts > A"] }));
    expect(r.verdict).toBe("pass");
    expect(r.fixedFailures).toEqual(["a.test.ts > A"]);
    expect(r.missingBaselineFailures).toEqual([]);
    expect(r.skippedBaselineFailures).toEqual([]);
  });

  test("baseline failure now skipped -> not counted as fixed, warned", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: true, failing: [], skips: ["a.test.ts > A"] }));
    expect(r.verdict).toBe("pass");
    expect(r.skippedBaselineFailures).toEqual(["a.test.ts > A"]);
    expect(r.fixedFailures).toEqual([]);
    expect(r.warnings.some((w) => /skipped/.test(w))).toBe(true);
  });

  test("baseline failure now todo -> treated like skipped", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const run = makeRun({ passed: true, failing: [] });
    run.structured!.tests.push({
      id: "a.test.ts > A",
      file: "a.test.ts",
      name: "A",
      occurrence: 1,
      outcome: "todo",
    });
    const r = compare(b, run);
    expect(r.verdict).toBe("pass");
    expect(r.skippedBaselineFailures).toEqual(["a.test.ts > A"]);
    expect(r.fixedFailures).toEqual([]);
  });

  test("baseline failure not mentioned in run -> missing, warned, not fixed", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: true, failing: [] }));
    expect(r.verdict).toBe("pass");
    expect(r.missingBaselineFailures).toEqual(["a.test.ts > A"]);
    expect(r.fixedFailures).toEqual([]);
    expect(r.warnings.some((w) => /no longer reported/.test(w))).toBe(true);
  });

  test("duplicate baseline failure with one occurrence fixed -> one fixed, one missing", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A", "a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: true, failing: [], passes: ["a.test.ts > A"] }));
    expect(r.verdict).toBe("pass");
    expect(r.fixedFailures).toEqual(["a.test.ts > A"]);
    expect(r.missingBaselineFailures).toEqual(["a.test.ts > A"]);
  });

  test("baseline failure that now fails again is unchanged, not fixed", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A"], passes: ["a.test.ts > P"] }));
    expect(r.unchangedFailures).toEqual(["a.test.ts > A"]);
    expect(r.fixedFailures).toEqual([]);
  });
});

describe("compareTestRunToBaseline: regressed passes", () => {
  const passingBaseline = () =>
    makeBaseline(makeRun({ passed: true, failing: [], passes: ["a.test.ts > P"] }));

  test("baseline pass that is now skipped -> regression", () => {
    const r = compare(
      passingBaseline(),
      makeRun({ passed: true, failing: [], passes: ["a.test.ts > Q"], skips: ["a.test.ts > P"] })
    );
    expect(r.verdict).toBe("regression");
    expect(r.regressedPasses).toEqual(["a.test.ts > P"]);
  });

  test("baseline pass that is now absent -> regression", () => {
    const r = compare(passingBaseline(), makeRun({ passed: true, failing: [], passes: ["a.test.ts > Q"] }));
    expect(r.verdict).toBe("regression");
    expect(r.regressedPasses).toEqual(["a.test.ts > P"]);
  });

  test("baseline pass that now fails -> new failure, not a regressed pass", () => {
    const r = compare(
      passingBaseline(),
      makeRun({ passed: false, failing: ["a.test.ts > P"], passes: ["a.test.ts > Q"] })
    );
    expect(r.verdict).toBe("regression");
    expect(r.newFailures).toEqual(["a.test.ts > P"]);
    expect(r.regressedPasses).toEqual([]);
  });

  test("baseline pass still passing -> pass", () => {
    const r = compare(
      passingBaseline(),
      makeRun({ passed: true, failing: [], passes: ["a.test.ts > P", "a.test.ts > Q"] })
    );
    expect(r.verdict).toBe("pass");
    expect(r.regressedPasses).toEqual([]);
  });

  test("run that does not list passes cannot detect lost passes -> pass with warning", () => {
    const run = makeRun({ passed: true, failing: [] });
    expect(run.structured!.passesListed).toBe(false);
    const r = compare(passingBaseline(), run);
    expect(r.verdict).toBe("pass");
    expect(r.regressedPasses).toEqual([]);
    expect(r.warnings.some((w) => /cannot be detected/.test(w))).toBe(true);
  });

  test("baseline that did not list passes never produces regressed passes", () => {
    const b = makeBaseline(makeRun({ passed: true, failing: [] }));
    const r = compare(b, makeRun({ passed: true, failing: [], passes: ["a.test.ts > Q"] }));
    expect(r.verdict).toBe("pass");
    expect(r.regressedPasses).toEqual([]);
  });
});

describe("compareTestRunToBaseline: not comparable", () => {
  const failingBaseline = () => makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));

  test("run that timed out is not comparable even with matching failures", () => {
    const r = compare(
      failingBaseline(),
      makeRun({ passed: false, execution: "timeout", failing: ["a.test.ts > A"] })
    );
    expect(r.verdict).toBe("not-comparable");
    expect(r.reasons.join(" ")).toMatch(/did not complete \(timeout\)/);
  });

  test("failing run with structured.comparable false -> not-comparable", () => {
    const r = compare(
      failingBaseline(),
      makeRun({ passed: false, failing: ["a.test.ts > A"], comparable: false })
    );
    expect(r.verdict).toBe("not-comparable");
  });

  test("failing run without structured results -> not-comparable", () => {
    const run = { ...makeRun({ passed: false, failing: ["a.test.ts > A"] }), structured: undefined };
    const r = compare(failingBaseline(), run);
    expect(r.verdict).toBe("not-comparable");
    expect(r.reasons.join(" ")).toMatch(/no per-test results/);
  });

  test("passing run without structured results -> pass with warning (legacy)", () => {
    const run = { ...makeRun({ passed: true, failing: [] }), structured: undefined };
    const r = compare(makeBaseline(makeRun({ passed: true, failing: [] })), run);
    expect(r.verdict).toBe("pass");
    expect(r.warnings.some((w) => /not parseable/.test(w))).toBe(true);
  });

  test("failing baseline that is not comparable + failing run -> not-comparable", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"], comparable: false }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    expect(r.verdict).toBe("not-comparable");
  });

  test("failing baseline that is not comparable + passing run with zero failures -> pass", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"], comparable: false }));
    const r = compare(b, makeRun({ passed: true, failing: [] }));
    expect(r.verdict).toBe("pass");
    expect(r.warnings.some((w) => /baseline unusable/.test(w))).toBe(true);
  });

  test("failing baseline without structured results + failing run -> not-comparable", () => {
    const b = makeBaseline({ ...makeRun({ passed: false, failing: ["a.test.ts > A"] }), structured: undefined });
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    expect(r.verdict).toBe("not-comparable");
  });

  test("baseline whose execution timed out -> not-comparable for a failing run", () => {
    const b = makeBaseline(makeRun({ passed: false, execution: "timeout", failing: [] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    expect(r.verdict).toBe("not-comparable");
  });

  test("different test command than the baseline -> not-comparable", () => {
    const b = makeBaseline(makeRun({ passed: true, failing: [] }));
    const r = compare(b, makeRun({ passed: true, failing: [] }), { testCommand: "bun test --bail" });
    expect(r.verdict).toBe("not-comparable");
    expect(r.reasons.join(" ")).toMatch(/test command changed/);
  });

  test("same test command as the baseline -> normal comparison", () => {
    const b = makeBaseline(makeRun({ passed: false, failing: ["a.test.ts > A"] }));
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A"] }), { testCommand: "bun test" });
    expect(r.verdict).toBe("pass");
  });

  test("omitted testCommand option skips the command check", () => {
    const b = makeBaseline(makeRun({ passed: true, failing: [] }), { testCommand: "npm test" });
    expect(compare(b, makeRun({ passed: true, failing: [] })).verdict).toBe("pass");
  });
});

describe("compareTestRunToBaseline: warnings", () => {
  test("fewer tests than the baseline warns but does not change the verdict", () => {
    const baselineRun = {
      ...makeRun({ passed: false, failing: ["a.test.ts > A"] }),
      testCounts: { total: 10, passed: 9, failed: 1, skipped: 0, parsed: true },
    };
    const b = makeBaseline(baselineRun);
    const r = compare(b, makeRun({ passed: false, failing: ["a.test.ts > A"], passes: ["a.test.ts > P1", "a.test.ts > P2"] }));
    expect(r.verdict).toBe("pass");
    expect(r.warnings.some((w) => /fewer tests ran than in the baseline \(3 < 10\)/.test(w))).toBe(true);
  });

  test("equal test totals produce no fewer-tests warning", () => {
    const b = makeBaseline(makeRun({ passed: true, failing: [], passes: ["a.test.ts > P"] }));
    const r = compare(b, makeRun({ passed: true, failing: [], passes: ["a.test.ts > P"] }));
    expect(r.warnings.some((w) => /fewer tests/.test(w))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Contradictory output
// ---------------------------------------------------------------------------

describe("contradictory output", () => {
  // Exit 0 but non-comparable results that still list failures must fail
  // closed rather than take the legacy zero-failure path.
  test("exit 0 with listed failures and non-comparable structured results -> not-comparable", () => {
    const b = makeBaseline(makeRun({ passed: true, failing: [] }));
    const run = makeRun({ passed: true, failing: ["a.test.ts > A"], comparable: false });
    expect(compare(b, run).verdict).toBe("not-comparable");
  });
});
