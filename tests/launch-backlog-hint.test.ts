import { describe, test, expect } from "bun:test";
import { describeNoLaunchable } from "../src/commands/launch";
import type { Feature } from "../src/lib/tasks";

function task(id: string, status: string, depends_on: string[] = []): Feature {
  return { id, title: id, description: "", status, depends_on, subtasks: [] } as unknown as Feature;
}
const data = (tasks: Feature[]) => ({ tasks, archive: [] }) as any;

describe("describeNoLaunchable", () => {
  test("keeps original text when no backlog tasks exist", () => {
    const msg = describeNoLaunchable(data([task("a", "done")]), { allReady: true });
    expect(msg).toBe("No launchable tasks found (all tasks are done, cancelled, or have unmet dependencies).");
  });

  test("keeps filter and bare messages unchanged", () => {
    expect(describeNoLaunchable(data([]), { priority: "high" } as any)).toBe(
      "No tasks matched the current filters: --priority high.",
    );
    expect(describeNoLaunchable(data([]), {})).toBe("No launchable tasks found.");
  });

  test("hints at backlog tasks with met dependencies (singular)", () => {
    const msg = describeNoLaunchable(data([task("a", "backlog")]), { allReady: true });
    expect(msg).toContain("No launchable tasks found (all tasks are done, cancelled, or have unmet dependencies).");
    expect(msg).toContain("1 task is in backlog");
    expect(msg).toContain("woco tasks set-status <id> planned");
    expect(msg).toContain("a");
  });

  test("lists at most 5 ids and ignores backlog tasks with unmet deps", () => {
    const ts = ["a", "b", "c", "d", "e", "f", "g"].map((i) => task(i, "backlog"));
    ts.push(task("blocked", "backlog", ["nope"]));
    const msg = describeNoLaunchable(data(ts), { allReady: true });
    expect(msg).toContain("7 tasks are in backlog");
    expect(msg).toContain("a, b, c, d, e");
    expect(msg).not.toContain("f,");
    expect(msg).not.toContain("blocked");
  });
});
