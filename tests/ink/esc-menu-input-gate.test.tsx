/**
 * esc-menu-input-gate.test.tsx — Screens rendered under EscMenuProvider must not
 * act on keys while the global ESC menu overlay is open.
 *
 * Covers:
 *   - task-browser (TaskBrowserView): arrows and letters do not reach the screen
 *     while the menu is open; they work again after the menu closes.
 *   - settings-screen (SettingsScreen): arrows and Enter do not reach the screen
 *     while the menu is open; Enter saves again after the menu closes.
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { EscMenuProvider, useEscMenu, type EscMenuState } from "../../src/ink/esc-menu";
import { TaskBrowserView, type TaskBrowserViewProps, type TaskNode } from "../../src/ink/task-browser";
import { SettingsScreen } from "../../src/ink/settings-screen";
import type { Task } from "../../src/lib/tasks";
import type { UsageTotals } from "../../src/lib/token-usage";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeStreams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 120;
  (stdout as any).rows = 50;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  let output = "";
  (stdout as unknown as PassThrough).on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  return { stdin, stdout, getOutput: () => output };
}

/** Captures the ESC menu controls from context so the test can open/close it. */
function renderWithMenu(screen: React.ReactElement) {
  const streams = makeStreams();
  const ref: { menu: EscMenuState | null } = { menu: null };
  function Capture(): null {
    ref.menu = useEscMenu();
    return null;
  }
  const inst = render(
    React.createElement(
      EscMenuProvider,
      {},
      React.createElement(Capture),
      screen,
    ),
    {
      stdout: streams.stdout,
      stdin: streams.stdin,
      debug: true,
      exitOnCtrlC: false,
      patchConsole: false,
    },
  );
  return {
    stdin: streams.stdin as unknown as { write: (s: string) => void },
    getOutput: streams.getOutput,
    menu: () => ref.menu!,
    unmount: () => inst.unmount(),
  };
}

const usage: UsageTotals = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read: 0,
  cache_write: 0,
  reasoning_tokens: 0,
  total_tokens: 0,
  total_cost: 0,
  record_count: 0,
};

function makeNode(id: string): TaskNode {
  return {
    task: {
      id,
      title: `Task ${id}`,
      description: "",
      status: "backlog",
      completion: 0,
      difficulty: "medium",
      priority: "high",
      depends_on: [],
      effort: "PT2H",
      started_at: null,
      ended_at: null,
      constraints: [],
      forbidden: [],
      references: [],
      notes: [],
    } as unknown as Task,
    depth: 0,
    streamId: "stream-1",
    dependedOnBy: [],
    depsReady: true,
  };
}

describe("task-browser input is gated by the ESC menu", () => {
  test("arrows and letters do not reach the screen while the menu is open, and work after it closes", async () => {
    const calls: string[] = [];
    const props: TaskBrowserViewProps = {
      nodes: [makeNode("a"), makeNode("b")],
      selectedIndex: 0,
      selectedIds: new Set<string>(),
      sortBy: "priority",
      maxConcurrent: 5,
      hideDone: false,
      totalTaskCount: 2,
      doneCount: 0,
      readyCount: 2,
      onSelectionChange: (i: number) => calls.push(`select:${i}`),
      onToggle: () => calls.push("toggle"),
      onToggleStream: () => calls.push("stream"),
      onToggleAll: () => calls.push("all"),
      onCycleSort: () => calls.push("sort"),
      onChangePriority: () => calls.push("priority"),
      onToggleDone: () => calls.push("done"),
      onCycleConcurrency: () => calls.push("concurrency"),
      onQuit: () => calls.push("quit"),
      usage,
    } as TaskBrowserViewProps;

    const h = renderWithMenu(React.createElement(TaskBrowserView, props));
    await wait(30);

    h.menu().openMenu();
    await wait(40);
    expect(h.getOutput()).toContain("Return to app");

    h.stdin.write("\u001b[B"); // down arrow: moves the menu cursor only
    await wait(30);
    h.stdin.write("q"); // letter: must not quit the screen
    await wait(30);
    expect(calls).toEqual([]);

    h.menu().closeMenu();
    await wait(40);
    h.stdin.write("\u001b[B"); // down arrow reaches the screen again
    await wait(30);
    h.stdin.write("q");
    await wait(30);
    h.unmount();
    expect(calls).toEqual(["select:1", "quit"]);
  });
});

describe("settings-screen input is gated by the ESC menu", () => {
  test("arrows and Enter do not reach the screen while the menu is open, and Enter saves after it closes", async () => {
    const saved: unknown[] = [];
    let backs = 0;
    const h = renderWithMenu(
      React.createElement(SettingsScreen, {
        config: { tui: { theme: "dark" } },
        onSave: (patched: unknown) => saved.push(patched),
        onBack: () => {
          backs++;
        },
      }),
    );
    await wait(30);

    h.menu().openMenu();
    await wait(40);
    expect(h.getOutput()).toContain("Return to app");

    h.stdin.write("\u001b[B"); // down arrow: moves the menu cursor only
    await wait(30);
    expect(saved).toEqual([]);
    expect(backs).toBe(0);

    // Enter here activates the menu's "Return to app" item and closes the menu.
    // The settings screen must not also receive it.
    h.stdin.write("\r");
    await wait(40);
    expect(saved).toEqual([]);

    // Menu is closed now: Enter reaches the settings screen again.
    h.stdin.write("\r");
    await wait(30);
    h.unmount();
    expect(saved.length).toBeGreaterThan(0);
  });
});
