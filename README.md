# wombo-combo

AI agent orchestration for parallel feature development.

## Install

```sh
# bun
bun a -g wombo-combo
# npm
npm i -g wombo-combo

# bun (from GitHub)
bun a -g github:fulgidus/wombo-combo
# npm (from GitHub)
npm i -g github:fulgidus/wombo-combo
```

## Quick start

```sh
# Initialize project (generates .wombo-combo/config.json and .wombo-combo/tasks.yml)
woco init

# Edit .wombo-combo/tasks.yml to define your features, then launch the TUI
woco
```

Running `woco` with no arguments opens the interactive TUI — a full-screen
task browser where you can evaluate tasks, select them, adjust priorities,
and launch waves of agents. When a wave is running, the TUI switches to a
live monitor showing agent status, activity logs, and build output.

You can also drive everything from the CLI:

```sh
woco launch --all-ready    # launch all tasks with met dependencies
woco status                # show wave status
woco verify                # run build verification
woco merge                 # merge verified branches
```

## Commands

| Command                               | Description                                       |
| ------------------------------------- | ------------------------------------------------- |
| `woco`                                | Open interactive TUI (default, no args needed)    |
| `woco init`                           | Generate config in the current project             |
| `woco launch`                         | Launch a wave of agents                            |
| `woco resume`                         | Resume a stopped wave                              |
| `woco status`                         | Show wave status                                   |
| `woco verify`                         | Run build verification                             |
| `woco merge`                          | Merge verified agents, then changelog / PR (--tasks, --dry-run) |
| `woco retry <id>`                     | Retry a failed agent                               |
| `woco abort <id>`                     | Kill a running agent (--requeue to return to queue)|
| `woco logs <id>`                      | View agent logs (--tail N, --follow)               |
| `woco cleanup`                        | Remove worktrees and sessions                      |
| `woco history`                        | List/view past wave results                        |
| `woco usage`                          | Show token usage statistics (`--analytics` for agent performance) |
| `woco tasks list`                     | List tasks                                         |
| `woco tasks add <id> <title>`         | Add a task                                         |
| `woco tasks set-status <id> <status>` | Update task status                                 |
| `woco tasks set-priority <id> <p>`    | Update task priority                               |
| `woco tasks check`                    | Validate tasks file                                |
| `woco tasks show <id>`               | Show task details                                  |
| `woco tasks graph`                    | Visualize dependency graph (--ascii, --mermaid)    |
| `woco upgrade`                        | Check for updates and upgrade                      |
| `woco help`                           | Show full help (also: -h, --help)                  |

Every command has a short alias (e.g. `woco l` = `woco launch`,
`woco t ls` = `woco tasks list`). Run `woco help` for the full list.

## TUI

The interactive TUI has two views:

**Task Browser** — browse all tasks organized by dependency streams.

| Key       | Action                              |
| --------- | ----------------------------------- |
| Space     | Toggle task selection               |
| S         | Toggle entire dependency stream     |
| a         | Select / deselect all               |
| +/-       | Change priority of selected task    |
| d         | Hide / show done tasks              |
| c         | Cycle max concurrency               |
| F5        | Cycle sort field                    |
| L         | Launch selected tasks as a new wave |
| q         | Quit (session is saved)             |

**Wave Monitor** — shown automatically when a wave is running.

| Key       | Action                              |
| --------- | ----------------------------------- |
| Up/Down   | Navigate agent list                 |
| Enter     | Attach to agent session / view log  |
| r         | Retry a failed agent                |
| b         | Show build log                      |
| p         | Toggle auto-scroll                  |
| q         | Quit                                |

Session state (selections, sort, concurrency) is persisted to
`.wombo-combo/tui-session.json` so you can close and reopen without
losing work.

## Token Usage Tracking

wombo-combo automatically tracks token consumption during agent runs. Every
agent step that includes token data is recorded to `.wombo-combo/usage.jsonl`
as an append-only log. Use the `usage` command (alias: `us`) to view
aggregated statistics.

```sh
woco usage                              # show total token usage
woco usage --by task                    # group by task
woco usage --by model                   # group by model
woco usage --by provider                # group by provider
woco usage --by quest                   # group by quest
woco usage --by harness                 # group by agent harness
woco usage --since 2026-01-01           # filter from date (inclusive)
woco usage --until 2026-03-01           # filter until date (inclusive)
woco usage --format json                # JSON output (default: table)
```

Token data is collected automatically when agents run via `woco launch`.
Each record includes input/output tokens, cache read/write tokens,
reasoning tokens, cost, model, provider, and harness information.

Without `--analytics`, `woco usage` keeps its token-only behavior and output
shapes. For per-execution performance metrics see
[Agent Analytics](#agent-analytics) below.

## Agent Analytics

While the daemon runs agents, wombo-combo records one snapshot per agent
**execution** (a single run of a task) under `.wombo-combo/analytics/`
(gitignored, project root only - never inside a worktree). Snapshots are written
incrementally as the execution progresses, are independent of the daemon's
session history export, and survive `woco cleanup` and daemon restarts (cleanup
only removes disposable daemon state, worktrees and logs).

```sh
woco usage --analytics                          # totals across all executions
woco usage --analytics --by task                # group by task | quest | wave | agent | model
woco usage --analytics --quest my-quest         # exact filters: --task, --quest, --wave
woco usage --analytics --wave daemon-2026-03-01T10-00-00-000Z --by agent
woco usage --analytics --since 2026-03-01 --until 2026-03-31
WOMBO_OUTPUT=json woco usage --analytics --by quest   # structured: json | toon
```

`--task`, `--quest` and `--wave` are only valid with `--analytics`, and `--by`
is validated per mode (analytics: task, quest, wave, agent, model; token mode:
task, quest, model, provider, harness). Dates filter on the execution's first
process start. Structured output (`json`/`toon`) carries the same summary and
never contains ANSI codes; storage diagnostics (malformed or unsupported
snapshot files) are printed to stderr.

### Metric definitions

| Metric | Definition |
| ------ | ---------- |
| Execution | One run of a task. Re-submitting a task, or explicitly retrying a *finished* execution, creates a new execution. Ordinary automatic retries stay inside the same execution. |
| Outcome | `succeeded` (reached successful verification), `failed`, `stopped` (cancelled, skipped, downstream-cancelled, killed, reaped or interrupted by shutdown) or `running`. Merge result is tracked separately (`pending`, `merged`, `failed`), so verified work that later fails to merge is still `succeeded`. |
| Completion time | First agent process start to successful verification, including ordinary retries and excluding any later merge waiting. Only `succeeded` executions contribute; the process exiting (`completed`) is not success. |
| Retries | Cumulative ordinary retries within the execution. |
| Tokens | Input, output, cache read/write, reasoning, total and cost, accumulated from the same step events already written to `usage.jsonl` (analytics never appends to it again). |
| Build pass rate | Total build passes / total build attempts (not an average of percentages). Counts the actual build result, so a passing build followed by failing browser or TDD verification is still a pass. Fake agents run no builds and contribute no attempts. |
| Lines changed | Committed additions + deletions between an immutable baseline commit (captured before the first agent process) and the commit at successful verification; binary files contribute no counts; runtime artifacts (`.wombo-combo/analytics`, `usage.jsonl`, state, history, logs, evals) are excluded. Chain members are measured from their own starting commit. Uncommitted work is not counted. After a tier-four conflict re-run the measurement is re-taken for the replacement implementation (phase `replacement`) without changing the original completion time. |

Unknown measurements are `null` in JSON and rendered as `n/a` (never as zero
or 100%). Means and rates without eligible samples are `null`; every metric
reports how many executions were eligible.

### Coverage limitations

- **Usage coverage** is `full` when every monitored token stream was seen,
  `partial` when part of the execution was not monitored, and `none` when no
  usage was recorded. Conflict-resolver agents (tiers 3, 3.5 and 4) are not
  monitored, and PID-only recovery after a daemon restart cannot see the live
  token stream, so those executions report `partial` usage and the CLI/TUI warn
  that totals may be incomplete.
- Build counts include the conflict-resolution re-builds but not builds run
  outside the daemon.
- Historical usage (`usage.jsonl`) and session history are **not** backfilled
  into analytics; only executions run after this feature was enabled appear.

### TUI

In the Task Browser press **U** to open the analytics overlay (it works without
a connected daemon). It shows outcomes, completion time, retries, token totals,
weighted build pass rate and added/deleted lines with sample counts and
coverage warnings. **Tab** cycles grouping (task, quest, wave, agent, model),
**Up/Down** or **j/k** select, **Esc**/**U** close. Data is loaded when the
overlay opens and refreshed every couple of seconds only while it is visible.
When the browser is scoped to a quest the overlay uses the *recorded* quest of
each execution (so archived or removed tasks still count); the unquested
errands browser shows only executions without a quest.

## Multiple agent CLIs and models

By default wombo runs [opencode](https://opencode.ai). Agent **profiles** let
you run tasks through other CLIs (Claude Code, Codex, pi, or any command) and
route by task difficulty or operation, with fallbacks and per-account API keys:

```json
{
  "agentProfiles": {
    "fast": { "harness": "opencode", "model": "anthropic/claude-haiku-4" },
    "deep": {
      "harness": "claude-code",
      "model": "opus",
      "envFrom": { "ANTHROPIC_API_KEY": "ANTHROPIC_API_KEY_WORK" }
    }
  },
  "routing": {
    "default": "fast",
    "byWeight": { "heavy": "deep" },
    "byOperation": { "plan": "deep" },
    "fallbacks": { "deep": ["fast"] }
  }
}
```

Credentials are never stored in config: `envFrom` names the environment
variable to read. Existing `agent.bin` and `modelRouting` settings keep working
unchanged. Only opencode is verified end to end; the other harnesses are
verified against recorded output only. See [docs/harnesses.md](docs/harnesses.md)
for every option, the routing order and the verification status.

## Launch options

```sh
woco launch --all-ready              # all features with met dependencies
woco launch --top-priority 3         # top 3 by priority
woco launch --quickest-wins 3        # 3 lowest-effort features
woco launch --tasks "id1,id2"        # specific tasks
woco launch --interactive            # tmux TUI mode
woco launch --dry-run                # preview without launching
```

## Merge, changelog and pull requests

After a successful merge, wombo-combo can append a `CHANGELOG.md` entry and
open or update a GitHub pull request with a structured description (summary,
affected files, test results). Publication is **opt-in**: the default does no
network or GitHub work at all.

```jsonc
// .wombo-combo/config.json
{
  "postMerge": {
    "prMode": "skip",       // "skip" (default) | "open" | "draft"
    "prBaseBranch": null,   // PR target branch; null = the remote's default branch
    "changelog": true       // append CHANGELOG.md entries (independent of prMode)
  }
}
```

**Merge destination vs. PR target.** Agents merge into their task's base
branch (`baseBranch`, or a quest branch). That *destination* branch becomes the
PR **head**. The PR **target** is `postMerge.prBaseBranch`, falling back to the
default branch of the `git.remote` repository. If the destination and the
target are the same branch, no PR is created (nothing meaningful to compare)
and the output explains how to fix it: merge into an integration branch such as
a quest branch, or point `prBaseBranch` at a different branch. Merges are never
undone and no same-branch PR is ever invented.

**Modes.**

- `skip` (default): no GitHub CLI, no push, no PR. Changelog generation still
  happens when `changelog` is true, and a separately requested `--auto-push`
  keeps working as before.
- `open` / `draft`: after the changelog commit, the destination branch is
  pushed to `git.remote` (never forced), and only after a confirmed push is a
  PR created (as a draft in `draft` mode) or updated.

**Changelog.** Entries are appended to `CHANGELOG.md` (created if missing;
existing content is never reorganized) and committed as a separate
`docs(changelog)` commit on the destination branch in a temporary worktree, so
your working tree is never touched. Each entry carries a hidden
`<!-- wombo-combo:operation:... -->` marker, which makes reprocessing the same
merge a no-op.

**One cumulative PR per head/target pair.** Later merges update the same PR
instead of opening another. Only the automation-owned section of the PR body
(between `wombo-combo:pr-report` markers) is rewritten; text you add around it
survives, and a pre-existing PR without that section is left untouched. The
affected-files list is the real target-to-head comparison; the task list
combines the recorded merges that are not yet in the target. Test results
distinguish build, unit-test and browser outcomes: a passing build never
implies passing tests, and anything not recorded (older state, fake agents,
disabled tests) is shown as `unknown` or `skipped`.

**Authentication prerequisites (open/draft only).** Install the
[GitHub CLI](https://cli.github.com) and authenticate non-interactively
(`gh auth login`, or set `GH_TOKEN`). `git.remote` must point at a `github.com`
repository and you need push access. wombo-combo never prompts, opens a
browser or prints tokens. A missing `gh`, missing authentication, a non-GitHub
remote, or a failed push is reported as an actionable warning; the merge and
the local changelog commit are kept.

### Entry points

```sh
woco merge                       # merge every verified agent, publish once
woco merge --tasks "id1,id2"     # merge selected verified agents only
woco merge --dry-run             # show the plan; no writes, merges, pushes or gh calls
woco merge --output json         # machine-readable result
```

`woco merge` reads the persisted daemon state, refuses to run while a daemon
is alive (stop it with `woco daemon stop` first), merges sequentially, marks
agents and tasks done and runs publication **once after a completely
successful batch**. If any merge fails, the successes are kept and reported but
nothing is published for the incomplete batch.

The **daemon** publishes after each successful terminal merge (including those
resolved by conflict escalation): every merge refreshes the changelog and
updates the one cumulative PR for its destination/target pair. Publication
errors are logged (`evt:log`, including PR URLs) but never mark an agent failed
or trigger a retry.

**Recovery.** Publication state is tracked in `.wombo-combo/post-merge.json`
(a gitignored runtime journal, not a project file). If a push or PR step fails
(network down, `gh` missing, rejected push), fix the cause and simply re-run
`woco merge`: with nothing left to merge it retries the interrupted
publication. Changelog markers, idempotent pushes and PR lookup guarantee no
duplicate entries or PRs. If the journal is corrupt, the command reports it
and does not silently overwrite it.

## License

MIT
