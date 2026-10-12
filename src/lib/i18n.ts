/**
 * i18n.ts — Core internationalisation (i18next) shared by the CLI and the TUI.
 *
 * - Resources come from src/locales (statically imported JSON, flat dotted keys).
 * - Locale detection: config `tui.locale` > WOMBO_LOCALE > LC_ALL > LC_MESSAGES
 *   > LANG > "en". The value "auto" (config default) means "use the env".
 * - Missing keys fall back to `en`; in dev mode each miss is reported once on
 *   stderr and recorded (see getMissingKeys()).
 * - Interpolation: `{{var}}`. Plurals: `key_one` / `key_other` + `{ count }`.
 * - Machine output (-o json/toon) must use renderMsg(m, "en") / getFixedT("en").
 *
 * Usage:
 *   import { t, msg, renderMsg } from "./i18n";
 *   t("status.running")
 *   t("wave.agentCount", { count: 3 })       // "3 agents"
 *   const m = msg("cli.foo", { id: "x" });   // deferred, locale chosen at render
 */

import i18next, { type i18n as I18nInstance } from "i18next";
import { FALLBACK_LOCALE, RESOURCES, availableLocales } from "../locales";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TVars = Record<string, string | number>;
export type TFunction = (key: string, vars?: TVars) => string;

/** A deferred message: key + variables, rendered in a locale chosen later. */
export interface Msg {
  readonly i18nKey: string;
  readonly vars?: TVars;
}

export interface DetectOptions {
  /** Locale from config (`tui.locale`); "auto"/unsupported values are ignored. */
  configLocale?: string | null;
  /** Environment to read from (defaults to process.env). */
  env?: Record<string, string | undefined>;
}

export interface InitOptions extends DetectOptions {
  /** Report missing keys on stderr (also WOMBO_I18N_DEBUG=1 / WOMBO_DEV=1). */
  devMode?: boolean;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Locale codes that ship with the package (plus any added via registerLocale). */
export const AVAILABLE_LOCALES: string[] = availableLocales();

/**
 * Normalise a raw locale string ("it_IT.UTF-8", "pt-BR", "EN") to a shipped
 * locale code, or undefined when it is empty, C/POSIX or not supported.
 */
export function normalizeLocale(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const base = raw.trim().split(/[.@:]/)[0]; // strip .UTF-8, @euro, LANGUAGE-style lists
  if (!base || /^(c|posix|auto)$/i.test(base)) return undefined;
  const lower = base.toLowerCase().replace(/_/g, "-");
  if (AVAILABLE_LOCALES.includes(lower)) return lower;
  const lang = lower.split("-")[0];
  return AVAILABLE_LOCALES.includes(lang) ? lang : undefined;
}

/** Resolve the locale: config > WOMBO_LOCALE > LC_ALL > LC_MESSAGES > LANG > en. */
export function detectLocale(opts: DetectOptions = {}): string {
  const env = opts.env ?? process.env;
  const candidates = [
    opts.configLocale,
    env.WOMBO_LOCALE,
    env.LC_ALL,
    env.LC_MESSAGES,
    env.LANG,
  ];
  for (const c of candidates) {
    const found = normalizeLocale(c);
    if (found) return found;
  }
  return FALLBACK_LOCALE;
}

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------

let devReporting = false;
const missing = new Set<string>();

function onMissingKey(lngs: readonly string[], _ns: string, key: string): void {
  for (const lng of lngs) {
    const id = `${lng}:${key}`;
    if (missing.has(id)) continue;
    missing.add(id);
    if (devReporting) {
      console.error(`[i18n] missing key "${key}" for locale "${lng}"`);
    }
  }
}

function createInstance(): I18nInstance {
  const instance = i18next.createInstance();
  const resources: Record<string, { translation: Record<string, string> }> = {};
  for (const [lng, res] of Object.entries(RESOURCES)) resources[lng] = { translation: res };
  void instance.init({
    resources,
    lng: FALLBACK_LOCALE,
    fallbackLng: FALLBACK_LOCALE,
    initAsync: false,
    keySeparator: false,
    nsSeparator: false,
    defaultNS: "translation",
    interpolation: {
      escapeValue: false, // terminal output, not HTML
      // Leave unresolved placeholders visible rather than rendering "".
      missingInterpolationHandler: (_text: string, value: RegExpExecArray) => `{{${value[1].trim()}}}`,
    },
    saveMissing: true,
    missingKeyHandler: onMissingKey,
    returnNull: false,
    showSupportNotice: false,
  } as any);
  return instance;
}

const instance = createInstance();

// Default: env-only detection so t() works before any explicit init.
void instance.changeLanguage(detectLocale());

function envDev(env: Record<string, string | undefined>): boolean {
  return env.WOMBO_I18N_DEBUG === "1" || env.WOMBO_DEV === "1";
}

/**
 * (Re)initialise the active locale. Safe to call repeatedly (CLI entry, TUI
 * start). Returns the resolved locale code.
 */
export function initI18n(opts: InitOptions = {}): string {
  devReporting = !!opts.devMode || envDev(opts.env ?? process.env);
  const lng = detectLocale(opts);
  void instance.changeLanguage(lng);
  return lng;
}

/**
 * Register an extra locale at runtime (tests, embedders). Shipped locales
 * belong in src/locales instead. Missing keys fall back to en.
 */
export function registerLocale(locale: string, resource: Record<string, string>): void {
  instance.addResourceBundle(locale, "translation", resource, true, true);
  if (!AVAILABLE_LOCALES.includes(locale)) AVAILABLE_LOCALES.push(locale);
}

/** Remove a locale added with registerLocale() (never a shipped one). */
export function unregisterLocale(locale: string): void {
  if (RESOURCES[locale]) return;
  instance.removeResourceBundle(locale, "translation");
  const i = AVAILABLE_LOCALES.indexOf(locale);
  if (i >= 0) AVAILABLE_LOCALES.splice(i, 1);
  if (getLocale() === locale) setLocale(FALLBACK_LOCALE);
}

/** The currently active locale code. */
export function getLocale(): string {
  return instance.language || FALLBACK_LOCALE;
}

/** Switch the active locale directly (unsupported codes fall back to en). */
export function setLocale(locale: string): string {
  const lng = normalizeLocale(locale) ?? FALLBACK_LOCALE;
  void instance.changeLanguage(lng);
  return lng;
}

/** Translate with the active locale. Unknown keys return the key itself. */
export const t: TFunction = (key, vars) => instance.t(key, vars as any) as string;

/** A t() fixed to one locale (unknown locales resolve to en). */
export function getFixedT(locale: string | null | undefined): TFunction {
  const lng = normalizeLocale(locale) ?? FALLBACK_LOCALE;
  const fixed = instance.getFixedT(lng);
  return (key, vars) => fixed(key, vars as any) as string;
}

/** True when `key` (or one of its plural forms) exists in the locale itself (no fallback). */
export function hasKey(locale: string, key: string): boolean {
  const res = RESOURCES[locale];
  if (!res) return false;
  return key in res || ["zero", "one", "two", "few", "many", "other"].some((f) => `${key}_${f}` in res);
}

/** Keys that were requested but missing, as "<locale>:<key>" (dev diagnostics). */
export function getMissingKeys(): string[] {
  return [...missing].sort();
}

export function clearMissingKeys(): void {
  missing.clear();
}

// ---------------------------------------------------------------------------
// Deferred messages (CLI)
// ---------------------------------------------------------------------------

/** Build a deferred message; render it with renderMsg(). */
export function msg(key: string, vars?: TVars): Msg {
  return { i18nKey: key, vars };
}

export function isMsg(v: unknown): v is Msg {
  return typeof v === "object" && v !== null && typeof (v as Msg).i18nKey === "string";
}

/**
 * Render a string or Msg. Pass `locale` to force one (machine output uses
 * "en"); omit it to use the active locale.
 */
export function renderMsg(m: string | Msg, locale?: string): string {
  if (!isMsg(m)) return m;
  return locale ? getFixedT(locale)(m.i18nKey, m.vars) : t(m.i18nKey, m.vars);
}
