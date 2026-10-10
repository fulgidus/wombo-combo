import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { captureHead, measureLineChanges, parseNumstatZ, isExcludedPath } from "../src/lib/analytics-git";

let repo: string;

function git(...args: string[]): string {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}
function write(rel: string, content: string | Buffer) {
  const p = join(repo, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
}
function commit(msg: string): string {
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", msg);
  return git("rev-parse", "HEAD");
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "analytics-git-"));
  git("init", "-q", "-b", "main");
  write("a.txt", "one\ntwo\nthree\n");
  commit("init");
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe("parseNumstatZ", () => {
  test("parses normal, binary, rename and unusual names", () => {
    const out = "3\t1\tsrc/a.ts\0-\t-\timg.png\0" + "0\t0\t\0old name.txt\0new\tname.txt\0" + "2\t0\tweird\nname.txt\0";
    const e = parseNumstatZ(out);
    expect(e).toEqual([
      { additions: 3, deletions: 1, path: "src/a.ts" },
      { additions: null, deletions: null, path: "img.png" },
      { additions: 0, deletions: 0, path: "new\tname.txt", oldPath: "old name.txt" },
      { additions: 2, deletions: 0, path: "weird\nname.txt" },
    ]);
  });
  test("empty output", () => {
    expect(parseNumstatZ("")).toEqual([]);
  });
});

describe("isExcludedPath", () => {
  test("excludes runtime artifacts only", () => {
    expect(isExcludedPath(".wombo-combo/analytics/x.json")).toBe(true);
    expect(isExcludedPath(".wombo-combo/usage.jsonl")).toBe(true);
    expect(isExcludedPath(".wombo-combo/logs/a.log")).toBe(true);
    expect(isExcludedPath(".wombo-combo/tasks/x.yml")).toBe(false);
    expect(isExcludedPath("src/index.ts")).toBe(false);
  });
});

describe("captureHead", () => {
  test("returns full sha", () => {
    const r = captureHead(repo);
    expect(r.head).toBe(git("rev-parse", "HEAD"));
    expect(r.diagnostics).toEqual([]);
  });
  test("non-repo gives null + diagnostics", () => {
    const dir = mkdtempSync(join(tmpdir(), "no-repo-"));
    try {
      const r = captureHead(dir);
      expect(r.head).toBeNull();
      expect(r.diagnostics.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("measureLineChanges", () => {
  test("counts additions and deletions", () => {
    const base = git("rev-parse", "HEAD");
    write("a.txt", "one\nTWO\nthree\nfour\n");
    write("b.txt", "x\ny\n");
    const head = commit("work");
    const m = measureLineChanges(repo, base, head);
    expect(m.additions).toBe(4); // TWO, four, x, y
    expect(m.deletions).toBe(1); // two
    expect(m.linesChanged).toBe(5);
    expect(m.filesChanged).toBe(2);
    expect(m.binaryFiles).toBe(0);
    expect(m.baseline).toBe(base);
    expect(m.completion).toBe(head);
    expect(m.diagnostics).toEqual([]);
  });

  test("empty diff yields zeros, not null", () => {
    const base = git("rev-parse", "HEAD");
    const m = measureLineChanges(repo, base, base);
    expect(m.additions).toBe(0);
    expect(m.deletions).toBe(0);
    expect(m.linesChanged).toBe(0);
    expect(m.filesChanged).toBe(0);
  });

  test("binary files contribute no fabricated counts", () => {
    const base = git("rev-parse", "HEAD");
    write("bin.dat", Buffer.from([0, 1, 2, 0, 255, 0, 0, 7]));
    write("t.txt", "hi\n");
    const head = commit("bin");
    const m = measureLineChanges(repo, base, head);
    expect(m.binaryFiles).toBe(1);
    expect(m.additions).toBe(1);
    expect(m.deletions).toBe(0);
  });

  test("renames count only changed lines; unusual filenames work", () => {
    const base = git("rev-parse", "HEAD");
    renameSync(join(repo, "a.txt"), join(repo, "sp ace\tname.txt"));
    const head = commit("rename");
    const m = measureLineChanges(repo, base, head);
    expect(m.additions).toBe(0);
    expect(m.deletions).toBe(0);
    expect(m.filesChanged).toBe(1);
  });

  test("excludes runtime artifacts", () => {
    const base = git("rev-parse", "HEAD");
    write(".wombo-combo/analytics/e.json", "{}\n{}\n");
    write(".wombo-combo/usage.jsonl", "1\n2\n3\n");
    write(".wombo-combo/logs/a.log", "x\n");
    write(".wombo-combo/state.json", "{}\n");
    write(".wombo-combo/history/h.json", "{}\n");
    write(".wombo-combo/evals/e.json", "{}\n");
    write("real.txt", "r\n");
    const head = commit("art");
    const m = measureLineChanges(repo, base, head);
    expect(m.additions).toBe(1);
    expect(m.filesChanged).toBe(1);
  });

  test("sequential chain members use their own baselines", () => {
    const h0 = git("rev-parse", "HEAD");
    write("m1.txt", "1\n2\n");
    const h1 = commit("member1");
    write("m2.txt", "a\nb\nc\n");
    const h2 = commit("member2");
    expect(measureLineChanges(repo, h0, h1).linesChanged).toBe(2);
    expect(measureLineChanges(repo, h1, h2).linesChanged).toBe(3);
    expect(measureLineChanges(repo, h0, h2).linesChanged).toBe(5);
  });

  test("unrelated movement of the base branch does not affect immutable baseline", () => {
    const base = git("rev-parse", "HEAD");
    git("checkout", "-q", "-b", "feature");
    write("f.txt", "f1\nf2\n");
    const head = commit("feature work");
    git("checkout", "-q", "main");
    write("other.txt", "o\n".repeat(50));
    commit("main moved");
    const m = measureLineChanges(repo, base, head);
    expect(m.additions).toBe(2);
    expect(m.deletions).toBe(0);
  });

  test("does not mutate worktree or refs", () => {
    const base = git("rev-parse", "HEAD");
    write("a.txt", "changed\n");
    const before = git("status", "--porcelain");
    const refs = git("for-each-ref");
    measureLineChanges(repo, base, base);
    expect(git("status", "--porcelain")).toBe(before);
    expect(git("for-each-ref")).toBe(refs);
  });

  test("unresolvable refs and non-repos give null measurements with diagnostics", () => {
    const m = measureLineChanges(repo, "deadbeef".repeat(5), "HEAD");
    expect(m.additions).toBeNull();
    expect(m.deletions).toBeNull();
    expect(m.linesChanged).toBeNull();
    expect(m.diagnostics.length).toBeGreaterThan(0);
    const dir = mkdtempSync(join(tmpdir(), "no-repo-"));
    try {
      const n = measureLineChanges(dir, "HEAD", "HEAD");
      expect(n.additions).toBeNull();
      expect(n.diagnostics.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("option-like refs are rejected", () => {
    const m = measureLineChanges(repo, "--output=/tmp/x", "HEAD");
    expect(m.additions).toBeNull();
  });
});
