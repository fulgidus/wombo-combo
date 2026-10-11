/**
 * Translatable citty help text: Italian help output, untouched English output,
 * English-only `woco describe`, and key coverage for every help string.
 */
import { describe, test, expect } from "bun:test";
import { join, resolve } from "node:path";
import { COMMAND_REGISTRY, GLOBAL_FLAGS, renderCommandHelp, renderGlobalHelp, type CommandDef } from "../src/lib/schema";
import en from "../src/locales/en/cli.json";
import it from "../src/locales/it/cli.json";

const ENTRY = join(resolve(import.meta.dir, ".."), "src", "index.ts");

function woco(args: string[], locale?: string) {
  const env: Record<string, string | undefined> = { ...process.env, CI: "true" };
  delete env.WOMBO_LOCALE; delete env.LANG; delete env.LC_ALL; delete env.LANGUAGE;
  if (locale) env.WOMBO_LOCALE = locale;
  const p = Bun.spawnSync(["bun", ENTRY, ...args], { env, cwd: resolve(import.meta.dir, "..") });
  return p.stdout.toString() + p.stderr.toString();
}

describe("cli help translations", () => {
  test("Italian help shows translated descriptions, flags stay untouched", () => {
    const out = woco(["tasks", "add", "--help"], "it");
    expect(out).toContain("Aggiunge un nuovo task");
    expect(out).toContain("Livello di priorità");
    expect(out).toContain("--priority");
    expect(out).not.toContain("Add a new task");
  });

  test("Italian parent help translates subcommand list", () => {
    const out = woco(["tasks", "--help"], "it");
    expect(out).toContain("Gestisce il file dei task");
    expect(out).toContain("Elenca i task con filtri opzionali");
  });

  test("English help is unchanged", () => {
    const out = woco(["tasks", "add", "--help"]);
    expect(out).toContain("Add a new task");
    expect(out).toContain("Priority level [critical|high|medium|low|wishlist]");
    expect(out).not.toContain("Aggiunge");
  });

  test("describe JSON is English regardless of locale", () => {
    const base = woco(["describe", "tasks add"]);
    expect(woco(["describe", "tasks add"], "it")).toBe(base);
    expect(base).not.toContain("Aggiunge");
  });

  test("English help is byte-identical to the registry renderers", () => {
    const direct = renderCommandHelp("tasks", "add");
    expect(woco(["tasks", "add", "--help"])).toBe(direct + "\n");
    expect(woco(["--help"]).trimEnd()).toBe(renderGlobalHelp().trimEnd());
  });

  test("Italian global help translates chrome and summaries", () => {
    const out = woco(["--help"], "it");
    expect(out).toContain("Comandi:");
    expect(out).toContain("Sistema di orchestrazione di agenti AI");
    expect(out).toContain("Avvia una wave di agenti per implementare le feature");
  });

  test("every registry help string has a key in both locales", () => {
    const cmds: CommandDef[] = [];
    const visit = (c: CommandDef) => { cmds.push(c); (c.subcommands ?? []).forEach(visit); };
    COMMAND_REGISTRY.forEach(visit);
    const check = (key: string, english: string) => {
      expect((en as any)[key]).toBe(english);
      expect((it as any)[key]).toBeTruthy();
    };
    for (const c of cmds) {
      const base = `cli.help.${c.name.replace(/ /g, ".")}`;
      check(`${base}.summary`, c.summary);
      if (c.description) check(`${base}.description`, c.description);
      for (const p of c.positionals) check(`${base}.pos.${p.name}`, p.description);
      for (const f of c.flags) check(`${base}.flag.${f.name.replace(/^--/, "")}`, f.description);
    }
    for (const f of GLOBAL_FLAGS) check(`cli.help.global.flag.${f.name.replace(/^--/, "")}`, f.description);
  });
});
