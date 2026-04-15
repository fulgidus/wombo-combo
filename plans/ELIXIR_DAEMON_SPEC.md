# Elixir Daemon Migration Specification

## 1. Overview
Extract the `wombo-combo` daemon into a standalone Elixir/OTP application. Use BEAM's supervision trees for wave management and lightweight process isolation. The TypeScript/Bun ecosystem will remain as the presentation layer (CLI and TUI).

## 2. Core Architecture
- **Daemon (BEAM)**: Wave supervision, task scheduling, agent process management, and health monitoring.
- **Client (Bun)**: Stateless CLI tool communicating via Unix Domain Sockets (UDS).
- **Control Loop**: The daemon self-terminates after 60s of inactivity and is re-activated by the CLI (via systemd socket activation or explicit startup).

## 3. Daemon (Elixir/OTP)
- **Top-level Supervisor**: Manages `Woco.WaveRegistry`, `Woco.TaskScheduler`, and `Woco.InactivityMonitor`.
- **Wave Supervisor**: A dynamic supervisor that spawns `Woco.AgentProcess` workers for each task in a wave.
- **Agent Lifecycle**: Each agent is a BEAM process wrapping a shell command. If it crashes, OTP restarts it based on the wave's strategy.
- **State Hot-swap**: Hot code reloading allows upgrading daemon logic while waves are running.

## 4. Client (TypeScript/Bun)
- **Citty Commands**: `woco launch`, `woco status`, etc.
- **Ink TUI**: Streams real-time updates from the daemon via WebSocket or UDS stream.
- **Auto-Daemon**: CLI checks UDS connectivity; if dead, it launches the daemon before sending the command.

## 5. Persistence
- **ETS**: Fast in-memory access for active wave metrics.
- **SQLite (Ecto)**: Durable history and task state updated via write-behind to avoid blocking agent cycles.

## 6. Implementation Plan
1. [ ] Skeleton: Create `mix` project with `Supervisor` structure.
2. [ ] IPC: Implement UDS listener with basic JSON protocol.
3. [ ] Wave Logic: Port scheduling logic (concurrency limits, dependency resolution).
4. [ ] TS Client: Implement `DaemonClient` class in Bun.
5. [ ] TUI Shift: Refactor Ink components to use event streaming.

