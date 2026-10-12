/**
 * daemon-agent-runner-review.test.ts — Review gate wiring in AgentRunner:
 * disabled (no change), pass, blocking then fixed, blocking exhausted,
 * unparseable reviewer output and harness errors.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState, createDaemonAgentState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { DEFAULT_CONFIG, type ReviewConfig, type WomboConfig } from "../src/config";
import { createBlankTask, saveTaskToStore } from "../src/lib/tasks";
import { listComments } from "../src/lib/comments";
import type { ReviewerOutput } from "../src/lib/review-runner";
import { git, commitAll, makeRepo, writeRepoFile } from "./helpers/git-repo";
import { useHermeticGitEnv } from "./helpers/post-merge-fixture";

let restoreEnv: () => void;
beforeAll(() => { restoreEnv = useHermeticGitEnv().restore; });
afterAll(() => restoreEnv());

const dirs: string[] = [];
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

const blockingJson = (msg = "wrong") =>
  JSON.stringify({ findings: [{ axis: "spec", severity: "blocking", file: "src/a.ts", line: 3, message: msg }] });

interface Env {
  runner: AgentRunner;
  state: DaemonState;
  repo: string;
  worktree: string;
  prompts: string[];
  merges: string[];
  statuses: string[];
  logs: string[];
  fix(n: number): void;
}

function setup(review: Partial<ReviewConfig> | undefined, outputs: ReviewerOutput[]): Env {
  const repo = makeRepo("main");
  dirs.push(repo);
  const worktree = mkdtempSync(join(tmpdir(), "wombo-review-wt-"));
  dirs.push(worktree);
  git(repo, "worktree", "add", "-q", "-b", "feature/t1", worktree, "main");
  writeRepoFile(worktree, "src/a.ts", "export const a = 1;\n");
  commitAll(worktree, "feat: a");

  const config = {
    ...DEFAULT_CONFIG,
    baseBranch: "main",
    build: { command: "true", timeout: 60000, maxRetries: 1 },
    tdd: { enabled: false },
    ...(review ? { review: { ...DEFAULT_CONFIG.review!, ...review } } : {}),
  } as WomboConfig;
  if (!review) delete (config as any).review;

  const task = createBlankTask("t1", "Task t1");
  task.status = "in_progress";
  task.description = "Add a.";
  saveTaskToStore(repo, config, task);

  const state = new DaemonState(repo);
  const agent = createDaemonAgentState({ featureId: "t1", taskTitle: "Task t1", branch: "feature/t1", baseBranch: "main", worktree });
  agent.status = "completed";
  state.addAgent(agent);

  const env = { prompts: [] as string[], merges: [] as string[], statuses: [] as string[], logs: [] as string[] };
  state.subscribe((type, payload: any) => {
    if (type === "evt:agent-status-change") env.statuses.push(payload.newStatus);
    if (type === "evt:log") env.logs.push(payload.message);
  });
  let call = 0;
  const runner = new AgentRunner(
    {
      projectRoot: repo,
      config,
      overrides: {
        runReviewer: async (prompt) => {
          env.prompts.push(prompt);
          return outputs[Math.min(call++, outputs.length - 1)];
        },
      },
    },
    state,
  );
  (runner as any).attemptMerge = async (id: string) => { env.merges.push(id); };
  return {
    runner, state, repo, worktree, ...env,
    fix(n) { writeRepoFile(worktree, `src/fix${n}.ts`, `export const f${n} = ${n};\n`); commitAll(worktree, `fix: ${n}`); },
  };
}

const verify = (e: Env) => (e.runner as any).handleBuildVerification("t1") as Promise<void>;
const reviewComments = (e: Env) => listComments(e.repo, { kind: "task", id: "t1" }).filter((c) => c.author === "reviewer");

describe("AgentRunner review gate", () => {
  test("disabled: reviewer never runs, no comments, no in_review status", async () => {
    const e = setup(undefined, [{ ok: true, text: blockingJson() }]);
    await verify(e);
    expect(e.prompts).toHaveLength(0);
    expect(e.statuses).not.toContain("in_review");
    expect(e.state.getAgent("t1")!.status).toBe("verified");
    expect(e.merges).toEqual(["t1"]);
    expect(listComments(e.repo, { kind: "task", id: "t1" })).toHaveLength(0);
  });

  test("explicitly disabled behaves like absent", async () => {
    const e = setup({ enabled: false }, [{ ok: true, text: blockingJson() }]);
    await verify(e);
    expect(e.prompts).toHaveLength(0);
    expect(e.merges).toEqual(["t1"]);
  });

  test("pass: in_review then verified, merge proceeds, findings below the threshold are commented", async () => {
    const minor = JSON.stringify({ findings: [{ axis: "standards", severity: "minor", file: "src/a.ts", message: "naming" }] });
    const e = setup({ enabled: true }, [{ ok: true, text: minor }]);
    await verify(e);
    expect(e.statuses).toEqual(expect.arrayContaining(["in_review", "verified"]));
    expect(e.statuses.indexOf("in_review")).toBeLessThan(e.statuses.indexOf("verified"));
    expect(e.merges).toEqual(["t1"]);
    expect(e.prompts[0]).toContain("export const a = 1;");
    const c = reviewComments(e);
    expect(c).toHaveLength(1);
    expect(c[0].body).toBe("minor standards src/a.ts naming");
    expect(c[0].role).toBe("agent");
  });

  test("blocking then fixed: sent back with the findings, re-reviewed, then merged", async () => {
    const e = setup({ enabled: true, maxRounds: 2 }, [
      { ok: true, text: blockingJson("handle empty input") },
      { ok: true, text: JSON.stringify({ findings: [] }) },
    ]);
    await verify(e);
    expect(e.merges).toHaveLength(0);
    expect(e.state.getAgent("t1")!.status).toBe("queued"); // no session: re-queued for a fresh launch
    expect(e.state.getAgent("t1")!.error).toContain("handle empty input");
    expect(e.state.getAgent("t1")!.retries).toBe(0);

    e.fix(1);
    await verify(e);
    expect(e.prompts).toHaveLength(2);
    expect(e.prompts[1]).toContain("fix1.ts");
    expect(e.state.getAgent("t1")!.status).toBe("verified");
    expect(e.merges).toEqual(["t1"]);
  });

  test("blocking exhausted: fails with a clear reason and a summary comment", async () => {
    const e = setup({ enabled: true, maxRounds: 2 }, [{ ok: true, text: blockingJson() }]);
    await verify(e);
    e.fix(1);
    await verify(e);
    const agent = e.state.getAgent("t1")!;
    expect(agent.status).toBe("failed");
    expect(agent.error).toContain("Review blocked after 2 round(s)");
    expect(e.merges).toHaveLength(0);
    const all = listComments(e.repo, { kind: "task", id: "t1" });
    expect(all.some((c) => c.author === "woco" && c.body.includes("Review blocked after 2 round(s)"))).toBe(true);
    expect(reviewComments(e)).toHaveLength(2);
  });

  test("unparseable reviewer output: warning comment and the task still merges", async () => {
    const e = setup({ enabled: true }, [{ ok: true, text: "I could not produce JSON, sorry" }]);
    await verify(e);
    expect(e.state.getAgent("t1")!.status).toBe("verified");
    expect(e.merges).toEqual(["t1"]);
    const c = reviewComments(e);
    expect(c).toHaveLength(1);
    expect(c[0].body).toContain("could not be parsed");
  });

  test("harness error after retries fails the run with the reason", async () => {
    const e = setup({ enabled: true }, [{ ok: false, error: "profile review: binary not found" }]);
    await verify(e);
    const agent = e.state.getAgent("t1")!;
    expect(agent.status).toBe("failed");
    expect(agent.error).toContain("Review failed: profile review: binary not found");
    expect(e.merges).toHaveLength(0);
  });
});
