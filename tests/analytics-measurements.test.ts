/**
 * analytics-measurements.test.ts — build counters, baseline capture and
 * execution-scoped diff measurements wired through AgentRunner/DaemonState.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { DaemonState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { AnalyticsStore } from "../src/lib/analytics";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import type { WomboConfig } from "../src/config";
import type { Task } from "../src/lib/tasks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(over: Record<string, unknown> = {}): WomboConfig {
  return {
    baseBranch: "main",
    maxConcurrent: 4,
    model: null,
    git: { branchPrefix: "feature/", remote: "origin", mergeStrategy: "--no-ff" },
    agent: { name: "test-agent", provider: "anthropic" },
    build: { command: "echo ok", timeout: 20_000 },
    merge: { strategy: "merge", maxEscalation: "tier4" },
    browser: { enabled: false },
    tdd: { enabled: false },
    tui: {},
    quest: {},
    defaults: { maxConcurrent: 4, maxRetries: 2 },
    ...over,
  } as unknown as WomboConfig;
}

function makeTask(id: string, extra: Record<string, unknown> = {}): Task {
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
    ...extra,
  } as Task;
}

class NoLaunchRunner extends AgentRunner {
  protected override enqueueLaunch(): void {}
  verify(id: string): Promise<void> {
    return (this as any).handleBuildVerification(id);
  }
  build(id: string, wt: string) {
    return (this as any).trackedBuild(id, wt);
  }
  setConfig(c: WomboConfig) {
    (this as any).config = c;
  }
}

let root: string;
let repo: string;
let state: DaemonState;
let runner: NoLaunchRunner;
let store: AnalyticsStore;

function git(...args: string[]): string {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}
function commitFile(name: string, content: string): string {
  writeFileSync(join(repo, name), content);
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", `add ${name}`);
  return git("rev-parse", "HEAD");
}

function make(config = makeConfig()): void {
  state = new DaemonState(root);
  runner = new NoLaunchRunner({ projectRoot: root, config, sessionId: "w-meas" }, state);
  store = new AnalyticsStore(root);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "analytics-meas-root-"));
  mkdirSync(join(root, ".wombo-combo", "tasks"), { recursive: true });
  repo = mkdtempSync(join(tmpdir(), "analytics-meas-repo-"));
  git("init", "-q", "-b", "main");
  commitFile("base.txt", "base\n");
  make();
});

afterEach(() => {
  runner.destroy();
  state.destroy();
  rmSync(root, { recursive: true, force: true });
  rmSync(repo, { recursive: true, force: true });
});

function submit(id: string, ctx?: { hasChainSuccessor?: boolean }, extra: Record<string, unknown> = {}) {
  runner.submitTask(makeTask(id, extra), ctx);
  state.updateAgent(id, { worktree: repo });
  return state.getAgent(id)!;
}
const snap = (id: string) => store.get(state.getAgent(id)!.analytics!.execution_id)!;

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

describe("baseline capture", () => {
  test("captured once and preserved across ordinary retries", () => {
    submit("t1");
    const h0 = git("rev-parse", "HEAD");
    runner.analytics.captureBaseline("t1");
    expect(snap("t1").baseline_head).toBe(h0);

    commitFile("a.txt", "a\n");
    state.updateAgentStatus("t1", "retry", "Retry 1/2: boom");
    runner.analytics.captureBaseline("t1"); // second launch attempt
    expect(snap("t1").baseline_head).toBe(h0);
  });

  test("unavailable git leaves the baseline null and reports diagnostics", () => {
    const nonRepo = mkdtempSync(join(tmpdir(), "analytics-nogit-"));
    try {
      submit("t1");
      state.updateAgent("t1", { worktree: nonRepo });
      runner.analytics.captureBaseline("t1");
      expect(snap("t1").baseline_head).toBeNull();
      expect(runner.analytics.diagnostics.length).toBeGreaterThan(0);
      runner.analytics.measure("t1");
      const rec = snap("t1");
      expect(rec.additions).toBeNull();
      expect(rec.deletions).toBeNull();
      expect(rec.measurement_phase).toBe("unavailable");
    } finally {
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Build counters
// ---------------------------------------------------------------------------

describe("build counters", () => {
  test("fake-agent verification contributes zero build attempts but is measured", async () => {
    submit("t1", { hasChainSuccessor: true }, { agent: FAKE_AGENT_SENTINEL });
    runner.analytics.captureBaseline("t1");
    commitFile("work.txt", "1\n2\n3\n");
    await runner.verify("t1");
    const rec = snap("t1");
    expect(state.getAgent("t1")!.status).toBe("verified");
    expect(rec.build_attempts).toBe(0);
    expect(rec.build_passes).toBe(0);
    expect(rec.additions).toBe(3);
    expect(rec.deletions).toBe(0);
    expect(rec.measurement_phase).toBe("measured");
    expect(rec.measured_head).toBe(git("rev-parse", "HEAD"));
  });

  test("real verification counts the build result once", async () => {
    submit("t1", { hasChainSuccessor: true });
    runner.analytics.captureBaseline("t1");
    commitFile("w.txt", "x\n");
    await runner.verify("t1");
    const rec = snap("t1");
    expect(state.getAgent("t1")!.status).toBe("verified");
    expect(rec.build_attempts).toBe(1);
    expect(rec.build_passes).toBe(1);
    expect(rec.outcome).toBe("succeeded");
  });

  test("a failing build counts an attempt but no pass", async () => {
    make(makeConfig({ build: { command: "exit 1", timeout: 20_000 } }));
    submit("t1", { hasChainSuccessor: true });
    await runner.verify("t1");
    const rec = snap("t1");
    expect(rec.build_attempts).toBe(1);
    expect(rec.build_passes).toBe(0);
    expect(rec.outcome).toBe("running"); // retry scheduled, not failed
    expect(rec.retry_count).toBe(1);
  });

  test("passing build followed by failing TDD still counts as a build pass", async () => {
    make(makeConfig({ tdd: { enabled: true, testCommand: "exit 1", strictTdd: false, testTimeout: 20_000 } }));
    submit("t1", { hasChainSuccessor: true });
    await runner.verify("t1");
    const rec = snap("t1");
    expect(state.getAgent("t1")!.status).not.toBe("verified");
    expect(rec.build_attempts).toBe(1);
    expect(rec.build_passes).toBe(1);
    expect(rec.outcome).toBe("running");
    expect(rec.verified_at).toBeNull();
  });

  test("conflict-tier builds are counted exactly once per invocation", async () => {
    submit("t1");
    const r1 = await runner.build("t1", repo);
    expect(r1.passed).toBe(true);
    expect(snap("t1").build_attempts).toBe(1);
    expect(snap("t1").build_passes).toBe(1);

    make(makeConfig({ build: { command: "exit 3", timeout: 20_000 } }));
    submit("t2");
    const r2 = await runner.build("t2", repo);
    expect(r2.passed).toBe(false);
    expect(snap("t2").build_attempts).toBe(1);
    expect(snap("t2").build_passes).toBe(0);
  });

  test("build invocation exceptions are observable and never fabricate a pass", async () => {
    submit("t1");
    runner.setConfig({ ...makeConfig(), build: undefined } as unknown as WomboConfig);
    await expect(runner.build("t1", repo)).rejects.toBeDefined();
    const rec = snap("t1");
    expect(rec.build_attempts).toBe(1);
    expect(rec.build_passes).toBe(0);
    expect(runner.analytics.diagnostics.some((d) => d.includes("conflict-tier build"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Diff measurement
// ---------------------------------------------------------------------------

describe("diff measurement", () => {
  test("measurement is persisted before the verified event is emitted", async () => {
    submit("t1", { hasChainSuccessor: true }, { agent: FAKE_AGENT_SENTINEL });
    runner.analytics.captureBaseline("t1");
    commitFile("w.txt", "a\nb\n");
    let atEmit: number | null | undefined;
    state.subscribe((type, payload: any) => {
      if (type === "evt:agent-status-change" && payload.newStatus === "verified") {
        atEmit = store.get(state.getAgent("t1")!.analytics!.execution_id)?.additions;
      }
    });
    await runner.verify("t1");
    expect(atEmit).toBe(2);
  });

  test("chain members are measured against their own baselines before the successor advances", async () => {
    // member 1
    submit("c1", { hasChainSuccessor: true }, { agent: FAKE_AGENT_SENTINEL });
    runner.analytics.captureBaseline("c1");
    commitFile("m1.txt", "1\n2\n");
    await runner.verify("c1");

    // successor reuses the shared worktree from c1's tip
    submit("c2", undefined, { agent: FAKE_AGENT_SENTINEL, depends_on: ["c1"] });
    runner.analytics.captureBaseline("c2");
    expect(snap("c2").baseline_head).toBe(git("rev-parse", "HEAD"));
    commitFile("m2.txt", "a\nb\nc\nd\ne\n");

    // member 2 verified (terminal; attemptMerge would run, so measure directly)
    runner.analytics.measure("c2");

    expect(snap("c1").additions).toBe(2);
    expect(snap("c2").additions).toBe(5);
    expect(snap("c1").baseline_head).not.toBe(snap("c2").baseline_head);
    // c1 measurement unaffected by c2's later work (preserved through deferred merge)
    expect(snap("c1").measured_head).not.toBe(snap("c2").measured_head);
  });

  test("best-effort diff is captured before failure", () => {
    submit("t1");
    runner.analytics.captureBaseline("t1");
    commitFile("partial.txt", "p1\np2\n");
    state.updateAgentStatus("t1", "failed", "Build failed, retries exhausted");
    const rec = snap("t1");
    expect(rec.outcome).toBe("failed");
    expect(rec.additions).toBe(2);
    expect(rec.measurement_phase).toBe("measured");
  });

  test("best-effort diff is captured before reaping removes the worktree", () => {
    const agent = submit("t1");
    runner.analytics.captureBaseline("t1");
    commitFile("partial.txt", "p1\n");
    state.updateAgent("t1", { pid: 2_999_999 }); // dead PID
    state.updateAgentStatus("t1", "running");
    runner.reapDeadProcesses();
    expect(state.getAgent("t1")).toBeUndefined();
    const rec = store.get(agent.analytics!.execution_id)!;
    expect(rec.outcome).toBe("stopped");
    expect(rec.additions).toBe(1);
  });

  test("a valid measurement is never replaced by null when git later fails", () => {
    submit("t1");
    runner.analytics.captureBaseline("t1");
    commitFile("w.txt", "a\n");
    runner.analytics.measure("t1");
    expect(snap("t1").additions).toBe(1);

    rmSync(repo, { recursive: true, force: true });
    runner.analytics.measure("t1");
    runner.analytics.captureBestEffort("t1");
    const rec = snap("t1");
    expect(rec.additions).toBe(1);
    expect(rec.measurement_phase).toBe("measured");
    mkdirSync(repo, { recursive: true }); // for afterEach cleanup
  });

  test("ordinary verified diffs stay fixed when the base later changes", () => {
    submit("t1");
    runner.analytics.captureBaseline("t1");
    commitFile("w.txt", "a\n");
    runner.analytics.measure("t1");
    commitFile("later.txt", "1\n2\n3\n"); // e.g. conflict integration
    runner.analytics.captureBestEffort("t1");
    expect(snap("t1").additions).toBe(1);
  });

  test("tier-four replacement baseline and measurement keep the original duration", () => {
    submit("t1");
    runner.analytics.captureBaseline("t1");
    commitFile("orig.txt", "o1\no2\no3\n");
    runner.analytics.recordProcessStart("t1");
    state.updateAgentStatus("t1", "verified");
    runner.analytics.measure("t1");
    const verified = snap("t1");
    expect(verified.additions).toBe(3);
    const { verified_at, duration_ms } = verified;

    // tier 4: reset the worktree to the base, then re-implement
    git("reset", "--hard", "HEAD~1");
    runner.analytics.captureReplacementBaseline("t1");
    expect(snap("t1").baseline_head).toBe(git("rev-parse", "HEAD"));
    commitFile("repl.txt", "r1\n");
    runner.analytics.measure("t1", "replacement");

    const rec = snap("t1");
    expect(rec.measurement_phase).toBe("replacement");
    expect(rec.additions).toBe(1);
    expect(rec.deletions).toBe(0);
    expect(rec.verified_at).toBe(verified_at);
    expect(rec.duration_ms).toBe(duration_ms);
    expect(rec.outcome).toBe("succeeded");
  });
});
