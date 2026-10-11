/**
 * replay-diff.test.ts — Bounded worktree diff capture and line classification.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { captureWorktreeDiff, classifyDiffLine } from "../src/lib/replay-diff";
import { REPLAY_LIMITS } from "../src/lib/replay";
import { makeRepo, writeRepoFile, commitAll, git, removeDir } from "./helpers/git-repo";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});
function repo(): { dir: string; base: string } {
  const dir = makeRepo();
  dirs.push(dir);
  return { dir, base: git(dir, "rev-parse", "HEAD") };
}

describe("captureWorktreeDiff", () => {
  test("captures committed and uncommitted tracked changes since baseline", () => {
    const { dir, base } = repo();
    writeRepoFile(dir, "a.txt", "one\ntwo\n");
    commitAll(dir, "add a");
    writeRepoFile(dir, "README.md", "# changed\n");
    const r = captureWorktreeDiff(dir, base);
    expect(r.truncated).toBe(false);
    expect(r.baseline).toBe(base);
    expect(r.diff).toContain("+two");
    expect(r.diff).toContain("+# changed");
    expect(r.files.find((f) => f.path === "a.txt")).toMatchObject({ additions: 2, deletions: 0 });
    expect(r.files.find((f) => f.path === "README.md")).toMatchObject({ additions: 1, deletions: 1 });
    expect(r.diagnostics).toEqual([]);
  });

  test("excludes wombo-combo runtime paths", () => {
    const { dir, base } = repo();
    writeRepoFile(dir, ".wombo-combo/logs/x.log", "noise\n");
    writeRepoFile(dir, "src.ts", "code\n");
    commitAll(dir, "mixed");
    const r = captureWorktreeDiff(dir, base);
    expect(r.files.map((f) => f.path)).toEqual(["src.ts"]);
    expect(r.diff).not.toContain("noise");
  });

  test("truncates huge diffs with an explicit marker", () => {
    const { dir, base } = repo();
    writeRepoFile(dir, "big.txt", "line of text\n".repeat(40_000));
    commitAll(dir, "big");
    const r = captureWorktreeDiff(dir, base);
    expect(r.truncated).toBe(true);
    expect(r.diff.length).toBeLessThan(REPLAY_LIMITS.diff + 100);
    expect(r.diff).toContain("[truncated");
    expect(r.files[0].path).toBe("big.txt");
  });

  test("binary files have null counts", () => {
    const { dir, base } = repo();
    writeRepoFile(dir, "b.bin", "\0\1\2\0binary");
    commitAll(dir, "bin");
    const r = captureWorktreeDiff(dir, base);
    expect(r.files[0]).toMatchObject({ path: "b.bin", additions: null, deletions: null });
  });

  test("never throws: bad dir or baseline yields diagnostics and an empty diff", () => {
    const a = captureWorktreeDiff("/nonexistent/dir/xyz", "abc");
    expect(a.diff).toBe("");
    expect(a.diagnostics.length).toBeGreaterThan(0);
    const { dir } = repo();
    const b = captureWorktreeDiff(dir, "deadbeefdeadbeef");
    expect(b.diff).toBe("");
    expect(b.diagnostics.length).toBeGreaterThan(0);
  });

  test("null baseline falls back to uncommitted changes against HEAD", () => {
    const { dir } = repo();
    writeRepoFile(dir, "README.md", "# changed again\n");
    const r = captureWorktreeDiff(dir, null);
    expect(r.diff).toContain("+# changed again");
    expect(r.baseline).toBeNull();
  });

  test("does not mutate the repository", () => {
    const { dir, base } = repo();
    writeRepoFile(dir, "README.md", "# changed\n");
    const before = git(dir, "status", "--porcelain");
    captureWorktreeDiff(dir, base);
    expect(git(dir, "status", "--porcelain")).toBe(before);
  });
});

describe("classifyDiffLine", () => {
  test("classifies unified diff lines", () => {
    expect(classifyDiffLine("diff --git a/x b/x")).toBe("meta");
    expect(classifyDiffLine("index 1..2 100644")).toBe("meta");
    expect(classifyDiffLine("--- a/x")).toBe("meta");
    expect(classifyDiffLine("+++ b/x")).toBe("meta");
    expect(classifyDiffLine("@@ -1 +1 @@")).toBe("hunk");
    expect(classifyDiffLine("+added")).toBe("add");
    expect(classifyDiffLine("-removed")).toBe("del");
    expect(classifyDiffLine(" context")).toBe("ctx");
    expect(classifyDiffLine("")).toBe("ctx");
  });
});
