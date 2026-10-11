/**
 * syncable.ts — The normalised "syncable field" views of tasks and quests,
 * status <-> issue-state mapping and the triage role helpers. Shared by
 * mapping.ts (hashing, merge) and render.ts (render/parse). Pure.
 */

import type { Quest, QuestStatus } from "../quest";
import type { Difficulty, Priority, Task, TaskStatus } from "../tasks";
import type { IssueState, IssueStateReason } from "./types";

/** Coarse state that survives a round trip through a GitHub issue. */
export type SyncState = "open" | "done" | "cancelled";

export interface SyncableTask extends Record<string, unknown> {
  title: string;
  description: string;
  state: SyncState;
  priority: Priority;
  difficulty: Difficulty;
  depends_on: string[];
  constraints: string[];
  forbidden: string[];
  references: string[];
  quest: string | null;
  triage: string | null;
}

export interface SyncableQuest extends Record<string, unknown> {
  title: string;
  goal: string;
  state: SyncState;
  priority: Priority;
  difficulty: Difficulty;
  depends_on: string[];
  constraints_add: string[];
  constraints_ban: string[];
}

/** Collapse a list item to one trimmed line; drop empties. */
export function cleanList(items: readonly string[] | undefined | null): string[] {
  return (items ?? []).map((s) => String(s).replace(/\s*\n\s*/g, " ").trim()).filter((s) => s.length > 0);
}

export function cleanText(s: string | undefined | null): string {
  return (s ?? "").replace(/\r\n/g, "\n").trim();
}

// -- status mapping ---------------------------------------------------------

export function syncStateToIssue(state: SyncState): { state: IssueState; stateReason: IssueStateReason } {
  if (state === "done") return { state: "closed", stateReason: "completed" };
  if (state === "cancelled") return { state: "closed", stateReason: "not_planned" };
  return { state: "open", stateReason: null };
}

/** done -> closed/completed, cancelled -> closed/not_planned, everything else -> open. */
export function statusToIssueState(status: TaskStatus): { state: IssueState; stateReason: IssueStateReason } {
  return syncStateToIssue(status === "done" ? "done" : status === "cancelled" ? "cancelled" : "open");
}

export function questStatusToIssueState(status: QuestStatus): { state: IssueState; stateReason: IssueStateReason } {
  return syncStateToIssue(status === "completed" ? "done" : status === "abandoned" ? "cancelled" : "open");
}

export function issueStateToSyncState(state: IssueState, reason: IssueStateReason): SyncState {
  if (state === "open") return "open";
  return reason === "not_planned" ? "cancelled" : "done";
}

/**
 * Reverse mapping. LOSSY: open -> "backlog" (the finer woco statuses
 * planned/in_progress/blocked/in_review are not on GitHub). Callers merging
 * into an existing task should keep the local status when
 * statusToIssueState(local) already equals the remote state.
 */
export function issueStateToStatus(state: IssueState, reason: IssueStateReason): TaskStatus {
  const s = issueStateToSyncState(state, reason);
  return s === "done" ? "done" : s === "cancelled" ? "cancelled" : "backlog";
}

export function issueStateToQuestStatus(state: IssueState, reason: IssueStateReason): QuestStatus {
  const s = issueStateToSyncState(state, reason);
  return s === "done" ? "completed" : s === "cancelled" ? "abandoned" : "active";
}

// -- triage role ------------------------------------------------------------

const TRIAGE_RE = /^\s*triage:\s*(\S.*?)\s*$/i;

/** The label from the first `triage: <label>` line in task notes, or null. */
export function parseTriageRole(notes: readonly string[] | undefined | null): string | null {
  for (const n of notes ?? []) {
    const m = TRIAGE_RE.exec(n);
    if (m) return m[1]!;
  }
  return null;
}

/** New notes with every `triage:` line removed and, if role is set, one appended. Input is not mutated. */
export function applyTriageRole(notes: readonly string[] | undefined | null, role: string | null): string[] {
  const rest = (notes ?? []).filter((n) => !TRIAGE_RE.test(n));
  const r = role?.trim();
  return r ? [...rest, `triage: ${r}`] : rest;
}

// -- syncable views ---------------------------------------------------------

export function taskSyncable(task: Task): SyncableTask {
  return {
    title: cleanText(task.title).replace(/\s*\n\s*/g, " "),
    description: cleanText(task.description),
    state: issueStateToSyncState(
      statusToIssueState(task.status).state,
      statusToIssueState(task.status).stateReason,
    ),
    priority: task.priority,
    difficulty: task.difficulty,
    depends_on: cleanList(task.depends_on),
    constraints: cleanList(task.constraints),
    forbidden: cleanList(task.forbidden),
    references: cleanList(task.references),
    quest: task.quest?.trim() || null,
    triage: parseTriageRole(task.notes),
  };
}

export function questSyncable(quest: Quest): SyncableQuest {
  const st = questStatusToIssueState(quest.status);
  return {
    title: cleanText(quest.title).replace(/\s*\n\s*/g, " "),
    goal: cleanText(quest.goal),
    state: issueStateToSyncState(st.state, st.stateReason),
    priority: quest.priority,
    difficulty: quest.difficulty,
    depends_on: cleanList(quest.depends_on),
    constraints_add: cleanList(quest.constraints?.add),
    constraints_ban: cleanList(quest.constraints?.ban),
  };
}

// -- finished work ----------------------------------------------------------

/** A task that is done or cancelled. */
export const isFinishedTask = (task: Pick<Task, "status">): boolean =>
  task.status === "done" || task.status === "cancelled";

/** A quest that is completed or abandoned. */
export const isFinishedQuest = (quest: Pick<Quest, "status">): boolean =>
  quest.status === "completed" || quest.status === "abandoned";
