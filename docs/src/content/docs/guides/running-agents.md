---
title: Running agents
description: Launch waves, use the daemon and TUI, handle failures, and merge.
sidebar:
  order: 3
---

## Launch

```sh
woco launch --dry-run --all-ready      # always preview first
woco launch --all-ready
woco launch --tasks add-login,fix-nav --max-concurrent 2 --model <provider/model>
woco launch --quest my-quest --all-ready
```

Selection: `--all-ready`, `--tasks`, `--top-priority N`, `--quickest-wins N`,
filtered by `--priority` and `--difficulty`. Other useful flags: `--base-branch`,
`--max-retries`, `--agent` (a specific agent definition), `--browser`
(browser-based verification) and `--auto-push` (push after all merges).

## Daemon and TUI

Agents are run by a background daemon that schedules ready tasks as a
continuous pipeline. The CLI and the terminal UI talk to it over a local
WebSocket.

```sh
woco daemon start [--port N] [--verbose]
woco daemon status
woco daemon stop
```

Running `woco` with no arguments opens the TUI: a dashboard with live status,
a task browser, logs and an ESC menu. `launch` and `resume` open it by default;
pass `--no-tui` for plain console output.

## Monitoring and recovery

```sh
woco status                 # current wave
woco logs <feature-id>      # pretty-print an agent's log
woco abort <feature-id>     # kill one agent, mark it failed
woco retry <feature-id>     # re-queue a failed agent (--model, --dry-run)
woco resume                 # resume a stopped wave
woco history                # past wave results
woco usage                  # token usage statistics
```

## Verification

After an agent reports completion, the build command from `config.json` runs in
its worktree. If `tdd.enabled` is true, the configured test command runs too, and
with `tdd.strictMode` the agent must also add corresponding tests. Pre-existing
failures are handled by [quest test baselines](../tdd-baseline/). Failed
verification triggers a retry, up to `--max-retries`.

`maxRetries` (default `defaults.maxRetries`) is the number of restarts an agent
gets after an abnormal exit: a crash, a hang or a failed verification. A normal
exit is never restarted, and review send-backs, merges and conflict resolution
do not use the budget. The count is persisted, so it survives a daemon restart.
When the budget is used up the agent ends as `failed`; `woco retry` queues it
again. Agents whose process has died are reaped, and findings from verification
are passed to the next attempt even across restarts.

## Merge

```sh
woco merge --dry-run
woco merge                      # all verified agents
woco merge --tasks a,b
```

Merging brings each verified task branch into its destination branch (the quest
branch for quest tasks), handles conflicts, marks tasks done and then runs
post-merge publication once: an idempotent `CHANGELOG.md` entry and, with
`postMerge.prMode` set to `open` or `draft`, a GitHub pull request through the
`gh` CLI. See the `postMerge` section of the
[configuration reference](../../reference/config/).

## Cleanup

`woco cleanup` removes worktrees, session state and logs (it stops the daemon
first). Use `--dry-run` to preview.
