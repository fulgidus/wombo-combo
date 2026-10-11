# AGENTS.md — Instructions for AI agents working on wombo-combo

This file is for AI coding agents operating **on the wombo-combo codebase itself**.
If you are an agent **using** wombo as a tool in another project, see CONTEXT.md instead.

---

## HARD CONSTRAINTS

These are non-negotiable. Violating any of them will break the development workflow.

### 1. Always use `bun dev`, never the global binary

```
# CORRECT — runs local source directly
bun dev <command> [args...]

# WRONG — runs the globally installed (possibly stale) binary
wombo <command> [args...]
```

**Why:** wombo is dogfooded — we develop it using itself. The global binary is a
snapshot from the last release. If you use it, you're testing old code, not your
changes. `bun dev` runs `bun src/index.ts` which executes the current working tree.

**Examples:**
```sh
bun dev help
bun dev tasks list
bun dev tasks add my-feat "My Feature" --priority high
bun dev launch --dry-run --all-ready
bun dev init --force
```

### 2. Never publish manually — use the release workflow

Publishing is handled by the GitHub Actions release workflow, which runs when
the `package.json` version changes on `main`. **Never run `npm publish`
manually** — always let the workflow handle it.

To release: bump `package.json` version and push the commit to `main`. The
Release workflow sees the new version, runs typecheck/tests/build, creates the
`v<version>` tag, and publishes to GitHub Releases and npm. Pushes whose
version already has a tag release nothing.

Pushing a `v<version>` tag yourself, or running the workflow manually
(Actions → Release → Run workflow, `version` = the package.json version),
also works.

Users install via:

```sh
bun a -g wombo-combo
```

### 3. Keep bun.lock committed

The lockfile is committed for reproducible installs from GitHub. Always commit
`bun.lock` after adding/removing/updating dependencies.

### 4. Commit project artifacts, ignore runtime artifacts

Wombo-combo is dogfooded — we develop it using itself. Project definition files
under `.wombo-combo/` **are tracked in git**:

- `config.json`, `project.yml` — project configuration and profile
- `tasks/` — active tasks (one YAML file per task)
- `archive/` — completed/cancelled tasks
- `quests/`, `quest-archive/` — quest definitions and knowledge files
- `wishlist.yml` — wishlist items

**Runtime artifacts are gitignored** (ephemeral, regenerated each run):

- `state.json`, `daemon-state.json`, `daemon.pid` — wave and daemon state
- `logs/` — agent log files
- `history/` — wave history records
- `tui-session.json`, `tui-debug.log` — TUI session state and debug log
- `usage.jsonl` — token usage data
- `baselines/`, `analytics/`, `evals/`, `post-merge.json` — quest test
  baselines, agent analytics, eval scores, publication journal
- `hitl/`, `agents-cache/` — human-in-the-loop exchanges, downloaded agent
  definitions

### 5. Never silently work around bugs

When you encounter unexpected behavior, errors, or bugs in the codebase or
tooling during your work, you must either:

1. **Fix it** immediately if the fix is straightforward, or
2. **Track it** — create a task (`bun dev tasks add`) or wishlist item before
   proceeding with a workaround.

Silent workarounds are forbidden. A workaround without a tracking item means the
bug is invisible and will never be fixed.

---

## Project structure

```
wombo-combo/
  package.json              # name: wombo-combo, version in sync with git tags
  schemas/                  # JSON schemas: config, meta, task
  docs/                     # Astro + Starlight docs site (own package; pages in src/content/docs/)
  scripts/
    build.ts                # Builds dist/index.js (CLI) and dist/daemon/daemon.js
    stubs/                  # Build-time stubs (react-devtools-core)
    graphify-pre-push.py    # prek pre-push hook that refreshes the graphify graph
  src/
    index.ts                # CLI entry point: dev-mode guard, global flags, routes to citty
    config.ts               # WomboConfig type, defaults, loader and validator (config.json)
    commands/               # Command implementations (launch, merge, quest, eval, ...)
      citty/                # citty defineCommand() definitions
        router.ts           # Maps command names and aliases to citty commands
      tasks/                # `tasks` subcommands: add, list, show, set-status, check, archive, graph
    daemon/                 # Background daemon: continuous task pipeline over WebSocket
      daemon.ts             # Main daemon process and lifecycle
      agent-runner.ts       # Per-task lifecycle: launch, monitor, verify, merge, retry
      scheduler.ts          # Continuous DAG scheduler (ready tasks, priority, concurrency)
      state.ts              # Daemon state, persisted atomically and broadcast to clients
      protocol.ts           # WebSocket messages: Cmd* (client to daemon), Evt* (daemon to client)
      launcher.ts           # CLI/TUI side: ensure, start and stop the daemon
      client.ts             # WebSocket client with reconnect and typed commands
      analytics-tracker.ts  # Keeps per-execution analytics snapshots in sync with agents
    ink/                    # React/Ink terminal UI; tests colocated as *.test.tsx
      run-tui-app.tsx       # Unified TUI root: one persistent component tree per session
      chrome.tsx            # Persistent top and bottom status bars
      esc-menu.tsx          # Global ESC overlay menu
      dashboard.tsx         # Default screen: live status overview
      onboarding/           # First-run onboarding wizard
      strings/en.ts         # UI strings (i18n.ts resolves them)
    lib/                    # Core logic, no UI
      task-store.ts         # Folder-based task storage (tasks/, archive/) and legacy migration
      tasks.ts              # Task types, loading, filtering, dependency readiness
      task-schema.ts        # Task field enums, required fields, validation
      quest.ts              # Quest types and layered constraint resolution
      quest-store.ts        # Folder-based quest storage (quests/)
      quest-planner.ts      # Quest planner agent pipeline
      prompt.ts             # Agent prompt generation (spec, constraints, file scopes)
      launcher.ts           # Headless agent process spawning
      monitor.ts            # Parses agent JSON events; detects completion and failure
      worktree.ts           # Git worktree and branch lifecycle
      merger.ts             # Merges task, quest and base branches; handles conflicts
      verifier.ts           # Build verification in worktrees
      tdd-verifier.ts       # TDD gate: test run plus new-file test detection
      test-runner.ts        # Runs the configured test command and parses results
      test-baseline.ts      # Quest test baselines: storage and regression detection
      test-baseline-capture.ts  # Captures a baseline from the quest base branch
      analytics.ts          # Durable per-execution analytics snapshots
      analytics-git.ts      # Git line-change metrics for an execution
      analytics-summary.ts  # Filtering and aggregation over analytics snapshots
      merge-report.ts       # Deterministic Markdown merge reports
      changelog.ts          # Idempotent CHANGELOG.md entries for merges
      github-pr.ts          # Creates or updates GitHub PRs through the gh CLI
      post-merge.ts         # Shared post-merge pipeline (journal, changelog, PR)
      templates.ts          # Resolves bundled agent templates (src/templates/)
      schema.ts             # Command and flag registry for `woco describe`
      eval-score.ts         # Eval-style scoring of completed daemon sessions
      harness/              # Agent CLI adapters (opencode, claude-code, codex, pi, custom), routing.ts, spawn.ts; see docs/src/content/docs/guides/harnesses.md
    templates/              # Bundled agent definitions, quest.yml and _meta.yml
  tests/
    *.test.ts               # Unit tests (bun test)
    ink/                    # Ink component tests
    e2e/                    # CLI and TUI smoke tests
    helpers/                # Git repo, fake gh and daemon seed fixtures
  .github/workflows/
    ci.yml                  # Typecheck, build, unit/component and CLI/TUI e2e tests
    release.yml             # Publishes when package.json version changes on main
  graphify-out/             # Knowledge graph (graph.json, GRAPH_REPORT.md)
```

## User-facing file layout

All wombo-combo project and runtime files live under `.wombo-combo/`:

```
.wombo-combo/
  config.json             # Project configuration (tracked)
  project.yml             # Project profile: vision, stack, conventions, rules (tracked)
  wishlist.yml            # Wishlist items (tracked)
  tasks/                  # Active tasks: _meta.yml + one <task-id>.yml per task (tracked)
  archive/                # Completed/cancelled tasks: _meta.yml + <task-id>.yml (tracked)
  quests/                 # Quests: <quest-id>.yml + <quest-id>/knowledge.md (tracked)
  quest-archive/          # Finished quests: <quest-id>.yml (tracked)
  state.json              # Wave/pipeline state (gitignored)
  daemon-state.json       # Daemon state snapshot (gitignored)
  daemon.pid              # Running daemon PID (gitignored)
  logs/                   # Agent log files (gitignored)
  history/                # Run history records (gitignored; a few older records are still tracked)
  usage.jsonl             # Token usage, one JSON record per line (gitignored)
  tui-session.json        # TUI view state across sessions (gitignored)
  baselines/              # Quest test baselines: <quest-id>/tests.json (gitignored)
  analytics/              # Per-execution analytics snapshots (gitignored)
  evals/                  # Eval score reports: <wave-id>.json (gitignored)
  post-merge.json         # Post-merge journal (gitignored)
  hitl/                   # Human-in-the-loop question/answer files
  agents-cache/           # Cached agent definitions from the external registry
```

Legacy single-file `tasks.yml` and `archive.yml` are migrated into `tasks/` and
`archive/` automatically and are not used by the current code.

## Coding conventions

- **Runtime:** Bun (not Node). Use Bun APIs where available (`Bun.file()`,
  `Bun.spawn()`, etc.), fall back to Node stdlib when Bun doesn't have a
  direct equivalent.
- **Language:** TypeScript, strict mode. Run `bun run typecheck` to verify.
- **Modules:** ESM only (`"type": "module"` in package.json). Use **no file
  extensions** in relative import paths (`import { foo } from "./foo"`, not
  `"./foo.js"`). The tsconfig uses `"moduleResolution": "bundler"` which
  resolves extensionless imports to `.ts` files automatically. The `.js`
  extension convention is legacy and should not be used.
- **CLI framework:** [citty](https://github.com/unjs/citty). All command
  definitions live in `src/commands/citty/`. The router in
  `src/commands/citty/router.ts` maps command names and aliases to citty
  command definitions. Schema introspection (`woco describe`) uses the
  separate `COMMAND_REGISTRY` in `src/lib/schema.ts`.
- **YAML library:** `yaml` (v2). Use `YAML.parse()` / `YAML.stringify()`.

## Testing and verification

```sh
# Type check (no emit)
bun run typecheck

# Build (outputs to dist/)
bun run build

# Run tests
bun test

# Run any command via dev
bun dev help
bun dev tasks check
```

Tests use Bun's built-in test runner (`bun test`). Test files live in `tests/`
and use `*.test.ts` naming.

## Known quirks

- **YAML null vs empty array:** `yaml` parses `tasks:` (no items) as `null`,
  not `[]`. `loadTasks()` normalizes this: `parsed.tasks ?? parsed.features ?? null`.
- **`import.meta.dir`:** Gives the directory of the current source file in Bun.
  Used in `src/lib/tasks.ts` to resolve the bundled `_meta.yml` template, and in
  `src/lib/templates.ts` and `src/lib/launcher.ts` to locate bundled files.

## Feature backlog

The active backlog lives in the `.wombo-combo/tasks/` folder (one
`<task-id>.yml` per task, metadata in `_meta.yml`). Use `bun dev tasks list` to
see it. The task schema is in `schemas/task.schema.json` and
`src/lib/task-schema.ts`.

## Making changes

1. **Check the backlog:** `bun dev tasks list`
2. **Pick a feature/subtask:** `bun dev tasks show <id>`
3. **Mark it in-progress:** `bun dev tasks set-status <id> in_progress`
4. **Implement the change**
5. **Typecheck:** `bun run typecheck`
6. **Build:** `bun run build`
7. **Test manually:** `bun dev <relevant-command>`
8. **Mark done:** `bun dev tasks set-status <id> done`
9. **Commit** with a conventional commit message referencing the feature ID

## Version and release

- Current version is in `package.json` → `"version"` field.
- Git tags must match: tag `v0.1.0` ↔ `"version": "0.1.0"`.
- **When creating a git tag, ALWAYS update `package.json` `"version"` first,
  commit the bump, then tag that commit.** Never tag without bumping the
  version — they must stay in sync.
- The Release workflow runs on a version bump pushed to `main` (it creates the
  tag), on a `v*` tag push, or manually from the Actions tab.
- **Never run `npm publish` manually** — always let the GitHub Actions workflow
  handle publishing. Just bump, commit, push to `main`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A prek `pre-push` hook (`.pre-commit-config.yaml`, `scripts/graphify-pre-push.py`) does this automatically: if the graph is stale it commits a refresh and stops the push — just push again. Install it once per clone with `uvx prek install` (prek installs graphify into its own environment).
