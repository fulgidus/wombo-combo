/**
 * retro-cli.test.ts — `woco retro`: option parsing, rendering, --save and the
 * CLI surface, over a temp project seeded with task comments.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import YAML from "yaml";
import { parseSince, retroSlug, runRetro, renderRetroMarkdown } from "../src/commands/retro";
import { containsAiAttribution } from "../src/lib/attribution";
import { COMMAND_REGISTRY } from "../src/lib/schema";

const ENTRY = join(resolve(import.meta.dir, ".."), "src", "index.ts");
const NOW = Date.parse("2026-06-10T12:00:00.000Z");
let dir: string;

function woco(args: string[]) {
  const env: Record<string, string | undefined> = { ...process.env, CI: "1", NO_COLOR: "1" };
  delete env.WOMBO_OUTPUT; delete env.WOMBO_LOCALE; delete env.LANG; delete env.LC_ALL; delete env.LANGUAGE;
  const p = Bun.spawnSync(["bun", ENTRY, ...args], { cwd: dir, env: env as Record<string, string>, stdin: "ignore" });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
}

function addComment(taskId: string, id: string, body: string): void {
  const d = join(dir, ".wombo-combo", "comments", "task", taskId);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, `${id}.yml`), YAML.stringify({ author: "bob", role: "human", created_at: "2026-06-09T12:00:00.000Z", body }));
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "woco-retro-"));
  mkdirSync(join(dir, ".wombo-combo"), { recursive: true });
  writeFileSync(join(dir, ".wombo-combo", "config.json"), "{}\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("parseSince", () => {
  test("accepts <N>d and bare numbers", () => {
    expect(parseSince("7d")).toBe(7);
    expect(parseSince("30")).toBe(30);
    expect(parseSince(undefined)).toBeUndefined();
  });
  test("rejects garbage", () => {
    expect(() => parseSince("soon")).toThrow();
    expect(() => parseSince("0d")).toThrow();
  });
});

describe("retroSlug", () => {
  test("joins scope parts, falls back to all", () => {
    expect(retroSlug({})).toBe("all");
    expect(retroSlug({ task: "t1" })).toBe("t1");
    expect(retroSlug({ quest: "q1", sinceDays: 7 })).toBe("quest-q1-7d");
  });
});

describe("runRetro", () => {
  test("no signals -> empty candidates", () => {
    const r = runRetro({ projectRoot: dir, scope: {}, now: NOW });
    expect(r.candidates).toEqual([]);
    expect(r.markdown).toContain("No signals");
  });

  test("blocker comment yields an information-access candidate", () => {
    addComment("t1", "c1", "I am blocked: cannot access the staging docs");
    const r = runRetro({ projectRoot: dir, scope: { task: "t1" }, now: NOW });
    expect(r.candidates.some((c) => c.category === "information-access")).toBe(true);
    expect(r.markdown).toContain("information-access");
    expect(r.markdown).toContain("t1");
  });

  test("markdown never carries AI attribution, even from evidence", () => {
    // Built at runtime so the repo-wide attribution guard does not flag this fixture.
    const footer = ["Generated", "with", "[Claude", "Code](https://claude" + ".com/claude-code)"].join(" ");
    addComment("t1", "c1", `blocked\n${footer}`);
    const r = runRetro({ projectRoot: dir, scope: {}, now: NOW });
    expect(containsAiAttribution(renderRetroMarkdown(r.candidates, r.input, NOW))).toBe(false);
  });

  test("--save writes a dated scoped file", () => {
    addComment("t1", "c1", "blocked: missing docs");
    const r = runRetro({ projectRoot: dir, scope: { task: "t1" }, save: true, now: NOW });
    expect(r.savedPath).toBe(join(dir, ".wombo-combo", "retros", "2026-06-10-t1.md"));
    expect(readFileSync(r.savedPath!, "utf-8")).toBe(r.markdown);
  });

  test("--save with no signals saves nothing", () => {
    const r = runRetro({ projectRoot: dir, scope: {}, save: true, now: NOW });
    expect(r.savedPath).toBeUndefined();
    expect(existsSync(join(dir, ".wombo-combo", "retros"))).toBe(false);
  });
});

describe("woco retro CLI", () => {
  test("prints a clear no-signals message", () => {
    const r = woco(["retro"]);
    expect(r.code).toBe(0);
    expect(r.out.toLowerCase()).toContain("no signals");
  });

  test("json output lists candidates and scope", () => {
    addComment("t1", "c1", "blocked: cannot access the staging docs");
    const r = woco(["retro", "--task", "t1", "-o", "json"]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.out);
    expect(data.scope).toEqual({ task: "t1" });
    expect(data.candidates[0].category).toBe("information-access");
  });

  test("toon output works and text groups by category", () => {
    addComment("t1", "c1", "blocked: cannot access the staging docs");
    expect(woco(["retro", "-o", "toon"]).code).toBe(0);
    expect(woco(["retro"]).out).toContain("information-access");
  });

  test("--save writes under retros/", () => {
    addComment("t1", "c1", "blocked: cannot access the staging docs");
    const r = woco(["retro", "--task", "t1", "--save"]);
    expect(r.code).toBe(0);
    expect(readdirSync(join(dir, ".wombo-combo", "retros")).some((f) => f.endsWith("-t1.md"))).toBe(true);
  });

  test("invalid --since fails", () => {
    expect(woco(["retro", "--since", "soon"]).code).toBe(1);
  });

  test("is registered for describe/completion", () => {
    expect(COMMAND_REGISTRY.some((c) => c.name === "retro")).toBe(true);
  });
});
