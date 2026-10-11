/**
 * daemon-project-context.test.ts — Project profile reaches real task agents.
 *
 * AgentRunner.doLaunch passes loadProjectContext(projectRoot) into
 * generatePrompt. No mocks: the agent binary is a recording shell stub set as
 * config.agent.bin, so the real launchHeadless runs and the stub records its
 * argv (the prompt is the final argv element for small prompts).
 */

import { describe, test, expect, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { AgentRunner } from "../src/daemon/agent-runner";
import { DaemonState } from "../src/daemon/state";
import { loadConfig, WOMBO_DIR, type WomboConfig } from "../src/config";
import { saveTaskToStore } from "../src/lib/task-store";
import { createBlankProfile, saveProject } from "../src/lib/project-store";
import type { Task } from "../src/lib/tasks";

const TEST_TIMEOUT_MS = 60_000;
const PROJECT_HEADING = "## Project Context";
const VISION_MARKER = "DAEMON-PROFILE-VISION-MARKER";

const tempDirs: string[] = [];
const runners: AgentRunner[] = [];
const states: DaemonState[] = [];

afterEach(() => {
  for (const runner of runners.splice(0)) runner.destroy();
  for (const state of states.splice(0)) state.destroy();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, encoding: "utf-8", stdio: "pipe" });
}

interface Ctx {
  root: string;
  logDir: string;
  config: WomboConfig;
}

/**
 * Project on main with a `.wombo-combo/config.json` pointing at a recording
 * stub agent. The project profile is written only when `withProfile` is set.
 */
function setupProject(withProfile: boolean): Ctx {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "daemon-ctx-root-")));
  const aux = realpathSync(mkdtempSync(join(tmpdir(), "daemon-ctx-aux-")));
  tempDirs.push(root, aux);

  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Context Test");
  writeFileSync(join(root, "README.md"), "# fixture\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");

  // Named "opencode" so detectAgentType picks the opencode argv layout.
  const logDir = join(aux, "log");
  const stubBin = join(aux, "bin", "opencode");
  mkdirSync(dirname(stubBin), { recursive: true });
  writeFileSync(
    stubBin,
    [
      "#!/usr/bin/env bash",
      `LOG='${logDir}'`,
      `mkdir -p "$LOG"`,
      `printf '%s\\0' "$@" > "$LOG/argv-$$.tmp" && mv "$LOG/argv-$$.tmp" "$LOG/argv-$$"`,
      "exec sleep 120",
      "",
    ].join("\n")
  );
  chmodSync(stubBin, 0o755);

  mkdirSync(join(root, WOMBO_DIR), { recursive: true });
  writeFileSync(
    join(root, WOMBO_DIR, "config.json"),
    JSON.stringify(
      {
        baseBranch: "main",
        tdd: { enabled: false },
        install: { command: "true", timeout: 60_000 },
        build: { command: "true", timeout: 60_000 },
        agent: { bin: stubBin, name: "test-agent", configFiles: [] },
        portless: { enabled: false },
      },
      null,
      2
    )
  );

  if (withProfile) {
    saveProject(root, {
      ...createBlankProfile("daemon-fixture"),
      vision: VISION_MARKER,
    });
  }

  return { root, logDir, config: loadConfig(root) };
}

/** Prompt (final argv element) of every recorded agent launch */
function recordedPrompts(ctx: Ctx): string[] {
  if (!existsSync(ctx.logDir)) return [];
  return readdirSync(ctx.logDir)
    .filter((f) => f.startsWith("argv-") && !f.endsWith(".tmp"))
    .map((f) => {
      const args = readFileSync(join(ctx.logDir, f), "utf-8").split("\0");
      args.pop();
      return args[args.length - 1];
    });
}

async function waitFor(cond: () => boolean, label: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await Bun.sleep(20);
  }
}

function makeTask(id: string): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "Do the thing",
    status: "planned",
    completion: 0,
    difficulty: "medium",
    priority: "medium",
    effort: "PT1H",
    depends_on: [],
    started_at: null,
    ended_at: null,
    constraints: [],
    forbidden: [],
    references: [],
    notes: [],
    subtasks: [],
  };
}

/** Launch one unquested task through the real daemon runner and return its prompt */
async function launchAndCapturePrompt(ctx: Ctx, taskId: string): Promise<string> {
  const state = new DaemonState(ctx.root);
  state.setBaseBranch("main");
  states.push(state);
  const runner = new AgentRunner({ projectRoot: ctx.root, config: ctx.config }, state);
  runners.push(runner);

  const task = makeTask(taskId);
  saveTaskToStore(ctx.root, ctx.config, task);
  runner.submitTask(task);

  await waitFor(() => recordedPrompts(ctx).length >= 1, `agent launch for ${taskId}`);
  return recordedPrompts(ctx)[0];
}

describe("daemon launch: project context in the agent prompt", () => {
  test(
    "real launch with project.yml: prompt contains the Project Context section",
    async () => {
      const ctx = setupProject(true);
      const prompt = await launchAndCapturePrompt(ctx, "ctx-with");

      expect(prompt).toContain(PROJECT_HEADING);
      expect(prompt).toContain(VISION_MARKER);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "real launch without project.yml: prompt has no Project Context section",
    async () => {
      const ctx = setupProject(false);
      const prompt = await launchAndCapturePrompt(ctx, "ctx-without");

      expect(prompt).toContain("Do the thing");
      expect(prompt).not.toContain(PROJECT_HEADING);
    },
    TEST_TIMEOUT_MS
  );
});
