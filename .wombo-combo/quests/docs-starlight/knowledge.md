# docs-starlight knowledge

## Decisions
- The Starlight site is its own package in `docs/` (`docs/package.json`, lockfile
  `docs/bun.lock`). The root package, its dependencies and `bun test` are untouched.
- Content lives in `docs/src/content/docs/`. Existing `docs/tdd-baseline.md` moves to
  `docs/src/content/docs/guides/tdd-baseline.md` (frontmatter added); links in
  README/AGENTS.md are updated.
- Command reference is generated from `COMMAND_REGISTRY` (`src/lib/schema.ts`) by
  `scripts/gen-command-docs.ts`; config reference is generated from
  `schemas/config.schema.json` by `scripts/gen-config-docs.ts`. Both are
  deterministic, export pure render functions (unit tested in `tests/`) and write
  into `docs/src/content/docs/reference/`. Generated files carry a "do not edit" banner.
- CI: new job in `ci.yml` regenerates the reference and runs `git diff --exit-code`.
- Deploy: `.github/workflows/docs.yml` (bun build, configure-pages,
  upload-pages-artifact, deploy-pages), all actions pinned to commit SHAs with the
  version in a comment. Astro `site` = https://fulgidus.github.io, `base` = /wombo-combo.
- Dependabot gets an npm entry for `/docs`.
- Every command/flag mentioned in prose is verified with `bun dev <cmd> --help`.
- GitHub Pages must be enabled manually (Settings -> Pages -> Source: GitHub Actions).

## File ownership
- scaffold: `docs/package.json`, `docs/bun.lock`, `docs/astro.config.mjs`, `docs/tsconfig.json`,
  `docs/src/content.config.ts`, `docs/src/content/docs/index.mdx`, tdd-baseline move,
  README/AGENTS link fixes, `.gitignore`.
- command generator: `scripts/gen-command-docs.ts`, `tests/gen-command-docs.test.ts`,
  `docs/src/content/docs/reference/commands/**`.
- config generator: `scripts/gen-config-docs.ts`, `tests/gen-config-docs.test.ts`,
  `docs/src/content/docs/reference/config.md`.
- content: `docs/src/content/docs/{getting-started,guides,architecture}/**`.
- deploy/CI: `.github/workflows/docs.yml`, `.github/workflows/ci.yml`,
  `.github/dependabot.yml`, root package.json script `docs:gen`.
