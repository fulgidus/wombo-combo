import { describe, test, expect, afterEach } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG } from "../src/config";
import type { Task } from "../src/lib/tasks";
import { saveTaskToStore, saveTaskToArchive } from "../src/lib/task-store";
import {
  git, gitRaw, makeRepo, commitAll, removeDir, writeRepoFile,
} from "./helpers/git-repo";

const task = (id: string): Task => ({
  id, title: id, description: "", status: "backlog", completion: 0, difficulty: "medium",
  priority: "medium", depends_on: [], effort: "1h", started_at: null, ended_at: null,
  constraints: [], forbidden: [], references: [], notes: [], subtasks: [],
} as Task);

const dirs: string[] = [];
afterEach(() => { while (dirs.length) removeDir(dirs.pop()!); });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("task store _meta.yml", () => {
  test("saving a task does not change _meta.yml after the first write", async () => {
    const repo = makeRepo();
    dirs.push(repo);
    saveTaskToStore(repo, DEFAULT_CONFIG, task("a"));
    const metaPath = join(repo, ".wombo-combo", "tasks", "_meta.yml");
    const first = readFileSync(metaPath, "utf-8");
    await sleep(15);
    saveTaskToStore(repo, DEFAULT_CONFIG, task("b"));
    expect(readFileSync(metaPath, "utf-8")).toBe(first);
  });

  test("two branches editing different tasks merge cleanly", async () => {
    const repo = makeRepo();
    dirs.push(repo);
    saveTaskToStore(repo, DEFAULT_CONFIG, task("a"));
    saveTaskToArchive(repo, DEFAULT_CONFIG, task("old"));
    writeRepoFile(repo, "CHANGELOG.md", "# Changelog\n");
    writeRepoFile(repo, ".gitattributes", readFileSync(join(__dirname, "..", ".gitattributes"), "utf-8"));
    commitAll(repo, "base");

    git(repo, "checkout", "-q", "-b", "quest/q");
    await sleep(15);
    saveTaskToStore(repo, DEFAULT_CONFIG, task("from-quest"));
    saveTaskToArchive(repo, DEFAULT_CONFIG, task("q-archived"));
    writeRepoFile(repo, "CHANGELOG.md", "# Changelog\n\n- quest entry\n");
    commitAll(repo, "quest work");

    git(repo, "checkout", "-q", "main");
    await sleep(15);
    saveTaskToStore(repo, DEFAULT_CONFIG, task("from-main"));
    saveTaskToArchive(repo, DEFAULT_CONFIG, task("m-archived"));
    writeRepoFile(repo, "CHANGELOG.md", "# Changelog\n\n- main entry\n");
    commitAll(repo, "main work");

    const res = gitRaw(repo, "merge", "--no-edit", "quest/q");
    expect(res.status).toBe(0);
    const tasks = join(repo, ".wombo-combo", "tasks");
    expect(existsSync(join(tasks, "from-quest.yml"))).toBe(true);
    expect(existsSync(join(tasks, "from-main.yml"))).toBe(true);
    const log = readFileSync(join(repo, "CHANGELOG.md"), "utf-8");
    expect(log).toContain("quest entry");
    expect(log).toContain("main entry");
  });
});
