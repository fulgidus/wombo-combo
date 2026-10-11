/**
 * replay-screen.test.tsx — Task picker + replay viewer reached from the ESC menu.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, Box } from "ink";
import { PassThrough } from "node:stream";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stripAnsi } from "./ansi";
import { ReplayScreen } from "../../src/ink/replay-screen";
import { ReplayStore } from "../../src/lib/replay";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "replay-screen-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function seed(taskId: string, exec: string, started: string, said: string): void {
  const s = new ReplayStore(root);
  s.begin({ execution_id: exec, task_id: taskId, quest_id: null, wave_id: "w", agent: "a", model: null, started_at: started });
  s.append(taskId, exec, { kind: "event", event: { type: "text", text: said } }, started);
  s.append(taskId, exec, { kind: "end", outcome: "succeeded" }, started);
}

function mount() {
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
  const h = {
    backs: 0,
    last: () => frames[frames.length - 1] ?? "",
    press: async (d: string) => {
      stdin.write(d);
      await wait(80);
    },
    unmount: async () => {},
  };
  const instance = render(
    <Box width={120} height={50}>
      <ReplayScreen projectRoot={root} onBack={() => { h.backs++; }} />
    </Box>,
    { stdout, stdin: stdin as unknown as NodeJS.ReadStream, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  h.unmount = async () => {
    instance.unmount();
    await instance.waitUntilExit();
  };
  return h;
}

describe("ReplayScreen", () => {
  test("shows an empty state when nothing was recorded", async () => {
    const h = mount();
    await wait(80);
    expect(h.last()).toContain("No recorded sessions yet");
    await h.unmount();
  });

  test("lists tasks with run counts and opens the latest run on Enter", async () => {
    seed("task-a", "task-a-e1", "2026-03-01T10:00:00.000Z", "first run");
    seed("task-a", "task-a-e2", "2026-03-02T10:00:00.000Z", "second run");
    seed("task-b", "task-b-e1", "2026-03-03T10:00:00.000Z", "b run");
    const h = mount();
    await wait(80);
    expect(h.last()).toContain("task-a");
    expect(h.last()).toContain("task-b");
    expect(h.last()).toContain("2 runs");
    expect(h.last()).toContain("1 run");

    await h.press("\r");
    expect(h.last()).toContain("Replay  task-a  exec 2/2");
    expect(h.last()).toContain("text: second run");

    // Esc closes the viewer back to the picker (not the screen)
    await h.press("\u001b");
    await wait(60);
    expect(h.last()).toContain("task-b");
    expect(h.backs).toBe(0);

    // Down + Enter opens the other task; Esc, then Esc leaves the screen
    await h.press("\u001b[B");
    await h.press("\r");
    expect(h.last()).toContain("Replay  task-b");
    await h.press("\u001b");
    await wait(60);
    await h.press("\u001b");
    await wait(60);
    expect(h.backs).toBe(1);
    await h.unmount();
  });
});
