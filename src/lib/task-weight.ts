/**
 * task-weight.ts — Task weight estimation and per-task model routing.
 *
 * A task's weight (light / medium / heavy) is derived from its declared
 * difficulty, priority, and estimated effort. A config-declared routing
 * table (WomboConfig.modelRouting) maps each weight class to a model name,
 * so cheap tasks run on cheap models and heavy tasks on capable ones —
 * instead of one global model for everything.
 */

import { parseDurationMinutes } from "./tasks";
import type { Difficulty, Priority } from "./tasks";

/** Weight classes a task can be routed into. */
export type TaskWeight = "light" | "medium" | "heavy";

/** Config-declared routing table: weight class → model (undefined/null = fall back). */
export interface ModelRoutingTable {
  light?: string | null;
  medium?: string | null;
  heavy?: string | null;
}

const DIFFICULTY_SCORE: Record<Difficulty, number> = {
  trivial: 0,
  easy: 1,
  medium: 2,
  hard: 3,
  very_hard: 4,
};

const PRIORITY_SCORE: Record<Priority, number> = {
  wishlist: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/** Effort score bands (minutes): quick / half-day / full-day / multi-day. */
function effortScore(minutes: number): number {
  if (minutes <= 30) return 0;
  if (minutes <= 120) return 1;
  if (minutes <= 480) return 2;
  return 3;
}

/**
 * Compute a task's weight from difficulty, priority, and effort.
 *
 * Score is the sum of axis scores (0–11):
 *   difficulty trivial..very_hard → 0..4
 *   priority wishlist..critical   → 0..4
 *   effort ≤30m/≤2h/≤8h/>8h       → 0..3
 * Bands: ≤3 light, ≤7 medium, else heavy.
 */
export function computeTaskWeight(task: {
  difficulty: Difficulty;
  effort: string;
  priority: Priority;
}): TaskWeight {
  const difficulty = DIFFICULTY_SCORE[task.difficulty] ?? 2;
  const priority = PRIORITY_SCORE[task.priority] ?? 2;
  const effort = effortScore(parseDurationMinutes(task.effort));
  const score = difficulty + priority + effort;
  if (score <= 3) return "light";
  if (score <= 7) return "medium";
  return "heavy";
}

/**
 * Resolve the model for a task: the routing table entry for its weight
 * class wins; otherwise fall back to the session model (the global
 * --model / config default). null means "no model preference" — the
 * agent binary picks its default.
 */
export function resolveTaskModel(
  task: { difficulty: Difficulty; effort: string; priority: Priority },
  routing: ModelRoutingTable | undefined,
  fallback: string | null | undefined,
): string | null {
  const routed = routing?.[computeTaskWeight(task)];
  return routed ?? fallback ?? null;
}
