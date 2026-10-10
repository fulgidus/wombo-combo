/**
 * monitor-late-callbacks.test.ts — ProcessMonitor must not fire exit/error
 * callbacks for processes that were removed (remove/killAll) or replaced by a
 * newer process for the same featureId.
 *
 * Uses real short-lived child processes (sh / sleep) so the exit/error events
 * are emitted by Node's child_process machinery, not faked.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, type ChildProcess } from "node:child_process";

import { ProcessMonitor, type MonitorCallbacks } from "../src/lib/monitor";

let tmpDir: string;
let calls: { kind: "complete" | "error"; featureId: string; arg?: string }[];
let callbacks: MonitorCallbacks;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wombo-test-late-cb-"));
  calls = [];
  callbacks = {
    onComplete: (featureId) => calls.push({ kind: "complete", featureId }),
    onError: (featureId, error) => calls.push({ kind: "error", featureId, arg: error }),
  };
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

/** Resolves once the child has emitted "exit" (listener attached synchronously). */
function waitExit(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => child.once("exit", () => resolve()));
}

/** Resolves on the child's "error" event or after a short grace period. */
function waitErrorOrTimeout(child: ChildProcess, ms = 300): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    child.once("error", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

describe("ProcessMonitor late callbacks", () => {
  test("remove() suppresses exit callbacks from the killed child", async () => {
    const monitor = new ProcessMonitor(tmpDir, callbacks);
    const child = spawn("sleep", ["5"]);
    const exited = waitExit(child);

    monitor.addProcess("feat-remove", child);
    monitor.remove("feat-remove");
    await exited;

    expect(calls).toEqual([]);
    expect(monitor.isRunning("feat-remove")).toBe(false);
  });

  test("killAll() suppresses exit callbacks from every killed child", async () => {
    const monitor = new ProcessMonitor(tmpDir, callbacks);
    const a = spawn("sleep", ["5"]);
    const b = spawn("sleep", ["5"]);
    const exitedA = waitExit(a);
    const exitedB = waitExit(b);

    monitor.addProcess("feat-a", a);
    monitor.addProcess("feat-b", b);
    monitor.killAll();
    await Promise.all([exitedA, exitedB]);

    expect(calls).toEqual([]);
    expect(monitor.activeCount()).toBe(0);
  });

  test("remove() suppresses error callbacks for a child that failed to spawn", async () => {
    const monitor = new ProcessMonitor(tmpDir, callbacks);
    const child = spawn("/nonexistent/wombo-test-binary", []);
    const errored = waitErrorOrTimeout(child);

    monitor.addProcess("feat-spawn-remove", child);
    monitor.remove("feat-spawn-remove");
    await errored;

    expect(calls).toEqual([]);
  });

  test("a replaced process only triggers callbacks for the new one", async () => {
    const monitor = new ProcessMonitor(tmpDir, callbacks);

    const oldChild = spawn("sleep", ["5"]);
    const exitedOld = waitExit(oldChild);
    monitor.addProcess("feat-retry", oldChild);

    // Retry: a new process replaces the entry for the same featureId.
    // Runs long enough that the replaced child's exit is observed first.
    const newChild = spawn("sh", ["-c", "sleep 0.3; echo retry-failed >&2; exit 3"]);
    const exitedNew = waitExit(newChild);
    monitor.addProcess("feat-retry", newChild);

    // Kill the replaced process; its exit must not fire anything.
    oldChild.kill("SIGTERM");
    await exitedOld;
    expect(calls).toEqual([]);

    // The new process's exit fires exactly one callback, for the new process.
    await exitedNew;
    expect(calls.length).toBe(1);
    expect(calls[0].kind).toBe("error");
    expect(calls[0].featureId).toBe("feat-retry");
    expect(calls[0].arg).toContain("retry-failed");
  });

  test("normal successful exit still calls onComplete", async () => {
    const monitor = new ProcessMonitor(tmpDir, callbacks);
    const child = spawn("sh", ["-c", "exit 0"]);
    const exited = waitExit(child);

    monitor.addProcess("feat-ok", child);
    await exited;

    expect(calls).toEqual([{ kind: "complete", featureId: "feat-ok" }]);
  });

  test("normal non-zero exit still calls onError with stderr", async () => {
    const monitor = new ProcessMonitor(tmpDir, callbacks);
    const child = spawn("sh", ["-c", "echo kaboom >&2; exit 2"]);
    const exited = waitExit(child);

    monitor.addProcess("feat-fail", child);
    await exited;

    expect(calls.length).toBe(1);
    expect(calls[0].kind).toBe("error");
    expect(calls[0].featureId).toBe("feat-fail");
    expect(calls[0].arg).toContain("kaboom");
  });

  test("spawn error (not removed) still calls onError", async () => {
    const monitor = new ProcessMonitor(tmpDir, callbacks);
    const child = spawn("/nonexistent/wombo-test-binary", []);
    const errored = waitErrorOrTimeout(child);

    monitor.addProcess("feat-spawn-err", child);
    await errored;
    // Let the monitor's own error listener run (it is attached before ours).
    await new Promise((r) => setTimeout(r, 20));

    expect(calls.length).toBe(1);
    expect(calls[0]).toMatchObject({ kind: "error", featureId: "feat-spawn-err" });
  });
});
