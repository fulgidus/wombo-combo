/**
 * dashboard-usage.ts — Read-only incremental reader for .wombo-combo/usage.jsonl.
 *
 * Bootstraps existing records once, then consumes only appended bytes on each
 * `refresh()` and maintains quest-level UsageTotals without retaining every
 * record. Records carry cumulative-free per-step usage persisted by
 * ProcessMonitor; this file is the ONLY token source for quest totals (never
 * combine with cumulative WebSocket token events).
 *
 * Attribution:
 *   - An explicit non-empty `quest_id` always wins.
 *   - Legacy records without one are kept as per-task totals (bounded by the
 *     number of tasks, not records) and resolved at read time through
 *     caller-supplied task metadata (`setTaskQuests`), so refreshing the
 *     metadata never requires rereading the file. Unresolved tasks fall into
 *     the explicit unknown group (`questId: null`).
 *
 * Robustness: missing files, trailing partial lines, malformed lines,
 * truncation, replacement (inode change or changed head) and multi-byte UTF-8
 * characters split across reads are all handled. The file is never written.
 */

import { closeSync, fstatSync, openSync, readSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { WOMBO_DIR } from "../config";
import type { UsageRecord } from "./token-collector";
import type { UsageTotals } from "./token-usage";
import type { QuestUsageEntry } from "./dashboard-metrics";
import type { Task } from "./tasks";

const USAGE_FILE = `${WOMBO_DIR}/usage.jsonl`;
const READ_CHUNK = 64 * 1024;
/** Bytes of the file head used to detect in-place replacement. */
const HEAD_FINGERPRINT_BYTES = 128;
/** A single line longer than this is discarded instead of buffered. */
const MAX_LINE_CHARS = 1024 * 1024;

export type TaskQuestLookup =
  | ReadonlyMap<string, string | null | undefined>
  | ((taskId: string) => string | null | undefined);

export interface UsageRefreshResult {
  /** The file existed and could be read. */
  available: boolean;
  /** Totals changed (records added or state reset). */
  changed: boolean;
  /** Valid records consumed by this call. */
  recordsAdded: number;
}

function emptyTotals(): UsageTotals {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read: 0,
    cache_write: 0,
    reasoning_tokens: 0,
    total_tokens: 0,
    total_cost: 0,
    record_count: 0,
  };
}

function cloneTotals(t: UsageTotals): UsageTotals {
  return { ...t };
}

function addInto(target: UsageTotals, r: UsageRecord): void {
  // Same field semantics as token-usage.totalUsage().
  target.input_tokens += r.input_tokens;
  target.output_tokens += r.output_tokens;
  target.cache_read += r.cache_read;
  target.cache_write += r.cache_write;
  target.reasoning_tokens += r.reasoning_tokens;
  target.total_tokens += r.total_tokens;
  target.total_cost += r.cost;
  target.record_count += 1;
}

function mergeInto(target: UsageTotals, src: UsageTotals): void {
  target.input_tokens += src.input_tokens;
  target.output_tokens += src.output_tokens;
  target.cache_read += src.cache_read;
  target.cache_write += src.cache_write;
  target.reasoning_tokens += src.reasoning_tokens;
  target.total_tokens += src.total_tokens;
  target.total_cost += src.total_cost;
  target.record_count += src.record_count;
}

function validNumber(v: unknown, required: boolean): number | null {
  if (v === undefined) return required ? null : 0;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Validate and normalize one parsed line. Mirrors loadUsageRecords (needs
 * task_id + timestamp) and additionally requires finite nonnegative numbers.
 * Returns null for anything unusable.
 */
export function normalizeUsageRecord(raw: unknown): UsageRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.task_id !== "string" || r.task_id === "") return null;
  if (typeof r.timestamp !== "string" || r.timestamp === "") return null;

  const input = validNumber(r.input_tokens, true);
  const output = validNumber(r.output_tokens, true);
  const total = validNumber(r.total_tokens, true);
  const cost = validNumber(r.cost, false);
  const cacheRead = validNumber(r.cache_read, false);
  const cacheWrite = validNumber(r.cache_write, false);
  const reasoning = validNumber(r.reasoning_tokens, false);
  if (
    input === null || output === null || total === null || cost === null ||
    cacheRead === null || cacheWrite === null || reasoning === null
  ) {
    return null;
  }
  return {
    task_id: r.task_id,
    quest_id: typeof r.quest_id === "string" && r.quest_id !== "" ? r.quest_id : null,
    model: typeof r.model === "string" ? r.model : null,
    provider: typeof r.provider === "string" ? r.provider : null,
    harness: typeof r.harness === "string" ? r.harness : null,
    input_tokens: input,
    output_tokens: output,
    cache_read: cacheRead,
    cache_write: cacheWrite,
    reasoning_tokens: reasoning,
    total_tokens: total,
    cost,
    is_final_step: r.is_final_step === true,
    timestamp: r.timestamp,
  };
}

/** Build a task-id -> quest-id lookup from active + archived tasks (subtasks included). */
export function buildTaskQuestMap(
  ...taskLists: ReadonlyArray<ReadonlyArray<Task> | null | undefined>
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  const visit = (task: Task): void => {
    if (task && typeof task.id === "string") {
      if (!map.has(task.id) || task.quest) map.set(task.id, task.quest ?? null);
    }
    for (const sub of task?.subtasks ?? []) visit(sub);
  };
  for (const list of taskLists) for (const t of list ?? []) visit(t);
  return map;
}

export class DashboardUsageReader {
  private readonly filePath: string;
  private lookup: TaskQuestLookup | null = null;

  private questTotals = new Map<string, UsageTotals>();
  /** Legacy (no quest_id) totals per task. */
  private legacyTaskTotals = new Map<string, UsageTotals>();

  private offset = 0;
  private ino: number | null = null;
  private dev: number | null = null;
  private head = Buffer.alloc(0);
  private decoder = new StringDecoder("utf8");
  private tail = "";
  private discarding = false;
  private available = false;
  private closed = false;

  constructor(projectRoot: string, lookup?: TaskQuestLookup | null) {
    this.filePath = resolve(projectRoot, USAGE_FILE);
    this.lookup = lookup ?? null;
  }

  /** Replace the task -> quest metadata. Never rereads usage records. */
  setTaskQuests(lookup: TaskQuestLookup | null): void {
    this.lookup = lookup;
  }

  /** Whether the usage file was readable on the last refresh. */
  isAvailable(): boolean {
    return this.available;
  }

  /** Stop reading; subsequent refreshes are no-ops. */
  close(): void {
    this.closed = true;
  }

  private resolveQuest(taskId: string): string | null {
    const l = this.lookup;
    if (!l) return null;
    const q = typeof l === "function" ? l(taskId) : l.get(taskId);
    return typeof q === "string" && q !== "" ? q : null;
  }

  /** Quest totals, largest first; legacy tasks resolved through current metadata. */
  snapshot(): QuestUsageEntry[] {
    const merged = new Map<string | null, UsageTotals>();
    const add = (q: string | null, t: UsageTotals): void => {
      let cur = merged.get(q);
      if (!cur) {
        cur = emptyTotals();
        merged.set(q, cur);
      }
      mergeInto(cur, t);
    };
    for (const [q, t] of this.questTotals) add(q, t);
    for (const [taskId, t] of this.legacyTaskTotals) add(this.resolveQuest(taskId), t);

    return [...merged.entries()]
      .map(([questId, totals]) => ({ questId, totals: cloneTotals(totals) }))
      .sort(
        (a, b) =>
          b.totals.total_tokens - a.totals.total_tokens ||
          (a.questId ?? "￿").localeCompare(b.questId ?? "￿"),
      );
  }

  private reset(): void {
    this.questTotals = new Map();
    this.legacyTaskTotals = new Map();
    this.offset = 0;
    this.head = Buffer.alloc(0);
    this.decoder = new StringDecoder("utf8");
    this.tail = "";
    this.discarding = false;
  }

  private consumeLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return false;
    }
    const rec = normalizeUsageRecord(parsed);
    if (!rec) return false;
    if (rec.quest_id) {
      let t = this.questTotals.get(rec.quest_id);
      if (!t) this.questTotals.set(rec.quest_id, (t = emptyTotals()));
      addInto(t, rec);
    } else {
      let t = this.legacyTaskTotals.get(rec.task_id);
      if (!t) this.legacyTaskTotals.set(rec.task_id, (t = emptyTotals()));
      addInto(t, rec);
    }
    return true;
  }

  private consumeText(text: string): number {
    let added = 0;
    let start = 0;
    for (;;) {
      const nl = text.indexOf("\n", start);
      if (nl === -1) break;
      const piece = text.slice(start, nl);
      start = nl + 1;
      if (this.discarding) {
        this.discarding = false;
        this.tail = "";
        continue;
      }
      const line = this.tail + piece;
      this.tail = "";
      if (this.consumeLine(line)) added++;
    }
    if (!this.discarding) {
      this.tail += text.slice(start);
      if (this.tail.length > MAX_LINE_CHARS) {
        this.tail = "";
        this.discarding = true;
      }
    }
    return added;
  }

  /** Read newly appended data. Synchronous and cheap when nothing changed. */
  refresh(): UsageRefreshResult {
    if (this.closed) return { available: this.available, changed: false, recordsAdded: 0 };

    let fd: number | null = null;
    try {
      const pathStat = statSync(this.filePath);
      if (!pathStat.isFile()) throw new Error("not a file");
      fd = openSync(this.filePath, "r");
      const st = fstatSync(fd);

      let changed = false;
      let needReset = false;
      if (this.ino !== null && (st.ino !== this.ino || st.dev !== this.dev)) needReset = true;
      if (st.size < this.offset) needReset = true;
      if (!needReset && this.head.length > 0) {
        const probe = Buffer.alloc(this.head.length);
        const n = readSync(fd, probe, 0, probe.length, 0);
        if (n !== this.head.length || !probe.equals(this.head)) needReset = true;
      }
      if (needReset) {
        this.reset();
        changed = true;
      }
      this.ino = st.ino;
      this.dev = st.dev;

      if (st.size === this.offset) {
        this.available = true;
        return { available: true, changed, recordsAdded: 0 };
      }

      const buf = Buffer.alloc(READ_CHUNK);
      let added = 0;
      for (;;) {
        const n = readSync(fd, buf, 0, READ_CHUNK, this.offset);
        if (n <= 0) break;
        if (this.head.length < HEAD_FINGERPRINT_BYTES && this.offset < HEAD_FINGERPRINT_BYTES) {
          const take = Math.min(n, HEAD_FINGERPRINT_BYTES - this.offset);
          this.head = Buffer.concat([this.head, Buffer.from(buf.subarray(0, take))]);
        }
        this.offset += n;
        added += this.consumeText(this.decoder.write(buf.subarray(0, n)));
      }
      this.available = true;
      return { available: true, changed: changed || added > 0, recordsAdded: added };
    } catch {
      // Missing/unreadable file: drop totals so stale data is not shown as current.
      const hadData = this.available || this.offset > 0;
      this.reset();
      this.ino = null;
      this.dev = null;
      this.available = false;
      return { available: false, changed: hadData, recordsAdded: 0 };
    } finally {
      if (fd !== null) {
        try {
          closeSync(fd);
        } catch {
          /* ignore */
        }
      }
    }
  }
}
