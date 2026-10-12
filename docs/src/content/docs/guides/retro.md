---
title: Retro
description: Turn failure signals from past agent runs into concrete improvements to the agents' environment.
---

`woco retro` looks at what went wrong in earlier agent executions and suggests
changes to the environment the agents work in: steering files, checks,
standards, tools and documentation. It is offline and deterministic: it only
reads files already in `.wombo-combo/`, makes no network calls and spawns no
agent. The same files always give the same report.

```sh
bun dev retro                       # everything collected so far
bun dev retro --task my-task        # one task
bun dev retro --quest my-quest      # one quest
bun dev retro --since 7d            # the last 7 days
bun dev retro --since 14d --save    # also write the report to retros/
bun dev retro -o json               # machine-readable (also: toon)
```

Flags can be combined. `--since` takes a number of days, with or without the
`d` suffix (`7d` or `7`).

## What is collected

| Source | Location | Signals |
| --- | --- | --- |
| Analytics snapshots | `analytics/` | outcome, merge outcome, retry count, build attempts and passes |
| Replays | `replays/<task-id>/<execution-id>.jsonl` | tool errors, reads before the first edit, very large tool outputs, failing build/test/lint commands, repeated failing commands, retry reasons |
| Eval reports | `evals/<wave-id>.json` | steering violations (tasks sharing files), routing mismatches |
| Comments | `comments/` | reviewer findings, blockers reported on tasks and quests |

A missing source is skipped, never an error: a project without replays still
gets suggestions from analytics and comments. With no signals at all, the
command says so and writes nothing.

## Categories

Each suggestion belongs to one of the six improvement categories of the retro
skill. They are printed in this order.

| Category | Question it answers | Typical signal |
| --- | --- | --- |
| `navigation` | Could the agent find its way? | many reads before the first edit, reads of paths that do not exist |
| `automated-checks` | Could a machine have caught it earlier? | failing build, test or lint runs, failed verification attempts |
| `coding-standards` | Was a convention left implicit? | reviewer findings in comments |
| `steering-files` | Did the instructions steer the agent wrongly? | failed or repeatedly retried executions, tasks sharing files |
| `tool-economy` | Did tools waste the agent's context or turns? | very large tool outputs, the same command failing again and again |
| `information-access` | Did the agent lack information or access? | blockers in comments, permission or network errors |

## Severity thresholds

Suggestions are sorted by severity (high, medium, low), then by category order,
then by id. Thresholds are named constants in `src/lib/retro.ts`.

| Constant | Value | Meaning |
| --- | --- | --- |
| `NAV_READS_THRESHOLD` | 15 | Read/Grep/Glob calls before the first edit that count as a navigation problem |
| `LARGE_OUTPUT_CHARS` | 6000 | tool output size that counts as very large |
| `REPEATED_FAILURE_THRESHOLD` | 3 | times one command must fail within an execution to count as repeated |
| `RETRY_THRESHOLD` | 2 | retries at which an execution counts as retry-heavy |
| `MEDIUM_EXECUTIONS` | 2 | distinct executions affected for `medium` |
| `HIGH_EXECUTIONS` | 3 | distinct executions affected for `high` |
| `MAX_EVIDENCE` | 5 | evidence entries kept per suggestion |

Severity grows with how widespread a pattern is: one execution is `low`, two
are `medium`, three or more are `high`. Two patterns are raised on purpose:
a *failed* execution makes `retries-and-failures` at least `medium` (`high`
from two troubled executions), and a blocker reported in a comment makes
`blocked-on-information` at least `medium` (`high` from two executions).

## Example

```text
2 improvement candidates (scope: all), most severe first:

Automated checks (automated-checks)

  [high] Agents hit failing build, test or lint runs
    Suggested change: Run the failing check earlier: add it to a pre-commit hook or the agent's per-commit routine, and turn the recurring failure into a deterministic lint rule if it is mechanical.
    Evidence:
      - cache-ttl/exec-1: bun run typecheck: error TS2345: Argument of type 'string' ...
      - sync-retry/exec-4: bun run typecheck: error TS2345: Argument of type 'string' ...
      - quest-ui/exec-2: bun run typecheck: error TS2322: Type 'null' is not ...

Navigation (navigation)

  [medium] Agents explore a lot before their first edit
    Suggested change: Add a navigation pointer from AGENTS.md to the doc or directory that explains where this work lives (most read: src/lib/sync/pull.ts), because 2 agent(s) spent up to 23 Read/Grep/Glob calls before editing.
```

Every suggestion carries a stable id (`<category>:<pattern>`, for example
`tool-economy:large-outputs` in `-o json`), a concrete suggestion and up to five
pieces of evidence naming the task, the execution and a short quote. Open the
replay of an evidence entry to see the full context.

## Saving retros

`--save` writes the report to
`.wombo-combo/retros/<YYYY-MM-DD>-<scope>.md`. The scope part is `all` when
unscoped, otherwise built from the flags, for example `my-task`,
`quest-my-quest` or `7d`. Saved retros are Markdown, always in English whatever
the active locale, and are git-tracked so the team can see the history. Running
again the same day with the same scope overwrites the file.

## Acting on a retro

A retro is a list of candidates, not orders. Work through it like this:

1. Check the evidence. A single `low` suggestion may be noise; a `high` one with
   evidence from several tasks is a real pattern.
2. Fix the cause in the environment, not in the task. Prefer the most
   deterministic place that can hold the rule.
3. Re-run the retro after a few more executions to see whether the pattern is
   gone.

### Moving a rule out of AGENTS.md

Instructions in `AGENTS.md` are the weakest enforcement: they cost context on
every run and agents can still miss them. When a retro shows an agent breaking a
rule that is written down, promote the rule:

- **Mechanical and checkable** (a banned API, an import shape, a file location,
  a missing test): move it into a **check**, such as a lint rule, a CI step, a
  pre-commit hook or the TDD gate. A check fails loudly and needs no prose.
  Delete the line from `AGENTS.md` once the check exists.
- **A judgement call** (naming, structure, when to abstract): move it into a
  **coding standard** read by the reviewer, for example a
  `CODING_STANDARDS.md`, so it is applied at review and does not bloat the
  steering file.
- **Orientation** (where things live, how to run the build): keep it in
  `AGENTS.md`, but as a short pointer to the relevant doc.
- **Instruction that changed nothing** (`steering-files` suggestions): remove it.
  Less steering is easier to follow.

The suggestions already point this way: `automated-checks` and mechanical
`coding-standards` findings usually end up as checks, judgement calls as
standards, and `navigation` findings as pointers in `AGENTS.md`.
