/**
 * tasks/set-status.ts — Change a task's status.
 *
 * Usage:
 *   woco tasks set-status <task-id> <new-status>
 *
 * Valid statuses: backlog, planned, in_progress, blocked, in_review, done, cancelled
 */

import type { WomboConfig } from "../../config";
import {
  loadFeatures,
  saveFeatures,
  findFeatureById,
  type FeatureStatus,
} from "../../lib/tasks";
import { VALID_STATUSES } from "../../lib/task-schema";
import { outputError, outputMessage, type OutputFormat } from "../../lib/output";
import { msg } from "../../lib/i18n";
import { maybeSyncItem } from "../../lib/sync/auto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TasksSetStatusOptions {
  projectRoot: string;
  config: WomboConfig;
  featureId: string;
  newStatus: string;
  outputFmt?: OutputFormat;
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function cmdTasksSetStatus(opts: TasksSetStatusOptions): Promise<void> {
  const { projectRoot, config } = opts;
  const fmt = opts.outputFmt ?? "text";

  if (!opts.featureId || !opts.newStatus) {
    outputError(fmt, msg("cli.tasks.setStatus.usage", { valid: VALID_STATUSES.join(", ") }));
    return;
  }

  // Validate status
  if (!(VALID_STATUSES as readonly string[]).includes(opts.newStatus)) {
    outputError(fmt, msg("cli.tasks.setStatus.invalid", { value: opts.newStatus, valid: VALID_STATUSES.join(", ") }));
    return;
  }

  const data = loadFeatures(projectRoot, config);
  const feature = findFeatureById(data, opts.featureId);

  if (!feature) {
    outputError(fmt, msg("cli.tasks.notFound", { id: opts.featureId }));
    return;
  }

  const oldStatus = feature.status;
  const newStatus = opts.newStatus as FeatureStatus;

  if (oldStatus === newStatus) {
    outputMessage(fmt, msg("cli.tasks.setStatus.already", { id: opts.featureId, value: newStatus }), {
      id: opts.featureId,
      status: newStatus,
      changed: false,
    });
    return;
  }

  // Dry-run: show what would change without writing
  if (opts.dryRun) {
    outputMessage(fmt, msg("cli.tasks.setStatus.dryRun", { id: opts.featureId, old: oldStatus, new: newStatus }), {
      dry_run: true,
      id: opts.featureId,
      old_status: oldStatus,
      new_status: newStatus,
      changed: false,
    });
    return;
  }

  // Apply status change
  feature.status = newStatus;

  // Set timestamps
  if (newStatus === "in_progress" && !feature.started_at) {
    feature.started_at = new Date().toISOString();
  }
  if (newStatus === "done" || newStatus === "cancelled") {
    feature.ended_at = new Date().toISOString();
    if (newStatus === "done") {
      feature.completion = 100;
    }
  }

  saveFeatures(projectRoot, config, data);
  maybeSyncItem(projectRoot, { kind: "task", id: opts.featureId });

  outputMessage(fmt, msg("cli.tasks.setStatus.changed", { id: opts.featureId, old: oldStatus, new: newStatus }), {
    id: opts.featureId,
    old_status: oldStatus,
    new_status: newStatus,
    changed: true,
  });
}
