import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import {
  POST_MERGE_JOURNAL,
  computeOperationId,
  listIncompleteOperations,
  readJournal,
  resumeIncompleteOperations,
  runPostMerge,
} from "../src/lib/post-merge";
import { enqueueMerge } from "../src/lib/merger";
import { operationMarker } from "../src/lib/changelog";
import { git, gitRaw } from "./helpers/git-repo";
import { makeFakeGh } from "./helpers/fake-gh";
import {
  makePostMergeFixture,
  useHermeticGitEnv,
  type PostMergeFixture,
} from "./helpers/post-merge-fixture";

let env: { restore(): void };
beforeAll(() => {
  env = useHermeticGitEnv();
});
afterAll(() => env.restore());

let fx: PostMergeFixture;
afterEach(() => fx?.cleanup());

const NOW = () => "2026-03-20T12:00:00.000Z";

function setup(): PostMergeFixture {
  fx = makePostMergeFixture();
  return fx;
}

const remoteHas = (branch: string) =>
  gitRaw(fx.remote, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`).status === 0;
const filesInCommit = (rev: string) =>
  git(fx.repo, "show", "--name-only", "--format=", rev).split("\n").filter(Boolean);
const journalFile = () => join(fx.repo, POST_MERGE_JOURNAL);

describe("computeOperationId", () => {
  test("is stable, branch-aware and marker-safe", () => {
    const a = computeOperationId("feature/x y", "1111111aaaa", "2222222bbbb");
    expect(a).toBe(computeOperationId("feature/x y", "1111111aaaa", "2222222bbbb"));
    expect(a).not.toBe(computeOperationId("other", "1111111aaaa", "2222222bbbb"));
    expect(() => operationMarker(a)).not.toThrow();
    expect(a).not.toContain("--");
  });
});

describe("rejection", () => {
  test("failed merges are rejected without side effects", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config(), operation: op, mergeSucceeded: false },
      { runner: gh.runner, now: NOW }
    );
    expect(res.changelog.status).toBe("skipped");
    expect(res.pr.status).toBe("skipped");
    expect(res.warnings.join(" ")).toContain("did not succeed");
    expect(gh.calls).toHaveLength(0);
    expect(existsSync(journalFile())).toBe(false);
  });

  test("unchanged operations (before == after) are rejected", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config(), operation: { ...op, beforeSha: op.afterSha }, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.changelog.status).toBe("skipped");
    expect(res.warnings.join(" ")).toContain("no changes");
    expect(gh.calls).toHaveLength(0);
  });
});

describe("skip mode", () => {
  test("writes and commits only the changelog; never pushes or calls gh", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const assertDirty = fx.makeDirty();
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prMode: "skip" }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );

    expect(res.changelog.status).toBe("written");
    expect(res.push.status).toBe("skipped");
    expect(res.pr.status).toBe("skipped");
    expect(gh.ghCalls()).toHaveLength(0);
    expect(gh.calls.some((c) => c.command === "git" && c.args[0] === "push")).toBe(false);
    expect(remoteHas("integration")).toBe(false);

    // exactly one new commit on the destination, touching only CHANGELOG.md
    expect(git(fx.repo, "rev-parse", "integration^")).toBe(op.afterSha);
    expect(filesInCommit("integration")).toEqual(["CHANGELOG.md"]);
    expect(git(fx.repo, "log", "-1", "--format=%s", "integration")).toContain("docs(changelog)");
    const changelog = git(fx.repo, "show", "integration:CHANGELOG.md");
    expect(changelog).toContain(operationMarker(op.operationId));
    expect(changelog).toContain("**t1**: Task one");
    expect(changelog).toContain("## 2026-03-20");

    // user's checkout untouched
    assertDirty();
    // temporary worktrees removed
    expect(git(fx.repo, "worktree", "list", "--porcelain").match(/^worktree /gm)).toHaveLength(1);
  });

  test("changelog is independent of PR mode: disabled changelog + skip does nothing", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prMode: "skip", changelog: false }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.changelog.status).toBe("skipped");
    expect(gh.calls).toHaveLength(0);
    expect(git(fx.repo, "rev-parse", "integration")).toBe(op.afterSha);
    expect(existsSync(journalFile())).toBe(false);
  });

  test("reprocessing the same operation leaves exactly one entry and no extra commit", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const req = { projectRoot: fx.repo, config: fx.config({ prMode: "skip" }), operation: op, mergeSucceeded: true };
    await runPostMerge(req, { runner: makeFakeGh().runner, now: NOW });
    const tip = git(fx.repo, "rev-parse", "integration");
    const again = await runPostMerge(req, { runner: makeFakeGh().runner, now: NOW });
    expect(again.changelog.status).toBe("unchanged");
    expect(git(fx.repo, "rev-parse", "integration")).toBe(tip);
    const text = git(fx.repo, "show", "integration:CHANGELOG.md");
    expect(text.split(operationMarker(op.operationId))).toHaveLength(2);
  });

  test("preserves an existing manual changelog", async () => {
    setup();
    writeFileSync(join(fx.repo, "CHANGELOG.md"), "# Changelog\n\n## 1.0.0\n\n- Manual\n");
    git(fx.repo, "add", "-A");
    git(fx.repo, "commit", "-q", "-m", "add changelog");
    git(fx.repo, "branch", "-f", "integration", "main");
    const op = fx.merge("t1", "Task one");
    await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prMode: "skip" }), operation: op, mergeSucceeded: true },
      { runner: makeFakeGh().runner, now: NOW }
    );
    const text = git(fx.repo, "show", "integration:CHANGELOG.md");
    expect(text.startsWith("# Changelog\n\n## 1.0.0\n\n- Manual\n")).toBe(true);
    expect(text).toContain("**t1**");
  });
});

describe("open and draft modes", () => {
  test("changelog commit precedes the push, push precedes PR creation", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const assertDirty = fx.makeDirty();
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prMode: "open" }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );

    expect(res.changelog.status).toBe("written");
    expect(res.push.status).toBe("pushed");
    expect(res.pr).toMatchObject({ status: "created", url: "https://github.com/acme/widgets/pull/1", head: "integration", base: "main" });
    expect(res.warnings).toEqual([]);

    const commitIdx2 = gh.calls.findIndex((c) => c.command === "git" && c.args.includes("commit"));
    const pushIdx = gh.calls.findIndex((c) => c.command === "git" && c.args[0] === "push");
    const createIdx = gh.calls.findIndex((c) => c.command === "gh" && c.args[1] === "create");
    expect(commitIdx2).toBeGreaterThanOrEqual(0);
    expect(pushIdx).toBeGreaterThan(commitIdx2);
    expect(createIdx).toBeGreaterThan(pushIdx);

    // remote received the changelog commit too, and it was not a force push
    expect(git(fx.remote, "rev-parse", "integration")).toBe(git(fx.repo, "rev-parse", "integration"));
    const push = gh.calls[pushIdx]!;
    expect(push.args.some((a) => a.includes("force") || a === "-f" || a.startsWith("+"))).toBe(false);

    // PR is non-draft and its body carries the report sections
    expect(gh.prs).toHaveLength(1);
    expect(gh.prs[0]!.isDraft).toBe(false);
    for (const h of ["## Summary", "## Affected Files", "## Test Results"]) {
      expect(gh.prs[0]!.body).toContain(h);
    }
    expect(gh.prs[0]!.body).toContain("`src/t1.ts`");
    expect(gh.prs[0]!.body).toContain("`CHANGELOG.md`");
    assertDirty();
  });

  test("draft mode creates a draft PR", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prMode: "draft" }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(gh.prs[0]!.isDraft).toBe(true);
  });

  test("PR body reports unknown tests as unknown, never passed", async () => {
    setup();
    const op = fx.merge("t1", "Task one", undefined, { build: { status: "passed" } });
    const gh = makeFakeGh();
    await runPostMerge(
      { projectRoot: fx.repo, config: fx.config(), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(gh.prs[0]!.body).toContain("| `t1` | passed | unknown | unknown |");
  });

  test("uses the remote default branch when prBaseBranch is null", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh({ defaultBranch: "main" });
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prBaseBranch: null }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.pr.status).toBe("created");
    expect(res.pr.base).toBe("main");
    expect(gh.calls.some((c) => c.command === "gh" && c.args[0] === "repo" && c.args[1] === "view")).toBe(true);
  });

  test("maintains one cumulative PR per head/base pair across operations", async () => {
    setup();
    const op1 = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    const config = fx.config();
    await runPostMerge({ projectRoot: fx.repo, config, operation: op1, mergeSucceeded: true }, { runner: gh.runner, now: NOW });
    const op2 = fx.merge("t2", "Task two");
    const res2 = await runPostMerge({ projectRoot: fx.repo, config, operation: op2, mergeSucceeded: true }, { runner: gh.runner, now: NOW });

    expect(gh.prs).toHaveLength(1);
    expect(res2.pr.status).toBe("updated");
    const body = gh.prs[0]!.body;
    expect(body).toContain("`t1`");
    expect(body).toContain("`t2`");
    expect(body).toContain("`src/t1.ts`");
    expect(body).toContain("`src/t2.ts`");
    expect(body.match(/<!-- wombo-combo:pr-report:start -->/g)).toHaveLength(1);
    expect(Object.keys(readJournal(fx.repo).operations)).toHaveLength(2);
  });

  test("repeating an identical operation does not duplicate the PR or changelog", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    const req = { projectRoot: fx.repo, config: fx.config(), operation: op, mergeSucceeded: true };
    await runPostMerge(req, { runner: gh.runner, now: NOW });
    const second = await runPostMerge(req, { runner: gh.runner, now: NOW });
    expect(gh.prs).toHaveLength(1);
    expect(second.changelog.status).toBe("unchanged");
    expect(second.push.status).toBe("pushed"); // idempotent push
    expect(["updated", "skipped"]).toContain(second.pr.status);
    expect(git(fx.repo, "show", "integration:CHANGELOG.md").split(operationMarker(op.operationId))).toHaveLength(2);
  });

  test("tasks already merged into the target drop out of later reports", async () => {
    setup();
    const op1 = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    const config = fx.config();
    await runPostMerge({ projectRoot: fx.repo, config, operation: op1, mergeSucceeded: true }, { runner: gh.runner, now: NOW });
    // the PR gets merged upstream: target catches up with the head
    git(fx.repo, "push", "-q", "origin", "integration:main");
    git(fx.repo, "fetch", "-q", "origin");
    const op2 = fx.merge("t2", "Task two");
    gh.prs.length = 0;
    await runPostMerge({ projectRoot: fx.repo, config, operation: op2, mergeSucceeded: true }, { runner: gh.runner, now: NOW });
    const body = gh.prs[0]!.body;
    expect(body).toContain("`t2`");
    expect(body).not.toContain("`t1`");
  });
});

describe("failure handling", () => {
  test("failed push prevents PR creation but keeps merge and changelog", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const hook = join(fx.remote, "hooks", "pre-receive");
    mkdirSync(join(fx.remote, "hooks"), { recursive: true });
    writeFileSync(hook, "#!/bin/sh\necho rejected-by-test >&2\nexit 1\n");
    chmodSync(hook, 0o755);

    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config(), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.push.status).toBe("failed");
    expect(res.pr.status).toBe("skipped");
    expect(res.changelog.status).toBe("written");
    expect(gh.calls.some((c) => c.command === "gh" && c.args[1] === "create")).toBe(false);
    expect(gh.prs).toHaveLength(0);
    expect(res.warnings.join(" ")).toContain("Push of integration");
    expect(git(fx.repo, "rev-parse", "integration^")).toBe(op.afterSha); // local work preserved

    // recovery: fix the remote and resume
    rmSync(hook);
    expect(listIncompleteOperations(fx.repo)).toHaveLength(1);
    const resumed = await resumeIncompleteOperations(fx.repo, fx.config(), { runner: gh.runner, now: NOW });
    expect(resumed).toHaveLength(1);
    expect(resumed[0]!.changelog.status).toBe("unchanged");
    expect(resumed[0]!.pr.status).toBe("created");
    expect(gh.prs).toHaveLength(1);
    expect(listIncompleteOperations(fx.repo)).toHaveLength(0);
    expect(remoteHas("integration")).toBe(true);
  });

  test("missing gh is reported, nothing is pushed, changelog is kept", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh({ missing: true });
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prBaseBranch: null }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.pr.status).toBe("failed");
    expect(res.pr.message).toContain("GitHub CLI");
    expect(res.push.status).toBe("skipped");
    expect(res.changelog.status).toBe("written");
    expect(remoteHas("integration")).toBe(false);
  });

  test("unauthenticated gh skips the push", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh({ unauthenticated: true });
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prBaseBranch: null }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.pr.status).toBe("failed");
    expect(res.pr.message).toContain("gh auth login");
    expect(remoteHas("integration")).toBe(false);
  });

  test("head equal to PR target is an actionable skip, not an invented PR", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prBaseBranch: "integration" }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.pr.status).toBe("skipped");
    expect(res.pr.message).toContain("postMerge.prBaseBranch");
    expect(res.pr.message).toContain("integration branch");
    expect(res.push.status).toBe("skipped");
    expect(gh.prs).toHaveLength(0);
    expect(remoteHas("integration")).toBe(false);
    expect(res.changelog.status).toBe("written");
    expect(git(fx.repo, "rev-parse", "integration^")).toBe(op.afterSha); // merge not undone
    expect(listIncompleteOperations(fx.repo)).toHaveLength(0);
  });

  test("no meaningful changes against the target skips publication", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    // target already contains the merged work
    git(fx.repo, "push", "-q", "origin", `${op.afterSha}:refs/heads/main`);
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ changelog: false }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.pr.status).toBe("skipped");
    expect(res.pr.message).toContain("No changes");
    expect(gh.prs).toHaveLength(0);
    expect(remoteHas("integration")).toBe(false);
  });

  test("missing target branch is a clear failure before any push", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config({ prBaseBranch: "does-not-exist" }), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.pr.status).toBe("failed");
    expect(res.pr.message).toContain("does-not-exist");
    expect(remoteHas("integration")).toBe(false);
  });

  test("changelog failure does not block publication or throw", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    // a diverging tip makes the compare-and-swap fail: simulate by a runner that fails update-ref
    const gh = makeFakeGh();
    const runner: typeof gh.runner = (cmd, args, opts) =>
      cmd === "git" && args[0] === "update-ref"
        ? Promise.resolve({ exitCode: 1, stdout: "", stderr: "cannot lock ref" })
        : gh.runner(cmd, args, opts);
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config(), operation: op, mergeSucceeded: true },
      { runner, now: NOW }
    );
    expect(res.changelog.status).toBe("failed");
    expect(res.warnings.join(" ")).toContain("Changelog update failed");
    expect(res.pr.status).toBe("created");
    expect(git(fx.repo, "rev-parse", "integration")).toBe(op.afterSha);
    expect(git(fx.repo, "worktree", "list", "--porcelain").match(/^worktree /gm)).toHaveLength(1);
    expect(listIncompleteOperations(fx.repo)).toHaveLength(1); // retryable
  });

  test("a corrupt journal is reported and never silently replaced", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    mkdirSync(join(fx.repo, ".wombo-combo"), { recursive: true });
    writeFileSync(journalFile(), "{ not json");
    const gh = makeFakeGh();
    const res = await runPostMerge(
      { projectRoot: fx.repo, config: fx.config(), operation: op, mergeSucceeded: true },
      { runner: gh.runner, now: NOW }
    );
    expect(res.warnings.join(" ")).toContain("corrupt");
    expect(res.pr.status).toBe("failed");
    expect(res.changelog.status).toBe("written");
    expect(readFileSync(journalFile(), "utf-8")).toBe("{ not json");
    expect(gh.prs).toHaveLength(0);
    expect(remoteHas("integration")).toBe(false);
  });
});

describe("queue and cleanup", () => {
  test("does not acquire the merge queue itself (safe inside enqueueMerge)", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    const res = await Promise.race([
      enqueueMerge(() =>
        runPostMerge(
          { projectRoot: fx.repo, config: fx.config({ prMode: "skip" }), operation: op, mergeSucceeded: true },
          { runner: makeFakeGh().runner, now: NOW }
        )
      ),
      new Promise<"deadlock">((r) => setTimeout(() => r("deadlock"), 20_000)),
    ]);
    expect(res).not.toBe("deadlock");
  });

  test("leaves no temporary files in the project or journal directory", async () => {
    setup();
    const op = fx.merge("t1", "Task one");
    await runPostMerge(
      { projectRoot: fx.repo, config: fx.config(), operation: op, mergeSucceeded: true },
      { runner: makeFakeGh().runner, now: NOW }
    );
    expect(readdirSync(join(fx.repo, ".wombo-combo"))).toEqual(["post-merge.json"]);
    expect(git(fx.repo, "worktree", "list", "--porcelain").match(/^worktree /gm)).toHaveLength(1);
    expect(git(fx.repo, "status", "--porcelain", "--ignored")).not.toContain(".tmp");
  });
});
