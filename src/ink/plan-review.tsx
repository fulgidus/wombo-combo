/**
 * plan-review.tsx — Plan review adapter for the ReviewList component.
 *
 * Maps `ProposedTask` (from quest-planner.ts) to `ReviewItem` and
 * builds a `ReviewListConfig` that drives the shared ReviewList component.
 *
 * Differences from genesis-review:
 *   - Tasks have `description` (textarea), quests have `goal` (textarea)
 *   - Tasks have `effort` (display-only string)
 *   - Tasks have flat `constraints`, `forbidden`, `references` (string[])
 *   - Tasks have optional `agent` string
 *   - No `hitl_mode` field
 *   - Edit fields: title, priority, difficulty, depends_on, description
 */

import React from "react";
import type {
  ReviewItem,
  ReviewListConfig,
  EditFieldDef,
  ReviewValidationIssue,
} from "./review-list-types";
import { ReviewList } from "./review-list";
import { t as defaultT, getLocaleT, useI18n, type TFunction } from "./i18n";
import type {
  ProposedTask,
  PlanResult,
  PlanValidationIssue,
} from "../lib/quest-planner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITIES = ["critical", "high", "medium", "low", "wishlist"];
const DIFFICULTIES = ["trivial", "easy", "medium", "hard", "very_hard"];

// ---------------------------------------------------------------------------
// Edit Field Definitions
// ---------------------------------------------------------------------------

/** Edit fields for plan review (task editing), labelled for the given locale. */
export function buildPlanEditFields(t: TFunction = defaultT): EditFieldDef[] {
  return [
    {
      key: "title",
      label: t("reviewField.title"),
      type: "text",
      hint: t("planReview.hint.title"),
    },
    {
      key: "priority",
      label: t("reviewField.priority"),
      type: "select",
      options: PRIORITIES.map((p) => ({ label: p, value: p })),
      hint: t("reviewField.hint.priority"),
    },
    {
      key: "difficulty",
      label: t("reviewField.difficulty"),
      type: "select",
      options: DIFFICULTIES.map((d) => ({ label: d, value: d })),
      hint: t("reviewField.hint.difficulty"),
    },
    {
      key: "depends_on",
      label: t("reviewField.dependencies"),
      type: "text",
      hint: t("planReview.hint.dependsOn"),
    },
    {
      key: "description",
      label: t("reviewField.description"),
      type: "textarea",
      hint: t("planReview.hint.description"),
    },
  ];
}

/** English edit fields, kept for backward compatibility (the UI builds them per locale). */
export const PLAN_EDIT_FIELDS: EditFieldDef[] = buildPlanEditFields(getLocaleT("en"));

// ---------------------------------------------------------------------------
// Task ↔ ReviewItem mapping
// ---------------------------------------------------------------------------

/**
 * We store the original task data as a stashed property on the ReviewItem
 * so we can reconstruct the full ProposedTask on approve/edit.
 */
const taskStash = new WeakMap<ReviewItem, ProposedTask>();

/** Convert a ProposedTask to a ReviewItem for the shared component. */
export function taskToReviewItem(task: ProposedTask, t: TFunction = defaultT): ReviewItem {
  const item: ReviewItem = {
    id: task.id,
    title: task.title,
    priority: task.priority,
    difficulty: task.difficulty,
    dependsOn: [...task.depends_on],
    accepted: true,
    detailFields: [
      ...(task.effort
        ? [{ id: "effort", label: t("reviewDetail.effort"), value: task.effort }]
        : []),
    ],
    detailSections: [
      {
        id: "description",
        label: t("reviewDetail.description"),
        items: task.description ? [task.description] : [],
      },
      {
        id: "constraints",
        label: t("reviewDetail.constraints"),
        items: [...task.constraints],
        prefix: "+",
      },
      {
        id: "forbidden",
        label: t("reviewDetail.forbidden"),
        items: [...task.forbidden],
        prefix: "-",
      },
      {
        id: "references",
        label: t("reviewDetail.references"),
        items: [...task.references],
      },
      {
        id: "notes",
        label: t("reviewDetail.notes"),
        items: [...task.notes],
      },
      {
        id: "agent",
        label: t("reviewDetail.agent"),
        items: task.agent ? [task.agent] : [],
      },
    ],
  };

  // Stash the original task for reverse mapping
  taskStash.set(item, { ...task });

  return item;
}

/**
 * Convert a ReviewItem back to a ProposedTask, applying any edits made
 * through the review UI. Uses the stashed task data for fields that
 * aren't directly represented on ReviewItem.
 */
export function reviewItemToTask(
  item: ReviewItem,
  originalTask: ProposedTask
): ProposedTask {
  const stashed = taskStash.get(item) ?? originalTask;

  return {
    ...stashed,
    id: item.id,
    title: item.title,
    priority: item.priority as ProposedTask["priority"],
    difficulty: item.difficulty as ProposedTask["difficulty"],
    depends_on: [...item.dependsOn],
  };
}

// ---------------------------------------------------------------------------
// Config Builder
// ---------------------------------------------------------------------------

/** Build a ReviewListConfig from a PlanResult. */
export function buildPlanConfig(
  questId: string,
  questTitle: string,
  planResult: PlanResult,
  onApprove: (tasks: ProposedTask[], knowledge: string | null) => void,
  onCancel: () => void,
  t: TFunction = defaultT
): ReviewListConfig {
  // Map plan validation issues to generic review issues
  const issues: ReviewValidationIssue[] = planResult.issues.map(
    (issue: PlanValidationIssue) => ({
      level: issue.level,
      itemId: issue.taskId,
      message: issue.message,
    })
  );

  // Build a lookup of original tasks by ID for reverse mapping
  const originalTasks = new Map<string, ProposedTask>();
  for (const proposed of planResult.tasks) {
    originalTasks.set(proposed.id, proposed);
  }

  return {
    title: t("planReview.title"),
    subtitle: t("planReview.subtitle", { id: questId, title: questTitle }),
    itemLabel: t("planReview.itemLabel"),
    itemLabelPlural: t("planReview.itemLabelPlural"),
    listLabel: t("planReview.listLabel"),
    issues,
    editFields: buildPlanEditFields(t),
    knowledge: planResult.knowledge,

    getEditFieldValue: (item: ReviewItem, fieldKey: string): string => {
      const task = taskStash.get(item) ?? originalTasks.get(item.id);
      if (!task) return "";

      switch (fieldKey) {
        case "title":
          return item.title;
        case "priority":
          return item.priority;
        case "difficulty":
          return item.difficulty;
        case "depends_on":
          return item.dependsOn.join(", ");
        case "description":
          return task.description;
        default:
          return "";
      }
    },

    setEditFieldValue: (
      item: ReviewItem,
      fieldKey: string,
      value: string
    ): ReviewItem => {
      const task = taskStash.get(item) ?? originalTasks.get(item.id);
      const updatedTask = task ? { ...task } : undefined;

      const updatedItem = { ...item };

      switch (fieldKey) {
        case "title":
          updatedItem.title = value;
          if (updatedTask) updatedTask.title = value;
          break;
        case "priority":
          updatedItem.priority = value;
          if (updatedTask) updatedTask.priority = value as ProposedTask["priority"];
          break;
        case "difficulty":
          updatedItem.difficulty = value;
          if (updatedTask) updatedTask.difficulty = value as ProposedTask["difficulty"];
          break;
        case "depends_on":
          updatedItem.dependsOn = value
            ? value.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          if (updatedTask) updatedTask.depends_on = [...updatedItem.dependsOn];
          break;
        case "description":
          if (updatedTask) updatedTask.description = value;
          // Update description section
          updatedItem.detailSections = updatedItem.detailSections.map((s) =>
            s.id === "description"
              ? { ...s, items: value ? [value] : [] }
              : s
          );
          break;
      }

      // Re-stash the updated task
      if (updatedTask) {
        taskStash.set(updatedItem, updatedTask);
      }

      return updatedItem;
    },

    approveTitle: t("planReview.approveTitle"),
    approveBody: (acceptedCount: number) =>
      `${t("planReview.approveApply", { count: acceptedCount, quest: questId })}\n\n${t("planReview.approveDetails")}`,

    onApprove: (items: ReviewItem[]) => {
      const tasks = items.map((item) => {
        const original = originalTasks.get(item.id);
        return reviewItemToTask(item, original ?? ({} as ProposedTask));
      });
      onApprove(tasks, planResult.knowledge);
    },

    onCancel,
  };
}

// ---------------------------------------------------------------------------
// PlanReviewApp — React component wrapper
// ---------------------------------------------------------------------------

export interface PlanReviewAppProps {
  /** The quest ID being planned. */
  questId: string;
  /** The quest title. */
  questTitle: string;
  /** The planner result to review. */
  planResult: PlanResult;
  /** Called when user approves the plan. */
  onApprove: (tasks: ProposedTask[], knowledge: string | null) => void;
  /** Called when user cancels/discards the plan. */
  onCancel: () => void;
}

/**
 * PlanReviewApp — Ink component for reviewing quest planner output.
 *
 * Wraps the shared ReviewList component with plan-specific configuration.
 */
export function PlanReviewApp({
  questId,
  questTitle,
  planResult,
  onApprove,
  onCancel,
}: PlanReviewAppProps): React.ReactElement {
  const t = useI18n();
  const items = planResult.tasks.map((task) => taskToReviewItem(task, t));
  const config = buildPlanConfig(questId, questTitle, planResult, onApprove, onCancel, t);

  return <ReviewList items={items} config={config} />;
}
