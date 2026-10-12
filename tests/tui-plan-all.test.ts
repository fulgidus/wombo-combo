import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handlePlanAllFlow, type PlanAllFlowDeps } from "../src/commands/tui-plan-all";
import { createBlankQuest } from "../src/lib/quest";
import { saveQuest, loadQuest } from "../src/lib/quest-store";
import { loadFeatures } from "../src/lib/tasks";
import { loadConfig } from "../src/config";
import type { PlanAllRow } from "../src/lib/quest-plan-all";
import type { PlanResult } from "../src/lib/quest-planner";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function setup() {
  const root = mkdtempSync(join(tmpdir(), "tui-plan-all-"));
  dirs.push(root);
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
  for (const id of ["alpha", "beta"]) saveQuest(root, createBlankQuest(id, id, "g", "main"));
  return { root, config: loadConfig(root) };
}

const plan = (id: string): PlanResult => ({
  success: true,
  tasks: [
    { id, title: id, description: "d", priority: "medium", difficulty: "easy", effort: "PT30M",
      depends_on: [], constraints: [], forbidden: [], references: [], notes: [] } as any,
  ],
  knowledge: null,
  issues: [],
  rawOutput: "",
});

function rowsFor(...ids: string[]): PlanAllRow[] {
  return ids.map((id) => ({
    quest: createBlankQuest(id, id, "g", "main"),
    state: "done",
    model: null, tokensIn: 0, tokensOut: 0, cost: null, activity: "",
    result: plan(`${id}-step`),
  }));
}

function deps(over: Partial<PlanAllFlowDeps>): { deps: PlanAllFlowDeps; messages: string[]; reviewed: string[] } {
  const messages: string[] = [];
  const reviewed: string[] = [];
  return {
    messages,
    reviewed,
    deps: {
      runPlanAll: async () => ({ type: "cancel", rows: [] }),
      reviewPlan: async (o) => {
        reviewed.push(o.questId);
        return { type: "approve", tasks: o.planResult.tasks, knowledge: null };
      },
      notify: async (_title, message) => void messages.push(message),
      ...over,
    },
  };
}

describe("handlePlanAllFlow", () => {
  test("tells the user when nothing needs planning and launches no planners", async () => {
    const { root, config } = setup();
    for (const id of ["alpha", "beta"]) {
      const q = loadQuest(root, id)!;
      q.status = "completed";
      saveQuest(root, q);
    }
    let launched = false;
    const d = deps({ runPlanAll: async () => ((launched = true), { type: "cancel", rows: [] }) });
    await handlePlanAllFlow(root, config, {}, d.deps);
    expect(launched).toBe(false);
    expect(d.messages.length).toBe(1);
  });

  test("cancel applies nothing", async () => {
    const { root, config } = setup();
    const d = deps({ runPlanAll: async () => ({ type: "cancel", rows: rowsFor("alpha") }) });
    await handlePlanAllFlow(root, config, {}, d.deps);
    expect(loadFeatures(root, config).tasks.length).toBe(0);
  });

  test("approve-all applies every valid plan without opening the review", async () => {
    const { root, config } = setup();
    const d = deps({ runPlanAll: async () => ({ type: "approve-all", rows: rowsFor("alpha", "beta") }) });
    await handlePlanAllFlow(root, config, {}, d.deps);
    expect(loadFeatures(root, config).tasks.map((t) => t.id).sort()).toEqual(["alpha-step", "beta-step"]);
    expect(d.reviewed).toEqual([]);
    expect(loadQuest(root, "alpha")!.status).toBe("active");
  });

  test("review opens one quest at a time; cancelling one keeps it unplanned", async () => {
    const { root, config } = setup();
    const d = deps({
      runPlanAll: async () => ({ type: "review", rows: rowsFor("alpha", "beta") }),
      reviewPlan: async (o) => {
        d.reviewed.push(o.questId);
        return o.questId === "alpha"
          ? { type: "cancel" }
          : { type: "approve", tasks: o.planResult.tasks, knowledge: null };
      },
    });
    await handlePlanAllFlow(root, config, {}, d.deps);
    expect(d.reviewed).toEqual(["alpha", "beta"]);
    expect(loadFeatures(root, config).tasks.map((t) => t.id)).toEqual(["beta-step"]);
  });
});
