# multi-cli-support — architecture

Goal: run agent work through different AI CLIs ("harnesses": opencode, Claude
Code, Codex, pi, any custom command) with per-task / per-operation routing,
per-account credentials by env-var reference, and fallback chains. Folds in
the wishlist items "Multi harness" and "Multi provider/model routing".

## Core idea: normalize at the edge, keep the pipeline untouched

Everything downstream of the spawn (ProcessMonitor, TokenCollector, planners'
text extraction, activity feed, logs) already understands ONE event shape:
the opencode JSON event (`OpenCodeEvent` in src/lib/monitor.ts: `type`,
`sessionID`, `part.{tool,state,text,reason,tokens,cost}`). That shape is the
canonical "wombo event" (aliased `HarnessEvent`). Each harness adapter owns
two pure responsibilities and nothing else:

1. BUILD the command (bin, args, how the prompt is passed, model/provider
   flags, session-resume flags, extra env).
2. NORMALIZE its stdout lines into canonical events through a per-process,
   stateful `createNormalizer()` (line in -> 0..n canonical events out).

The opencode adapter's normalizer is the identity and its command builder
reproduces today's argv byte for byte (characterization tests pin this).

## Contracts (src/lib/harness/)

- `ids.ts` — `HARNESS_IDS = ["opencode","claude-code","codex","pi","custom"]`,
  `HarnessId`. Pure, no imports; importable from config.ts without cycles.
- `types.ts`:
  - `HarnessCapabilities { agentSelection, sessionResume, modelFlag, providerFlag, jsonStream, usage }` (booleans)
  - `HarnessLaunchRequest { operation, cwd, prompt, model?, provider?, agentName?, title?, sessionId? (resume), extraArgs?, command? (custom) }`
  - `HarnessCommand { bin, args (prompt excluded), promptVia: "arg"|"stdin", stdinArgs (appended when a large prompt goes through stdin), env (extra) }`
  - `HarnessAdapter { id, capabilities, defaultBin(env), buildLaunch(req), buildResume(req), createNormalizer() }`
  - `Normalizer = (line: string) => HarnessEvent[]` (stateful closure)
- `index.ts` — `getHarness(id)`, `listHarnesses()`, `detectHarnessFromBin(path)` (replaces `detectAgentType`, which stays exported as a thin shim).
- One file per adapter: `opencode.ts`, `claude-code.ts`, `codex.ts`, `pi.ts`, `custom.ts`.
- `output.ts` — `normalizeOutput(raw, adapter)` -> opencode-shaped NDJSON string so existing `extractTextFromJsonEvents` helpers keep working for every harness.
- `routing.ts` — profile/route resolution (see below).
- `spawn.ts` — shared spawn helper (argv/stdin prompt passing, env assembly, availability preflight) used by launcher and planners.

## Config (src/config.ts, schemas/config.schema.json)

Backward compatible: `agent.bin`, `agent.name`, `modelRouting` keep their exact
meaning. New OPTIONAL top-level keys:

- `agentProfiles: Record<name, AgentProfile>` where
  `AgentProfile { harness: HarnessId; bin?: string|null; model?: string|null; provider?: string|null; args?: string[]; env?: Record<string,string>; envFrom?: Record<string,string>; account?: string; capabilities?: Partial<HarnessCapabilities>; command?: CustomCommandSpec }`.
  - `envFrom` maps CHILD env var -> PARENT env var NAME (e.g. `{ "ANTHROPIC_API_KEY": "ANTHROPIC_API_KEY_WORK" }`), resolved at spawn. This is how per-account key routing works. `account` is a free label for display.
  - SECRETS NEVER IN CONFIG: `env` literal values are for non-secret flags; validation rejects `env` keys matching /key|token|secret|password|credential/i and requires `envFrom` values to be valid env var names.
- `routing: { default?: string; byWeight?: {light,medium,heavy}; byDifficulty?: {trivial..very_hard}; byOperation?: {plan,code,conflict,review}; fallbacks?: Record<profileName, string[]> }` — all values are profile names.
- Task field `agent_profile` (optional string) selects a profile for one task.
- Operations: `plan` (quest/errand/genesis/onboarding planners), `code` (task agents + retries), `conflict` (merge resolver), `review` (reserved; routed and validated, no caller yet).

Validation lives in `validateConfig` (unknown harness, unknown profile
reference in routing/fallbacks, fallback cycles, secret-looking env, custom
harness without `command`). All errors are explicit `config.agentProfiles...` messages.

## Route resolution (pure, src/lib/harness/routing.ts)

`resolveRoute(config, { operation, task?, sessionModel?, env? })` returns
`ResolvedRoute { profile: string, harness: HarnessId, bin, model, provider, env, args, chain: string[] }`.
Precedence for the profile: task.agent_profile > routing.byOperation[op] (for
op != code) > routing.byDifficulty[task.difficulty] > routing.byWeight[weight]
> routing.default > legacy synthesized profile `default`
(`harness = detectHarnessFromBin(resolveAgentBin(config))`, opencode when
unknown, bin = resolveAgentBin). Model precedence: profile.model > legacy
`modelRouting[weight]` > session model > null. With no `agentProfiles` and no
`routing`, the result is exactly what the code did before.
`chain` = profile followed by `routing.fallbacks[profile]`; the launcher picks
the first candidate whose binary resolves (`selectAvailableRoute`). Runtime
failures after a successful spawn go through the normal retry machinery and
never switch harness mid-session (sessions are harness-specific).

## Wiring

- launcher.ts: `launchHeadless` / `retryHeadless` / `launchConflictResolver`
  accept an optional `route` (resolved by callers); without it they resolve a
  legacy route from config so existing call sites/tests keep working. Fake
  agent (`FAKE_AGENT_SENTINEL`) path is untouched. `LaunchResult` gains
  `harness`, `profile`, `normalize` (the process's normalizer).
- monitor.ts: `ProcessMonitor.addProcess(id, proc, { normalize? })`; each stdout
  line goes through the normalizer then the existing per-event logic. Default
  (no normalizer) is the current code path.
- planners (quest/errand/genesis/onboarding): spawn via the shared helper with
  operation `plan`; text extraction goes through `normalizeOutput`.
- daemon agent-runner: resolves the route at submit (state gets `profile`,
  `harness`; `model` keeps its meaning), launches with it, retries resume the
  SAME profile, conflict resolver uses operation `conflict`, token usage
  context records harness/provider.
- Non-opencode harnesses have no `--agent` concept: the agent definition body
  is inlined into the prompt (generalist/merge-resolver/planner templates).

## Constraints

- Only opencode is verified end to end. claude-code, codex, pi, custom are
  verified by unit tests against fixture output committed under
  tests/fixtures/harness/. No test may require any of these binaries or the
  network. Document format assumptions in docs/harnesses.md and mark them
  "fixture-verified, not live-verified".
- ESM, extensionless imports, Bun APIs, `bun:test`. No new dependencies.
- Fake-agent behavior must not change.
- opencode argv must be byte-for-byte unchanged (pinned by tests written
  BEFORE the refactor).
- Never silently work around bugs: fix or `bun dev tasks add`.

## File ownership (mostly sequential; tasks 2 and 3 can run in parallel)

1. harness-contract-opencode: src/lib/harness/{ids,types,index,opencode,output}.ts
2. harness-adapters-external: src/lib/harness/{claude-code,codex,pi,custom}.ts, tests/fixtures/harness/*
3. agent-profiles-config: src/config.ts, schemas/config.schema.json, tests/config.test.ts
4. agent-route-resolver: src/lib/harness/routing.ts
5. launcher-harness-integration: src/lib/launcher.ts, src/lib/harness/spawn.ts, src/lib/monitor.ts
6. planner-harness-integration: src/lib/{quest,errand,genesis}-planner.ts, src/lib/onboarding-helpers.ts
7. daemon-profile-wiring: src/daemon/{agent-runner,state,protocol}.ts, src/lib/{tasks,task-schema,task-store}.ts, schemas/task.schema.json, src/commands/launch.ts
8. harness-docs-acceptance: README.md, docs/harnesses.md, acceptance tests
