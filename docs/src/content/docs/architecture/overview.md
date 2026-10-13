---
title: Architecture overview
description: How the CLI, daemon, TUI and core libraries fit together.
sidebar:
  order: 1
---

wombo-combo is a Bun + TypeScript (strict, ESM-only) CLI. Source lives in `src/`.

## The pipeline

```
 tasks / quests  ->  scheduler  ->  worktree + agent  ->  monitor  ->  verify  ->  merge
 (YAML files)       (DAG, prio)     (git worktree)       (JSON events)  (build/TDD)  (+ changelog / PR)
```

1. **Definition.** Tasks and quests are YAML files under `.wombo-combo/`
   (`task-store.ts`, `quest-store.ts`). Dependencies form a DAG.
2. **Scheduling.** `daemon/scheduler.ts` picks ready tasks by priority and
   dependency readiness, within the concurrency limit.
3. **Execution.** For each task `lib/worktree.ts` creates a git worktree and
   branch, `lib/prompt.ts` builds the agent prompt (spec, constraints, file
   scopes, quest knowledge) and `lib/launcher.ts` spawns the agent headless.
4. **Monitoring.** `lib/monitor.ts` parses the agent's JSON event stream and
   detects completion and failure.
5. **Verification.** `lib/verifier.ts` runs the build in the worktree;
   `lib/tdd-verifier.ts` runs the TDD gate against the quest baseline.
   Failures feed the restart policy (see [Supervised agents](#supervised-agents)).
6. **Merge.** `lib/merger.ts` merges task, quest and base branches and handles
   conflicts; `lib/post-merge.ts` writes the changelog entry and optional PR.

## Layers

| Directory | Role |
| --- | --- |
| `src/index.ts` | Entry point: dev-mode guard, global flags, routing |
| `src/commands/` | Command implementations; `citty/` holds the citty definitions and `router.ts` |
| `src/daemon/` | Background daemon: WebSocket server, state, scheduler, per-task runner |
| `src/ink/` | React/Ink terminal UI (dashboard, task browser, ESC menu, onboarding) |
| `src/lib/` | Core logic with no UI |
| `src/templates/` | Bundled agent definitions |
| `schemas/` | JSON schemas for config, tasks and metadata |
| `scripts/` | Build script and docs generators |

## Daemon

The daemon (`daemon/daemon.ts`) is a detached process that owns the pipeline.
`daemon/state.ts` persists state atomically and broadcasts changes; the
protocol (`daemon/protocol.ts`) defines `Cmd*` messages from clients and `Evt*`
messages from the daemon. `daemon/client.ts` is the reconnecting client used by
the CLI and the TUI, and `daemon/launcher.ts` starts and stops the daemon.
`AgentRunner` is the shared execution seam for CLI and TUI launches.

## Supervised agents

Each agent is a supervised child. `daemon/agent-runner.ts` is a thin
`AgentRunner` facade that keeps the public API; the lifecycle stages live in
`daemon/runner/`:

| Module | Stage |
| --- | --- |
| `spawn-monitor.ts` | Baseline, worktree, install, prompt, spawn, and the process monitor |
| `verify-stage.ts` | Build and TDD verification |
| `merge-stage.ts` | Merge into the quest or base branch, post-merge publication |
| `conflict-resolution.ts`, `conflict-tiers.ts` | Tiered conflict resolution (including the LLM, rebase and re-run tiers) |
| `restart-policy.ts` | The single place that decides whether an agent may be restarted |
| `feedback-store.ts` | Retry feedback handed to the next attempt |
| `agent-shutdown.ts` | The child's shutdown hook |
| `routes.ts`, `quest-scope.ts` | Per-operation harness routes and quest scope helpers |

`lib/supervisor-core.ts` is a pure module with the restart tracker and the
supervised-child primitive. The model:

- **Transient restarts.** An agent is restarted only on an abnormal exit
  (crash, hang or verify failure). A normal exit never restarts. The restart
  budget is exactly `defaults.maxRetries`. `agent.retries` and
  `agent.maxRetries` stay the persisted counters and the tracker is rebuilt
  from them, so a daemon restart or a manual `woco retry` keeps the count.
  When the budget is spent the agent ends in the `failed` state. The
  `AgentStatus` values and the `Evt*`/`Cmd*` messages are unchanged.
- **Serialized merge and conflict resolution.** These mutate shared git state,
  so they run behind one merge queue and are never restarted by the policy.
  Review-gate send-backs are not restarts either.
- **Shutdown hook.** Killing the process, capturing a best-effort analytics
  diff, and removing the worktree and branch of an abandoned agent happen in
  one idempotent hook per execution. A worktree shared through a `depends_on`
  chain is kept while another live agent still uses it.
- **Durable retry feedback.** Review findings and verifier output for the next
  attempt are stored on the agent record in daemon state, so they survive
  restarts.

## Command registry

CLI commands are defined once with citty in `src/commands/citty/`. A bridge
(`lib/citty-bridge.ts`) turns those definitions into `COMMAND_REGISTRY`
(`lib/schema.ts`), which drives `woco describe`, help text, shell completion
and the [generated command reference](../../reference/commands/) on this site.

## Runtime files

Project definitions (`config.json`, `project.yml`, `tasks/`, `archive/`,
`quests/`, `wishlist.yml`) are tracked in git. Runtime artifacts (`state.json`,
`daemon-state.json`, `logs/`, `history/`, `usage.jsonl`, `baselines/`,
`analytics/`, `post-merge.json`) are gitignored.

## This documentation site

The site is an Astro + Starlight project in `docs/` with its own
`package.json`. `scripts/gen-command-docs.ts` and `scripts/gen-config-docs.ts`
write the reference pages (`bun run docs:gen`); CI fails if they are stale. A
GitHub Actions workflow builds and deploys the site to GitHub Pages when the
docs or their sources change on `main`.
