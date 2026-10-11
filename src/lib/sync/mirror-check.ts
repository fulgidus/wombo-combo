/**
 * mirror-check.ts — Offline consistency check of the GitHub mirror
 * (`woco tasks check --mirror`). Reads only local files (tasks, quests,
 * comments and the mapping store); it never touches the network.
 *
 * Findings (report only):
 *  - unmapped:       a task/quest has no mapping (never pushed or pulled)
 *  - orphan-mapping: a mapping points at a task/quest that no longer exists
 *  - comment-no-id:  a comment of a mapped item has no GitHub id
 *  - hash-differs:   the item changed since the last sync (local_hash differs)
 */

import type { WomboConfig } from "../../config";
import { listComments } from "../comments";
import { loadAllArchivedQuests, loadAllQuests } from "../quest-store";
import { loadFeatures, type Task } from "../tasks";
import { hashQuest, hashTask, listMappings, readMapping, type SyncKind } from "./mapping";

export type MirrorFindingKind = "unmapped" | "orphan-mapping" | "comment-no-id" | "hash-differs";

export interface MirrorFinding {
  kind: MirrorFindingKind;
  /** Task id, or `quest:<id>` */
  ref: string;
  /** Task or quest */
  item: SyncKind;
  issue?: number;
  comment?: string;
}

const refOf = (item: SyncKind, id: string) => (item === "quest" ? `quest:${id}` : id);

export function checkMirror(projectRoot: string, config: WomboConfig): MirrorFinding[] {
  const out: MirrorFinding[] = [];
  const data = loadFeatures(projectRoot, config);
  const known = new Set<string>();

  const visit = (item: SyncKind, id: string, archived: boolean, hash: () => string) => {
    known.add(`${item}:${id}`);
    const mapping = readMapping(projectRoot, item, id);
    const ref = refOf(item, id);
    if (!mapping) {
      // Archived items that were never synced are deliberately not pushed.
      if (!archived) out.push({ kind: "unmapped", ref, item });
      return;
    }
    let current: string | null = null;
    try {
      current = hash();
    } catch {
      // unrenderable item: reported by the regular check
    }
    if (current !== null && current !== mapping.local_hash) {
      out.push({ kind: "hash-differs", ref, item, issue: mapping.issue_number });
    }
    try {
      for (const c of listComments(projectRoot, { kind: item, id })) {
        if (!mapping.comments[c.id] && !c.github_url) {
          out.push({ kind: "comment-no-id", ref, item, issue: mapping.issue_number, comment: c.id });
        }
      }
    } catch {
      // unreadable comments: nothing to report
    }
  };

  for (const q of loadAllQuests(projectRoot)) visit("quest", q.id, false, () => hashQuest(q));
  for (const q of loadAllArchivedQuests(projectRoot)) visit("quest", q.id, true, () => hashQuest(q));
  for (const t of data.tasks) visit("task", t.id, false, () => hashTask(t as Task));
  for (const t of data.archive ?? []) visit("task", t.id, true, () => hashTask(t as Task));

  for (const item of ["task", "quest"] as const) {
    for (const m of listMappings(projectRoot, item)) {
      if (!known.has(`${item}:${m.id}`)) {
        out.push({ kind: "orphan-mapping", ref: refOf(item, m.id), item, issue: m.entry.issue_number });
      }
    }
  }
  return out;
}
