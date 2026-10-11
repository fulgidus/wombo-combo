/**
 * replay.ts — Versioned, replayable recordings of agent executions.
 *
 * One JSONL file per agent execution (including all of its ordinary retries)
 * under `<projectRoot>/.wombo-combo/replays/<task-id>/<execution-id>.jsonl`.
 * `execution-id` is the analytics execution id, so replays line up with
 * `.wombo-combo/analytics/` snapshots. Never stored inside an agent worktree.
 *
 * Every line is `{ v, seq, t, kind, ... }`:
 *   header   first line: execution identity
 *   prompt   the prompt given to the agent (bounded)
 *   attempt  start of an attempt (1 = first launch, >1 = ordinary retry)
 *   event    one NORMALIZED agent event (see ReplayEvent)
 *   diff     bounded unified diff of the worktree at the end of the execution
 *   end      terminal outcome
 * Readers tolerate a missing `end` (crash/kill), malformed lines (reported as
 * diagnostics) and records of unsupported versions (skipped).
 *
 * Harness independence: only `normalizeOpenCodeEvent` knows the opencode wire
 * format. A future harness adds a sibling normalizer producing ReplayEvent;
 * recorder, store, CLI and viewer only deal with normalized events.
 *
 * Bounds (all limits count characters): long fields are cut with an explicit
 * `…[truncated N chars]` marker and `truncated: true`. Per-file size cap:
 * once reached, further `event`/`attempt` records are dropped after one
 * "size limit" marker event; prompt, diff and end are always kept (they are
 * individually bounded).
 *
 * Writes are single `appendFileSync` calls of one complete line (O_APPEND).
 * After a crash a partial last line may exist; the store starts the next
 * record on a fresh line.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  rmdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { WOMBO_DIR } from "../config";
import type { OpenCodeEvent } from "./monitor";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const REPLAY_SCHEMA_VERSION = 1;

/** Relative directory (from project root) holding replays. */
export const REPLAYS_DIR = `${WOMBO_DIR}/replays`;

export const REPLAY_LIMITS = {
  prompt: 64 * 1024,
  text: 8 * 1024,
  output: 8 * 1024,
  error: 4 * 1024,
  inputValue: 2 * 1024,
  diff: 256 * 1024,
  /** Default per-file cap for event/attempt records. */
  fileBytes: 8 * 1024 * 1024,
} as const;

/** Default retention: executions kept per task. */
export const DEFAULT_KEEP_PER_TASK = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReplayEventType = "step_start" | "text" | "tool" | "step_finish" | "error" | "raw";

export interface ReplayTokens {
  total: number;
  input: number;
  output: number;
  reasoning: number;
  cache_read: number;
  cache_write: number;
}

/** Harness-neutral agent event. */
export interface ReplayEvent {
  type: ReplayEventType;
  session_id?: string;
  tool?: string;
  call_id?: string;
  /** Tool status: pending | running | completed | error. */
  status?: string;
  input?: Record<string, unknown>;
  output?: string;
  error?: string;
  text?: string;
  /** step_finish reason (e.g. "stop", "tool-calls"). */
  reason?: string;
  cost?: number;
  tokens?: ReplayTokens;
  /** True when any field of this event was truncated. */
  truncated?: boolean;
}

export interface ReplayHeaderInput {
  execution_id: string;
  task_id: string;
  quest_id: string | null;
  wave_id: string | null;
  agent: string | null;
  model: string | null;
  started_at: string;
}

export interface DiffFileStat {
  path: string;
  additions: number | null;
  deletions: number | null;
}

export type ReplayEndOutcome = "succeeded" | "failed" | "stopped";

/** Record payloads (without envelope fields). */
export type ReplayPayload =
  | ({ kind: "header" } & ReplayHeaderInput)
  | { kind: "prompt"; text: string; truncated: boolean }
  | { kind: "attempt"; n: number; reason: "start" | "retry"; text?: string; truncated?: boolean }
  | { kind: "event"; event: ReplayEvent }
  | { kind: "diff"; diff: string; truncated: boolean; files: DiffFileStat[]; baseline: string | null }
  | { kind: "end"; outcome: ReplayEndOutcome; detail?: string };

export type ReplayRecord = ReplayPayload & { v: number; seq: number; t: string };

export type ReplayKind = ReplayPayload["kind"];

export type ReplayHeaderRecord = Extract<ReplayRecord, { kind: "header" }>;
export type ReplayDiffRecord = Extract<ReplayRecord, { kind: "diff" }>;
export type ReplayEndRecord = Extract<ReplayRecord, { kind: "end" }>;

export interface ReplayDiagnostic {
  line: number;
  kind: "malformed" | "unsupported_version" | "invalid";
  message: string;
}

export interface LoadedReplay {
  path: string;
  task_id: string;
  execution_id: string;
  header: ReplayHeaderRecord | null;
  records: ReplayRecord[];
  prompt: string | null;
  diff: ReplayDiffRecord | null;
  end: ReplayEndRecord | null;
  diagnostics: ReplayDiagnostic[];
}

export interface ReplaySummary {
  task_id: string;
  execution_id: string;
  path: string;
  started_at: string | null;
  ended_at: string | null;
  /** "running" when no end record exists. */
  outcome: ReplayEndOutcome | "running";
  agent: string | null;
  model: string | null;
  quest_id: string | null;
  event_count: number;
  attempts: number;
  has_diff: boolean;
  bytes: number;
  diagnostics: number;
}

export interface PruneOptions {
  keepPerFeature?: number;
  /** Remove replays whose file is older than this (ms). */
  maxAgeMs?: number;
  now?: number;
  /** Execution ids that must not be removed. */
  protect?: string[];
}

// ---------------------------------------------------------------------------
// Truncation & ids
// ---------------------------------------------------------------------------

export interface Truncated {
  text: string;
  truncated: boolean;
  omitted: number;
}

export function truncateText(text: string, max: number): Truncated {
  if (text.length <= max) return { text, truncated: false, omitted: 0 };
  const omitted = text.length - max;
  return { text: `${text.slice(0, max)}…[truncated ${omitted} chars]`, truncated: true, omitted };
}

const SAFE_SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;

/** True for ids safe to use as a single path segment. */
export function isSafeSegment(s: string): boolean {
  return typeof s === "string" && s !== "." && s !== ".." && SAFE_SEGMENT.test(s);
}

function assertSafe(s: string, what: string): void {
  if (!isSafeSegment(s)) throw new Error(`Unsafe ${what} for replay path: ${JSON.stringify(s)}`);
}

// ---------------------------------------------------------------------------
// Normalization (opencode)
// ---------------------------------------------------------------------------

/**
 * Convert an opencode JSON event into a bounded, harness-neutral ReplayEvent.
 * Returns null only for non-object input. Never throws.
 */
export function normalizeOpenCodeEvent(event: OpenCodeEvent): ReplayEvent | null {
  if (!event || typeof event !== "object") return null;
  let truncated = false;
  const cut = (s: unknown, max: number): string => {
    const r = truncateText(typeof s === "string" ? s : String(s ?? ""), max);
    if (r.truncated) truncated = true;
    return r.text;
  };
  const out: ReplayEvent = { type: "raw" };
  if (typeof event.sessionID === "string") out.session_id = event.sessionID;
  const part = event.part;

  switch (event.type) {
    case "step_start":
      out.type = "step_start";
      break;

    case "tool_use": {
      out.type = "tool";
      out.tool = String(part?.tool ?? "unknown");
      if (part?.callID) out.call_id = String(part.callID);
      const state = part?.state;
      if (state?.status) out.status = String(state.status);
      if (state?.input && typeof state.input === "object") {
        const input: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(state.input)) {
          input[k] = typeof v === "string" ? cut(v, REPLAY_LIMITS.inputValue) : boundValue(v, cut);
        }
        out.input = input;
      }
      if (typeof state?.output === "string") out.output = cut(state.output, REPLAY_LIMITS.output);
      if (typeof state?.error === "string") out.error = cut(state.error, REPLAY_LIMITS.error);
      break;
    }

    case "text":
      out.type = "text";
      out.text = cut(part?.text ?? "", REPLAY_LIMITS.text);
      break;

    case "step_finish": {
      out.type = "step_finish";
      if (part?.reason) out.reason = String(part.reason);
      if (typeof part?.cost === "number") out.cost = part.cost;
      const t = part?.tokens;
      if (t) {
        out.tokens = {
          total: t.total ?? 0,
          input: t.input ?? 0,
          output: t.output ?? 0,
          reasoning: t.reasoning ?? 0,
          cache_read: t.cache?.read ?? 0,
          cache_write: t.cache?.write ?? 0,
        };
      }
      break;
    }

    case "error":
      out.type = "error";
      out.error = cut(event.error?.message ?? event.message ?? JSON.stringify(event.error ?? event), REPLAY_LIMITS.error);
      break;

    default:
      out.type = "raw";
      out.text = String(event.type ?? "unknown").slice(0, 100);
  }
  if (truncated) out.truncated = true;
  return out;
}

function boundValue(v: unknown, cut: (s: unknown, max: number) => string): unknown {
  if (v === null || typeof v === "number" || typeof v === "boolean") return v;
  let json: string;
  try {
    json = JSON.stringify(v) ?? "";
  } catch {
    json = String(v);
  }
  return json.length > REPLAY_LIMITS.inputValue ? cut(json, REPLAY_LIMITS.inputValue) : v;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface FileState {
  seq: number;
  bytes: number;
  capped: boolean;
  needsNewline: boolean;
}

export function replaysDir(projectRoot: string): string {
  return join(projectRoot, REPLAYS_DIR);
}

export class ReplayStore {
  readonly dir: string;
  private readonly maxFileBytes: number;
  private readonly states = new Map<string, FileState>();

  constructor(projectRoot: string, opts: { maxFileBytes?: number } = {}) {
    this.dir = replaysDir(projectRoot);
    this.maxFileBytes = opts.maxFileBytes ?? REPLAY_LIMITS.fileBytes;
  }

  pathFor(taskId: string, executionId: string): string {
    assertSafe(taskId, "task id");
    assertSafe(executionId, "execution id");
    return join(this.dir, taskId, `${executionId}.jsonl`);
  }

  /** Create the replay file with its header (idempotent). */
  begin(h: ReplayHeaderInput): void {
    const file = this.pathFor(h.task_id, h.execution_id);
    if (existsSync(file) && statSync(file).size > 0) return;
    this.append(h.task_id, h.execution_id, { kind: "header", ...h }, h.started_at);
  }

  /**
   * Append one record. Returns the written record, or null when it was
   * dropped by the size cap. Throws on unsafe ids or I/O errors (the daemon
   * recorder catches those).
   */
  append(taskId: string, executionId: string, payload: ReplayPayload, t?: string): ReplayRecord | null {
    const file = this.pathFor(taskId, executionId);
    const st = this.stateFor(file);
    const bounded = payload.kind === "event" || payload.kind === "attempt";

    if (bounded && st.capped) return null;
    if (bounded && st.bytes >= this.maxFileBytes) {
      st.capped = true;
      this.write(file, st, { kind: "event", event: { type: "raw", text: "replay size limit reached; later events dropped" } }, t);
      return null;
    }
    return this.write(file, st, payload, t);
  }

  private write(file: string, st: FileState, payload: ReplayPayload, t?: string): ReplayRecord {
    const record = { v: REPLAY_SCHEMA_VERSION, seq: st.seq, t: t ?? new Date().toISOString(), ...payload } as ReplayRecord;
    const line = (st.needsNewline ? "\n" : "") + JSON.stringify(record) + "\n";
    mkdirSync(join(file, ".."), { recursive: true });
    appendFileSync(file, line, "utf-8");
    st.seq += 1;
    st.bytes += Buffer.byteLength(line);
    st.needsNewline = false;
    return record;
  }

  private stateFor(file: string): FileState {
    let st = this.states.get(file);
    if (st) return st;
    st = { seq: 0, bytes: 0, capped: false, needsNewline: false };
    if (existsSync(file)) {
      const raw = readFileSync(file, "utf-8");
      st.bytes = Buffer.byteLength(raw);
      st.needsNewline = raw.length > 0 && !raw.endsWith("\n");
      let maxSeq = -1;
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        try {
          const rec = JSON.parse(line);
          if (typeof rec?.seq === "number" && rec.seq > maxSeq) maxSeq = rec.seq;
          if (rec?.kind === "event" && rec.event?.type === "raw" && /size limit/.test(rec.event.text ?? "")) st.capped = true;
        } catch {
          /* partial line */
        }
      }
      st.seq = maxSeq + 1;
    }
    this.states.set(file, st);
    return st;
  }

  /** Load one replay; null if absent or ids are unsafe. */
  load(taskId: string, executionId: string): LoadedReplay | null {
    if (!isSafeSegment(taskId) || !isSafeSegment(executionId)) return null;
    const file = this.pathFor(taskId, executionId);
    if (!existsSync(file)) return null;
    let raw: string;
    try {
      raw = readFileSync(file, "utf-8");
    } catch {
      return null;
    }
    return parseReplay(raw, file, taskId, executionId);
  }

  /** Task ids that have recorded replays. */
  listTasks(): string[] {
    if (!existsSync(this.dir)) return [];
    try {
      return readdirSync(this.dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && isSafeSegment(d.name))
        .map((d) => d.name)
        .sort();
    } catch {
      return [];
    }
  }

  /** Execution summaries (all tasks, or one), oldest first. */
  list(taskId?: string): ReplaySummary[] {
    const tasks = taskId === undefined ? this.listTasks() : isSafeSegment(taskId) ? [taskId] : [];
    const out: ReplaySummary[] = [];
    for (const task of tasks) {
      for (const id of this.executionIds(task)) {
        const r = this.load(task, id);
        if (r) out.push(summarize(r));
      }
    }
    return out.sort(
      (a, b) =>
        (a.started_at ?? "").localeCompare(b.started_at ?? "") ||
        a.task_id.localeCompare(b.task_id) ||
        a.execution_id.localeCompare(b.execution_id),
    );
  }

  private executionIds(taskId: string): string[] {
    const d = join(this.dir, taskId);
    if (!existsSync(d)) return [];
    try {
      return readdirSync(d)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => f.slice(0, -".jsonl".length))
        .filter(isSafeSegment);
    } catch {
      return [];
    }
  }

  /**
   * Retention: per task keep the newest `keepPerFeature` executions (by file
   * mtime) and drop files older than `maxAgeMs`. Returns removed paths.
   */
  prune(opts: PruneOptions = {}): string[] {
    const keep = opts.keepPerFeature ?? DEFAULT_KEEP_PER_TASK;
    const now = opts.now ?? Date.now();
    const protect = new Set(opts.protect ?? []);
    const removed: string[] = [];
    for (const task of this.listTasks()) {
      const files = this.executionIds(task)
        .map((id) => {
          const p = this.pathFor(task, id);
          let mtime = 0;
          try {
            mtime = statSync(p).mtimeMs;
          } catch {
            /* gone */
          }
          return { id, p, mtime };
        })
        .sort((a, b) => b.mtime - a.mtime || b.id.localeCompare(a.id));
      files.forEach((f, i) => {
        if (protect.has(f.id)) return;
        const tooMany = i >= keep;
        const tooOld = opts.maxAgeMs !== undefined && now - f.mtime > opts.maxAgeMs;
        if (!tooMany && !tooOld) return;
        try {
          rmSync(f.p, { force: true });
          this.states.delete(f.p);
          removed.push(f.p);
        } catch {
          /* best effort */
        }
      });
      try {
        rmdirSync(join(this.dir, task)); // only succeeds when empty
      } catch {
        /* not empty */
      }
    }
    return removed;
  }
}

// ---------------------------------------------------------------------------
// Parsing & summaries
// ---------------------------------------------------------------------------

export function parseReplay(raw: string, path: string, taskId: string, executionId: string): LoadedReplay {
  const r: LoadedReplay = {
    path,
    task_id: taskId,
    execution_id: executionId,
    header: null,
    records: [],
    prompt: null,
    diff: null,
    end: null,
    diagnostics: [],
  };
  const lines = raw.split("\n");
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    let rec: any;
    try {
      rec = JSON.parse(line);
    } catch (err) {
      r.diagnostics.push({ line: idx + 1, kind: "malformed", message: err instanceof Error ? err.message : String(err) });
      return;
    }
    if (!rec || typeof rec !== "object" || typeof rec.kind !== "string") {
      r.diagnostics.push({ line: idx + 1, kind: "invalid", message: "not a replay record" });
      return;
    }
    if (rec.v !== REPLAY_SCHEMA_VERSION) {
      r.diagnostics.push({ line: idx + 1, kind: "unsupported_version", message: `unsupported record version ${String(rec.v)}` });
      return;
    }
    r.records.push(rec as ReplayRecord);
    switch (rec.kind) {
      case "header":
        if (!r.header) r.header = rec;
        break;
      case "prompt":
        if (r.prompt === null) r.prompt = rec.text;
        break;
      case "diff":
        r.diff = rec; // last wins
        break;
      case "end":
        r.end = rec; // last wins
        break;
    }
  });
  return r;
}

function summarize(r: LoadedReplay): ReplaySummary {
  let bytes = 0;
  try {
    bytes = statSync(r.path).size;
  } catch {
    /* ignore */
  }
  return {
    task_id: r.task_id,
    execution_id: r.execution_id,
    path: r.path,
    started_at: r.header?.started_at ?? r.records[0]?.t ?? null,
    ended_at: r.end?.t ?? null,
    outcome: r.end?.outcome ?? "running",
    agent: r.header?.agent ?? null,
    model: r.header?.model ?? null,
    quest_id: r.header?.quest_id ?? null,
    event_count: r.records.filter((x) => x.kind === "event").length,
    attempts: r.records.filter((x) => x.kind === "attempt").length,
    has_diff: r.diff !== null,
    bytes,
    diagnostics: r.diagnostics.length,
  };
}

// ---------------------------------------------------------------------------
// Labels (shared by the CLI and the TUI viewer)
// ---------------------------------------------------------------------------

function firstLine(s: string, max = 80): string {
  const line = s.split("\n").find((l) => l.trim()) ?? "";
  const t = line.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function toolSummary(input: Record<string, unknown> | undefined): string {
  if (!input) return "";
  const pick = input.command ?? input.cmd ?? input.filePath ?? input.path ?? input.pattern ?? input.description ?? input.prompt;
  if (pick !== undefined) return firstLine(String(pick), 60);
  const first = Object.values(input)[0];
  return first === undefined ? "" : firstLine(typeof first === "string" ? first : JSON.stringify(first), 60);
}

/** One-line, plain-text description of a record (no timestamps). */
export function recordLabel(r: ReplayRecord): string {
  switch (r.kind) {
    case "header":
      return `session ${r.task_id}${r.agent ? ` (${r.agent}${r.model ? `, ${r.model}` : ""})` : ""}`;
    case "prompt":
      return `prompt (${r.text.length} chars)`;
    case "attempt":
      return r.reason === "start" ? `attempt ${r.n} started` : `attempt ${r.n} (retry)`;
    case "diff":
      return `diff: ${r.files.length} file${r.files.length === 1 ? "" : "s"}${r.truncated ? " (truncated)" : ""}`;
    case "end":
      return `end: ${r.outcome}${r.detail ? ` - ${firstLine(r.detail, 60)}` : ""}`;
    case "event": {
      const e = r.event;
      switch (e.type) {
        case "step_start":
          return "step start";
        case "text":
          return `text: ${firstLine(e.text ?? "")}`;
        case "tool": {
          const mark = e.status === "error" ? " !" : "";
          const sum = toolSummary(e.input);
          return `tool ${e.tool ?? "?"}${sum ? ` ${sum}` : ""}${mark}`;
        }
        case "step_finish":
          return `step finish${e.reason ? ` (${e.reason})` : ""}${e.tokens ? ` ${e.tokens.input}in/${e.tokens.output}out` : ""}`;
        case "error":
          return `error: ${firstLine(e.error ?? "")}`;
        default:
          return `raw: ${firstLine(e.text ?? "")}`;
      }
    }
  }
}
