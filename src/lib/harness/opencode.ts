/**
 * opencode.ts — opencode harness adapter (the reference harness).
 *
 * Reproduces the launcher's historical argv byte for byte:
 *   launch: run --format json --agent NAME --title TITLE [--dir D] [--model M] PROMPT
 *   resume: run --format json --session ID --continue [--dir D] [--model M] MSG
 * opencode's JSON stream IS the canonical event shape, so the normalizer is a
 * plain JSON.parse of each line. Verified end to end (live).
 */

import type { HarnessAdapter, HarnessCommand, HarnessEvent, HarnessLaunchRequest } from "./types";

function finish(req: HarnessLaunchRequest, args: string[]): HarnessCommand {
  if (req.passDir) args.push("--dir", req.cwd);
  if (req.model) args.push("--model", req.model);
  if (req.extraArgs?.length) args.push(...req.extraArgs);
  return { bin: req.bin, args, promptVia: "arg", stdinArgs: [], env: {} };
}

export const opencodeHarness: HarnessAdapter = {
  id: "opencode",
  defaultBin: "opencode",
  capabilities: {
    agentSelection: true,
    sessionResume: true,
    modelFlag: true,
    providerFlag: false,
    jsonStream: true,
    usage: true,
    cost: true,
  },
  buildLaunch(req) {
    const args = ["run", "--format", "json", "--agent", req.agentName ?? "generalist-agent"];
    if (req.title) args.push("--title", req.title);
    return finish(req, args);
  },
  buildResume(req) {
    return finish(req, ["run", "--format", "json", "--session", req.sessionId ?? "", "--continue"]);
  },
  createNormalizer() {
    return (line: string): HarnessEvent[] => {
      const trimmed = line.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === "object" ? [parsed as HarnessEvent] : [];
      } catch {
        return [];
      }
    };
  },
};
