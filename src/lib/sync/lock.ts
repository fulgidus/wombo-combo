/**
 * lock.ts — Advisory cross-process lock for the GitHub sync.
 *
 * .wombo-combo/sync/.lock (gitignored) is created atomically (O_EXCL) with
 * the owner's pid, host and timestamp. It is stale after 2 minutes, or when
 * its pid is dead on this host. Waiting is bounded: after a few seconds the
 * caller proceeds without the lock and a warning (a sync problem must never
 * block a woco command; the push duplicate guard is the second layer).
 *
 * Within one process holders queue up (the file lock is per process), and
 * nested calls from inside a holder are re-entrant.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { WOMBO_DIR } from "../../config";

export const LOCK_STALE_MS = 2 * 60_000;
export const LOCK_WAIT_MS = 5_000;
const POLL_MS = 50;

export interface LockInfo {
  pid: number;
  host: string;
  at: number;
}

export interface SyncLockOptions {
  /** Max time to wait for the lock before proceeding without it */
  waitMs?: number;
  warn?: (msg: string) => void;
}

export function lockPath(projectRoot: string): string {
  return join(projectRoot, WOMBO_DIR, "sync", ".lock");
}

const held = new AsyncLocalStorage<Set<string>>();
const queues = new Map<string, Promise<unknown>>();

function readLock(path: string): LockInfo | null {
  try {
    const v = JSON.parse(readFileSync(path, "utf8"));
    if (typeof v?.pid === "number" && typeof v?.at === "number") return v as LockInfo;
  } catch {
    // missing or corrupt
  }
  return null;
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

function isStale(path: string): boolean {
  const info = readLock(path);
  if (!info) return true; // unreadable/corrupt: nobody sane owns it
  if (Date.now() - info.at > LOCK_STALE_MS) return true;
  return info.host === hostname() && !pidAlive(info.pid);
}

function tryCreate(path: string): boolean {
  try {
    const info: LockInfo = { pid: process.pid, host: hostname(), at: Date.now() };
    writeFileSync(path, JSON.stringify(info), { flag: "wx" });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
}

async function acquire(path: string, waitMs: number): Promise<boolean> {
  mkdirSync(dirname(path), { recursive: true });
  const deadline = Date.now() + waitMs;
  for (;;) {
    if (tryCreate(path)) return true;
    if (isStale(path)) {
      try {
        unlinkSync(path);
      } catch {
        // someone else took it over first
      }
      continue;
    }
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

/** Run fn holding the sync lock. Never throws because of the lock itself. */
export async function withSyncLock<T>(projectRoot: string, fn: () => Promise<T>, opts: SyncLockOptions = {}): Promise<T> {
  const path = lockPath(projectRoot);
  const mine = held.getStore();
  if (mine?.has(path)) return fn();

  const prev = queues.get(path) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const tail = prev.then(() => gate);
  queues.set(path, tail);
  await prev;
  try {
    let got = false;
    try {
      got = await acquire(path, opts.waitMs ?? LOCK_WAIT_MS);
    } catch {
      // unwritable sync dir etc.: proceed unlocked
    }
    if (!got) opts.warn?.("sync lock busy (another woco process is syncing); continuing without it");
    try {
      return await held.run(new Set([...(mine ?? []), path]), fn);
    } finally {
      if (got) {
        try {
          unlinkSync(path);
        } catch {
          // already gone
        }
      }
    }
  } finally {
    release();
    if (queues.get(path) === tail) queues.delete(path);
  }
}
