import { describe, test, expect, mock } from "bun:test";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { PlanAllScreen } from "./run-plan-all";
import { createBlankQuest } from "../lib/quest";
import type { PlanAllRow, PlanAllRun } from "../lib/quest-plan-all";

function streams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 100;
  (stdout as any).rows = 24;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  return { stdin, stdout };
}

function fakeRun(state: PlanAllRow["state"]) {
  const q = createBlankQuest("alpha", "Alpha", "g", "main");
  const row: PlanAllRow = {
    quest: q,
    state,
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    cost: null,
    activity: "",
    result: { success: true, tasks: [{ id: "t" } as any], knowledge: null, issues: [], rawOutput: "" },
  };
  let resolve!: (r: PlanAllRow[]) => void;
  const done = new Promise<PlanAllRow[]>((r) => (resolve = r));
  const abort = mock(() => {});
  const run: PlanAllRun = {
    done,
    abort,
    rows: () => [row],
    totals: () => ({ tokensIn: 0, tokensOut: 0, cost: null }),
  };
  return { run, abort, finish: () => resolve([{ ...row, state: "done" }]) };
}

const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));

async function mountScreen(run: PlanAllRun, onDone: (a: any) => void) {
  const { stdin, stdout } = streams();
  const instance = render(<PlanAllScreen run={run} skipped={[]} onDone={onDone} />, {
    stdout,
    stdin,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });
  await wait();
  return { instance, key: (k: string) => (stdin as any as PassThrough).write(k) };
}

describe("PlanAllScreen", () => {
  test("Esc aborts every in-flight planner while running", async () => {
    const { run, abort } = fakeRun("running");
    const { instance, key } = await mountScreen(run, () => {});
    key("\x1b");
    await wait();
    expect(abort).toHaveBeenCalledTimes(1);
    instance.unmount();
  });

  test("right arrow starts one-by-one review once finished", async () => {
    const { run, finish } = fakeRun("running");
    const onDone = mock((_: any) => {});
    const { instance, key } = await mountScreen(run, onDone);
    key("\x1b[C");
    await wait();
    expect(onDone).not.toHaveBeenCalled(); // ignored while running
    finish();
    await wait();
    key("\x1b[C");
    await wait();
    expect(onDone.mock.calls[0]![0].type).toBe("review");
    instance.unmount();
  });

  test("a approves all valid, left arrow cancels", async () => {
    for (const [k, type] of [["a", "approve-all"], ["\x1b[D", "cancel"]] as const) {
      const { run, finish } = fakeRun("running");
      const onDone = mock((_: any) => {});
      const { instance, key } = await mountScreen(run, onDone);
      finish();
      await wait();
      key(k);
      await wait();
      expect(onDone.mock.calls[0]![0].type).toBe(type);
      instance.unmount();
    }
  });
});
