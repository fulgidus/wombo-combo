/**
 * review-stage.test.ts — Unit tests for src/daemon/review-stage.ts.
 */

import { describe, test, expect } from "bun:test";
import {
  reviewTask,
  formatFindingComment,
  formatReviewFeedback,
  buildSpecText,
  REVIEWER_AUTHOR,
  REVIEWER_ATTEMPTS,
  type ReviewStageDeps,
} from "../src/daemon/review-stage";
import type { ReviewFinding } from "../src/lib/review";
import type { ReviewerOutput } from "../src/lib/review-runner";
import type { Task } from "../src/lib/tasks";
import { containsAiAttribution } from "../src/lib/attribution";

const task: Task = {
  id: "t1", title: "Thing", description: "Do it.", status: "in_progress", completion: 0,
  difficulty: "medium", priority: "high", depends_on: [], effort: "PT1H", started_at: null, ended_at: null,
  constraints: ["Pure"], forbidden: ["No net"], references: [], notes: [], subtasks: [],
};

const finding = (over: Partial<ReviewFinding> = {}): ReviewFinding => ({
  axis: "spec", severity: "blocking", file: "src/a.ts", line: 7, message: "missing case", ...over,
});

function mk(outputs: ReviewerOutput[], diff = "diff --git a/x b/x\n+1") {
  const comments: Array<{ body: string; author?: string; role?: string }> = [];
  const prompts: string[] = [];
  const logs: string[] = [];
  let calls = 0;
  const deps: ReviewStageDeps = {
    captureDiff: () => diff,
    runReviewer: async (prompt) => {
      prompts.push(prompt);
      return outputs[Math.min(calls++, outputs.length - 1)];
    },
    addComment: (c) => { comments.push(c); },
    log: (_l, m) => { logs.push(m); },
  };
  const input = { task, worktree: "/wt", baseBranch: "main", config: { enabled: true, blockOn: "blocking" as const, maxRounds: 2, maxDiffChars: 1000 }, standards: null };
  return { deps, input, comments, prompts, logs, calls: () => calls };
}

const json = (findings: unknown[]): ReviewerOutput => ({ ok: true, text: JSON.stringify({ findings }) });

describe("formatFindingComment", () => {
  test("severity axis file:line message", () => {
    expect(formatFindingComment(finding())).toBe("blocking spec src/a.ts:7 missing case");
  });
  test("file only when there is no line", () => {
    expect(formatFindingComment(finding({ line: undefined, severity: "nit", axis: "standards" }))).toBe("nit standards src/a.ts missing case");
  });
});

describe("formatReviewFeedback", () => {
  test("lists findings with suggestions and carries no AI attribution", () => {
    const text = formatReviewFeedback([finding({ suggestion: "add the case" })], 1, 2);
    expect(text).toContain("src/a.ts:7");
    expect(text).toContain("add the case");
    expect(text).toContain("1/2");
    expect(containsAiAttribution(text)).toBe(false);
  });
});

describe("buildSpecText", () => {
  test("includes description, constraints and forbidden", () => {
    const s = buildSpecText(task);
    expect(s).toContain("Do it.");
    expect(s).toContain("Pure");
    expect(s).toContain("No net");
  });
});

describe("reviewTask", () => {
  test("no findings passes", async () => {
    const e = mk([json([])]);
    const r = await reviewTask(e.input, e.deps);
    expect(r).toMatchObject({ kind: "pass", findings: [] });
    expect(e.comments).toHaveLength(0);
  });

  test("findings are posted as reviewer agent comments, minor ones pass", async () => {
    const e = mk([json([finding({ severity: "minor" })])]);
    const r = await reviewTask(e.input, e.deps);
    expect(r.kind).toBe("pass");
    expect(e.comments).toEqual([{ body: "minor spec src/a.ts:7 missing case", author: REVIEWER_AUTHOR, role: "agent" }]);
  });

  test("blocking findings are returned", async () => {
    const e = mk([json([finding(), finding({ severity: "nit" })])]);
    const r = await reviewTask(e.input, e.deps);
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.blocking).toHaveLength(1);
    expect(e.comments).toHaveLength(2);
  });

  test("unparseable output passes with a warning comment", async () => {
    const e = mk([{ ok: true, text: "looks good to me" }]);
    const r = await reviewTask(e.input, e.deps);
    expect(r.kind).toBe("pass");
    expect(e.comments).toHaveLength(1);
    expect(e.comments[0].body).toContain("could not be parsed");
  });

  test("an empty diff skips the reviewer", async () => {
    const e = mk([json([finding()])], "");
    const r = await reviewTask(e.input, e.deps);
    expect(r.kind).toBe("pass");
    expect(e.calls()).toBe(0);
  });

  test("harness errors are retried, then reported", async () => {
    const e = mk([{ ok: false, error: "no binary" }]);
    const r = await reviewTask(e.input, e.deps);
    expect(r).toEqual({ kind: "error", error: "no binary" });
    expect(e.calls()).toBe(REVIEWER_ATTEMPTS);
  });

  test("a harness error followed by a good answer succeeds", async () => {
    const e = mk([{ ok: false, error: "flaky" }, json([])]);
    const r = await reviewTask(e.input, e.deps);
    expect(r.kind).toBe("pass");
  });

  test("a throwing reviewer is a harness error, not a crash", async () => {
    const e = mk([json([])]);
    e.deps.runReviewer = async () => { throw new Error("kaboom"); };
    const r = await reviewTask(e.input, e.deps);
    expect(r).toEqual({ kind: "error", error: "kaboom" });
  });

  test("the prompt contains the diff and the task id", async () => {
    const e = mk([json([])]);
    await reviewTask(e.input, e.deps);
    expect(e.prompts[0]).toContain("diff --git a/x b/x");
    expect(e.prompts[0]).toContain("t1");
  });
});
