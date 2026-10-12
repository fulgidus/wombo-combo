Context for downstream planners on BEAM/OTP-style supervision in wombo-combo.
- Closed PR #3 proposed migrating the daemon to Elixir/OTP with the TS
  CLI/TUI kept as the presentation layer. This plan does not adopt that
  proposal. It brings OTP semantics (supervisors, restart strategies,
  restart intensity, escalation) into the existing Bun/TS daemon. The first
  quest, otp-supervision-spike, must confirm or reverse that direction with
  an ADR, and the remaining quests depend on its go decision.
- Current daemon layout: src/daemon/daemon.ts (lifecycle), agent-runner.ts
  (about 2.4k lines; per-task launch, monitor, verify, merge, retry),
  scheduler.ts (continuous DAG scheduler, priority, concurrency pinning),
  state.ts (atomic persisted state broadcast to clients), protocol.ts
  (WebSocket Cmd*/Evt*), client.ts (reconnecting client).
- Failure handling is currently implicit: per-agent retries counters bounded
  by config.defaults.maxRetries, plus recovery paths spread across the
  daemon and runner. Supervision should unify these without changing
  defaults.
- JS is single-threaded, so isolation is at the level of async tasks and
  child processes (the agent CLIs), not memory. Merges and conflict
  resolution touch shared git state and must stay serialized.
- Protocol changes must stay additive so older TUI/CLI clients keep working.
- Project rules apply: bun dev only, typecheck and build before commits,
  no new dependencies without justification, track bugs instead of working
  around them, and no AI attribution anywhere.

## Planner notes

Deliverables live in three places so parallel tasks never touch the same file:
- docs/adr/0001-otp-supervision.md: the ADR (written last, synthesizes everything).
- docs/adr/0001-otp-supervision/: research notes (recovery-map.md, concept-mapping.md, ts-vs-elixir.md).
- spikes/otp-supervision/: throwaway prototype (supervisor.ts, demo.ts, tests, README). It must not
  be imported by src/ and must not change daemon behaviour.
Recovery today is spread across agent-runner.ts (onError retry, build-verification retry,
handleRetry, merge conflict tiers, reconcileOrphanedTasks and startup reconciliation), the daemon
startup path, and scheduler requeue of queued agents. JS is single-threaded: supervised units are
async tasks plus harness child processes, not isolated heaps; merges stay serialized. Closed PR #3
proposed an Elixir/OTP daemon; the ADR must confirm or reverse the in-TS direction. GLOSSARY.md and
docs/adr/ did not exist when this plan was made; use the vocabulary wave, quest, task, agent, harness.
Protocol changes in any later work must stay additive.
