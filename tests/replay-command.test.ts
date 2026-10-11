/**
 * replay-command.test.ts — `woco replay list|show` via real CLI subprocesses
 * against a seeded temp project, plus resolution and describe/registry checks.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ReplayStore } from "../src/lib/replay";
import { resolveExecution } from "../src/commands/replay";
import { findBridgeCommandDef } from "../src/lib/citty-registry";

const SRC_ENTRY = resolve(import.meta.dir, "..", "src", "index.ts");
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "replay-cmd-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function seed(): void {
  const s = new ReplayStore(root);
  const mk = (exec: string, started: string, outcome: "succeeded" | "failed") => {
    s.begin({ execution_id: exec, task_id: "feat-a", quest_id: null, wave_id: "w", agent: "fake-agent", model: "m", started_at: started });
    s.append("feat-a", exec, { kind: "prompt", text: "Do the thing", truncated: false }, started);
    s.append("feat-a", exec, { kind: "attempt", n: 1, reason: "start" }, started);
    s.append("feat-a", exec, { kind: "event", event: { type: "tool", tool: "bash", status: "completed", input: { command: "ls -la" }, output: "x" } }, started);
    s.append("feat-a", exec, { kind: "event", event: { type: "text", text: `said ${exec}` } }, started);
    s.append("feat-a", exec, { kind: "diff", diff: "diff --git a/x b/x\n+1\n", truncated: false, files: [{ path: "x", additions: 1, deletions: 0 }], baseline: "abc" }, started);
    s.append("feat-a", exec, { kind: "end", outcome }, started);
  };
  mk("feat-a-e1", "2026-03-01T10:00:00.000Z", "failed");
  mk("feat-a-e2", "2026-03-02T10:00:00.000Z", "succeeded");
}

function woco(...args: string[]): { code: number; out: string; err: string } {
  const r = Bun.spawnSync(["bun", SRC_ENTRY, ...args], {
    cwd: root,
    env: { ...process.env, NO_COLOR: "1", WOMBO_OUTPUT: "", CI: "1" } as Record<string, string>,
    stdout: "pipe",
    stderr: "pipe",
  });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

describe("resolveExecution", () => {
  const sums = [{ execution_id: "a" }, { execution_id: "b" }, { execution_id: "c" }] as any[];
  test("defaults to latest, accepts 1-based index and id", () => {
    expect((resolveExecution(sums) as any).execution_id).toBe("c");
    expect((resolveExecution(sums, "1") as any).execution_id).toBe("a");
    expect((resolveExecution(sums, "b") as any).execution_id).toBe("b");
  });
  test("errors are strings", () => {
    expect(typeof resolveExecution(sums, "0")).toBe("string");
    expect(typeof resolveExecution(sums, "4")).toBe("string");
    expect(typeof resolveExecution(sums, "nope")).toBe("string");
    expect(typeof resolveExecution([])).toBe("string");
  });
});

describe("woco replay", () => {
  test("list with nothing recorded explains itself", () => {
    const r = woco("replay", "list");
    expect(r.code).toBe(0);
    expect(r.out).toContain("No replays recorded yet");
  });

  test("bare `replay` defaults to list", () => {
    seed();
    const r = woco("replay");
    expect(r.code).toBe(0);
    expect(r.out).toContain("feat-a-e1");
    expect(r.out).toContain("feat-a-e2");
  });

  test("list --output json is structured", () => {
    seed();
    const r = woco("replay", "list", "--output", "json");
    const data = JSON.parse(r.out);
    expect(data.executions.map((e: any) => [e.execution_id, e.outcome, e.event_count])).toEqual([
      ["feat-a-e1", "failed", 2],
      ["feat-a-e2", "succeeded", 2],
    ]);
  });

  test("show prints the latest execution timeline and diff stat", () => {
    seed();
    const r = woco("replay", "show", "feat-a");
    expect(r.code).toBe(0);
    expect(r.out).toContain("execution 2/2");
    expect(r.out).toContain("tool bash ls -la");
    expect(r.out).toContain("said feat-a-e2");
    expect(r.out).toContain("+1/-0  x");
    expect(r.out).toContain("end: succeeded");
  });

  test("show --execution 1 and by id", () => {
    seed();
    expect(woco("replay", "show", "feat-a", "--execution", "1").out).toContain("said feat-a-e1");
    expect(woco("replay", "show", "feat-a", "--execution", "feat-a-e2").out).toContain("said feat-a-e2");
  });

  test("show --output json returns records, prompt and diff", () => {
    seed();
    const data = JSON.parse(woco("replay", "show", "feat-a", "--execution", "1", "--output", "json").out);
    expect(data.execution_id).toBe("feat-a-e1");
    expect(data.prompt).toBe("Do the thing");
    expect(data.diff.files[0].path).toBe("x");
    expect(data.end.outcome).toBe("failed");
    expect(data.records.some((r: any) => r.kind === "event" && r.event.tool === "bash")).toBe(true);
  });

  test("unknown feature or execution exits non-zero with a message", () => {
    seed();
    const a = woco("replay", "show", "missing");
    expect(a.code).not.toBe(0);
    expect(a.err).toContain('No replays recorded for "missing"');
    const b = woco("replay", "show", "feat-a", "--execution", "9");
    expect(b.code).not.toBe(0);
    expect(b.err).toContain("out of range");
  });

  test("alias rp works and describe exposes replay with subcommands", () => {
    seed();
    expect(woco("rp", "list").out).toContain("feat-a-e1");
    const d = JSON.parse(woco("describe", "replay").out);
    expect(d.command).toBe("replay");
    expect(d.subcommands.map((s: any) => s.name)).toEqual(["replay list", "replay show"]);
    const show = findBridgeCommandDef("replay show")!;
    expect(show.positionals.map((p) => p.name)).toEqual(["feature-id"]);
    expect(show.flags.map((f) => f.name)).toContain("--execution");
  });
});
