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
import { t } from "../lib/i18n";
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
      console.log(`\n${t("cli.cleanup.dryRunHeader")}\n`);
      console.log(`  ${t("cli.cleanup.dryRunWorktrees", { count: matchingWorktrees.length })}`);
      for (const wt of matchingWorktrees) {
        console.log(`    ${wt.path}`);
      }
      console.log(`  ${t("cli.cleanup.dryRunWorktreesDir", { path: worktreesDir(projectRoot) })}`);
      for (const f of filesToRemove) {
        console.log(`  ${t("cli.cleanup.dryRunRemove", { file: f })}`);
      }
      if (existsSync(daemonPidPath)) {
        console.log(`  ${t("cli.cleanup.dryRunStopDaemon")}`);
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
    console.log(`\n${t("cli.cleanup.title")}\n`);
    if (daemonStopped) {
      console.log(t("cli.cleanup.stoppedDaemon"));
    }
    console.log(t("cli.cleanup.removedWorktrees", { count: removed }));

    if (wtDirEmpty) {
      console.log(t("cli.cleanup.wtDirClean", { path: wtDirPath }));
    } else {
      console.log(`\x1b[33m${t("cli.cleanup.wtDirNotClean")}\x1b[0m ${wtDirPath}`);
    }

    if (remainingBranches.length > 0) {
      console.log(`\n${t("cli.cleanup.remainingBranches")}\n${remainingBranches.map((b) => `  ${b}`).join("\n")}`);
      console.log(t("cli.cleanup.branchHint"));
    }

    if (daemonStateRemoved) console.log(t("cli.cleanup.removed", { file: ".wombo-combo/daemon-state.json" }));
    if (daemonPidRemoved) console.log(t("cli.cleanup.removed", { file: ".wombo-combo/daemon.pid" }));
    if (stateRemoved) console.log(t("cli.cleanup.removed", { file: ".wombo-combo/state.json" }));
    if (logsRemoved) console.log(t("cli.cleanup.removed", { file: ".wombo-combo/logs/" }));

    console.log(`\n${t("cli.cleanup.complete")}`);

    if (historyPreserved) {
      console.log(t("cli.cleanup.historyPreserved"));
    }
  }, () => {
    console.log(renderCleanup(result));
  });
}
