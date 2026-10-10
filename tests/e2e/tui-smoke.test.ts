/**
 * tui-smoke.test.ts — End-to-end smoke test for the interactive TUI.
 *
 * Launches the REAL `woco` TUI (`src/index.ts`, no args → `tui` command) inside
 * a pseudo-terminal and drives it with keystrokes. The PTY comes from util-linux
 * `script`, so no npm dependencies are needed. Only Linux is supported; the
 * suite is skipped elsewhere (or when `script` is missing).
 *
 * Assertions use stable, screen-level text only:
 *   - "Press any key to continue"  splash screen, after its preflight checks
 *   - "All Tasks" / "Keys:"        quest picker (main screen)
 *   - "Return to app" / "Quit wombo"  ESC menu
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateDefaultConfig } from "../../src/config";

const SUPPORTED = process.platform === "linux" && Bun.which("script") !== null;

const ENTRY = join(import.meta.dir, "..", "..", "src", "index.ts");
const COLS = 120;
const ROWS = 40;
const STEP_TIMEOUT_MS = 20_000;
const TEST_TIMEOUT_MS = 30_000;

/** Minimal project.yml so the TUI skips first-run onboarding. */
const PROJECT_YML = `name: smoke-project
type: brownfield
description: TUI smoke fixture
vision: ""
objectives: []
tech_stack:
  runtime: Bun
  language: TypeScript
  frameworks: []
  tools: []
  notes: ""
conventions:
  commits: ""
  branches: ""
  testing: ""
  coding_style: ""
  naming: ""
rules: []
`;

// Keys
const KEY_ESC = "\x1b";
const KEY_DOWN = "\x1b[B";
const KEY_UP = "\x1b[A";
const KEY_ENTER = "\r";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip ANSI CSI / OSC escape sequences and carriage returns. */
function stripAnsi(s: string): string {
  return s
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[=>78]/g, "")
    .replace(/\r/g, "");
}

interface TuiSession {
  /** Strip-ANSI'd screen output accumulated so far. */
  text(): string;
  /** Poll until `needle` appears in the output or the timeout elapses. */
  waitFor(needle: string, timeoutMs?: number): Promise<void>;
  /** Write raw keystrokes to the TUI. */
  send(keys: string): Promise<void>;
  /** Resolves with the exit code of `script` (== TUI exit code) or rejects on timeout. */
  waitForExit(timeoutMs?: number): Promise<number>;
  /** Current exit code, or null while still running. */
  exitCode(): number | null;
  /** Kill the process tree if still alive. Safe to call multiple times. */
  kill(): Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Launch the TUI in a PTY of fixed size. `script -e` propagates the child's
 * exit code; `stty` sets the PTY size (script copies the size of its own
 * stdin, which is a pipe here, so without it Ink renders nothing).
 */
function launchTui(cwd: string): TuiSession {
  // Ink switches to CI mode (no live re-renders, only the final frame) when
  // CI is set — and GitHub Actions always sets it. Drop it for the TUI child.
  const { CI: _ci, CONTINUOUS_INTEGRATION: _ci2, ...env } = process.env;
  const cmd = `stty cols ${COLS} rows ${ROWS}; exec ${JSON.stringify(process.execPath)} ${JSON.stringify(ENTRY)}`;
  const proc = Bun.spawn(["script", "-qfec", cmd, "/dev/null"], {
    cwd,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...env, TERM: "xterm-256color" },
  });

  let raw = "";
  let stderr = "";
  const decoder = new TextDecoder();
  const readOut = (async () => {
    for await (const chunk of proc.stdout) raw += decoder.decode(chunk, { stream: true });
  })().catch(() => {});
  const readErr = (async () => {
    for await (const chunk of proc.stderr) stderr += decoder.decode(chunk, { stream: true });
  })().catch(() => {});

  const text = () => stripAnsi(raw);

  const session: TuiSession = {
    text,

    async waitFor(needle, timeoutMs = STEP_TIMEOUT_MS) {
      const deadline = Date.now() + timeoutMs;
      while (!text().includes(needle)) {
        if (proc.exitCode !== null) {
          throw new Error(
            `TUI exited (code ${proc.exitCode}) before showing ${JSON.stringify(needle)}.\n` +
              `stderr: ${stderr.slice(-1000)}\nscreen tail:\n${text().slice(-1500)}`
          );
        }
        if (Date.now() > deadline) {
          throw new Error(
            `Timed out after ${timeoutMs}ms waiting for ${JSON.stringify(needle)}.\n` +
              `stderr: ${stderr.slice(-1000)}\nscreen tail:\n${text().slice(-1500)}`
          );
        }
        await sleep(50);
      }
    },

    async send(keys) {
      proc.stdin.write(keys);
      proc.stdin.flush();
      await sleep(150);
    },

    async waitForExit(timeoutMs = 5_000) {
      const timer = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`TUI did not exit within ${timeoutMs}ms.\nscreen tail:\n${text().slice(-1500)}`)),
          timeoutMs
        )
      );
      const code = await Promise.race([proc.exited, timer]);
      await Promise.all([readOut, readErr]);
      return code;
    },

    exitCode: () => proc.exitCode,

    async kill() {
      if (proc.exitCode === null) {
        proc.kill("SIGKILL");
        await proc.exited.catch(() => {});
      }
      await Promise.all([readOut, readErr]);
    },
  };

  return session;
}

/** Create an initialized wombo project in a fresh temp dir. */
function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "woco-tui-"));
  Bun.spawnSync(["git", "init", "-q"], { cwd: dir });
  const wombo = join(dir, ".wombo-combo");
  mkdirSync(wombo, { recursive: true });
  writeFileSync(join(wombo, "config.json"), generateDefaultConfig());
  writeFileSync(join(wombo, "project.yml"), PROJECT_YML);
  return dir;
}

/** Drive the splash to the quest picker (main screen). */
async function reachQuestPicker(tui: TuiSession): Promise<void> {
  // Splash runs preflight checks, then waits for a keypress.
  await tui.waitFor("Press any key to continue");
  await tui.send(" ");
  await tui.waitFor("All Tasks");
  await tui.waitFor("Keys:");
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe.skipIf(!SUPPORTED)("TUI smoke (real process in a PTY)", () => {
  let projectDir: string;
  let sessions: TuiSession[];

  beforeEach(() => {
    projectDir = makeProject();
    sessions = [];
  });

  afterEach(async () => {
    for (const s of sessions) await s.kill();
    rmSync(projectDir, { recursive: true, force: true });
  });

  function start(): TuiSession {
    const tui = launchTui(projectDir);
    sessions.push(tui);
    return tui;
  }

  test(
    "renders the splash, then the quest picker after a keypress",
    async () => {
      const tui = start();
      await reachQuestPicker(tui);

      expect(tui.text()).toContain("All Tasks");
      expect(tui.text()).toContain("Keys:");
      expect(tui.exitCode()).toBeNull();
    },
    TEST_TIMEOUT_MS
  );

  test(
    "navigation keys do not crash the quest picker",
    async () => {
      const tui = start();
      await reachQuestPicker(tui);

      // Arrow keys and vim-style j/k.
      await tui.send(KEY_DOWN);
      await tui.send(KEY_DOWN);
      await tui.send("j");
      await tui.send(KEY_UP);
      await tui.send("k");
      await tui.send(KEY_UP);
      await sleep(300);

      expect(tui.exitCode()).toBeNull();
      expect(tui.text()).toContain("Keys:");

      // Still responsive: ESC opens the menu, ESC closes it.
      await tui.send(KEY_ESC);
      await tui.waitFor("Quit wombo");
      await tui.send(KEY_ESC);
      expect(tui.exitCode()).toBeNull();

      // And still quits cleanly afterwards.
      await tui.send("q");
      expect(await tui.waitForExit()).toBe(0);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "q on the quest picker exits with code 0",
    async () => {
      const tui = start();
      await reachQuestPicker(tui);

      await tui.send("q");
      expect(await tui.waitForExit(5_000)).toBe(0);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "ESC menu → 'Quit wombo' exits with code 0",
    async () => {
      const tui = start();
      await reachQuestPicker(tui);

      await tui.send(KEY_ESC);
      await tui.waitFor("Return to app");
      await tui.waitFor("Quit wombo");

      // Items: Return to app, Dashboard, Settings, Quit wombo.
      await tui.send(KEY_DOWN);
      await tui.send(KEY_DOWN);
      await tui.send(KEY_DOWN);
      await tui.send(KEY_ENTER);

      expect(await tui.waitForExit(5_000)).toBe(0);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "ESC menu → Dashboard shows the realtime dashboard; b returns to the quest picker",
    async () => {
      const tui = start();
      await reachQuestPicker(tui);

      await tui.send(KEY_ESC);
      await tui.waitFor("Dashboard");
      await tui.send(KEY_DOWN); // Return to app -> Dashboard
      await tui.send(KEY_ENTER);

      await tui.waitFor("Throughput");
      await tui.waitFor("Est. remaining");
      await tui.waitFor("Quest tokens");
      expect(tui.exitCode()).toBeNull();

      await tui.send("b");
      await tui.waitFor("Keys:");
      expect(tui.exitCode()).toBeNull();

      await tui.send("q");
      expect(await tui.waitForExit()).toBe(0);
    },
    TEST_TIMEOUT_MS
  );

  test(
    "q quits from the onboarding screen (first run, no project.yml)",
    async () => {
      // First run: config.json is present but project.yml is not.
      rmSync(join(projectDir, ".wombo-combo", "project.yml"));

      const tui = start();
      await tui.waitFor("Project Onboarding");
      // The type step is a selection list (no text field), so q quits.
      await tui.send("q");

      expect(await tui.waitForExit(5_000)).toBe(0);
    },
    TEST_TIMEOUT_MS
  );
});
