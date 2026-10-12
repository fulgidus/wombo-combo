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
import { msg, t } from "../../lib/i18n";
import { maybeSyncItem } from "../../lib/sync/auto";

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
    outputError(fmt, msg("cli.setQuest.usage"));
    return;
  }

  const detach = opts.questId === NONE;

  // Validate quest reference
  if (!detach && !loadQuest(projectRoot, opts.questId)) {
    outputError(fmt, msg("cli.setQuest.questMissing", { id: opts.questId }));
    return;
  }

  const data = loadFeatures(projectRoot, config);
  const feature = findFeatureById(data, opts.featureId);

  if (!feature) {
    outputError(fmt, msg("cli.setQuest.taskNotFound", { id: opts.featureId }));
    return;
  }

  const oldQuest = feature.quest ?? null;
  const newQuest = detach ? null : opts.questId;

  if (oldQuest === newQuest) {
    outputMessage(fmt, newQuest
      ? msg("cli.setQuest.alreadyQuest", { id: opts.featureId, quest: newQuest })
      : msg("cli.setQuest.alreadyNone", { id: opts.featureId }), {
      id: opts.featureId,
      quest: newQuest,
      changed: false,
    });
    return;
  }

  const describe = (q: string | null) => q ?? t("cli.setQuest.none");

  // Dry-run: show what would change without writing
  if (opts.dryRun) {
    outputMessage(fmt, msg("cli.setQuest.dryRun", { id: opts.featureId, from: describe(oldQuest), to: describe(newQuest) }), {
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
  maybeSyncItem(projectRoot, { kind: "task", id: opts.featureId });

  outputMessage(fmt, msg("cli.setQuest.done", { id: opts.featureId, from: describe(oldQuest), to: describe(newQuest) }), {
    id: opts.featureId,
    old_quest: oldQuest,
    quest: newQuest,
    changed: true,
  });
}
