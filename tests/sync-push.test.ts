import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config";
import { addComment, getComment, setCommentGithubUrl } from "../src/lib/comments";
import { saveQuest } from "../src/lib/quest-store";
import { saveTaskToStore } from "../src/lib/task-store";
import { createGitHubClient, LABEL_CATALOG } from "../src/lib/sync/github-client";
import { readMapping, syncRoot } from "../src/lib/sync/mapping";
import { parseSyncRef, pushToGitHub, syncStatus } from "../src/lib/sync/push";
import type { Task } from "../src/lib/tasks";
import { startFakeGitHub, type FakeGitHub } from "./helpers/fake-github";
import { mkQuest, mkTask } from "./helpers/sync-fixtures";

let root: string;
let fake: FakeGitHub;
const writes = () => fake.requests.filter((r) => r.method !== "GET").length;
const client = () =>
  createGitHubClient({ token: "tok", repo: { owner: "acme", name: "widgets" }, apiUrl: fake.url, sleep: async () => {} });
const saveTask = (t: Task) => saveTaskToStore(root, loadConfig(root), t);

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-push-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
  fake = startFakeGitHub();
  saveTask(mkTask());
  saveQuest(root, mkQuest());
});
afterEach(() => {
  fake.stop();
  rmSync(root, { recursive: true, force: true });
});

describe("pushToGitHub", () => {
  test("creates issues with markers, labels and mappings", async () => {
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.errors).toEqual([]);
    expect(report.created.map((c) => c.ref).sort()).toEqual(["quest:q1", "t1"]);
    expect(fake.issues).toHaveLength(2);
    const ti = fake.issues.find((i) => i.title.startsWith("[t1]"))!;
    expect(ti.body).toContain("<!-- woco:task:t1 -->");
    expect(ti.labels.map((l) => l.name)).toEqual(expect.arrayContaining(["priority:high", "difficulty:medium"]));
    const m = readMapping(root, "task", "t1")!;
    expect(m.issue_number).toBe(ti.number);
    expect(m.local_hash).toBeTruthy();
    expect(readMapping(root, "quest", "q1")).not.toBeNull();
  });

  test("label bootstrap: catalog plus quest:<id>", async () => {
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    const names = fake.labels.map((l) => l.name);
    for (const l of LABEL_CATALOG) expect(names).toContain(l.name);
    expect(names).toContain("quest:q1");
    expect(report.labelsCreated).toContain("quest:q1");
    expect(fake.requests.findIndex((r) => r.path.endsWith("/labels") && r.method === "POST")).toBeLessThan(
      fake.requests.findIndex((r) => r.path.endsWith("/issues") && r.method === "POST"),
    );
  });

  test("second run is a no-op with zero write requests", async () => {
    await pushToGitHub({ projectRoot: root, client: client() });
    fake.requests.length = 0;
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(writes()).toBe(0);
    expect(report.created).toEqual([]);
    expect(report.updated).toEqual([]);
    expect(report.unchanged).toHaveLength(2);
    expect(report.labelsCreated).toEqual([]);
  });

  test("updates only items whose local hash changed", async () => {
    await pushToGitHub({ projectRoot: root, client: client() });
    saveTask(mkTask({ description: "Do it differently", status: "done" }));
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.errors).toEqual([]);
    expect(report.updated.map((u) => u.ref)).toEqual(["t1"]);
    expect(report.unchanged.map((u) => u.ref)).toEqual(["quest:q1"]);
    const ti = fake.issues.find((i) => i.title.startsWith("[t1]"))!;
    expect(ti.body).toContain("Do it differently");
    expect(ti.state).toBe("closed");
    // and again: no-op
    fake.requests.length = 0;
    await pushToGitHub({ projectRoot: root, client: client() });
    expect(writes()).toBe(0);
  });

  test("keeps labels woco does not manage when updating", async () => {
    await pushToGitHub({ projectRoot: root, client: client() });
    const ti = fake.issues.find((i) => i.title.startsWith("[t1]"))!;
    ti.labels.push({ name: "bug", color: "d73a4a", description: null });
    saveTask(mkTask({ priority: "low" }));
    await pushToGitHub({ projectRoot: root, client: client() });
    const names = ti.labels.map((l) => l.name);
    expect(names).toContain("bug");
    expect(names).toContain("priority:low");
    expect(names).not.toContain("priority:high");
  });

  test("mirrors comments chronologically once, recording ids and urls", async () => {
    const a = addComment(root, { kind: "task", id: "t1" }, { body: "first", author: "al", role: "human" });
    const b = addComment(root, { kind: "task", id: "t1" }, { body: "second", author: "bo", role: "agent" });
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.errors).toEqual([]);
    expect(report.commented.map((c) => c.comment)).toEqual([a.id, b.id]);
    expect(fake.comments.map((c) => c.body.includes("first"))).toEqual([true, false]);
    expect(fake.comments[0]!.body).toContain(`<!-- woco:comment:${a.id} -->`);
    const m = readMapping(root, "task", "t1")!;
    expect(Object.keys(m.comments).sort()).toEqual([a.id, b.id].sort());
    expect(getComment(root, a.id)!.github_url).toContain("#issuecomment-");
    fake.requests.length = 0;
    const again = await pushToGitHub({ projectRoot: root, client: client() });
    expect(writes()).toBe(0);
    expect(again.commented).toEqual([]);
  });

  test("a comment linked by url is not mirrored again", async () => {
    const c = addComment(root, { kind: "task", id: "t1" }, { body: "x", role: "human" });
    setCommentGithubUrl(root, c.id, "https://github.example/acme/widgets/issues/1#issuecomment-4242");
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.commented).toEqual([]);
    expect(fake.comments).toHaveLength(0);
    expect(readMapping(root, "task", "t1")!.comments[c.id]).toBe(4242);
  });

  test("dry run writes nothing anywhere", async () => {
    const c = addComment(root, { kind: "task", id: "t1" }, { body: "hello", role: "human" });
    const report = await pushToGitHub({ projectRoot: root, client: client(), dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(report.created.map((x) => x.ref).sort()).toEqual(["quest:q1", "t1"]);
    expect(report.commented.map((x) => x.comment)).toEqual([c.id]);
    expect(report.labelsCreated).toContain("needs-triage");
    expect(writes()).toBe(0);
    expect(existsSync(syncRoot(root))).toBe(false);
    expect(getComment(root, c.id)!.github_url).toBeUndefined();

    // dry run after a real push reports updates but still writes nothing
    await pushToGitHub({ projectRoot: root, client: client() });
    saveTask(mkTask({ title: "Renamed" }));
    fake.requests.length = 0;
    const dry = await pushToGitHub({ projectRoot: root, client: client(), dryRun: true });
    expect(dry.updated.map((u) => u.ref)).toEqual(["t1"]);
    expect(writes()).toBe(0);
    expect(fake.issues.find((i) => i.title.startsWith("[t1]"))!.title).toBe("[t1] Task one");
  });

  test("marker dedupe when the mapping file is missing", async () => {
    const c = addComment(root, { kind: "task", id: "t1" }, { body: "hello", role: "human" });
    await pushToGitHub({ projectRoot: root, client: client() });
    // simulate another clone: no mappings and no github_url on the comment
    rmSync(syncRoot(root), { recursive: true, force: true });
    const file = join(root, ".wombo-combo", "comments", "task", "t1", `${c.id}.yml`);
    writeFileSync(file, readFileSync(file, "utf-8").replace(/^github_url:.*\n/m, ""));
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.errors).toEqual([]);
    expect(report.created).toEqual([]);
    expect(fake.issues).toHaveLength(2);
    expect(fake.comments).toHaveLength(1);
    expect(report.commented).toEqual([]);
    expect(readMapping(root, "task", "t1")!.comments[c.id]).toBe(fake.comments[0]!.id);
    expect(getComment(root, c.id)!.github_url).toBe(fake.comments[0]!.html_url);
  });

  test("per-item errors are collected and the run continues", async () => {
    fake.inject({ method: "POST", path: "/repos/acme/widgets/issues", status: 422, times: 1 });
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.errors).toHaveLength(1);
    expect(report.created).toHaveLength(1);
    const failed = report.errors[0]!.ref;
    expect(readMapping(root, failed === "t1" ? "task" : "quest", failed === "t1" ? "t1" : "q1")).toBeNull();
    // next run retries only the failed item
    const retry = await pushToGitHub({ projectRoot: root, client: client() });
    expect(retry.errors).toEqual([]);
    expect(retry.created.map((c) => c.ref)).toEqual([failed]);
    expect(fake.issues).toHaveLength(2);
  });

  test("a failing comment does not block other items", async () => {
    addComment(root, { kind: "task", id: "t1" }, { body: "one", role: "human" });
    fake.inject({ method: "POST", path: /\/comments$/, status: 422, times: 1 });
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]!.ref).toContain("t1#");
    expect(report.created).toHaveLength(2);
    const retry = await pushToGitHub({ projectRoot: root, client: client() });
    expect(retry.commented).toHaveLength(1);
    expect(fake.comments).toHaveLength(1);
  });

  test("--only limits the push to one item", async () => {
    const report = await pushToGitHub({ projectRoot: root, client: client(), only: parseSyncRef("quest:q1") });
    expect(report.created.map((c) => c.ref)).toEqual(["quest:q1"]);
    expect(fake.issues).toHaveLength(1);
    const missing = await pushToGitHub({ projectRoot: root, client: client(), only: { kind: "task", id: "nope" } });
    expect(missing.errors[0]!.error).toContain("not found");
  });

  test("archived items are only pushed when already mapped", async () => {
    await pushToGitHub({ projectRoot: root, client: client() });
    const { saveTaskToArchive, removeTaskFromStore } = await import("../src/lib/task-store");
    saveTaskToArchive(root, loadConfig(root), mkTask({ status: "done" }));
    removeTaskFromStore(root, loadConfig(root), "t1");
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.updated.map((u) => u.ref)).toEqual(["t1"]);
    expect(fake.issues.find((i) => i.title.startsWith("[t1]"))!.state).toBe("closed");
  });
});

describe("syncStatus", () => {
  test("reports new, in-sync, local, remote changes and remote-only issues", async () => {
    const before = await syncStatus({ projectRoot: root, client: client() });
    expect(before.items.map((i) => i.state)).toEqual(["new", "new"]);
    expect(before.labelsMissing).toContain("quest:q1");

    await pushToGitHub({ projectRoot: root, client: client() });
    fake.requests.length = 0;
    let st = await syncStatus({ projectRoot: root, client: client() });
    expect(st.items.every((i) => i.state === "in-sync")).toBe(true);
    expect(st.labelsMissing).toEqual([]);
    expect(writes()).toBe(0);

    saveTask(mkTask({ description: "local edit" }));
    const qi = fake.issues.find((i) => i.title.startsWith("[q1]"))!;
    qi.body = qi.body!.replace("Goal", "Remote goal");
    fake.seedIssue({ title: "Stranger", body: "no marker" });
    saveTask(mkTask({ id: "t2", title: "New one" }));
    st = await syncStatus({ projectRoot: root, client: client() });
    const state = Object.fromEntries(st.items.map((i) => [i.ref, i.state]));
    expect(state).toEqual({ t1: "local-changed", t2: "new", "quest:q1": "remote-changed" });
    expect(st.remoteOnly.map((r) => r.title)).toEqual(["Stranger"]);
    expect(writes()).toBe(0);
  });

  test("counts pending comments", async () => {
    addComment(root, { kind: "task", id: "t1" }, { body: "p", role: "human" });
    const st = await syncStatus({ projectRoot: root, client: client() });
    expect(st.items.find((i) => i.ref === "t1")!.pendingComments).toBe(1);
  });
});

describe("finished work (includeFinished)", () => {
  const setInclude = (v: boolean) =>
    writeFileSync(join(root, ".wombo-combo", "config.json"), JSON.stringify({ sync: { github: { includeFinished: v } } }));

  test("unmapped done/cancelled tasks and completed/abandoned quests are not created", async () => {
    saveTask(mkTask({ id: "t-done", status: "done" }));
    saveTask(mkTask({ id: "t-can", status: "cancelled" }));
    saveQuest(root, mkQuest({ id: "q-done", status: "completed" }));
    saveQuest(root, mkQuest({ id: "q-ab", status: "abandoned" }));
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.errors).toEqual([]);
    expect(report.created.map((c) => c.ref).sort()).toEqual(["quest:q1", "t1"]);
    const skipped = report.unchanged.filter((u) => u.reason === "finished").map((u) => u.ref).sort();
    expect(skipped).toEqual(["quest:q-ab", "quest:q-done", "t-can", "t-done"]);
    expect(fake.issues).toHaveLength(2);
    expect(readMapping(root, "task", "t-done")).toBeNull();
  });

  test("quest labels are created only for quests with items being pushed", async () => {
    saveQuest(root, mkQuest({ id: "q-done", status: "completed" }));
    saveTask(mkTask({ id: "t-old", status: "done", quest: "q-done" }));
    saveTask(mkTask({ id: "t-new", quest: "q1" }));
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    const questLabels = report.labelsCreated.filter((l) => l.startsWith("quest:"));
    expect(questLabels).toEqual(["quest:q1"]);
    expect(fake.labels.some((l) => l.name === "quest:q-done")).toBe(false);
  });

  test("an already mapped item still gets closed", async () => {
    await pushToGitHub({ projectRoot: root, client: client() });
    saveTask(mkTask({ status: "done" }));
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.updated.map((u) => u.ref)).toEqual(["t1"]);
    expect(fake.issues.find((i) => i.title.startsWith("[t1]"))!.state).toBe("closed");
  });

  test("includeFinished true creates finished items", async () => {
    setInclude(true);
    saveTask(mkTask({ id: "t-done", status: "done" }));
    saveQuest(root, mkQuest({ id: "q-done", status: "completed" }));
    const report = await pushToGitHub({ projectRoot: root, client: client() });
    expect(report.created.map((c) => c.ref).sort()).toEqual(["quest:q-done", "quest:q1", "t-done", "t1"]);
    expect(report.unchanged.filter((u) => u.reason === "finished")).toEqual([]);
  });

  test("syncStatus omits unmapped finished items unless included", async () => {
    saveTask(mkTask({ id: "t-done", status: "done" }));
    saveQuest(root, mkQuest({ id: "q-done", status: "abandoned" }));
    const st = await syncStatus({ projectRoot: root, client: client() });
    expect(st.items.map((i) => i.ref).sort()).toEqual(["quest:q1", "t1"]);
    setInclude(true);
    const st2 = await syncStatus({ projectRoot: root, client: client() });
    expect(st2.items.filter((i) => i.state === "new").map((i) => i.ref).sort()).toEqual(["quest:q-done", "quest:q1", "t-done", "t1"]);
  });
});
