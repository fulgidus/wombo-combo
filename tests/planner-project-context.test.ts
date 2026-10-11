/**
 * planner-project-context.test.ts — Project profile injection into planner
 * prompts (quest planner, errand planner, genesis).
 *
 * Each planner prompt is built against a temp repo. When the repo has a
 * .wombo-combo/project.yml the profile must appear; without one it must not.
 * Genesis must not duplicate the profile when the vision already carries it.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WomboConfig } from "../src/config";
import { generateErrandPrompt, type ErrandSpec } from "../src/lib/errand-planner";
import { generateGenesisPrompt } from "../src/lib/genesis-planner";
import { generatePlannerPrompt } from "../src/lib/quest-planner";
import { createBlankQuest } from "../src/lib/quest";
import { createBlankProfile, saveProject, formatProjectContext } from "../src/lib/project-store";

const PROJECT_HEADING = "## Project Context";
const VISION_MARKER = "PLANNER-CONTEXT-VISION-MARKER";
const RULE_MARKER = "PLANNER-CONTEXT-RULE-MARKER";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeConfig(overrides?: Partial<WomboConfig>): WomboConfig {
  return {
    tasksDir: "tasks",
    archiveDir: "archive",
    baseBranch: "main",
    build: { command: "bun run build", timeout: 300_000, artifactDir: "dist" },
    install: { command: "bun install", timeout: 120_000 },
    git: { branchPrefix: "feature/", remote: "origin", mergeStrategy: "--no-ff" },
    agent: { bin: null, name: "generalist-agent", configFiles: [], tmuxPrefix: "wombo", multiplexer: "auto" },
    portless: { enabled: false, bin: null, proxyPort: 1355, https: false },
    backup: { maxBackups: 5 },
    defaults: { maxConcurrent: 6, maxRetries: 2 },
    browser: {
      enabled: false,
      bin: null,
      headless: true,
      testCommand: null,
      launchTimeout: 30_000,
      testTimeout: 60_000,
      defaultViewport: { width: 1280, height: 720 },
    },
    agentRegistry: {
      mode: "auto",
      source: "msitarzewski/agency-agents",
      cacheDir: "agents-cache",
      cacheTTL: 24 * 60 * 60 * 1000,
    },
    tdd: { enabled: false, testCommand: "bun test", strictTdd: false, testTimeout: 120_000 },
    ...overrides,
  } as WomboConfig;
}

/** Minimal git repo with one source file; optionally with a project profile */
function makeRepo(withProfile: boolean): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "planner-context-")));
  tempDirs.push(root);
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "index.ts"), "export const x = 1;\n");
  if (withProfile) {
    saveProject(root, {
      ...createBlankProfile("planner-fixture"),
      vision: VISION_MARKER,
      rules: [
        {
          id: "r1",
          text: RULE_MARKER,
          scope: "src/",
          rigidity: "hard",
          consequences: "",
          tags: [],
        },
      ],
    });
  }
  return root;
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("generatePlannerPrompt (quest planner) — project context", () => {
  const quest = createBlankQuest("q-ctx", "Context quest", "Goal for the context quest", "main");

  test("includes the project profile when project.yml exists", async () => {
    const root = makeRepo(true);
    const prompt = await generatePlannerPrompt(quest, root, makeConfig());
    expect(prompt).toContain(PROJECT_HEADING);
    expect(prompt).toContain(VISION_MARKER);
    expect(prompt).toContain(RULE_MARKER);
    expect(countOccurrences(prompt, PROJECT_HEADING)).toBe(1);
  });

  test("omits the project profile when there is no project.yml", async () => {
    const root = makeRepo(false);
    const prompt = await generatePlannerPrompt(quest, root, makeConfig());
    expect(prompt).not.toContain(PROJECT_HEADING);
    expect(prompt).not.toContain(VISION_MARKER);
  });

  test("does not embed the codebase summary (planner has its own scout outline)", async () => {
    const root = makeRepo(true);
    const prompt = await generatePlannerPrompt(quest, root, makeConfig());
    expect(prompt).not.toContain("### Codebase Summary");
  });
});

describe("generateErrandPrompt (errand planner) — project context", () => {
  const spec: ErrandSpec = { description: "Add a small helper" };

  test("includes the project profile when project.yml exists", async () => {
    const root = makeRepo(true);
    const prompt = await generateErrandPrompt(spec, root, makeConfig());
    expect(prompt).toContain(PROJECT_HEADING);
    expect(prompt).toContain(VISION_MARKER);
    expect(prompt).toContain(RULE_MARKER);
  });

  test("omits the project profile when there is no project.yml", async () => {
    const root = makeRepo(false);
    const prompt = await generateErrandPrompt(spec, root, makeConfig());
    expect(prompt).not.toContain(PROJECT_HEADING);
  });
});

describe("generateGenesisPrompt — project context", () => {
  test("includes the profile for a plain vision", async () => {
    const root = makeRepo(true);
    const prompt = await generateGenesisPrompt("Build the widget platform", root, makeConfig());
    expect(prompt).toContain("Build the widget platform");
    expect(prompt).toContain(PROJECT_HEADING);
    expect(prompt).toContain(VISION_MARKER);
    expect(countOccurrences(prompt, PROJECT_HEADING)).toBe(1);
  });

  test("omits the profile when there is no project.yml", async () => {
    const root = makeRepo(false);
    const prompt = await generateGenesisPrompt("Build the widget platform", root, makeConfig());
    expect(prompt).not.toContain(PROJECT_HEADING);
  });

  test("does not duplicate the profile when the vision already contains it", async () => {
    const root = makeRepo(true);
    const formatted = formatProjectContext({
      ...createBlankProfile("planner-fixture"),
      vision: VISION_MARKER,
    });
    const prompt = await generateGenesisPrompt(formatted, root, makeConfig());
    expect(countOccurrences(prompt, PROJECT_HEADING)).toBe(1);
  });
});
