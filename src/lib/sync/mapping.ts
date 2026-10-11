/**
 * mapping.ts — Mapping store, content hashing, markers and three-way merge
 * for the woco <-> GitHub Issues sync. Pure apart from the mapping file I/O
 * (local files only, never network).
 *
 * Mapping files: .wombo-combo/sync/github/<task|quest>/<id>.yml, one file per
 * item (tracked in git so teammates merge cleanly). Writes are atomic
 * (tmp file + rename). Missing or corrupt files read as "not mapped".
 *
 * CONFLICT POLICY (see mergeFields): LOCAL WINS. When a field changed on both
 * sides since the last sync to different values, the merged value is the
 * local one, the conflict is REPORTED (field, base, local, remote), and the
 * remote value is carried in the report so nothing is silently lost. Callers
 * must surface the conflicts (e.g. as a woco comment on the item).
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import YAML from "yaml";
import { WOMBO_DIR } from "../../config";
import type { Comment } from "../comments";
import type { Quest } from "../quest";
import type { Task } from "../tasks";
import { questSyncable, taskSyncable } from "./syncable";

export const SYNC_DIR = "sync/github";

export type SyncKind = "task" | "quest";
export type MarkerKind = "task" | "quest" | "comment";

/** Ids allowed in file names and markers. */
export const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export interface MappingEntry {
  issue_number: number;
  issue_url: string;
  /** GitHub updated_at observed at the last sync */
  remote_updated_at: string;
  /** Hash of the local syncable fields at the last sync (the merge base) */
  local_hash: string;
  /** Hash of the remote syncable fields at the last sync */
  remote_hash: string;
  last_synced_at: string;
  /** woco comment id -> GitHub comment id */
  comments: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Mapping file I/O
// ---------------------------------------------------------------------------

export function syncRoot(projectRoot: string): string {
  return join(projectRoot, WOMBO_DIR, SYNC_DIR);
}

function assertKind(kind: string): asserts kind is SyncKind {
  if (kind !== "task" && kind !== "quest") throw new Error(`invalid sync kind: ${JSON.stringify(kind)}`);
}

function assertId(id: string): void {
  if (typeof id !== "string" || !SAFE_ID_RE.test(id)) throw new Error(`invalid id: ${JSON.stringify(id)}`);
}

export function mappingPath(projectRoot: string, kind: SyncKind, id: string): string {
  assertKind(kind);
  assertId(id);
  return join(syncRoot(projectRoot), kind, `${id}.yml`);
}

function validateEntry(raw: unknown): MappingEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.issue_number !== "number" || !Number.isInteger(r.issue_number) || r.issue_number <= 0) return null;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const comments: Record<string, number> = {};
  if (r.comments && typeof r.comments === "object" && !Array.isArray(r.comments)) {
    for (const [k, v] of Object.entries(r.comments as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isInteger(v) && v > 0) comments[k] = v;
    }
  }
  return {
    issue_number: r.issue_number,
    issue_url: str(r.issue_url),
    remote_updated_at: str(r.remote_updated_at),
    local_hash: str(r.local_hash),
    remote_hash: str(r.remote_hash),
    last_synced_at: str(r.last_synced_at),
    comments,
  };
}

/** Read one mapping; null when missing, unreadable, or corrupt. Never throws on bad content. */
export function readMapping(projectRoot: string, kind: SyncKind, id: string): MappingEntry | null {
  let path: string;
  try {
    path = mappingPath(projectRoot, kind, id);
  } catch {
    return null;
  }
  try {
    if (!existsSync(path)) return null;
    return validateEntry(YAML.parse(readFileSync(path, "utf-8")));
  } catch {
    return null;
  }
}

/** Atomically write (replace) one mapping file. Throws on invalid kind/id/entry. */
export function writeMapping(projectRoot: string, kind: SyncKind, id: string, entry: MappingEntry): void {
  const path = mappingPath(projectRoot, kind, id);
  const valid = validateEntry(entry);
  if (!valid) throw new Error(`invalid mapping entry for ${kind}:${id}`);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    writeFileSync(tmp, YAML.stringify(valid), "utf-8");
    renameSync(tmp, path);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // ignore
    }
    throw err;
  }
}

/** Remove a mapping file; returns whether one existed. */
export function deleteMapping(projectRoot: string, kind: SyncKind, id: string): boolean {
  const path = mappingPath(projectRoot, kind, id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

/** All readable mappings of a kind, sorted by id. Corrupt files are skipped. */
export function listMappings(projectRoot: string, kind: SyncKind): Array<{ id: string; entry: MappingEntry }> {
  assertKind(kind);
  const dir = join(syncRoot(projectRoot), kind);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out: Array<{ id: string; entry: MappingEntry }> = [];
  for (const name of names.sort()) {
    if (!name.endsWith(".yml")) continue;
    const id = name.slice(0, -".yml".length);
    const entry = readMapping(projectRoot, kind, id);
    if (entry) out.push({ id, entry });
  }
  return out;
}

/** Reverse lookup: which woco item is mapped to this issue number. */
export function findMappingByIssue(
  projectRoot: string,
  kind: SyncKind,
  issueNumber: number,
): { id: string; entry: MappingEntry } | null {
  return listMappings(projectRoot, kind).find((m) => m.entry.issue_number === issueNumber) ?? null;
}

// ---------------------------------------------------------------------------
// Stable hashing
// ---------------------------------------------------------------------------

/** JSON with object keys sorted recursively; undefined values dropped. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function hashFields(fields: unknown): string {
  return createHash("sha256").update(stableStringify(fields)).digest("hex");
}

/** Hash of a task's syncable fields (see render.taskSyncable); stable over key order. */
export function hashTask(task: Task): string {
  return hashFields(taskSyncable(task));
}

export function hashQuest(quest: Quest): string {
  return hashFields(questSyncable(quest));
}

/** Hash of a comment's syncable fields: author, role, body. */
export function hashComment(c: Pick<Comment, "author" | "role" | "body">): string {
  return hashFields({ author: c.author, role: c.role, body: c.body.trim() });
}

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

const MARKER_RE_SRC = "<!--\\s*woco:(task|quest|comment):([A-Za-z0-9][A-Za-z0-9._-]*)\\s*-->";

/** '<!-- woco:<kind>:<id> -->'. Throws on a malformed id. */
export function markerFor(kind: MarkerKind, id: string): string {
  if (kind !== "task" && kind !== "quest" && kind !== "comment") throw new Error(`invalid marker kind: ${kind}`);
  assertId(id);
  return `<!-- woco:${kind}:${id} -->`;
}

/** First well-formed marker in the text, or null. Malformed ids are ignored. */
export function findMarker(text: string): { kind: MarkerKind; id: string } | null {
  const m = new RegExp(MARKER_RE_SRC).exec(text ?? "");
  return m ? { kind: m[1] as MarkerKind, id: m[2]! } : null;
}

/** Remove all well-formed woco markers and trailing whitespace. */
export function stripMarker(text: string): string {
  return (text ?? "").replace(new RegExp(MARKER_RE_SRC, "g"), "").replace(/\s+$/, "");
}

// ---------------------------------------------------------------------------
// Three-way merge
// ---------------------------------------------------------------------------

export interface FieldConflict {
  field: string;
  base: unknown;
  local: unknown;
  remote: unknown;
}

export interface MergeResult<T> {
  merged: T;
  conflicts: FieldConflict[];
}

function same(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

/**
 * Field-wise three-way merge of syncable field records (lists are compared
 * whole, not element-wise).
 *
 *  - changed only locally  -> local
 *  - changed only remotely -> remote
 *  - changed identically   -> that value
 *  - changed on both sides to different values -> CONFLICT: local wins, the
 *    conflict is reported with all three values, so the remote value is never
 *    silently lost (the caller records it, e.g. as a comment).
 *
 * `base` is the last-synced snapshot; when null (never synced) every field
 * that differs is a conflict.
 */
export function mergeFields<T extends Record<string, unknown>>(
  base: T | null | undefined,
  local: T,
  remote: T,
): MergeResult<T> {
  const merged: Record<string, unknown> = {};
  const conflicts: FieldConflict[] = [];
  const keys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base ?? {})]);
  for (const field of [...keys].sort()) {
    const b = base ? base[field] : undefined;
    const l = local[field];
    const r = remote[field];
    if (same(l, r)) merged[field] = l;
    else if (base && same(b, l)) merged[field] = r;
    else if (base && same(b, r)) merged[field] = l;
    else {
      merged[field] = l;
      conflicts.push({ field, base: b, local: l, remote: r });
    }
  }
  return { merged: merged as T, conflicts };
}
