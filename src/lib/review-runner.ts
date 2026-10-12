/**
 * review-runner.ts — Collect a reviewer agent's answer from its process.
 *
 * The reviewer is launched by launchReviewer() (operation "review"). This
 * module awaits its exit, bounded by a timeout, and turns the harness stream
 * into plain text for parseReviewFindings(). It never throws: spawn errors,
 * timeouts and empty failed runs come back as `{ ok: false, error }` so the
 * caller can retry or fail the task with a clear reason.
 */

import type { LaunchResult } from "./launcher";
import { canonicalizeOutput } from "./launcher";

export type ReviewerOutput =
  | { ok: true; text: string }
  | { ok: false; error: string };

export interface CollectReviewerOptions {
  timeoutMs: number;
}

/** Default wall-clock limit for one reviewer run */
export const REVIEWER_TIMEOUT_MS = 10 * 60 * 1000;

/** Concatenate the text parts of an opencode-shaped event stream; non-JSON lines are kept as-is. */
export function extractReviewText(rawOutput: string): string {
  const parts: string[] = [];
  for (const line of rawOutput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const event = JSON.parse(trimmed);
      if (event.type === "text" && event.part?.text) parts.push(event.part.text);
    } catch {
      parts.push(trimmed);
    }
  }
  return parts.join("");
}

export async function collectReviewerOutput(
  launch: LaunchResult,
  opts: CollectReviewerOptions,
): Promise<ReviewerOutput> {
  const child = launch.process;
  const chunks: Buffer[] = [];
  let stderr = "";
  child.stdout?.on("data", (c: Buffer) => chunks.push(c));
  child.stderr?.on("data", (c: Buffer) => { stderr += c.toString(); });

  const outcome = await new Promise<{ code: number; timedOut: boolean; spawnError?: string }>((resolve) => {
    let settled = false;
    const finish = (v: { code: number; timedOut: boolean; spawnError?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch { /* best effort */ }
      finish({ code: -1, timedOut: true });
    }, opts.timeoutMs);
    child.on("close", (code) => finish({ code: code ?? 1, timedOut: false }));
    child.on("error", (err) => finish({ code: 1, timedOut: false, spawnError: err.message }));
  });

  if (outcome.timedOut) return { ok: false, error: `reviewer timed out after ${Math.round(opts.timeoutMs / 1000)}s` };
  if (outcome.spawnError) return { ok: false, error: `reviewer could not start: ${outcome.spawnError}` };

  let text = "";
  try {
    text = extractReviewText(canonicalizeOutput(Buffer.concat(chunks).toString("utf-8"), launch.route));
  } catch {
    text = extractReviewText(Buffer.concat(chunks).toString("utf-8"));
  }
  if (outcome.code !== 0 && !text.trim()) {
    return { ok: false, error: `reviewer exited with code ${outcome.code}${stderr.trim() ? `: ${stderr.trim().slice(0, 500)}` : ""}` };
  }
  return { ok: true, text };
}
