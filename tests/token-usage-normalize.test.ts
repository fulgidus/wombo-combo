import { describe, test, expect } from "bun:test";
import { normalizeUsageRecord, totalUsage } from "../src/lib/token-usage";
import type { UsageRecord } from "../src/lib/token-collector";

const rec = (over: Partial<UsageRecord>): UsageRecord =>
  ({
    task_id: "t", quest_id: null, model: null, provider: null, harness: "opencode",
    input_tokens: 10, output_tokens: 20, cache_read: 0, cache_write: 0, reasoning_tokens: 5,
    total_tokens: 35, cost: 0.5, is_final_step: false, timestamp: "2026-01-01T00:00:00Z",
    ...over,
  }) as UsageRecord;

describe("usage totals never go NaN", () => {
  test("a record without total_tokens derives it from input, output and reasoning", () => {
    const missing = rec({});
    delete (missing as any).total_tokens;
    expect(normalizeUsageRecord(missing).total_tokens).toBe(35);
    expect(totalUsage([normalizeUsageRecord(missing), rec({})]).total_tokens).toBe(70);
  });

  test("non-numeric fields count as zero", () => {
    const bad = normalizeUsageRecord(rec({ cost: undefined as any, input_tokens: "x" as any, total_tokens: NaN }));
    expect(bad.cost).toBe(0);
    expect(bad.input_tokens).toBe(0);
    expect(bad.total_tokens).toBe(25);
  });
});
