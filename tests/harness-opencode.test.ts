/**
 * harness-opencode.test.ts — Characterization of the opencode argv (must stay
 * byte-identical to the historical launcher output) and the harness registry.
 */

import { describe, test, expect } from "bun:test";
import { getHarness, listHarnesses, detectHarnessFromBin, normalizeOutput } from "../src/lib/harness";
import { HARNESS_IDS, OPERATIONS, isHarnessId } from "../src/lib/harness/ids";
import { detectAgentType } from "../src/lib/launcher";

const oc = getHarness("opencode");
const base = { operation: "code" as const, bin: "/bin/opencode", cwd: "/wt", prompt: "P" };

describe("opencode adapter argv (characterization)", () => {
  test("launch: agent + title, no model", () => {
    const cmd = oc.buildLaunch({ ...base, agentName: "generalist-agent", title: "woco: f-1" });
    expect(cmd.bin).toBe("/bin/opencode");
    expect(cmd.args).toEqual(["run", "--format", "json", "--agent", "generalist-agent", "--title", "woco: f-1"]);
    expect(cmd.promptVia).toBe("arg");
  });

  test("launch: model is appended after title", () => {
    const cmd = oc.buildLaunch({ ...base, agentName: "a", title: "t", model: "anthropic/x" });
    expect(cmd.args).toEqual(["run", "--format", "json", "--agent", "a", "--title", "t", "--model", "anthropic/x"]);
  });

  test("launch: fake agent passes --dir before --model", () => {
    const cmd = oc.buildLaunch({ ...base, agentName: "fake-agent", title: "t", passDir: true, model: "m" });
    expect(cmd.args).toEqual([
      "run", "--format", "json", "--agent", "fake-agent", "--title", "t", "--dir", "/wt", "--model", "m",
    ]);
  });

  test("resume: session + continue, then model", () => {
    const cmd = oc.buildResume({ ...base, sessionId: "ses_1" });
    expect(cmd.args).toEqual(["run", "--format", "json", "--session", "ses_1", "--continue"]);
    const withModel = oc.buildResume({ ...base, sessionId: "ses_1", model: "m", passDir: true });
    expect(withModel.args).toEqual([
      "run", "--format", "json", "--session", "ses_1", "--continue", "--dir", "/wt", "--model", "m",
    ]);
  });

  test("conflict resolver launch has the merge-resolver agent and its own title", () => {
    const cmd = oc.buildLaunch({
      ...base, operation: "conflict", agentName: "merge-resolver-agent", title: "woco: conflict-resolve-f-1-1",
    });
    expect(cmd.args.slice(0, 6)).toEqual(["run", "--format", "json", "--agent", "merge-resolver-agent", "--title"]);
  });
});

describe("opencode normalizer", () => {
  test("is identity for JSON lines and drops blanks and garbage", () => {
    const n = oc.createNormalizer();
    const ev = { type: "step_finish", sessionID: "s", part: { reason: "stop" } };
    expect(n(JSON.stringify(ev))).toEqual([ev]);
    expect(n("")).toEqual([]);
    expect(n("not json")).toEqual([]);
  });

  test("normalizeOutput keeps JSON events and drops noise", () => {
    const raw = `{"type":"text","part":{"text":"hi"}}\nwarning: x\n`;
    expect(normalizeOutput(raw, oc)).toBe(`{"type":"text","part":{"text":"hi"}}`);
  });
});

describe("registry and detection", () => {
  test("ids and operations", () => {
    expect(HARNESS_IDS).toContain("opencode");
    expect(OPERATIONS).toEqual(["plan", "code", "conflict", "review"]);
    expect(isHarnessId("codex")).toBe(true);
    expect(isHarnessId("nope")).toBe(false);
  });

  test("listHarnesses includes opencode", () => {
    expect(listHarnesses().map((h) => h.id)).toContain("opencode");
  });

  test("getHarness throws for unregistered ids", () => {
    expect(() => getHarness("nope" as any)).toThrow(/not available/);
  });

  test("detectHarnessFromBin maps binary names, unknown falls back to opencode", () => {
    expect(detectHarnessFromBin("/home/u/.opencode/bin/opencode")).toBe("opencode");
    expect(detectHarnessFromBin("/usr/bin/claude")).toBe("claude-code");
    expect(detectHarnessFromBin("/usr/bin/codex")).toBe("codex");
    expect(detectHarnessFromBin("/usr/bin/pi")).toBe("pi");
    expect(detectHarnessFromBin("/usr/bin/whatever")).toBe("opencode");
  });

  test("legacy detectAgentType is unchanged", () => {
    expect(detectAgentType("/x/opencode")).toBe("opencode");
    expect(detectAgentType("/x/claude")).toBe("claude");
    expect(detectAgentType("/x/other")).toBe("unknown");
  });
});
