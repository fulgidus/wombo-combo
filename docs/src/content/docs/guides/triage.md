---
title: Triage
description: Move tasks through the triage states with woco triage, and how those states map to GitHub labels.
---

Triage decides what happens to an incoming item before anyone works on it.
`sync pull` creates a task in `needs-triage` for every new GitHub issue;
`woco triage` is how it moves on from there.

## States

| State             | Meaning                                  |
| ----------------- | ---------------------------------------- |
| `needs-triage`    | A maintainer needs to evaluate the item  |
| `needs-info`      | Waiting on the reporter for more detail  |
| `ready-for-agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human` | Requires human implementation            |
| `wontfix`         | Will not be actioned                     |

A task also carries a **category**, `bug` or `enhancement`. Any state other
than `needs-triage` requires one.

State and category are stored as `triage: <state>` and `category: <category>`
lines in the task `notes`. Do not edit those lines by hand; use the command.

### Transitions

| From              | Allowed targets                                           |
| ----------------- | --------------------------------------------------------- |
| untriaged         | `needs-triage`                                            |
| `needs-triage`    | `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` |
| `needs-info`      | `needs-triage`                                            |
| `ready-for-agent` | `needs-triage`, `ready-for-human`, `wontfix`              |
| `ready-for-human` | `needs-triage`, `ready-for-agent`, `wontfix`              |
| `wontfix`         | none; `--reopen` allows `needs-triage`                    |

An invalid transition exits 1 and changes nothing. `--force` skips the table
as a maintainer override.

Moving to `wontfix` also sets the task status to `cancelled`; reopening
restores it to `backlog`.

## Commands

```sh
# The queue, grouped by bucket, oldest first
bun dev triage list

# A task with its triage state and comments
bun dev triage show my-task

# Move a task; --category is needed the first time
bun dev triage set my-task ready-for-agent --category bug \
  --comment "Reproduced on main, fix is in src/lib/foo.ts"

# Ask the reporter for more detail
bun dev triage set my-task needs-info --category bug

# Reopen a wontfix item
bun dev triage set my-task needs-triage --reopen

# Add an agent-brief comment skeleton to fill in before ready-for-agent
bun dev triage brief my-task
```

All subcommands accept `--output json|toon`. `set` and `brief` take
`--author` (default: `WOMBO_AUTHOR`, git user email, OS user).

Every transition leaves a system [comment](/guides/comments/) starting with
`Triage: <from> -> <to>`, followed by your `--comment` text if any.

## GitHub labels

The state and category are mirrored as issue labels. The label strings are the
state names themselves, plus `bug` or `enhancement` for the category; see
`docs/agents/triage-labels.md`. Create them with `bun dev sync labels` (or the
first `sync push`/`sync run`).

- **Push:** the task's state and category are written as labels on its issue.
- **Pull:** a changed state or category label on the issue is applied through
  the same triage core, so the transition table and system comment apply. If
  the core rejects the change (for example no category is known yet), the
  local value is kept and a conflict on `triage` is reported.
- **New issues:** an issue pulled for the first time becomes a task in
  `needs-triage`.

## With sync and comments

Triage is a task change like any other: with `sync.github` in `auto` mode a
`triage set` is pushed right away, and the transition comment is synced to the
issue thread with the other [comments](/guides/comments/). See
[GitHub sync](/guides/github-sync/) for modes and conflict handling.
