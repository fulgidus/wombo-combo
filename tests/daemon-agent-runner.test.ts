/**
 * daemon-agent-runner.test.ts — Unit tests for AgentRunner launch stagger queue.
 *
 * Tests the skipStagger flag added to enqueueLaunch/processLaunchQueue:
 *   - Fake-agent tasks bypass the 250ms inter-launch stagger
 *   - Real-agent tasks still respect the 250ms stagger
 *   - submitTask passes skipStagger=true for fake-agent, false for real agents
 */

import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import type { WomboConfig } from "../src/config";
import type { Task } from "../src/lib/tasks";
import { createDaemonAgentState } from "../src/daemon/state";
import { createBlankTask, loadFeatures, saveTaskToStore } from "../src/lib/tasks";
import type { PostMergeRequest } from "../src/lib/post-merge";
import { readJournal } from "../src/lib/post-merge";
import type { PostMergeResult } from "../src/lib/post-merge-types";
import { git, commitAll, writeRepoFile } from "./helpers/git-repo";
import { makeFakeGh } from "./helpers/fake-gh";
import { makePostMergeFixture, useHermeticGitEnv, type PostMergeFixture } from "./helpers/post-merge-fixture";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "agent-runner-test-"));
  // Create minimal .wombo-combo/tasks structure expected by DaemonState
  mkdirSync(join(dir, ".wombo-combo", "tasks"), { recursive: true });
  return dir;
}

function makeConfig(overrides: Partial<WomboConfig> = {}): WomboConfig {
  return {
    baseBranch: "main",
    maxConcurrent: 4,
    model: null,
    git: { branchPrefix: "feature/", remote: "origin", mergeStrategy: "--no-ff" },
    agent: { name: "test-agent", provider: "anthropic" },
    build: { command: "echo ok", enabled: false },
    merge: { strategy: "merge", maxEscalation: "tier4" },
    browser: { enabled: false },
    tdd: { enabled: false },
    tui: {},
    quest: {},
    defaults: { maxConcurrent: 4, maxRetries: 2 },
    ...overrides,
  } as WomboConfig;
}

function makeTask(id: string, agentName?: string): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    status: "planned",
    completion: 0,
    difficulty: "medium",
    priority: "medium",
    effort: "1h",
    depends_on: [],
    started_at: null,
    ended_at: null,
    constraints: [],
    forbidden: [],
    references: [],
    notes: [],
    subtasks: [],
    ...(agentName ? { agent: agentName } : {}),
  };
}

/**
 * Testable subclass of AgentRunner that exposes enqueueLaunch as public
 * and records which entries had skipStagger set.
 */
class TestableAgentRunner extends AgentRunner {
  public staggerLog: Array<{ skipStagger: boolean; startedAt: number }> = [];

  public testEnqueue(skipStagger: boolean): void {
    const self = this;
    this.enqueueLaunch(async () => {
      self.staggerLog.push({ skipStagger, startedAt: Date.now() });
    }, skipStagger);
  }
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AgentRunner launch stagger queue", () => {
  let tempDir: string;
  let state: DaemonState;
  let runner: TestableAgentRunner;

  beforeEach(() => {
    tempDir = makeTempDir();
    state = new DaemonState(tempDir);
    runner = new TestableAgentRunner(
      { projectRoot: tempDir, config: makeConfig() },
      state
    );
  });

  test("3.1: N fake-agent entries (skipStagger=true) all fire immediately, no waiting", async () => {
    const N = 5;
    for (let i = 0; i < N; i++) {
      runner.testEnqueue(true);
    }

    // All fire-and-forget callbacks should fire on the next microtask tick.
    // With skipStagger=true, no setTimeout delays are inserted.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(runner.staggerLog.length).toBe(N);
    // All start times should be clustered within 20ms of each other
    const times = runner.staggerLog.map((e) => e.startedAt);
    const spread = Math.max(...times) - Math.min(...times);
    expect(spread).toBeLessThan(20);
  });

  test("3.2: Real-agent entries enqueued while queue is running are staggered by ~250ms", async () => {
    // The stagger applies to items enqueued WHILE the queue is already processing.
    // Items enqueued synchronously (before the async loop starts) each get their own
    // processLaunchQueue call and are not staggered against each other.
    //
    // This test enqueues a second item from within the first item's fn,
    // which is the case where the stagger truly matters (re-entrant enqueue mid-flight).
    const timestamps: number[] = [];

    // Item 1: enqueues item 2 from within its body while queue is running
    runner.testEnqueue(false);
    // Small delay to let processQueue start processing item 1
    await new Promise((resolve) => setTimeout(resolve, 10));
    // Now enqueue item 2 while processQueue is "running" (technically isProcessing=false
    // again since item1 had an empty queue after it). We test the skip=true vs skip=false
    // at the semantic level: when skipStagger=true, the processor does NOT wait.

    // Reset log and test with an in-flight enqueue scenario
    runner.staggerLog.length = 0;

    // Use a custom TestableAgentRunner that enqueues a second item from within the first
    class ReentrantRunner extends AgentRunner {
      public log: number[] = [];
      private triggered = false;

      protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
        (this as any).launchQueue.push({ fn, skipStagger });
        if (!(this as any).isProcessingQueue) {
          (this as any).processLaunchQueue();
        }
      }

      testReentrant(skipStagger: boolean): void {
        const self = this;
        this.enqueueLaunch(async () => {
          self.log.push(Date.now());
          if (!self.triggered) {
            self.triggered = true;
            // Enqueue item 2 while queue is processing item 1
            self.enqueueLaunch(async () => {
              self.log.push(Date.now());
            }, skipStagger);
          }
        }, skipStagger);
      }
    }

    const reentrantState = new DaemonState(tempDir);
    const rr = new ReentrantRunner({ projectRoot: tempDir, config: makeConfig() }, reentrantState);

    // With skipStagger=false: second item should be delayed ~250ms after first
    rr.testReentrant(false);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(rr.log.length).toBe(2);
    const gap = rr.log[1] - rr.log[0];
    expect(gap).toBeGreaterThanOrEqual(200);
  });

  test("3.3a: submitTask with fake-agent sets skipStagger=true", () => {
    // We observe skipStagger indirectly: for a fake-agent task, after submitTask,
    // the launch queue entry should have skipStagger=true.
    // We verify this by checking that all N fire without the stagger delay.
    const N = 5;
    // Use a spy AgentRunner with overridden doLaunch to avoid real I/O
    const spyLog: Array<{ skipStagger: boolean }> = [];
    class SpyRunner extends AgentRunner {
      protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
        spyLog.push({ skipStagger });
        // Don't actually run the fn — we only care about the skipStagger value
      }
    }

    const spyRunner = new SpyRunner(
      { projectRoot: tempDir, config: makeConfig() },
      new DaemonState(tempDir)
    );

    const fakeTask = makeTask("fake-1", FAKE_AGENT_SENTINEL);
    spyRunner.submitTask(fakeTask);

    expect(spyLog.length).toBe(1);
    expect(spyLog[0].skipStagger).toBe(true);
  });

  test("3.3b: submitTask with real agent sets skipStagger=false", () => {
    const spyLog: Array<{ skipStagger: boolean }> = [];
    class SpyRunner extends AgentRunner {
      protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
        spyLog.push({ skipStagger });
      }
    }

    const spyRunner = new SpyRunner(
      { projectRoot: tempDir, config: makeConfig() },
      new DaemonState(tempDir)
    );

    const realTask = makeTask("real-1", "opencode");
    spyRunner.submitTask(realTask);

    expect(spyLog.length).toBe(1);
    expect(spyLog[0].skipStagger).toBe(false);
  });

  test("3.3c: submitTask with no agent name sets skipStagger=false", () => {
    const spyLog: Array<{ skipStagger: boolean }> = [];
    class SpyRunner extends AgentRunner {
      protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
        spyLog.push({ skipStagger });
      }
    }

    const spyRunner = new SpyRunner(
      { projectRoot: tempDir, config: makeConfig() },
      new DaemonState(tempDir)
    );

    const noAgentTask = makeTask("no-agent-1");
    spyRunner.submitTask(noAgentTask);

    expect(spyLog.length).toBe(1);
    expect(spyLog[0].skipStagger).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Chain worktree sharing: submitTask ctx + merge deferral
// ---------------------------------------------------------------------------

describe("AgentRunner chain ctx and merge deferral", () => {
  let tempDir: string;
  let state: DaemonState;
  let runner: AgentRunner;

  beforeEach(() => {
    tempDir = makeTempDir();
    state = new DaemonState(tempDir);
    runner = new AgentRunner({ projectRoot: tempDir, config: makeConfig() }, state);
  });

  test("submitTask threads sharedWorktree/streamIndex/hasChainSuccessor into agent state", () => {
    runner.submitTask(makeTask("chain-a"), {
      sharedWorktree: "/shared/wt",
      streamIndex: 2,
      hasChainSuccessor: true,
    });

    const agent = state.getAgent("chain-a");
    expect(agent).toBeDefined();
    expect(agent?.worktree).toBe("/shared/wt");
    expect(agent?.streamIndex).toBe(2);
    expect(agent?.hasChainSuccessor).toBe(true);

    // Default ctx: no sharing, no successor
    runner.submitTask(makeTask("solo"));
    const solo = state.getAgent("solo");
    expect(solo?.worktree).not.toBe("/shared/wt");
    expect(solo?.streamIndex).toBeNull();
    expect(solo?.hasChainSuccessor).toBe(false);
  });

  test("submitTask resolves per-task model from the routing table", () => {
    const routingRunner = new AgentRunner(
      {
        projectRoot: tempDir,
        config: makeConfig({
          modelRouting: { light: "glm-4-flash", heavy: "claude-opus-4" },
        }),
      },
      state
    );

    // trivial+low+PT15M → light → glm-4-flash
    routingRunner.submitTask({
      ...makeTask("light-task"),
      difficulty: "trivial",
      priority: "low",
      effort: "PT15M",
    });
    // very_hard+critical+P2D → heavy → claude-opus-4
    routingRunner.submitTask({
      ...makeTask("heavy-task"),
      difficulty: "very_hard",
      priority: "critical",
      effort: "P2D",
    });

    expect(state.getAgent("light-task")?.model).toBe("glm-4-flash");
    expect(state.getAgent("heavy-task")?.model).toBe("claude-opus-4");

    // No routing table → null (session model applies at launch time)
    routingRunner.submitTask(makeTask("unrouted-task"));
    expect(state.getAgent("unrouted-task")?.model).toBeNull();
  });

  test("non-terminal chain member defers merge; terminal member merges", async () => {
    const sharedWt = join(tempDir, ".wombo-combo", "chain-wt");

    // chain-a: fake agent, non-terminal member (scheduler flagged)
    runner.submitTask(makeTask("chain-a", FAKE_AGENT_SENTINEL), {
      sharedWorktree: sharedWt,
      streamIndex: 0,
      hasChainSuccessor: true,
    });
    // chain-b: fake agent, terminal member (same shared worktree)
    runner.submitTask(
      { ...makeTask("chain-b", FAKE_AGENT_SENTINEL), depends_on: ["chain-a"] },
      { sharedWorktree: sharedWt, streamIndex: 0, hasChainSuccessor: false }
    );

    let merges = 0;
    (runner as unknown as { attemptMerge: () => Promise<void> }).attemptMerge =
      async () => {
        merges++;
      };

    const verification = runner as unknown as {
      handleBuildVerification: (featureId: string) => Promise<void>;
    };

    // chain-a verifies but must NOT merge — it has a chain successor
    await verification.handleBuildVerification("chain-a");
    const a = state.getAgent("chain-a");
    expect(a?.status).toBe("verified");
    expect(a?.activity).toContain("deferring merge");
    expect(merges).toBe(0);

    // chain-b is the terminal — it merges (carrying the chain work)
    await verification.handleBuildVerification("chain-b");
    const b = state.getAgent("chain-b");
    expect(b?.status).toBe("verified");
    expect(merges).toBe(1);
  });
});


// ---------------------------------------------------------------------------
// Post-merge publication (changelog / PR / auto-push)
// ---------------------------------------------------------------------------

describe("AgentRunner post-merge publication", () => {
  let restoreEnv: () => void;
  const saved: Record<string, string | undefined> = {};
  beforeAll(() => {
    const h = useHermeticGitEnv();
    for (const k of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL"]) {
      saved[k] = process.env[k];
    }
    process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = "Test Author";
    process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL = "author@example.test";
    restoreEnv = () => {
      h.restore();
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    };
  });
  afterAll(() => restoreEnv());

  let fx: PostMergeFixture;
  const extraDirs: string[] = [];
  afterEach(() => {
    fx?.cleanup();
    while (extraDirs.length) rmSync(extraDirs.pop()!, { recursive: true, force: true });
  });

  interface Env {
    runner: AgentRunner;
    state: DaemonState;
    gh: ReturnType<typeof makeFakeGh>;
    logs: Array<{ level: string; message: string }>;
    ops: PostMergeRequest[];
    pushCalls: string[];
  }

  interface EnvOpts {
    prMode?: "open" | "draft" | "skip";
    prBaseBranch?: string | null;
    changelog?: boolean;
    autoPush?: boolean;
    pushResult?: boolean;
    coordinator?: "real" | "throw" | "capture";
    gh?: Parameters<typeof makeFakeGh>[0];
  }

  function makeEnv(o: EnvOpts = {}): Env {
    fx = makePostMergeFixture("integration");
    const config = fx.config({
      prMode: o.prMode ?? "open",
      ...(o.prBaseBranch !== undefined ? { prBaseBranch: o.prBaseBranch } : {}),
      ...(o.changelog !== undefined ? { changelog: o.changelog } : {}),
    });
    const state = new DaemonState(fx.repo);
    const gh = makeFakeGh(o.gh);
    const logs: Env["logs"] = [];
    state.subscribe((type, payload: any) => {
      if (type === "evt:log") logs.push({ level: payload.level, message: payload.message });
    });
    const ops: PostMergeRequest[] = [];
    const pushCalls: string[] = [];
    const mode = o.coordinator ?? "real";
    const runner = new AgentRunner(
      {
        projectRoot: fx.repo,
        config,
        postMergeDeps: { runner: gh.runner, now: () => "2026-03-20T12:00:00.000Z" },
        overrides: {
          pushBaseBranch: async (_root, branch) => {
            pushCalls.push(branch);
            return o.pushResult ?? true;
          },
          ...(mode === "throw"
            ? { runPostMerge: async () => { throw new Error("coordinator exploded"); } }
            : mode === "capture"
            ? {
                runPostMerge: async (req: PostMergeRequest): Promise<PostMergeResult> => {
                  ops.push(req);
                  return {
                    operationId: req.operation.operationId,
                    changelog: { status: "written" },
                    push: { status: "skipped" },
                    pr: { status: "skipped" },
                    warnings: [],
                  };
                },
              }
            : {}),
        },
      },
      state
    );
    if (o.autoPush) runner.setAutoPush(true);
    return { runner, state, gh, logs, ops, pushCalls };
  }

  function addVerifiedAgent(
    env: Env,
    id: string,
    extra: {
      file?: string;
      content?: string;
      worktree?: string;
      dependsOn?: string[];
      dependedOnBy?: string[];
      from?: string;
      keepWorktree?: boolean;
      hasChainSuccessor?: boolean;
      noBranch?: boolean;
      noTask?: boolean;
      verification?: any;
    } = {}
  ): string {
    const branch = `feature/${id}`;
    let wtPath = extra.worktree ?? join(tmpdir(), `wombo-nonexistent-${id}`);
    if (!extra.noBranch) {
      const wt = mkdtempSync(join(tmpdir(), "wombo-ar-wt-"));
      extraDirs.push(wt);
      git(fx.repo, "worktree", "add", "-q", "-b", branch, wt, extra.from ?? "integration");
      writeRepoFile(wt, extra.file ?? `src/${id}.ts`, extra.content ?? `// ${id}\n`);
      commitAll(wt, `feat: ${id}`);
      if (extra.keepWorktree) wtPath = wt;
      else git(fx.repo, "worktree", "remove", "--force", wt);
    }
    const agent = createDaemonAgentState({
      featureId: id,
      taskTitle: `Task ${id}`,
      branch,
      baseBranch: "integration",
      worktree: wtPath,
      dependsOn: extra.dependsOn,
      dependedOnBy: extra.dependedOnBy,
      hasChainSuccessor: extra.hasChainSuccessor,
    });
    agent.status = "verified";
    agent.buildPassed = true;
    if (extra.verification) agent.verification = extra.verification;
    env.state.addAgent(agent);
    if (!extra.noTask) {
      const task = createBlankTask(id, `Task ${id}`);
      task.status = "in_progress";
      saveTaskToStore(fx.repo, fx.config(), task);
    }
    return branch;
  }

  const attempt = (env: Env, id: string) =>
    (env.runner as unknown as { attemptMerge(id: string): Promise<void> }).attemptMerge(id);

  test("direct merge: changelog commit, push, PR, evt:log with URL; task done", async () => {
    const env = makeEnv();
    addVerifiedAgent(env, "a", {
      verification: { build: { status: "passed" }, unitTests: { status: "passed", total: 4, passed: 4 } },
    });

    await attempt(env, "a");

    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("merged");
    expect(agent.mergeCommitHash).toMatch(/^[0-9a-f]{40}$/);
    expect(loadFeatures(fx.repo, fx.config()).tasks.find((t) => t.id === "a")?.status).toBe("done");

    expect(env.gh.prs).toHaveLength(1);
    expect(env.gh.prs[0]!.body).toContain("passed (4/4 passed)");
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain("**a**: Task a");
    expect(git(fx.remote, "rev-parse", "integration")).toBe(git(fx.repo, "rev-parse", "integration"));

    const summary = env.logs.find((l) => l.message.startsWith("Post-merge a"));
    expect(summary?.level).toBe("info");
    expect(summary?.message).toContain("changelog written");
    expect(summary?.message).toContain("push pushed");
    expect(summary?.message).toContain("https://github.com/acme/widgets/pull/1");
    // the destination tip is the changelog commit sitting on the merge commit
    expect(git(fx.repo, "rev-parse", "integration^")).toBe(agent.mergeCommitHash!);
    expect(env.pushCalls).toEqual([]); // no second push
  });

  test("operation carries before/after SHAs and persisted verification evidence", async () => {
    const env = makeEnv({ coordinator: "capture" });
    addVerifiedAgent(env, "a", {
      verification: { build: { status: "passed" }, unitTests: { status: "skipped", reason: "x" } },
    });
    const tipBefore = git(fx.repo, "rev-parse", "integration");
    // the feature branch was created from integration, so the tip has not moved yet
    await attempt(env, "a");
    expect(env.ops).toHaveLength(1);
    const op = env.ops[0]!.operation;
    expect(op.beforeSha).toBe(tipBefore);
    expect(op.afterSha).toBe(env.state.getAgent("a")!.mergeCommitHash!);
    expect(op.destinationBranch).toBe("integration");
    expect(op.tasks).toEqual([
      {
        id: "a",
        title: "Task a",
        verification: { build: { status: "passed" }, unitTests: { status: "skipped", reason: "x" } },
      },
    ]);
  });

  test("legacy agents without evidence are reported with unknown test results", async () => {
    const env = makeEnv({ coordinator: "capture" });
    addVerifiedAgent(env, "old");
    await attempt(env, "old");
    expect(env.ops[0]!.operation.tasks[0]!.verification).toEqual({ build: { status: "passed" } });
  });

  test("skip mode: changelog only, no PR, no push, no gh", async () => {
    const env = makeEnv({ prMode: "skip" });
    addVerifiedAgent(env, "a");
    await attempt(env, "a");
    expect(env.state.getAgent("a")!.status).toBe("merged");
    expect(env.gh.calls.filter((c) => c.command === "gh")).toHaveLength(0);
    expect(env.gh.calls.some((c) => c.command === "git" && c.args[0] === "push")).toBe(false);
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain("**a**");
    expect(env.pushCalls).toEqual([]);
  });

  test("skip mode keeps an explicit auto-push and inspects its boolean result", async () => {
    const ok = makeEnv({ prMode: "skip", autoPush: true, pushResult: true });
    addVerifiedAgent(ok, "a");
    await attempt(ok, "a");
    expect(ok.pushCalls).toEqual(["integration"]);
    expect(ok.logs.some((l) => l.message.includes("Auto-pushed integration"))).toBe(true);
    fx.cleanup();

    const bad = makeEnv({ prMode: "skip", autoPush: true, pushResult: false });
    addVerifiedAgent(bad, "b");
    await attempt(bad, "b");
    expect(bad.pushCalls).toEqual(["integration"]);
    const warn = bad.logs.find((l) => l.level === "warn" && l.message.includes("Auto-push"));
    expect(warn?.message).toContain("failed");
    expect(bad.state.getAgent("b")!.status).toBe("merged"); // a failed push never fails the agent
  });

  test("auto-push happens after the changelog commit in skip mode", async () => {
    const env = makeEnv({ prMode: "skip", autoPush: true });
    let tipAtPush: string | null = null;
    (env.runner as any).pushBaseFn = async () => {
      tipAtPush = git(fx.repo, "log", "-1", "--format=%s", "integration");
      return true;
    };
    addVerifiedAgent(env, "a");
    await attempt(env, "a");
    expect(tipAtPush).toContain("docs(changelog)");
  });

  test("open mode with auto-push does not push twice", async () => {
    const env = makeEnv({ prMode: "open", autoPush: true });
    addVerifiedAgent(env, "a");
    await attempt(env, "a");
    expect(env.gh.calls.filter((c) => c.command === "git" && c.args[0] === "push")).toHaveLength(1);
    expect(env.pushCalls).toEqual([]);
  });

  test("open mode falls back to the explicit auto-push when publication cannot push", async () => {
    // PR target equals the destination: the coordinator refuses, so the requested push still happens
    const env = makeEnv({ prMode: "open", prBaseBranch: "integration", autoPush: true });
    addVerifiedAgent(env, "a");
    await attempt(env, "a");
    expect(env.gh.prs).toHaveLength(0);
    expect(env.pushCalls).toEqual(["integration"]);
    const log = env.logs.find((l) => l.message.startsWith("Post-merge a"));
    expect(log?.message).toContain("PR skipped");
    expect(env.logs.some((l) => l.level === "warn" && l.message.includes("postMerge.prBaseBranch"))).toBe(true);
  });

  test("publication errors never fail the agent or trigger a coding retry", async () => {
    const env = makeEnv({ coordinator: "throw" });
    addVerifiedAgent(env, "a");
    await attempt(env, "a");
    const agent = env.state.getAgent("a")!;
    expect(agent.status).toBe("merged");
    expect(agent.retries).toBe(0);
    expect(agent.error).toBeNull();
    expect(env.logs.some((l) => l.level === "warn" && l.message.includes("coordinator exploded"))).toBe(true);
  });

  test("missing gh is logged as a warning while the merge stays successful", async () => {
    const env = makeEnv({ gh: { missing: true }, prBaseBranch: null });
    addVerifiedAgent(env, "a");
    await attempt(env, "a");
    expect(env.state.getAgent("a")!.status).toBe("merged");
    expect(env.logs.some((l) => l.level === "warn" && l.message.includes("GitHub CLI"))).toBe(true);
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain("**a**");
  });

  test("failed merges do not publish", async () => {
    const env = makeEnv({ coordinator: "capture" });
    addVerifiedAgent(env, "a", { noBranch: true, noTask: true });
    await attempt(env, "a");
    expect(env.state.getAgent("a")!.status).toBe("failed");
    expect(env.ops).toHaveLength(0);
    expect(env.gh.calls.filter((c) => c.command === "gh")).toHaveLength(0);
  });

  test("deferred nonterminal chain members never publish; the terminal reports merged predecessors", async () => {
    const env = makeEnv({ coordinator: "capture" });
    addVerifiedAgent(env, "p", { worktree: "/tmp/wombo-chain-ar", dependedOnBy: ["t"], hasChainSuccessor: true });
    addVerifiedAgent(env, "t", { worktree: "/tmp/wombo-chain-ar", dependsOn: ["p"], from: "feature/p" });

    const verification = env.runner as unknown as { handleBuildVerification(id: string): Promise<void> };
    env.state.updateAgent("p", { agentName: FAKE_AGENT_SENTINEL });
    await verification.handleBuildVerification("p");
    expect(env.ops).toHaveLength(0);

    await attempt(env, "t");
    expect(env.ops).toHaveLength(1);
    expect(env.ops[0]!.operation.tasks.map((t) => t.id).sort()).toEqual(["p", "t"]);
    expect(env.state.getAgent("p")!.status).toBe("merged");
    expect(env.state.getAgent("p")!.mergeCommitHash).toBe(env.state.getAgent("t")!.mergeCommitHash);
  });

  test("fake-agent verification is recorded as skipped, never passed", async () => {
    const env = makeEnv({ coordinator: "capture" });
    addVerifiedAgent(env, "f");
    env.state.updateAgent("f", { agentName: FAKE_AGENT_SENTINEL });
    (env.runner as unknown as { attemptMerge: () => Promise<void> }).attemptMerge = async () => {};
    await (env.runner as unknown as { handleBuildVerification(id: string): Promise<void> }).handleBuildVerification("f");
    const v = env.state.getAgent("f")!.verification!;
    expect(v.build?.status).toBe("skipped");
    expect(v.unitTests?.status).toBe("skipped");
    expect(v.browser?.status).toBe("skipped");
    expect(JSON.stringify(v)).not.toContain("passed");
  });

  test("full verification stores a compact summary (tests skipped when TDD is off, no raw logs)", async () => {
    const env = makeEnv({ coordinator: "capture" });
    const wt = mkdtempSync(join(tmpdir(), "wombo-ar-verify-"));
    extraDirs.push(wt);
    addVerifiedAgent(env, "v", { worktree: wt, noBranch: true });
    (env.runner as any).config.build = { command: "echo SECRET-BUILD-LOG", enabled: true, timeout: 20_000 };
    (env.runner as any).attemptMerge = async () => {};
    await (env.runner as unknown as { handleBuildVerification(id: string): Promise<void> }).handleBuildVerification("v");
    const v = env.state.getAgent("v")!.verification!;
    expect(v.build?.status).toBe("passed");
    expect(v.unitTests?.status).toBe("skipped");
    expect(JSON.stringify(v)).not.toContain("SECRET-BUILD-LOG");
  });

  test("concurrent merges stay serialized and share one cumulative PR (no nested queue acquisition)", async () => {
    const env = makeEnv();
    addVerifiedAgent(env, "a");
    addVerifiedAgent(env, "b");
    await Promise.race([
      Promise.all([attempt(env, "a"), attempt(env, "b")]),
      new Promise((_, rej) => setTimeout(() => rej(new Error("deadlock")), 60_000)),
    ]);
    expect(env.state.getAgent("a")!.status).toBe("merged");
    expect(env.state.getAgent("b")!.status).toBe("merged");
    expect(env.gh.prs).toHaveLength(1);
    expect(env.gh.prs[0]!.body).toContain("`a`");
    expect(env.gh.prs[0]!.body).toContain("`b`");
    expect(Object.keys(readJournal(fx.repo).operations)).toHaveLength(2);
  });

  test("conflict escalation (tier 2 auto-resolve) uses the same post-merge hook", async () => {
    const env = makeEnv({ coordinator: "capture" });
    // shared file on integration, committed through a temporary worktree (the user's checkout stays on main)
    const seedWt = mkdtempSync(join(tmpdir(), "wombo-ar-seed-"));
    extraDirs.push(seedWt);
    git(fx.repo, "worktree", "add", "-q", seedWt, "integration");
    writeRepoFile(seedWt, "conf.txt", "head\nvalue  =  1\ntail\n");
    commitAll(seedWt, "seed conf");
    git(fx.repo, "worktree", "remove", "--force", seedWt);

    addVerifiedAgent(env, "w", { file: "conf.txt", content: "head\nvalue = 1\ntail\n", keepWorktree: true });
    const transitions: string[] = [];
    env.state.subscribe((type, payload: any) => {
      if (type === "evt:agent-status-change") transitions.push(`${payload.newStatus}:${payload.detail ?? ""}`);
    });

    // integration moves on with a whitespace-different edit of the same line
    const moveWt = mkdtempSync(join(tmpdir(), "wombo-ar-move-"));
    extraDirs.push(moveWt);
    git(fx.repo, "worktree", "add", "-q", moveWt, "integration");
    writeRepoFile(moveWt, "conf.txt", "head\nvalue   =   1\ntail\n");
    commitAll(moveWt, "base moves");
    git(fx.repo, "worktree", "remove", "--force", moveWt);

    await attempt(env, "w");

    expect(env.state.getAgent("w")!.status).toBe("merged");
    // it really went through conflict handling and a conflict-escalation success label
    expect(transitions.some((t) => t.startsWith("resolving_conflict"))).toBe(true);
    expect(transitions.some((t) => t.startsWith("merged:MERGED after "))).toBe(true);
    expect(env.ops).toHaveLength(1);
    expect(env.ops[0]!.operation.tasks.map((t) => t.id)).toEqual(["w"]);
    expect(env.ops[0]!.operation.afterSha).toBe(env.state.getAgent("w")!.mergeCommitHash!);
  });

  test("every handleMergeSuccess call site awaits it (normal path and all escalation tiers)", () => {
    const daemonDir = join(import.meta.dir, "..", "src", "daemon");
    // call sites moved into runner/ with the conflict-resolution extraction (ctx.handleMergeSuccess)
    const src = ["agent-runner.ts", "runner/conflict-resolution.ts", "runner/conflict-tiers.ts"]
      .map((f) => readFileSync(join(daemonDir, f), "utf-8"))
      .join("\n");
    const calls = [...src.matchAll(/^.*(?:this|ctx)\.handleMergeSuccess\(.*$/gm)].map((m) => m[0]);
    expect(calls.length).toBeGreaterThanOrEqual(6);
    for (const line of calls) expect(line).toMatch(/await (this|ctx)\.handleMergeSuccess\(/);
    // merges are always captured through the SHA-recording helper
    expect(src.match(/await mergeBranch\(/g)).toHaveLength(1);
  });
});
