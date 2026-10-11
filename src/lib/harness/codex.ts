/**
 * codex.ts — OpenAI Codex CLI harness adapter.
 *
 * Command: `codex exec --json --full-auto --skip-git-repo-check -C CWD
 *   [-m MODEL] [extra args] PROMPT`; resume: `codex exec resume ID --json ...`.
 * A large prompt is piped on stdin with the trailing `-` argument.
 *
 * Stream (JSONL), as documented for `codex exec --json`:
 *   {"type":"thread.started","thread_id":"..."}
 *   {"type":"item.completed","item":{"id":"item_1","type":"command_execution",
 *       "command":"...","aggregated_output":"...","exit_code":0,"status":"completed"}}
 *   {"type":"item.completed","item":{"type":"file_change","changes":[{"path":"a.ts","kind":"update"}]}}
 *   {"type":"item.completed","item":{"type":"agent_message","text":"..."}}
 *   {"type":"turn.completed","usage":{"input_tokens":..,"cached_input_tokens":..,"output_tokens":..}}
 *   {"type":"turn.failed","error":{"message":"..."}}   /   {"type":"error","message":"..."}
 *
 * Status: FIXTURE-VERIFIED ONLY (tests/fixtures/harness/codex.jsonl).
 */

import type { HarnessAdapter, HarnessCommand, HarnessLaunchRequest } from "./types";
import {
  errorEvent, parseJsonLine, stepFinishEvent, stepStartEvent, textEvent, toolEvent,
} from "./events";
import type { HarnessEvent } from "./types";

function build(req: HarnessLaunchRequest, resume: boolean): HarnessCommand {
  const args = ["exec"];
  if (resume && req.sessionId) args.push("resume", req.sessionId);
  args.push("--json", "--full-auto", "--skip-git-repo-check", "-C", req.cwd);
  if (req.model) args.push("-m", req.model);
  if (req.provider) args.push("-c", `model_provider="${req.provider}"`);
  if (req.extraArgs?.length) args.push(...req.extraArgs);
  return { bin: req.bin, args, promptVia: "arg", stdinArgs: ["-"], env: {} };
}

export const codexHarness: HarnessAdapter = {
  id: "codex",
  defaultBin: "codex",
  capabilities: {
    agentSelection: false,
    sessionResume: true,
    modelFlag: true,
    providerFlag: true,
    jsonStream: true,
    usage: true,
  },
  buildLaunch: (req) => build(req, false),
  buildResume: (req) => build(req, true),
  createNormalizer() {
    let sessionID: string | null = null;

    return (line: string): HarnessEvent[] => {
      const ev = parseJsonLine(line);
      if (!ev) return [];
      switch (ev.type) {
        case "thread.started":
          if (typeof ev.thread_id === "string") {
            sessionID = ev.thread_id;
            return [stepStartEvent(sessionID)];
          }
          return [];
        case "item.completed": {
          const item = ev.item ?? {};
          switch (item.type) {
            case "agent_message":
              return typeof item.text === "string" && item.text.trim() ? [textEvent(item.text, sessionID)] : [];
            case "command_execution": {
              const failed = item.status === "failed" || (typeof item.exit_code === "number" && item.exit_code !== 0);
              const output = typeof item.aggregated_output === "string" ? item.aggregated_output : "";
              return [
                toolEvent("bash", {
                  callID: item.id,
                  input: { command: item.command },
                  output: failed ? undefined : output,
                  error: failed ? output || `exit code ${item.exit_code}` : undefined,
                  sessionID,
                }),
              ];
            }
            case "file_change": {
              const changes = Array.isArray(item.changes) ? item.changes : [];
              return changes.map((c: any) =>
                toolEvent(c?.kind === "add" ? "write" : "edit", {
                  callID: item.id,
                  input: { filePath: c?.path },
                  output: String(c?.kind ?? ""),
                  sessionID,
                }),
              );
            }
            case "mcp_tool_call":
              return [
                toolEvent(`${item.server ?? "mcp"}_${item.tool ?? "call"}`, {
                  callID: item.id,
                  input: item.arguments,
                  sessionID,
                }),
              ];
            default:
              return [];
          }
        }
        case "turn.completed": {
          const u = ev.usage ?? {};
          return [
            stepFinishEvent(
              {
                input: u.input_tokens,
                output: u.output_tokens,
                reasoning: u.reasoning_output_tokens,
                cacheRead: u.cached_input_tokens,
              },
              { sessionID },
            ),
          ];
        }
        case "turn.failed":
          return [errorEvent(String(ev.error?.message ?? "codex turn failed"), sessionID)];
        case "error":
          return [errorEvent(String(ev.message ?? "codex error"), sessionID)];
        default:
          return [];
      }
    };
  },
};
