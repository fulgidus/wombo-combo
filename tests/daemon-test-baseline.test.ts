/**
 * daemon-test-baseline.test.ts — Quest test-baseline lifecycle in AgentRunner.
 *
 * Covers the baseline prerequisite wired into the daemon:
 *   - doLaunch captures (or reuses) the quest baseline before any real agent
 *     spawns, and the prompt carries the baseline summary
 *   - capture failures block the launch (no worktree, no agent process)
 *   - TDD-disabled quests, unquested tasks and fake agents never capture
 *   - snapshots are immutable across base-branch advances and daemon restarts
 *   - baselines are selected by task.quest, not the session quest id
 *   - handleBuildVerification and handleRetry enforce the snapshot
 *
 * No mocks: the agent binary is a tiny recording shell stub set as
 * config.agent.bin, so the real launchHeadless/retryHeadless run and the stub
 * records its argv plus which baseline snapshots existed at spawn time.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { AgentRunner } from "../src/daemon/agent-runner";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import { loadConfig, WOMBO_DIR, type WomboConfig } from "../src/config";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import { createBlankQuest, type Quest } from "../src/lib/quest";
import { saveQuest } from "../src/lib/quest-store";
import { removeTaskFromStore, saveTaskToStore } from "../src/lib/task-store";
import { loadFeatures, type Task } from "../src/lib/tasks";
import { ensureQuestTestBaseline } from "../src/lib/test-baseline-capture";
import { testBaselinePath, type TestBaseline } from "../src/lib/test-baseline";
import { worktreePath } from "../src/lib/worktree";

const TEST_TIMEOUT_MS = 60_000;
const FAILING_A = "tests/a.test.ts > fails";
const FAILING_B = "tests/b.test.ts > also fails";
const FAILING_C = "tests/c.test.ts > release fails";

const FAILING_TEST = (name: string) =>
  `import { test, expect } from "bun:test";\ntest("${name}", () => { expect(1).toBe(2); });\n`;

// ---------------------------------------------------------------------------
// Temp dirs, runners and states (all torn down in afterEach)
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];
const runners: AgentRunner[] = [];
const states: DaemonState[] = [];

afterEach(() => {
  for (const runner of runners.splice(0)) runner.destroy();
  for (const state of states.splice(0)) state.destroy();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
}

interface Ctx {
  /** Project root: git repo on main with tests/a.test.ts failing */
  root: string;
  /** Scratch dir holding the agent stub and its call log */
  aux: string;
  logDir: string;
  stubBin: string;
  config: WomboConfig;
}

interface AgentCall {
  args: string[];
  /** Baseline snapshot files that existed at the moment the agent spawned */
  snapshotsAtSpawn: string[];
}

/**
 * Create a project with a `.wombo-combo/config.json` (TDD on, `bun test`,
 * no-op install/build), a failing test on main, and an agent stub.
 */
function setupProject(): Ctx {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "daemon-baseline-root-")));
  const aux = realpathSync(mkdtempSync(join(tmpdir(), "daemon-baseline-aux-")));
  tempDirs.push(root, aux);

  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Baseline Test");
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileSync(join(root, "tests", "a.test.ts"), FAILING_TEST("fails"));
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");

  // Agent stub: named "opencode" so detectAgentType picks the opencode argv
  // layout. Records argv and the baseline snapshots present at spawn, then
  // sleeps (exec, so SIGTERM from monitor.killAll ends it).
  const logDir = join(aux, "log");
  const stubBin = join(aux, "bin", "opencode");
  mkdirSync(dirname(stubBin), { recursive: true });
  writeFileSync(
    stubBin,
    [
      "#!/usr/bin/env bash",
      `LOG='${logDir}'`,
      `mkdir -p "$LOG"`,
      `SNAPS=$(find '${join(root, WOMBO_DIR, "baselines")}' -name tests.json 2>/dev/null | sort)`,
      `printf '%s\\n' "$SNAPS" > "$LOG/snap-$$.tmp" && mv "$LOG/snap-$$.tmp" "$LOG/snap-$$"`,
      `printf '%s\\0' "$@" > "$LOG/argv-$$.tmp" && mv "$LOG/argv-$$.tmp" "$LOG/argv-$$"`,
      "exec sleep 120",
      "",
    ].join("\n")
  );
  chmodSync(stubBin, 0o755);

  mkdirSync(join(root, WOMBO_DIR), { recursive: true });
  writeFileSync(
    join(root, WOMBO_DIR, "config.json"),
    JSON.stringify(
      {
        baseBranch: "main",
        tdd: { enabled: true, testCommand: "bun test", testTimeout: 60_000 },
        install: { command: "true", timeout: 60_000 },
        build: { command: "true", timeout: 60_000 },
        agent: { bin: stubBin, name: "test-agent", configFiles: [] },
        portless: { enabled: false },
      },
      null,
      2
    )
  );
  const config = loadConfig(root);
  return { root, aux, logDir, stubBin, config };
}

function snapshotPath(root: string, questId: string): string {
  return testBaselinePath(root, questId);
}

function readSnapshot(root: string, questId: string): TestBaseline {
  return JSON.parse(readFileSync(snapshotPath(root, questId), "utf-8"));
}

function mainSha(root: string): string {
  return git(root, "rev-parse", "main");
}

/** Agent invocations recorded by the stub, in no particular order */
function agentCalls(ctx: Ctx): AgentCall[] {
  if (!existsSync(ctx.logDir)) return [];
  return readdirSync(ctx.logDir)
    .filter((f) => f.startsWith("argv-") && !f.endsWith(".tmp"))
    .map((f) => {
      const pid = f.slice("argv-".length);
      const args = readFileSync(join(ctx.logDir, f), "utf-8").split("\0");
      args.pop(); // trailing NUL leaves an empty tail
      const snaps = readFileSync(join(ctx.logDir, `snap-${pid}`), "utf-8")
        .split("\n")
        .filter((line) => line.length > 0);
      return { args, snapshotsAtSpawn: snaps };
    });
}

/** The prompt is the final argv element (small prompts go on the CLI) */
function promptOf(call: AgentCall): string {
  return call.args[call.args.length - 1];
}

async function waitFor(cond: () => boolean, label: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await Bun.sleep(20);
  }
}

function makeRunner(ctx: Ctx, config: WomboConfig = ctx.config): { runner: AgentRunner; state: DaemonState } {
  const state = new DaemonState(ctx.root);
  state.setBaseBranch("main");
  states.push(state);
  const runner = new AgentRunner({ projectRoot: ctx.root, config }, state);
  runners.push(runner);
  return { runner, state };
}

function makeTask(id: string, opts: { quest?: string; agent?: string } = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "Do the thing",
    status: "planned",
    completion: 0,
    difficulty: "medium",
    priority: "medium",
    effort: "PT1H",
    depends_on: [],
    started_at: null,
    ended_at: null,
    constraints: ["keep it small"],
    forbidden: [],
    references: [],
    notes: [],
    subtasks: [],
    ...(opts.quest ? { quest: opts.quest } : {}),
    ...(opts.agent ? { agent: opts.agent } : {}),
  };
}

function persistTask(ctx: Ctx, task: Task, config: WomboConfig = ctx.config): Task {
  saveTaskToStore(ctx.root, config, task);
  return task;
}

function makeQuest(id: string, baseBranch = "main", override: Record<string, unknown> = {}): Quest {
  const quest = createBlankQuest(id, `Quest ${id}`, `Goal for ${id}`, baseBranch);
  quest.status = "active";
  quest.constraints.override = override as Quest["constraints"]["override"];
  return quest;
}

/** Wait until the stub has been spawned `n` times */
async function waitForCalls(ctx: Ctx, n: number): Promise<AgentCall[]> {
  await waitFor(() => agentCalls(ctx).length >= n, `${n} agent launch(es)`);
  return agentCalls(ctx);
}

/** Attach a worktree on a new branch from `base` at a path under aux */
function addWorktree(ctx: Ctx, name: string, branch: string, base = "main"): string {
  const wt = join(ctx.aux, "worktrees", name);
  mkdirSync(dirname(wt), { recursive: true });
  git(ctx.root, "worktree", "add", "-q", "-b", branch, wt, base);
  return wt;
}

// ---------------------------------------------------------------------------
// Launch pipeline (doLaunch)
// ---------------------------------------------------------------------------

describe("quest test baseline: launch pipeline", () => {
  test(
    "real quest task: snapshot exists before launchHeadless and the prompt carries it",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q1"));
      const task = persistTask(ctx, makeTask("t1", { quest: "q1" }));
      const { runner, state } = makeRunner(ctx);

      runner.submitTask(task);
      const [call] = await waitForCalls(ctx, 1);

      // Snapshot was persisted before the agent process was spawned
      expect(call.snapshotsAtSpawn).toEqual([snapshotPath(ctx.root, "q1")]);

      const snap = readSnapshot(ctx.root, "q1");
      expect(snap.questId).toBe("q1");
      expect(snap.sourceBranch).toBe("main");
      expect(snap.commitSha).toBe(mainSha(ctx.root));
      expect(snap.results.passed).toBe(false);
      expect(snap.results.structured?.failingTestIds).toEqual([FAILING_A]);

      const prompt = promptOf(call);
      expect(prompt).toContain("Quest Test Baseline");
      expect(prompt).toContain(FAILING_A);

      expect(state.getAgent("t1")?.status).toBe("running");
    },
    TEST_TIMEOUT_MS
  );

  test(
    "baseline capture failure (install command fails): agent failed, no launch, no worktree",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q2"));
      const failingInstall: WomboConfig = {
        ...ctx.config,
        install: { ...ctx.config.install, command: "false" },
      };
      const task = persistTask(ctx, makeTask("t2", { quest: "q2" }), failingInstall);
      const { runner, state } = makeRunner(ctx, failingInstall);

      runner.submitTask(task);
      await waitFor(() => state.getAgent("t2")?.status === "failed", "t2 to fail");

      const agent = state.getAgent("t2")!;
      expect(agent.status).toBe("failed");
      expect(agent.error).toContain("Test baseline unavailable");
      expect(agent.error).toContain("Installing dependencies");

      expect(agentCalls(ctx)).toHaveLength(0);
      expect(existsSync(worktreePath(ctx.root, "t2", ctx.config))).toBe(false);
      expect(existsSync(snapshotPath(ctx.root, "q2"))).toBe(false);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "baseline capture failure (base branch does not exist): agent failed, no launch",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q3", "no-such-branch"));
      const task = persistTask(ctx, makeTask("t3", { quest: "q3" }));
      const { runner, state } = makeRunner(ctx);

      runner.submitTask(task);
      await waitFor(() => state.getAgent("t3")?.status === "failed", "t3 to fail");

      const agent = state.getAgent("t3")!;
      expect(agent.error).toContain("Test baseline unavailable");
      expect(agent.error).toContain("no-such-branch");
      expect(agentCalls(ctx)).toHaveLength(0);
      expect(existsSync(worktreePath(ctx.root, "t3", ctx.config))).toBe(false);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "quest overriding tdd.enabled=false: no snapshot captured, launch proceeds without baseline",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q4", "main", { tdd: { enabled: false } }));
      const task = persistTask(ctx, makeTask("t4", { quest: "q4" }));
      const { runner, state } = makeRunner(ctx);

      runner.submitTask(task);
      const [call] = await waitForCalls(ctx, 1);

      expect(call.snapshotsAtSpawn).toEqual([]);
      expect(existsSync(snapshotPath(ctx.root, "q4"))).toBe(false);
      expect(promptOf(call)).not.toContain("Quest Test Baseline");
      expect(state.getAgent("t4")?.status).toBe("running");
    },
    TEST_TIMEOUT_MS
  );

  test(
    "unquested task: no snapshot, launch proceeds, prompt has no baseline section",
    async () => {
      const ctx = setupProject();
      const task = persistTask(ctx, makeTask("t5"));
      const { runner, state } = makeRunner(ctx);

      runner.submitTask(task);
      const [call] = await waitForCalls(ctx, 1);

      expect(call.snapshotsAtSpawn).toEqual([]);
      expect(existsSync(join(ctx.root, WOMBO_DIR, "baselines"))).toBe(false);
      expect(promptOf(call)).not.toContain("Quest Test Baseline");
      expect(state.getAgent("t5")?.status).toBe("running");
    },
    TEST_TIMEOUT_MS
  );

  test(
    "fake agent in a TDD quest: no baseline capture",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q6"));
      const task = persistTask(ctx, makeTask("t6", { quest: "q6", agent: FAKE_AGENT_SENTINEL }));
      const { runner, state } = makeRunner(ctx);
      // Fake agents go straight to merge; keep the test away from git merges
      (runner as any).attemptMerge = async () => {};

      runner.submitTask(task);
      await waitFor(
        () => {
          const status = state.getAgent("t6")?.status;
          return status !== undefined && !["queued", "installing"].includes(status);
        },
        "t6 to leave installing"
      );

      expect(state.getAgent("t6")?.status).not.toBe("failed");
      expect(existsSync(join(ctx.root, WOMBO_DIR, "baselines"))).toBe(false);
      expect(existsSync(snapshotPath(ctx.root, "q6"))).toBe(false);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "reuse after main advances: snapshot is not recaptured across a daemon restart",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q7"));

      const first = makeRunner(ctx);
      const taskA = persistTask(ctx, makeTask("t7a", { quest: "q7" }));
      first.runner.submitTask(taskA);
      await waitForCalls(ctx, 1);

      const original = readSnapshot(ctx.root, "q7");
      const originalRaw = readFileSync(snapshotPath(ctx.root, "q7"), "utf-8");

      // Simulated daemon restart: stop the first runner, advance main
      first.runner.destroy();
      writeFileSync(join(ctx.root, "tests", "b.test.ts"), FAILING_TEST("also fails"));
      git(ctx.root, "add", "-A");
      git(ctx.root, "commit", "-q", "-m", "add failing b");
      const advanced = mainSha(ctx.root);
      expect(advanced).not.toBe(original.commitSha);

      const second = makeRunner(ctx);
      const taskB = persistTask(ctx, makeTask("t7b", { quest: "q7" }));
      second.runner.submitTask(taskB);
      const calls = await waitForCalls(ctx, 2);

      expect(readFileSync(snapshotPath(ctx.root, "q7"), "utf-8")).toBe(originalRaw);
      const reused = readSnapshot(ctx.root, "q7");
      expect(reused.commitSha).toBe(original.commitSha);
      expect(reused.capturedAt).toBe(original.capturedAt);

      // The second launch saw the original snapshot, not the advanced main
      const secondCall = calls[calls.length - 1];
      expect(secondCall.snapshotsAtSpawn).toEqual([snapshotPath(ctx.root, "q7")]);
      expect(promptOf(secondCall)).toContain(original.commitSha);
      expect(promptOf(secondCall)).not.toContain(FAILING_B);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "cross-quest isolation: baseline selected by task.quest, not the session quest id",
    async () => {
      const ctx = setupProject();
      // Quest q9 forks from a release branch with a different failing test
      git(ctx.root, "checkout", "-q", "-b", "release");
      writeFileSync(join(ctx.root, "tests", "c.test.ts"), FAILING_TEST("release fails"));
      git(ctx.root, "add", "-A");
      git(ctx.root, "commit", "-q", "-m", "release failing c");
      git(ctx.root, "checkout", "-q", "main");

      saveQuest(ctx.root, makeQuest("q8", "main"));
      saveQuest(ctx.root, makeQuest("q9", "release"));
      const task = persistTask(ctx, makeTask("t9", { quest: "q9" }));
      const { runner, state } = makeRunner(ctx);
      // Session quest points at the other quest
      state.setQuestId("q8");

      runner.submitTask(task);
      const [call] = await waitForCalls(ctx, 1);

      expect(existsSync(snapshotPath(ctx.root, "q8"))).toBe(false);
      const snap = readSnapshot(ctx.root, "q9");
      expect(snap.sourceBranch).toBe("release");
      expect(snap.commitSha).toBe(git(ctx.root, "rev-parse", "release"));
      // release forks from main, so it also fails a.test.ts; c is the marker
      expect([...(snap.results.structured?.failingTestIds ?? [])].sort()).toEqual([FAILING_A, FAILING_C].sort());

      const prompt = promptOf(call);
      expect(prompt).toContain(FAILING_C);
    },
    TEST_TIMEOUT_MS
  );
});

// ---------------------------------------------------------------------------
// Build verification (handleBuildVerification)
// ---------------------------------------------------------------------------

describe("quest test baseline: build verification", () => {
  test(
    "valid snapshot accepts pre-existing failures: agent verified and merge attempted",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q10"));
      persistTask(ctx, makeTask("t10", { quest: "q10" }));
      await ensureQuestTestBaseline({
        projectRoot: ctx.root,
        questId: "q10",
        baseBranch: "main",
        config: ctx.config,
      });

      const { runner, state } = makeRunner(ctx);
      let merges = 0;
      (runner as any).attemptMerge = async () => {
        merges++;
      };

      const wt = addWorktree(ctx, "t10", "feature/t10");
      state.addAgent(
        createDaemonAgentState({
          featureId: "t10",
          taskTitle: "Task t10",
          branch: "feature/t10",
          baseBranch: "main",
          worktree: wt,
          agentName: null,
        })
      );

      await (runner as any).handleBuildVerification("t10");

      const agent = state.getAgent("t10")!;
      expect(agent.status).toBe("verified");
      expect(agent.buildPassed).toBe(true);
      expect(merges).toBe(1);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "snapshot deleted: verification blocked, agent failed, no recapture",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q11"));
      persistTask(ctx, makeTask("t11", { quest: "q11" }));
      await ensureQuestTestBaseline({
        projectRoot: ctx.root,
        questId: "q11",
        baseBranch: "main",
        config: ctx.config,
      });
      rmSync(snapshotPath(ctx.root, "q11"));

      const { runner, state } = makeRunner(ctx);
      let merges = 0;
      (runner as any).attemptMerge = async () => {
        merges++;
      };

      const wt = addWorktree(ctx, "t11", "feature/t11");
      state.addAgent(
        createDaemonAgentState({
          featureId: "t11",
          taskTitle: "Task t11",
          branch: "feature/t11",
          baseBranch: "main",
          worktree: wt,
          agentName: null,
        })
      );

      await (runner as any).handleBuildVerification("t11");

      const agent = state.getAgent("t11")!;
      expect(agent.status).toBe("failed");
      expect(agent.error).toContain("verification blocked");
      expect(merges).toBe(0);
      expect(existsSync(snapshotPath(ctx.root, "q11"))).toBe(false);
    },
    TEST_TIMEOUT_MS
  );
});

// ---------------------------------------------------------------------------
// Retry (handleRetry)
// ---------------------------------------------------------------------------

describe("quest test baseline: session retry", () => {
  test(
    "retry with session: missing snapshot blocks retryHeadless; present snapshot allows it",
    async () => {
      const ctx = setupProject();
      saveQuest(ctx.root, makeQuest("q12"));
      persistTask(ctx, makeTask("t12", { quest: "q12" }));
      const worktree = join(ctx.aux, "retry-wt");
      mkdirSync(worktree, { recursive: true });

      const { runner, state } = makeRunner(ctx);
      const seed = (id: string) => {
        state.addAgent(
          createDaemonAgentState({
            featureId: id,
            taskTitle: `Task ${id}`,
            branch: `feature/${id}`,
            baseBranch: "main",
            worktree,
            agentName: null,
          })
        );
        state.updateAgent(id, { sessionId: "sess-retry-123" });
      };

      // Snapshot missing: retry is blocked
      seed("t12");
      (runner as any).handleRetry("t12");
      const blocked = state.getAgent("t12")!;
      expect(blocked.status).toBe("failed");
      expect(blocked.error).toContain("retry blocked");
      expect(agentCalls(ctx)).toHaveLength(0);

      // Snapshot present: retryHeadless runs with the original session
      await ensureQuestTestBaseline({
        projectRoot: ctx.root,
        questId: "q12",
        baseBranch: "main",
        config: ctx.config,
      });
      seed("t12-retry");
      persistTask(ctx, makeTask("t12-retry", { quest: "q12" }));
      (runner as any).handleRetry("t12-retry");

      const [call] = await waitForCalls(ctx, 1);
      expect(call.args).toContain("sess-retry-123");
      expect(state.getAgent("t12-retry")?.status).toBe("running");
    },
    TEST_TIMEOUT_MS
  );
});

// ---------------------------------------------------------------------------
// Known gaps
// ---------------------------------------------------------------------------

describe("quest test baseline: task file removed after launch", () => {
  /**
   * The quest branch quest/<id> exists, so the agent's baseBranch is
   * quest/<id>. Once the task file is gone, the quest must still be resolved
   * from that baseBranch and the snapshot must still be enforced.
   */
  async function launchWithQuestBranch(questId: string, taskId: string) {
    const ctx = setupProject();
    saveQuest(ctx.root, makeQuest(questId));
    git(ctx.root, "branch", `quest/${questId}`, "main");
    const task = persistTask(ctx, makeTask(taskId, { quest: questId }));
    const { runner, state } = makeRunner(ctx);

    runner.submitTask(task);
    const [call] = await waitForCalls(ctx, 1);
    expect(state.getAgent(taskId)?.baseBranch).toBe(`quest/${questId}`);
    expect(call.snapshotsAtSpawn).toEqual([snapshotPath(ctx.root, questId)]);

    removeTaskFromStore(ctx.root, ctx.config, taskId);
    expect(loadFeatures(ctx.root, ctx.config).tasks.find((t) => t.id === taskId)).toBeUndefined();
    return { ctx, runner, state };
  }

  test(
    "verification still requires the snapshot when the task file is gone: missing snapshot blocks",
    async () => {
      const { ctx, runner, state } = await launchWithQuestBranch("q14", "t14");
      rmSync(snapshotPath(ctx.root, "q14"));

      let merges = 0;
      (runner as any).attemptMerge = async () => {
        merges++;
      };
      await (runner as any).handleBuildVerification("t14");

      const agent = state.getAgent("t14")!;
      expect(agent.status).toBe("failed");
      expect(agent.error).toContain("verification blocked");
      expect(merges).toBe(0);
      expect(existsSync(snapshotPath(ctx.root, "q14"))).toBe(false);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "session retry still requires the snapshot when the task file is gone: missing snapshot blocks",
    async () => {
      const { ctx, runner, state } = await launchWithQuestBranch("q15", "t15");
      rmSync(snapshotPath(ctx.root, "q15"));
      state.updateAgent("t15", { sessionId: "sess-gap-15" });

      (runner as any).handleRetry("t15");

      const agent = state.getAgent("t15")!;
      expect(agent.status).toBe("failed");
      expect(agent.error).toContain("retry blocked");
      // Only the original launch was spawned; the retry never ran
      expect(agentCalls(ctx)).toHaveLength(1);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "task file gone but snapshot present: verification proceeds with the baseline and verifies",
    async () => {
      const { runner, state } = await launchWithQuestBranch("q16", "t16");

      let merges = 0;
      (runner as any).attemptMerge = async () => {
        merges++;
      };
      await (runner as any).handleBuildVerification("t16");

      const agent = state.getAgent("t16")!;
      expect(agent.status).toBe("verified");
      expect(agent.buildPassed).toBe(true);
      expect(merges).toBe(1);
    },
    TEST_TIMEOUT_MS
  );
});
