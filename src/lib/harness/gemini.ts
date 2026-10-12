/**
 * gemini.ts — Google Gemini CLI harness adapter.
 *
 * Command: `gemini --output-format stream-json --yolo [-m MODEL] [extra args] PROMPT`.
 * The prompt is the positional argument (or piped on stdin when large). Gemini
 * has no provider flag (always Google) and no resume flag wired here, so a
 * build-fix retry gets a fresh run.
 *
 * Stream (JSONL), as documented for `--output-format stream-json`:
 *   {"type":"init","session_id":"..","model":".."}
 *   {"type":"message","role":"assistant","content":"..","delta":true}
 *   {"type":"tool_use","tool_name":"run_shell_command","tool_id":"..","parameters":{..}}
 *   {"type":"tool_result","tool_id":"..","status":"success"|"error","output":".."}
 *   {"type":"error","severity":"warning"|"error","message":".."}
 *   {"type":"result","status":"success"|"error","stats":{"input_tokens":..,"output_tokens":..,"cached":..}}
 *
 * Status: FIXTURE-VERIFIED ONLY (tests/fixtures/harness/gemini.jsonl).
 */

import type { HarnessAdapter, HarnessCommand, HarnessEvent, HarnessLaunchRequest } from "./types";
import {
  errorEvent, parseJsonLine, stepFinishEvent, stepStartEvent, textEvent, toolEvent,
} from "./events";

/** Gemini tool names mapped to the canonical wombo tool names. */
const TOOL_NAMES: Record<string, string> = {
  run_shell_command: "bash",
  write_file: "write",
  replace: "edit",
  read_file: "read",
  read_many_files: "read",
  list_directory: "list",
  glob: "glob",
  search_file_content: "grep",
};

function build(req: HarnessLaunchRequest): HarnessCommand {
  const args = ["--output-format", "stream-json", "--yolo"];
  if (req.model) args.push("-m", req.model);
  if (req.extraArgs?.length) args.push(...req.extraArgs);
  return { bin: req.bin, args, promptVia: "arg", stdinArgs: [], env: {} };
}

export const geminiHarness: HarnessAdapter = {
  id: "gemini",
  defaultBin: "gemini",
  capabilities: {
    agentSelection: false,
    sessionResume: false,
    modelFlag: true,
    providerFlag: false,
    jsonStream: true,
    usage: true,
    cost: false,
  },
  buildLaunch: build,
  buildResume: build,
  createNormalizer() {
    let sessionID: string | null = null;
    let text = "";
    const pending = new Map<string, { tool: string; input: unknown }>();

    const flushText = (): HarnessEvent[] => {
      if (!text.trim()) {
        text = "";
        return [];
      }
      const ev = textEvent(text, sessionID);
      text = "";
      return [ev];
    };

    return (line: string): HarnessEvent[] => {
      const ev = parseJsonLine(line);
      if (!ev) return [];
      switch (ev.type) {
        case "init":
          if (typeof ev.session_id === "string") sessionID = ev.session_id;
          return [stepStartEvent(sessionID)];
        case "message":
          // Assistant text arrives as deltas; emit one text event per message run.
          if (ev.role === "assistant" && typeof ev.content === "string") text += ev.content;
          return [];
        case "tool_use": {
          const out = flushText();
          if (typeof ev.tool_id === "string") {
            pending.set(ev.tool_id, { tool: String(ev.tool_name ?? "tool"), input: ev.parameters });
          }
          return out;
        }
        case "tool_result": {
          const call = pending.get(String(ev.tool_id));
          pending.delete(String(ev.tool_id));
          const name = String(call?.tool ?? "tool");
          const failed = ev.status === "error";
          const output = typeof ev.output === "string" ? ev.output : "";
          return [
            toolEvent(TOOL_NAMES[name] ?? name, {
              callID: typeof ev.tool_id === "string" ? ev.tool_id : undefined,
              input: call?.input,
              output: failed ? undefined : output,
              error: failed ? output || String(ev.error?.message ?? "tool failed") : undefined,
              sessionID,
            }),
          ];
        }
        case "error":
          return ev.severity === "warning" ? [] : [errorEvent(String(ev.message ?? "gemini error"), sessionID)];
        case "result": {
          const out = flushText();
          if (ev.status === "error") {
            return [...out, errorEvent(String(ev.error?.message ?? "gemini run failed"), sessionID)];
          }
          const s = ev.stats ?? {};
          return [
            ...out,
            stepFinishEvent(
              { input: s.input_tokens, output: s.output_tokens, cacheRead: s.cached },
              { sessionID },
            ),
          ];
        }
        default:
          return [];
      }
    };
  },
};
