/**
 * session-nesting.test.ts — TDD tests for the skipAltScreen option.
 *
 * Problem: When InkDaemonTUI / InkWomboTUI are used from inside tui.ts
 * (which already owns the alt-screen via enterAltScreen()), they call
 * this._session.start() which re-enters alt-screen and this._session.stop()
 * which exits it — corrupting the outer session.
 *
 * Fix: Add `skipAltScreen?: boolean` option to InkTUIOptions and
 * InkDaemonTUIOptions. When true, the _session is not started or stopped
 * by the TUI class — the outer caller owns the alt-screen entirely.
 *
 * These tests verify:
 *   1. By default (skipAltScreen omitted), _session.start() IS called on start().
 *   2. When skipAltScreen: true, _session.start() is NOT called on start().
 *   3. By default, _session.stop() IS called on stop().
 *   4. When skipAltScreen: true, _session.stop() is NOT called on stop().
 *   5. Same four assertions for InkDaemonTUI.
 *   6. The _session.isActive() state correctly reflects the skipped lifecycle.
 */

import { describe, test, expect, mock, beforeEach, afterEach, spyOn } from "bun:test";

// ---------------------------------------------------------------------------
// Minimal stubs to avoid real TTY / daemon / monitor work
// ---------------------------------------------------------------------------

function makeMinimalConfig(): any {
  return {
    baseBranch: "main",
    tui: { theme: "default", locale: "en" },
    agent: { tmuxPrefix: "woco", name: "agent.md" },
    agentRegistry: { mode: "disabled" },
    devMode: false,
  };
}

function makeMinimalState(): any {
  return {
    wave_id: "test-wave",
    base_branch: "main",
    model: null,
    agents: [],
    created_at: new Date().toISOString(),
    max_concurrent: 1,
  };
}

function makeMinimalMonitor(): any {
  return {
    activityLogs: new Map(),
    tokenCollector: {
      getAllRecords: () => [],
      getSummary: () => null,
    },
    getActivityLog: () => [],
    killAll: () => {},
  };
}

function makeMinimalClient(): any {
  return {
    requestState: () => Promise.resolve({ scheduler: null, agents: [] }),
    on: (_event: string, _handler: any) => () => {},
    retryAgent: () => {},
    answerHitl: () => {},
    start: () => {},
  };
}

// ---------------------------------------------------------------------------
// InkWomboTUI — skipAltScreen
// ---------------------------------------------------------------------------

describe("InkWomboTUI skipAltScreen", () => {
  test("default: _session.start() IS called on tui.start()", async () => {
    const { InkWomboTUI } = await import("../../src/ink/run-wave-monitor");
    const tui = new InkWomboTUI({
      state: makeMinimalState(),
      monitor: makeMinimalMonitor(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
    });
    // Track start calls
    let startCalled = false;
    const orig = tui._session.start.bind(tui._session);
    tui._session.start = () => { startCalled = true; };
    // Also stub mount so we don't try to render to a real terminal
    (tui as any).mount = () => {};
    (tui as any).interceptConsole = () => {};
    tui.start();
    expect(startCalled).toBe(true);
    // cleanup
    tui._session.start = orig;
  });

  test("skipAltScreen: true — _session.start() is NOT called on tui.start()", async () => {
    const { InkWomboTUI } = await import("../../src/ink/run-wave-monitor");
    const tui = new InkWomboTUI({
      state: makeMinimalState(),
      monitor: makeMinimalMonitor(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
      skipAltScreen: true,
    });
    let startCalled = false;
    tui._session.start = () => { startCalled = true; };
    (tui as any).mount = () => {};
    (tui as any).interceptConsole = () => {};
    tui.start();
    expect(startCalled).toBe(false);
  });

  test("default: _session.stop() IS called on tui.stop()", async () => {
    const { InkWomboTUI } = await import("../../src/ink/run-wave-monitor");
    const tui = new InkWomboTUI({
      state: makeMinimalState(),
      monitor: makeMinimalMonitor(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
    });
    let stopCalled = false;
    const orig = tui._session.stop.bind(tui._session);
    tui._session.stop = () => { stopCalled = true; };
    (tui as any).mount = () => {};
    (tui as any).interceptConsole = () => {};
    (tui as any).restoreConsole = () => {};
    (tui as any).unmount = () => {};
    tui._session.start = () => {}; // prevent real start
    tui.start();
    tui.stop();
    expect(stopCalled).toBe(true);
    tui._session.stop = orig;
  });

  test("skipAltScreen: true — _session.stop() is NOT called on tui.stop()", async () => {
    const { InkWomboTUI } = await import("../../src/ink/run-wave-monitor");
    const tui = new InkWomboTUI({
      state: makeMinimalState(),
      monitor: makeMinimalMonitor(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
      skipAltScreen: true,
    });
    let stopCalled = false;
    tui._session.stop = () => { stopCalled = true; };
    (tui as any).mount = () => {};
    (tui as any).interceptConsole = () => {};
    (tui as any).restoreConsole = () => {};
    (tui as any).unmount = () => {};
    tui._session.start = () => {};
    tui.start();
    tui.stop();
    expect(stopCalled).toBe(false);
  });

  test("skipAltScreen: true — _session.isActive() remains false after start+stop", async () => {
    const { InkWomboTUI } = await import("../../src/ink/run-wave-monitor");
    const tui = new InkWomboTUI({
      state: makeMinimalState(),
      monitor: makeMinimalMonitor(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
      skipAltScreen: true,
    });
    (tui as any).mount = () => {};
    (tui as any).interceptConsole = () => {};
    (tui as any).restoreConsole = () => {};
    (tui as any).unmount = () => {};
    tui.start();
    expect(tui._session.isActive()).toBe(false);
    tui.stop();
    expect(tui._session.isActive()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// InkDaemonTUI — skipAltScreen
// ---------------------------------------------------------------------------

describe("InkDaemonTUI skipAltScreen", () => {
  test("default: _session.start() IS called on tui.start()", async () => {
    const { InkDaemonTUI } = await import("../../src/ink/run-daemon-monitor");
    const tui = new InkDaemonTUI({
      client: makeMinimalClient(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
    });
    let startCalled = false;
    const orig = tui._session.start.bind(tui._session);
    tui._session.start = () => { startCalled = true; };
    (tui as any).subscribeToDaemonEvents = () => {};
    (tui as any).mount = () => {};
    tui.start();
    expect(startCalled).toBe(true);
    tui._session.start = orig;
  });

  test("skipAltScreen: true — _session.start() is NOT called on tui.start()", async () => {
    const { InkDaemonTUI } = await import("../../src/ink/run-daemon-monitor");
    const tui = new InkDaemonTUI({
      client: makeMinimalClient(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
      skipAltScreen: true,
    });
    let startCalled = false;
    tui._session.start = () => { startCalled = true; };
    (tui as any).subscribeToDaemonEvents = () => {};
    (tui as any).mount = () => {};
    tui.start();
    expect(startCalled).toBe(false);
  });

  test("default: _session.stop() IS called on tui.stop()", async () => {
    const { InkDaemonTUI } = await import("../../src/ink/run-daemon-monitor");
    const tui = new InkDaemonTUI({
      client: makeMinimalClient(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
    });
    let stopCalled = false;
    const orig = tui._session.stop.bind(tui._session);
    tui._session.stop = () => { stopCalled = true; };
    (tui as any).subscribeToDaemonEvents = () => {};
    (tui as any).mount = () => {};
    (tui as any).unmount = () => {};
    (tui as any).unsubscribeAll = () => {};
    tui._session.start = () => {};
    tui.start();
    tui.stop();
    expect(stopCalled).toBe(true);
    tui._session.stop = orig;
  });

  test("skipAltScreen: true — _session.stop() is NOT called on tui.stop()", async () => {
    const { InkDaemonTUI } = await import("../../src/ink/run-daemon-monitor");
    const tui = new InkDaemonTUI({
      client: makeMinimalClient(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
      skipAltScreen: true,
    });
    let stopCalled = false;
    tui._session.stop = () => { stopCalled = true; };
    (tui as any).subscribeToDaemonEvents = () => {};
    (tui as any).mount = () => {};
    (tui as any).unmount = () => {};
    (tui as any).unsubscribeAll = () => {};
    tui._session.start = () => {};
    tui.start();
    tui.stop();
    expect(stopCalled).toBe(false);
  });

  test("skipAltScreen: true — _session.isActive() remains false after start+stop", async () => {
    const { InkDaemonTUI } = await import("../../src/ink/run-daemon-monitor");
    const tui = new InkDaemonTUI({
      client: makeMinimalClient(),
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
      onQuit: () => {},
      skipAltScreen: true,
    });
    (tui as any).subscribeToDaemonEvents = () => {};
    (tui as any).mount = () => {};
    (tui as any).unmount = () => {};
    (tui as any).unsubscribeAll = () => {};
    tui.start();
    expect(tui._session.isActive()).toBe(false);
    tui.stop();
    expect(tui._session.isActive()).toBe(false);
  });
});
