import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config";
import { saveQuest } from "../src/lib/quest-store";
import { loadTasks } from "../src/lib/tasks";
import { saveTaskToStore } from "../src/lib/task-store";
import { createGitHubClient } from "../src/lib/sync/github-client";
import { readMapping } from "../src/lib/sync/mapping";
import { pullFromGitHub } from "../src/lib/sync/pull";
import { pushToGitHub, syncStatus } from "../src/lib/sync/push";
import type { Task } from "../src/lib/tasks";
import { startFakeGitHub, type FakeGitHub } from "./helpers/fake-github";
import { mkQuest, mkTask } from "./helpers/sync-fixtures";

let root: string;
let fake: FakeGitHub;
const client = () =>
  createGitHubClient({ token: "tok", repo: { owner: "acme", name: "widgets" }, apiUrl: fake.url, sleep: async () => {} });
const writes = () => fake.requests.filter((r) => r.method !== "GET").length;
const push = () => pushToGitHub({ projectRoot: root, client: client() });
const pull = () => pullFromGitHub({ projectRoot: root, client: client() });
const tasks = () => loadTasks(root, loadConfig(root)).tasks;
const saveTask = (t: Task) => saveTaskToStore(root, loadConfig(root), t);
const noChanges = (r: Awaited<ReturnType<typeof pull>>) => {
  expect(r.tasksCreated).toEqual([]);
  expect(r.tasksUpdated).toEqual([]);
  expect(r.statusChanged).toEqual([]);
  expect(r.commentsAdded).toEqual([]);
  expect(r.conflicts).toEqual([]);
  expect(r.pendingRemoteNotices).toEqual([]);
  expect(r.errors).toEqual([]);
};
const statuses = async () => (await syncStatus({ projectRoot: root, client: client() })).items.map((i) => `${i.ref}:${i.state}`);

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-rt-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
  fake = startFakeGitHub();
});
afterEach(() => {
  fake.stop();
  rmSync(root, { recursive: true, force: true });
});

describe("hash round trip", () => {
  test("push then pull: zero changes, no conflicts, status in-sync (custom triage role)", async () => {
    saveTask(mkTask({ notes: ["triage: ready-for-qa"] }));
    saveTask(mkTask({ id: "t2", title: "Second", quest: "q1", depends_on: ["t1"] }));
    saveQuest(root, mkQuest());
    expect((await push()).errors).toEqual([]);
    const before = readMapping(root, "task", "t1")!;
    noChanges(await pull());
    expect(readMapping(root, "task", "t1")!.remote_hash).toBe(before.remote_hash);
    expect(tasks().find((t) => t.id === "t1")!.notes).toContain("triage: ready-for-qa");
    expect(await statuses()).toEqual(["quest:q1:in-sync", "t1:in-sync", "t2:in-sync"]);
  });

  test("pull of a new issue then push is a no-op (zero non-GET requests)", async () => {
    fake.seedIssue({ title: "Add dark mode", body: "Please.\n\n## Constraints\n- small", labels: ["priority:high"] });
    const r = await pull();
    expect(r.tasksCreated).toHaveLength(1);
    expect(await statuses()).toEqual(["gh-1-add-dark-mode:in-sync"]);
    fake.requests.length = 0;
    const p = await push();
    expect(p.errors).toEqual([]);
    expect(p.unchanged).toHaveLength(1);
    expect(fake.requests.filter((q) => q.method !== "GET" && !q.path.endsWith("/labels"))).toEqual([]);
    noChanges(await pull());
  });

  test("edit on GitHub, pull, push converges", async () => {
    saveTask(mkTask());
    await push();
    const issue = fake.issues[0]!;
    issue.title = "[t1] Renamed on GitHub";
    issue.labels = issue.labels.filter((l) => !l.name.startsWith("priority:")).concat({ name: "priority:low", color: "ededed", description: null });
    const r = await pull();
    expect(r.tasksUpdated).toEqual(["t1"]);
    expect(r.conflicts).toEqual([]);
    const t = tasks().find((x) => x.id === "t1")!;
    expect(t.title).toBe("Renamed on GitHub");
    expect(t.priority).toBe("low");
    fake.requests.length = 0;
    const p = await push();
    expect(p.updated).toEqual([]);
    expect(fake.requests.filter((q) => q.method !== "GET")).toEqual([]);
    noChanges(await pull());
    expect(await statuses()).toEqual(["t1:in-sync"]);
  });

  test("edit locally, push, pull converges", async () => {
    saveTask(mkTask());
    await push();
    saveTask(mkTask({ title: "Local rename", priority: "low", status: "done" }));
    const p = await push();
    expect(p.updated.map((u) => u.ref)).toEqual(["t1"]);
    expect(fake.issues[0]!.state).toBe("closed");
    noChanges(await pull());
    fake.requests.length = 0;
    expect((await push()).updated).toEqual([]);
    expect(writes()).toBe(0);
    expect(await statuses()).toEqual(["t1:in-sync"]);
  });
});
