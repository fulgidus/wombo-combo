/**
 * harness-routing.test.ts — Route resolution: legacy equivalence, precedence,
 * fallback chains, env references and availability selection.
 */

import { describe, test, expect } from "bun:test";
import { DEFAULT_CONFIG, resolveAgentBin, type WomboConfig } from "../src/config";
import { resolveTaskModel } from "../src/lib/task-weight";
import {
  resolveRoute,
  resolveRouteEnv,
  routeUnavailableReason,
  selectAvailableRoute,
  MissingEnvError,
  RouteError,
} from "../src/lib/harness/routing";

const light = { difficulty: "trivial", effort: "PT15M", priority: "low" } as const;
const heavy = { difficulty: "very_hard", effort: "P2D", priority: "critical" } as const;
const resolveBin = () => "/opt/opencode";

function cfg(extra: Partial<WomboConfig>): WomboConfig {
  return { ...DEFAULT_CONFIG, ...extra } as WomboConfig;
}

const profiles = {
  oc: { harness: "opencode", model: "oc-model" },
  cc: { harness: "claude-code", model: "sonnet", bin: "/usr/bin/claude", envFrom: { ANTHROPIC_API_KEY: "KEY_WORK" } },
  cx: { harness: "codex", bin: "/usr/bin/codex", provider: "openai" },
  pl: { harness: "pi" },
} as any;

describe("legacy equivalence (no profiles, no routing)", () => {
  test("bin and model equal the old resolution", () => {
    const c = cfg({ modelRouting: { light: "m-light", heavy: "m-heavy" } });
    for (const task of [light, heavy]) {
      const r = resolveRoute(c, { operation: "code", task, sessionModel: "sess" });
      expect(r.legacy).toBe(true);
      expect(r.profile).toBe("default");
      expect(r.harness).toBe("opencode");
      expect(r.model).toBe(resolveTaskModel(task, c.modelRouting, "sess"));
      expect(r.chain).toEqual(["default"]);
    }
    expect(resolveRoute(c, { operation: "code", task: light }).bin).toBe(resolveAgentBin(c));
  });

  test("without a task the session model is used and null stays null", () => {
    const c = cfg({ modelRouting: { light: "m-light" } });
    expect(resolveRoute(c, { operation: "plan", sessionModel: "s", resolveBin }).model).toBe("s");
    expect(resolveRoute(c, { operation: "plan", resolveBin }).model).toBeNull();
  });

  test("agent.bin pointing at claude selects the claude-code harness", () => {
    const c = cfg({ agent: { ...DEFAULT_CONFIG.agent, bin: "/usr/bin/claude" } });
    const r = resolveRoute(c, { operation: "code" });
    expect(r.harness).toBe("claude-code");
    expect(r.bin).toBe("/usr/bin/claude");
  });
});

describe("profile selection precedence", () => {
  const routing = {
    default: "oc",
    byWeight: { heavy: "cc", light: "pl" },
    byDifficulty: { very_hard: "cx" },
    byOperation: { plan: "cc", conflict: "pl", code: "oc" },
  } as any;
  const c = cfg({ agentProfiles: profiles, routing });

  test("explicit task profile wins for code", () => {
    const r = resolveRoute(c, { operation: "code", task: { ...heavy, agent_profile: "pl" }, resolveBin });
    expect(r.profile).toBe("pl");
  });

  test("byOperation wins for non-code operations, over the task profile and difficulty", () => {
    expect(resolveRoute(c, { operation: "plan", resolveBin }).profile).toBe("cc");
    expect(
      resolveRoute(c, { operation: "conflict", task: { ...heavy, agent_profile: "cx" }, resolveBin }).profile
    ).toBe("pl");
  });

  test("task profile applies to operations without a byOperation entry", () => {
    const only = cfg({ agentProfiles: profiles, routing: { default: "oc" } as any });
    expect(
      resolveRoute(only, { operation: "conflict", task: { ...light, agent_profile: "cx" }, resolveBin }).profile
    ).toBe("cx");
  });

  test("byDifficulty beats byWeight, byWeight beats byOperation.code and default", () => {
    expect(resolveRoute(c, { operation: "code", task: heavy, resolveBin }).profile).toBe("cx");
    expect(resolveRoute(c, { operation: "code", task: light, resolveBin }).profile).toBe("pl");
    const medium = { difficulty: "medium", effort: "PT1H", priority: "medium" } as const;
    expect(resolveRoute(c, { operation: "code", task: medium, resolveBin }).profile).toBe("oc");
  });

  test("falls back to default, then to the legacy profile", () => {
    const d = cfg({ agentProfiles: profiles, routing: { default: "pl" } as any });
    expect(resolveRoute(d, { operation: "review", resolveBin }).profile).toBe("pl");
    const none = cfg({ agentProfiles: profiles });
    expect(resolveRoute(none, { operation: "code", task: light, resolveBin }).legacy).toBe(true);
  });

  test("forced profile and unknown profiles", () => {
    expect(resolveRoute(c, { operation: "code", profile: "cx", resolveBin }).harness).toBe("codex");
    expect(() => resolveRoute(c, { operation: "code", profile: "zzz", resolveBin })).toThrow(RouteError);
  });
});

describe("model and fields", () => {
  test("profile.model beats modelRouting and session model; otherwise legacy chain applies", () => {
    const c = cfg({
      agentProfiles: profiles,
      routing: { default: "cc", byWeight: { light: "pl" } } as any,
      modelRouting: { light: "m-light" },
    });
    expect(resolveRoute(c, { operation: "code", task: heavy, sessionModel: "s", resolveBin }).model).toBe("sonnet");
    // pl has no model: modelRouting[light] applies
    expect(resolveRoute(c, { operation: "code", task: light, sessionModel: "s", resolveBin }).model).toBe("m-light");
  });

  test("profile fields flow into the route; opencode profile without bin uses resolveBin", () => {
    const c = cfg({ agentProfiles: { ...profiles, cc: { ...profiles.cc, args: ["--x"], account: "work" } }, routing: { default: "cc" } as any });
    const r = resolveRoute(c, { operation: "code", resolveBin });
    expect(r).toMatchObject({ harness: "claude-code", bin: "/usr/bin/claude", args: ["--x"], account: "work" });
    expect(r.capabilities.agentSelection).toBe(false);
    const oc = resolveRoute(cfg({ agentProfiles: profiles, routing: { default: "oc" } as any }), { operation: "code", resolveBin });
    expect(oc.bin).toBe("/opt/opencode");
  });

  test("capability overrides merge over adapter defaults", () => {
    const c = cfg({
      agentProfiles: { t: { harness: "custom", bin: "x", command: { args: [] }, capabilities: { sessionResume: true } } } as any,
      routing: { default: "t" } as any,
    });
    const r = resolveRoute(c, { operation: "code" });
    expect(r.capabilities.sessionResume).toBe(true);
    expect(r.capabilities.jsonStream).toBe(false);
  });
});

describe("fallback chains", () => {
  const c = cfg({
    agentProfiles: profiles,
    routing: { default: "cc", fallbacks: { cc: ["cx", "pl"], cx: ["oc"] } } as any,
  });

  test("chain is the profile followed by its transitive fallbacks, deduped", () => {
    expect(resolveRoute(c, { operation: "code", resolveBin }).chain).toEqual(["cc", "cx", "oc", "pl"]);
  });

  test("selectAvailableRoute skips candidates whose binary is missing", () => {
    const primary = resolveRoute(c, { operation: "code", resolveBin });
    const sel = selectAvailableRoute(c, primary, { operation: "code", resolveBin }, {
      binExists: (b) => b === "/usr/bin/codex",
      env: { KEY_WORK: "v" },
    });
    expect(sel.route.profile).toBe("cx");
    expect(sel.skipped).toEqual([{ profile: "cc", reason: "binary not found: /usr/bin/claude" }]);
  });

  test("a missing envFrom variable makes a candidate unavailable, without leaking values", () => {
    const primary = resolveRoute(c, { operation: "code", resolveBin });
    const sel = selectAvailableRoute(c, primary, { operation: "code", resolveBin }, {
      binExists: () => true,
      env: {},
    });
    expect(sel.route.profile).toBe("cx");
    expect(sel.skipped[0].reason).toBe("environment variable KEY_WORK is not set");
  });

  test("primary is returned untouched when available", () => {
    const primary = resolveRoute(c, { operation: "code", resolveBin });
    const sel = selectAvailableRoute(c, primary, { operation: "code", resolveBin }, {
      binExists: () => true,
      env: { KEY_WORK: "v" },
    });
    expect(sel.route).toBe(primary);
    expect(sel.skipped).toEqual([]);
  });

  test("throws a RouteError listing every skipped candidate when none can start", () => {
    const primary = resolveRoute(c, { operation: "code", resolveBin });
    expect(() =>
      selectAvailableRoute(c, primary, { operation: "code", resolveBin }, { binExists: () => false, env: {} })
    ).toThrow(/cc \(binary not found.*cx \(binary not found.*oc.*pl/s);
  });
});

describe("environment references", () => {
  const route = { profile: "p", env: { MODE: "fast" }, envFrom: { ANTHROPIC_API_KEY: "KEY_WORK" } };

  test("resolves envFrom from the source and merges literals", () => {
    expect(resolveRouteEnv(route, { KEY_WORK: "abc" })).toEqual({ MODE: "fast", ANTHROPIC_API_KEY: "abc" });
  });

  test("missing or empty variables throw naming the variable only", () => {
    for (const source of [{}, { KEY_WORK: "" }]) {
      try {
        resolveRouteEnv(route, source);
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(MissingEnvError);
        expect((err as Error).message).toContain("KEY_WORK");
        expect((err as MissingEnvError).variable).toBe("KEY_WORK");
      }
    }
  });

  test("routeUnavailableReason is null for a startable route", () => {
    const c = cfg({ agentProfiles: profiles, routing: { default: "cx" } as any });
    const r = resolveRoute(c, { operation: "code" });
    expect(routeUnavailableReason(r, { binExists: () => true, env: {} })).toBeNull();
  });
});
