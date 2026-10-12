/**
 * tasks-list-quest.test.ts — `tasks list --quest <id>` filter.
 *
 * Spawns the CLI against a throwaway project seeded with two quests.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ENTRY = resolve(import.meta.dir, "..", "src", "index.ts");

let dir: string;

function writeTask(id: string, quest?: string): void {
  const lines = [
    `id: ${id}`,
    `title: Task ${id}`,
    "description: d",
    "status: backlog",
    "completion: 0",
    "difficulty: easy",
    "priority: medium",
    "depends_on: []",
    "effort: PT30M",
    "constraints: []",
    "forbidden: []",
    "references: []",
    "notes: []",
    "subtasks: []",
  ];
  if (quest) lines.push(`quest: ${quest}`);
  writeFileSync(join(dir, ".wombo-combo", "tasks", `${id}.yml`), lines.join("\n") + "\n");
}

function writeQuest(id: string): void {
  writeFileSync(
    join(dir, ".wombo-combo", "quests", `${id}.yml`),
    [
      `id: ${id}`,
      `title: Quest ${id}`,
      "goal: g",
      "status: active",
      "priority: medium",
      "difficulty: easy",
      "depends_on: []",
      `branch: quest/${id}`,
      "baseBranch: main",
      "hitlMode: yolo",
      "constraints: { add: [], ban: [], override: {} }",
      "notes: []",
    ].join("\n") + "\n",
  );
}

function run(...args: string[]) {
  const res = Bun.spawnSync([process.execPath, ENTRY, ...args], {
    cwd: dir,
    env: { ...process.env, NO_COLOR: "1", CI: "1" },
  });
  return {
    exitCode: res.exitCode,
    stdout: res.stdout.toString(),
    stderr: res.stderr.toString(),
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "woco-quest-filter-"));
  mkdirSync(join(dir, ".wombo-combo", "tasks"), { recursive: true });
  mkdirSync(join(dir, ".wombo-combo", "quests"), { recursive: true });
  writeFileSync(join(dir, ".wombo-combo", "config.json"), JSON.stringify({ devMode: true }));
  writeQuest("alpha");
  writeQuest("beta");
  writeTask("in-alpha", "alpha");
  writeTask("in-beta", "beta");
  writeTask("loose");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("tasks list --quest", () => {
  test("lists only tasks of the given quest (json)", () => {
    const res = run("tasks", "list", "--quest", "alpha", "--output", "json");
    expect(res.exitCode).toBe(0);
    const data = JSON.parse(res.stdout);
    expect(data.features.map((f: { id: string }) => f.id)).toEqual(["in-alpha"]);
    expect(data.total).toBe(1);
  });

  test("filters in text output too", () => {
    const res = run("tasks", "list", "--quest", "beta");
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("in-beta");
    expect(res.stdout).not.toContain("in-alpha");
    expect(res.stdout).not.toContain("loose");
  });

  test("unknown quest id errors with exit code 1", () => {
    const res = run("tasks", "list", "--quest", "nope");
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("nope");
    expect(res.stdout).not.toContain("in-alpha");
  });

  test("without --quest all tasks are listed", () => {
    const res = run("tasks", "list", "--output", "json");
    expect(JSON.parse(res.stdout).total).toBe(3);
  });
});
