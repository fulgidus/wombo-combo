/**
 * merge.ts — Merge verified agents into their destination branch and publish.
 *
 * Usage: woco merge [--tasks a,b] [--dry-run] [--output json|toon]
 *
 * Reads the persisted daemon state (never talks to a live daemon), merges the
 * selected verified branches sequentially through the shared merge queue, marks
 * merged agents and their tasks done, and — after a completely successful batch —
 * runs the shared post-merge coordinator once (changelog + optional PR).
 *
 * Refuses to mutate while a daemon process is alive: the in-process merge queue
 * cannot protect against a separate process merging concurrently.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WOMBO_DIR, normalizePostMergeConfig, type WomboConfig } from "../config";
import { PID_FILE, type DaemonAgentState } from "../daemon/protocol";
import { DaemonState, type InternalAgentState } from "../daemon/state";
import { enqueueMerge, mergeBranch as realMergeBranch } from "../lib/merger";
import { output, outputError, type OutputFormat } from "../lib/output";
import {
  computeOperationId,
  resumeIncompleteOperations as realResume,
  runPostMerge as realRunPostMerge,
  type PostMergeDeps,
} from "../lib/post-merge";
import type {
  MergeReportTask,
  PostMergeResult,
  VerificationSummary,
} from "../lib/post-merge-types";
import { loadFeatures, saveTaskToStore, type Feature } from "../lib/tasks";
import { removeWorktree as realRemoveWorktree } from "../lib/worktree";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MergeCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  /** Explicit task IDs; otherwise every verified, non-deferred agent */
  tasks?: string[];
  dryRun?: boolean;
  outputFmt?: OutputFormat;
}

/** Injection points (tests replace network/process-bound pieces) */
export interface MergeCommandDeps {
  isDaemonAlive?: (projectRoot: string) => { running: boolean; pid?: number };
  mergeBranch?: typeof realMergeBranch;
  runPostMerge?: typeof realRunPostMerge;
  resumeIncomplete?: typeof realResume;
  removeWorktree?: typeof realRemoveWorktree;
  postMergeDeps?: PostMergeDeps;
}

export interface SelectedAgentInfo {
  feature_id: string;
  title: string;
  branch: string;
  base_branch: string;
  verification: VerificationSummary;
  already_merged?: boolean;
  branch_missing?: boolean;
  merges_chain: string[];
}

export interface MergeCommandResult {
  dry_run: boolean;
  destination: string | null;
  selected: SelectedAgentInfo[];
  merged: Array<{ feature_id: string; branch: string; commit_hash: string | null; via?: string }>;
  already_merged: string[];
  failed: Array<{ feature_id: string; error: string }>;
  publication: PostMergeResult | null;
  /** Operations from earlier runs whose publication was retried */
  resumed: PostMergeResult[];
  plan: { pr_mode: string; pr_base_branch: string | null; changelog: boolean };
  warnings: string[];
  message?: string;
}

/** A refusal that should abort the command with an explanation (exit code 1). */
export class MergeCommandError extends Error {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read-only daemon liveness check (never removes stale PID files). */
export function defaultIsDaemonAlive(projectRoot: string): { running: boolean; pid?: number } {
  const pidPath = resolve(projectRoot, WOMBO_DIR, PID_FILE);
  if (!existsSync(pidPath)) return { running: false };
  try {
    const pid = parseInt(readFileSync(pidPath, "utf-8").trim(), 10);
    if (Number.isNaN(pid)) return { running: false };
    process.kill(pid, 0);
    return { running: true, pid };
  } catch {
    return { running: false };
  }
}

function git(projectRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitOk(projectRoot: string, args: string[]): boolean {
  try {
    execFileSync("git", args, { cwd: projectRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function branchExists(projectRoot: string, branch: string): boolean {
  return gitOk(projectRoot, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}^{commit}`]);
}

function isAncestor(projectRoot: string, branch: string, base: string): boolean {
  return gitOk(projectRoot, ["merge-base", "--is-ancestor", `refs/heads/${branch}`, `refs/heads/${base}`]);
}

/** Persisted evidence; absent test evidence is "unknown", never "passed". */
export function evidenceFor(agent: DaemonAgentState): VerificationSummary {
  if (agent.verification) return agent.verification;
  const b = agent.buildPassed;
  return { build: { status: b === true ? "passed" : b === false ? "failed" : "unknown" } };
}

function agentsById(state: DaemonState): Map<string, InternalAgentState> {
  return new Map(state.getAllAgents().map((a) => [a.featureId, a]));
}

/** Deferred chain predecessor: its terminal member merges it. */
function isDeferredPredecessor(agent: InternalAgentState, byId: Map<string, InternalAgentState>): boolean {
  if (agent.hasChainSuccessor === true) return true;
  return agent.dependedOnBy.some((id) => {
    const d = byId.get(id);
    return !!d && d.worktree === agent.worktree;
  });
}

/** Chain predecessors sharing this agent's worktree (mirrors the daemon). */
function chainPredecessors(agent: InternalAgentState, byId: Map<string, InternalAgentState>): InternalAgentState[] {
  const preds: InternalAgentState[] = [];
  let current: InternalAgentState | undefined = agent;
  while (current && current.dependsOn.length > 0) {
    const pred = byId.get(current.dependsOn[0]!);
    if (!pred || pred.worktree !== agent.worktree) break;
    preds.push(pred);
    current = pred;
  }
  return preds;
}

/** Route console.log to stderr so machine-readable stdout stays valid. */
async function withDiagnosticsOnStderr<T>(fmt: OutputFormat, fn: () => Promise<T>): Promise<T> {
  if (fmt === "text") return fn();
  const original = { log: console.log, info: console.info };
  console.log = (...a: unknown[]) => console.error(...a);
  console.info = (...a: unknown[]) => console.error(...a);
  try {
    return await fn();
  } finally {
    console.log = original.log;
    console.info = original.info;
  }
}

function markTaskDone(projectRoot: string, config: WomboConfig, featureId: string): void {
  try {
    const data = loadFeatures(projectRoot, config);
    const feature = data.tasks.find((f: Feature) => f.id === featureId);
    if (feature && feature.status !== "done") {
      feature.status = "done";
      feature.completion = 100;
      feature.ended_at = new Date().toISOString();
      saveTaskToStore(projectRoot, config, feature);
    }
  } catch {
    // Non-fatal: the merge itself already succeeded
  }
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

function selectAgents(
  state: DaemonState,
  requested: string[] | undefined
): InternalAgentState[] {
  const byId = agentsById(state);

  let selected: InternalAgentState[];
  if (requested && requested.length > 0) {
    selected = [];
    for (const id of requested) {
      const agent = byId.get(id);
      if (!agent) {
        throw new MergeCommandError(`No persisted agent found for task "${id}". Run \`woco status\` to list agents.`);
      }
      if (agent.status !== "verified") {
        throw new MergeCommandError(
          `Task "${id}" is not verified (status: ${agent.status}). Only verified agents can be merged.`
        );
      }
      if (isDeferredPredecessor(agent, byId)) {
        throw new MergeCommandError(
          `Task "${id}" is a deferred chain predecessor; it is merged together with the chain's terminal task. Select the terminal task instead.`
        );
      }
      selected.push(agent);
    }
  } else {
    selected = state
      .getAllAgents()
      .filter((a) => a.status === "verified" && !isDeferredPredecessor(a, byId));
  }

  const destinations = [...new Set(selected.map((a) => a.baseBranch))];
  if (destinations.length > 1) {
    throw new MergeCommandError(
      `Selected agents target different destination branches (${destinations.join(", ")}). ` +
        `Merge them separately with --tasks so each batch has one destination.`
    );
  }

  return selected.sort((a, b) => {
    const ka = `${a.completedAt ?? ""}\0${a.featureId}`;
    const kb = `${b.completedAt ?? ""}\0${b.featureId}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export async function runMerge(
  opts: MergeCommandOptions,
  deps: MergeCommandDeps = {}
): Promise<MergeCommandResult> {
  const { projectRoot, config } = opts;
  const fmt = opts.outputFmt ?? "text";
  const pm = normalizePostMergeConfig(config.postMerge);
  const result: MergeCommandResult = {
    dry_run: !!opts.dryRun,
    destination: null,
    selected: [],
    merged: [],
    already_merged: [],
    failed: [],
    publication: null,
    resumed: [],
    plan: { pr_mode: pm.prMode, pr_base_branch: pm.prBaseBranch, changelog: pm.changelog },
    warnings: [],
  };

  // Refuse to mutate while a daemon could be merging concurrently
  const daemon = (deps.isDaemonAlive ?? defaultIsDaemonAlive)(projectRoot);
  if (daemon.running) {
    const detail =
      `A wombo daemon is running (pid ${daemon.pid ?? "unknown"}) and may merge concurrently; ` +
      `the in-process merge queue cannot protect against a separate process.`;
    if (!opts.dryRun) {
      throw new MergeCommandError(
        `${detail}\nStop it first with \`woco daemon stop\` (or wait for it to finish), then re-run \`woco merge\`. ` +
          `The daemon already publishes after its own merges.`
      );
    }
    result.warnings.push(`${detail} Selection below may be stale.`);
  }

  const state = new DaemonState(projectRoot);
  state.load();
  if (!state.stateLoaded) {
    result.message = "No daemon state found; nothing to merge.";
  }

  const selected = state.stateLoaded ? selectAgents(state, opts.tasks) : [];
  const byId = agentsById(state);
  const destination = selected[0]?.baseBranch ?? null;
  result.destination = destination;

  // Describe the selection (also the dry-run plan)
  for (const agent of selected) {
    const preds = chainPredecessors(agent, byId).filter((p) => p.status === "verified");
    const info: SelectedAgentInfo = {
      feature_id: agent.featureId,
      title: agent.taskTitle,
      branch: agent.branch,
      base_branch: agent.baseBranch,
      verification: evidenceFor(agent),
      merges_chain: preds.map((p) => p.featureId),
    };
    if (!branchExists(projectRoot, agent.branch)) info.branch_missing = true;
    else if (branchExists(projectRoot, agent.baseBranch) && isAncestor(projectRoot, agent.branch, agent.baseBranch)) {
      info.already_merged = true;
    }
    result.selected.push(info);
  }

  if (selected.length === 0) {
    result.message ??= "No verified agents to merge.";
    if (!opts.dryRun && state.stateLoaded) {
      // Recovery: retry interrupted publication from the runtime journal
      result.resumed = await (deps.resumeIncomplete ?? realResume)(projectRoot, config, deps.postMergeDeps);
    }
    return result;
  }

  if (opts.dryRun) {
    result.message = `Would merge ${selected.length} agent(s) into ${destination}.`;
    return result;
  }

  // ---- real run --------------------------------------------------------
  const doMerge = deps.mergeBranch ?? realMergeBranch;
  const removeWt = deps.removeWorktree ?? realRemoveWorktree;
  const reportTasks: MergeReportTask[] = [];
  let batchBefore: string | null = null;
  let batchAfter: string | null = null;
  let realMerges = 0;

  await withDiagnosticsOnStderr(fmt, async () => {
    for (const info of result.selected) {
      const agent = state.getAgent(info.feature_id)!;
      try {
        await enqueueMerge(async () => {
          if (info.branch_missing || !branchExists(projectRoot, agent.branch)) {
            result.failed.push({ feature_id: agent.featureId, error: `Branch ${agent.branch} does not exist.` });
            return;
          }
          if (!branchExists(projectRoot, agent.baseBranch)) {
            result.failed.push({ feature_id: agent.featureId, error: `Destination branch ${agent.baseBranch} does not exist.` });
            return;
          }

          // Evidence is captured before any cleanup deletes branches/worktrees
          const preds = chainPredecessors(agent, byId).filter((p) => p.status === "verified");
          const evidence: MergeReportTask[] = [
            { id: agent.featureId, title: agent.taskTitle, verification: evidenceFor(agent) },
            ...preds.map((p) => ({ id: p.featureId, title: p.taskTitle, verification: evidenceFor(p) })),
          ];

          // Already contained in the destination: record it, never republish it
          if (isAncestor(projectRoot, agent.branch, agent.baseBranch)) {
            finishAgent(agent, null);
            result.already_merged.push(agent.featureId);
            return;
          }

          const before = git(projectRoot, ["rev-parse", `refs/heads/${agent.baseBranch}`]);
          const merge = await doMerge(projectRoot, agent.branch, agent.baseBranch, config);
          if (!merge.success) {
            result.failed.push({ feature_id: agent.featureId, error: merge.error ?? "merge failed" });
            return;
          }
          batchBefore ??= before;
          batchAfter = git(projectRoot, ["rev-parse", `refs/heads/${agent.baseBranch}`]);
          realMerges++;
          reportTasks.push(...evidence);
          result.merged.push({ feature_id: agent.featureId, branch: agent.branch, commit_hash: merge.commitHash });
          for (const p of preds) {
            result.merged.push({
              feature_id: p.featureId,
              branch: p.branch,
              commit_hash: merge.commitHash,
              via: agent.featureId,
            });
          }
          finishAgent(agent, merge.commitHash, preds);
        });
      } catch (err: any) {
        result.failed.push({ feature_id: info.feature_id, error: String(err?.message ?? err) });
      }
    }

    /** Mark merged, mark tasks done, promote chain predecessors, clean up. */
    function finishAgent(
      agent: InternalAgentState,
      commitHash: string | null,
      preds: InternalAgentState[] = []
    ): void {
      state.updateAgentStatus(
        agent.featureId,
        "merged",
        commitHash ? `MERGED (${commitHash.slice(0, 7)})` : "MERGED (already in destination)"
      );
      state.updateAgent(agent.featureId, {
        completedAt: new Date().toISOString(),
        mergeCommitHash: commitHash,
      });
      markTaskDone(projectRoot, config, agent.featureId);

      for (const p of preds) {
        state.updateAgentStatus(p.featureId, "merged", `MERGED (via chain terminal ${agent.featureId})`);
        state.updateAgent(p.featureId, { completedAt: new Date().toISOString(), mergeCommitHash: commitHash });
        markTaskDone(projectRoot, config, p.featureId);
        try {
          execFileSync("git", ["branch", "-D", p.branch], { cwd: projectRoot, stdio: "ignore" });
        } catch {
          // Branch may already be gone
        }
      }

      try {
        removeWt({ projectRoot, wtPath: agent.worktree, deleteBranch: true });
      } catch {
        // Stale worktrees are not fatal
      }
      state.flush();
    }
  });
  state.destroy();

  // Publish once, only for a completely successful batch that changed something
  if (result.failed.length > 0) {
    result.warnings.push(
      `${result.failed.length} merge(s) failed; publication skipped for this incomplete batch. ` +
        `Successful merges (${result.merged.length}) are kept.`
    );
  } else if (realMerges > 0 && batchBefore && batchAfter && destination) {
    const operation = {
      operationId: computeOperationId(destination, batchBefore, batchAfter),
      destinationBranch: destination,
      beforeSha: batchBefore,
      afterSha: batchAfter,
      tasks: reportTasks,
    };
    result.publication = await withDiagnosticsOnStderr(fmt, () =>
      enqueueMerge(() =>
        (deps.runPostMerge ?? realRunPostMerge)(
          { projectRoot, config, operation, mergeSucceeded: true },
          deps.postMergeDeps
        )
      )
    );
    result.warnings.push(...result.publication.warnings);
  }

  result.message =
    result.failed.length > 0
      ? `Merged ${result.merged.length}, failed ${result.failed.length}.`
      : `Merged ${result.merged.length} agent(s)` +
        (result.already_merged.length ? `, ${result.already_merged.length} already in ${destination}.` : ".");
  return result;
}

// ---------------------------------------------------------------------------
// CLI wrapper
// ---------------------------------------------------------------------------

function renderText(r: MergeCommandResult): void {
  console.log(r.dry_run ? "\n[dry-run] woco merge" : "\nwoco merge");
  if (r.destination) console.log(`  Destination: ${r.destination}`);
  for (const s of r.selected) {
    const flags = [
      s.already_merged ? "already merged" : "",
      s.branch_missing ? "branch missing" : "",
      s.merges_chain.length ? `includes chain: ${s.merges_chain.join(", ")}` : "",
    ].filter(Boolean);
    console.log(`  ${r.dry_run ? "would merge" : "selected"}: ${s.feature_id} — ${s.title} (${s.branch})${flags.length ? ` [${flags.join("; ")}]` : ""}`);
  }
  if (r.dry_run) {
    console.log(
      `  Publication: PR mode ${r.plan.pr_mode}` +
        (r.plan.pr_mode !== "skip" ? `, target ${r.plan.pr_base_branch ?? "(remote default branch)"}` : "") +
        `, changelog ${r.plan.changelog ? "on" : "off"}`
    );
  }
  for (const m of r.merged) console.log(`  merged: ${m.feature_id}${m.via ? ` (via ${m.via})` : ""}${m.commit_hash ? ` ${m.commit_hash.slice(0, 7)}` : ""}`);
  for (const id of r.already_merged) console.log(`  already in destination: ${id}`);
  for (const f of r.failed) console.log(`  FAILED: ${f.feature_id} — ${f.error}`);
  if (r.publication) {
    const p = r.publication;
    console.log(`  Changelog: ${p.changelog.status}${p.changelog.message ? ` — ${p.changelog.message}` : ""}`);
    console.log(`  Push: ${p.push.status}${p.push.message ? ` — ${p.push.message}` : ""}`);
    console.log(`  Pull request: ${p.pr.status}${p.pr.url ? ` ${p.pr.url}` : ""}${p.pr.message ? ` — ${p.pr.message}` : ""}`);
  }
  for (const p of r.resumed) {
    console.log(`  Resumed ${p.operationId}: push ${p.push.status}, PR ${p.pr.status}${p.pr.url ? ` ${p.pr.url}` : ""}`);
  }
  for (const w of r.warnings) console.log(`  Warning: ${w}`);
  if (r.message) console.log(`\n${r.message}`);
}

export async function cmdMerge(opts: MergeCommandOptions, deps: MergeCommandDeps = {}): Promise<void> {
  const fmt = opts.outputFmt ?? "text";
  let result: MergeCommandResult;
  try {
    result = await runMerge(opts, deps);
  } catch (err) {
    if (err instanceof MergeCommandError) {
      outputError(fmt, err.message);
      return; // unreachable
    }
    throw err;
  }
  output(fmt, result, () => renderText(result));
  if (result.failed.length > 0) process.exitCode = 1;
}
