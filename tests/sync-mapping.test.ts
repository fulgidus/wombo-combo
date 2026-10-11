import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  deleteMapping,
  findMappingByIssue,
  findMarker,
  hashComment,
  hashQuest,
  hashTask,
  listMappings,
  mappingPath,
  markerFor,
  mergeFields,
  readMapping,
  stableStringify,
  stripMarker,
  writeMapping,
  type MappingEntry,
} from "../src/lib/sync/mapping";
import type { Task } from "../src/lib/tasks";
import type { Quest } from "../src/lib/quest";

function task(over: Partial<Task> = {}): Task {
  return {
    id: "my-task", title: "My task", description: "Do it", status: "backlog", completion: 0,
    difficulty: "medium", priority: "high", depends_on: ["a"], effort: "1h", started_at: null,
    ended_at: null, constraints: ["c1"], forbidden: [], references: [], notes: [], subtasks: [],
    ...over,
  };
}

function quest(over: Partial<Quest> = {}): Quest {
  return {
    id: "q", title: "Q", goal: "Goal", status: "active", priority: "medium", difficulty: "hard",
    depends_on: [], branch: "quest/q", baseBranch: "main", hitlMode: "yolo",
    constraints: { add: ["x"], ban: [], override: {} },
    created_at: "t", updated_at: "t", started_at: null, ended_at: null, notes: [],
    ...over,
  } as Quest;
}

const entry = (over: Partial<MappingEntry> = {}): MappingEntry => ({
  issue_number: 7, issue_url: "https://github.com/o/r/issues/7", remote_updated_at: "2026-01-01T00:00:00Z",
  local_hash: "lh", remote_hash: "rh", last_synced_at: "2026-01-02T00:00:00Z", comments: { c1: 11 }, ...over,
});

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "sync-map-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe("mapping store", () => {
  test("write then read round-trips, one file per item", () => {
    writeMapping(root, "task", "t1", entry());
    writeMapping(root, "task", "t2", entry({ issue_number: 8 }));
    writeMapping(root, "quest", "q1", entry({ issue_number: 9 }));
    expect(readMapping(root, "task", "t1")).toEqual(entry());
    expect(mappingPath(root, "quest", "q1")).toContain(join(".wombo-combo", "sync", "github", "quest", "q1.yml"));
    expect(listMappings(root, "task").map((m) => m.id)).toEqual(["t1", "t2"]);
    expect(findMappingByIssue(root, "task", 8)?.id).toBe("t2");
    expect(findMappingByIssue(root, "task", 99)).toBeNull();
  });

  test("replace leaves no temp files", () => {
    writeMapping(root, "task", "t1", entry());
    writeMapping(root, "task", "t1", entry({ issue_number: 42 }));
    expect(readMapping(root, "task", "t1")?.issue_number).toBe(42);
    expect(readdirSync(dirname(mappingPath(root, "task", "t1")))).toEqual(["t1.yml"]);
  });

  test("missing and corrupt files read as null; listing skips them", () => {
    expect(readMapping(root, "task", "nope")).toBeNull();
    expect(listMappings(root, "task")).toEqual([]);
    writeMapping(root, "task", "ok", entry());
    const bad = mappingPath(root, "task", "bad");
    writeFileSync(bad, ": : [unclosed\n\t- x");
    writeFileSync(mappingPath(root, "task", "weird"), "just a string");
    writeFileSync(mappingPath(root, "task", "nonum"), "issue_number: abc\n");
    expect(readMapping(root, "task", "bad")).toBeNull();
    expect(readMapping(root, "task", "weird")).toBeNull();
    expect(readMapping(root, "task", "nonum")).toBeNull();
    expect(listMappings(root, "task").map((m) => m.id)).toEqual(["ok"]);
  });

  test("tolerates partial files and bad comment entries", () => {
    mkdirSync(dirname(mappingPath(root, "task", "p")), { recursive: true });
    writeFileSync(mappingPath(root, "task", "p"), "issue_number: 3\ncomments:\n  a: 1\n  b: x\n");
    expect(readMapping(root, "task", "p")).toEqual(entry({
      issue_number: 3, issue_url: "", remote_updated_at: "", local_hash: "", remote_hash: "", last_synced_at: "", comments: { a: 1 },
    }));
  });

  test("rejects unsafe ids and kinds; delete", () => {
    expect(() => mappingPath(root, "task", "../evil")).toThrow();
    expect(() => mappingPath(root, "bogus" as never, "x")).toThrow();
    expect(() => writeMapping(root, "task", "a/b", entry())).toThrow();
    expect(readMapping(root, "task", "../evil")).toBeNull();
    writeMapping(root, "task", "t1", entry());
    expect(deleteMapping(root, "task", "t1")).toBe(true);
    expect(deleteMapping(root, "task", "t1")).toBe(false);
  });
});

describe("hashing", () => {
  test("stable over key order", () => {
    expect(stableStringify({ b: 1, a: { d: 1, c: [2, { z: 1, y: 2 }] } })).toBe(stableStringify({ a: { c: [2, { y: 2, z: 1 }], d: 1 }, b: 1 }));
    const t = task();
    const reordered = Object.fromEntries(Object.entries(t).reverse()) as unknown as Task;
    expect(hashTask(reordered)).toBe(hashTask(t));
  });

  test("changes with syncable fields, ignores the rest", () => {
    const h = hashTask(task());
    expect(hashTask(task({ title: "Other" }))).not.toBe(h);
    expect(hashTask(task({ constraints: ["c2"] }))).not.toBe(h);
    expect(hashTask(task({ status: "done" }))).not.toBe(h);
    expect(hashTask(task({ notes: ["triage: needs-triage"] }))).not.toBe(h);
    // fine-grained open statuses, effort, completion, other notes are not synced
    expect(hashTask(task({ status: "in_progress", completion: 50, effort: "9h", notes: ["hi"] }))).toBe(h);
  });

  test("quest and comment hashes", () => {
    expect(hashQuest(quest())).toBe(hashQuest(quest({ updated_at: "later", branch: "x" })));
    expect(hashQuest(quest())).not.toBe(hashQuest(quest({ goal: "Other" })));
    const c = { author: "a", role: "human" as const, body: "hi" };
    expect(hashComment(c)).toBe(hashComment({ ...c, body: "hi\n" }));
    expect(hashComment(c)).not.toBe(hashComment({ ...c, body: "hello" }));
    expect(hashComment(c)).not.toBe(hashComment({ ...c, role: "agent" }));
  });
});

describe("markers", () => {
  test("markerFor / findMarker / stripMarker", () => {
    expect(markerFor("task", "my-task")).toBe("<!-- woco:task:my-task -->");
    expect(findMarker(`text\n\n${markerFor("quest", "q.1")}`)).toEqual({ kind: "quest", id: "q.1" });
    const cid = "2026-10-11T22-39-08.322Z-alice-ab12";
    expect(findMarker(markerFor("comment", cid))).toEqual({ kind: "comment", id: cid });
    expect(stripMarker(`body text\n\n${markerFor("task", "x")}\n`)).toBe("body text");
  });

  test("only well-formed ids are accepted", () => {
    expect(() => markerFor("task", "bad id")).toThrow();
    expect(() => markerFor("task", "a-->b")).toThrow();
    expect(() => markerFor("task", "")).toThrow();
    expect(() => markerFor("nope" as never, "x")).toThrow();
    for (const bad of [
      "<!-- woco:task: -->", "<!-- woco:task:-x -->", "<!-- woco:task:a b -->", "<!-- woco:epic:x -->",
      "<!-- woco:task:../x -->", "<!-- woco:task:a/b -->", "woco:task:x", "<!-- WOCO:task:x -->",
    ]) {
      expect(findMarker(bad)).toBeNull();
      expect(stripMarker(bad)).toBe(bad);
    }
    expect(findMarker("")).toBeNull();
  });

  test("first marker wins; strip removes all", () => {
    const t = `<!-- woco:task:a -->\n<!-- woco:task:b -->`;
    expect(findMarker(t)?.id).toBe("a");
    expect(stripMarker(t)).toBe("");
  });
});

describe("mergeFields", () => {
  const base = { title: "T", priority: "high", list: ["a"] };

  test("local-only, remote-only and identical changes merge cleanly", () => {
    const r = mergeFields(base, { ...base, title: "L" }, { ...base, priority: "low" });
    expect(r.merged).toEqual({ title: "L", priority: "low", list: ["a"] });
    expect(r.conflicts).toEqual([]);
    const same = mergeFields(base, { ...base, list: ["a", "b"] }, { ...base, list: ["a", "b"] });
    expect(same.conflicts).toEqual([]);
    expect(same.merged.list).toEqual(["a", "b"]);
  });

  test("both changed differently: local wins, conflict reports all three values", () => {
    const r = mergeFields(base, { ...base, title: "L", list: ["x"] }, { ...base, title: "R" });
    expect(r.merged.title).toBe("L");
    expect(r.conflicts).toEqual([{ field: "title", base: "T", local: "L", remote: "R" }]);
    expect(r.merged.list).toEqual(["x"]);
  });

  test("no base: every difference is a conflict, local wins", () => {
    const r = mergeFields(null, { a: 1, b: 2 }, { a: 1, b: 3 });
    expect(r.merged).toEqual({ a: 1, b: 2 });
    expect(r.conflicts).toEqual([{ field: "b", base: undefined, local: 2, remote: 3 }]);
  });

  test("key order does not matter and inputs are not mutated", () => {
    const local = { z: { b: 1, a: 2 }, y: 1 };
    const remote = { y: 1, z: { a: 2, b: 1 } };
    const snap = JSON.stringify(local);
    expect(mergeFields({ y: 1, z: { a: 2, b: 1 } }, local, remote).conflicts).toEqual([]);
    expect(JSON.stringify(local)).toBe(snap);
  });
});
