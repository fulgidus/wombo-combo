/**
 * tasks/set-quest.ts — Attach a task to a quest, or detach it.
 *
 * Usage:
 *   woco tasks set-quest <task-id> <quest-id>
 *   woco tasks set-quest <task-id> none        (removes the quest field)
 *
 * The quest must exist unless the value is "none".
 * Supports --output json and --dry-run.
 * Works on both top-level tasks and subtasks.
 */

import type { WomboConfig } from "../../config";
import { loadFeatures, saveFeatures, findFeatureById } from "../../lib/tasks";
import { loadQuest } from "../../lib/quest-store";
import { outputError, outputMessage, type OutputFormat } from "../../lib/output";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TasksSetQuestOptions {
  projectRoot: string;
  config: WomboConfig;
  featureId: string;
  questId: string;
  outputFmt?: OutputFormat;
  dryRun?: boolean;
}

const NONE = "none";

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdTasksSetQuest(opts: TasksSetQuestOptions): Promise<void> {
  const { projectRoot, config } = opts;
  const fmt = opts.outputFmt ?? "text";

  if (!opts.featureId || !opts.questId) {
    outputError(fmt, "Usage: woco tasks set-quest <task-id> <quest-id|none>");
    return;
  }

  const detach = opts.questId === NONE;

  // Validate quest reference
  if (!detach && !loadQuest(projectRoot, opts.questId)) {
    outputError(fmt, `Quest "${opts.questId}" does not exist.`);
    return;
  }

  const data = loadFeatures(projectRoot, config);
  const feature = findFeatureById(data, opts.featureId);

  if (!feature) {
    outputError(fmt, `Task "${opts.featureId}" not found.`);
    return;
  }

  const oldQuest = feature.quest ?? null;
  const newQuest = detach ? null : opts.questId;

  if (oldQuest === newQuest) {
    const state = newQuest ? `quest "${newQuest}"` : "no quest";
    outputMessage(fmt, `Task "${opts.featureId}" already has ${state}.`, {
      id: opts.featureId,
      quest: newQuest,
      changed: false,
    });
    return;
  }

  const describe = (q: string | null) => q ?? "(none)";

  // Dry-run: show what would change without writing
  if (opts.dryRun) {
    outputMessage(fmt, `[dry-run] Would change "${opts.featureId}" quest: ${describe(oldQuest)} → ${describe(newQuest)}`, {
      dry_run: true,
      id: opts.featureId,
      old_quest: oldQuest,
      quest: newQuest,
      changed: false,
    });
    return;
  }

  // Apply quest change (delete the field entirely when detaching)
  if (newQuest === null) {
    delete feature.quest;
  } else {
    feature.quest = newQuest;
  }

  saveFeatures(projectRoot, config, data);

  outputMessage(fmt, `Task "${opts.featureId}" quest: ${describe(oldQuest)} → ${describe(newQuest)}`, {
    id: opts.featureId,
    old_quest: oldQuest,
    quest: newQuest,
    changed: true,
  });
}
