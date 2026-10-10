/**
 * tdd-baseline-templates.test.ts — TDD block in agent definitions
 *
 * Coverage:
 *   - Generalist and imported (specialized) agent definitions defer to a
 *     Quest Test Baseline section when the task prompt supplies one
 *   - Without a baseline they still require all tests to pass
 *   - Anti-hiding rules (no skipping/deleting tests) are present
 *   - No TDD/baseline text when TDD is disabled
 */

import { describe, test, expect } from "bun:test";
import { renderGeneralistAgent, patchImportedAgent } from "../src/lib/templates";
import type { WomboConfig } from "../src/config";

function makeConfig(tddEnabled: boolean): WomboConfig {
  return {
    tasksDir: "tasks",
    archiveDir: "archive",
    baseBranch: "main",
    build: { command: "bun run build", timeout: 300_000, artifactDir: "dist" },
    install: { command: "bun install", timeout: 120_000 },
    git: { branchPrefix: "feature/", remote: "origin", mergeStrategy: "--no-ff" },
    agent: {
      bin: null,
      name: "generalist-agent",
      configFiles: [],
      tmuxPrefix: "wombo",
      multiplexer: "auto",
    },
    portless: { enabled: false, bin: null, proxyPort: 1355, https: false },
    tdd: {
      enabled: tddEnabled,
      testCommand: "bun test",
      strictTdd: false,
      testTimeout: 120_000,
    },
  } as WomboConfig;
}

const IMPORTED_AGENT = `---
name: Specialist
description: A specialized agent
---

# Specialist

Do specialized things.
`;

const renderers = {
  generalist: (config: WomboConfig) => renderGeneralistAgent(config, "/tmp/project"),
  imported: (config: WomboConfig) => patchImportedAgent(IMPORTED_AGENT, config, "/tmp/project"),
};

for (const [kind, render] of Object.entries(renderers)) {
  describe(`TDD block — ${kind} agent`, () => {
    test("defers to a supplied quest baseline", () => {
      const out = render(makeConfig(true));
      expect(out).toContain("### Quest Test Baseline");
      expect(out).toContain("Defer to it");
      expect(out).toContain("any new failure is a regression");
    });

    test("requires all tests to pass when no baseline is supplied", () => {
      const out = render(makeConfig(true));
      expect(out).toContain("If no baseline is supplied, ALL tests must pass.");
      expect(out).toContain("confirm ALL tests pass (both new and existing)");
    });

    test("keeps red-green-refactor and forbids hiding failures", () => {
      const out = render(makeConfig(true));
      expect(out).toContain("red-green-refactor");
      expect(out).toContain("Every test you add MUST pass.");
      expect(out).toContain("NEVER skip, delete, disable, or weaken a test");
    });

    test("omits TDD and baseline text when TDD is disabled", () => {
      const out = render(makeConfig(false));
      expect(out).not.toContain("Test-Driven Development");
      expect(out).not.toContain("Quest Test Baseline");
    });
  });
}
