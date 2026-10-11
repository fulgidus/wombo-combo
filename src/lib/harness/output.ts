/**
 * output.ts — Convert a harness's raw stdout into canonical NDJSON so the
 * existing opencode-shaped text extractors work for every harness.
 */

import type { HarnessAdapter, CustomCommandSpec } from "./types";

/**
 * Run raw stdout through the adapter's normalizer. For the opencode adapter
 * the result is semantically identical to the input (non-JSON lines dropped).
 */
export function normalizeOutput(
  raw: string,
  adapter: HarnessAdapter,
  req?: { command?: CustomCommandSpec },
): string {
  const normalize = adapter.createNormalizer(req);
  const out: string[] = [];
  for (const line of raw.split("\n")) {
    for (const event of normalize(line)) out.push(JSON.stringify(event));
  }
  return out.join("\n");
}
