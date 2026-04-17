# Elixir Daemon Migration Specification

## 1. Overview
Extract the `wombo-combo` daemon into a standalone Elixir/OTP application. Use BEAM's supervision trees for wave management and lightweight process isolation. The TypeScript/Bun ecosystem will remain as the presentation layer (CLI and TUI).

## 2. Core Architecture
- **Daemon (BEAM)**: Wave supervision, task scheduling, agent process management, and health monitoring.
- **Client (Bun)**: Stateless CLI tool communicating via Unix Domain Sockets (UDS).
- **Control Loop**: The daemon self-terminates after 300s (5 min) of inactivity and is re-activated by the CLI (via systemd socket activation or explicit startup). A connected client (CLI or TUI) counts as activity and prevents shutdown. Auto-shutdown can be disabled via CLI/TUI settings.

## 3. Daemon (Elixir/OTP)
- **Top-level Supervisor**: Manages `Woco.WaveRegistry`, `Woco.TaskScheduler`, and `Woco.InactivityMonitor`.
- **Wave Supervisor**: A dynamic supervisor that spawns `Woco.AgentProcess` workers for each task in a wave.
- **Agent Lifecycle**: Each agent is a BEAM process wrapping a shell command. If it crashes, OTP restarts it based on the wave's strategy.
- **Inactivity Monitor**: Counts 300s since last activity. Activity = any running wave, pending task, OR connected client (CLI/TUI). Connected clients reset the timer on every heartbeat. If `auto_shutdown_disabled` is set (via CLI `woco config set daemon.autoShutdown false` or TUI settings), the monitor is suspended entirely.
- **State Hot-swap**: Hot code reloading allows upgrading daemon logic while waves are running.

## 4. Client (TypeScript/Bun)
- **Citty Commands**: `woco launch`, `woco status`, etc.
- **Ink TUI**: Streams real-time updates from the daemon via WebSocket or UDS stream.
- **Auto-Daemon**: CLI checks UDS connectivity; if dead, it launches the daemon before sending the command.
- **Client Keepalive**: While a CLI or TUI session is connected, it sends periodic heartbeats that the daemon counts as activity, preventing auto-shutdown.

## 5. Persistence
- **ETS**: Fast in-memory access for active wave metrics.
- **SQLite (Ecto)**: Durable history and task state updated via write-behind to avoid blocking agent cycles.

## 6. Configuration
- **`daemon.autoShutdown`** (default: `true`): When `false`, the inactivity monitor is completely suspended — the daemon runs until explicitly stopped via `woco daemon stop` or `DELETE /daemon`.
- **`daemon.inactivityTimeoutMs`** (default: `300000`): Milliseconds of inactivity before auto-shutdown. Only effective when `autoShutdown` is `true`.
- Settings are stored in `.wombo-combo/config.json` and readable by both the Elixir daemon and the TS client.

## 7. Implementation Plan
1. [ ] Skeleton: Create `mix` project with `Supervisor` structure.
2. [ ] IPC: Implement UDS listener with basic JSON protocol.
3. [ ] Inactivity Monitor: Implement `Woco.InactivityMonitor` GenServer with client tracking.
4. [ ] Wave Logic: Port scheduling logic (concurrency limits, dependency resolution).
5. [ ] TS Client: Implement `DaemonClient` class in Bun with heartbeat support.
6. [ ] TUI Shift: Refactor Ink components to use event streaming.
7. [ ] Config Integration: Wire `daemon.autoShutdown` and `daemon.inactivityTimeoutMs` into both runtimes.
