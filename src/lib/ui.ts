/**
 * ui.ts — Terminal dashboard for daemon status display.
 *
 * Responsibilities:
 *   - Render a live status table of all agents in a daemon session
 *   - Show progress indicators, timing, retry counts
 *   - Color-coded status output
 */

import type { SchedulerState, DaemonAgentState } from "../daemon/protocol";
import type { AgentStatus } from "../daemon/agent-status";
import { formatDuration, parseDurationMinutes } from "./tasks";

// ---------------------------------------------------------------------------
// ANSI Color Helpers
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const FG = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// ---------------------------------------------------------------------------
// Status Colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<AgentStatus, string> = {
  queued: FG.gray,
  installing: FG.cyan,
  running: FG.blue,
  completed: FG.yellow,
  verified: FG.green,
  failed: FG.red,
  merged: FG.magenta,
  retry: FG.yellow,
  resolving_conflict: FG.cyan,
};

const STATUS_ICONS: Record<AgentStatus, string> = {
  queued: ".",
  installing: ">",
  running: "*",
  completed: "~",
  verified: "+",
  failed: "!",
  merged: "#",
  retry: "?",
  resolving_conflict: "!",
};

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

function colorize(text: string, color: string): string {
  return `${color}${text}${RESET}`;
}

function pad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return " ".repeat(width - text.length) + text;
}

function elapsed(startedAt: string | null): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h${remMins}m`;
}

/** Snapshot view of a daemon session (live via client or read from disk). */
export interface DaemonSnapshotView {
  scheduler: SchedulerState;
  agents: DaemonAgentState[];
}

// ---------------------------------------------------------------------------
// Table Rendering
// ---------------------------------------------------------------------------

/**
 * Render the full daemon session status dashboard to stdout.
 */
export function renderDashboard(snapshot: DaemonSnapshotView): string {
  const { scheduler, agents } = snapshot;
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(
    `${BOLD}wombo-combo${RESET} ${DIM}${scheduler.startedAt ?? "daemon"}${RESET}`
  );
  lines.push(
    `${DIM}Base: ${scheduler.baseBranch} | Concurrency: ${scheduler.maxConcurrent} | Scheduler: ${scheduler.status}${RESET}`
  );
  if (scheduler.model) {
    lines.push(`${DIM}Model: ${scheduler.model}${RESET}`);
  }
  if (scheduler.questId) {
    lines.push(`${DIM}Quest: ${scheduler.questId}${RESET}`);
  }
  lines.push("");

  // Table header
  const header = [
    pad("", 3),
    pad("Feature", 30),
    pad("Status", 12),
    pad("Activity", 30),
    padLeft("Retries", 8),
    padLeft("Elapsed", 8),
  ].join(" ");
  lines.push(`${BOLD}${header}${RESET}`);
  lines.push("-".repeat(95));

  // Agent rows
  for (const agent of agents) {
    const statusColor = STATUS_COLORS[agent.status];
    const icon = STATUS_ICONS[agent.status];

    let activityText = "-";
    if ((agent.status === "running" || agent.status === "resolving_conflict") && agent.activity) {
      activityText = agent.activity;
    } else if (agent.status === "installing") {
      activityText = "setting up worktree...";
    } else if (agent.status === "retry") {
      activityText = "retrying with errors...";
    } else if (agent.status === "failed" && agent.error) {
      activityText = agent.error.split("\n")[0].slice(0, 28);
    } else if (agent.status === "verified") {
      activityText = "build passed";
    } else if (agent.status === "merged") {
      activityText = agent.branch;
    } else if (agent.status === "queued" && agent.dependsOn.length > 0) {
      // Show what this queued agent is waiting for
      const unsatisfied = agent.dependsOn.filter((depId) => {
        const dep = agents.find((a) => a.featureId === depId);
        return dep && dep.status !== "verified" && dep.status !== "merged";
      });
      if (unsatisfied.length > 0) {
        activityText = `waiting: ${unsatisfied.join(", ")}`.slice(0, 28);
      } else {
        activityText = "deps ready, queued";
      }
    }

    const row = [
      colorize(pad(`[${icon}]`, 3), statusColor),
      pad(agent.featureId, 30),
      colorize(pad(agent.status, 12), statusColor),
      (agent.status === "running" ? FG.cyan : DIM) + pad(activityText, 30) + RESET,
      padLeft(
        agent.retries > 0 ? `${agent.retries}/${agent.maxRetries}` : "-",
        8
      ),
      padLeft(elapsed(agent.startedAt), 8),
    ].join(" ");

    lines.push(row);
  }

  // Summary
  lines.push("-".repeat(95));
  const counts: Record<AgentStatus, number> = {
    queued: 0, installing: 0, running: 0, completed: 0, verified: 0,
    failed: 0, merged: 0, retry: 0, resolving_conflict: 0,
  };
  for (const agent of agents) counts[agent.status]++;

  const summaryParts: string[] = [];
  if (counts.queued > 0)
    summaryParts.push(colorize(`${counts.queued} queued`, FG.gray));
  if (counts.installing > 0)
    summaryParts.push(colorize(`${counts.installing} installing`, FG.cyan));
  if (counts.running > 0)
    summaryParts.push(colorize(`${counts.running} running`, FG.blue));
  if (counts.completed > 0)
    summaryParts.push(colorize(`${counts.completed} completed`, FG.yellow));
  if (counts.verified > 0)
    summaryParts.push(colorize(`${counts.verified} verified`, FG.green));
  if (counts.failed > 0)
    summaryParts.push(colorize(`${counts.failed} failed`, FG.red));
  if (counts.merged > 0)
    summaryParts.push(colorize(`${counts.merged} merged`, FG.magenta));
  if (counts.retry > 0)
    summaryParts.push(colorize(`${counts.retry} retrying`, FG.yellow));
  if (counts.resolving_conflict > 0)
    summaryParts.push(colorize(`${counts.resolving_conflict} resolving`, FG.cyan));

  lines.push(summaryParts.join(" | "));
  lines.push("");

  return lines.join("\n");
}

/**
 * Print the dashboard to stdout.
 */
export function printDashboard(snapshot: DaemonSnapshotView): void {
  console.log(renderDashboard(snapshot));
}

/**
 * Print a feature selection table (for launch preview).
 */
export function printFeatureSelection(
  features: Array<{
    id: string;
    title: string;
    priority: string;
    difficulty: string;
    effort: string;
  }>
): void {
  console.log("");
  console.log(`${BOLD}Selected Tasks (${features.length}):${RESET}`);
  console.log("");

  const header = [
    pad("#", 4),
    pad("Feature ID", 30),
    pad("Priority", 10),
    pad("Difficulty", 12),
    padLeft("Effort", 8),
    pad("Title", 40),
  ].join(" ");
  console.log(`${BOLD}${header}${RESET}`);
  console.log("-".repeat(108));

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const effortMin = parseDurationMinutes(f.effort);
    const row = [
      pad(`${i + 1}.`, 4),
      pad(f.id, 30),
      pad(f.priority, 10),
      pad(f.difficulty, 12),
      padLeft(formatDuration(effortMin), 8),
      pad(f.title, 40),
    ].join(" ");
    console.log(row);
  }

  console.log("");
}
