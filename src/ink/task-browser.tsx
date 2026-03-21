/**
 * task-browser.tsx — Ink TaskBrowserView component.
 *
 * Replaces the neo-blessed TaskBrowser class with a declarative React
 * component. The parent manages data loading, task graph building,
 * session persistence, and selected state; this component handles
 * rendering and keybind dispatch.
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────┐
 *   │ WOMBO-COMBO Task Browser  │ 42 tasks │ 5 selected    │
 *   ├──────────────────────────────┬────────────────────────┤
 *   │ ☑ json-features-check  done │ Title: ...             │
 *   │ ☑ json-features-arch   done │ Status: backlog        │
 *   │   ☐ json-ops-commands  back │ Priority: high         │
 *   │ ── stream 2 ──              │ Effort: PT2H           │
 *   │ ☐ tdd-test-detection   done │ Depends on:            │
 *   ├──────────────────────────────┴────────────────────────┤
 *   │ Space:toggle  S:stream  O:sort  Q:quit               │
 *   └───────────────────────────────────────────────────────┘
 */

import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import type { Task } from "../lib/tasks";
import type { UsageTotals } from "../lib/token-usage";
import type { SortField } from "../lib/tui-session";
import type { DaemonAgentState } from "../daemon/protocol";
import type { AgentStatus } from "../lib/state";
import { formatTokenCount, formatCost } from "./usage-overlay";
import {
  TASK_STATUS_COLORS,
  TASK_STATUS_ABBREV,
  TASK_PRIORITY_COLORS,
} from "./tui-constants";
import { useTerminalSize } from "./use-terminal-size";

function agentStatusColor(status: AgentStatus): string {
  switch (status) {
    case "running": return "cyan";
    case "installing": return "yellow";
    case "completed": case "verified": return "blue";
    case "merged": return "green";
    case "failed": return "red";
    case "resolving_conflict": return "magenta";
    case "retry": return "yellow";
    default: return "gray";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A task node in the display tree with computed metadata.
 * The parent computes these from the dependency graph.
 */
export interface TaskNode {
  task: Task;
  /** Depth in the dependency chain (0 = leaf/no deps) */
  depth: number;
  /** ID of the stream (connected component) */
  streamId: string;
  /** Task IDs that depend on this task */
  dependedOnBy: string[];
  /** Whether all dependencies of this task are done */
  depsReady: boolean;
}

/** Priority abbreviations for display */
const PRIORITY_ABBREV: Record<string, string> = {
  critical: "CRIT",
  high: "HIGH",
  medium: "MED",
  low: "LOW",
  wishlist: "WISH",
};

export interface TaskBrowserViewProps {
  /** Flat ordered list of task nodes to display. */
  nodes: TaskNode[];
  /** Currently selected index. */
  selectedIndex: number;
  /** Set of selected task IDs (for checkboxes). */
  selectedIds: Set<string>;
  /** Current sort field. */
  sortBy: SortField;
  /** Max concurrent agents. */
  maxConcurrent: number;
  /** Whether done tasks are hidden. */
  hideDone: boolean;
  /** Total task count (may differ from nodes.length if hideDone). */
  totalTaskCount: number;
  /** Count of done tasks. */
  doneCount: number;
  /** Count of planned (queued for daemon) tasks. */
  readyCount: number;
  /** Per-task token usage data. */
  taskUsage?: Map<string, UsageTotals>;
  /** Quest title (if in quest-filtered mode). */
  questTitle?: string;
  /** Whether a wave is currently running. */
  hasRunningWave?: boolean;
  /** Live agent states from daemon-state.json, keyed by featureId (task id). */
  agentStates?: Map<string, DaemonAgentState>;

  // Callbacks
  onSelectionChange: (index: number) => void;
  onToggle: () => void;
  onToggleStream: () => void;
  onToggleAll: () => void;
  onCycleSort: () => void;
  onChangePriority: (delta: number) => void;
  onToggleDone: () => void;
  onCycleConcurrency: () => void;
  onQuit: () => void;
  onBack?: () => void;
  onSwitchToMonitor?: () => void;
  onErrand?: () => void;
  onArchiveDone?: () => void;
  onDeleteCurrent?: () => void;
  onWishlist?: () => void;
  onUsage?: () => void;
  onEdit?: () => void;
  onRetry?: () => void;
  /** When false, keyboard input is disabled (e.g. while an overlay is open). */
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header({
  totalTaskCount,
  displayedCount,
  selectedCount,
  doneCount,
  readyCount,
  sortBy,
  maxConcurrent,
  hideDone,
  questTitle,
  hasRunningWave,
}: {
  totalTaskCount: number;
  displayedCount: number;
  selectedCount: number;
  doneCount: number;
  readyCount: number;
  sortBy: SortField;
  maxConcurrent: number;
  hideDone: boolean;
  questTitle?: string;
  hasRunningWave?: boolean;
}): React.ReactElement {
  return (
    <Box flexDirection="column" height={2}>
      <Box>
        {hasRunningWave && (
          <>
            <Text bold color="yellow">⚡ WAVE RUNNING</Text>
            <Text dimColor>  |  </Text>
          </>
        )}
        <Text>{totalTaskCount}</Text>
        <Text> tasks</Text>
        {hideDone && (
          <>
            <Text> (</Text>
            <Text>{displayedCount}</Text>
            <Text> shown)</Text>
          </>
        )}
        <Text dimColor>  |  </Text>
        <Text color="green">{readyCount}</Text>
        <Text> ready</Text>
        <Text dimColor>  |  </Text>
        <Text>{doneCount}</Text>
        <Text dimColor> done</Text>
        {selectedCount > 0 && (
          <>
            <Text dimColor>  |  </Text>
            <Text color="cyan">{selectedCount}</Text>
            <Text> selected</Text>
          </>
        )}
      </Box>
      <Box>
        <Text dimColor>Sort: </Text>
        <Text color="yellow">{sortBy.padEnd(10)}</Text>
        <Text dimColor> | </Text>
        <Text>Concurrency: </Text>
        <Text color="yellow">{maxConcurrent === 0 ? "∞" : String(maxConcurrent)}</Text>
      </Box>
    </Box>
  );
}

function TaskListItem({
  node,
  isSelected,
  isChecked,
  agentState,
}: {
  node: TaskNode;
  isSelected: boolean;
  isChecked: boolean;
  agentState?: DaemonAgentState;
}): React.ReactElement {
  const { task, depth, depsReady } = node;

  // Checkbox — ☑ means "planned" (queued for daemon), ☐ means backlog
  const checkbox = isChecked ? "☑" : "☐";
  const checkColor = isChecked ? "cyan" : "gray";

  // Readiness indicator
  const readyIcon =
    task.status === "done"
      ? "✓"
      : depsReady
        ? "●"
        : "○";
  const readyColor =
    task.status === "done"
      ? "green"
      : depsReady
        ? "cyan"
        : "red";

  // Indent based on depth
  const indent = "  ".repeat(depth);

  // Status — show agent status if agent is active (not in final states)
  let sColor: string;
  let sAbbr: string;
  const finalStates = new Set(["merged", "failed"]);
  if (agentState && !finalStates.has(agentState.status)) {
    sColor = agentStatusColor(agentState.status);
    switch (agentState.status) {
      case "queued": sAbbr = "QUEUED"; break;
      case "installing": sAbbr = "SETUP"; break;
      case "running": sAbbr = "AGENT"; break;
      case "completed": sAbbr = "VERIF"; break;
      case "resolving_conflict": sAbbr = "MERGE"; break;
      case "retry": sAbbr = "RETRY"; break;
      case "verified": sAbbr = "VERIF"; break;
      case "merged": sAbbr = "DONE"; break;
      case "failed": sAbbr = "FAIL"; break;
    }
  } else if (agentState && agentState.status === "merged") {
    sColor = "green";
    sAbbr = "DONE";
  } else if (agentState && agentState.status === "failed") {
    sColor = "red";
    sAbbr = "FAIL";
  } else {
    sColor = TASK_STATUS_COLORS[task.status] ?? "white";
    sAbbr = TASK_STATUS_ABBREV[task.status] ?? task.status.slice(0, 4).toUpperCase();
  }

  // Activity hint (truncated, shown when agent is running)
  const activityHint =
    agentState?.status === "running" && agentState.activity
      ? agentState.activity.slice(0, 20)
      : null;

  // Priority
  const pColor = TASK_PRIORITY_COLORS[task.priority] ?? "white";
  const pAbbr = PRIORITY_ABBREV[task.priority] ?? task.priority.slice(0, 4).toUpperCase();

  return (
    <Text>
      <Text color={isSelected ? "blue" : undefined} bold={isSelected}>
        {isSelected ? "▸" : " "}
      </Text>
      <Text color={checkColor}>{checkbox}</Text>
      <Text> {indent}</Text>
      <Text color={readyColor}>{readyIcon}</Text>
      <Text> </Text>
      <Text>{task.id}</Text>
      {activityHint && (
        <Text dimColor> {activityHint}</Text>
      )}
      <Text> </Text>
      <Text color={pColor}>{pAbbr}</Text>
      <Text> </Text>
      <Text color={sColor} bold={agentState?.status === "running"}>{sAbbr}</Text>
    </Text>
  );
}

function TaskDetail({
  node,
  usage,
  agentState,
}: {
  node: TaskNode;
  usage?: UsageTotals;
  agentState?: DaemonAgentState;
}): React.ReactElement {
  const { task, streamId, depth, dependedOnBy, depsReady } = node;
  const sColor = TASK_STATUS_COLORS[task.status] ?? "white";
  const pColor = TASK_PRIORITY_COLORS[task.priority] ?? "white";

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Text bold>{task.title}</Text>
      <Text />

      {/* Basic info */}
      <Text>  Status:     <Text color={sColor}>{task.status}</Text></Text>
      <Text>  Priority:   <Text color={pColor}>{task.priority}</Text></Text>
      <Text>  Difficulty: {task.difficulty}</Text>
      <Text>  Effort:     {task.effort}</Text>
      <Text>  Completion: {task.completion}%</Text>
      <Text>  Deps ready: {depsReady ? <Text color="green">yes</Text> : <Text color="red">no</Text>}</Text>
      <Text>  Stream:     {streamId}</Text>
      <Text>  Depth:      {depth}</Text>
      <Text />

      {/* Dependencies */}
      {task.depends_on.length > 0 && (
        <>
          <Text bold>Dependencies:</Text>
          {task.depends_on.map((dep, i) => (
            <Text key={`dep-${i}`}>  → {dep}</Text>
          ))}
          <Text />
        </>
      )}

      {/* Depended on by */}
      {dependedOnBy.length > 0 && (
        <>
          <Text bold>Depended on by:</Text>
          {dependedOnBy.map((id, i) => (
            <Text key={`revdep-${i}`}>  → {id}</Text>
          ))}
          <Text />
        </>
      )}

      {/* Description */}
      {task.description && (
        <>
          <Text bold>Description:</Text>
          <Text>  {task.description}</Text>
          <Text />
        </>
      )}

      {/* Agent type */}
      {task.agent_type && (
        <>
          <Text bold>Agent: <Text>{task.agent_type}</Text></Text>
          <Text />
        </>
      )}

      {/* Token usage */}
      {usage && (
        <>
          <Text bold color="yellow">Token Usage:</Text>
          <Text>  Input:      <Text color="cyan">{formatTokenCount(usage.input_tokens)}</Text></Text>
          <Text>  Output:     <Text color="cyan">{formatTokenCount(usage.output_tokens)}</Text></Text>
          {usage.cache_read > 0 && (
            <Text>  Cache read: <Text dimColor>{formatTokenCount(usage.cache_read)}</Text></Text>
          )}
          {usage.reasoning_tokens > 0 && (
            <Text>  Reasoning:  <Text color="magenta">{formatTokenCount(usage.reasoning_tokens)}</Text></Text>
          )}
          <Text>  Total:      {formatTokenCount(usage.total_tokens)}</Text>
          {usage.total_cost > 0 && (
            <Text>  Cost:       <Text color="yellow">{formatCost(usage.total_cost)}</Text></Text>
          )}
          <Text>  Steps:      {usage.record_count}</Text>
          <Text />
        </>
      )}

      {/* Constraints */}
      {task.constraints.length > 0 && (
        <>
          <Text bold>Constraints:</Text>
          {task.constraints.map((c, i) => (
            <Text key={`c-${i}`}>  • {c}</Text>
          ))}
        </>
      )}

      {/* Agent section */}
      {agentState && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="cyan">── Agent ──</Text>
          <Box flexDirection="row" gap={1}>
            <Text dimColor>status</Text>
            <Text color={agentStatusColor(agentState.status)}>{agentState.status}</Text>
            {agentState.retries > 0 && <Text color="yellow"> (retry {agentState.retries}/{agentState.maxRetries})</Text>}
          </Box>
          {agentState.activity && (
            <Box>
              <Text dimColor>doing  </Text>
              <Text color="cyan" wrap="truncate-end">{agentState.activity}</Text>
            </Box>
          )}
          {agentState.error && (
            <Box>
              <Text dimColor>error  </Text>
              <Text color="red" wrap="wrap">{agentState.error.slice(0, 120)}</Text>
            </Box>
          )}
          {agentState.tokenUsage && (
            <Box flexDirection="row" gap={1}>
              <Text dimColor>tokens </Text>
              <Text>{agentState.tokenUsage.inputTokens + agentState.tokenUsage.outputTokens}</Text>
              {agentState.tokenUsage.totalCost > 0 && (
                <Text dimColor>(${agentState.tokenUsage.totalCost.toFixed(4)})</Text>
              )}
            </Box>
          )}
          {agentState.startedAt && (
            <Box>
              <Text dimColor>since  </Text>
              <Text dimColor>{new Date(agentState.startedAt).toLocaleTimeString()}</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function StatusBar({
  selectedCount,
  hideDone,
  hasRunningWave,
  hasBack,
  hasErrand,
  hasEdit,
  questId,
}: {
  selectedCount: number;
  hideDone: boolean;
  hasRunningWave?: boolean;
  hasBack?: boolean;
  hasErrand?: boolean;
  hasEdit?: boolean;
  questId?: boolean; // unused but kept for future use
}): React.ReactElement {
  return (
    <Box flexDirection="column" height={3}>
      <Box flexWrap="wrap">
        <Text bold>Keys:</Text>
        <Text>  </Text>
        <Text dimColor>Space</Text>
        <Text> plan/unplan</Text>
        <Text>  </Text>
        <Text dimColor>S</Text>
        <Text> stream</Text>
        <Text>  </Text>
        <Text dimColor>A</Text>
        <Text> all</Text>
        <Text>  </Text>
        <Text dimColor>+/-</Text>
        <Text> priority</Text>
        <Text>  </Text>
        <Text dimColor>D</Text>
        <Text> {hideDone ? "show" : "hide"} done</Text>
        <Text>  </Text>
        <Text dimColor>X</Text>
        <Text> archive done</Text>
        <Text>  </Text>
        <Text dimColor>Shift+X</Text>
        <Text> remove task</Text>
        <Text>  </Text>
        <Text dimColor>C</Text>
        <Text> concurrency</Text>
        {hasErrand && (
          <>
            <Text>  </Text>
            <Text dimColor>E</Text>
            <Text> errand</Text>
          </>
        )}
        <Text>  </Text>
        <Text dimColor>W</Text>
        <Text> wishlist</Text>
        <Text>  </Text>
        {hasEdit && (
          <>
            <Text>  </Text>
            <Text dimColor>R</Text>
            <Text> edit</Text>
          </>
        )}
        <Text>  </Text>
        <Text dimColor>T</Text>
        <Text> retry</Text>
        <Text>  </Text>
        <Text dimColor>U</Text>
        <Text> usage</Text>
        <Text>  </Text>
        <Text dimColor>O</Text>
        <Text> sort</Text>

        {hasRunningWave && (
          <>
            <Text>  </Text>
            <Text bold color="yellow">Tab</Text>
            <Text bold> monitor</Text>
          </>
        )}
        {hasBack && (
          <>
            <Text>  </Text>
            <Text dimColor>B/←</Text>
            <Text> back</Text>
          </>
        )}
        <Text>  </Text>
        <Text dimColor>Q</Text>
        <Text> quit</Text>
      </Box>
      <Box>
        {selectedCount > 0 ? (
          <Text>
            <Text color="green">{selectedCount}</Text>
            <Text> selected</Text>
          </Text>
        ) : (
          <Text dimColor>Space to plan/unplan tasks — daemon picks up planned tasks automatically</Text>
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * TaskBrowserView — a declarative task browser component.
 *
 * Pure view: all data is passed in via props, all actions dispatched
 * via callbacks. The parent is responsible for loading tasks, building
 * the dependency graph, managing session state, and handling launches.
 */
export function TaskBrowserView(props: TaskBrowserViewProps): React.ReactElement {
  const {
    nodes,
    selectedIndex,
    selectedIds,
    sortBy,
    maxConcurrent,
    hideDone,
    totalTaskCount,
    doneCount,
    readyCount,
    taskUsage,
    questTitle,
    hasRunningWave,
    agentStates,
    onSelectionChange,
    onToggle,
    onToggleStream,
    onToggleAll,
    onCycleSort,
    onChangePriority,
    onToggleDone,
    onCycleConcurrency,
    onQuit,
    onBack,
    onSwitchToMonitor,
    onErrand,
    onArchiveDone,
    onDeleteCurrent,
    onWishlist,
    onUsage,
    onEdit,
    onRetry,
    isActive = true,
  } = props;

  // Keyboard handling
  useInput((input, key) => {
    // Quit
    if (input === "q") {
      onQuit();
      return;
    }

    // Navigate
    if ((key.downArrow || input === "j") && nodes.length > 0) {
      const next = Math.min(selectedIndex + 1, nodes.length - 1);
      onSelectionChange(next);
      return;
    }
    if ((key.upArrow || input === "k") && nodes.length > 0) {
      const prev = Math.max(selectedIndex - 1, 0);
      onSelectionChange(prev);
      return;
    }

    // Back — b or Left Arrow (Escape is reserved for the global ESC menu)
    if (input === "b" || key.leftArrow) {
      onBack?.();
      return;
    }

    // Space — toggle selection
    if (input === " ") {
      onToggle();
      return;
    }

    // Action keys
    if (input === "s") { onToggleStream(); return; }
    if (input === "a") { onToggleAll(); return; }
    if (input === "o") { onCycleSort(); return; }
    if (input === "d") { onToggleDone(); return; }
    if (input === "c") { onCycleConcurrency(); return; }
    if (input === "e") { onErrand?.(); return; }
    if (input === "w") { onWishlist?.(); return; }
    if (input === "u") { onUsage?.(); return; }
    if (input === "r") { onEdit?.(); return; }
    if (input === "t") { onRetry?.(); return; }
    if (input === "x") { onArchiveDone?.(); return; }
    if (key.delete || input === "X") { onDeleteCurrent?.(); return; }
    if (input === "+" || input === "=") { onChangePriority(-1); return; }
    if (input === "-") { onChangePriority(1); return; }

    // Tab — switch to monitor or cycle sort
    if (key.tab) {
      if (hasRunningWave && onSwitchToMonitor) {
        onSwitchToMonitor();
      } else {
        onCycleSort();
      }
      return;
    }
  }, { isActive });

  // Derived values
  const selectedCount = selectedIds.size;
  const displayedCount = nodes.length;

  // Selected task detail
  const selectedNode = nodes[selectedIndex] ?? null;
  const selectedTaskUsage =
    selectedNode && taskUsage
      ? taskUsage.get(selectedNode.task.id)
      : undefined;

  // Fill the entire terminal height for fullscreen rendering
  const { rows } = useTerminalSize();

  // Scrolling viewport: chrome-top(1) + inner-header(3) + inner-statusbar(3) + chrome-bottom(1) + borders(2) = 10
  const listHeight = Math.max(1, rows - 10);

  // When the list needs scrolling, always reserve 2 rows for indicators so
  // the viewport size is stable and the scroll-offset formula stays correct.
  const fitsWithoutScroll = nodes.length <= listHeight;
  const visibleCount = fitsWithoutScroll ? nodes.length : Math.max(1, listHeight - 2);

  const scrollOffset = useMemo(() => {
    if (fitsWithoutScroll) return 0;
    const ideal = selectedIndex - Math.floor(visibleCount / 2);
    return Math.max(0, Math.min(ideal, nodes.length - visibleCount));
  }, [selectedIndex, nodes.length, visibleCount, fitsWithoutScroll]);

  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + visibleCount < nodes.length;
  const visibleNodes = nodes.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      {/* Header */}
      <Header
        totalTaskCount={totalTaskCount}
        displayedCount={displayedCount}
        selectedCount={selectedCount}
        doneCount={doneCount}
        readyCount={readyCount}
        sortBy={sortBy}
        maxConcurrent={maxConcurrent}
        hideDone={hideDone}
        questTitle={questTitle}
        hasRunningWave={hasRunningWave}
      />

      {/* Main body: list + detail */}
      <Box flexGrow={1}>
        {/* Task list (left pane, 60%) */}
        <Box flexDirection="column" width="60%" borderStyle="single" borderColor="gray">
          {canScrollUp && <Text dimColor>  ▲ {scrollOffset} more above</Text>}
          {visibleNodes.map((node, i) => (
            <TaskListItem
              key={node.task.id}
              node={node}
              isSelected={selectedIndex === scrollOffset + i}
              isChecked={node.task.status === "planned"}
              agentState={agentStates?.get(node.task.id)}
            />
          ))}
          {canScrollDown && (
            <Text dimColor>  ▼ {nodes.length - scrollOffset - visibleNodes.length} more below</Text>
          )}
          {nodes.length === 0 && (
            <Text dimColor>  No tasks found</Text>
          )}
        </Box>

        {/* Detail pane (right pane, 40%) */}
        <Box flexDirection="column" width="40%" borderStyle="single" borderColor="gray" paddingX={1}>
          {selectedNode ? (
            <TaskDetail
              node={selectedNode}
              usage={selectedTaskUsage}
              agentState={agentStates?.get(selectedNode.task.id)}
            />
          ) : (
            <Text dimColor>No task selected</Text>
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar
        selectedCount={selectedCount}
        hideDone={hideDone}
        hasRunningWave={hasRunningWave}
        hasBack={!!onBack}
        hasErrand={!!onErrand}
        hasEdit={!!onEdit}
        questId={!!questTitle}
      />
    </Box>
  );
}
