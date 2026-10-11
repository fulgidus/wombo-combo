/**
 * replay-normalizers.test.ts — Every harness's canonical event stream maps to
 * harness-neutral ReplayEvents through the replay normalizer registry.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HARNESS_IDS, getHarness } from "../src/lib/harness";
import {
  REPLAY_NORMALIZERS,
  normalizeHarnessEvent,
  normalizeOpenCodeEvent,
  REPLAY_LIMITS,
  type ReplayEvent,
} from "../src/lib/replay";

const FIXTURES = join(import.meta.dir, "fixtures", "harness");

function replayEvents(harness: (typeof HARNESS_IDS)[number], lines: string[]): ReplayEvent[] {
  const normalize = getHarness(harness).createNormalizer();
  const out: ReplayEvent[] = [];
  for (const line of lines) {
    for (const ev of normalize(line)) {
      const r = normalizeHarnessEvent(harness, ev);
      if (r) out.push(r);
    }
  }
  return out;
}

function fixture(name: string): string[] {
  return readFileSync(join(FIXTURES, name), "utf-8").split("\n").filter((l) => l.trim());
}

describe("REPLAY_NORMALIZERS", () => {
  test("has an entry for every harness id", () => {
    for (const id of HARNESS_IDS) expect(typeof REPLAY_NORMALIZERS[id]).toBe("function");
  });

  test("opencode entry is normalizeOpenCodeEvent", () => {
    expect(REPLAY_NORMALIZERS.opencode).toBe(normalizeOpenCodeEvent);
  });

  test("unknown or missing harness falls back to the opencode normalizer", () => {
    const ev = { type: "text", part: { text: "hi" } };
    expect(normalizeHarnessEvent(null, ev)).toEqual(normalizeOpenCodeEvent(ev));
    expect(normalizeHarnessEvent(undefined, ev)).toEqual({ type: "text", text: "hi" });
    expect(normalizeHarnessEvent("nope" as any, ev)).toEqual({ type: "text", text: "hi" });
  });

  test("non-object input yields null and never throws", () => {
    for (const id of HARNESS_IDS) {
      expect(normalizeHarnessEvent(id, null as any)).toBeNull();
      expect(normalizeHarnessEvent(id, "x" as any)).toBeNull();
    }
  });
});

describe("harness fixtures normalize to neutral replay events", () => {
  test("claude-code", () => {
    const events = replayEvents("claude-code", fixture("claude-code.jsonl"));
    expect(events.some((e) => e.type === "text" && (e.text ?? "").length > 0)).toBe(true);
    const tool = events.find((e) => e.type === "tool");
    expect(tool).toBeDefined();
    expect(tool!.tool).toBeTruthy();
    expect(["completed", "error"]).toContain(tool!.status!);
    const fin = events.find((e) => e.type === "step_finish");
    expect(fin?.reason).toBe("stop");
    expect(fin?.tokens?.total).toBeGreaterThan(0);
  });

  test("claude-code error stream records an error or failed tool", () => {
    const events = replayEvents("claude-code", fixture("claude-code-error.jsonl"));
    expect(events.some((e) => e.type === "error" || e.status === "error")).toBe(true);
  });

  test("codex", () => {
    const events = replayEvents("codex", fixture("codex.jsonl"));
    expect(events.some((e) => e.type === "tool")).toBe(true);
    expect(events.find((e) => e.type === "step_finish")?.tokens?.input).toBeGreaterThan(0);
  });

  test("codex failure", () => {
    const events = replayEvents("codex", fixture("codex-failed.jsonl"));
    expect(events.some((e) => e.type === "error")).toBe(true);
  });

  test("pi", () => {
    const events = replayEvents("pi", fixture("pi.jsonl"));
    expect(events.length).toBeGreaterThan(0);
    expect(events.find((e) => e.type === "step_finish")?.tokens).toBeDefined();
  });

  test("custom text harness lines become text events", () => {
    const events = replayEvents("custom", ["plain output line", "another one"]);
    const text = events.filter((e) => e.type === "text").map((e) => e.text);
    expect(text.join("\n")).toContain("plain output line");
  });
});

describe("neutral events are bounded regardless of harness", () => {
  test("oversized tool output from any harness is truncated with a marker", () => {
    for (const id of HARNESS_IDS) {
      const r = normalizeHarnessEvent(id, {
        type: "tool_use",
        part: { tool: "bash", state: { status: "completed", input: { command: "x" }, output: "o".repeat(REPLAY_LIMITS.output + 50) } },
      })!;
      expect(r.truncated).toBe(true);
      expect(r.output).toContain("[truncated 50 chars]");
    }
  });

  test("malformed numeric token fields do not leak NaN", () => {
    const r = normalizeHarnessEvent("codex", {
      type: "step_finish",
      part: { reason: "stop", cost: Number.NaN, tokens: { total: "x", input: null, output: 5, reasoning: undefined } },
    } as any)!;
    expect(r.tokens).toEqual({ total: 0, input: 0, output: 5, reasoning: 0, cache_read: 0, cache_write: 0 });
    expect(r.cost).toBeUndefined();
  });
});
