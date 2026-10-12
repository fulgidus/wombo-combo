# Staying in TypeScript/Bun versus the Elixir/OTP daemon (closed PR #3)

Research note for [ADR 0001](../0001-otp-supervision.md). Question: should the
daemon get OTP-style supervision inside the existing Bun/TS process, or should
it be rewritten on the BEAM as closed PR #3 proposed?

## 1. What PR #3 proposed

PR #3 ("feat: Elixir daemon migration spec", closed 2026-10-11, no comments,
no review discussion) added a spec and a small Elixir skeleton. It was never
merged. The PR text was read with `gh pr view 3` and `gh pr diff 3`.

- `.hermes/plans/2026-04-17_164949_elixir-daemon-port.md` (928 lines): a six
  phase port plan with a TS-to-Elixir module mapping. Phases: protocol and
  state, scheduler, agent runner, command dispatch, git/supporting modules,
  and a TS client adapter.
- `plans/ELIXIR_DAEMON_SPEC.md` (40 lines): a shorter spec. BEAM daemon with a
  top-level supervisor, a dynamic wave supervisor spawning one `AgentProcess`
  per task, an inactivity monitor (300s auto-shutdown), ETS plus SQLite
  (Ecto) persistence, hot code reloading, and a stateless Bun CLI over Unix
  domain sockets.
- `woco_daemon/`: a `mix` project with a working application, UDS server and
  inactivity monitor (about 280 lines of Elixir). `wave.ex` and
  `wave_supervisor.ex` were empty files. It also committed a `daemon.log`.

Notable proposals that change the client boundary: transport moves from
WebSocket to JSON-RPC 2.0 over a UDS (WebSocket deferred to "v2"); the TS
`DaemonClient` gets a transport abstraction; git, merge, verify and agent
spawning become `System.cmd` / `Port` wrappers.

The plan's size table is stale. It lists `agent-runner.ts` at 1511 lines and
`daemon.ts` at 837; they are now 2378 and 949. Any estimate taken from it
understates the port.

## 2. Migration cost

Measured at this commit (`wc -l`):

| Area | Files | Lines |
|------|-------|-------|
| `src/daemon/` total | 13 | 7172 (incl. `fake-agent-runner.ts` separately: 238 in `src/lib/`) |
| `agent-runner.ts` | 1 | 2378 |
| `daemon.ts` | 1 | 949 |
| `state.ts` | 1 | 733 |
| `scheduler.ts` | 1 | 670 |
| `protocol.ts` / `client.ts` / `launcher.ts` | 3 | 447 / 430 / 307 |
| `src/lib` modules the plan ports (worktree, merger, verifier, prompt, monitor, launcher, tasks, dependency-graph, token-usage, hitl-channel) | 10 | 6074 |
| Daemon-focused tests (`tests/daemon-*.test.ts`) | 9 | 5930 |
| All of `src/` | 229 `.ts`/`.tsx` | about 95.5k |

Port surface under PR #3's own module map: about 7.2k lines of daemon code
plus 6.1k lines of `src/lib` it depends on, so roughly 13k lines of TS to
re-express, plus about 5.9k lines of daemon tests that encode behaviour
(retry tiers, review stage, TDD baseline, quest scoping) which would have to
be re-derived as ExUnit tests. The daemon also pulls in helpers outside that
list (config loading, quest store, analytics tracker at 516 lines, replay
recorder, harness adapters under `src/lib/harness/`, 1383 lines), which the
plan does not map. I am not giving a person-hours figure: the repo has no
data to support one. The comparison that matters is relative: the in-TS
option touches `agent-runner.ts`, `daemon.ts` and `scheduler.ts` recovery
paths only; the port touches all of the above.

Other cost items:

- **Build and release.** Today: `bun scripts/build.ts` produces
  `dist/index.js` and `dist/daemon/daemon.js`; `package.json` `files` ships
  TS sources and `bin` is `./src/index.ts`; `release.yml` runs on a version
  bump and publishes to npm and GitHub Releases; CI pins bun 1.4.2. A BEAM
  daemon needs a mix release (or escript) per platform, Erlang/Elixir in CI,
  and a way to get the artifact to `bun add -g wombo-combo` users. npm
  `files` cannot carry a per-OS BEAM release without platform packages or a
  postinstall download, neither of which exists in this pipeline.
- **Dependencies.** PR #3 adds Elixir deps (`jason`, `yaml-elixir`, Ecto and
  SQLite). The quest rules forbid new dependencies and other runtimes in the
  repo build, so adopting it means changing that policy first.
- **Duplicated logic.** Config parsing, YAML quirks (null vs empty list),
  task schema and dependency graph exist in TS for the CLI. The BEAM daemon
  would reimplement them and both copies must stay in lockstep, or the
  daemon must shell out to the CLI.

## 3. Risk

- **Parity regressions.** The daemon has accreted behaviour: tiered merge
  conflict resolution (`merger.ts`, 1046 lines), review stage, TDD gates,
  quest-scoped launching, harness routing. PR #3 itself proposes porting
  only merge tiers 1-2 first, which would be a regression.
- **Dual runtime in CI.** `ci.yml` is one bun toolchain. A port adds an
  Elixir/OTP matrix leg, a second lockfile (`mix.lock`), and e2e tests that
  start a BEAM daemon from a bun test.
- **Install friction.** Users run `bun add -g wombo-combo` and get a TS
  package. Requiring Erlang/Elixir, or shipping a prebuilt release per
  platform, is a large step up. Windows support is untested either way.
- **Dogfooding.** wombo develops itself with its daemon. A half-ported
  daemon during the migration puts the development loop at risk.
- **Skeleton maturity.** The PR's skeleton covered transport and idle
  shutdown, the easy parts; the supervision tree (`wave_supervisor.ex`) was
  empty, so the headline benefit was not demonstrated.
- **Risk in the in-TS option.** It is lower but real: a supervisor in the
  same process cannot contain a bug that corrupts shared in-memory state or
  blocks the event loop (section 5).

## 4. The CLI/TUI boundary

The TS CLI/TUI stays in either option, so the question is what must remain
stable and what a BEAM daemon would reimplement.

**Must stay stable** (all `src/daemon/protocol.ts`, 447 lines):

- The JSON envelope `{ type, payload, seq, ts }` and `PROTOCOL_VERSION`
  (currently 1). `daemon.ts` rejects a handshake whose version differs, so
  any non-additive change locks out older clients. Quest knowledge already
  requires additive-only changes.
- The `Cmd*` / `Evt*` types: 29 interfaces, including `EvtStateSnapshot`,
  `EvtAgentStatusChange`, `EvtError`. The TUI renders from these.
- `launcher.ts` conventions: `daemon.pid`, port-based health check, and a
  detached spawn of `bun run <daemon entry>`. A BEAM daemon needs a
  different spawn path and probably a different health check.
- `client.ts` reconnect behaviour (states `disconnected`, `connecting`,
  `connected`, `reconnecting`) and typed command helpers.

**What a BEAM daemon must reimplement:** a WebSocket server (or the UDS
transport PR #3 proposes, which then forces a `DaemonTransport` abstraction
in `client.ts` and a second code path in `launcher.ts`), handshake and
sequence numbering, the command dispatch switch in `daemon.ts`, the full
snapshot-on-connect and event broadcast, and `getDaemonHealthStatus`. PR #3's
move to JSON-RPC 2.0 is not additive: it replaces the envelope, so older
clients would break unless both framings are served.

**State ownership.** `state.ts` currently owns persistence: it writes
`daemon-state.json` atomically (temp file then `renameSync`, state version 1)
and broadcasts changes. PR #3 gives ownership to ETS plus SQLite (Ecto) in the
spec, but the longer plan says to keep the same JSON file for backward
compatibility. The two documents disagree. Either way the CLI reads some of
this state directly (status, tasks, quests under `.wombo-combo/`), so a second
writer with a different format would need a migration and a single-writer
rule.

## 5. What OTP gives versus what wombo needs

| OTP property | Real in BEAM | In-process TS supervision | Does wombo need it? |
|--------------|--------------|---------------------------|---------------------|
| Isolation | Per-process heaps; a crash cannot corrupt another process | None for memory; isolation is per async task and per child process; an exception is containable, a hung sync call or OOM is not | Mostly no: agents are external CLI processes (claude, codex, opencode, ...), already isolated by the OS. What can fail in-process is the runner's own bookkeeping |
| Scheduling | Preemptive, per-process reductions | Cooperative event loop; one long synchronous section stalls every agent's monitoring and the WebSocket | Partly: work is mostly I/O waiting on children and git. The risk is sync git/fs calls, which can be moved to async |
| Supervision | Built in: restart strategies, intensity, `link`/`monitor` | Must be built (the spike prototype does this in a few hundred lines) | Yes: this is the actual gap, since recovery is spread over ad hoc counters |
| Hot code reload | Yes | No | No: the daemon is short-lived per project, restarted on upgrade; running agents are separate processes and survive a daemon restart through reconciliation |
| Failure signals | Exit reasons delivered to linked processes | Promise rejections and child exit codes, which `monitor.ts` already parses | Equivalent for this workload |

Merges and conflict resolution touch shared git state and must be serialized
in both options; BEAM does not remove that constraint, it only makes the
queue a GenServer instead of a promise chain.

The point is that the properties unique to the BEAM (heap isolation,
preemption, hot reload) target problems wombo does not have today. The
property wombo lacks, structured supervision, is a semantics problem and is
portable.

## 6. Recommendation

**No-go on the Elixir migration (PR #3 stays closed). Go on bringing OTP
supervision semantics into the TS daemon**, starting with the narrow
primitives the spike prototype shows (supervisor, restart type, intensity
and period escalation) and applied first to the retry/recovery paths in
`agent-runner.ts`, `daemon.ts` and `scheduler.ts`, without changing defaults
or the protocol.

Reasons, in order of weight:

1. The value gap is supervision semantics, which are portable; the BEAM-only
   features are not needed (section 5).
2. Cost is asymmetric: about 13k lines and 5.9k lines of tests to port versus
   targeted changes to three modules.
3. Distribution: the whole product ships as a bun-installed TS package; a BEAM
   daemon breaks that model and the "no other runtimes in the build" rule.
4. The boundary survives unchanged only in the in-TS option; PR #3's UDS and
   JSON-RPC proposal is a breaking protocol change.

### How this could be wrong

- **Single-process limits bite.** If real failures turn out to be event-loop
  stalls or memory growth in the daemon (many concurrent agents with large
  output buffers), in-process supervision cannot contain them. Signal: daemon
  restarts caused by the daemon itself, not by agents. Mitigation to try
  first: run risky units in child processes or workers, which is still TS.
- **Supervision built by hand may be subtly wrong.** OTP's strength is that it
  is mature. A homegrown supervisor can miss edge cases (shutdown ordering,
  restart storms). The prototype's tests are the check; keep it small.
- **Scale changes the calculus.** If wombo becomes a long-running multi-tenant
  service with remote TUIs and hundreds of agents, a BEAM daemon starts to
  pay off. Nothing in the current objectives (per-developer daemons) says so.
- **The cost numbers are line counts, not effort.** A rewrite might be
  cheaper than line counts suggest if much of the TS is boilerplate, and the
  in-TS refactor costlier because `agent-runner.ts` is entangled.
- **Distribution could improve.** If Bun-compiled single binaries or a
  BEAM release could be shipped through npm platform packages, install
  friction drops. Re-check that before reversing.
- **PR #3 was read only as a spec.** It was closed without review comments,
  so the reasons for closing are unknown; this note does not assume the
  author agrees.

Reversal trigger worth recording in the ADR: daemon-process failures
(not agent failures) recurring after supervision lands.
