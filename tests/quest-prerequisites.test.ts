import { describe, test, expect } from "bun:test";
import { createBlankQuest, type Quest, type QuestStatus } from "../src/lib/quest";
import { createBlankTask } from "../src/lib/tasks";
import {
  analyzePrerequisites,
  describeFindings,
  formatPrerequisiteSection,
  validateProposedPrerequisites,
} from "../src/lib/quest-prerequisites";
import { parsePlanYaml } from "../src/lib/quest-planner";

function quest(id: string, deps: string[] = [], status: QuestStatus = "draft"): Quest {
  const q = createBlankQuest(id, id, `goal ${id}`, "main");
  q.depends_on = deps;
  q.status = status;
  return q;
}
function task(id: string, questId: string, paths: string[] = []) {
  const t = createBlankTask(id, id, "d");
  t.quest = questId;
  t.paths = paths;
  return t;
}

describe("analyzePrerequisites", () => {
  test("flags missing, unplanned and unfinished prerequisites, transitively", () => {
    const a = quest("a", ["b", "ghost"]);
    const b = quest("b", ["c"]);
    const c = quest("c", [], "active");
    const { findings } = analyzePrerequisites(a, [a, b, c], [task("c1", "c")]);
    expect(findings).toEqual([
      { questId: "b", problem: "unplanned", transitive: false },
      { questId: "c", problem: "unfinished", transitive: true },
      { questId: "ghost", problem: "missing", transitive: false },
    ]);
    expect(describeFindings(findings)).toHaveLength(3);
  });

  test("completed prerequisites are satisfied", () => {
    const a = quest("a", ["b"]);
    const b = quest("b", [], "completed");
    expect(analyzePrerequisites(a, [a, b], []).findings).toEqual([]);
  });

  test("in-flight lists other unfinished quests with open task paths", () => {
    const a = quest("a");
    const b = quest("b", [], "active");
    const done = quest("d", [], "completed");
    const t1 = task("t1", "b", ["src/x.ts"]);
    const t2 = task("t2", "b");
    t2.status = "done";
    const { inFlight } = analyzePrerequisites(a, [a, b, done], [t1, t2]);
    expect(inFlight.map((q) => q.id)).toEqual(["b"]);
    expect(inFlight[0]!.openTasks).toEqual([{ id: "t1", title: "t1", paths: ["src/x.ts"] }]);
    expect(formatPrerequisiteSection({ findings: [], inFlight })).toContain("src/x.ts");
  });
});

describe("validateProposedPrerequisites", () => {
  test("rejects self, unknown, abandoned and cyclic; accepts valid", () => {
    const a = quest("a");
    const b = quest("b");
    const c = quest("c", ["a"]);
    const dead = quest("dead", [], "abandoned");
    const res = validateProposedPrerequisites(a, ["a", "nope", "dead", "c", "b", "b"], [a, b, c, dead]);
    expect(res.accepted).toEqual(["b"]);
    expect(res.rejected.map((r) => r.id)).toEqual(["a", "nope", "dead", "c"]);
  });
});

describe("parsePlanYaml prerequisite_quests", () => {
  test("parses the list, defaults to empty", () => {
    expect(parsePlanYaml("tasks: []\nprerequisite_quests: [x, y]").prerequisite_quests).toEqual(["x", "y"]);
    expect(parsePlanYaml("tasks: []").prerequisite_quests).toEqual([]);
  });
});
