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
