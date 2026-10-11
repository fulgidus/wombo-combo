/**
 * tasks/set-difficulty.ts — Change a task's difficulty.
 *
 * Usage:
 *   woco tasks set-difficulty <task-id> <difficulty>
 *
 * Valid difficulties: trivial, easy, medium, hard, very_hard
 *
 * Supports --output json and --dry-run.
 * Works on both top-level tasks and subtasks.
 */

import type { WomboConfig } from "../../config";
import {
  loadFeatures,
  saveFeatures,
  findFeatureById,
  type Difficulty,
} from "../../lib/tasks";
import { VALID_DIFFICULTIES } from "../../lib/task-schema";
import { outputError, outputMessage, type OutputFormat } from "../../lib/output";
import { msg } from "../../lib/i18n";
import { maybeSyncItem } from "../../lib/sync/auto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TasksSetDifficultyOptions {
  projectRoot: string;
  config: WomboConfig;
  featureId: string;
  newDifficulty: string;
  outputFmt?: OutputFormat;
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdTasksSetDifficulty(opts: TasksSetDifficultyOptions): Promise<void> {
  const { projectRoot, config } = opts;
  const fmt = opts.outputFmt ?? "text";

  if (!opts.featureId || !opts.newDifficulty) {
    outputError(fmt, msg("cli.tasks.setDifficulty.usage", { valid: VALID_DIFFICULTIES.join(", ") }));
    return;
  }

  // Validate difficulty
  if (!(VALID_DIFFICULTIES as readonly string[]).includes(opts.newDifficulty)) {
    outputError(fmt, msg("cli.tasks.setDifficulty.invalid", { value: opts.newDifficulty, valid: VALID_DIFFICULTIES.join(", ") }));
    return;
  }

  const data = loadFeatures(projectRoot, config);
  const feature = findFeatureById(data, opts.featureId);

  if (!feature) {
    outputError(fmt, msg("cli.tasks.notFound", { id: opts.featureId }));
    return;
  }

  const oldDifficulty = feature.difficulty;
  const newDifficulty = opts.newDifficulty as Difficulty;

  if (oldDifficulty === newDifficulty) {
    outputMessage(fmt, msg("cli.tasks.setDifficulty.already", { id: opts.featureId, value: newDifficulty }), {
      id: opts.featureId,
      difficulty: newDifficulty,
      changed: false,
    });
    return;
  }

  // Dry-run: show what would change without writing
  if (opts.dryRun) {
    outputMessage(fmt, msg("cli.tasks.setDifficulty.dryRun", { id: opts.featureId, old: oldDifficulty, new: newDifficulty }), {
      dry_run: true,
      id: opts.featureId,
      old_difficulty: oldDifficulty,
      new_difficulty: newDifficulty,
      changed: false,
    });
    return;
  }

  // Apply difficulty change
  feature.difficulty = newDifficulty;

  saveFeatures(projectRoot, config, data);
  maybeSyncItem(projectRoot, { kind: "task", id: opts.featureId });

  outputMessage(fmt, msg("cli.tasks.setDifficulty.changed", { id: opts.featureId, old: oldDifficulty, new: newDifficulty }), {
    id: opts.featureId,
    old_difficulty: oldDifficulty,
    new_difficulty: newDifficulty,
    changed: true,
  });
}
