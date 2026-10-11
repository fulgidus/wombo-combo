---
title: Team collaboration
description: Share one repository between several developers with git-tracked task claims and a conflict-free merge driver.
---

Several developers can run wombo-combo on the same repository. Coordination is
git-native: no server, only files under `.wombo-combo/` that you commit and
push like any other change.

## Task claims

A claim says "this developer is working on this task". Claims are plain YAML
files at `.wombo-combo/claims/<task-id>.yml` and are **tracked in git**:

```yaml
task_id: my-task
owner: alice@example.com
host: alices-laptop
claimed_at: 2026-10-11T10:00:00.000Z
expires_at: 2026-10-12T10:00:00.000Z
```

The owner is `team.owner` from the config, then `git config user.email`, then
the OS user name. Claims expire after `team.claimTtlHours` (default 24), so a
forgotten claim never blocks the team for long.

```sh
woco team claim my-task      # fails if someone else holds a live claim
woco team claim my-task --force
woco team release my-task
woco team status             # who owns what, expired claims, unclaimed tasks
woco team status -o json
```

Commit and push the claim file so teammates see it.

## Daemon behaviour

Team mode is off by default, so single-developer projects behave exactly as
before. Enable it in `.wombo-combo/config.json`:

```json
{ "team": { "enabled": true, "claimTtlHours": 24 } }
```

With team mode on, the daemon scheduler skips tasks claimed by another
developer, claims a task when its agent starts and releases it when the task
is merged or fails. Claim errors only produce a warning; they never stop a
run.

## Conflict-free merges

`.wombo-combo/tasks/_meta.yml` and `archive/_meta.yml` change on every task
update, which makes concurrent merges conflict on timestamps alone. Install the
merge driver once per clone:

```sh
woco team setup
```

This writes `merge=woco-meta` lines to `.gitattributes` (for both `_meta.yml`
files and the per-task `tasks/*.yml` and `archive/*.yml` files) and sets the
local `merge.woco-meta.driver` git config to `woco team merge-meta %O %A %B`.
Running it again changes nothing.

The driver merges `_meta.yml` by taking the newest timestamp and keeping the
union of the other fields. For task files it merges field by field when the two
sides edited different fields; list fields are combined only when both sides
purely added items. When both sides changed the same field differently, or one
side deleted what the other edited, or a file cannot be parsed, it reports a
normal git conflict and leaves the file for you to resolve.

## Recommended workflow

1. `git pull`, then `woco team status` to see what is free.
2. `woco team claim <task-id>`, commit and push the claim.
3. Work on the task; release it (or let the daemon do it) when merged.
4. Run `woco team setup` once per clone so concurrent merges stay quiet.
