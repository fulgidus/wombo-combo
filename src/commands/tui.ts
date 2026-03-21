/**
 * tui.ts -- Unified TUI command entry point for wombo-combo.
 *
 * Mounts a single persistent <TuiApp /> component that drives all screen
 * navigation via ScreenRouter. Complex async flows (plan, genesis, errand,
 * wishlist) are passed as `callbacks` so screens can trigger them from inside
 * the React tree without needing a separate inkRender instance per action.
 *
 * Flow overview:
 *   cmdTui()
 *     → enterAltScreen / daemon setup / session load
 *     → inkRender(<TuiApp projectRoot config callbacks onExit />)
 *     → await instance.waitUntilExit()
 *     → cleanup (daemon disconnect, exitAltScreen)
 *
 * First-run (no project.yml):
 *   initialScreen is set to "onboarding"; after onboarding completes the
 *   OnboardingScreen component navigates to "quest-picker".
 *   If genesis was requested the onOnboarding callback runs the genesis flow
 *   before returning (which causes the screen to navigate to quest-picker).
 *
 * All screen transitions and keyboard shortcuts are handled inside the React
 * tree. The imperative loop is gone.
 */

import { render as inkRender } from "ink";
import React from "react";
import type { WomboConfig } from "../config";
import { ensureTasksFile } from "../lib/tasks";
import { loadState } from "../lib/state";
import { loadTUISession, saveTUISession } from "../lib/tui-session";
import type { ProposedTask } from "../lib/quest-planner";
import { runQuestPlanner, applyPlanToQuest } from "../lib/quest-planner";
import type { PlanResult } from "../lib/quest-planner";
import { loadAllQuests, loadQuest, saveQuest, listQuestIds, saveQuestKnowledge } from "../lib/quest-store";
import { runGenesisPlanner } from "../lib/genesis-planner";
import type { GenesisResult, ProposedQuest } from "../lib/genesis-planner";
import { createBlankQuest, getQuestTaskIds } from "../lib/quest";
import { runErrandPlanner, applyErrandPlan } from "../lib/errand-planner";
import type { ErrandSpec } from "../lib/errand-planner";
import { deleteItem as deleteWishlistItem } from "../lib/wishlist-store";
import type { WishlistItem } from "../lib/wishlist-store";
import { projectExists, formatProjectContext } from "../lib/project-store";
import { runOnboardingInk } from "../ink/onboarding/run-onboarding";
import { runGenesisReviewInk, runPlanReviewInk, type GenesisReviewAction, type PlanReviewAction } from "../ink/run-review";
import { runWishlistPickerInk } from "../ink/run-wishlist-picker";
import { runErrandWizardInk } from "../ink/run-errand-wizard";
import { runQuestWizardInk } from "../ink/run-quest-wizard";
import { runProgressInk, runConfirmInk, type ProgressController } from "../ink/run-progress";
import { TuiApp, type TuiAppCallbacks } from "../ink/run-tui-app";
import { getStableStdin } from "../ink/bun-stdin";

import { enterAltScreen, exitAltScreen, installAltScreenGuard, clearScreen } from "../ink/alt-screen";
// Daemon types only — actual modules are loaded via dynamic import() to
// avoid pulling in Bun.serve / AgentRunner / ink's top-level await into
// the synchronous require() chain (schema.ts → citty-registry → tui.ts).
import type { DaemonClient } from "../daemon/client";
import type { InkDaemonTUI } from "../ink/run-daemon-monitor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TUICommandOptions {
  projectRoot: string;
  config: WomboConfig;
  /** Max concurrent agents (override, or null to use session/config default) */
  maxConcurrent?: number;
  /** Model override */
  model?: string;
  /** Base branch override */
  baseBranch?: string;
  /** Max retries override */
  maxRetries?: number;
  /** Auto-push after merge */
  autoPush?: boolean;
  /** Skip TDD tests */
  skipTests?: boolean;
  /** Strict TDD mode */
  strictTdd?: boolean;
  /** Agent definition override */
  agent?: string;
}

// ---------------------------------------------------------------------------
// Daemon Monitor Helper (dynamic import)
// ---------------------------------------------------------------------------

/** Dynamically import InkDaemonTUI and run it. Returns when user quits. */
async function runDaemonMonitor(opts: {
  client: DaemonClient;
  projectRoot: string;
  config: WomboConfig;
}): Promise<void> {
  const { InkDaemonTUI: InkDaemonTUIImpl } = await import("../ink/run-daemon-monitor");
  const daemonTui: InkDaemonTUI = new InkDaemonTUIImpl({
    client: opts.client,
    projectRoot: opts.projectRoot,
    config: opts.config,
    onQuit: () => {
      // Detach from monitor — daemon keeps agents running
    },
    // tui.ts already owns the alt-screen via enterAltScreen(); skip nested
    // start/stop to avoid double-enter / premature exit of the outer session.
    skipAltScreen: true,
    // We're already inside the TUI session — skip the monitor's own splash.
    skipSplash: true,
  });
  daemonTui.start();
  await daemonTui.waitForQuit();
  daemonTui.stop();
}

// ---------------------------------------------------------------------------
// Command -- Single inkRender entry point
// ---------------------------------------------------------------------------

export async function cmdTui(opts: TUICommandOptions): Promise<void> {
  const { projectRoot, config } = opts;

  // The TUI requires a real TTY for keyboard input (Ink's useInput uses raw mode).
  if (!process.stdin.isTTY) {
    console.error(
      "\nThe interactive TUI requires a terminal with TTY support.\n" +
        "If you're using `bun dev`, try running directly: bun src/index.ts\n" +
        "Or use a specific command: bun dev tasks list\n"
    );
    process.exit(1);
  }

  // Ensure tasks file exists
  await ensureTasksFile(projectRoot, config);

  // Load session state (persisted selections, sort preferences)
  const session = loadTUISession(projectRoot);

  // Enter the alternate screen buffer for a true fullscreen experience.
  enterAltScreen();
  const removeGuard = installAltScreenGuard();

  // Start the daemon (if not already running) and connect a client.
  let daemonClient: DaemonClient | null = null;
  let daemonConnected = false;

  try {
    const { ensureDaemonRunning } = await import("../daemon/launcher");
    await ensureDaemonRunning(projectRoot);
    const { DaemonClient: DaemonClientImpl } = await import("../daemon/client");
    daemonClient = new DaemonClientImpl({ clientId: "tui", autoReconnect: true });
    await daemonClient.connect();
    daemonConnected = true;
  } catch (err: any) {
    daemonClient = null;
    daemonConnected = false;
  }

  // If connected, ensure the scheduler is running.
  // Pass CLI --max-concurrent override so it takes effect immediately.
  if (daemonConnected && daemonClient) {
    try {
      daemonClient.start(opts.maxConcurrent !== undefined ? { maxConcurrent: opts.maxConcurrent } : {});
    } catch { /* best-effort */ }
  }

  // First-run detection: decide initial screen
  const isFirstRun = !projectExists(projectRoot);

  try {
    // Build the callbacks that complex async flows are wired through
    const callbacks: TuiAppCallbacks = {
      onPlan: async (questId: string) => {
        clearScreen();
        await handlePlanFlow(projectRoot, config, opts, questId);
        clearScreen();
      },
      onGenesis: async (vision: string) => {
        clearScreen();
        // If vision is empty, prompt for it
        let finalVision = vision;
        if (!finalVision) {
          finalVision = await promptVisionText();
        }
        if (finalVision) {
          await handleGenesisFlow(projectRoot, config, opts, finalVision);
        }
        clearScreen();
      },
      onErrand: async (spec: ErrandSpec) => {
        clearScreen();
        let finalSpec = spec;
        if (!finalSpec.description) {
          const wizardSpec = await runErrandWizardInk();
          if (wizardSpec) {
            finalSpec = wizardSpec;
          } else {
            return; // user cancelled wizard
          }
        }
        await handleErrandFlow(projectRoot, config, opts, finalSpec);
        clearScreen();
      },
      onWishlist: async () => {
        clearScreen();
        await handleWishlistFlow(projectRoot, config, opts);
        clearScreen();
      },
      onOnboarding: async () => {
        clearScreen();
        const result = await runOnboardingInk({ projectRoot, config });
        clearScreen();
        if (result.profile && result.genesisRequested) {
          const vision = formatProjectContext(result.profile);
          await handleGenesisFlow(projectRoot, config, opts, vision);
          clearScreen();
        }
      },
      onQuestCreate: async () => {
        clearScreen();
        await runQuestWizardInk({
          projectRoot,
          baseBranch: opts.baseBranch ?? config.baseBranch,
        });
        clearScreen();
      },
      onShowMonitor: async () => {
        clearScreen();
        if (daemonConnected && daemonClient) {
          try {
            await runDaemonMonitor({ client: daemonClient, projectRoot, config });
          } catch (err: any) {
            const errProgress = runProgressInk({ title: "Monitor Error" });
            await errProgress.finish({ type: "error", message: `Daemon monitor error: ${err.message}` });
          }
        }
        clearScreen();
      },
      onTasksPlanned: () => {
        // Wake the scheduler from idle so it picks up newly-planned tasks
        // immediately rather than waiting for the next 3s tick (or missing
        // them entirely if the scheduler had already transitioned to idle).
        if (daemonConnected && daemonClient) {
          try {
            daemonClient.start({});
          } catch { /* best-effort */ }
        }
      },
      onRetryAgent: (taskId: string) => {
        if (daemonConnected && daemonClient) {
          try {
            daemonClient.retryAgent(taskId);
          } catch { /* best-effort */ }
        }
      },
      onSetConcurrency: (n: number) => {
        if (daemonConnected && daemonClient) {
          try {
            daemonClient.setConcurrency(n);
          } catch { /* best-effort */ }
        }
      },
    };

    // Determine initial screen: onboarding for first run, splash otherwise
    const initialScreen: "splash" | "onboarding" = isFirstRun ? "onboarding" : "splash";

    // Render the unified TUI app (single mount, persistent for entire session)
    process.stdin.resume();
    const instance = inkRender(
      React.createElement(TuiApp, {
        projectRoot,
        config,
        initialScreen,
        splashDurationMs: 1500,
        onExit: () => {
          session.lastView = "browser";
          saveTUISession(projectRoot, session);
          instance.unmount();
        },
        daemonClient: daemonClient ?? undefined,
        daemonConnected,
        callbacks,
      }),
      {
        exitOnCtrlC: false,
        stdin: getStableStdin(),
      }
    );

    await instance.waitUntilExit();
  } finally {
    // Disconnect daemon client gracefully
    if (daemonClient) {
      try {
        daemonClient.disconnect();
      } catch {
        // Best-effort
      }
    }
    // Always exit the alternate screen buffer, even on error.
    removeGuard();
    exitAltScreen();
    process.stdin.pause();
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Plan Flow -- Planner + Review
// ---------------------------------------------------------------------------

/**
 * Run the quest planner agent, then show the plan review TUI.
 * Handles the full flow: progress screen -> planner -> review -> approve/cancel.
 */
async function handlePlanFlow(
  projectRoot: string,
  config: WomboConfig,
  opts: TUICommandOptions,
  questId: string
): Promise<void> {
  const quest = loadQuest(projectRoot, questId);
  if (!quest) {
    const progress = runProgressInk({ title: "Error" });
    await progress.finish({ type: "error", message: `Quest "${questId}" not found.` });
    return;
  }

  // Set quest to planning status
  const prevStatus = quest.status;
  quest.status = "planning";
  saveQuest(projectRoot, quest);

  // Show progress screen with spinner
  const progress = runProgressInk({
    title: "Quest Planner",
    context: `${quest.title} (${quest.id})`,
  });
  progress.update("Running quest planner agent...");

  let planResult: PlanResult;

  try {
    planResult = await runQuestPlanner(quest, projectRoot, config, {
      model: opts.model,
      onProgress: (msg) => {
        progress.update(msg);
      },
    });
  } catch (err: any) {
    quest.status = prevStatus;
    saveQuest(projectRoot, quest);
    await progress.finish({ type: "error", message: `Planner error: ${err.message}` });
    return;
  }

  if (!planResult.success && planResult.tasks.length === 0) {
    quest.status = prevStatus;
    saveQuest(projectRoot, quest);
    await progress.finish({
      type: "error",
      message: `Planner failed: ${planResult.error ?? "No tasks produced"}`,
    });
    return;
  }

  // Show results briefly before switching to plan review
  await progress.finish({
    type: "success",
    message: `Planner produced ${planResult.tasks.length} tasks. Opening plan review...`,
  });

  // Show the plan review TUI
  const reviewAction = await runPlanReviewInk({
    questId,
    questTitle: quest.title,
    planResult,
  });

  if (reviewAction.type === "cancel") {
    // User cancelled — revert quest status
    quest.status = prevStatus;
    saveQuest(projectRoot, quest);
    const p2 = runProgressInk({ title: "Plan Cancelled" });
    await p2.finish({
      type: "info",
      message: `Plan discarded. Quest "${questId}" reverted to "${prevStatus}".`,
    });
    return;
  }

  // User approved — apply the plan
  try {
    const approvedResult: PlanResult = {
      ...planResult,
      tasks: reviewAction.tasks,
      knowledge: reviewAction.knowledge,
    };

    const tasks = applyPlanToQuest(approvedResult, quest, projectRoot, config);
    const p2 = runProgressInk({ title: "Plan Approved" });
    let msg = `Created ${tasks.length} tasks. Quest "${questId}" is now active.`;
    if (reviewAction.knowledge) {
      msg += ` Saved knowledge file (${reviewAction.knowledge.length} chars).`;
    }
    await p2.finish({ type: "success", message: msg });
  } catch (err: any) {
    quest.status = prevStatus;
    saveQuest(projectRoot, quest);
    const p2 = runProgressInk({ title: "Plan Error" });
    await p2.finish({ type: "error", message: `Failed to apply plan: ${err.message}` });
  }
}

// ---------------------------------------------------------------------------
// Genesis Flow -- Vision Prompt + Planner + Review
// ---------------------------------------------------------------------------

/**
 * Run the genesis planner: take a vision string, run the genesis planner
 * agent, then show the genesis review TUI.
 * Handles the full flow: progress screen -> planner -> review -> create quests.
 */
async function handleGenesisFlow(
  projectRoot: string,
  config: WomboConfig,
  opts: TUICommandOptions,
  vision: string
): Promise<void> {
  if (!vision) {
    const progress = runProgressInk({ title: "Genesis" });
    await progress.finish({ type: "info", message: "No vision provided. Returning to quest picker." });
    return;
  }

  // Gather existing quest IDs so the planner can avoid duplicates
  const existingQuestIds = listQuestIds(projectRoot);

  // Show progress screen with spinner
  const progress = runProgressInk({ title: "Genesis Planner" });
  progress.update("Running genesis planner agent...");

  let genesisResult: GenesisResult;

  try {
    genesisResult = await runGenesisPlanner(vision, projectRoot, config, {
      existingQuestIds,
      model: opts.model,
      onProgress: (msg) => {
        progress.update(msg);
      },
    });
  } catch (err: any) {
    await progress.finish({ type: "error", message: `Genesis planner error: ${err.message}` });
    return;
  }

  if (!genesisResult.success && genesisResult.quests.length === 0) {
    await progress.finish({
      type: "error",
      message: `Genesis planner failed: ${genesisResult.error ?? "No quests produced"}`,
    });
    return;
  }

  // Show results briefly before switching to genesis review
  await progress.finish({
    type: "success",
    message: `Genesis planner produced ${genesisResult.quests.length} quests. Opening genesis review...`,
  });

  // Show the genesis review TUI
  const reviewAction = await runGenesisReviewInk({ genesisResult });

  if (reviewAction.type === "cancel") {
    const p2 = runProgressInk({ title: "Genesis Cancelled" });
    await p2.finish({ type: "info", message: "Genesis plan discarded." });
    return;
  }

  // User approved — create quests from accepted proposals
  const baseBranch = opts.baseBranch ?? config.baseBranch;
  const created: string[] = [];

  for (const proposed of reviewAction.quests) {
    const quest = createBlankQuest(proposed.id, proposed.title, proposed.goal, baseBranch, {
      priority: proposed.priority,
      difficulty: proposed.difficulty,
      hitlMode: proposed.hitl_mode,
    });

    // Apply constraints from the genesis planner
    quest.constraints.add = proposed.constraints.add ?? [];
    quest.constraints.ban = proposed.constraints.ban ?? [];
    quest.depends_on = proposed.depends_on ?? [];
    quest.notes = proposed.notes ?? [];

    saveQuest(projectRoot, quest);
    created.push(quest.id);
  }

  // Show approval result
  const p2 = runProgressInk({ title: "Genesis Approved" });
  let msg = `Created ${created.length} quests.`;

  // Save knowledge if the planner produced any (attach to the first quest)
  const knowledge = reviewAction.knowledge;
  if (knowledge && created.length > 0) {
    saveQuestKnowledge(projectRoot, created[0], knowledge);
    msg += ` Saved knowledge file (${knowledge.length} chars) to quest "${created[0]}".`;
  }

  await p2.finish({ type: "success", message: msg });
}

// ---------------------------------------------------------------------------
// Errand Flow -- Quick Task Generation (quest-less)
// ---------------------------------------------------------------------------

/**
 * Run the errand planner: take an ErrandSpec, run the quest planner agent
 * with an errand-specific prompt, then show plan review.
 */
async function handleErrandFlow(
  projectRoot: string,
  config: WomboConfig,
  opts: TUICommandOptions,
  spec: ErrandSpec
): Promise<void> {
  if (!spec.description) {
    const progress = runProgressInk({ title: "Errand" });
    await progress.finish({ type: "info", message: "No description provided. Returning." });
    return;
  }

  // Show progress screen with spinner
  const progress = runProgressInk({ title: "Errand Planner" });
  progress.update("Running errand planner...");

  let planResult: PlanResult;

  try {
    planResult = await runErrandPlanner(spec, projectRoot, config, {
      model: opts.model,
      onProgress: (msg) => {
        progress.update(msg);
      },
    });
  } catch (err: any) {
    await progress.finish({ type: "error", message: `Errand planner error: ${err.message}` });
    return;
  }

  if (!planResult.success && planResult.tasks.length === 0) {
    await progress.finish({
      type: "error",
      message: `Errand planner failed: ${planResult.error ?? "No tasks produced"}`,
    });
    return;
  }

  const desc = spec.description;

  // Show results briefly before switching to plan review
  await progress.finish({
    type: "success",
    message: `Errand planner produced ${planResult.tasks.length} task(s). Opening plan review...`,
  });

  // Reuse the plan review TUI
  const reviewAction = await runPlanReviewInk({
    questId: "(errand)",
    questTitle: desc.length > 50 ? desc.slice(0, 47) + "..." : desc,
    planResult,
  });

  if (reviewAction.type === "cancel") {
    const p2 = runProgressInk({ title: "Errand Cancelled" });
    await p2.finish({ type: "info", message: "Errand plan discarded." });
    return;
  }

  // User approved -- create tasks directly (no quest)
  try {
    const approvedResult: PlanResult = {
      ...planResult,
      tasks: reviewAction.tasks,
      knowledge: reviewAction.knowledge,
    };

    const tasks = applyErrandPlan(approvedResult, projectRoot, config);
    const p2 = runProgressInk({ title: "Errand Approved" });
    const taskList = tasks.map((t) => `  - ${t.id}: ${t.title}`).join("\n");
    await p2.finish({
      type: "success",
      message: `Created ${tasks.length} task(s).\n${taskList}`,
    });
  } catch (err: any) {
    const p2 = runProgressInk({ title: "Errand Error" });
    await p2.finish({ type: "error", message: `Failed to create errand tasks: ${err.message}` });
  }
}

// ---------------------------------------------------------------------------
// Wishlist Flow -- Browse + Promote to Errand/Genesis
// ---------------------------------------------------------------------------

/**
 * Show the wishlist picker. When the user promotes an item, run the
 * appropriate flow (errand or genesis) with the item text pre-filled.
 */
async function handleWishlistFlow(
  projectRoot: string,
  config: WomboConfig,
  opts: TUICommandOptions
): Promise<void> {
  const action = await runWishlistPickerInk({ projectRoot });

  if (action.type === "back" || action.type === "quit") {
    return;
  }

  if (action.type === "promoteErrand") {
    const item = action.item;
    await handleErrandFlow(projectRoot, config, opts, { description: item.text });
    await maybeDeleteWishlistItem(projectRoot, item);
    return;
  }

  if (action.type === "promoteGenesis") {
    const item = action.item;
    await handleGenesisFlow(projectRoot, config, opts, item.text);
    await maybeDeleteWishlistItem(projectRoot, item);
    return;
  }

  if (action.type === "promoteQuest") {
    const item = action.item;

    // Run the quest creation wizard with the wishlist text as the goal
    const quest = await runQuestWizardInk({
      projectRoot,
      baseBranch: opts.baseBranch ?? config.baseBranch,
      prefill: { goal: item.text },
    });

    if (!quest) {
      // User cancelled the wizard
      return;
    }

    // Mandatory auto-plan: run the quest planner immediately
    await handlePlanFlow(projectRoot, config, opts, quest.id);

    // Offer to delete the wishlist item
    await maybeDeleteWishlistItem(projectRoot, item);
    return;
  }
}

/**
 * After a wishlist item has been promoted, ask the user whether to delete it.
 */
async function maybeDeleteWishlistItem(
  projectRoot: string,
  item: WishlistItem
): Promise<void> {
  const truncText =
    item.text.length > 50 ? item.text.slice(0, 47) + "..." : item.text;

  const confirmed = await runConfirmInk({
    title: "Delete Wishlist Item",
    message: `Delete "${truncText}" from wishlist?`,
  });

  if (confirmed) {
    const deleted = deleteWishlistItem(projectRoot, item.id);
    const p = runProgressInk({ title: "Wishlist" });
    if (deleted) {
      await p.finish({ type: "success", message: "Wishlist item deleted." });
    } else {
      await p.finish({ type: "info", message: "Item not found (may have been already deleted)." });
    }
  } else {
    const p = runProgressInk({ title: "Wishlist" });
    await p.finish({ type: "info", message: "Wishlist item kept." });
  }
}

// ---------------------------------------------------------------------------
// Vision Text Prompt
// ---------------------------------------------------------------------------

/**
 * Prompt the user for a vision text string via readline.
 * Returns the vision text, or empty string if cancelled.
 */
async function promptVisionText(): Promise<string> {
  const readline = await import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    rl.question("Enter your project vision (or press Enter to cancel): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
