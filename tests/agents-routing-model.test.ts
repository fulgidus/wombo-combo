import { describe, test, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG, saveConfig, type WomboConfig } from "../src/config";
import { getHarness } from "../src/lib/harness";
import {
  harnessRows,
  validateDraft,
  saveDraft,
  upsertProfile,
  deleteProfile,
  setRoute,
  routeSlots,
  type Draft,
} from "../src/lib/agents-routing";

const base = (over: Partial<WomboConfig> = {}): WomboConfig => ({ ...DEFAULT_CONFIG, ...over }) as WomboConfig;

describe("harness cost capability", () => {
  test("pi, opencode and claude-code report cost; codex and custom do not", () => {
    expect(getHarness("pi").capabilities.cost).toBe(true);
    expect(getHarness("opencode").capabilities.cost).toBe(true);
    expect(getHarness("claude-code").capabilities.cost).toBe(true);
    expect(getHarness("codex").capabilities.cost).toBe(false);
    expect(getHarness("custom").capabilities.cost).toBe(false);
  });
});

describe("harnessRows", () => {
  const probes = { binExists: (b: string) => b === "pi" || b === "opencode" };

  test("lists all seven harnesses with pi first-class", () => {
    const rows = harnessRows(base(), probes);
    expect(rows.map((r) => r.id).sort()).toEqual(["antigravity", "claude-code", "codex", "custom", "gemini", "opencode", "pi"]);
    expect(rows.find((r) => r.id === "pi")!.onPath).toBe(true);
    expect(rows.find((r) => r.id === "codex")!.onPath).toBe(false);
    expect(rows.find((r) => r.id === "pi")!.reportsCost).toBe(true);
    expect(rows.find((r) => r.id === "codex")!.reportsCost).toBe(false);
  });

  test("legacy opencode is configured via the implicit default profile", () => {
    const rows = harnessRows(base({ agent: { ...DEFAULT_CONFIG.agent, bin: "opencode" } }), probes);
    const oc = rows.find((r) => r.id === "opencode")!;
    expect(oc.configured).toBe(true);
    expect(oc.profiles).toEqual(["default"]);
    expect(rows.find((r) => r.id === "codex")!.configured).toBe(false);
  });

  test("explicit profiles mark their harness configured", () => {
    const rows = harnessRows(base({ agentProfiles: { fast: { harness: "pi" } } }), probes);
    expect(rows.find((r) => r.id === "pi")!.profiles).toEqual(["fast"]);
    expect(rows.find((r) => r.id === "pi")!.configured).toBe(true);
  });
});

describe("draft editing", () => {
  const empty: Draft = { profiles: {}, routing: {} };

  test("first explicit profile does not set routing.default (legacy route stays)", () => {
    const d = upsertProfile(empty, "fast", { harness: "pi" });
    expect(d.routing.default).toBeUndefined();
    expect(d.profiles.fast.harness).toBe("pi");
  });

  test("blank optional fields are stored as absent", () => {
    const d = upsertProfile(empty, "a", { harness: "pi", model: "", bin: " ", provider: "x" });
    expect(d.profiles.a).toEqual({ harness: "pi", provider: "x" });
  });

  test("setRoute sets and clears slots", () => {
    let d = upsertProfile(empty, "a", { harness: "pi" });
    d = setRoute(d, { kind: "default" }, "a");
    d = setRoute(d, { kind: "byWeight", key: "heavy" }, "a");
    d = setRoute(d, { kind: "fallback", key: "a" }, "a");
    expect(d.routing.default).toBe("a");
    expect(d.routing.byWeight).toEqual({ heavy: "a" });
    d = setRoute(d, { kind: "byWeight", key: "heavy" }, null);
    expect(d.routing.byWeight).toBeUndefined();
    d = setRoute(d, { kind: "default" }, null);
    expect(d.routing.default).toBeUndefined();
  });

  test("routeSlots covers default, weights, difficulties, operations, fallbacks", () => {
    const slots = routeSlots({ profiles: { a: { harness: "pi" } }, routing: {} });
    const kinds = new Set(slots.map((s) => s.kind));
    expect([...kinds].sort()).toEqual(["byDifficulty", "byOperation", "byWeight", "default", "fallback"]);
    expect(slots.filter((s) => s.kind === "fallback").length).toBe(1);
  });

  test("deleteProfile removes the profile only", () => {
    let d = upsertProfile(empty, "a", { harness: "pi" });
    d = setRoute(d, { kind: "default" }, "a");
    d = deleteProfile(d, "a");
    expect(d.profiles.a).toBeUndefined();
    expect(d.routing.default).toBe("a");
  });
});

describe("validateDraft / saveDraft", () => {
  test("refuses dangling profile references", () => {
    const d: Draft = { profiles: { a: { harness: "pi" } }, routing: { default: "gone" } };
    expect(validateDraft(base(), d)).toMatch(/unknown profile "gone"/);
  });

  test("refuses invalid profile (custom without command)", () => {
    const d: Draft = { profiles: { c: { harness: "custom" } }, routing: {} };
    expect(validateDraft(base(), d)).toMatch(/custom/);
  });

  test("valid draft passes", () => {
    const d: Draft = { profiles: { a: { harness: "pi" } }, routing: { default: "a" } };
    expect(validateDraft(base(), d)).toBeNull();
  });

  test("saveDraft persists deletions and does not write on invalid", () => {
    const root = mkdtempSync(join(tmpdir(), "ar-"));
    mkdirSync(join(root, ".wombo-combo"), { recursive: true });
    saveConfig(root, { agentProfiles: { a: { harness: "pi" }, b: { harness: "codex" } }, routing: { default: "a" } });
    const cfg = base();
    const bad = saveDraft(root, cfg, { profiles: { a: { harness: "pi" } }, routing: { default: "zzz" } });
    expect(bad).toMatch(/zzz/);
    expect(JSON.parse(readFileSync(join(root, ".wombo-combo/config.json"), "utf-8")).agentProfiles.b).toBeDefined();
    const ok = saveDraft(root, cfg, { profiles: { a: { harness: "pi" } }, routing: {} });
    expect(ok).toBeNull();
    const disk = JSON.parse(readFileSync(join(root, ".wombo-combo/config.json"), "utf-8"));
    expect(disk.agentProfiles).toEqual({ a: { harness: "pi" } });
    expect(disk.routing).toBeUndefined();
  });

  test("saveDraft keeps legacy keys untouched", () => {
    const root = mkdtempSync(join(tmpdir(), "ar-"));
    mkdirSync(join(root, ".wombo-combo"), { recursive: true });
    writeFileSync(join(root, ".wombo-combo/config.json"), JSON.stringify({ agent: { bin: "opencode" }, modelRouting: { light: "m" } }));
    expect(saveDraft(root, base(), { profiles: { a: { harness: "pi" } }, routing: {} })).toBeNull();
    const disk = JSON.parse(readFileSync(join(root, ".wombo-combo/config.json"), "utf-8"));
    expect(disk.agent.bin).toBe("opencode");
    expect(disk.modelRouting.light).toBe("m");
    expect(disk.routing).toBeUndefined();
  });
});
