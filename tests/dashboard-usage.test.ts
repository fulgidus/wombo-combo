import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  DashboardUsageReader,
  buildTaskQuestMap,
  normalizeUsageRecord,
} from "../src/lib/dashboard-usage";
import { loadUsageRecords, groupBy } from "../src/lib/token-usage";
import type { UsageRecord } from "../src/lib/token-collector";

let root: string;
let file: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "dash-usage-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  file = join(root, ".wombo-combo", "usage.jsonl");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function rec(task: string, quest: string | null, tokens = 10, extra: Partial<UsageRecord> = {}): UsageRecord {
  return {
    task_id: task,
    quest_id: quest,
    model: "m",
    provider: "p",
    harness: "h",
    input_tokens: tokens,
    output_tokens: tokens * 2,
    cache_read: 1,
    cache_write: 2,
    reasoning_tokens: 3,
    total_tokens: tokens * 3 + 3,
    cost: 0.5,
    is_final_step: false,
    timestamp: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}
const line = (r: unknown) => JSON.stringify(r) + "\n";
const byQuest = (r: DashboardUsageReader) => Object.fromEntries(r.snapshot().map((e) => [e.questId ?? "(unknown)", e.totals]));

describe("DashboardUsageReader", () => {
  test("missing file is unavailable and empty", () => {
    const r = new DashboardUsageReader(root);
    expect(r.refresh()).toEqual({ available: false, changed: false, recordsAdded: 0 });
    expect(r.snapshot()).toEqual([]);
    expect(r.isAvailable()).toBe(false);
  });

  test("bootstraps existing records with existing aggregation semantics", () => {
    writeFileSync(file, line(rec("a", "q1", 10)) + line(rec("b", "q1", 20)) + line(rec("c", "q2", 5)));
    const r = new DashboardUsageReader(root);
    const res = r.refresh();
    expect(res).toEqual({ available: true, changed: true, recordsAdded: 3 });
    const expected = groupBy(loadUsageRecords(root), "quest_id");
    const got = byQuest(r);
    expect(got.q1).toEqual(expected.get("q1")!);
    expect(got.q2).toEqual(expected.get("q2")!);
    expect(got.q1!.reasoning_tokens).toBe(6);
    expect(got.q1!.cache_read).toBe(2);
    expect(got.q1!.cache_write).toBe(4);
    expect(got.q1!.record_count).toBe(2);
    expect(r.snapshot()[0]!.questId).toBe("q1"); // largest first
  });

  test("consumes only appended bytes and counts each line once", () => {
    writeFileSync(file, line(rec("a", "q1", 10)));
    const r = new DashboardUsageReader(root);
    r.refresh();
    expect(r.refresh()).toEqual({ available: true, changed: false, recordsAdded: 0 });
    appendFileSync(file, line(rec("a", "q1", 10)));
    expect(r.refresh().recordsAdded).toBe(1);
    expect(r.refresh().recordsAdded).toBe(0);
    expect(byQuest(r).q1!.record_count).toBe(2);
  });

  test("does not reread existing records after bootstrap", () => {
    writeFileSync(file, line(rec("a", "q1", 10)));
    const r = new DashboardUsageReader(root);
    r.refresh();
    // Overwrite the already-consumed region with same length garbage? That is a head change -> reset.
    // Instead prove incrementality: append only; totals reflect exactly one extra record.
    appendFileSync(file, line(rec("b", "q1", 1)));
    r.refresh();
    expect(byQuest(r).q1!.record_count).toBe(2);
  });

  test("retains trailing partial lines until completed", () => {
    const full = line(rec("a", "q1", 10));
    writeFileSync(file, line(rec("z", "q1", 1)) + full.slice(0, 40));
    const r = new DashboardUsageReader(root);
    expect(r.refresh().recordsAdded).toBe(1);
    appendFileSync(file, full.slice(40, 90));
    expect(r.refresh().recordsAdded).toBe(0);
    appendFileSync(file, full.slice(90));
    expect(r.refresh().recordsAdded).toBe(1);
    expect(byQuest(r).q1!.record_count).toBe(2);
  });

  test("unterminated final valid JSON is not counted until its newline arrives", () => {
    writeFileSync(file, JSON.stringify(rec("a", "q1")));
    const r = new DashboardUsageReader(root);
    expect(r.refresh().recordsAdded).toBe(0);
    appendFileSync(file, "\n");
    expect(r.refresh().recordsAdded).toBe(1);
  });

  test("skips malformed and invalid records", () => {
    writeFileSync(
      file,
      "not json\n\n{\n" +
        line(rec("a", "q1", 10)) +
        line({ ...rec("b", "q1"), input_tokens: "10" }) +
        line({ ...rec("b", "q1"), cost: NaN }) +
        line({ ...rec("b", "q1"), output_tokens: -1 }) +
        line({ ...rec("b", "q1"), total_tokens: null }) +
        line({ ...rec("", "q1") }) +
        line({ ...rec("b", "q1"), timestamp: "" }) +
        "[1,2]\n" +
        "null\n",
    );
    const r = new DashboardUsageReader(root);
    expect(r.refresh().recordsAdded).toBe(1);
    expect(byQuest(r).q1!.record_count).toBe(1);
    expect(normalizeUsageRecord({ ...rec("a", null), cost: Infinity })).toBeNull();
  });

  test("explicit quest_id wins; legacy records resolve via metadata or unknown group", () => {
    writeFileSync(
      file,
      line(rec("t1", "explicit", 10)) + line(rec("t1", null, 10)) + line(rec("t2", null, 10)) + line(rec("t3", null, 10)),
    );
    const meta = new Map<string, string | null>([["t1", "other"], ["t2", "legacyq"]]);
    const r = new DashboardUsageReader(root, meta);
    r.refresh();
    const got = byQuest(r);
    expect(got.explicit!.record_count).toBe(1);
    expect(got.other!.record_count).toBe(1); // t1 legacy -> metadata quest
    expect(got.legacyq!.record_count).toBe(1);
    expect(got["(unknown)"]!.record_count).toBe(1); // t3 unresolved
    expect(r.snapshot().find((e) => e.questId === null)).toBeDefined();
  });

  test("metadata refresh re-attributes without rereading records", () => {
    writeFileSync(file, line(rec("t1", null, 10)));
    const r = new DashboardUsageReader(root);
    r.refresh();
    expect(byQuest(r)["(unknown)"]!.record_count).toBe(1);
    r.setTaskQuests((id) => (id === "t1" ? "qq" : null));
    expect(byQuest(r).qq!.record_count).toBe(1);
    expect(byQuest(r)["(unknown)"]).toBeUndefined();
    r.setTaskQuests(null);
    expect(byQuest(r)["(unknown)"]!.record_count).toBe(1);
    expect(r.refresh().recordsAdded).toBe(0);
  });

  test("buildTaskQuestMap covers active, archive and subtasks", () => {
    const mk = (id: string, quest?: string, subtasks: any[] = []) => ({ id, quest, subtasks }) as any;
    const m = buildTaskQuestMap([mk("a", "q1", [mk("a1", "q1")])], [mk("b", "q2")], null);
    expect(m.get("a")).toBe("q1");
    expect(m.get("a1")).toBe("q1");
    expect(m.get("b")).toBe("q2");
    expect(m.get("zzz")).toBeUndefined();
  });

  test("truncation resets and rebootstraps", () => {
    writeFileSync(file, line(rec("a", "q1", 10)) + line(rec("b", "q1", 10)));
    const r = new DashboardUsageReader(root);
    r.refresh();
    writeFileSync(file, line(rec("c", "q2", 1)));
    const res = r.refresh();
    expect(res.changed).toBe(true);
    const got = byQuest(r);
    expect(got.q1).toBeUndefined();
    expect(got.q2!.record_count).toBe(1);
  });

  test("replacement by a new file (different identity) resets", () => {
    writeFileSync(file, line(rec("a", "q1", 10)));
    const r = new DashboardUsageReader(root);
    r.refresh();
    const next = join(root, ".wombo-combo", "usage.next");
    writeFileSync(next, line(rec("x", "q9", 10)) + line(rec("y", "q9", 10)) + line(rec("z", "q9", 10)));
    renameSync(next, file);
    r.refresh();
    const got = byQuest(r);
    expect(got.q1).toBeUndefined();
    expect(got.q9!.record_count).toBe(3);
  });

  test("in-place rewrite with different head resets", () => {
    writeFileSync(file, line(rec("a", "q1", 10)));
    const r = new DashboardUsageReader(root);
    r.refresh();
    writeFileSync(file, line(rec("b", "q7", 10)) + line(rec("b", "q7", 10)));
    r.refresh();
    const got = byQuest(r);
    expect(got.q1).toBeUndefined();
    expect(got.q7!.record_count).toBe(2);
  });

  test("file deleted clears totals and reports unavailable; recreation recovers", () => {
    writeFileSync(file, line(rec("a", "q1", 10)));
    const r = new DashboardUsageReader(root);
    r.refresh();
    rmSync(file);
    expect(r.refresh()).toEqual({ available: false, changed: true, recordsAdded: 0 });
    expect(r.snapshot()).toEqual([]);
    writeFileSync(file, line(rec("a", "q1", 10)));
    expect(r.refresh().recordsAdded).toBe(1);
    expect(r.isAvailable()).toBe(true);
  });

  test("multi-byte UTF-8 split across reads decodes correctly", () => {
    const text = line(rec("tâche-é-日本", "quête-日本", 10, { model: "モデル" }));
    const bytes = Buffer.from(text, "utf8");
    // split inside a multi-byte sequence
    const idx = bytes.indexOf(Buffer.from("日", "utf8")) + 1;
    writeFileSync(file, bytes.subarray(0, idx));
    const r = new DashboardUsageReader(root);
    expect(r.refresh().recordsAdded).toBe(0);
    appendFileSync(file, bytes.subarray(idx));
    expect(r.refresh().recordsAdded).toBe(1);
    expect(byQuest(r)["quête-日本"]!.record_count).toBe(1);
  });

  test("handles records spanning several read chunks", () => {
    const big = rec("a", "q1", 10, { model: "x".repeat(150_000) });
    writeFileSync(file, line(big) + line(rec("b", "q1", 5)));
    const r = new DashboardUsageReader(root);
    expect(r.refresh().recordsAdded).toBe(2);
  });

  test("never writes to the usage file", () => {
    const content = line(rec("a", "q1", 10)) + "garbage";
    writeFileSync(file, content);
    const r = new DashboardUsageReader(root);
    r.refresh();
    r.refresh();
    expect(require("node:fs").readFileSync(file, "utf8")).toBe(content);
  });

  test("close stops further reads", () => {
    writeFileSync(file, line(rec("a", "q1", 10)));
    const r = new DashboardUsageReader(root);
    r.refresh();
    r.close();
    appendFileSync(file, line(rec("a", "q1", 10)));
    expect(r.refresh().recordsAdded).toBe(0);
    expect(byQuest(r).q1!.record_count).toBe(1);
  });
});
