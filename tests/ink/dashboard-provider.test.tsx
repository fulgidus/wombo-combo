import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DashboardMetricsProvider,
  type DashboardDaemonClient,
  type TimerApi,
} from "../../src/ink/dashboard-provider";
import {
  useDashboardMetrics,
  type DashboardMetricsValue,
} from "../../src/ink/dashboard-metrics-context";
import type { ConnectionState } from "../../src/daemon/client";
import type { DaemonAgentState, EvtStateSnapshot, EventMap, EventType } from "../../src/daemon/protocol";
import type { AgentStatus } from "../../src/daemon/agent-status";

const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
const wait = (ms = 25) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeTimers implements TimerApi {
  intervals = new Map<number, { fn: () => void; ms: number }>();
  timeouts = new Map<number, () => void>();
  created = { intervals: 0, timeouts: 0 };
  private id = 0;
  setInterval(fn: () => void, ms: number) {
    const h = ++this.id;
    this.created.intervals++;
    this.intervals.set(h, { fn, ms });
    return h;
  }
  clearInterval(h: unknown) {
    this.intervals.delete(h as number);
  }
  setTimeout(fn: () => void) {
    const h = ++this.id;
    this.created.timeouts++;
    this.timeouts.set(h, fn);
    return h;
  }
  clearTimeout(h: unknown) {
    this.timeouts.delete(h as number);
  }
  tick() {
    for (const { fn } of [...this.intervals.values()]) fn();
  }
  flush() {
    const fns = [...this.timeouts.values()];
    this.timeouts.clear();
    for (const fn of fns) fn();
  }
}

class FakeClient implements DashboardDaemonClient {
  handlers = new Map<string, Set<(p: any) => void>>();
  stateHandlers = new Set<(s: ConnectionState) => void>();
  calls: string[] = [];
  commands: string[] = [];
  state: ConnectionState = "connected";
  snapshot: EvtStateSnapshot | null = null;
  on<T extends EventType>(type: T, handler: (p: EventMap[T]) => void) {
    this.calls.push(`on:${type}`);
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler as any);
    return () => set!.delete(handler as any);
  }
  onStateChange(h: (s: ConnectionState) => void) {
    this.calls.push("onStateChange");
    this.stateHandlers.add(h);
    return () => this.stateHandlers.delete(h);
  }
  getLastSnapshot() {
    this.calls.push("getLastSnapshot");
    return this.snapshot;
  }
  getState() {
    return this.state;
  }
  sendCommand(type: any) {
    this.calls.push(`cmd:${type}`);
    this.commands.push(type);
    return 1;
  }
  emit<T extends EventType>(type: T, payload: EventMap[T]) {
    for (const h of [...(this.handlers.get(type) ?? [])]) h(payload);
  }
  setState(s: ConnectionState) {
    this.state = s;
    for (const h of [...this.stateHandlers]) h(s);
  }
  listenerCount() {
    let n = this.stateHandlers.size;
    for (const s of this.handlers.values()) n += s.size;
    return n;
  }
}

function agent(id: string, status: AgentStatus, extra: Partial<DaemonAgentState> = {}): DaemonAgentState {
  return {
    featureId: id, taskTitle: id, branch: `f/${id}`, baseBranch: "main", worktree: "/x", status,
    pid: null, sessionId: null, activity: null, activityUpdatedAt: null, retries: 0, maxRetries: 3,
    startedAt: null, completedAt: null, buildPassed: null, error: null, effortEstimateMs: null,
    streamIndex: null, dependsOn: [], dependedOnBy: [], agentName: null, agentType: null,
    pendingQuestions: [], tokenUsage: null, ...extra,
  };
}

function snap(agents: DaemonAgentState[], maxConcurrent = 2): EvtStateSnapshot {
  return {
    scheduler: {
      status: "running", maxConcurrent, model: null, baseBranch: "main", questId: "q1", startedAt: null,
      pinnedTasks: [], skippedTasks: [], totalProcessed: 0, totalCompleted: 0, totalFailed: 0,
    },
    agents,
    uptime: 1,
  };
}

function streams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 100;
  (stdout as any).rows = 30;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  return { stdin, stdout };
}

let root: string;
let usageFile: string;
let clockMs = T0;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "dash-prov-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  usageFile = join(root, ".wombo-combo", "usage.jsonl");
  clockMs = T0;
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const usageLine = (task: string, quest: string | null, tokens: number) =>
  JSON.stringify({
    task_id: task, quest_id: quest, model: null, provider: null, harness: null,
    input_tokens: tokens, output_tokens: 0, cache_read: 0, cache_write: 0, reasoning_tokens: 0,
    total_tokens: tokens, cost: 0, is_final_step: false, timestamp: "2026-01-01T00:00:00.000Z",
  }) + "\n";

interface Harness {
  latest: () => DashboardMetricsValue | null;
  rerender: (props: { projectRoot?: string; client?: FakeClient | null }) => void;
  unmount: () => void;
  renders: () => number;
}

function mount(opts: {
  client?: FakeClient | null;
  timers: FakeTimers;
  projectRoot?: string;
  loadTaskQuests?: (root: string) => ReadonlyMap<string, string | null>;
}): Harness {
  const { stdin, stdout } = streams();
  let latest: DashboardMetricsValue | null = null;
  let renders = 0;
  const Probe = () => {
    latest = useDashboardMetrics();
    renders++;
    return null;
  };
  const tree = (p: { projectRoot?: string; client?: FakeClient | null }) => (
    <DashboardMetricsProvider
      projectRoot={p.projectRoot ?? opts.projectRoot ?? root}
      daemonClient={p.client === undefined ? opts.client : p.client}
      now={() => clockMs}
      timers={opts.timers}
      loadTaskQuests={opts.loadTaskQuests ?? (() => new Map())}
    >
      <Probe />
    </DashboardMetricsProvider>
  );
  const inst = render(tree({}), { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false });
  return {
    latest: () => latest,
    rerender: (p) => inst.rerender(tree(p)),
    unmount: () => inst.unmount(),
    renders: () => renders,
  };
}

// ---------------------------------------------------------------------------

describe("DashboardMetricsProvider", () => {
  test("context is null without a provider", () => {
    // sanity: consumer hook default
    let seen: unknown = "unset";
    const Probe = () => {
      seen = useDashboardMetrics();
      return null;
    };
    const { stdin, stdout } = streams();
    const inst = render(<Probe />, { stdout, stdin, debug: true, patchConsole: false });
    inst.unmount();
    expect(seen).toBeNull();
  });

  test("without a daemon client: unavailable connection, historical quest usage, incremental reads", async () => {
    writeFileSync(usageFile, usageLine("t1", "qa", 100) + usageLine("t2", "qb", 40));
    const timers = new FakeTimers();
    const h = mount({ timers });
    await wait();
    const v = h.latest()!;
    expect(v.connection).toBe("unavailable");
    expect(v.usageAvailable).toBe(true);
    expect(v.quests.map((q) => [q.questId, q.totals.total_tokens])).toEqual([["qa", 100], ["qb", 40]]);
    expect(v.state.counts.total).toBe(0);

    appendFileSync(usageFile, usageLine("t3", "qb", 100));
    clockMs += 1000;
    timers.tick();
    await wait();
    expect(h.latest()!.quests.map((q) => [q.questId, q.totals.total_tokens])).toEqual([["qb", 140], ["qa", 100]]);
    h.unmount();
  });

  test("owns exactly one sampling interval at the configured period", async () => {
    const timers = new FakeTimers();
    const h = mount({ client: new FakeClient(), timers });
    await wait();
    expect(timers.created.intervals).toBe(1);
    expect([...timers.intervals.values()][0]!.ms).toBe(1000);
    h.unmount();
  });

  test("subscribes before requesting state, bootstraps from the cached snapshot", async () => {
    const client = new FakeClient();
    client.snapshot = snap([agent("a", "running"), agent("b", "merged")]);
    const h = mount({ client, timers: new FakeTimers() });
    await wait();
    const firstGet = client.calls.indexOf("getLastSnapshot");
    const cmd = client.calls.indexOf("cmd:cmd:get-state");
    expect(firstGet).toBeGreaterThan(client.calls.lastIndexOf("onStateChange") - 1);
    expect(client.calls.filter((c) => c.startsWith("on:")).length).toBeGreaterThanOrEqual(7);
    for (const [i, c] of client.calls.entries()) if (c.startsWith("on:")) expect(i).toBeLessThan(cmd);
    expect(cmd).toBeGreaterThan(firstGet);
    const v = h.latest()!;
    expect(v.connection).toBe("connected");
    expect(v.state.counts.running).toBe(1);
    expect(v.state.counts.done).toBe(1);
    h.unmount();
  });

  test("live events update metrics; completed -> verified -> merged counts once", async () => {
    const client = new FakeClient();
    const timers = new FakeTimers();
    const h = mount({ client, timers });
    await wait();
    client.emit("evt:state-snapshot", snap([agent("a", "running", { effortEstimateMs: 600_000, startedAt: new Date(T0).toISOString() })]));
    timers.flush();
    await wait();
    expect(h.latest()!.state.counts.running).toBe(1);
    expect(h.latest()!.eta.kind).toBe("estimate");

    for (const [prev, next] of [["running", "completed"], ["completed", "verified"], ["verified", "merged"]] as const) {
      client.emit("evt:agent-status-change", { featureId: "a", previousStatus: prev, newStatus: next });
    }
    client.emit("evt:agent-activity", { featureId: "a", activity: "idle" });
    timers.flush();
    await wait();
    const v = h.latest()!;
    expect(v.state.counts.done).toBe(1);
    expect(v.state.throughput.buckets.reduce((x, y) => x + y, 0)).toBe(1);
    expect(v.state.activity[0]!.text).toBe("idle");
    expect(v.eta.kind).toBe("none");
    h.unmount();
  });

  test("coalesces event bursts into one publish", async () => {
    const client = new FakeClient();
    const timers = new FakeTimers();
    const h = mount({ client, timers });
    await wait();
    const before = h.renders();
    for (let i = 0; i < 500; i++) {
      client.emit("evt:agent-status-change", { featureId: `a${i % 5}`, previousStatus: "queued", newStatus: "running" });
    }
    expect(timers.timeouts.size).toBe(1);
    timers.flush();
    await wait();
    expect(h.renders() - before).toBe(1);
    expect(h.latest()!.state.activity.length).toBeLessThanOrEqual(100);
    h.unmount();
  });

  test("token events only trigger a usage file refresh (never added to totals)", async () => {
    writeFileSync(usageFile, usageLine("t1", "qa", 10));
    const client = new FakeClient();
    const timers = new FakeTimers();
    const h = mount({ client, timers });
    await wait();
    expect(h.latest()!.quests[0]!.totals.total_tokens).toBe(10);
    appendFileSync(usageFile, usageLine("t1", "qa", 5));
    client.emit("evt:token-usage", { featureId: "t1", inputTokens: 99999, outputTokens: 99999, totalTokens: 199998 });
    timers.flush();
    await wait();
    expect(h.latest()!.quests[0]!.totals.total_tokens).toBe(15);
    h.unmount();
  });

  test("disconnect is explicit, metrics survive, reconnect requests fresh state", async () => {
    const client = new FakeClient();
    const timers = new FakeTimers();
    client.snapshot = snap([agent("a", "running")]);
    const h = mount({ client, timers });
    await wait();
    const initialCmds = client.commands.length;

    client.setState("disconnected");
    timers.flush();
    await wait();
    expect(h.latest()!.connection).toBe("disconnected");
    expect(h.latest()!.state.counts.running).toBe(1);
    expect(client.commands.length).toBe(initialCmds);

    client.setState("reconnecting");
    timers.flush();
    await wait();
    expect(h.latest()!.connection).toBe("reconnecting");

    client.setState("connected");
    expect(client.commands.length).toBe(initialCmds + 1);
    client.emit("evt:state-snapshot", snap([agent("a", "merged", { completedAt: new Date(T0).toISOString() })]));
    timers.flush();
    await wait();
    expect(h.latest()!.connection).toBe("connected");
    expect(h.latest()!.state.counts.done).toBe(1);
    h.unmount();
  });

  test("historical usage stays available while the daemon is disconnected", async () => {
    writeFileSync(usageFile, usageLine("t1", "qa", 10));
    const client = new FakeClient();
    client.state = "disconnected";
    const h = mount({ client, timers: new FakeTimers() });
    await wait();
    expect(h.latest()!.connection).toBe("disconnected");
    expect(h.latest()!.quests).toHaveLength(1);
    expect(client.commands).toHaveLength(0); // not connected -> no request
    h.unmount();
  });

  test("ticks advance throughput and ETA with the clock without events", async () => {
    const client = new FakeClient();
    const timers = new FakeTimers();
    client.snapshot = snap([agent("a", "running", { effortEstimateMs: 10 * 60_000, startedAt: new Date(T0).toISOString() })], 1);
    const h = mount({ client, timers });
    await wait();
    const eta0 = h.latest()!.eta as any;
    expect(eta0.ms).toBe(10 * 60_000);
    clockMs += 3 * 60_000;
    timers.tick();
    await wait();
    expect((h.latest()!.eta as any).ms).toBe(7 * 60_000);
    expect(h.latest()!.state.throughput.newestBucketStart).toBe(T0 + 3 * 60_000);
    h.unmount();
  });

  test("task/archive attribution metadata is refreshed on a bounded schedule", async () => {
    writeFileSync(usageFile, usageLine("legacy", null, 10));
    let calls = 0;
    let quest: string | null = null;
    const timers = new FakeTimers();
    const h = mount({
      timers,
      loadTaskQuests: () => {
        calls++;
        return new Map([["legacy", quest]]);
      },
    });
    await wait();
    expect(calls).toBe(1);
    expect(h.latest()!.quests[0]!.questId).toBeNull();
    quest = "qq";
    for (let i = 0; i < 5; i++) {
      clockMs += 1000;
      timers.tick();
    }
    expect(calls).toBe(1); // within the refresh window
    clockMs += 31_000;
    timers.tick();
    await wait();
    expect(calls).toBe(2);
    expect(h.latest()!.quests[0]!.questId).toBe("qq");
    h.unmount();
  });

  test("a throwing metadata loader keeps the provider alive", async () => {
    writeFileSync(usageFile, usageLine("t", "q", 1));
    const h = mount({
      timers: new FakeTimers(),
      loadTaskQuests: () => {
        throw new Error("boom");
      },
    });
    await wait();
    expect(h.latest()!.quests).toHaveLength(1);
    h.unmount();
  });

  test("client replacement unsubscribes the old client and resets state", async () => {
    const c1 = new FakeClient();
    c1.snapshot = snap([agent("a", "running")]);
    const timers = new FakeTimers();
    const h = mount({ client: c1, timers });
    await wait();
    expect(c1.listenerCount()).toBeGreaterThan(0);
    const c2 = new FakeClient();
    h.rerender({ client: c2 });
    await wait();
    expect(c1.listenerCount()).toBe(0);
    expect(c2.listenerCount()).toBeGreaterThan(0);
    expect(h.latest()!.state.counts.total).toBe(0);
    expect(timers.intervals.size).toBe(1);
    h.unmount();
    expect(c2.listenerCount()).toBe(0);
  });

  test("project change re-reads usage from the new root and stops the old reader", async () => {
    writeFileSync(usageFile, usageLine("t1", "qa", 10));
    const root2 = mkdtempSync(join(tmpdir(), "dash-prov2-"));
    mkdirSync(join(root2, ".wombo-combo"), { recursive: true });
    writeFileSync(join(root2, ".wombo-combo", "usage.jsonl"), usageLine("t9", "qz", 77));
    const timers = new FakeTimers();
    const h = mount({ timers });
    await wait();
    expect(h.latest()!.quests[0]!.questId).toBe("qa");
    h.rerender({ projectRoot: root2 });
    await wait();
    expect(h.latest()!.quests.map((q) => q.questId)).toEqual(["qz"]);
    expect(timers.intervals.size).toBe(1);
    h.unmount();
    rmSync(root2, { recursive: true, force: true });
  });

  test("unmount clears timers, pending flushes and every handler; never connects or disconnects", async () => {
    const client = new FakeClient();
    (client as any).connect = () => {
      throw new Error("must not connect");
    };
    (client as any).disconnect = () => {
      throw new Error("must not disconnect");
    };
    const timers = new FakeTimers();
    const h = mount({ client, timers });
    await wait();
    client.emit("evt:agent-activity", { featureId: "a", activity: "x" }); // pending flush
    expect(timers.timeouts.size).toBe(1);
    h.unmount();
    expect(timers.intervals.size).toBe(0);
    expect(timers.timeouts.size).toBe(0);
    expect(client.listenerCount()).toBe(0);
    // late events/ticks after unmount are harmless
    client.emit("evt:agent-activity", { featureId: "a", activity: "late" });
    timers.tick();
    timers.flush();
  });

  test("sendCommand failures while connecting are swallowed", async () => {
    const client = new FakeClient();
    client.sendCommand = () => {
      throw new Error("Not connected to daemon");
    };
    const h = mount({ client, timers: new FakeTimers() });
    await wait();
    expect(() => client.setState("connected")).not.toThrow();
    h.unmount();
  });
});
