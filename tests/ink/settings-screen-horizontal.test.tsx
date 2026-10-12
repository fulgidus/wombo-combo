/**
 * settings-screen-horizontal.test.tsx — Left/right arrows change the value of
 * the selected setting (previous/next for pickers, toggle for booleans).
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { waitFor, eventually } from "../helpers/wait-for";
import { SettingsScreen, type SettingsScreenConfig } from "../../src/ink/settings-screen";

const RIGHT = "\x1b[C";
const LEFT = "\x1b[D";
const DOWN = "\x1b[B";

function mount(config: SettingsScreenConfig) {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 120;
  (stdout as any).rows = 50;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  const saves: SettingsScreenConfig[] = [];
  const inst = render(
    React.createElement(SettingsScreen, {
      config,
      onSave: (c: SettingsScreenConfig) => saves.push(c),
      onBack: () => {},
    }),
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  const write = (s: string) => (stdin as unknown as { write: (s: string) => void }).write(s);
  return { saves, write, unmount: () => inst.unmount() };
}

describe("SettingsScreen horizontal arrows", () => {
  test("right arrow cycles theme forward", async () => {
    const s = mount({ tui: { theme: "default" } });
    s.write(RIGHT);
    await waitFor(() => s.saves.length === 1);
    expect(s.saves[0].tui?.theme).toBe("high-contrast");
    s.unmount();
  });

  test("left arrow cycles theme backward (wraps)", async () => {
    const s = mount({ tui: { theme: "default" } });
    s.write(LEFT);
    await waitFor(() => s.saves.length === 1);
    expect(s.saves[0].tui?.theme).toBe("minimal");
    s.unmount();
  });

  test("left/right toggle a boolean field", async () => {
    const s = mount({ tui: { checkForUpdates: true } });
    s.write(DOWN);
    s.write(DOWN);
    await new Promise((r) => setTimeout(r, 50));
    s.write(LEFT);
    await waitFor(() => s.saves.length === 1);
    expect(s.saves[0].tui?.checkForUpdates).toBe(false);
    s.unmount();
  });

  test("horizontal arrows do not reset on the reset row", async () => {
    const s = mount({ tui: { theme: "minimal" } });
    for (let i = 0; i < 5; i++) s.write(DOWN);
    await new Promise((r) => setTimeout(r, 50));
    s.write(RIGHT);
    await new Promise((r) => setTimeout(r, 50));
    expect(s.saves.length).toBe(0);
    s.unmount();
  });
});

describe("SettingsScreen agents & routing entry", () => {
  test("Enter on the Agents & routing row opens the screen", async () => {
    let opened = 0;
    const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
    (stdout as any).columns = 120;
    (stdout as any).rows = 50;
    const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
    (stdin as any).isTTY = true;
    (stdin as any).setRawMode = () => stdin;
    (stdin as any).ref = () => stdin;
    (stdin as any).unref = () => stdin;
    const inst = render(
      React.createElement(SettingsScreen, {
        config: {},
        onSave: () => {},
        onBack: () => {},
        onOpenAgents: () => opened++,
      }),
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    const w = (s: string) => (stdin as unknown as { write: (s: string) => void }).write(s);
    for (let i = 0; i < 5; i++) {
      w(DOWN);
      await new Promise((r) => setTimeout(r, 30));
    }
    w("\r");
    await eventually(() => expect(opened).toBe(1));
    inst.unmount();
  });
});
