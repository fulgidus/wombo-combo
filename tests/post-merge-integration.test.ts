/**
 * post-merge-integration.test.ts — Acceptance tests for changelog/PR
 * publication through BOTH entry points:
 *
 *   - the real `woco merge` CLI, spawned as a subprocess against disposable
 *     local Git repositories, a local bare remote and a fake `gh` executable
 *   - the daemon's AgentRunner merge path, in-process, with an injected gh
 *
 * Nothing here talks to GitHub or the network: the "GitHub" remote URL is
 * rewritten to a local bare repository for pushes, SSH is disabled so fetches
 * fail instantly, and `gh` is a recording script on PATH.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import { createBlankTask, saveTaskToStore } from "../src/lib/tasks";
import { operationMarker } from "../src/lib/changelog";
import { commitAll, git, gitRaw, writeRepoFile } from "./helpers/git-repo";
import { makeFakeGh } from "./helpers/fake-gh";
import { installBinWithoutGh, installFakeGh, type FakeGhBin } from "./helpers/fake-gh-bin";
import { seedVerifiedAgents, writeProjectConfig, type SeedSpec } from "./helpers/daemon-seed";
import { makePostMergeFixture, useHermeticGitEnv, type PostMergeFixture } from "./helpers/post-merge-fixture";

const REPO_ROOT = join(import.meta.dir, "..");
const GITHUB_URL = "git@github.com:acme/widgets.git";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

let restoreEnv: () => void;
const savedEnv: Record<string, string | undefined> = {};
beforeAll(() => {
  const h = useHermeticGitEnv();
  for (const k of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL"]) {
    savedEnv[k] = process.env[k];
  }
  process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = "Test Author";
  process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL = "author@example.test";
  restoreEnv = () => {
    h.restore();
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
});
afterAll(() => restoreEnv());

let fx: PostMergeFixture;
let gh: FakeGhBin;
let scratch: string;
const cleanup: string[] = [];

afterEach(() => {
  fx?.cleanup();
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  while (cleanup.length) rmSync(cleanup.pop()!, { recursive: true, force: true });
});

interface ProjectOpts {
  postMerge?: Record<string, unknown>;
}

/** A repo whose `origin` looks like GitHub but pushes to a local bare remote. */
function makeProject(o: ProjectOpts = {}): void {
  fx = makePostMergeFixture("integration");
  scratch = mkdtempSync(join(tmpdir(), "wombo-accept-"));
  gh = installFakeGh(scratch);
  git(fx.repo, "remote", "set-url", "origin", GITHUB_URL);
  git(fx.repo, "config", `url.${fx.remote}.pushInsteadOf`, GITHUB_URL);
  writeProjectConfig(fx, { prMode: "skip", prBaseBranch: "main", changelog: true, ...o.postMerge });
}

function seed(...ids: Array<string | SeedSpec>): void {
  seedVerifiedAgents(
    fx,
    ids.map((i) => (typeof i === "string" ? { id: i } : i)),
    cleanup
  );
}

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
  json: any;
}

async function woco(args: string[], env: Record<string, string> = {}, path?: string): Promise<CliResult> {
  const proc = Bun.spawn(["bun", join(REPO_ROOT, "src", "index.ts"), ...args], {
    cwd: fx.repo,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PATH: path ?? `${gh.binDir}:${process.env.PATH}`,
      FAKE_GH_DIR: gh.stateDir,
      GIT_SSH_COMMAND: "false", // fetches fail instantly; pushes are rewritten to the local bare remote
      GIT_TERMINAL_PROMPT: "0",
      ...env,
    },
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  let json: any = null;
  try {
    json = JSON.parse(stdout.trim().split("\n").filter(Boolean).pop() ?? "");
  } catch {
    // text output
  }
  if (json === null && process.env.DEBUG_WOCO) console.error("WOCO", code, stdout, stderr);
  return { code, stdout, stderr, json };
}

const merge = (...extra: string[]) => woco(["merge", "--output", "json", ...extra]);
const remoteTip = (branch: string) =>
  gitRaw(fx.remote, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`).stdout.trim();
const ghWrites = () => gh.calls().filter((c) => c.args[0] === "pr" && (c.args[1] === "create" || c.args[1] === "edit"));

/** The unit-test column of a "Test Results" row must never claim a pass without evidence. */
function unitTestCell(body: string, taskId: string): string {
  const row = body.split("\n").find((l) => l.startsWith(`| \`${taskId}\``));
  if (!row) throw new Error(`no test result row for ${taskId}`);
  return row.split("|").map((c) => c.trim())[3]!;
}

// ---------------------------------------------------------------------------
// CLI: modes
// ---------------------------------------------------------------------------

describe("woco merge CLI — open mode", () => {
  test("commits the changelog, then pushes, then opens one PR; checkout untouched", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed({ id: "a", title: "Alpha" }, { id: "b", title: "Beta" });
    const assertDirty = fx.makeDirty();
    const mainBefore = git(fx.repo, "rev-parse", "main");
    const destBefore = git(fx.repo, "rev-parse", "integration");

    const res = await merge();

    expect(res.code).toBe(0);
    expect(res.json.failed).toEqual([]);
    expect(res.json.merged.map((m: any) => m.feature_id)).toEqual(["a", "b"]);
    expect(res.json.publication.changelog.status).toBe("written");
    expect(res.json.publication.push.status).toBe("pushed");
    expect(res.json.publication.pr).toMatchObject({
      status: "created",
      url: "https://github.com/acme/widgets/pull/1",
      head: "integration",
      base: "main",
    });

    // commit-before-push: the remote tip IS the changelog commit, sitting on the merges
    const subject = git(fx.remote, "log", "-1", "--format=%s", "integration");
    expect(subject).toContain("docs(changelog)");
    expect(git(fx.remote, "show", "integration:CHANGELOG.md")).toContain("**a**: Alpha");
    expect(remoteTip("integration")).toBe(git(fx.repo, "rev-parse", "integration"));
    // 2 feature commits + 2 merge commits + 1 changelog commit
    expect(git(fx.repo, "rev-list", "--count", `${destBefore}..integration`)).toBe("5");
    expect(git(fx.repo, "rev-list", "--count", "--merges", `${destBefore}..integration`)).toBe("2");

    // exactly one create, targeting the right pair, non-draft, no force push anywhere
    const creates = ghWrites().filter((c) => c.args[1] === "create");
    expect(creates).toHaveLength(1);
    const args = creates[0]!.args;
    expect(args[args.indexOf("--head") + 1]).toBe("integration");
    expect(args[args.indexOf("--base") + 1]).toBe("main");
    expect(args).not.toContain("--draft");
    expect(args).not.toContain("--dry-run");
    expect(gh.prs()).toHaveLength(1);

    // report contents
    const body = gh.prs()[0]!.body;
    for (const heading of ["## Summary", "## Affected Files", "## Test Results"]) expect(body).toContain(heading);
    expect(body).toContain("`a`");
    expect(body).toContain("`b`");
    expect(body).toContain("`src/a.ts`");
    expect(body).toContain("`CHANGELOG.md`");
    // legacy records have no test evidence: unknown, never passed
    expect(unitTestCell(body, "a")).toBe("unknown");
    expect(unitTestCell(body, "b")).toBe("unknown");

    // the user's checkout and unrelated branches are untouched
    assertDirty();
    expect(git(fx.repo, "rev-parse", "main")).toBe(mainBefore);
    expect(remoteTip("main")).toBe(mainBefore);
    expect(git(fx.repo, "worktree", "list", "--porcelain").match(/^worktree /gm)).toHaveLength(1);
  }, 60_000);

  test("draft mode creates a draft PR", async () => {
    makeProject({ postMerge: { prMode: "draft" } });
    seed("a");
    const res = await merge();
    expect(res.code).toBe(0);
    expect(gh.prs()[0]!.isDraft).toBe(true);
    expect(ghWrites()[0]!.args).toContain("--draft");
  }, 60_000);

  test("skip mode (the default) only writes the changelog: no push, no gh at all", async () => {
    makeProject({ postMerge: { prMode: "skip" } });
    seed("a");
    const res = await merge();
    expect(res.code).toBe(0);
    expect(res.json.publication.changelog.status).toBe("written");
    expect(res.json.publication.push.status).toBe("skipped");
    expect(res.json.publication.pr.status).toBe("skipped");
    expect(gh.calls()).toEqual([]);
    expect(remoteTip("integration")).toBe("");
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain("**a**");
  }, 60_000);

  test("an absent postMerge block behaves like skip mode (older config files)", async () => {
    makeProject();
    writeFileSync(
      join(fx.repo, ".wombo-combo", "config.json"),
      JSON.stringify({ baseBranch: "main", git: { remote: "origin" } })
    );
    seed("a");
    const res = await merge();
    expect(res.code).toBe(0);
    expect(gh.calls()).toEqual([]);
    expect(remoteTip("integration")).toBe("");
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain("**a**");
  }, 60_000);

  test("changelog generation is independent of PR mode", async () => {
    makeProject({ postMerge: { prMode: "open", changelog: false } });
    seed("a");
    const res = await merge();
    expect(res.code).toBe(0);
    expect(res.json.publication.changelog.status).toBe("skipped");
    expect(res.json.publication.pr.status).toBe("created");
    expect(gitRaw(fx.repo, "cat-file", "-e", "integration:CHANGELOG.md").status).not.toBe(0);
    expect(gh.prs()[0]!.body).not.toContain("CHANGELOG.md");
  }, 60_000);
});

// ---------------------------------------------------------------------------
// CLI: repeat, cumulative, recovery
// ---------------------------------------------------------------------------

describe("woco merge CLI — repeat, cumulative PR, recovery", () => {
  test("repeat execution is idempotent: nothing to merge, one PR, one changelog entry", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed("a");
    await merge();
    const tip = git(fx.repo, "rev-parse", "integration");
    const writesBefore = ghWrites().length;

    const again = await merge();

    expect(again.code).toBe(0);
    expect(again.json.message).toContain("No verified agents");
    expect(again.json.resumed).toEqual([]);
    expect(git(fx.repo, "rev-parse", "integration")).toBe(tip);
    expect(ghWrites()).toHaveLength(writesBefore);
    expect(gh.prs()).toHaveLength(1);
    const changelog = git(fx.repo, "show", "integration:CHANGELOG.md");
    expect(changelog.match(/wombo-combo:operation:/g)).toHaveLength(1);
  }, 60_000);

  test("later merges update the same PR cumulatively (one PR per head/base pair)", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed("a");
    await merge();
    seed("b");
    const second = await merge();

    expect(second.code).toBe(0);
    expect(second.json.publication.pr.status).toBe("updated");
    expect(gh.prs()).toHaveLength(1);
    expect(ghWrites().map((c) => c.args[1])).toEqual(["create", "edit"]);
    const body = gh.prs()[0]!.body;
    expect(body).toContain("`a`");
    expect(body).toContain("`b`");
    expect(body).toContain("`src/a.ts`");
    expect(body).toContain("`src/b.ts`");
    expect(body.match(/wombo-combo:pr-report:start/g)).toHaveLength(1);
    expect(git(fx.repo, "show", "integration:CHANGELOG.md").match(/wombo-combo:operation:/g)).toHaveLength(2);
  }, 90_000);

  test("manual PR text outside the generated section survives updates", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed("a");
    await merge();
    // a human edits the PR description around the generated section
    const statePath = join(gh.stateDir, "state.json");
    const state = JSON.parse(readFileSync(statePath, "utf-8"));
    state.prs[0].body = `Reviewer note: please check perf.\n\n${state.prs[0].body}\n\nFooter by hand`;
    writeFileSync(statePath, JSON.stringify(state));

    seed("b");
    await merge();
    const body = gh.prs()[0]!.body;
    expect(body).toContain("Reviewer note: please check perf.");
    expect(body).toContain("Footer by hand");
    expect(body).toContain("`b`");
  }, 90_000);

  test("a failed push prevents PR creation; rerunning merge recovers", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed("a");
    const hook = join(fx.remote, "hooks", "pre-receive");
    mkdirSync(join(fx.remote, "hooks"), { recursive: true });
    writeFileSync(hook, "#!/bin/sh\necho rejected >&2\nexit 1\n");
    chmodSync(hook, 0o755);

    const first = await merge();
    expect(first.code).toBe(0); // the merge itself succeeded
    expect(first.json.failed).toEqual([]);
    expect(first.json.publication.changelog.status).toBe("written");
    expect(first.json.publication.push.status).toBe("failed");
    expect(first.json.publication.pr.status).toBe("skipped");
    expect(ghWrites()).toEqual([]);
    expect(gh.prs()).toHaveLength(0);
    expect(remoteTip("integration")).toBe("");
    expect(first.json.warnings.join(" ")).toContain("re-run the merge");

    // fix the remote and re-run: publication resumes without re-merging or duplicating the changelog
    rmSync(hook);
    const tip = git(fx.repo, "rev-parse", "integration");
    const second = await merge();
    expect(second.code).toBe(0);
    expect(second.json.resumed).toHaveLength(1);
    expect(second.json.resumed[0].pr.status).toBe("created");
    expect(git(fx.repo, "rev-parse", "integration")).toBe(tip);
    expect(remoteTip("integration")).toBe(tip);
    expect(gh.prs()).toHaveLength(1);
    expect(git(fx.repo, "show", "integration:CHANGELOG.md").match(/wombo-combo:operation:/g)).toHaveLength(1);
  }, 90_000);

  test("missing gh: merge and changelog succeed, nothing is pushed, the message is actionable", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed("a");
    const res = await woco(["merge", "--output", "json"], {}, installBinWithoutGh(scratch));
    expect(res.code).toBe(0);
    expect(res.json.publication.changelog.status).toBe("written");
    expect(res.json.publication.pr.status).toBe("failed");
    expect(res.json.publication.pr.message).toContain("GitHub CLI");
    expect(remoteTip("integration")).toBe("");
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain("**a**");
  }, 60_000);

  test("unauthenticated gh is reported without pushing", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed("a");
    const res = await woco(["merge", "--output", "json"], { FAKE_GH_UNAUTH: "1" });
    expect(res.code).toBe(0);
    expect(res.json.publication.pr.status).toBe("failed");
    expect(res.json.publication.pr.message).toContain("gh auth login");
    expect(remoteTip("integration")).toBe("");
  }, 60_000);
});

// ---------------------------------------------------------------------------
// CLI: refusals and partial failures
// ---------------------------------------------------------------------------

describe("woco merge CLI — refusals", () => {
  test("PR target equal to the merge destination is an actionable skip, not an invented PR", async () => {
    makeProject({ postMerge: { prMode: "open", prBaseBranch: "integration" } });
    seed("a");
    const destBefore = git(fx.repo, "rev-parse", "integration");
    const res = await merge();
    expect(res.code).toBe(0);
    expect(res.json.publication.pr.status).toBe("skipped");
    expect(res.json.publication.pr.message).toContain("postMerge.prBaseBranch");
    expect(res.json.publication.pr.message).toContain("integration branch");
    expect(res.json.publication.push.status).toBe("skipped");
    expect(ghWrites()).toEqual([]);
    expect(remoteTip("integration")).toBe("");
    // the merge is never undone
    expect(git(fx.repo, "show", "integration:src/a.ts")).toContain("// a");
    expect(git(fx.repo, "rev-parse", "integration")).not.toBe(destBefore);
  }, 60_000);

  test("partial merge failure keeps successes, reports failures and publishes nothing", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed(
      { id: "a", file: "shared.txt", content: "from a\n" },
      { id: "b", file: "shared.txt", content: "from b\n" },
      { id: "c" }
    );
    const res = await merge();
    expect(res.code).toBe(1);
    expect(res.json.merged.map((m: any) => m.feature_id)).toEqual(["a", "c"]);
    expect(res.json.failed.map((f: any) => f.feature_id)).toEqual(["b"]);
    expect(res.json.publication).toBeNull();
    expect(res.json.warnings.join(" ")).toContain("publication skipped");
    expect(ghWrites()).toEqual([]);
    expect(gh.calls()).toEqual([]);
    expect(remoteTip("integration")).toBe("");
    const state = new DaemonState(fx.repo);
    state.load();
    expect(state.getAgent("a")!.status).toBe("merged");
    expect(state.getAgent("b")!.status).toBe("verified");
    expect(existsSync(join(fx.repo, ".wombo-combo", "post-merge.json"))).toBe(false);
    expect(gitRaw(fx.repo, "cat-file", "-e", "integration:CHANGELOG.md").status).not.toBe(0);
  }, 60_000);

  test("dry run touches nothing and never calls gh", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed("a");
    const refs = git(fx.repo, "for-each-ref");
    const stateFile = readFileSync(join(fx.repo, ".wombo-combo", "daemon-state.json"), "utf-8");
    const res = await merge("--dry-run");
    expect(res.code).toBe(0);
    expect(res.json.dry_run).toBe(true);
    expect(res.json.selected.map((s: any) => s.feature_id)).toEqual(["a"]);
    expect(git(fx.repo, "for-each-ref")).toBe(refs);
    expect(readFileSync(join(fx.repo, ".wombo-combo", "daemon-state.json"), "utf-8")).toBe(stateFile);
    expect(gh.calls()).toEqual([]);
    expect(existsSync(join(fx.repo, ".wombo-combo", "post-merge.json"))).toBe(false);
  }, 60_000);

  test("refuses while a live daemon could merge concurrently", async () => {
    makeProject({ postMerge: { prMode: "open" } });
    seed("a");
    writeFileSync(join(fx.repo, ".wombo-combo", "daemon.pid"), String(process.pid)); // alive
    const res = await woco(["merge", "--output", "json"]);
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("daemon");
    expect(res.stderr).toContain("woco daemon stop");
    expect(gh.calls()).toEqual([]);
    // nothing was merged
    expect(gitRaw(fx.repo, "cat-file", "-e", "integration:src/a.ts").status).not.toBe(0);
  }, 60_000);
});

describe("runtime journal is not a tracked project artifact", () => {
  test(".gitignore covers .wombo-combo/post-merge.json and its temporary files", () => {
    const ignore = readFileSync(join(REPO_ROOT, ".gitignore"), "utf-8");
    expect(ignore).toContain(".wombo-combo/post-merge.json");
    expect(ignore).toMatch(/^\*\.tmp$/m);
  });
});

// ---------------------------------------------------------------------------
// Daemon entry point
// ---------------------------------------------------------------------------

describe("daemon merge path — continuous PR updates", () => {
  function runnerFor(prMode: "open" | "draft" | "skip") {
    fx = makePostMergeFixture("integration");
    const config = fx.config({ prMode });
    const state = new DaemonState(fx.repo);
    const fake = makeFakeGh();
    const runner = new AgentRunner(
      { projectRoot: fx.repo, config, postMergeDeps: { runner: fake.runner, now: () => "2026-03-20T12:00:00.000Z" } },
      state
    );
    return { runner, state, fake, config };
  }

  function addAgent(env: ReturnType<typeof runnerFor>, id: string, fakeAgent = false): void {
    const wt = mkdtempSync(join(tmpdir(), "wombo-daemon-wt-"));
    cleanup.push(wt);
    git(fx.repo, "worktree", "add", "-q", "-b", `feature/${id}`, wt, "integration");
    writeRepoFile(wt, `src/${id}.ts`, `// ${id}\n`);
    commitAll(wt, `feat: ${id}`);
    git(fx.repo, "worktree", "remove", "--force", wt);
    const agent = createDaemonAgentState({
      featureId: id,
      taskTitle: `Task ${id}`,
      branch: `feature/${id}`,
      baseBranch: "integration",
      worktree: join(tmpdir(), `wombo-daemon-nonexistent-${id}`),
      agentName: fakeAgent ? FAKE_AGENT_SENTINEL : null,
    });
    agent.status = "completed";
    env.state.addAgent(agent);
    const task = createBlankTask(id, `Task ${id}`);
    task.status = "in_progress";
    saveTaskToStore(fx.repo, env.config, task);
  }

  const verify = (env: ReturnType<typeof runnerFor>, id: string) =>
    (env.runner as unknown as { handleBuildVerification(id: string): Promise<void> }).handleBuildVerification(id);

  test("each terminal merge updates the one cumulative PR; fake-agent tests are skipped, not passed", async () => {
    const env = runnerFor("open");
    addAgent(env, "a", true);
    addAgent(env, "b", true);

    await verify(env, "a"); // verification -> merge -> changelog -> push -> PR
    expect(env.fake.prs).toHaveLength(1);
    await verify(env, "b");
    expect(env.fake.prs).toHaveLength(1);

    const editCalls = env.fake.ghCalls().filter((c) => c.args[0] === "pr" && c.args[1] === "edit");
    expect(editCalls).toHaveLength(1);
    const body = env.fake.prs[0]!.body;
    expect(body).toContain("`a`");
    expect(body).toContain("`b`");
    expect(body).toContain("`CHANGELOG.md`");
    for (const id of ["a", "b"]) {
      const cell = unitTestCell(body, id);
      expect(cell.startsWith("skipped")).toBe(true);
      expect(cell).not.toContain("passed");
    }
    expect(git(fx.remote, "rev-parse", "integration")).toBe(git(fx.repo, "rev-parse", "integration"));
    expect(git(fx.repo, "show", "integration:CHANGELOG.md").match(/wombo-combo:operation:/g)).toHaveLength(2);
  }, 90_000);

  test("skip mode in the daemon: changelog commit only, nothing pushed, no gh", async () => {
    const env = runnerFor("skip");
    addAgent(env, "a", true);
    await verify(env, "a");
    expect(env.state.getAgent("a")!.status).toBe("merged");
    expect(env.fake.ghCalls()).toEqual([]);
    expect(gitRaw(fx.remote, "rev-parse", "--verify", "--quiet", "refs/heads/integration").status).not.toBe(0);
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain("**a**");
  }, 60_000);

  test("CLI and daemon share the operation journal format (same marker scheme)", async () => {
    const env = runnerFor("skip");
    addAgent(env, "a", true);
    await verify(env, "a");
    const journal = JSON.parse(readFileSync(join(fx.repo, ".wombo-combo", "post-merge.json"), "utf-8"));
    const ids = Object.keys(journal.operations);
    expect(ids).toHaveLength(1);
    expect(git(fx.repo, "show", "integration:CHANGELOG.md")).toContain(operationMarker(ids[0]!));
  }, 60_000);
});
