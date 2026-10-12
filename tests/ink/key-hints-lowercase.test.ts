/**
 * key-hints-lowercase.test.ts — Guard against key hints drawn as capital
 * letters. Handlers react to the lowercase key, so a hint like `A` sends
 * users to Shift+A. Single-letter hints must be lowercase.
 */

import { describe, test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const INK_DIR = join(import.meta.dir, "..", "..", "src", "ink");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsxFiles(p);
    return e.name.endsWith(".tsx") && !e.name.includes(".test.") ? [p] : [];
  });
}

describe("key hints", () => {
  test("single-letter key hints are lowercase", () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(INK_DIR)) {
      readFileSync(file, "utf-8")
        .split("\n")
        .forEach((line, i) => {
          if (/<Text dimColor>[A-Z]<\/Text>/.test(line)) offenders.push(`${file}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
