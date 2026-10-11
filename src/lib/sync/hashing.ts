/**
 * hashing.ts — The ONE place that turns a remote GitHub issue into the
 * syncable view and hash stored as the mapping's `remote_hash`. Both push and
 * pull use it, so they can never disagree about whether the remote changed.
 *
 * Triage is a plain label, so which labels count as a triage role matters: the
 * built-in catalog plus the item's own local role (a custom role must survive
 * a round trip).
 */

import { hashFields } from "./mapping";
import { parseIssueToQuest, parseIssueToTask, parsedToTask, type ParsedTask } from "./render";
import { issueStateToSyncState, taskSyncable, type SyncableQuest, type SyncableTask } from "./syncable";
import type { RemoteIssue } from "./types";

/** Labels that are triage roles (see LABEL_CATALOG). */
export const TRIAGE_LABELS = ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"] as const;

/** Triage labels recognised for an item whose local role is `localTriage`. */
export function triageLabelsFor(localTriage: string | null | undefined): string[] {
  return localTriage ? [...TRIAGE_LABELS, localTriage] : [...TRIAGE_LABELS];
}

export interface RemoteTaskView {
  parsed: ParsedTask;
  view: SyncableTask;
  hash: string;
}

export function remoteTaskView(remote: RemoteIssue, localTriage: string | null, id?: string): RemoteTaskView {
  const parsed = parseIssueToTask(remote, { triageLabels: triageLabelsFor(localTriage) });
  if (id) parsed.id = id;
  const view = taskSyncable(parsedToTask(parsed));
  return { parsed, view, hash: hashFields(view) };
}

export function remoteQuestView(remote: RemoteIssue): SyncableQuest {
  const p = parseIssueToQuest(remote);
  return {
    title: p.title,
    goal: p.goal,
    state: issueStateToSyncState(remote.state, remote.stateReason),
    priority: p.priority,
    difficulty: p.difficulty,
    depends_on: p.depends_on,
    constraints_add: p.constraints_add,
    constraints_ban: p.constraints_ban,
  };
}

/** Hash of the syncable fields of a remote issue (same shape as the local hash). */
export function remoteSyncHash(kind: "task" | "quest", remote: RemoteIssue, localTriage: string | null): string {
  return kind === "task" ? remoteTaskView(remote, localTriage).hash : hashFields(remoteQuestView(remote));
}
