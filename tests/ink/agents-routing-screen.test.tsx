/**
 * agents-routing-screen.test.tsx — The "Agents & routing" screen: profile CRUD,
 * routing slots, harness list, keyboard conventions and persistence.
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { render } from "ink";
import { PassThrough } from "node:stream";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eventually } from "../helpers/wait-for";
import { DEFAULT_CONFIG, type WomboConfig } from "../../src/config";
import { AgentsRoutingScreen } from "../../src/ink/agents-routing-screen";

const RIGHT = "\x1b[C";
const LEFT = "\x1b[D";
const DOWN = "\x1b[B";
const ENTER = "\r";
const ESC = "\x1b";
const TAB = "\t";

function mount(over: Partial<WomboConfig> = {}, opts: { rows?: number; disk?: object } = {}) {
  const root = mkdtempSync(join(tmpdir(), "arscreen-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  if (opts.disk) writeFileSync(join(root, ".wombo-combo/config.json"), JSON.stringify(opts.disk));
  const config = { ...DEFAULT_CONFIG, ...over } as WomboConfig;
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 110;
  (stdout as any).rows = opts.rows ?? 40;
  const frames: string[] = [];
  (stdout as any).on("data", (d: Buffer) => frames.push(d.toString()));
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  const calls = { back: 0, saved: [] as unknown[] };
  const inst = render(
    <AgentsRoutingScreen
      config={config}
      projectRoot={root}
      height={opts.rows ?? 40}
      binExists={(b) => b === "pi"}
      onBack={() => calls.back++}
      onSaved={(d) => calls.saved.push(d)}
    />,
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  const screen = () => frames.at(-1) ?? "";
  const press = async (s: string) => {
    (stdin as any).write(s);
    await new Promise((r) => setTimeout(r, 30));
  };
  const disk = () => JSON.parse(readFileSync(join(root, ".wombo-combo/config.json"), "utf-8"));
  return { screen, press, calls, disk, unmount: () => inst.unmount() };
}

describe("AgentsRoutingScreen", () => {
  test("harness view lists pi first with PATH and cost status; opencode legacy is configured", async () => {
    const m = mount({ agent: { ...DEFAULT_CONFIG.agent, bin: "opencode" } });
    await m.press(TAB);
    await m.press(TAB);
    await eventually(() => expect(m.screen()).toContain("claude-code"));
    const out = m.screen();
    expect(out.indexOf("pi")).toBeLessThan(out.indexOf("opencode"));
    expect(out).toMatch(/pi\s.*on PATH/);
    expect(out).toMatch(/codex.*no cost reported/);
    expect(out).toMatch(/opencode.*configured/);
    expect(out).not.toMatch(/opencode.*not configured/);
    m.unmount();
  });

  test("n creates a profile, saved to disk without touching legacy keys or routing", async () => {
    const m = mount({}, { disk: { agent: { bin: "opencode" } } });
    expect(m.screen()).toContain("Agents & routing");
    await m.press("n");
    for (const ch of "fast") await m.press(ch);
    await m.press(DOWN); // harness
    await m.press(RIGHT); // opencode -> next
    await m.press(ENTER);
    await eventually(() => expect(m.screen()).toContain("fast"));
    await m.press("s");
    await eventually(() => expect(Object.keys(m.disk().agentProfiles ?? {})).toEqual(["fast"]));
    expect(m.disk().agent.bin).toBe("opencode");
    expect(m.disk().routing).toBeUndefined();
    m.unmount();
  });

  test("routing slot cycles through existing profile names with arrows and saves", async () => {
    const m = mount({ agentProfiles: { a: { harness: "pi" }, b: { harness: "codex" } } as any });
    await m.press(TAB);
    await m.press(RIGHT);
    await eventually(() => expect(m.screen()).toMatch(/default\s+a/));
    await m.press(RIGHT);
    await eventually(() => expect(m.screen()).toMatch(/default\s+b/));
    await m.press("s");
    await eventually(() => expect(m.disk().routing).toEqual({ default: "b" }));
    m.unmount();
  });

  test("deleting a referenced profile is refused at save, nothing is written", async () => {
    const m = mount(
      { agentProfiles: { a: { harness: "pi" } } as any, routing: { default: "a" } },
      { disk: { agentProfiles: { a: { harness: "pi" } }, routing: { default: "a" } } },
    );
    await m.press("d");
    await m.press(RIGHT); // confirm
    await m.press("s");
    await eventually(() => expect(m.screen()).toMatch(/unknown profile "a"/));
    expect(m.disk().agentProfiles.a).toBeDefined();
    m.unmount();
  });

  test("esc backs out; dirty draft needs a second esc", async () => {
    const m = mount({ agentProfiles: { a: { harness: "pi" } } as any });
    await m.press(ESC);
    await eventually(() => expect(m.calls.back).toBe(1));
    const d = mount({ agentProfiles: { a: { harness: "pi" } } as any });
    await d.press(RIGHT); // change harness of a
    await d.press(ESC);
    await eventually(() => expect(d.screen()).toContain("Esc again to discard"));
    expect(d.calls.back).toBe(0);
    await d.press(ESC);
    await eventually(() => expect(d.calls.back).toBe(1));
    m.unmount();
    d.unmount();
  });

  test("fits the terminal height with many profiles", async () => {
    const profiles: Record<string, any> = {};
    for (let i = 0; i < 40; i++) profiles[`p${String(i).padStart(2, "0")}`] = { harness: "pi" };
    const m = mount({ agentProfiles: profiles }, { rows: 20 });
    await eventually(() => expect(m.screen()).toContain("p00"));
    const lines = m.screen().split("\n").length;
    expect(lines).toBeLessThanOrEqual(20);
    expect(m.screen()).not.toContain("p39");
    m.unmount();
  });
});
