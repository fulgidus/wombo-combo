/**
 * claude-code.ts — Claude Code harness adapter.
 *
 * Command: `claude -p --output-format stream-json --verbose --permission-mode
 *   acceptEdits [--model M] [extra args] PROMPT`; resume adds `--resume ID`.
 * (`--verbose` is required by the CLI for stream-json in print mode.)
 * Unattended shell access needs extra args on the profile, for example
 * `args: ["--dangerously-skip-permissions"]` or `--allowedTools`.
 *
 * Stream (one JSON object per line), as documented for `--output-format
 * stream-json`:
 *   {"type":"system","subtype":"init","session_id":"..."}
 *   {"type":"assistant","message":{"content":[{"type":"text","text":"..."},
 *       {"type":"tool_use","id":"toolu_1","name":"Bash","input":{...}}]}}
 *   {"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"toolu_1",
 *       "content":"...","is_error":false}]}}
 *   {"type":"result","subtype":"success","is_error":false,"session_id":"...",
 *       "total_cost_usd":0.01,"usage":{"input_tokens":..,"output_tokens":..,
 *       "cache_read_input_tokens":..,"cache_creation_input_tokens":..}}
 *
 * Status: FIXTURE-VERIFIED ONLY (tests/fixtures/harness/claude-code.jsonl);
 * not verified against a live claude binary.
 *
 * Mapping: a tool_use is held until its tool_result arrives and is then emitted
 * as one canonical tool_use (completed/error). Token usage and completion come
 * from the final `result` event only (per-message usage repeats across blocks).
 */

import type { HarnessAdapter, HarnessCommand, HarnessEvent, HarnessLaunchRequest } from "./types";
import {
  errorEvent, parseJsonLine, resultText, stepFinishEvent, stepStartEvent, textEvent, toolEvent,
} from "./events";

function build(req: HarnessLaunchRequest, resume: boolean): HarnessCommand {
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits"];
  if (resume && req.sessionId) args.push("--resume", req.sessionId);
  if (req.model) args.push("--model", req.model);
  if (req.extraArgs?.length) args.push(...req.extraArgs);
  return { bin: req.bin, args, promptVia: "arg", stdinArgs: [], env: {} };
}

export const claudeCodeHarness: HarnessAdapter = {
  id: "claude-code",
  defaultBin: "claude",
  capabilities: {
    agentSelection: false,
    sessionResume: true,
    modelFlag: true,
    providerFlag: false,
    jsonStream: true,
    usage: true,
  },
  buildLaunch: (req) => build(req, false),
  buildResume: (req) => build(req, true),
  createNormalizer() {
    let sessionID: string | null = null;
    const pending = new Map<string, { name: string; input: unknown }>();

    return (line: string): HarnessEvent[] => {
      const ev = parseJsonLine(line);
      if (!ev) return [];
      const out: HarnessEvent[] = [];
      if (typeof ev.session_id === "string" && !sessionID) {
        sessionID = ev.session_id;
        out.push(stepStartEvent(sessionID));
      }

      switch (ev.type) {
        case "assistant": {
          const blocks = Array.isArray(ev.message?.content) ? ev.message.content : [];
          for (const b of blocks) {
            if (b?.type === "text" && typeof b.text === "string" && b.text.trim()) {
              out.push(textEvent(b.text, sessionID));
            } else if (b?.type === "tool_use" && typeof b.id === "string") {
              pending.set(b.id, { name: String(b.name ?? "tool"), input: b.input });
            }
          }
          break;
        }
        case "user": {
          const blocks = Array.isArray(ev.message?.content) ? ev.message.content : [];
          for (const b of blocks) {
            if (b?.type !== "tool_result") continue;
            const call = pending.get(b.tool_use_id);
            pending.delete(b.tool_use_id);
            const text = resultText(b.content);
            out.push(
              toolEvent(call?.name ?? "tool", {
                callID: b.tool_use_id,
                input: call?.input,
                output: b.is_error ? undefined : text,
                error: b.is_error ? text || "tool error" : undefined,
                sessionID,
              }),
            );
          }
          break;
        }
        case "result": {
          if (ev.is_error || (typeof ev.subtype === "string" && ev.subtype.startsWith("error"))) {
            out.push(errorEvent(String(ev.result ?? ev.subtype ?? "claude reported an error"), sessionID));
            break;
          }
          const u = ev.usage ?? {};
          out.push(
            stepFinishEvent(
              {
                input: u.input_tokens,
                output: u.output_tokens,
                cacheRead: u.cache_read_input_tokens,
                cacheWrite: u.cache_creation_input_tokens,
              },
              { sessionID, cost: typeof ev.total_cost_usd === "number" ? ev.total_cost_usd : undefined },
            ),
          );
          break;
        }
      }
      return out;
    };
  },
};
