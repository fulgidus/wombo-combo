/**
 * harness-acceptance.test.ts — End to end: a config.json with agent profiles is
 * loaded, validated, routed (with a fallback), launched against stub
 * executables and monitored through to completion and token usage.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, validateConfig, CONFIG_FILE, WOMBO_DIR } from "../src/config";
import { launchHeadless } from "../src/lib/launcher";
import { ProcessMonitor } from "../src/lib/monitor";
import { resolveRoute, selectAvailableRoute } from "../src/lib/harness/routing";
import type { UsageRecord } from "../src/lib/token-collector";

let root: string;
let codexStub: string;
let textStub: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "woco-harness-acceptance-"));
  mkdirSync(join(root, WOMBO_DIR), { recursive: true });
  codexStub = join(root, "fake-codex");
  textStub = join(root, "fake-text-agent");
  // Replays a recorded codex stream regardless of arguments
  writeFileSync(
    codexStub,
    `#!/usr/bin/env bun\nimport { readFileSync } from "node:fs";\nprocess.stdout.write(readFileSync(${JSON.stringify(
      join(import.meta.dir, "fixtures", "harness", "codex.jsonl"),
    )}, "utf-8"));\n`,
  );
  writeFileSync(textStub, `#!/usr/bin/env bun\nconsole.log("working...");\nconsole.log("all done");\n`);
  chmodSync(codexStub, 0o755);
  chmodSync(textStub, 0o755);

  writeFileSync(
    join(root, CONFIG_FILE),
    JSON.stringify({
      portless: { enabled: false },
      agentProfiles: {
        claude: { harness: "claude-code", bin: "/nonexistent/claude", envFrom: { ANTHROPIC_API_KEY: "ACCEPT_KEY" } },
        codex: { harness: "codex", bin: codexStub, model: "gpt-test", provider: "openai" },
        plain: { harness: "custom", bin: textStub, command: { args: ["{prompt}"] } },
      },
      routing: {
        default: "claude",
        byOperation: { conflict: "plain" },
        fallbacks: { claude: ["codex"] },
      },
    }),
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

function runToCompletion(
  monitor: ProcessMonitor,
  id: string,
  result: ReturnType<typeof launchHeadless>,
): Promise<"complete" | string> {
  return new Promise((resolve) => {
    (monitor as any).callbacks.onComplete = () => resolve("complete");
    (monitor as any).callbacks.onError = (_id: string, e: string) => resolve(e);
    monitor.addProcess(id, result.process, { normalize: result.normalize });
  });
}

describe("config-driven harness pipeline", () => {
  test("the config loads and validates", () => {
    const config = loadConfig(root);
    expect(() => validateConfig(config)).not.toThrow();
    expect(Object.keys(config.agentProfiles ?? {})).toEqual(["claude", "codex", "plain"]);
  });

  test("falls back from an unavailable profile and records usage for the harness that ran", async () => {
    const config = loadConfig(root);
    delete process.env.ACCEPT_KEY;
    const opts = { operation: "code" as const };
    const sel = selectAvailableRoute(config, resolveRoute(config, opts), opts);
    expect(sel.route.profile).toBe("codex");
    expect(sel.skipped[0].profile).toBe("claude");

    const monitor = new ProcessMonitor(root);
    const records: UsageRecord[] = [];
    const result = launchHeadless({ worktreePath: root, featureId: "accept-1", prompt: "go", config, route: sel.route });
    expect(result.harness).toBe("codex");
    monitor.tokenCollector.registerAgent("accept-1", {
      model: sel.route.model,
      provider: sel.route.provider,
      harness: sel.route.harness,
    });
    let sessionId: string | null = null;
    (monitor as any).callbacks.onSessionId = (_id: string, s: string) => (sessionId = s);
    const outcome = await runToCompletion(monitor, "accept-1", result);
    expect(outcome).toBe("complete");
    expect(sessionId).toBe("cx-thread-1");

    records.push(...monitor.tokenCollector.getRecords("accept-1"));
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      harness: "codex",
      provider: "openai",
      model: "gpt-test",
      input_tokens: 200,
      output_tokens: 30,
      is_final_step: true,
    });
  });

  test("operation routing sends conflicts to the plain custom agent, which completes by exit code", async () => {
    const config = loadConfig(root);
    const route = resolveRoute(config, { operation: "conflict" });
    expect(route.profile).toBe("plain");
    const monitor = new ProcessMonitor(root);
    const result = launchHeadless({ worktreePath: root, featureId: "accept-2", prompt: "go", config, route });
    expect(await runToCompletion(monitor, "accept-2", result)).toBe("complete");
    expect(monitor.getActivityLog("accept-2").some((e) => e.text.includes("all done"))).toBe(true);
  });
});
