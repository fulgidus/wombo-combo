/**
 * quest-picker.tsx — Ink QuestPickerView component.
 *
 * Declarative React component. The parent manages data loading, quest operations, and
 * selected index; this component handles rendering and keybind dispatch.
 *
 * Layout:
 *   +-----------------------------------------------------------+
 *   | WOMBO-COMBO Quest Picker  | 4 quests                      |
 *   +---------------------------+-------------------------------+
 *   | > All Tasks (42)          | Quest: auth-overhaul           |
 *   |   auth-overhaul   ACTV    | Status: active                 |
 *   |   search-api      DRFT    | Priority: high                 |
 *   |   perf-optim      PAUS    | Tasks: 8 (3 done, 62%)         |
 *   |   ui-redesign     PLAN    | Goal: Replace basic auth...    |
 *   +---------------------------+-------------------------------+
 *   | Enter:select  C:create  Q:quit                            |
 *   +-----------------------------------------------------------+
 *
 * Keybinds are dispatched via callback props — the parent decides
 * what each action does (load data, navigate, etc.).
 */

import React from "react";
import { Box, Text } from "ink";
import { getQuestTaskIds, type Quest } from "../lib/quest";
import type { Task } from "../lib/tasks";
import type { UsageTotals } from "../lib/token-usage";
import { formatTokenCount } from "./usage-overlay";
import {
  QUEST_STATUS_COLORS,
  QUEST_STATUS_ABBREV,
  TASK_PRIORITY_COLORS,
  progressBar,
} from "./tui-constants";
import { useTerminalSize } from "./use-terminal-size";
import { useScreenInput } from "./esc-menu";
import { useI18n } from "./i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestSummary {
  quest: Quest;
  totalTasks: number;
  doneTasks: number;
  completionPct: number;
}

/**
 * Build a quest's summary from active AND archived tasks. Finished quests
 * have their tasks moved to the archive, so counting only active tasks made
 * completed quests look unplanned.
 */
export function summarizeQuest(
  quest: Quest,
  activeTasks: Task[],
  archivedTasks: Task[],
  doneIds: Set<string>,
): QuestSummary {
  const questTids = getQuestTaskIds(quest.id, [...activeTasks, ...archivedTasks]);
  const totalTasks = questTids.length;
  const doneTasks = questTids.filter((id) => doneIds.has(id)).length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  return { quest, totalTasks, doneTasks, completionPct };
}

export interface QuestPickerViewProps {
  /** Quest summaries to display. */
  quests: QuestSummary[];
  /** Total number of tasks across all quests. */
  totalTaskCount: number;
  /** Currently selected index (0 = "All Tasks", 1 = "Errands", 2+ = quest). */
  selectedIndex: number;
  /** Called when Enter/Space is pressed on the selected item. */
  onSelect: (questId: string | null) => void;
  /** Called when the user presses Q or Ctrl+C. */
  onQuit: () => void;
  /** Called when up/down navigation changes the selection. */
  onSelectionChange: (index: number) => void;
  /** Per-quest token usage data. */
  questUsage?: Map<string, UsageTotals>;
  /** Overall usage totals (for All Tasks detail). */
  overallUsage?: UsageTotals | null;
  /** Whether dev-mode key hints are shown. */
  devMode?: boolean;
  /** Called when 'c' is pressed (create quest). */
  onCreate?: () => void;
  /** Called when 'a' is pressed (activate/pause quest). */
  onToggleActive?: () => void;
  /** Called when 'p' is pressed (plan quest). */
  onPlan?: () => void;
  /** Called when 'g' is pressed (genesis). */
  onGenesis?: () => void;
  /** Called when 'e' is pressed (errand). */
  onErrand?: () => void;
  /** Called when 'w' is pressed (wishlist). */
  onWishlist?: () => void;
  /** Called when 'o' is pressed (onboarding). */
  onOnboarding?: () => void;
  /** Called when 'd' is pressed (delete quest). */
  onDelete?: () => void;
  /** Called when 'f' is pressed (seed fake tasks, devMode only). */
  onSeedFake?: () => void;
  /** Count of tasks without a quest assignment (errands). */
  errandCount?: number;
  /** When false, keyboard input is disabled (e.g. while an overlay is open). */
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header({
  questCount,
  activeCount,
  totalTaskCount,
}: {
  questCount: number;
  activeCount: number;
  totalTaskCount: number;
}): React.ReactElement {
  const t = useI18n();
  return (
    <Box flexDirection="column" height={2}>
      <Box>
        <Text>{t("questPicker.quests", { count: questCount })}</Text>
        {activeCount > 0 && (
          <>
            <Text dimColor>  |  </Text>
            <Text color="green">{activeCount}</Text>
            <Text> {t("questPicker.active")}</Text>
          </>
        )}
        <Text dimColor>  |  </Text>
        <Text>{totalTaskCount}</Text>
        <Text> {t("questPicker.totalTasks")}</Text>
      </Box>
      <Text dimColor>
        {t("questPicker.hint")}
      </Text>
    </Box>
  );
}

function QuestListItem({
  summary,
  isSelected,
}: {
  summary: QuestSummary;
  isSelected: boolean;
}): React.ReactElement {
  const { quest, totalTasks, doneTasks, completionPct } = summary;
  const isEmpty = totalTasks === 0;

  // Status badge
  const sColor = isEmpty ? "gray" : (QUEST_STATUS_COLORS[quest.status] ?? "white");
  const sAbbr = QUEST_STATUS_ABBREV[quest.status] ?? quest.status.slice(0, 4).toUpperCase();

  // Priority dot
  const pColor = isEmpty ? "gray" : (TASK_PRIORITY_COLORS[quest.priority] ?? "white");

  // Task info
  const taskInfo = isEmpty ? "(needs planning)" : `${doneTasks}/${totalTasks}`;

  // Build a compact single-line string to avoid wrapping issues
  const prefix = isSelected ? "▸ " : "  ";
  const dot = "●";

  return (
    <Text>
      <Text color={isSelected ? "blue" : undefined} bold={isSelected}>{prefix}</Text>
      <Text color={pColor}>{dot}</Text>
      <Text> </Text>
      <Text color={sColor as any}>{sAbbr}</Text>
      <Text> </Text>
      <Text color={isEmpty ? "gray" : undefined}>{quest.title}</Text>
      <Text> </Text>
      <Text color={isEmpty ? "magenta" : "gray"}>{taskInfo}</Text>
    </Text>
  );
}

function AllTasksItem({
  totalTaskCount,
  isSelected,
}: {
  totalTaskCount: number;
  isSelected: boolean;
}): React.ReactElement {
  const t = useI18n();
  return (
    <Box>
      <Text color={isSelected ? "blue" : undefined} bold={isSelected}>
        {isSelected ? "▸ " : "  "}
      </Text>
      <Text color="cyan" bold>◆</Text>
      <Text bold> {t("questPicker.allTasks")}</Text>
      <Text dimColor> ({totalTaskCount})</Text>
    </Box>
  );
}

function AllTasksDetail({
  totalTaskCount,
  overallUsage,
}: {
  totalTaskCount: number;
  overallUsage?: UsageTotals | null;
}): React.ReactElement {
  const t = useI18n();
  /** "  Label:" padded to a fixed column so values align in any language. */
  const lbl = (key: string) => `  ${t(key)}:`.padEnd(14);
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{t("questPicker.allTasks")}</Text>
      <Text />
      <Text>  {t("questPicker.allTasksLine1")}</Text>
      <Text>  {t("questPicker.allTasksLine2")}</Text>
      <Text />
      <Text>  {t("questPicker.total", { count: totalTaskCount })}</Text>
      <Text />
      {overallUsage && (
        <Box flexDirection="column">
          <Text bold color="yellow">{t("questPicker.overallUsage")}</Text>
          <Text>{lbl("taskBrowser.detail.input")}<Text color="cyan">{formatTokenCount(overallUsage.input_tokens)}</Text></Text>
          <Text>{lbl("taskBrowser.detail.output")}<Text color="cyan">{formatTokenCount(overallUsage.output_tokens)}</Text></Text>
          {overallUsage.cache_read > 0 && (
            <Text>{lbl("taskBrowser.detail.cacheRead")}<Text dimColor>{formatTokenCount(overallUsage.cache_read)}</Text></Text>
          )}
          {overallUsage.reasoning_tokens > 0 && (
            <Text>{lbl("taskBrowser.detail.reasoning")}<Text color="magenta">{formatTokenCount(overallUsage.reasoning_tokens)}</Text></Text>
          )}
          <Text>{lbl("taskBrowser.detail.total")}{formatTokenCount(overallUsage.total_tokens)}</Text>
          {overallUsage.total_cost > 0 && (
            <Text>{lbl("taskBrowser.detail.cost")}<Text color="yellow">{formatTokenCount(overallUsage.total_cost)}</Text></Text>
          )}
          <Text>{lbl("taskBrowser.detail.steps")}{overallUsage.record_count}</Text>
          <Text />
        </Box>
      )}
      <Text>  {t("questPicker.pressEnterBrowser", { key: "Enter" })}</Text>
    </Box>
  );
}

function ErrandsItem({
  errandCount,
  isSelected,
}: {
  errandCount: number;
  isSelected: boolean;
}): React.ReactElement {
  const t = useI18n();
  return (
    <Box>
      <Text color={isSelected ? "blue" : undefined} bold={isSelected}>
        {isSelected ? "▸ " : "  "}
      </Text>
      <Text color="yellow" bold>⚡</Text>
      <Text bold> {t("questPicker.errands")}</Text>
      <Text dimColor> ({errandCount})</Text>
    </Box>
  );
}

function ErrandsDetail({
  errandCount,
}: {
  errandCount: number;
}): React.ReactElement {
  const t = useI18n();
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">{t("questPicker.errands")}</Text>
      <Text />
      <Text>  {t("questPicker.errandsLine1")}</Text>
      <Text>  {t("questPicker.errandsLine2")}</Text>
      <Text />
      <Text>  {t("questPicker.total", { count: errandCount })}</Text>
      <Text />
      <Text>  {t("questPicker.pressEnterErrands", { key: "Enter" })}</Text>
    </Box>
  );
}

function QuestDetail({
  summary,
  usage,
}: {
  summary: QuestSummary;
  usage?: UsageTotals;
}): React.ReactElement {
  const t = useI18n();
  /** "  Label:" padded to a fixed column so values align in any language. */
  const lbl = (key: string) => `  ${t(key)}:`.padEnd(14);
  const tl = (key: string) => `  ${t(key)}:`.padEnd(11);
  const { quest, totalTasks, doneTasks, completionPct } = summary;
  const sColor = QUEST_STATUS_COLORS[quest.status] ?? "white";
  const pColor = TASK_PRIORITY_COLORS[quest.priority] ?? "white";

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Text bold>{quest.title}</Text>
      <Text />

      {/* Status & Priority */}
      <Text>{lbl("taskBrowser.detail.status")}<Text color={sColor as any}>{quest.status}</Text></Text>
      <Text>{lbl("taskBrowser.detail.priority")}<Text color={pColor as any}>{quest.priority}</Text></Text>
      <Text>{lbl("taskBrowser.detail.difficulty")}{quest.difficulty}</Text>
      <Text>{lbl("questPicker.hitl")}{quest.hitlMode}</Text>
      <Text />

      {/* Progress */}
      <Text bold>{t("questPicker.progress")}</Text>
      {totalTasks > 0 ? (
        <>
          <Text>  {t("questPicker.tasksDone", { done: doneTasks, total: totalTasks, pct: completionPct })}</Text>
          <Text>  [{progressBar(completionPct, 100, 20)}]</Text>
        </>
      ) : (
        <Text dimColor>  {t("questPicker.noTasksAssigned")}</Text>
      )}
      <Text />

      {/* Goal */}
      {quest.goal && (
        <>
          <Text bold>{t("cli.quest.show.goal")}</Text>
          <Text>  {quest.goal}</Text>
          <Text />
        </>
      )}

      {/* Branch */}
      <Text bold>{t("questPicker.branch")}</Text>
      <Text>  {quest.branch}</Text>
      <Text>  {t("questPicker.base", { branch: quest.baseBranch })}</Text>
      <Text />

      {/* Constraints */}
      {quest.constraints.add.length > 0 && (
        <>
          <Text bold>{t("questPicker.addedConstraints")}</Text>
          {quest.constraints.add.map((c, i) => (
            <Text key={`add-${i}`}>  + {c}</Text>
          ))}
          <Text />
        </>
      )}
      {quest.constraints.ban.length > 0 && (
        <>
          <Text bold>{t("questPicker.banned")}</Text>
          {quest.constraints.ban.map((b, i) => (
            <Text key={`ban-${i}`}>  - {b}</Text>
          ))}
          <Text />
        </>
      )}

      {/* Dependencies */}
      {quest.depends_on.length > 0 && (
        <>
          <Text bold>{t("questPicker.dependsOn")}</Text>
          {quest.depends_on.map((d, i) => (
            <Text key={`dep-${i}`}>  → {d}</Text>
          ))}
          <Text />
        </>
      )}

      {/* Notes */}
      {quest.notes.length > 0 && (
        <>
          <Text bold>{t("cli.quest.show.notes")}</Text>
          {quest.notes.map((n, i) => (
            <Text key={`note-${i}`}>  {n}</Text>
          ))}
          <Text />
        </>
      )}

      {/* Timeline */}
      <Text bold>{t("questPicker.timeline")}</Text>
      <Text>{tl("questPicker.created")}{quest.created_at.slice(0, 10)}</Text>
      {quest.started_at && <Text>{tl("questPicker.started")}{quest.started_at.slice(0, 10)}</Text>}
      {quest.ended_at && <Text>{tl("questPicker.ended")}{quest.ended_at.slice(0, 10)}</Text>}
      <Text />

      {/* Token Usage */}
      {usage && (
        <>
          <Text bold color="yellow">{t("taskBrowser.detail.tokenUsage")}</Text>
          <Text>{lbl("taskBrowser.detail.input")}<Text color="cyan">{formatTokenCount(usage.input_tokens)}</Text></Text>
          <Text>{lbl("taskBrowser.detail.output")}<Text color="cyan">{formatTokenCount(usage.output_tokens)}</Text></Text>
          {usage.cache_read > 0 && (
            <Text>{lbl("taskBrowser.detail.cacheRead")}<Text dimColor>{formatTokenCount(usage.cache_read)}</Text></Text>
          )}
          {usage.reasoning_tokens > 0 && (
            <Text>{lbl("taskBrowser.detail.reasoning")}<Text color="magenta">{formatTokenCount(usage.reasoning_tokens)}</Text></Text>
          )}
          <Text>{lbl("taskBrowser.detail.total")}{formatTokenCount(usage.total_tokens)}</Text>
          {usage.total_cost > 0 && (
            <Text>{lbl("taskBrowser.detail.cost")}<Text color="yellow">{formatTokenCount(usage.total_cost)}</Text></Text>
          )}
          <Text>{lbl("taskBrowser.detail.steps")}{usage.record_count}</Text>
        </>
      )}
    </Box>
  );
}

function StatusBar({
  devMode,
}: {
  devMode?: boolean;
}): React.ReactElement {
  const t = useI18n();
  return (
    <Box flexDirection="column" height={3}>
      <Box flexWrap="wrap">
        <Text bold>{t("waveMonitor.keys")}</Text>
        <Text>  </Text>
        <Text dimColor>Enter</Text>
        <Text> {t("questPicker.key.select")}</Text>
        <Text>  </Text>
        <Text dimColor>C</Text>
        <Text> {t("questPicker.key.create")}</Text>
        <Text>  </Text>
        <Text dimColor>E</Text>
        <Text> {t("taskBrowser.key.errand")}</Text>
        <Text>  </Text>
        <Text dimColor>P</Text>
        <Text> {t("questPicker.key.plan")}</Text>
        <Text>  </Text>
        <Text dimColor>G</Text>
        <Text> {t("questPicker.key.genesis")}</Text>
        <Text>  </Text>
        <Text dimColor>A</Text>
        <Text> {t("questPicker.key.activatePause")}</Text>
        <Text>  </Text>
        <Text dimColor>D</Text>
        <Text> {t("questPicker.key.delete")}</Text>
        <Text>  </Text>
        <Text dimColor>W</Text>
        <Text> {t("taskBrowser.key.wishlist")}</Text>
        <Text>  </Text>
        <Text dimColor>O</Text>
        <Text> {t("questPicker.key.onboarding")}</Text>
        {devMode && (
          <>
            <Text>  </Text>
            <Text dimColor>F</Text>
            <Text> {t("questPicker.key.seedFake")}</Text>
          </>
        )}
        <Text>  </Text>
        <Text dimColor>Q</Text>
        <Text> {t("waveMonitor.quit")}</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * QuestPickerView — a declarative quest picker component.
 *
 * Pure view: all data is passed in via props, all actions dispatched
 * via callbacks. The parent is responsible for loading quests,
 * computing summaries, and handling navigation.
 */
export function QuestPickerView(props: QuestPickerViewProps): React.ReactElement {
  const t = useI18n();
  const {
    quests,
    totalTaskCount,
    selectedIndex,
    onSelect,
    onQuit,
    onSelectionChange,
    questUsage,
    overallUsage,
    devMode,
    onCreate,
    onToggleActive,
    onPlan,
    onGenesis,
    onErrand,
    onWishlist,
    onOnboarding,
    onDelete,
    onSeedFake,
    errandCount = 0,
    isActive = true,
  } = props;

  // Total item count: "All Tasks" + "Errands" + quests
  const itemCount = 2 + quests.length;

  // Keyboard handling
  useScreenInput((input, key) => {
    // Quit
    if (input === "q") {
      onQuit();
      return;
    }

    // Navigate
    if ((key.downArrow || input === "j") && itemCount > 0) {
      const next = Math.min(selectedIndex + 1, itemCount - 1);
      onSelectionChange(next);
      return;
    }
    if ((key.upArrow || input === "k") && itemCount > 0) {
      const prev = Math.max(selectedIndex - 1, 0);
      onSelectionChange(prev);
      return;
    }

    // Select
    if (key.return) {
      if (selectedIndex === 0) {
        onSelect(null);    // All Tasks
      } else if (selectedIndex === 1) {
        onSelect("");      // Errands
      } else {
        const quest = quests[selectedIndex - 2];
        if (quest) onSelect(quest.quest.id);
      }
      return;
    }

    // Action keys
    if (input === "c") { onCreate?.(); return; }
    if (input === "a") { onToggleActive?.(); return; }
    if (input === "p") { onPlan?.(); return; }
    if (input === "g") { onGenesis?.(); return; }
    if (input === "e") { onErrand?.(); return; }
    if (input === "w") { onWishlist?.(); return; }
    if (input === "o") { onOnboarding?.(); return; }
    if (input === "d") { onDelete?.(); return; }
    if (input === "f" && devMode) { onSeedFake?.(); return; }
  }, { isActive });

  // Compute derived display data
  const questCount = quests.length;
  const activeCount = quests.filter((s) => s.quest.status === "active").length;

  // Determine what to show in the detail pane
  // index 0 = All Tasks, 1 = Errands, 2+ = quests
  const selectedQuest =
    selectedIndex >= 2 && selectedIndex - 2 < quests.length
      ? quests[selectedIndex - 2]
      : null;

  const selectedQuestUsage =
    selectedQuest && questUsage
      ? questUsage.get(selectedQuest.quest.id)
      : undefined;

  // Fill the entire terminal height for fullscreen rendering
  const { rows } = useTerminalSize();

  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      {/* Header */}
      <Header
        questCount={questCount}
        activeCount={activeCount}
        totalTaskCount={totalTaskCount}
      />

      {/* Main body: list + detail */}
      <Box flexGrow={1}>
        {/* Quest list (left pane) */}
        <Box flexDirection="column" width="50%" borderStyle="single" borderColor="gray">
          <AllTasksItem
            totalTaskCount={totalTaskCount}
            isSelected={selectedIndex === 0}
          />
          <ErrandsItem
            errandCount={errandCount}
            isSelected={selectedIndex === 1}
          />
          {quests.length > 0 && <Text dimColor>  ── {t("questPicker.questsDivider")} ──</Text>}
          {quests.map((summary, i) => (
            <QuestListItem
              key={summary.quest.id}
              summary={summary}
              isSelected={selectedIndex === i + 2}
            />
          ))}
          {quests.length === 0 && (
            <Text dimColor>  {t("questPicker.noQuests")}</Text>
          )}
        </Box>

        {/* Detail pane (right pane) */}
        <Box flexDirection="column" width="50%" borderStyle="single" borderColor="gray" paddingX={1}>
          {selectedIndex === 0 ? (
            <AllTasksDetail
              totalTaskCount={totalTaskCount}
              overallUsage={overallUsage}
            />
          ) : selectedIndex === 1 ? (
            <ErrandsDetail errandCount={errandCount} />
          ) : selectedQuest ? (
            <QuestDetail
              summary={selectedQuest}
              usage={selectedQuestUsage}
            />
          ) : (
            <Text dimColor>{t("questPicker.noItemSelected")}</Text>
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar devMode={devMode} />
    </Box>
  );
}
