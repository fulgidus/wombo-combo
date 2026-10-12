# OTP supervision spike (throwaway)

A throwaway prototype of an OTP-style supervisor in plain TypeScript/Bun, built
to answer one question for the `otp-supervision-spike` quest: is supervision
(child specs, restart strategies, restart intensity, escalation) expressible in
a few hundred lines of TS without new dependencies?

**It is not wired into the daemon.** Nothing under `src/` imports it, it
changes no daemon behaviour, and it is not part of `bun run build`. Delete the
directory when the ADR (`docs/adr/0001-otp-supervision.md`) is settled.

## Files

- `supervisor.ts` — the supervisor core (`Supervisor`, `ChildSpec`, `Clock`).
- `fakes.ts` — `FakeClock` (manual time) and `stubAgent` children that mimic the
  lifecycle of `src/lib/fake-agent-runner.ts` (that file is a CLI entry point that
  runs on import, so it cannot be imported).
- `demo.ts` — four-scenario timeline on virtual time: crash isolation
  (`one_for_one`), `rest_for_one`, restart-intensity escalation to a parent, and
  permanent / transient / temporary on normal exit and on crash.
- `*.test.ts` — tests on the fake clock, covering the four scenarios plus
  shutdown order and shutdown timeout.

## Run

```sh
bun spikes/otp-supervision/demo.ts
bun test spikes/otp-supervision
```

## Notes

- Strategies: `one_for_one`, `one_for_all`, `rest_for_one`. Restart types:
  `permanent`, `transient`, `temporary`.
- Restart intensity is `maxRestarts` within a sliding `periodMs`. When it is
  exceeded the supervisor stops its children (reverse start order, each bounded
  by `shutdownMs`), emits `intensity_exceeded` then `escalated`, calls
  `onEscalate`, and rejects `run()`.
- `supervisor.asChild(id)` makes a supervisor a child of a parent supervisor, so
  escalation crashes upward.
- Pass a fake `Clock` to make shutdown timeouts and intensity windows
  deterministic in tests.

## Supervisor changes

None. The demo and tests found no bug in `supervisor.ts`; it is unchanged.

## Observed behaviour

Output of one run of `bun spikes/otp-supervision/demo.ts`. Time is virtual, so
every run prints exactly this.

- Scenario 1: A restarts, B and C are never aborted.
- Scenario 2: `build` crashes; `test` is stopped and both restart in order;
  `plan` is untouched.
- Scenario 3: the inner supervisor tolerates 2 restarts, trips on the 3rd crash
  and escalates; the parent (`one_for_all`) restarts `sibling` and `inner`; the
  second escalation within the window exceeds the parent's own limit of 1, so
  the parent escalates too.
- Scenario 4: on normal exit only `permanent` restarts; on crash `permanent` and
  `transient` restart, `temporary` never does.
- Wart: per-child restart counters (`restart looper (#3)`) are not reset when a
  parent restarts a child supervisor; only the intensity window is. Cosmetic.

```
OTP supervision demo (virtual time, fake agents)

== 1. crash isolation (one_for_one)
   agent A crashes; B and C keep running
   t=   0ms [root] start     A
   t=   0ms [root] start     B
   t=   0ms [root] start     C
   t= 200ms -> injecting crash into A
   t= 200ms [root] CRASH     A: A: test run failed
   t= 200ms [root] start     A
   t= 200ms [root] restart   A (#1)
   t= 200ms B.aborts=0 C.aborts=0 (untouched), A.starts=2
   t= 200ms [root] exit      C
   t= 200ms [root] exit      B
   t= 200ms [root] exit      A

== 2. rest_for_one
   build depends on plan, test depends on build; build crashes, plan keeps running
   t=   0ms [root] start     plan
   t=   0ms [root] start     build
   t=   0ms [root] start     test
   t= 150ms -> injecting crash into build
   t= 150ms [root] CRASH     build: build: compile error
   t= 150ms [root] exit      test
   t= 150ms [root] start     build
   t= 150ms [root] restart   build (#1)
   t= 150ms [root] start     test
   t= 150ms [root] restart   test (#1)
   t= 150ms plan.aborts=0 (untouched), test.aborts=1 (restarted as a dependent)
   t= 150ms [root] exit      test
   t= 150ms [root] exit      build
   t= 150ms [root] exit      plan

== 3. restart-intensity escalation
   looper crash-loops; inner supervisor allows 2 restarts per 1000ms, then escalates to the parent (one_for_all, 1 restart per 1000ms)
   t=   0ms [parent] start     sibling
   t=   0ms [parent] start     inner
   t=   0ms [inner] start     looper
   t= 100ms [inner] CRASH     looper: boom
   t= 100ms [inner] start     looper
   t= 100ms [inner] restart   looper (#1)
   t= 200ms [inner] CRASH     looper: boom
   t= 200ms [inner] start     looper
   t= 200ms [inner] restart   looper (#2)
   t= 300ms [inner] CRASH     looper: boom
   t= 300ms [inner] INTENSITY exceeded: 3 restarts > 2 in 1000ms
   t= 300ms [inner] ESCALATE  restart intensity exceeded: more than 2 restarts in 1000ms
   t= 300ms [parent] CRASH     inner: restart intensity exceeded: more than 2 restarts in 1000ms
   t= 300ms [parent] exit      sibling
   t= 300ms [parent] start     sibling
   t= 300ms [parent] restart   sibling (#1)
   t= 300ms [parent] start     inner
   t= 300ms [parent] restart   inner (#1)
   t= 300ms [inner] start     looper
   t= 400ms [inner] CRASH     looper: boom
   t= 400ms [inner] start     looper
   t= 400ms [inner] restart   looper (#3)
   t= 500ms [inner] CRASH     looper: boom
   t= 500ms [inner] start     looper
   t= 500ms [inner] restart   looper (#4)
   t= 600ms [inner] CRASH     looper: boom
   t= 600ms [inner] INTENSITY exceeded: 3 restarts > 2 in 1000ms
   t= 600ms [inner] ESCALATE  restart intensity exceeded: more than 2 restarts in 1000ms
   t= 600ms [parent] CRASH     inner: restart intensity exceeded: more than 2 restarts in 1000ms
   t= 600ms [parent] INTENSITY exceeded: 2 restarts > 1 in 1000ms
   t= 600ms [parent] exit      sibling
   t= 600ms [parent] ESCALATE  restart intensity exceeded: more than 1 restarts in 1000ms
   t= 600ms parent gave up: restart intensity exceeded: more than 1 restarts in 1000ms

== 4. permanent vs transient vs temporary
   round A: all three exit normally; round B (fresh supervisor): all three crash
   t=   0ms [A] start     permanent
   t=   0ms [A] start     transient
   t=   0ms [A] start     temporary
   t= 100ms [A] exit      permanent
   t= 100ms [A] exit      transient
   t= 100ms [A] exit      temporary
   t= 100ms [A] start     permanent
   t= 100ms [A] restart   permanent (#1)
   t= 100ms [A] starts: permanent=2 transient=1 temporary=1
   t= 100ms [A] exit      permanent
   t= 100ms [B] start     permanent
   t= 100ms [B] start     transient
   t= 100ms [B] start     temporary
   t= 200ms [B] CRASH     permanent: permanent: crashed
   t= 200ms [B] CRASH     transient: transient: crashed
   t= 200ms [B] CRASH     temporary: temporary: crashed
   t= 200ms [B] start     permanent
   t= 200ms [B] restart   permanent (#1)
   t= 200ms [B] start     transient
   t= 200ms [B] restart   transient (#1)
   t= 200ms [B] starts: permanent=2 transient=2 temporary=1
   t= 200ms [B] exit      transient
   t= 200ms [B] exit      permanent
```
