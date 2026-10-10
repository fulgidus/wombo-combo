/**
 * cli-smoke.test.ts — end-to-end smoke tests for the woco CLI.
 *
 * Every case spawns the CLI as a real subprocess. Nothing here imports command
 * modules. Project-touching cases run in a fresh temp directory that is removed
 * in afterEach; the repository itself is never written to.
 *
 * Non-interactive setup: `woco init` renders an Ink confirmation screen, so the
 * temp project is seeded with a minimal `.wombo-combo/config.json` instead.
 * loadConfig() merges it with defaults, and the task/wishlist/quest stores are
 * created lazily on first write.
 *
 * Known bugs are recorded as `test.todo(...)` entries rather than worked around.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dir, "../..");
const SRC_ENTRY = join(REPO_ROOT, "src", "index.ts");
const DIST_ENTRY = join(REPO_ROOT, "dist", "index.js");
const PKG_VERSION: string = JSON.parse(
  readFileSync(join(REPO_ROOT, "package.json"), "utf-8"),
).version;
const DIST_EXISTS = existsSync(DIST_ENTRY);

/** Per-test timeout (ms). The subprocess timeout sits just below it. */
const TEST_TIMEOUT = 30_000;
const PROCESS_TIMEOUT = TEST_TIMEOUT - 5_000;

const ANSI_PATTERN = /\x1b\[[0-9;]*[A-Za-z]/g;

// ---------------------------------------------------------------------------
// Subprocess helpers
// ---------------------------------------------------------------------------

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** stdout followed by stderr, ANSI stripped. Convenient for substring checks. */
  output: string;
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

/** Non-interactive environment: no colour, no TTY, CI flag set. */
function buildEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  // Output format can be forced from outside; the tests must control it.
  delete env.WOMBO_OUTPUT;
  env.CI = "1";
  env.NO_COLOR = "1";
  env.FORCE_COLOR = "0";
  env.TERM = "dumb";
  return env;
}

function runProcess(cmd: string[], cwd: string): CliResult {
  const proc = Bun.spawnSync({
    cmd,
    cwd,
    env: buildEnv(),
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    timeout: PROCESS_TIMEOUT,
  });
  const stdout = stripAnsi(proc.stdout.toString());
  const stderr = stripAnsi(proc.stderr.toString());
  return {
    exitCode: proc.exitCode ?? -1,
    stdout,
    stderr,
    output: `${stdout}${stderr}`,
  };
}

/** Run the CLI from source: `bun <repo>/src/index.ts ...`. */
function runSrc(args: string[], cwd: string): CliResult {
  return runProcess([process.execPath, SRC_ENTRY, ...args], cwd);
}

// ---------------------------------------------------------------------------
// Project fixture helpers
// ---------------------------------------------------------------------------

let projectDir: string;

/** Seed a minimal wombo-combo project (see header comment for why not `init`). */
function seedProject(dir: string): void {
  const configDir = join(dir, ".wombo-combo");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, "config.json"), "{}\n", "utf-8");
}

function woco(args: string[]): CliResult {
  return runSrc(args, projectDir);
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "woco-e2e-"));
  seedProject(projectDir);
});

afterEach(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Source entry: global commands (no project needed)
// ---------------------------------------------------------------------------

describe("CLI smoke (source entry: bun src/index.ts)", () => {
  describe("global commands", () => {
    test(
      "help exits 0 and lists the core commands",
      () => {
        const result = runSrc(["help"], REPO_ROOT);
        expect(result.exitCode).toBe(0);
        for (const command of ["launch", "tasks", "quest", "wishlist", "describe", "version"]) {
          expect(result.stdout).toContain(command);
        }
      },
      TEST_TIMEOUT,
    );

    test(
      "version prints the package.json version",
      () => {
        const result = runSrc(["version"], REPO_ROOT);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(`wombo-combo ${PKG_VERSION}`);
      },
      TEST_TIMEOUT,
    );

    test(
      "-v prints the package.json version",
      () => {
        const result = runSrc(["-v"], REPO_ROOT);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(`wombo-combo ${PKG_VERSION}`);
      },
      TEST_TIMEOUT,
    );

    test(
      "unknown command exits non-zero with an error message",
      () => {
        const result = runSrc(["definitely-not-a-command"], REPO_ROOT);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Unknown command: definitely-not-a-command");
      },
      TEST_TIMEOUT,
    );

    test(
      "describe tasks emits valid JSON with a flags array",
      () => {
        const result = runSrc(["describe", "tasks"], REPO_ROOT);
        expect(result.exitCode).toBe(0);
        const schema = JSON.parse(result.stdout);
        expect(schema.command).toBe("tasks");
        expect(Array.isArray(schema.flags)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    test(
      "describe launch reports mutating and dry-run support",
      () => {
        const result = runSrc(["describe", "launch"], REPO_ROOT);
        expect(result.exitCode).toBe(0);
        const schema = JSON.parse(result.stdout);
        expect(schema.command).toBe("launch");
        expect(schema.mutating).toBe(true);
        expect(schema.supports_dry_run).toBe(true);
      },
      TEST_TIMEOUT,
    );
  });

  // -------------------------------------------------------------------------
  // Project lifecycle, each case in a fresh temp project
  // -------------------------------------------------------------------------

  describe("tasks", () => {
    test(
      "tasks add creates a task file in the store",
      () => {
        const result = woco(["tasks", "add", "first-task", "First task"]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Added task: first-task");
        expect(existsSync(join(projectDir, ".wombo-combo", "tasks", "first-task.yml"))).toBe(true);
      },
      TEST_TIMEOUT,
    );

    test(
      "tasks add rejects a duplicate id",
      () => {
        expect(woco(["tasks", "add", "dup-task", "Original"]).exitCode).toBe(0);
        const second = woco(["tasks", "add", "dup-task", "Duplicate"]);
        expect(second.exitCode).toBe(1);
        expect(second.output).toContain("already exists");
      },
      TEST_TIMEOUT,
    );

    test(
      "tasks list shows the added task in text output",
      () => {
        expect(woco(["tasks", "add", "listed-task", "Listed task"]).exitCode).toBe(0);
        const result = woco(["tasks", "list"]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("listed-task");
        expect(result.stdout).toContain("BACKLOG");
      },
      TEST_TIMEOUT,
    );

    test(
      "tasks show prints the task details",
      () => {
        expect(woco(["tasks", "add", "shown-task", "Shown task"]).exitCode).toBe(0);
        const result = woco(["tasks", "show", "shown-task"]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Task: Shown task");
        expect(result.stdout).toMatch(/Status:\s+backlog/);
      },
      TEST_TIMEOUT,
    );

    test(
      "tasks show on an unknown id exits 1",
      () => {
        const result = woco(["tasks", "show", "no-such-task"]);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain('"no-such-task" not found');
      },
      TEST_TIMEOUT,
    );

    test(
      "tasks set-status moves a task to done",
      () => {
        expect(woco(["tasks", "add", "status-task", "Status task"]).exitCode).toBe(0);
        const update = woco(["tasks", "set-status", "status-task", "done"]);
        expect(update.exitCode).toBe(0);
        expect(update.stdout).toMatch(/backlog\s*→\s*done/);
        expect(woco(["tasks", "show", "status-task"]).stdout).toMatch(/Status:\s+done/);
      },
      TEST_TIMEOUT,
    );

    test(
      "tasks set-status rejects an invalid status",
      () => {
        expect(woco(["tasks", "add", "bad-status", "Bad status"]).exitCode).toBe(0);
        const result = woco(["tasks", "set-status", "bad-status", "bogus"]);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain('Invalid status: "bogus"');
      },
      TEST_TIMEOUT,
    );

    test(
      "tasks check passes on a valid store",
      () => {
        expect(woco(["tasks", "add", "checked-task", "Checked task"]).exitCode).toBe(0);
        const result = woco(["tasks", "check"]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("All checks passed");
      },
      TEST_TIMEOUT,
    );

    // Known bugs. Kept as todos so CI stays green while the gap is tracked.

    test.todo(
      "BUG: tasks list --output json emits JSON (currently prints human-readable text)",
    );

    test.todo(
      "BUG: tasks show --output json emits JSON (currently prints human-readable text)",
    );

    test(
      "tasks add rejects a non-kebab-case id such as Bad_ID and writes nothing",
      () => {
        const result = woco(["tasks", "add", "Bad_ID", "x"]);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Bad_ID");
        expect(result.output).toContain("kebab-case");
        expect(existsSync(join(projectDir, ".wombo-combo", "tasks", "Bad_ID.yml"))).toBe(false);
        expect(woco(["tasks", "list"]).stdout).not.toContain("Bad_ID");
      },
      TEST_TIMEOUT,
    );

    test(
      "tasks check exits 1 and does not report success when a task id is invalid",
      () => {
        expect(woco(["tasks", "add", "good-task", "Good task"]).exitCode).toBe(0);
        const tasksDirPath = join(projectDir, ".wombo-combo", "tasks");
        writeFileSync(
          join(tasksDirPath, "Bad_ID.yml"),
          "id: Bad_ID\ntitle: Bad task\nstatus: backlog\neffort: PT1H\n",
          "utf-8",
        );
        const result = woco(["tasks", "check"]);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("[Bad_ID]");
        expect(result.output).toContain("kebab-case");
        expect(result.stdout).not.toContain("All checks passed");
      },
      TEST_TIMEOUT,
    );
  });

  describe("wishlist", () => {
    test(
      "wishlist add then list shows the idea with its tag",
      () => {
        const add = woco(["wishlist", "add", "smoke idea", "--tag", "ux"]);
        expect(add.exitCode).toBe(0);
        expect(add.stdout).toContain("Added wishlist item: smoke idea");

        const list = woco(["wishlist", "list"]);
        expect(list.exitCode).toBe(0);
        expect(list.stdout).toContain("smoke idea");
        expect(list.stdout).toContain("[ux]");
      },
      TEST_TIMEOUT,
    );

    test(
      "wishlist list on an empty store exits 0",
      () => {
        const result = woco(["wishlist", "list"]);
        expect(result.exitCode).toBe(0);
      },
      TEST_TIMEOUT,
    );

    test.todo(
      "BUG: wishlist list --output json emits JSON (currently prints human-readable text)",
    );
  });

  describe("quest", () => {
    test(
      "quest create then list and show a draft quest",
      () => {
        const create = woco([
          "quest",
          "create",
          "smoke-quest",
          "Smoke quest",
          "--goal",
          "Ship the smoke test",
        ]);
        expect(create.exitCode).toBe(0);
        expect(create.stdout).toContain("Created quest: smoke-quest");

        const list = woco(["quest", "list"]);
        expect(list.exitCode).toBe(0);
        expect(list.stdout).toContain("smoke-quest");

        const show = woco(["quest", "show", "smoke-quest"]);
        expect(show.exitCode).toBe(0);
        expect(show.stdout).toContain("Quest: Smoke quest");
        expect(show.stdout).toContain("Ship the smoke test");
      },
      TEST_TIMEOUT,
    );

    test(
      "quest create without --goal exits 1",
      () => {
        const result = woco(["quest", "create", "no-goal", "No goal"]);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("--goal");
      },
      TEST_TIMEOUT,
    );

    test(
      "quest show on an unknown id exits 1",
      () => {
        const result = woco(["quest", "show", "no-such-quest"]);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain('"no-such-quest" not found');
      },
      TEST_TIMEOUT,
    );

    test.todo(
      "BUG: quest list --output json emits JSON (currently prints human-readable text)",
    );
  });

  describe("end-to-end flow in one project", () => {
    test(
      "add, list, show, set-status, check, wishlist, and quest in sequence",
      () => {
        expect(woco(["tasks", "add", "flow-task", "Flow task"]).exitCode).toBe(0);
        expect(woco(["tasks", "list"]).stdout).toContain("flow-task");
        expect(woco(["tasks", "show", "flow-task"]).stdout).toContain("Task: Flow task");
        expect(woco(["tasks", "set-status", "flow-task", "done"]).exitCode).toBe(0);
        expect(woco(["tasks", "check"]).exitCode).toBe(0);

        expect(woco(["wishlist", "add", "flow idea"]).exitCode).toBe(0);
        expect(woco(["wishlist", "list"]).stdout).toContain("flow idea");

        expect(
          woco(["quest", "create", "flow-quest", "Flow quest", "--goal", "Flow goal"]).exitCode,
        ).toBe(0);
        expect(woco(["quest", "list"]).stdout).toContain("flow-quest");
      },
      TEST_TIMEOUT,
    );
  });
});

// ---------------------------------------------------------------------------
// Built dist: only when dist/index.js exists (it is gitignored, so CI may skip)
// ---------------------------------------------------------------------------

describe.skipIf(!DIST_EXISTS)("CLI smoke (built dist: dist/index.js)", () => {
  test(
    "bun dist/index.js help lists the core commands",
    () => {
      const result = runProcess([process.execPath, DIST_ENTRY, "help"], REPO_ROOT);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("launch");
      expect(result.stdout).toContain("tasks");
    },
    TEST_TIMEOUT,
  );

  test(
    "bun dist/index.js version prints the package version",
    () => {
      const result = runProcess([process.execPath, DIST_ENTRY, "version"], REPO_ROOT);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`wombo-combo ${PKG_VERSION}`);
    },
    TEST_TIMEOUT,
  );

  test.todo(
    "BUG: node dist/index.js help and version run (currently crash at load with 'ReferenceError: self is not defined' from react-devtools-core)",
  );
});
