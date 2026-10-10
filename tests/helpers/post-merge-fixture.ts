/**
 * Local fixture for post-merge tests: a repository on `main`, a bare local
 * remote named `origin`, and an `integration` branch that receives simulated
 * merges the same way mergeBranch does (in a temporary sibling worktree), so
 * the user's checkout is never touched.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG, type PostMergeConfig, type WomboConfig } from "../../src/config";
import { computeOperationId } from "../../src/lib/post-merge";
import type { MergeReportInput } from "../../src/lib/post-merge-types";
import {
  commitAll,
  git,
  makeBareRemote,
  makeRepo,
  removeDir,
  writeRepoFile,
} from "./git-repo";

export interface PostMergeFixture {
  repo: string;
  remote: string;
  destination: string;
  /** Simulate a successful merge of one task into the destination branch */
  merge(taskId: string, title: string, file?: string, verification?: MergeReportInput["tasks"][number]["verification"]): MergeReportInput;
  /** Leave uncommitted work in the user's checkout; returns a checker */
  makeDirty(): () => void;
  config(postMerge?: Partial<PostMergeConfig>): WomboConfig;
  cleanup(): void;
}

export function makePostMergeFixture(destination = "integration"): PostMergeFixture {
  const repo = makeRepo("main");
  const remote = makeBareRemote();
  git(repo, "remote", "add", "origin", remote);
  git(repo, "push", "-q", "origin", "main");
  git(repo, "branch", destination);
  const extra: string[] = [];

  const fixture: PostMergeFixture = {
    repo,
    remote,
    destination,
    merge(taskId, title, file = `src/${taskId}.ts`, verification) {
      const wt = mkdtempSync(join(tmpdir(), "wombo-merge-wt-"));
      extra.push(wt);
      git(repo, "worktree", "add", "-q", wt, destination);
      try {
        const before = git(wt, "rev-parse", "HEAD");
        writeRepoFile(wt, file, `// ${taskId}\n`);
        const after = commitAll(wt, `Merge branch 'feature/${taskId}' into ${destination}`);
        return {
          operationId: computeOperationId(destination, before, after),
          destinationBranch: destination,
          beforeSha: before,
          afterSha: after,
          tasks: [{ id: taskId, title, ...(verification ? { verification } : {}) }],
        };
      } finally {
        git(repo, "worktree", "remove", "--force", wt);
      }
    },
    makeDirty() {
      writeRepoFile(repo, "README.md", "# fixture\nlocal uncommitted edit\n");
      writeRepoFile(repo, "scratch.txt", "untracked work\n");
      const head = git(repo, "rev-parse", "HEAD");
      return () => {
        if (git(repo, "rev-parse", "HEAD") !== head) throw new Error("checkout HEAD moved");
        if (git(repo, "rev-parse", "--abbrev-ref", "HEAD") !== "main") throw new Error("checkout branch changed");
        const status = git(repo, "status", "--porcelain");
        if (!status.includes("M README.md") || !status.includes("?? scratch.txt")) {
          throw new Error(`dirty state changed: ${status}`);
        }
        if (git(repo, "diff", "--cached", "--name-only") !== "") throw new Error("index was modified");
        if (git(repo, "stash", "list") !== "") throw new Error("stash was used");
      };
    },
    config(postMerge) {
      const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as WomboConfig;
      config.baseBranch = "main";
      config.git.remote = "origin";
      config.postMerge = {
        prMode: "open",
        prBaseBranch: "main",
        changelog: true,
        ...postMerge,
      };
      return config;
    },
    cleanup() {
      removeDir(repo);
      removeDir(remote);
      for (const d of extra) removeDir(d);
    },
  };
  return fixture;
}

/** Environment that keeps git hermetic for runners that inherit process.env. */
export function useHermeticGitEnv(): { restore(): void } {
  const keys = ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "GIT_TERMINAL_PROMPT"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env.GIT_CONFIG_GLOBAL = "/dev/null";
  process.env.GIT_CONFIG_SYSTEM = "/dev/null";
  process.env.GIT_TERMINAL_PROMPT = "0";
  return {
    restore() {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    },
  };
}
