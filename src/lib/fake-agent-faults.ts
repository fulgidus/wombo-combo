/**
 * fake-agent-faults.ts — Scriptable fault directives for the fake agent.
 *
 * Faults are scripted through the prompt, the same way FAKE_SLEEP_MS is:
 *
 *   FAKE_FAULT=crash@before-commit        exit 1 at the stage
 *   FAKE_FAULT=crash:3@after-text         exit with code 3
 *   FAKE_FAULT=crash:SIGKILL@start        self-kill with a signal
 *   FAKE_FAULT=hang@after-text            block forever, only a signal ends it
 *   FAKE_FAULT=flaky:2@before-commit      crash the first 2 attempts, then run healthy
 *   FAKE_FAULT=repeat-crash@start         crash on every attempt
 *   FAKE_FAULT=slow-shutdown:ignore       ignore SIGTERM (SIGKILL still works)
 *   FAKE_FAULT=slow-shutdown:500          delay exit by 500ms after SIGTERM
 *   FAKE_FAULT=worktree-fail              worktree creation fails (not run in the agent)
 *   FAKE_STAGES=1                         emit stage markers without any fault
 *
 * `worktree-fail` is NOT executed in the agent process: the process never
 * starts when worktree creation fails. The resilience harness (task
 * resilience-harness) injects it through a createWorktree seam by calling
 * `shouldFailWorktreeCreation(prompt)`.
 *
 * Pure apart from the injected AttemptStore (see `fileAttemptStore`).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type FaultStage = "start" | "after-text" | "before-commit" | "after-commit" | "before-finish";

export const FAULT_STAGES: readonly FaultStage[] = [
  "start",
  "after-text",
  "before-commit",
  "after-commit",
  "before-finish",
];

export type FaultSpec =
  | { kind: "crash"; stage: FaultStage; exitCode?: number; signal?: NodeJS.Signals }
  | { kind: "hang"; stage: FaultStage }
  | { kind: "flaky"; stage: FaultStage; failTimes: number }
  | { kind: "repeat-crash"; stage: FaultStage }
  | { kind: "slow-shutdown"; ignoreSigtermMs?: number; ignoreSigterm?: true }
  | { kind: "worktree-fail" };

const DIRECTIVE_RE = /FAKE_FAULT=([a-z-]+)(?::([A-Za-z0-9]+))?(?:@([a-z-]+))?/g;

function isStage(s: string | undefined): s is FaultStage {
  return FAULT_STAGES.includes(s as FaultStage);
}

/** Parse every FAKE_FAULT directive in a prompt. Malformed directives are skipped. */
export function parseFaultDirectives(prompt: string): FaultSpec[] {
  const specs: FaultSpec[] = [];
  for (const m of prompt.matchAll(DIRECTIVE_RE)) {
    const [, kind, arg, stage] = m;
    if (kind === "worktree-fail") {
      specs.push({ kind });
    } else if (kind === "slow-shutdown") {
      if (arg === "ignore") specs.push({ kind, ignoreSigterm: true });
      else if (arg && /^\d+$/.test(arg)) specs.push({ kind, ignoreSigtermMs: parseInt(arg, 10) });
    } else if (isStage(stage)) {
      if (kind === "hang" || kind === "repeat-crash") {
        specs.push({ kind, stage });
      } else if (kind === "crash") {
        if (arg && /^\d+$/.test(arg)) specs.push({ kind, stage, exitCode: parseInt(arg, 10) });
        else if (arg && /^SIG[A-Z0-9]+$/.test(arg)) specs.push({ kind, stage, signal: arg as NodeJS.Signals });
        else if (!arg) specs.push({ kind, stage });
      } else if (kind === "flaky" && arg && /^\d+$/.test(arg)) {
        specs.push({ kind, stage, failTimes: parseInt(arg, 10) });
      }
    }
  }
  return specs;
}

/** True when the prompt (or task description) scripts a worktree creation failure. */
export function shouldFailWorktreeCreation(promptOrDescription: string): boolean {
  return parseFaultDirectives(promptOrDescription).some((s) => s.kind === "worktree-fail");
}

/** Whether the runner should emit stage markers (any fault, or FAKE_STAGES=1). */
export function wantsStageMarkers(prompt: string, specs: FaultSpec[] = parseFaultDirectives(prompt)): boolean {
  return specs.length > 0 || /FAKE_STAGES=1/.test(prompt);
}

// ---------------------------------------------------------------------------
// Attempt counting (flaky)
// ---------------------------------------------------------------------------

export interface AttemptStore {
  read(): number;
  write(n: number): void;
}

/**
 * Directory holding attempt counters: FAKE_FAULT_STATE_DIR if set, else
 * `<dir>/.fake-agent`.
 */
export function faultStateDir(dir: string, env: Record<string, string | undefined> = process.env): string {
  return env.FAKE_FAULT_STATE_DIR || join(dir, ".fake-agent");
}

/** File-backed attempt counter at `<stateDir>/attempts-<taskId>.txt`. */
export function fileAttemptStore(stateDir: string, taskId: string): AttemptStore {
  const file = join(stateDir, `attempts-${taskId}.txt`);
  return {
    read() {
      try {
        const n = parseInt(readFileSync(file, "utf-8").trim(), 10);
        return Number.isFinite(n) && n > 0 ? n : 0;
      } catch {
        return 0;
      }
    },
    write(n) {
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(file, `${n}\n`);
    },
  };
}

/** Read-increment-write the counter; returns the 1-based number of this attempt. */
export function recordAttempt(store: AttemptStore): number {
  const attempt = store.read() + 1;
  store.write(attempt);
  return attempt;
}

// ---------------------------------------------------------------------------
// Checkpoint decisions
// ---------------------------------------------------------------------------

export type FaultAction =
  | { action: "crash"; exitCode: number; signal?: NodeJS.Signals }
  | { action: "hang" };

/** Decide which fault (if any) fires at `stage` for this attempt. */
export function faultAt(stage: FaultStage, specs: FaultSpec[], attempt: number): FaultAction | null {
  for (const s of specs) {
    if (!("stage" in s) || s.stage !== stage) continue;
    switch (s.kind) {
      case "crash":
        return { action: "crash", exitCode: s.exitCode ?? 1, signal: s.signal };
      case "repeat-crash":
        return { action: "crash", exitCode: 1 };
      case "flaky":
        if (attempt <= s.failTimes) return { action: "crash", exitCode: 1 };
        break;
      case "hang":
        return { action: "hang" };
    }
  }
  return null;
}
