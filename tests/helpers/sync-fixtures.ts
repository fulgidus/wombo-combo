import type { Quest } from "../../src/lib/quest";
import type { Task } from "../../src/lib/tasks";

/** Task / quest fixtures for the GitHub sync tests. */
export function mkTask(over: Partial<Task> = {}): Task {
  return {
    id: "t1", title: "Task one", description: "Do it", status: "backlog", completion: 0,
    difficulty: "medium", priority: "high", depends_on: [], effort: "PT1H", started_at: null,
    ended_at: null, constraints: ["c1"], forbidden: [], references: [], notes: [], subtasks: [],
    ...over,
  };
}

export function mkQuest(over: Partial<Quest> = {}): Quest {
  return {
    id: "q1", title: "Quest one", goal: "Goal", status: "active", priority: "medium", difficulty: "hard",
    depends_on: [], branch: "quest/q1", baseBranch: "main", hitlMode: "yolo",
    constraints: { add: ["x"], ban: [], override: {} },
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", started_at: null, ended_at: null, notes: [],
    ...over,
  } as Quest;
}
