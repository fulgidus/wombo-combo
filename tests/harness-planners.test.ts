/**
 * harness-planners.test.ts — Planners run through the "plan" operation profile.
 * Uses stub executables; no real agent CLI is needed.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, chmodSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DEFAULT_CONFIG, type WomboConfig } from "../src/config";
import { launchPlanner, canonicalizeOutput } from "../src/lib/launcher";
import { resolveRoute } from "../src/lib/harness/routing";
import { runErrandPlanner } from "../src/lib/errand-planner";

const PLAN = [
  "```yaml",
  "tasks:",
  "  - id: planned-task",
  "    title: Planned task",
  "    description: Do the thing",
  "    priority: high",
  "    difficulty: easy",
  "    effort: PT1H",
  "```",
].join("\n");

let dir: string;
let ocStub: string;
let textStub: string;
let reporterStub: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "woco-harness-planners-"));
  mkdirSync(join(dir, ".wombo-combo"), { recursive: true });
  ocStub = join(dir, "opencode-stub");
  textStub = join(dir, "plain-agent");
  reporterStub = join(dir, "opencode-reporter");
  writeFileSync(
    ocStub,
    `#!/usr/bin/env bun\nconsole.log(JSON.stringify({ type: "text", sessionID: "s", part: { type: "text", text: ${JSON.stringify(PLAN)} } }));\n`,
  );
  // plain text harness: prints the plan as raw lines
  writeFileSync(textStub, `#!/usr/bin/env bun\nconsole.log(${JSON.stringify(PLAN)});\n`);
  writeFileSync(
    reporterStub,
    `#!/usr/bin/env bun\nconsole.log(JSON.stringify({ type: "text", part: { text: JSON.stringify({ argv: process.argv.slice(2), dir: process.env.OPENCODE_DIR, key: process.env.PLAN_KEY ?? null }) } }));\n`,
  );
  for (const f of [ocStub, textStub, reporterStub]) chmodSync(f, 0o755);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

function cfg(extra: Partial<WomboConfig> = {}): WomboConfig {
  return { ...DEFAULT_CONFIG, portless: { ...DEFAULT_CONFIG.portless, enabled: false }, ...extra } as WomboConfig;
}

async function stdoutOf(child: import("node:child_process").ChildProcess): Promise<string> {
  let out = "";
  child.stdout?.on("data", (d: Buffer) => (out += d.toString()));
  await new Promise((res) => child.on("close", res));
  return out;
}

describe("launchPlanner", () => {
  test("legacy: missing binary yields the historical error text", () => {
    const r = launchPlanner({
      config: cfg({ agent: { ...DEFAULT_CONFIG.agent, bin: "/nonexistent/opencode" } }),
      projectRoot: dir, prompt: "P", agentName: "quest-planner-agent", title: "woco: plan q",
    });
    expect(r).toEqual({
      ok: false,
      error: "Agent binary not found at: /nonexistent/opencode. Check config.agent.bin or OPENCODE_BIN env var.",
    });
  });

  test("legacy: opencode argv and OPENCODE_DIR are unchanged", async () => {
    const r = launchPlanner({
      config: cfg({ agent: { ...DEFAULT_CONFIG.agent, bin: reporterStub } }),
      projectRoot: dir, prompt: "PROMPT", agentName: "quest-planner-agent", title: "woco: plan q", model: "p/m",
    });
    if (!r.ok) throw new Error(r.error);
    const events = (await stdoutOf(r.result.process)).split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const rep = JSON.parse(events[0].part.text);
    expect(rep.argv).toEqual([
      "run", "--format", "json", "--agent", "quest-planner-agent", "--title", "woco: plan q", "--model", "p/m", "PROMPT",
    ]);
    expect(rep.dir).toBe(dir);
  });

  test("profiles: operation plan picks the byOperation profile and its account env", async () => {
    process.env.WOCO_PLAN_KEY = "plan-secret";
    try {
      const config = cfg({
        agentProfiles: {
          code: { harness: "opencode", bin: "/nonexistent/code" },
          plan: { harness: "opencode", bin: reporterStub, envFrom: { PLAN_KEY: "WOCO_PLAN_KEY" } },
        } as any,
        routing: { default: "code", byOperation: { plan: "plan" } } as any,
      });
      const r = launchPlanner({ config, projectRoot: dir, prompt: "P", agentName: "a", title: "t" });
      if (!r.ok) throw new Error(r.error);
      expect(r.result.profile).toBe("plan");
      const rep = JSON.parse(JSON.parse((await stdoutOf(r.result.process)).split("\n")[0]).part.text);
      expect(rep.key).toBe("plan-secret");
    } finally {
      delete process.env.WOCO_PLAN_KEY;
    }
  });

  test("profiles: falls back along the chain when the first binary is missing", () => {
    const config = cfg({
      agentProfiles: {
        a: { harness: "opencode", bin: "/nonexistent/a" },
        b: { harness: "opencode", bin: reporterStub },
      } as any,
      routing: { byOperation: { plan: "a" }, fallbacks: { a: ["b"] } } as any,
    });
    const r = launchPlanner({ config, projectRoot: dir, prompt: "P", agentName: "a", title: "t" });
    if (!r.ok) throw new Error(r.error);
    expect(r.result.profile).toBe("b");
    r.result.process.kill();
  });

  test("profiles: error names every skipped profile when none can start", () => {
    const config = cfg({
      agentProfiles: { a: { harness: "codex", bin: "/nonexistent/a" } } as any,
      routing: { default: "a" } as any,
    });
    const r = launchPlanner({ config, projectRoot: dir, prompt: "P", agentName: "a", title: "t" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/a \(binary not found: \/nonexistent\/a\)/);
  });
});

describe("canonicalizeOutput", () => {
  test("opencode output is returned untouched", () => {
    const route = resolveRoute(cfg({ agent: { ...DEFAULT_CONFIG.agent, bin: ocStub } }), { operation: "plan" });
    expect(canonicalizeOutput("garbage\n{}", route)).toBe("garbage\n{}");
  });

  test("other harnesses are normalized to opencode-shaped events", () => {
    const route = resolveRoute(
      cfg({ agentProfiles: { c: { harness: "codex", bin: "x" } } as any, routing: { default: "c" } as any }),
      { operation: "plan" },
    );
    const raw = '{"type":"item.completed","item":{"type":"agent_message","text":"hello"}}';
    expect(JSON.parse(canonicalizeOutput(raw, route))).toMatchObject({ type: "text", part: { text: "hello" } });
  });
});

describe("runErrandPlanner end to end with stubs", () => {
  test("opencode stub (legacy config)", async () => {
    const r = await runErrandPlanner(
      { description: "do a thing" } as any, dir, cfg({ agent: { ...DEFAULT_CONFIG.agent, bin: ocStub } }),
    );
    expect(r.error).toBeUndefined();
    expect(r.success).toBe(true);
    expect(r.tasks.map((t) => t.id)).toEqual(["planned-task"]);
  });

  test("plain-text custom harness profile produces the same plan", async () => {
    const config = cfg({
      agentProfiles: { p: { harness: "custom", bin: textStub, command: { args: ["{prompt}"] } } } as any,
      routing: { byOperation: { plan: "p" } } as any,
    });
    const r = await runErrandPlanner({ description: "do a thing" } as any, dir, config);
    expect(r.error).toBeUndefined();
    expect(r.tasks.map((t) => t.id)).toEqual(["planned-task"]);
  });

  test("missing binary reports the historical error", async () => {
    const r = await runErrandPlanner(
      { description: "x" } as any, dir, cfg({ agent: { ...DEFAULT_CONFIG.agent, bin: "/nonexistent/opencode" } }),
    );
    expect(r.success).toBe(false);
    expect(r.error).toContain("Agent binary not found at: /nonexistent/opencode");
  });
});
