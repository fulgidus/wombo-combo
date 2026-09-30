/**
 * launch.ts — Launch a wave of agents via the background daemon.
 *
 * Usage: woco launch [selection options] [launch options]
 *
 * This is the primary entry point for starting a new wave. It selects features
 * from the features file, validates dependencies, runs preflight checks, and
 * delegates execution to the background daemon (src/daemon/). All scheduling,
 * worktree management, verification, and merging happens inside the daemon —
 * this command only validates, configures, and monitors.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join as pathJoin } from "node:path";
import type { WomboConfig } from "../config";
import type { Feature, SelectionOptions, Priority, Difficulty } from "../lib/tasks";
import { loadFeatures, selectFeatures } from "../lib/tasks";
import { scopePartitions, formatScopePartitions } from "../lib/file-scopes";
import { branchExists, questBranchExists, createQuestBranch } from "../lib/worktree";
import type { QuestPromptContext } from "../lib/prompt";
import { syncQuestBranch } from "../lib/merger";
import { printFeatureSelection } from "../lib/ui";
import { ensureAgentDefinition } from "../lib/templates";
import {
  buildDepGraph,
  validateDepGraph,
  buildSchedulePlan,
  formatSchedulePlan,
  type SchedulePlan,
} from "../lib/dependency-graph";
import { ensureProxyRunning, isPortlessAvailable } from "../lib/portless";
import { output, outputError, outputMessage, type OutputFormat } from "../lib/output";
import { renderLaunchDryRun } from "../lib/toon";
import {
  prepareAgentDefinitions,
  isSpecializedAgent,
  type AgentResolution,
} from "../lib/agent-registry";
import { loadQuest, loadQuestKnowledge } from "../lib/quest-store";
import { resolveQuestConfig, applyQuestConstraintsToTask } from "../lib/quest";
// Daemon delegation — types only (runtime imports are dynamic to avoid
// pulling ink's top-level await into the synchronous require() chain
// used by schema.ts / citty-registry.ts).
import type { DaemonClient } from "../daemon/client";
import type { SchedulerStatus } from "../daemon/protocol";

/**
 * Delegate the launch to the background daemon. This is the only execution
 * path — there is no inline fallback. Throws if the daemon cannot be started
 * or rejects the work.
 *
 * The function:
 *  1. Ensures the daemon process is running (auto-starts if needed)
 *  2. Connects a DaemonClient
 *  3. Sends cmd:start with task IDs / quest / concurrency / model / overrides
 *  4a. TUI mode (!noTui && !noUi): opens InkDaemonTUI and waits for user quit
 *  4b. Headless mode (noTui): polls daemon state until scheduler goes idle
 *  5. Disconnects the client
 */
async function delegateToDaemon(
  projectRoot: string,
  opts: LaunchCommandOptions,
  taskIds: string[],
  fmt: OutputFormat,
): Promise<void> {
  // Dynamic imports to avoid pulling ink's top-level await into the
  // synchronous require() chain (schema.ts → citty-registry → launch.ts).
  const { ensureDaemonRunning } = await import("../daemon/launcher");
  const { DaemonClient: DaemonClientImpl } = await import("../daemon/client");

  // Step 1: ensure daemon is running
  await ensureDaemonRunning(projectRoot);

  // Step 2: connect
  const client = new DaemonClientImpl({ clientId: "launch", autoReconnect: false });
  try {
    await client.connect();

    // Step 3: send cmd:start
    if (fmt === "text") {
      console.log(`Delegating ${taskIds.length} task(s) to daemon...`);
    }
    client.start({
      questId: opts.questId ?? undefined,
      maxConcurrent: opts.maxConcurrent,
      model: opts.model,
      taskIds,
      agentOverride: opts.agent,
      autoPush: opts.autoPush,
      maxRetries: opts.maxRetries,
      baseBranch: opts.baseBranch,
    });

    // Step 4: wait for work to finish (or user to quit)
    if (!opts.noUi && !opts.noTui) {
      // TUI mode — open the daemon monitor
      const { InkDaemonTUI } = await import("../ink/run-daemon-monitor");
      if (fmt === "text") console.log("Launching daemon monitor TUI...\n");
      const daemonTui = new InkDaemonTUI({
        client,
        projectRoot,
        config: opts.config,
        onQuit: () => {
          // User pressed Q — daemon keeps running, we just detach
        },
      });
      daemonTui.start();
      await daemonTui.waitForQuit();
      daemonTui.stop();
    } else {
      // Headless mode — poll until scheduler goes idle / all agents done
      if (fmt === "text") console.log("Daemon accepted. Waiting for completion (headless)...\n");
      await waitForDaemonCompletion(client, fmt);
    }
  } finally {
    try { client.disconnect(); } catch { /* best-effort */ }
  }
}

/**
 * Block until the daemon scheduler finishes all work (goes "idle") or
 * encounters a terminal state (stopping/shutdown). Prints a periodic
 * status line in text mode. Exported for resume.ts.
 */
export async function waitForDaemonCompletion(
  client: DaemonClient,
  fmt: OutputFormat,
): Promise<void> {
  const POLL_MS = 5_000;
  const DASHBOARD_INTERVAL = 3; // Print dashboard every N polls (15s)
  let polls = 0;
  let stateFailures = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    polls++;

    let snapshot;
    try {
      snapshot = await client.requestState(5_000);
      stateFailures = 0;
    } catch {
      // Transient failures happen when the daemon's event loop is busy
      // (synchronous git/install work). Only give up after several
      // consecutive failures — the daemon is really gone then.
      stateFailures++;
      if (stateFailures >= 3) {
        throw new Error("Daemon stopped responding");
      }
      continue;
    }

    const { scheduler, agents } = snapshot;
    const active = agents.filter((a) =>
      a.status === "running" || a.status === "installing" ||
      a.status === "resolving_conflict" || a.status === "retry"
    );
    const queued = agents.filter((a) => a.status === "queued");
    const done = agents.filter((a) =>
      a.status === "completed" || a.status === "verified" ||
      a.status === "merged" || a.status === "failed"
    );

    // Print periodic status in text/headless mode
    if (fmt === "text" && polls % DASHBOARD_INTERVAL === 0) {
      console.log(
        `[daemon] ${active.length} active, ${queued.length} queued, ` +
        `${done.length} done — scheduler: ${scheduler.status}`
      );
    }

    // Terminal conditions
    const terminalStatuses: SchedulerStatus[] = ["idle", "stopping", "draining", "shutdown"];
    if (terminalStatuses.includes(scheduler.status) && active.length === 0 && queued.length === 0) {
      if (fmt === "text") {
        const passed = agents.filter((a) => a.status === "merged" || a.status === "verified").length;
        const failed = agents.filter((a) => a.status === "failed").length;
        console.log(`\nDaemon completed: ${passed} succeeded, ${failed} failed out of ${agents.length} total.`);
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Barrel File Detection — pre-flight check for conflict-prone files
// ---------------------------------------------------------------------------

/** A barrel index file detected in the project */
interface BarrelFile {
  /** Relative path from project root (e.g. "src/ink/index.ts") */
  relativePath: string;
  /** Total non-comment, non-blank lines */
  totalLines: number;
  /** Number of re-export lines */
  reExportLines: number;
  /** Re-export percentage (0-100) */
  reExportPercent: number;
}

/** Regex matching re-export statements: `export { ... } from` or `export * from` */
const RE_EXPORT_PATTERN = /^\s*export\s+(\{[^}]*\}\s+from|.*\*\s+from|\{[^}]*\}\s*from)\s+["']/;

/**
 * Check if a file is a barrel (index) file with predominantly re-export content.
 *
 * Criteria (strict):
 *   1. File is named `index.ts`, `index.js`, `index.tsx`, or `index.jsx`
 *   2. More than 50% of non-comment, non-blank lines are re-export statements
 *   3. File has at least 3 re-export lines (avoid false positives on tiny files)
 *
 * @returns BarrelFile info if it qualifies, null otherwise
 */
function analyzeBarrelFile(projectRoot: string, relativePath: string): BarrelFile | null {
  const fullPath = resolve(projectRoot, relativePath);
  if (!existsSync(fullPath)) return null;

  const basename = relativePath.split("/").pop() ?? "";
  if (!/^index\.(ts|js|tsx|jsx)$/.test(basename)) return null;

  let content: string;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }

  const lines = content.split("\n");
  let inBlockComment = false;
  let totalLines = 0;
  let reExportLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track block comments
    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      continue;
    }

    // Skip blank lines and line comments
    if (!trimmed || trimmed.startsWith("//")) continue;

    totalLines++;
    if (RE_EXPORT_PATTERN.test(trimmed)) {
      reExportLines++;
    }
  }

  if (reExportLines < 3 || totalLines === 0) return null;

  const reExportPercent = Math.round((reExportLines / totalLines) * 100);
  if (reExportPercent <= 50) return null;

  return { relativePath, totalLines, reExportLines, reExportPercent };
}

/**
 * Recursively find all index.ts/js files under a directory.
 */
function findIndexFiles(dir: string, projectRoot: string, results: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    // Skip obvious non-source directories
    if (entry === "node_modules" || entry === ".git" || entry === "dist" || entry === "build" || entry === "coverage") {
      continue;
    }

    const fullPath = pathJoin(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      findIndexFiles(fullPath, projectRoot, results);
    } else if (/^index\.(ts|js|tsx|jsx)$/.test(entry)) {
      // Convert to relative path from project root
      const relPath = fullPath.slice(projectRoot.length + 1);
      results.push(relPath);
    }
  }

  return results;
}

/**
 * Parse .gitattributes and return the set of file paths that have merge=union.
 */
function getGitattributesUnionFiles(projectRoot: string): Set<string> {
  const attrPath = resolve(projectRoot, ".gitattributes");
  const unionFiles = new Set<string>();

  if (!existsSync(attrPath)) return unionFiles;

  try {
    const content = readFileSync(attrPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (/merge\s*=\s*union/.test(trimmed)) {
        // Extract the file pattern (first whitespace-delimited token)
        const pattern = trimmed.split(/\s+/)[0];
        if (pattern) unionFiles.add(pattern);
      }
    }
  } catch {
    // Can't read .gitattributes — return empty set
  }

  return unionFiles;
}

/**
 * Pre-flight check: detect barrel files in the project that could cause
 * merge conflicts when multiple agents modify nearby code.
 *
 * When unprotected barrels are found, warns the user and proposes adding
 * .gitattributes entries with merge=union strategy.
 *
 * @param projectRoot  Project root directory
 * @param srcDirs      Source directories to scan (e.g. ["src"])
 * @param fmt          Output format
 * @returns List of unprotected barrel files found
 */
function detectUnprotectedBarrels(
  projectRoot: string,
  srcDirs: string[],
  fmt: OutputFormat
): BarrelFile[] {
  const unionFiles = getGitattributesUnionFiles(projectRoot);
  const unprotected: BarrelFile[] = [];

  for (const srcDir of srcDirs) {
    const absDir = resolve(projectRoot, srcDir);
    if (!existsSync(absDir)) continue;

    const indexFiles = findIndexFiles(absDir, projectRoot);
    for (const relPath of indexFiles) {
      const barrel = analyzeBarrelFile(projectRoot, relPath);
      if (barrel && !unionFiles.has(relPath)) {
        unprotected.push(barrel);
      }
    }
  }

  if (unprotected.length > 0 && fmt === "text") {
    console.warn(`\n\x1b[33m[preflight]\x1b[0m Detected ${unprotected.length} unprotected barrel file(s) that may cause merge conflicts:`);
    for (const b of unprotected) {
      console.warn(`  \x1b[33m${b.relativePath}\x1b[0m (${b.reExportPercent}% re-exports, ${b.reExportLines}/${b.totalLines} lines)`);
    }
    console.warn(`\n  \x1b[36mRecommendation:\x1b[0m Add these entries to .gitattributes to auto-resolve conflicts:`);
    for (const b of unprotected) {
      console.warn(`    ${b.relativePath} merge=union`);
    }
    console.warn("");
  }

  return unprotected;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaunchCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  // Selection
  topPriority?: number;
  quickestWins?: number;
  priority?: Priority;
  difficulty?: Difficulty;
  features?: string[];
  allReady?: boolean;
  // Launch
  maxConcurrent: number;
  model?: string;
  dryRun: boolean;
  baseBranch: string;
  maxRetries: number;
  noTui: boolean;
  noUi?: boolean;
  autoPush: boolean;
  // Agent selection
  /** CLI override: use this local agent definition for all launched tasks */
  agent?: string;
  // Quest scoping
  /** Quest ID to scope this launch to (uses quest branch as base) */
  questId?: string;
  // Output
  outputFmt?: OutputFormat;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdLaunch(opts: LaunchCommandOptions): Promise<void> {
  const { projectRoot } = opts;
  let { config } = opts;
  const fmt = opts.outputFmt ?? "text";

  const fail = (msg: string): never => {
    outputError(fmt, msg);
  };

  if (fmt === "text") console.log("\n--- wombo-combo: Launch ---\n");

  // Ensure agent definition exists — reinstall from template if missing
  ensureAgentDefinition(projectRoot, config, opts.agent);

  // -------------------------------------------------------------------------
  // Quest resolution — if --quest was specified, scope the wave to that quest
  // -------------------------------------------------------------------------
  let questContext: QuestPromptContext | undefined;
  let questId: string | null = opts.questId ?? null;

  if (questId) {
    const quest = loadQuest(projectRoot, questId);
    if (!quest) {
      fail(`Quest "${questId}" not found. Use 'woco quest list' to see available quests.`);
      return; // unreachable
    }

    if (quest.status !== "active") {
      fail(`Quest "${questId}" is in status "${quest.status}" — only active quests can be launched. Use 'woco quest activate ${questId}' first.`);
      return; // unreachable
    }

    // Ensure the quest branch exists (create from baseBranch if needed)
    if (!questBranchExists(projectRoot, questId)) {
      if (fmt === "text") console.log(`Creating quest branch "${quest.branch}" from "${quest.baseBranch}"...`);
      await createQuestBranch(projectRoot, questId, quest.baseBranch);
    } else {
      // Sync quest branch with baseBranch (merge main → quest branch)
      // This ensures task statuses and code changes are up-to-date
      if (fmt === "text") console.log(`Syncing quest branch "${quest.branch}" with "${quest.baseBranch}"...`);
      const syncResult = await syncQuestBranch(projectRoot, quest.branch, quest.baseBranch);
      if (syncResult.conflicting) {
        fail(syncResult.error ?? `Merge conflicts syncing ${quest.baseBranch} into ${quest.branch}.`);
        return;
      }
      if (syncResult.error) {
        fail(`Failed to sync quest branch: ${syncResult.error}`);
        return;
      }
      if (syncResult.synced && fmt === "text") {
        console.log(`  Quest branch synced with ${quest.baseBranch}.`);
      }
    }

    // Override baseBranch — task branches will fork from the quest branch
    opts.baseBranch = quest.branch;
    if (fmt === "text") {
      console.log(`Quest: ${quest.title} (${questId})`);
      console.log(`  Base branch overridden to: ${quest.branch}`);
    }

    // Apply quest config overrides (layered on top of project config)
    config = resolveQuestConfig(config, quest);

    // Build quest prompt context (informational — the daemon rebuilds its
    // own context from the quest store when scoping to questId)
    const knowledge = loadQuestKnowledge(projectRoot, questId);
    questContext = {
      questId: quest.id,
      goal: quest.goal,
      addedConstraints: quest.constraints.add ?? [],
      addedForbidden: quest.constraints.ban ?? [],
      knowledge,
    };

    if (fmt === "text") {
      const constraintCount = questContext.addedConstraints.length + questContext.addedForbidden.length;
      if (constraintCount > 0) {
        console.log(`  Quest constraints: ${questContext.addedConstraints.length} added, ${questContext.addedForbidden.length} banned`);
      }
      if (knowledge) {
        console.log(`  Quest knowledge: loaded (${knowledge.length} bytes)`);
      }
      console.log("");
    }
  }

  // Ensure portless proxy is running (if enabled) to prevent port collisions
  if (config.portless.enabled) {
    if (isPortlessAvailable(config)) {
      const proxyOk = ensureProxyRunning(config);
      if (!proxyOk && fmt === "text") {
        console.warn(
          "\x1b[33m[portless]\x1b[0m proxy could not be started — agents may encounter port collisions"
        );
      }
    } else if (fmt === "text") {
      console.warn(
        "\x1b[33m[portless]\x1b[0m enabled but not installed. Install with: npm install -g portless"
      );
      console.warn(
        "  Agents will run without portless — concurrent dev servers may have port collisions.\n"
      );
    }
  }

  // -------------------------------------------------------------------------
  // Validate that the configured baseBranch exists as a local branch
  // -------------------------------------------------------------------------
  if (!branchExists(projectRoot, opts.baseBranch)) {
    const msg = `Base branch "${opts.baseBranch}" does not exist as a local branch. ` +
      `Create it first (e.g. "git checkout -b ${opts.baseBranch}") or specify ` +
      `a different branch with --base-branch.`;
    fail(msg);
  }

  // Load features
  const data = loadFeatures(projectRoot, config);

  // Build selection options
  const selOpts: SelectionOptions = {};
  if (opts.topPriority) selOpts.topPriority = opts.topPriority;
  if (opts.quickestWins) selOpts.quickestWins = opts.quickestWins;
  if (opts.priority) selOpts.priority = opts.priority;
  if (opts.difficulty) selOpts.difficulty = opts.difficulty;
  if (opts.features) selOpts.taskIds = opts.features;
  if (opts.allReady) selOpts.allReady = true;

  // Select features
  let selected = selectFeatures(data, selOpts);

  if (selected.length === 0) {
    // Build a context-aware message based on which flags were passed
    const activeFilters: string[] = [];
    if (opts.allReady) activeFilters.push("--all-ready");
    if (opts.topPriority) activeFilters.push(`--top-priority ${opts.topPriority}`);
    if (opts.quickestWins) activeFilters.push(`--quickest-wins ${opts.quickestWins}`);
    if (opts.priority) activeFilters.push(`--priority ${opts.priority}`);
    if (opts.difficulty) activeFilters.push(`--difficulty ${opts.difficulty}`);
    if (opts.features?.length) activeFilters.push(`--tasks ${opts.features.join(",")}`);

    let msg: string;
    if (opts.allReady && activeFilters.length === 1) {
      msg = "No launchable tasks found (all tasks are done, cancelled, or have unmet dependencies).";
    } else if (activeFilters.length > 0) {
      msg = `No tasks matched the current filters: ${activeFilters.join(", ")}.`;
    } else {
      msg = "No launchable tasks found.";
    }

    // Throw so callers can catch gracefully (CLI command handler catches).
    throw new Error(msg);
  }

  // -------------------------------------------------------------------------
  // Auto-detect quest from selected tasks' quest field (if --quest not given)
  // -------------------------------------------------------------------------
  if (!questId) {
    const taskQuests = new Set(selected.map((f) => f.quest).filter(Boolean));
    if (taskQuests.size === 1) {
      const autoQuestId = [...taskQuests][0]!;
      const quest = loadQuest(projectRoot, autoQuestId);
      if (quest && quest.status === "active") {
        questId = autoQuestId;

        // Ensure the quest branch exists
        if (!questBranchExists(projectRoot, autoQuestId)) {
          if (fmt === "text") console.log(`Creating quest branch "${quest.branch}" from "${quest.baseBranch}"...`);
          await createQuestBranch(projectRoot, autoQuestId, quest.baseBranch);
        } else {
          // Sync quest branch with baseBranch
          if (fmt === "text") console.log(`Syncing quest branch "${quest.branch}" with "${quest.baseBranch}"...`);
          const syncResult = await syncQuestBranch(projectRoot, quest.branch, quest.baseBranch);
          if (syncResult.conflicting) {
            fail(syncResult.error ?? `Merge conflicts syncing ${quest.baseBranch} into ${quest.branch}.`);
            return;
          }
          if (syncResult.error) {
            fail(`Failed to sync quest branch: ${syncResult.error}`);
            return;
          }
          if (syncResult.synced && fmt === "text") {
            console.log(`  Quest branch synced with ${quest.baseBranch}.`);
          }
        }

        // Override baseBranch — task branches will fork from the quest branch
        opts.baseBranch = quest.branch;
        if (fmt === "text") {
          console.log(`Auto-detected quest: ${quest.title} (${autoQuestId})`);
          console.log(`  Base branch overridden to: ${quest.branch}`);
        }

        // Apply quest config overrides
        config = resolveQuestConfig(config, quest);

        // Build quest prompt context
        const knowledge = loadQuestKnowledge(projectRoot, autoQuestId);
        questContext = {
          questId: quest.id,
          goal: quest.goal,
          addedConstraints: quest.constraints.add ?? [],
          addedForbidden: quest.constraints.ban ?? [],
          knowledge,
        };
      }
    } else if (taskQuests.size > 1) {
      fail(
        `Selected tasks belong to multiple quests: ${[...taskQuests].join(", ")}. ` +
        `Launch tasks from a single quest at a time, or use --quest to scope the wave.`
      );
      return;
    }
  }

  // Apply quest constraints to selected tasks (add/ban layered on each task)
  if (questId && questContext) {
    const quest = loadQuest(projectRoot, questId)!;
    selected = selected.map((f) => applyQuestConstraintsToTask(f, quest));
  }

  // Show selection
  if (fmt === "text") {
    printFeatureSelection(
      selected.map((f) => ({
        id: f.id,
        title: f.title,
        priority: f.priority,
        difficulty: f.difficulty,
        effort: f.effort,
      }))
    );
  }

  // Check per-task agent definitions exist
  if (!opts.agent) {
    const taskAgents = new Set(
      selected.map((f) => f.agent).filter((a): a is string => !!a)
    );
    for (const agentName of taskAgents) {
      ensureAgentDefinition(projectRoot, config, agentName);
    }
  }

  // ---------------------------------------------------------------------------
  // Daemon scope: selected tasks + transitive dependents
  // ---------------------------------------------------------------------------
  // Dependents are not "ready" at selection time, but the daemon's scheduler
  // launches them as their dependencies complete. The scope must include the
  // whole DAG so a single launch completes it end-to-end without operator
  // intervention.
  const scopeSet = new Set(selected.map((f) => f.id));
  const dependentsOf = new Map<string, string[]>(); // dep id -> dependent ids
  for (const t of data.tasks) {
    for (const dep of t.depends_on ?? []) {
      const list = dependentsOf.get(dep) ?? [];
      list.push(t.id);
      dependentsOf.set(dep, list);
    }
  }
  const launchScopeIds = [...scopeSet];
  for (let i = 0; i < launchScopeIds.length; i++) {
    for (const dependent of dependentsOf.get(launchScopeIds[i]) ?? []) {
      if (!scopeSet.has(dependent)) {
        scopeSet.add(dependent);
        launchScopeIds.push(dependent);
      }
    }
  }
  if (fmt === "text" && launchScopeIds.length > selected.length) {
    console.log(
      `Daemon scope: ${launchScopeIds.length} task(s) ` +
      `(selected + ${launchScopeIds.length - selected.length} dependent(s) pending dependencies)`
    );
  }

  // ---------------------------------------------------------------------------
  // Dependency graph analysis
  // ---------------------------------------------------------------------------
  const depGraph = buildDepGraph(selected, data.tasks);
  let schedulePlan: SchedulePlan | null = null;

  // Check if any features actually have dependencies within the selected set
  const hasDeps = selected.some(
    (f) => f.depends_on.some((d) => selected.find((s) => s.id === d))
  );

  if (hasDeps) {
    // Validate graph — throws on cycles or dangling deps
    try {
      validateDepGraph(depGraph);
    } catch (err: any) {
      fail(`${err.message}\nFix dependency issues before launching.`);
    }

    // Build scheduling plan
    schedulePlan = buildSchedulePlan(depGraph);
    if (fmt === "text") console.log(`\n${formatSchedulePlan(schedulePlan)}\n`);
  }

  // ---------------------------------------------------------------------------
  // Pre-flight: Barrel file detection — warn about conflict-prone index files
  // ---------------------------------------------------------------------------
  // Only warn when launching multiple tasks (single task can't conflict with itself)
  if (selected.length > 1) {
    // Scan "src" directory by default; could be made configurable later
    detectUnprotectedBarrels(projectRoot, ["src"], fmt);
  }

  if (opts.dryRun) {
    const dryRunResult = {
      dry_run: true,
      base_branch: opts.baseBranch,
      max_concurrent: opts.maxConcurrent,
      model: opts.model ?? null,
      selected: selected.map((f) => ({
        id: f.id,
        title: f.title,
        priority: f.priority,
        difficulty: f.difficulty,
        effort: f.effort,
      })),
      schedule_plan: schedulePlan ? {
        streams: schedulePlan.streams.map((s) => s.featureIds),
        merge_gates: schedulePlan.mergeGates.map((g) => ({
          feature_id: g.featureId,
          wait_for: g.waitFor,
        })),
        topological_order: schedulePlan.topologicalOrder,
      } : null,
      scope_partitions: scopePartitions(
        data.tasks.filter((t) => scopeSet.has(t.id))
      ),
    };

    output(fmt, dryRunResult, () => {
      console.log("Dry run — not launching agents.");
      const scopeTasks = data.tasks.filter((t) => scopeSet.has(t.id));
      if (scopeTasks.some((t) => (t.paths ?? []).length > 0)) {
        console.log(formatScopePartitions(scopePartitions(scopeTasks)));
      }
    }, () => {
      console.log(renderLaunchDryRun(dryRunResult));
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // Agent registry: resolve specialized agents for tasks with agent_type
  // ---------------------------------------------------------------------------
  let agentResolutions: Map<string, AgentResolution> | undefined;

  if (config.agentRegistry.mode !== "disabled") {
    const tasksWithAgentType = selected.filter((t) => t.agent_type);
    if (tasksWithAgentType.length > 0) {
      if (fmt === "text") console.log(`\nResolving ${tasksWithAgentType.length} specialized agent(s) from registry...`);
      agentResolutions = await prepareAgentDefinitions(selected, config, projectRoot);

      const specialized = [...agentResolutions.values()].filter(isSpecializedAgent);
      const cached = specialized.filter((r) => r.fromCache);
      if (fmt === "text") {
        console.log(
          `  ${specialized.length} specialized (${cached.length} cached, ${specialized.length - cached.length} fetched), ` +
          `${selected.length - specialized.length} generalist`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Preflight confirmation
  // ---------------------------------------------------------------------------
  if (agentResolutions && agentResolutions.size > 0) {
    const isTTY = process.stdout.isTTY && process.stdin.isTTY;
    const { inkPreflightConfirm, consolePreflightConfirm } = await import("../ink/run-preflight");
    const preflight = isTTY && !opts.noTui
      ? await inkPreflightConfirm(selected, agentResolutions, config)
      : await consolePreflightConfirm(selected, agentResolutions, config);

    if (!preflight.proceed) {
      outputMessage(fmt, "Launch cancelled.");
      return;
    }

    // The daemon re-resolves agent definitions itself from the registry;
    // the confirmation above is a review gate, not a mutation source.
  }

  // ---------------------------------------------------------------------------
  // Daemon delegation — every launch goes through the background daemon.
  // At this point all validation is done, features are selected, deps
  // resolved, dry-run handled, and preflight confirmed. The daemon owns
  // worktrees, processes, verification, merging, and state persistence.
  // ---------------------------------------------------------------------------
  try {
    await delegateToDaemon(projectRoot, opts, launchScopeIds, fmt);
  } catch (err: any) {
    fail(`Failed to launch via daemon: ${err?.message ?? err}`);
  }
}

