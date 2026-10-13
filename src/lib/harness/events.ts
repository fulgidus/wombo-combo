/**
 * events.ts — Helpers for building canonical (opencode-shaped) events from
 * other CLIs' streams, shared by the claude-code, codex, pi and custom adapters.
 */

import type { HarnessEvent } from "./types";
import { detectUsageLimit, type UsageLimitInfo } from "./usage-limit";

export interface StepTokens {
  input?: number;
  output?: number;
  reasoning?: number;
  cacheRead?: number;
  cacheWrite?: number;
}

/** Parse one JSON object line; null for blanks, garbage and non-objects. */
export function parseJsonLine(line: string): Record<string, any> | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed[0] !== "{") return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Normalize tool input keys so monitor activity extraction recognizes them. */
export function normalizeToolInput(input: unknown): Record<string, any> {
  if (!input || typeof input !== "object") return {};
  const src = input as Record<string, any>;
  const out: Record<string, any> = { ...src };
  if (out.filePath === undefined) {
    const p = src.file_path ?? src.path ?? src.file;
    if (p !== undefined) out.filePath = p;
  }
  if (out.command === undefined && typeof src.cmd === "string") out.command = src.cmd;
  return out;
}

export function stepStartEvent(sessionID?: string | null): HarnessEvent {
  const ev: HarnessEvent = { type: "step_start" };
  if (sessionID) ev.sessionID = sessionID;
  return ev;
}

export function textEvent(text: string, sessionID?: string | null): HarnessEvent {
  const ev: HarnessEvent = { type: "text", part: { type: "text", text } };
  if (sessionID) ev.sessionID = sessionID;
  return ev;
}

export function toolEvent(
  tool: string,
  opts: {
    callID?: string;
    input?: unknown;
    output?: string;
    error?: string;
    sessionID?: string | null;
  } = {},
): HarnessEvent {
  const failed = opts.error !== undefined;
  const ev: HarnessEvent = {
    type: "tool_use",
    part: {
      type: "tool",
      tool: tool.toLowerCase(),
      callID: opts.callID,
      state: {
        status: failed ? "error" : "completed",
        input: normalizeToolInput(opts.input),
        ...(opts.output !== undefined ? { output: opts.output } : {}),
        ...(failed ? { error: opts.error } : {}),
      },
    },
  };
  if (opts.sessionID) ev.sessionID = opts.sessionID;
  return ev;
}

/** Final step: reason "stop" marks completion for the monitor; carries token usage. */
export function stepFinishEvent(
  tokens: StepTokens | null,
  opts: { sessionID?: string | null; cost?: number; reason?: string } = {},
): HarnessEvent {
  const part: NonNullable<HarnessEvent["part"]> = { type: "step-finish", reason: opts.reason ?? "stop" };
  if (tokens) {
    const input = tokens.input ?? 0;
    const output = tokens.output ?? 0;
    const reasoning = tokens.reasoning ?? 0;
    const cacheRead = tokens.cacheRead ?? 0;
    const cacheWrite = tokens.cacheWrite ?? 0;
    part.tokens = {
      total: input + output + reasoning,
      input,
      output,
      reasoning,
      cache: { read: cacheRead, write: cacheWrite },
    };
  }
  if (opts.cost !== undefined) part.cost = opts.cost;
  const ev: HarnessEvent = { type: "step_finish", part };
  if (opts.sessionID) ev.sessionID = opts.sessionID;
  return ev;
}

export function errorEvent(
  message: string,
  sessionID?: string | null,
  opts: { usageLimit?: UsageLimitInfo | null } = {},
): HarnessEvent {
  const usageLimit = opts.usageLimit !== undefined ? opts.usageLimit : detectUsageLimit(message);
  const ev: HarnessEvent = {
    type: "error",
    error: {
      message,
      ...(usageLimit ? { usageLimit } : {}),
    },
  };
  if (sessionID) ev.sessionID = sessionID;
  return ev;
}

/** Stringify tool result content (string or array of {text}) */
export function resultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (c && typeof c === "object" && typeof (c as any).text === "string" ? (c as any).text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}
