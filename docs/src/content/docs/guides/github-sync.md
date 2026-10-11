---
title: GitHub sync
description: Keep woco tasks, quests and comments in step with GitHub Issues, by hand or automatically.
---

wombo-combo can mirror its tasks, quests and comments to GitHub Issues and
pull issue changes back, so several people can work on one project at the same
time. woco stays the primary tracker; GitHub is the visible mirror and the
fallback. The sync is idempotent (every issue carries a hidden marker, so
nothing is created twice) and conflict-safe (see [Conflicts](#conflicts)).

What is mirrored:

| woco | GitHub |
| --- | --- |
| task | issue titled `[task-id] Title`, body with description, constraints, forbidden, references and "Blocked by" |
| quest | issue labelled `spec` (goal as body) |
| comment | issue comment |
| status | open or closed (`done` closes as completed, `cancelled` as not planned) |
| priority, difficulty, quest, triage role | labels `priority:*`, `difficulty:*`, `quest:<id>`, `needs-triage` ... |

Issues that have no woco marker become `backlog` tasks named `gh-<n>-<slug>`
on the next pull.

## Manual and auto mode

**Manual** (the default): nothing talks to GitHub unless you run a command.

```sh
bun dev sync run      # one cycle: pull, then push
bun dev sync status   # read-only comparison
```

**Auto** (`sync.github.enabled: true` and `mode: "auto"`):

- every command that changes a task, quest or comment (set-status, add,
  archive, comment add/link, quest plan ...) pushes just that item in the
  background right after the write (`pushOnWrite`). The command is never
  delayed and its exit code never changes; a failed push prints one warning and
  is retried by the next cycle.
- the daemon (and `sync watch`) run a full cycle every `intervalSeconds`. The
  daemon always runs the loop and re-reads the config on every tick, so turning
  auto mode on or off needs no restart.

The explicit `sync` commands work in both modes. `enabled` only controls the
automatic behaviour.

## Authentication

The token is looked up in this order and is never printed or logged:

1. `GITHUB_TOKEN`
2. `GH_TOKEN`
3. the output of `gh auth token` (if the GitHub CLI is installed and logged in)

The token needs the `repo` scope (or, for a fine-grained token, read and write
on Issues). Without a token, sync commands fail with a clear message and auto
mode warns once. For GitHub Enterprise set `GITHUB_API_URL`, or the `host` of
the configured repo.

## Repository detection

The repo is `sync.github.repo` when set, otherwise the `origin` git remote
(https, `ssh://` and `git@host:owner/name` URLs are understood). Set it
explicitly in cloud sessions or clones without an `origin`:

```json
{ "sync": { "github": { "repo": "acme/widgets" } } }
```

## Labels

The label catalog (`needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`, `spec`, `wayfinder:*`, `priority:*`,
`difficulty:*`) and one `quest:<id>` label per quest are created
automatically: on the first push, or any time with `bun dev sync labels`
(`--dry-run` lists what is missing). Existing labels are never changed. If the
token cannot create labels, sync warns once and carries on without them.

## Commands

| Command | What it does |
| --- | --- |
| `sync push [--only <id\|quest:id>] [--dry-run]` | create or update issues and mirror comments |
| `sync pull [--dry-run]` | apply issue changes and new comments locally; posts conflict notices |
| `sync run [--dry-run]` | one cycle: pull, then push |
| `sync watch [--once] [--interval <s>]` | repeat the cycle until stopped (minimum 15 s) |
| `sync status` | per item: in-sync, local-changed, remote-changed, conflict, new ... (read-only) |
| `sync labels [--dry-run]` | ensure the label catalog exists |

All accept `-o json`. A cycle is always **pull, then push**: remote edits are
merged first so the push that follows sends the merged result. `tasks check
--mirror` is an offline consistency check (see below).

## Configuration

`sync.github` in `.wombo-combo/config.json`:

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | boolean | `false` | master switch of the automatic behaviour |
| `mode` | `"manual"` \| `"auto"` | `"manual"` | `auto` enables write-through push and the daemon cycle |
| `repo` | string \| `{ owner, name, host? }` | origin remote | repository to sync with |
| `intervalSeconds` | number | `60` | seconds between automatic cycles (minimum 15) |
| `pushOnWrite` | boolean | `true` | in auto mode, push an item right after a local change |
| `pull` | boolean | `true` | in auto mode, cycles pull before pushing |
| `includeFinished` | boolean | `false` | also mirror finished work that has no mapping yet (see below) |

Failed cycles back off exponentially (with jitter, up to 15 minutes) and
recover by themselves.

## Finished work

By default finished work is not mirrored. Push does not create issues for
tasks that are `done` or `cancelled`, or quests that are `completed` or
`abandoned`, and pull does not turn closed GitHub issues without a woco marker
into tasks. `sync status` and `tasks check --mirror` do not report such items
either. Items that already have a mapping keep syncing, so their issue still
gets closed or updated.

Set `sync.github.includeFinished` to `true` to backfill finished work in both
directions.

## Conflicts

A conflict is a field that changed on both sides since the last sync, to
different values. Sync keeps the last-synced hashes (`local_hash`,
`remote_hash`) in the mapping files and merges three-way:

- changed only locally: local value is pushed
- changed only on GitHub: the value is applied locally
- changed on both: **local wins**. Nothing is lost: the GitHub values are
  written as a system comment on the woco item, and a notice listing them is
  posted on the issue. The notice is marked so it is never imported back as a
  human comment, and it is never posted twice.

If posting the notice fails (network, rate limit), it is kept in
`.wombo-combo/sync/pending-notices.json` (gitignored) and retried by the next
cycle, up to 10 attempts.

## Multi-user behaviour

Mapping files under `.wombo-combo/sync/github/<task|quest>/<id>.yml` are
tracked in git, so teammates share the task-to-issue mapping. If a mapping is
missing (fresh clone, lost file), push looks for the marker in the repo's
issues before creating one, so two clients do not create duplicates. Each
person's edits reach the others through GitHub on the next cycle. Pull never
deletes woco data, and deleted or transferred issues are skipped.

## Checking the mirror

```sh
bun dev tasks check --mirror            # warnings, exit code unchanged
bun dev tasks check --mirror --strict   # findings become errors (exit 1)
bun dev tasks check --mirror -o json
```

Works offline (local files only) and reports tasks and quests with no mapping,
mappings whose task or quest no longer exists, comments without a GitHub id
and items that changed since the last sync.

## Troubleshooting

- **"No GitHub token found"**: set `GITHUB_TOKEN` or `GH_TOKEN`, or run
  `gh auth login`.
- **"Could not determine the GitHub repository"**: set `sync.github.repo` or
  add an `origin` remote.
- **Auto mode does nothing**: both `enabled: true` and `mode: "auto"` are
  needed; check with `bun dev sync status`.
- **403 / rate limit**: the cycle stops with a partial report and retries later
  with backoff. Raise `intervalSeconds` for large projects.
- **Labels missing**: the token may lack permission to create labels; create
  them by hand (see `docs/agents/triage-labels.md`) or run `sync labels`.
- **Unexpected state**: `sync status`, then `tasks check --mirror`. A mapping
  file can be deleted safely; the next push re-finds the issue by its marker.

## Known limits

- Auto mode hooks the CLI commands. Changes made by the daemon or agents are
  picked up by the periodic cycle, not instantly.
- **CLI and daemon race**: a CLI command and the daemon cycle in different
  processes are not serialised with each other (only inside one process). If
  both push a brand-new item in the same instant, the marker lookup before
  creation makes a duplicate issue very unlikely but not impossible; if it
  happens, close the extra issue and run `sync run`.
- A task description that contains a line equal to one of the section
  headings used in the issue body (for example `## Constraints`) is read back
  as that section.
- Wishlist items are not synced. Archived tasks and quests are only pushed when
  they already have an issue (it gets closed); they are never newly created.
- Comments are mirrored once; later edits to a comment are not propagated.
