import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ENTRY = join(resolve(import.meta.dir, ".."), "src", "index.ts");
let dir: string;

function woco(args: string[], opts: { stdin?: string; env?: Record<string, string> } = {}) {
  const env: Record<string, string | undefined> = { ...process.env, CI: "1", NO_COLOR: "1", WOMBO_AUTHOR: "tester" };
  delete env.WOMBO_OUTPUT; delete env.WOMBO_LOCALE; delete env.LANG; delete env.LC_ALL; delete env.LANGUAGE;
  Object.assign(env, opts.env);
  const p = Bun.spawnSync(["bun", ENTRY, ...args], {
    cwd: dir, env: env as Record<string, string>,
    stdin: opts.stdin !== undefined ? Buffer.from(opts.stdin) : "ignore",
  });
  return { code: p.exitCode, out: p.stdout.toString().replace(/\x1b\[[0-9;]*m/g, ""), err: p.stderr.toString() };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "woco-comment-"));
  mkdirSync(join(dir, ".wombo-combo"), { recursive: true });
  writeFileSync(join(dir, ".wombo-combo", "config.json"), "{}\n");
  expect(woco(["tasks", "add", "t1", "Task one"]).code).toBe(0);
  expect(woco(["quest", "create", "q1", "--title", "Quest one", "--goal", "g"]).code).toBe(0);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("woco comment", () => {
  test("tasks show / quest show print nothing extra without comments", () => {
    expect(woco(["tasks", "show", "t1"]).out).not.toContain("Comments");
    expect(JSON.parse(woco(["tasks", "show", "t1", "-o", "json"]).out)).not.toHaveProperty("comments");
  });

  test("add joins words, list/show round-trip, json and toon", () => {
    const add = woco(["comment", "add", "t1", "hello", "wide", "world", "--role", "human", "-o", "json"]);
    expect(add.code).toBe(0);
    const { comment } = JSON.parse(add.out);
    expect(comment).toMatchObject({ ref_kind: "task", ref_id: "t1", author: "tester", role: "human", body: "hello wide world" });

    const list = JSON.parse(woco(["comment", "list", "t1", "-o", "json"]).out);
    expect(list.comments.map((c: any) => c.id)).toEqual([comment.id]);
    expect(woco(["comment", "list", "t1"]).out).toContain("hello wide world");
    expect(woco(["comment", "list", "t1", "-o", "toon"]).out).toContain("hello wide world");

    expect(JSON.parse(woco(["comment", "show", comment.id, "-o", "json"]).out).body).toBe("hello wide world");
    expect(woco(["comment", "show", comment.id]).out).toContain("hello wide world");
  });

  test("quest refs, --reply-to, --author, --stdin", () => {
    const a = JSON.parse(woco(["comment", "add", "quest:q1", "first", "-o", "json"]).out).comment;
    const b = JSON.parse(
      woco(["comment", "add", "quest:q1", "--stdin", "--reply-to", a.id, "--author", "bob", "-o", "json"], { stdin: "from\nstdin\n" }).out,
    ).comment;
    expect(b).toMatchObject({ body: "from\nstdin", reply_to: a.id, author: "bob", ref_kind: "quest" });
    expect(woco(["comment", "list", "t1"]).out).toContain("No comments on t1");
    expect(JSON.parse(woco(["comment", "list", "quest:q1", "--author", "bob", "-o", "json"]).out).comments).toHaveLength(1);
    expect(JSON.parse(woco(["comment", "list", "quest:q1", "--limit", "1", "-o", "json"]).out).comments[0].id).toBe(b.id);
  });

  test("errors: bad ref, missing ref target, empty text, bad role, bad limit, unknown id", () => {
    expect(woco(["comment", "add", "nope", "x"]).code).toBe(1);
    expect(woco(["comment", "add", "nope", "x"]).err).toContain("not found");
    expect(woco(["comment", "add", "../x", "x"]).err).toContain("Invalid ref");
    expect(woco(["comment", "add", "t1"]).err).toContain("empty");
    expect(woco(["comment", "add", "t1", "x", "--role", "boss"]).err).toContain("Invalid role");
    expect(woco(["comment", "list", "t1", "--limit", "abc"]).err).toContain("Invalid --limit");
    expect(woco(["comment", "show", "zzz"]).err).toContain("not found");
  });

  test("tasks show prints the last 5 (text) and all (json)", () => {
    for (let i = 1; i <= 7; i++) woco(["comment", "add", "t1", `note-${i}`]);
    const text = woco(["tasks", "show", "t1"]).out;
    expect(text).toContain("Comments (latest 5 of 7)");
    expect(text).not.toContain("note-2");
    for (const i of [3, 4, 5, 6, 7]) expect(text).toContain(`note-${i}`);
    expect(JSON.parse(woco(["tasks", "show", "t1", "-o", "json"]).out).comments).toHaveLength(7);
  });

  test("quest show prints comments", () => {
    woco(["comment", "add", "quest:q1", "quest-note"]);
    expect(woco(["quest", "show", "q1"]).out).toContain("quest-note");
    expect(JSON.parse(woco(["quest", "show", "q1", "-o", "json"]).out).comments).toHaveLength(1);
  });

  test("Italian output uses i18n keys", () => {
    woco(["comment", "add", "t1", "ciao"]);
    expect(woco(["comment", "list", "quest:q1"], { env: { WOMBO_LOCALE: "it" } }).out).toContain("Nessun commento");
    expect(woco(["tasks", "show", "t1"], { env: { WOMBO_LOCALE: "it" } }).out).toContain("Commenti (ultimi 1 di 1)");
  });
});
