/**
 * review-core.test.ts — Unit tests for src/lib/review.ts (pure review helpers).
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildReviewPrompt,
  parseReviewFindings,
  decideReview,
  loadStandards,
  truncateDiff,
  DIFF_TRUNCATION_MARKER,
  type ReviewFinding,
} from "../src/lib/review";
import { containsAiAttribution } from "../src/lib/attribution";
import type { Task } from "../src/lib/tasks";

function task(over: Partial<Task> = {}): Task {
  return {
    id: "my-task", title: "My Task", description: "Do the thing.", status: "in_progress",
    completion: 0, difficulty: "medium", priority: "high", depends_on: [], effort: "PT1H",
    started_at: null, ended_at: null, constraints: ["Pure functions"], forbidden: ["No network"],
    references: [], notes: [], subtasks: [], ...over,
  };
}

const finding = (over: Partial<ReviewFinding> = {}): ReviewFinding => ({
  axis: "spec", severity: "major", file: "src/a.ts", message: "msg", ...over,
});

describe("buildReviewPrompt", () => {
  const base = { task: task(), diff: "diff --git a/x b/x\n+hello", specText: "SPEC TEXT HERE" };

  test("covers both axes, the diff, the spec text and the JSON-only output contract", () => {
    const p = buildReviewPrompt(base);
    expect(p).toContain("Standards");
    expect(p).toContain("Spec");
    expect(p).toContain("+hello");
    expect(p).toContain("SPEC TEXT HERE");
    expect(p).toContain("my-task");
    expect(p).toContain("ONLY a JSON object");
    expect(p).toContain('"findings"');
    for (const s of ["blocking", "major", "minor", "nit"]) expect(p).toContain(s);
  });

  test("includes quest goal and standards when given", () => {
    const p = buildReviewPrompt({ ...base, quest: { id: "q1", goal: "Ship the gate" }, standards: "USE TABS" });
    expect(p).toContain("q1");
    expect(p).toContain("Ship the gate");
    expect(p).toContain("USE TABS");
  });

  test("says so when no standards are documented", () => {
    expect(buildReviewPrompt(base)).toContain("No documented coding standards");
  });

  test("contains no AI attribution and tells the reviewer not to add any", () => {
    const p = buildReviewPrompt({ ...base, standards: "x" });
    expect(containsAiAttribution(p)).toBe(false);
    expect(p).toContain("NEVER add AI attribution");
  });

  test("truncates huge diffs with a marker", () => {
    const p = buildReviewPrompt({ ...base, diff: "a".repeat(500), maxDiffChars: 100 });
    expect(p).toContain(DIFF_TRUNCATION_MARKER);
    expect(p).not.toContain("a".repeat(101));
  });
});

describe("truncateDiff", () => {
  test("leaves small diffs alone", () => {
    expect(truncateDiff("abc", 10)).toEqual({ diff: "abc", truncated: false, omittedChars: 0 });
  });
  test("cuts to the limit and reports omitted chars", () => {
    const r = truncateDiff("x".repeat(30), 10);
    expect(r.truncated).toBe(true);
    expect(r.omittedChars).toBe(20);
    expect(r.diff.startsWith("x".repeat(10))).toBe(true);
    expect(r.diff).toContain(DIFF_TRUNCATION_MARKER);
  });
});

describe("parseReviewFindings", () => {
  const json = JSON.stringify({
    findings: [{ axis: "standards", severity: "blocking", file: "a.ts", line: 3, message: "bad", suggestion: "fix" }],
  });

  test("parses a bare JSON object", () => {
    const r = parseReviewFindings(json);
    expect(r.ok).toBe(true);
    expect(r.dropped).toBe(0);
    expect(r.findings).toEqual([
      { axis: "standards", severity: "blocking", file: "a.ts", line: 3, message: "bad", suggestion: "fix" },
    ]);
  });

  test("tolerates code fences and surrounding prose", () => {
    const r = parseReviewFindings("Here is my review:\n```json\n" + json + "\n```\nHope that helps {not json}");
    expect(r.ok).toBe(true);
    expect(r.findings).toHaveLength(1);
  });

  test("tolerates braces inside strings", () => {
    const s = JSON.stringify({ findings: [{ axis: "spec", severity: "nit", file: "a", message: "use } here {" }] });
    expect(parseReviewFindings("note: " + s + " done").findings[0].message).toBe("use } here {");
  });

  test("drops malformed entries and counts them", () => {
    const s = JSON.stringify({
      findings: [
        { axis: "spec", severity: "major", file: "a", message: "ok" },
        { axis: "other", severity: "major", file: "a", message: "bad axis" },
        { axis: "spec", severity: "huge", file: "a", message: "bad severity" },
        { axis: "spec", severity: "major", file: "", message: "no file" },
        { axis: "spec", severity: "major", file: "a", message: "  " },
        "junk",
        null,
      ],
    });
    const r = parseReviewFindings(s);
    expect(r.ok).toBe(true);
    expect(r.findings).toHaveLength(1);
    expect(r.dropped).toBe(6);
  });

  test("ignores invalid optional fields instead of dropping the finding", () => {
    const s = JSON.stringify({ findings: [{ axis: "spec", severity: "nit", file: "a", message: "m", line: -2, suggestion: 5 }] });
    const f = parseReviewFindings(s).findings[0];
    expect(f.line).toBeUndefined();
    expect(f.suggestion).toBeUndefined();
  });

  test("empty findings is ok", () => {
    expect(parseReviewFindings('{"findings": []}')).toEqual({ ok: true, findings: [], dropped: 0 });
  });

  test("unparseable output is not ok", () => {
    for (const out of ["", "no json here", '{"findings": "x"}', "{broken", '{"other": 1}']) {
      const r = parseReviewFindings(out);
      expect(r.ok).toBe(false);
      expect(r.findings).toEqual([]);
    }
  });
});

describe("decideReview", () => {
  test("blockOn=blocking only fails on blocking findings", () => {
    const fs = [finding({ severity: "major" }), finding({ severity: "nit" })];
    expect(decideReview(fs, { blockOn: "blocking" })).toEqual({ pass: true, blocking: [] });
    const b = finding({ severity: "blocking" });
    expect(decideReview([...fs, b], { blockOn: "blocking" })).toEqual({ pass: false, blocking: [b] });
  });

  test("blockOn=major fails on major and blocking", () => {
    const m = finding({ severity: "major" });
    const b = finding({ severity: "blocking" });
    const r = decideReview([m, b, finding({ severity: "minor" })], { blockOn: "major" });
    expect(r.pass).toBe(false);
    expect(r.blocking).toEqual([m, b]);
  });

  test("no findings passes", () => {
    expect(decideReview([], { blockOn: "major" })).toEqual({ pass: true, blocking: [] });
  });
});

describe("loadStandards", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "review-std-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("returns null when no files exist", () => {
    expect(loadStandards(dir)).toBeNull();
  });

  test("combines CODING_STANDARDS.md and AGENTS.md", () => {
    writeFileSync(join(dir, "CODING_STANDARDS.md"), "STD BODY");
    writeFileSync(join(dir, "AGENTS.md"), "AGENTS BODY");
    const s = loadStandards(dir)!;
    expect(s).toContain("CODING_STANDARDS.md");
    expect(s).toContain("STD BODY");
    expect(s).toContain("AGENTS.md");
    expect(s).toContain("AGENTS BODY");
    expect(s.indexOf("STD BODY")).toBeLessThan(s.indexOf("AGENTS BODY"));
  });

  test("works with only AGENTS.md", () => {
    writeFileSync(join(dir, "AGENTS.md"), "ONLY AGENTS");
    expect(loadStandards(dir)).toContain("ONLY AGENTS");
  });
});
