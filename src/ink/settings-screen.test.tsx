/**
 * settings-screen.test.tsx — Tests for the SettingsScreen Ink component.
 *
 * Verifies:
 *   - Left/right arrows change the value of the selected setting
 *   - Right = next option, left = previous option
 *   - Enter still changes the value
 *   - Arrows never trigger the destructive reset row
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { SettingsScreen } from "./settings-screen";

const RIGHT = "\x1b[C";
const LEFT = "\x1b[D";
const DOWN = "\x1b[B";

function setup(initial: any = {}) {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 100;
  (stdout as any).rows = 40;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  const saves: any[] = [];
  const instance = render(
    <SettingsScreen config={initial} onSave={(c) => saves.push(c)} onBack={() => {}} />,
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  const press = async (seq: string) => {
    (stdin as any as PassThrough).write(seq);
    await new Promise((r) => setTimeout(r, 40));
  };
  return {
    saves,
    press,
    cleanup: async () => {
      instance.unmount();
      await instance.waitUntilExit();
    },
  };
}

describe("SettingsScreen horizontal arrows", () => {
  test("right arrow selects the next theme", async () => {
    const { saves, press, cleanup } = setup({ tui: { theme: "default" } });
    await press(RIGHT);
    expect(saves.at(-1).tui.theme).toBe("high-contrast");
    await cleanup();
  });

  test("left arrow selects the previous theme, wrapping around", async () => {
    const { saves, press, cleanup } = setup({ tui: { theme: "default" } });
    await press(LEFT);
    expect(saves.at(-1).tui.theme).toBe("minimal");
    await cleanup();
  });

  test("arrows toggle a boolean setting", async () => {
    const { saves, press, cleanup } = setup({ tui: { checkForUpdates: true } });
    await press(DOWN);
    await press(DOWN); // checkForUpdates
    await press(RIGHT);
    expect(saves.at(-1).tui.checkForUpdates).toBe(false);
    await press(LEFT);
    expect(saves.at(-1).tui.checkForUpdates).toBe(true);
    await cleanup();
  });

  test("Enter still changes the value", async () => {
    const { saves, press, cleanup } = setup({ tui: { theme: "default" } });
    await press("\r");
    expect(saves.at(-1).tui.theme).toBe("high-contrast");
    await cleanup();
  });

  test("arrows on the reset row do not reset", async () => {
    const { saves, press, cleanup } = setup({ devMode: true });
    for (let i = 0; i < 5; i++) await press(DOWN); // reset row
    await press(RIGHT);
    await press(LEFT);
    expect(saves.length).toBe(0);
    await cleanup();
  });
});
