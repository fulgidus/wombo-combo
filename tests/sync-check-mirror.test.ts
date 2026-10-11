import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadConfig } from "../src/config";
import { addComment } from "../src/lib/comments";
import { saveQuest } from "../src/lib/quest-store";
import { saveTaskToStore } from "../src/lib/task-store";
import { createGitHubClient } from "../src/lib/sync/github-client";
import { deleteMapping, readMapping, writeMapping } from "../src/lib/sync/mapping";
import { checkMirror } from "../src/lib/sync/mirror-check";
import { pushToGitHub } from "../src/lib/sync/push";
import type { Task } from "../src/lib/tasks";
import { startFakeGitHub, type FakeGitHub } from "./helpers/fake-github";
import { mkQuest, mkTask } from "./helpers/sync-fixtures";

const ENTRY = join(resolve(import.meta.dir, ".."), "src", "index.ts");
let root: string;
let fake: FakeGitHub;
const saveTask = (t: Task) => saveTaskToStore(root, loadConfig(root), t);

async function check(args: string[] = []) {
  const env: Record<string, string | undefined> = { ...process.env, CI: "1", NO_COLOR: "1", GITHUB_API_URL: "http://127.0.0.1:9" };
  for (const k of ["WOMBO_OUTPUT", "WOMBO_LOCALE", "LANG", "LC_ALL", "LANGUAGE", "GITHUB_TOKEN", "GH_TOKEN"]) delete env[k];
  const p = Bun.spawn([process.execPath, ENTRY, "tasks", "check", "--mirror", "-o", "json", ...args], {
    cwd: root, env: env as Record<string, string>, stdout: "pipe", stderr: "pipe", stdin: "ignore",
  });
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code: await p.exited, out, err, json: JSON.parse(out) };
}

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "sync-mirror-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
  fake = startFakeGitHub();
  saveTask(mkTask({ effort: "PT1H" }));
  saveQuest(root, mkQuest());
});
afterEach(() => {
  fake.stop();
  rmSync(root, { recursive: true, force: true });
});

const push = () =>
  pushToGitHub({
    projectRoot: root,
    client: createGitHubClient({ token: "tok", repo: { owner: "acme", name: "widgets" }, apiUrl: fake.url, sleep: async () => {} }),
  });

describe("tasks check --mirror", () => {
  test("unmapped tasks and quests are reported as warnings; exit 0; no network", async () => {
    const r = await check();
    expect(r.code).toBe(0);
    expect(r.json.ok).toBe(true);
    expect(r.json.mirror.map((f: any) => [f.kind, f.ref]).sort()).toEqual([["unmapped", "quest:q1"], ["unmapped", "t1"]]);
    expect(r.json.issues.filter((i: any) => i.level === "warning" && i.message.includes("no mapping"))).toHaveLength(2);
    expect(fake.requests).toHaveLength(0);
  });

  test("a clean mirror has no findings", async () => {
    await push();
    const r = await check(["--strict"]);
    expect(r.code).toBe(0);
    expect(r.json.mirror).toEqual([]);
  });

  test("changed item, orphan mapping and comment without a GitHub id", async () => {
    await push();
    saveTask(mkTask({ effort: "PT1H", title: "Changed locally" }));
    const entry = readMapping(root, "task", "t1")!;
    writeMapping(root, "task", "ghost", { ...entry, issue_number: 99 });
    addComment(root, { kind: "task", id: "t1" }, { body: "local only", author: "me", role: "human" });
    const f = checkMirror(root, loadConfig(root));
    expect(f.map((x) => x.kind).sort()).toEqual(["comment-no-id", "hash-differs", "orphan-mapping"]);
    const r = await check();
    expect(r.code).toBe(0);
    expect(r.json.mirror).toHaveLength(3);
  });

  test("--strict turns mirror findings into errors (exit 1); without --mirror nothing changes", async () => {
    const strict = await check(["--strict"]);
    expect(strict.code).toBe(1);
    expect(strict.json.ok).toBe(false);
    const plain = Bun.spawnSync([process.execPath, ENTRY, "tasks", "check", "-o", "json"], { cwd: root });
    expect(plain.exitCode).toBe(0);
    expect(JSON.parse(plain.stdout.toString()).mirror).toBeUndefined();
  });

  test("a deleted mapping reads as unmapped", async () => {
    await push();
    deleteMapping(root, "task", "t1");
    expect(checkMirror(root, loadConfig(root)).map((x) => x.kind)).toEqual(["unmapped"]);
  });
});
