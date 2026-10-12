---
title: Supervision
description: How OTP-style supervision maps onto the wombo-combo daemon, and what the design spike decided.
---

:::note
**Status: design spike, no behaviour change yet.** Nothing described here
changes how the daemon runs today.
:::

Supervision is about who restarts what when an agent fails. Today recovery is
spread over `agent-runner.ts`, `daemon.ts` and `scheduler.ts`: retry counters,
stale-agent reconciliation at startup, and scheduler requeues. Each path
decides for itself whether to retry, cascade to dependent tasks, or give up.

The Erlang/OTP model gives that a single shape: a supervisor owns a set of
children, applies a restart strategy when one exits abnormally, and escalates to
its parent when restarts exceed a limit. The spike asked how much of that fits
the existing Bun/TypeScript daemon.

## OTP terms in daemon terms

| OTP | Daemon |
|---|---|
| Supervisor | the daemon (root) and per-quest or per-chain groups |
| Child | one agent: an async lifecycle plus its harness process |
| Child spec | task id, launch function, restart type, shutdown policy |
| `one_for_one` | an agent failure only affects that agent (today's default) |
| `rest_for_one` | a failed task cancels the later tasks in its `depends_on` chain |
| `one_for_all` | a quest group restarts together when its baseline or base branch is lost |
| Restart intensity | `maxRetries`, plus an optional time window |
| `transient` / `temporary` | restart after a crash / never restart (operator cancel) |
| Monitor | `agent-status-change` events delivered to clients over WebSocket |

## Outcome

**Go** for adding supervision semantics inside the TypeScript daemon, additively
and without changing defaults or the protocol; **no-go** for the Elixir/OTP
rewrite proposed in closed PR #3.

Merges and conflict resolution stay serialized, and JS isolation is at the level
of async tasks and harness processes, not memory.

## Further reading

- [ADR 0001: OTP-style supervision](https://github.com/fulgidus/wombo-combo/blob/main/docs/adr/0001-otp-supervision.md)
  for the decision, the comparison with Elixir, and the follow-up list.
- Throwaway prototype: `spikes/otp-supervision/`.
