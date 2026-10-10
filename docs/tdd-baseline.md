# Quest test baselines

A quest with TDD enabled may already have failing tests on its base branch.
Without a baseline, every verification of its tasks would fail on those
pre-existing failures. The baseline records which tests were already failing
before the quest's first agent ran, so verification can distinguish
**regressions introduced by a task** from **failures that were already there**.

Relevant modules: `src/lib/test-baseline.ts` (storage, comparison),
`src/lib/test-baseline-capture.ts` (capture, reuse), `src/lib/test-runner.ts`
(output parsing), `src/lib/tdd-verifier.ts` and `src/lib/verifier.ts`
(verification). Acceptance tests: `tests/tdd-baseline-integration.test.ts`.

## What is recorded

For each quest, the snapshot holds the base branch (`quest.baseBranch`) pinned
to a commit SHA, the effective test command and timeout, the exit status, the
pass/fail/skip counts, and the per-test outcomes parsed from the output.

## Location

```
<canonical project root>/.wombo-combo/baselines/<quest-id>/tests.json
```

The canonical project root is the main repository, so a linked worktree reads
and writes the same file. `.wombo-combo/baselines/` is gitignored.

## Supported test output

Per-test identity is only available for Bun's output. The parser recognizes
Bun's plain and TTY output, and the `::group::` / `##[group]` wrapping used
under GitHub Actions (the latter is covered by parser unit tests in
`tests/test-runner.test.ts`, not by the end-to-end tests).

Other runners are not parsed. Their results are marked non-comparable, which
means:

- **With no baseline** (unquested task, or quest with TDD disabled): the usual
  rule applies, the test command must exit 0.
- **With a baseline**: a run that exits 0 and lists no failures is accepted
  with a warning ("test output not parseable"). Any other run is not
  comparable and blocks.

## Lifecycle

- **Captured once per quest, before the first real agent.** The daemon
  captures the snapshot in `doLaunch`, before the agent's worktree is created.
  Fake agents (the test sentinel) skip this step.
- **Captured from the base branch, not the checkout.** Capture runs in a
  temporary detached worktree at the pinned commit. Uncommitted changes in the
  user's checkout are never part of the baseline, and the checkout is not
  touched. The temporary worktree and directory are removed afterwards.
- **Reused on every later launch.** Retries and daemon restarts read the
  existing snapshot without running tests, even when the base branch has
  advanced since capture.
- **Never silently regenerated.** Saving refuses to overwrite an existing
  snapshot. Corrupt or incompatible snapshots, and a changed
  `tdd.testCommand`, raise an error that names the file. To recapture,
  delete the file. The next launch then captures it again from the current
  base branch.
- **Verification never recaptures.** For quest tasks with TDD enabled,
  verification loads the snapshot and blocks the task if it is missing,
  corrupt or incompatible. It never captures from the task's branch.

## Comparison rules

Failures are compared by test identity (`<file> > <suite> > <name>`), not by
aggregate counts.

- **Unchanged failures** are accepted. Duplicate names are counted: a baseline
  with two failures of the same id accepts at most two. Extra occurrences are
  new failures.
- **New failures** (a failure id not in the baseline, or more occurrences than
  the baseline had) block with verdict `regression`. The summary names each one
  as `NEW FAILURE: <id>`.
- **Lost passes** block, but only when both the baseline and the current run
  list passing tests individually (see the limitation below).
- **Baseline failures that now pass** are accepted. They are reported as
  `fixed` only when passing tests are listed.
- **Baseline failures that are now skipped or todo** are accepted and reported
  as "now skipped". They are not counted as fixed.
- **Baseline failures that are absent from the run** are accepted and reported
  as "no longer reported". They are not counted as fixed.

Aggregate counts never accept or block a run. A drop in the total number of
tests produces a `fewer tests ran` warning only.

## Fail-closed behavior

The verdict is `not-comparable`, which blocks, when any of these hold:

- the run did not complete: timeout, signal, buffer overflow, or command not
  found;
- the output is not a recognized format, or the summary, counts or per-test
  lines are missing or inconsistent;
- a test file failed to load, or an error escaped a test (`load-error`);
- the test command differs from the one recorded in the baseline.

Capture also refuses to persist a snapshot from an incomplete run, or from a
failing run whose failures cannot be identified. The launch then fails with
"Test baseline unavailable".

## Non-quest fallback

- **Unquested tasks** do not use a baseline. Verification uses the global
  config, and when `tdd.enabled` is true the test command must exit 0.
- **Quests with TDD disabled** do not capture or use a baseline. Verification
  runs with the quest's effective config, where TDD is disabled, so the test
  TDD step is skipped, because verification sees TDD disabled.

## Known limitation: passing tests are not always listed

Bun lists failing tests individually in the output we capture. Listing of
passing tests is not reliable: the parser tracks it per run (`passesListed`),
and the code treats it as unavailable when it is absent. In this repository's
testing, neither a piped run nor a pseudo-terminal run listed passing tests.
The GitHub Actions case could not be reproduced here.

Without listed passes:

- a passing test that becomes **skipped** cannot be tied to a test identity,
  so it only produces a `more skipped test(s) than in the baseline` warning
  and does not block;
- a passing test that is **removed** produces only the `fewer tests ran`
  warning and does not block;
- a baseline failure that **now passes** is reported as "no longer reported",
  not as fixed;
- a passing test that starts **failing** is still a regression, because failures
  are always listed.

Regressions that turn a passing test into a failure are always detected.
Skipped and removed passing tests block only when passes are listed; otherwise
they are surfaced as warnings.
