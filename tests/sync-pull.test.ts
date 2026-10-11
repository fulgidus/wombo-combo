import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG } from "../src/config";
import { addComment, listComments } from "../src/lib/comments";
import { createBlankQuest } from "../src/lib/quest";
import { saveQuest } from "../src/lib/quest-store";
import { createBlankTask, loadArchive, loadFeatures, loadTasks, saveTaskToArchive, saveTaskToStore } from "../src/lib/tasks";
import { validateTask, type SchemaIssue } from "../src/lib/task-schema";
import { createGitHubClient } from "../src/lib/sync/github-client";
import { hashFields, hashTask, readMapping, writeMapping, listMappings } from "../src/lib/sync/mapping";
import { pullFromGitHub } from "../src/lib/sync/pull";
import { renderCommentBody, renderTaskIssue, renderQuestIssue, taskSyncable } from "../src/lib/sync/render";
import { startFakeGitHub, type FakeGitHub } from "./helpers/fake-github";

let fake: FakeGitHub;
const roots: string[] = [];
const mkRoot = () => {
  const r = mkdtempSync(join(tmpdir(), "sync-pull-"));
  roots.push(r);
  return r;
};
const mkClient = () =>
  createGitHubClient({ token: "tok", repo: { owner: fake.owner, name: fake.repo }, apiUrl: fake.url, sleep: async () => {} });
const pull = (root: string, extra: Record<string, unknown> = {}) =>
  pullFromGitHub({ projectRoot: root, client: mkClient(), ...extra });
const tasksOf = (root: string) => loadTasks(root, DEFAULT_CONFIG).tasks;
const getTask = (root: string, id: string) => tasksOf(root).find((t) => t.id === id)!;

/** Seed the fake issue for a task the way push would, and map it. */
function pushLike(root: string, id: string) {
  const t = getTask(root, id);
  const d = renderTaskIssue(t);
  const issue = fake.seedIssue({ title: d.title, body: d.body, labels: d.labels, state: d.state, state_reason: d.stateReason });
  writeMapping(root, "task", id, {
    issue_number: issue.number, issue_url: issue.html_url, remote_updated_at: issue.updated_at,
    local_hash: hashTask(t), remote_hash: hashFields(taskSyncable(t)), last_synced_at: "t", comments: {},
  });
  return issue;
}

beforeEach(() => {
  fake = startFakeGitHub({ token: "tok" });
});
afterEach(() => {
  fake.stop();
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe("new issues", () => {
  test("unmarked issues become backlog tasks; idempotent; mapping written", async () => {
    const root = mkRoot();
    fake.seedIssue({ title: "Add dark mode", body: "Please add it.\n\n## Constraints\n- keep it small", labels: ["priority:high", "difficulty:easy"] });
    const r = await pull(root);
    expect(r.tasksCreated).toEqual(["gh-1-add-dark-mode"]);
    const t = getTask(root, "gh-1-add-dark-mode");
    expect(t.status).toBe("backlog");
    expect(t.description).toBe("Please add it.");
    expect(t.constraints).toEqual(["keep it small"]);
    expect(t.priority).toBe("high");
    expect(t.difficulty).toBe("easy");
    expect(t.notes).toContain("triage: needs-triage");
    expect(t.notes).toContain("github: #1");
    expect(readMapping(root, "task", t.id)?.issue_number).toBe(1);
    const again = await pull(root);
    expect(again.tasksCreated).toEqual([]);
    expect(again.tasksUpdated).toEqual([]);
    expect(tasksOf(root)).toHaveLength(1);
  });

  test("id collision gets a suffix; pulled tasks pass the task validator", async () => {
    const root = mkRoot();
    saveTaskToStore(root, DEFAULT_CONFIG, createBlankTask("gh-1-fix-bug", "Local fix"));
    fake.seedIssue({ title: "Fix bug", body: "x" });
    const r = await pull(root);
    expect(r.tasksCreated).toEqual(["gh-1-fix-bug-2"]);
    expect(getTask(root, "gh-1-fix-bug").title).toBe("Local fix");
    const sink: SchemaIssue[] = [];
    const data = loadFeatures(root, DEFAULT_CONFIG, sink);
    expect(sink.filter((i) => i.level === "error")).toEqual([]);
    for (const t of data.tasks) expect(validateTask(t).filter((i) => i.level === "error")).toEqual([]);
  });

  test("dry run writes nothing", async () => {
    const root = mkRoot();
    fake.seedIssue({ title: "Dry", body: "b" });
    fake.seedComment(1, "hello");
    const r = await pull(root, { dryRun: true });
    expect(r.tasksCreated).toEqual(["gh-1-dry"]);
    expect(r.commentsAdded).toHaveLength(1);
    expect(tasksOf(root)).toHaveLength(0);
    expect(existsSync(join(root, ".wombo-combo", "sync"))).toBe(false);
  });

  test("spec issue without quest marker is skipped", async () => {
    const root = mkRoot();
    fake.seedIssue({ title: "Spec", body: "x", labels: ["spec"] });
    const r = await pull(root);
    expect(r.skipped).toHaveLength(1);
    expect(tasksOf(root)).toHaveLength(0);
  });
});

describe("comments", () => {
  test("foreign comments become human woco comments, idempotently", async () => {
    const root = mkRoot();
    fake.seedIssue({ title: "Talk", body: "b" });
    const gc = fake.seedComment(1, "Looks good", { user: { login: "octocat" } });
    const r = await pull(root);
    expect(r.commentsAdded).toHaveLength(1);
    const cs = listComments(root, { kind: "task", id: "gh-1-talk" });
    expect(cs).toHaveLength(1);
    expect(cs[0]!.author).toBe("octocat");
    expect(cs[0]!.role).toBe("human");
    expect(cs[0]!.github_url).toBe(gc.html_url);
    const r2 = await pull(root);
    expect(r2.commentsAdded).toEqual([]);
    expect(listComments(root, { kind: "task", id: "gh-1-talk" })).toHaveLength(1);
  });

  test("lost mapping does not duplicate (github_url dedupe); woco-marked comments are not re-imported", async () => {
    const root = mkRoot();
    saveTaskToStore(root, DEFAULT_CONFIG, createBlankTask("t1", "T one"));
    const issue = pushLike(root, "t1");
    const mine = addComment(root, { kind: "task", id: "t1" }, { body: "from woco", author: "me", role: "agent" });
    fake.seedComment(issue.number, renderCommentBody(mine));
    fake.seedComment(issue.number, "foreign", { user: { login: "bob" } });
    await pull(root);
    expect(listComments(root, { kind: "task", id: "t1" })).toHaveLength(2);
    const m = readMapping(root, "task", "t1")!;
    expect(m.comments[mine.id]).toBeGreaterThan(0);
    // drop comment mapping, pull again
    writeMapping(root, "task", "t1", { ...m, comments: {} });
    await pull(root);
    expect(listComments(root, { kind: "task", id: "t1" })).toHaveLength(2);
  });

  test("woco comment marker for a comment not present locally is skipped, not imported", async () => {
    const root = mkRoot();
    saveTaskToStore(root, DEFAULT_CONFIG, createBlankTask("t1", "T one"));
    const issue = pushLike(root, "t1");
    fake.seedComment(issue.number, renderCommentBody({ id: "remote-only", author: "x", role: "agent", body: "yo" }));
    const r = await pull(root);
    expect(r.commentsAdded).toEqual([]);
    expect(listComments(root, { kind: "task", id: "t1" })).toHaveLength(0);
  });

  test("quest spec issues pull comments only", async () => {
    const root = mkRoot();
    saveQuest(root, createBlankQuest("q1", "Quest", "the goal", "main"));
    const d = renderQuestIssue(createBlankQuest("q1", "Quest", "the goal", "main"));
    const issue = fake.seedIssue({ title: d.title, body: d.body, labels: d.labels });
    fake.seedComment(issue.number, "quest chatter", { user: { login: "ann" } });
    // remote edit must not touch the quest
    const before = readFileSync(join(root, ".wombo-combo", "quests", "q1.yml"), "utf-8");
    issue.title = "[q1] Renamed";
    issue.state = "closed";
    const r = await pull(root);
    expect(r.commentsAdded).toHaveLength(1);
    expect(listComments(root, { kind: "quest", id: "q1" })[0]!.author).toBe("ann");
    expect(readFileSync(join(root, ".wombo-combo", "quests", "q1.yml"), "utf-8")).toBe(before);
    expect(tasksOf(root)).toHaveLength(0);
    expect(readMapping(root, "quest", "q1")?.issue_number).toBe(issue.number);
  });
});

/** Create a task, push-like seed, with correct base hashes from the fake's own view. */
async function syncedTask(root: string, over: Partial<ReturnType<typeof createBlankTask>> = {}) {
  saveTaskToStore(root, DEFAULT_CONFIG, { ...createBlankTask("t1", "Title", "Desc"), ...over });
  const issue = pushLike(root, "t1");
  await pull(root); // establishes remote_hash from the real parse
  return issue;
}

describe("state and field changes", () => {
  test("close maps to done / cancelled, reopen back to backlog", async () => {
    const root = mkRoot();
    const issue = await syncedTask(root);
    issue.state = "closed"; issue.state_reason = "completed";
    let r = await pull(root);
    expect(r.statusChanged).toEqual([{ ref: "t1", from: "backlog", to: "done" }]);
    expect(getTask(root, "t1").status).toBe("done");
    expect(getTask(root, "t1").completion).toBe(100);
    issue.state = "open"; issue.state_reason = null;
    r = await pull(root);
    expect(r.statusChanged).toEqual([{ ref: "t1", from: "done", to: "backlog" }]);
    issue.state = "closed"; issue.state_reason = "not_planned";
    await pull(root);
    expect(getTask(root, "t1").status).toBe("cancelled");
  });

  test("open issue never downgrades an in-progress task", async () => {
    const root = mkRoot();
    const issue = await syncedTask(root, { status: "in_progress" });
    issue.title = "[t1] New title";
    await pull(root);
    const t = getTask(root, "t1");
    expect(t.status).toBe("in_progress");
    expect(t.title).toBe("New title");
  });

  test("only-remote edits of title/body/labels are applied", async () => {
    const root = mkRoot();
    const issue = await syncedTask(root);
    issue.title = "[t1] Better title";
    issue.body = "New description\n\n<!-- woco:task:t1 -->";
    issue.labels = [{ name: "priority:critical", color: "x", description: null }, { name: "difficulty:hard", color: "x", description: null }];
    const r = await pull(root);
    expect(r.tasksUpdated).toEqual(["t1"]);
    const t = getTask(root, "t1");
    expect([t.title, t.description, t.priority, t.difficulty]).toEqual(["Better title", "New description", "critical", "hard"]);
    expect(r.conflicts).toEqual([]);
  });

  test("both changed: local wins, conflict reported, system comment + remote notice, no repeat", async () => {
    const root = mkRoot();
    const issue = await syncedTask(root);
    const t = getTask(root, "t1");
    saveTaskToStore(root, DEFAULT_CONFIG, { ...t, title: "Local title" });
    issue.title = "[t1] Remote title";
    const r = await pull(root);
    expect(r.conflicts).toEqual([{ ref: "t1", fields: ["title"] }]);
    expect(getTask(root, "t1").title).toBe("Local title");
    const sys = listComments(root, { kind: "task", id: "t1" }).filter((c) => c.role === "system");
    expect(sys).toHaveLength(1);
    expect(sys[0]!.author).toBe("woco");
    expect(sys[0]!.body).toContain("Remote title");
    expect(r.pendingRemoteNotices).toHaveLength(1);
    expect(r.pendingRemoteNotices[0]!.issue).toBe(issue.number);
    // pull never writes to GitHub
    expect(fake.requests.filter((q) => q.method !== "GET")).toEqual([]);
    // local hash stays stale so push still sends local; no repeated conflict
    const again = await pull(root);
    expect(again.conflicts).toEqual([]);
    expect(listComments(root, { kind: "task", id: "t1" }).filter((c) => c.role === "system")).toHaveLength(1);
    expect(readMapping(root, "task", "t1")!.local_hash).not.toBe(hashTask(getTask(root, "t1")));
  });

  test("archived task closed remotely stays archived; reopened moves back to tasks", async () => {
    const root = mkRoot();
    const issue = await syncedTask(root, { status: "done", completion: 100 });
    // done locally + open remotely first reconcile: treat as local change; archive it
    const t = getTask(root, "t1");
    // simulate archive
    saveTaskToArchive(root, DEFAULT_CONFIG, t);
    rmSync(join(root, ".wombo-combo", "tasks", "t1.yml"));
    const m = readMapping(root, "task", "t1")!;
    writeMapping(root, "task", "t1", { ...m, local_hash: hashTask(t) });
    issue.state = "closed"; issue.state_reason = "completed";
    issue.body = (issue.body ?? "");
    await pull(root);
    expect(loadArchive(root, DEFAULT_CONFIG).tasks.map((x) => x.id)).toContain("t1");
  });
});

describe("resilience", () => {
  test("deleted issue is skipped, mapping and task kept", async () => {
    const root = mkRoot();
    await syncedTask(root);
    fake.issues.length = 0;
    const r = await pull(root);
    expect(r.skipped.some((s) => s.ref === "t1")).toBe(true);
    expect(getTask(root, "t1")).toBeDefined();
    expect(readMapping(root, "task", "t1")).not.toBeNull();
  });

  test("marker for a task that does not exist locally: skipped, no duplicate task", async () => {
    const root = mkRoot();
    fake.seedIssue({ title: "[zzz] Elsewhere", body: "x\n\n<!-- woco:task:zzz -->" });
    const r = await pull(root);
    expect(r.skipped).toHaveLength(1);
    expect(tasksOf(root)).toHaveLength(0);
  });

  test("rate limit stops gracefully with a partial report", async () => {
    const root = mkRoot();
    fake.seedIssue({ title: "One", body: "b" });
    fake.seedIssue({ title: "Two", body: "b" });
    fake.inject({ method: "GET", path: /\/issues\/1\/comments$/, status: 429, headers: { "retry-after": "1" }, times: Infinity });
    const r = await pull(root);
    expect(r.rateLimited).toBe(true);
    expect(r.tasksCreated).toEqual(["gh-1-one"]);
    expect(tasksOf(root).length).toBeLessThanOrEqual(2);
    fake.clearInjections();
    const r2 = await pull(root);
    expect(r2.rateLimited).toBe(false);
    expect(tasksOf(root).map((t) => t.id).sort()).toEqual(["gh-1-one", "gh-2-two"]);
  });

  test("rate limited issue listing returns an empty partial report", async () => {
    const root = mkRoot();
    fake.inject({ method: "GET", path: /\/issues$/, status: 429, headers: { "retry-after": "1" }, times: Infinity });
    const r = await pull(root);
    expect(r.rateLimited).toBe(true);
  });
});

describe("concurrent clients", () => {
  test("two clients converge without duplicate tasks or comments", async () => {
    const a = mkRoot();
    const b = mkRoot();
    // A and B share a woco task t1 (as via git) already pushed to GitHub
    for (const r of [a, b]) saveTaskToStore(r, DEFAULT_CONFIG, createBlankTask("t1", "Shared", "d"));
    const t = getTask(a, "t1");
    const d = renderTaskIssue(t);
    fake.seedIssue({ title: d.title, body: d.body, labels: d.labels });
    // a human creates an issue and comments
    fake.seedIssue({ title: "Human issue", body: "hi" });
    fake.seedComment(2, "human comment", { user: { login: "ann" } });
    // pull interleaved + repeated
    await Promise.all([pull(a), pull(b)]);
    await Promise.all([pull(a), pull(b)]);
    fake.seedComment(2, "second", { user: { login: "ann" } });
    await pull(a);
    await pull(b);
    await pull(a);
    for (const r of [a, b]) {
      expect(tasksOf(r).map((x) => x.id).sort()).toEqual(["gh-2-human-issue", "t1"]);
      expect(listComments(r, { kind: "task", id: "gh-2-human-issue" }).map((c) => c.body)).toEqual(["human comment", "second"]);
      expect(listMappings(r, "task")).toHaveLength(2);
      expect(listComments(r, { kind: "task", id: "t1" }).filter((c) => c.role === "system")).toEqual([]);
    }
    expect(readdirSync(join(a, ".wombo-combo", "tasks")).filter((f) => f.endsWith(".yml") && f !== "_meta.yml")).toHaveLength(2);
  });
});
