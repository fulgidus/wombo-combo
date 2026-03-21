## Why

On every daemon boot, `Scheduler.start()` unconditionally overwrites `state.maxConcurrent`
with `config.defaults.maxConcurrent` (typically `3`) because the freshly constructed
`Scheduler` instance has `concurrencyPinned = false`. This happens **before** the TUI
connects — so any concurrency value the user previously persisted (e.g. infinite burst = `0`)
is silently reset on every daemon restart.

The `concurrencyPinned` flag was designed to prevent repeated overwrites during a single
daemon session (e.g. from the file-watcher calling `start()` again), but it does nothing
to protect the **persisted** value loaded from `daemon-state.json` on boot, because the
flag starts at `false` and the first `start()` call always wins.

## What Changes

- `Daemon.start()` in `daemon.ts`: after `state.load()`, set `scheduler.concurrencyPinned = true`
  when the persisted state file existed and was successfully loaded (i.e. a meaningful
  `maxConcurrent` is already in `state` and must not be overwritten by the config default).
- `DaemonState`: expose a boolean `wasLoaded` (or equivalent) so `Daemon.start()` can
  detect whether persisted state was found, OR use the simpler approach of checking whether
  the loaded `maxConcurrent` differs from the hard-coded `defaultSchedulerState()` default.

**Preferred minimal fix:** Add a `stateLoaded: boolean` field to `DaemonState` that is set
to `true` inside `load()` when a valid state file is found. In `Daemon.start()`, after
calling `state.load()`, conditionally set `this.scheduler.concurrencyPinned = state.stateLoaded`.
This means: if we loaded persisted state, concurrency is already pinned (the user's last value
is preserved); if we start fresh, the config default applies normally.

## Capabilities

### Modified Capabilities
- `scheduler-concurrency-pinning`: Extend the pinning guarantee to cover daemon boot when
  persisted state is present. The user's last-set `maxConcurrent` survives daemon restarts
  just as it survives Scheduler re-triggers within a session.

## Impact

- `src/daemon/state.ts` — `load()` and `stateLoaded` flag
- `src/daemon/daemon.ts` — `start()`: set `concurrencyPinned` based on `state.stateLoaded`
- Tests: `tests/daemon-scheduler.test.ts` — add scenario for concurrency surviving daemon boot
  with persisted state
