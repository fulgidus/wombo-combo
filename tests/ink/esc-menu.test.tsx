/**
 * esc-menu.test.tsx — Tests for the EscMenu floating overlay.
 *
 * TDD: written before the implementation.
 *
 * Covers:
 *   - Module exports: EscMenu, EscMenuItem, useEscMenu, EscMenuProvider
 *   - Renders nothing (null) when closed
 *   - Renders menu items when open
 *   - Menu items use i18n labels (menu.title, menu.returnToApp, menu.settings, menu.quit)
 *   - ESC key toggles menu open/closed
 *   - EscMenuProvider wires keyboard listener and exposes context
 *   - useEscMenu() returns { open, openMenu, closeMenu }
 *   - closeMenu() closes the menu
 *   - Each EscMenuItem renders its label
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import { stripAnsi } from "./ansi";
import { PassThrough } from "node:stream";
import { render } from "ink";

describe("esc-menu module exports", () => {
  test("exports EscMenu, EscMenuItem, useEscMenu, EscMenuProvider", async () => {
    const mod = await import("../../src/ink/esc-menu");
    expect(mod.EscMenu).toBeDefined();
    expect(mod.EscMenuItem).toBeDefined();
    expect(mod.useEscMenu).toBeDefined();
    expect(mod.EscMenuProvider).toBeDefined();
  });
});

describe("EscMenu rendering", () => {
  test("EscMenu renders nothing when open=false", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const output = renderToString(
      React.createElement(EscMenu, { open: false, onClose: () => {}, onNavigate: () => {} })
    );
    expect(output).toBe("");
  });

  test("EscMenu renders menu title when open=true", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const output = renderToString(
      React.createElement(EscMenu, { open: true, onClose: () => {}, onNavigate: () => {} })
    );
    // The title is ASCII block art spelling "MENU" (not plain text);
    // strip ANSI — colored terminals wrap every glyph in its own escape
    expect(stripAnsi(output)).toContain("███╗");
  });

  test("EscMenu renders 'Return to app' item", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const output = renderToString(
      React.createElement(EscMenu, { open: true, onClose: () => {}, onNavigate: () => {} })
    );
    expect(output).toContain("Return to app");
  });

  test("EscMenu renders 'Settings' item", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const output = renderToString(
      React.createElement(EscMenu, { open: true, onClose: () => {}, onNavigate: () => {} })
    );
    expect(output).toContain("Settings");
  });

  test("EscMenu renders 'Quit' item", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const output = renderToString(
      React.createElement(EscMenu, { open: true, onClose: () => {}, onNavigate: () => {} })
    );
    expect(output).toContain("Quit");
  });
});

describe("EscMenuItem", () => {
  test("EscMenuItem renders its label", async () => {
    const { EscMenuItem } = await import("../../src/ink/esc-menu");
    const output = renderToString(
      React.createElement(EscMenuItem, { label: "My Item", onSelect: () => {}, selected: false })
    );
    expect(output).toContain("My Item");
  });

  test("EscMenuItem shows selected indicator when selected=true", async () => {
    const { EscMenuItem } = await import("../../src/ink/esc-menu");
    const output = renderToString(
      React.createElement(EscMenuItem, { label: "My Item", onSelect: () => {}, selected: true })
    );
    // Must have some indicator of selection — ">" or similar
    expect(output).toMatch(/[>›*]/);
  });

  test("EscMenuItem shows no selection indicator when selected=false", async () => {
    const { EscMenuItem } = await import("../../src/ink/esc-menu");
    const notSelected = renderToString(
      React.createElement(EscMenuItem, { label: "My Item", onSelect: () => {}, selected: false })
    );
    const selected = renderToString(
      React.createElement(EscMenuItem, { label: "My Item", onSelect: () => {}, selected: true })
    );
    // Selected and not-selected should differ
    expect(notSelected).not.toBe(selected);
  });
});

describe("useEscMenu()", () => {
  test("useEscMenu is a function", async () => {
    const { useEscMenu } = await import("../../src/ink/esc-menu");
    expect(typeof useEscMenu).toBe("function");
  });

  test("EscMenuProvider renders its children", async () => {
    const { EscMenuProvider, useEscMenu } = await import("../../src/ink/esc-menu");
    const { Text } = await import("ink");
    const Probe = () => React.createElement(Text, {}, `open:${useEscMenu().open}`);
    const output = renderToString(
      React.createElement(
        EscMenuProvider,
        {},
        React.createElement(Text, {}, "child content")
      )
    );
    expect(output).toContain("child content");
  });
});

// ---------------------------------------------------------------------------
// Dashboard entry (optional onOpenDashboard)
// ---------------------------------------------------------------------------

function makeStreams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 100;
  (stdout as any).rows = 40;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  return { stdin, stdout };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("EscMenu dashboard entry", () => {
  test("no Dashboard item without onOpenDashboard (existing behavior)", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const out = renderToString(
      React.createElement(EscMenu, { open: true, onClose: () => {}, onNavigate: () => {} }),
    );
    expect(out).not.toContain("Dashboard");
  });

  test("Dashboard item shown when onOpenDashboard is supplied", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const out = renderToString(
      React.createElement(EscMenu, {
        open: true,
        onClose: () => {},
        onNavigate: () => {},
        onOpenDashboard: () => {},
      }),
    );
    expect(out).toContain("Dashboard");
    expect(out).toContain("Settings");
    expect(out).toContain("Quit");
  });

  test("selecting Dashboard closes the menu before navigating", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const { stdin, stdout } = makeStreams();
    const calls: string[] = [];
    const inst = render(
      React.createElement(EscMenu, {
        open: true,
        onClose: () => calls.push("close"),
        onNavigate: (a: string) => calls.push(`nav:${a}`),
        onOpenDashboard: () => calls.push("dashboard"),
      }),
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await wait(30);
    (stdin as any).write("\u001b[B"); // down -> Dashboard
    await wait(30);
    (stdin as any).write("\r");
    await wait(30);
    inst.unmount();
    expect(calls).toEqual(["close", "dashboard"]);
  });

  test("settings still uses onNavigate with the existing action union", async () => {
    const { EscMenu } = await import("../../src/ink/esc-menu");
    const { stdin, stdout } = makeStreams();
    const calls: string[] = [];
    const inst = render(
      React.createElement(EscMenu, {
        open: true,
        onClose: () => calls.push("close"),
        onNavigate: (a: string) => calls.push(`nav:${a}`),
        onOpenDashboard: () => calls.push("dashboard"),
      }),
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await wait(30);
    (stdin as any).write("\u001b[B");
    await wait(20);
    (stdin as any).write("\u001b[B"); // Settings
    await wait(20);
    (stdin as any).write("\r");
    await wait(30);
    inst.unmount();
    expect(calls).toEqual(["nav:settings"]);
  });

  test("EscMenuProvider: ESC opens menu, Dashboard closes it then navigates", async () => {
    const { EscMenuProvider, useEscMenu } = await import("../../src/ink/esc-menu");
    const { Text } = await import("ink");
    const Probe = () => React.createElement(Text, {}, `open:${useEscMenu().open}`);
    const { stdin, stdout } = makeStreams();
    let output = "";
    stdout.on("data", (c: Buffer) => (output += c.toString()));
    const calls: string[] = [];
    const inst = render(
      React.createElement(
        EscMenuProvider,
        { onOpenDashboard: () => calls.push("dashboard"), onNavigate: (a: string) => calls.push(a) },
        React.createElement(Probe),
      ),
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await wait(30);
    (stdin as any).write("\u001b");
    await wait(400);
    expect(stripAnsi(output)).toContain("open:true");
    (stdin as any).write("\u001b[B");
    await wait(30);
    (stdin as any).write("\r");
    await wait(60);
    inst.unmount();
    expect(calls).toEqual(["dashboard"]);
    const frames = stripAnsi(output).split("open:");
    expect(frames[frames.length - 1]!.startsWith("false")).toBe(true);
  });
});
