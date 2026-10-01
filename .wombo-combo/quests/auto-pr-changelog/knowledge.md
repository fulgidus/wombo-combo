Current source differs from the supplied outline and parts of the knowledge
graph. src/commands/merge.ts and src/lib/state.ts do not exist. Launch delegates
execution to a continuous daemon; src/daemon/state.ts explicitly has no discrete
wave model. Do not restore legacy wave architecture.

Merge operations are serialized by enqueueMerge in src/lib/merger.ts.
mergeBranch performs Git merging in a temporary sibling worktree and removes it
before returning. AgentRunner.handleMergeSuccess is the common success seam,
including conflict escalation and deferred chain predecessors. Capture evidence
before its cleanup deletes task branches. pushBaseBranch returns a boolean and
normally logs rather than throws on push failure.

A manual merge batch publishes once after all selected merges succeed. The
continuous daemon publishes after each successful terminal merge, updating one
cumulative automation-owned PR per destination/target branch pair. Changelog
entries are operation-scoped and deduplicated by committed markers.

The branch receiving local merges is the PR head. postMerge.prBaseBranch is a
separate target, falling back to the configured GitHub remote's default branch.
If these are the same, report that no meaningful PR can be created and explain
how to configure an integration branch or distinct target; never undo a merge
or fabricate a same-branch PR. Skip mode suppresses GitHub publication, not
enabled changelog generation or separately requested existing auto-push.

Configuration defaults preserve opt-in remote publication. Verification reports
must distinguish build success from actual unit/browser tests. Existing state
contains only buildPassed, so legacy test evidence is unknown.

Tasks own disjoint implementation/test files except where explicit dependencies
serialize changes. Use Bun, strict TypeScript, extensionless ESM imports, and
existing citty/output patterns. Preserve current unrelated workspace changes.
