/**
 * citty-resume.test.ts — Tests for citty resume command definition.
 *
 * TDD: These tests verify that the citty resume command definition
 * correctly defines all expected args/flags and produces the right
 * parsed options when processed.
 */

import { describe, test, expect } from "bun:test";

// Helper to resolve citty's Resolvable<T> values
async function resolveValue<T>(val: T | (() => T) | (() => Promise<T>) | Promise<T>): Promise<T> {
  if (typeof val === "function") {
    return await (val as () => T | Promise<T>)();
  }
  return await val;
}

// ---------------------------------------------------------------------------
// Command definition structure tests
// ---------------------------------------------------------------------------

describe("citty resume command", () => {
  test("resumeCommand is a valid citty CommandDef", async () => {
    const { resumeCommand } = await import("../src/commands/citty/resume.js");
    expect(resumeCommand).toBeDefined();
    expect(resumeCommand.meta).toBeDefined();
    expect(resumeCommand.run).toBeDefined();
    expect(resumeCommand.args).toBeDefined();
  });

  test("resumeCommand has correct meta name", async () => {
    const { resumeCommand } = await import("../src/commands/citty/resume.js");
    const meta = await resolveValue(resumeCommand.meta!);
    expect(meta.name).toBe("resume");
  });

  test("resumeCommand meta has description", async () => {
    const { resumeCommand } = await import("../src/commands/citty/resume.js");
    const meta = await resolveValue(resumeCommand.meta!);
    expect(meta.description).toBeDefined();
    expect(typeof meta.description).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Args definition tests
// ---------------------------------------------------------------------------

describe("citty resume command args", () => {
  test("defines --max-concurrent as string arg", async () => {
    const { resumeCommand } = await import("../src/commands/citty/resume.js");
    const args = await resolveValue(resumeCommand.args!);
    expect(args.maxConcurrent).toBeDefined();
    expect(args.maxConcurrent.type).toBe("string");
  });

  test("defines --model / -m as string arg", async () => {
    const { resumeCommand } = await import("../src/commands/citty/resume.js");
    const args = await resolveValue(resumeCommand.args!);
    expect(args.model).toBeDefined();
    expect(args.model.type).toBe("string");
    expect(args.model.alias).toBe("m");
  });

  test("defines --no-tui as boolean arg", async () => {
    const { resumeCommand } = await import("../src/commands/citty/resume.js");
    const args = await resolveValue(resumeCommand.args!);
    expect(args.noTui).toBeDefined();
    expect(args.noTui.type).toBe("boolean");
  });

  test("defines --output / -o as string arg", async () => {
    const { resumeCommand } = await import("../src/commands/citty/resume.js");
    const args = await resolveValue(resumeCommand.args!);
    expect(args.output).toBeDefined();
    expect(args.output.type).toBe("string");
    expect(args.output.alias).toBe("o");
  });
});

// ---------------------------------------------------------------------------
// parseResumeArgs integration tests
// ---------------------------------------------------------------------------

describe("parseResumeArgs", () => {
  test("parses minimal args with defaults", async () => {
    const { parseResumeArgs } = await import("../src/commands/citty/resume.js");
    const result = parseResumeArgs({});
    expect(result.noTui).toBe(false);
  });

  test("parses --max-concurrent as number", async () => {
    const { parseResumeArgs } = await import("../src/commands/citty/resume.js");
    const result = parseResumeArgs({ maxConcurrent: "4" });
    expect(result.maxConcurrent).toBe(4);
  });

  test("parses --model value", async () => {
    const { parseResumeArgs } = await import("../src/commands/citty/resume.js");
    const result = parseResumeArgs({ model: "gpt-4" });
    expect(result.model).toBe("gpt-4");
  });

  test("parses --no-tui flag", async () => {
    const { parseResumeArgs } = await import("../src/commands/citty/resume.js");
    const result = parseResumeArgs({ noTui: true });
    expect(result.noTui).toBe(true);
  });

  test("parses --output value", async () => {
    const { parseResumeArgs } = await import("../src/commands/citty/resume.js");
    const result = parseResumeArgs({ output: "json" });
    expect(result.outputFmt).toBe("json");
  });

  test("parses all flags together", async () => {
    const { parseResumeArgs } = await import("../src/commands/citty/resume.js");
    const result = parseResumeArgs({
      maxConcurrent: "2",
      model: "anthropic/claude-sonnet-4-20250514",
      noTui: true,
      output: "json",
    });
    expect(result.maxConcurrent).toBe(2);
    expect(result.model).toBe("anthropic/claude-sonnet-4-20250514");
    expect(result.noTui).toBe(true);
    expect(result.outputFmt).toBe("json");
  });

  test("undefined values remain undefined", async () => {
    const { parseResumeArgs } = await import("../src/commands/citty/resume.js");
    const result = parseResumeArgs({});
    expect(result.maxConcurrent).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.outputFmt).toBeUndefined();
  });
});
