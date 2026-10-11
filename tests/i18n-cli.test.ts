/**
 * i18n-cli.test.ts — CLI output goes through t(); machine output does not.
 *
 * Uses a pseudo-locale ("xx", registered at runtime) so the tests do not
 * depend on a shipped translation.
 */

import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initI18n, msg, registerLocale, setLocale, unregisterLocale } from "../src/lib/i18n";
import { outputError, outputMessage, renderForFormat } from "../src/lib/output";
import { DEFAULT_CONFIG } from "../src/config";
import { cmdTasksAdd } from "../src/commands/tasks/add";
import { cmdTasksSetStatus } from "../src/commands/tasks/set-status";
import { cmdTasksArchive } from "../src/commands/tasks/archive";

beforeAll(() => {
  registerLocale("xx", {
    "cli.tasks.notFound": "XX nf {{id}}",
    "cli.tasks.add.added": "XX added {{id}}",
    "cli.tasks.archive.done_one": "XX archived {{count}} one",
    "cli.tasks.archive.done_other": "XX archived {{count}} many",
    "cli.tasks.setStatus.changed": "XX {{id}}: {{old}} => {{new}}",
  });
});

afterEach(() => {
  initI18n({ env: { WOMBO_LOCALE: "en" } });
});

afterAll(() => {
  setLocale("en");
  unregisterLocale("xx");
});

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  const log = spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
  const error = spyOn(console, "error").mockImplementation((...a: unknown[]) => void err.push(a.join(" ")));
  return {
    out,
    err,
    restore() {
      log.mockRestore();
      error.mockRestore();
    },
  };
}

describe("renderForFormat", () => {
  test("text follows the active locale, json/toon are always en", () => {
    setLocale("xx");
    const m = msg("cli.tasks.notFound", { id: "a" });
    expect(renderForFormat("text", m)).toBe("XX nf a");
    expect(renderForFormat("json", m)).toBe('Task "a" not found.');
    expect(renderForFormat("toon", m)).toBe('Task "a" not found.');
  });

  test("plain strings pass through unchanged", () => {
    setLocale("xx");
    expect(renderForFormat("text", "raw")).toBe("raw");
    expect(renderForFormat("json", "raw")).toBe("raw");
  });
});

describe("outputMessage / outputError", () => {
  test("json output is identical regardless of locale", () => {
    const run = (locale: string) => {
      setLocale(locale);
      const c = capture();
      outputMessage("json", msg("cli.tasks.add.added", { id: "x", title: "T" }), { id: "x" });
      c.restore();
      return c.out.join("\n");
    };
    const en = run("en");
    const xx = run("xx");
    expect(xx).toBe(en);
    expect(JSON.parse(en)).toEqual({ message: "Added task: x — T", id: "x" });
  });

  test("text output is translated", () => {
    setLocale("xx");
    const c = capture();
    outputMessage("text", msg("cli.tasks.add.added", { id: "x", title: "T" }));
    c.restore();
    expect(c.out).toEqual(["XX added x"]);
  });

  test("errors: json stays english, text is translated", () => {
    setLocale("xx");
    const exit = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    const c = capture();
    expect(() => outputError("json", msg("cli.tasks.notFound", { id: "q" }))).toThrow("exit");
    expect(() => outputError("text", msg("cli.tasks.notFound", { id: "q" }))).toThrow("exit");
    c.restore();
    exit.mockRestore();
    expect(JSON.parse(c.err[0])).toEqual({ error: 'Task "q" not found.' });
    expect(c.err[1]).toBe("XX nf q");
  });
});

describe("tasks commands", () => {
  let dir: string;
  const base = () => ({ projectRoot: dir, config: { ...DEFAULT_CONFIG } });

  const setup = () => {
    dir = mkdtempSync(join(tmpdir(), "woco-i18n-"));
    mkdirSync(join(dir, ".wombo-combo"), { recursive: true });
    writeFileSync(join(dir, ".wombo-combo", "config.json"), "{}\n");
  };
  const teardown = () => rmSync(dir, { recursive: true, force: true });

  test("add + set-status: text translated, json english and stable", async () => {
    setup();
    try {
      setLocale("xx");
      let c = capture();
      await cmdTasksAdd({ ...base(), id: "t-one", title: "One", outputFmt: "text" });
      c.restore();
      expect(c.out[0]).toBe("XX added t-one");

      c = capture();
      await cmdTasksSetStatus({ ...base(), featureId: "t-one", newStatus: "done", outputFmt: "json" });
      c.restore();
      expect(JSON.parse(c.out[0])).toMatchObject({
        message: 'Task "t-one": backlog → done',
        old_status: "backlog",
        new_status: "done",
      });

      c = capture();
      await cmdTasksArchive({ ...base(), outputFmt: "text" });
      c.restore();
      expect(c.out[0]).toBe("XX archived 1 one");
    } finally {
      teardown();
    }
  });

  test("english plural forms for counts", async () => {
    setup();
    try {
      const quiet = capture();
      for (const id of ["a-1", "a-2"]) {
        await cmdTasksAdd({ ...base(), id, title: id, outputFmt: "json" });
        await cmdTasksSetStatus({ ...base(), featureId: id, newStatus: "done", outputFmt: "json" });
      }
      quiet.restore();
      const c = capture();
      await cmdTasksArchive({ ...base(), outputFmt: "text" });
      c.restore();
      expect(c.out[0]).toBe("Archived 2 tasks");
    } finally {
      teardown();
    }
  });
});
