This breakdown replaces the nine existing analytics tasks, retaining their
IDs. Planning is read-only; leave existing uncommitted work untouched.

Execution is daemon-only and continuously scheduled. Use Daemon.sessionId,
already exported as history.wave_id, for newly submitted executions.
Recovered executions retain their original wave and execution identities.

ProcessMonitor persists each parsed usage record before calling onUsage.
Register its public tokenCollector with context before attaching processes,
but never append the same record again from analytics. Persist full usage
totals independently of the collector's in-memory history.

DaemonState.completed means process exit, before verification. Its existing
timestamps cannot define successful completion duration. Analytics measures
from first process start through successful verification, including ordinary
retries and excluding subsequent merge waiting. Keep merge outcome separate
so verified work that later fails to merge remains accurately represented.

State events are synchronous. Capture successful measurements before emitting
verified, which makes chain successors eligible to run. Chain members share
a worktree and merge through their terminal successor; measure their own
immutable baseline-to-completion diff, not the cumulative chain diff.

runFullVerification exposes build.passed and overallPassed. Only actual build
results contribute to build pass rate. Fake agents skip builds. Conflict tiers
invoke additional runBuild calls, while conflict resolver token streams are
not monitored; expose partial usage coverage rather than claiming completeness.

DaemonState.toClientAgent currently strips named internal fields before
spreading the remainder. Explicitly strip new analytics metadata there.
Internal removal hooks must cover removeAgent, clearCompleted, and reset
without adding a client-facing event.

Existing history export is write-once per daemon session. Analytics persistence
must be incremental and independent of that guard. Explicit user retry can
reuse an agent state object and reset its retry counter; distinguish a new
finished-execution rerun from ordinary retries.

UI code uses Ink and React. TaskBrowserView already exposes onUsage and
isActive; its adapter does not currently wire onUsage. A separate analytics
overlay keeps this quest isolated from unrelated dashboard work.

Preserve token-only usage unless --analytics is requested. Command metadata
derives from citty definitions plus src/lib/citty-registry.ts overrides.

Tasks own distinct files except AgentRunner changes, which are serialized.
Use strict TypeScript, extensionless ESM imports, Bun tests, and no new
dependencies. Run local CLI commands through bun dev, never a global binary.
