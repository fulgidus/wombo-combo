# Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)

This repo is dogfooded: work is tracked in **woco** itself (`bun dev tasks …`,
`bun dev quest …`, `bun dev wishlist …`; never the global `woco` binary, see
AGENTS.md rule 1). Every ticket is **mirrored to GitHub Issues** on
`fulgidus/wombo-combo`, so there is always a fallback and external readers can
see the work.

## The mirror is automated

The lockstep mirror is done by `bun dev sync` (guide:
`docs/src/content/docs/guides/github-sync.md`):

- `bun dev sync run` pulls GitHub changes, then pushes woco changes (tasks,
  quests, comments, labels). Idempotent: issues are matched by a hidden
  `woco:` marker and the mapping files under `.wombo-combo/sync/github/`.
- **Auto mode** (`sync.github.enabled: true`, `mode: "auto"` in
  `.wombo-combo/config.json`) pushes each change right after the woco command
  that made it, and the daemon (or `bun dev sync watch`) runs the cycle
  periodically. With auto mode on, the manual mirror steps below are done for
  you; do not repeat them.
- Auth: `GITHUB_TOKEN`, `GH_TOKEN` or `gh auth token`. Check drift offline with
  `bun dev tasks check --mirror`.
- Conflicts: local woco values win; the GitHub values are kept as a comment on
  both sides.

Everything below is the **manual fallback**: use it when sync is off, there is
no token, or GitHub was unreachable and the mirror is pending.

## Rules

- **woco first, then GitHub, in the same step.** Create or change the woco
  object, then mirror it. Record each side's id in the other: `github: #N` in
  the task's `notes`, and the woco task or quest id in the issue title
  (`[task-id] Title`).
- **Cloud sessions have no `gh` CLI** (and usually no token for `sync`). Use the GitHub MCP tools
  (`mcp__github__issue_write`, `issue_read`, `add_issue_comment`,
  `list_issues`, `sub_issue_write`). Locally, use `gh`. If neither is
  reachable, do the woco side, say the mirror is pending, and finish it the
  next time GitHub is reachable.
- **If woco is unavailable**, GitHub is authoritative until the two are
  reconciled; then bring woco back in line.
- Never silently diverge: if the two sides disagree, say so and fix one.
- Bugs found mid-task are tracked the same way (AGENTS.md rule 5).

## Vocabulary

| Skill term | woco | GitHub |
| --- | --- | --- |
| spec / map | quest (`.wombo-combo/quests/<id>.yml` + `<id>/knowledge.md`) | issue labelled `spec` |
| ticket | task (`.wombo-combo/tasks/<id>.yml`) | issue |
| blocking edge | `depends_on` | native "blocked by" dependency |
| idea not yet a ticket | `bun dev wishlist add "<text>" --tag <tag>` | none (stays in woco) |

Task status lifecycle: `backlog` → `planned` → `in_progress` → `in_review` →
`done` (`blocked` and `cancelled` also exist). Statuses are set with
`bun dev tasks set-status <id> <status>`.

## When a skill says "publish a spec to the issue tracker"

1. `bun dev quest create <id> "<title>" --goal "<goal>" [--priority …] [--difficulty …]`
2. Write the spec body into `.wombo-combo/quests/<id>/knowledge.md`.
3. Mirror: create a GitHub issue labelled `spec` with the same body; add
   `github: #N` to the quest knowledge file.
4. Apply the triage role (see `triage-labels.md`).

## When a skill says "publish tickets" (to-tickets)

Publish blockers first so edges can reference real ids. For each ticket:

1. `bun dev tasks add <id> "<title>" --quest <quest-id> --depends-on <blocker-ids> --description "<body>" --priority … --difficulty … --effort PT…`
   (add `--constraints`, `--forbidden`, `--references` as needed; semicolon-separated).
2. Mirror: create a GitHub issue `[<id>] <title>`, make it a sub-issue of the
   spec issue, set native blocked-by edges, record `github: #N` in the task's
   `notes`.
3. Apply the `ready-for-agent` role unless told otherwise.
4. Run `bun dev tasks check` afterwards (schema, dependencies, cycles).

## When a skill says "fetch the relevant ticket"

`bun dev tasks show <id>` (add `-o json` for machine-readable output). For a
GitHub reference (`#N`), read the issue and then find the matching woco task
by the `[task-id]` prefix.

## Claim, progress, resolve

- **Claim / start:** `bun dev tasks set-status <id> in_progress`; on GitHub,
  assign yourself and comment. (With team mode on, `bun dev team claim <id>`.)
- **Review:** `bun dev tasks set-status <id> in_review` when a branch awaits review.
- **Resolve:** `bun dev tasks set-status <id> done`; reference the task id in
  the commit message; close the GitHub issue with a comment.
- **Won't do:** `bun dev tasks set-status <id> cancelled`; close the issue as
  not planned. Finished tasks move out with `bun dev tasks archive`.
- When all tasks of a quest are done: `bun dev quest complete <id>`.

## Comments

woco comments are the primary comment surface. "Comment on an issue" means:

```sh
bun dev comment add <task-id|quest:id> "<text>" [--role agent|human|system] [--reply-to <comment-id>] [--github-url <url>]
```

Then mirror it as a comment on the GitHub issue (same step) and record the
url of that GitHub comment with `--github-url` (pass it when adding the woco
comment, i.e. mirror first when you need the url).

- Handoffs, triage notes and wayfinder answers go through comments.
- Read the thread with `bun dev comment list <task-id|quest:id>`.
- Durable decisions still belong in the task's `notes` or the quest's
  `knowledge.md`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Wayfinding operations (used by `/wayfinder`)

- **Map:** the quest's `knowledge.md` (Notes / Decisions-so-far / Fog), mirrored
  by one GitHub issue labelled `wayfinder:map`.
- **Child ticket:** a task in that quest, type recorded as a `wayfinder:<type>`
  line in `notes` (`research`/`prototype`/`grilling`/`task`); GitHub: a
  sub-issue of the map issue labelled `wayfinder:<type>`.
- **Blocking:** `depends_on` (and native GitHub dependencies). A ticket is
  unblocked when every dependency is `done`.
- **Frontier:** `bun dev tasks list --quest <id>` (or `-o json`), keep tasks in
  `backlog`/`planned` whose dependencies are all `done` and that nobody has
  claimed; first in map order wins.
- **Claim:** `bun dev tasks set-status <id> in_progress` (and assign the issue).
- **Resolve:** put the answer in a woco comment (`bun dev comment add`) and the GitHub issue comment,
  `tasks set-status <id> done`, close the issue, then append a context pointer
  (gist + link) to the map's Decisions-so-far in `knowledge.md`.
