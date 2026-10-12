# OTP concept mapping for the wombo-combo daemon

Research note for [ADR 0001: OTP-style supervision](../0001-otp-supervision.md).
It maps each OTP supervision concept to a concrete equivalent in the existing
Bun/TypeScript daemon (`src/daemon/`). Closed [PR #3](https://github.com/fulgidus/wombo-combo/pull/3)
proposed migrating the daemon to Elixir/OTP. This note does not adopt that
proposal. It asks what OTP semantics can be expressed in the in-TS daemon, and
where they cannot. The go/no-go decision lives in the ADR.

Vocabulary: wave, quest, task, agent, harness. An *agent* is one run of a
harness (opencode, claude-code, codex, pi, ...) on a task in its own worktree.
Existing terms are not renamed. Where OTP words are used they are marked as OTP.

## 1. Summary table

| OTP concept | Daemon equivalent today | Proposed supervision primitive |
|---|---|---|
| Supervisor | none; logic spread over `AgentRunner`, `Scheduler`, `Daemon` | `Supervisor` owning a set of children and one restart policy |
| Root supervisor | `Daemon` (`daemon.ts`) | root `Supervisor`; the `Scheduler` is its start policy |
| Child (worker) | one agent: async lifecycle plus harness child process | `ChildSpec` of type `worker` |
| Child spec | `AgentRunner.submit` arguments plus `config.defaults` | `ChildSpec` (section 3) |
| `one_for_one` | default today: an agent failure only affects that agent | default strategy |
| `rest_for_one` | `cancelDownstream`, `rescueChainPredecessors` | task dependency chain group |
| `one_for_all` | not present | quest-scoped group sharing a baseline or base branch |
| Restart intensity/period | `agent.retries < agent.maxRetries`, no period | `maxRestarts` within `periodMs`, escalation to parent |
| `permanent`/`transient`/`temporary` | implicit in each recovery path | explicit `restart` field |
| Shutdown timeout / brutal kill | `monitor.remove` sends SIGTERM only; `killAll` on forced shutdown | `shutdown: { timeoutMs }` then SIGKILL |
| Link | process exit callback (`onComplete`, `onError`) | link between agent and its child process |
| Monitor / `DOWN` | `evt:agent-status-change` and friends over WebSocket | monitor, delivered as an event |

## 2. Supervisor

An OTP supervisor owns children, starts them in order, restarts them according
to a strategy, and gives up (terminates itself) when restarts exceed an
intensity limit, which its parent then handles.

Today no such object exists. The behaviour is split:

- `AgentRunner` (`agent-runner.ts`, about 2.4k lines) launches, monitors,
  verifies, merges and retries, using callbacks from `ProcessMonitor`
  (`onComplete`, `onError`).
- `Scheduler` (`scheduler.ts`) decides which tasks start and when.
- `Daemon` (`daemon.ts`) runs startup reconciliation (`reconcileOrphanedTasks`,
  `reconcileVerifiedAgents`) and shutdown.

Proposed tree:

```
Daemon (root supervisor, strategy one_for_one)
 |- Scheduler policy            (start policy: what to start, how many at once)
 |- merge queue                 (serialized worker, permanent)
 |   '- conflict resolver       (serialized with merges, same queue)
 |- quest group  (one_for_all)  one per active quest with a baseline / base branch
 |   |- chain group (rest_for_one)   tasks linked by depends_on sharing a worktree
 |   |   '- agent ... (transient)
 |   '- agent ... (transient)
 '- ungrouped agents (transient)
```

The root supervisor is the daemon itself. Its parent is the operator: the CLI or
TUI client (or a process manager). Escalation past the root means the daemon
exits and the startup reconciliation path restores state.

### The scheduler is the root supervisor's start policy

OTP supervisors start a fixed child list. `DynamicSupervisor` starts children on
demand. The wombo daemon is the second kind: the `Scheduler` picks ready tasks
(dependency readiness, priority, concurrency pinning, file-scope overlap, team
claims) and submits them. So the scheduler is not a supervisor. It is the
policy deciding *when* a child spec is handed to the supervisor. Restart
decisions after the start belong to the supervisor, not the scheduler. Today the
scheduler also re-queues (`queued` status, "Re-queuing stuck retry"), which
blurs that line. See the recovery map for the full list.

## 3. Child spec

OTP child spec fields and their daemon equivalents:

| Field | OTP meaning | Daemon equivalent |
|---|---|---|
| `id` | unique within the supervisor | task id (`featureId`); also used for the branch `feature/<id>` and worktree |
| `start` | `{M, F, A}` that starts and links the child | `AgentRunner.doLaunch(featureId, task)`: create worktree, install deps, spawn harness via `launcher.ts`, register with `ProcessMonitor` |
| `restart` | `permanent`, `transient`, `temporary` | see section 5 |
| `shutdown` | timeout in ms or `brutal_kill` | see section 6 |
| `type` | `worker` or `supervisor` | `worker` for an agent, `supervisor` for a quest or chain group |

### A child is an agent run

A child is the pair *async task plus harness child process*:

- the async part is `doLaunch`, then the verification and merge pipeline
  (`handleBuildVerification`, `attemptMerge`) driven by callbacks;
- the process part is the harness process tracked by `ProcessMonitor`, with a
  `pid` on `InternalAgentState`.

The child's state is the `AgentStatus` value (`queued`, `installing`,
`running`, `completed`, `in_review`, `verified`, `failed`, `merged`, `retry`,
`resolving_conflict`). It already persists atomically through `DaemonState`,
which is what lets supervision survive a daemon restart (OTP children do not
survive their supervisor).

### The merge queue and conflict resolver are serialized children

`enqueueMerge` (`src/lib/merger.ts`) is a promise-chain mutex. Merges and the
tiered conflict resolution (tier 3, 3.5, 4) mutate the base branch checkout in
the project root, so exactly one may run at a time. Model both as a single
`worker` child with concurrency 1, started by the root supervisor and `permanent`
in spirit: if it fails, the failed item is reported to the agent that submitted
it, and the queue itself keeps running (its tail already swallows rejections).
The conflict resolver does not get its own queue. It runs inside the merge
section, as `attemptMerge` does today.

## 4. Restart strategies

### one_for_one

Only the failed child is restarted. This is the current behaviour for
independent tasks: an agent that fails and retries does not touch its peers.
It stays the default strategy and the default for the root.

### rest_for_one

The failed child and every child started after it restart (or, here, are
cancelled). The task dependency chain maps directly. Tasks linked by
`depends_on` that share a worktree form an ordered list. When one fails
permanently:

- `DaemonState.cancelDownstream(failedFeatureId)` marks later members failed
  ("Dependency ... failed — downstream cancelled");
- `AgentRunner.rescueChainPredecessors` merges the most recent `verified`
  predecessor so finished earlier work is not stranded.

OTP's `rest_for_one` restarts the later children rather than cancelling them.
The honest mapping: today's behaviour is `rest_for_one` with the later children
set to `temporary` semantic (terminated, not restarted), plus a rescue step
that has no OTP counterpart. A supervised chain group would make the choice
explicit per group.

### one_for_all

Any failure restarts all siblings. It applies to a quest-scoped group whose
members share an invalidatable resource:

- the quest test baseline (`.wombo-combo/baselines/<quest>/tests.json`,
  captured once and reused by retries);
- the quest base branch `quest/<id>`, which every task of the quest branches from
  and merges into.

If the baseline is lost or the quest base branch is reset, agents in flight
verify against a stale reference, so the group should be stopped and re-queued
together. Today `handleRetry` just fails the single agent when the baseline is
unavailable ("retry blocked"). `one_for_all` is rare and should be opt-in, only
for these shared-resource failures. It must not be triggered by an ordinary
agent failure.

## 5. Restart intensity, period, and escalation

OTP: if more than `max_restarts` restarts occur in `max_seconds`, the supervisor
terminates all children and itself, and its parent applies its own strategy.

Today there is a counter but no period and no parent:

- `agent.retries < agent.maxRetries` (`config.defaults.maxRetries`, overridable
  by `CmdStart.maxRetries`) in `onError`, build verification, and
  `retryAgent`;
- past the limit the agent becomes `failed`, which implicitly "escalates" by
  calling `cancelDownstream`.

Proposed: each `Supervisor` takes `{ maxRestarts, periodMs }`. Per-agent
`maxRetries` becomes the intensity of the agent's own tiny supervision scope
(period unbounded, so behaviour is unchanged by default). Group supervisors get a
real window so that a quest whose agents keep failing stops burning tokens:
the group gives up, marks its remaining agents failed, and reports to its parent
(root), which keeps the daemon running and leaves the quest `failed` for the
operator. Defaults must reproduce today's behaviour; the period is additive.

Escalation chain: agent (child) -> chain group -> quest group -> root ->
operator (via `evt:error`/`evt:log` and the failed status in the TUI).

## 6. Restart types

| Type | OTP | Daemon use |
|---|---|---|
| `permanent` | always restarted | merge queue; the scheduler loop; WebSocket server |
| `transient` | restarted only after abnormal exit | agent: a clean `completed`/`merged` ends it, a crash (`onError`, verification error, build failure) restarts it with `handleRetry` |
| `temporary` | never restarted | cancelled downstream agents; agents the operator cancelled (`cmd:cancel-agent`) or skipped (`cmd:skip-task`) |

"Abnormal exit" must be defined by the monitor: non-zero exit, harness error
event, verification or merge failure. A user cancel is a normal exit (`temporary`
semantics), not a crash, so it must not consume restart intensity.

## 7. Shutdown semantics

OTP terminates children in reverse start order, giving each `shutdown` ms to
exit on its own after a `shutdown` signal, then `brutal_kill`.

Today:

- `Daemon.shutdown(reason, force)` stops the scheduler, and only with `force`
  calls `runner.killAll()`; without it, agents run on to completion;
- `ProcessMonitor.remove` sends `SIGTERM` and never escalates to `SIGKILL`;
- `uncaughtException` triggers a forced shutdown;
- there is no ordering: agents are killed in map order.

Proposed child `shutdown` values:

| Child | Shutdown |
|---|---|
| agent (harness process) | `{ timeoutMs }`: SIGTERM, wait, then SIGKILL on the process group |
| merge queue | `{ timeoutMs }`: let the running merge finish (an interrupted merge leaves git state dirty), do not start the next |
| group supervisor | stops its children in reverse start order, then returns |

Ordered shutdown: stop the scheduler (no new starts), then stop quest and
chain groups' agents in reverse start order, drain or time-box the merge queue
last (agents may still be waiting to merge), flush state, close the server.
Reverse order matters for chains: stop the latest member first so a predecessor
is not rescued against a half-stopped successor.

## 8. Links versus monitors

- **Link**: bidirectional; if one side dies the other is signalled. Daemon
  equivalent: the agent async task and its harness process. Process exit drives
  `onComplete`/`onError`; the reverse direction is `monitor.remove` killing the
  process. A supervised agent should treat the pair as one link: if the async
  task is abandoned, the process is killed, and vice versa. Today a rejected
  verification promise is caught per call site (`.catch(...)` after
  `handleBuildVerification`) rather than by the link.
- **Monitor**: unidirectional observation delivering a `DOWN` message. The
  WebSocket protocol is the monitor channel to clients. `evt:agent-status-change`
  with a terminal status (`failed`, `merged`) is the `DOWN` message;
  `evt:merge-result` and `evt:build-result` carry the reason. Clients monitor
  the daemon and never link to it: a crashing TUI must not take down agents.
  Supervision observability can be added as new optional event types or
  optional fields on existing payloads. Protocol changes must stay additive so
  older clients keep working: no existing message or field is removed or
  retyped.

## 9. Limits of the model in single-threaded JS

The mapping is a discipline, not an equivalent runtime. State the limits plainly:

1. **No isolated heaps.** All agents, the scheduler, state and the merge queue
   share one V8 heap in one thread. A "process" here is a supervised async task
   plus a child process. Only the child process (the harness) is truly isolated.
   One agent's bug can corrupt shared in-memory state, and nothing prevents it.
2. **An unhandled throw cannot be contained.** An exception in a callback with no
   catch, or an unhandled rejection, is not scoped to a child. Today
   `uncaughtException` forces a daemon shutdown. A supervisor can only contain
   errors it can see: rejections of promises it awaits, and exit events of
   processes it owns.
3. **A stuck event loop cannot be contained.** A synchronous loop or long
   `execSync` call (used in `agent-runner.ts`) blocks every agent, the
   WebSocket server and any would-be supervisor timers. There is no preemption.
   Supervision of the daemon itself has to live outside it (the CLI launcher or
   a process manager restarting the daemon, with startup reconciliation).
4. **Cancellation is cooperative.** A promise cannot be killed. Cancelling an
   agent means killing its process and making the async task observe that
   (abort signal or status check). Late callbacks from a removed process must
   be ignored, which `ProcessMonitor` already does.
5. **Merges and conflict resolution share git state and must stay serialized.**
   They check out and merge on the project root. Restart strategies must never
   run two in parallel, even when `one_for_all` restarts a quest group. The
   serialized merge queue is a hard constraint, not a policy choice.
6. **Restart intensity is wall-clock only.** There is no scheduler fairness
   guarantee, so timing windows are approximate under load.

The consequence for the ADR: supervision in TS raises the floor for recovery
(one place, explicit policy, bounded restarts), but only a process boundary
(harness processes, or a separate daemon process) gives real fault containment.
That is the argument the Elixir comparison has to weigh.

## 10. Proposed TypeScript shape

Types only. Nothing here is implemented, and nothing under `src/` changes in this
task. The prototype (a separate task) lives under `spikes/otp-supervision/`.

```ts
/** Restart strategy of a Supervisor (OTP names kept; they are not wombo terms). */
type RestartStrategy = "one_for_one" | "one_for_all" | "rest_for_one";

/** permanent: always; transient: only after abnormal exit; temporary: never. */
type RestartType = "permanent" | "transient" | "temporary";

/** How a child ends: a signal, then a hard kill. */
type ShutdownPolicy =
  | { kind: "timeout"; timeoutMs: number } // graceful, then SIGKILL
  | { kind: "brutal_kill" };

/** Why a child exited; "normal" never counts against restart intensity. */
type ExitReason =
  | { kind: "normal" }                        // completed / merged
  | { kind: "cancelled"; by: "operator" | "dependency" | "supervisor" }
  | { kind: "crash"; error: string }          // harness error, verify or merge failure
  | { kind: "shutdown" };                     // supervisor-initiated stop

/** Handle to a running child: async task plus optional harness process. */
interface ChildHandle {
  readonly id: string;
  readonly pid: number | null;
  /** Resolves when the child exits; never rejects. */
  readonly exited: Promise<ExitReason>;
  /** Ask the child to stop; resolves once it is gone. */
  stop(policy: ShutdownPolicy): Promise<void>;
}

interface ChildSpec {
  /** Unique within the supervisor; for an agent this is the task id. */
  id: string;
  /** Starts the child (for an agent: worktree, deps, harness spawn). */
  start: () => Promise<ChildHandle>;
  restart: RestartType;
  shutdown: ShutdownPolicy;
  type: "worker" | "supervisor";
}

interface RestartIntensity {
  /** Restarts allowed within periodMs before the supervisor gives up. */
  maxRestarts: number;
  periodMs: number;
}

/** Notification delivered to monitors (maps to WebSocket events). */
interface DownMessage {
  childId: string;
  reason: ExitReason;
  restarted: boolean;
  at: string; // ISO timestamp
}

interface SupervisorSpec {
  id: string;
  strategy: RestartStrategy;
  intensity: RestartIntensity;
  /** Ordered: start order is shutdown order reversed (rest_for_one uses it). */
  children: ChildSpec[];
}

interface Supervisor {
  readonly id: string;
  /** Start children in order; resolves when all are started. */
  start(): Promise<void>;
  /** Add a child at runtime (the scheduler's start policy calls this). */
  startChild(spec: ChildSpec): Promise<ChildHandle>;
  /** Stop one child without restarting it; a normal exit. */
  terminateChild(id: string): Promise<void>;
  which(): ReadonlyArray<{ id: string; pid: number | null; restarts: number }>;
  /** Observe child exits (the monitor); returns an unsubscribe function. */
  monitor(listener: (msg: DownMessage) => void): () => void;
  /**
   * Fires once when intensity is exceeded. The supervisor has already stopped
   * all its children; the parent applies its own strategy.
   */
  onGiveUp(listener: (reason: { id: string; restarts: number }) => void): () => void;
  /** Reverse-start-order shutdown of all children, then the supervisor. */
  stop(): Promise<void>;
}
```

## 11. Open questions for the ADR

- Whether a chain group sharing a worktree restarts later members or keeps
  today's cancel-and-rescue (section 4).
- Which failures count as abnormal for `transient` agents, and whether
  conflict-resolution failures count against the agent's intensity.
- Where `maxRestarts`/`periodMs` live in `config.json` without changing
  defaults (additive config keys only).
- Whether any supervision event needs a new protocol type, or optional fields on
  `evt:agent-status-change` are enough.
