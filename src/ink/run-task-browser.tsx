/**
 * run-task-browser.tsx — Standalone launcher for the TaskBrowserView.
 *
 * Creates and destroys its own Ink render instance, returning a Promise
 * that resolves with the user's action (launch, quit, back, errand, etc.).
 *
 * Manages all data loading (tasks, archive, graph, session, usage) and
 * state (selection, sort, concurrency, hide-done) internally — the
 * TaskBrowserView is a pure view component.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getStableStdin } from "./bun-stdin";
import { render, Box } from "ink";
import { useNavigation } from "./router";
import { useTerminalSize } from "./use-terminal-size";
import { TaskBrowserView, type TaskNode } from "./task-browser";
import { TaskEditor } from "./task-editor";
import { buildTaskGraph, sortStreams, flattenStreams, type Stream } from "./task-graph";
import { loadTasks, getDoneTaskIds, loadArchive, areDependenciesMet } from "../lib/tasks";
import { PRIORITY_ORDER } from "../lib/task-schema";
import { loadTUISession, saveTUISession, type SortField, type TUISession } from "../lib/tui-session";
import { saveTaskToStore, saveTaskToArchive, removeTaskFromStore, loadTasksFromStore, saveAllTasksToStore } from "../lib/task-store";
import { loadUsageRecords, totalUsage, groupBy as groupUsageBy } from "../lib/token-usage";
import type { UsageTotals } from "../lib/token-usage";
import type { WomboConfig, } from "../config";
import { WOMBO_DIR } from "../config";
import type { DaemonAgentState } from "../daemon/protocol";
import type { ErrandSpec } from "../lib/errand-planner";
import type { TuiAppCallbacks } from "./run-tui-app";

// ---------------------------------------------------------------------------
// Sort field cycle order
// ---------------------------------------------------------------------------

const SORT_FIELDS: SortField[] = ["priority", "status", "name", "effort", "stream"];

// Concurrency levels for cycling
const CONCURRENCY_LEVELS = [0, 1, 2, 3, 5, 8, 10, 15, 20];

// Priority cycle array
const PRIORITIES = ["critical", "high", "medium", "low", "wishlist"] as const;

// ---------------------------------------------------------------------------
// Action Type
// ---------------------------------------------------------------------------

export type TaskBrowserAction =
  | { type: "errand"; spec: ErrandSpec }
  | { type: "back" }
  | { type: "switchToMonitor" }
  | { type: "wishlist" }
  | { type: "quit" };

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RunTaskBrowserOptions {
  projectRoot: string;
  config: WomboConfig;
  /** If set, filter to only tasks belonging to this quest */
  questId?: string | null;
  /** Human-readable quest title for header display */
  questTitle?: string;
  /** Task IDs belonging to the selected quest (for filtering) */
  questTaskIds?: string[];
  /** Whether a wave is currently running (affects Tab behavior) */
  hasRunningWave?: boolean;
  /** Whether to show the Back action (Escape) */
  showBack?: boolean;
}

// ---------------------------------------------------------------------------
// Stateful Wrapper Component
// ---------------------------------------------------------------------------

function TaskBrowserApp({
  projectRoot,
  config,
  questId,
  questTitle,
  questTaskIds,
  hasRunningWave,
  showBack,
  onAction,
  callbacks,
}: RunTaskBrowserOptions & {
  onAction: (action: TaskBrowserAction) => void;
  callbacks?: TuiAppCallbacks;
}) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [displayNodes, setDisplayNodes] = useState<TaskNode[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hideDone, setHideDone] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [taskUsage, setTaskUsage] = useState<Map<string, UsageTotals>>(new Map());
  const [agentStates, setAgentStates] = useState<Map<string, DaemonAgentState>>(new Map());

  // Session state (sort prefs only — concurrency lives on the daemon)
  const sessionRef = useRef<TUISession>(loadTUISession(projectRoot));
  const [sortBy, setSortBy] = useState<SortField>(sessionRef.current.sortBy);

  // Concurrency — read initial value from daemon-state.json; synced by poll below.
  // maxConcurrentOverride holds a pending value set by the user that hasn't yet been
  // confirmed by the daemon (prevents the poll loop from reverting it immediately).
  const [maxConcurrent, setMaxConcurrent] = useState<number>(() => {
    const stateFile = resolve(projectRoot, WOMBO_DIR, "daemon-state.json");
    try {
      if (existsSync(stateFile)) {
        const data = JSON.parse(readFileSync(stateFile, "utf8"));
        return data.scheduler?.maxConcurrent ?? 4;
      }
    } catch { /* fallback */ }
    return 4;
  });
  const maxConcurrentOverride = useRef<number | null>(null);

  // Quest filter set
  const questIdSet = useRef<Set<string> | null>(
    questTaskIds ? new Set(questTaskIds) : null
  );

  // Load data
  const loadData = useCallback(() => {
    const tasksData = loadTasks(projectRoot, config);
    const archiveData = loadArchive(projectRoot, config);
    const done = getDoneTaskIds(tasksData, archiveData.tasks);

    let tasks = tasksData.tasks;
    if (questIdSet.current) {
      tasks = tasks.filter((t) => questIdSet.current!.has(t.id));
    } else if (questId === "") {
      tasks = tasks.filter((t) => !(t as any).quest);
    } else if (questId) {
      tasks = tasks.filter((t) => (t as any).quest === questId);
    }

    setAllTasks(tasks);
    setDoneIds(done);

    const built = buildTaskGraph(tasks, done);
    setStreams(built);

    // Restore selection from session, pruning stale IDs
    const validIds = new Set(tasks.map((t) => t.id));
    const restored = new Set(
      sessionRef.current.selected.filter((id) => validIds.has(id))
    );
    setSelectedIds(restored);

    // Load token usage
    try {
      const records = loadUsageRecords(projectRoot);
      if (records.length > 0) {
        setTaskUsage(groupUsageBy(records, "task_id"));
      }
    } catch {
      // Non-critical
    }

    return { built, done };
  }, [projectRoot, config]);

  // Build display nodes whenever streams, sort, or hideDone change
  useEffect(() => {
    const sorted = sortStreams(streams, sortBy, sessionRef.current.sortOrder);
    setDisplayNodes(flattenStreams(sorted, hideDone));
  }, [streams, sortBy, hideDone]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll daemon-state.json for live agent states + concurrency sync
  useEffect(() => {
    const poll = () => {
      const stateFile = resolve(projectRoot, WOMBO_DIR, "daemon-state.json");
      if (!existsSync(stateFile)) return;
      try {
        const raw = readFileSync(stateFile, "utf8");
        const data = JSON.parse(raw);
        const map = new Map<string, DaemonAgentState>();
        for (const agent of (data.agents ?? [])) {
          map.set(agent.featureId, agent as DaemonAgentState);
        }
        setAgentStates(map);
        // Keep local concurrency display in sync with the daemon's actual setting.
        // If the user just changed concurrency, don't revert until daemon confirms it.
        const daemonMax = data.scheduler?.maxConcurrent;
        if (daemonMax !== undefined) {
          if (maxConcurrentOverride.current !== null) {
            // Override is pending — clear it once daemon catches up
            if (daemonMax === maxConcurrentOverride.current) {
              maxConcurrentOverride.current = null;
            }
            // Either way, display the override value (not the stale daemon value)
            setMaxConcurrent(maxConcurrentOverride.current ?? daemonMax);
          } else {
            setMaxConcurrent(daemonMax);
          }
        }
      } catch { /* non-fatal */ }
    };
    poll(); // immediate
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [projectRoot]);

  // Save session helper
  const saveSession = useCallback(() => {
    sessionRef.current = {
      ...sessionRef.current,
      selected: [...selectedIds],
      sortBy,
      lastView: "browser",
    };
    saveTUISession(projectRoot, sessionRef.current);
  }, [projectRoot, selectedIds, sortBy]);

  // Computed values
  const totalTaskCount = allTasks.length;
  const doneCount = allTasks.filter((t) => t.status === "done").length;
  // Count tasks that are queued for the daemon (status === "planned")
  const readyCount = allTasks.filter((t) => t.status === "planned").length;

  // --- Handlers ---

  /** Toggle a single task between backlog (parked) and planned (queued for daemon). */
  const handleToggle = useCallback(() => {
    const node = displayNodes[selectedIndex];
    if (!node) return;
    const task = node.task;
    // Only toggle tasks that can be queued (backlog or planned, not running/done)
    if (task.status !== "backlog" && task.status !== "planned") return;
    task.status = task.status === "planned" ? "backlog" : "planned";
    saveTaskToStore(projectRoot, config, task);
    if (task.status === "planned") {
      callbacks?.onTasksPlanned?.();
    }
    loadData();
  }, [displayNodes, selectedIndex, projectRoot, config, loadData, callbacks]);

  /** Toggle all visible tasks in the current stream between backlog and planned. */
  const handleToggleStream = useCallback(() => {
    if (!displayNodes[selectedIndex]) return;
    const streamId = displayNodes[selectedIndex].streamId;
    const streamNodes = displayNodes.filter(
      (n) => n.streamId === streamId && (n.task.status === "backlog" || n.task.status === "planned")
    );
    const allPlanned = streamNodes.every((n) => n.task.status === "planned");
    for (const n of streamNodes) {
      n.task.status = allPlanned ? "backlog" : "planned";
      saveTaskToStore(projectRoot, config, n.task);
    }
    if (!allPlanned) {
      callbacks?.onTasksPlanned?.();
    }
    loadData();
  }, [displayNodes, selectedIndex, projectRoot, config, loadData, callbacks]);

  /** Toggle all visible backlog/planned tasks. */
  const handleToggleAll = useCallback(() => {
    const toggleable = displayNodes.filter(
      (n) => n.task.status === "backlog" || n.task.status === "planned"
    );
    const allPlanned = toggleable.every((n) => n.task.status === "planned");
    const newStatus = allPlanned ? "backlog" : "planned";

    // Mutate toggled tasks in memory
    const toggleableIds = new Set(toggleable.map((n) => n.task.id));
    for (const n of toggleable) {
      n.task.status = newStatus;
    }

    // Batch write: load full task set, apply mutations, write once
    const fullData = loadTasksFromStore(projectRoot, config);
    for (const task of fullData.tasks) {
      if (toggleableIds.has(task.id)) {
        task.status = newStatus;
      }
    }
    saveAllTasksToStore(projectRoot, config, fullData);

    if (!allPlanned) {
      callbacks?.onTasksPlanned?.();
    }
    loadData();
  }, [displayNodes, projectRoot, config, loadData, callbacks]);

  const handleCycleSort = useCallback(() => {
    setSortBy((prev) => {
      const idx = SORT_FIELDS.indexOf(prev);
      return SORT_FIELDS[(idx + 1) % SORT_FIELDS.length];
    });
  }, []);

  const handleChangePriority = useCallback(
    (delta: number) => {
      const node = displayNodes[selectedIndex];
      if (!node) return;
      const currentIdx = PRIORITIES.indexOf(node.task.priority as any);
      if (currentIdx < 0) return;
      const newIdx = Math.max(0, Math.min(PRIORITIES.length - 1, currentIdx + delta));
      if (newIdx === currentIdx) return;
      node.task.priority = PRIORITIES[newIdx];
      saveTaskToStore(projectRoot, config, node.task);
      // Force re-render by reloading
      loadData();
    },
    [displayNodes, selectedIndex, projectRoot, config, loadData]
  );

  const handleToggleDone = useCallback(() => {
    setHideDone((prev) => !prev);
  }, []);

  const handleCycleConcurrency = useCallback(() => {
    const prev = maxConcurrent;
    const idx = CONCURRENCY_LEVELS.indexOf(prev);
    // If the current value isn't in the list, find the nearest slot above it
    const safeIdx = idx >= 0 ? idx : CONCURRENCY_LEVELS.findIndex(v => v > prev);
    const nextIdx = (safeIdx >= 0 ? safeIdx + 1 : 0) % CONCURRENCY_LEVELS.length;
    const next = CONCURRENCY_LEVELS[nextIdx];
    maxConcurrentOverride.current = next;
    setMaxConcurrent(next);
    callbacks?.onSetConcurrency?.(next);
  }, [maxConcurrent, callbacks]);

  const handleQuit = useCallback(() => {
    saveSession();
    if (showBack && questId) {
      onAction({ type: "back" });
    } else {
      onAction({ type: "quit" });
    }
  }, [saveSession, showBack, questId, onAction]);

  const handleBack = useCallback(() => {
    if (showBack) {
      saveSession();
      onAction({ type: "back" });
    }
  }, [showBack, saveSession, onAction]);

  const handleSwitchToMonitor = useCallback(() => {
    if (hasRunningWave) {
      saveSession();
      onAction({ type: "switchToMonitor" });
    } else {
      // No wave running: Tab cycles sort
      handleCycleSort();
    }
  }, [hasRunningWave, saveSession, onAction, handleCycleSort]);

  const handleErrand = useCallback(() => {
    saveSession();
    onAction({ type: "errand", spec: { description: "" } });
  }, [saveSession, onAction]);

  const handleArchiveDone = useCallback(() => {
    // Archive all done/cancelled tasks in the current view.
    const candidates = allTasks.filter(
      (t) => t.status === "done" || t.status === "cancelled"
    );
    for (const task of candidates) {
      saveTaskToArchive(projectRoot, config, task);
      removeTaskFromStore(projectRoot, config, task.id);
    }
    loadData();
  }, [allTasks, projectRoot, config, loadData]);

  const handleDeleteCurrent = useCallback(() => {
    // Remove the task under the cursor regardless of status (no queuing needed).
    const node = displayNodes[selectedIndex];
    if (!node) return;
    saveTaskToArchive(projectRoot, config, node.task);
    removeTaskFromStore(projectRoot, config, node.task.id);
    loadData();
  }, [displayNodes, selectedIndex, projectRoot, config, loadData]);

  const handleWishlist = useCallback(() => {
    saveSession();
    onAction({ type: "wishlist" });
  }, [saveSession, onAction]);

  const handleRetry = useCallback(() => {
    const node = displayNodes[selectedIndex];
    if (!node) return;
    const task = node.task;
    task.status = "planned";
    task.started_at = null;
    task.ended_at = null;
    saveTaskToStore(projectRoot, config, task);
    // Optimistically clear the stale agent state so the display shows "planned" immediately
    // (agentStates poll runs every 1s — without this the display stays stuck on "FAIL")
    setAgentStates(prev => {
      const next = new Map(prev);
      next.delete(task.id);
      return next;
    });
    // Tell the daemon to re-queue this agent (handles submittedTasks + retry count reset)
    callbacks?.onRetryAgent?.(task.id);
    callbacks?.onTasksPlanned?.();
    loadData();
  }, [displayNodes, selectedIndex, projectRoot, config, loadData, callbacks]);

  const handleEdit = useCallback(() => {
    if (displayNodes[selectedIndex]) setShowEditor(true);
  }, [displayNodes, selectedIndex]);

  const handleEditorConfirm = useCallback((updated: any) => {
    saveTaskToStore(projectRoot, config, updated);
    setShowEditor(false);
    loadData();
  }, [projectRoot, config, loadData]);

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false);
  }, []);

  const { columns, rows } = useTerminalSize();
  const editNode = showEditor ? displayNodes[selectedIndex] : null;

  return (
    <>
    <TaskBrowserView
      nodes={displayNodes}
      selectedIndex={selectedIndex}
      selectedIds={selectedIds}
      sortBy={sortBy}
      maxConcurrent={maxConcurrent}
      hideDone={hideDone}
      totalTaskCount={totalTaskCount}
      doneCount={doneCount}
      readyCount={readyCount}
      taskUsage={taskUsage}
      questTitle={questTitle}
      hasRunningWave={hasRunningWave}
      agentStates={agentStates}
      onSelectionChange={setSelectedIndex}
      onToggle={handleToggle}
      onToggleStream={handleToggleStream}
      onToggleAll={handleToggleAll}
      onCycleSort={handleCycleSort}
      onChangePriority={handleChangePriority}
      onToggleDone={handleToggleDone}
      onCycleConcurrency={handleCycleConcurrency}
      onQuit={handleQuit}
      onBack={handleBack}
      onSwitchToMonitor={hasRunningWave ? handleSwitchToMonitor : undefined}
      onErrand={handleErrand}
      onArchiveDone={handleArchiveDone}
      onDeleteCurrent={handleDeleteCurrent}
      onWishlist={handleWishlist}
      onEdit={handleEdit}
      onRetry={handleRetry}
      isActive={!showEditor}
    />
    {editNode && (
      <Box
        position="absolute"
        width={columns}
        height={rows}
        alignItems="center"
        justifyContent="center"
      >
        <TaskEditor
          task={editNode.task}
          onConfirm={handleEditorConfirm}
          onCancel={handleEditorCancel}
        />
      </Box>
    )}
    </>
  );
}

// ---------------------------------------------------------------------------
// TaskBrowserScreen — router-compatible screen component
// ---------------------------------------------------------------------------

/**
 * Props received when TaskBrowserScreen is used inside a ScreenRouter.
 * Superset of RunTaskBrowserOptions plus routing-specific extras.
 */
export interface TaskBrowserScreenProps {
  projectRoot: string;
  config: WomboConfig;
  questId?: string | null;
  questTitle?: string;
  questTaskIds?: string[];
  hasRunningWave?: boolean;
  showBack?: boolean;
  /** Called when the user quits the task browser entirely. */
  onExit: () => void;
  /**
   * Optional imperative callbacks for complex async flows (errand, wishlist,
   * monitor) passed from tui.ts via TuiApp.
   */
  callbacks?: TuiAppCallbacks;
}

/**
 * TaskBrowserScreen — a ScreenRouter-compatible screen component.
 *
 * Wraps TaskBrowserApp so it can live inside the unified TuiApp ScreenRouter.
 * Navigation (back to quest-picker, switchToMonitor, errand, quit) is handled
 * via useNavigation() push/pop/replace rather than onAction() callbacks.
 *
 * Exported for use in TuiApp screen map and for testing.
 */
export function TaskBrowserScreen({
  projectRoot,
  config,
  questId,
  questTitle,
  questTaskIds,
  hasRunningWave,
  showBack,
  onExit,
  callbacks,
}: TaskBrowserScreenProps): React.ReactElement {
  const nav = useNavigation();

  const handleAction = useCallback(
    (action: TaskBrowserAction) => {
      switch (action.type) {
        case "back":
          nav.pop();
          break;
        case "switchToMonitor":
          if (callbacks?.onShowMonitor) {
            callbacks.onShowMonitor().then(() => {
              // After detaching from monitor, stay on task-browser
            });
          } else {
            nav.push("daemon-monitor", {
              projectRoot,
              config: config as unknown,
              onExit,
            } as Record<string, unknown>);
          }
          break;
        case "errand":
          if (callbacks?.onErrand) {
            callbacks.onErrand(action.spec).then(() => {
              // After errand flow, stay on task-browser so user sees new tasks
            });
          }
          break;
        case "wishlist":
          if (callbacks?.onWishlist) {
            callbacks.onWishlist().then(() => {
              // After wishlist flow, stay on task-browser
            });
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
    <TaskBrowserApp
      projectRoot={projectRoot}
      config={config}
      questId={questId}
      questTitle={questTitle}
      questTaskIds={questTaskIds}
      hasRunningWave={hasRunningWave}
      showBack={showBack}
      onAction={handleAction}
      callbacks={callbacks}
    />
  );
}

// ---------------------------------------------------------------------------
// Standalone Launcher
// ---------------------------------------------------------------------------

/**
 * Run the task browser as a standalone Ink instance.
 * Returns the user's chosen action.
 */
export function runTaskBrowserInk(
  opts: RunTaskBrowserOptions
): Promise<TaskBrowserAction> {
  return new Promise<TaskBrowserAction>((resolve) => {
    let instance: ReturnType<typeof render>;

    const handleAction = (action: TaskBrowserAction) => {
      instance.unmount();
      resolve(action);
    };

    process.stdin.resume(); // keep event loop alive between renders
    instance = render(
      <TaskBrowserApp
        {...opts}
        onAction={handleAction}
      />,
      { exitOnCtrlC: false, stdin: getStableStdin() }
    );
  });
}
