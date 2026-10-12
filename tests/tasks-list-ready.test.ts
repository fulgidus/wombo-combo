import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DEFAULT_CONFIG } from "../src/config";
import { saveFeatures, getReadyFeatures, loadFeatures, type Feature } from "../src/lib/tasks";
import { cmdTasksList } from "../src/commands/tasks/list";
import { t } from "../src/lib/i18n";

function task(id: string, overrides: Partial<Feature> = {}): Feature {
  return {
    id, title: id, description: "d", status: "planned", completion: 0,
    difficulty: "easy", priority: "low", depends_on: [], effort: "PT1H",
    started_at: null, ended_at: null, constraints: [], forbidden: [],
    references: [], notes: [], subtasks: [], ...overrides,
  };
}

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "wombo-ready-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("tasks list --ready", () => {
  test("lists exactly what launch --all-ready selects (planned + deps met)", async () => {
    const data = {
      version: "1",
      meta: { created_at: "", updated_at: "", project: "p", generator: "t", maintainer: "t" },
      tasks: [
        task("planned-ok"),
        task("backlog-ok", { status: "backlog" }),
        task("planned-blocked", { depends_on: ["backlog-ok"] }),
      ],
      archive: [],
    };
    saveFeatures(dir, DEFAULT_CONFIG, data);

    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...a: unknown[]) => { logs.push(a.join(" ")); });
    try {
      await cmdTasksList({ projectRoot: dir, config: DEFAULT_CONFIG, ready: true, outputFmt: "json" });
    } finally { spy.mockRestore(); }

    const listed = (JSON.parse(logs.join("")).features as { id: string }[]).map((f) => f.id).sort();
    const launchable = getReadyFeatures(loadFeatures(dir, DEFAULT_CONFIG)).map((f) => f.id).sort();
    expect(listed).toEqual(["planned-ok"]);
    expect(listed).toEqual(launchable);
  });

  test("help text describes planned, not backlog", () => {
    expect(t("cli.help.tasks.list.flag.ready")).toContain("planned");
    expect(t("cli.help.tasks.list.flag.ready")).not.toContain("backlog");
  });
});
