/**
 * replay-browser.test.tsx — ReplayViewer wired into the task browser adapter
 * (TaskBrowserScreen): access via `p`, on-demand loading, execution
 * switching, input isolation, close and no polling. No daemon is connected.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, Box } from "ink";
import { PassThrough } from "node:stream";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stripAnsi } from "./ansi";
import { TaskBrowserScreen } from "../../src/ink/run-task-browser";
import { ReplayStore } from "../../src/lib/replay";
import { saveTaskToStore } from "../../src/lib/task-store";
import { loadConfig } from "../../src/config";
import type { Task } from "../../src/lib/tasks";
import { setStdoutSize } from "../helpers/stdout-size";

let root: string;
const realRows = process.stdout.rows;
const realColumns = process.stdout.columns;

beforeEach(() => {
  setStdoutSize(60, 120);
  root = mkdtempSync(join(tmpdir(), "replay-browser-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
});
afterEach(() => {
  setStdoutSize(realRows, realColumns);
  rmSync(root, { recursive: true, force: true });
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await wait(10);
  }
}

function seedTask(id: string): void {
  const task = {
    id,
    title: `Task ${id}`,
    description: "d",
    status: "planned",
    completion: 0,
    difficulty: "easy",
    priority: "medium",
    effort: "PT1H",
    depends_on: [],
    started_at: null,
    ended_at: null,
    constraints: [],
    forbidden: [],
    references: [],
    notes: [],
    subtasks: [],
  } as Task;
  saveTaskToStore(root, loadConfig(root), task);
}

function seedReplay(taskId: string, exec: string, started: string, said: string): void {
  const s = new ReplayStore(root);
  s.begin({ execution_id: exec, task_id: taskId, quest_id: null, wave_id: "w", agent: "fake-agent", model: null, started_at: started });
  s.append(taskId, exec, { kind: "prompt", text: "P", truncated: false }, started);
  s.append(taskId, exec, { kind: "event", event: { type: "text", text: said } }, started);
  s.append(taskId, exec, { kind: "end", outcome: "succeeded" }, started);
}

interface Harness {
  last(): string;
  exits: number;
  press(data: string): Promise<void>;
  unmount(): Promise<void>;
}

function mount(): Harness {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 120;
  (stdout as any).rows = 50;
  const stdin = new PassThrough();
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  const frames: string[] = [];
  (stdout as any as PassThrough).on("data", (c: Buffer) => frames.push(stripAnsi(c.toString())));
  const h: Harness = {
    last: () => frames[frames.length - 1] ?? "",
    exits: 0,
    press: async (d) => {
      stdin.write(d);
      await wait(80);
    },
    unmount: async () => {},
  };
  const instance = render(
    <Box flexDirection="column" width={120} height={60}>
      <TaskBrowserScreen projectRoot={root} config={loadConfig(root)} onExit={() => { h.exits++; }} />
    </Box>,
    { stdout, stdin: stdin as unknown as NodeJS.ReadStream, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  h.unmount = async () => {
    instance.unmount();
    await instance.waitUntilExit();
  };
  return h;
}

describe("task browser replay viewer", () => {
  test("footer advertises the p key", async () => {
    seedTask("task-a");
    const h = mount();
    await waitFor(() => h.last().includes("task-a"));
    await wait(100);
    expect(h.last()).toContain("replay");
    await h.unmount();
  });

  test("p opens the latest execution of the selected task", async () => {
    seedTask("task-a");
    seedReplay("task-a", "task-a-e1", "2026-03-01T10:00:00.000Z", "first run");
    seedReplay("task-a", "task-a-e2", "2026-03-02T10:00:00.000Z", "second run");
    const h = mount();
    await waitFor(() => h.last().includes("task-a"));
    await wait(100);
    expect(h.last()).not.toContain("Replay  task-a");
    await h.press("p");
    expect(h.last()).toContain("Replay  task-a  exec 2/2  succeeded");
    expect(h.last()).toContain("text: second run");

    await h.press("[");
    expect(h.last()).toContain("exec 1/2");
    expect(h.last()).toContain("text: first run");
    await h.press("[");
    expect(h.last()).toContain("exec 1/2"); // clamped
    await h.press("]");
    expect(h.last()).toContain("exec 2/2");
    await h.unmount();
  });

  test("shows an empty state when nothing is recorded", async () => {
    seedTask("task-a");
    const h = mount();
    await waitFor(() => h.last().includes("task-a"));
    await wait(100);
    await h.press("p");
    expect(h.last()).toContain("No replay recorded for this task.");
    await h.unmount();
  });

  test("input is isolated while open and Esc/q close without quitting the browser", async () => {
    seedTask("task-a");
    seedReplay("task-a", "task-a-e1", "2026-03-01T10:00:00.000Z", "run");
    const h = mount();
    await waitFor(() => h.last().includes("task-a"));
    await wait(100);
    await h.press("p");
    expect(h.last()).toContain("Replay  task-a");
    await h.press("u"); // would open analytics
    expect(h.last()).not.toContain("Agent Analytics");
    await h.press("q"); // closes the viewer, must not quit
    expect(h.exits).toBe(0);
    expect(h.last()).not.toContain("Replay  task-a");
    // browser input works again
    await h.press("u");
    expect(h.last()).toContain("Agent Analytics");
    await h.unmount();
  });

  test("loads on open only (no polling) and unmounts cleanly while open", async () => {
    seedTask("task-a");
    seedReplay("task-a", "task-a-e1", "2026-03-01T10:00:00.000Z", "run");
    const origLoad = ReplayStore.prototype.load;
    const origList = ReplayStore.prototype.list;
    let loads = 0;
    let lists = 0;
    ReplayStore.prototype.load = function (...a: Parameters<typeof origLoad>) {
      loads++;
      return origLoad.apply(this, a);
    };
    ReplayStore.prototype.list = function (...a: Parameters<typeof origList>) {
      lists++;
      return origList.apply(this, a);
    };
    try {
      const h = mount();
      await waitFor(() => h.last().includes("task-a"));
    await wait(100);
      expect([loads, lists]).toEqual([0, 0]);
      await h.press("p");
      const afterOpen = [loads, lists];
      expect(lists).toBe(1);
      expect(loads).toBeGreaterThan(0);
      await wait(400);
      expect([loads, lists]).toEqual(afterOpen);
      await h.unmount();
    } finally {
      ReplayStore.prototype.load = origLoad;
      ReplayStore.prototype.list = origList;
    }
  });
});
