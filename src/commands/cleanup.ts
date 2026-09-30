/**
 * cleanup.ts — Remove all session-related resources.
 *
 * Usage: woco cleanup
 *
 * Stops the daemon if running, removes worktrees, removes daemon session
 * state (daemon-state.json, daemon.pid), legacy wave state and log files.
 *
 * NOTE: .wombo-combo/history/ is intentionally NOT removed by cleanup.
 * Session history records are meant to survive cleanup for retrospective
 * analysis. See src/lib/history.ts.
 *
 * ## Process Lifecycle
 *
 * Cleanup stops the daemon via `stopDaemon()` (SIGTERM, then SIGKILL) if a
 * daemon is running for this project. Daemon agents are headless child
 * processes of the daemon, so they die with it.
 */

import { existsSync, unlinkSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { WomboConfig } from "../config";
import { WOMBO_DIR } from "../config";
import { cleanupAllWorktrees, listWomboWorktrees, worktreesDir, isWorktreesDirEmpty } from "../lib/worktree";
import { output, type OutputFormat } from "../lib/output";
import { renderCleanup } from "../lib/toon";

export interface CleanupOptions {
  projectRoot: string;
  config: WomboConfig;
  dryRun?: boolean;
  outputFmt?: OutputFormat;
}

export async function cmdCleanup(opts: CleanupOptions): Promise<void> {
  const { projectRoot, config } = opts;
  const fmt = opts.outputFmt ?? "text";

  const daemonStatePath = resolve(projectRoot, WOMBO_DIR, "daemon-state.json");
  const daemonPidPath = resolve(projectRoot, WOMBO_DIR, "daemon.pid");

  // Dry-run: show what would be cleaned up without doing it
  if (opts.dryRun) {
    // List worktrees that would be removed (using safe filtering)
    let matchingWorktrees: { path: string }[] = [];
    try {
      matchingWorktrees = listWomboWorktrees(projectRoot, config);
    } catch {
      // no worktrees
    }

    const statePath = resolve(projectRoot, WOMBO_DIR, "state.json");
    const logDir = resolve(projectRoot, WOMBO_DIR, "logs");
    const filesToRemove: string[] = [];
    if (existsSync(daemonStatePath)) filesToRemove.push(".wombo-combo/daemon-state.json");
    if (existsSync(daemonPidPath)) filesToRemove.push(".wombo-combo/daemon.pid");
    if (existsSync(statePath)) filesToRemove.push(".wombo-combo/state.json");
    if (existsSync(logDir)) filesToRemove.push(".wombo-combo/logs/");

    const dryRunResult = {
      dry_run: true,
      worktrees: matchingWorktrees.map((wt) => wt.path),
      worktrees_count: matchingWorktrees.length,
      worktrees_dir: worktreesDir(projectRoot),
      files_to_remove: filesToRemove,
    };

    output(fmt, dryRunResult, () => {
      console.log("\n[dry-run] Would perform the following cleanup:\n");
      console.log(`  worktrees to remove: ${matchingWorktrees.length}`);
      for (const wt of matchingWorktrees) {
        console.log(`    ${wt.path}`);
      }
      console.log(`  worktrees dir: ${worktreesDir(projectRoot)}`);
      for (const f of filesToRemove) {
        console.log(`  Would remove: ${f}`);
      }
      if (existsSync(daemonPidPath)) {
        console.log("  Would stop the daemon if running");
      }
    }, () => {
      console.log(renderCleanup(dryRunResult));
    });

    return;
  }

  // Stop the daemon if running (best effort — cleanup continues on failure)
  let daemonStopped = false;
  try {
    const { getDaemonStatus, stopDaemon } = await import("../daemon/launcher");
    if (getDaemonStatus(projectRoot).running) {
      stopDaemon(projectRoot);
      daemonStopped = true;
    }
  } catch {
    // daemon module unavailable or stop failed — nothing more to do
  }

  // Remove worktrees
  const removed = cleanupAllWorktrees(projectRoot, config);

  // List remaining feature branches
  let remainingBranches: string[] = [];
  try {
    const branchPattern = `"${config.git.branchPrefix}*"`;
    const branchesRaw = execSync(`git branch --list ${branchPattern}`, {
      cwd: projectRoot,
      encoding: "utf-8",
    }).trim();
    if (branchesRaw) {
      remainingBranches = branchesRaw.split("\n").map((b) => b.trim());
    }
  } catch {}

  // Remove daemon session artifacts
  const daemonStateRemoved = existsSync(daemonStatePath);
  if (daemonStateRemoved) {
    unlinkSync(daemonStatePath);
  }
  const daemonPidRemoved = existsSync(daemonPidPath);
  if (daemonPidRemoved) {
    unlinkSync(daemonPidPath);
  }

  // Remove legacy wave state file (pre-daemon leftovers)
  const statePath = resolve(projectRoot, WOMBO_DIR, "state.json");
  const stateRemoved = existsSync(statePath);
  if (stateRemoved) {
    unlinkSync(statePath);
  }

  // Remove log directory
  const logDir = resolve(projectRoot, WOMBO_DIR, "logs");
  const logsRemoved = existsSync(logDir);
  if (logsRemoved) {
    rmSync(logDir, { recursive: true, force: true });
  }

  // Check if history is preserved
  const historyDir = resolve(projectRoot, WOMBO_DIR, "history");
  const historyPreserved = existsSync(historyDir);

  // Check if the worktrees directory is now empty (completion double-check)
  const wtDirEmpty = isWorktreesDirEmpty(projectRoot);
  const wtDirPath = worktreesDir(projectRoot);

  const result = {
    daemon_stopped: daemonStopped,
    worktrees_removed: removed,
    worktrees_dir: wtDirPath,
    worktrees_dir_empty: wtDirEmpty,
    daemon_state_removed: daemonStateRemoved,
    daemon_pid_removed: daemonPidRemoved,
    state_removed: stateRemoved,
    logs_removed: logsRemoved,
    remaining_branches: remainingBranches,
    history_preserved: historyPreserved,
  };

  output(fmt, result, () => {
    console.log("\n--- wombo-combo: Cleanup ---\n");
    if (daemonStopped) {
      console.log("Stopped daemon");
    }
    console.log(`Removed ${removed} worktree(s)`);

    if (wtDirEmpty) {
      console.log(`Worktrees directory is clean: ${wtDirPath}`);
    } else {
      console.log(`\x1b[33mWorktrees directory still has contents:\x1b[0m ${wtDirPath}`);
    }

    if (remainingBranches.length > 0) {
      console.log(`\nRemaining feature branches:\n${remainingBranches.map((b) => `  ${b}`).join("\n")}`);
      console.log('Use "git branch -D <branch>" to remove manually.');
    }

    if (daemonStateRemoved) console.log("Removed .wombo-combo/daemon-state.json");
    if (daemonPidRemoved) console.log("Removed .wombo-combo/daemon.pid");
    if (stateRemoved) console.log("Removed .wombo-combo/state.json");
    if (logsRemoved) console.log("Removed .wombo-combo/logs/");

    console.log("\nCleanup complete.");

    if (historyPreserved) {
      console.log("Note: .wombo-combo/history/ is preserved. Use 'woco history' to view past sessions.");
    }
  }, () => {
    console.log(renderCleanup(result));
  });
}
