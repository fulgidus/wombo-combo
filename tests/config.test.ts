/**
 * config.test.ts — Unit tests for config.ts (loadConfig, validateConfig, deepMerge).
 *
 * Coverage:
 *   - loadConfig: returns defaults when no config file, merges partial config,
 *     deep-merges nested objects, handles legacy tasksFile/archiveFile migration,
 *     throws on invalid JSON
 *   - validateConfig: validates required fields, numeric constraints, enum values
 *   - DEFAULT_CONFIG: sensible defaults for all fields
 *   - generateDefaultConfig: returns valid JSON string
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadConfig,
  validateConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE,
  WOMBO_DIR,
  generateDefaultConfig,
  normalizePostMergeConfig,
  resolveAgentBin,
} from "../src/config";
import type { WomboConfig } from "../src/config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wombo-test-config-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeConfig(dir: string, config: Record<string, unknown>): void {
  mkdirSync(join(dir, WOMBO_DIR), { recursive: true });
  writeFileSync(
    join(dir, CONFIG_FILE),
    JSON.stringify(config, null, 2)
  );
}

// ---------------------------------------------------------------------------
// DEFAULT_CONFIG
// ---------------------------------------------------------------------------

describe("DEFAULT_CONFIG", () => {
  test("has all required top-level fields", () => {
    expect(DEFAULT_CONFIG.tasksDir).toBe("tasks");
    expect(DEFAULT_CONFIG.archiveDir).toBe("archive");
    expect(DEFAULT_CONFIG.baseBranch).toBeDefined();
    expect(DEFAULT_CONFIG.build).toBeDefined();
    expect(DEFAULT_CONFIG.install).toBeDefined();
    expect(DEFAULT_CONFIG.git).toBeDefined();
    expect(DEFAULT_CONFIG.agent).toBeDefined();
    expect(DEFAULT_CONFIG.portless).toBeDefined();
    expect(DEFAULT_CONFIG.backup).toBeDefined();
    expect(DEFAULT_CONFIG.defaults).toBeDefined();
    expect(DEFAULT_CONFIG.browser).toBeDefined();
    expect(DEFAULT_CONFIG.agentRegistry).toBeDefined();
    expect(DEFAULT_CONFIG.tdd).toBeDefined();
  });

  test("passes its own validateConfig", () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  test("has sensible numeric defaults", () => {
    expect(DEFAULT_CONFIG.defaults.maxConcurrent).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_CONFIG.defaults.maxRetries).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CONFIG.backup.maxBackups).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CONFIG.build.timeout).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.install.timeout).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------

describe("loadConfig", () => {
  test("returns defaults when no config file exists", () => {
    const config = loadConfig(tmpDir);
    expect(config.baseBranch).toBe(DEFAULT_CONFIG.baseBranch);
    expect(config.build.command).toBe(DEFAULT_CONFIG.build.command);
    expect(config.git.branchPrefix).toBe(DEFAULT_CONFIG.git.branchPrefix);
    expect(config.tdd.enabled).toBe(false);
  });

  test("merges partial config with defaults", () => {
    writeConfig(tmpDir, { baseBranch: "custom-main" });
    const config = loadConfig(tmpDir);
    // Custom value
    expect(config.baseBranch).toBe("custom-main");
    // Defaults preserved
    expect(config.build.command).toBe(DEFAULT_CONFIG.build.command);
    expect(config.git.branchPrefix).toBe(DEFAULT_CONFIG.git.branchPrefix);
  });

  test("deep-merges nested objects", () => {
    writeConfig(tmpDir, {
      build: { command: "npm run build" },
    });
    const config = loadConfig(tmpDir);
    // Custom nested value
    expect(config.build.command).toBe("npm run build");
    // Other nested defaults preserved
    expect(config.build.timeout).toBe(DEFAULT_CONFIG.build.timeout);
    expect(config.build.artifactDir).toBe(DEFAULT_CONFIG.build.artifactDir);
  });

  test("deep-merges git config partially", () => {
    writeConfig(tmpDir, {
      git: { worktreePrefix: "custom-" },
    });
    const config = loadConfig(tmpDir);
    expect(config.git.worktreePrefix).toBe("custom-");
    expect(config.git.branchPrefix).toBe(DEFAULT_CONFIG.git.branchPrefix);
    expect(config.git.remote).toBe(DEFAULT_CONFIG.git.remote);
  });

  test("replaces arrays instead of merging them", () => {
    writeConfig(tmpDir, {
      agent: { configFiles: [".custom-config"] },
    });
    const config = loadConfig(tmpDir);
    expect(config.agent.configFiles).toEqual([".custom-config"]);
  });

  test("throws on invalid JSON", () => {
    mkdirSync(join(tmpDir, WOMBO_DIR), { recursive: true });
    writeFileSync(join(tmpDir, CONFIG_FILE), "{{not valid json");
    expect(() => loadConfig(tmpDir)).toThrow();
  });

  test("migrates legacy tasksFile to tasksDir", () => {
    writeConfig(tmpDir, { tasksFile: "my-tasks.yml" });
    const config = loadConfig(tmpDir);
    expect(config.tasksDir).toBe("my-tasks");
  });

  test("migrates legacy archiveFile to archiveDir", () => {
    writeConfig(tmpDir, { archiveFile: "my-archive.yaml" });
    const config = loadConfig(tmpDir);
    expect(config.archiveDir).toBe("my-archive");
  });

  test("does not migrate tasksFile if tasksDir is already set", () => {
    writeConfig(tmpDir, { tasksFile: "old.yml", tasksDir: "new-dir" });
    const config = loadConfig(tmpDir);
    expect(config.tasksDir).toBe("new-dir");
  });

  test("deep-merges tdd config", () => {
    writeConfig(tmpDir, {
      tdd: { enabled: true },
    });
    const config = loadConfig(tmpDir);
    expect(config.tdd.enabled).toBe(true);
    expect(config.tdd.testCommand).toBe(DEFAULT_CONFIG.tdd.testCommand);
  });

  test("deep-merges agentRegistry config", () => {
    writeConfig(tmpDir, {
      agentRegistry: { mode: "disabled" },
    });
    const config = loadConfig(tmpDir);
    expect(config.agentRegistry.mode).toBe("disabled");
    expect(config.agentRegistry.source).toBe(DEFAULT_CONFIG.agentRegistry.source);
    expect(config.agentRegistry.cacheTTL).toBe(DEFAULT_CONFIG.agentRegistry.cacheTTL);
  });
});

// ---------------------------------------------------------------------------
// validateConfig
// ---------------------------------------------------------------------------

describe("validateConfig", () => {
  function validConfig(): WomboConfig {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as WomboConfig;
  }

  test("accepts the default config", () => {
    expect(() => validateConfig(validConfig())).not.toThrow();
  });

  test("throws on empty tasksDir", () => {
    const config = validConfig();
    config.tasksDir = "";
    expect(() => validateConfig(config)).toThrow("tasksDir");
  });

  test("throws on empty archiveDir", () => {
    const config = validConfig();
    config.archiveDir = "";
    expect(() => validateConfig(config)).toThrow("archiveDir");
  });

  test("throws on empty baseBranch", () => {
    const config = validConfig();
    config.baseBranch = "";
    expect(() => validateConfig(config)).toThrow("baseBranch");
  });

  test("throws on empty build command", () => {
    const config = validConfig();
    config.build.command = "";
    expect(() => validateConfig(config)).toThrow("build.command");
  });

  test("throws on empty install command", () => {
    const config = validConfig();
    config.install.command = "";
    expect(() => validateConfig(config)).toThrow("install.command");
  });

  test("throws on empty branchPrefix", () => {
    const config = validConfig();
    config.git.branchPrefix = "";
    expect(() => validateConfig(config)).toThrow("branchPrefix");
  });

  test("allows maxConcurrent = 0 (unlimited)", () => {
    const config = validConfig();
    config.defaults.maxConcurrent = 0;
    expect(() => validateConfig(config)).not.toThrow();
  });

  test("throws on negative maxConcurrent", () => {
    const config = validConfig();
    config.defaults.maxConcurrent = -1;
    expect(() => validateConfig(config)).toThrow("maxConcurrent");
  });

  test("throws on negative maxRetries", () => {
    const config = validConfig();
    config.defaults.maxRetries = -1;
    expect(() => validateConfig(config)).toThrow("maxRetries");
  });

  test("throws on negative maxBackups", () => {
    const config = validConfig();
    config.backup.maxBackups = -1;
    expect(() => validateConfig(config)).toThrow("maxBackups");
  });

  test("throws on invalid agentRegistry.mode", () => {
    const config = validConfig();
    (config.agentRegistry as any).mode = "invalid-mode";
    expect(() => validateConfig(config)).toThrow("mode");
  });

  test("accepts all valid agentRegistry modes", () => {
    for (const mode of ["auto", "monitored", "disabled"] as const) {
      const config = validConfig();
      config.agentRegistry.mode = mode;
      expect(() => validateConfig(config)).not.toThrow();
    }
  });

  test("throws on empty agentRegistry.source", () => {
    const config = validConfig();
    config.agentRegistry.source = "";
    expect(() => validateConfig(config)).toThrow("source");
  });

  test("throws on empty agentRegistry.cacheDir", () => {
    const config = validConfig();
    config.agentRegistry.cacheDir = "";
    expect(() => validateConfig(config)).toThrow("cacheDir");
  });

  test("throws when tdd.enabled is true but testCommand is empty", () => {
    const config = validConfig();
    config.tdd.enabled = true;
    config.tdd.testCommand = "";
    expect(() => validateConfig(config)).toThrow("testCommand");
  });

  test("allows empty testCommand when tdd is disabled", () => {
    const config = validConfig();
    config.tdd.enabled = false;
    config.tdd.testCommand = "";
    expect(() => validateConfig(config)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateDefaultConfig
// ---------------------------------------------------------------------------

describe("generateDefaultConfig", () => {
  test("returns valid JSON string", () => {
    const jsonStr = generateDefaultConfig();
    expect(() => JSON.parse(jsonStr)).not.toThrow();
  });

  test("returned JSON matches DEFAULT_CONFIG", () => {
    const parsed = JSON.parse(generateDefaultConfig());
    expect(parsed.baseBranch).toBe(DEFAULT_CONFIG.baseBranch);
    expect(parsed.build.command).toBe(DEFAULT_CONFIG.build.command);
    expect(parsed.tdd.enabled).toBe(DEFAULT_CONFIG.tdd.enabled);
  });

  test("ends with newline", () => {
    const jsonStr = generateDefaultConfig();
    expect(jsonStr.endsWith("\n")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// postMerge
// ---------------------------------------------------------------------------

describe("postMerge config", () => {
  function fresh(): WomboConfig {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as WomboConfig;
  }

  test("DEFAULT_CONFIG defaults to skip mode, null target, changelog on", () => {
    expect(DEFAULT_CONFIG.postMerge).toEqual({
      prMode: "skip",
      prBaseBranch: null,
      changelog: true,
    });
  });

  test("loadConfig fills defaults for legacy configs without postMerge", () => {
    writeConfig(tmpDir, { baseBranch: "main" });
    const config = loadConfig(tmpDir);
    expect(normalizePostMergeConfig(config.postMerge)).toEqual({
      prMode: "skip",
      prBaseBranch: null,
      changelog: true,
    });
  });

  test("loadConfig deep-merges a partial postMerge block", () => {
    writeConfig(tmpDir, { postMerge: { prMode: "draft" } });
    expect(loadConfig(tmpDir).postMerge).toEqual({
      prMode: "draft",
      prBaseBranch: null,
      changelog: true,
    });
  });

  test("normalizePostMergeConfig tolerates undefined and partial blocks", () => {
    expect(normalizePostMergeConfig(undefined).prMode).toBe("skip");
    expect(normalizePostMergeConfig({ changelog: false })).toEqual({
      prMode: "skip",
      prBaseBranch: null,
      changelog: false,
    });
    expect(normalizePostMergeConfig(null as any).changelog).toBe(true);
  });

  test("normalizePostMergeConfig trims an explicit target branch", () => {
    expect(normalizePostMergeConfig({ prBaseBranch: " main " }).prBaseBranch).toBe("main");
  });

  test("validateConfig accepts manually constructed configs without postMerge", () => {
    const config = fresh();
    delete (config as any).postMerge;
    expect(() => validateConfig(config)).not.toThrow();
  });

  test("validateConfig accepts every valid prMode", () => {
    for (const prMode of ["open", "draft", "skip"] as const) {
      const config = fresh();
      config.postMerge = { prMode, prBaseBranch: null, changelog: true };
      expect(() => validateConfig(config)).not.toThrow();
    }
  });

  test("validateConfig rejects an invalid prMode", () => {
    const config = fresh();
    (config.postMerge as any).prMode = "auto";
    expect(() => validateConfig(config)).toThrow("postMerge.prMode");
  });

  test("validateConfig rejects non-boolean changelog", () => {
    const config = fresh();
    (config.postMerge as any).changelog = "yes";
    expect(() => validateConfig(config)).toThrow("postMerge.changelog");
  });

  test("validateConfig rejects empty or non-string prBaseBranch", () => {
    for (const bad of ["", "   ", 5]) {
      const config = fresh();
      (config.postMerge as any).prBaseBranch = bad;
      expect(() => validateConfig(config)).toThrow("postMerge.prBaseBranch");
    }
  });

  test("validateConfig accepts null prBaseBranch", () => {
    const config = fresh();
    config.postMerge = { prMode: "open", prBaseBranch: null, changelog: true };
    expect(() => validateConfig(config)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// resolveAgentBin
// ---------------------------------------------------------------------------

describe("resolveAgentBin", () => {
  const saved = { HOME: process.env.HOME, PATH: process.env.PATH, OPENCODE_BIN: process.env.OPENCODE_BIN };

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function configWithBin(bin: string | null): WomboConfig {
    const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as WomboConfig;
    config.agent.bin = bin;
    return config;
  }

  test("explicit agent.bin wins", () => {
    process.env.OPENCODE_BIN = "/env/opencode";
    expect(resolveAgentBin(configWithBin("/explicit/opencode"))).toBe("/explicit/opencode");
  });

  test("OPENCODE_BIN env is used when agent.bin is null", () => {
    process.env.OPENCODE_BIN = "/env/opencode";
    expect(resolveAgentBin(configWithBin(null))).toBe("/env/opencode");
  });

  test("null agent.bin resolves opencode from PATH when no default install exists", () => {
    delete process.env.OPENCODE_BIN;
    const home = join(tmpDir, "home");
    const pathDir = join(tmpDir, "bin");
    mkdirSync(home, { recursive: true });
    mkdirSync(pathDir, { recursive: true });
    const fake = join(pathDir, "opencode");
    writeFileSync(fake, "#!/bin/sh\n");
    chmodSync(fake, 0o755);
    process.env.HOME = home;
    process.env.PATH = pathDir;
    expect(resolveAgentBin(configWithBin(null))).toBe(fake);
  });

  test("default install location is preferred over PATH", () => {
    delete process.env.OPENCODE_BIN;
    const home = join(tmpDir, "home");
    const installed = join(home, ".opencode", "bin", "opencode");
    mkdirSync(join(home, ".opencode", "bin"), { recursive: true });
    writeFileSync(installed, "#!/bin/sh\n");
    process.env.HOME = home;
    process.env.PATH = join(tmpDir, "empty");
    expect(resolveAgentBin(configWithBin(null))).toBe(installed);
  });

  test("falls back to default install path when nothing is found", () => {
    delete process.env.OPENCODE_BIN;
    const home = join(tmpDir, "home");
    mkdirSync(home, { recursive: true });
    process.env.HOME = home;
    process.env.PATH = join(tmpDir, "empty");
    expect(resolveAgentBin(configWithBin(null))).toBe(join(home, ".opencode", "bin", "opencode"));
  });
});

// ---------------------------------------------------------------------------
// agentProfiles and routing
// ---------------------------------------------------------------------------

describe("agentProfiles and routing", () => {
  const withProfiles = (extra: Partial<WomboConfig>): WomboConfig =>
    ({ ...DEFAULT_CONFIG, ...extra }) as WomboConfig;

  const good = {
    agentProfiles: {
      oc: { harness: "opencode", model: "anthropic/claude-sonnet-4" },
      cc: {
        harness: "claude-code",
        model: "sonnet",
        envFrom: { ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY_WORK" },
        account: "work",
      },
      cx: { harness: "codex", provider: "openai" },
      tool: { harness: "custom", bin: "my-agent", command: { args: ["--run", "{prompt}"] } },
    },
    routing: {
      default: "oc",
      byWeight: { heavy: "cc" },
      byDifficulty: { very_hard: "cc" },
      byOperation: { plan: "cc", conflict: "oc" },
      fallbacks: { cc: ["cx", "oc"] },
    },
  } as unknown as Partial<WomboConfig>;

  test("defaults carry no profiles or routing and stay valid", () => {
    expect(DEFAULT_CONFIG.agentProfiles).toBeUndefined();
    expect(DEFAULT_CONFIG.routing).toBeUndefined();
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  test("a complete valid config passes", () => {
    expect(() => validateConfig(withProfiles(good))).not.toThrow();
  });

  test("loadConfig keeps profiles and routing from config.json; legacy keys unchanged", () => {
    writeConfig(tmpDir, { ...good, agent: { bin: "/x/opencode" }, modelRouting: { light: "m" } });
    const cfg = loadConfig(tmpDir);
    expect(cfg.agentProfiles?.cc.harness).toBe("claude-code");
    expect(cfg.routing?.fallbacks?.cc).toEqual(["cx", "oc"]);
    expect(cfg.agent.bin).toBe("/x/opencode");
    expect(cfg.modelRouting?.light).toBe("m");
    expect(() => validateConfig(cfg)).not.toThrow();
  });

  test("existing configs without the new keys still load and validate", () => {
    writeConfig(tmpDir, { agent: { bin: "/usr/bin/claude" }, modelRouting: { heavy: "opus" } });
    expect(() => validateConfig(loadConfig(tmpDir))).not.toThrow();
  });

  test("rejects unknown harness", () => {
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: { a: { harness: "gemini" } } } as any))
    ).toThrow(/agentProfiles\.a\.harness/);
  });

  test("rejects secret-looking env keys and values", () => {
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: { a: { harness: "codex", env: { OPENAI_API_KEY: "x" } } } }))
    ).toThrow(/looks like a secret/);
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: { a: { harness: "codex", env: { FOO: "sk-abc123" } } } }))
    ).toThrow(/looks like a secret/);
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: { a: { harness: "codex", env: { FOO_MODE: "fast" } } } }))
    ).not.toThrow();
  });

  test("envFrom values must be env var names", () => {
    expect(() =>
      validateConfig(
        withProfiles({ agentProfiles: { a: { harness: "codex", envFrom: { OPENAI_API_KEY: "sk-live-123 456" } } } })
      )
    ).toThrow(/NAME of an environment variable/);
    expect(() =>
      validateConfig(
        withProfiles({ agentProfiles: { a: { harness: "codex", envFrom: { OPENAI_API_KEY: "OPENAI_KEY_2" } } } })
      )
    ).not.toThrow();
  });

  test("custom harness requires bin and command.args", () => {
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: { a: { harness: "custom", bin: "x" } } } as any))
    ).toThrow(/command\.args/);
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: { a: { harness: "custom", command: { args: [] } } } } as any))
    ).toThrow(/bin is required/);
  });

  test("routing references must name defined profiles", () => {
    const profiles = { a: { harness: "opencode" } } as any;
    expect(() => validateConfig(withProfiles({ agentProfiles: profiles, routing: { default: "zzz" } }))).toThrow(
      /routing\.default references unknown profile "zzz"/
    );
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: profiles, routing: { byOperation: { plan: "zzz" } } }))
    ).toThrow(/byOperation\.plan/);
    expect(() => validateConfig(withProfiles({ routing: { default: "a" } }))).toThrow(/unknown profile/);
  });

  test("routing table keys are validated", () => {
    const profiles = { a: { harness: "opencode" } } as any;
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: profiles, routing: { byOperation: { deploy: "a" } } as any }))
    ).toThrow(/unknown key "deploy"/);
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: profiles, routing: { byWeight: { huge: "a" } } as any }))
    ).toThrow(/unknown key "huge"/);
  });

  test("fallback chains reject unknown names and cycles", () => {
    const profiles = { a: { harness: "opencode" }, b: { harness: "codex" } } as any;
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: profiles, routing: { fallbacks: { a: ["nope"] } } }))
    ).toThrow(/unknown profile "nope"/);
    expect(() =>
      validateConfig(withProfiles({ agentProfiles: profiles, routing: { fallbacks: { a: ["b"], b: ["a"] } } }))
    ).toThrow(/cycle: a -> b -> a/);
  });
});
