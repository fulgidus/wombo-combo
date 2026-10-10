/**
 * Disposable local Git repositories for post-merge tests. Never touches the
 * network or the developer's global Git configuration.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "Test Author",
  GIT_AUTHOR_EMAIL: "author@example.test",
  GIT_COMMITTER_NAME: "Test Author",
  GIT_COMMITTER_EMAIL: "author@example.test",
  GIT_TERMINAL_PROMPT: "0",
};

/** Run git and return trimmed stdout; throws with stderr on failure. */
export function git(cwd: string, ...args: string[]): string {
  const res = spawnSync("git", args, { cwd, encoding: "utf-8", env: GIT_ENV });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${res.stderr}`);
  }
  return res.stdout.trim();
}

/** Run git and return the raw result without throwing. */
export function gitRaw(cwd: string, ...args: string[]) {
  return spawnSync("git", args, { cwd, encoding: "utf-8", env: GIT_ENV });
}

/** Create a temp directory; the caller removes it. */
export function makeTempDir(prefix = "wombo-pm-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Write a file (creating parent directories) inside a repo. */
export function writeRepoFile(repo: string, relPath: string, content: string): void {
  const full = join(repo, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

/** Stage everything and commit; returns the new commit SHA. */
export function commitAll(repo: string, message: string): string {
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", message);
  return git(repo, "rev-parse", "HEAD");
}

/** Create a repository with one initial commit on `branch`. */
export function makeRepo(branch = "main"): string {
  const repo = makeTempDir("wombo-repo-");
  git(repo, "init", "-q", "-b", branch);
  git(repo, "config", "commit.gpgsign", "false");
  writeRepoFile(repo, "README.md", "# fixture\n");
  commitAll(repo, "initial");
  return repo;
}

/** Create a bare repository to act as a local remote. */
export function makeBareRemote(): string {
  const dir = makeTempDir("wombo-remote-");
  git(dir, "init", "-q", "--bare", "-b", "main");
  return dir;
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
