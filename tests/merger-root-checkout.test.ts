import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeBranch } from "../src/lib/merger";
import type { WomboConfig } from "../src/config";
import { commitAll, git, makeRepo, removeDir, writeRepoFile } from "./helpers/git-repo";

const config = { git: { remote: "origin", mergeStrategy: "--no-ff" } } as unknown as WomboConfig;
const dirs: string[] = [];

function setup(): string {
  const repo = makeRepo();
  dirs.push(repo, join(repo, "..", ".wombo-tmp"));
  writeRepoFile(repo, "a.txt", "a\n");
  writeRepoFile(repo, "b.txt", "b\n");
  commitAll(repo, "base files");
  git(repo, "checkout", "-q", "-b", "feature/x");
  writeRepoFile(repo, "a.txt", "a changed\n");
  writeRepoFile(repo, "new.txt", "new\n");
  commitAll(repo, "feature work");
  git(repo, "checkout", "-q", "main");
  return repo;
}

afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});

describe("mergeBranch updates the root checkout", () => {
  test("clean root is brought up to date", async () => {
    const repo = setup();
    const res = await mergeBranch(repo, "feature/x", "main", config);
    expect(res.success).toBe(true);
    expect(git(repo, "status", "--porcelain")).toBe("");
    expect(readFileSync(join(repo, "a.txt"), "utf-8")).toBe("a changed\n");
    expect(existsSync(join(repo, "new.txt"))).toBe(true);
  });

  test("unrelated local changes are kept", async () => {
    const repo = setup();
    writeRepoFile(repo, "b.txt", "b local\n");
    const res = await mergeBranch(repo, "feature/x", "main", config);
    expect(res.success).toBe(true);
    expect(readFileSync(join(repo, "b.txt"), "utf-8")).toBe("b local\n");
    expect(readFileSync(join(repo, "a.txt"), "utf-8")).toBe("a changed\n");
    expect(git(repo, "status", "--porcelain")).toBe("M b.txt");
  });

  test("conflicting local changes are left alone with a warning", async () => {
    const repo = setup();
    writeRepoFile(repo, "a.txt", "a local\n");
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const res = await mergeBranch(repo, "feature/x", "main", config);
    const msgs = warn.mock.calls.map((c) => String(c[0])).join("\n");
    warn.mockRestore();
    expect(res.success).toBe(true);
    expect(readFileSync(join(repo, "a.txt"), "utf-8")).toBe("a local\n");
    expect(msgs).toContain("git read-tree -m -u");
  });

  test("root on another branch is not touched", async () => {
    const repo = setup();
    git(repo, "checkout", "-q", "feature/x");
    const res = await mergeBranch(repo, "feature/x", "main", config);
    expect(res.success).toBe(true);
    expect(git(repo, "status", "--porcelain")).toBe("");
  });
});
