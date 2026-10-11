/**
 * quest-plan-apply.test.ts — applyPlanToQuest
 *
 * Coverage:
 *   - tasks from the plan are saved with the quest id
 *   - plan knowledge never clobbers an existing knowledge file: unrelated
 *     planner notes are appended, a rewrite that contains the existing text
 *     replaces it, and a quest without knowledge gets the plan's text
 */

import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyPlanToQuest, parsePlanYaml } from "../src/lib/quest-planner";
import { createBlankQuest } from "../src/lib/quest";
import { saveQuest, saveQuestKnowledge, loadQuestKnowledge } from "../src/lib/quest-store";
import { loadFeatures } from "../src/lib/tasks";
import { loadConfig } from "../src/config";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function setup() {
  const root = mkdtempSync(join(tmpdir(), "quest-plan-apply-"));
  dirs.push(root);
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
  const quest = createBlankQuest("demo-quest", "Demo", "Demo goal", "main");
  saveQuest(root, quest);
  return { root, quest, config: loadConfig(root) };
}

function plan(knowledge?: string) {
  const lines = [
    "tasks:",
    "  - id: first-step",
    "    title: First step",
    "    description: Do the first thing",
    "    priority: medium",
    "    difficulty: easy",
    "    effort: PT30M",
    "    depends_on: []",
    "    constraints: []",
    "    forbidden: []",
    "    references: []",
    "    notes: []",
  ];
  if (knowledge !== undefined) lines.push(`knowledge: ${JSON.stringify(knowledge)}`);
  return parsePlanYaml(lines.join("\n"));
}

describe("applyPlanToQuest", () => {
  test("saves the planned tasks linked to the quest", () => {
    const { root, quest, config } = setup();
    applyPlanToQuest(plan(), quest, root, config);
    const task = loadFeatures(root, config).tasks.find((t) => t.id === "first-step");
    expect(task?.quest).toBe("demo-quest");
  });

  test("writes the plan's knowledge when the quest has none", () => {
    const { root, quest, config } = setup();
    applyPlanToQuest(plan("Use the X seam."), quest, root, config);
    expect(loadQuestKnowledge(root, "demo-quest")).toBe("Use the X seam.");
  });

  test("appends unrelated planner notes instead of overwriting existing knowledge", () => {
    const { root, quest, config } = setup();
    saveQuestKnowledge(root, "demo-quest", "# Hand-written design\n\nKeep module A pure.\n");
    applyPlanToQuest(plan("Split into two tasks."), quest, root, config);
    const knowledge = loadQuestKnowledge(root, "demo-quest")!;
    expect(knowledge).toContain("Keep module A pure.");
    expect(knowledge).toContain("## Planner notes");
    expect(knowledge).toContain("Split into two tasks.");
  });

  test("a plan that already contains the existing knowledge replaces it as a rewrite", () => {
    const { root, quest, config } = setup();
    saveQuestKnowledge(root, "demo-quest", "Keep module A pure.");
    const rewrite = "Keep module A pure.\n\nAlso: module B owns IO.";
    applyPlanToQuest(plan(rewrite), quest, root, config);
    expect(loadQuestKnowledge(root, "demo-quest")).toBe(rewrite);
  });
});
