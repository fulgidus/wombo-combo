import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { rmSync } from "node:fs";
import { DEFAULT_CONFIG, normalizeCommentsConfig, validateConfig, type WomboConfig } from "../src/config";
import { createBlankTask, saveTaskToStore } from "../src/lib/tasks";
import { addComment, listComments, type Comment } from "../src/lib/comments";
import { generatePrompt } from "../src/lib/prompt";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { makeRepo } from "./helpers/git-repo";

const feature = {
  id: "t1", title: "T", description: "d", status: "backlog", completion: 0,
  difficulty: "medium", priority: "medium", depends_on: [], effort: "PT1H",
  started_at: null, ended_at: null, constraints: [], forbidden: [], references: [],
  notes: [], subtasks: [],
} as any;

function cfg(comments?: Partial<WomboConfig["comments"]>): WomboConfig {
  return { ...DEFAULT_CONFIG, comments: { ...DEFAULT_CONFIG.comments!, ...comments } } as WomboConfig;
}
function c(i: number, body: string, role: Comment["role"] = "agent"): Comment {
  return { id: `c${i}`, ref_kind: "task", ref_id: "t1", author: `a${i}`, role, created_at: `2026-01-0${i}T00:00:00.000Z`, body };
}

describe("comments config", () => {
  test("defaults and normalization", () => {
    expect(DEFAULT_CONFIG.comments).toEqual({ enabled: true, promptMaxItems: 10, promptMaxChars: 4000, autoLifecycle: false });
    expect(normalizeCommentsConfig(undefined)).toEqual(DEFAULT_CONFIG.comments!);
    expect(normalizeCommentsConfig({ autoLifecycle: true }).autoLifecycle).toBe(true);
  });
  test("validation rejects bad values", () => {
    expect(() => validateConfig(cfg({ enabled: "x" as any }))).toThrow(/comments.enabled/);
    expect(() => validateConfig(cfg({ promptMaxItems: 0 }))).toThrow(/promptMaxItems/);
    expect(() => validateConfig(cfg({ promptMaxChars: 1.5 }))).toThrow(/promptMaxChars/);
    expect(() => validateConfig(cfg({ autoLifecycle: 1 as any }))).toThrow(/autoLifecycle/);
    expect(() => validateConfig(cfg())).not.toThrow();
  });
});

describe("prompt comments section", () => {
  test("omitted without comments or when disabled", () => {
    expect(generatePrompt(feature, "main", cfg())).not.toContain("## Comments");
    expect(generatePrompt(feature, "main", cfg(), undefined, undefined, null, { task: [], quest: [] })).not.toContain("## Comments");
    const p = generatePrompt(feature, "main", cfg({ enabled: false }), undefined, undefined, null, { task: [c(1, "x")], quest: [] });
    expect(p).not.toContain("## Comments");
  });
  test("lists comments newest last with author/role/timestamp and instruction", () => {
    const p = generatePrompt(feature, "main", cfg(), undefined, undefined, null, { task: [c(1, "first"), c(2, "second", "human")], quest: [] });
    expect(p).toContain("## Comments");
    expect(p).toContain("**a2** (human, 2026-01-02T00:00:00.000Z): second");
    expect(p.indexOf("first")).toBeLessThan(p.indexOf("second"));
    expect(p).toContain('bun dev comment add t1 "<text>"');
  });
  test("caps by item count and chars, dropping oldest", () => {
    const list = [c(1, "one"), c(2, "two"), c(3, "three")];
    const byItems = generatePrompt(feature, "main", cfg({ promptMaxItems: 2 }), undefined, undefined, null, { task: list, quest: [] });
    expect(byItems).not.toContain(": one");
    expect(byItems).toContain(": three");
    const byChars = generatePrompt(feature, "main", cfg({ promptMaxChars: 6 }), undefined, undefined, null, { task: list, quest: [] });
    expect(byChars).toContain(": three");
    expect(byChars).not.toContain(": two");
  });
  test("includes quest comments", () => {
    const quest = { questId: "q1", goal: "g", addedConstraints: [], addedForbidden: [], knowledge: null };
    const p = generatePrompt(feature, "main", cfg(), quest, undefined, null, { task: [], quest: [{ ...c(1, "qnote"), ref_kind: "quest", ref_id: "q1" }] });
    expect(p).toContain("quest `q1`");
    expect(p).toContain("qnote");
  });
});

describe("agent-runner lifecycle comments", () => {
  let repo: string;
  beforeEach(() => {
    repo = makeRepo();
    saveTaskToStore(repo, DEFAULT_CONFIG, createBlankTask("t1", "Task one"));
  });
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  function setup(config: WomboConfig) {
    const state = new DaemonState(repo);
    new AgentRunner({ projectRoot: repo, config }, state);
    state.addAgent(createDaemonAgentState({ featureId: "t1", taskTitle: "T", branch: "b", baseBranch: "main", worktree: repo }));
    return state;
  }
  const list = () => listComments(repo, { kind: "task", id: "t1" });

  test("no comments unless autoLifecycle", () => {
    const state = setup(cfg());
    state.updateAgentStatus("t1", "installing");
    state.updateAgentStatus("t1", "merged");
    expect(list()).toEqual([]);
  });
  test("posts system comments for started, failed, retry, merged", () => {
    const state = setup(cfg({ autoLifecycle: true }));
    state.updateAgentStatus("t1", "installing");
    state.updateAgentStatus("t1", "failed", "Build failed, retries exhausted");
    state.updateAgentStatus("t1", "retry", "Retry 1/2");
    state.updateAgentStatus("t1", "merged");
    const bodies = list().map((x) => x.body);
    expect(bodies.length).toBe(4);
    expect(bodies[0]).toMatch(/started/);
    expect(bodies[1]).toContain("Build failed, retries exhausted");
    expect(bodies[2]).toContain("Retry 1/2");
    expect(bodies[3]).toMatch(/Merged/);
    for (const x of list()) { expect(x.role).toBe("system"); expect(x.author).toBe("woco"); }
  });
  test("comment failures only warn", () => {
    const state = new DaemonState(repo);
    new AgentRunner({ projectRoot: repo, config: cfg({ autoLifecycle: true }) }, state);
    state.addAgent(createDaemonAgentState({ featureId: "missing", taskTitle: "T", branch: "b", baseBranch: "main", worktree: repo }));
    const logs: string[] = [];
    state.on?.("evt:log" as any, (e: any) => logs.push(e.message));
    expect(() => state.updateAgentStatus("missing", "installing")).not.toThrow();
  });
});
