/**
 * harness-adapters.test.ts — Fixture-driven tests for the claude-code, codex,
 * pi and custom adapters. No external binaries are required.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getHarness, normalizeOutput, type HarnessEvent } from "../src/lib/harness";
import { parseEvents, extractActivity } from "../src/lib/monitor";
import { parseUsageFromEvent } from "../src/lib/token-collector";

function fixture(name: string): string {
  return readFileSync(join(import.meta.dir, "fixtures", "harness", name), "utf-8");
}

function run(id: Parameters<typeof getHarness>[0], name: string): HarnessEvent[] {
  const n = getHarness(id).createNormalizer();
  return fixture(name).split("\n").flatMap((l) => n(l));
}

const base = { operation: "code" as const, bin: "BIN", cwd: "/wt", prompt: "P" };

describe("claude-code adapter", () => {
  const h = getHarness("claude-code");

  test("command: print mode, stream-json, verbose, model, extra args", () => {
    const cmd = h.buildLaunch({ ...base, model: "sonnet", extraArgs: ["--allowedTools", "Bash"], agentName: "x" });
    expect(cmd.args).toEqual([
      "-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits",
      "--model", "sonnet", "--allowedTools", "Bash",
    ]);
    expect(cmd.args).not.toContain("--agent");
    expect(cmd.promptVia).toBe("arg");
  });

  test("resume uses --resume SESSION", () => {
    const cmd = h.buildResume({ ...base, sessionId: "s1" });
    expect(cmd.args).toContain("--resume");
    expect(cmd.args[cmd.args.indexOf("--resume") + 1]).toBe("s1");
  });

  test("normalizes the recorded stream into canonical events", () => {
    const events = run("claude-code", "claude-code.jsonl");
    expect(events[0]).toMatchObject({ type: "step_start", sessionID: "cc-sess-1" });
    const tools = events.filter((e) => e.type === "tool_use");
    expect(tools).toHaveLength(2);
    expect(tools[0].part).toMatchObject({ tool: "read", state: { status: "completed", output: "export const a = 1" } });
    expect(tools[0].part!.state!.input!.filePath).toBe("/wt/src/a.ts");
    expect(tools[1].part).toMatchObject({ tool: "bash", state: { status: "error", error: "1 fail" } });
    expect(events.filter((e) => e.type === "text").map((e) => e.part!.text)).toEqual([
      "I will read the file first.", "All done.",
    ]);
    const finish = events.at(-1)!;
    expect(finish.type).toBe("step_finish");
    expect(finish.part).toMatchObject({ reason: "stop", cost: 0.0123 });
    expect(finish.part!.tokens).toMatchObject({ input: 120, output: 45, cache: { read: 300, write: 20 } });
  });

  test("monitor-compatible: parseEvents sees session and completion; usage parses", () => {
    const ndjson = normalizeOutput(fixture("claude-code.jsonl"), h);
    const parsed = parseEvents(ndjson);
    expect(parsed.sessionId).toBe("cc-sess-1");
    expect(parsed.completed).toBe(true);
    const finish = parsed.events.at(-1)!;
    const usage = parseUsageFromEvent(finish, "t", { harness: "claude-code" });
    expect(usage?.harness).toBe("claude-code");
    expect(usage?.input_tokens).toBe(120);
    expect(extractActivity(parsed.events[1])).toBe("responding…");
  });

  test("error result does not signal completion", () => {
    const events = run("claude-code", "claude-code-error.jsonl");
    expect(events.some((e) => e.type === "step_finish")).toBe(false);
    expect(events.at(-1)).toMatchObject({ type: "error", error: { message: "Reached max turns" } });
  });

  test("ignores garbage, partial JSON and unknown events", () => {
    const n = h.createNormalizer();
    expect(n("")).toEqual([]);
    expect(n("{not json")).toEqual([]);
    expect(n('{"type":"mystery"}')).toEqual([]);
    expect(n("[1,2]")).toEqual([]);
  });
});

describe("codex adapter", () => {
  const h = getHarness("codex");

  test("command: exec --json with cwd, model and provider; stdin marker", () => {
    const cmd = h.buildLaunch({ ...base, model: "gpt-5", provider: "azure" });
    expect(cmd.args).toEqual([
      "exec", "--json", "--full-auto", "--skip-git-repo-check", "-C", "/wt",
      "-m", "gpt-5", "-c", 'model_provider="azure"',
    ]);
    expect(cmd.stdinArgs).toEqual(["-"]);
  });

  test("resume: exec resume ID", () => {
    const cmd = h.buildResume({ ...base, sessionId: "th1" });
    expect(cmd.args.slice(0, 3)).toEqual(["exec", "resume", "th1"]);
  });

  test("normalizes the recorded stream", () => {
    const events = run("codex", "codex.jsonl");
    expect(events[0]).toMatchObject({ type: "step_start", sessionID: "cx-thread-1" });
    const tools = events.filter((e) => e.type === "tool_use");
    expect(tools.map((t) => [t.part!.tool, t.part!.state!.status])).toEqual([
      ["bash", "completed"], ["bash", "error"], ["edit", "completed"], ["write", "completed"],
    ]);
    expect(tools[2].part!.state!.input!.filePath).toBe("src/a.ts");
    expect(events.filter((e) => e.type === "text")).toHaveLength(1);
    const finish = events.at(-1)!;
    expect(finish.part).toMatchObject({ reason: "stop" });
    expect(finish.part!.tokens).toMatchObject({ input: 200, output: 30, cache: { read: 50, write: 0 } });
    expect(parseEvents(normalizeOutput(fixture("codex.jsonl"), h)).completed).toBe(true);
  });

  test("failed turn yields error events and no completion", () => {
    const events = run("codex", "codex-failed.jsonl");
    expect(events.filter((e) => e.type === "error")).toHaveLength(2);
    expect(events.some((e) => e.type === "step_finish")).toBe(false);
  });
});

describe("pi adapter", () => {
  const h = getHarness("pi");

  test("command: print + json mode, provider/model, resume session", () => {
    const cmd = h.buildLaunch({ ...base, provider: "anthropic", model: "sonnet" });
    expect(cmd.args).toEqual(["-p", "--mode", "json", "--provider", "anthropic", "--model", "sonnet"]);
    const r = h.buildResume({ ...base, sessionId: "ps1" });
    expect(r.args).toEqual(["-p", "--mode", "json", "--session", "ps1"]);
  });

  test("normalizes the recorded stream and sums usage at agent_end", () => {
    const events = run("pi", "pi.jsonl");
    expect(events[0]).toMatchObject({ type: "step_start", sessionID: "pi-sess-1" });
    const tools = events.filter((e) => e.type === "tool_use");
    expect(tools.map((t) => t.part!.state!.status)).toEqual(["completed", "error"]);
    expect(tools[0].part!.state!.input!.filePath).toBe("src/a.ts");
    expect(tools[1].part!.state!.input!.command).toBe("bun test");
    expect(events.filter((e) => e.type === "text").map((e) => e.part!.text)).toEqual([
      "Finished.", "Really finished.",
    ]);
    const finish = events.at(-1)!;
    expect(finish.part!.tokens).toMatchObject({ input: 150, output: 30, cache: { read: 5, write: 1 } });
    expect(finish.part!.cost).toBeCloseTo(0.003);
    expect(parseEvents(normalizeOutput(fixture("pi.jsonl"), h)).completed).toBe(true);
  });

  test("no agent_end means no completion event", () => {
    const n = h.createNormalizer();
    const out = fixture("pi.jsonl").split("\n").filter((l) => !l.includes("agent_end")).flatMap((l) => n(l));
    expect(out.some((e) => e.type === "step_finish")).toBe(false);
  });
});

describe("custom adapter", () => {
  const h = getHarness("custom");

  test("expands placeholders and embeds the prompt", () => {
    const cmd = h.buildLaunch({
      ...base, model: "m1", command: { args: ["--yolo", "-m", "{model}", "{prompt}"] },
    });
    expect(cmd.args).toEqual(["--yolo", "-m", "m1", "P"]);
    expect(cmd.promptVia).toBe("embedded");
  });

  test("drops a flag whose placeholder is empty", () => {
    const cmd = h.buildLaunch({ ...base, command: { args: ["--yolo", "-m", "{model}", "{prompt}"] } });
    expect(cmd.args).toEqual(["--yolo", "P"]);
  });

  test("prompt as trailing arg or stdin when no {prompt}", () => {
    expect(h.buildLaunch({ ...base, command: { args: ["run"] } }).promptVia).toBe("arg");
    expect(h.buildLaunch({ ...base, command: { args: ["run"], stdin: true } }).promptVia).toBe("stdin");
  });

  test("resume needs resumeArgs and {session}", () => {
    expect(() => h.buildResume({ ...base, sessionId: "s", command: { args: ["run"] } })).toThrow(/resume/);
    const cmd = h.buildResume({
      ...base, sessionId: "s9", command: { args: ["run"], resumeArgs: ["--resume", "{session}", "{prompt}"] },
    });
    expect(cmd.args).toEqual(["--resume", "s9", "P"]);
  });

  test("requires a command template", () => {
    expect(() => h.buildLaunch(base)).toThrow(/command/);
  });

  test("text output becomes text events; jsonl output is passed through", () => {
    const n = h.createNormalizer({ command: { args: [] } });
    expect(n("hello  ")).toEqual([{ type: "text", part: { type: "text", text: "hello\n" } }]);
    expect(n("   ")).toEqual([]);
    const j = h.createNormalizer({ command: { args: [], output: "opencode-jsonl" } });
    expect(j('{"type":"step_finish","part":{"reason":"stop"}}')).toHaveLength(1);
  });
});

describe("gemini adapter", () => {
  const h = getHarness("gemini");

  test("command: stream-json yolo with model, prompt positional", () => {
    const cmd = h.buildLaunch({ ...base, model: "gemini-2.5-pro" });
    expect(cmd.args).toEqual(["--output-format", "stream-json", "--yolo", "-m", "gemini-2.5-pro"]);
    expect(cmd.promptVia).toBe("arg");
  });

  test("normalizes the recorded stream", () => {
    const events = run("gemini", "gemini.jsonl");
    expect(events[0]).toMatchObject({ type: "step_start", sessionID: "gm-sess-1" });
    const tools = events.filter((e) => e.type === "tool_use");
    expect(tools.map((t) => [t.part!.tool, t.part!.state!.status])).toEqual([
      ["bash", "completed"], ["bash", "error"], ["write", "completed"],
    ]);
    expect(tools[2].part!.state!.input!.file_path).toBe("src/a.ts");
    expect(events.filter((e) => e.type === "text").map((e) => e.part!.text)).toEqual(["Looking at the repo.", "Done."]);
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(events.at(-1)!.part!.tokens).toMatchObject({ input: 120, output: 40, cache: { read: 10, write: 0 } });
    expect(parseEvents(normalizeOutput(fixture("gemini.jsonl"), h)).completed).toBe(true);
  });

  test("failed run yields errors and no completion", () => {
    const events = run("gemini", "gemini-failed.jsonl");
    expect(events.filter((e) => e.type === "error")).toHaveLength(2);
    expect(events.some((e) => e.type === "step_finish")).toBe(false);
  });
});
