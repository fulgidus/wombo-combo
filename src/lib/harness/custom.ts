/**
 * custom.ts — Generic command harness.
 *
 * The profile supplies the whole command template:
 *   command: { args: ["--yolo", "-m", "{model}", "{prompt}"], output: "text" }
 * Placeholders: {prompt} {model} {provider} {cwd} {agent} {title} {session}.
 * An argument that contains a placeholder whose value is empty is dropped,
 * together with the flag before it when that flag is `-x`/`--xyz` shaped
 * (so `-m {model}` vanishes when there is no model).
 *
 * output "text" (default): every non-empty stdout line becomes a text event;
 * completion is decided by the exit code. output "opencode-jsonl": lines are
 * already canonical events. Sessions are not tracked unless the CLI emits
 * canonical events; resume requires `resumeArgs`.
 *
 * Status: unit-tested with a stub script; exercised end to end in
 * tests/harness-acceptance.test.ts.
 */

import type { CustomCommandSpec, HarnessAdapter, HarnessCommand, HarnessEvent, HarnessLaunchRequest } from "./types";
import { opencodeHarness } from "./opencode";
import { textEvent } from "./events";

const PLACEHOLDER = /\{(prompt|model|provider|cwd|agent|title|session)\}/g;

function expand(template: string[], values: Record<string, string>): { args: string[]; embedded: boolean } {
  const out: string[] = [];
  let embedded = false;
  for (const arg of template) {
    let empty = false;
    const replaced = arg.replace(PLACEHOLDER, (_m, key: string) => {
      if (key === "prompt") embedded = true;
      const v = values[key] ?? "";
      if (!v) empty = true;
      return v;
    });
    if (empty && arg.replace(PLACEHOLDER, "").trim() === "") {
      // Whole argument was an empty placeholder: drop it and a dangling flag
      if (out.length > 0 && /^-{1,2}[A-Za-z][\w-]*$/.test(out[out.length - 1])) out.pop();
      continue;
    }
    out.push(replaced);
  }
  return { args: out, embedded };
}

function build(req: HarnessLaunchRequest, resume: boolean): HarnessCommand {
  const spec = req.command;
  if (!spec) throw new Error("custom harness requires a profile `command` template");
  const template = resume ? spec.resumeArgs : spec.args;
  if (!template) throw new Error("custom harness has no `resumeArgs`; session resume is unsupported");
  const { args, embedded } = expand(template, {
    prompt: req.prompt,
    model: req.model ?? "",
    provider: req.provider ?? "",
    cwd: req.cwd,
    agent: req.agentName ?? "",
    title: req.title ?? "",
    session: req.sessionId ?? "",
  });
  if (req.extraArgs?.length) args.unshift(...req.extraArgs);
  const promptVia = embedded ? "embedded" : spec.stdin ? "stdin" : "arg";
  return { bin: req.bin, args, promptVia, stdinArgs: [], env: {} };
}

export const customHarness: HarnessAdapter = {
  id: "custom",
  defaultBin: "",
  capabilities: {
    agentSelection: false,
    sessionResume: false,
    modelFlag: false,
    providerFlag: false,
    jsonStream: false,
    usage: false,
    cost: false,
  },
  buildLaunch: (req) => build(req, false),
  buildResume: (req) => build(req, true),
  createNormalizer(req?: { command?: CustomCommandSpec }) {
    if (req?.command?.output === "opencode-jsonl") return opencodeHarness.createNormalizer();
    return (line: string): HarnessEvent[] => {
      const trimmed = line.trimEnd();
      return trimmed.trim() ? [textEvent(trimmed + "\n")] : [];
    };
  },
};
