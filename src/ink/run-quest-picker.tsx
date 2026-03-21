/**
 * run-quest-picker.tsx — Standalone launcher for the QuestPickerView.
 *
 * Creates and destroys its own Ink render instance, returning a Promise
 * that resolves with the user's action (select quest, plan, genesis, etc.).
 *
 * Manages all data loading (quests, tasks, usage) and state (selection index,
 * toggle active, delete, create) internally — the QuestPickerView is a
 * pure view component that receives everything via props.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { execSync } from "node:child_process";
import { getStableStdin } from "./bun-stdin";
import { render, Box } from "ink";
import { useTerminalSize } from "./use-terminal-size";
import { useNavigation } from "./router";
import { QuestPickerView, type QuestSummary } from "./quest-picker";
import { FakeTaskWizard, generateFakeTasks, type FakeTaskConfig } from "./fake-task-wizard";
import type { Quest } from "../lib/quest";
import { QUEST_STATUS_ORDER, getQuestTaskIds } from "../lib/quest";
import { loadAllQuests, saveQuest, deleteQuest } from "../lib/quest-store";
import { loadTasks, getDoneTaskIds, loadArchive, type Task } from "../lib/tasks";
import { saveTaskToStore } from "../lib/task-store";
import { loadUsageRecords, totalUsage, groupBy as groupUsageBy } from "../lib/token-usage";
import type { UsageTotals } from "../lib/token-usage";
import type { WomboConfig } from "../config";
import type { ErrandSpec } from "../lib/errand-planner";
import type { TuiAppCallbacks } from "./run-tui-app";

// ---------------------------------------------------------------------------
// Action Type (matches the old QuestPickerAction)
// ---------------------------------------------------------------------------

export type QuestPickerAction =
  | { type: "select"; questId: string | null }
  | { type: "plan"; questId: string }
  | { type: "genesis"; vision: string }
  | { type: "errand"; spec: ErrandSpec }
  | { type: "wishlist" }
  | { type: "onboarding" }
  | { type: "quit" };

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RunQuestPickerOptions {
  projectRoot: string;
  config: WomboConfig;
}

// ---------------------------------------------------------------------------
// Stateful Wrapper Component
// ---------------------------------------------------------------------------

function QuestPickerApp({
  projectRoot,
  config,
  onAction,
}: {
  projectRoot: string;
  config: WomboConfig;
  onAction: (action: QuestPickerAction) => void;
}) {
  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [totalTaskCount, setTotalTaskCount] = useState(0);
  const [errandCount, setErrandCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [questUsage, setQuestUsage] = useState<Map<string, UsageTotals>>(new Map());
  const [overallUsage, setOverallUsage] = useState<UsageTotals | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Load data on mount
  const loadData = useCallback(() => {
    const allQuests = loadAllQuests(projectRoot);
    const tasksData = loadTasks(projectRoot, config);
    const archiveData = loadArchive(projectRoot, config);
    const doneIds = getDoneTaskIds(tasksData, archiveData.tasks);

    setTotalTaskCount(tasksData.tasks.length);
    setErrandCount(tasksData.tasks.filter((t: any) => !t.quest).length);

    // Sort quests: by status order (active first)
    const sorted = [...allQuests].sort((a, b) => {
      return (QUEST_STATUS_ORDER[a.status] ?? 99) - (QUEST_STATUS_ORDER[b.status] ?? 99);
    });

    // Build summaries
    const summaries: QuestSummary[] = sorted.map((quest) => {
      const questTids = getQuestTaskIds(quest.id, tasksData.tasks);
      const totalTasks = questTids.length;
      const doneTasks = questTids.filter((id) => doneIds.has(id)).length;
      const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      return { quest, totalTasks, doneTasks, completionPct };
    });

    setQuests(summaries);

    // Load token usage
    try {
      const records = loadUsageRecords(projectRoot);
      if (records.length > 0) {
        setQuestUsage(groupUsageBy(records, "quest_id"));
        setOverallUsage(totalUsage(records));
      }
    } catch {
      // Non-critical
    }
  }, [projectRoot, config]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleSelect = useCallback(
    (questId: string | null) => {
      onAction({ type: "select", questId });
    },
    [onAction]
  );

  const handleQuit = useCallback(() => {
    onAction({ type: "quit" });
  }, [onAction]);

  const handlePlan = useCallback(() => {
    if (selectedIndex <= 1 || !quests[selectedIndex - 2]) return;
    const summary = quests[selectedIndex - 2];
    onAction({ type: "plan", questId: summary.quest.id });
  }, [selectedIndex, quests, onAction]);

  const handleGenesis = useCallback(() => {
    // The old blessed version showed an input modal for vision text.
    // With Ink, we'll signal "genesis" and the parent (tui.ts) handles
    // prompting for vision text. For now, pass a placeholder action
    // that the parent can handle by launching a vision prompt flow.
    onAction({ type: "genesis", vision: "" });
  }, [onAction]);

  const handleErrand = useCallback(() => {
    // Signal the parent to show the errand wizard
    onAction({ type: "errand", spec: { description: "" } });
  }, [onAction]);

  const handleWishlist = useCallback(() => {
    onAction({ type: "wishlist" });
  }, [onAction]);

  const handleOnboarding = useCallback(() => {
    onAction({ type: "onboarding" });
  }, [onAction]);

  const handleToggleActive = useCallback(() => {
    if (selectedIndex <= 1) return;
    const summary = quests[selectedIndex - 2];
    if (!summary) return;
    const quest = summary.quest;

    if (quest.status === "active") {
      quest.status = "paused";
    } else if (quest.status === "draft" || quest.status === "paused" || quest.status === "planning") {
      quest.status = "active";
      if (!quest.started_at) {
        quest.started_at = new Date().toISOString();
      }
    } else {
      return; // completed/abandoned can't toggle
    }

    saveQuest(projectRoot, quest);
    loadData();
  }, [selectedIndex, quests, projectRoot, loadData]);

  const handleDelete = useCallback(() => {
    if (selectedIndex <= 1) return;
    const summary = quests[selectedIndex - 2];
    if (!summary) return;

    deleteQuest(projectRoot, summary.quest.id);
    loadData();
    // Clamp selection (All Tasks=0, Errands=1, quests start at 2)
    const maxIdx = quests.length + 1; // +1 for Errands
    if (selectedIndex > maxIdx) {
      setSelectedIndex(Math.max(0, maxIdx));
    }
  }, [selectedIndex, quests, projectRoot, loadData]);

  const handleCreate = useCallback(() => {
    onAction({ type: "select", questId: "__create__" });
  }, [onAction]);

  const handleSeedFake = useCallback(() => {
    setShowWizard(true);
  }, []);

  const handleWizardConfirm = useCallback((cfg: FakeTaskConfig) => {
    const tasks = generateFakeTasks(cfg);
    // Create the quest first so it shows up in the picker
    if (cfg.questName.trim()) {
      const slug = cfg.questName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const now = new Date().toISOString();
      const quest: Quest = {
        id: slug,
        title: cfg.questName.trim(),
        goal: `Fake quest: ${cfg.questName.trim()}`,
        status: "draft",
        priority: "medium",
        difficulty: "medium",
        depends_on: [],
        branch: `quest/${slug}`,
        baseBranch: config.baseBranch,
        hitlMode: "yolo",
        constraints: { add: [], ban: [], override: {} },
        created_at: now,
        updated_at: now,
        started_at: now,
        ended_at: null,
        notes: [],
      };
      saveQuest(projectRoot, quest);
      // Create the actual git branch so tasks can branch off it
      try {
        execSync(`git branch "quest/${slug}" "${config.baseBranch}"`, {
          cwd: projectRoot,
          stdio: "pipe",
        });
      } catch {
        // Branch already exists — fine
      }
    }
    for (const task of tasks) {
      saveTaskToStore(projectRoot, config, task);
    }
    setShowWizard(false);
    loadData();
  }, [projectRoot, config, loadData]);

  const handleWizardCancel = useCallback(() => {
    setShowWizard(false);
  }, []);

  const { columns, rows } = useTerminalSize();

  return (
    <>
      <QuestPickerView
        quests={quests}
        totalTaskCount={totalTaskCount}
        errandCount={errandCount}
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
        onQuit={handleQuit}
        onSelectionChange={setSelectedIndex}
        questUsage={questUsage}
        overallUsage={overallUsage}
        devMode={config.devMode}
        onCreate={handleCreate}
        onToggleActive={handleToggleActive}
        onPlan={handlePlan}
        onGenesis={handleGenesis}
        onErrand={handleErrand}
        onWishlist={handleWishlist}
        onOnboarding={handleOnboarding}
        onDelete={handleDelete}
        onSeedFake={handleSeedFake}
        isActive={!showWizard}
      />
      {showWizard && (
        <Box
          position="absolute"
          width={columns}
          height={rows}
          alignItems="center"
          justifyContent="center"
        >
          <FakeTaskWizard onConfirm={handleWizardConfirm} onCancel={handleWizardCancel} />
        </Box>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// QuestPickerScreen — router-compatible screen component
// ---------------------------------------------------------------------------

/**
 * Props received when QuestPickerScreen is used inside a ScreenRouter.
 * These are passed via ScreenRouter's initialProps or nav.push/replace.
 */
export interface QuestPickerScreenProps {
  projectRoot: string;
  config: WomboConfig;
  /** Called when the user quits from the quest picker. */
  onExit: () => void;
  /**
   * Optional imperative callbacks for complex async flows (plan, genesis,
   * errand, etc.) passed from tui.ts via TuiApp.
   */
  callbacks?: TuiAppCallbacks;
}

/**
 * QuestPickerScreen — a ScreenRouter-compatible screen component.
 *
 * Wraps QuestPickerApp so it can live inside the unified TuiApp ScreenRouter
 * instead of being a standalone inkRender() call. Navigation (select quest,
 * plan, genesis, errand, quit) is handled via useNavigation() push/replace
 * calls rather than onAction() callbacks.
 *
 * Exported for use in TuiApp screen map and for testing.
 */
export function QuestPickerScreen({
  projectRoot,
  config,
  onExit,
  callbacks,
}: QuestPickerScreenProps): React.ReactElement {
  const nav = useNavigation();

  const handleAction = useCallback(
    (action: QuestPickerAction) => {
      switch (action.type) {
        case "select":
          nav.push("task-browser", {
            projectRoot,
            config: config as unknown,
            questId: action.questId ?? undefined,
            questTitle: action.questId === "" ? "Errands" : undefined,
            showBack: true,
            onExit,
            callbacks: callbacks as unknown,
          } as Record<string, unknown>);
          break;
        case "plan":
          if (callbacks?.onPlan) {
            callbacks.onPlan(action.questId).then(() => {
              // After plan flow completes, replace back to quest-picker
              nav.replace("quest-picker", {
                projectRoot,
                config: config as unknown,
                onExit,
                callbacks: callbacks as unknown,
              } as Record<string, unknown>);
            });
          } else {
            // Fallback: navigate to task-browser (quest-scoped)
            nav.push("task-browser", {
              projectRoot,
              config: config as unknown,
              questId: action.questId,
              showBack: true,
              onExit,
              callbacks: callbacks as unknown,
            } as Record<string, unknown>);
          }
          break;
        case "genesis":
          if (callbacks?.onGenesis) {
            callbacks.onGenesis(action.vision).then(() => {
              nav.replace("quest-picker", {
                projectRoot,
                config: config as unknown,
                onExit,
                callbacks: callbacks as unknown,
              } as Record<string, unknown>);
            });
          }
          break;
        case "errand":
          if (callbacks?.onErrand) {
            callbacks.onErrand(action.spec).then(() => {
              nav.replace("quest-picker", {
                projectRoot,
                config: config as unknown,
                onExit,
                callbacks: callbacks as unknown,
              } as Record<string, unknown>);
            });
          }
          break;
        case "wishlist":
          if (callbacks?.onWishlist) {
            callbacks.onWishlist().then(() => {
              nav.replace("quest-picker", {
                projectRoot,
                config: config as unknown,
                onExit,
                callbacks: callbacks as unknown,
              } as Record<string, unknown>);
            });
          }
          break;
        case "onboarding":
          if (callbacks?.onOnboarding) {
            callbacks.onOnboarding().then(() => {
              nav.replace("quest-picker", {
                projectRoot,
                config: config as unknown,
                onExit,
                callbacks: callbacks as unknown,
              } as Record<string, unknown>);
            });
          } else {
            nav.push("onboarding", {
              projectRoot,
              config: config as unknown,
            } as Record<string, unknown>);
          }
          break;
        case "quit":
          onExit();
          break;
      }
    },
    [nav, projectRoot, config, onExit, callbacks]
  );

  return (
    <QuestPickerApp
      projectRoot={projectRoot}
      config={config}
      onAction={handleAction}
    />
  );
}

// ---------------------------------------------------------------------------
// Standalone Launcher
// ---------------------------------------------------------------------------

/**
 * Run the quest picker as a standalone Ink instance.
 * Returns the user's chosen action.
 */
export function runQuestPickerInk(
  opts: RunQuestPickerOptions
): Promise<QuestPickerAction> {
  const { projectRoot, config } = opts;

  return new Promise<QuestPickerAction>((resolve) => {
    let instance: ReturnType<typeof render>;

    const handleAction = (action: QuestPickerAction) => {
      instance.unmount();
      resolve(action);
    };

    process.stdin.resume(); // keep event loop alive between renders
    instance = render(
      <QuestPickerApp
        projectRoot={projectRoot}
        config={config}
        onAction={handleAction}
      />,
      { exitOnCtrlC: false, stdin: getStableStdin() }
    );
  });
}
