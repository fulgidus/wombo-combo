---
title: Comments
description: Git-tracked comment threads on tasks and quests, shared by humans and agents.
---

Tasks and quests have a comment thread. Comments are plain files under
`.wombo-combo/comments/`, committed like any other project artifact, so the
discussion travels with the code and git history is the audit trail. No server
and no network access are involved.

## Storage layout

```
.wombo-combo/comments/
  task/<task-id>/<timestamp>-<author-slug>-<rand4>.yml
  quest/<quest-id>/<timestamp>-<author-slug>-<rand4>.yml
```

One YAML file per comment. The comment id is the filename stem. Each file has
`author`, `role`, `created_at`, `body`, and optionally `reply_to` (the id of
the comment being answered) and `github_url` (the mirrored GitHub comment).
Comments of archived or deleted tasks and quests are kept.

## CLI

```sh
# Comment on a task (role defaults to agent)
bun dev comment add my-task "Looked at this, the cache key is wrong"

# Comment on a quest, as a human, replying to an earlier comment
bun dev comment add quest:auth-overhaul "Decision: go with OAuth" --role human --reply-to <comment-id>

# Long text from stdin
git diff --stat | bun dev comment add my-task --stdin

# Read
bun dev comment list my-task
bun dev comment list quest:auth-overhaul -o json
bun dev comment show <comment-id>
```

(`woco comment ...` once installed globally.)

## Author resolution

The author is, in order: `--author`, the `WOMBO_AUTHOR` environment variable,
`git config user.email`, then the OS user name.

## Roles

| Role | Meaning |
| --- | --- |
| `agent` | Written by a coding agent (default) |
| `human` | Written by a person |
| `system` | Written by tooling, for example automatic lifecycle notes |

## How comments reach agents

When wombo-combo builds an agent prompt it includes the most recent comments
of the task, so notes left by humans or earlier agents are seen. This is
configured in the `comments` block of `.wombo-combo/config.json`:

| Key | Default | Meaning |
| --- | --- | --- |
| `comments.promptMaxItems` | `10` | Maximum number of recent comments put in the prompt |
| `comments.promptMaxChars` | `4000` | Maximum total characters of comments in the prompt |
| `comments.autoLifecycle` | `false` | When true, wombo-combo adds `system` comments on task lifecycle events |

See the [configuration reference](../../reference/config/) for the exact schema.

## In the TUI

The task browser detail pane shows the last 5 comments of the selected task
(author, role, time, and the first lines of the body). It is read-only; add
comments with the CLI.

## Merge-friendliness

Every comment is its own file with a unique name (timestamp, author slug and a
random suffix), so two people commenting on the same task at the same time
never produce a merge conflict. Files are never rewritten after creation.

## Mirroring to GitHub

Comments can be mirrored to the matching GitHub issue. A comment file may carry
the url of the GitHub comment in its `github_url` field, which links the two
sides; set it with `bun dev comment add … --github-url <url>`. The mirror itself is done by hand or by the agent (with `gh` or the
GitHub MCP tools); see `docs/agents/issue-tracker.md`.
