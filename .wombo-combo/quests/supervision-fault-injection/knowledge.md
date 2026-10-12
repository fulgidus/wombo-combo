Planning caveat: at planning time the supervision code does not exist in the tree.
The dependency quests (supervisor-core, agent-process-supervision,
wave-supervision-tree) deliver it. Test tasks must read the merged code first and
adapt names. Strategies are one_for_one, one_for_all and rest_for_one. Restart types
are permanent, transient and temporary. supervisor-core provides injected clocks and
timers, typed events (child_started, child_exited, child_restarted,
supervisor_escalated), a snapshot() and an ordered, timeout-bounded shutdown.

Conventions for this quest:
- All resilience tests live in tests/resilience/ and import shared helpers from
  tests/helpers/ (resilience-harness.ts, leak-check.ts, plus existing git-repo.ts,
  daemon-seed.ts and wait-for.ts). Do not duplicate helper logic; the harness is the
  only place that builds the tree.
- Fault scripting goes through FAKE_FAULT=<kind>[:arg]@<stage> directives parsed by
  src/lib/fake-agent-faults.ts, in the same way FAKE_SLEEP_MS works. The fake agent
  emits "[fake-agent] stage:<stage>" markers on stdout so tests wait on events, never
  sleeps. Time in supervisors advances only through the injected FakeClock.
- Every scenario ends with the leak check (processes, worktrees, branches, prunable
  worktree admin entries). A failing leak check kills survivors so later tests are not
  polluted.
- Bugs found: create a bug- task with `bun dev tasks add` (or a wishlist item) before
  adding any workaround, and reference its ID from the skipped/todo test.
- Never author or attribute anything as an AI tool (project rule 6).
- Merge-conflict hotspots are avoided by file ownership: fake-agent-fault-script owns
  fake-agent-runner.ts and fake-agent-faults.ts; resilience-ci-wiring owns ci.yml;
  chaos-smoke-scenario owns scripts/chaos-smoke.ts and the package.json scripts edit;
  each test task owns exactly one tests/resilience/*.test.ts file.
