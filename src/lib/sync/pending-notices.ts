/**
 * pending-notices.ts — Conflict notices that failed to post on GitHub.
 *
 * Pull acknowledges a remote change when it detects a conflict, so it would
 * never produce the same notice again. When posting the notice fails, it is
 * kept here and retried by the next cycle. Runtime state: untracked
 * (gitignored) `.wombo-combo/sync/pending-notices.json`, written atomically.
 * Missing or corrupt files read as empty. Local files only, never network.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { WOMBO_DIR } from "../../config";

export interface PendingNotice {
  issue: number;
  ref: string;
  body: string;
  /** Failed posting attempts so far */
  attempts: number;
}

/** A notice that keeps failing is dropped after this many attempts (e.g. its issue was deleted). */
export const MAX_NOTICE_ATTEMPTS = 10;

export function pendingNoticesPath(projectRoot: string): string {
  return join(projectRoot, WOMBO_DIR, "sync", "pending-notices.json");
}

export function readPendingNotices(projectRoot: string): PendingNotice[] {
  try {
    const path = pendingNoticesPath(projectRoot);
    if (!existsSync(path)) return [];
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    if (!Array.isArray(raw)) return [];
    const out: PendingNotice[] = [];
    for (const n of raw) {
      if (
        n && typeof n === "object" &&
        Number.isInteger(n.issue) && n.issue > 0 &&
        typeof n.ref === "string" && typeof n.body === "string"
      ) {
        out.push({ issue: n.issue, ref: n.ref, body: n.body, attempts: Number.isInteger(n.attempts) && n.attempts > 0 ? n.attempts : 0 });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Replace the stored list; an empty list removes the file. Never throws. */
export function writePendingNotices(projectRoot: string, notices: PendingNotice[]): void {
  const path = pendingNoticesPath(projectRoot);
  try {
    if (notices.length === 0) {
      if (existsSync(path)) unlinkSync(path);
      return;
    }
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    writeFileSync(tmp, JSON.stringify(notices, null, 2) + "\n", "utf-8");
    renameSync(tmp, path);
  } catch {
    // best effort: worst case the notice is not retried
  }
}
