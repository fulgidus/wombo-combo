/**
 * citty-core-commands.test.ts — Tests for citty command definitions.
 *
 * TDD: These tests verify that the citty command definitions for
 * init, status, abort, cleanup, history, logs, usage, upgrade, and
 * completion work correctly, including:
 *   - Command metadata is correct
 *   - Args/flags are properly defined with correct types
 *   - Commands are registered in the citty router
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
// Init command tests
// ---------------------------------------------------------------------------

describe("citty init command", () => {
  test("initCommand is a valid citty CommandDef", async () => {
    const { initCommand } = await import("../src/commands/citty/init");
    expect(initCommand).toBeDefined();
    expect(initCommand.meta).toBeDefined();
    expect(initCommand.run).toBeDefined();
  });

  test("initCommand has correct meta name", async () => {
    const { initCommand } = await import("../src/commands/citty/init");
    const meta = await resolveValue(initCommand.meta!);
    expect(meta.name).toBe("init");
  });

  test("initCommand has force flag defined", async () => {
    const { initCommand } = await import("../src/commands/citty/init");
    const args = await resolveValue(initCommand.args!);
    expect(args).toBeDefined();
    expect(args.force).toBeDefined();
    expect(args.force.type).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// Status command tests
// ---------------------------------------------------------------------------

describe("citty status command", () => {
  test("statusCommand is a valid citty CommandDef", async () => {
    const { statusCommand } = await import("../src/commands/citty/status");
    expect(statusCommand).toBeDefined();
    expect(statusCommand.meta).toBeDefined();
    expect(statusCommand.run).toBeDefined();
  });

  test("statusCommand has correct meta name", async () => {
    const { statusCommand } = await import("../src/commands/citty/status");
    const meta = await resolveValue(statusCommand.meta!);
    expect(meta.name).toBe("status");
  });

  test("statusCommand has output flag defined", async () => {
    const { statusCommand } = await import("../src/commands/citty/status");
    const args = await resolveValue(statusCommand.args!);
    expect(args).toBeDefined();
    expect(args.output).toBeDefined();
    expect(args.output.type).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Abort command tests
// ---------------------------------------------------------------------------

describe("citty abort command", () => {
  test("abortCommand is a valid citty CommandDef", async () => {
    const { abortCommand } = await import("../src/commands/citty/abort");
    expect(abortCommand).toBeDefined();
    expect(abortCommand.meta).toBeDefined();
    expect(abortCommand.run).toBeDefined();
  });

  test("abortCommand has correct meta name", async () => {
    const { abortCommand } = await import("../src/commands/citty/abort");
    const meta = await resolveValue(abortCommand.meta!);
    expect(meta.name).toBe("abort");
  });

  test("abortCommand has feature-id positional arg (required)", async () => {
    const { abortCommand } = await import("../src/commands/citty/abort");
    const args = await resolveValue(abortCommand.args!);
    expect(args.featureId).toBeDefined();
    expect(args.featureId.type).toBe("positional");
    expect(args.featureId.required).toBe(true);
  });

  test("abortCommand has output flag", async () => {
    const { abortCommand } = await import("../src/commands/citty/abort");
    const args = await resolveValue(abortCommand.args!);
    expect(args.output).toBeDefined();
    expect(args.output.type).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Cleanup command tests
// ---------------------------------------------------------------------------

describe("citty cleanup command", () => {
  test("cleanupCommand is a valid citty CommandDef", async () => {
    const { cleanupCommand } = await import("../src/commands/citty/cleanup");
    expect(cleanupCommand).toBeDefined();
    expect(cleanupCommand.meta).toBeDefined();
    expect(cleanupCommand.run).toBeDefined();
  });

  test("cleanupCommand has correct meta name", async () => {
    const { cleanupCommand } = await import("../src/commands/citty/cleanup");
    const meta = await resolveValue(cleanupCommand.meta!);
    expect(meta.name).toBe("cleanup");
  });

  test("cleanupCommand has dry-run flag", async () => {
    const { cleanupCommand } = await import("../src/commands/citty/cleanup");
    const args = await resolveValue(cleanupCommand.args!);
    expect(args.dryRun).toBeDefined();
    expect(args.dryRun.type).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// History command tests
// ---------------------------------------------------------------------------

describe("citty history command", () => {
  test("historyCommand is a valid citty CommandDef", async () => {
    const { historyCommand } = await import("../src/commands/citty/history");
    expect(historyCommand).toBeDefined();
    expect(historyCommand.meta).toBeDefined();
    expect(historyCommand.run).toBeDefined();
  });

  test("historyCommand has correct meta name", async () => {
    const { historyCommand } = await import("../src/commands/citty/history");
    const meta = await resolveValue(historyCommand.meta!);
    expect(meta.name).toBe("history");
  });

  test("historyCommand has wave-id positional arg", async () => {
    const { historyCommand } = await import("../src/commands/citty/history");
    const args = await resolveValue(historyCommand.args!);
    expect(args.waveId).toBeDefined();
    expect(args.waveId.type).toBe("positional");
    expect(args.waveId.required).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Logs command tests
// ---------------------------------------------------------------------------

describe("citty logs command", () => {
  test("logsCommand is a valid citty CommandDef", async () => {
    const { logsCommand } = await import("../src/commands/citty/logs");
    expect(logsCommand).toBeDefined();
    expect(logsCommand.meta).toBeDefined();
    expect(logsCommand.run).toBeDefined();
  });

  test("logsCommand has correct meta name", async () => {
    const { logsCommand } = await import("../src/commands/citty/logs");
    const meta = await resolveValue(logsCommand.meta!);
    expect(meta.name).toBe("logs");
  });

  test("logsCommand has feature-id positional arg (required)", async () => {
    const { logsCommand } = await import("../src/commands/citty/logs");
    const args = await resolveValue(logsCommand.args!);
    expect(args.featureId).toBeDefined();
    expect(args.featureId.type).toBe("positional");
    expect(args.featureId.required).toBe(true);
  });

  test("logsCommand has tail and follow flags", async () => {
    const { logsCommand } = await import("../src/commands/citty/logs");
    const args = await resolveValue(logsCommand.args!);
    expect(args.tail).toBeDefined();
    expect(args.tail.type).toBe("string");
    expect(args.follow).toBeDefined();
    expect(args.follow.type).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// Usage command tests
// ---------------------------------------------------------------------------

describe("citty usage command", () => {
  test("usageCommand is a valid citty CommandDef", async () => {
    const { usageCommand } = await import("../src/commands/citty/usage");
    expect(usageCommand).toBeDefined();
    expect(usageCommand.meta).toBeDefined();
    expect(usageCommand.run).toBeDefined();
  });

  test("usageCommand has correct meta name", async () => {
    const { usageCommand } = await import("../src/commands/citty/usage");
    const meta = await resolveValue(usageCommand.meta!);
    expect(meta.name).toBe("usage");
  });

  test("usageCommand has by, since, until, format flags", async () => {
    const { usageCommand } = await import("../src/commands/citty/usage");
    const args = await resolveValue(usageCommand.args!);
    expect(args.by).toBeDefined();
    expect(args.by.type).toBe("string");
    expect(args.since).toBeDefined();
    expect(args.since.type).toBe("string");
    expect(args.until).toBeDefined();
    expect(args.until.type).toBe("string");
    expect(args.format).toBeDefined();
    expect(args.format.type).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Upgrade command tests
// ---------------------------------------------------------------------------

describe("citty upgrade command", () => {
  test("upgradeCommand is a valid citty CommandDef", async () => {
    const { upgradeCommand } = await import("../src/commands/citty/upgrade");
    expect(upgradeCommand).toBeDefined();
    expect(upgradeCommand.meta).toBeDefined();
    expect(upgradeCommand.run).toBeDefined();
  });

  test("upgradeCommand has correct meta name", async () => {
    const { upgradeCommand } = await import("../src/commands/citty/upgrade");
    const meta = await resolveValue(upgradeCommand.meta!);
    expect(meta.name).toBe("upgrade");
  });

  test("upgradeCommand has force, tag, check flags", async () => {
    const { upgradeCommand } = await import("../src/commands/citty/upgrade");
    const args = await resolveValue(upgradeCommand.args!);
    expect(args.force).toBeDefined();
    expect(args.force.type).toBe("boolean");
    expect(args.tag).toBeDefined();
    expect(args.tag.type).toBe("string");
    expect(args.check).toBeDefined();
    expect(args.check.type).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// Completion command tests
// ---------------------------------------------------------------------------

describe("citty completion command", () => {
  test("completionCommand is a valid citty CommandDef", async () => {
    const { completionCommand } = await import("../src/commands/citty/completion");
    expect(completionCommand).toBeDefined();
    expect(completionCommand.meta).toBeDefined();
    expect(completionCommand.run).toBeDefined();
  });

  test("completionCommand has correct meta name", async () => {
    const { completionCommand } = await import("../src/commands/citty/completion");
    const meta = await resolveValue(completionCommand.meta!);
    expect(meta.name).toBe("completion");
  });

  test("completionCommand has shell positional arg", async () => {
    const { completionCommand } = await import("../src/commands/citty/completion");
    const args = await resolveValue(completionCommand.args!);
    expect(args.shell).toBeDefined();
    expect(args.shell.type).toBe("positional");
    expect(args.shell.required).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Router integration tests
// ---------------------------------------------------------------------------

describe("citty router — core commands", () => {
  test("isCittyCommand identifies all migrated commands", async () => {
    const { isCittyCommand } = await import("../src/commands/citty/router");
    expect(isCittyCommand("init")).toBe(true);
    expect(isCittyCommand("status")).toBe(true);
    expect(isCittyCommand("abort")).toBe(true);
    expect(isCittyCommand("cleanup")).toBe(true);
    expect(isCittyCommand("history")).toBe(true);
    expect(isCittyCommand("logs")).toBe(true);
    expect(isCittyCommand("usage")).toBe(true);
    expect(isCittyCommand("upgrade")).toBe(true);
    expect(isCittyCommand("completion")).toBe(true);
  });

  test("isCittyCommand still identifies existing commands", async () => {
    const { isCittyCommand } = await import("../src/commands/citty/router");
    expect(isCittyCommand("version")).toBe(true);
    expect(isCittyCommand("-v")).toBe(true);
    expect(isCittyCommand("help")).toBe(true);
    expect(isCittyCommand("describe")).toBe(true);
  });

  test("isCittyCommand returns false for non-citty commands", async () => {
    const { isCittyCommand } = await import("../src/commands/citty/router");
    // Only truly unknown strings should return false
    expect(isCittyCommand("nonexistent")).toBe(false);
    expect(isCittyCommand("foobar")).toBe(false);
    expect(isCittyCommand("")).toBe(false);
  });

  test("isCittyCommand returns true for all migrated commands", async () => {
    const { isCittyCommand } = await import("../src/commands/citty/router");
    // All commands are now citty commands
    expect(isCittyCommand("launch")).toBe(true);
    expect(isCittyCommand("resume")).toBe(true);
    expect(isCittyCommand("retry")).toBe(true);
    expect(isCittyCommand("tasks")).toBe(true);
    expect(isCittyCommand("tui")).toBe(true);
    expect(isCittyCommand("quest")).toBe(true);
    expect(isCittyCommand("genesis")).toBe(true);
    expect(isCittyCommand("wishlist")).toBe(true);
  });

  test("isCittyCommand identifies aliases for migrated commands", async () => {
    const { isCittyCommand } = await import("../src/commands/citty/router");
    // Common aliases from schema
    expect(isCittyCommand("i")).toBe(true);   // init
    expect(isCittyCommand("s")).toBe(true);   // status
    expect(isCittyCommand("a")).toBe(true);   // abort
    expect(isCittyCommand("c")).toBe(true);   // cleanup
    expect(isCittyCommand("h")).toBe(true);   // history
    expect(isCittyCommand("lo")).toBe(true);  // logs
    expect(isCittyCommand("us")).toBe(true);  // usage
    expect(isCittyCommand("comp")).toBe(true); // completion
  });
});
