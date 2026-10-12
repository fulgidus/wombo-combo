/**
 * planner-telemetry.ts — shared stdout stream parser for planner agents.
 *
 * Quest, genesis and errand planners all feed raw child stdout through one
 * accumulator: model, tokens in/out, provider-reported cost and latest
 * activity. Cost is never computed from a price table; it is read from the
 * provider's own stream (opencode `step_finish.part.cost`, Claude Code
 * `total_cost_usd`, both carried by the canonical event shape).
 */

import { type OpenCodeEvent, extractActivity } from "./monitor";

export interface PlannerTelemetrySnapshot {
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  /** Sum of provider-reported cost in USD; null when the provider reported none */
  cost: number | null;
  activity: string;
}

export interface PlannerTelemetry {
  /** Feed a raw stdout chunk (may split lines mid-event) */
  feed(chunk: Buffer | string): void;
  /** Process any trailing partial line */
  flush(): void;
  snapshot(): PlannerTelemetrySnapshot;
}

export interface PlannerTelemetryOptions {
  model?: string | null;
  /** Harness line normalizer (absent for plain opencode streams) */
  normalize?: (line: string) => OpenCodeEvent[];
  onUpdate?: (snapshot: PlannerTelemetrySnapshot) => void;
}

const fmtTok = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

/** One-line status text: "model · ↑in ↓out · $cost · activity" (empty parts omitted). */
export function formatPlannerTelemetry(s: PlannerTelemetrySnapshot): string {
  const parts: string[] = [];
  if (s.model) parts.push(s.model);
  if (s.tokensIn || s.tokensOut) parts.push(`↑${fmtTok(s.tokensIn)} ↓${fmtTok(s.tokensOut)}`);
  if (s.cost !== null) parts.push(`$${s.cost.toFixed(4)}`);
  if (s.activity) parts.push(s.activity);
  return parts.join(" · ");
}

export function createPlannerTelemetry(opts: PlannerTelemetryOptions): PlannerTelemetry {
  let tokensIn = 0;
  let tokensOut = 0;
  let cost: number | null = null;
  let activity = "";
  let lineBuf = "";

  const snapshot = (): PlannerTelemetrySnapshot => ({
    model: opts.model ?? null,
    tokensIn,
    tokensOut,
    cost,
    activity,
  });

  const ingest = (event: OpenCodeEvent): void => {
    if (event.type === "step_finish" && event.part) {
      tokensIn += event.part.tokens?.input ?? 0;
      tokensOut += event.part.tokens?.output ?? 0;
      if (typeof event.part.cost === "number") cost = (cost ?? 0) + event.part.cost;
    }
    const a = extractActivity(event);
    if (a) activity = a;
    opts.onUpdate?.(snapshot());
  };

  const handleLine = (line: string): void => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let events: OpenCodeEvent[];
    try {
      events = opts.normalize ? opts.normalize(trimmed) : [JSON.parse(trimmed) as OpenCodeEvent];
    } catch {
      return; // not a JSON event line
    }
    for (const e of events) ingest(e);
  };

  return {
    feed(chunk) {
      lineBuf += typeof chunk === "string" ? chunk : chunk.toString("utf-8");
      const lines = lineBuf.split("\n");
      lineBuf = lines.pop() ?? "";
      for (const l of lines) handleLine(l);
    },
    flush() {
      const rest = lineBuf;
      lineBuf = "";
      handleLine(rest);
    },
    snapshot,
  };
}
