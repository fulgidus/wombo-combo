/**
 * dev-mode-integration.test.ts — Integration tests for --dev devMode behavior.
 *
 * TDD: Verifies that --dev flag correctly integrates across the citty stack:
 *   - resolveGlobalFlagsAndCommand extracts --dev and maps bare --dev to tui
 *   - extractGlobalFlags strips --dev and preserves remaining args
 *   - --dev combined with all other global flags works correctly
 *   - e2e: --dev doesn't interfere with help or version output
 *
 * These tests focus on the integration between layers, not individual
 * unit behavior (which is tested in the per-module test files).
 */

import { describe, test, expect } from "bun:test";
import { extractGlobalFlags } from "../src/commands/citty/global-flags";
import { resolveGlobalFlagsAndCommand } from "../src/commands/citty/router";

// ---------------------------------------------------------------------------
// Cross-layer consistency: extractGlobalFlags ↔ resolveGlobalFlagsAndCommand
// ---------------------------------------------------------------------------

describe("--dev integration — cross-layer consistency", () => {
  test("both layers agree: --dev before command", () => {
    // extractGlobalFlags (lowest level)
    const extracted = extractGlobalFlags(["--dev", "launch"]);
    expect(extracted.flags.dev).toBe(true);
    expect(extracted.remaining).toEqual(["launch"]);

    // resolveGlobalFlagsAndCommand (mid level — uses extractGlobalFlags)
    const resolved = resolveGlobalFlagsAndCommand(["--dev", "launch"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.command).toBe("launch");
  });

  test("both layers agree: --dev after command", () => {
    const extracted = extractGlobalFlags(["launch", "--dev"]);
    expect(extracted.flags.dev).toBe(true);
    expect(extracted.remaining).toEqual(["launch"]);

    const resolved = resolveGlobalFlagsAndCommand(["launch", "--dev"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.command).toBe("launch");
  });

  test("both layers agree: bare --dev defaults to tui", () => {
    const extracted = extractGlobalFlags(["--dev"]);
    expect(extracted.flags.dev).toBe(true);
    expect(extracted.remaining).toEqual([]);

    const resolved = resolveGlobalFlagsAndCommand(["--dev"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.command).toBe("tui");
  });

  test("both layers agree: --dev with --force and --output", () => {
    const args = ["--dev", "--force", "--output", "json", "launch"];

    const extracted = extractGlobalFlags(args);
    expect(extracted.flags.dev).toBe(true);
    expect(extracted.flags.force).toBe(true);
    expect(extracted.flags.output).toBe("json");
    expect(extracted.remaining).toEqual(["launch"]);

    const resolved = resolveGlobalFlagsAndCommand(args);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.globalFlags.force).toBe(true);
    expect(resolved.globalFlags.output).toBe("json");
    expect(resolved.command).toBe("launch");
  });
});

// ---------------------------------------------------------------------------
// --dev with tasks subcommands
// ---------------------------------------------------------------------------

describe("--dev integration — tasks subcommands", () => {
  test("'--dev tasks list' preserves subcommand across layers", () => {
    const args = ["--dev", "tasks", "list"];

    const extracted = extractGlobalFlags(args);
    expect(extracted.flags.dev).toBe(true);
    expect(extracted.remaining).toEqual(["tasks", "list"]);

    const resolved = resolveGlobalFlagsAndCommand(args);
    expect(resolved.command).toBe("tasks");
    expect(resolved.remaining).toEqual(["list"]);
  });

  test("'tasks --dev list' extracts --dev from mid-position", () => {
    const args = ["tasks", "--dev", "list"];

    const extracted = extractGlobalFlags(args);
    expect(extracted.flags.dev).toBe(true);
    expect(extracted.remaining).toEqual(["tasks", "list"]);

    const resolved = resolveGlobalFlagsAndCommand(args);
    expect(resolved.command).toBe("tasks");
    expect(resolved.remaining).toEqual(["list"]);
  });

  test("'tasks list --dev' extracts --dev from end position", () => {
    const args = ["tasks", "list", "--dev"];

    const extracted = extractGlobalFlags(args);
    expect(extracted.flags.dev).toBe(true);
    expect(extracted.remaining).toEqual(["tasks", "list"]);

    const resolved = resolveGlobalFlagsAndCommand(args);
    expect(resolved.command).toBe("tasks");
    expect(resolved.remaining).toEqual(["list"]);
  });
});

// ---------------------------------------------------------------------------
// --dev combined with -h/--help (via resolveGlobalFlagsAndCommand)
// ---------------------------------------------------------------------------

describe("--dev integration — combined with help", () => {
  test("'--dev -h' → tui with dev + help", () => {
    const resolved = resolveGlobalFlagsAndCommand(["--dev", "-h"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.globalFlags.help).toBe(true);
    expect(resolved.command).toBe("tui");
  });

  test("'--dev launch -h' → launch with dev + help", () => {
    const resolved = resolveGlobalFlagsAndCommand(["--dev", "launch", "-h"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.globalFlags.help).toBe(true);
    expect(resolved.command).toBe("launch");
  });

  test("'-h --dev' → tui with dev + help (order doesn't matter)", () => {
    const resolved = resolveGlobalFlagsAndCommand(["-h", "--dev"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.globalFlags.help).toBe(true);
    expect(resolved.command).toBe("tui");
  });

  test("'launch -h --dev' → launch with dev + help", () => {
    const resolved = resolveGlobalFlagsAndCommand(["launch", "-h", "--dev"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.globalFlags.help).toBe(true);
    expect(resolved.command).toBe("launch");
  });
});

// ---------------------------------------------------------------------------
// --dev with command-specific flags (no interference)
// ---------------------------------------------------------------------------

describe("--dev integration — no interference with command flags", () => {
  test("'--dev launch --dry-run --max-concurrent 3' preserves all flags", () => {
    const resolved = resolveGlobalFlagsAndCommand(["--dev", "launch", "--dry-run", "--max-concurrent", "3"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.command).toBe("launch");
    expect(resolved.remaining).toEqual(["--dry-run", "--max-concurrent", "3"]);
  });

  test("'--dev --output json launch --dry-run' combines global + command flags", () => {
    const resolved = resolveGlobalFlagsAndCommand(["--dev", "--output", "json", "launch", "--dry-run"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.globalFlags.output).toBe("json");
    expect(resolved.command).toBe("launch");
    expect(resolved.remaining).toEqual(["--dry-run"]);
  });

  test("'launch --model claude --dev --force' dev and force extracted, model preserved", () => {
    const resolved = resolveGlobalFlagsAndCommand(["launch", "--model", "claude", "--dev", "--force"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.globalFlags.force).toBe(true);
    expect(resolved.command).toBe("launch");
    expect(resolved.remaining).toEqual(["--model", "claude"]);
  });

  test("'--dev tasks add my-task --priority high' preserves positional + named args", () => {
    const resolved = resolveGlobalFlagsAndCommand(["--dev", "tasks", "add", "my-task", "--priority", "high"]);
    expect(resolved.globalFlags.dev).toBe(true);
    expect(resolved.command).toBe("tasks");
    expect(resolved.remaining).toEqual(["add", "my-task", "--priority", "high"]);
  });
});

// ---------------------------------------------------------------------------
// e2e: --dev doesn't break help or version output
// ---------------------------------------------------------------------------

describe("--dev integration e2e — subprocess tests", () => {
  async function runWoco(...cliArgs: string[]): Promise<{
    exitCode: number;
    stderr: string;
    stdout: string;
  }> {
    const proc = Bun.spawn(["bun", "src/index.ts", ...cliArgs], {
      cwd: import.meta.dir + "/..",
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;
    return { exitCode, stderr, stdout };
  }

  test("'--dev version' still shows version string", async () => {
    const { stdout, exitCode } = await runWoco("--dev", "version");
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/wombo-combo \d+\.\d+\.\d+/);
  });

  test("'version --dev' still shows version string", async () => {
    const { stdout, exitCode } = await runWoco("version", "--dev");
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/wombo-combo \d+\.\d+\.\d+/);
  });

  test("'--dev -h' still shows global help", async () => {
    const { stdout, exitCode } = await runWoco("--dev", "-h");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Commands:");
    expect(stdout).toContain("wombo-combo");
  });

  test("'--dev launch -h' still shows launch help", async () => {
    const { stdout, exitCode } = await runWoco("--dev", "launch", "-h");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("launch");
  });

  test("'--dev --output json -h' still shows global help", async () => {
    const { stdout, exitCode } = await runWoco("--dev", "--output", "json", "-h");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Commands:");
  });

  test("'--dev --force init -h' still shows init help", async () => {
    const { stdout, exitCode } = await runWoco("--dev", "--force", "init", "-h");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("init");
  });

  test("'--dev tasks -h' shows tasks parent help", async () => {
    const { stdout, exitCode } = await runWoco("--dev", "tasks", "-h");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("tasks");
  });

  test("'--dev tasks list -h' shows tasks list help", async () => {
    const { stdout, exitCode } = await runWoco("--dev", "tasks", "list", "-h");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("list");
  });
});
