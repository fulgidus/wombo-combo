/**
 * dashboard-realtime.test.tsx — End-to-end tests for the realtime dashboard.
 *
 * Drives the merged feature through LIVE Ink renders (PassThrough stdin /
 * stdout) of both application shells — the unified TuiApp and the standalone
 * DaemonMonitorShell — using a fake DaemonClient and temporary usage files.
 * No real agents, daemon or network are involved.
 *
 * The metrics provider samples with a real one-second interval, so tests that
 * assert time-driven updates wait slightly longer than one tick.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripAnsi } from "./ansi";

// ---------------------------------------------------------------------------
// Fakes and helpers
// ---------------------------------------------------------------------------

const sleep = (ms = 40) => new Promise((r) => setTimeout(r, ms));
/** A little longer than the provider's 1s sampling interval. */
const TICK = 1300;

/** Retry an assertion block until it passes (frames render asynchronously). */
async function eventually(assertions: () => void, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      assertions();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await sleep(50);
    }
  }
}

class FakeDaemonClient {
  handlers = new Map<string, Set<(p: any) => void>>();
  stateHandlers = new Set<(s: string) => void>();
  state = "connected";
  onCalls = 0;
  commands: string[] = [];
  connectCalls = 0;
  disconnectCalls = 0;
  on(type: string, handler: (p: any) => void) {
    this.onCalls++;
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler);
    return () => set!.delete(handler);
  }
  onStateChange(h: (s: string) => void) {
    this.onCalls++;
    this.stateHandlers.add(h);
    return () => this.stateHandlers.delete(h);
  }
  getLastSnapshot() {
    return null;
  }
  getState() {
    return this.state;
  }
  sendCommand(type: string) {
    this.commands.push(type);
    return 1;
  }
  connect() {
    this.connectCalls++;
  }
  disconnect() {
    this.disconnectCalls++;
  }
  requestState() {
    return Promise.resolve({ scheduler: null, agents: [] });
  }
  retryAgent() {}
  answerHitl() {}
  emit(type: string, payload: unknown) {
    for (const h of [...(this.handlers.get(type) ?? [])]) h(payload);
  }
  setState(s: string) {
    this.state = s;
    for (const h of [...this.stateHandlers]) h(s);
  }
  listenerCount() {
    let n = this.stateHandlers.size;
    for (const s of this.handlers.values()) n += s.size;
    return n;
  }
}

function agentState(id: string, status: string, extra: Record<string, unknown> = {}) {
  return {
    featureId: id, taskTitle: id, branch: `f/${id}`, baseBranch: "main", worktree: "/x", status,
    pid: null, sessionId: null, activity: null, activityUpdatedAt: null, retries: 0, maxRetries: 3,
    startedAt: null, completedAt: null, buildPassed: null, error: null, effortEstimateMs: null,
    streamIndex: null, dependsOn: [], dependedOnBy: [], agentName: null, agentType: null,
    pendingQuestions: [], tokenUsage: null, ...extra,
  };
}

function snapshot(agents: any[], maxConcurrent = 2) {
  return {
    scheduler: {
      status: "running", maxConcurrent, model: null, baseBranch: "main", questId: null, startedAt: null,
      pinnedTasks: [], skippedTasks: [], totalProcessed: 0, totalCompleted: 0, totalFailed: 0,
    },
    agents,
    uptime: 1,
  };
}

function usageLine(task: string, quest: string | null, tokens: number, cost = 0) {
  return (
    JSON.stringify({
      task_id: task, quest_id: quest, model: null, provider: null, harness: null,
      input_tokens: tokens, output_tokens: 0, cache_read: 0, cache_write: 0, reasoning_tokens: 0,
      total_tokens: tokens, cost, is_final_step: false, timestamp: "2026-01-01T00:00:00.000Z",
    }) + "\n"
  );
}

function makeConfig(theme = "default"): any {
  return {
    agent: { tmuxPrefix: "woco" },
    tui: { theme, locale: "en" },
    tasksDir: "tasks",
    archiveDir: "archive",
    questsDir: "quests",
  };
}

/** Track intervals created/cleared while a test runs. */
function trackIntervals() {
  const realSet = globalThis.setInterval;
  const realClear = globalThis.clearInterval;
  const active = new Set<unknown>();
  (globalThis as any).setInterval = (...args: any[]) => {
    const h = (realSet as any)(...args);
    active.add(h);
    return h;
  };
  (globalThis as any).clearInterval = (h: unknown) => {
    active.delete(h);
    return (realClear as any)(h);
  };
  return {
    active,
    restore() {
      globalThis.setInterval = realSet;
      globalThis.clearInterval = realClear;
      for (const h of active) realClear(h as any);
    },
  };
}

function setTermSize(rows: number, columns: number) {
  const r = Object.getOwnPropertyDescriptor(process.stdout, "rows");
  const c = Object.getOwnPropertyDescriptor(process.stdout, "columns");
  Object.defineProperty(process.stdout, "rows", { value: rows, configurable: true, writable: true });
  Object.defineProperty(process.stdout, "columns", { value: columns, configurable: true, writable: true });
  return () => {
    if (r) Object.defineProperty(process.stdout, "rows", r);
    else delete (process.stdout as any).rows;
    if (c) Object.defineProperty(process.stdout, "columns", c);
    else delete (process.stdout as any).columns;
  };
}

interface App {
  client: FakeDaemonClient;
  root: string;
  usageFile: string;
  renders: () => number;
  frame: () => string;
  key: (s: string) => void;
  notifyRef: { current: (() => void) | null };
  store: any;
  quits: number[];
  unmount: () => void;
}

let cleanup: Array<() => void> = [];
afterEach(() => {
  for (const fn of cleanup.reverse()) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
  cleanup = [];
});

let projectRoot = "";
beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), "dash-rt-"));
  mkdirSync(join(projectRoot, ".wombo-combo"), { recursive: true });
  cleanup.push(() => rmSync(projectRoot, { recursive: true, force: true }));
});

type Shell = "unified" | "monitor";

async function mount(
  shell: Shell,
  opts: { rows?: number; columns?: number; theme?: string; initialScreen?: string } = {},
): Promise<App> {
  const rows = opts.rows ?? 24;
  const columns = opts.columns ?? 80;
  const restoreSize = setTermSize(rows, columns);
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = columns;
  (stdout as any).rows = rows;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  let last = "";
  stdout.on("data", (c: Buffer) => {
    last = stripAnsi(c.toString());
  });

  const client = new FakeDaemonClient();
  const quits: number[] = [];
  const notifyRef: { current: (() => void) | null } = { current: null };
  const store = {
    scheduler: null, agents: [] as any[], activityLogs: new Map(), systemMessages: [],
    pendingQuestions: [] as any[], tokenUsage: new Map(), allComplete: false,
  };
  let renderCount = 0;

  let element: React.ReactElement;
  if (shell === "unified") {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;
    element = React.createElement(TuiApp, {
      projectRoot,
      config: makeConfig(opts.theme),
      skipSplash: true,
      initialScreen: opts.initialScreen,
      daemonClient: client,
      daemonConnected: true,
      onExit: () => quits.push(1),
    });
  } else {
    const { DaemonMonitorShell } = (await import("../../src/ink/run-daemon-monitor")) as any;
    element = React.createElement(DaemonMonitorShell, {
      _store: store,
      client,
      projectRoot,
      config: makeConfig(opts.theme),
      onQuit: () => quits.push(1),
      onQuitAfterComplete: () => quits.push(2),
      notifyRef,
      skipSplash: true,
    });
  }
  const Counter = ({ children }: { children: React.ReactNode }) => {
    renderCount++;
    return <>{children}</>;
  };
  const inst = render(<Counter>{element}</Counter>, {
    stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false,
  });
  let unmounted = false;
  const unmount = () => {
    if (unmounted) return;
    unmounted = true;
    inst.unmount();
    restoreSize();
  };
  cleanup.push(unmount);
  await sleep(60);
  return {
    client,
    root: projectRoot,
    usageFile: join(projectRoot, ".wombo-combo", "usage.jsonl"),
    renders: () => renderCount,
    frame: () => last,
    key: (s: string) => (stdin as any).write(s),
    notifyRef,
    store,
    quits,
    unmount,
  };
}

/** ESC menu → Dashboard. */
async function openDashboard(app: App) {
  app.key("\u001b");
  await sleep(400);
  app.key("\u001b[B");
  await sleep();
  app.key("\r");
  await sleep(100);
  await eventually(() => expect(app.frame()).toContain("Home › Dashboard"));
}

function lines(frame: string) {
  return frame.split("\n");
}

const BLOCKS = /[▁-█]/;

// ---------------------------------------------------------------------------
// Both shells
// ---------------------------------------------------------------------------

for (const shell of ["unified", "monitor"] as const) {
  describe(`realtime dashboard — ${shell} shell`, () => {
    test("chrome → dashboard; snapshot, status and activity events update visible metrics without remounting", async () => {
      const app = await mount(shell);
      expect(app.frame()).toContain("Dashboard in ESC menu");
      await openDashboard(app);
      expect(app.frame()).toContain("Home › Dashboard");
      expect(app.frame()).toContain("Running 0");
      const mountsBefore = app.renders();
      const subscriptions = app.client.onCalls;

      app.client.emit(
        "evt:state-snapshot",
        snapshot([
          agentState("alpha", "running", { effortEstimateMs: 20 * 60_000, startedAt: new Date().toISOString() }),
          agentState("beta", "queued", { effortEstimateMs: 10 * 60_000 }),
        ]),
      );
      await sleep(250);
      await eventually(() => {
        expect(app.frame()).toContain("Running 1");
        expect(app.frame()).toContain("Queued 1");
        expect(app.frame()).toContain("approx., tracked agents only");
      });

      app.client.emit("evt:agent-activity", { featureId: "alpha", activity: "editing src/widget.ts" });
      app.client.emit("evt:build-result", { featureId: "alpha", passed: true });
      await sleep(250);
      await eventually(() => {
        expect(app.frame()).toContain("editing src/widget.ts".slice(0, 0) + "build passed");
      });

      // completed -> verified -> merged is ONE completion
      for (const [prev, next] of [["running", "completed"], ["completed", "verified"], ["verified", "merged"]] as const) {
        app.client.emit("evt:agent-status-change", { featureId: "alpha", previousStatus: prev, newStatus: next });
      }
      await sleep(250);
      await eventually(() => {
        const f = app.frame();
        expect(f).toContain("Running 0");
        expect(f).toContain("Done 1");
        expect(f).toContain("peak 1/min");
        expect(f).toMatch(BLOCKS);
        expect(f).toContain("merged");
      });

      // Same render tree and same subscriptions: nothing was remounted/resubscribed.
      expect(app.client.onCalls).toBe(subscriptions);
      expect(app.client.connectCalls).toBe(0);
      expect(app.client.disconnectCalls).toBe(0);
      expect(app.renders()).toBeGreaterThanOrEqual(mountsBefore);
      app.unmount();
    }, 20_000);

    test("appended usage records show up after the next sample; multiple quests and unknown attribution", async () => {
      writeFileSync(join(projectRoot, ".wombo-combo", "usage.jsonl"), usageLine("t1", "alpha-quest", 2000, 0.25));
      const app = await mount(shell);
      await openDashboard(app);
      expect(app.frame()).toContain("alpha-quest");
      expect(app.frame()).toContain("2.0k");

      appendFileSync(app.usageFile, usageLine("t2", "beta-quest", 500) + usageLine("t3", "alpha-quest", 3000));
      appendFileSync(app.usageFile, usageLine("legacy-task", null, 100));
      // Cumulative websocket token totals must never be added.
      app.client.emit("evt:token-usage", { featureId: "t1", inputTokens: 9_999_999, outputTokens: 9_999_999, totalTokens: 19_999_998 });
      await sleep(TICK);
      await eventually(() => {
        const f = app.frame();
        expect(f).toContain("alpha-quest");
        expect(f).toContain("5.0k"); // 2000 + 3000, not websocket totals
        expect(f).toContain("beta-quest");
        expect(f).toContain("500");
        expect(f).toContain("(unknown quest)");
        expect(f).not.toContain("M "); // no million-scale websocket totals
      });
      app.unmount();
    }, 20_000);

    test("history survives navigation away and back", async () => {
      writeFileSync(join(projectRoot, ".wombo-combo", "usage.jsonl"), usageLine("t1", "persist-quest", 7000));
      const app = await mount(shell);
      await openDashboard(app);
      app.client.emit("evt:state-snapshot", snapshot([agentState("alpha", "running")]));
      app.client.emit("evt:agent-status-change", { featureId: "alpha", previousStatus: "running", newStatus: "completed" });
      await sleep(250);
      await eventually(() => {
        expect(app.frame()).toContain("Done 1");
      });

      app.key("b"); // back to the originating screen
      await sleep(150);
      await eventually(() => {
        expect(app.frame()).not.toContain("Throughput");
      });

      await openDashboard(app);
      const f = app.frame();
      expect(f).toContain("Done 1");
      expect(f).toContain("peak 1/min");
      expect(f).toContain("persist-quest");
      expect(f).toContain("7.0k");
      app.unmount();
    }, 20_000);

    test("disconnected and reconnected states are explicit; history is kept", async () => {
      writeFileSync(join(projectRoot, ".wombo-combo", "usage.jsonl"), usageLine("t1", "kept-quest", 1000));
      const app = await mount(shell);
      await openDashboard(app);
      app.client.emit("evt:state-snapshot", snapshot([agentState("alpha", "running", { effortEstimateMs: 600_000 })]));
      await sleep(250);
      await eventually(() => {
        expect(app.frame()).toContain("● live");
      });

      app.client.setState("disconnected");
      await sleep(250);
      await eventually(() => {
        const f = app.frame();
        expect(f).toContain("disconnected - data may be stale");
        expect(f).not.toContain("● live");
        expect(f).toContain("unavailable while disconnected"); // ETA not shown as live
        expect(f).toContain("kept-quest"); // historical usage remains
      });

      app.client.setState("reconnecting");
      await sleep(250);
      await eventually(() => {
        expect(app.frame()).toContain("reconnecting - data may be stale");
      });

      const before = app.client.commands.filter((c) => c === "cmd:get-state").length;
      app.client.setState("connected");
      expect(app.client.commands.filter((c) => c === "cmd:get-state").length).toBe(before + 1);
      app.client.emit("evt:state-snapshot", snapshot([agentState("alpha", "merged")]));
      await sleep(250);
      await eventually(() => {
        const f = app.frame();
        expect(f).toContain("● live");
        expect(f).toContain("Done 1");
      });
      app.unmount();
    }, 20_000);

    test("short and narrow terminals stay bounded and keep the key metrics", async () => {
      for (const [rows, columns] of [[12, 80], [30, 44], [8, 30]] as const) {
        const app = await mount(shell, { rows, columns });
        await openDashboard(app);
        const quests = Array.from({ length: 30 }, (_, i) => usageLine(`t${i}`, `quest-${i}`, 1000 + i)).join("");
        appendFileSync(app.usageFile, quests);
        app.client.emit("evt:state-snapshot", snapshot(Array.from({ length: 25 }, (_, i) => agentState(`ag${i}`, i % 2 ? "running" : "queued"))));
        for (let i = 0; i < 40; i++) {
          app.client.emit("evt:agent-status-change", { featureId: `ag${i % 25}`, previousStatus: "queued", newStatus: "running" });
        }
        await sleep(TICK);
        await eventually(() => {
          const frame = app.frame();
          const ls = lines(frame);
          expect(ls.length).toBeLessThanOrEqual(rows);
          for (const l of ls) expect([...l].length).toBeLessThanOrEqual(columns);
          if (rows >= 12) {
            expect(frame).toContain("Running");
            expect(frame).toContain("Throughput");
            expect(frame).toContain("Est. remaining");
          }
          // Chrome is still on screen (top bar and bottom bar).
          expect(frame).toContain("Home");
        });
        app.unmount();
      }
    }, 30_000);

    test("minimal theme renders without Unicode graph characters", async () => {
      writeFileSync(join(projectRoot, ".wombo-combo", "usage.jsonl"), usageLine("t1", "q-min", 1000));
      const app = await mount(shell, { theme: "minimal" });
      await openDashboard(app);
      app.client.emit("evt:state-snapshot", snapshot([agentState("a", "merged", { completedAt: new Date().toISOString() })]));
      await eventually(() => {
        const dash = lines(app.frame()).slice(1, -2).join("\n"); // exclude chrome bars (they use emoji/icons)
        expect(dash).toContain("Throughput");
        expect(dash).not.toMatch(BLOCKS);
        expect(dash).not.toContain("█");
        expect(dash).toContain("q-min");
      });
      app.unmount();
    }, 20_000);

    test("unmount removes every listener and leaks no timers; client is never connected or disconnected", async () => {
      const timers = trackIntervals();
      cleanup.push(() => timers.restore());
      const app = await mount(shell);
      await openDashboard(app);
      app.client.emit("evt:agent-activity", { featureId: "a", activity: "x" }); // pending coalesced flush
      expect(app.client.listenerCount()).toBeGreaterThan(0);
      expect(timers.active.size).toBeGreaterThan(0);

      app.unmount();
      await sleep(100);
      await eventually(() => {
        expect(app.client.listenerCount()).toBe(0);
        expect(timers.active.size).toBe(0);
        expect(app.client.connectCalls).toBe(0);
        expect(app.client.disconnectCalls).toBe(0);
      });
      // late events/state changes after unmount are harmless
      app.client.emit("evt:agent-activity", { featureId: "a", activity: "late" });
      app.client.setState("disconnected");
      timers.restore();
    }, 20_000);
  });
}

// ---------------------------------------------------------------------------
// Shell-specific behavior
// ---------------------------------------------------------------------------

describe("realtime dashboard — unified shell specifics", () => {
  test("direct dashboard startup returns to the quest picker and keeps the app running", async () => {
    const app = await mount("unified", { initialScreen: "dashboard" });
    expect(app.frame()).toContain("Home › Dashboard");
    app.key("b");
    await sleep(150);
    await eventually(() => {
      expect(app.frame()).toContain("Home › Quest Picker");
      expect(app.quits).toHaveLength(0);
    });
    app.unmount();
  }, 20_000);

  test("repeated dashboard selection does not grow the navigation stack", async () => {
    const app = await mount("unified");
    await openDashboard(app);
    await openDashboard(app);
    expect(app.frame()).toContain("Home › Dashboard");
    app.key("b");
    await sleep(150);
    await eventually(() => {
      expect(app.frame()).toContain("Home › Quest Picker");
    });
    app.unmount();
  }, 20_000);
});

describe("realtime dashboard — standalone monitor specifics", () => {
  test("legacy monitor store and pending HITL questions coexist with the metrics provider", async () => {
    const app = await mount("monitor");
    app.store.agents = [agentState("feat-7", "running")];
    app.store.pendingQuestions = [{ id: "q1", agentId: "feat-7", text: "which db?", timestamp: new Date().toISOString() }];
    app.notifyRef.current?.();
    app.client.emit("evt:state-snapshot", snapshot([agentState("feat-7", "running")]));
    await sleep(250);
    await eventually(() => {
      expect(app.frame()).toContain("feat-7");
      expect(app.frame()).toContain("1 pending");
    });

    await openDashboard(app);
    expect(app.frame()).toContain("Running 1");
    app.key("b");
    await sleep(150);
    await eventually(() => {
      expect(app.frame()).toContain("Home › Wave Monitor");
      expect(app.frame()).toContain("feat-7");
      expect(app.frame()).toContain("1 pending");
      expect(app.quits).toHaveLength(0);
    });
    app.unmount();
  }, 20_000);
});
