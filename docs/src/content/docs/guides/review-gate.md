---
title: Review gate
description: An optional reviewer agent that checks each task diff against your coding standards and the task spec before merge.
---

The review gate is an optional stage between verification and merge in the
daemon. A reviewer agent reads the task's diff and reports findings. Findings
are posted as task comments. Blocking findings send the implementing agent back
to fix them, for a bounded number of rounds. It is **off by default**.

## What is reviewed

The reviewer never edits files, runs builds or commits. It reads the diff of the
task branch against its base and judges it on two axes:

- **Standards**: does the diff follow the documented coding standards? The
  standards are `CODING_STANDARDS.md` (if present) followed by `AGENTS.md`, both
  at the project root. Each file is cut at 20,000 characters. With neither file
  the Standards axis has nothing to check against.
- **Spec**: does the diff do what the task asked, nothing less (missing
  requirements) and nothing more (scope creep, forbidden items)? The reviewer
  sees the task description, subtasks, constraints and forbidden list, plus the
  quest goal when the task belongs to a quest.

Each finding has an axis (`standards` or `spec`), a severity (`blocking`,
`major`, `minor`, `nit`, most severe first), a file, an optional line, a message
and an optional suggested fix. An empty diff is not reviewed and passes.

## Configuration

In `.wombo-combo/config.json`:

```json
{
  "review": {
    "enabled": true,
    "blockOn": "blocking",
    "maxRounds": 2,
    "maxDiffChars": 60000
  }
}
```

| Field          | Default      | Meaning |
| -------------- | ------------ | ------- |
| `enabled`      | `false`      | Master switch. When false the stage is skipped entirely |
| `blockOn`      | `"blocking"` | Lowest severity that blocks: `blocking` (only blocking findings) or `major` (blocking and major) |
| `maxRounds`    | `2`          | Review rounds per task, an integer from 1 to 5 |
| `maxDiffChars` | `60000`      | Diff characters shown to the reviewer; the rest is cut and the prompt says so |

Invalid values are rejected when the config is validated. The generated
[config reference](../../reference/config/) lists every field.

## Routing: operation `review`

The reviewer is launched through the harness layer like any other agent, with
the operation `review`. Give it its own profile with
`routing.byOperation.review`, for example a different model than the one that
wrote the code:

```json
{
  "routing": {
    "byOperation": { "review": "claude-work" }
  }
}
```

Without a `review` route, the usual precedence applies (the task's
`agent_profile`, then difficulty and weight routes, then `routing.default`, then
the legacy route). Fallback chains work as for other operations. See the
[harnesses guide](../harnesses/).

## Findings as task comments

Every finding is posted as a comment on the task, authored by `reviewer`, in the
form `severity axis file:line message`. They land in
`.wombo-combo/comments/task/<task-id>/`, so they are committed with the rest of
the project state and visible in the TUI task browser. See the
[comments guide](../comments/).

## Retry rounds

1. The task passes verification (build and tests).
2. The task shows as `in_review` and the reviewer runs (round 1).
3. If no finding is at or above `blockOn`, the task continues to merge.
4. Otherwise, and while `round < maxRounds`, the implementing agent is sent back
   with the blocking findings (and any suggested fixes) as its retry message.
   When it finishes, the task is verified again and reviewed again.
5. If blocking findings remain after `maxRounds`, the task fails with
   `Review blocked after N round(s)`, a summary comment is posted, and its
   downstream tasks are cancelled.

Non-blocking findings are comments only; they never send the agent back.

## Writing CODING_STANDARDS.md

Put **judgement rules** in `CODING_STANDARDS.md`: things a reviewer can weigh
but a tool cannot decide.

- "Prefer a small deep module over many shallow helpers."
- "Error messages say what the user can do next."
- "A new public function needs a test that calls it the way a user would."

Do **not** put **mechanical rules** there: formatting, import order, unused
variables, type errors, banned imports, file naming. Enforce those in automated
checks (formatter, linter, `bun run typecheck`, tests, a pre-commit hook). A
tool catches them every time and for free, while spending reviewer attention on
them is slow, inconsistent and crowds out the findings only a reader can make.

Tips:

- Keep it short and concrete. Every rule should be checkable by reading a diff.
- Write rules as positive, specific statements with a one-line reason.
- Remove rules that a check now enforces.
- `AGENTS.md` is read too, so repo-wide conventions need not be duplicated.

## Limits

- **Diff size**: only the first `maxDiffChars` characters of the diff are shown.
  A large change is partly unreviewed, so keep tasks small or raise the limit.
- **Reviewer failures**: a reviewer harness error is retried once. If it still
  fails, the task fails (`Review failed: ...`). A single reviewer run times out
  after 10 minutes.
- **Unparseable output**: if the reviewer's answer contains no usable findings
  object, the task is **not** blocked. A warning comment is posted and the task
  continues to merge unreviewed. Malformed individual findings are dropped.
- **Advisory by design**: the reviewer is a model and can miss problems or raise
  false ones. It complements verification, it does not replace it.
- **Cost**: each round is an extra agent run per task, plus a re-verification
  after every send-back.
