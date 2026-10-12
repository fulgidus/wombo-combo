- src/lib/supervisor-core.ts does NOT exist; the first supervisor task creates
  it as a pure module. Transient policy: restart only on abnormal exit
  (crash, hang, verify failure); normal exit never restarts. maxRestarts is
  exactly config.defaults.maxRetries (set via setMaxRetries override at
  launch); agent.retries / agent.maxRetries remain the persisted, observable
  counters, and the tracker is rehydrated from them.
- The agent-runner.ts extraction tasks are chained with depends_on on purpose:
  they all rewrite the same file, so they must land serially. Target layout is
  src/daemon/runner/{conflict-resolution,merge-stage,verify-stage,spawn-monitor}.ts
  with AgentRunner as a thin facade that keeps its public API.
- Merge and conflict resolution mutate shared git state. They stay serialized
  behind one MergeQueue and are never restarted by the policy. Review-gate
  send-backs are not restarts either.
- Retry paths: monitor failure is buildCallbacks().onError, build failure is
  in handleBuildVerification. Both are isolated as onProcessFailed and
  onVerifyFailed before the policy is wired in.
- Retry feedback (review findings + verifier output) must be persisted via
  daemon state so restarts keep it. Protocol shapes and AgentStatus values
  must not change.
- The characterization suite
  (tests/daemon-agent-runner-retry-characterization.test.ts) is the safety
  net for every later task. Existing daemon tests must pass unchanged.
- Every task: run bun run typecheck, bun test, bun run build; commit with the
  task id in brackets; no AI attribution in commits or files.
