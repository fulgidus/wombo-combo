/**
 * analytics-integration.test.ts — retention and compatibility of agent
 * analytics across daemon sessions, restarts, reruns, cleanup and the CLI.
 *
 * Everything runs in temporary local roots with controlled (fake) agents;
 * no paid agents or remote services are used.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { DaemonState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import { AnalyticsStore, analyticsDir } from "../src/lib/analytics";
import { summarizeAnalytics } from "../src/lib/analytics-summary";
import { loadUsageRecords } from "../src/lib/token-usage";
import { loadConfig, type WomboConfig } from "../src/config";
import { cmdCleanup } from "../src/commands/cleanup";
import type { Task } from "../src/lib/tasks";

const REPO_ROOT = resolve(import.meta.dir, "..");
const SRC_ENTRY = join(REPO_ROOT, "src", "index.ts");
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/;

// ---------------------------------------------------------------------------
// Fixtures
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

class FixtureRunner extends AgentRunner {
  protected override enqueueLaunch(): void {}
  verify(id: string): Promise<void> {
    return (this as any).handleBuildVerification(id);
  }
  get monitorRef(): any {
    return (this as any).monitor;
  }
}

let root: string;
const toDestroy: Array<{ destroy(): void }> = [];

function git(...args: string[]): string {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

function commitFile(name: string, content: string): void {
  writeFileSync(join(root, name), content);
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", `add ${name}`);
}

/** A daemon "session": fresh state + runner attributing executions to `wave`. */
function session(wave: string, config = makeConfig(), loadState = false) {
  const state = new DaemonState(root);
  if (loadState) state.load();
  const runner = new FixtureRunner({ projectRoot: root, config, sessionId: wave }, state);
  toDestroy.push(runner, state);
  return { state, runner };
}

const store = () => new AnalyticsStore(root);

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "analytics-integration-"));
  git("init", "-q", "-b", "main");
  mkdirSync(join(root, ".wombo-combo", "tasks"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
  commitFile("base.txt", "base\n");
});

afterEach(() => {
  for (const d of toDestroy.splice(0)) {
    try {
      d.destroy();
    } catch {
      /* ignore */
    }
  }
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Retention across sessions, idle periods and restarts
// ---------------------------------------------------------------------------

describe("retention across sessions", () => {
  test("multiple daemon sessions accumulate distinct executions attributed to their waves", () => {
    const s1 = session("daemon-1");
    s1.runner.submitTask(makeTask("t1"));
    s1.state.updateAgentStatus("t1", "verified");
    s1.state.updateAgentStatus("t1", "merged");
    s1.runner.interruptAnalytics("daemon shutdown");

    const s2 = session("daemon-2");
    s2.runner.submitTask(makeTask("t1")); // same task, new session
    s2.runner.submitTask(makeTask("t2"));
    s2.state.updateAgentStatus("t2", "failed", "boom");

    const { records, diagnostics } = store().load();
    expect(diagnostics).toEqual([]);
    expect(records.length).toBe(3);
    expect(new Set(records.map((r) => r.execution_id)).size).toBe(3);

    const byWave = summarizeAnalytics(records, { groupBy: "wave" });
    expect(byWave.groups.map((g) => [g.key, g.metrics.executions])).toEqual([
      ["daemon-1", 1],
      ["daemon-2", 2],
    ]);
    const byTask = summarizeAnalytics(records, { groupBy: "task" });
    expect(byTask.groups.find((g) => g.key === "t1")!.metrics.executions).toBe(2);
  });

  test("work accepted after the daemon first became idle is still persisted", () => {
    const { state, runner } = session("daemon-1");
    runner.submitTask(makeTask("first"));
    state.updateAgentStatus("first", "verified");
    state.updateAgentStatus("first", "merged");
    expect(state.allComplete()).toBe(true); // idle: everything terminal

    runner.submitTask(makeTask("late"));
    state.updateAgentStatus("late", "verified");
    expect(store().load().records.map((r) => r.task_id).sort()).toEqual(["first", "late"]);
    expect(existsSync(join(root, ".wombo-combo", "history"))).toBe(false); // no history export involved
  });

  test("repeated task executions, ordinary retries and explicit reruns are counted separately", () => {
    const { state, runner } = session("daemon-1");
    runner.submitTask(makeTask("t1"));
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    state.updateAgentStatus("t1", "retry", "Retry 1/2: flake"); // ordinary retry
    state.updateAgentStatus("t1", "running");
    state.updateAgentStatus("t1", "failed", "boom");

    state.retryAgent("t1"); // explicit user rerun of a finished execution
    state.updateAgentStatus("t1", "queued", "Retry requested by user");
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    state.updateAgentStatus("t1", "verified");

    const s = summarizeAnalytics(store().load().records);
    expect(s.total.executions).toBe(2);
    expect(s.total.retries.total).toBe(1);
    expect(s.total.outcomes.failed).toBe(1);
    expect(s.total.outcomes.succeeded).toBe(1);
    expect(s.total.duration.samples).toBe(1);
  });

  test("restart recovery keeps execution and wave identity and does not duplicate executions", () => {
    const first = session("daemon-1");
    first.runner.submitTask(makeTask("t1"));
    first.state.updateAgentStatus("t1", "verified");
    const id = first.state.getAgent("t1")!.analytics!.execution_id;
    first.state.save();

    // "restart": new process state loaded from disk, new wave id
    const second = session("daemon-2", makeConfig(), true);
    second.runner.restoreAnalytics();
    expect(second.state.getAgent("t1")!.analytics!.execution_id).toBe(id);
    second.state.updateAgentStatus("t1", "merged");

    const records = store().load().records;
    expect(records.length).toBe(1);
    expect(records[0].wave_id).toBe("daemon-1");
    expect(records[0].merge_outcome).toBe("merged");
  });

  test("a recovered running agent that is reaped ends as stopped, not as a new execution", () => {
    const first = session("daemon-1");
    first.runner.submitTask(makeTask("t1"));
    first.state.updateAgentStatus("t1", "running");
    first.state.updateAgent("t1", { pid: 2_999_999 });
    first.state.save();

    const second = session("daemon-2", makeConfig(), true);
    second.runner.restoreAnalytics();
    second.runner.reapDeadProcesses();
    const records = store().load().records;
    expect(records.length).toBe(1);
    expect(records[0].outcome).toBe("stopped");
    // PID-only recovery cannot promise full token coverage
    expect(records[0].usage_coverage).toBe("none");
  });

  test("chain members are attributed separately with their own baselines", async () => {
    const { state, runner } = session("daemon-1");
    const fake = { agent: FAKE_AGENT_SENTINEL };
    runner.submitTask(makeTask("c1", fake), { hasChainSuccessor: true });
    state.updateAgent("c1", { worktree: root });
    runner.analytics.captureBaseline("c1");
    commitFile("m1.txt", "1\n2\n");
    await runner.verify("c1");

    runner.submitTask(makeTask("c2", { ...fake, depends_on: ["c1"] }));
    state.updateAgent("c2", { worktree: root });
    runner.analytics.captureBaseline("c2");
    commitFile("m2.txt", "a\nb\nc\n");
    runner.analytics.measure("c2");

    const recs = store().load().records;
    const c1 = recs.find((r) => r.task_id === "c1")!;
    const c2 = recs.find((r) => r.task_id === "c2")!;
    expect(c1.additions).toBe(2);
    expect(c2.additions).toBe(3);
    expect(c1.baseline_head).not.toBe(c2.baseline_head);
  });

  test("cancellations never invent duration or usage and stay out of successful samples", () => {
    const { state, runner } = session("daemon-1");
    runner.submitTask(makeTask("up"));
    runner.submitTask(makeTask("down", { depends_on: ["up"] }));
    runner.submitTask(makeTask("skipped"));
    runner.cancelAgent("skipped");
    state.updateAgentStatus("skipped", "failed", "Cancelled by user");
    state.updateAgentStatus("up", "failed", "boom");
    state.cancelDownstream("up");

    const s = summarizeAnalytics(store().load().records);
    expect(s.total.outcomes.stopped).toBe(2);
    expect(s.total.outcomes.failed).toBe(1);
    expect(s.total.duration.samples).toBe(0);
    expect(s.total.duration.mean_ms).toBeNull();
    expect(s.total.usage.samples).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cleanup retention
// ---------------------------------------------------------------------------

describe("cleanup retention", () => {
  test("woco cleanup removes disposable daemon state but keeps analytics (and history)", async () => {
    const { state, runner } = session("daemon-1");
    runner.submitTask(makeTask("t1"));
    state.updateAgentStatus("t1", "verified");
    state.save();
    mkdirSync(join(root, ".wombo-combo", "history"), { recursive: true });
    mkdirSync(join(root, ".wombo-combo", "logs"), { recursive: true });
    expect(existsSync(join(root, ".wombo-combo", "daemon-state.json"))).toBe(true);
    const before = readdirSync(analyticsDir(root));

    const log = spyOn(console, "log").mockImplementation(() => {});
    try {
      await cmdCleanup({ projectRoot: root, config: loadConfig(root), outputFmt: "json" });
    } finally {
      log.mockRestore();
    }

    expect(existsSync(join(root, ".wombo-combo", "daemon-state.json"))).toBe(false);
    expect(existsSync(join(root, ".wombo-combo", "logs"))).toBe(false);
    expect(readdirSync(analyticsDir(root))).toEqual(before);
    expect(store().load().records.length).toBe(1);
  });

  test("resetting daemon state finalizes but retains analytics", () => {
    const { state, runner } = session("daemon-1");
    runner.submitTask(makeTask("t1"));
    state.updateAgentStatus("t1", "running");
    state.reset();
    const recs = store().load().records;
    expect(recs.length).toBe(1);
    expect(recs[0].outcome).toBe("stopped");
  });
});

// ---------------------------------------------------------------------------
// Token and build accounting
// ---------------------------------------------------------------------------

describe("token and build accounting", () => {
  const step = (total: number) => ({
    type: "step_finish",
    sessionID: "s1",
    timestamp: Date.now(),
    part: { reason: "tool-calls", cost: 0.01, tokens: { total, input: total - 1, output: 1, reasoning: 0, cache: { read: 2, write: 3 } } },
  });

  test("analytics snapshots never duplicate usage.jsonl entries", () => {
    const { state, runner } = session("daemon-1");
    runner.submitTask(makeTask("t1", { quest: "q1" }));
    (runner as any).registerUsageContext("t1");
    for (const n of [10, 20, 30]) runner.monitorRef.tokenCollector.ingestEvent("t1", step(n));
    state.updateAgentStatus("t1", "verified");

    expect(loadUsageRecords(root).length).toBe(3);
    const rec = store().load().records[0];
    expect(rec.usage.record_count).toBe(3);
    expect(rec.usage.total_tokens).toBe(60);
    expect(rec.usage.cache_write).toBe(9);

    // restart + restore + merge must not append anything
    state.save();
    const again = session("daemon-2", makeConfig(), true);
    again.runner.restoreAnalytics();
    again.state.updateAgentStatus("t1", "merged");
    expect(loadUsageRecords(root).length).toBe(3);
    expect(store().load().records[0].usage.record_count).toBe(3);
  });

  test("build pass rate differs from overall verification success", async () => {
    const config = makeConfig({ tdd: { enabled: true, testCommand: "exit 1", strictTdd: false, testTimeout: 20_000 } });
    const { state, runner } = session("daemon-1", config);
    runner.submitTask(makeTask("t1"), { hasChainSuccessor: true });
    state.updateAgent("t1", { worktree: root });
    await runner.verify("t1"); // build passes, TDD fails -> not verified

    const s = summarizeAnalytics(store().load().records);
    expect(state.getAgent("t1")!.status).not.toBe("verified");
    expect(s.total.outcomes.succeeded).toBe(0);
    expect(s.total.builds.pass_rate).toBe(1);
    expect(s.total.builds.attempts).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// CLI formats and legacy compatibility
// ---------------------------------------------------------------------------

function cli(args: string[], format?: "json" | "toon") {
  const env: Record<string, string | undefined> = { ...process.env, NO_COLOR: "1" };
  delete env.WOMBO_OUTPUT;
  if (format) env.WOMBO_OUTPUT = format;
  const r = Bun.spawnSync(["bun", SRC_ENTRY, ...args], { cwd: root, env });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

describe("CLI compatibility", () => {
  function seedFromRunner() {
    const { state, runner } = session("daemon-1");
    runner.submitTask(makeTask("t1", { quest: "q1" }));
    state.updateAgentStatus("t1", "running");
    runner.analytics.recordProcessStart("t1");
    runner.analytics.recordUsage("t1", {
      task_id: "t1", quest_id: "q1", model: null, provider: null, harness: null,
      input_tokens: 5, output_tokens: 5, cache_read: 0, cache_write: 0, reasoning_tokens: 0,
      total_tokens: 10, cost: 0, is_final_step: true, timestamp: new Date().toISOString(),
    });
    state.updateAgentStatus("t1", "verified");
    state.updateAgentStatus("t1", "merged");
    runner.interruptAnalytics("done");
  }

  test("text, JSON and TOON analytics output agree and stay ANSI free in structured modes", () => {
    seedFromRunner();
    const text = cli(["usage", "--analytics"]);
    expect(text.code).toBe(0);
    expect(text.out).toContain("Agent Analytics");
    expect(text.out).toContain("1 succeeded");

    const json = cli(["usage", "--analytics", "--by", "quest"], "json");
    const parsed = JSON.parse(json.out);
    expect(parsed.total.executions).toBe(1);
    expect(parsed.groups[0].key).toBe("q1");
    expect(json.out).not.toMatch(ANSI);

    const toon = cli(["usage", "--analytics", "--by", "quest"], "toon");
    expect(toon.out).toContain("#ANALYTICS group_by=quest");
    expect(toon.out).toContain("group|q1|1");
    expect(toon.out).not.toMatch(ANSI);
  });

  test("legacy token-only usage is unchanged and independent of analytics", () => {
    seedFromRunner();
    writeFileSync(
      join(root, ".wombo-combo", "usage.jsonl"),
      JSON.stringify({
        task_id: "legacy", quest_id: null, model: "m", provider: "p", harness: "h",
        input_tokens: 7, output_tokens: 3, cache_read: 0, cache_write: 0, reasoning_tokens: 0,
        total_tokens: 10, cost: 0, is_final_step: true, timestamp: new Date().toISOString(),
      }) + "\n",
    );
    const r = cli(["usage"], "json");
    expect(JSON.parse(r.out)).toEqual({
      input_tokens: 7, output_tokens: 3, cache_read: 0, cache_write: 0,
      reasoning_tokens: 0, total_tokens: 10, total_cost: 0, record_count: 1,
    });
    const grouped = cli(["us", "--by", "task"], "json");
    expect(JSON.parse(grouped.out).groups[0].task).toBe("legacy");
  });

  test("historical usage/history is not backfilled into analytics", () => {
    writeFileSync(
      join(root, ".wombo-combo", "usage.jsonl"),
      JSON.stringify({
        task_id: "old", quest_id: null, model: null, provider: null, harness: null,
        input_tokens: 1, output_tokens: 1, cache_read: 0, cache_write: 0, reasoning_tokens: 0,
        total_tokens: 2, cost: 0, is_final_step: true, timestamp: "2026-01-01T00:00:00.000Z",
      }) + "\n",
    );
    mkdirSync(join(root, ".wombo-combo", "history"), { recursive: true });
    writeFileSync(join(root, ".wombo-combo", "history", "daemon-old.json"), JSON.stringify({ wave_id: "daemon-old", agents: [] }));
    const r = cli(["usage", "--analytics"], "json");
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).total.executions).toBe(0);
    expect(existsSync(analyticsDir(root))).toBe(false);
  });

  test("malformed analytics files are reported on stderr only", () => {
    seedFromRunner();
    writeFileSync(join(analyticsDir(root), "junk.json"), "{nope");
    const r = cli(["usage", "--analytics"], "json");
    expect(JSON.parse(r.out).total.executions).toBe(1);
    expect(r.err).toContain("junk.json");
  });

  test("snapshots on disk are valid JSON with no temp files left behind", () => {
    seedFromRunner();
    for (const f of readdirSync(analyticsDir(root))) {
      expect(f.endsWith(".json")).toBe(true);
      expect(() => JSON.parse(readFileSync(join(analyticsDir(root), f), "utf-8"))).not.toThrow();
    }
  });
});
