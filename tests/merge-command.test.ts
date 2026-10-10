/**
 * merge-command.test.ts — `woco merge` core behavior against disposable
 * local repositories. The coordinator and gh are always injected/faked.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DaemonState, createDaemonAgentState, type InternalAgentState } from "../src/daemon/state";
import { cmdMerge, runMerge, MergeCommandError, type MergeCommandDeps } from "../src/commands/merge";
import { createBlankTask, loadFeatures, saveTaskToStore } from "../src/lib/tasks";
import type { PostMergeRequest } from "../src/lib/post-merge";
import type { PostMergeResult, VerificationSummary } from "../src/lib/post-merge-types";
import { git, commitAll, writeRepoFile } from "./helpers/git-repo";
import { makeFakeGh } from "./helpers/fake-gh";
import { makePostMergeFixture, useHermeticGitEnv, type PostMergeFixture } from "./helpers/post-merge-fixture";
import { POST_MERGE_JOURNAL } from "../src/lib/post-merge";
import { existsSync } from "node:fs";

let restoreEnv: () => void;
const saved: Record<string, string | undefined> = {};
beforeAll(() => {
  const h = useHermeticGitEnv();
  for (const k of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL"]) {
    saved[k] = process.env[k];
  }
  process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = "Test Author";
  process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL = "author@example.test";
  restoreEnv = () => {
    h.restore();
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
});
afterAll(() => restoreEnv());

let fx: PostMergeFixture;
const extraDirs: string[] = [];
afterEach(() => {
  fx?.cleanup();
  while (extraDirs.length) rmSync(extraDirs.pop()!, { recursive: true, force: true });
  process.exitCode = 0;
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

interface AgentSpec {
  id: string;
  title?: string;
  status?: InternalAgentState["status"];
  base?: string;
  file?: string;
  content?: string;
  verification?: VerificationSummary;
  buildPassed?: boolean | null;
  /** Create the branch from this ref instead of the destination (for chains) */
  from?: string;
  worktree?: string;
  dependsOn?: string[];
  dependedOnBy?: string[];
  hasChainSuccessor?: boolean;
  noBranch?: boolean;
}

function setup(): PostMergeFixture {
  fx = makePostMergeFixture("integration");
  return fx;
}

function makeBranch(spec: AgentSpec): string {
  const branch = `feature/${spec.id}`;
  if (spec.noBranch) return branch;
  const wt = mkdtempSync(join(tmpdir(), "wombo-feat-wt-"));
  extraDirs.push(wt);
  git(fx.repo, "worktree", "add", "-q", "-b", branch, wt, spec.from ?? spec.base ?? "integration");
  try {
    writeRepoFile(wt, spec.file ?? `src/${spec.id}.ts`, spec.content ?? `// ${spec.id}\n`);
    commitAll(wt, `feat: ${spec.id}`);
  } finally {
    git(fx.repo, "worktree", "remove", "--force", wt);
  }
  return branch;
}

function seed(specs: AgentSpec[]): void {
  const config = fx.config();
  const state = new DaemonState(fx.repo);
  for (const spec of specs) {
    const branch = makeBranch(spec);
    const agent = createDaemonAgentState({
      featureId: spec.id,
      taskTitle: spec.title ?? `Task ${spec.id}`,
      branch,
      baseBranch: spec.base ?? "integration",
      worktree: spec.worktree ?? join(tmpdir(), `wombo-nonexistent-wt-${spec.id}`),
      dependsOn: spec.dependsOn,
      dependedOnBy: spec.dependedOnBy,
      hasChainSuccessor: spec.hasChainSuccessor,
    });
    agent.status = spec.status ?? "verified";
    agent.buildPassed = spec.buildPassed === undefined ? true : spec.buildPassed;
    agent.completedAt = `2026-03-20T10:00:0${specs.indexOf(spec)}.000Z`;
    if (spec.verification) agent.verification = spec.verification;
    state.addAgent(agent);
    const task = createBlankTask(spec.id, spec.title ?? `Task ${spec.id}`);
    task.status = "in_progress";
    saveTaskToStore(fx.repo, config, task);
  }
  state.save();
  state.destroy();
}

function readState(): DaemonState {
  const s = new DaemonState(fx.repo);
  s.load();
  return s;
}

interface FakeCoordinator {
  deps: MergeCommandDeps;
  calls: PostMergeRequest[];
  resumed: number;
}

function fakeCoordinator(extra: Partial<MergeCommandDeps> = {}): FakeCoordinator {
  const calls: PostMergeRequest[] = [];
  const fc: FakeCoordinator = { calls, resumed: 0, deps: {} };
  fc.deps = {
    isDaemonAlive: () => ({ running: false }),
    runPostMerge: async (req): Promise<PostMergeResult> => {
      calls.push(req);
      return {
        operationId: req.operation.operationId,
        changelog: { status: "written" },
        push: { status: "skipped" },
        pr: { status: "skipped" },
        warnings: [],
      };
    },
    resumeIncomplete: async () => {
      fc.resumed++;
      return [];
    },
    ...extra,
  };
  return fc;
}

const taskStatus = (id: string) =>
  loadFeatures(fx.repo, fx.config()).tasks.find((t) => t.id === id)?.status;
const worktreeCount = () => git(fx.repo, "worktree", "list", "--porcelain").match(/^worktree /gm)?.length ?? 0;

// ---------------------------------------------------------------------------
// Safety: daemon + dry-run
// ---------------------------------------------------------------------------

describe("live daemon refusal", () => {
  test("refuses to mutate with an actionable explanation", async () => {
    setup();
    seed([{ id: "a" }]);
    const fc = fakeCoordinator({ isDaemonAlive: () => ({ running: true, pid: 4242 }) });
    const tipBefore = git(fx.repo, "rev-parse", "integration");
    await expect(runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps)).rejects.toThrow(/daemon.*4242/s);
    await expect(runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps)).rejects.toThrow(/woco daemon stop/);
    expect(git(fx.repo, "rev-parse", "integration")).toBe(tipBefore);
    expect(readState().getAgent("a")!.status).toBe("verified");
    expect(fc.calls).toHaveLength(0);
  });

  test("dry-run may inspect while a daemon runs, with a staleness warning", async () => {
    setup();
    seed([{ id: "a" }]);
    const fc = fakeCoordinator({ isDaemonAlive: () => ({ running: true, pid: 1 }) });
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config(), dryRun: true }, fc.deps);
    expect(res.selected).toHaveLength(1);
    expect(res.warnings.join(" ")).toContain("may be stale");
  });

  test("the default liveness check does not delete stale PID files", async () => {
    setup();
    seed([{ id: "a" }]);
    mkdirSync(join(fx.repo, ".wombo-combo"), { recursive: true });
    const pidFile = join(fx.repo, ".wombo-combo", "daemon.pid");
    writeFileSync(pidFile, "999999999");
    const { defaultIsDaemonAlive } = await import("../src/commands/merge");
    expect(defaultIsDaemonAlive(fx.repo).running).toBe(false);
    expect(existsSync(pidFile)).toBe(true);
  });
});

describe("dry-run", () => {
  test("writes nothing, merges nothing, creates no worktrees, invokes no coordinator or gh", async () => {
    setup();
    seed([{ id: "a" }, { id: "b" }]);
    const gh = makeFakeGh();
    const fc = fakeCoordinator({ postMergeDeps: { runner: gh.runner } });
    const statePath = join(fx.repo, ".wombo-combo", "daemon-state.json");
    const stateBefore = readFileSync(statePath, "utf-8");
    const tipBefore = git(fx.repo, "rev-parse", "integration");
    const refsBefore = git(fx.repo, "for-each-ref");
    const wtBefore = worktreeCount();

    const res = await runMerge({ projectRoot: fx.repo, config: fx.config({ prMode: "open" }), dryRun: true }, fc.deps);

    expect(res.dry_run).toBe(true);
    expect(res.selected.map((s) => s.feature_id)).toEqual(["a", "b"]);
    expect(res.merged).toEqual([]);
    expect(res.plan).toEqual({ pr_mode: "open", pr_base_branch: "main", changelog: true });
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
    expect(git(fx.repo, "rev-parse", "integration")).toBe(tipBefore);
    expect(git(fx.repo, "for-each-ref")).toBe(refsBefore);
    expect(worktreeCount()).toBe(wtBefore);
    expect(fc.calls).toHaveLength(0);
    expect(fc.resumed).toBe(0);
    expect(gh.calls).toHaveLength(0);
    expect(existsSync(join(fx.repo, POST_MERGE_JOURNAL))).toBe(false);
    expect(taskStatus("a")).toBe("in_progress");
  });
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe("selection", () => {
  test("default selects verified, non-deferred agents only", async () => {
    setup();
    seed([
      { id: "ok" },
      { id: "running", status: "running" },
      { id: "failed", status: "failed" },
      { id: "done", status: "merged" },
    ]);
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config(), dryRun: true }, fakeCoordinator().deps);
    expect(res.selected.map((s) => s.feature_id)).toEqual(["ok"]);
  });

  test("--tasks restricts the selection", async () => {
    setup();
    seed([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config(), tasks: ["c", "a"], dryRun: true }, fakeCoordinator().deps);
    expect(res.selected.map((s) => s.feature_id)).toEqual(["a", "c"]);
  });

  test("rejects selected unverified or unknown agents", async () => {
    setup();
    seed([{ id: "a" }, { id: "r", status: "running" }]);
    const deps = fakeCoordinator().deps;
    await expect(runMerge({ projectRoot: fx.repo, config: fx.config(), tasks: ["r"] }, deps)).rejects.toThrow(/not verified \(status: running\)/);
    await expect(runMerge({ projectRoot: fx.repo, config: fx.config(), tasks: ["zzz"] }, deps)).rejects.toThrow(/zzz/);
    await expect(runMerge({ projectRoot: fx.repo, config: fx.config(), tasks: ["a", "r"] }, deps)).rejects.toBeInstanceOf(MergeCommandError);
    expect(readState().getAgent("a")!.status).toBe("verified"); // nothing merged
  });

  test("rejects mixed destination branches instead of guessing", async () => {
    setup();
    git(fx.repo, "branch", "other");
    seed([{ id: "a" }, { id: "b", base: "other" }]);
    await expect(
      runMerge({ projectRoot: fx.repo, config: fx.config() }, fakeCoordinator().deps)
    ).rejects.toThrow(/different destination branches/);
  });

  test("does not merge deferred chain predecessors separately", async () => {
    setup();
    seed([
      { id: "p", worktree: "/tmp/wombo-chain-wt", dependedOnBy: ["t"], hasChainSuccessor: true },
      { id: "t", worktree: "/tmp/wombo-chain-wt", dependsOn: ["p"], from: "feature/p" },
    ]);
    const deps = fakeCoordinator().deps;
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config(), dryRun: true }, deps);
    expect(res.selected.map((s) => s.feature_id)).toEqual(["t"]);
    expect(res.selected[0]!.merges_chain).toEqual(["p"]);
    await expect(runMerge({ projectRoot: fx.repo, config: fx.config(), tasks: ["p"] }, deps)).rejects.toThrow(/deferred chain predecessor/);
  });

  test("empty selection reports nothing to merge and retries pending publication", async () => {
    setup();
    seed([{ id: "r", status: "running" }]);
    const fc = fakeCoordinator();
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);
    expect(res.message).toContain("No verified agents");
    expect(fc.calls).toHaveLength(0);
    expect(fc.resumed).toBe(1);
  });

  test("a project with no daemon state is a no-op", async () => {
    setup();
    const fc = fakeCoordinator();
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);
    expect(res.selected).toEqual([]);
    expect(res.message).toContain("No daemon state");
    expect(fc.resumed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Merging
// ---------------------------------------------------------------------------

describe("merging", () => {
  test("merges sequentially, marks agents and tasks done, publishes once", async () => {
    setup();
    seed([{ id: "a", title: "Alpha" }, { id: "b", title: "Beta" }]);
    const fc = fakeCoordinator();
    const before = git(fx.repo, "rev-parse", "integration");

    const res = await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);

    expect(res.failed).toEqual([]);
    expect(res.merged.map((m) => m.feature_id)).toEqual(["a", "b"]);
    const tip = git(fx.repo, "rev-parse", "integration");
    expect(tip).not.toBe(before);
    expect(git(fx.repo, "show", "integration:src/a.ts")).toContain("// a");
    expect(git(fx.repo, "show", "integration:src/b.ts")).toContain("// b");

    const state = readState();
    for (const id of ["a", "b"]) {
      expect(state.getAgent(id)!.status).toBe("merged");
      expect(state.getAgent(id)!.mergeCommitHash).toMatch(/^[0-9a-f]{40}$/);
      expect(taskStatus(id)).toBe("done");
    }

    // exactly one publication for the whole batch, with batch-wide SHAs
    expect(fc.calls).toHaveLength(1);
    const op = fc.calls[0]!.operation;
    expect(fc.calls[0]!.mergeSucceeded).toBe(true);
    expect(op.destinationBranch).toBe("integration");
    expect(op.beforeSha).toBe(before);
    expect(op.afterSha).toBe(tip);
    expect(op.tasks.map((t) => [t.id, t.title])).toEqual([["a", "Alpha"], ["b", "Beta"]]);
    expect(op.operationId).toContain("integration");
    expect(res.publication?.changelog.status).toBe("written");
  });

  test("captures persisted verification evidence; legacy records are unknown for tests", async () => {
    setup();
    const evidence: VerificationSummary = {
      build: { status: "passed", durationMs: 10 },
      unitTests: { status: "skipped", reason: "fake agent" },
      browser: { status: "skipped" },
    };
    seed([{ id: "new", verification: evidence }, { id: "old", buildPassed: true }, { id: "bad", buildPassed: null }]);
    const fc = fakeCoordinator();
    await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);
    const tasks = Object.fromEntries(fc.calls[0]!.operation.tasks.map((t) => [t.id, t.verification]));
    expect(tasks.new).toEqual(evidence);
    expect(tasks.old).toEqual({ build: { status: "passed" } });
    expect(tasks.old?.unitTests).toBeUndefined(); // unknown, never passed
    expect(tasks.bad).toEqual({ build: { status: "unknown" } });
  });

  test("chain terminal merge records and reports the predecessors actually merged", async () => {
    setup();
    seed([
      { id: "p", title: "Pred", worktree: "/tmp/wombo-chain-wt2", dependedOnBy: ["t"], hasChainSuccessor: true },
      { id: "t", title: "Term", worktree: "/tmp/wombo-chain-wt2", dependsOn: ["p"], from: "feature/p" },
    ]);
    const fc = fakeCoordinator();
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);
    expect(res.merged.map((m) => [m.feature_id, m.via])).toEqual([["t", undefined], ["p", "t"]]);
    const state = readState();
    expect(state.getAgent("p")!.status).toBe("merged");
    expect(state.getAgent("t")!.status).toBe("merged");
    expect(taskStatus("p")).toBe("done");
    expect(fc.calls).toHaveLength(1);
    expect(fc.calls[0]!.operation.tasks.map((t) => t.id).sort()).toEqual(["p", "t"]);
    expect(git(fx.repo, "show", "integration:src/p.ts")).toContain("// p");
  });

  test("already-merged branches are recorded but never republished", async () => {
    setup();
    seed([{ id: "a" }]);
    git(fx.repo, "branch", "-f", "integration", "feature/a"); // already contained
    const fc = fakeCoordinator();
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);
    expect(res.already_merged).toEqual(["a"]);
    expect(res.merged).toEqual([]);
    expect(readState().getAgent("a")!.status).toBe("merged");
    expect(taskStatus("a")).toBe("done");
    expect(fc.calls).toHaveLength(0);
    expect(res.publication).toBeNull();
  });

  test("a failed merge keeps earlier successes and skips publication", async () => {
    setup();
    seed([
      { id: "a", file: "shared.txt", content: "from a\n" },
      { id: "b", file: "shared.txt", content: "from b\n" }, // conflicts with a once a is merged
      { id: "c" },
    ]);
    const fc = fakeCoordinator();
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);

    expect(res.merged.map((m) => m.feature_id)).toEqual(["a", "c"]);
    expect(res.failed.map((f) => f.feature_id)).toEqual(["b"]);
    expect(res.failed[0]!.error).toMatch(/conflict/i);
    expect(fc.calls).toHaveLength(0);
    expect(res.publication).toBeNull();
    expect(res.warnings.join(" ")).toContain("publication skipped");
    const state = readState();
    expect(state.getAgent("a")!.status).toBe("merged");
    expect(state.getAgent("b")!.status).toBe("verified"); // still retryable
    expect(taskStatus("b")).toBe("in_progress");
    expect(git(fx.repo, "status", "--porcelain", "--untracked-files=no")).toBe("");
  });

  test("missing branches fail cleanly", async () => {
    setup();
    seed([{ id: "a", noBranch: true }]);
    const fc = fakeCoordinator();
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);
    expect(res.failed[0]!.error).toContain("does not exist");
    expect(fc.calls).toHaveLength(0);
  });

  test("a throwing merge is contained per agent", async () => {
    setup();
    seed([{ id: "a" }, { id: "b" }]);
    let n = 0;
    const real = (await import("../src/lib/merger")).mergeBranch;
    const fc = fakeCoordinator({
      mergeBranch: async (...args) => {
        if (n++ === 0) throw new Error("boom");
        return real(...args);
      },
    });
    const res = await runMerge({ projectRoot: fx.repo, config: fx.config() }, fc.deps);
    expect(res.failed).toEqual([{ feature_id: "a", error: "boom" }]);
    expect(res.merged.map((m) => m.feature_id)).toEqual(["b"]);
    expect(fc.calls).toHaveLength(0);
  });

  test("end to end with the real coordinator: changelog commit, push, one PR", async () => {
    setup();
    seed([{ id: "a", title: "Alpha" }, { id: "b", title: "Beta" }]);
    const gh = makeFakeGh();
    const res = await runMerge(
      { projectRoot: fx.repo, config: fx.config({ prMode: "open" }) },
      { isDaemonAlive: () => ({ running: false }), postMergeDeps: { runner: gh.runner, now: () => "2026-03-20T12:00:00.000Z" } }
    );
    expect(res.publication?.changelog.status).toBe("written");
    expect(res.publication?.push.status).toBe("pushed");
    expect(res.publication?.pr.status).toBe("created");
    expect(gh.prs).toHaveLength(1);
    expect(gh.prs[0]!.body).toContain("`a`");
    expect(gh.prs[0]!.body).toContain("`b`");
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain("**a**: Alpha");
  });

  test("a repeated run has nothing to merge and does not duplicate publication", async () => {
    setup();
    seed([{ id: "a" }]);
    const gh = makeFakeGh();
    const deps: MergeCommandDeps = {
      isDaemonAlive: () => ({ running: false }),
      postMergeDeps: { runner: gh.runner, now: () => "2026-03-20T12:00:00.000Z" },
    };
    const config = fx.config({ prMode: "open" });
    await runMerge({ projectRoot: fx.repo, config }, deps);
    const tip = git(fx.repo, "rev-parse", "integration");
    const again = await runMerge({ projectRoot: fx.repo, config }, deps);
    expect(again.message).toContain("No verified agents");
    expect(again.resumed).toEqual([]); // publication was already complete
    expect(gh.prs).toHaveLength(1);
    expect(git(fx.repo, "rev-parse", "integration")).toBe(tip);
  });

  test("rerunning merge retries an interrupted publication", async () => {
    setup();
    seed([{ id: "a" }]);
    const config = fx.config({ prMode: "open" });
    const down = makeFakeGh({ missing: true });
    const first = await runMerge(
      { projectRoot: fx.repo, config },
      { isDaemonAlive: () => ({ running: false }), postMergeDeps: { runner: down.runner } }
    );
    expect(first.publication?.pr.status).toBe("failed");
    expect(first.failed).toEqual([]); // the merge itself still succeeded

    const up = makeFakeGh();
    const second = await runMerge(
      { projectRoot: fx.repo, config },
      { isDaemonAlive: () => ({ running: false }), postMergeDeps: { runner: up.runner } }
    );
    expect(second.resumed).toHaveLength(1);
    expect(second.resumed[0]!.pr.status).toBe("created");
    expect(up.prs).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

describe("cmdMerge output", () => {
  async function capture(fn: () => Promise<void>) {
    const out: string[] = [];
    const err: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...a: unknown[]) => void out.push(a.join(" "));
    console.error = (...a: unknown[]) => void err.push(a.join(" "));
    try {
      await fn();
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
    return { out, err };
  }

  test("json output stays valid even when merge helpers print diagnostics", async () => {
    setup();
    seed([{ id: "a" }]);
    const real = (await import("../src/lib/merger")).mergeBranch;
    const fc = fakeCoordinator({
      mergeBranch: async (...args) => {
        console.log("Pushing integration to origin...");
        console.info("diagnostic info");
        return real(...args);
      },
    });
    const { out, err } = await capture(() =>
      cmdMerge({ projectRoot: fx.repo, config: fx.config(), outputFmt: "json" }, fc.deps)
    );
    expect(out).toHaveLength(1);
    const parsed = JSON.parse(out[0]!);
    expect(parsed.merged[0].feature_id).toBe("a");
    expect(err.join("\n")).toContain("Pushing integration to origin...");
  });

  test("toon output is produced for dry runs", async () => {
    setup();
    seed([{ id: "a" }]);
    const { out } = await capture(() =>
      cmdMerge({ projectRoot: fx.repo, config: fx.config(), outputFmt: "toon", dryRun: true }, fakeCoordinator().deps)
    );
    expect(out.join("\n")).toContain("a");
  });

  test("text output describes the plan and publication outcome", async () => {
    setup();
    seed([{ id: "a" }]);
    const { out } = await capture(() =>
      cmdMerge({ projectRoot: fx.repo, config: fx.config(), dryRun: true }, fakeCoordinator().deps)
    );
    const text = out.join("\n");
    expect(text).toContain("[dry-run]");
    expect(text).toContain("would merge: a");
    expect(text).toContain("PR mode open, target main");
  });

  test("failures set a nonzero exit code", async () => {
    setup();
    seed([{ id: "a", noBranch: true }]);
    await capture(() => cmdMerge({ projectRoot: fx.repo, config: fx.config(), outputFmt: "json" }, fakeCoordinator().deps));
    expect(process.exitCode).toBe(1);
  });
});
