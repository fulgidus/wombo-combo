/**
 * daemon-agent-shutdown.test.ts — the per-agent shutdown hook leaves no
 * orphaned worktree or branch after cancel, killAll, dead-PID reap and
 * exhausted retries, never removes a worktree a live chain successor needs,
 * and is idempotent. Uses real temp git repos; no agent process is spawned
 * except where noted (fake agent runner crash path).
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DaemonState, createDaemonAgentState, type InternalAgentState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { Scheduler } from "../src/daemon/scheduler";
import { DEFAULT_CONFIG, type WomboConfig } from "../src/config";
import { createWorktree, featureBranchName } from "../src/lib/worktree";
import { createBlankTask, loadFeatures, saveTaskToStore } from "../src/lib/tasks";
import { git, gitRaw, makeRepo } from "./helpers/git-repo";
import { useHermeticGitEnv } from "./helpers/post-merge-fixture";

let restoreEnv: () => void;
beforeAll(() => { restoreEnv = useHermeticGitEnv().restore; });
afterAll(() => restoreEnv());

const roots: string[] = [];
const runners: AgentRunner[] = [];
const states: DaemonState[] = [];
afterEach(() => {
  for (const r of runners.splice(0)) r.destroy();
  for (const s of states.splice(0)) s.destroy();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
    rmSync(`${root}-worktrees`, { recursive: true, force: true });
  }
});

const config = {
  ...DEFAULT_CONFIG,
  baseBranch: "main",
  build: { command: "echo ok", enabled: false },
  tdd: { enabled: false },
  defaults: { ...DEFAULT_CONFIG.defaults, maxConcurrent: 4, maxRetries: 2 },
  tasksDir: "tasks",
  archiveDir: "archive",
} as WomboConfig;

function makeEnv() {
  const root = makeRepo();
  roots.push(root);
  mkdirSync(join(root, ".wombo-combo", "tasks"), { recursive: true });
  const state = new DaemonState(root);
  states.push(state);
  const runner = new AgentRunner({ projectRoot: root, config }, state);
  runners.push(runner);
  return { root, state, runner };
}

type Env = ReturnType<typeof makeEnv>;

const branchExists = (root: string, id: string) =>
  gitRaw(root, "rev-parse", "--verify", "--quiet", featureBranchName(id, config)).status === 0;

/** Create a real worktree + branch for the task and register an agent for it. */
async function addAgentWithWorktree(
  env: Env,
  id: string,
  extra: Partial<InternalAgentState> & { maxRetries?: number; worktree?: string } = {},
): Promise<InternalAgentState> {
  const task = createBlankTask(id, `Task ${id}`);
  task.status = "in_progress";
  saveTaskToStore(env.root, config, task);
  const wt = extra.worktree ?? (await createWorktree(env.root, id, "main", config));
  const { maxRetries, worktree: _w, ...fields } = extra;
  const agent = createDaemonAgentState({
    featureId: id,
    taskTitle: `Task ${id}`,
    branch: featureBranchName(id, config),
    baseBranch: "main",
    worktree: wt,
    maxRetries,
  });
  Object.assign(agent, fields);
  env.state.addAgent(agent);
  return env.state.getAgent(id)!;
}

const taskStatus = (env: Env, id: string) =>
  loadFeatures(env.root, config).tasks.find((t) => t.id === id)?.status;

describe("fixture", () => {
  test("createWorktree makes a worktree and a branch", async () => {
    const env = makeEnv();
    const agent = await addAgentWithWorktree(env, "a", { status: "running" });
    expect(existsSync(agent.worktree)).toBe(true);
    expect(branchExists(env.root, "a")).toBe(true);
  });
});

describe("cancelAgent", () => {
  test("leaves no worktree or branch", async () => {
    const env = makeEnv();
    const agent = await addAgentWithWorktree(env, "a", { status: "running" });
    env.runner.cancelAgent("a");
    expect(existsSync(agent.worktree)).toBe(false);
    expect(branchExists(env.root, "a")).toBe(false);
  });

  test("running the hook twice is a no-op", async () => {
    const env = makeEnv();
    const agent = await addAgentWithWorktree(env, "a", { status: "running" });
    env.runner.cancelAgent("a");
    // Recreate the worktree: a second cancel must not touch it
    await createWorktree(env.root, "a", "main", config);
    env.runner.cancelAgent("a");
    expect(existsSync(agent.worktree)).toBe(true);
  });

  test("hook errors are contained (project root as worktree)", async () => {
    const env = makeEnv();
    await addAgentWithWorktree(env, "a", { status: "running", worktree: env.root });
    expect(() => env.runner.cancelAgent("a")).not.toThrow();
    expect(existsSync(join(env.root, ".git"))).toBe(true);
  });

  test("a worktree shared with a live chain successor is kept", async () => {
    const env = makeEnv();
    const head = await addAgentWithWorktree(env, "head", { status: "verified" });
    await addAgentWithWorktree(env, "tail", {
      status: "queued",
      worktree: head.worktree,
      dependsOn: ["head"],
    });
    env.runner.cancelAgent("head");
    expect(existsSync(head.worktree)).toBe(true);
  });

  test("scheduler cancel of a chain head removes the shared worktree once successors are failed", async () => {
    const env = makeEnv();
    const head = await addAgentWithWorktree(env, "head", { status: "running" });
    await addAgentWithWorktree(env, "tail", {
      status: "queued",
      worktree: head.worktree,
      dependsOn: ["head"],
    });
    const scheduler = new Scheduler({ projectRoot: env.root, config } as any, { state: env.state, runner: env.runner } as any);
    scheduler.cancelAgent("head");
    expect(env.state.getAgent("tail")!.status).toBe("failed");
    expect(existsSync(head.worktree)).toBe(false);
    expect(branchExists(env.root, "head")).toBe(false);
  });
});

describe("killAll", () => {
  test("removes worktrees and branches of active agents, including chains", async () => {
    const env = makeEnv();
    const a = await addAgentWithWorktree(env, "a", { status: "running" });
    const b = await addAgentWithWorktree(env, "b", { status: "installing" });
    const c = await addAgentWithWorktree(env, "c", { status: "retry" });
    await addAgentWithWorktree(env, "d", { status: "queued", worktree: a.worktree, dependsOn: ["a"] });
    await env.runner.killAll();
    for (const [id, wt] of [["a", a.worktree], ["b", b.worktree], ["c", c.worktree]] as const) {
      expect(existsSync(wt)).toBe(false);
      expect(branchExists(env.root, id)).toBe(false);
    }
  });

  test("agents stay in state and are still reaped afterwards", async () => {
    const env = makeEnv();
    await addAgentWithWorktree(env, "a", { status: "running", pid: 2_147_483_000 });
    await env.runner.killAll();
    expect(env.state.getAgent("a")).toBeDefined();
    env.runner.reapDeadProcesses();
    expect(env.state.getAgent("a")).toBeUndefined();
    expect(taskStatus(env, "a")).toBe("planned");
  });
});

describe("reapDeadProcesses", () => {
  test("dead pid: worktree and branch removed, task planned, agent dropped", async () => {
    const env = makeEnv();
    const agent = await addAgentWithWorktree(env, "a", { status: "running", pid: 2_147_483_000 });
    env.runner.reapDeadProcesses();
    expect(env.state.getAgent("a")).toBeUndefined();
    expect(taskStatus(env, "a")).toBe("planned");
    expect(existsSync(agent.worktree)).toBe(false);
    expect(branchExists(env.root, "a")).toBe(false);
  });

  test("exhausted retries: worktree and branch removed, task planned", async () => {
    const env = makeEnv();
    const agent = await addAgentWithWorktree(env, "a", { status: "retry", retries: 2, maxRetries: 2 });
    env.runner.reapDeadProcesses();
    expect(env.state.getAgent("a")).toBeUndefined();
    expect(taskStatus(env, "a")).toBe("planned");
    expect(existsSync(agent.worktree)).toBe(false);
    expect(branchExists(env.root, "a")).toBe(false);
  });

  test("a reaped task can be resubmitted and shut down again", async () => {
    const env = makeEnv();
    await addAgentWithWorktree(env, "a", { status: "running", pid: 2_147_483_000 });
    env.runner.reapDeadProcesses();
    const again = await addAgentWithWorktree(env, "a", { status: "queued", pid: 2_147_483_000 });
    // The relaunch moves the agent through installing/running: fresh hook
    env.state.updateAgentStatus("a", "running", "Agent spawned");
    env.runner.reapDeadProcesses();
    expect(env.state.getAgent("a")).toBeUndefined();
    expect(existsSync(again.worktree)).toBe(false);
  });

  test("a worktree shared with a live chain successor is kept", async () => {
    const env = makeEnv();
    const head = await addAgentWithWorktree(env, "head", { status: "running", pid: 2_147_483_000 });
    await addAgentWithWorktree(env, "tail", { status: "queued", worktree: head.worktree, dependsOn: ["head"] });
    env.runner.reapDeadProcesses();
    expect(env.state.getAgent("head")).toBeUndefined();
    expect(existsSync(head.worktree)).toBe(true);
  });
});

describe("give-up from the restart policy", () => {
  test("failed agent keeps its worktree and branch (unchanged behaviour)", async () => {
    const env = makeEnv();
    const agent = await addAgentWithWorktree(env, "a", { status: "running", retries: 2, maxRetries: 2 });
    (env.runner as any).rescueChainPredecessors = () => {};
    (env.runner as any).buildCallbacks().onError("a", "boom");
    expect(env.state.getAgent("a")!.status).toBe("failed");
    expect(existsSync(agent.worktree)).toBe(true);
    expect(branchExists(env.root, "a")).toBe(true);
  });
});

describe("destroy", () => {
  test("does not throw and keeps worktrees", async () => {
    const env = makeEnv();
    const agent = await addAgentWithWorktree(env, "a", { status: "running" });
    expect(() => env.runner.destroy()).not.toThrow();
    expect(existsSync(agent.worktree)).toBe(true);
    git(env.root, "status");
  });
});
