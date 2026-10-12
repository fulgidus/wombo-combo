Quest depends on agent-process-supervision (per-agent supervision, restart
policy and the agent-runner extractions). That quest also edits
src/daemon/agent-runner.ts, so wst-runner-failure-reports must stay a small
call-site change and land after those extractions are merged.

Design: src/daemon/supervision-tree.ts is a pure model (no git, no runner).
The scheduler only asks it `canStart` AFTER readiness and priority are
computed, so DAG semantics are untouched. The tree lives on the Daemon and
survives Scheduler reconstruction (cmd:start rebuilds the Scheduler), so
concurrency pinning (initialMaxConcurrent, concurrencyPinned) must not be
touched; see openspec/specs/scheduler-concurrency-* and the archived change
fix-scheduler-launch-and-concurrency.

Defaults must equal today's behaviour: maxRestarts resolves to
config.defaults.maxRetries, no backoff, one_for_one, all escalation
triggers "none" (a baseline or base-branch failure just fails that agent).
Every state change and escalation emits an event (evt:supervision, plus
evt:log); nothing happens implicitly.

Persistence: DaemonState gets an optional `supervision` snapshot (paused
quests, wave status, restart counters, escalation records) in the existing
daemon-state.json, STATE_VERSION unchanged, written via the existing atomic
tmp+rename. Crash recovery goes through recoverFromPersistedState in
supervision-wiring.ts, which restores the tree and then calls the existing
runner reconcile methods in their current order.

Terminology: wave, quest, agent, task per docs/agents/domain.md / GLOSSARY.md.
Every task: bun run typecheck, bun test, bun run build; conventional commits
with the task id in brackets; no AI attribution in commits or files.
