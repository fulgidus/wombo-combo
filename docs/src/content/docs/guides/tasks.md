---
title: Working with tasks
description: Task lifecycle, statuses, dependencies and the task commands.
sidebar:
  order: 1
---

Tasks are the unit of work. Each task is one YAML file under
`.wombo-combo/tasks/` (tracked in git); finished tasks move to
`.wombo-combo/archive/`.

## Fields

| Field | Values |
| --- | --- |
| `status` | `backlog`, `planned`, `in_progress`, `blocked`, `in_review`, `done`, `cancelled` |
| `priority` | `critical`, `high`, `medium`, `low`, `wishlist` |
| `difficulty` | `trivial`, `easy`, `medium`, `hard`, `very_hard` |
| `effort` | ISO 8601 duration such as `PT2H` |
| `depends_on` | ids of tasks that must be done first |

A task is *ready* when it is in `backlog` and all its dependencies are done.

## Commands

```sh
woco tasks list [--status S] [--priority P] [--difficulty D] [--ready] [--include-archive]
woco tasks show <task-id>
woco tasks add <id> <title> [--description ...] [--priority P] [--difficulty D] [--effort PT1H] [--depends-on a,b]
woco tasks set-status <task-id> <status>
woco tasks set-priority <task-id> <priority>
woco tasks set-difficulty <task-id> <difficulty>
woco tasks check
woco tasks archive [task-id]
woco tasks graph [--ascii] [--mermaid] [--subtasks]
```

`tasks graph` renders the dependency graph in the terminal, flagging orphans,
dangling dependencies and cycles. `tasks archive` moves done and cancelled
tasks out of the active folder. Mutating commands accept `--dry-run`.

The `tasks` command also answers to `t` and `features`; `list` answers to `ls`.
See the [full reference](../../reference/commands/tasks/).

## Dependencies and ordering

Use `--depends-on` to express ordering. The scheduler only starts a task when
its dependencies are done, and runs independent ready tasks in parallel up to
`--max-concurrent`. Run `woco tasks check` after editing task files by hand to
catch cycles and unknown ids.
