# Agent harnesses, profiles and routing

wombo-combo runs agents through a **harness**: an adapter for one agent CLI.
A **profile** is a named way to run a harness (binary, model, provider,
account). **Routing** decides which profile handles a task or operation.

Without any of this configured, wombo behaves exactly as before: it runs
`opencode` (or whatever `agent.bin` points to) and picks models with
`modelRouting`.

## Supported harnesses and verification status

| Harness       | CLI                                   | Status                              |
| ------------- | ------------------------------------- | ----------------------------------- |
| `opencode`    | `opencode run --format json`          | Verified end to end (reference)     |
| `claude-code` | `claude -p --output-format stream-json --verbose` | Fixture-verified only   |
| `codex`       | `codex exec --json`                   | Fixture-verified only               |
| `pi`          | `pi -p --mode json`                   | Fixture-verified only               |
| `custom`      | any command you describe              | Unit and acceptance tested with stubs |

"Fixture-verified" means the command line and the output normalizer are tested
against recorded sample streams under `tests/fixtures/harness/`, written from
each CLI's documented JSON output. They have **not** been run against the real
binaries, and the CLIs change; if a harness misbehaves, check its adapter in
`src/lib/harness/` first. Tests never require these binaries.

Differences to be aware of:

- Only opencode supports `--agent NAME`. For the other harnesses wombo inlines
  the agent definition (`.opencode/agents/<name>.md`, else the bundled
  template) at the top of the prompt.
- Claude Code runs with `--permission-mode acceptEdits`. Unattended shell
  access needs extra flags on the profile, for example
  `"args": ["--dangerously-skip-permissions"]`. That is your decision; wombo
  does not add it.
- Codex runs with `--full-auto --skip-git-repo-check -C <worktree>`.
- Session resume (build-fix retries) uses `claude --resume`, `codex exec resume`
  and `pi --session`. A harness that cannot resume gets a fresh run whose
  prompt is the build-error message.

## Configuration

In `.wombo-combo/config.json`:

```json
{
  "agentProfiles": {
    "oc-default": { "harness": "opencode", "model": "anthropic/claude-sonnet-4" },
    "claude-work": {
      "harness": "claude-code",
      "model": "opus",
      "account": "work",
      "envFrom": { "ANTHROPIC_API_KEY": "ANTHROPIC_API_KEY_WORK" },
      "args": ["--dangerously-skip-permissions"]
    },
    "codex": { "harness": "codex", "model": "gpt-5-codex", "provider": "openai" },
    "my-agent": {
      "harness": "custom",
      "bin": "/usr/local/bin/my-agent",
      "command": {
        "args": ["--model", "{model}", "--cwd", "{cwd}", "{prompt}"],
        "output": "text"
      }
    }
  },
  "routing": {
    "default": "oc-default",
    "byWeight": { "heavy": "claude-work" },
    "byDifficulty": { "very_hard": "claude-work" },
    "byOperation": { "plan": "claude-work", "conflict": "codex" },
    "fallbacks": { "claude-work": ["codex", "oc-default"] }
  }
}
```

### Profile fields

| Field          | Meaning |
| -------------- | ------- |
| `harness`      | `opencode`, `claude-code`, `codex`, `pi` or `custom` (required) |
| `bin`          | Executable; default is the harness default (opencode: `agent.bin` / `OPENCODE_BIN` resolution). Required for `custom` |
| `model`        | Passed to the CLI. Wins over `modelRouting` and the session model |
| `provider`     | Passed where the CLI has such a setting (codex, pi) |
| `args`         | Extra arguments placed before the prompt |
| `env`          | Literal, non-secret environment variables |
| `envFrom`      | Child variable -> **name** of a variable in wombo's own environment (accounts / API keys) |
| `account`      | Free-form label |
| `capabilities` | Override adapter flags (`sessionResume`, `agentSelection`, ...) |
| `command`      | Template for `custom` (below) |

### Secrets never go in config

Config files are committed. Accounts are therefore **environment variable
names**: `"envFrom": { "ANTHROPIC_API_KEY": "ANTHROPIC_API_KEY_WORK" }` reads
`ANTHROPIC_API_KEY_WORK` from the environment wombo runs in and hands it to the
child as `ANTHROPIC_API_KEY`. Validation rejects `env` keys that look like
secrets (`key`, `token`, `secret`, `password`, `credential`) or values with
well-known secret prefixes, and requires `envFrom` values to be valid variable
names. A missing variable makes that profile unavailable (and names only the
variable, never a value).

### Custom command template

`command.args` supports `{prompt}`, `{model}`, `{provider}`, `{cwd}`, `{agent}`,
`{title}` (and `{session}` in `resumeArgs`). A flag directly before an empty
placeholder is dropped (`-m {model}` disappears without a model). Without
`{prompt}` the prompt is appended as the last argument, or piped on stdin with
`"stdin": true`. `output` is `text` (each stdout line becomes a text event;
completion is the exit code) or `opencode-jsonl` (the tool already prints
opencode-shaped events). Add `resumeArgs` and `"capabilities": {"sessionResume": true}`
to support resume.

## Routing

The profile for an operation is chosen in this order:

1. operation `code` and the task's `agent_profile` field
2. `routing.byOperation[operation]` (operations other than `code`)
3. operation `conflict` / `review` and the task's `agent_profile`
4. `routing.byDifficulty[task.difficulty]`, then `routing.byWeight[weight]`
5. `routing.byOperation.code`
6. `routing.default`
7. the legacy route: `agent.bin` (harness detected from the binary name) and `modelRouting`

Operations: `plan` (quest, errand, genesis planners and onboarding synthesis),
`code` (task agents and their retries), `conflict` (merge conflict resolvers),
`review` (reserved).

The model is `profile.model`, else `modelRouting[weight]`, else the session
`--model`.

Per task, set `agent_profile: claude-work` in the task YAML.

### Fallback chains

`routing.fallbacks` maps a profile to an ordered list of profiles. Before a
task agent, planner or conflict resolver starts, wombo checks the chosen
profile's binary exists and its `envFrom` variables are set; if not it tries the
fallbacks in order and logs `profile fallback -> <name> (<reason>)`. Fallbacks
only cover "cannot start". Once a process runs, failures go through the normal
retry logic and stay on the same profile, because sessions belong to one
harness. A conflict resolver whose chain is entirely unavailable falls back to
the default agent route.

`bun dev launch --dry-run` (or `woco launch --dry-run`) prints the resolved
profile, harness and model for every selected task.

## Adding a harness

Implement `HarnessAdapter` (`src/lib/harness/types.ts`): `buildLaunch`,
`buildResume` and `createNormalizer`, which turns the CLI's stdout lines into
the canonical events (opencode JSON events: `step_start`, `text`, `tool_use`,
`step_finish` with `reason: "stop"` and token counts). Register it in
`src/lib/harness/index.ts`, add the id to `ids.ts`, and add fixture-driven
tests like `tests/harness-adapters.test.ts`.
