i18n-full architecture:

- Engine: src/lib/i18n.ts (i18next instance via createInstance, no React). Shared by TUI and CLI.
- React binding: src/ink/i18n.ts exposes I18nContext, useI18n(), t, getLocaleT, createI18n.
  TUI roots (run-tui-app.tsx, run-daemon-monitor.tsx) provide a locale-bound t via context.
- Locale files: src/locales/<locale>/<namespace>.json. Namespaces: common, tui, tui-wizards,
  tui-browsers, tui-overlays, tui-onboarding, cli-quest-tasks, cli-runtime, cli-observability,
  cli-meta. Keys are flat-dot-notation and globally unique; lookup uses fallbackNS across
  all namespaces, so callers never write a namespace prefix.
- Plurals use i18next suffixes (_one, _other) with a { count } variable.
- Interpolation uses {{var}} with escaping disabled.
- Locale resolution: config tui.locale (default "auto") then LC_ALL, LC_MESSAGES, LANG, then "en".
  Unsupported locales fall back to "en".
- Non-translatable surfaces: JSON/TOON output, IDs, enum values, file paths, citty descriptions and
  flag help, `woco describe` output, shell completion scripts, agent-authored text and logs.
- Dependency: i18next is added deliberately (quest requirement). Keep the lockfile committed.
- Keep English text byte-identical during extraction so existing tests and e2e assertions stay valid.
- After every code change run `graphify update .`; the CI knowledge-graph check fails on staleness.
- Every task must run `bun run typecheck` and `bun run build` before committing.
