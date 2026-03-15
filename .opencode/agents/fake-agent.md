# Fake Agent

Built-in fake agent for orchestration testing. This definition exists only to
suppress the "missing agent definition" warning in `ensureAgentDefinition()`.

The actual implementation is in `src/lib/fake-agent-runner.ts` — it does NOT
use opencode at all. The launcher detects `agent: "fake-agent"` on a task and
spawns the fake-agent-runner script instead of the real agent binary.

## Behavior

- Makes a trivial file change (`.fake-agent/<taskId>.txt`)
- Commits with `--no-verify`
- Emits opencode-compatible JSON events (step_start, text, step_finish)
- Sleeps for `FAKE_SLEEP_MS` milliseconds (extracted from prompt, default 500)
- Exits with code 0

## Usage

Set `agent: "fake-agent"` on any task in `tasks.yml` or use the TUI seed
function (F key in devMode) to generate tasks with this agent pre-configured.
