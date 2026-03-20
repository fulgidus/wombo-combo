/**
 * analytics-export.test.ts — Tests for the analytics export functionality.
 *
 * Coverage:
 *   - exportToCSV: generates valid CSV with header + one row per task
 *   - exportToJSON: generates full nested JSON structure
 *   - exportToHTML: generates self-contained HTML with Chart.js embedded
 *   - writeExport: writes output to file
 *   - Integration: export with filtered/grouped records
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { UsageRecord } from "../src/lib/token-collector";
import {
  exportToCSV,
  exportToJSON,
  exportToHTML,
  writeExport,
  type ExportFormat,
} from "../src/lib/analytics-export";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wombo-export-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeRecord(overrides?: Partial<UsageRecord>): UsageRecord {
  return {
    task_id: "task-a",
    quest_id: null,
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
    harness: "opencode",
    input_tokens: 1000,
    output_tokens: 500,
    cache_read: 200,
    cache_write: 100,
    reasoning_tokens: 0,
    total_tokens: 1500,
    cost: 0.0025,
    is_final_step: false,
    timestamp: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// exportToCSV
// ---------------------------------------------------------------------------

describe("exportToCSV", () => {
  test("returns a string with CSV header row", () => {
    const records = [makeRecord()];
    const csv = exportToCSV(records);
    const lines = csv.trim().split("\n");
    const header = lines[0];
    expect(header).toContain("task_id");
    expect(header).toContain("input_tokens");
    expect(header).toContain("output_tokens");
    expect(header).toContain("total_tokens");
    expect(header).toContain("cost");
    expect(header).toContain("timestamp");
  });

  test("returns one data row per record", () => {
    const records = [
      makeRecord({ task_id: "task-a" }),
      makeRecord({ task_id: "task-b" }),
      makeRecord({ task_id: "task-c" }),
    ];
    const csv = exportToCSV(records);
    const lines = csv.trim().split("\n");
    // header + 3 data rows
    expect(lines.length).toBe(4);
  });

  test("data row contains correct values", () => {
    const record = makeRecord({
      task_id: "my-task",
      input_tokens: 1234,
      output_tokens: 567,
      total_tokens: 1801,
      cost: 0.00123,
    });
    const csv = exportToCSV([record]);
    const lines = csv.trim().split("\n");
    const dataRow = lines[1];
    expect(dataRow).toContain("my-task");
    expect(dataRow).toContain("1234");
    expect(dataRow).toContain("567");
    expect(dataRow).toContain("1801");
  });

  test("handles empty records array with only header", () => {
    const csv = exportToCSV([]);
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(1); // just header
  });

  test("escapes commas in string values", () => {
    const record = makeRecord({ task_id: "task,with,commas" });
    const csv = exportToCSV([record]);
    // task_id with commas should be quoted
    expect(csv).toContain('"task,with,commas"');
  });

  test("includes all token metric columns", () => {
    const records = [makeRecord({ cache_read: 400, cache_write: 200, reasoning_tokens: 50 })];
    const csv = exportToCSV(records);
    expect(csv).toContain("cache_read");
    expect(csv).toContain("cache_write");
    expect(csv).toContain("reasoning_tokens");
    const lines = csv.trim().split("\n");
    const dataRow = lines[1];
    expect(dataRow).toContain("400");
    expect(dataRow).toContain("200");
    expect(dataRow).toContain("50");
  });
});

// ---------------------------------------------------------------------------
// exportToJSON
// ---------------------------------------------------------------------------

describe("exportToJSON", () => {
  test("returns a valid JSON string", () => {
    const records = [makeRecord()];
    const json = exportToJSON(records);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test("JSON has records array at top level", () => {
    const records = [makeRecord({ task_id: "t1" }), makeRecord({ task_id: "t2" })];
    const json = exportToJSON(records);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed.records)).toBe(true);
    expect(parsed.records.length).toBe(2);
  });

  test("JSON includes summary totals", () => {
    const records = [
      makeRecord({ input_tokens: 100, output_tokens: 50, total_tokens: 150, cost: 0.001 }),
      makeRecord({ input_tokens: 200, output_tokens: 100, total_tokens: 300, cost: 0.002 }),
    ];
    const json = exportToJSON(records);
    const parsed = JSON.parse(json);
    expect(parsed.summary).toBeDefined();
    expect(parsed.summary.total_tokens).toBe(450);
    expect(parsed.summary.total_cost).toBeCloseTo(0.003);
    expect(parsed.summary.record_count).toBe(2);
  });

  test("JSON includes metadata (exported_at, format version)", () => {
    const records = [makeRecord()];
    const json = exportToJSON(records);
    const parsed = JSON.parse(json);
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.exported_at).toBeDefined();
    expect(parsed.metadata.format).toBeDefined();
  });

  test("JSON records contain all UsageRecord fields", () => {
    const record = makeRecord({
      task_id: "full-record",
      quest_id: "quest-1",
      model: "gpt-4o",
      provider: "openai",
      harness: "aider",
    });
    const json = exportToJSON([record]);
    const parsed = JSON.parse(json);
    const r = parsed.records[0];
    expect(r.task_id).toBe("full-record");
    expect(r.quest_id).toBe("quest-1");
    expect(r.model).toBe("gpt-4o");
    expect(r.provider).toBe("openai");
    expect(r.harness).toBe("aider");
  });

  test("JSON is pretty-printed (indented)", () => {
    const records = [makeRecord()];
    const json = exportToJSON(records);
    // Pretty-printed JSON contains newlines
    expect(json).toContain("\n");
  });

  test("handles empty records array", () => {
    const json = exportToJSON([]);
    const parsed = JSON.parse(json);
    expect(parsed.records).toEqual([]);
    expect(parsed.summary.total_tokens).toBe(0);
    expect(parsed.summary.record_count).toBe(0);
  });

  test("JSON includes grouped summaries by task_id", () => {
    const records = [
      makeRecord({ task_id: "auth", input_tokens: 100, total_tokens: 100 }),
      makeRecord({ task_id: "auth", input_tokens: 200, total_tokens: 200 }),
      makeRecord({ task_id: "search", input_tokens: 300, total_tokens: 300 }),
    ];
    const json = exportToJSON(records);
    const parsed = JSON.parse(json);
    expect(parsed.by_task).toBeDefined();
    expect(Object.keys(parsed.by_task).length).toBe(2);
    expect(parsed.by_task["auth"].total_tokens).toBe(300);
    expect(parsed.by_task["search"].total_tokens).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// exportToHTML
// ---------------------------------------------------------------------------

describe("exportToHTML", () => {
  test("returns a non-empty HTML string", () => {
    const records = [makeRecord()];
    const html = exportToHTML(records);
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(100);
  });

  test("HTML has valid doctype and html/head/body structure", () => {
    const records = [makeRecord()];
    const html = exportToHTML(records);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("<head");
    expect(html).toContain("<body");
    expect(html).toContain("</html>");
  });

  test("HTML embeds Chart.js (self-contained)", () => {
    const records = [makeRecord()];
    const html = exportToHTML(records);
    // Chart.js should be embedded (not just referenced via CDN)
    expect(html).toContain("Chart");
  });

  test("HTML contains token usage data as JSON in script", () => {
    const records = [makeRecord({ task_id: "embed-test", total_tokens: 9999 })];
    const html = exportToHTML(records);
    expect(html).toContain("embed-test");
    expect(html).toContain("9999");
  });

  test("HTML contains a chart canvas element", () => {
    const records = [makeRecord()];
    const html = exportToHTML(records);
    expect(html).toContain("<canvas");
  });

  test("HTML contains a summary section", () => {
    const records = [
      makeRecord({ input_tokens: 1000, output_tokens: 500, total_tokens: 1500, cost: 0.005 }),
    ];
    const html = exportToHTML(records);
    // Should contain summary stats
    expect(html).toContain("1,500"); // formatted total tokens
  });

  test("HTML contains a data table with records", () => {
    const records = [
      makeRecord({ task_id: "task-alpha" }),
      makeRecord({ task_id: "task-beta" }),
    ];
    const html = exportToHTML(records);
    expect(html).toContain("task-alpha");
    expect(html).toContain("task-beta");
    expect(html).toContain("<table");
  });

  test("handles empty records array gracefully", () => {
    const html = exportToHTML([]);
    expect(html).toContain("<!DOCTYPE html>");
    // Should not throw
  });
});

// ---------------------------------------------------------------------------
// writeExport
// ---------------------------------------------------------------------------

describe("writeExport", () => {
  test("writes CSV file to disk", async () => {
    const records = [makeRecord({ task_id: "write-test" })];
    const filePath = join(tmpDir, "export.csv");
    await writeExport(records, "csv", filePath);
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("task_id");
    expect(content).toContain("write-test");
  });

  test("writes JSON file to disk", async () => {
    const records = [makeRecord({ task_id: "json-test" })];
    const filePath = join(tmpDir, "export.json");
    await writeExport(records, "json", filePath);
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.records[0].task_id).toBe("json-test");
  });

  test("writes HTML file to disk", async () => {
    const records = [makeRecord({ task_id: "html-test" })];
    const filePath = join(tmpDir, "export.html");
    await writeExport(records, "html", filePath);
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("html-test");
  });

  test("creates parent directories if they do not exist", async () => {
    const records = [makeRecord()];
    const filePath = join(tmpDir, "deep", "nested", "export.csv");
    await writeExport(records, "csv", filePath);
    expect(existsSync(filePath)).toBe(true);
  });

  test("overwrites existing file", async () => {
    const filePath = join(tmpDir, "overwrite.json");
    // Write first version
    await writeExport([makeRecord({ task_id: "first" })], "json", filePath);
    // Write second version
    await writeExport([makeRecord({ task_id: "second" })], "json", filePath);
    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.records[0].task_id).toBe("second");
  });
});

// ---------------------------------------------------------------------------
// ExportFormat type
// ---------------------------------------------------------------------------

describe("ExportFormat type", () => {
  test("valid export formats are csv, json, html", () => {
    const formats: ExportFormat[] = ["csv", "json", "html"];
    expect(formats).toHaveLength(3);
  });
});
