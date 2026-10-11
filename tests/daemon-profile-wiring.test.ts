/**
 * daemon-profile-wiring.test.ts — Per-task agent profile selection through the
 * daemon pipeline: submit-time routing, fallback preflight, retry/conflict
 * routes, the task agent_profile field.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { DEFAULT_CONFIG, type WomboConfig } from "../src/config";
import { createBlankTask, saveTaskToStore, loadFeatures } from "../src/lib/tasks";
import { validateTask } from "../src/lib/task-schema";
import type { Task } from "../src/lib/tasks";

class ExposedRunner extends AgentRunner {
  select(op: "code" | "conflict", id: string, task: Task | null) {
    return (this as any).selectRoute(op, id, task);
  }
  resolve(op: "code" | "conflict", id: string, task: Task | null) {
    return (this as any).resolveAgentRoute(op, id, task);
  }
  conflict(id: string, task: Task, model?: string) {
    return (this as any).conflictRoute(id, task, model);
  }
}

let dir: string;
let state: DaemonState;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "daemon-profile-wiring-"));
  mkdirSync(join(dir, ".wombo-combo", "tasks"), { recursive: true });
  state = new DaemonState(dir);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

function cfg(extra: Partial<WomboConfig> = {}): WomboConfig {
  return { ...DEFAULT_CONFIG, baseBranch: "main", portless: { ...DEFAULT_CONFIG.portless, enabled: false }, ...extra } as WomboConfig;
}

function task(id: string, over: Partial<Task> = {}): Task {
  return { ...createBlankTask(id, `Task ${id}`, ""), ...over } as Task;
}

const light = { difficulty: "trivial", effort: "PT15M", priority: "low" } as const;
const heavy = { difficulty: "very_hard", effort: "P2D", priority: "critical" } as const;

const routed = () =>
  cfg({
    agentProfiles: {
      oc: { harness: "opencode", model: "oc-model", bin: "/bin/sh" },
      cc: { harness: "claude-code", model: "sonnet", bin: "/bin/sh" },
      cx: { harness: "codex", bin: "/bin/sh" },
    } as any,
    routing: { default: "oc", byWeight: { heavy: "cc" }, byOperation: { conflict: "cx" } } as any,
  });

describe("submitTask routing", () => {
  test("records profile, harness and the profile model on the agent", () => {
    const runner = new ExposedRunner({ projectRoot: dir, config: routed() }, state);
    runner.submitTask(task("h", heavy));
    runner.submitTask(task("l", light));
    expect(state.getAgent("h")).toMatchObject({ profile: "cc", harness: "claude-code", model: "sonnet" });
    expect(state.getAgent("l")).toMatchObject({ profile: "oc", harness: "opencode", model: "oc-model" });
  });

  test("an explicit task agent_profile wins over routing", () => {
    const runner = new ExposedRunner({ projectRoot: dir, config: routed() }, state);
    runner.submitTask(task("t", { ...heavy, agent_profile: "cx" }));
    expect(state.getAgent("t")).toMatchObject({ profile: "cx", harness: "codex" });
  });

  test("legacy config: profile 'default', opencode, model from modelRouting", () => {
    const runner = new ExposedRunner(
      { projectRoot: dir, config: cfg({ modelRouting: { light: "m-light" } }) }, state,
    );
    runner.submitTask(task("l", light));
    expect(state.getAgent("l")).toMatchObject({ profile: "default", harness: "opencode", model: "m-light" });
  });

  test("an unknown agent_profile does not throw at submit; the launch will report it", () => {
    const runner = new ExposedRunner({ projectRoot: dir, config: routed() }, state);
    expect(() => runner.submitTask(task("bad", { agent_profile: "nope" }))).not.toThrow();
    expect(state.getAgent("bad")).toMatchObject({ profile: null, harness: null });
    expect(() => runner.select("code", "bad", task("bad", { agent_profile: "nope" }))).toThrow(/Unknown agent profile "nope"/);
  });
});

describe("route selection", () => {
  test("retries stay on the profile recorded on the agent", () => {
    const runner = new ExposedRunner({ projectRoot: dir, config: routed() }, state);
    runner.submitTask(task("h", heavy));
    // Even if the task's difficulty were different now, the recorded profile is forced
    const r = runner.resolve("code", "h", task("h", light));
    expect(r.profile).toBe("cc");
  });

  test("fallback chain skips an unavailable binary", () => {
    const config = cfg({
      agentProfiles: {
        a: { harness: "claude-code", bin: "/nonexistent/claude" },
        b: { harness: "opencode", bin: "/bin/sh", model: "b-model" },
      } as any,
      routing: { default: "a", fallbacks: { a: ["b"] } } as any,
    });
    const runner = new ExposedRunner({ projectRoot: dir, config }, state);
    runner.submitTask(task("t", light));
    const sel = runner.select("code", "t", task("t", light));
    expect(sel.route.profile).toBe("b");
    expect(sel.skipped[0]).toMatchObject({ profile: "a" });
    expect(sel.route.model).toBe("b-model");
  });

  test("legacy routes are not probed (a missing opencode binary still spawns and fails as before)", () => {
    const runner = new ExposedRunner(
      { projectRoot: dir, config: cfg({ agent: { ...DEFAULT_CONFIG.agent, bin: "/nonexistent/opencode" } }) }, state,
    );
    runner.submitTask(task("t", light));
    expect(runner.select("code", "t", task("t", light)).route.legacy).toBe(true);
  });

  test("conflict operation uses its own profile", () => {
    const runner = new ExposedRunner({ projectRoot: dir, config: routed() }, state);
    runner.submitTask(task("h", heavy));
    expect(runner.conflict("h", task("h", heavy))?.profile).toBe("cx");
  });

  test("conflict route falls back to undefined (legacy launch) and logs when nothing can start", () => {
    const config = cfg({
      agentProfiles: { x: { harness: "codex", bin: "/nonexistent/codex" } } as any,
      routing: { byOperation: { conflict: "x" } } as any,
    });
    const runner = new ExposedRunner({ projectRoot: dir, config }, state);
    runner.submitTask(task("t", light));
    expect(runner.conflict("t", task("t", light))).toBeUndefined();
    expect(state.getAgent("t")?.activity).toContain("conflict profile unavailable");
  });
});

describe("task agent_profile field", () => {
  test("validation: string ok, non-string is an error", () => {
    const base = { ...task("v") };
    expect(validateTask({ ...base, agent_profile: "cc" }).filter((i) => i.level === "error")).toEqual([]);
    expect(validateTask({ ...base, agent_profile: 5 }).some((i) => i.level === "error" && /agent_profile/.test(i.message))).toBe(true);
  });

  test("persists through the task store and empty values are dropped", () => {
    const config = cfg();
    saveTaskToStore(dir, config, task("with", { agent_profile: "cc" }));
    saveTaskToStore(dir, config, task("without", { agent_profile: "" as any }));
    const loaded = loadFeatures(dir, config).tasks;
    expect(loaded.find((t) => t.id === "with")?.agent_profile).toBe("cc");
    expect(loaded.find((t) => t.id === "without")?.agent_profile).toBeUndefined();
  });
});
