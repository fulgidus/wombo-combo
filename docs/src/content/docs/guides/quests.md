---
title: Quests
description: Group tasks into a scoped mission with its own branch, constraints and knowledge.
sidebar:
  order: 2
---

A quest is a scoped mission with a goal, its own set of tasks, a dedicated
branch and a knowledge file shared with every agent working on it. Quests live
in `.wombo-combo/quests/<id>.yml` with notes in
`.wombo-combo/quests/<id>/knowledge.md`.

## Lifecycle

```sh
woco quest create my-quest "My quest" --goal "What done looks like"
woco quest plan my-quest --dry-run   # preview the planner's task breakdown
woco quest plan my-quest             # let the planner agent create the tasks
woco quest activate my-quest         # creates the quest branch, status -> active
woco launch --quest my-quest --all-ready
woco quest complete my-quest         # merges the quest branch into its base branch
```

Other transitions: `quest pause`, `quest abandon` (no merge), and
`quest archive` for completed or abandoned quests. `quest list` and
`quest show <id>` inspect them.

`quest create` also takes `--priority`, `--difficulty`, `--hitl`
(`yolo`, `cautious` or `supervised`) and `--agent`.

## Planning

`quest plan` runs a planner agent that decomposes the goal into a dependency
graph of tasks. The plan is validated before anything is written: unique
kebab-case ids, valid priorities and difficulties, no dependency cycles and no
unknown dependencies.. Put decisions and file
ownership in `knowledge.md` so planner and implementer agents see them.

### Planning every unplanned quest

`woco quest plan-all` plans every quest that has no tasks (active or archived)
and is not completed or abandoned. Quests that already have tasks are skipped
and reported. Each quest runs through the normal quest planner, so planner
routing, model, tokens and provider-reported cost apply.

```sh
woco quest plan-all --dry-run        # list what would be planned
woco quest plan-all --concurrency 3  # default is 2
woco quest plan-all --model <model>
```

On the CLI valid plans are applied as they finish. In the TUI press `l` on the
quest picker: one progress screen shows each quest with tokens and cost plus a
running total, and `Esc` aborts every planner. When they finish, `→` reviews
the proposals one quest at a time, `a` approves every valid plan at once, and
`←` leaves without applying anything.

For a whole project, `woco genesis` decomposes a project vision into quests.

## Branches

Quest branches fork from the quest's base branch. Task branches fork from the
quest branch and merge back into it, and `quest complete` merges the quest
branch into the base branch.

## Constraints

A quest can add or ban constraints and override settings for all its tasks;
tasks add their own `constraints`, `forbidden` and `references`. These are
injected into the agent prompt.

## TDD

Quests can run with TDD verification; see [Quest test baselines](../tdd-baseline/).
