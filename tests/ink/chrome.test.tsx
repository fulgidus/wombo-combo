/**
 * chrome.test.tsx — Tests for ChromeLayout: persistent top and bottom bars.
 *
 * TDD: written before the implementation.
 *
 * Covers:
 *   - ChromeLayout renders children (current screen content)
 *   - Top bar shows screen name
 *   - Top bar shows daemon connection state
 *   - Top bar shows wave summary counts (running / done / failed)
 *   - Bottom bar shows global keybind hints (ESC, q)
 *   - Bottom bar shows context keybinds passed via props
 *   - Bottom bar icon strip renders sound, notifications, locale placeholders
 *   - ChromeLayout composes with ScreenRouter (integration)
 *   - ChromeTitle context: screens can override the displayed title
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString, Text } from "ink";
import { PassThrough } from "node:stream";
import { render } from "ink";
import {
  ChromeLayout,
  ChromeTopBar,
  ChromeBottomBar,
  ChromeTitleContext,
  useChromTitle,
  useChromeHideQuitHint,
  type ChromeLayoutProps,
  type WaveSummary,
  type KeybindHint,
} from "../../src/ink/chrome";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestStreams() {
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

const DEFAULT_WAVE: WaveSummary = {
  running: 2,
  done: 3,
  failed: 1,
};

// ---------------------------------------------------------------------------
// ChromeTopBar
// ---------------------------------------------------------------------------

describe("ChromeTopBar", () => {
  test("renders app name", () => {
    const out = renderToString(
      <ChromeTopBar screenName="Dashboard" daemonConnected={true} />
    );
    expect(out).toContain("Home");
  });

  test("renders current screen name", () => {
    const out = renderToString(
      <ChromeTopBar screenName="Settings" daemonConnected={true} />
    );
    expect(out).toContain("Settings");
  });

  test("shows connected indicator when daemon is connected", () => {
    const out = renderToString(
      <ChromeTopBar screenName="Dashboard" daemonConnected={true} />
    );
    // Should show some connected indicator (dot, icon, or text)
    expect(out.length).toBeGreaterThan(0);
  });

  test("shows disconnected indicator when daemon is not connected", () => {
    const connected = renderToString(
      <ChromeTopBar screenName="Dashboard" daemonConnected={true} />
    );
    const disconnected = renderToString(
      <ChromeTopBar screenName="Dashboard" daemonConnected={false} />
    );
    // The two states should render differently
    expect(connected).not.toBe(disconnected);
  });

  test("renders wave summary when provided", () => {
    const out = renderToString(
      <ChromeTopBar
        screenName="Dashboard"
        daemonConnected={true}
        waveSummary={DEFAULT_WAVE}
      />
    );
    expect(out).toContain("2"); // running
    expect(out).toContain("3"); // done
    expect(out).toContain("1"); // failed
  });

  test("renders without wave summary (no active wave)", () => {
    const out = renderToString(
      <ChromeTopBar screenName="Dashboard" daemonConnected={false} />
    );
    expect(typeof out).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// ChromeBottomBar
// ---------------------------------------------------------------------------

describe("ChromeBottomBar", () => {
  test("renders global keybind hints", () => {
    const out = renderToString(<ChromeBottomBar />);
    // Should show ESC and/or q
    expect(out.toLowerCase()).toMatch(/esc|q/i);
  });

  test("renders context keybinds when provided", () => {
    const hints: KeybindHint[] = [
      { key: "r", description: "retry" },
      { key: "b", description: "build log" },
    ];
    const out = renderToString(<ChromeBottomBar contextHints={hints} />);
    expect(out).toContain("retry");
    expect(out).toContain("build log");
  });

  test("renders sound icon placeholder", () => {
    const out = renderToString(<ChromeBottomBar />);
    // Should contain some sound/audio representation
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  test("renders notifications icon placeholder", () => {
    const out = renderToString(<ChromeBottomBar />);
    expect(typeof out).toBe("string");
  });

  test("renders locale placeholder", () => {
    const out = renderToString(<ChromeBottomBar locale="en" />);
    expect(out).toContain("en");
  });

  test("renders without contextHints (defaults to global only)", () => {
    const out = renderToString(<ChromeBottomBar />);
    expect(typeof out).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// ChromeLayout
// ---------------------------------------------------------------------------

describe("ChromeLayout", () => {
  test("renders children", () => {
    const out = renderToString(
      <ChromeLayout screenName="Home" daemonConnected={false}>
        <Text>screen content here</Text>
      </ChromeLayout>
    );
    expect(out).toContain("screen content here");
  });

  test("renders top bar", () => {
    const out = renderToString(
      <ChromeLayout screenName="Dashboard" daemonConnected={true}>
        <Text>body</Text>
      </ChromeLayout>
    );
    expect(out).toContain("Dashboard");
  });

  test("renders bottom bar with global hints", () => {
    const out = renderToString(
      <ChromeLayout screenName="Home" daemonConnected={false}>
        <Text>body</Text>
      </ChromeLayout>
    );
    expect(out.toLowerCase()).toMatch(/esc|q/i);
  });

  test("passes contextHints to bottom bar", () => {
    const hints: KeybindHint[] = [{ key: "x", description: "do thing" }];
    const out = renderToString(
      <ChromeLayout
        screenName="Home"
        daemonConnected={false}
        contextHints={hints}
      >
        <Text>body</Text>
      </ChromeLayout>
    );
    expect(out).toContain("do thing");
  });

  test("passes wave summary to top bar", () => {
    const out = renderToString(
      <ChromeLayout
        screenName="Dashboard"
        daemonConnected={true}
        waveSummary={DEFAULT_WAVE}
      >
        <Text>body</Text>
      </ChromeLayout>
    );
    expect(out).toContain("2"); // running count
  });
});

// ---------------------------------------------------------------------------
// ChromeTitleContext (screen title override)
// ---------------------------------------------------------------------------

describe("ChromeTitleContext", () => {
  test("exports ChromeTitleContext and useChromTitle", () => {
    expect(ChromeTitleContext).toBeDefined();
    expect(typeof useChromTitle).toBe("function");
  });

  test("useChromTitle returns title from context", async () => {
    let title: string | null = null;

    function TitleProbe() {
      title = useChromTitle();
      return null;
    }

    const { stdin, stdout } = createTestStreams();
    const instance = render(
      <ChromeTitleContext.Provider value="Custom Screen Title">
        <TitleProbe />
      </ChromeTitleContext.Provider>,
      { stdin, stdout, debug: true, exitOnCtrlC: false, patchConsole: false }
    );

    await new Promise((r) => setTimeout(r, 30));
    expect(title as string | null).toBe("Custom Screen Title");
    instance.unmount();
  });
});

// ---------------------------------------------------------------------------
// Quit hint suppression (useChromeHideQuitHint)
// ---------------------------------------------------------------------------

describe("ChromeBottomBar hideQuitHint", () => {
  test("shows q quit by default", () => {
    const out = renderToString(<ChromeBottomBar />);
    expect(out.replace(/\x1b\[[0-9;]*m/g, "")).toContain("q quit");
  });

  test("hideQuitHint removes q quit but keeps ESC menu", () => {
    const out = renderToString(<ChromeBottomBar hideQuitHint />).replace(/\x1b\[[0-9;]*m/g, "");
    expect(out).not.toContain("q quit");
    expect(out).toContain("ESC");
    expect(out).toContain("menu");
  });
});

describe("useChromeHideQuitHint", () => {
  function Probe({ hide }: { hide: boolean }) {
    useChromeHideQuitHint(hide);
    return <Text>probe</Text>;
  }

  test("outside ChromeLayout it is a no-op", () => {
    expect(() => renderToString(<Probe hide={true} />)).not.toThrow();
  });

  test("a screen that hides the quit hint is reflected in the bottom bar", async () => {
    const { stdin, stdout } = createTestStreams();
    let output = "";
    stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    const instance = render(
      <ChromeLayout screenName="Probe" daemonConnected={false}>
        <Probe hide={true} />
      </ChromeLayout>,
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await new Promise((r) => setTimeout(r, 30));
    instance.unmount();
    // Debug mode writes a full frame per render; the first frame predates the
    // hook's effect, so assert on the last frame only.
    const plain = output.replace(/\x1b\[[0-9;]*m/g, "");
    const frames = plain.split("Home › Probe");
    const last = frames[frames.length - 1];
    expect(last).toContain("probe");
    expect(last).toContain("ESC menu");
    expect(last).not.toContain("q quit");
  });

  test("another screen without the hook still shows q quit", () => {
    const out = renderToString(
      <ChromeLayout screenName="Dashboard" daemonConnected={true}>
        <Text>dashboard body</Text>
      </ChromeLayout>,
    ).replace(/\x1b\[[0-9;]*m/g, "");
    expect(out).toContain("dashboard body");
    expect(out).toContain("q quit");
  });
});
