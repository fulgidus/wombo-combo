---
title: Your first task
description: Initialize a project, add a task and run an agent on it.
sidebar:
  order: 2
---

This walkthrough takes a git repository from nothing to a merged task.

## 1. Initialize the project

From the root of a git repository:

```sh
woco init
```

`init` auto-detects project settings and creates `.wombo-combo/config.json`
plus the `tasks/` and `archive/` folder stores. Every option is documented in the
[configuration reference](../../reference/config/). Commit the generated files:
task definitions are part of your project.

## 2. Add a task

```sh
woco tasks add add-login "Add a login form" \
  --description "Email + password form with validation" \
  --priority high --difficulty medium --effort PT2H
```

A task has a kebab-case id, a title, and optional priority, difficulty, effort
(an ISO 8601 duration) and `--depends-on` ids. Inspect and validate:

```sh
woco tasks list
woco tasks show add-login
woco tasks check
```

`tasks check` validates the schema, dependencies, duplicates and cycles.

## 3. Preview, then launch

Always preview a wave first:

```sh
woco launch --dry-run --all-ready
```

`--all-ready` selects every backlog task whose dependencies are met. Other
selectors are `--tasks a,b`, `--top-priority N`, `--quickest-wins N`,
`--priority` and `--difficulty`. When the preview looks right:

```sh
woco launch --all-ready
```

Each selected task gets its own git worktree and branch and its own agent. A
terminal dashboard (TUI) shows progress; pass `--no-tui` for plain console
output. Use `woco status` from another shell to see the wave.

## 4. Verify and merge

When an agent finishes, wombo-combo runs the configured build in its worktree
(and TDD verification if `tdd.enabled` is set). Verified agents are merged with:

```sh
woco merge --dry-run
woco merge
```

Merging marks the task done and, depending on `postMerge` settings, appends a
`CHANGELOG.md` entry and can open a GitHub pull request.

## 5. Clean up

```sh
woco cleanup --dry-run
woco cleanup
```

removes worktrees, session state and logs.

## Where to go next

- [Working with tasks](../../guides/tasks/)
- [Quests](../../guides/quests/) for larger, planned pieces of work
- [Running agents](../../guides/running-agents/)
