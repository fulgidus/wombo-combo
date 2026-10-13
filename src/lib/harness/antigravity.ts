/**
 * antigravity.ts — Google Antigravity CLI (`agy`) harness adapter.
 *
 * Command: `agy --output-format stream-json --mode accept-edits [--model M]
 *   [extra args] --print PROMPT`; resume adds `--conversation ID`. The prompt
 * is the value of `--print`, so it is the last argument. Shell tools need
 * approval in accept-edits mode; add `--dangerously-skip-permissions` to the
 * profile args if you want unattended shell access (wombo does not).
 * Models come from `agy models` (see harness/models.ts).
 *
 * Stream (JSONL), verified against agy 1.3.2 (tests/fixtures/harness/antigravity.jsonl):
 *   {"event":"init","conversation_id":"..","init":{"model":"..","cwd":"..","tools":[..]}}
 *   {"event":"step_update","step_update":{"step_type":"tool","state":"ACTIVE"|"DONE",
 *       "tool_name":"view_file","tool_info":{"parameters":{..},"output":".."}}}
 *   {"event":"step_update","step_update":{"step_type":"agent_response","state":"ACTIVE"|"DONE",
 *       "text_delta":"..","usage":{..}}}
 *   {"event":"result","result":{"status":"SUCCESS","response":"..","usage":{"input_tokens":..,
 *       "output_tokens":..,"thinking_tokens":..,"cache_read_tokens":..}}}
 * Works without a TTY (stdin closed, stdout piped). Failure states other than
 * SUCCESS and tool states other than ACTIVE/DONE are treated as errors.
 */

import type { HarnessAdapter, HarnessCommand, HarnessEvent, HarnessLaunchRequest } from "./types";
import {
  errorEvent, parseJsonLine, stepFinishEvent, stepStartEvent, textEvent, toolEvent,
} from "./events";

/** agy tool names mapped to the canonical wombo tool names. */
const TOOL_NAMES: Record<string, string> = {
  run_command: "bash",
  write_to_file: "write",
  replace_file_content: "edit",
  multi_replace_file_content: "edit",
  sed_file: "edit",
  view_file: "read",
  list_dir: "list",
  find_by_name: "glob",
  grep_search: "grep",
};

function build(req: HarnessLaunchRequest, resume: boolean): HarnessCommand {
  const args = ["--output-format", "stream-json", "--mode", "accept-edits"];
  if (resume && req.sessionId) args.push("--conversation", req.sessionId);
  if (req.model) args.push("--model", req.model);
  if (req.extraArgs?.length) args.push(...req.extraArgs);
  args.push("--print"); // the prompt is appended as its value
  return { bin: req.bin, args, promptVia: "arg", stdinArgs: [], env: {} };
}

/** agy parameter names mapped onto the keys the monitor reads. */
function toolInput(params: Record<string, any> | undefined): Record<string, any> {
  const p = params ?? {};
  return {
    ...p,
    filePath: p.AbsolutePath ?? p.TargetFile ?? p.SearchPath ?? p.DirectoryPath,
    command: p.CommandLine ?? p.Command,
  };
}

export const antigravityHarness: HarnessAdapter = {
  id: "antigravity",
  defaultBin: "agy",
  capabilities: {
    agentSelection: false,
    sessionResume: true,
    modelFlag: true,
    providerFlag: false,
    jsonStream: true,
    usage: true,
    cost: false,
  },
  buildLaunch: (req) => build(req, false),
  buildResume: (req) => build(req, true),
  createNormalizer() {
    let sessionID: string | null = null;
    let text = "";

    const flushText = (): HarnessEvent[] => {
      const out = text.trim() ? [textEvent(text.trim(), sessionID)] : [];
      text = "";
      return out;
    };

    return (line: string): HarnessEvent[] => {
      const ev = parseJsonLine(line);
      if (!ev) return [];
      switch (ev.event) {
        case "init":
          if (typeof ev.conversation_id === "string") sessionID = ev.conversation_id;
          return [stepStartEvent(sessionID)];
        case "step_update": {
          const s = ev.step_update ?? {};
          if (s.step_type === "agent_response") {
            if (typeof s.text_delta === "string") text += s.text_delta;
            return s.state === "DONE" ? flushText() : [];
          }
          if (s.step_type === "tool" && s.state !== "ACTIVE") {
            const name = String(s.tool_name ?? "tool");
            const info = s.tool_info ?? {};
            const failed = s.state !== "DONE";
            const output = typeof info.output === "string" ? info.output : "";
            return [
              ...flushText(),
              toolEvent(TOOL_NAMES[name] ?? name, {
                callID: s.step_index !== undefined ? `step-${s.step_index}` : undefined,
                input: toolInput(info.parameters),
                output: failed ? undefined : output,
                error: failed ? output || `tool ${name} ${String(s.state).toLowerCase()}` : undefined,
                sessionID,
              }),
            ];
          }
          return [];
        }
        case "result": {
          const r = ev.result ?? {};
          if (typeof r.conversation_id === "string") sessionID = r.conversation_id;
          const out = flushText();
          if (r.status !== "SUCCESS") {
            return [...out, errorEvent(String(r.response || `antigravity run ${String(r.status ?? "failed")}`), sessionID)];
          }
          const u = r.usage ?? {};
          return [
            ...out,
            stepFinishEvent(
              {
                input: u.input_tokens,
                output: u.output_tokens,
                reasoning: u.thinking_tokens,
                cacheRead: u.cache_read_tokens,
              },
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
