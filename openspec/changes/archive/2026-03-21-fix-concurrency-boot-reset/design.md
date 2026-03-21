## Problem Trace

### State loading sequence (daemon boot)

```
DaemonState.constructor()
  → this.scheduler = defaultSchedulerState()   // maxConcurrent: 4

DaemonState.load()
  → reads daemon-state.json
  → this.scheduler = parsed.scheduler           // e.g. maxConcurrent: 0 (user's value)
  // BUT: stateLoaded not tracked

new Scheduler(config, deps)
  → concurrencyPinned = false

Daemon.start()
  → state.load()      // maxConcurrent is now 0 from disk
  → new Scheduler()   // concurrencyPinned = false
  → scheduler.start()
      → concurrencyPinned is false
      → effectiveConcurrency = config.defaults.maxConcurrent = 3
      → state.setMaxConcurrent(3)    ← OVERWRITES user's 0
      → concurrencyPinned = true
```

### Why `concurrencyPinned` doesn't protect persisted state

The flag was designed to prevent **within-session** overwrites (task-watcher calling `start()`
a second time). But every daemon boot constructs a fresh `Scheduler` with `concurrencyPinned = false`,
so the first `start()` always runs the config-default path — regardless of what was persisted.

### The TUI sequence that triggers the visible symptom

```
1. Previous session: user sets concurrency = 0 → persisted to daemon-state.json
2. Daemon restarts (or fresh boot)
3. state.load() → maxConcurrent = 0 (restored from disk)
4. scheduler.start() → concurrencyPinned=false → overwrites to 3
5. TUI connects → sees maxConcurrent = 3
6. User presses C → maxConcurrent back to 0
7. User presses A → tasks planned → nudge → tick → max=0 → OK
   (but user had to press C again, manually, every boot)
```

## Solution

### Minimal, surgical fix

Add `stateLoaded: boolean` to `DaemonState`. Set it to `true` inside `load()` when a valid
state file is parsed. In `Daemon.start()`, after `state.load()`, conditionally mark
`scheduler.concurrencyPinned = state.stateLoaded`.

```
Daemon.start()
  → state.load()                               // sets stateLoaded = true if file found
  → scheduler.concurrencyPinned = state.stateLoaded   // pin if restored from disk
  → scheduler.start()
      → concurrencyPinned is TRUE (if loaded)
      → if (!this.concurrencyPinned) branch is SKIPPED
      → maxConcurrent remains 0 (user's persisted value)
```

### Why this is correct

- **Fresh boot** (no state file): `stateLoaded = false` → `concurrencyPinned = false` →
  config default applies normally (correct first-run behaviour).
- **Boot with existing state**: `stateLoaded = true` → `concurrencyPinned = true` →
  the user's last value is preserved (correct persistence behaviour).
- **Within-session re-triggers** (`start()` from watcher): `concurrencyPinned` is already
  `true` regardless → no change (existing behaviour preserved).
- **`cmd:set-concurrency`** → calls `scheduler.setConcurrency(n)` → sets both the value
  and `concurrencyPinned = true` → still respected.

### What does NOT change

- No change to tick logic, launch queue, or agent runner.
- No change to `cmd:set-concurrency` path.
- No change to `initialMaxConcurrent` / scheduler-rebuild path (that fix stays).
- The `concurrencyPinned` field remains public and its semantics are the same.

## Files Changed

| File | Change |
|------|--------|
| `src/daemon/state.ts` | Add `stateLoaded: boolean` field; set to `true` in `load()` on success |
| `src/daemon/daemon.ts` | In `start()`, after `state.load()`, set `this.scheduler.concurrencyPinned = this.state.stateLoaded` |
| `tests/daemon-scheduler.test.ts` | Add test: boot with persisted `maxConcurrent=0` → start() → still `0` |
