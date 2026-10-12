/**
 * completion-upgrade.test.ts — direct coverage for `woco completion` script
 * generation and the `woco upgrade` version helpers.
 */

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { cmdCompletion } from "../src/commands/completion";
import { compareSemver, getLocalVersion } from "../src/commands/upgrade";

function captureStdout(fn: () => void): string {
  const chunks: string[] = [];
  const spy = spyOn(process.stdout, "write").mockImplementation(((c: string | Uint8Array) => {
    chunks.push(String(c));
    return true;
  }) as typeof process.stdout.write);
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  return chunks.join("");
}

describe("cmdCompletion", () => {
  for (const shell of ["bash", "zsh", "fish"]) {
    test(`${shell} script mentions woco and core commands`, () => {
      const out = captureStdout(() => cmdCompletion({ shell }));
      expect(out.length).toBeGreaterThan(100);
      expect(out).toContain("woco");
      expect(out).toContain("tasks");
      expect(out).toContain("quest");
    });
  }

  test("includes the team command", () => {
    expect(captureStdout(() => cmdCompletion({ shell: "bash" }))).toContain("team");
  });

  describe("unsupported shell", () => {
    afterEach(() => {
      process.exitCode = 0;
    });

    test("prints the supported shells to stderr and exits 1", () => {
      const errors: string[] = [];
      const errSpy = spyOn(console, "error").mockImplementation((...a: unknown[]) => {
        errors.push(a.join(" "));
      });
      const exitSpy = spyOn(process, "exit").mockImplementation((() => {
        throw new Error("exit");
      }) as never);
      try {
        expect(() => cmdCompletion({ shell: "tcsh" })).toThrow("exit");
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(errors.join("\n")).toContain("tcsh");
      } finally {
        errSpy.mockRestore();
        exitSpy.mockRestore();
      }
    });
  });
});

describe("compareSemver", () => {
  test("orders versions and ignores a leading v", () => {
    expect(compareSemver("0.5.1", "0.5.1")).toBe(0);
    expect(compareSemver("v0.5.1", "0.5.1")).toBe(0);
    expect(compareSemver("0.5.1", "0.6.0")).toBe(-1);
    expect(compareSemver("1.0.0", "0.9.9")).toBe(1);
    expect(compareSemver("0.5.10", "0.5.9")).toBe(1);
  });
});

describe("getLocalVersion", () => {
  test("returns a semver string", () => {
    expect(getLocalVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
