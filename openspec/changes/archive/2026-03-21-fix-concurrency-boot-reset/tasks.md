# Tasks: fix-concurrency-boot-reset

## Implementation

- [x] **state.ts**: Add `stateLoaded: boolean` field to `DaemonState`; initialize to `false` in
  constructor; set to `true` in `load()` when a valid state file is successfully parsed.

- [x] **daemon.ts**: In `Daemon.start()`, after `state.load()` and after creating
  `new Scheduler(...)`, add:
  ```ts
  if (this.state.stateLoaded) {
    this.scheduler.concurrencyPinned = true;
  }
  ```

- [x] **tests/daemon-scheduler.test.ts**: Add test verifying that when `DaemonState` is loaded
  with a persisted `maxConcurrent = 0`, calling `scheduler.start()` with `concurrencyPinned`
  pre-set to `true` does NOT overwrite the value.

## Verification

- [x] `bun run typecheck` — zero new errors
- [x] `bun test` — all existing tests pass (13 TUI snapshot failures are pre-existing and acceptable)
