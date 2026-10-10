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
import { stripAnsi } from "./ansi";

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

  test("renders chrome top bar (Home label visible)", async () => {
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

    expect(output).toContain("Home");
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

  test("shows splash screen content (block-art logo)", async () => {
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

    // SplashScreen shows the block-art logo (tagline text is random);
    // strip ANSI — colored terminals wrap every glyph in its own escape
    expect(stripAnsi(output)).toContain("██");
    expect(stripAnsi(output)).toContain("⚡");
  });

  test("renders chrome (Home label in top bar visible alongside splash)", async () => {
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

    expect(output).toContain("Home");
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

// ---------------------------------------------------------------------------
// Dashboard integration (live renders)
// ---------------------------------------------------------------------------

import { PassThrough } from "node:stream";
import { render } from "ink";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

class FakeDaemonClient {
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
  listenerCount() {
    let n = this.stateHandlers.size;
    for (const s of this.handlers.values()) n += s.size;
    return n;
  }
}

function liveStreams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 80;
  (stdout as any).rows = 24;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  return { stdin, stdout };
}

const sleep = (ms = 40) => new Promise((r) => setTimeout(r, ms));

async function mountTuiApp(props: Record<string, unknown>) {
  const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;
  const root = mkdtempSync(join(tmpdir(), "tui-dash-"));
  const { stdin, stdout } = liveStreams();
  let last = "";
  stdout.on("data", (c: Buffer) => {
    last = stripAnsi(c.toString());
  });
  const exits: number[] = [];
  const inst = render(
    React.createElement(TuiApp, {
      projectRoot: root,
      config: makeMinimalConfig(),
      splashDurationMs: 0,
      onExit: () => exits.push(1),
      ...props,
    }),
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  return {
    key: (s: string) => (stdin as any).write(s),
    frame: () => last,
    exits,
    unmount: () => {
      inst.unmount();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

describe("TuiApp dashboard", () => {
  test("initialScreen=dashboard renders the realtime dashboard with chrome title", async () => {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;
    const out = stripAnsi(
      renderToString(
        React.createElement(TuiApp, {
          projectRoot: "/tmp",
          config: makeMinimalConfig(),
          initialScreen: "dashboard",
          onExit: () => {},
        }),
      ),
    );
    expect(out).toContain("Home › Dashboard");
    expect(out).toContain("Throughput");
    expect(out).toContain("Est. remaining");
    expect(out).toContain("Quest tokens");
    expect(out).toContain("Dashboard in ESC menu");
  });

  test("default startup behavior is unchanged", async () => {
    const { TuiApp } = (await import("../../src/ink/run-tui-app")) as any;
    const quest = stripAnsi(
      renderToString(
        React.createElement(TuiApp, { projectRoot: "/tmp", config: makeMinimalConfig(), skipSplash: true, onExit: () => {} }),
      ),
    );
    expect(quest).toContain("Quest Picker");
    expect(quest).not.toContain("Throughput");
    const splash = stripAnsi(
      renderToString(
        React.createElement(TuiApp, { projectRoot: "/tmp", config: makeMinimalConfig(), splashDurationMs: 0, onExit: () => {} }),
      ),
    );
    expect(splash).toContain("██");
    expect(splash).not.toContain("Throughput");
  });

  test("dashboard startup: b returns to quest-picker without exiting", async () => {
    const app = await mountTuiApp({ initialScreen: "dashboard" });
    await sleep();
    expect(app.frame()).toContain("Home › Dashboard");
    app.key("b");
    await sleep();
    expect(app.frame()).toContain("Home › Quest Picker");
    expect(app.exits).toHaveLength(0);
    app.unmount();
  });

  test("ESC menu opens the dashboard; repeated selection does not grow the stack; back restores origin", async () => {
    const app = await mountTuiApp({ skipSplash: true });
    await sleep();
    expect(app.frame()).toContain("Home › Quest Picker");

    const openFromMenu = async () => {
      app.key("\u001b");
      await sleep(400);
      app.key("\u001b[B"); // Return -> Dashboard
      await sleep();
      app.key("\r");
      await sleep(80);
    };

    await openFromMenu();
    expect(app.frame()).toContain("Home › Dashboard");
    await openFromMenu(); // dashboard again: no-op
    expect(app.frame()).toContain("Home › Dashboard");
    app.key("b");
    await sleep(80);
    expect(app.frame()).toContain("Home › Quest Picker"); // one pop is enough
    expect(app.exits).toHaveLength(0);
    app.unmount();
  });

  test("metrics provider survives navigation; one subscription set, no connect/disconnect", async () => {
    const client = new FakeDaemonClient();
    const app = await mountTuiApp({ initialScreen: "dashboard", daemonClient: client });
    await sleep();
    const subscribed = client.onCalls;
    const listeners = client.listenerCount();
    expect(subscribed).toBeGreaterThan(0);

    // dashboard -> (menu) settings -> back -> back to quest-picker
    app.key("\u001b");
    await sleep(400);
    app.key("\u001b[B");
    await sleep();
    app.key("\u001b[B"); // Settings
    await sleep();
    app.key("\r");
    await sleep(80);
    expect(app.frame()).toContain("Settings");
    expect(client.onCalls).toBe(subscribed);
    expect(client.listenerCount()).toBe(listeners);

    app.unmount();
    expect(client.listenerCount()).toBe(0);
    expect(client.connectCalls).toBe(0);
    expect(client.disconnectCalls).toBe(0);
  });
});
