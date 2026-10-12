# ADR 0001: OTP-style supervision for the wombo-combo daemon

## Status

Accepted. Decision: **GO for in-TS supervision, NO-GO for the Elixir/OTP
daemon (closed PR #3 is rejected).**

This is the first ADR; there are no earlier ones to supersede or conflict with.

## Decision in one line

**Go:** bring OTP supervision semantics (supervisor, child spec, restart
strategy, restart intensity and period, escalation) into the existing Bun/TS
daemon, additively and without changing defaults or the protocol. **No-go:**
rewrite the daemon in Elixir/OTP.

## Context

The daemon (`src/daemon/`, about 6.9k lines; `agent-runner.ts` alone is about
2.4k) launches one agent per task into a git worktree, monitors its harness
process, verifies the build, and merges. Failure handling is not a single
mechanism. The [recovery map](./0001-otp-supervision/recovery-map.md) lists 24
places that recover, retry, cascade or reconcile, spread over `agent-runner.ts`,
`daemon.ts` and `scheduler.ts`. Recorded behaviour gaps include:

- `reapDeadProcesses` deletes the agent record, which resets `retries`, so a
  harness killed by a signal loops forever instead of reaching `maxRetries`.
- `cancelDownstream` and `rescueChainPredecessors` are called in different
  combinations on different failure paths, so dependents can stay `queued`
  forever.
- Persisted `running`, `installing`, `retry` and `in_review` agents are not
  reconciled at daemon start.
- Retries are count-only: no period, no restart delay, and queued retries
  compete with new work.

Closed [PR #3](https://github.com/fulgidus/wombo-combo/pull/3) proposed porting
the daemon to Elixir/OTP, keeping the TS CLI/TUI as presentation. It was closed
on 2026-10-11 without review comments, so its authors' reasons are unknown.
This ADR **rejects** it. It is read here only as a spec.

The quest's initial direction was already the in-TS approach, and the research
confirms it. Nothing in the research reverses that direction.

## Decision

1. **Go for in-TS supervision.** Add a supervisor module to `src/daemon/` that
   owns restart policy, in follow-up quests (see Follow-ups). The prototype in
   [`spikes/otp-supervision/`](../../spikes/otp-supervision/README.md) shows
   the core is expressible in about 200 lines of plain TypeScript with no new
   dependencies.
2. **No-go for Elixir/OTP (PR #3 rejected).** PR #3 stays closed. No Elixir or
   other runtime enters the repo build.
3. **Defaults and protocol do not change.** `maxRetries` semantics (including
   the off-by-one: `maxRetries: 2` means three launches) stay identical. Any
   period, backoff or supervision event is an additive option. Protocol changes
   are additive only; `PROTOCOL_VERSION` stays 1.
4. **Merges and conflict resolution stay serialized** through `enqueueMerge`.
   The merge queue is a single worker, not a supervised pool.

### The single-threaded JS limit

This is a discipline, not an equivalent runtime. Supervised "processes" are
async tasks plus harness child processes (the agent CLIs), not isolated heaps.
All agents, the scheduler, state and the merge queue share one V8 heap in one
thread. Consequences, taken from the
[concept mapping](./0001-otp-supervision/concept-mapping.md) section 9:

- A supervisor can contain only errors it sees: rejections of promises it
  awaits and exit events of processes it owns. An unhandled throw or a
  synchronous stall (long `execSync`) is not contained and blocks every agent.
- Only the harness child process is truly isolated, by the OS.
- Cancellation is cooperative: kill the process and make the async task
  observe it.
- Merges check out and merge on the project root, so they never run in
  parallel, even when a `one_for_all` group restarts.
- Intensity windows are wall-clock and approximate under load.

Supervision here raises the floor for recovery (one place, explicit policy,
bounded restarts). It does not give fault containment for the daemon itself;
that stays with the external supervisor (the CLI/TUI launcher restarting the
daemon, followed by startup reconciliation).

## Options considered

| Option | Verdict | Why |
|---|---|---|
| A. Do nothing (keep ad hoc recovery) | Rejected | Leaves the recorded gaps (unbounded crash loops, inconsistent cascades) |
| B. In-TS supervisor in `src/daemon/` | **Chosen** | Fills the actual gap, touches three modules, keeps the single bun-installed package and the WebSocket protocol |
| C. Elixir/OTP daemon (closed PR #3) | Rejected | See below |
| D. Third-party TS actor or supervision library | Not pursued | The rules require justification for any dependency, and the prototype shows none is needed |

Why C is rejected, from [ts-vs-elixir](./0001-otp-supervision/ts-vs-elixir.md):

- **Cost.** Port surface is about 13k lines of TS (6.9k daemon plus 6.1k
  `src/lib` it depends on) and 5.9k lines of daemon tests that encode
  behaviour. PR #3's size table is stale (`agent-runner.ts` 1511 vs 2378 lines
  now). The in-TS option touches recovery paths in three modules. These are
  line counts, not effort estimates.
- **Distribution.** wombo ships as a bun-installed TS package. A BEAM daemon
  needs per-platform releases and Erlang/Elixir in CI, which the npm pipeline
  cannot carry, and it violates the "no other runtimes in the build" rule.
- **Boundary.** PR #3 moves transport to JSON-RPC 2.0 over a Unix socket,
  replacing the envelope, which is not additive and would lock out older
  clients. Staying in TS keeps `protocol.ts`, `client.ts` and `launcher.ts`.
- **Risk.** Parity regressions (PR #3 itself ports only merge tiers 1-2 first),
  dual-runtime CI, and a half-ported daemon during dogfooding. Its skeleton
  covered transport and idle shutdown; the supervision tree files were empty.
- **Fit.** BEAM-only properties (heap isolation, preemption, hot reload) target
  problems wombo does not have: agents are already OS-isolated CLI processes.
  The missing property, structured supervision, is portable semantics.

## OTP concept mapping (summary)

Full detail: [concept-mapping.md](./0001-otp-supervision/concept-mapping.md).

| OTP concept | Daemon equivalent today | Supervision primitive |
|---|---|---|
| Supervisor | none; split across `AgentRunner`, `Scheduler`, `Daemon` | `Supervisor` owning children and one restart policy |
| Child | one agent: async lifecycle plus harness process | `ChildSpec`, type `worker` |
| `one_for_one` | default: an agent failure only affects that agent | default strategy |
| `rest_for_one` | `cancelDownstream`, `rescueChainPredecessors` | dependency chain group sharing a worktree |
| `one_for_all` | absent | opt-in quest group sharing a baseline or base branch |
| Intensity/period | `retries < maxRetries`, no period | `maxRestarts` within `periodMs`, escalation to parent |
| `permanent`/`transient`/`temporary` | implicit per path | explicit `restart` field (merge queue / agent / cancelled agent) |
| Shutdown | `SIGTERM` only; `killAll` on forced shutdown | `shutdown` timeout then SIGKILL, reverse start order |
| Link | `onComplete`/`onError` callbacks | agent and harness process as one unit |
| Monitor / `DOWN` | `evt:agent-status-change` over WebSocket | monitor delivered as an event |

The scheduler is the root supervisor's start policy (a dynamic-supervisor
style), not a supervisor. Restart decisions after start belong to the
supervisor.

## Recovery map (summary)

Full detail: [recovery-map.md](./0001-otp-supervision/recovery-map.md).

| Ad hoc recovery today | Replaced by |
|---|---|
| `onError` retry counter (agent-runner) | transient child under `one_for_one`, intensity = `maxRetries` |
| Build-verification retry | same restart budget; failure is a crash with reason `build_failed` |
| Verify/baseline/reconcile paths that fail without cascade | one escalation path: child gives up, then parent decides the cascade |
| `handleRetry` warm (session reuse) vs cold (re-queue) | the restart step of the child spec |
| `cancelDownstream` | shutdown of dependents with reason `dependency_failed` |
| `rescueChainPredecessors` | termination hook of the `rest_for_one` chain group |
| `reconcileOrphanedTasks` / `reconcileVerifiedAgents` / `Daemon.start` | supervisor `init`: rebuild children from task files and `daemon-state.json` |
| `reapDeadProcesses` polling | monitor (`DOWN`) on the harness process; retry budget survives the restart |
| Scheduler requeue of `retry` agents | supervisor-owned pending restart, where backoff plugs in |
| `maxRetries` / `setMaxRetries` | restart intensity (`MaxR`) plus a new optional period (`MaxT`) |
| `Daemon.shutdown(force)`, `killAll` | ordered supervisor shutdown; `force` = brutal kill |
| User `retryAgent` | manual `restart_child`, resets the intensity window |
| User `cancelAgent` | `terminate_child`, a normal exit that consumes no intensity |

Not replaced, because they are not supervision concerns: tiered merge conflict
resolution (a workflow ladder; supervision owns only its "all tiers exhausted"
exit), review rounds, task pinning, concurrency pinning, and daemon
PID/health checks (the external supervisor).

## Spike evidence

The prototype in [`spikes/otp-supervision/`](../../spikes/otp-supervision/README.md)
implements the three strategies, the three restart types, sliding-window
restart intensity, reverse-order shutdown with a per-child timeout, escalation
(`intensity_exceeded`, then `escalated`, then `onEscalate`) and nesting via
`asChild`, with an injectable `Clock` for deterministic tests. Its README
describes this behaviour; it is the source for the claim above. On this branch
only `supervisor.ts` (202 lines) and the README exist; the demo and tests are
owned by a sibling task, so this ADR cites no demo output or test results of
its own. The prototype is isolated: nothing under `src/` imports it and it
does not change daemon behaviour.

## Consequences

Positive:

- One place for restart policy; the gaps in the recovery map get an explicit,
  testable home.
- Crash loops become bounded; a quest whose agents keep failing can stop
  burning tokens (group-level period).
- No change to install, build, CI, or the client protocol.

Negative and risks:

- A hand-built supervisor can miss edge cases (shutdown ordering, restart
  storms). Keep it small and covered by tests using the fake agent runner.
- `agent-runner.ts` is entangled, so migrating retry paths may cost more than
  line counts suggest.
- In-process supervision cannot contain event-loop stalls, memory growth or
  unhandled throws.

**Reversal triggers.** Reopen this decision if (a) daemon-process failures (not
agent failures) keep recurring after supervision lands, (b) wombo becomes a
long-running multi-tenant service with hundreds of agents, or (c) BEAM or
single-binary distribution through npm becomes cheap. Mitigation to try first
for (a): run risky units in child processes or workers, still TypeScript.

### Contradictions with existing docs

- `docs/src/content/docs/reference/config.md` (line 77) and
  `schemas/config.schema.json` document `defaults.maxRetries` default as `5`,
  but `src/config.ts` (line 431) uses `2`. This ADR assumes the code (`2`) and
  states that defaults must not change. The doc/schema mismatch pre-exists
  this ADR; it is not fixed here (docs and `src/` are out of scope) and is a
  follow-up item below.
- `docs/agents/domain.md` expects a root `GLOSSARY.md`; none exists. This ADR
  uses the vocabulary wave, quest, task, agent, harness as the quest asked.
- The recovery map's `onComplete` row notes the verify-stage `.catch` marks
  `failed` without `cancelDownstream`; the concept mapping's `rest_for_one`
  section describes cancel-and-rescue as the intended behaviour. These are not
  contradictory: the former is the implementation gap, the latter the intent.
  The supervisor unifies them (Follow-up 2).
- Open questions in concept-mapping section 11 (chain group cancel vs restart,
  what counts as abnormal for `transient`, config key placement) remain open
  and are decided in the quests below, not here.

## Follow-ups

Each item is sized for its own quest or task. **The other supervision quests
start only because this ADR says go**; had the decision been no-go they would
not be started. All changes stay additive: defaults, `maxRetries` semantics and
`PROTOCOL_VERSION` do not change, and no item may break older TUI/CLI clients.

| # | Work item | Depends on | Size |
|---|---|---|---|
| 1 | **Supervisor module in `src/daemon/`**: productionize the spike core (child spec, three strategies, restart types, intensity/period, reverse-order shutdown, escalation), with tests on `src/lib/fake-agent-runner.ts`. No wiring yet. | this ADR | quest, ~3 tasks |
| 2 | **Migrate retry counters**: route `onError`, build-verification and review retries through the supervisor with identical defaults; unify the cancel/rescue cascade so every final failure takes one path; make `reapDeadProcesses` keep the retry budget. | 1 | quest, ~4 tasks |
| 3 | **Startup reconcile via supervisor**: replace `reconcileOrphanedTasks` / `reconcileVerifiedAgents` ordering with supervisor `init`; also reconcile persisted `running`/`installing`/`retry`/`in_review` agents and clean half-applied rebases. | 1, 2 | quest, ~3 tasks |
| 4 | **Ordered shutdown**: SIGTERM then SIGKILL with timeout, reverse start order, drain the merge queue last; decide the fate of unused `reconnectProcess`. | 1 | task |
| 5 | **Additive protocol events**: optional fields on `evt:agent-status-change` or new optional event types for restarts and escalation; handled by TUI as optional. | 2 | task |
| 6 | **Group strategies and config**: `rest_for_one` chain groups and opt-in `one_for_all` quest groups; additive config keys for period and backoff with defaults reproducing today's behaviour. | 1, 2 | quest, ~3 tasks |
| 7 | **Docs**: guide stub and user docs for restart behaviour; correct the `maxRetries` default mismatch in `config.md` and `config.schema.json` (or the code), and add a `GLOSSARY.md`. | 2 (guide), none (mismatch fix) | task |
| 8 | **Delete the spike** once item 1 lands. | 1 | task |

The conflict-resolution tier ladder and merge queue stay as they are; item 2
wraps only their final failure.
