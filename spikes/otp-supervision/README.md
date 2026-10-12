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
- `demo.ts` — crash isolation and escalation demo (owned by `otp-prototype-demo`).
- `*.test.ts` — tests (owned by `otp-prototype-demo`).

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
