/**
 * types.ts — Harness adapter contract.
 *
 * A harness adapter knows how to (1) build the command line for one CLI and
 * (2) normalize that CLI's stdout stream into the canonical wombo event shape
 * (the opencode JSON event, see OpenCodeEvent in ../monitor). Everything
 * downstream of the spawn (ProcessMonitor, TokenCollector, planner text
 * extraction) only ever sees canonical events.
 */

import type { OpenCodeEvent } from "../monitor";
import type { HarnessId, Operation } from "./ids";

/** Canonical event shape consumed by the monitor (alias of the opencode event). */
export type HarnessEvent = OpenCodeEvent;

/** Stateful per-process line normalizer: one raw stdout line in, 0..n canonical events out. */
export type Normalizer = (line: string) => HarnessEvent[];

export interface HarnessCapabilities {
  /** CLI can select a named agent definition (`--agent NAME`) */
  agentSelection: boolean;
  /** CLI can resume a previous session by id */
  sessionResume: boolean;
  /** CLI accepts a model flag */
  modelFlag: boolean;
  /** CLI accepts a provider flag/setting */
  providerFlag: boolean;
  /** stdout is a JSON event stream (vs. plain text) */
  jsonStream: boolean;
  /** stream carries token usage */
  usage: boolean;
  /** stream carries a provider-reported cost (never estimated from a price table) */
  cost: boolean;
}

/** Template for the `custom` harness (see harness/custom.ts). */
export interface CustomCommandSpec {
  /** Arguments for a fresh run. Placeholders: {prompt} {model} {provider} {cwd} {agent} {title} */
  args: string[];
  /** Arguments for a resume. Placeholders as above plus {session}. Omit = resume unsupported. */
  resumeArgs?: string[];
  /** How stdout is interpreted: raw text lines or opencode-shaped JSON lines. Default "text". */
  output?: "text" | "opencode-jsonl";
  /** Pipe the prompt on stdin when {prompt} is absent from args. Default false (prompt appended as last arg). */
  stdin?: boolean;
}

export interface HarnessLaunchRequest {
  operation: Operation;
  /** Executable to run (already resolved by the route) */
  bin: string;
  cwd: string;
  prompt: string;
  model?: string | null;
  provider?: string | null;
  /** Named agent definition (only used when the harness supports it) */
  agentName?: string;
  /** Session title (opencode) */
  title?: string;
  /** Session to resume (buildResume) */
  sessionId?: string;
  /** Extra user-configured args placed before the prompt */
  extraArgs?: string[];
  /** Custom harness command template */
  command?: CustomCommandSpec;
  /** Also pass `--dir <cwd>` (used by the built-in fake agent) */
  passDir?: boolean;
}

export interface HarnessCommand {
  bin: string;
  /** Arguments excluding the prompt (except custom templates that embed {prompt}) */
  args: string[];
  /** arg: prompt appended as the last argument; stdin: prompt is piped; embedded: already in args */
  promptVia: "arg" | "stdin" | "embedded";
  /** Appended to args when a large prompt must be piped via stdin instead of passed as an argument */
  stdinArgs: string[];
  /** Extra environment variables for the child */
  env: Record<string, string>;
}

export interface HarnessAdapter {
  id: HarnessId;
  capabilities: HarnessCapabilities;
  /** Default executable name when the profile sets no bin */
  defaultBin: string;
  buildLaunch(req: HarnessLaunchRequest): HarnessCommand;
  buildResume(req: HarnessLaunchRequest): HarnessCommand;
  /** New normalizer instance (stateful) for one process */
  createNormalizer(req?: { command?: CustomCommandSpec }): Normalizer;
}
