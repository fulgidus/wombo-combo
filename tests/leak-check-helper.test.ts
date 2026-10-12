import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { git, makeRepo, removeDir } from "./helpers/git-repo";
import {
  assertNoLeaks,
  snapshotResources,
  trackPid,
  trackProcess,
} from "./helpers/leak-check";
import { worktreesDir } from "../src/lib/worktree";

const repos: string[] = [];
const procs: Array<{ kill: () => void }> = [];

function newRepo(): string {
  const repo = makeRepo();
  repos.push(repo);
  return repo;
}

afterEach(() => {
  for (const p of procs.splice(0)) {
    try {
      p.kill();
    } catch {}
  }
  for (const repo of repos.splice(0)) {
    removeDir(worktreesDir(repo));
    removeDir(repo);
  }
});

const FAST = { deadlineMs: 300 };

describe("leak-check helper", () => {
  test("passes on a clean repo", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    await assertNoLeaks(repo, before, FAST);
  });

  test("passes for a tracked child that exited", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    const child = Bun.spawn(["true"]);
    trackProcess(child);
    await child.exited;
    await assertNoLeaks(repo, before, FAST);
  });

  test("fails for a live sleeping child and kills it", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    const child = Bun.spawn(["sleep", "60"]);
    procs.push(child);
    trackProcess(child);
    await expect(assertNoLeaks(repo, before, FAST)).rejects.toThrow(/process/i);
    await child.exited; // survivor was killed, so this resolves
    expect(child.killed || child.exitCode !== null || child.signalCode !== null).toBe(true);
  });

  test("fails for a live pid registered with trackPid", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    const child = Bun.spawn(["sleep", "60"]);
    procs.push(child);
    trackPid(child.pid);
    await expect(assertNoLeaks(repo, before, FAST)).rejects.toThrow(/process/i);
    await child.exited;
  });

  test("fails for a stray worktree", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    git(repo, "worktree", "add", "-q", "-b", "scratch", join(worktreesDir(repo), "stray"));
    await expect(assertNoLeaks(repo, before, { ...FAST, allowBranches: ["scratch"] })).rejects.toThrow(
      /worktree/i,
    );
  });

  test("fails for a leftover directory under the worktrees dir", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    git(repo, "worktree", "add", "-q", "-b", "scratch", join(worktreesDir(repo), "stray"));
    git(repo, "worktree", "remove", "--force", join(worktreesDir(repo), "stray"));
    git(repo, "branch", "-q", "-D", "scratch");
    await assertNoLeaks(repo, before, FAST);
    await Bun.write(join(worktreesDir(repo), "orphan", "file.txt"), "x");
    await expect(assertNoLeaks(repo, before, FAST)).rejects.toThrow(/directory|orphan/i);
  });

  test("fails for a stray feature/ branch, passes when allowed", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    git(repo, "branch", "feature/leaked");
    await expect(assertNoLeaks(repo, before, FAST)).rejects.toThrow(/feature\/leaked/);
    await assertNoLeaks(repo, before, { ...FAST, allowBranches: ["feature/leaked"] });
  });

  test("fails for a stray quest/ branch", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    git(repo, "branch", "quest/leaked");
    await expect(assertNoLeaks(repo, before, FAST)).rejects.toThrow(/quest\/leaked/);
  });

  test("fails for a stale prunable worktree", async () => {
    const repo = newRepo();
    const before = snapshotResources(repo);
    const wt = join(worktreesDir(repo), "gone");
    git(repo, "worktree", "add", "-q", "-b", "feature/gone", wt);
    rmSync(wt, { recursive: true, force: true });
    expect(existsSync(wt)).toBe(false);
    await expect(
      assertNoLeaks(repo, before, { ...FAST, allowBranches: ["feature/gone"] }),
    ).rejects.toThrow(/prun/i);
  });
});
