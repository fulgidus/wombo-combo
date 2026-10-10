/**
 * test-baseline.ts — Quest test baselines: storage and regression detection.
 *
 * Responsibilities:
 *   - Define the TestBaseline snapshot captured from a quest's base branch
 *   - Persist snapshots at .wombo-combo/baselines/<quest-id>/tests.json under
 *     the canonical project root (shared by all linked worktrees)
 *   - Load with validation that distinguishes missing, corrupt, and
 *     incompatible data
 *   - Compare a branch's test run against the baseline by test identity
 *
 * This module never runs tests. Capture, verification, and daemon
 * integration build on these types and pure functions.
 *
 * Safety rules:
 *   - Fail closed: incomplete runs, unsupported failing output, and
 *     incompatible metadata yield a "not-comparable" verdict, never "pass".
 *   - Regressions are detected by identity (multiset of failing test ids),
 *     never by aggregate failure counts.
 *   - Snapshots are immutable for a quest: saving refuses to overwrite.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { WOMBO_DIR } from "../config";
import { resolveCanonicalProjectRoot } from "./worktree";
import type {
  StructuredTestResults,
  TestCounts,
  TestExecutionStatus,
  TestRunResult,
} from "./test-runner";
import type { TestBaselineSummary } from "./prompt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Snapshot schema version. Bump when the stored shape changes. */
export const TEST_BASELINE_VERSION = 1;

/**
 * Identifier of the output parser that produced the structured results.
 * Results from a different parser format are not comparable.
 */
export const TEST_BASELINE_PARSER_FORMAT = "wombo-test-runner/1";

/** Test results as stored in a baseline */
export interface BaselineTestResults {
  /** Whether the test command exited 0 */
  passed: boolean;
  exitCode: number;
  execution: TestExecutionStatus;
  counts: TestCounts;
  /** Per-test results; null when the output could not be parsed */
  structured: StructuredTestResults | null;
}

/** Immutable test snapshot captured before a quest's agents run */
export interface TestBaseline {
  version: typeof TEST_BASELINE_VERSION;
  questId: string;
  /** Branch the snapshot was taken from (quest.baseBranch) */
  sourceBranch: string;
  /** Pinned commit SHA of sourceBranch at capture time */
  commitSha: string;
  /** ISO timestamp of capture */
  capturedAt: string;
  /** Effective test command that produced the results */
  testCommand: string;
  /** Timeout in milliseconds used for the run */
  timeoutMs: number;
  parserFormat: string;
  results: BaselineTestResults;
}

export type TestBaselineLoadResult =
  | { status: "ok"; baseline: TestBaseline; path: string }
  | { status: "missing"; path: string }
  | { status: "corrupt"; path: string; error: string }
  | { status: "incompatible"; path: string; error: string };

export type TestBaselineVerdict = "pass" | "regression" | "not-comparable";

/** Result of comparing a test run against a baseline */
export interface TestBaselineComparison {
  /**
   * - pass:           no new failures and no previously passing test lost
   * - regression:     newFailures or regressedPasses is non-empty
   * - not-comparable: the run or baseline cannot be trusted; treat as failure
   */
  verdict: TestBaselineVerdict;
  /** Failures not accounted for by the baseline (one entry per occurrence) */
  newFailures: string[];
  /** Baseline failures that still fail */
  unchangedFailures: string[];
  /** Baseline failures now reported as passing */
  fixedFailures: string[];
  /** Baseline failures now skipped or todo — not counted as fixed */
  skippedBaselineFailures: string[];
  /**
   * Baseline failures absent from the current run. When the runner does not
   * list passing tests these may be fixed or removed, so they are never
   * reported as fixed.
   */
  missingBaselineFailures: string[];
  /** Baseline passes now skipped, todo, or missing (only detectable when passes are listed) */
  regressedPasses: string[];
  /** Why the verdict is "not-comparable" (empty otherwise) */
  reasons: string[];
  /** Non-blocking observations worth surfacing (e.g. fewer tests ran) */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** Directory name under .wombo-combo/ holding runtime baselines (gitignored) */
export const BASELINES_DIR = "baselines";

function assertSafeQuestId(questId: string): void {
  if (!questId || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(questId)) {
    throw new Error(`Invalid quest id for baseline storage: "${questId}"`);
  }
}

/**
 * Path of a quest's baseline snapshot under the canonical project root, so
 * every linked worktree reads and writes the same file.
 */
export function testBaselinePath(projectRoot: string, questId: string): string {
  assertSafeQuestId(questId);
  const root = resolveCanonicalProjectRoot(projectRoot);
  return resolve(root, WOMBO_DIR, BASELINES_DIR, questId, "tests.json");
}

/**
 * Persist a baseline atomically (tmp file + rename).
 *
 * Snapshots are immutable for a quest execution: throws if one already
 * exists unless `overwrite` is set (e.g. an explicit operator reset).
 *
 * @returns the path written
 */
export function saveTestBaseline(
  projectRoot: string,
  baseline: TestBaseline,
  options: { overwrite?: boolean } = {}
): string {
  const errors = validateTestBaseline(baseline);
  if (errors.length > 0) {
    throw new Error(`Refusing to save invalid test baseline: ${errors.join("; ")}`);
  }
  const filePath = testBaselinePath(projectRoot, baseline.questId);
  if (!options.overwrite && existsSync(filePath)) {
    throw new Error(
      `Test baseline for quest "${baseline.questId}" already exists at ${filePath}; baselines are immutable`
    );
  }
  mkdirSync(dirname(filePath), { recursive: true });
  const tmpPath = join(
    dirname(filePath),
    `.tests.json.${process.pid}.${Date.now()}.tmp`
  );
  writeFileSync(tmpPath, JSON.stringify(baseline, null, 2) + "\n", "utf-8");
  renameSync(tmpPath, filePath);
  return filePath;
}

/**
 * Load and validate a quest's baseline snapshot.
 *
 * - missing:      no snapshot file
 * - corrupt:      unreadable, invalid JSON, or wrong shape
 * - incompatible: well-formed but from another schema version, parser
 *                 format, or quest
 */
export function loadTestBaseline(
  projectRoot: string,
  questId: string
): TestBaselineLoadResult {
  const path = testBaselinePath(projectRoot, questId);
  if (!existsSync(path)) return { status: "missing", path };

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch (err: any) {
    return { status: "corrupt", path, error: `invalid JSON: ${err?.message ?? err}` };
  }

  if (!isObject(parsed)) {
    return { status: "corrupt", path, error: "snapshot is not an object" };
  }
  if (parsed.version !== TEST_BASELINE_VERSION) {
    return {
      status: "incompatible",
      path,
      error: `unsupported baseline version ${JSON.stringify(parsed.version)} (expected ${TEST_BASELINE_VERSION})`,
    };
  }
  if (parsed.parserFormat !== TEST_BASELINE_PARSER_FORMAT) {
    return {
      status: "incompatible",
      path,
      error: `unsupported parser format ${JSON.stringify(parsed.parserFormat)} (expected ${TEST_BASELINE_PARSER_FORMAT})`,
    };
  }
  const errors = validateTestBaseline(parsed);
  if (errors.length > 0) {
    return { status: "corrupt", path, error: errors.join("; ") };
  }
  const baseline = parsed as unknown as TestBaseline;
  if (baseline.questId !== questId) {
    return {
      status: "incompatible",
      path,
      error: `snapshot belongs to quest "${baseline.questId}", not "${questId}"`,
    };
  }
  return { status: "ok", baseline, path };
}

// ---------------------------------------------------------------------------
// Validation (JSON-shape, independent of YAML/task schemas)
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const EXECUTION_STATUSES = new Set([
  "completed",
  "timeout",
  "signal",
  "buffer-overflow",
  "command-not-found",
  "spawn-error",
]);
const OUTCOMES = new Set(["pass", "fail", "skip", "todo"]);

/** Return a list of shape errors (empty when the value is a valid TestBaseline) */
export function validateTestBaseline(value: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(value)) return ["baseline is not an object"];
  const v = value;

  if (v.version !== TEST_BASELINE_VERSION) errors.push("version mismatch");
  for (const key of ["questId", "sourceBranch", "commitSha", "capturedAt", "testCommand", "parserFormat"]) {
    if (typeof v[key] !== "string" || v[key] === "") errors.push(`${key} must be a non-empty string`);
  }
  if (typeof v.capturedAt === "string" && Number.isNaN(Date.parse(v.capturedAt))) {
    errors.push("capturedAt must be an ISO timestamp");
  }
  if (typeof v.timeoutMs !== "number" || !(v.timeoutMs > 0)) {
    errors.push("timeoutMs must be a positive number");
  }

  const r = v.results;
  if (!isObject(r)) {
    errors.push("results must be an object");
    return errors;
  }
  if (typeof r.passed !== "boolean") errors.push("results.passed must be a boolean");
  if (typeof r.exitCode !== "number") errors.push("results.exitCode must be a number");
  if (!EXECUTION_STATUSES.has(r.execution)) errors.push("results.execution is invalid");
  if (
    !isObject(r.counts) ||
    !["total", "passed", "failed", "skipped"].every((k) => typeof r.counts[k] === "number") ||
    typeof r.counts.parsed !== "boolean"
  ) {
    errors.push("results.counts is invalid");
  }

  if (r.structured !== null) {
    const s = r.structured;
    if (!isObject(s)) {
      errors.push("results.structured must be an object or null");
    } else {
      if (typeof s.comparable !== "boolean") errors.push("structured.comparable must be a boolean");
      if (typeof s.passesListed !== "boolean") errors.push("structured.passesListed must be a boolean");
      if (!Array.isArray(s.failingTestIds) || !s.failingTestIds.every((x: unknown) => typeof x === "string")) {
        errors.push("structured.failingTestIds must be a string array");
      }
      if (
        !Array.isArray(s.tests) ||
        !s.tests.every(
          (t: unknown) =>
            isObject(t) &&
            typeof t.id === "string" &&
            typeof t.file === "string" &&
            typeof t.name === "string" &&
            typeof t.occurrence === "number" &&
            OUTCOMES.has(t.outcome)
        )
      ) {
        errors.push("structured.tests is invalid");
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Construction helpers
// ---------------------------------------------------------------------------

/** Build a baseline snapshot from a completed test run */
export function createTestBaseline(
  meta: {
    questId: string;
    sourceBranch: string;
    commitSha: string;
    testCommand: string;
    timeoutMs: number;
    capturedAt?: Date;
  },
  run: TestRunResult
): TestBaseline {
  return {
    version: TEST_BASELINE_VERSION,
    questId: meta.questId,
    sourceBranch: meta.sourceBranch,
    commitSha: meta.commitSha,
    capturedAt: (meta.capturedAt ?? new Date()).toISOString(),
    testCommand: meta.testCommand,
    timeoutMs: meta.timeoutMs,
    parserFormat: TEST_BASELINE_PARSER_FORMAT,
    results: {
      passed: run.passed,
      exitCode: run.exitCode,
      execution: run.execution?.status ?? (run.passed ? "completed" : "spawn-error"),
      counts: run.testCounts,
      structured: run.structured ?? null,
    },
  };
}

/**
 * Whether a baseline can define accepted failures.
 *
 * A clean baseline (exit 0, completed) always qualifies, accepting no
 * failures. A failing baseline qualifies only with complete, comparable
 * per-test results; otherwise accepting its failures would be guesswork.
 */
export function checkBaselineUsable(baseline: TestBaseline): { usable: boolean; reason?: string } {
  const r = baseline.results;
  if (r.execution !== "completed") {
    return { usable: false, reason: `baseline run did not complete (${r.execution})` };
  }
  if (r.passed) return { usable: true };
  if (!r.structured || !r.structured.comparable) {
    const why = r.structured?.incompleteReasons?.join("; ") || "no per-test results";
    return { usable: false, reason: `baseline failures are not comparable (${why})` };
  }
  return { usable: true };
}

/** Ids of failing tests accepted by a baseline (duplicates preserved) */
export function baselineFailingTestIds(baseline: TestBaseline): string[] {
  if (baseline.results.passed) return [];
  return [...(baseline.results.structured?.failingTestIds ?? [])];
}

/** Agent-facing summary of a baseline (see QuestPromptContext.testBaseline) */
export function toTestBaselineSummary(baseline: TestBaseline): TestBaselineSummary {
  return {
    sourceBranch: baseline.sourceBranch,
    commitSha: baseline.commitSha,
    failingTestIds: baselineFailingTestIds(baseline),
  };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

function countIds(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

function repeat(id: string, n: number): string[] {
  return Array.from({ length: Math.max(0, n) }, () => id);
}

/**
 * Compare a test run against a quest baseline.
 *
 * Rules:
 *   - Unchanged baseline failures are allowed.
 *   - New failures (by identity, counting duplicate occurrences) block.
 *   - Baseline passes that become skipped/todo/missing block (only
 *     detectable when both runs list passing tests; pass→fail is a new failure).
 *   - Fixed baseline failures are reported separately; skipped or missing
 *     baseline failures are surfaced but never counted as fixed.
 *   - Incomplete or non-comparable runs are "not-comparable". A successful
 *     run without parseable output stays compatible with legacy
 *     zero-failure verification and passes.
 *
 * @param options.testCommand - effective command of the current run; must
 *                              match the baseline's when provided
 */
export function compareTestRunToBaseline(
  baseline: TestBaseline,
  run: TestRunResult,
  options: { testCommand?: string } = {}
): TestBaselineComparison {
  const result: TestBaselineComparison = {
    verdict: "pass",
    newFailures: [],
    unchangedFailures: [],
    fixedFailures: [],
    skippedBaselineFailures: [],
    missingBaselineFailures: [],
    regressedPasses: [],
    reasons: [],
    warnings: [],
  };
  const notComparable = (reason: string): TestBaselineComparison => {
    result.verdict = "not-comparable";
    result.reasons.push(reason);
    return result;
  };

  if (options.testCommand !== undefined && options.testCommand !== baseline.testCommand) {
    return notComparable(
      `test command changed since baseline ("${baseline.testCommand}" → "${options.testCommand}")`
    );
  }

  const execution = run.execution?.status ?? (run.passed ? "completed" : undefined);
  if (execution !== "completed") {
    return notComparable(`test run did not complete (${execution ?? "unknown"})`);
  }

  const current = run.structured;
  const currentComparable = !!current && current.comparable;

  if (!currentComparable) {
    // Legacy path: a clean exit means zero failures, which satisfies any baseline.
    if (run.passed) {
      result.warnings.push("test output not parseable; accepted via zero-failure exit");
      return result;
    }
    const why = current?.incompleteReasons?.join("; ") || "no per-test results";
    return notComparable(`test run results are not comparable (${why})`);
  }

  const usable = checkBaselineUsable(baseline);
  if (!usable.usable) {
    if (run.passed && current.failingTestIds.length === 0) {
      result.warnings.push(`baseline unusable (${usable.reason}); accepted via zero failures`);
      return result;
    }
    return notComparable(usable.reason!);
  }

  // --- Failures: multiset difference by identity ---
  const baseFail = countIds(baselineFailingTestIds(baseline));
  const curFail = countIds(current.failingTestIds);

  for (const [id, n] of curFail) {
    const accepted = baseFail.get(id) ?? 0;
    result.unchangedFailures.push(...repeat(id, Math.min(n, accepted)));
    result.newFailures.push(...repeat(id, n - accepted));
  }

  // --- Baseline failures that no longer fail ---
  const curOutcomes = new Map<string, string[]>();
  for (const t of current.tests) {
    const list = curOutcomes.get(t.id) ?? [];
    list.push(t.outcome);
    curOutcomes.set(t.id, list);
  }
  for (const [id, n] of baseFail) {
    let resolved = n - Math.min(n, curFail.get(id) ?? 0);
    if (resolved <= 0) continue;
    const outcomes = curOutcomes.get(id) ?? [];
    const passes = outcomes.filter((o) => o === "pass").length;
    const skips = outcomes.filter((o) => o === "skip" || o === "todo").length;
    const fixed = Math.min(resolved, passes);
    result.fixedFailures.push(...repeat(id, fixed));
    resolved -= fixed;
    const skipped = Math.min(resolved, skips);
    result.skippedBaselineFailures.push(...repeat(id, skipped));
    resolved -= skipped;
    result.missingBaselineFailures.push(...repeat(id, resolved));
  }

  // --- Baseline passes that were lost ---
  const baseStructured = baseline.results.structured;
  if (baseStructured?.passesListed) {
    if (current.passesListed) {
      const basePass = countIds(
        baseStructured.tests.filter((t) => t.outcome === "pass").map((t) => t.id)
      );
      const curPassOrFail = countIds(
        current.tests.filter((t) => t.outcome === "pass" || t.outcome === "fail").map((t) => t.id)
      );
      for (const [id, n] of basePass) {
        // pass→fail already appears in newFailures; count it as still present here
        const lost = n - (curPassOrFail.get(id) ?? 0);
        result.regressedPasses.push(...repeat(id, lost));
      }
    } else {
      result.warnings.push(
        "current run does not list passing tests; baseline passes that went missing cannot be detected"
      );
    }
  }

  // Aggregate counts are only a hint — never used to accept or reject
  const baseTotal = baseline.results.counts.parsed ? baseline.results.counts.total : 0;
  const curTotal = run.testCounts.parsed ? run.testCounts.total : 0;
  if (baseTotal > 0 && curTotal > 0 && curTotal < baseTotal) {
    result.warnings.push(`fewer tests ran than in the baseline (${curTotal} < ${baseTotal})`);
  }
  if (result.skippedBaselineFailures.length > 0) {
    result.warnings.push(
      `${result.skippedBaselineFailures.length} baseline failure(s) are now skipped — not counted as fixed`
    );
  }
  if (result.missingBaselineFailures.length > 0) {
    result.warnings.push(
      `${result.missingBaselineFailures.length} baseline failure(s) no longer reported — fixed or removed, not counted as fixed`
    );
  }

  if (result.newFailures.length > 0 || result.regressedPasses.length > 0) {
    result.verdict = "regression";
  }
  return result;
}
