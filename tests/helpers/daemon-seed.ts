/**
 * Seed persisted daemon state (verified agents + their task files + feature
 * branches) inside a post-merge fixture, the way the daemon leaves it behind.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DaemonState, createDaemonAgentState } from "../../src/daemon/state";
import { createBlankTask, saveTaskToStore } from "../../src/lib/tasks";
import type { VerificationSummary } from "../../src/lib/post-merge-types";
import { commitAll, git, writeRepoFile } from "./git-repo";
import type { PostMergeFixture } from "./post-merge-fixture";

export interface SeedSpec {
  id: string;
  title?: string;
  file?: string;
  content?: string;
  verification?: VerificationSummary;
}

/** Write .wombo-combo/config.json so the real CLI treats the repo as initialized. */
export function writeProjectConfig(fx: PostMergeFixture, postMerge: Record<string, unknown>): void {
  mkdirSync(join(fx.repo, ".wombo-combo"), { recursive: true });
  writeFileSync(
    join(fx.repo, ".wombo-combo", "config.json"),
    JSON.stringify({ baseBranch: "main", git: { remote: "origin" }, postMerge }, null, 2)
  );
}

/** Add verified agents (branches from the destination) to the persisted daemon state. */
export function seedVerifiedAgents(fx: PostMergeFixture, specs: SeedSpec[], cleanupDirs: string[] = []): void {
  const config = fx.config();
  const state = new DaemonState(fx.repo);
  state.load();
  for (const spec of specs) {
    const branch = `feature/${spec.id}`;
    const wt = mkdtempSync(join(tmpdir(), "wombo-seed-wt-"));
    cleanupDirs.push(wt);
    git(fx.repo, "worktree", "add", "-q", "-b", branch, wt, fx.destination);
    writeRepoFile(wt, spec.file ?? `src/${spec.id}.ts`, spec.content ?? `// ${spec.id}\n`);
    commitAll(wt, `feat: ${spec.id}`);
    git(fx.repo, "worktree", "remove", "--force", wt);

    const agent = createDaemonAgentState({
      featureId: spec.id,
      taskTitle: spec.title ?? `Task ${spec.id}`,
      branch,
      baseBranch: fx.destination,
      worktree: join(tmpdir(), `wombo-seed-nonexistent-${spec.id}`),
    });
    agent.status = "verified";
    agent.buildPassed = true;
    agent.completedAt = new Date(Date.now() + state.getAllAgents().length).toISOString();
    if (spec.verification) agent.verification = spec.verification;
    state.addAgent(agent);

    const task = createBlankTask(spec.id, spec.title ?? `Task ${spec.id}`);
    task.status = "in_progress";
    saveTaskToStore(fx.repo, config, task);
  }
  state.save();
  state.destroy();
}
