The supervision library lives in src/lib/supervision/ and is a standalone, dependency-free module. It must not import anything from the rest of the repo, and it is not wired into the daemon in this quest.

Core model:
- A child is an abortable handle: ChildHandle { exit: Promise<ExitReason>; abort() }. exit never rejects; it resolves with { kind: "normal" } | { kind: "shutdown" } | { kind: "crash", error }.
- ChildSpec { id, start(ctx), restart: permanent | transient | temporary, shutdownTimeoutMs }.
- Supervisor strategies are one_for_one, one_for_all and rest_for_one. Stops happen in reverse start order and starts in forward start order, as in Erlang/OTP.
- Restart intensity is a sliding window (maxRestarts per periodMs). When exceeded, the supervisor stops its children, emits supervisor_escalated, and resolves its own `exit` with crash(SupervisorEscalation). A parent supervisor treats that as a child crash, so supervisors nest via Supervisor.childSpec(id, factory).
- Time and randomness are injected (Clock, random). tests/helpers/fake-clock.ts provides a deterministic FakeClock with advance and advanceAsync, which flushes microtasks.
- Supervisor.snapshot() returns a plain JSON-serializable tree (state, per-child state, attempt, restart count, last exit, nested supervisors) so observability can render it later.
- Events (typed emitter): child_started, child_exited, child_restarted, supervisor_escalated.
- File ownership is disjoint: types/clock (sup-types), tests/helpers/fake-clock.ts (sup-fake-clock), events.ts, backoff.ts + intensity.ts, strategies.ts, shutdown.ts, supervisor.ts (+ optional child-state.ts), and index.ts and docs (sup-index-docs). Never edit another task's files except for a minimal bug fix in sup-strategy-tests.
