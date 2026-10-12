/**
 * genesis-review.tsx — Genesis review adapter for the ReviewList component.
 *
 * Maps `ProposedQuest` (from genesis-planner.ts) to `ReviewItem` and
 * builds a `ReviewListConfig` that drives the shared ReviewList component.
 *
 * Differences from plan-review:
 *   - Quests have `goal` (textarea), plan tasks have `description` (textarea)
 *   - Quests have `hitl_mode` (select: yolo/cautious/supervised)
 *   - Quests have `constraints.add` and `constraints.ban` (arrays)
 *   - Plan tasks have flat `constraints`, `forbidden`, `references`, `agent`
 *   - Edit fields: title, priority, difficulty, hitl_mode, depends_on, goal
 */

import React from "react";
import type {
  ReviewItem,
  ReviewListConfig,
  EditFieldDef,
  ReviewValidationIssue,
} from "./review-list-types";
import { HITL_COLORS } from "./review-list-types";
import { ReviewList } from "./review-list";
import { t as defaultT, getLocaleT, useI18n, type TFunction } from "./i18n";
import type {
  ProposedQuest,
  GenesisResult,
  GenesisValidationIssue,
} from "../lib/genesis-planner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITIES = ["critical", "high", "medium", "low", "wishlist"];
const DIFFICULTIES = ["trivial", "easy", "medium", "hard", "very_hard"];
const HITL_MODES = ["yolo", "cautious", "supervised"];

// ---------------------------------------------------------------------------
// Edit Field Definitions
// ---------------------------------------------------------------------------

/** Edit fields for genesis review (quest editing), labelled for the given locale. */
export function buildGenesisEditFields(t: TFunction = defaultT): EditFieldDef[] {
  return [
    {
      key: "title",
      label: t("reviewField.title"),
      type: "text",
      hint: t("genesisReview.hint.title"),
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
      key: "hitl_mode",
      label: t("genesisReview.field.hitlMode"),
      type: "select",
      options: HITL_MODES.map((h) => ({ label: t(`genesisReview.hitlOption.${h}`), value: h })),
      hint: t("genesisReview.hint.hitlMode"),
    },
    {
      key: "depends_on",
      label: t("reviewField.dependencies"),
      type: "text",
      hint: t("genesisReview.hint.dependsOn"),
    },
    {
      key: "goal",
      label: t("genesisReview.field.goal"),
      type: "textarea",
      hint: t("genesisReview.hint.goal"),
    },
  ];
}

/** English edit fields, kept for backward compatibility (the UI builds them per locale). */
export const GENESIS_EDIT_FIELDS: EditFieldDef[] = buildGenesisEditFields(getLocaleT("en"));

// ---------------------------------------------------------------------------
// Quest ↔ ReviewItem mapping
// ---------------------------------------------------------------------------

/**
 * We store the original quest data as a stashed property on the ReviewItem
 * so we can reconstruct the full ProposedQuest on approve/edit.
 * This avoids complex reverse-mapping logic.
 */
const questStash = new WeakMap<ReviewItem, ProposedQuest>();

/** Convert a ProposedQuest to a ReviewItem for the shared component. */
export function questToReviewItem(quest: ProposedQuest, t: TFunction = defaultT): ReviewItem {
  const hColor = HITL_COLORS[quest.hitl_mode] ?? "white";

  const item: ReviewItem = {
    id: quest.id,
    title: quest.title,
    priority: quest.priority,
    difficulty: quest.difficulty,
    dependsOn: [...quest.depends_on],
    accepted: true,
    detailFields: [
      { id: "hitl", label: t("genesisReview.detail.hitl"), value: quest.hitl_mode, color: hColor },
    ],
    detailSections: [
      {
        id: "goal",
        label: t("reviewDetail.goal"),
        items: quest.goal ? [quest.goal] : [],
      },
      {
        id: "constraints",
        label: t("reviewDetail.constraints"),
        items: [...quest.constraints.add],
        prefix: "+",
      },
      {
        id: "forbidden",
        label: t("reviewDetail.forbidden"),
        items: [...quest.constraints.ban],
        prefix: "-",
      },
      {
        id: "notes",
        label: t("reviewDetail.notes"),
        items: [...quest.notes],
      },
    ],
  };

  // Stash the original quest for reverse mapping
  questStash.set(item, { ...quest });

  return item;
}

/**
 * Convert a ReviewItem back to a ProposedQuest, applying any edits made
 * through the review UI. Uses the stashed quest data for fields that
 * aren't represented on ReviewItem (goal, hitl_mode, constraints).
 */
export function reviewItemToQuest(
  item: ReviewItem,
  originalQuest: ProposedQuest
): ProposedQuest {
  // Get the stashed (possibly edited) quest, or fall back to original
  const stashed = questStash.get(item) ?? originalQuest;

  return {
    ...stashed,
    id: item.id,
    title: item.title,
    priority: item.priority as ProposedQuest["priority"],
    difficulty: item.difficulty as ProposedQuest["difficulty"],
    depends_on: [...item.dependsOn],
  };
}

// ---------------------------------------------------------------------------
// Config Builder
// ---------------------------------------------------------------------------

/** Build a ReviewListConfig from a GenesisResult. */
export function buildGenesisConfig(
  genesisResult: GenesisResult,
  onApprove: (quests: ProposedQuest[], knowledge: string | null) => void,
  onCancel: () => void,
  t: TFunction = defaultT
): ReviewListConfig {
  // Map genesis validation issues to generic review issues
  const issues: ReviewValidationIssue[] = genesisResult.issues.map(
    (issue: GenesisValidationIssue) => ({
      level: issue.level,
      itemId: issue.questId,
      message: issue.message,
    })
  );

  // Build a lookup of original quests by ID for reverse mapping
  const originalQuests = new Map<string, ProposedQuest>();
  for (const q of genesisResult.quests) {
    originalQuests.set(q.id, q);
  }

  return {
    title: t("genesisReview.title"),
    subtitle: t("genesisReview.subtitle"),
    itemLabel: t("genesisReview.itemLabel"),
    itemLabelPlural: t("genesisReview.itemLabelPlural"),
    listLabel: t("genesisReview.listLabel"),
    issues,
    editFields: buildGenesisEditFields(t),
    knowledge: genesisResult.knowledge,

    getEditFieldValue: (item: ReviewItem, fieldKey: string): string => {
      const quest = questStash.get(item) ?? originalQuests.get(item.id);
      if (!quest) return "";

      switch (fieldKey) {
        case "title":
          return item.title;
        case "priority":
          return item.priority;
        case "difficulty":
          return item.difficulty;
        case "hitl_mode":
          return quest.hitl_mode;
        case "depends_on":
          return item.dependsOn.join(", ");
        case "goal":
          return quest.goal;
        default:
          return "";
      }
    },

    setEditFieldValue: (
      item: ReviewItem,
      fieldKey: string,
      value: string
    ): ReviewItem => {
      const quest = questStash.get(item) ?? originalQuests.get(item.id);
      const updatedQuest = quest ? { ...quest } : undefined;

      const updatedItem = { ...item };

      switch (fieldKey) {
        case "title":
          updatedItem.title = value;
          if (updatedQuest) updatedQuest.title = value;
          break;
        case "priority":
          updatedItem.priority = value;
          if (updatedQuest) updatedQuest.priority = value as ProposedQuest["priority"];
          break;
        case "difficulty":
          updatedItem.difficulty = value;
          if (updatedQuest) updatedQuest.difficulty = value as ProposedQuest["difficulty"];
          break;
        case "hitl_mode":
          if (updatedQuest) updatedQuest.hitl_mode = value as ProposedQuest["hitl_mode"];
          // Update HITL detail field
          updatedItem.detailFields = updatedItem.detailFields.map((f) =>
            f.id === "hitl"
              ? { ...f, value, color: HITL_COLORS[value] ?? "white" }
              : f
          );
          break;
        case "depends_on":
          updatedItem.dependsOn = value
            ? value.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          if (updatedQuest) updatedQuest.depends_on = [...updatedItem.dependsOn];
          break;
        case "goal":
          if (updatedQuest) updatedQuest.goal = value;
          // Update goal section
          updatedItem.detailSections = updatedItem.detailSections.map((s) =>
            s.id === "goal" ? { ...s, items: value ? [value] : [] } : s
          );
          break;
      }

      // Re-stash the updated quest
      if (updatedQuest) {
        questStash.set(updatedItem, updatedQuest);
      }

      return updatedItem;
    },

    approveTitle: t("genesisReview.approveTitle"),
    approveBody: (acceptedCount: number) =>
      `${t("genesisReview.approveCreate", { count: acceptedCount })}\n\n${t("genesisReview.approveDetails")}`,

    onApprove: (items: ReviewItem[]) => {
      const quests = items.map((item) => {
        const original = originalQuests.get(item.id);
        return reviewItemToQuest(item, original ?? ({} as ProposedQuest));
      });
      onApprove(quests, genesisResult.knowledge);
    },

    onCancel,
  };
}

// ---------------------------------------------------------------------------
// GenesisReviewApp — React component wrapper
// ---------------------------------------------------------------------------

export interface GenesisReviewAppProps {
  /** The genesis planner result to review. */
  genesisResult: GenesisResult;
  /** Called when user approves the plan. */
  onApprove: (quests: ProposedQuest[], knowledge: string | null) => void;
  /** Called when user cancels/discards the plan. */
  onCancel: () => void;
}

/**
 * GenesisReviewApp — Ink component for reviewing genesis planner output.
 *
 * Wraps the shared ReviewList component with genesis-specific configuration.
 */
export function GenesisReviewApp({
  genesisResult,
  onApprove,
  onCancel,
}: GenesisReviewAppProps): React.ReactElement {
  const t = useI18n();
  const items = genesisResult.quests.map((q) => questToReviewItem(q, t));
  const config = buildGenesisConfig(genesisResult, onApprove, onCancel, t);

  return <ReviewList items={items} config={config} />;
}
