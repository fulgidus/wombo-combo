# Local changes to vendored skills

The skills in `.claude/skills/` come from `mattpocock/skills` (see
`skills-lock.json`). We keep them unmodified except for the changes below. If
`npx skills update` restores an original, re-apply the change.

## `code-review` renamed to `code-review-spec`

The package's `code-review` (standards + spec review in parallel sub-agents)
shares its name with the built-in `/code-review` (correctness bugs). To keep
both usable, the local copy is `.claude/skills/code-review-spec/` with
`name: code-review-spec`, and the four skills that reference it
(`implement`, `implement-spec`, `ask-matt`, `tdd`) call `code-review-spec`.

## `triage`: no AI disclaimer

The package's `triage` skill requires every comment and issue it posts to start
with a disclaimer line crediting an AI for the text. This project forbids AI
attribution (AGENTS.md rule 6), so that requirement is removed from
`.claude/skills/triage/SKILL.md`. The attribution scan
(`scripts/check-attribution.ts`) fails if it comes back, for example after
`npx skills update`: re-apply this change then.
