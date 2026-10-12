import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handleQuestSubcommand } from "../src/commands/quest";
import { createBlankQuest } from "../src/lib/quest";
import { saveQuest, loadQuest } from "../src/lib/quest-store";
import { loadFeatures } from "../src/lib/tasks";
import { loadConfig } from "../src/config";
import type { PlanAllRunner } from "../src/lib/quest-plan-all";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function setup() {
  const root = mkdtempSync(join(tmpdir(), "quest-plan-all-"));
  dirs.push(root);
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
  for (const id of ["alpha", "beta"]) saveQuest(root, createBlankQuest(id, id, `goal ${id}`, "main"));
  const done = createBlankQuest("finished", "finished", "g", "main");
  done.status = "completed";
  saveQuest(root, done);
  return { root, config: loadConfig(root) };
}

async function capture(fn: () => Promise<void>): Promise<string> {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => void lines.push(a.join(" "));
  try {
    await fn();
  } finally {
    console.log = orig;
  }
  return lines.join("\n");
}

const proposed = (id: string) => ({
  id,
  title: id,
  description: "d",
  priority: "medium",
  difficulty: "easy",
  effort: "PT30M",
  depends_on: [],
  constraints: [],
  forbidden: [],
  references: [],
  notes: [],
});

describe("woco quest plan-all", () => {
  test("--dry-run lists plannable and skipped quests and launches no planner", async () => {
    const { root, config } = setup();
    let calls = 0;
    const planAllRunner: PlanAllRunner = async () => {
      calls++;
      throw new Error("must not run");
    };
    const out = await capture(() =>
      handleQuestSubcommand({ projectRoot: root, config, subcommand: "plan-all", dryRun: true, outputFmt: "json", planAllRunner }),
    );
    const data = JSON.parse(out);
    expect(calls).toBe(0);
    expect(data.dry_run).toBe(true);
    expect(data.would_plan.sort()).toEqual(["alpha", "beta"]);
    expect(data.skipped).toEqual([{ quest_id: "finished", reason: "status" }]);
  });

  test("applies valid plans, respects concurrency, and reports failures", async () => {
    const { root, config } = setup();
    let running = 0;
    let peak = 0;
    const planAllRunner: PlanAllRunner = async (q) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      if (q.id === "beta") return { success: false, tasks: [], knowledge: null, issues: [], rawOutput: "", error: "no yaml" };
      return { success: true, tasks: [proposed("alpha-step")] as any, knowledge: null, issues: [], rawOutput: "" };
    };
    const out = await capture(() =>
      handleQuestSubcommand({ projectRoot: root, config, subcommand: "plan-all", concurrency: 1, outputFmt: "json", planAllRunner }),
    );
    const data = JSON.parse(out);
    expect(peak).toBe(1);
    expect(data.planned).toEqual([{ quest_id: "alpha", tasks_created: 1 }]);
    expect(data.failed).toEqual([{ quest_id: "beta", error: "no yaml" }]);
    expect(loadFeatures(root, config).tasks.map((t) => t.id)).toContain("alpha-step");
    expect(loadQuest(root, "alpha")!.status).toBe("active");
  });
});
