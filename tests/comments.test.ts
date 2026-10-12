import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG } from "../src/config";
import { createBlankTask, saveTaskToStore } from "../src/lib/tasks";
import { createBlankQuest } from "../src/lib/quest";
import { saveQuest, archiveQuest } from "../src/lib/quest-store";
import {
  addComment, listComments, getComment, recentComments, parseRef, resolveAuthor, commentsDir,
  MAX_COMMENT_CHARS,
} from "../src/lib/comments";
import { makeRepo, git } from "./helpers/git-repo";

let repo: string;
const T = { kind: "task", id: "t1" } as const;
const Q = { kind: "quest", id: "q1" } as const;
let savedEnv: string | undefined;

beforeEach(() => {
  repo = makeRepo();
  savedEnv = process.env.WOMBO_AUTHOR;
  delete process.env.WOMBO_AUTHOR;
  saveTaskToStore(repo, DEFAULT_CONFIG, createBlankTask("t1", "Task one"));
  saveQuest(repo, createBlankQuest("q1", "Quest", "goal", "main"));
});
afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  if (savedEnv === undefined) delete process.env.WOMBO_AUTHOR; else process.env.WOMBO_AUTHOR = savedEnv;
});

describe("parseRef", () => {
  test("task and quest refs", () => {
    expect(parseRef("t1")).toEqual({ kind: "task", id: "t1" });
    expect(parseRef("quest:q1")).toEqual({ kind: "quest", id: "q1" });
  });
  test("rejects unsafe or empty ids", () => {
    for (const bad of ["", "quest:", "../x", "quest:../x", "a/b", ".hidden"]) {
      expect(() => parseRef(bad)).toThrow();
    }
  });
});

describe("author resolution", () => {
  test("env > git email > os user", () => {
    git(repo, "config", "user.email", "dev@example.test");
    expect(resolveAuthor(repo)).toBe("dev@example.test");
    process.env.WOMBO_AUTHOR = "agent-7";
    expect(resolveAuthor(repo)).toBe("agent-7");
  });
});

describe("addComment", () => {
  test("writes one atomic file named <ts>-<slug>-<rand4>.yml; id is stem", () => {
    const c = addComment(repo, T, { body: "hello", author: "Dev@Example.test", role: "human" });
    const dir = join(commentsDir(repo), "task", "t1");
    const files = readdirSync(dir);
    expect(files).toEqual([`${c.id}.yml`]);
    expect(c.id).toMatch(/^\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.\d{3}Z-dev-example-test-[a-z0-9]{4}$/);
    expect(readFileSync(join(dir, files[0]), "utf-8")).toContain("body: hello");
    expect(c).toMatchObject({ ref_kind: "task", ref_id: "t1", author: "Dev@Example.test", role: "human", body: "hello" });
    expect(getComment(repo, c.id)).toEqual(c);
  });

  test("defaults author from env and role to agent; optional fields", () => {
    process.env.WOMBO_AUTHOR = "bot";
    const a = addComment(repo, Q, { body: "q note", github_url: "https://github.com/o/r/issues/1#c" });
    expect(a.author).toBe("bot");
    expect(a.role).toBe("agent");
    expect(a.github_url).toBe("https://github.com/o/r/issues/1#c");
    const r = addComment(repo, Q, { body: "re", reply_to: a.id });
    expect(r.reply_to).toBe(a.id);
    expect(existsSync(join(commentsDir(repo), "quest", "q1", `${a.id}.yml`))).toBe(true);
  });

  test("validation", () => {
    expect(() => addComment(repo, T, { body: "  \n" })).toThrow(/empty/);
    expect(() => addComment(repo, T, { body: "x".repeat(MAX_COMMENT_CHARS + 1) })).toThrow(/too long/);
    expect(() => addComment(repo, T, { body: "x".repeat(MAX_COMMENT_CHARS) })).not.toThrow();
    expect(() => addComment(repo, { kind: "task", id: "nope" }, { body: "x" })).toThrow(/not found/);
    expect(() => addComment(repo, { kind: "quest", id: "nope" }, { body: "x" })).toThrow(/not found/);
    expect(() => addComment(repo, { kind: "task", id: "../x" }, { body: "x" })).toThrow(/invalid/);
    expect(() => addComment(repo, T, { body: "x", role: "bogus" as any })).toThrow(/role/);
    expect(() => addComment(repo, T, { body: "x", reply_to: "missing" })).toThrow(/reply_to/);
    const onQuest = addComment(repo, Q, { body: "x" });
    expect(() => addComment(repo, T, { body: "x", reply_to: onQuest.id })).toThrow(/reply_to/);
  });

  test("multiline bodies round-trip and no tmp files remain", () => {
    const body = "line1\n\n  indented: yes # not a comment\n- dash\n";
    const c = addComment(repo, T, { body });
    expect(getComment(repo, c.id)!.body).toBe(body);
    expect(readdirSync(join(commentsDir(repo), "task", "t1")).every((f) => f.endsWith(".yml"))).toBe(true);
  });

  test("archived quest still accepts and keeps comments", () => {
    const c = addComment(repo, Q, { body: "before" });
    archiveQuest(repo, "q1");
    expect(listComments(repo, Q).map((x) => x.id)).toEqual([c.id]);
    expect(() => addComment(repo, Q, { body: "after" })).not.toThrow();
  });
});

describe("listComments", () => {
  function seed(): string[] {
    const dir = join(commentsDir(repo), "task", "t1");
    mkdirSync(dir, { recursive: true });
    const rows: [string, string, string][] = [
      ["2026-01-01T00-00-03.000Z-b-aaaa", "2026-01-01T00:00:03.000Z", "b"],
      ["2026-01-01T00-00-01.000Z-a-aaaa", "2026-01-01T00:00:01.000Z", "a"],
      ["2026-01-01T00-00-02.000Z-a-bbbb", "2026-01-01T00:00:02.000Z", "a"],
      ["2026-01-01T00-00-02.000Z-a-aaaa", "2026-01-01T00:00:02.000Z", "a"],
    ];
    for (const [id, at, author] of rows) {
      writeFileSync(join(dir, `${id}.yml`), `id: ${id}\nauthor: ${author}\nrole: human\ncreated_at: "${at}"\nbody: b-${id}\n`);
    }
    writeFileSync(join(dir, "junk.yml"), "not: a comment\n");
    writeFileSync(join(dir, "README.txt"), "x");
    return rows.map((r) => r[0]);
  }

  test("empty for refs without comments (even unknown refs)", () => {
    expect(listComments(repo, T)).toEqual([]);
    expect(listComments(repo, { kind: "task", id: "deleted" })).toEqual([]);
  });

  test("deterministic oldest-first order with id tiebreak; junk skipped", () => {
    seed();
    expect(listComments(repo, T).map((c) => c.id)).toEqual([
      "2026-01-01T00-00-01.000Z-a-aaaa",
      "2026-01-01T00-00-02.000Z-a-aaaa",
      "2026-01-01T00-00-02.000Z-a-bbbb",
      "2026-01-01T00-00-03.000Z-b-aaaa",
    ]);
  });

  test("limit takes newest n, returned oldest first; since is exclusive; author filter", () => {
    seed();
    expect(listComments(repo, T, { limit: 2 }).map((c) => c.id)).toEqual([
      "2026-01-01T00-00-02.000Z-a-bbbb",
      "2026-01-01T00-00-03.000Z-b-aaaa",
    ]);
    expect(listComments(repo, T, { limit: 99 })).toHaveLength(4);
    expect(listComments(repo, T, { limit: 0 })).toEqual([]);
    expect(listComments(repo, T, { since: "2026-01-01T00:00:02.000Z" })).toHaveLength(1);
    expect(listComments(repo, T, { author: "a" })).toHaveLength(3);
    expect(listComments(repo, T, { author: "a", since: "2026-01-01T00:00:01Z", limit: 1 }).map((c) => c.id)).toEqual([
      "2026-01-01T00-00-02.000Z-a-bbbb",
    ]);
    expect(() => listComments(repo, T, { since: "garbage" })).toThrow(/since/);
  });

  test("recentComments", () => {
    seed();
    expect(recentComments(repo, T, 1).map((c) => c.id)).toEqual(["2026-01-01T00-00-03.000Z-b-aaaa"]);
  });

  test("tasks and quests with the same id are separate", () => {
    saveTaskToStore(repo, DEFAULT_CONFIG, createBlankTask("same", "x"));
    saveQuest(repo, createBlankQuest("same", "x", "g", "main"));
    addComment(repo, { kind: "task", id: "same" }, { body: "t" });
    expect(listComments(repo, { kind: "quest", id: "same" })).toEqual([]);
  });
});

describe("getComment", () => {
  test("missing or unsafe id returns null", () => {
    expect(getComment(repo, "nope")).toBeNull();
    expect(getComment(repo, "../../config")).toBeNull();
  });
});

describe("ordering of comments written in the same millisecond", () => {
  test("listComments returns insertion order even for a burst of writes", () => {
    const bodies = Array.from({ length: 60 }, (_, i) => `c${i}`);
    for (const b of bodies) addComment(repo, T, { body: b, author: "woco", role: "system" });
    expect(listComments(repo, T).map((c) => c.body)).toEqual(bodies);
  });

  test("created_at and id strictly increase within a process", () => {
    const made = Array.from({ length: 30 }, (_, i) => addComment(repo, T, { body: `c${i}`, author: "woco" }));
    for (let i = 1; i < made.length; i++) {
      expect(made[i].created_at > made[i - 1].created_at).toBe(true);
      expect(made[i].id > made[i - 1].id).toBe(true);
    }
  });
});
