import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { rmSync } from "node:fs";
import { DEFAULT_CONFIG } from "../src/config";
import { createBlankTask, loadTasks, saveTaskToStore } from "../src/lib/tasks";
import { addComment, listComments } from "../src/lib/comments";
import {
  TRIAGE_STATES, TRIAGE_CATEGORIES, getTriage, canTransition, transition, listTriageQueue, TriageError,
} from "../src/lib/triage";
import { applyTriageCategory, parseTriageCategory, parseAllTriageRoles } from "../src/lib/sync/syncable";
import { makeRepo } from "./helpers/git-repo";

let repo: string;
const reload = (id: string) => loadTasks(repo, DEFAULT_CONFIG).tasks.find((t) => t.id === id)!;
function add(id: string, notes: string[] = [], status?: string) {
  const t = createBlankTask(id, id);
  t.notes = notes;
  if (status) t.status = status as any;
  saveTaskToStore(repo, DEFAULT_CONFIG, t);
}

beforeEach(() => { repo = makeRepo(); });
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe("constants and note helpers", () => {
  test("states and categories", () => {
    expect([...TRIAGE_STATES]).toEqual(["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"]);
    expect([...TRIAGE_CATEGORIES]).toEqual(["bug", "enhancement"]);
  });
  test("category helpers keep other notes", () => {
    const n = applyTriageCategory(["keep", "category: bug"], "enhancement");
    expect(n).toEqual(["keep", "category: enhancement"]);
    expect(parseTriageCategory(n)).toBe("enhancement");
    expect(parseAllTriageRoles(["triage: a", "x", "triage: b"])).toEqual(["a", "b"]);
  });
});

describe("getTriage", () => {
  test("untriaged", () => {
    expect(getTriage({ notes: ["hi"] })).toEqual({ state: null, category: null, issues: [] });
  });
  test("valid", () => {
    expect(getTriage({ notes: ["triage: needs-info", "category: bug"] })).toEqual({ state: "needs-info", category: "bug", issues: [] });
  });
  test("reports unknown and conflicting values without fixing", () => {
    const r = getTriage({ notes: ["triage: nope", "category: chore"] });
    expect(r.state).toBeNull();
    expect(r.category).toBeNull();
    expect(r.issues.length).toBe(2);
    const c = getTriage({ notes: ["triage: wontfix", "triage: needs-info", "category: bug", "category: enhancement"] });
    expect(c.issues.length).toBe(2);
    expect(c.state).toBeNull();
    expect(c.category).toBeNull();
  });
   test("repeated identical lines are reported too", () => {
    expect(getTriage({ notes: ["triage: wontfix", "triage: wontfix"] }).issues.length).toBe(1);
  });
});

describe("canTransition", () => {
  test("rules", () => {
    expect(canTransition(null, "needs-triage")).toBe(true);
    expect(canTransition(null, "wontfix")).toBe(false);
    for (const to of ["needs-info", "ready-for-agent", "ready-for-human", "wontfix"] as const) {
      expect(canTransition("needs-triage", to)).toBe(true);
    }
    expect(canTransition("needs-info", "needs-triage")).toBe(true);
    expect(canTransition("needs-info", "ready-for-agent")).toBe(false);
    expect(canTransition("ready-for-agent", "ready-for-human")).toBe(true);
    expect(canTransition("ready-for-human", "needs-triage")).toBe(true);
    expect(canTransition("wontfix", "needs-triage")).toBe(false);
    expect(canTransition("wontfix", "needs-triage", { reopen: true })).toBe(true);
    expect(canTransition("wontfix", "ready-for-agent", { reopen: true })).toBe(false);
    expect(canTransition("needs-triage", "needs-triage")).toBe(false);
  });
});

describe("transition", () => {
  test("untriaged -> needs-triage keeps notes, no category needed", () => {
    add("a", ["keep me"]);
    const r = transition(repo, "a", "needs-triage", { author: "me" });
    expect(r.from).toBeNull();
    expect(reload("a").notes).toEqual(["keep me", "triage: needs-triage"]);
    const cs = listComments(repo, { kind: "task", id: "a" });
    expect(cs.length).toBe(1);
    expect(cs[0]!.role).toBe("system");
    expect(cs[0]!.author).toBe("me");
    expect(cs[0]!.body).toContain("needs-triage");
  });
  test("replaces the single state line and sets category", () => {
    add("a", ["x", "triage: needs-triage"]);
    transition(repo, "a", "ready-for-agent", { category: "bug", comment: "brief here" });
    const t = reload("a");
    expect(t.notes).toEqual(["x", "triage: ready-for-agent", "category: bug"]);
    const body = listComments(repo, { kind: "task", id: "a" })[0]!.body;
    expect(body).toContain("needs-triage");
    expect(body).toContain("ready-for-agent");
    expect(body).toContain("brief here");
  });
  test("requires a category for non needs-triage targets", () => {
    add("a", ["triage: needs-triage"]);
    expect(() => transition(repo, "a", "needs-info")).toThrow(/category/);
    expect(reload("a").notes).toEqual(["triage: needs-triage"]);
  });
  test("existing category is reused; provided category replaces it", () => {
    add("a", ["triage: needs-triage", "category: bug"]);
    transition(repo, "a", "needs-info");
    expect(parseTriageCategory(reload("a").notes)).toBe("bug");
    transition(repo, "a", "needs-triage", { category: "enhancement" });
    expect(reload("a").notes.filter((n) => n.startsWith("category:"))).toEqual(["category: enhancement"]);
  });
  test("invalid transition rejected, nothing written", () => {
    add("a", ["triage: needs-info", "category: bug"]);
    expect(() => transition(repo, "a", "ready-for-agent")).toThrow(TriageError);
    expect(reload("a").notes).toEqual(["triage: needs-info", "category: bug"]);
    expect(listComments(repo, { kind: "task", id: "a" })).toEqual([]);
  });
  test("force overrides the table", () => {
    add("a", ["triage: needs-info", "category: bug"]);
    transition(repo, "a", "ready-for-agent", { force: true });
    expect(getTriage(reload("a")).state).toBe("ready-for-agent");
  });
  test("unknown values and conflicts are refused", () => {
    add("a", ["triage: bogus"]);
    expect(() => transition(repo, "a", "needs-triage")).toThrow(/bogus/);
    add("b", ["triage: wontfix", "triage: needs-info"]);
    expect(() => transition(repo, "b", "needs-triage")).toThrow(TriageError);
    expect(reload("b").notes).toEqual(["triage: wontfix", "triage: needs-info"]);
    expect(() => transition(repo, "a", "nope" as any)).toThrow(/unknown/i);
    expect(() => transition(repo, "a", "needs-triage", { category: "chore" as any, force: true })).toThrow(/category/);
  });
  test("missing task", () => {
    expect(() => transition(repo, "zzz", "needs-triage")).toThrow(/not found/);
  });
  test("wontfix cancels the task; reopen restores backlog", () => {
    add("a", ["triage: needs-triage"]);
    transition(repo, "a", "wontfix", { category: "bug" });
    expect(reload("a").status).toBe("cancelled");
    expect(() => transition(repo, "a", "needs-triage")).toThrow(TriageError);
    transition(repo, "a", "needs-triage", { reopen: true });
    expect(reload("a").status).toBe("backlog");
    expect(getTriage(reload("a")).state).toBe("needs-triage");
  });
});

describe("listTriageQueue", () => {
  test("buckets, oldest first, skips finished and reports problems", () => {
    add("n2", ["triage: needs-triage"]);
    add("n1", ["triage: needs-triage"]);
    add("ra", ["triage: ready-for-agent", "category: bug"]);
    add("rh", ["triage: ready-for-human", "category: bug"]);
    add("fin", ["triage: ready-for-agent", "category: bug"], "done");
    add("bad", ["triage: zzz"]);
    add("plain");
    // give n1 an older transition than n2
    transition(repo, "n1", "needs-triage", { force: true });
        transition(repo, "n2", "needs-triage", { force: true });
    const q = listTriageQueue(repo);
    expect(q.needsTriage.map((e) => e.task.id)).toEqual(["n1", "n2"]);
    expect(q.readyForAgent.map((e) => e.task.id)).toEqual(["ra"]);
    expect(q.readyForHuman.map((e) => e.task.id)).toEqual(["rh"]);
    expect(q.needsInfoWithNewComments).toEqual([]);
    expect(q.problems.map((p) => p.id)).toEqual(["bad"]);
  });
  test("needs-info appears only with non-system comments after the last transition", () => {
    add("i", ["triage: needs-triage", "category: bug"]);
    transition(repo, "i", "needs-info");
    expect(listTriageQueue(repo).needsInfoWithNewComments).toEqual([]);
    addComment(repo, { kind: "task", id: "i" }, { body: "reporter reply", author: "rep", role: "human" });
    const q = listTriageQueue(repo);
    expect(q.needsInfoWithNewComments.map((e) => e.task.id)).toEqual(["i"]);
    expect(q.needsInfoWithNewComments[0]!.newComments.map((c) => c.body)).toEqual(["reporter reply"]);
    transition(repo, "i", "needs-triage");
    expect(listTriageQueue(repo).needsInfoWithNewComments).toEqual([]);
    expect(listTriageQueue(repo).needsTriage.map((e) => e.task.id)).toEqual(["i"]);
  });
});
