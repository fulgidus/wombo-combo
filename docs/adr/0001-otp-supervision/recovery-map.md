# Recovery map: today's ad hoc failure handling vs. OTP supervision

Research note for [ADR 0001](../0001-otp-supervision.md). It inventories every place
the daemon recovers from failure today and names the OTP supervision primitive that
would replace it. The Elixir/OTP daemon migration proposed in closed PR #3 is not
assumed: the primitives below are meant to be implemented inside the Bun/TS daemon.

Line numbers refer to the tree at the time of writing (`quest/otp-supervision-spike`
base). Re-verify with the function names if the files have moved.

## Vocabulary

- **task**: a unit of work in `.wombo-combo/tasks/`. **agent**: the daemon's runtime
  record for one task (`InternalAgentState`, keyed by `featureId`). **harness**: the
  coding CLI the agent runs through. **wave** and **quest** keep their existing meaning.
- In OTP terms, one agent (its harness child process, worktree and merge pipeline) is
  the **child**; the scheduler plus `AgentRunner` play the **supervisor**. Today there
  is no supervisor object: each path below mutates agent state directly.
- Supervised units are async tasks and harness child processes, not isolated heaps.
  Merges touch shared git state and stay serialized through `enqueueMerge`
  (`src/lib/merger.ts:68`).

## Summary table

`AR` = `src/daemon/agent-runner.ts`, `SCH` = `src/daemon/scheduler.ts`,
`ST` = `src/daemon/state.ts`, `DM` = `src/daemon/daemon.ts`.

| # | File and function | Trigger | Current behaviour | State mutated | Replacing primitive | Gap |
|---|---|---|---|---|---|---|
| 1 | `AR` `buildCallbacks().onError` (l.360-392) | Harness process exits non-zero without a final stop, or emits a spawn `error` (`monitor.ts:547`, `:556`) | If `agent.retries < agent.maxRetries`: `retries+1`, status `retry`, `handleRetry`. Else `failed`, `cancelDownstream`, `rescueChainPredecessors` | `agent.retries`, `error`, status, downstream agents' status | **Transient** child under a **one_for_one** supervisor with intensity = `maxRetries` restarts. Exhausted intensity escalates: child terminated, then the parent decision (cancel downstream) | Counter is per agent and never decays; OTP intensity is per *period*. No backoff between restarts. Failure reason is a free string, not an exit reason, so "normal" vs "abnormal" is decided by exit code or `sawFinalStop` only |
| 2 | `AR` `buildCallbacks().onComplete` (l.355-363) | Harness exits 0 or `sawFinalStop` | Status `completed`, fire-and-forget `handleBuildVerification`; a thrown error marks `failed` with no retry | status, `error` | **Transient** child exit `normal` followed by the next pipeline stage. The `.catch` is a crash of the verify stage | A verify-stage crash skips the retry counter and does not `cancelDownstream` (only `rescueChainPredecessors`). Inconsistent with path 1 |
| 3 | `AR` `handleBuildVerification` retry branch (l.866-888) | Verification build/tests fail | Same bound as path 1: `retries+1`, status `retry`, `handleRetry`; else `failed`, `cancelDownstream`, `rescueChainPredecessors` | `retries`, `error`, `buildOutput`, `buildPassed`, status | Same restart budget as path 1: a verification failure is a child *crash* with reason `build_failed`, counted in the same intensity window | Build and process failures share one counter by accident, not design. A supervisor would make this explicit via exit reasons |
| 4 | `AR` `handleBuildVerification` baseline-missing guard (l.805-818) and `catch` (l.891-897) | Quest test baseline unavailable; verification throws | `failed` immediately, `cancelDownstream` (baseline case) or only `rescueChainPredecessors` (throw case); no retry | status, `error` | **Temporary** (never restarted) failure with escalation to parent. A missing baseline is a *configuration error*, not a transient fault | The throw case does not cancel downstream, so dependents stay `queued` forever |
| 5 | `AR` `runReviewGate` (l.908-975) | Reviewer returns blocking findings | While `round < maxRounds`: store feedback, status `retry`, `handleRetry`; else `failed`, comment, `cancelDownstream` | `reviewRounds`, `reviewFeedback`, status | Not supervision: it is a *workflow loop* with its own bound. Only the final failure maps to escalation | Reuses `handleRetry` but bypasses the `retries` counter, so review rounds are bounded separately from `maxRetries` |
| 6 | `AR` `handleRetry` (l.1946-2007) | Called by paths 1, 3, 5 | No `sessionId`: status `queued`, "No session, re-queuing". With a session: baseline gate, then `retryHeadless` (reuse session, same harness), status `running`. Baseline missing: `failed`, no cascade. `retryHeadless` throws: status `queued` | `pid`, status, `reviewFeedback` | **Restart** step of the child spec: *restart type* decides whether to re-run in place (session reuse) or from the start (re-queue). Child spec carries the harness profile | Two restart modes (warm session vs cold re-queue) exist only inside this function. The baseline-gate failure marks `failed` without `cancelDownstream` or `rescueChainPredecessors`. The `catch` swallows the launch error, so the cause is lost |
| 7 | `AR` `handleMergeConflict` and `attemptMerge` (l.1024-1100, l.1370-1530) | `canMerge` false, direct merge fails, or tier 1/2/2.5 retry fails | Status `resolving_conflict`. Tier 1/2/2.5 auto-resolve via `tieredMergeBaseIntoFeature`; tier 3 enriched LLM resolver (`runTier3`, l.1536); tier 3.5 rebase with per-commit resolver (`runTier35`, l.1613); tier 4 re-implement from scratch (`runTier4`, l.1769). Each tier gated by `isTierAllowed` against `config.git`'s `maxEscalation` (l.150). All exhausted: `failed`, `cancelDownstream` | status, worktree/branch contents, `completedAt` | **Escalation ladder**: a chain of progressively heavier restart strategies, with the tier list as the intensity budget. Closest OTP analogue is supervisor escalation (child -> supervisor -> parent). Must run **inside the serialized merge section** | Not OTP-shaped: tiers are *different recovery actions*, not restarts of the same child. Keep as a pipeline stage. Supervision only owns the "all tiers exhausted" exit. Tier exhaustion does not call `rescueChainPredecessors`, unlike paths 1 and 3 |
| 8 | `AR` `rescueChainPredecessors` (l.2035-2048) | Any final failure of a chain member | Merges the most recent `verified` predecessor so its work is not stranded | predecessor status via `attemptMerge` | **rest_for_one** semantic inverted: when a later chain member dies, earlier verified members are *completed*, not restarted. Models as a termination hook (`terminate/2`) of the chain supervisor | Called inconsistently (see rows 4, 6, 7). Fire-and-forget with an empty `catch` |
| 9 | `ST` `cancelDownstream` (l.509-526) | Final failure of an agent | Marks every non-terminal downstream agent `failed` | downstream status and `error` | **rest_for_one / one_for_all over the dependency edge**: dependents are shut down when a dependency cannot be restarted. Use a *shutdown* with reason `dependency_failed` | Wave-level cascade is implicit: it follows `dependsOn`, not a supervision tree. It only rewrites status; it never stops a harness process, so a downstream agent already running in a shared-worktree chain keeps going until it exits |
| 10 | `AR` `reconcileOrphanedTasks` (l.2187-2213) | Daemon start (`DM` l.215) | Every task file `in_progress` with no agent in state is reset to `planned` and `started_at` cleared | task YAML status, `started_at` | **Supervisor init**: on boot, the supervisor re-derives its child list from durable specs (task files) and starts missing children. This is the child spec table | Runs once, before any scheduler. A task left `in_progress` *with* a stale agent entry is not touched here (see rows 11 and 12) |
| 11 | `AR` `reconcileVerifiedAgents`, `completed` branch (l.2238-2250) | Daemon start (`DM` l.218) | For every persisted `completed` agent, re-run `handleBuildVerification` | status, `verification`, retries (via verify path) | **Restart type permanent-in-pipeline**: the stage is idempotent so a crash restart resumes it. Equivalent to a supervisor restarting a stage worker with its persisted args | Reconciliation shares the retry bound with the live path, so a restart can burn a retry. A rejected promise marks `failed` without `cancelDownstream` |
| 12 | `AR` `reconcileVerifiedAgents`, `verified` branch (l.2252-2262) | Daemon start | Re-run `attemptMerge` | status via merge | Same as row 11, for the merge stage. Merge is serialized, so restart order = queue order | `Merge reconciliation error` marks `failed` without cascade |
| 13 | `AR` `reconcileVerifiedAgents`, `resolving_conflict` branch (l.2266-2280) | Daemon start | Reset to `verified`, then `attemptMerge` immediately | status | **Restart** of the merge stage from its first tier (tier progress is not persisted). Child spec: restart from start | The method comment says "on the next startup" but the code re-triggers merge immediately. Tier progress and partially rebased worktree state are lost, so a half-applied tier 3.5 rebase may be present |
| 14 | `DM` `start` (l.172-221) | Process start | Writes PID file, `state.load()` (l.146), registers signal handlers, runs `restoreAnalytics`, `reconcileOrphanedTasks`, `reconcileVerifiedAgents`. Scheduler is deliberately idle until `cmd:start` | PID file, analytics, agents | **Supervisor `init/1`** with `start_children` deferred. Ordering of the three reconcile calls is the start order | Persisted `running`, `installing`, `retry` and `in_review` agents are *not* reconciled here; they are only reaped later by row 15 once a scheduler tick runs. If no `cmd:start` arrives they stay stale |
| 15 | `AR` `reapDeadProcesses` (l.2143-2175), called from `SCH` `tick` (l.272) | Every scheduler tick, for `running`/`installing` agents whose `pid` is dead; and `retry` agents with no live pid | Reset task file to `planned`, capture best-effort diff, remove worktree, **delete the agent from state** so the scheduler resubmits. For `retry`: if `retries >= maxRetries`, same reap; else status `queued` ("Re-queuing stuck retry") | task file, worktree, agent state, `retries` is *lost* on removal | **Monitor** (`'DOWN'` message) on the harness process, plus restart under the child spec. Polling `isProcessRunning` (`src/lib/launcher.ts:510`, `process.kill(pid, 0)`) becomes the monitor implementation | Reaping *resets the retry budget* (agent record deleted), so a crash loop never reaches `maxRetries`. This is the largest gap: a harness that dies by signal loops forever. PID reuse can mis-detect. Only runs while the scheduler is `running` |
| 16 | `src/lib/monitor.ts` `reconnectProcess` (l.578) | Not called by the daemon (only defined) | PID-only reconnect with a 2 s poll; fires `onComplete` on death | monitor entry | **Monitor without link**: observe a process the supervisor did not spawn | Dead in the daemon path, so after a daemon restart live harness processes are orphaned and later reaped (row 15). Candidate for deletion or for the restart-adopt design |
| 17 | `src/daemon/pid-utils.ts` `isDaemonRunning` (l.15-39); `DM` `static isRunning` (l.920) | CLI/TUI launcher checks for a running daemon | `process.kill(pid, 0)` on the PID file, unlink the file if stale | `daemon.pid` | **Stays as-is, not a supervision concern.** It is the *external* supervisor (the CLI/TUI launcher) deciding whether to start the daemon. Equivalent of the OS-level supervisor above the BEAM node | None for supervision. Relevant to the TS CLI/TUI boundary in the ADR |
| 18 | `DM` `shutdown` and signal handlers (l.223-280, l.880-890) | `SIGTERM`, `SIGINT`, uncaught exception (forced), idle timeout, `cmd:shutdown` | Interrupt analytics, write history, broadcast `evt:shutdown`, stop scheduler, `killAll` only if `force`; non-force leaves agents running | analytics, history, server | **Shutdown semantics**: supervisor terminates children in reverse start order with a `shutdown` timeout, then `brutal_kill`. `force` maps to `brutal_kill`, non-force to a graceful timeout | Non-force shutdown lets agents outlive the daemon with nobody monitoring them (row 16 is the only reconnect hook). No shutdown timeout |
| 19 | `SCH` `tick` re-pick of queued agents (l.253-330) | Every `tickIntervalMs` (default 3000, l.168-170) or `wakeOnAgentOutcome` | `getReadyAgents()` (`ST` l.404) = `queued` with deps ready, pinned ones sorted first, launched up to `max - activeCount` | agents via `launchAgent` | **Supervisor start loop** / restart scheduling: `queued` is the *pending restart* state. Concurrency limit = a bounded pool (e.g. `max_children`) | Queued retries re-enter the *same* queue as new work, so a flapping task can starve others; there is no restart delay. This is where backoff would plug in |
| 20 | `SCH` pinned tasks (`pinTask` l.604, `prioritize` l.464-489, tick l.281) | User pins a task | Pinned queued agents sorted first and the pin is consumed on use | `pinnedTasks` | **Stays as-is, not a supervision concern** (priority policy) | None |
| 21 | `SCH` concurrency pinning (`concurrencyPinned` l.95, l.131-145, `setConcurrency` l.656) | Scheduler construction and `setConcurrency` | Makes the runtime concurrency survive scheduler rebuilds | `scheduler.maxConcurrent` | **Stays as-is, not a supervision concern**: pool sizing. A supervisor would read it as pool capacity | None |
| 22 | `SCH` `retryAgent` (l.621-646) and `ST` `retryAgent` (l.529-546) | User-initiated retry from TUI/CLI | Remove from `submittedTasks`; if the agent is gone, re-scan picks the task up; else bump `retries` or, if exhausted, force-reset `retries = 0`; set `queued` | `retries`, `error`, `buildPassed`, `completedAt`, `submittedTasks` | **Manual restart of a terminated child** (`restart_child/2` after the supervisor gave up). Resets the intensity window | Exhausted retries are reset by direct field writes, bypassing the state API. Mirrors OTP's manual restart, so keep the behaviour |
| 23 | `SCH` `cancelAgent` (l.665-669), `AR` `cancelAgent` (l.2125) | User cancels | Stop the process, mark `failed`, `cancelDownstream` | status, downstream | **`terminate_child`** with a `shutdown` reason; no restart for `temporary`/`transient` on a non-normal user stop | The mark-failed here means the exit reason is not distinguishable from a crash for analytics |
| 24 | `AR` `maxRetries` default and `setMaxRetries` (l.203, l.462-465, l.505), `DM` cmd:start (l.526-528), `config.ts` (default `2` at l.431, validated `>= 0` at l.852) | Agent creation | Each new agent gets `maxRetries = override ?? config.defaults.maxRetries`; `maxRetries` is stored on the agent | `agent.maxRetries` | **Restart intensity (`MaxR`)**. The session override becomes a supervisor start argument. Period is missing today and would be added as an additive option | Retries are *count-only*; there is no `MaxT` window. Changing the override mid-session affects only agents created afterwards. Must keep defaults identical (quest constraint) |

## Notes

### Retry budget semantics (rows 1, 3, 15, 22, 24)

Four independent writers touch `agent.retries`: `onError`, the build-verification
branch, the stuck-retry safety net, and user retry. Three details matter when moving
to a supervisor:

1. The counter is incremented *before* `handleRetry` and compared with `<`, so
   `maxRetries: 2` means two retries after the first attempt (three launches).
   An intensity of `MaxR = 2` in OTP means the third failure inside the period
   escalates. The same off-by-one convention must be kept.
2. `reapDeadProcesses` deletes the agent record, which wipes `retries`. The agent
   is resubmitted by the scheduler with a fresh `maxRetries`. Reaping is therefore
   an unbounded restart loop for signal-killed harness processes. This is a
   behaviour gap to record, not to fix in this quest.
3. User retry deliberately resets the budget. In OTP terms that is an operator
   restarting a terminated child.

### Recommended supervision mapping

| Today | OTP concept |
|---|---|
| agent (one task) | child spec, restart type **transient** (restart on abnormal exit, not on `normal`) |
| quest / wave of agents | supervisor with **one_for_one** strategy; agents are independent |
| chain of agents sharing a worktree (`dependsOn`, same `worktree`) | **rest_for_one** group: a later member failing affects only members after it, and earlier verified members are completed (row 8) |
| `maxRetries` | intensity (`MaxR`), with a new optional period (`MaxT`) |
| `cancelDownstream` | shutdown of dependents with reason `dependency_failed` |
| `reapDeadProcesses`, `monitor.ts` exit handlers | monitor (`DOWN`) on the harness process |
| harness process and its stdio | link: if the agent dies the harness is killed (`monitor.remove` / `killAll`), and vice versa through `onError` |
| daemon `shutdown(force)` | supervisor shutdown, `force` = `brutal_kill` |
| merge queue (`enqueueMerge`) | single serialized worker, **not** a supervised pool; stays as-is |

### What is not a supervision concern

Rows 17, 20 and 21 stay as they are. Row 7's tier ladder and row 5's review rounds are
workflows; supervision should only wrap their final failure. Everything that
`reconcile*` does at startup is reconstruction of child state from durable storage
(task files and `daemon-state.json`), which an OTP supervisor would do in `init/1`,
and which a TS supervisor must still do by hand because there is no BEAM-style
process registry.

### Behaviour gaps to carry into the ADR

1. `reapDeadProcesses` resets `retries`, so crash loops are unbounded (row 15).
2. Failure cascades are inconsistent: `cancelDownstream` and
   `rescueChainPredecessors` are called in different combinations at rows 2, 4, 6, 7, 11, 12.
3. Persisted `running`, `installing`, `retry` and `in_review` agents are not reconciled
   at startup (row 14); only `completed`, `verified` and `resolving_conflict` are.
4. `resolving_conflict` recovery restarts from tier 1 and does not clean a
   half-applied rebase (row 13).
5. `reconnectProcess` is unused by the daemon (row 16).
6. No restart delay or period-based intensity; queued retries compete with new work (rows 19, 24).

### Verification

Every function name above was read in the current tree. Cited ranges are approximate
to within a few lines where a function spans a block; the function name is the
authoritative anchor.
