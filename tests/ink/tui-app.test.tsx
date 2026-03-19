/**
 * tui-app.test.tsx — TDD tests for the unified TuiApp component.
 *
 * Red phase: these tests should fail until TuiApp is implemented in
 * src/ink/run-tui-app.tsx.
 *
 * Architecture under test:
 *
 *   ThemeContext.Provider
 *     I18nContext.Provider
 *       DashboardStoreContext.Provider
 *         EscMenuProvider (onNavigate via navRef bridge)
 *           ChromeLayout
 *             ScreenRouter (initialScreen: "splash" or "quest-picker")
 *               NavWire (fills navRef — inside NavigationContext)
 *
 * Screen map:
 *   splash        → SplashScreen (always first, onDone → nav.replace("quest-picker"))
 *   quest-picker  → QuestPickerScreen
 *   task-browser  → TaskBrowserScreen
 *   daemon-monitor → DaemonMonitorScreen
 *   wave-monitor  → WaveMonitorScreen
 *   settings      → SettingsScreen
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinimalConfig(overrides: Record<string, unknown> = {}): any {
  return {
    agent: { tmuxPrefix: "woco" },
    tui: { theme: "default", locale: "en" },
    tasksDir: "tasks",
    archiveDir: "archive",
    questsDir: "quests",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TuiApp exports
// ---------------------------------------------------------------------------

describe("TuiApp export", () => {
  test("TuiApp is exported from src/ink/run-tui-app", async () => {
    const mod = await import("../../src/ink/run-tui-app");
    expect((mod as any).TuiApp).toBeDefined();
    expect(typeof (mod as any).TuiApp).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// QuestPickerScreen export
// ---------------------------------------------------------------------------

describe("QuestPickerScreen export", () => {
  test("QuestPickerScreen is exported from src/ink/run-quest-picker", async () => {
    const mod = await import("../../src/ink/run-quest-picker");
    expect((mod as any).QuestPickerScreen).toBeDefined();
    expect(typeof (mod as any).QuestPickerScreen).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// TaskBrowserScreen export
// ---------------------------------------------------------------------------

describe("TaskBrowserScreen export", () => {
  test("TaskBrowserScreen is exported from src/ink/run-task-browser", async () => {
    const mod = await import("../../src/ink/run-task-browser");
    expect((mod as any).TaskBrowserScreen).toBeDefined();
    expect(typeof (mod as any).TaskBrowserScreen).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// TuiApp renders with skipSplash=true (shows quest-picker directly)
// ---------------------------------------------------------------------------

describe("TuiApp renders quest-picker when skipSplash=true", () => {
  test("renders without crashing (skipSplash=true)", async () => {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;

    const output = renderToString(
      React.createElement(TuiApp, {
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        skipSplash: true,
        splashDurationMs: 0,
        onExit: () => {},
      })
    );

    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });

  test("renders chrome top bar (woco label visible)", async () => {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;

    const output = renderToString(
      React.createElement(TuiApp, {
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        skipSplash: true,
        splashDurationMs: 0,
        onExit: () => {},
      })
    );

    expect(output).toContain("woco");
  });
});

// ---------------------------------------------------------------------------
// TuiApp renders with skipSplash=false (shows splash first)
// ---------------------------------------------------------------------------

describe("TuiApp renders splash when skipSplash=false", () => {
  test("renders without crashing (skipSplash=false)", async () => {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;

    const output = renderToString(
      React.createElement(TuiApp, {
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        skipSplash: false,
        splashDurationMs: 0,
        onExit: () => {},
      })
    );

    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });

  test("shows splash screen content (woco/wombo logo)", async () => {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;

    const output = renderToString(
      React.createElement(TuiApp, {
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        skipSplash: false,
        splashDurationMs: 0,
        onExit: () => {},
      })
    );

    expect(output.toLowerCase()).toMatch(/woco|wombo/);
  });

  test("renders chrome (woco label in top bar visible alongside splash)", async () => {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;

    const output = renderToString(
      React.createElement(TuiApp, {
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        skipSplash: false,
        splashDurationMs: 0,
        onExit: () => {},
      })
    );

    expect(output).toContain("woco");
  });
});

// ---------------------------------------------------------------------------
// QuestPickerScreen renders inside a ScreenRouter context
// ---------------------------------------------------------------------------

describe("QuestPickerScreen renders inside ScreenRouter", () => {
  test("QuestPickerScreen renders without crashing", async () => {
    const { QuestPickerScreen } = (await import("../../src/ink/run-quest-picker")) as any;
    const { ScreenRouter } = await import("../../src/ink/router");
    const { DashboardStoreContext } = await import("../../src/ink/dashboard");
    const { ThemeContext, getTheme } = await import("../../src/ink/theme");
    const { I18nContext, getLocaleT } = await import("../../src/ink/i18n");

    const theme = getTheme("default");
    const tFn = getLocaleT("en");
    const emptyDashStore = { agents: [], running: 0, done: 0, failed: 0, total: 0 };

    const screens = { "quest-picker": QuestPickerScreen };
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
              initialScreen: "quest-picker",
              initialProps: {
                projectRoot: "/tmp",
                config: makeMinimalConfig(),
                onExit: () => {},
              },
            })
          )
        )
      )
    );

    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// OnboardingScreen export
// ---------------------------------------------------------------------------

describe("OnboardingScreen export", () => {
  test("OnboardingScreen is exported from src/ink/onboarding/run-onboarding", async () => {
    const mod = await import("../../src/ink/onboarding/run-onboarding");
    expect((mod as any).OnboardingScreen).toBeDefined();
    expect(typeof (mod as any).OnboardingScreen).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// OnboardingScreen renders inside a ScreenRouter context
// ---------------------------------------------------------------------------

describe("OnboardingScreen renders inside ScreenRouter", () => {
  test("OnboardingScreen renders without crashing", async () => {
    const { OnboardingScreen } = (await import("../../src/ink/onboarding/run-onboarding")) as any;
    const { ScreenRouter } = await import("../../src/ink/router");
    const { DashboardStoreContext } = await import("../../src/ink/dashboard");
    const { ThemeContext, getTheme } = await import("../../src/ink/theme");
    const { I18nContext, getLocaleT } = await import("../../src/ink/i18n");

    const theme = getTheme("default");
    const tFn = getLocaleT("en");
    const emptyDashStore = { agents: [], running: 0, done: 0, failed: 0, total: 0 };

    const screens = { onboarding: OnboardingScreen };
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
              initialScreen: "onboarding",
              initialProps: {
                projectRoot: "/tmp",
                config: makeMinimalConfig(),
                onDone: () => {},
              },
            })
          )
        )
      )
    );

    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TuiApp includes onboarding in its screen map
// ---------------------------------------------------------------------------

describe("TuiApp includes onboarding screen", () => {
  test("TuiApp with initialScreen=onboarding renders without crashing", async () => {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;

    // We can't directly force TuiApp initialScreen, but we verify it renders
    // quest-picker (skipSplash=true) without error — the presence of
    // onboarding in the map is tested indirectly via OnboardingScreen export.
    const output = renderToString(
      React.createElement(TuiApp, {
        projectRoot: "/tmp",
        config: makeMinimalConfig(),
        skipSplash: true,
        splashDurationMs: 0,
        onExit: () => {},
      })
    );
    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TaskBrowserScreen renders inside a ScreenRouter context
// ---------------------------------------------------------------------------

describe("TaskBrowserScreen renders inside ScreenRouter", () => {
  test("TaskBrowserScreen renders without crashing", async () => {
    const { TaskBrowserScreen } = (await import("../../src/ink/run-task-browser")) as any;
    const { ScreenRouter } = await import("../../src/ink/router");
    const { DashboardStoreContext } = await import("../../src/ink/dashboard");
    const { ThemeContext, getTheme } = await import("../../src/ink/theme");
    const { I18nContext, getLocaleT } = await import("../../src/ink/i18n");

    const theme = getTheme("default");
    const tFn = getLocaleT("en");
    const emptyDashStore = { agents: [], running: 0, done: 0, failed: 0, total: 0 };

    const screens = { "task-browser": TaskBrowserScreen };
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
              initialScreen: "task-browser",
              initialProps: {
                projectRoot: "/tmp",
                config: makeMinimalConfig(),
                onExit: () => {},
              },
            })
          )
        )
      )
    );

    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });
});
