/**
 * tui-constants.ts — Shared display constants and formatting helpers
 * for Quest Picker, Task Browser, and Wave Monitor Ink components.
 *
 * Consolidates duplicated color maps, abbreviation maps, and
 * utility functions from the three neo-blessed TUI classes.
 */

import type { AgentStatus } from "../lib/state";

// ---------------------------------------------------------------------------
// Quest Status Display Maps
// ---------------------------------------------------------------------------

/** Colors for quest lifecycle statuses. */
export const QUEST_STATUS_COLORS: Record<string, string> = {
  draft: "gray",
  planning: "blue",
  active: "green",
  paused: "yellow",
  completed: "cyan",
  abandoned: "red",
};

/** 4-character abbreviations for quest statuses. */
export const QUEST_STATUS_ABBREV: Record<string, string> = {
  draft: "DRFT",
  planning: "PLAN",
  active: "ACTV",
  paused: "PAUS",
  completed: "DONE",
  abandoned: "ABAN",
};

// ---------------------------------------------------------------------------
// Task Status Display Maps
// ---------------------------------------------------------------------------

/** Colors for task lifecycle statuses. */
export const TASK_STATUS_COLORS: Record<string, string> = {
  backlog: "gray",
  planned: "blue",
  in_progress: "cyan",
  blocked: "red",
  in_review: "yellow",
  done: "green",
  cancelled: "gray",
};

/** 4-character abbreviations for task statuses. */
export const TASK_STATUS_ABBREV: Record<string, string> = {
  backlog: "BACK",
  planned: "PLAN",
  in_progress: "PROG",
  blocked: "BLKD",
  in_review: "REVW",
  done: "DONE",
  cancelled: "CANC",
};

// ---------------------------------------------------------------------------
// Agent Status Display Maps
// ---------------------------------------------------------------------------

/** Colors for agent statuses (wave monitor). */
export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  queued: "gray",
  installing: "cyan",
  running: "blue",
  completed: "yellow",
  verified: "green",
  failed: "red",
  merged: "magenta",
  retry: "yellow",
  resolving_conflict: "cyan",
};

/** Unicode icons for agent statuses. */
export const AGENT_STATUS_ICONS: Record<AgentStatus, string> = {
  queued: "·",
  installing: "⟳",
  running: "●",
  completed: "○",
  verified: "✓",
  failed: "✗",
  merged: "◆",
  retry: "↻",
  resolving_conflict: "⚡",
};

// ---------------------------------------------------------------------------
// Priority Display Map
// ---------------------------------------------------------------------------

/** Colors for task/quest priority levels. */
export const TASK_PRIORITY_COLORS: Record<string, string> = {
  critical: "red",
  high: "yellow",
  medium: "white",
  low: "gray",
  wishlist: "gray",
};

// ---------------------------------------------------------------------------
// Time Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Format elapsed time since a timestamp as a compact string (e.g. "30s", "5m", "2h15m").
 * Returns "-" for null input.
 */
export function elapsed(startedAt: string | null): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const diffMs = Date.now() - start;
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h${mins % 60}m`;
}

/**
 * Render a text-based progress bar.
 *
 * @param elapsedMs - Milliseconds elapsed
 * @param estimateMs - Estimated total milliseconds
 * @param width - Character width of the bar (default 10)
 * @returns A string like "█████░░░░░"
 */
export function progressBar(
  elapsedMs: number,
  estimateMs: number,
  width: number = 10,
): string {
  if (estimateMs <= 0) return "░".repeat(width);
  const ratio = Math.min(elapsedMs / estimateMs, 1);
  const filled = Math.round(ratio * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}
