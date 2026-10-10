/**
 * analytics-usage-command.test.ts — `woco usage --analytics`.
 *
 * Unit-level checks call cmdUsage with captured console output; CLI-level
 * checks spawn the real CLI in a temp project (stdout purity, alias, help,
 * describe, completion).
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { AnalyticsStore, analyticsDir, createAnalyticsRecord, type AgentAnalyticsRecord } from "../src/lib/analytics";
import {
  cmdUsage,
  validateUsageOptions,
  renderAnalyticsText,
  formatAnalyticsRate,
  type UsageCommandOptions,
} from "../src/commands/usage";
import { summarizeAnalytics } from "../src/lib/analytics-summary";
import { appendUsageRecord } from "../src/lib/token-usage";
import type { WomboConfig } from "../src/config";

const REPO_ROOT = resolve(import.meta.dir, "..");
const SRC_ENTRY = join(REPO_ROOT, "src", "index.ts");
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/;

let root: string;

function rec(id: string, over: Partial<AgentAnalyticsRecord> = {}): AgentAnalyticsRecord {
  return createAnalyticsRecord({
    execution_id: id,
    wave_id: "wave-1",
    task_id: `task-${id}`,
    first_started_at: "2026-03-01T10:00:00.000Z",
    ...over,
  });
}

function seed(): void {
  const store = new AnalyticsStore(root);
  store.upsert(
    rec("a", {
      quest_id: "q1",
      model: "m1",
      agent_id: "ag1",
      outcome: "succeeded",
      duration_ms: 90_000,
      verified_at: "2026-03-01T10:01:30.000Z",
      retry_count: 1,
      build_attempts: 2,
      build_passes: 1,
      additions: 10,
      deletions: 4,
      usage: { input_tokens: 100, output_tokens: 50, cache_read: 5, cache_write: 6, reasoning_tokens: 7, total_tokens: 157, total_cost: 0.5, record_count: 3 },
      usage_coverage: "full",
    }),
  );
  store.upsert(
    rec("b", {
      quest_id: "q1",
      model: "m2",
      wave_id: "wave-2",
      outcome: "failed",
      first_started_at: "2026-04-01T10:00:00.000Z",
      usage_coverage: "none",
    }),
  );
  store.upsert(
    rec("c", {
      quest_id: null,
      outcome: "succeeded",
      duration_ms: 30_000,
      first_started_at: "2026-04-02T10:00:00.000Z",
      usage: { input_tokens: 1, output_tokens: 1, cache_read: 0, cache_write: 0, reasoning_tokens: 0, total_tokens: 2, total_cost: 0, record_count: 1 },
      usage_coverage: "partial",
    }),
  );
}

function opts(over: Partial<UsageCommandOptions> = {}): UsageCommandOptions {
  return {
    projectRoot: root,
    config: {} as WomboConfig,
    usageFormat: "table",
    outputFmt: "text",
    analytics: true,
    ...over,
  };
}

async function capture(fn: () => Promise<void>): Promise<{ out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const l = spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
  const e = spyOn(console, "error").mockImplementation((...a: unknown[]) => void err.push(a.join(" ")));
  try {
    await fn();
  } finally {
    l.mockRestore();
    e.mockRestore();
  }
  return { out: out.join("\n"), err: err.join("\n") };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "analytics-usage-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeFileSync(join(root, ".wombo-combo", "config.json"), "{}\n");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

// ---------------------------------------------------------------------------

describe("validateUsageOptions", () => {
  test("analytics-only options are rejected outside analytics mode", () => {
    expect(validateUsageOptions({ task: "x" })).toContain("--analytics");
    expect(validateUsageOptions({ quest: "x", wave: "y" })).toContain("--quest, --wave");
    expect(validateUsageOptions({ task: "x", analytics: true })).toBeNull();
  });
  test("grouping values are validated per mode", () => {
    expect(validateUsageOptions({ by: "wave" })).toContain("Invalid --by");
    expect(validateUsageOptions({ by: "agent" })).toContain("Invalid --by");
    expect(validateUsageOptions({ by: "provider", analytics: true })).toContain("Invalid --by");
    expect(validateUsageOptions({ by: "harness", analytics: true })).toContain("Invalid --by");
    for (const by of ["task", "quest", "wave", "agent", "model"]) {
      expect(validateUsageOptions({ by, analytics: true })).toBeNull();
    }
    for (const by of ["task", "quest", "model", "provider", "harness"]) {
      expect(validateUsageOptions({ by })).toBeNull();
    }
  });
});

describe("formatting", () => {
  test("unavailable measurements render as n/a, never zero or 100 percent", () => {
    expect(formatAnalyticsRate(null)).toBe("n/a");
    const s = summarizeAnalytics([rec("x")]);
    const text = renderAnalyticsText(s);
    expect(text).toContain("n/a (no builds)");
    expect(text).toContain("n/a (no successful executions)");
    expect(text).toContain("n/a (no usage data)");
    expect(text).toContain("n/a (no measurements)");
    expect(text).not.toContain("100");
    expect(text).not.toMatch(ANSI);
  });
});

describe("cmdUsage --analytics", () => {
  test("total JSON is the shared summary with weighted build rate and full tokens", async () => {
    seed();
    const { out, err } = await capture(() => cmdUsage(opts({ outputFmt: "json" })));
    expect(err).toBe("");
    const s = JSON.parse(out);
    expect(s.groupBy).toBeNull();
    expect(s.total.executions).toBe(3);
    expect(s.total.outcomes.succeeded).toBe(2);
    expect(s.total.duration.mean_ms).toBe(60_000);
    expect(s.total.builds).toEqual({ attempts: 2, passes: 1, pass_rate: 0.5, samples: 1 });
    expect(s.total.usage.totals.reasoning_tokens).toBe(7);
    expect(s.total.usage.totals.total_tokens).toBe(159);
    expect(s.total.usage.coverage).toEqual({ none: 1, partial: 1, full: 1 });
    expect(s.total.lines).toEqual({ additions: 10, deletions: 4, changed: 14, samples: 1 });
    expect(out).not.toMatch(ANSI);
  });

  test("grouping and exact filters", async () => {
    seed();
    let r = await capture(() => cmdUsage(opts({ outputFmt: "json", by: "quest" })));
    let s = JSON.parse(r.out);
    expect(s.groups.map((g: any) => g.key)).toEqual(["q1", null]);

    r = await capture(() => cmdUsage(opts({ outputFmt: "json", quest: "q1", by: "model" })));
    s = JSON.parse(r.out);
    expect(s.total.executions).toBe(2);
    expect(s.groups.map((g: any) => g.key)).toEqual(["m1", "m2"]);

    r = await capture(() => cmdUsage(opts({ outputFmt: "json", wave: "wave-2" })));
    expect(JSON.parse(r.out).total.executions).toBe(1);

    r = await capture(() => cmdUsage(opts({ outputFmt: "json", task: "task-a" })));
    expect(JSON.parse(r.out).total.executions).toBe(1);

    r = await capture(() => cmdUsage(opts({ outputFmt: "json", since: "2026-04-01T00:00:00Z" })));
    expect(JSON.parse(r.out).total.executions).toBe(2);
    r = await capture(() => cmdUsage(opts({ outputFmt: "json", until: "2026-03-15T00:00:00Z" })));
    expect(JSON.parse(r.out).total.executions).toBe(1);
  });

  test("TOON output carries the same summary", async () => {
    seed();
    const { out, err } = await capture(() => cmdUsage(opts({ outputFmt: "toon" })));
    expect(err).toBe("");
    expect(out).not.toMatch(ANSI);
    const lines = out.split("\n");
    expect(lines[0]).toBe("#ANALYTICS group_by=");
    const fields = lines[1].replace("#FIELDS ", "").split("|");
    const total = lines[2].split("|");
    expect(total.length).toBe(fields.length);
    const col = (name: string) => total[fields.indexOf(name)];
    expect(col("scope")).toBe("total");
    expect(col("executions")).toBe("3");
    expect(col("total_tokens")).toBe("159");
    expect(col("build_pass_rate")).toBe("0.5");
    expect(col("duration_mean_ms")).toBe("60000");
    expect(col("additions")).toBe("10");
  });

  test("TOON grouped rows keep null keys and unavailable values empty", async () => {
    seed();
    const { out } = await capture(() => cmdUsage(opts({ outputFmt: "toon", by: "quest", quest: undefined })));
    const lines = out.split("\n");
    expect(lines[0]).toBe("#ANALYTICS group_by=quest");
    const fields = lines[1].replace("#FIELDS ", "").split("|");
    const groups = lines.slice(3).map((l) => l.split("|"));
    expect(groups.map((g) => g[fields.indexOf("key")])).toEqual(["q1", ""]);
    // second group (no quest) has no builds: pass rate is empty, not 0 or 1
    expect(groups[1][fields.indexOf("build_pass_rate")]).toBe("");
  });

  test("legacy --format json prints the pretty summary", async () => {
    seed();
    const { out } = await capture(() => cmdUsage(opts({ usageFormat: "json" })));
    expect(JSON.parse(out).total.executions).toBe(3);
    expect(out).toContain("\n  ");
  });

  test("text output shows duration, tokens, retries, build rate, lines, samples and coverage warnings", async () => {
    seed();
    const { out } = await capture(() => cmdUsage(opts({ by: "quest" })));
    expect(out).toContain("Agent Analytics — by quest");
    expect(out).toContain("q1");
    expect(out).toContain("(none)");
    expect(out).toContain("mean 1m 0s");
    expect(out).toContain("(2 successful)");
    expect(out).toContain("Retries:           1");
    expect(out).toContain("159 total");
    expect(out).toContain("50.0% (1/2 builds, 1 executions)");
    expect(out).toContain("+10 / -4");
    expect(out).toContain("WARNING 1 partial, 1 without usage data");
    expect(out).not.toMatch(ANSI);
  });

  test("empty store gives an empty summary, not an error", async () => {
    const { out } = await capture(() => cmdUsage(opts({ outputFmt: "json" })));
    const s = JSON.parse(out);
    expect(s.total.executions).toBe(0);
    expect(s.total.duration.mean_ms).toBeNull();
    expect(s.total.builds.pass_rate).toBeNull();
    const text = await capture(() => cmdUsage(opts()));
    expect(text.out).toContain("No analytics data found");
    expect(text.out).toContain("not backfilled");
  });

  test("storage diagnostics go to stderr and never pollute structured stdout", async () => {
    seed();
    writeFileSync(join(analyticsDir(root), "broken.json"), "{oops");
    const { out, err } = await capture(() => cmdUsage(opts({ outputFmt: "json" })));
    expect(() => JSON.parse(out)).not.toThrow();
    expect(JSON.parse(out).total.executions).toBe(3);
    expect(err).toContain("broken.json");
    expect(err).toContain("malformed");
  });

  test("legacy token-only behavior and JSON shapes are unchanged without --analytics", async () => {
    const t = new Date().toISOString();
    appendUsageRecord(root, {
      task_id: "t1", quest_id: "q", model: "m", provider: "p", harness: "h",
      input_tokens: 10, output_tokens: 5, cache_read: 0, cache_write: 0, reasoning_tokens: 0,
      total_tokens: 15, cost: 0, is_final_step: true, timestamp: t,
    });
    seed();
    let r = await capture(() => cmdUsage(opts({ analytics: false, outputFmt: "json" })));
    expect(JSON.parse(r.out)).toEqual({
      input_tokens: 10, output_tokens: 5, cache_read: 0, cache_write: 0,
      reasoning_tokens: 0, total_tokens: 15, total_cost: 0, record_count: 1,
    });
    r = await capture(() => cmdUsage(opts({ analytics: false, outputFmt: "json", by: "task" })));
    expect(JSON.parse(r.out).by).toBe("task");
    expect(JSON.parse(r.out).groups[0].task).toBe("t1");
  });
});

// ---------------------------------------------------------------------------
// Real CLI
// ---------------------------------------------------------------------------

// NOTE: the global --output/-o flag is currently stripped before reaching
// citty commands (tracked: fix-output-json-flag), so structured output is
// selected through WOMBO_OUTPUT here.
function cli(args: string[], format?: "json" | "toon") {
  const env: Record<string, string | undefined> = { ...process.env, NO_COLOR: "1" };
  delete env.WOMBO_OUTPUT;
  if (format) env.WOMBO_OUTPUT = format;
  const r = Bun.spawnSync(["bun", SRC_ENTRY, ...args], { cwd: root, env });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

describe("CLI", () => {
  test("usage --analytics --output json emits a clean summary; alias us works", () => {
    seed();
    const a = cli(["usage", "--analytics", "--by", "wave"], "json");
    expect(a.code).toBe(0);
    const s = JSON.parse(a.out);
    expect(s.groupBy).toBe("wave");
    expect(s.groups.map((g: any) => g.key)).toEqual(["wave-1", "wave-2"]);
    expect(a.out).not.toMatch(ANSI);

    const b = cli(["us", "--analytics", "--quest", "q1"], "json");
    expect(b.code).toBe(0);
    expect(JSON.parse(b.out).total.executions).toBe(2);
  });

  test("toon output through the CLI", () => {
    seed();
    const r = cli(["usage", "--analytics"], "toon");
    expect(r.code).toBe(0);
    expect(r.out).toContain("#ANALYTICS");
    expect(r.out).not.toMatch(ANSI);
  });

  test("analytics-only flags are rejected without --analytics; modes validate --by separately", () => {
    let r = cli(["usage", "--task", "x"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("--analytics");
    r = cli(["usage", "--by", "wave"]);
    expect(r.code).toBe(1);
    r = cli(["usage", "--analytics", "--by", "provider"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("Invalid --by");
  });

  test("invalid or reversed date ranges fail", () => {
    seed();
    const r = cli(["usage", "--analytics", "--since", "2026-05-01", "--until", "2026-01-01"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("range");
  });

  test("help, describe and completion expose the new flags and groupings", () => {
    const help = cli(["usage", "--help"]);
    expect(help.out + help.err).toContain("--analytics");
    const describeOut = cli(["describe", "usage"], "json");
    const text = describeOut.out;
    expect(text).toContain("--analytics");
    expect(text).toContain("--wave");
    expect(text).toContain("agent");
    const comp = cli(["completion", "bash"]);
    expect(comp.out).toContain("--analytics");
  });
});
