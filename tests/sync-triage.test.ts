import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config";
import { listComments } from "../src/lib/comments";
import { getTriage, transition } from "../src/lib/triage";
import { loadTasks } from "../src/lib/tasks";
import { saveTaskToStore } from "../src/lib/task-store";
import { LABEL_CATALOG, createGitHubClient } from "../src/lib/sync/github-client";
import { readMapping } from "../src/lib/sync/mapping";
import { pullFromGitHub } from "../src/lib/sync/pull";
import { pushToGitHub } from "../src/lib/sync/push";
import type { Task } from "../src/lib/tasks";
import { startFakeGitHub, type FakeGitHub } from "./helpers/fake-github";
import { mkTask } from "./helpers/sync-fixtures";

let root: string;
let fake: FakeGitHub;
const client = () =>
  createGitHubClient({ token: "tok", repo: { owner: "acme", name: "widgets" }, apiUrl: fake.url, sleep: async () => {} });
const push = () => pushToGitHub({ projectRoot: root, client: client() });
const pull = () => pullFromGitHub({ projectRoot: root, client: client() });
const tasks = () => loadTasks(root, loadConfig(root)).tasks;
const task = (id = "t1") => tasks().find((t) => t.id === id)!;
const saveTask = (t: Task) => saveTaskToStore(root, loadConfig(root), t);
const STATES = ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"];
const stateLabels = (i = 0) => fake.issues[i]!.labels.map((l) => l.name).filter((n) => STATES.includes(n));
const setLabels = (i: number, names: string[]) => {
  fake.issues[i]!.labels = names.map((name) => ({ name, color: "ededed", description: null }));
};
const relabel = (i: number, remove: string[], add: string[]) =>
  setLabels(i, [...fake.issues[i]!.labels.map((l) => l.name).filter((n) => !remove.includes(n)), ...add]);
const nonGetWrites = () => fake.requests.filter((r) => r.method !== "GET");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-triage-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
  fake = startFakeGitHub();
});
afterEach(() => {
  fake.stop();
  rmSync(root, { recursive: true, force: true });
});

describe("labels", () => {
  test("catalog has the category labels", () => {
    const names = LABEL_CATALOG.map((l) => l.name);
    expect(names).toContain("bug");
    expect(names).toContain("enhancement");
  });
});

describe("new GitHub issue", () => {
  test("becomes needs-triage and takes the category label; push is a no-op", async () => {
    fake.seedIssue({ title: "Crash on start", body: "It crashes.", labels: ["bug"] });
    await pull();
    const t = tasks()[0]!;
    expect(getTriage(t)).toEqual({ state: "needs-triage", category: "bug", issues: [] });
    fake.requests.length = 0;
    expect((await push()).errors).toEqual([]);
    expect(nonGetWrites().filter((r) => !r.path.endsWith("/labels"))).toEqual([]);
  });
});

describe("pull: label change on GitHub", () => {
  test("moves the task through the triage core and stays stable", async () => {
    saveTask(mkTask({ notes: ["triage: needs-triage", "category: bug"] }));
    await push();
    relabel(0, ["needs-triage"], ["ready-for-agent"]);
    const r = await pull();
    expect(r.tasksUpdated).toEqual(["t1"]);
    expect(r.conflicts).toEqual([]);
    expect(getTriage(task())).toEqual({ state: "ready-for-agent", category: "bug", issues: [] });
    // the core leaves its system comment
    expect(listComments(root, { kind: "task", id: "t1" }).some((c) => c.body.startsWith("Triage: needs-triage -> ready-for-agent"))).toBe(true);
    const hash = readMapping(root, "task", "t1")!.remote_hash;
    fake.requests.length = 0;
    const p = await push();
    expect(p.updated).toEqual([]);
    expect(nonGetWrites().filter((q) => !q.path.endsWith("/comments") && !q.path.endsWith("/labels"))).toEqual([]);
    const again = await pull();
    expect(again.tasksUpdated).toEqual([]);
    expect(again.conflicts).toEqual([]);
    expect(readMapping(root, "task", "t1")!.remote_hash).toBe(hash);
  });

  test("category label change is applied", async () => {
    saveTask(mkTask({ notes: ["triage: needs-triage", "category: bug"] }));
    await push();
    relabel(0, ["bug"], ["enhancement"]);
    await pull();
    expect(getTriage(task()).category).toBe("enhancement");
    expect(getTriage(task()).state).toBe("needs-triage");
  });

  test("wontfix cancels the task and the next push closes the issue", async () => {
    saveTask(mkTask({ notes: ["triage: needs-triage", "category: bug"] }));
    await push();
    relabel(0, ["needs-triage"], ["wontfix"]);
    await pull();
    expect(task().status).toBe("cancelled");
    await push();
    expect(fake.issues[0]!.state).toBe("closed");
    const again = await pull();
    expect(again.conflicts).toEqual([]);
    expect(again.tasksUpdated).toEqual([]);
  });

  test("a state needing a category, with none anywhere, keeps local and reports a conflict", async () => {
    saveTask(mkTask({ notes: ["triage: needs-triage"] }));
    await push();
    relabel(0, ["needs-triage"], ["ready-for-agent"]);
    const r = await pull();
    expect(r.conflicts.map((c) => c.ref)).toEqual(["t1"]);
    expect(getTriage(task()).state).toBe("needs-triage");
    await push();
    expect(stateLabels()).toEqual(["needs-triage"]);
  });
});

describe("push: local transition", () => {
  test("renders exactly one state label", async () => {
    saveTask(mkTask({ notes: ["triage: needs-triage"] }));
    await push();
    transition(root, "t1", "ready-for-human", { category: "enhancement" });
    relabel(0, [], ["needs-info"]); // stray extra state label added on GitHub
    await push();
    const names = fake.issues[0]!.labels.map((l) => l.name);
    expect(stateLabels()).toEqual(["ready-for-human"]);
    expect(names).toContain("enhancement");
    expect(names).not.toContain("bug");
  });

  test("local transition reaches GitHub, then pull is quiet", async () => {
    saveTask(mkTask({ notes: ["triage: needs-triage", "category: bug"] }));
    await push();
    transition(root, "t1", "ready-for-agent");
    expect((await push()).updated.map((u) => u.ref)).toEqual(["t1"]);
    expect(stateLabels()).toEqual(["ready-for-agent"]);
    const r = await pull();
    expect(r.tasksUpdated).toEqual([]);
    expect(r.conflicts).toEqual([]);
  });
});

describe("conflicts", () => {
  test("both sides moved: local wins, conflict reported, GitHub converges to local", async () => {
    saveTask(mkTask({ notes: ["triage: needs-triage", "category: bug"] }));
    await push();
    transition(root, "t1", "ready-for-human");
    relabel(0, ["needs-triage"], ["ready-for-agent"]);
    const r = await pull();
    expect(r.conflicts).toEqual([{ ref: "t1", fields: ["triage"] }]);
    expect(getTriage(task()).state).toBe("ready-for-human");
    await push();
    expect(stateLabels()).toEqual(["ready-for-human"]);
    const again = await pull();
    expect(again.conflicts).toEqual([]);
  });
});
