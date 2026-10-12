import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { loadConfig } from "../src/config";
import { addComment, getComment } from "../src/lib/comments";
import { saveQuest } from "../src/lib/quest-store";
import { saveTaskToStore } from "../src/lib/task-store";
import { startFakeGitHub, type FakeGitHub } from "./helpers/fake-github";
import { mkQuest, mkTask } from "./helpers/sync-fixtures";

const ENTRY = join(resolve(import.meta.dir, ".."), "src", "index.ts");
let dir: string;
let fake: FakeGitHub;

/** Async spawn: the fake server lives in this process, so the event loop must stay free. */
async function woco(args: string[], env: Record<string, string> = {}, opts: { bare?: boolean } = {}) {
  const base: Record<string, string | undefined> = { ...process.env, CI: "1", NO_COLOR: "1" };
  for (const k of ["WOMBO_OUTPUT", "WOMBO_LOCALE", "LANG", "LC_ALL", "LANGUAGE", "GITHUB_TOKEN", "GH_TOKEN", "GITHUB_API_URL"]) delete base[k];
  if (opts.bare) base.PATH = dirname(process.execPath); // no gh, no git: nothing to resolve a token or repo from
  Object.assign(base, env);
  const p = Bun.spawn([process.execPath, ENTRY, ...args], { cwd: dir, env: base as Record<string, string>, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code: await p.exited, out, err };
}
const gh = () => ({ GITHUB_TOKEN: "tok", GITHUB_API_URL: fake.url });
const writes = () => fake.requests.filter((r) => r.method !== "GET").length;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "woco-sync-cli-"));
  mkdirSync(join(dir, ".wombo-combo"), { recursive: true });
  writeFileSync(join(dir, ".wombo-combo", "config.json"), JSON.stringify({ sync: { github: { repo: "acme/widgets" } } }));
  saveTaskToStore(dir, loadConfig(dir), mkTask());
  saveQuest(dir, mkQuest());
  fake = startFakeGitHub();
});
afterEach(() => {
  fake.stop();
  rmSync(dir, { recursive: true, force: true });
});

describe("woco sync", () => {
  test("push creates issues, json report, second run writes nothing", async () => {
    addComment(dir, { kind: "task", id: "t1" }, { body: "note", role: "human" });
    const first = await woco(["sync", "push", "-o", "json"], gh());
    expect(first.code).toBe(0);
    const report = JSON.parse(first.out);
    expect(report.created.map((c: any) => c.ref).sort()).toEqual(["quest:q1", "t1"]);
    expect(report.commented).toHaveLength(1);
    expect(fake.issues).toHaveLength(2);

    fake.requests.length = 0;
    const second = await woco(["sync", "push", "-o", "json"], gh());
    expect(second.code).toBe(0);
    expect(JSON.parse(second.out).unchanged).toHaveLength(2);
    expect(writes()).toBe(0);
    expect((await woco(["sync", "push"], gh())).out).toContain("Unchanged: 2");
  });

  test("--dry-run and --only", async () => {
    const dry = await woco(["sync", "push", "--dry-run", "-o", "json"], gh());
    expect(JSON.parse(dry.out).dryRun).toBe(true);
    expect(writes()).toBe(0);
    const only = await woco(["sync", "push", "--only", "quest:q1", "-o", "json"], gh());
    expect(JSON.parse(only.out).created.map((c: any) => c.ref)).toEqual(["quest:q1"]);
    expect((await woco(["sync", "push", "--only", "bad id"], gh())).code).toBe(1);
  });

  test("status is read-only and reports states (toon too)", async () => {
    const before = JSON.parse((await woco(["sync", "status", "-o", "json"], gh())).out);
    expect(before.items.map((i: any) => i.state)).toEqual(["new", "new"]);
    await woco(["sync", "push"], gh());
    fake.requests.length = 0;
    const after = await woco(["sync", "status"], gh());
    expect(after.out).toContain("in sync");
    expect((await woco(["sync", "status", "-o", "toon"], gh())).code).toBe(0);
    expect(writes()).toBe(0);
  });

  test("labels creates the catalog; --dry-run does not", async () => {
    const dry = JSON.parse((await woco(["sync", "labels", "--dry-run", "-o", "json"], gh())).out);
    expect(dry.created.length).toBeGreaterThan(10);
    expect(fake.labels).toHaveLength(0);
    const real = JSON.parse((await woco(["sync", "labels", "-o", "json"], gh())).out);
    expect(real.created).toEqual(dry.created);
    expect(fake.labels.length).toBe(dry.created.length);
  });

  test("clear errors without token or repo (exit 1)", async () => {
    const noToken = await woco(["sync", "push"], { GITHUB_API_URL: fake.url }, { bare: true });
    expect(noToken.code).toBe(1);
    expect(noToken.err).toContain("No GitHub token");
    writeFileSync(join(dir, ".wombo-combo", "config.json"), "{}");
    const noRepo = await woco(["sync", "status"], gh(), { bare: true });
    expect(noRepo.code).toBe(1);
    expect(noRepo.err).toContain("GitHub repository");
    expect(fake.requests).toHaveLength(0);
  });

  test("an item failure sets exit code 1 but the report is printed", async () => {
    fake.inject({ method: "POST", path: "/repos/acme/widgets/issues", status: 422, times: 1 });
    const r = await woco(["sync", "push", "-o", "json"], gh());
    expect(r.code).toBe(1);
    const report = JSON.parse(r.out);
    expect(report.errors).toHaveLength(1);
    expect(report.created).toHaveLength(1);
  });
});

describe("woco comment link", () => {
  test("sets github_url on an existing comment", async () => {
    const c = addComment(dir, { kind: "task", id: "t1" }, { body: "x", role: "human" });
    const url = "https://github.com/acme/widgets/issues/1#issuecomment-9";
    const r = await woco(["comment", "link", c.id, url, "-o", "json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).comment.github_url).toBe(url);
    expect(getComment(dir, c.id)!.github_url).toBe(url);
    expect((await woco(["comment", "link", "missing-id", url])).code).toBe(1);
    expect((await woco(["comment", "link", c.id, "not-a-url"])).code).toBe(1);
  });
});
