/**
 * changelog.ts — Idempotent CHANGELOG.md entries for merge operations.
 *
 * Responsibilities (and nothing more):
 *   - Format a dated, structured entry for a successful merge operation
 *   - Append it to CHANGELOG.md inside a caller-supplied directory using an
 *     atomic temp-file + rename write
 *   - Deduplicate by a hidden Markdown marker carrying the operation ID, so
 *     reprocessing the same operation is a no-op even if runtime state is lost
 *
 * Existing content is never replaced or reorganized: entries are appended. The
 * caller (post-merge coordinator) owns Git staging, committing and worktrees.
 */

import {
  existsSync,
  lstatSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { escapeMarkdown, sanitizeInline } from "./merge-report";

export const CHANGELOG_FILE = "CHANGELOG.md";
const MINIMAL_HEADER = "# Changelog";
const MAX_TITLE_LENGTH = 200;

export interface ChangelogTask {
  id: string;
  title: string;
}

export interface ChangelogEntryInput {
  /** Stable merge operation identifier (used in the hidden marker) */
  operationId: string;
  /** Explicit ISO 8601 timestamp supplied by the caller (never read from the clock) */
  timestamp: string;
  tasks: ChangelogTask[];
}

export interface ChangelogWriteResult {
  /** True only when CHANGELOG.md content was modified or created */
  changed: boolean;
  /** Absolute path of the changelog file */
  path: string;
  /** created = new file, appended = entry added, duplicate = marker already present */
  action: "created" | "appended" | "duplicate";
}

// ---------------------------------------------------------------------------
// Marker
// ---------------------------------------------------------------------------

const OPERATION_ID_RE = /^[A-Za-z0-9._:@/+-]+$/;

function assertValidOperationId(id: string): void {
  if (!OPERATION_ID_RE.test(id) || id.includes("--")) {
    throw new Error(
      `Invalid operation ID for changelog marker: ${JSON.stringify(id)}`
    );
  }
}

/** Hidden Markdown marker identifying a merge operation. */
export function operationMarker(operationId: string): string {
  assertValidOperationId(operationId);
  return `<!-- wombo-combo:operation:${operationId} -->`;
}

/** True when the changelog already holds an entry for this operation. */
export function hasOperationMarker(content: string, operationId: string): boolean {
  return content.includes(operationMarker(operationId));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function entryDate(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid changelog timestamp: ${JSON.stringify(timestamp)}`);
  }
  return d.toISOString().slice(0, 10);
}

/** Format one changelog entry (LF newlines, no trailing blank line). */
export function formatChangelogEntry(input: ChangelogEntryInput): string {
  const marker = operationMarker(input.operationId);
  const date = entryDate(input.timestamp);

  const byId = new Map<string, ChangelogTask>();
  for (const t of input.tasks) byId.set(t.id, t);
  const tasks = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const lines = [`## ${date}`, "", marker, ""];
  if (tasks.length === 0) {
    lines.push("- Merged changes (no task details recorded)");
  } else {
    for (const t of tasks) {
      const id = escapeMarkdown(sanitizeInline(t.id, 100));
      const title = escapeMarkdown(sanitizeInline(t.title, MAX_TITLE_LENGTH));
      lines.push(`- **${id}**: ${title}`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Append an entry to CHANGELOG.md in `dir` unless the operation is already
 * recorded. Creates a minimal document when the file does not exist.
 */
export function appendChangelogEntry(
  dir: string,
  input: ChangelogEntryInput
): ChangelogWriteResult {
  const path = join(dir, CHANGELOG_FILE);
  // Validate inputs before touching the filesystem
  const entry = formatChangelogEntry(input);

  let existing: string | null = null;
  if (existsSync(path)) {
    if (lstatSync(path).isSymbolicLink()) {
      throw new Error(`Refusing to rewrite symlinked ${CHANGELOG_FILE} at ${path}`);
    }
    existing = readFileSync(path, "utf-8");
    if (hasOperationMarker(existing, input.operationId)) {
      return { changed: false, path, action: "duplicate" };
    }
  }

  const eol = existing !== null && existing.includes("\r\n") ? "\r\n" : "\n";
  const body = eol === "\n" ? entry : entry.replace(/\n/g, eol);

  let next: string;
  if (existing === null) {
    next = `${MINIMAL_HEADER}${eol}${eol}${body}${eol}`;
  } else if (existing.trim() === "") {
    next = `${MINIMAL_HEADER}${eol}${eol}${body}${eol}`;
  } else {
    let sep: string;
    if (existing.endsWith(`${eol}${eol}`)) sep = "";
    else if (existing.endsWith("\n")) sep = eol;
    else sep = `${eol}${eol}`;
    next = `${existing}${sep}${body}${eol}`;
  }

  atomicWrite(path, next);
  return { changed: true, path, action: existing === null ? "created" : "appended" };
}

function atomicWrite(path: string, content: string): void {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(tmp, content, "utf-8");
    renameSync(tmp, path);
  } finally {
    if (existsSync(tmp)) {
      try {
        unlinkSync(tmp);
      } catch {
        // best effort: the rename already succeeded or the write failed
      }
    }
  }
}
