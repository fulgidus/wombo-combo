import { describe, expect, test } from "bun:test";
import {
  applyTriageRole,
  issueStateToStatus,
  parseCommentBody,
  parseIssueToQuest,
  parseIssueToTask,
  parseRemoteComment,
  parseTriageRole,
  parsedToTask,
  renderCommentBody,
  renderQuestIssue,
  renderTaskIssue,
  statusToIssueState,
  taskSyncable,
  questSyncable,
} from "../src/lib/sync/render";
import { findMarker, hashTask } from "../src/lib/sync/mapping";
import type { RemoteComment, RemoteIssue } from "../src/lib/sync/types";
import type { Task, TaskStatus, Priority, Difficulty } from "../src/lib/tasks";
import type { Quest } from "../src/lib/quest";

function task(over: Partial<Task> = {}): Task {
  return {
    id: "my-task", title: "My task", description: "Do it.\n\nWith detail.", status: "backlog", completion: 0,
    difficulty: "medium", priority: "high", depends_on: ["a", "b"], effort: "1h", started_at: null,
    ended_at: null, constraints: ["c1", "c2"], forbidden: ["f1"], references: ["src/x.ts"],
    notes: ["note", "triage: needs-triage"], subtasks: [], quest: "github-sync", ...over,
  };
}

function quest(over: Partial<Quest> = {}): Quest {
  return {
    id: "github-sync", title: "GitHub sync", goal: "Keep in lockstep.", status: "active", priority: "medium",
    difficulty: "hard", depends_on: ["other"], branch: "quest/github-sync", baseBranch: "main", hitlMode: "yolo",
    constraints: { add: ["add1"], ban: ["ban1"], override: {} },
    created_at: "t", updated_at: "t", started_at: null, ended_at: null, notes: [], ...over,
  } as Quest;
}

function asIssue(d: ReturnType<typeof renderTaskIssue>, number = 5): RemoteIssue {
  return { number, url: `https://github.com/o/r/issues/${number}`, ...d, updatedAt: "2026-01-01T00:00:00Z", user: "bot" };
}

const OPTS = { triageLabels: ["needs-triage", "ready"] };

describe("renderTaskIssue", () => {
  test("title, labels, body and marker", () => {
    const d = renderTaskIssue(task());
    expect(d.title).toBe("[my-task] My task");
    expect(d.labels).toEqual(["priority:high", "difficulty:medium", "quest:github-sync", "needs-triage"]);
    expect(d.state).toBe("open");
    expect(d.stateReason).toBeNull();
    expect(d.body).toStartWith("Do it.\n\nWith detail.");
    expect(d.body).toContain("## Constraints\n- c1\n- c2");
    expect(d.body).toContain("## Forbidden\n- f1");
    expect(d.body).toContain("## Blocked by\n- a\n- b");
    expect(findMarker(d.body)).toEqual({ kind: "task", id: "my-task" });
  });

  test("omits empty sections, quest and triage labels", () => {
    const d = renderTaskIssue(task({ constraints: [], forbidden: [], references: [], depends_on: [], quest: undefined, notes: [] }));
    expect(d.body).not.toContain("##");
    expect(d.labels).toEqual(["priority:high", "difficulty:medium"]);
  });

  test("status mapping", () => {
    expect(statusToIssueState("done")).toEqual({ state: "closed", stateReason: "completed" });
    expect(statusToIssueState("cancelled")).toEqual({ state: "closed", stateReason: "not_planned" });
    for (const s of ["backlog", "planned", "in_progress", "blocked", "in_review"] as TaskStatus[]) {
      expect(statusToIssueState(s)).toEqual({ state: "open", stateReason: null });
    }
    expect(issueStateToStatus("open", "reopened")).toBe("backlog");
    expect(issueStateToStatus("closed", "completed")).toBe("done");
    expect(issueStateToStatus("closed", null)).toBe("done");
    expect(issueStateToStatus("closed", "not_planned")).toBe("cancelled");
  });
});

describe("task round trip", () => {
  const priorities: Priority[] = ["critical", "high", "medium", "low", "wishlist"];
  const difficulties: Difficulty[] = ["trivial", "easy", "medium", "hard", "very_hard"];
  const statuses: TaskStatus[] = ["backlog", "in_progress", "done", "cancelled"];

  test("render then parse preserves syncable fields (matrix)", () => {
    for (const priority of priorities)
      for (const difficulty of difficulties)
        for (const status of statuses) {
          const t = task({ priority, difficulty, status });
          const back = parsedToTask(parseIssueToTask(asIssue(renderTaskIssue(t)), OPTS));
          expect(taskSyncable(back)).toEqual(taskSyncable(t));
          expect(hashTask(back)).toBe(hashTask(t));
          expect(back.id).toBe(t.id);
        }
  });

  test("awkward text survives", () => {
    const samples = [
      { description: "", constraints: [], forbidden: [], references: [], depends_on: [], quest: undefined, notes: [] },
      { description: "  padded  \n\n\n  gap  ", constraints: ["multi\nline"], title: "Unicode ✓ [x] title" },
      { description: "code:\n```ts\nconst a = 1;\n```\n- a bullet\n# heading" },
      { description: "has <!-- other comment --> inside", references: ["https://x.y/z?a=b&c=d"] },
    ];
    for (const over of samples) {
      const t = task(over as Partial<Task>);
      const back = parsedToTask(parseIssueToTask(asIssue(renderTaskIssue(t)), OPTS));
      expect(taskSyncable(back)).toEqual(taskSyncable(t));
    }
  });

  test("render is idempotent through parse", () => {
    const d1 = renderTaskIssue(task());
    const d2 = renderTaskIssue(parsedToTask(parseIssueToTask(asIssue(d1), OPTS)));
    expect(d2).toEqual(d1);
  });
});

describe("parseIssueToTask on foreign issues", () => {
  const foreign: RemoteIssue = {
    number: 12, url: "u", title: "Fix the *Login* bug!!", body: "It crashes.", state: "open", stateReason: null,
    labels: ["bug", "priority:low", "difficulty:bogus", "quest:q-1"], updatedAt: "x", user: "someone",
  };

  test("id is gh-<number>-<slug>, defaults applied", () => {
    const p = parseIssueToTask(foreign);
    expect(p.id).toBe("gh-12-fix-the-login-bug");
    expect(p.fromMarker).toBe(false);
    expect(p.title).toBe("Fix the *Login* bug!!");
    expect(p.description).toBe("It crashes.");
    expect(p.priority).toBe("low");
    expect(p.difficulty).toBe("medium");
    expect(p.quest).toBe("q-1");
    expect(p.triage).toBeNull();
    expect(parseIssueToTask({ ...foreign, title: "!!!" }).id).toBe("gh-12-untitled");
    expect(parseIssueToTask({ ...foreign, title: "x".repeat(200) }).id.length).toBeLessThanOrEqual("gh-12-".length + 40);
  });

  test("a bracketed prefix is kept unless it matches the marker id; missing body is fine", () => {
    expect(parseIssueToTask({ ...foreign, title: "[WIP] thing" }).title).toBe("[WIP] thing");
    expect(parseIssueToTask({ ...foreign, body: null as unknown as string }).description).toBe("");
  });

  test("a quest marker on a task parse is not used as task id", () => {
    const p = parseIssueToTask({ ...foreign, body: "x\n\n<!-- woco:quest:q -->" });
    expect(p.fromMarker).toBe(false);
    expect(p.id).toBe("gh-12-fix-the-login-bug");
  });

  test("closed issues map to done / cancelled", () => {
    expect(parseIssueToTask({ ...foreign, state: "closed", stateReason: "not_planned" }).status).toBe("cancelled");
    expect(parseIssueToTask({ ...foreign, state: "closed", stateReason: "completed" }).status).toBe("done");
  });
});

describe("triage role", () => {
  test("parse and apply", () => {
    expect(parseTriageRole(["a", "triage: needs-triage"])).toBe("needs-triage");
    expect(parseTriageRole(["  Triage:   ready  "])).toBe("ready");
    expect(parseTriageRole(["triage:"])).toBeNull();
    expect(parseTriageRole([])).toBeNull();
    expect(parseTriageRole(undefined)).toBeNull();
  });

  test("apply replaces, appends, removes and does not mutate", () => {
    const notes = ["keep", "triage: old", "triage: older"];
    expect(applyTriageRole(notes, "ready")).toEqual(["keep", "triage: ready"]);
    expect(applyTriageRole(notes, null)).toEqual(["keep"]);
    expect(applyTriageRole(["keep"], "ready")).toEqual(["keep", "triage: ready"]);
    expect(notes).toEqual(["keep", "triage: old", "triage: older"]);
  });
});

describe("quests", () => {
  test("render and round trip", () => {
    const d = renderQuestIssue(quest());
    expect(d.title).toBe("[github-sync] GitHub sync");
    expect(d.labels).toEqual(["spec", "priority:medium", "difficulty:hard"]);
    expect(findMarker(d.body)).toEqual({ kind: "quest", id: "github-sync" });
    const p = parseIssueToQuest(asIssue(d));
    expect(p).toMatchObject({ id: "github-sync", title: "GitHub sync", goal: "Keep in lockstep.", status: "active", depends_on: ["other"], constraints_add: ["add1"], constraints_ban: ["ban1"] });
    const back = quest({ title: p.title, goal: p.goal, status: p.status, priority: p.priority, difficulty: p.difficulty, depends_on: p.depends_on, constraints: { add: p.constraints_add, ban: p.constraints_ban, override: {} } });
    expect(questSyncable(back)).toEqual(questSyncable(quest()));
  });

  test("completed/abandoned map to closed", () => {
    expect(renderQuestIssue(quest({ status: "completed" }))).toMatchObject({ state: "closed", stateReason: "completed" });
    expect(renderQuestIssue(quest({ status: "abandoned" }))).toMatchObject({ state: "closed", stateReason: "not_planned" });
    expect(renderQuestIssue(quest({ status: "paused" })).state).toBe("open");
    expect(parseIssueToQuest(asIssue(renderQuestIssue(quest({ status: "abandoned" })))).status).toBe("abandoned");
  });
});

describe("comments", () => {
  const c = { id: "2026-10-11T22-39-08.322Z-alice-ab12", author: "alice@example.com", role: "agent" as const, body: "Looks good.\n\n- one\n- two" };

  test("render has attribution line, body and marker", () => {
    const text = renderCommentBody(c);
    const lines = text.split("\n");
    expect(lines[0]).toBe(`_**alice@example.com** (agent) · woco comment \`${c.id}\`_`);
    expect(text).toContain("Looks good.");
    expect(lines.at(-1)).toBe(`<!-- woco:comment:${c.id} -->`);
  });

  test("round trip", () => {
    const p = parseCommentBody(renderCommentBody(c));
    expect(p).toEqual({ id: c.id, author: c.author, role: "agent", body: c.body });
    const odd = { ...c, author: "we**ird *name*", body: "  trailing  \n" };
    expect(parseCommentBody(renderCommentBody(odd))).toEqual({ id: c.id, author: odd.author, role: "agent", body: "trailing" });
  });

  test("foreign comments", () => {
    expect(parseCommentBody("just text")).toEqual({ id: null, author: null, role: null, body: "just text" });
    // attribution without a matching marker is not trusted
    const spoof = `_**x** (system) · woco comment \`abc\`_\n\nhi`;
    expect(parseCommentBody(spoof)).toMatchObject({ id: null, author: null, role: null });
    const rc: RemoteComment = { id: 99, body: "hello", user: "octo", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", url: "https://x/c/99" };
    expect(parseRemoteComment(rc, { kind: "task", id: "t" })).toEqual({
      id: "gh-99", ref_kind: "task", ref_id: "t", author: "octo", role: "human", created_at: rc.createdAt, body: "hello", github_url: rc.url,
    });
  });

  test("own comment keeps woco identity via parseRemoteComment", () => {
    const rc: RemoteComment = { id: 5, body: renderCommentBody(c), user: "bot", createdAt: "t1", updatedAt: "t2", url: "u" };
    expect(parseRemoteComment(rc, { kind: "quest", id: "q" })).toMatchObject({ id: c.id, author: c.author, role: "agent", body: c.body, ref_kind: "quest", created_at: "t1" });
  });
});
