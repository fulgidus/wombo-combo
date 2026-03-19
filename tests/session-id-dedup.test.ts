/**
 * session-id-dedup.test.ts — Tests for cross-agent session ID collision detection.
 *
 * Coverage:
 *   - ProcessMonitor.addProcess(): detects when a new agent receives a session ID
 *     that's already held by another monitored process
 *   - ProcessMonitor.reconnectProcess(): same collision detection for reconnected processes
 *   - Collision warning is pushed to the activity log and written to the log file
 *   - Non-colliding session IDs do NOT trigger warnings
 *   - launchHeadless() uses a unique --title flag (with timestamp suffix) to prevent
 *     opencode from reusing a prior session
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EventEmitter } from "node:events";

import { ProcessMonitor, type MonitorCallbacks } from "../src/lib/monitor";
import { detectAgentType } from "../src/lib/launcher";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wombo-test-dedup-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Create a fake ChildProcess that emits stdout data on demand.
 * Returns the emitter and a helper to push JSON events.
 */
function makeFakeProcess() {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const proc = new EventEmitter() as any;
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.pid = Math.floor(Math.random() * 90000) + 10000;
  proc.kill = () => {};

  function emitEvent(event: object) {
    stdout.emit("data", Buffer.from(JSON.stringify(event) + "\n"));
  }

  return { proc, emitEvent };
}

/** Create a minimal session event with a given sessionID */
function sessionEvent(sessionID: string) {
  return { type: "step_start", sessionID };
}

// ---------------------------------------------------------------------------
// ProcessMonitor — cross-process session ID collision detection
// ---------------------------------------------------------------------------

describe("ProcessMonitor session ID collision detection", () => {
  test("no warning when two agents have distinct session IDs", () => {
    const warnings: string[] = [];

    const monitor = new ProcessMonitor(tmpDir, {
      onSessionId: () => {},
    });

    // Override pushActivity to capture warnings (via activity log)
    const { proc: proc1, emitEvent: emit1 } = makeFakeProcess();
    const { proc: proc2, emitEvent: emit2 } = makeFakeProcess();

    monitor.addProcess("feat-a", proc1);
    monitor.addProcess("feat-b", proc2);

    emit1(sessionEvent("ses_AAAA"));
    emit2(sessionEvent("ses_BBBB"));

    // Check no collision warning in activity log for either agent
    const logA = monitor.getActivityLog("feat-a").map((e) => e.text);
    const logB = monitor.getActivityLog("feat-b").map((e) => e.text);

    const hasWarnA = logA.some((l) => l.includes("[WARN]") && l.includes("session ID"));
    const hasWarnB = logB.some((l) => l.includes("[WARN]") && l.includes("session ID"));

    expect(hasWarnA).toBe(false);
    expect(hasWarnB).toBe(false);
  });

  test("warns when two agents receive the same session ID", () => {
    const sessionIds: Array<{ featureId: string; sessionId: string }> = [];

    const monitor = new ProcessMonitor(tmpDir, {
      onSessionId: (featureId, sessionId) => {
        sessionIds.push({ featureId, sessionId });
      },
    });

    const { proc: proc1, emitEvent: emit1 } = makeFakeProcess();
    const { proc: proc2, emitEvent: emit2 } = makeFakeProcess();

    monitor.addProcess("feat-a", proc1);
    monitor.addProcess("feat-b", proc2);

    const sharedSessionId = "ses_SHARED123";
    emit1(sessionEvent(sharedSessionId));
    emit2(sessionEvent(sharedSessionId));

    // Both agents should have had their onSessionId callback fired
    expect(sessionIds.map((s) => s.featureId)).toContain("feat-a");
    expect(sessionIds.map((s) => s.featureId)).toContain("feat-b");

    // The second agent's activity log should contain a [WARN] collision message
    const logB = monitor.getActivityLog("feat-b").map((e) => e.text);
    const collisionWarn = logB.find(
      (l) => l.includes("[WARN]") && l.includes(sharedSessionId) && l.includes("feat-a")
    );
    expect(collisionWarn).toBeDefined();
  });

  test("collision warning includes both the duplicate session ID and the existing agent ID", () => {
    const monitor = new ProcessMonitor(tmpDir, {
      onSessionId: () => {},
    });

    const { proc: proc1, emitEvent: emit1 } = makeFakeProcess();
    const { proc: proc2, emitEvent: emit2 } = makeFakeProcess();

    monitor.addProcess("agent-alpha", proc1);
    monitor.addProcess("agent-beta", proc2);

    const dupId = "ses_DUPLICATE_SESSION";
    emit1(sessionEvent(dupId));
    emit2(sessionEvent(dupId));

    const logBeta = monitor.getActivityLog("agent-beta").map((e) => e.text);
    const warnLine = logBeta.find(
      (l) => l.includes("[WARN]") && l.includes(dupId) && l.includes("agent-alpha")
    );
    expect(warnLine).toBeTruthy();
    // Also check it mentions "session reuse" or "already in use"
    expect(warnLine).toMatch(/already in use|session reuse/i);
  });

  test("collision warning is written to the log file", () => {
    const monitor = new ProcessMonitor(tmpDir, {
      onSessionId: () => {},
    });

    const { proc: proc1, emitEvent: emit1 } = makeFakeProcess();
    const { proc: proc2, emitEvent: emit2 } = makeFakeProcess();

    monitor.addProcess("feat-x", proc1);
    monitor.addProcess("feat-y", proc2);

    const dupId = "ses_LOGFILE_TEST";
    emit1(sessionEvent(dupId));
    emit2(sessionEvent(dupId));

    // Check the log file for feat-y contains the warning
    const logFile = join(tmpDir, ".wombo-combo/logs/feat-y.log");
    expect(existsSync(logFile)).toBe(true);
    const content = readFileSync(logFile, "utf-8");
    expect(content).toContain("[WARN]");
    expect(content).toContain(dupId);
  });

  test("still stores session ID on colliding agent (state reflects reality)", () => {
    const monitor = new ProcessMonitor(tmpDir, {
      onSessionId: () => {},
    });

    const { proc: proc1, emitEvent: emit1 } = makeFakeProcess();
    const { proc: proc2, emitEvent: emit2 } = makeFakeProcess();

    monitor.addProcess("feat-1", proc1);
    monitor.addProcess("feat-2", proc2);

    const dupId = "ses_STILL_STORED";
    emit1(sessionEvent(dupId));
    emit2(sessionEvent(dupId));

    // Both agents should have the session ID stored
    expect(monitor.getSessionId("feat-1")).toBe(dupId);
    expect(monitor.getSessionId("feat-2")).toBe(dupId);
  });

  test("fires onSessionId callback for both agents even when collision detected", () => {
    const called: string[] = [];

    const monitor = new ProcessMonitor(tmpDir, {
      onSessionId: (featureId) => {
        called.push(featureId);
      },
    });

    const { proc: proc1, emitEvent: emit1 } = makeFakeProcess();
    const { proc: proc2, emitEvent: emit2 } = makeFakeProcess();

    monitor.addProcess("feat-p", proc1);
    monitor.addProcess("feat-q", proc2);

    const dupId = "ses_CALLBACK_TEST";
    emit1(sessionEvent(dupId));
    emit2(sessionEvent(dupId));

    expect(called).toContain("feat-p");
    expect(called).toContain("feat-q");
  });
});

// ---------------------------------------------------------------------------
// ProcessMonitor.reconnectProcess() — session ID collision detection
// ---------------------------------------------------------------------------

describe("ProcessMonitor reconnectProcess session ID collision detection", () => {
  test("warns when reconnecting a process with a session ID already held by another agent", () => {
    const monitor = new ProcessMonitor(tmpDir, {
      onSessionId: () => {},
    });

    // Add a live process that already has a session ID
    const { proc: proc1, emitEvent: emit1 } = makeFakeProcess();
    monitor.addProcess("live-agent", proc1);
    emit1(sessionEvent("ses_SHARED_RECONNECT"));

    // Now reconnect another agent with the same session ID
    monitor.reconnectProcess("reconnected-agent", 99999, "ses_SHARED_RECONNECT");

    // The reconnected agent's activity log should have a collision warning
    const logRecon = monitor.getActivityLog("reconnected-agent").map((e) => e.text);
    const warn = logRecon.find(
      (l) =>
        l.includes("[WARN]") &&
        l.includes("ses_SHARED_RECONNECT") &&
        l.includes("live-agent")
    );
    expect(warn).toBeDefined();
  });

  test("no warning when reconnected session ID is unique", () => {
    const monitor = new ProcessMonitor(tmpDir, {});

    const { proc: proc1, emitEvent: emit1 } = makeFakeProcess();
    monitor.addProcess("agent-live", proc1);
    emit1(sessionEvent("ses_UNIQUE_A"));

    monitor.reconnectProcess("agent-recon", 99998, "ses_UNIQUE_B");

    const logRecon = monitor.getActivityLog("agent-recon").map((e) => e.text);
    const hasWarn = logRecon.some((l) => l.includes("[WARN]") && l.includes("session ID"));
    expect(hasWarn).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// launchHeadless() — unique --title flag
// ---------------------------------------------------------------------------

describe("launchHeadless --title uniqueness", () => {
  test("detectAgentType correctly identifies opencode", () => {
    // Sanity check — ensure our test infrastructure can import from launcher
    expect(detectAgentType("/usr/local/bin/opencode")).toBe("opencode");
    expect(detectAgentType("/usr/local/bin/claude")).toBe("claude");
  });

  test("--title arg includes a nonce/timestamp suffix to ensure uniqueness", async () => {
    // We can't easily call launchHeadless without a real agent binary,
    // so we test the title-generation logic directly by checking launcher.ts
    // exports a helper that produces unique titles.
    // The implementation must export `makeAgentTitle(featureId: string): string`
    // which appends a timestamp or nonce.
    const { makeAgentTitle } = await import("../src/lib/launcher");
    const title1 = makeAgentTitle("my-feature");
    // Small sleep to ensure timestamps differ
    await new Promise((r) => setTimeout(r, 2));
    const title2 = makeAgentTitle("my-feature");

    // Both start with the base prefix
    expect(title1).toMatch(/^woco: my-feature/);
    expect(title2).toMatch(/^woco: my-feature/);

    // They must be different (different timestamps/nonces)
    expect(title1).not.toBe(title2);
  });

  test("makeAgentTitle includes the featureId in the title", async () => {
    const { makeAgentTitle } = await import("../src/lib/launcher");
    const title = makeAgentTitle("auth-service");
    expect(title).toContain("auth-service");
  });
});
