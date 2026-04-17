# Wombo-Combo Elixir Daemon Port — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Port the wombo-combo daemon core from TypeScript/Bun to Elixir/OTP, keeping the TS CLI/TUI as client.

**Architecture:** Elixir daemon handles scheduling, agent lifecycle, state persistence, and inter-process communication via Unix Domain Socket (JSON-RPC 2.0). The existing TS CLI/TUI connects as a client. Git operations (worktree, merge, branch) are invoked as shell commands from Elixir (System.cmd / Port). The TS client-side code (DaemonClient) gains a UDS transport adapter alongside the existing WebSocket transport.

**Tech Stack:** Elixir 1.18+, OTP 27, jason, cowboy/bandit (optional for WS), Unix Domain Sockets (:gen_tcp), ETS for in-memory state, JSON-RPC 2.0 protocol.

---

## Current State (What exists)

### TS Source (~50K LOC in src/)

**Daemon core (src/daemon/) — the porting target:**
| File | Lines | Purpose |
|------|-------|---------|
| daemon.ts | 837 | Main daemon: WS server, command dispatch, lifecycle |
| agent-runner.ts | 1511 | Agent lifecycle: worktree→launch→monitor→verify→merge |
| scheduler.ts | 514 | Continuous DAG scheduler with tick loop |
| state.ts | 632 | DaemonState: ETS-like in-memory + disk persistence |
| client.ts | 430 | WS client library (stays in TS) |
| protocol.ts | 416 | Typed message envelopes, command/event maps |
| launcher.ts | 303 | Daemon spawn/status/stop from CLI side |
| pid-utils.ts | 43 | PID file checks |

**Supporting lib (src/lib/) — shell-cmd ports from Elixir:**
| Key files | Total LOC | Purpose |
|-----------|-----------|---------|
| worktree.ts | 658 | Git worktree CRUD |
| merger.ts | 1000 | Branch merge + tiered conflict resolution |
| verifier.ts | 284 | Build verification |
| prompt.ts | 776 | Agent prompt generation |
| monitor.ts | 755 | ProcessMonitor (child process tracking) |
| launcher.ts (lib) | 680 | Agent process spawning |
| tasks.ts | 666 | Task file I/O + filtering |
| dependency-graph.ts | 572 | DAG building + topological sort |
| token-usage.ts | 294 | Usage tracking |
| hitl-channel.ts | 272 | Human-in-the-loop Q&A |

### Elixir Skeleton (woco_daemon/) — what already exists:
| File | Lines | Status |
|------|-------|--------|
| application.ex | 22 | Working: starts InactivityMonitor + UdsServer + DynamicSupervisor |
| uds_server.ex | 143 | Working: UDS accept loop with controlling_process fix |
| inactivity_monitor.ex | 105 | Working: client tracking + auto-shutdown timer |
| rpc.ex | 66 | Partial: ping/status/wave.start handlers only |
| wave.ex | 0 | Empty |
| wave_supervisor.ex | 0 | Empty |

---

## Porting Strategy

### Phase 1: Protocol & State Foundation
Port protocol types and state management first — everything else depends on these.

### Phase 2: Scheduler Core
Port the continuous DAG scheduler with its tick loop.

### Phase 3: Agent Runner
Port agent lifecycle management (the 1511-line beast). This is the hardest part. Split into sub-modules.

### Phase 4: Command Dispatch & RPC
Wire up all JSON-RPC commands to the scheduler and runner.

### Phase 5: Git Operations (Shell Commands)
Port worktree, merge, verify, launcher as thin Elixir wrappers around System.cmd.

### Phase 6: TS Client Adapter
Add UDS transport to the TS DaemonClient so `woco` CLI/TUI can talk to the Elixir daemon.

---

## Module Mapping: TS → Elixir

| TS Module | Elixir Module | Notes |
|-----------|---------------|-------|
| protocol.ts (types) | `WocoDaemon.Protocol.*` (structs) | Command/Event structs with Jason encoding |
| protocol.ts (constants) | `WocoDaemon.Protocol` | DEFAULT_WS_PORT, PROTOCOL_VERSION, etc. |
| state.ts | `WocoDaemon.DaemonState` | GenServer + ETS + disk persistence |
| scheduler.ts | `WocoDaemon.Scheduler` | GenServer with Process.send_after tick |
| agent-runner.ts | `WocoDaemon.AgentRunner` | Orchestrator GenServer |
| agent-runner.ts (lifecycle) | `WocoDaemon.AgentProcess` | DynamicSupervisor child per agent |
| daemon.ts (dispatch) | `WocoDaemon.Rpc` (extended) | JSON-RPC command handlers |
| daemon.ts (server) | `WocoDaemon.UdsServer` (extended) | Already exists, add WS later |
| config.ts | `WocoDaemon.Config` | JSON config loader |
| worktree.ts | `WocoDaemon.Git.Worktree` | System.cmd wrappers |
| merger.ts | `WocoDaemon.Git.Merger` | System.cmd wrappers |
| verifier.ts | `WocoDaemon.BuildVerifier` | System.cmd wrapper |
| launcher.ts (lib) | `WocoDaemon.AgentLauncher` | Port-based process spawning |
| monitor.ts | `WocoDaemon.ProcessMonitor` | Port monitoring |
| tasks.ts | `WocoDaemon.Tasks` | YAML file I/O (yaml-elixir dep) |
| dependency-graph.ts | `WocoDaemon.DepGraph` | DAG building + topo sort |
| prompt.ts | `WocoDaemon.Prompt` | Template generation |
| token-usage.ts | `WocoDaemon.TokenUsage` | Usage tracking |
| hitl-channel.ts | `WocoDaemon.HitlChannel` | File-based Q&A |

---

## Phase 1: Protocol & State Foundation

### Task 1.1: Create Protocol struct modules

**Objective:** Define Elixir structs for all command and event types from protocol.ts

**Files:**
- Create: `woco_daemon/lib/woco_daemon/protocol.ex`
- Create: `woco_daemon/lib/woco_daemon/protocol/commands.ex`
- Create: `woco_daemon/lib/woco_daemon/protocol/events.ex`
- Test: `woco_daemon/test/woco_daemon/protocol_test.exs`

**Step 1:** Create the base protocol module with constants and shared types:

```elixir
# lib/woco_daemon/protocol.ex
defmodule WocoDaemon.Protocol do
  @protocol_version 1
  @default_ws_port 19420
  @default_idle_timeout_ms 300_000
  @pid_file "daemon.pid"

  def protocol_version, do: @protocol_version
  def default_ws_port, do: @default_ws_port
  def default_idle_timeout_ms, do: @default_idle_timeout_ms
  def pid_file, do: @pid_file

  @type scheduler_status :: :idle | :running | :paused | :stopping | :draining | :shutdown
  @type agent_status :: :queued | :installing | :running | :completed | :failed |
                        :verified | :merged | :cancelled | :resolving_conflict

  @type command_type :: :cmd_handshake | :cmd_start | :cmd_pause | :cmd_resume |
                        :cmd_stop | :cmd_kill | :cmd_pin_task | :cmd_skip_task |
                        :cmd_retry_agent | :cmd_cancel_agent | :cmd_hitl_answer |
                        :cmd_get_state | :cmd_set_concurrency | :cmd_shutdown

  @type event_type :: :evt_handshake_ack | :evt_state_snapshot | :evt_scheduler_status |
                      :evt_agent_status_change | :evt_agent_activity | :evt_agent_output |
                      :evt_hitl_question | :evt_build_result | :evt_merge_result |
                      :evt_task_picked | :evt_token_usage | :evt_log | :evt_shutdown |
                      :evt_error

  def make_command(type, payload, seq) do
    %{type: type, payload: payload, seq: seq, ts: DateTime.utc_now() |> DateTime.to_iso8601()}
  end

  def make_event(type, payload, seq) do
    %{type: type, payload: payload, seq: seq, ts: DateTime.utc_now() |> DateTime.to_iso8601()}
  end

  def parse_message(raw) when is_binary(raw) do
    case Jason.decode(raw) do
      {:ok, %{"type" => type, "seq" => seq} = parsed} when is_binary(type) and is_integer(seq) ->
        {:ok, parsed}
      {:ok, _} -> {:error, :invalid_format}
      {:error, _} -> {:error, :parse_error}
    end
  end
end
```

**Step 2:** Create command structs:

```elixir
# lib/woco_daemon/protocol/commands.ex
defmodule WocoDaemon.Protocol.Commands do
  defmodule Handshake do
    @enforce_keys [:protocol_version, :client_id]
    defstruct [:protocol_version, :client_id]
    @type t :: %__MODULE__{protocol_version: integer(), client_id: String.t()}
  end

  defmodule Start do
    defstruct [:quest_id, :max_concurrent, :model, task_ids: []]
    @type t :: %__MODULE__{
      quest_id: String.t() | nil,
      max_concurrent: integer() | nil,
      model: String.t() | nil,
      task_ids: [String.t()]
    }
  end

  defmodule PinTask do
    @enforce_keys [:task_id]
    defstruct [:task_id]
    @type t :: %__MODULE__{task_id: String.t()}
  end

  defmodule SkipTask do
    @enforce_keys [:task_id]
    defstruct [:task_id]
    @type t :: %__MODULE__{task_id: String.t()}
  end

  defmodule RetryAgent do
    @enforce_keys [:feature_id]
    defstruct [:feature_id]
    @type t :: %__MODULE__{feature_id: String.t()}
  end

  defmodule CancelAgent do
    @enforce_keys [:feature_id]
    defstruct [:feature_id]
    @type t :: %__MODULE__{feature_id: String.t()}
  end

  defmodule HitlAnswer do
    @enforce_keys [:feature_id, :question_id, :answer]
    defstruct [:feature_id, :question_id, :answer]
    @type t :: %__MODULE__{feature_id: String.t(), question_id: String.t(), answer: String.t()}
  end

  defmodule SetConcurrency do
    @enforce_keys [:max_concurrent]
    defstruct [:max_concurrent]
    @type t :: %__MODULE__{max_concurrent: integer()}
  end

  defmodule Shutdown do
    defstruct force: false
    @type t :: %__MODULE__{force: boolean()}
  end

  # No-payload commands
  defmodule Pause, do: defstruct []
  defmodule Resume, do: defstruct []
  defmodule Stop, do: defstruct []
  defmodule Kill, do: defstruct []
  defmodule GetState, do: defstruct []
end
```

**Step 3:** Create event structs:

```elixir
# lib/woco_daemon/protocol/events.ex
defmodule WocoDaemon.Protocol.Events do
  defmodule HandshakeAck do
    defstruct [:protocol_version, :daemon_pid, :uptime]
    @type t :: %__MODULE__{protocol_version: integer(), daemon_pid: integer(), uptime: integer()}
  end

  defmodule StateSnapshot do
    defstruct [:scheduler, :agents, :uptime]
    @type t :: %__MODULE__{scheduler: map(), agents: [map()], uptime: integer()}
  end

  defmodule SchedulerStatus do
    defstruct [:status, :reason]
    @type t :: %__MODULE__{status: atom(), reason: String.t() | nil}
  end

  defmodule AgentStatusChange do
    defstruct [:feature_id, :previous_status, :new_status, :detail]
    @type t :: %__MODULE__{
      feature_id: String.t(),
      previous_status: atom(),
      new_status: atom(),
      detail: String.t() | nil
    }
  end

  defmodule AgentActivity do
    defstruct [:feature_id, :activity]
  end

  defmodule AgentOutput do
    defstruct [:feature_id, :data]
  end

  defmodule HitlQuestion do
    defstruct [:feature_id, :question_id, :question_text]
  end

  defmodule BuildResult do
    defstruct [:feature_id, :passed, :output, :conflict_tier]
  end

  defmodule MergeResult do
    defstruct [:feature_id, :success, :error]
  end

  defmodule TaskPicked do
    defstruct [:task_id, :queue_position]
  end

  defmodule TokenUsage do
    defstruct [:feature_id, :input_tokens, :output_tokens, :total_tokens, :cost]
  end

  defmodule Log do
    defstruct [:level, :message, :data]
    @type level :: :debug | :info | :warn | :error
  end

  defmodule Shutdown do
    defstruct [:reason, :forced]
  end

  defmodule Error do
    defstruct [:command_type, :command_seq, :message, :code]
  end
end
```

**Step 4:** Write tests for protocol struct creation and parsing.

**Step 5:** Run `mix test`, verify all pass, commit.

---

### Task 1.2: Create DaemonState GenServer

**Objective:** Port DaemonState from TS to Elixir GenServer with ETS + disk persistence.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/daemon_state.ex`
- Test: `woco_daemon/test/woco_daemon/daemon_state_test.exs`

The DaemonState GenServer manages:
- Scheduler state (status, max_concurrent, model, quest_id, pinned/skipped tasks, counters)
- Agent state map (feature_id → InternalAgentState)
- State subscribers (listeners that get events on mutation)
- Disk persistence (atomic write to daemon-state.json)

Key API:
```elixir
# Client API
DaemonState.start_link(project_root)
DaemonState.get_scheduler_status()
DaemonState.set_scheduler_status(status, reason)
DaemonState.get_scheduler_state() → %SchedulerState{}
DaemonState.get_max_concurrent()
DaemonState.set_max_concurrent(n)
DaemonState.get_all_agents() → [InternalAgentState]
DaemonState.get_agent(feature_id) → InternalAgentState | nil
DaemonState.get_active_agents() → [InternalAgentState]
DaemonState.get_ready_agents() → [InternalAgentState]
DaemonState.create_agent(task) → InternalAgentState
DaemonState.update_agent_status(feature_id, new_status, detail)
DaemonState.retry_agent(feature_id) → boolean
DaemonState.pin_task(task_id)
DaemonState.unpin_task(task_id)
DaemonState.skip_task(task_id)
DaemonState.is_skipped(task_id) → boolean
DaemonState.available_slots() → integer
DaemonState.all_complete() → boolean
DaemonState.subscribe(listener_pid)
DaemonState.unsubscribe(listener_pid)
DaemonState.flush()  # persist to disk
DaemonState.load()   # load from disk
```

Internal implementation:
- Two ETS tables: `:scheduler_state` and `:agents`
- Subscribers stored as a map of pid → monitor ref in GenServer state
- On every mutation: broadcast event to all subscribers, mark dirty
- Periodic flush (every 5s) via Process.send_after
- Atomic disk write: write to temp file, then File.rename

**Step 1:** Write failing tests for DaemonState API.
**Step 2:** Implement DaemonState GenServer.
**Step 3:** Run tests, verify pass.
**Step 4:** Commit.

---

### Task 1.3: Create Config loader

**Objective:** Port WomboConfig loader from TS to Elixir.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/config.ex`
- Test: `woco_daemon/test/woco_daemon/config_test.exs`

Reads `.wombo-combo/config.json`, merges with defaults, validates.

```elixir
defmodule WocoDaemon.Config do
  @default_base_branch "main"
  @default_build_command "bun run build"
  @default_build_timeout 300_000
  @default_install_command "bun install"
  @default_install_timeout 120_000
  @default_branch_prefix "feature/"
  @default_remote "origin"

  defstruct [
    :project_root,
    tasks_dir: "tasks",
    archive_dir: "archive",
    base_branch: @default_base_branch,
    build: %{command: @default_build_command, timeout: @default_build_timeout, artifact_dir: "dist"},
    install: %{command: @default_install_command, timeout: @default_install_timeout},
    git: %{branch_prefix: @default_branch_prefix, remote: @default_remote, merge_strategy: "--no-ff"},
    defaults: %{},
    agents: %{},
    max_escalation: "tier3"
  ]

  @type t :: %__MODULE__{...}

  def load(project_root) :: {:ok, t} | {:error, term}
  def validate(config) :: :ok | {:error, term}
end
```

**Step 1:** Write tests with sample config.json fixtures.
**Step 2:** Implement Config.load/1 and validate/1.
**Step 3:** Run tests.
**Step 4:** Commit.

---

### Task 1.4: Add yaml-elixir dependency and create Tasks module

**Objective:** Port task file I/O from tasks.ts to Elixir.

**Files:**
- Modify: `woco_daemon/mix.exs` (add yaml-elixir dep)
- Create: `woco_daemon/lib/woco_daemon/tasks.ex`
- Create: `woco_daemon/lib/woco_daemon/task.ex` (Task struct)
- Test: `woco_daemon/test/woco_daemon/tasks_test.exs`

Key API:
```elixir
WocoDaemon.Tasks.load_features(project_root, config) :: {:ok, FeaturesData} | {:error, term}
WocoDaemon.Tasks.load_tasks_file(project_root, config) :: {:ok, [Task]} | {:error, term}
WocoDaemon.Tasks.save_task(project_root, config, task) :: :ok | {:error, term}
WocoDaemon.Tasks.sort_by_priority_then_effort(tasks) :: [Task]
WocoDaemon.Tasks.are_dependencies_met(task, done_ids) :: boolean
WocoDaemon.Tasks.get_done_task_ids(data, archive) :: MapSet.t()
```

**Step 1:** Add `{:yaml_elixir, "~> 2.11"}` to deps in mix.exs.
**Step 2:** Define Task struct with all fields from TS Task type.
**Step 3:** Implement YAML parsing with null→[] normalization (same quirk as TS).
**Step 4:** Write tests with sample tasks.yml fixtures.
**Step 5:** Run tests.
**Step 6:** Commit.

---

## Phase 2: Scheduler Core

### Task 2.1: Create DepGraph module

**Objective:** Port DAG building and topological sort from dependency-graph.ts.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/dep_graph.ex`
- Test: `woco_daemon/test/woco_daemon/dep_graph_test.exs`

Key API:
```elixir
WocoDaemon.DepGraph.build(tasks) :: {:ok, graph} | {:error, :cycle_detected}
WocoDaemon.DepGraph.validate(graph) :: {:ok, graph} | {:error, term}
WocoDaemon.DepGraph.build_schedule_plan(graph) :: schedule_plan
```

**Step 1:** Write tests for cycle detection, topo sort, parallel level calculation.
**Step 2:** Implement using :digraph (Erlang stdlib).
**Step 3:** Run tests.
**Step 4:** Commit.

---

### Task 2.2: Create Scheduler GenServer

**Objective:** Port the continuous DAG scheduler from scheduler.ts.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/scheduler.ex`
- Test: `woco_daemon/test/woco_daemon/scheduler_test.exs`

The scheduler:
1. Runs a tick loop via Process.send_after (default 3s)
2. On each tick: load tasks from disk, pick ready tasks, submit to AgentRunner
3. Respects pinned tasks (jump queue), skipped tasks, max concurrency
4. Transitions: running↔paused↔stopping↔idle
5. Stops tick timer when idle, restarts on nudge

```elixir
defmodule WocoDaemon.Scheduler do
  use GenServer

  # Client API
  def start_link(opts)
  def start(scheduler)          # Start tick loop
  def pause(scheduler)         # Pause: running agents continue
  def resume(scheduler)         # Resume from paused
  def stop(scheduler)           # Graceful stop
  def kill(scheduler)           # Force kill all agents
  def shutdown(scheduler)       # Stop tick loop entirely
  def nudge(scheduler)          # Trigger immediate tick
  def pin_task(scheduler, task_id)
  def skip_task(scheduler, task_id)
  def retry_agent(scheduler, feature_id)
  def set_concurrency(scheduler, n)
  def concurrency_pinned(scheduler)  # Get pin status
  def set_concurrency_pinned(scheduler, val)

  # Internal
  defp tick(state)              # Single tick cycle
  defp get_candidate_tasks(state)
  defp prioritize(ready_queued, candidates, slots)
  defp submit_new_task(task, state)
end
```

**Step 1:** Write failing tests for scheduler lifecycle (start/pause/resume/stop).
**Step 2:** Implement basic scheduler with tick loop and task picking.
**Step 3:** Add concurrency control, pinning, skipping.
**Step 4:** Add stopping/draining/idle transitions.
**Step 5:** Run all tests.
**Step 6:** Commit.

---

## Phase 3: Agent Runner

This is the 1511-line monster. Split into focused sub-modules.

### Task 3.1: Create AgentProcess (single agent lifecycle)

**Objective:** GenServer managing one agent from submit to merge.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/agent_process.ex`
- Test: `woco_daemon/test/woco_daemon/agent_process_test.exs`

Each AgentProcess is a DynamicSupervisor child representing one running agent:
- Creates worktree (via Git.Worktree)
- Generates prompt (via Prompt module)
- Spawns agent process (via AgentLauncher)
- Monitors child process (via ProcessMonitor)
- On completion: run build verification (via BuildVerifier)
- On verify pass: queue merge (via Git.Merger)
- On failure: retry if retries remain
- Reports all state changes to DaemonState

```elixir
defmodule WocoDaemon.AgentProcess do
  use GenServer

  defstruct [
    :feature_id, :task, :config, :project_root,
    :worktree_path, :branch, :pid, :port_ref,
    :status, :retries, :max_retries,
    :build_output, :started_at, :completed_at
  ]

  def start_link(opts)
  def submit_task(task, config, project_root)  # Create + start
  def launch(feature_id)                        # Start the actual agent
  def kill(feature_id)                          # Kill the agent process
  def get_state(feature_id)
end
```

**Step 1:** Write tests for agent lifecycle (submit→running→completed).
**Step 2:** Implement with mocked git commands initially.
**Step 3:** Run tests.
**Step 4:** Commit.

---

### Task 3.2: Create Git.Worktree module

**Objective:** Port worktree.ts as System.cmd wrappers.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/git/worktree.ex`
- Test: `woco_daemon/test/woco_daemon/git/worktree_test.exs`

```elixir
defmodule WocoDaemon.Git.Worktree do
  def create(project_root, feature_id, config) :: {:ok, worktree_path} | {:error, term}
  def remove(project_root, worktree_path, branch) :: :ok | {:error, term}
  def worktree_path(project_root, feature_id, config) :: String.t()
  def feature_branch_name(feature_id, config) :: String.t()
  def install_deps(worktree_path, config) :: {:ok, output} | {:error, term}
end
```

**Step 1:** Write integration tests (require git repo).
**Step 2:** Implement System.cmd wrappers.
**Step 3:** Run tests in a temp git repo fixture.
**Step 4:** Commit.

---

### Task 3.3: Create Git.Merger module

**Objective:** Port merger.ts tiered merge conflict resolution.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/git/merger.ex`
- Create: `woco_daemon/lib/woco_daemon/git/conflict_hunks.ex`
- Test: `woco_daemon/test/woco_daemon/git/merger_test.exs`

This is the biggest lib module (1000 lines). Key API:
```elixir
defmodule WocoDaemon.Git.Merger do
  def merge_branch(project_root, branch, config) :: {:ok, :merged} | {:error, term}
  def merge_base_into_feature(worktree_path, base_branch) :: {:ok, :merged} | {:conflict, conflicts} | {:error, term}
  def enqueue_merge(feature_id) :: :ok
  def can_merge?() :: boolean
  def tiered_merge_base_into_feature(worktree, base, max_tier) :: tier_result
  def start_rebase_strategy(worktree, base) :: {:ok, :rebase_started} | {:error, term}
  def continue_rebase(worktree) :: {:ok, :continued} | {:conflict, conflicts} | {:error, term}
  def abort_rebase(worktree) :: :ok
end
```

Tier escalation: Tier 1 (auto-merge) → Tier 2 (ours+theirs analysis) → Tier 3 (AI resolution) → Tier 3.5 → Tier 4 (full rebase).

**Step 1:** Write tests for Tier 1 (clean merge).
**Step 2:** Implement Tier 1 + 2.
**Step 3:** Write tests for Tier 3+ (AI-assisted).
**Step 4:** Implement remaining tiers.
**Step 5:** Commit after each tier.

---

### Task 3.4: Create BuildVerifier module

**Objective:** Port verifier.ts build verification.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/build_verifier.ex`
- Test: `woco_daemon/test/woco_daemon/build_verifier_test.exs`

```elixir
defmodule WocoDaemon.BuildVerifier do
  def run_build(worktree_path, config) :: {:ok, output} | {:error, output, exit_code}
  def run_full_verification(worktree_path, config) :: {:ok, result} | {:error, term}
end
```

**Step 1:** Write tests.
**Step 2:** Implement with System.cmd.
**Step 3:** Commit.

---

### Task 3.5: Create AgentLauncher module

**Objective:** Port launcher.ts agent process spawning.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/agent_launcher.ex`
- Test: `woco_daemon/test/woco_daemon/agent_launcher_test.exs`

Launches coding agents (claude, codex, etc.) as Port processes:
```elixir
defmodule WocoDaemon.AgentLauncher do
  def launch_headless(worktree_path, prompt, config) :: {:ok, pid} | {:error, term}
  def retry_headless(worktree_path, prompt, session_id, config) :: {:ok, pid} | {:error, term}
  def launch_conflict_resolver(worktree_path, prompt, config) :: {:ok, pid} | {:error, term}
  def is_process_running?(pid) :: boolean
end
```

**Step 1:** Write tests with mock commands.
**Step 2:** Implement using Port.open with :nouse_stdio.
**Step 3:** Commit.

---

### Task 3.6: Create ProcessMonitor module

**Objective:** Port monitor.ts for tracking child processes.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/process_monitor.ex`

Wraps Port monitoring: detect child exits, capture output, report to AgentProcess.

---

### Task 3.7: Create Prompt module

**Objective:** Port prompt.ts for generating agent prompts from tasks.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/prompt.ex`

Generates prompt text from task definition + context. Template-based, no AI calls.

---

### Task 3.8: Create AgentRunner orchestrator

**Objective:** Port the agent-runner.ts orchestration layer.

**Files:**
- Create: `woco_daemon/lib/woco_daemon/agent_runner.ex`
- Test: `woco_daemon/test/woco_daemon/agent_runner_test.exs`

The AgentRunner coordinates:
- submit_task → creates AgentProcess under DynamicSupervisor
- launch_agent → tells AgentProcess to start
- kill_all → terminates all running agents
- reconcile_orphaned_tasks → reset in_progress → planned
- reconcile_verified_agents → re-trigger merge pipeline
- reap_dead_processes → detect zombie ports

```elixir
defmodule WocoDaemon.AgentRunner do
  use GenServer

  def start_link(opts)
  def submit_task(task) :: :ok
  def launch_agent(feature_id) :: :ok
  def kill_all() :: :ok
  def reconcile_orphaned_tasks() :: :ok
  def reconcile_verified_agents() :: :ok
  def reap_dead_processes() :: :ok
  def destroy() :: :ok
end
```

**Step 1:** Write tests for submit/launch/kill lifecycle.
**Step 2:** Implement with DynamicSupervisor.
**Step 3:** Add orphan reconciliation.
**Step 4:** Commit.

---

## Phase 4: Command Dispatch & RPC

### Task 4.1: Extend RPC module with all command handlers

**Objective:** Wire all JSON-RPC commands to Scheduler + AgentRunner.

**Files:**
- Modify: `woco_daemon/lib/woco_daemon/rpc.ex`
- Test: `woco_daemon/test/woco_daemon/rpc_test.exs`

Map JSON-RPC methods to Elixir calls:
```
"handshake"        → WocoDaemon.Protocol handshake + send snapshot
"start"            → WocoDaemon.Scheduler.start
"pause"            → WocoDaemon.Scheduler.pause
"resume"           → WocoDaemon.Scheduler.resume
"stop"             → WocoDaemon.Scheduler.stop
"kill"             → WocoDaemon.Scheduler.kill
"pin_task"          → WocoDaemon.Scheduler.pin_task
"skip_task"         → WocoDaemon.Scheduler.skip_task
"retry_agent"       → WocoDaemon.Scheduler.retry_agent
"cancel_agent"      → WocoDaemon.Scheduler.cancel_agent
"hitl_answer"       → WocoDaemon.HitlChannel.submit_answer
"get_state"         → WocoDaemon.DaemonState.get_state + respond
"set_concurrency"   → WocoDaemon.Scheduler.set_concurrency
"shutdown"          → System.stop
```

**Step 1:** Write tests for each command.
**Step 2:** Implement all handlers.
**Step 3:** Commit.

---

### Task 4.2: Extend UdsServer with event broadcasting

**Objective:** Wire UdsServer to broadcast DaemonState events to all clients.

**Files:**
- Modify: `woco_daemon/lib/woco_daemon/uds_server.ex`

When DaemonState emits an event (agent status change, scheduler status, etc.),
UdsServer must forward it as a JSON-RPC notification to all connected clients.

```elixir
# In UdsServer, subscribe to DaemonState events
def handle_info({:daemon_event, event_type, payload}, state) do
  notification = %{"jsonrpc" => "2.0", "method" => "evt:#{event_type}", "params" => payload}
  json = Jason.encode!(notification)
  for {_id, socket} <- state.clients do
    :gen_tcp.send(socket, json <> "\n")
  end
  {:noreply, state}
end
```

**Step 1:** Write test for event broadcasting.
**Step 2:** Implement.
**Step 3:** Commit.

---

### Task 4.3: Update Application supervisor tree

**Objective:** Wire all new GenServers into the application supervision tree.

**Files:**
- Modify: `woco_daemon/lib/woco_daemon/application.ex`

```elixir
children = [
  {WocoDaemon.DaemonState, project_root: project_root},
  {WocoDaemon.AgentRunner, [project_root: project_root, config: config]},
  {WocoDaemon.Scheduler, [project_root: project_root, config: config]},
  {WocoDaemon.InactivityMonitor, timeout: 300_000},
  WocoDaemon.UdsServer,
  {DynamicSupervisor, name: WocoDaemon.AgentSupervisor, strategy: :one_for_one}
]
```

**Step 1:** Update application.ex.
**Step 2:** Verify daemon starts with `mix run --no-halt`.
**Step 3:** Commit.

---

## Phase 5: Supporting Modules

### Task 5.1: Create HitlChannel module
**Files:** Create `woco_daemon/lib/woco_daemon/hitl_channel.ex`
Port hitl-channel.ts file-based Q&A mechanism.

### Task 5.2: Create TokenUsage module
**Files:** Create `woco_daemon/lib/woco_daemon/token_usage.ex`
Port token-usage.ts JSONL append-only logging.

### Task 5.3: Create PidUtils module
**Files:** Create `woco_daemon/lib/woco_daemon/pid_utils.ex`
Port pid-utils.ts PID file management.

### Task 5.4: Create DaemonLauncher module
**Files:** Create `woco_daemon/lib/woco_daemon/daemon_launcher.ex`
Port launcher.ts (daemon-side): ensure_running, start, stop, health.

---

## Phase 6: TS Client Adapter

### Task 6.1: Add UDS transport to DaemonClient

**Objective:** Make the TS CLI/TUI able to connect via Unix socket.

**Files:**
- Modify: `src/daemon/client.ts` (add UDS transport option)
- Create: `src/daemon/uds-transport.ts`
- Modify: `src/commands/citty/daemon.ts` (detect Elixir daemon)

The TS DaemonClient currently uses WebSocket. Add a transport abstraction:

```typescript
interface DaemonTransport {
  connect(): Promise<void>;
  send(data: string): void;
  close(): void;
  onMessage(handler: (data: string) => void): void;
  onStateChange(handler: (state: ConnectionState) => void): void;
}

class WebSocketTransport implements DaemonTransport { ... }  // existing
class UdsTransport implements DaemonTransport { ... }        // new
```

The UDS transport connects to `/tmp/woco_daemon.sock` and speaks JSON-RPC 2.0
(line-delimited JSON over the socket).

Detection logic: when `woco daemon start` is called, check if the Elixir
daemon is available (check for the .sock file or try the WS port first,
then fall back).

**Step 1:** Define DaemonTransport interface.
**Step 2:** Refactor WebSocket code into WebSocketTransport.
**Step 3:** Implement UdsTransport using net.connect.
**Step 4:** Add auto-detection logic.
**Step 5:** Test with the Elixir daemon running.
**Step 6:** Commit.

---

## Risks & Tradeoffs

1. **Git operations via System.cmd** — No native Elixir git bindings. System.cmd is
   synchronous and may block the GenServer. Mitigation: wrap in Task.async for
   long-running operations (merge, rebase).

2. **Agent spawning via Port** — Agents (claude, codex) run as external processes.
   Must use Port.open for proper monitoring. Port has a 65K output buffer limit —
   need to drain output promptly or use :nouse_stdio + file-based output.

3. **YAML parsing edge cases** — The TS code has workarounds for yaml library quirks
   (null→[] normalization). Must replicate these in the Elixir parser.

4. **Merge conflict resolution** — The tiered escalation (1000 lines) is complex.
   Consider porting only Tier 1-2 initially and adding AI-assisted tiers later.

5. **Protocol compatibility** — The TS client and Elixir daemon must speak the same
   protocol. Start with JSON-RPC 2.0 over UDS (already sketched). Can add WebSocket
   later for remote access.

6. **State persistence format** — The TS daemon uses daemon-state.json. The Elixir
   version should use the same format for backward compatibility (read old TS state
   files). Use Jason.encode with :pretty option for debugging.

## Open Questions

- Should we keep WebSocket as a secondary transport (for remote TUI), or go
  UDS-only for v1? (Recommendation: UDS-only for v1, add WS in v2.)
- Should the Elixir daemon read the same `.wombo-combo/` directory as the TS
  daemon, or use a separate state directory? (Recommendation: same directory,
  read-compatible.)
- Agent spawning: the TS daemon uses Bun.spawn with raw child processes. In
  Elixir, Port.open or System.cmd. Which for agents? (Recommendation: Port.open
  for long-lived agents, System.cmd for short git operations.)

---

## Verification Checklist

After all phases complete:
- [ ] `mix test` passes (all Elixir tests)
- [ ] `mix run --no-halt` starts daemon without errors
- [ ] UDS client can connect, handshake, receive state snapshot
- [ ] Scheduler can pick tasks and launch agents
- [ ] Agent lifecycle: worktree→launch→verify→merge works end-to-end
- [ ] TS `woco` CLI can connect to Elixir daemon via UDS
- [ ] TS `woco status` shows correct scheduler + agent state
- [ ] TS `woco launch --dry-run` works via Elixir daemon
