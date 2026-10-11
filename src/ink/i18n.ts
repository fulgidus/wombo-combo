/**
 * i18n.ts — i18n facade for the Ink TUI.
 *
 * Thin, backward-compatible layer over the i18next core in src/lib/i18n.ts.
 * Existing call sites (`t("key")`, `useI18n()`, `getLocaleT()`) keep working;
 * strings live in src/locales/<lng>/*.json.
 *
 * Usage:
 *   import { t } from "./i18n";
 *   t("status.running")                  // -> "Running"
 *   t("wave.agentCount", { count: 3 })   // -> "3 agents" (plural-aware)
 *
 *   // Custom strings map (tests, ad-hoc)
 *   const myT = createI18n({ "hello": "Hello, {{name}}!" });
 *
 *   // React context hook
 *   const t = useI18n();
 */

import { createContext, useContext } from "react";
import { RESOURCES } from "../locales";
import { detectLocale, getFixedT, t as coreT, type TFunction as CoreTFunction } from "../lib/i18n";

/** English strings map (flat keys), kept for direct access and tests. */
export const EN_STRINGS: Record<string, string> = RESOURCES.en;

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type StringsMap = Record<string, string>;
export type TFunction = CoreTFunction;

// ---------------------------------------------------------------------------
// createI18n() — factory for a t() bound to a strings map
// ---------------------------------------------------------------------------

/**
 * Legacy: create a `t()` bound to an ad-hoc strings map (no plurals).
 * Shipped locales go through i18next instead — see getLocaleT().
 * Falls back to returning the key itself when no match is found.
 */
export function createI18n(strings: StringsMap): TFunction {
  return function t(key: string, vars?: Record<string, string | number>): string {
    const template = strings[key];
    if (template === undefined) return key;
    if (!vars) return template;
    return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      const val = vars[name];
      return val !== undefined ? String(val) : `{{${name}}}`;
    });
  };
}

// ---------------------------------------------------------------------------
// Default t() — bound to the active locale (see initI18n in src/lib/i18n.ts)
// ---------------------------------------------------------------------------

/** Default `t()`: follows the active locale, supports plurals and interpolation. */
export const t: TFunction = coreT;

/**
 * Get a t() fixed to `locale` (config value, "auto" or a locale code).
 * Unsupported values fall through to env detection, then English.
 */
export function getLocaleT(locale?: string): TFunction {
  return getFixedT(detectLocale({ configLocale: locale }));
}

// ---------------------------------------------------------------------------
// I18nContext and useI18n() React hook
// ---------------------------------------------------------------------------

export const I18nContext = createContext<TFunction>(t);

/**
 * Hook to access the active `t()` function from anywhere in the TUI tree.
 *
 * Returns the default English `t()` if used outside an I18nContext.Provider.
 */
export function useI18n(): TFunction {
  return useContext(I18nContext);
}
