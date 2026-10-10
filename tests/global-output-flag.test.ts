/**
 * global-output-flag.test.ts — `--output/-o` given on the command line must
 * reach the command (extractGlobalFlags consumes it, so index.ts forwards it).
 */

import { describe, test, expect } from "bun:test";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

function woco(args: string[]) {
  const res = Bun.spawnSync(["bun", join(ROOT, "src", "index.ts"), ...args], { cwd: ROOT });
  return { code: res.exitCode, stdout: res.stdout.toString() };
}

describe("global --output forwarding", () => {
  test("describe honors --output toon (and -o) instead of silently ignoring it", () => {
    const plain = JSON.parse(woco(["describe", "merge"]).stdout);
    expect(plain.flags).toBeDefined();
    expect(plain.fields).toBeUndefined();

    for (const flag of [["--output", "toon"], ["-o", "toon"]]) {
      const toon = JSON.parse(woco(["describe", "merge", ...flag]).stdout);
      expect(toon.fields).toBeDefined();
      expect(toon.flags).toBeUndefined();
    }
  });

  test("the forwarded flag works when it precedes the command's own arguments", () => {
    const res = woco(["--output", "toon", "describe", "merge"]);
    expect(res.code).toBe(0);
    expect(JSON.parse(res.stdout).command).toBe("merge");
  });
});
