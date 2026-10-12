/**
 * auto.ts — Write-through hook of the GitHub sync ("auto" mode).
 *
 * After a command changes a task, quest or comment, it calls
 * `maybeSyncItem(projectRoot, ref)`. When `sync.github` is enabled with
 * mode "auto" and pushOnWrite, this schedules a debounced, best-effort push of
 * just that item in the background.
 *
 * Guarantees:
 *  - maybeSyncItem is synchronous, returns immediately and never throws;
 *    the host command is never delayed, failed or given another exit code
 *  - sync operations are serialised in-process (see cycle.runExclusive), so
 *    pushes never interleave with each other or with a sync cycle
 *  - any failure prints ONE stderr warning and is retried by the next
 *    cycle (daemon / `sync watch`), since the item's hash stays unsynced
 *  - no token / no repo: one warning per process, then silent
 *  - the host process calls flushAutoSync() before exiting: it pushes what is
 *    pending now and waits for in-flight pushes up to a short timeout, then
 *    abandons them
 */

import { isSyncAuto, loadConfig, normalizeSyncGithubConfig } from "../../config";
import { msg, renderMsg, t } from "../i18n";
import { resolveSyncContext, type SyncContext } from "./context";
import { runExclusive } from "./cycle";
import type { SyncKind } from "./mapping";
import { itemRef, pushToGitHub } from "./push";

export interface AutoSyncSettings {
  /** Quiet period before a push starts, to coalesce bursts of writes (default 250ms) */
  debounceMs?: number;
  /** Test seam: resolve repo and token */
  resolveContext?: (projectRoot: string) => Promise<SyncContext>;
  /** Test seam: where warnings go (default console.error) */
  warn?: (message: string) => void;
}

export const DEFAULT_FLUSH_TIMEOUT_MS = 5000;
const DEFAULT_DEBOUNCE_MS = 250;

interface Pending {
  projectRoot: string;
  kind: SyncKind;
  id: string;
}

let settings: AutoSyncSettings = {};
const pending = new Map<string, Pending>();
const inFlight = new Set<Promise<void>>();
const contexts = new Map<string, Promise<SyncContext>>();
const warned = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** Override behaviour (tests). */
export function configureAutoSync(next: AutoSyncSettings): void {
  settings = { ...settings, ...next };
}

/** Drop all state: pending work, cached contexts, one-shot warnings, overrides (tests). */
export function resetAutoSync(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  pending.clear();
  inFlight.clear();
  contexts.clear();
  warned.clear();
  settings = {};
}

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  warn(message);
}

function warn(message: string): void {
  try {
    (settings.warn ?? ((m: string) => console.error(m)))(message);
  } catch {
    // a broken sink must not break the host
  }
}

function contextFor(projectRoot: string): Promise<SyncContext> {
  let ctx = contexts.get(projectRoot);
  if (!ctx) {
    ctx = (settings.resolveContext ?? ((r) => resolveSyncContext(r, process.env, { maxRetries: 1, maxWaitMs: 2000, baseBackoffMs: 250 })))(projectRoot).catch(
      (err): SyncContext => ({ ok: false, error: msg("cli.sync.failed", { error: String(err?.message ?? err) }) }),
    );
    contexts.set(projectRoot, ctx);
  }
  return ctx;
}

async function pushBatch(batch: Pending[]): Promise<void> {
  const byRoot = new Map<string, Pending[]>();
  for (const p of batch) byRoot.set(p.projectRoot, [...(byRoot.get(p.projectRoot) ?? []), p]);
  for (const [root, items] of byRoot) {
    const ctx = await contextFor(root);
    if (!ctx.ok) {
      const reason = renderMsg(ctx.error);
      warnOnce(`ctx:${reason}`, t("cli.sync.auto.skipped", { reason }));
      continue;
    }
    for (const item of items) {
      const ref = itemRef(item.kind, item.id);
      try {
        const report = await runExclusive(() =>
          pushToGitHub({
            projectRoot: root,
            client: ctx.client,
            only: { kind: item.kind, id: item.id },
            warn: () => {},
          }),
        );
        if (report.errors.length > 0) {
          warn(t("cli.sync.auto.pushFailed", { ref, error: report.errors[0]!.error }));
        }
      } catch (err) {
        warn(t("cli.sync.auto.pushFailed", { ref, error: err instanceof Error ? err.message : String(err) }));
      }
    }
  }
}

function drain(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (pending.size === 0) return;
  const batch = [...pending.values()];
  pending.clear();
  const p: Promise<void> = pushBatch(batch)
    .catch((err) => warn(t("cli.sync.auto.pushFailed", { ref: "*", error: err instanceof Error ? err.message : String(err) })))
    .finally(() => {
      inFlight.delete(p);
    });
  inFlight.add(p);
}

/**
 * Schedule a background push of one item when auto-sync is on. Synchronous,
 * returns immediately, never throws.
 */
export function maybeSyncItem(projectRoot: string, ref: { kind: SyncKind; id: string }): void {
  try {
    const cfg = normalizeSyncGithubConfig(loadConfig(projectRoot).sync);
    if (!isSyncAuto(cfg) || !cfg.pushOnWrite) return;
    pending.set(`${projectRoot}\0${ref.kind}:${ref.id}`, { projectRoot, kind: ref.kind, id: ref.id });
    if (timer) clearTimeout(timer);
    timer = setTimeout(drain, settings.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    (timer as { unref?: () => void }).unref?.();
  } catch {
    // never affects the host command
  }
}

/** True while work is queued or running. */
export function autoSyncBusy(): boolean {
  return pending.size > 0 || inFlight.size > 0;
}

/**
 * Push what is pending now and wait for in-flight pushes, at most `timeoutMs`.
 * Resolves true when everything finished, false when work was abandoned.
 * Never rejects.
 */
export async function flushAutoSync(timeoutMs: number = DEFAULT_FLUSH_TIMEOUT_MS): Promise<boolean> {
  try {
    drain();
    if (inFlight.size === 0) return true;
    let to: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      to = setTimeout(() => resolve("timeout"), timeoutMs);
    });
    const done = Promise.allSettled([...inFlight]).then(() => "done" as const);
    const result = await Promise.race([done, timeout]);
    if (to) clearTimeout(to);
    if (result === "timeout") {
      warn(t("cli.sync.auto.abandoned"));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
