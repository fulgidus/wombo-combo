/**
 * citty-global-flags-router.test.ts — Tests for citty router with global flags.
 *
 * TDD: Verifies that the citty router correctly handles global flags
 * including --dev (bare and with commands), -h/--help routing, and
 * --output/--force propagation.
 */

import { describe, test, expect, spyOn } from "bun:test";
import {
  isCittyCommand,
  runCittyCommand,
  resolveGlobalFlagsAndCommand,
  buildCittyArgs,
} from "../src/commands/citty/router";

// ---------------------------------------------------------------------------
// resolveGlobalFlagsAndCommand tests
// ---------------------------------------------------------------------------

describe("resolveGlobalFlagsAndCommand — flag extraction", () => {
  test("returns command with no global flags", () => {
    const result = resolveGlobalFlagsAndCommand(["launch"]);
    expect(result.command).toBe("launch");
    expect(result.globalFlags.dev).toBe(false);
    expect(result.globalFlags.force).toBe(false);
    expect(result.globalFlags.help).toBe(false);
    expect(result.globalFlags.output).toBeUndefined();
    expect(result.remaining).toEqual([]);
  });

  test("extracts --dev before command", () => {
    const result = resolveGlobalFlagsAndCommand(["--dev", "launch"]);
    expect(result.command).toBe("launch");
    expect(result.globalFlags.dev).toBe(true);
    expect(result.remaining).toEqual([]);
  });

  test("extracts --dev after command", () => {
    const result = resolveGlobalFlagsAndCommand(["launch", "--dev"]);
    expect(result.command).toBe("launch");
    expect(result.globalFlags.dev).toBe(true);
    expect(result.remaining).toEqual([]);
  });

  test("--dev bare (no command) resolves to tui", () => {
    const result = resolveGlobalFlagsAndCommand(["--dev"]);
    expect(result.command).toBe("tui");
    expect(result.globalFlags.dev).toBe(true);
    expect(result.remaining).toEqual([]);
  });

  test("extracts --output json before command", () => {
    const result = resolveGlobalFlagsAndCommand(["--output", "json", "status"]);
    expect(result.command).toBe("status");
    expect(result.globalFlags.output).toBe("json");
    expect(result.remaining).toEqual([]);
  });

  test("extracts -o toon before command", () => {
    const result = resolveGlobalFlagsAndCommand(["-o", "toon", "launch"]);
    expect(result.command).toBe("launch");
    expect(result.globalFlags.output).toBe("toon");
    expect(result.remaining).toEqual([]);
  });

  test("extracts --force before command", () => {
    const result = resolveGlobalFlagsAndCommand(["--force", "init"]);
    expect(result.command).toBe("init");
    expect(result.globalFlags.force).toBe(true);
    expect(result.remaining).toEqual([]);
  });

  test("extracts -h with no command", () => {
    const result = resolveGlobalFlagsAndCommand(["-h"]);
    expect(result.command).toBe("tui");
    expect(result.globalFlags.help).toBe(true);
  });

  test("extracts --help with command", () => {
    const result = resolveGlobalFlagsAndCommand(["launch", "--help"]);
    expect(result.command).toBe("launch");
    expect(result.globalFlags.help).toBe(true);
  });

  test("preserves command-specific flags in remaining", () => {
    const result = resolveGlobalFlagsAndCommand(["--dev", "launch", "--dry-run", "--max-concurrent", "3"]);
    expect(result.command).toBe("launch");
    expect(result.globalFlags.dev).toBe(true);
    expect(result.remaining).toEqual(["--dry-run", "--max-concurrent", "3"]);
  });

  test("handles empty args (defaults to tui)", () => {
    const result = resolveGlobalFlagsAndCommand([]);
    expect(result.command).toBe("tui");
    expect(result.globalFlags.dev).toBe(false);
    expect(result.remaining).toEqual([]);
  });

  test("all global flags combined before command", () => {
    const result = resolveGlobalFlagsAndCommand(["--dev", "--force", "--output", "json", "-h", "launch"]);
    expect(result.command).toBe("launch");
    expect(result.globalFlags.dev).toBe(true);
    expect(result.globalFlags.force).toBe(true);
    expect(result.globalFlags.output).toBe("json");
    expect(result.globalFlags.help).toBe(true);
    expect(result.remaining).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isCittyCommand with help/dev routing
// ---------------------------------------------------------------------------

describe("isCittyCommand — with global flags context", () => {
  test("version is a citty command", () => {
    expect(isCittyCommand("version")).toBe(true);
  });

  test("-v is a citty command", () => {
    expect(isCittyCommand("-v")).toBe(true);
  });

  test("-V is a citty command", () => {
    expect(isCittyCommand("-V")).toBe(true);
  });

  test("help is a citty command", () => {
    expect(isCittyCommand("help")).toBe(true);
  });

  test("describe is a citty command", () => {
    expect(isCittyCommand("describe")).toBe(true);
  });

  test("launch is a citty command", () => {
    expect(isCittyCommand("launch")).toBe(true);
  });

  test("tui is a citty command", () => {
    expect(isCittyCommand("tui")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runCittyCommand with global flags
// ---------------------------------------------------------------------------

describe("runCittyCommand — with global flags", () => {
  test("version command outputs version string", async () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    try {
      await runCittyCommand("version", []);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toMatch(/wombo-combo \d+\.\d+\.\d+/);
    } finally {
      spy.mockRestore();
    }
  });

  test("help command outputs global help text", async () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    try {
      await runCittyCommand("help", []);
      const output = logs.join("\n");
      expect(output).toContain("wombo-combo");
      expect(output).toContain("Commands:");
    } finally {
      spy.mockRestore();
    }
  });

  test("describe command outputs JSON schemas", async () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    try {
      await runCittyCommand("describe", []);
      const output = logs.join("\n");
      const parsed = JSON.parse(output);
      expect(parsed.tool).toBe("wombo-combo");
    } finally {
      spy.mockRestore();
    }
  });

  test("describe command with specific command arg", async () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    try {
      await runCittyCommand("describe", ["launch"]);
      const output = logs.join("\n");
      const parsed = JSON.parse(output);
      expect(parsed.command).toBe("launch");
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// buildCittyArgs — re-attaching global flags that citty commands read as args
// ---------------------------------------------------------------------------

describe("buildCittyArgs — --output forwarding", () => {
  test("space-separated --output after the command is forwarded", () => {
    const { globalFlags: flags, remaining } = resolveGlobalFlagsAndCommand(["tasks", "list", "--output", "json"]);
    expect(flags.output).toBe("json");
    expect(buildCittyArgs(remaining, flags)).toEqual(["list", "--output", "json"]);
  });

  test("space-separated -o after the command is forwarded", () => {
    const { globalFlags: flags, remaining } = resolveGlobalFlagsAndCommand(["tasks", "list", "-o", "json"]);
    expect(buildCittyArgs(remaining, flags)).toEqual(["list", "--output", "json"]);
  });

  test("global -o before the command is forwarded", () => {
    const { globalFlags: flags, remaining } = resolveGlobalFlagsAndCommand(["-o", "json", "tasks", "list"]);
    expect(buildCittyArgs(remaining, flags)).toEqual(["list", "--output", "json"]);
  });

  test("--output=json is passed through once, not duplicated", () => {
    const { globalFlags: flags, remaining } = resolveGlobalFlagsAndCommand(["quest", "list", "--output=json"]);
    expect(flags.output).toBeUndefined();
    expect(buildCittyArgs(remaining, flags)).toEqual(["list", "--output=json"]);
  });

  test("no output flag adds nothing", () => {
    const { globalFlags: flags, remaining } = resolveGlobalFlagsAndCommand(["wishlist", "list"]);
    expect(buildCittyArgs(remaining, flags)).toEqual(["list"]);
  });

  test("--output toon is forwarded", () => {
    const { globalFlags: flags, remaining } = resolveGlobalFlagsAndCommand(["status", "--output", "toon"]);
    expect(buildCittyArgs(remaining, flags)).toEqual(["--output", "toon"]);
  });

  test("dev, force and no-ui are re-attached alongside output", () => {
    const { globalFlags: flags, remaining } = resolveGlobalFlagsAndCommand(["launch", "--dry-run", "--output", "json"]);
    const args = buildCittyArgs(remaining, { ...flags, dev: true, force: true, noUi: true });
    expect(args).toEqual(["--dry-run", "--dev", "--force", "--no-ui", "--output", "json"]);
  });
});
