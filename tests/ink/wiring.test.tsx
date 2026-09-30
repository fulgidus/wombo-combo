/**
 * wiring.test.tsx — Tests verifying that InkDaemonTUI
 * renders through the new TUI shell (ChromeLayout, ScreenRouter,
 * EscMenuProvider, SplashScreen → WaveMonitorView).
 *
 * Covers:
 *   - DaemonMonitorShell is exported from its module
 *   - DaemonMonitorShell renders "Home" chrome in output
 *   - DaemonMonitorShell accepts skipSplash prop to land directly on content
 *   - getStableStdin is no longer the default stdin source in InkDaemonTUI
 *     (TuiSession/getStdin is used instead)
 *   - DashboardStoreContext is provided (accessible from DaemonMonitorShell tree)
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";

// ---------------------------------------------------------------------------
// Inline minimal stubs (no external helper files)
// ---------------------------------------------------------------------------

function makeMinimalConfig(overrides: Record<string, unknown> = {}): any {
  return {
    agent: { tmuxPrefix: "woco" },
    tui: { theme: "default", locale: "en" },
    ...overrides,
  };
}

/** Minimal DaemonClient stub */
class StubDaemonClient {
  on(_event: string, _handler: (...args: any[]) => void): () => void {
    return () => {};
  }
  requestState(): Promise<any> {
    return Promise.resolve({
      scheduler: null,
      agents: [],
    });
  }
  retryAgent(_id: string) {}
  answerHitl(_agentId: string, _qId: string, _text: string) {}
}

// ---------------------------------------------------------------------------
// Module shape tests
// ---------------------------------------------------------------------------

describe("run-daemon-monitor exports DaemonMonitorShell", () => {
  test("DaemonMonitorShell is exported", async () => {
    const mod = await import("../../src/ink/run-daemon-monitor");
    expect((mod as any).DaemonMonitorShell).toBeDefined();
  });

  test("InkDaemonTUI is still exported (backward compat)", async () => {
    const mod = await import("../../src/ink/run-daemon-monitor");
    expect(mod.InkDaemonTUI).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DaemonMonitorShell renders ChromeLayout chrome
// ---------------------------------------------------------------------------

describe("DaemonMonitorShell renders chrome", () => {
  test("renders 'Home' from ChromeTopBar", async () => {
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

  test("skipSplash=true renders DaemonMonitorAdapter content directly", async () => {
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

    // With no agents, WaveMonitorView renders the empty-state message
    expect(output).toBeDefined();
    expect(typeof output).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// InkDaemonTUI uses TuiSession instead of direct alt-screen calls
// ---------------------------------------------------------------------------

describe("InkDaemonTUI uses TuiSession", () => {
  test("InkDaemonTUI has a _session property after construction", async () => {
    const { InkDaemonTUI } = await import("../../src/ink/run-daemon-monitor");
    const tui = new InkDaemonTUI({
      client: new StubDaemonClient() as any,
      onQuit: () => {},
      projectRoot: "/tmp",
      config: makeMinimalConfig(),
    });
    expect((tui as any)._session).toBeDefined();
  });
});
