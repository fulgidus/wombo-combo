/**
 * locales/index.ts — Registry of shipped locale resources.
 *
 * Resources are statically imported JSON (flat dotted keys, one file per
 * domain) so Bun, `Bun.build` and tsc all inline them: no runtime fs access.
 *
 * To add a locale: create src/locales/<lng>/{tui,cli}.json and register it in
 * RESOURCES below. See docs/i18n.md.
 */

import enTui from "./en/tui.json";
import enCli from "./en/cli.json";
import itTui from "./it/tui.json";
import itCli from "./it/cli.json";

export type FlatResource = Record<string, string>;

/** Merge the per-domain files of one locale into a single flat resource. */
function merge(...domains: FlatResource[]): FlatResource {
  return Object.assign({}, ...domains);
}

/** Locale code -> flat key/value resource. `en` is the source of truth. */
export const RESOURCES: Record<string, FlatResource> = {
  en: merge(enTui, enCli),
  it: merge(itTui, itCli),
};

/** Language that every other locale falls back to. */
export const FALLBACK_LOCALE = "en";

/** Locale codes that ship with the package. */
export function availableLocales(): string[] {
  return Object.keys(RESOURCES);
}
