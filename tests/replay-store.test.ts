/**
 * replay-store.test.ts — Replay format, normalization, bounds and ReplayStore.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, appendFileSync, existsSync, utimesSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  REPLAY_SCHEMA_VERSION,
  REPLAY_LIMITS,
  ReplayStore,
  normalizeOpenCodeEvent,
  truncateText,
  isSafeSegment,
  type ReplayHeaderInput,
} from "../src/lib/replay";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "replay-store-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const header = (over: Partial<ReplayHeaderInput> = {}): ReplayHeaderInput => ({
  execution_id: "feat-a-1",
  task_id: "feat-a",
  quest_id: "q",
  wave_id: "w1",
  agent: "fake-agent",
  model: "m",
  started_at: "2026-03-01T10:00:00.000Z",
  ...over,
});

describe("truncateText", () => {
  test("returns text untouched under the limit", () => {
    expect(truncateText("hello", 10)).toEqual({ text: "hello", truncated: false, omitted: 0 });
  });
  test("truncates with an explicit marker reporting omitted chars", () => {
    const r = truncateText("x".repeat(100), 10);
    expect(r.truncated).toBe(true);
    expect(r.omitted).toBe(90);
    expect(r.text.startsWith("x".repeat(10))).toBe(true);
    expect(r.text).toContain("[truncated 90 chars]");
  });
});

describe("isSafeSegment", () => {
  test("accepts ids and rejects traversal", () => {
    expect(isSafeSegment("my-task_1.2")).toBe(true);
    for (const bad of ["", "..", ".", "a/b", "a\\b", "../x", ".hidden", "a\0b"]) {
      expect(isSafeSegment(bad)).toBe(false);
    }
  });
});

describe("normalizeOpenCodeEvent", () => {
  test("step_start", () => {
    expect(normalizeOpenCodeEvent({ type: "step_start", sessionID: "s1" })).toMatchObject({ type: "step_start", session_id: "s1" });
  });
  test("tool_use completed with input and output", () => {
    const e = normalizeOpenCodeEvent({
      type: "tool_use",
      part: { tool: "bash", callID: "c1", state: { status: "completed", input: { command: "ls" }, output: "a\nb" } },
    });
    expect(e).toMatchObject({ type: "tool", tool: "bash", call_id: "c1", status: "completed", input: { command: "ls" }, output: "a\nb" });
  });
  test("tool_use error", () => {
    const e = normalizeOpenCodeEvent({ type: "tool_use", part: { tool: "read", state: { status: "error", error: "ENOENT" } } });
    expect(e).toMatchObject({ type: "tool", status: "error", error: "ENOENT" });
  });
  test("text", () => {
    expect(normalizeOpenCodeEvent({ type: "text", part: { text: "hi" } })).toMatchObject({ type: "text", text: "hi" });
  });
  test("step_finish keeps reason and tokens", () => {
    const e = normalizeOpenCodeEvent({
      type: "step_finish",
      part: { reason: "stop", cost: 0.5, tokens: { total: 10, input: 4, output: 5, reasoning: 1, cache: { read: 2, write: 3 } } },
    });
    expect(e).toMatchObject({
      type: "step_finish",
      reason: "stop",
      cost: 0.5,
      tokens: { total: 10, input: 4, output: 5, reasoning: 1, cache_read: 2, cache_write: 3 },
    });
  });
  test("unknown types become raw events and never throw", () => {
    expect(normalizeOpenCodeEvent({ type: "weird" })).toMatchObject({ type: "raw", text: "weird" });
    expect(normalizeOpenCodeEvent(null as any)).toBeNull();
  });
  test("huge outputs and tool inputs are truncated with markers", () => {
    const e = normalizeOpenCodeEvent({
      type: "tool_use",
      part: {
        tool: "bash",
        state: { status: "completed", input: { command: "y".repeat(REPLAY_LIMITS.inputValue + 500) }, output: "z".repeat(REPLAY_LIMITS.output * 2) },
      },
    })!;
    expect(e.truncated).toBe(true);
    expect(e.output!.length).toBeLessThan(REPLAY_LIMITS.output + 100);
    expect(e.output).toContain("[truncated");
    expect(String(e.input!.command)).toContain("[truncated 500 chars]");
  });
});

describe("ReplayStore", () => {
  test("writes versioned JSONL under replays/<feature>/<execution>.jsonl", () => {
    const store = new ReplayStore(root);
    store.begin(header());
    store.append("feat-a", "feat-a-1", { kind: "prompt", text: "do it", truncated: false });
    store.append("feat-a", "feat-a-1", { kind: "event", event: { type: "text", text: "ok" } });
    const file = join(root, ".wombo-combo", "replays", "feat-a", "feat-a-1.jsonl");
    expect(existsSync(file)).toBe(true);
    const lines = readFileSync(file, "utf-8").trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.map((l) => l.kind)).toEqual(["header", "prompt", "event"]);
    expect(lines.map((l) => l.seq)).toEqual([0, 1, 2]);
    expect(lines.every((l) => l.v === REPLAY_SCHEMA_VERSION && typeof l.t === "string")).toBe(true);
  });

  test("begin is idempotent and resumes seq after a restart", () => {
    const a = new ReplayStore(root);
    a.begin(header());
    a.append("feat-a", "feat-a-1", { kind: "event", event: { type: "text", text: "1" } });
    const b = new ReplayStore(root); // new process
    b.begin(header()); // does not write a second header
    b.append("feat-a", "feat-a-1", { kind: "event", event: { type: "text", text: "2" } });
    const r = b.load("feat-a", "feat-a-1")!;
    expect(r.records.map((x) => x.kind)).toEqual(["header", "event", "event"]);
    expect(r.records.map((x) => x.seq)).toEqual([0, 1, 2]);
  });

  test("load returns structured replay with prompt, diff and end", () => {
    const store = new ReplayStore(root);
    store.begin(header());
    store.append("feat-a", "feat-a-1", { kind: "prompt", text: "P", truncated: false });
    store.append("feat-a", "feat-a-1", { kind: "attempt", n: 1, reason: "start" });
    store.append("feat-a", "feat-a-1", { kind: "event", event: { type: "step_start" } });
    store.append("feat-a", "feat-a-1", { kind: "diff", diff: "diff --git a/x b/x\n", truncated: false, files: [{ path: "x", additions: 1, deletions: 0 }], baseline: "abc" });
    store.append("feat-a", "feat-a-1", { kind: "end", outcome: "succeeded", detail: "verified" });
    const r = store.load("feat-a", "feat-a-1")!;
    expect(r.header?.task_id).toBe("feat-a");
    expect(r.prompt).toBe("P");
    expect(r.diff?.files[0].path).toBe("x");
    expect(r.end?.outcome).toBe("succeeded");
    expect(r.diagnostics).toEqual([]);
  });

  test("load tolerates a missing end, a truncated last line and unsupported versions", () => {
    const store = new ReplayStore(root);
    store.begin(header());
    store.append("feat-a", "feat-a-1", { kind: "event", event: { type: "text", text: "ok" } });
    const file = join(root, ".wombo-combo", "replays", "feat-a", "feat-a-1.jsonl");
    appendFileSync(file, JSON.stringify({ v: 99, seq: 9, t: "x", kind: "event" }) + "\n");
    appendFileSync(file, '{"v":1,"seq":10,"t":"x","kind":"ev'); // crash mid-line
    const r = new ReplayStore(root).load("feat-a", "feat-a-1")!;
    expect(r.end).toBeNull();
    expect(r.records).toHaveLength(2);
    expect(r.diagnostics.map((d) => d.kind).sort()).toEqual(["malformed", "unsupported_version"]);
  });

  test("appending after a crash does not glue onto a partial line", () => {
    const store = new ReplayStore(root);
    store.begin(header());
    const file = join(root, ".wombo-combo", "replays", "feat-a", "feat-a-1.jsonl");
    appendFileSync(file, '{"v":1,"seq":1,"t":"x","kind":"ev');
    const s2 = new ReplayStore(root);
    s2.append("feat-a", "feat-a-1", { kind: "event", event: { type: "text", text: "after" } });
    const r = s2.load("feat-a", "feat-a-1")!;
    expect(r.records.filter((x) => x.kind === "event")).toHaveLength(1);
    expect(r.diagnostics).toHaveLength(1);
  });

  test("enforces the per-file size cap, always keeping prompt, diff and end", () => {
    const store = new ReplayStore(root, { maxFileBytes: 2000 });
    store.begin(header());
    for (let i = 0; i < 50; i++) {
      store.append("feat-a", "feat-a-1", { kind: "event", event: { type: "text", text: "x".repeat(200) } });
    }
    store.append("feat-a", "feat-a-1", { kind: "diff", diff: "d", truncated: false, files: [], baseline: null });
    store.append("feat-a", "feat-a-1", { kind: "end", outcome: "failed" });
    const r = store.load("feat-a", "feat-a-1")!;
    const events = r.records.filter((x) => x.kind === "event");
    expect(events.length).toBeLessThan(50);
    const last = events[events.length - 1] as any;
    expect(last.event.type).toBe("raw");
    expect(last.event.text).toContain("size limit");
    expect(r.diff).not.toBeNull();
    expect(r.end?.outcome).toBe("failed");
  });

  test("rejects unsafe path segments", () => {
    const store = new ReplayStore(root);
    expect(() => store.begin(header({ task_id: "../evil" }))).toThrow();
    expect(() => store.append("a", "../b", { kind: "end", outcome: "failed" })).toThrow();
    expect(store.load("..", "x")).toBeNull();
  });

  test("list summarises executions ordered oldest to newest", () => {
    const store = new ReplayStore(root);
    store.begin(header({ execution_id: "feat-a-2", started_at: "2026-03-02T10:00:00.000Z" }));
    store.append("feat-a", "feat-a-2", { kind: "end", outcome: "failed", detail: "boom" });
    store.begin(header({ execution_id: "feat-a-1" }));
    store.append("feat-a", "feat-a-1", { kind: "event", event: { type: "text", text: "a" } });
    store.append("feat-a", "feat-a-1", { kind: "end", outcome: "succeeded" });
    store.begin(header({ task_id: "feat-b", execution_id: "feat-b-1" }));
    const all = store.list();
    expect(all.map((s) => s.execution_id)).toEqual(["feat-a-1", "feat-b-1", "feat-a-2"].sort((x, y) => {
      const ts: Record<string, string> = { "feat-a-1": "2026-03-01T10:00:00.000Z", "feat-b-1": "2026-03-01T10:00:00.000Z", "feat-a-2": "2026-03-02T10:00:00.000Z" };
      return ts[x].localeCompare(ts[y]) || x.localeCompare(y);
    }));
    const onlyA = store.list("feat-a");
    expect(onlyA.map((s) => s.execution_id)).toEqual(["feat-a-1", "feat-a-2"]);
    expect(onlyA[0]).toMatchObject({ task_id: "feat-a", outcome: "succeeded", event_count: 1 });
    expect(onlyA[1].outcome).toBe("failed");
    expect(store.list("missing")).toEqual([]);
    expect(store.listTasks()).toEqual(["feat-a", "feat-b"]);
  });

  test("list reports unfinished executions as running", () => {
    const store = new ReplayStore(root);
    store.begin(header());
    expect(store.list("feat-a")[0].outcome).toBe("running");
  });

  test("prune keeps the newest N per feature and honours max age", () => {
    const store = new ReplayStore(root);
    for (let i = 1; i <= 5; i++) {
      store.begin(header({ execution_id: `feat-a-${i}`, started_at: `2026-03-0${i}T10:00:00.000Z` }));
      const f = join(root, ".wombo-combo", "replays", "feat-a", `feat-a-${i}.jsonl`);
      const when = new Date(`2026-03-0${i}T10:00:00.000Z`);
      utimesSync(f, when, when);
    }
    const removed = store.prune({ keepPerFeature: 3 });
    expect(removed.map((p) => p.split("/").pop()).sort()).toEqual(["feat-a-1.jsonl", "feat-a-2.jsonl"]);
    expect(store.list("feat-a").map((s) => s.execution_id)).toEqual(["feat-a-3", "feat-a-4", "feat-a-5"]);
    const removedByAge = store.prune({ keepPerFeature: 10, maxAgeMs: 24 * 3600_000, now: new Date("2026-03-05T12:00:00.000Z").getTime() });
    expect(removedByAge).toHaveLength(2); // 3 and 4 are older than a day, 5 is not
    expect(store.list("feat-a").map((s) => s.execution_id)).toEqual(["feat-a-5"]);
  });

  test("prune never removes an execution it was told to protect", () => {
    const store = new ReplayStore(root);
    for (let i = 1; i <= 3; i++) {
      store.begin(header({ execution_id: `feat-a-${i}` }));
      const f = join(root, ".wombo-combo", "replays", "feat-a", `feat-a-${i}.jsonl`);
      const when = new Date(2026, 2, i);
      utimesSync(f, when, when);
    }
    store.prune({ keepPerFeature: 1, protect: ["feat-a-1"] });
    expect(store.list("feat-a").map((s) => s.execution_id).sort()).toEqual(["feat-a-1", "feat-a-3"]);
  });

  test("file stays small and valid JSON per line", () => {
    const store = new ReplayStore(root);
    store.begin(header());
    store.append("feat-a", "feat-a-1", { kind: "event", event: { type: "text", text: "multi\nline" } });
    const file = join(root, ".wombo-combo", "replays", "feat-a", "feat-a-1.jsonl");
    expect(statSync(file).size).toBeGreaterThan(0);
    for (const line of readFileSync(file, "utf-8").trim().split("\n")) JSON.parse(line);
    writeFileSync(join(root, "unused"), "");
  });
});
