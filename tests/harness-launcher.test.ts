/**
 * harness-launcher.test.ts — launchHeadless / retryHeadless / launchConflictResolver
 * through harness adapters, using stub executables (no real agent CLIs).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DEFAULT_CONFIG, type WomboConfig } from "../src/config";
import { launchHeadless, retryHeadless, launchConflictResolver, type LaunchResult } from "../src/lib/launcher";
import { resolveRoute } from "../src/lib/harness/routing";
import { ProcessMonitor } from "../src/lib/monitor";

let dir: string;
let ocStub: string;
let claudeStub: string;
let anyStub: string;

/** Stub that reports how it was invoked as one text event, then finishes. */
const REPORTER = `#!/usr/bin/env bun
const stdin = await Bun.stdin.text();
const report = { argv: process.argv.slice(2), stdin, secret: process.env.CHILD_SECRET ?? null, cwd: process.cwd() };
console.log(JSON.stringify({ type: "text", sessionID: "stub-session", part: { type: "text", text: JSON.stringify(report) } }));
console.log(JSON.stringify({ type: "step_finish", sessionID: "stub-session", part: { reason: "stop" } }));
`;

/** Stub that replays a recorded claude-code stream. */
const CLAUDE_REPLAY = `#!/usr/bin/env bun
import { readFileSync } from "node:fs";
process.stdout.write(readFileSync(${JSON.stringify(join(import.meta.dir, "fixtures", "harness", "claude-code.jsonl"))}, "utf-8"));
`;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "woco-harness-launcher-"));
  ocStub = join(dir, "opencode-stub");
  claudeStub = join(dir, "claude");
  anyStub = join(dir, "reporter");
  writeFileSync(ocStub, REPORTER);
  writeFileSync(claudeStub, CLAUDE_REPLAY);
  writeFileSync(anyStub, REPORTER);
  for (const f of [ocStub, claudeStub, anyStub]) chmodSync(f, 0o755);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

function cfg(extra: Partial<WomboConfig> = {}): WomboConfig {
  return { ...DEFAULT_CONFIG, portless: { ...DEFAULT_CONFIG.portless, enabled: false }, ...extra } as WomboConfig;
}

async function collect(result: LaunchResult): Promise<{ lines: any[]; code: number | null }> {
  let out = "";
  result.process.stdout?.on("data", (d: Buffer) => (out += d.toString()));
  const code = await new Promise<number | null>((res) => result.process.on("close", (c) => res(c)));
  return { lines: out.split("\n").filter(Boolean).map((l) => JSON.parse(l)), code };
}

function report(lines: any[]): { argv: string[]; stdin: string; secret: string | null; cwd: string } {
  return JSON.parse(lines.find((l) => l.type === "text").part.text);
}

describe("legacy path (no profiles): opencode argv unchanged", () => {
  const config = () => cfg({ agent: { ...DEFAULT_CONFIG.agent, bin: ocStub } });

  test("launchHeadless", async () => {
    const r = launchHeadless({ worktreePath: dir, featureId: "feat-1", prompt: "DO IT", model: "prov/model", config: config() });
    expect(r.harness).toBe("opencode");
    expect(r.profile).toBe("default");
    expect(r.normalize).toBeUndefined();
    const { lines, code } = await collect(r);
    expect(code).toBe(0);
    const { argv } = report(lines);
    expect(argv.slice(0, 5)).toEqual(["run", "--format", "json", "--agent", "generalist-agent"]);
    expect(argv[5]).toBe("--title");
    expect(argv[6]).toMatch(/^woco: feat-1-\d+$/);
    expect(argv.slice(7)).toEqual(["--model", "prov/model", "DO IT"]);
  });

  test("launchHeadless with custom agent name and no model", async () => {
    const r = launchHeadless({ worktreePath: dir, featureId: "f", prompt: "P", config: config(), agentName: "my-agent" });
    const { argv } = report((await collect(r)).lines);
    expect(argv.slice(0, 5)).toEqual(["run", "--format", "json", "--agent", "my-agent"]);
    expect(argv).not.toContain("--model");
    expect(argv.at(-1)).toBe("P");
  });

  test("retryHeadless resumes the session", async () => {
    const r = retryHeadless({ worktreePath: dir, featureId: "f", sessionId: "ses_9", buildErrors: "boom", model: "m", config: config() });
    const { argv } = report((await collect(r)).lines);
    expect(argv.slice(0, 6)).toEqual(["run", "--format", "json", "--session", "ses_9", "--continue"]);
    expect(argv.slice(6, 8)).toEqual(["--model", "m"]);
    expect(argv.at(-1)).toContain("boom");
  });

  test("launchConflictResolver uses merge-resolver-agent and its own title", async () => {
    const r = launchConflictResolver({ worktreePath: dir, featureId: "f", prompt: "RESOLVE", config: config() });
    const { argv } = report((await collect(r)).lines);
    expect(argv.slice(0, 5)).toEqual(["run", "--format", "json", "--agent", "merge-resolver-agent"]);
    expect(argv[6]).toMatch(/^woco: conflict-resolve-f-\d+$/);
    expect(argv.at(-1)).toBe("RESOLVE");
  });

  test("prompts above the argv limit are piped via stdin", async () => {
    const big = "x".repeat(200 * 1024);
    const r = launchHeadless({ worktreePath: dir, featureId: "f", prompt: big, config: config() });
    const { argv, stdin } = report((await collect(r)).lines);
    expect(argv).not.toContain(big);
    expect(stdin.length).toBe(big.length);
  });
});

describe("profiles", () => {
  test("custom profile: template args, account env from envFrom, normalized text events", async () => {
    process.env.WOCO_TEST_KEY_WORK = "work-secret";
    try {
      const config = cfg({
        agentProfiles: {
          t: {
            harness: "custom",
            bin: anyStub,
            envFrom: { CHILD_SECRET: "WOCO_TEST_KEY_WORK" },
            command: { args: ["--model", "{model}", "{prompt}"] },
          },
        } as any,
        routing: { default: "t" } as any,
      });
      const route = resolveRoute(config, { operation: "code", sessionModel: "mm" });
      const r = launchHeadless({ worktreePath: dir, featureId: "f", prompt: "HELLO", model: "mm", config, route });
      expect(r.harness).toBe("custom");
      expect(r.profile).toBe("t");
      expect(typeof r.normalize).toBe("function");
      const { lines } = await collect(r);
      const rep = report(lines);
      expect(rep.argv.slice(0, 2)).toEqual(["--model", "mm"]);
      expect(rep.argv).toHaveLength(3);
      expect(rep.argv[2].endsWith("HELLO")).toBe(true);
      expect(rep.secret).toBe("work-secret");
    } finally {
      delete process.env.WOCO_TEST_KEY_WORK;
    }
  });

  test("a missing envFrom variable fails the launch naming the variable", () => {
    delete process.env.WOCO_TEST_MISSING;
    const config = cfg({
      agentProfiles: { t: { harness: "custom", bin: anyStub, envFrom: { X: "WOCO_TEST_MISSING" }, command: { args: ["{prompt}"] } } } as any,
      routing: { default: "t" } as any,
    });
    const route = resolveRoute(config, { operation: "code" });
    expect(() => launchHeadless({ worktreePath: dir, featureId: "f", prompt: "P", config, route })).toThrow(/WOCO_TEST_MISSING/);
  });

  test("claude-code profile: no --agent flag, definition inlined, stream reaches the monitor normalized", async () => {
    const config = cfg({
      agentProfiles: { cc: { harness: "claude-code", bin: claudeStub, model: "sonnet" } } as any,
      routing: { default: "cc" } as any,
    });
    const route = resolveRoute(config, { operation: "code" });
    const r = launchHeadless({ worktreePath: dir, featureId: "cc-task", prompt: "PROMPT", config, route, agentName: "merge-resolver-agent" });
    expect(r.harness).toBe("claude-code");

    const root = mkdtempSync(join(tmpdir(), "woco-monitor-"));
    try {
      const events: string[] = [];
      let sessionId: string | null = null;
      const done = new Promise<void>((resolve) => {
        const monitor = new ProcessMonitor(root, {
          onSessionId: (_id, s) => (sessionId = s),
          onActivity: (_id, a) => events.push(a),
          onComplete: () => resolve(),
          onError: () => resolve(),
        });
        monitor.tokenCollector.registerAgent("cc-task", { harness: "claude-code" });
        monitor.addProcess("cc-task", r.process, { normalize: r.normalize });
      });
      await done;
      expect(sessionId).toBe("cc-sess-1");
      expect(events).toContain("reading src/a.ts");
      expect(events).toContain("done");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("agent definition is inlined into the prompt for harnesses without agent selection", async () => {
    const config = cfg({
      agentProfiles: { t: { harness: "custom", bin: anyStub, command: { args: ["{prompt}"] } } } as any,
      routing: { default: "t" } as any,
    });
    const route = resolveRoute(config, { operation: "conflict" });
    const r = launchConflictResolver({ worktreePath: dir, featureId: "f", prompt: "RESOLVE-ME", config, route });
    const { argv } = report((await collect(r)).lines);
    expect(argv).toHaveLength(1);
    expect(argv[0]).toContain("Agent instructions (merge-resolver-agent)");
    expect(argv[0].endsWith("RESOLVE-ME")).toBe(true);
  });

  test("retry without resume support starts a fresh run with the retry message", async () => {
    const config = cfg({
      agentProfiles: { t: { harness: "custom", bin: anyStub, command: { args: ["{prompt}"] } } } as any,
      routing: { default: "t" } as any,
    });
    const route = resolveRoute(config, { operation: "code" });
    const r = retryHeadless({ worktreePath: dir, featureId: "f", sessionId: "s1", buildErrors: "E!", config, route });
    const { argv } = report((await collect(r)).lines);
    expect(argv).toHaveLength(1);
    expect(argv[0]).toContain("E!");
  });

  test("retry resumes when the custom command has resumeArgs", async () => {
    const config = cfg({
      agentProfiles: {
        t: { harness: "custom", bin: anyStub, command: { args: ["{prompt}"], resumeArgs: ["--resume", "{session}", "{prompt}"] }, capabilities: { sessionResume: true } },
      } as any,
      routing: { default: "t" } as any,
    });
    const route = resolveRoute(config, { operation: "code" });
    const r = retryHeadless({ worktreePath: dir, featureId: "f", sessionId: "s77", buildErrors: "E!", config, route });
    const { argv } = report((await collect(r)).lines);
    expect(argv.slice(0, 2)).toEqual(["--resume", "s77"]);
  });
});
