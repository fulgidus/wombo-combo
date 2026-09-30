/**
 * file-scopes.test.ts — Unit tests for file-scope steering primitives.
 *
 * Covers:
 *   - normalizeScopePath: leading ./, leading/trailing slashes, whitespace
 *   - pathsOverlap: exact match, ancestor/descendant segment prefixes,
 *     sibling disjointness, empty-scope semantics
 *   - scopePartitions: union of overlapping tasks, unscoped singletons
 *   - formatScopePartitions: sequential vs parallel rendering
 */

import { describe, test, expect } from "bun:test";
import {
  normalizeScopePath,
  pathsOverlap,
  scopePartitions,
  formatScopePartitions,
} from "../src/lib/file-scopes";

describe("normalizeScopePath", () => {
  test("strips leading ./, leading and trailing slashes, and whitespace", () => {
    expect(normalizeScopePath("src/lib")).toBe("src/lib");
    expect(normalizeScopePath("./src/lib")).toBe("src/lib");
    expect(normalizeScopePath("/src/lib/")).toBe("src/lib");
    expect(normalizeScopePath("  src/lib  ")).toBe("src/lib");
    expect(normalizeScopePath("./a/b/./")).toBe("a/b/.");
  });
});

describe("pathsOverlap", () => {
  test("same path overlaps", () => {
    expect(pathsOverlap(["src/a.ts"], ["src/a.ts"])).toBe(true);
  });

  test("ancestor overlaps descendant (segment-wise)", () => {
    expect(pathsOverlap(["src"], ["src/lib/a.ts"])).toBe(true);
    expect(pathsOverlap(["src/lib"], ["src/lib/a.ts"])).toBe(true);
    expect(pathsOverlap(["src/lib/a.ts"], ["src"])).toBe(true);
  });

  test("shared prefix that is not a full segment is disjoint", () => {
    expect(pathsOverlap(["src"], ["srcx/util.ts"])).toBe(false);
    expect(pathsOverlap(["src/a"], ["src/ab/c.ts"])).toBe(false);
  });

  test("siblings are disjoint", () => {
    expect(pathsOverlap(["src/lib"], ["src/ui"])).toBe(false);
    expect(pathsOverlap(["docs/readme.md"], ["src/readme.md"])).toBe(false);
  });

  test("empty scopes never overlap anything", () => {
    expect(pathsOverlap([], ["src"])).toBe(false);
    expect(pathsOverlap(["src"], [])).toBe(false);
    expect(pathsOverlap([], [])).toBe(false);
  });

  test("any overlapping pair wins over disjoint pairs", () => {
    expect(pathsOverlap(["docs", "src/lib"], ["src/lib/x.ts"])).toBe(true);
  });
});

describe("scopePartitions", () => {
  test("overlapping tasks land in one group; disjoint stay separate", () => {
    const groups = scopePartitions([
      { id: "a", paths: ["src"] },
      { id: "b", paths: ["src/lib"] },
      { id: "c", paths: ["docs"] },
      { id: "d", paths: ["web"] },
    ]);
    // a+b merged (overlap), c and d singletons — order preserved
    expect(groups.length).toBe(3);
    expect(groups.find((g) => g.length === 2)).toEqual(["a", "b"]);
  });

  test("unscoped tasks get singleton groups", () => {
    const groups = scopePartitions([
      { id: "a" },
      { id: "b", paths: [] },
      { id: "c", paths: ["src"] },
    ]);
    expect(groups.length).toBe(3);
    expect(groups.every((g) => g.length === 1)).toBe(true);
  });

  test("transitive overlap merges transitively (a-b, b-c)", () => {
    const groups = scopePartitions([
      { id: "a", paths: ["src/lib"] },
      { id: "b", paths: ["src/lib"] },
      { id: "c", paths: ["src"] },
    ]);
    expect(groups.length).toBe(1);
    expect(groups[0].sort()).toEqual(["a", "b", "c"]);
  });

  test("no paths at all → all singletons", () => {
    const groups = scopePartitions([{ id: "x" }, { id: "y" }]);
    expect(groups.length).toBe(2);
  });
});

describe("formatScopePartitions", () => {
  test("renders sequential for multi-member groups, parallel for singletons", () => {
    const text = formatScopePartitions([["a", "b"], ["c"]]);
    expect(text).toContain("sequential: a → b");
    expect(text).toContain("parallel:   c");
  });

  test("empty partitions render as empty string", () => {
    expect(formatScopePartitions([])).toBe("");
  });
});
