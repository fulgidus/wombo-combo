# session-replay — knowledge

## Goal
Record each agent execution (prompt, normalized agent events, timestamps, final
worktree diff) into a versioned JSONL replay, and play it back in a TUI viewer
(timeline scrubbing, speed control, event detail, diff pane) and via
`woco replay list|show`.

## Format (src/lib/replay.ts, REPLAY_SCHEMA_VERSION = 1)
- Location: `.wombo-combo/replays/<feature-id>/<execution-id>.jsonl`
  (runtime artifact, gitignored; never inside an agent worktree).
  `<execution-id>` is the analytics execution id, so one file per agent
  execution including all of its ordinary retries (retries add `attempt`
  records, they never create files). A user rerun of a finished execution is a
  new execution and therefore a new file.
- One JSON object per line, every line `{ v: 1, seq, t, kind, ... }`:
  `t` = ISO timestamp, `seq` = monotonically increasing per file (recorder
  state; resumes after a daemon restart by counting existing lines).
- Kinds: `header` (first line: execution_id, task_id, quest_id, agent, model,
  wave_id, started_at), `prompt` (text, truncated flag), `attempt`
  (n, reason: start|retry, optional prompt text for retries), `event`
  (normalized agent event), `diff` (bounded unified diff + stat), `end`
  (outcome, detail). A reader tolerates a missing `end` (crash/kill) and a
  truncated last line.
- Normalized event (`ReplayEvent`): `{ type: "step_start"|"text"|"tool"|"step_finish"|"error"|"raw", tool?, status?, input?, output?, error?, text?, reason?, tokens? }`.
  OpenCode raw events are converted by `normalizeOpenCodeEvent` (the ONLY
  harness-specific function). Other harnesses (multi-cli-support quest) add a
  sibling normalizer; the recorder, store, CLI and viewer only see normalized
  events.
- Bounds: per-field truncation (outputs 8 KB, text 8 KB, tool input values
  2 KB, prompt 64 KB, diff 256 KB) with an explicit marker
  `…[truncated N bytes]` and `truncated: true`; per-file cap (default 8 MB):
  once reached further events are dropped except `end`, with one
  `raw` event marker "replay size limit reached".
- Writes: appendFileSync of whole lines (O_APPEND; one call per line so
  concurrent readers do not see partial lines except after a crash — the
  reader skips malformed lines and reports diagnostics).
- Retention (analytics has no pruning; we align by keying on the same execution
  ids and bounding growth): `pruneReplays` keeps the newest N executions per
  feature (default 20) and removes files older than a max age when given;
  run best-effort after an execution ends.

## Seams
- ProcessMonitor (src/lib/monitor.ts) gets a new optional callback
  `onEvent(featureId, event)` fired for every successfully parsed JSON event
  right after parsing; `onEvent` throwing must never break monitoring.
- Daemon recorder `ReplayRecorder` (src/daemon/replay-recorder.ts) mirrors
  AnalyticsTracker: subscribes to DaemonState status/removal observers, never
  throws into the execution path, reports through `onDiagnostic`. AgentRunner
  owns one instance, begins an execution after `analytics.allocate`, records
  the prompt in doLaunch, records attempts on retry launches, feeds monitor
  `onEvent`, and finalises (diff + end) on verified/failed/removal.
- Execution id comes from `agent.analytics.execution_id`.
- Diff: `git diff <baseline_head>` in the worktree (committed + uncommitted
  tracked changes) excluding `.wombo-combo` runtime paths (reuse
  isExcludedPath from analytics-git), bounded.

## File ownership (one task owns each file)
- replay-format-store: src/lib/replay.ts, tests/replay-store.test.ts, .gitignore, AGENTS.md
- replay-diff-capture: src/lib/replay-diff.ts, tests/replay-diff.test.ts
- replay-recorder-wiring: src/daemon/replay-recorder.ts, src/lib/monitor.ts (onEvent only), src/daemon/agent-runner.ts, tests/replay-recorder.test.ts, tests/replay-integration.test.ts
- replay-cli: src/commands/replay.ts, src/commands/citty/replay.ts, router.ts, src/lib/citty-registry.ts, tests/replay-command.test.ts
- replay-player-model: src/lib/replay-player.ts, tests/replay-player.test.ts
- replay-viewer-tui: src/ink/replay-viewer.tsx, tests/ink/replay-viewer.test.tsx
- replay-tui-integration: src/ink/run-task-browser.tsx, src/ink/task-browser.tsx (key + footer), tests/ink/replay-browser.test.tsx, docs

## Viewer decisions
- Pure playback engine (no timers): state {index, playing, speed}; a single
  interval in the view advances it by wall-clock * speed against recorded
  timestamps, with idle gaps compressed (max 2 s of recorded gap per step).
  The timer exists only while playing and is cleared on pause/unmount.
- Speeds 0.5x 1x 2x 4x 8x. Keys: left/right (h/l) step, up/down (j/k) move,
  PgUp/PgDn jump 10, g/G start/end, n/N next/prev tool or error event,
  space play/pause, +/- speed, d toggle diff pane, [ ] previous/next
  execution, esc/q close.
- Bounded rendering: only a window of timeline rows, detail pane clamped to
  available rows, diff clamped and scrollable; small terminals degrade.

## Conventions
Bun + strict TypeScript, extensionless ESM imports, bun:test, no new
dependencies, no global `wombo` binary (use `bun dev`). TUI tests use the
PassThrough stdin/stdout pattern (ink-testing-library is not installed).
Fake agents (`agent: fake-agent`) emit real step_start/tool_use/text/step_finish
JSON, so recording is deterministic in tests.
