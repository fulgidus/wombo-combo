# i18n-full — design notes

## Library and bundling
- `i18next` pinned exactly (26.4.2). No react-i18next: the Ink tree already has
  `I18nContext` / `useI18n()`; keep them.
- Resources are JSON files imported statically (`import x from "../locales/en/tui.json"`).
  Bun (dev), `Bun.build` (dist/index.js, target node) and tsc (`resolveJsonModule`)
  all inline them, so `bun dev` and `node dist/index.js` need no fs access.
  `package.json#files` must include `src/locales/**` for the source-published package.
- Single i18next namespace (`translation`), `keySeparator: false`, `nsSeparator: false`:
  keys are FLAT dotted strings (`"status.running"`), matching the existing skeleton.
- Init is synchronous (`initAsync: false`, inline resources); `t()` is usable at import time.

## Layout
- `src/locales/<lng>/<domain>.json` — flat key/value, one file per domain to limit merge
  conflicts. Domains: `tui` (ink), `cli` (commands). New domains are added by creating the
  file per locale and registering it in `src/locales/index.ts`.
- `src/lib/i18n.ts` — core (no UI): `initI18n`, `t`, `getFixedT(lng)`, `detectLocale`,
  `AVAILABLE_LOCALES`, `msg()` / `renderMsg()` for CLI, missing-key reporting.
- `src/ink/i18n.ts` — backward-compatible facade: `t`, `createI18n`, `getLocaleT`,
  `I18nContext`, `useI18n`, `EN_STRINGS` keep working. `src/ink/strings/en.ts` is
  removed; EN_STRINGS is derived from the JSON.

## Detection
`tui.locale` (config; default `"auto"`; unsupported values fall through) >
`WOMBO_LOCALE` > `LC_ALL` > `LC_MESSAGES` > `LANG` > `en`. Values like `it_IT.UTF-8`
normalise to `it`; `C`/`POSIX` are ignored. Fallback language is always `en`.
Missing keys in a locale fall back to `en`; in dev mode (`config.devMode`,
`WOMBO_DEV`, or `WOMBO_I18N_DEBUG`) each missing key is reported once on stderr and
recorded for `getMissingKeys()`.

## Key naming
`<area>.<thing>[.<detail>]`, lowerCamel segments, dot separated. TUI areas mirror the
screen (`status.*`, `menu.*`, `dashboard.*`); CLI keys are `cli.<command>.<msg>`
(e.g. `cli.tasks.setStatus.changed`). Plurals use i18next suffixes: `key_one`,
`key_other` (+ `_zero/_two/_few/_many` where the language needs them), always called
with `{ count }`. Interpolation is `{{var}}`; `escapeValue: false` (terminal, not HTML).
Never concatenate translated fragments; one key per sentence.

## CLI and machine output
- Text mode uses the active locale. `-o json` / `-o toon` render with the `en` locale so
  message text stays stable; machine keys/fields are never translated.
- `outputMessage` / `outputError` accept `string | Msg` where `Msg = msg(key, vars)`;
  JSON/toon always resolve `Msg` in `en`, text resolves in the active locale.
- CLI locale initialised once in `src/index.ts` from config + env.

## Tests
- `tests/i18n-*.test.ts`: detection, interpolation, plural (en + it), fallback, dev reporting,
  locale switching, JSON-not-translated.
- `tests/i18n-keys.test.ts`: statically scans `src/**` for `t("literal")` / `msg("literal")`
  keys (plural base names resolved via suffixes) -> must exist in `en`; every locale has
  the same key set and placeholders as `en`.
- e2e tests assert English; default resolves to `en` when env has no matching locale.

## File ownership (per task)
- i18n-core: `src/lib/i18n.ts`, `src/locales/**` skeleton, `src/ink/i18n.ts`, `src/config.ts`, build/package.
- i18n-key-tests: `tests/i18n-keys.test.ts` only.
- i18n-tui-migrate: `src/ink/*.tsx` (not `i18n.ts`), `src/locales/en/tui.json`.
- i18n-cli-core: `src/lib/output.ts`, `src/index.ts`, `src/commands/tasks/*`, `src/commands/status.ts`, `src/locales/en/cli.json`.
- i18n-cli-commands: `src/commands/{quest,launch,merge}.ts`, wishlist command, `cli.json`.
- i18n-locale-it: `src/locales/it/**`, settings locale selector.
- i18n-docs: `docs/i18n.md`.
- i18n-sweep (orchestrator, after merging other quests): grep for remaining hard-coded strings.
