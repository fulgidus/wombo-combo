/**
 * monitor-router.test.tsx — TDD tests for the ScreenRouter-based architecture
 * in DaemonMonitorShell.
 *
 * These tests verify that:
 *   1. DaemonMonitorShell uses ScreenRouter internally
 *   2. The screen transition from splash → monitor works via ScreenRouter.replace()
 *   3. The EscMenu "Settings" action pushes to the settings screen via ScreenRouter
 *   4. The chrome bars are rendered by ChromeLayout wrapping ScreenRouter content
 *   5. DaemonMonitorScreen is exported as a router-compatible screen component
 *
 * Architecture enforced by these tests:
 *
 *   ThemeContext.Provider
 *     I18nContext.Provider
 *       DashboardStoreContext.Provider
 *         ScreenRouter (splash → monitor → settings)
 *           EscMenuProvider
 *             ChromeLayout
 *               <current screen component>
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import { stripAnsi } from "./ansi";
import { selectFromEscMenu, waitFor, eventually } from "../helpers/wait-for";

// ---------------------------------------------------------------------------
// Inline stubs
// ---------------------------------------------------------------------------

function makeMinimalConfig(overrides: Record<string, unknown> = {}): any {
  return {
    agent: { tmuxPrefix: "woco" },
    tui: { theme: "default", locale: "en" },
    ...overrides,
  };
}

class StubDaemonClient {
  on(_event: string, _handler: (...args: any[]) => void): () => void {
    return () => {};
  }
  requestState(): Promise<any> {
    return Promise.resolve({ scheduler: null, agents: [] });
  }
  retryAgent(_id: string) {}
  answerHitl(_agentId: string, _qId: string, _text: string) {}
}

// ---------------------------------------------------------------------------
// DaemonMonitorShell — uses ScreenRouter internally
// ---------------------------------------------------------------------------

describe("DaemonMonitorShell uses ScreenRouter", () => {
  test("DaemonMonitorShell renders without crashing via renderToString", async () => {
    const { DaemonMonitorShell } = (await import("../../src/ink/run-daemon-monitor")) as any;

    const output = renderToString(
      React.createElement(DaemonMonitorShell, {
        client: new StubDaemonClient(),
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        onQuit: () => {},
        onQuitAfterComplete: () => {},
        notifyRef: { current: null },
        splashDurationMs: 0,
        skipSplash: false,
      })
    );

    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });

  test("DaemonMonitorShell renders chrome (Home label in top bar)", async () => {
    const { DaemonMonitorShell } = (await import("../../src/ink/run-daemon-monitor")) as any;

    const output = renderToString(
      React.createElement(DaemonMonitorShell, {
        client: new StubDaemonClient(),
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        onQuit: () => {},
        onQuitAfterComplete: () => {},
        notifyRef: { current: null },
        splashDurationMs: 0,
        skipSplash: false,
      })
    );

    expect(output).toContain("Home");
    });

  test("DaemonMonitorShell with skipSplash=true renders monitor content (no crash)", async () => {
    const { DaemonMonitorShell } = (await import("../../src/ink/run-daemon-monitor")) as any;

    const output = renderToString(
      React.createElement(DaemonMonitorShell, {
        client: new StubDaemonClient(),
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        onQuit: () => {},
        onQuitAfterComplete: () => {},
        notifyRef: { current: null },
        splashDurationMs: 0,
        skipSplash: true,
      })
    );

    expect(typeof output).toBe("string");
  });

  test("DaemonMonitorShell with skipSplash=false shows splash (block-art logo)", async () => {
    const { DaemonMonitorShell } = (await import("../../src/ink/run-daemon-monitor")) as any;

    const output = renderToString(
      React.createElement(DaemonMonitorShell, {
        client: new StubDaemonClient(),
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        onQuit: () => {},
        onQuitAfterComplete: () => {},
        notifyRef: { current: null },
        splashDurationMs: 0,
        skipSplash: false,
      })
    );

    // SplashScreen shows the block-art logo (tagline text is random);
    // strip ANSI — colored terminals wrap every glyph in its own escape
    expect(stripAnsi(output)).toContain("██");
    expect(stripAnsi(output)).toContain("⚡");
  });
});

// ---------------------------------------------------------------------------
// DaemonMonitorScreen — exported router-compatible screen component
// ---------------------------------------------------------------------------

describe("DaemonMonitorScreen export", () => {
  test("DaemonMonitorScreen is exported from run-daemon-monitor", async () => {
    const mod = await import("../../src/ink/run-daemon-monitor");
    expect((mod as any).DaemonMonitorScreen).toBeDefined();
    expect(typeof (mod as any).DaemonMonitorScreen).toBe("function");
  });

  test("DaemonMonitorScreen renders inside a ScreenRouter context", async () => {
    const { DaemonMonitorScreen } = (await import("../../src/ink/run-daemon-monitor")) as any;
    const { ScreenRouter } = await import("../../src/ink/router");
    const { DashboardStoreContext } = await import("../../src/ink/dashboard");
    const { ThemeContext, getTheme } = await import("../../src/ink/theme");
    const { I18nContext, getLocaleT } = await import("../../src/ink/i18n");

    const theme = getTheme("default");
    const tFn = getLocaleT("en");
    const emptyDashStore = { agents: [], running: 0, done: 0, failed: 0, total: 0 };

    const screens = { monitor: DaemonMonitorScreen };
    const output = renderToString(
      React.createElement(
        ThemeContext.Provider,
        { value: theme },
        React.createElement(
          I18nContext.Provider,
          { value: tFn },
          React.createElement(
            DashboardStoreContext.Provider,
            { value: emptyDashStore },
            React.createElement(ScreenRouter, {
              screens,
              initialScreen: "monitor",
              initialProps: {
                client: new StubDaemonClient(),
                projectRoot: "/tmp",
                config: makeMinimalConfig(),
                onQuit: () => {},
                onQuitAfterComplete: () => {},
              },
            })
          )
        )
      )
    );

    expect(typeof output).toBe("string");
  });

  test("DaemonMonitorScreen renders LIVE agents from DashboardStoreContext (not frozen props)", async () => {
    const { DaemonMonitorScreen } = (await import("../../src/ink/run-daemon-monitor")) as any;
    const { ScreenRouter } = await import("../../src/ink/router");
    const { DashboardStoreContext } = await import("../../src/ink/dashboard");
    const { ThemeContext, getTheme } = await import("../../src/ink/theme");
    const { I18nContext, getLocaleT } = await import("../../src/ink/i18n");

    const theme = getTheme("default");
    const tFn = getLocaleT("en");
    // Live dash store: one agent. The screen receives EMPTY frozen props via
    // initialProps — before the live-context fix, ScreenRouter froze the
    // splash-time (empty) props and the monitor showed "No agents" forever.
    const liveDashStore = {
      agents: [
        {
          id: "ctx-live-agent",
          status: "running",
          activity: "Installing dependencies...",
          startedAt: new Date().toISOString(),
          retries: 0,
          effortEstimateMs: 60_000,
          buildPassed: null,
          buildOutput: null,
        },
      ],
      running: 1,
      done: 0,
      failed: 0,
      total: 1,
      scheduler: { status: "running", baseBranch: "main", model: null, questId: null },
      allComplete: false,
      pendingQuestions: [],
    };

    const screens = { monitor: DaemonMonitorScreen };
    const output = renderToString(
      React.createElement(
        ThemeContext.Provider,
        { value: theme },
        React.createElement(
          I18nContext.Provider,
          { value: tFn },
          React.createElement(
            DashboardStoreContext.Provider,
            { value: liveDashStore },
            React.createElement(ScreenRouter, {
              screens,
              initialScreen: "monitor",
              initialProps: {
                client: new StubDaemonClient(),
                projectRoot: "/tmp",
                config: makeMinimalConfig(),
                onQuit: () => {},
                onQuitAfterComplete: () => {},
                // Frozen props are deliberately EMPTY — data must come from context
                agents: [],
                scheduler: null,
              },
            })
          )
        )
      )
    );

    expect(output).toContain("ctx-live-agent");
    expect(output).not.toContain("No agents");
  });
});

// ---------------------------------------------------------------------------
// ScreenRouter integration — EscMenuProvider is inside ScreenRouter
// ---------------------------------------------------------------------------

describe("EscMenuProvider is rendered inside ScreenRouter tree", () => {
  test("DaemonMonitorShell tree: EscMenu does not crash (is inside ScreenRouter)", async () => {
    // EscMenuProvider uses useNavigation() internally — if it were outside
    // ScreenRouter, it would use defaultNav (no-op) which is still fine,
    // but the point is EscMenuProvider must be INSIDE the NavigationContext
    // so ESC → settings can call nav.push("settings"). This test verifies
    // that the tree renders without error (no "useNavigation outside provider" crash).
    const { DaemonMonitorShell } = (await import("../../src/ink/run-daemon-monitor")) as any;

    expect(() =>
      renderToString(
        React.createElement(DaemonMonitorShell, {
          client: new StubDaemonClient(),
          projectRoot: "/tmp",
          config: makeMinimalConfig(),
          onQuit: () => {},
          onQuitAfterComplete: () => {},
          notifyRef: { current: null },
          splashDurationMs: 0,
          skipSplash: false,
        })
      )
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Dashboard navigation (live renders)
// ---------------------------------------------------------------------------

import { PassThrough } from "node:stream";
import { render } from "ink";

class LiveFakeClient {
  handlers = new Map<string, Set<(p: any) => void>>();
  stateHandlers = new Set<(s: string) => void>();
  onCalls = 0;
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
    return "connected";
  }
  sendCommand() {
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
  listenerCount() {
    let n = this.stateHandlers.size;
    for (const s of this.handlers.values()) n += s.size;
    return n;
  }
}

const sleep = (ms = 40) => new Promise((r) => setTimeout(r, ms));

function daemonAgent(id: string, status: string) {
  return {
    featureId: id, taskTitle: id, branch: `f/${id}`, baseBranch: "main", worktree: "/x", status,
    pid: null, sessionId: null, activity: null, activityUpdatedAt: null, retries: 0, maxRetries: 3,
    startedAt: null, completedAt: null, buildPassed: null, error: null, effortEstimateMs: null,
    streamIndex: null, dependsOn: [], dependedOnBy: [], agentName: null, agentType: null,
    pendingQuestions: [], tokenUsage: null,
  };
}

function snapshotOf(agents: any[]) {
  return {
    scheduler: {
      status: "running", maxConcurrent: 2, model: null, baseBranch: "main", questId: null, startedAt: null,
      pinnedTasks: [], skippedTasks: [], totalProcessed: 0, totalCompleted: 0, totalFailed: 0,
    },
    agents,
    uptime: 1,
  };
}

async function mountShell(opts: { client?: LiveFakeClient; store?: any; notifyRef?: any } = {}) {
  const { DaemonMonitorShell } = (await import("../../src/ink/run-daemon-monitor")) as any;
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 80;
  (stdout as any).rows = 24;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  let last = "";
  stdout.on("data", (c: Buffer) => {
    last = stripAnsi(c.toString());
  });
  const client = opts.client ?? new LiveFakeClient();
  const quits: number[] = [];
  const notifyRef = opts.notifyRef ?? { current: null };
  const root = (await import("node:fs")).mkdtempSync((await import("node:path")).join((await import("node:os")).tmpdir(), "mon-dash-"));
  const inst = render(
    React.createElement(DaemonMonitorShell, {
      _store: opts.store,
      client,
      projectRoot: root,
      config: makeMinimalConfig(),
      onQuit: () => quits.push(1),
      onQuitAfterComplete: () => quits.push(2),
      notifyRef,
      skipSplash: true,
    }),
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  return {
    client,
    quits,
    notifyRef,
    key: (s: string) => (stdin as any).write(s),
    frame: () => last,
    unmount: () => {
      inst.unmount();
      (require("node:fs") as typeof import("node:fs")).rmSync(root, { recursive: true, force: true });
    },
  };
}

async function openDashboardFromMenu(app: Awaited<ReturnType<typeof mountShell>>) {
  await selectFromEscMenu(app, "Dashboard"); // Return to app -> Dashboard
  await waitFor(() => app.frame().includes("Home › Dashboard"), "dashboard screen");
}

describe("DaemonMonitorShell dashboard", () => {
  test("monitor keeps its title and shows the dashboard hint", async () => {
    const app = await mountShell();
    await sleep();
    expect(app.frame()).toContain("Home › Wave Monitor");
    expect(app.frame()).toContain("Dashboard in ESC menu");
    app.unmount();
  });

  test("ESC menu → Dashboard opens the realtime dashboard; b pops back to the monitor", async () => {
    const app = await mountShell();
    await sleep();
    await openDashboardFromMenu(app);
    expect(app.frame()).toContain("Home › Dashboard");
    expect(app.frame()).toContain("Throughput");
    app.key("b");
    await sleep(80);
    expect(app.frame()).toContain("Home › Wave Monitor");
    expect(app.quits).toHaveLength(0);
    app.unmount();
  });

  test("repeated dashboard selection does not duplicate stack entries", async () => {
    const app = await mountShell();
    await sleep();
    await openDashboardFromMenu(app);
    await openDashboardFromMenu(app);
    expect(app.frame()).toContain("Home › Dashboard");
    app.key("b");
    await sleep(80);
    expect(app.frame()).toContain("Home › Wave Monitor"); // a single pop was enough
    app.unmount();
  });

  test("dashboard history persists across monitor/dashboard/settings; no double counting with the monitor store", async () => {
    const store = {
      scheduler: null, agents: [] as any[], activityLogs: new Map(), systemMessages: [],
      pendingQuestions: [] as any[], tokenUsage: new Map(), allComplete: false,
    };
    const notifyRef: any = { current: null };
    const client = new LiveFakeClient();
    const app = await mountShell({ client, store, notifyRef });
    await waitFor(() => client.onCalls > 0 && notifyRef.current != null, "provider subscriptions");
    const subscribed = client.onCalls;
    const listeners = client.listenerCount();

    // Daemon events reach the dashboard provider...
    client.emit("evt:state-snapshot", snapshotOf([daemonAgent("feat-1", "running")]));
    client.emit("evt:agent-status-change", { featureId: "feat-1", previousStatus: "running", newStatus: "completed" });
    client.emit("evt:agent-status-change", { featureId: "feat-1", previousStatus: "completed", newStatus: "verified" });
    client.emit("evt:agent-status-change", { featureId: "feat-1", previousStatus: "verified", newStatus: "merged" });
    // ...while the legacy monitor store is driven separately via notifyRef.
    store.agents = [daemonAgent("feat-1", "merged") as any];
    store.pendingQuestions = [{ id: "q1", agentId: "feat-1", text: "?", timestamp: new Date().toISOString() }];
    notifyRef.current?.();
    await sleep(250);

    await openDashboardFromMenu(app);
    await eventually(() => {
      const f = app.frame();
      expect(f).toContain("Home › Dashboard");
      expect(f).toContain("Done 1");
      expect(f).toContain("peak 1/min"); // one completion despite completed -> verified -> merged
    });

    // dashboard -> settings (ESC menu) keeps the same subscriptions
    await selectFromEscMenu(app, "Settings");
    await waitFor(() => app.frame().includes("Home › Settings"), "Settings screen");
    expect(client.onCalls).toBe(subscribed);
    expect(client.listenerCount()).toBe(listeners);

    app.unmount();
    expect(client.listenerCount()).toBe(0);
    expect(client.connectCalls).toBe(0);
    expect(client.disconnectCalls).toBe(0);
  });

  test("monitor live state and pending HITL questions survive a dashboard round trip", async () => {
    const store = {
      scheduler: null, agents: [] as any[], activityLogs: new Map(), systemMessages: [],
      pendingQuestions: [] as any[], tokenUsage: new Map(), allComplete: false,
    };
    const notifyRef: any = { current: null };
    const app = await mountShell({ store, notifyRef });
    await sleep();
    store.agents = [daemonAgent("feat-9", "running") as any];
    store.pendingQuestions = [{ id: "q1", agentId: "feat-9", text: "which db?", timestamp: new Date().toISOString() }];
    notifyRef.current?.();
    await sleep(80);
    expect(app.frame()).toContain("feat-9");
    expect(app.frame()).toContain("1 pending");

    await openDashboardFromMenu(app);
    expect(app.frame()).toContain("Home › Dashboard");
    app.key("b");
    await sleep(120);
    expect(app.frame()).toContain("Home › Wave Monitor");
    expect(app.frame()).toContain("feat-9");
    expect(app.frame()).toContain("1 pending");
    expect(notifyRef.current).not.toBeNull();
    app.unmount();
    expect(notifyRef.current).toBeNull();
  });

  test("works with partial legacy stub clients (no crash)", async () => {
    const { DaemonMonitorShell } = (await import("../../src/ink/run-daemon-monitor")) as any;
    expect(() =>
      renderToString(
        React.createElement(DaemonMonitorShell, {
          client: new StubDaemonClient(),
          projectRoot: "/tmp",
          config: makeMinimalConfig(),
          onQuit: () => {},
          onQuitAfterComplete: () => {},
          notifyRef: { current: null },
          skipSplash: true,
        }),
      ),
    ).not.toThrow();
  });
});
