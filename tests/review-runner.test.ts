/**
 * review-runner.test.ts — Unit tests for src/lib/review-runner.ts (reviewer
 * output collection from a spawned process).
 */

import { describe, test, expect } from "bun:test";
import { spawn } from "node:child_process";
import { collectReviewerOutput, extractReviewText } from "../src/lib/review-runner";
import type { LaunchResult } from "../src/lib/launcher";
import type { ResolvedRoute } from "../src/lib/harness/routing";

function launched(script: string): LaunchResult {
  const process = spawn("sh", ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
  const route = { harness: "opencode", profile: "default" } as unknown as ResolvedRoute;
  return { pid: process.pid ?? 0, process, harness: "opencode", profile: "default", route };
}

describe("extractReviewText", () => {
  test("joins opencode text events and keeps non-JSON lines", () => {
    const raw = [
      JSON.stringify({ type: "step_start" }),
      JSON.stringify({ type: "text", part: { text: '{"findings":' } }),
      JSON.stringify({ type: "text", part: { text: "[]}" } }),
      "plain line",
    ].join("\n");
    expect(extractReviewText(raw)).toBe('{"findings":[]}plain line');
  });

  test("empty output gives empty text", () => {
    expect(extractReviewText("")).toBe("");
  });
});

describe("collectReviewerOutput", () => {
  test("returns the text of a clean run", async () => {
    const out = await collectReviewerOutput(launched(`printf '%s\\n' '{"type":"text","part":{"text":"{\\"findings\\":[]}"}}'`), { timeoutMs: 5000 });
    expect(out).toEqual({ ok: true, text: '{"findings":[]}' });
  });

  test("a non-zero exit with output still returns the output", async () => {
    const out = await collectReviewerOutput(launched(`echo partial; exit 3`), { timeoutMs: 5000 });
    expect(out).toEqual({ ok: true, text: "partial" });
  });

  test("a non-zero exit with no output is a harness error carrying stderr", async () => {
    const out = await collectReviewerOutput(launched(`echo boom >&2; exit 2`), { timeoutMs: 5000 });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("boom");
  });

  test("a hung reviewer is killed and reported as a timeout", async () => {
    const out = await collectReviewerOutput(launched(`sleep 30`), { timeoutMs: 100 });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("timed out");
  });
});
