/**
 * i18n.ts — Minimal i18n skeleton for the Ink TUI.
 *
 * Provides a typed key-value string lookup with {{var}} interpolation.
 * No external library — just a thin wrapper so we can swap in i18next later.
 *
 * Usage:
 *   // Globally bound to the active locale (reads tui.locale from config)
 *   import { t } from "./i18n";
 *   t("status.running")           // → "Running"
 *   t("wave.agentCount", { count: 3 }) // → "3 agent(s)"
 *
 *   // Custom strings map (useful for tests or alternative locales)
 *   const myT = createI18n({ "hello": "Hello, {{name}}!" });
 *   myT("hello", { name: "World" }) // → "Hello, World!"
 *
 *   // React context hook
 *   const t = useI18n();
 */

import { createContext, useContext } from "react";
import { EN_STRINGS } from "./strings/en";

// Re-export for consumers that want direct access to the strings map.
export { EN_STRINGS } from "./strings/en";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type StringsMap = Record<string, string>;
export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

// ---------------------------------------------------------------------------
// Locale registry
// ---------------------------------------------------------------------------

/** All shipped locale string maps, keyed by locale identifier. */
const LOCALE_STRINGS: Record<string, StringsMap> = {
  en: EN_STRINGS,
};

// ---------------------------------------------------------------------------
// createI18n() — factory for a t() bound to a strings map
// ---------------------------------------------------------------------------

/**
 * Create a `t()` function bound to the given strings map.
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
// Default t() — bound to English ('en')
// ---------------------------------------------------------------------------

/**
 * Default `t()` helper, bound to the English string map.
 *
 * In a full multi-locale setup this would be replaced by a locale-aware
 * instance read from `WomboConfig.tui.locale`. For now 'en' is the only
 * shipped locale, so this is the canonical export.
 */
export const t: TFunction = createI18n(EN_STRINGS);

/**
 * Get a t() function for the given locale identifier.
 * Falls back to English for unknown locales.
 */
export function getLocaleT(locale: string): TFunction {
  const strings = LOCALE_STRINGS[locale] ?? EN_STRINGS;
  return createI18n(strings);
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
