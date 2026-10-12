import { describe, test, expect } from "bun:test";
import { createBlankQuest, type Quest, type QuestStatus } from "../src/lib/quest";
import { createBlankTask, type Task } from "../src/lib/tasks";
import type { PlanResult } from "../src/lib/quest-planner";
import { PLANNER_ABORTED } from "../src/lib/quest-planner";
import {
  selectPlannableQuests,
  runPlanAll,
  splitValidPlans,
  type PlanAllRunner,
  type PlanAllRow,
} from "../src/lib/quest-plan-all";

function quest(id: string, status: QuestStatus = "draft"): Quest {
  const q = createBlankQuest(id, id, `goal ${id}`, "main");
  q.status = status;
  return q;
}

function taskFor(id: string, questId: string): Task {
  const t = createBlankTask(id, id, "d");
  t.quest = questId;
  return t;
}

const okPlan = (n = 1): PlanResult => ({
  success: true,
  tasks: Array.from({ length: n }, (_, i) => ({ id: `t${i}` }) as any),
  knowledge: null,
  issues: [],
  rawOutput: "",
});

describe("selectPlannableQuests", () => {
  test("qualifies quests with zero active+archived tasks and a plannable status", () => {
    const quests = [
      quest("empty-draft"),
      quest("empty-active", "active"),
      quest("has-active-task"),
      quest("has-archived-task"),
      quest("done", "completed"),
      quest("dead", "abandoned"),
    ];
    const active = [taskFor("a1", "has-active-task")];
    const archived = [taskFor("a2", "has-archived-task")];
    const sel = selectPlannableQuests(quests, active, archived);
    expect(sel.plannable.map((q) => q.id)).toEqual(["empty-draft", "empty-active"]);
    expect(sel.skipped).toEqual([
      { quest: expect.objectContaining({ id: "has-active-task" }), reason: "already-planned" },
      { quest: expect.objectContaining({ id: "has-archived-task" }), reason: "already-planned" },
      { quest: expect.objectContaining({ id: "done" }), reason: "status" },
      { quest: expect.objectContaining({ id: "dead" }), reason: "status" },
    ]);
  });
});

describe("runPlanAll", () => {
  test("never exceeds the concurrency limit", async () => {
    let running = 0;
    let peak = 0;
    const runner: PlanAllRunner = async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return okPlan();
    };
    const quests = ["a", "b", "c", "d", "e"].map((id) => quest(id));
    const run = runPlanAll({ quests, concurrency: 2, runner, abort: () => true });
    const rows = await run.done;
    expect(peak).toBe(2);
    expect(rows.every((r) => r.state === "done")).toBe(true);
  });

  test("aggregates telemetry into per-row and total tokens/cost (provider cost only)", async () => {
    const runner: PlanAllRunner = async (q, opts) => {
      opts.onTelemetry?.({ model: "m", tokensIn: 100, tokensOut: 50, cost: q.id === "a" ? 0.5 : null, activity: "" });
      return okPlan();
    };
    const run = runPlanAll({ quests: [quest("a"), quest("b")], concurrency: 2, runner, abort: () => true });
    await run.done;
    const t = run.totals();
    expect(t.tokensIn).toBe(200);
    expect(t.tokensOut).toBe(100);
    expect(t.cost).toBe(0.5);
  });

  test("totals cost is null when no provider reported cost", async () => {
    const runner: PlanAllRunner = async (_q, opts) => {
      opts.onTelemetry?.({ model: null, tokensIn: 1, tokensOut: 1, cost: null, activity: "" });
      return okPlan();
    };
    const run = runPlanAll({ quests: [quest("a")], concurrency: 1, runner, abort: () => true });
    await run.done;
    expect(run.totals().cost).toBeNull();
  });

  test("abort kills in-flight planners and marks queued ones aborted without starting them", async () => {
    const aborted: string[] = [];
    const started: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const runner: PlanAllRunner = async (q) => {
      started.push(q.id);
      await gate;
      return aborted.includes(q.id)
        ? { ...okPlan(0), success: false, error: PLANNER_ABORTED }
        : okPlan();
    };
    const run = runPlanAll({
      quests: ["a", "b", "c"].map((id) => quest(id)),
      concurrency: 2,
      runner,
      abort: (id) => {
        aborted.push(id);
        return true;
      },
    });
    await new Promise((r) => setTimeout(r, 1));
    run.abort();
    release();
    const rows = await run.done;
    expect(started).toEqual(["a", "b"]);
    expect(aborted.sort()).toEqual(["a", "b"]);
    expect(rows.map((r) => r.state)).toEqual(["aborted", "aborted", "aborted"]);
  });

  test("a failing planner marks its row failed and does not stop the others", async () => {
    const runner: PlanAllRunner = async (q) => {
      if (q.id === "b") throw new Error("boom");
      if (q.id === "c") return { ...okPlan(0), success: false, error: "no yaml" };
      return okPlan();
    };
    const run = runPlanAll({ quests: ["a", "b", "c"].map((id) => quest(id)), concurrency: 2, runner, abort: () => true });
    const rows = await run.done;
    expect(rows.map((r) => r.state)).toEqual(["done", "failed", "failed"]);
    expect(rows[1]!.error).toBe("boom");
    expect(rows[2]!.error).toBe("no yaml");
  });

  test("emits row snapshots through onUpdate and forwards the model", async () => {
    const seen: PlanAllRow["state"][] = [];
    let model: string | undefined;
    const runner: PlanAllRunner = async (_q, opts) => {
      model = opts.model;
      return okPlan();
    };
    const run = runPlanAll({
      quests: [quest("a")],
      concurrency: 1,
      model: "x/y",
      runner,
      abort: () => true,
      onUpdate: (rows) => seen.push(rows[0]!.state),
    });
    await run.done;
    expect(model).toBe("x/y");
    expect(seen).toContain("running");
    expect(seen[seen.length - 1]).toBe("done");
  });
});

describe("splitValidPlans", () => {
  test("valid = success with tasks; others are returned as rejected", () => {
    const rows = [
      { quest: quest("a"), state: "done", result: okPlan(2) },
      { quest: quest("b"), state: "done", result: { ...okPlan(1), success: false, issues: [{ level: "error", message: "x" }] } },
      { quest: quest("c"), state: "failed", result: undefined },
      { quest: quest("d"), state: "done", result: okPlan(0) },
    ] as PlanAllRow[];
    const { valid, invalid } = splitValidPlans(rows);
    expect(valid.map((r) => r.quest.id)).toEqual(["a"]);
    expect(invalid.map((r) => r.quest.id)).toEqual(["b", "c", "d"]);
  });
});
