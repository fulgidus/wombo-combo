#!/usr/bin/env bun
/**
 * fake-agent-runner.ts — Built-in fake agent for orchestration testing.
 *
 * Drop-in replacement for opencode that makes a trivial file change,
 * commits it, emits the JSON events ProcessMonitor expects, and exits.
 * Zero LLM calls. Extracts FAKE_SLEEP_MS from the prompt to simulate
 * variable work durations.
 *
 * This file ships with wombo-combo and is invoked automatically when a
 * task has `agent: "fake-agent"`. The launcher detects this sentinel
 * value and spawns this script instead of the real agent binary.
 *
 * CLI interface (matches opencode):
 *   bun fake-agent-runner.ts run --format json --agent <name> --dir <path> --title <title> [--model <m>] <prompt>
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  faultAt,
  faultStateDir,
  fileAttemptStore,
  parseFaultDirectives,
  recordAttempt,
  wantsStageMarkers,
  type FaultSpec,
  type FaultStage,
} from "./fake-agent-faults";

// ---------------------------------------------------------------------------
// Parse argv (mirrors opencode's CLI interface)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { dir: string; prompt: string; agent: string; title: string } {
  let dir = ".";
  let agent = "fake-agent";
  let title = "fake";
  let prompt = "";

  let i = 0;
  if (argv[0] === "run") i = 1;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--format") { i += 2; }
    else if (arg === "--agent") { agent = argv[++i] ?? agent; i++; }
    else if (arg === "--dir") { dir = argv[++i] ?? dir; i++; }
    else if (arg === "--title") { title = argv[++i] ?? title; i++; }
    else if (arg === "--model") { i += 2; }
    else if (arg === "--session") { i += 2; }
    else if (arg === "--continue") { i++; }
    else if (!arg.startsWith("-")) { prompt = arg; i++; }
    else { i++; }
  }

  return { dir, prompt, agent, title };
}

// ---------------------------------------------------------------------------
// Extract sleep duration from prompt text
// ---------------------------------------------------------------------------

function extractSleepMs(prompt: string): number {
  const match = prompt.match(/FAKE_SLEEP_MS=(\d+)/);
  return match ? parseInt(match[1], 10) : 500;
}

// ---------------------------------------------------------------------------
// JSON event emitters (matches opencode's JSON event protocol)
// ---------------------------------------------------------------------------

const sessionID = `ses_fake_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
const messageID = `msg_fake_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

function emit(event: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(event) + "\n");
}

function emitStepStart(): void {
  emit({
    type: "step_start",
    timestamp: Date.now(),
    sessionID,
    part: {
      id: `prt_fake_start_${Date.now()}`,
      sessionID,
      messageID,
      type: "step-start",
      snapshot: "fake-snapshot",
    },
  });
}

function emitText(text: string): void {
  emit({
    type: "text",
    timestamp: Date.now(),
    sessionID,
    part: {
      id: `prt_fake_text_${Date.now()}`,
      sessionID,
      messageID,
      type: "text",
      text,
      time: { start: Date.now(), end: Date.now() },
    },
  });
}

function emitStepFinish(): void {
  emit({
    type: "step_finish",
    timestamp: Date.now(),
    sessionID,
    part: {
      id: `prt_fake_finish_${Date.now()}`,
      sessionID,
      messageID,
      type: "step-finish",
      reason: "stop",
      snapshot: "fake-snapshot",
      cost: 0,
      tokens: {
        total: 0,
        input: 0,
        output: 0,
        reasoning: 0,
        cache: { read: 0, write: 0 },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Fault checkpoints (see fake-agent-faults.ts)
// ---------------------------------------------------------------------------

/** Block until a signal ends the process: a loopback listener keeps the loop alive, no timers. */
function blockForever(): Promise<never> {
  Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  return new Promise<never>(() => {});
}

function installSlowShutdown(specs: FaultSpec[]): void {
  for (const s of specs) {
    if (s.kind !== "slow-shutdown") continue;
    process.on("SIGTERM", () => {
      emitText("[fake-agent] sigterm-received");
      if (s.ignoreSigterm) return;
      setTimeout(() => process.exit(143), s.ignoreSigtermMs ?? 0);
    });
  }
}

function makeCheckpoint(prompt: string, specs: FaultSpec[], attempt: number) {
  const markers = wantsStageMarkers(prompt, specs);
  return async (stage: FaultStage): Promise<void> => {
    if (markers) emitText(`[fake-agent] stage:${stage}`);
    const fault = faultAt(stage, specs, attempt);
    if (!fault) return;
    if (fault.action === "hang") return blockForever();
    if (fault.signal) {
      process.kill(process.pid, fault.signal);
      await blockForever();
    }
    process.exit(fault.exitCode);
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sleepMs = extractSleepMs(args.prompt);
  const taskId = args.title.replace(/^woco:\s*/, "").trim() || "unknown";

  const specs = parseFaultDirectives(args.prompt);
  const attempt = specs.some((s) => s.kind === "flaky")
    ? recordAttempt(fileAttemptStore(faultStateDir(args.dir), taskId))
    : 0;
  installSlowShutdown(specs);
  const checkpoint = makeCheckpoint(args.prompt, specs, attempt);

  await checkpoint("start");
  emitStepStart();
  emitText(`[fake-agent] Task: ${taskId} | sleep: ${sleepMs}ms | dir: ${args.dir}`);
  await checkpoint("after-text");

  // Simulate work
  await Bun.sleep(sleepMs);

  // Make a trivial file change in the worktree
  const markerDir = join(args.dir, ".fake-agent");
  if (!existsSync(markerDir)) {
    mkdirSync(markerDir, { recursive: true });
  }

  const markerFile = join(markerDir, `${taskId}.txt`);
  writeFileSync(
    markerFile,
    [
      `fake-agent marker`,
      `task:      ${taskId}`,
      `agent:     ${args.agent}`,
      `timestamp: ${new Date().toISOString()}`,
      `sleep_ms:  ${sleepMs}`,
      "",
    ].join("\n")
  );

  await checkpoint("before-commit");

  // Git add + commit in the worktree
  try {
    execSync("git add -A", { cwd: args.dir, stdio: "pipe" });
    execSync(
      `git commit -m "fake-agent: ${taskId}" --allow-empty-message --no-verify`,
      { cwd: args.dir, stdio: "pipe" }
    );
    emitText(`[fake-agent] Committed changes for ${taskId}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[fake-agent] git commit warning: ${msg}\n`);
  }

  await checkpoint("after-commit");
  await checkpoint("before-finish");

  emitStepFinish();
  process.exit(0);
}

main();
