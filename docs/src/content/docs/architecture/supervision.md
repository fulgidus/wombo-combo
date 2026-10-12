---
title: Supervision library
description: The standalone OTP-style supervision library in src/lib/supervision, its model, strategies, backoff and shutdown.
sidebar:
  order: 2
---

`src/lib/supervision/` is a small supervision library in pure TypeScript with
no dependencies. It knows nothing about agents, git or the daemon.

:::note
The library is standalone and **not yet wired into the daemon**. Nothing here
changes how the daemon runs today. For the design background see the
[Supervision guide](/guides/supervision/).
:::

Import everything through the barrel, `src/lib/supervision/index.ts`.

## Purpose

A supervisor starts a set of children, notices when one exits, and decides
whether to restart it, how long to wait, and when to give up and report the
failure to its own parent.

## Children

A child is described by a `ChildSpec` and, once running, represented by a
`ChildHandle`.

```ts
interface ChildSpec {
  id: string;
  start(ctx: ChildContext): ChildHandle | Promise<ChildHandle>;
  restart?: "permanent" | "transient" | "temporary"; // default "permanent"
  shutdownTimeoutMs?: number;                         // default 5000
}

interface ChildHandle {
  readonly exit: Promise<ExitReason>; // never rejects
  abort(reason?: unknown): void;
}

type ExitReason =
  | { kind: "normal" }
  | { kind: "shutdown" }
  | { kind: "crash"; error: unknown };
```

`ChildContext` carries an `AbortSignal`, the injected `clock` and the
`attempt` number. A failed `start()` is treated as a crash.

## Restart types

- `permanent`: always restarted, whatever the exit reason.
- `transient`: restarted only after a crash.
- `temporary`: never restarted.

`shouldRestart(restart, reason)` implements this table.

## Strategies

`planRestart` decides which children are stopped and started again when one
fails. Children are stopped in reverse start order and started in forward start
order.

- `one_for_one`: only the failed child is restarted.
- `one_for_all`: every child is stopped and restarted.
- `rest_for_one`: the failed child and the children started after it.

## Intensity and escalation

Restarts are counted in a sliding window (`IntensityTracker`): at most
`maxRestarts` per `periodMs` (default 3 per 5000 ms). When the limit is
exceeded, or a child fails to start, the supervisor stops its children, emits
`supervisor_escalated`, and resolves its own `exit` with a crash whose error is
a `SupervisorEscalation`. A parent treats that like any child crash, so
supervisors nest: `Supervisor.childSpec(id, factory)` builds a `ChildSpec` that
creates a fresh child supervisor on every start.

## Backoff

Before restart number `n`, the supervisor waits
`min(maxMs, initialMs * factor^(n-1))`, with optional symmetric `jitter`
(0 to 1) driven by an injected `random` function. Defaults: 100 ms initial,
5000 ms max, factor 2, no jitter. `computeBackoff` is the pure function. A child
that ran healthy for a while gets its attempt counter reset.

## Shutdown ordering

`supervisor.stop()` stops children one at a time in reverse start order
(`stopChildrenInOrder`). `stopChild` calls `abort()` and waits up to the
child's `shutdownTimeoutMs` on the injected clock. A child that does not exit
in time, or whose `abort()` throws, is reported as a forced crash and is not
waited for further; the remaining children are still stopped.

## Events

`supervisor.on(event, listener)` returns an unsubscribe function. Events are
typed by `SupervisorEvents`:

- `child_started`: `{ supervisor, childId, attempt }`
- `child_exited`: `{ supervisor, childId, reason }`
- `child_restarted`: `{ supervisor, childId, attempt, delayMs }`
- `supervisor_escalated`: `{ supervisor, reason }`

## Snapshot

`supervisor.snapshot()` returns a plain, JSON-serializable tree: supervisor
name, strategy, state, intensity, recent restart count, per-child state
(`starting`, `running`, `backoff`, `stopping`, `stopped`, `terminated`),
attempt, restart count and last exit, plus nested supervisors and the
escalation reason if any.

## Time and randomness

Time goes through the `Clock` interface (`systemClock` by default) and jitter
through a `random` option, so tests can drive everything with the fake clock in
`tests/helpers/fake-clock.ts`.

## Example

```ts
import { Supervisor, crash, type ChildSpec } from "../lib/supervision";

const worker: ChildSpec = {
  id: "worker",
  restart: "permanent",
  shutdownTimeoutMs: 2000,
  start: () => {
    const ac = new AbortController();
    const exit = runWork(ac.signal).then(
      () => ({ kind: "normal" as const }),
      (error) => crash(error),
    );
    return { exit, abort: () => ac.abort() };
  },
};

const sup = new Supervisor({
  name: "root",
  strategy: "one_for_one",
  intensity: { maxRestarts: 3, periodMs: 5000 },
  children: [worker],
});
sup.on("child_restarted", (e) => console.log(e.childId, e.delayMs));

await sup.start();
// ...
await sup.stop();
```
