/**
 * pi.ts — pi coding agent harness adapter.
 *
 * Command: `pi -p --mode json [--provider P] [--model M] [extra args] PROMPT`;
 * resume adds `--session ID`.
 *
 * Stream (JSON lines, `--mode json`):
 *   {"type":"session","id":"..."}                         header with the session id
 *   {"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":".."}],
 *       "usage":{"input":..,"output":..,"cacheRead":..,"cacheWrite":..,"cost":{"total":..}}}}
 *   {"type":"tool_execution_end","toolCallId":"..","toolName":"bash","args":{..},
 *       "result":{"content":[{"type":"text","text":".."}]},"isError":false}
 *   {"type":"agent_end"}                                   run finished
 * Unknown event types are ignored.
 *
 * Status: FIXTURE-VERIFIED ONLY (tests/fixtures/harness/pi.jsonl); the event
 * names follow pi's documented JSON mode but were not checked against a live
 * binary. Tool args are remembered from tool_execution_start when present.
 */

import type { HarnessAdapter, HarnessCommand, HarnessEvent, HarnessLaunchRequest } from "./types";
import {
  errorEvent, parseJsonLine, resultText, stepFinishEvent, stepStartEvent, textEvent, toolEvent,
} from "./events";

function build(req: HarnessLaunchRequest, resume: boolean): HarnessCommand {
  const args = ["-p", "--mode", "json"];
  if (resume && req.sessionId) args.push("--session", req.sessionId);
  if (req.provider) args.push("--provider", req.provider);
  if (req.model) args.push("--model", req.model);
  if (req.extraArgs?.length) args.push(...req.extraArgs);
  return { bin: req.bin, args, promptVia: "arg", stdinArgs: [], env: {} };
}

export const piHarness: HarnessAdapter = {
  id: "pi",
  defaultBin: "pi",
  capabilities: {
    agentSelection: false,
    sessionResume: true,
    modelFlag: true,
    providerFlag: true,
    jsonStream: true,
    usage: true,
    cost: true,
  },
  buildLaunch: (req) => build(req, false),
  buildResume: (req) => build(req, true),
  createNormalizer() {
    let sessionID: string | null = null;
    const args = new Map<string, unknown>();
    const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };

    return (line: string): HarnessEvent[] => {
      const ev = parseJsonLine(line);
      if (!ev) return [];
      switch (ev.type) {
        case "session":
          if (typeof ev.id === "string") {
            sessionID = ev.id;
            return [stepStartEvent(sessionID)];
          }
          return [];
        case "tool_execution_start":
          if (typeof ev.toolCallId === "string") args.set(ev.toolCallId, ev.args);
          return [];
        case "tool_execution_end": {
          const text = resultText(ev.result?.content ?? ev.result);
          const input = ev.args ?? args.get(ev.toolCallId);
          return [
            toolEvent(String(ev.toolName ?? "tool"), {
              callID: ev.toolCallId,
              input,
              output: ev.isError ? undefined : text,
              error: ev.isError ? text || "tool error" : undefined,
              sessionID,
            }),
          ];
        }
        case "message_end": {
          const m = ev.message ?? {};
          if (m.role !== "assistant") return [];
          const u = m.usage ?? {};
          total.input += u.input ?? 0;
          total.output += u.output ?? 0;
          total.cacheRead += u.cacheRead ?? 0;
          total.cacheWrite += u.cacheWrite ?? 0;
          total.cost += u.cost?.total ?? 0;
          const out: HarnessEvent[] = [];
          for (const b of Array.isArray(m.content) ? m.content : []) {
            if (b?.type === "text" && typeof b.text === "string" && b.text.trim()) {
              out.push(textEvent(b.text, sessionID));
            }
          }
          if (m.stopReason === "error" && m.errorMessage) out.push(errorEvent(String(m.errorMessage), sessionID));
          return out;
        }
        case "agent_end":
          return [stepFinishEvent(total, { sessionID, cost: total.cost })];
        default:
          return [];
      }
    };
  },
};
