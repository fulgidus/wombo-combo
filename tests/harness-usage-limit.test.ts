import { describe, test, expect } from "bun:test";
import {
  detectUsageLimit,
  parseResetTime,
  type UsageLimitInfo,
} from "../src/lib/harness/usage-limit";

describe("parseResetTime", () => {
  const baseNow = new Date("2026-10-13T10:00:00Z");

  test("parses relative duration format like '167h51m39s'", () => {
    const parsed = parseResetTime("167h51m39s", baseNow);
    expect(parsed).not.toBeNull();
    const expectedMs = baseNow.getTime() + (167 * 3600 + 51 * 60 + 39) * 1000;
    expect(parsed!.getTime()).toBe(expectedMs);
  });

  test("parses relative duration format like '20s'", () => {
    const parsed = parseResetTime("20s", baseNow);
    expect(parsed).not.toBeNull();
    expect(parsed!.getTime()).toBe(baseNow.getTime() + 20_000);
  });

  test("parses relative duration format like '5m' and '5 minutes'", () => {
    const parsed1 = parseResetTime("5m", baseNow);
    expect(parsed1!.getTime()).toBe(baseNow.getTime() + 5 * 60_000);

    const parsed2 = parseResetTime("5 minutes", baseNow);
    expect(parsed2!.getTime()).toBe(baseNow.getTime() + 5 * 60_000);
  });

  test("parses Claude Code format 'Oct 15, 7pm'", () => {
    const parsed = parseResetTime("Oct 15, 7pm", baseNow);
    expect(parsed).not.toBeNull();
    expect(parsed!.getMonth()).toBe(9); // October (0-indexed)
    expect(parsed!.getDate()).toBe(15);
    expect(parsed!.getHours()).toBe(19);
    expect(parsed!.getMinutes()).toBe(0);
  });

  test("parses 'Oct 15 at 7:30pm'", () => {
    const parsed = parseResetTime("Oct 15 at 7:30pm", baseNow);
    expect(parsed).not.toBeNull();
    expect(parsed!.getMonth()).toBe(9);
    expect(parsed!.getDate()).toBe(15);
    expect(parsed!.getHours()).toBe(19);
    expect(parsed!.getMinutes()).toBe(30);
  });

  test("parses ISO timestamp", () => {
    const parsed = parseResetTime("2026-10-15T19:00:00Z", baseNow);
    expect(parsed).not.toBeNull();
    expect(parsed!.toISOString()).toBe("2026-10-15T19:00:00.000Z");
  });
});

describe("detectUsageLimit", () => {
  const baseNow = new Date("2026-10-13T10:00:00Z");

  test("detects Claude Code weekly limit error with reset time", () => {
    const msg = "You have hit your weekly limit, resets Oct 15, 7pm";
    const info = detectUsageLimit(msg, baseNow);
    expect(info).not.toBeNull();
    expect(info!.isLimit).toBe(true);
    expect(info!.resetRaw).toBe("Oct 15, 7pm");
    expect(info!.resetsAt).not.toBeNull();
    expect(info!.resetsAt!.getDate()).toBe(15);
    expect(info!.resetsAt!.getHours()).toBe(19);
  });

  test("detects Antigravity / Claude quota error with relative duration", () => {
    const msg = "Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 167h51m39s.";
    const info = detectUsageLimit(msg, baseNow);
    expect(info).not.toBeNull();
    expect(info!.isLimit).toBe(true);
    expect(info!.resetRaw).toBe("167h51m39s");
    expect(info!.resetsAt).not.toBeNull();
  });

  test("detects RESOURCE_EXHAUSTED (code 429) error", () => {
    const msg = 'RESOURCE_EXHAUSTED (code 429): Quota exceeded. Resets in 60s.';
    const info = detectUsageLimit(msg, baseNow);
    expect(info).not.toBeNull();
    expect(info!.isLimit).toBe(true);
    expect(info!.resetRaw).toBe("60s");
  });

  test("detects OpenAI / Codex rate limit error", () => {
    const msg = "Rate limit reached for gpt-4 in organization org-123. Please try again in 20s.";
    const info = detectUsageLimit(msg, baseNow);
    expect(info).not.toBeNull();
    expect(info!.isLimit).toBe(true);
    expect(info!.resetRaw).toBe("20s");
  });

  test("detects insufficient_quota error without reset time", () => {
    const msg = "You exceeded your current quota, please check your plan and billing details.";
    const info = detectUsageLimit(msg, baseNow);
    expect(info).not.toBeNull();
    expect(info!.isLimit).toBe(true);
    expect(info!.resetsAt).toBeNull();
  });

  test("detects 429 Too Many Requests", () => {
    const msg = "HTTP 429: Too Many Requests";
    const info = detectUsageLimit(msg, baseNow);
    expect(info).not.toBeNull();
    expect(info!.isLimit).toBe(true);
  });

  test("returns null for non-limit errors", () => {
    expect(detectUsageLimit("SyntaxError: Unexpected token <", baseNow)).toBeNull();
    expect(detectUsageLimit("Process exited with code 1", baseNow)).toBeNull();
    expect(detectUsageLimit("bun test failed: 2 failures", baseNow)).toBeNull();
    expect(detectUsageLimit("git merge conflict in src/index.ts", baseNow)).toBeNull();
  });
});
