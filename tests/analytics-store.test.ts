import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readdirSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AnalyticsStore,
  ANALYTICS_SCHEMA_VERSION,
  analyticsDir,
  createAnalyticsRecord,
  validateAnalyticsRecord,
  StaleRevisionError,
  type AgentAnalyticsRecord,
} from "../src/lib/analytics";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "analytics-store-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function rec(over: Partial<AgentAnalyticsRecord> = {}): AgentAnalyticsRecord {
  return createAnalyticsRecord({
    execution_id: "exec-1",
    wave_id: "wave-1",
    task_id: "task-a",
    ...over,
  });
}

describe("AnalyticsStore", () => {
  test("missing storage returns empty data", () => {
    const store = new AnalyticsStore(root);
    const res = store.load();
    expect(res.records).toEqual([]);
    expect(res.diagnostics).toEqual([]);
    expect(store.get("nope")).toBeNull();
  });

  test("createAnalyticsRecord defaults unknown measurements to null", () => {
    const r = rec();
    expect(r.schema_version).toBe(ANALYTICS_SCHEMA_VERSION);
    expect(r.revision).toBe(0);
    expect(r.additions).toBeNull();
    expect(r.deletions).toBeNull();
    expect(r.duration_ms).toBeNull();
    expect(r.first_started_at).toBeNull();
    expect(r.verified_at).toBeNull();
    expect(r.baseline_head).toBeNull();
    expect(r.measured_head).toBeNull();
    expect(r.quest_id).toBeNull();
    expect(r.model).toBeNull();
    expect(r.outcome).toBe("running");
    expect(r.measurement_phase).toBe("pending");
    expect(r.usage.total_tokens).toBe(0);
    expect(r.usage_coverage).toBe("none");
    expect(r.build_attempts).toBe(0);
    expect(r.build_passes).toBe(0);
    expect(r.retry_count).toBe(0);
  });

  test("upsert writes project-root snapshot and round-trips", () => {
    const store = new AnalyticsStore(root);
    const saved = store.upsert(rec({ quest_id: "q", additions: 3, deletions: 1 }));
    expect(saved.revision).toBe(1);
    expect(readdirSync(analyticsDir(root)).length).toBe(1);
    const loaded = store.get("exec-1");
    expect(loaded?.additions).toBe(3);
    expect(loaded?.quest_id).toBe("q");
  });

  test("upsert does not increase execution count; repeated task executions stay distinct", () => {
    const store = new AnalyticsStore(root);
    let r = store.upsert(rec());
    r = store.upsert({ ...r, retry_count: 1 });
    r = store.upsert({ ...r, retry_count: 2 });
    expect(store.load().records.length).toBe(1);
    store.upsert(rec({ execution_id: "exec-2" }));
    const all = store.load().records;
    expect(all.length).toBe(2);
    expect(all.filter((x) => x.task_id === "task-a").length).toBe(2);
  });

  test("rejects stale revisions", () => {
    const store = new AnalyticsStore(root);
    const first = store.upsert(rec());
    store.upsert({ ...first, retry_count: 5 });
    expect(() => store.upsert({ ...first, retry_count: 1 })).toThrow(StaleRevisionError);
    expect(store.get("exec-1")?.retry_count).toBe(5);
  });

  test("safe generated filenames and no leftover temp files", () => {
    const store = new AnalyticsStore(root);
    store.upsert(rec({ execution_id: "../../etc/passwd" }));
    store.upsert(rec({ execution_id: "a/b c:d" }));
    const files = readdirSync(analyticsDir(root));
    expect(files.length).toBe(2);
    for (const f of files) {
      expect(f).toMatch(/^[A-Za-z0-9._-]+\.json$/);
      expect(f.includes("..")).toBe(false);
    }
    expect(store.get("../../etc/passwd")?.execution_id).toBe("../../etc/passwd");
    expect(store.load().records.length).toBe(2);
  });

  test("filenames do not collide for ids that sanitize identically", () => {
    const store = new AnalyticsStore(root);
    store.upsert(rec({ execution_id: "a/b" }));
    store.upsert(rec({ execution_id: "a:b" }));
    expect(store.load().records.length).toBe(2);
  });

  test("load returns diagnostics for malformed and unsupported files, keeps valid ones", () => {
    const store = new AnalyticsStore(root);
    store.upsert(rec());
    const dir = analyticsDir(root);
    writeFileSync(join(dir, "bad.json"), "{not json");
    writeFileSync(join(dir, "future.json"), JSON.stringify({ ...rec(), schema_version: 999 }));
    writeFileSync(join(dir, "invalid.json"), JSON.stringify({ schema_version: 1, execution_id: 5 }));
    writeFileSync(join(dir, "note.txt"), "ignored");
    const res = store.load();
    expect(res.records.length).toBe(1);
    expect(res.diagnostics.map((d) => d.kind).sort()).toEqual(["invalid", "malformed", "unsupported_version"]);
    expect(res.diagnostics.every((d) => d.file.endsWith(".json"))).toBe(true);
  });

  test("validateAnalyticsRecord reports problems", () => {
    expect(validateAnalyticsRecord(rec()).ok).toBe(true);
    expect(validateAnalyticsRecord({ ...rec(), additions: "x" }).ok).toBe(false);
    expect(validateAnalyticsRecord(null).ok).toBe(false);
    expect(validateAnalyticsRecord({ ...rec(), outcome: "weird" }).ok).toBe(false);
    for (const phase of ["pending", "measured", "replacement", "unavailable"] as const) {
      expect(validateAnalyticsRecord({ ...rec(), measurement_phase: phase }).ok).toBe(true);
    }
    expect(validateAnalyticsRecord({ ...rec(), measurement_phase: "other" }).ok).toBe(false);
  });

  test("upsert rejects invalid records", () => {
    const store = new AnalyticsStore(root);
    expect(() => store.upsert({ ...rec(), execution_id: "" })).toThrow();
  });

  test("snapshot is valid JSON on disk", () => {
    const store = new AnalyticsStore(root);
    store.upsert(rec());
    const f = readdirSync(analyticsDir(root))[0];
    const parsed = JSON.parse(readFileSync(join(analyticsDir(root), f), "utf-8"));
    expect(parsed.execution_id).toBe("exec-1");
  });

  test("empty directory loads as empty", () => {
    mkdirSync(analyticsDir(root), { recursive: true });
    expect(new AnalyticsStore(root).load().records).toEqual([]);
  });
});
