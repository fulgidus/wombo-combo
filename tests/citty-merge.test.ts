/**
 * citty-merge.test.ts — `woco merge` command definition, routing and
 * registry discovery (help, describe, completion).
 */

import { describe, test, expect } from "bun:test";
import { isCittyCommand } from "../src/commands/citty/router";
import { mergeCommand, parseMergeArgs, parseTaskList } from "../src/commands/citty/merge";
import { BRIDGE_REGISTRY, findBridgeCommandDef } from "../src/lib/citty-registry";
import { COMMAND_REGISTRY, findCommandDef, renderGlobalHelp, commandToSchema } from "../src/lib/schema";

async function resolveValue<T>(val: T | (() => T) | (() => Promise<T>) | Promise<T>): Promise<T> {
  if (typeof val === "function") return await (val as () => T | Promise<T>)();
  return await val;
}

describe("merge command definition", () => {
  test("is a valid citty command named merge", async () => {
    const meta = await resolveValue(mergeCommand.meta!);
    expect(meta.name).toBe("merge");
    expect(typeof meta.description).toBe("string");
    expect(mergeCommand.run).toBeDefined();
  });

  test("defines --tasks, --dry-run and --output", async () => {
    const args = await resolveValue(mergeCommand.args!);
    expect(args.tasks.type).toBe("string");
    expect(args.dryRun.type).toBe("boolean");
    expect(args.output.type).toBe("string");
    expect((args.output as any).alias).toBe("o");
  });
});

describe("argument parsing", () => {
  test("parseTaskList trims, drops blanks and deduplicates", () => {
    expect(parseTaskList("a, b ,,a,c")).toEqual(["a", "b", "c"]);
    expect(parseTaskList("")).toBeUndefined();
    expect(parseTaskList(" , ")).toBeUndefined();
    expect(parseTaskList(undefined)).toBeUndefined();
  });

  test("parseMergeArgs maps raw args", () => {
    expect(parseMergeArgs({})).toEqual({ tasks: undefined, dryRun: false, outputFmt: undefined });
    expect(parseMergeArgs({ tasks: "x,y", dryRun: true, output: "json" })).toEqual({
      tasks: ["x", "y"],
      dryRun: true,
      outputFmt: "json",
    });
  });
});

describe("routing and registry discovery", () => {
  test("router recognizes merge and its alias", () => {
    expect(isCittyCommand("merge")).toBe(true);
    expect(isCittyCommand("m")).toBe(true);
  });

  test("bridge registry exposes merge as mutating with dry-run support", () => {
    const def = BRIDGE_REGISTRY.find((c) => c.name === "merge")!;
    expect(def).toBeDefined();
    expect(def.aliases).toContain("m");
    expect(def.mutating).toBe(true);
    expect(def.supportsDryRun).toBe(true);
    const flags = def.flags.map((f) => f.name);
    expect(flags).toContain("--tasks");
    expect(flags).toContain("--dry-run");
    expect(findBridgeCommandDef("m")?.name).toBe("merge");
  });

  test("schema registry, help and describe schema include merge", () => {
    expect(COMMAND_REGISTRY.map((c) => c.name)).toContain("merge");
    expect(findCommandDef("merge")?.name).toBe("merge");
    expect(renderGlobalHelp()).toContain("merge");
    const schema = commandToSchema(findCommandDef("merge")!);
    expect(JSON.stringify(schema)).toContain("--tasks");
  });

  test("woco describe merge and completion discover the command (real CLI, read-only)", () => {
    const describe = Bun.spawnSync(["bun", "src/index.ts", "describe", "merge"], {
      cwd: import.meta.dir + "/..",
    });
    expect(describe.exitCode).toBe(0);
    const parsed = JSON.parse(describe.stdout.toString());
    expect(parsed.command).toBe("merge");

    const completion = Bun.spawnSync(["bun", "src/index.ts", "completion", "bash"], {
      cwd: import.meta.dir + "/..",
    });
    expect(completion.exitCode).toBe(0);
    expect(completion.stdout.toString()).toContain("merge");
  });
});
