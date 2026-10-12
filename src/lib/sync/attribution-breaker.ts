/**
 * attribution-breaker.ts — State of the sync attribution circuit breaker.
 *
 * Push re-reads what it wrote. When the stored text carries AI attribution
 * although the text sent was clean, something on the network path (a proxy, an
 * integration) appends footers. Push then stops all further writes, records
 * the trip here, and `sync status` warns until a later push writes cleanly.
 * Runtime state: untracked (gitignored) `.wombo-combo/sync/attribution-breaker.json`.
 * Local files only, never network; read/write never throw.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { WOMBO_DIR } from "../../config";

export interface AttributionTrip {
  /** ISO timestamp of the trip */
  trippedAt: string;
  /** Item ref (task id or `quest:<id>`) whose write was altered */
  ref: string;
  /** GitHub issue number the altered text lives on */
  issue?: number;
  /** GitHub comment id, when the altered text is a comment */
  comment?: number;
}

/** Thrown inside push to unwind to the circuit breaker; carries what to record. */
export class AttributionTripped extends Error {
  constructor(readonly trip: AttributionTrip) {
    super(
      `GitHub added AI attribution to ${trip.comment ? `a comment on issue #${trip.issue}` : `issue #${trip.issue}`} ` +
        `although the text sent was clean; writes stopped. Run sync from a machine whose network path does not append footers.`,
    );
    this.name = "AttributionTripped";
  }
}

export function attributionBreakerPath(projectRoot: string): string {
  return join(projectRoot, WOMBO_DIR, "sync", "attribution-breaker.json");
}

export function readAttributionTrip(projectRoot: string): AttributionTrip | null {
  try {
    const path = attributionBreakerPath(projectRoot);
    if (!existsSync(path)) return null;
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    if (!raw || typeof raw.trippedAt !== "string" || typeof raw.ref !== "string") return null;
    return {
      trippedAt: raw.trippedAt,
      ref: raw.ref,
      ...(Number.isInteger(raw.issue) ? { issue: raw.issue } : {}),
      ...(Number.isInteger(raw.comment) ? { comment: raw.comment } : {}),
    };
  } catch {
    return null;
  }
}

export function writeAttributionTrip(projectRoot: string, trip: AttributionTrip): void {
  const path = attributionBreakerPath(projectRoot);
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    writeFileSync(tmp, JSON.stringify(trip, null, 2) + "\n", "utf-8");
    renameSync(tmp, path);
  } catch {
    // best effort: the push report still carries the trip
  }
}

export function clearAttributionTrip(projectRoot: string): void {
  try {
    const path = attributionBreakerPath(projectRoot);
    if (existsSync(path)) unlinkSync(path);
  } catch {
    // best effort
  }
}
