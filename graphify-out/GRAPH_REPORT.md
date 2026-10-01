# Graph Report - wombo-combo  (2026-09-30)

## Corpus Check
- 376 files · ~441,821 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3265 nodes · 8197 edges · 190 communities (182 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 118 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c3532bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- DaemonState
- verifier.ts
- WomboConfig
- toon.ts
- commands/launch.ts
- protocol.ts
- commands/resume.ts
- lib/launcher.ts
- lib/tasks.ts
- fake-task-wizard.tsx
- config.ts
- wishlist-store.ts
- ink/index.ts
- router.ts
- review-list.tsx
- meta.schema.json
- commands/quest.ts
- onboarding/index.ts
- splash-screen.tsx
- run-tui-app.tsx
- scheduler.ts
- commands/tui.ts
- run-task-browser.tsx
- worktree.ts
- list.ts
- monitor.ts
- prompt.ts
- commands/completion.ts
- schema.ts
- quest-store.ts
- DaemonClient
- agent-registry.ts
- init-app.tsx
- lib/quest.ts
- wave-monitor.tsx
- generate-fake-tasks.ts
- properties
- run-wave-monitor.tsx
- project-store.ts
- task-schema.ts
- Daemon
- InkWomboTUI
- compilerOptions
- settings-screen.tsx
- run-daemon-monitor.tsx
- conflict-hunks.ts
- properties
- errand-planner.ts
- plan-review.tsx
- properties
- daemon/state.ts
- mode
- command
- properties
- task-browser.tsx
- scout.ts
- router.tsx
- TextBuffer
- hitl-channel.ts
- permission
- init-writer.ts
- client.ts
- genesis-planner.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- run-onboarding.ts
- run-progress.tsx
- enabled
- graph.ts
- ProcessMonitor
- genesis-review.tsx
- shell.tsx
- onboarding-app.tsx
- UsageTotals
- InkDaemonTUI
- citty-bridge.ts
- agents/generalist-agent.md
- package.json
- maxConcurrent
- citty/quest.ts
- commands/usage.ts
- ADDED Requirements
- Agent Process Lifecycle Audit
- type
- commands/stats.ts
- openspec/specs/scheduler-concurrency-accounting/spec.md
- testTimeout
- format-converter.ts
- prompt-compress.ts
- ui.ts
- dependencies
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- ADDED Requirements
- enum
- task.schema.json
- properties
- validate.ts
- opsx-explore.prompt.md
- opsx-explore.md
- Problem Trace
- openspec/specs/safe-tmp-worktree-placement/spec.md
- defaultViewport
- ended_at
- step-wizard.tsx
- TokenCollector
- monitor-router.test.tsx
- wiring.test.tsx
- CONTEXT.md — For AI agents using wombo as a tool
- 2026-03-21-fix-maxconcurrent-reset-on-rebuild/design.md
- Requirement: Concurrency value is pinned after first set
- Requirement: Concurrency value is pinned after first set
- keywords
- wombo-combo
- enum
- maxBackups
- wishlist.ts
- modal.tsx
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- Requirement: Concurrency value is pinned after first set
- 2026-03-21-fix-wide-fake-task-parallelism/design.md
- enum
- global-flags.ts
- select-input.tsx
- fake-agent-runner.ts
- hitl-ask.ts
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- 2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md
- 2026-03-21-fix-merge-worktree-leak/design.md
- 2026-03-21-fix-merge-worktree-leak/proposal.md
- 2026-03-21-fix-scheduler-launch-and-concurrency/design.md
- 2026-03-21-fix-scheduler-launch-and-concurrency/proposal.md
- 2026-03-21-fix-scheduler-oversubscription/design.md
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- 2026-03-21-fix-wide-fake-task-parallelism/proposal.md
- Requirement: Launch stagger applies only to real-agent launches
- Requirement: Launch stagger applies only to real-agent launches
- Discoveries
- devDependencies
- scripts
- config.schema.json
- merge-resolver-agent.md
- 2026-03-21-fix-concurrency-boot-reset/proposal.md
- Requirement: maxConcurrent is preserved when Scheduler is reconstructed
- Requirement: All dep-free tasks are submitted in a single tick at infinite concurrency
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Requirement: Fake-agent tasks bypass inter-launch stagger
- quest-wizard.test.tsx
- wombo-combo Operational Constraints
- 2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md
- 2026-03-21-fix-scheduler-launch-and-concurrency/tasks.md
- 2026-03-21-fix-wide-fake-task-parallelism/tasks.md
- Requirement: All dep-free tasks are submitted in a single tick at infinite concurrency
- Requirement: maxConcurrent is preserved when Scheduler is reconstructed
- files
- completion
- subtasks
- wombo-combo Agent Context
- Fake Agent
- Tasks: fix-concurrency-boot-reset
- 2026-03-21-fix-scheduler-oversubscription/tasks.md
- Accomplished
- What we did
- Relevant files / directories
- agent_type
- constraints
- id
- references
- graphify.js
- 2026-03-21-fix-merge-worktree-leak/tasks.md
- repository

## God Nodes (most connected - your core abstractions)
1. `WomboConfig` - 115 edges
2. `Explore mode guidelines and usage rules` - 114 edges
3. `DaemonState` - 62 edges
4. `OutputFormat` - 55 edges
5. `cmdResume()` - 49 edges
6. `AgentRunner` - 45 edges
7. `loadFeatures()` - 45 edges
8. `outputError()` - 43 edges
9. `cmdLaunch()` - 41 edges
10. `DaemonClient` - 41 edges

## Surprising Connections (you probably didn't know these)
- `makeClient()` --calls--> `DaemonClient`  [EXTRACTED]
  tests/daemon-client.test.ts → src/daemon/client.ts
- `serverBroadcast()` --calls--> `makeEvent()`  [EXTRACTED]
  tests/daemon-client.test.ts → src/daemon/protocol.ts
- `startTestServer()` --calls--> `makeEvent()`  [EXTRACTED]
  tests/daemon-client.test.ts → src/daemon/protocol.ts
- `makeAgent()` --calls--> `createDaemonAgentState()`  [EXTRACTED]
  tests/daemon-scheduler.test.ts → src/daemon/state.ts
- `makeAgent()` --calls--> `createDaemonAgentState()`  [EXTRACTED]
  tests/daemon-state.test.ts → src/daemon/state.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`
- 3-file cycle: `src/lib/monitor.ts -> src/lib/token-usage.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (190 total, 8 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (110): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 10.1s), Assistant (Build · claude-sonnet-4.6 · 10.2s), Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s) (+102 more)

### Community 1 - "DaemonState"
Cohesion: 0.05
Nodes (13): AgentRunner, getConflictDiffs(), isTierAllowed(), runSafeCmd(), DaemonState, FAKE_AGENT_SENTINEL, collect(), Task (+5 more)

### Community 2 - "verifier.ts"
Cohesion: 0.05
Nodes (51): BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult, discoverBrowserBin() (+43 more)

### Community 3 - "WomboConfig"
Cohesion: 0.06
Nodes (62): AbortCommandOptions, ParsedLaunchArgs, ParsedResumeArgs, ParsedRetryArgs, addCommand, archiveCommand, checkCommand, graphCommand (+54 more)

### Community 4 - "toon.ts"
Cohesion: 0.07
Nodes (61): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+53 more)

### Community 5 - "commands/launch.ts"
Cohesion: 0.09
Nodes (63): analyzeBarrelFile(), attemptMerge(), BarrelFile, buildQuestContext(), detectUnprotectedBarrels(), escalatingConflictResolution(), findIndexFiles(), getChainPredecessors() (+55 more)

### Community 6 - "protocol.ts"
Cohesion: 0.07
Nodes (56): AgentRunnerConfig, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus, ensureDaemonRunning() (+48 more)

### Community 7 - "commands/resume.ts"
Cohesion: 0.10
Nodes (49): cmdAbort(), dumpFailedAgentLogs(), handleRetry(), launchAllReady(), launchNextQueued(), launchSingleHeadless(), launchWaveHeadless(), launchWaveInteractive() (+41 more)

### Community 8 - "lib/launcher.ts"
Cohesion: 0.09
Nodes (35): resolveAgentBin(), InteractiveAgent, InteractiveMonitor, InteractiveMonitorCallbacks, MonitoredAgent, agentEnv(), AgentType, checkTmux() (+27 more)

### Community 9 - "lib/tasks.ts"
Cohesion: 0.12
Nodes (44): archiveDir(), atomicWrite(), createBackup(), defaultMeta(), deleteTaskFile(), ensureDir(), flattenTask(), getArchiveDir() (+36 more)

### Community 10 - "fake-task-wizard.tsx"
Cohesion: 0.07
Nodes (33): FakeTaskConfig, FakeTaskWizard(), FakeTaskWizardProps, Field, generateFakeTasks(), shuffleArr(), shuffledTitles(), TASK_TITLE_POOL (+25 more)

### Community 11 - "config.ts"
Cohesion: 0.13
Nodes (20): parseLaunchArgs(), loadProjectConfigSync(), parseResumeArgs(), parseRetryArgs(), statsCommand, loadProjectConfig(), ensureInitialized(), AgentRegistryConfig (+12 more)

### Community 12 - "wishlist-store.ts"
Cohesion: 0.11
Nodes (30): HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, formatDate(), truncateText(), OverlayItemList() (+22 more)

### Community 13 - "ink/index.ts"
Cohesion: 0.09
Nodes (35): App(), AppProps, ChromeBottomBar(), ChromeBottomBarProps, ChromeLayout(), ChromeLayoutProps, ChromeTitleContext, ChromeTopBar() (+27 more)

### Community 14 - "router.ts"
Cohesion: 0.08
Nodes (32): abortCommand, cleanupCommand, daemonCommand, NOTE: No run() handler — default subcommand is injected by the router., startCommand, statusCommand, stopCommand, genesisCommand (+24 more)

### Community 15 - "review-list.tsx"
Cohesion: 0.11
Nodes (26): ModalState, ReviewList(), ReviewListProps, createTestStreams(), renderLive(), DetailField, DetailSection, DIFFICULTY_COLORS (+18 more)

### Community 16 - "meta.schema.json"
Cohesion: 0.05
Nodes (40): created_at, generator, maintainer, meta, project, updated_at, version, additionalProperties (+32 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.16
Nodes (36): cmdLaunch(), handleQuestSubcommand(), questAbandon(), questActivate(), questArchive(), questComplete(), questCreate(), questHelp() (+28 more)

### Community 18 - "onboarding/index.ts"
Cohesion: 0.18
Nodes (28): FieldEditor(), FieldEditorProps, formatSectionForDisplay(), INPUT_STEPS, InputStep, parseConventions(), parseObjectives(), parseRules() (+20 more)

### Community 19 - "splash-screen.tsx"
Cohesion: 0.09
Nodes (33): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+25 more)

### Community 20 - "run-tui-app.tsx"
Cohesion: 0.09
Nodes (30): DaemonStats, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreen(), DashboardScreenProps, DashboardStore, DashboardStoreContext, DEFAULT_STORE (+22 more)

### Community 21 - "scheduler.ts"
Cohesion: 0.09
Nodes (16): Scheduler, buildChainFrom(), buildDepGraph(), buildSchedulePlan(), computeTopologicalOrder(), DepChain, DepGraph, DepGraphNode (+8 more)

### Community 22 - "commands/tui.ts"
Cohesion: 0.14
Nodes (28): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), promptVisionText(), runDaemonMonitor() (+20 more)

### Community 23 - "run-task-browser.tsx"
Cohesion: 0.12
Nodes (27): QuestPickerAction, QuestPickerApp(), QuestPickerScreenProps, CONCURRENCY_LEVELS, PRIORITIES, SORT_FIELDS, TaskBrowserAction, TaskBrowserApp() (+19 more)

### Community 24 - "worktree.ts"
Cohesion: 0.15
Nodes (26): cmdCleanup(), NOTE: .wombo-combo/history/ is intentionally NOT removed by cleanup., killAllMuxSessions(), listMuxSessions(), branchExists(), cleanupAllWorktrees(), copyConfigFiles(), createBranch() (+18 more)

### Community 25 - "list.ts"
Cohesion: 0.12
Nodes (25): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), renderSubtask() (+17 more)

### Community 26 - "monitor.ts"
Cohesion: 0.14
Nodes (19): extractActivity(), formatEventForLog(), MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, shortCmd(), shortPath() (+11 more)

### Community 27 - "prompt.ts"
Cohesion: 0.11
Nodes (26): formatHunksForLLM(), ensureProxyRunning(), isPortlessAvailable(), isProxyRunning(), portlessRunCommand(), portlessStatus(), portlessUrl(), resolvePortlessBin() (+18 more)

### Community 28 - "commands/completion.ts"
Cohesion: 0.17
Nodes (29): completionCommand, aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk() (+21 more)

### Community 29 - "schema.ts"
Cohesion: 0.12
Nodes (21): describeCommand, injectDefaultSubcommand(), isCittyCommand(), resolveGlobalFlagsAndCommand(), runCittyCommand(), checkDevModeGuard(), main(), aliasHint() (+13 more)

### Community 30 - "quest-store.ts"
Cohesion: 0.15
Nodes (28): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisCommandOptions, GenesisReviewResult, showGenesisReview(), sleep(), normalizeQuest() (+20 more)

### Community 31 - "DaemonClient"
Cohesion: 0.13
Nodes (4): tryDaemonLaunch(), waitForDaemonCompletion(), DaemonClient, parseMessage()

### Community 32 - "agent-registry.ts"
Cohesion: 0.13
Nodes (26): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightViewProps, agentNameFromType() (+18 more)

### Community 33 - "init-app.tsx"
Cohesion: 0.13
Nodes (20): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+12 more)

### Community 34 - "lib/quest.ts"
Cohesion: 0.10
Nodes (26): QuestSummary, QuestSummary, buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), HITL_DESCRIPTIONS, PRIORITY_COLORS, QuestWizard() (+18 more)

### Community 35 - "wave-monitor.tsx"
Cohesion: 0.13
Nodes (12): AllTasksDetail(), QuestDetail(), AGENT_STATUS_COLORS, AGENT_STATUS_ICONS, elapsed(), progressBar(), QUEST_STATUS_ABBREV, QUEST_STATUS_COLORS (+4 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "properties"
Cohesion: 0.08
Nodes (26): default, description, type, description, type, default, description, type (+18 more)

### Community 38 - "run-wave-monitor.tsx"
Cohesion: 0.15
Nodes (16): QuestionPopupView(), QuestionPopupViewProps, makeQuestion(), makeQuestions(), timeAgo(), AdapterProps, buildDashStore(), InkTUIOptions (+8 more)

### Community 39 - "project-store.ts"
Cohesion: 0.14
Nodes (25): addObjective(), addRule(), atomicWrite(), bumpGenesisCount(), ensureDir(), linkQuestToObjective(), loadProject(), normalizeConventions() (+17 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.14
Nodes (17): CheckResult, checkTasks(), cmdTasksCheck(), collectAllItems(), DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema (+9 more)

### Community 42 - "InkWomboTUI"
Cohesion: 0.13
Nodes (5): InkWomboTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 43 - "compilerOptions"
Cohesion: 0.08
Nodes (23): bun, dist, node_modules, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx (+15 more)

### Community 44 - "settings-screen.tsx"
Cohesion: 0.09
Nodes (20): APPEARANCE_FIELD_IDS, FieldDef, FieldId, FIELDS, GENERAL_FIELD_IDS, LOCALE_OPTIONS, SettingsField(), SettingsFieldProps (+12 more)

### Community 45 - "run-daemon-monitor.tsx"
Cohesion: 0.16
Nodes (19): DaemonAgentState, EvtAgentStatusChange, SchedulerState, DashboardAgent, DaemonAdapterProps, DaemonMonitorScreenProps, DaemonMonitorShellProps, DaemonStore (+11 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+14 more)

### Community 47 - "properties"
Cohesion: 0.10
Nodes (22): default, description, type, additionalProperties, properties, type, default, description (+14 more)

### Community 48 - "errand-planner.ts"
Cohesion: 0.14
Nodes (16): ErrandWizard(), ErrandWizardProps, ErrandWizardStep, STEP_INSTRUCTIONS, STEP_TITLES, STEPS, RunErrandWizardOptions, ErrandSpec (+8 more)

### Community 49 - "plan-review.tsx"
Cohesion: 0.18
Nodes (18): buildPlanConfig(), DIFFICULTIES, PLAN_EDIT_FIELDS, PlanReviewApp(), PlanReviewAppProps, PRIORITIES, reviewItemToTask(), taskStash (+10 more)

### Community 50 - "properties"
Cohesion: 0.10
Nodes (21): AGENTS.md, .opencode/, opencode.json, additionalProperties, properties, type, default, description (+13 more)

### Community 51 - "daemon/state.ts"
Cohesion: 0.13
Nodes (11): EventMap, EvtSchedulerStatus, SchedulerDeps, ACTIVE_STATUSES, createDaemonAgentState(), DEP_SATISFIED_STATUSES, InternalAgentState, PersistedDaemonState (+3 more)

### Community 52 - "mode"
Cohesion: 0.10
Nodes (20): auto, disabled, monitored, additionalProperties, properties, type, default, description (+12 more)

### Community 53 - "command"
Cohesion: 0.11
Nodes (20): default, description, type, additionalProperties, properties, type, default, description (+12 more)

### Community 54 - "properties"
Cohesion: 0.10
Nodes (20): default, description, type, additionalProperties, properties, type, default, description (+12 more)

### Community 55 - "task-browser.tsx"
Cohesion: 0.18
Nodes (14): agentStatusColor(), PRIORITY_ABBREV, TaskDetail(), TaskListItem(), formatCost(), formatTokenCount(), GROUPING_FIELDS, GROUPING_LABELS (+6 more)

### Community 56 - "scout.ts"
Cohesion: 0.14
Nodes (18): buildKeywords(), buildScoutIndex(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex() (+10 more)

### Community 57 - "router.tsx"
Cohesion: 0.15
Nodes (16): defaultNav, NavigationContext, NavigationState, ScreenComponent, ScreenKey, ScreenMap, ScreenRouter(), ScreenRouterProps (+8 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "init-writer.ts"
Cohesion: 0.15
Nodes (10): initCommand, cmdInit(), InitOptions, NOTE: The ink/init-app module is dynamically imported to avoid pulling, CONFIG_FILE, DEFAULT_CONFIG, generateDefaultConfig(), InitWriterConfig (+2 more)

### Community 62 - "client.ts"
Cohesion: 0.15
Nodes (12): ConnectionState, DaemonClientOptions, EventHandler, EventType, EvtStateSnapshot, makeEvent(), PROTOCOL_VERSION, makeClient() (+4 more)

### Community 63 - "genesis-planner.ts"
Cohesion: 0.17
Nodes (16): detectCycles(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput, parseGenesisYaml(), runGenesisPlanner() (+8 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "run-onboarding.ts"
Cohesion: 0.26
Nodes (14): OnboardingApp(), OnboardingResult, OnboardingScreen(), OnboardingScreenProps, runOnboardingInk(), RunOnboardingOptions, buildSynthesisPrompt(), extractTextFromJsonEvents() (+6 more)

### Community 66 - "run-progress.tsx"
Cohesion: 0.18
Nodes (11): ProgressResult, ProgressView(), ProgressViewProps, SPIN_CHARS, ProgressApp(), ProgressController, RunConfirmOptions, RunProgressOptions (+3 more)

### Community 67 - "enabled"
Cohesion: 0.12
Nodes (16): default, description, type, default, description, type, additionalProperties, properties (+8 more)

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (14): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+6 more)

### Community 70 - "genesis-review.tsx"
Cohesion: 0.23
Nodes (14): buildGenesisConfig(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES, questStash (+6 more)

### Community 71 - "shell.tsx"
Cohesion: 0.17
Nodes (6): runApp(), RunAppOptions, Shell(), ShellProps, StatusView(), StatusViewProps

### Community 72 - "onboarding-app.tsx"
Cohesion: 0.21
Nodes (9): ConfirmDialog(), ConfirmDialogProps, CreateFlowPhase, EditFlowPhase, OnboardingAppProps, ProgressResult, ProgressView(), ProgressViewProps (+1 more)

### Community 73 - "UsageTotals"
Cohesion: 0.20
Nodes (13): QuestPickerViewProps, defaultProps(), EMPTY_USAGE, makeQuest(), makeSummary(), TaskBrowserViewProps, defaultProps(), EMPTY_USAGE (+5 more)

### Community 75 - "citty-bridge.ts"
Cohesion: 0.30
Nodes (11): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+3 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.14
Nodes (13): author, bin, woco, bugs, url, description, engines, bun (+5 more)

### Community 78 - "maxConcurrent"
Cohesion: 0.14
Nodes (14): additionalProperties, properties, type, default, description, minimum, type, default (+6 more)

### Community 79 - "citty/quest.ts"
Cohesion: 0.14
Nodes (11): abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand, pauseCommand, planCommand (+3 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.27
Nodes (13): cmdUsage(), FG, formatCost(), formatNumber(), groupedToJSON(), pad(), padLeft(), renderGroupedTable() (+5 more)

### Community 81 - "ADDED Requirements"
Cohesion: 0.15
Nodes (12): ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded (+4 more)

### Community 82 - "Agent Process Lifecycle Audit"
Cohesion: 0.15
Nodes (12): 1. Are agents spawned with `detached: true` and `unref()`?, 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown (+4 more)

### Community 83 - "type"
Cohesion: 0.15
Nodes (13): description, items, type, description, items, type, type, description (+5 more)

### Community 84 - "commands/stats.ts"
Cohesion: 0.29
Nodes (12): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+4 more)

### Community 85 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.17
Nodes (11): Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: New agents are not launched to fill slots held by verified agents (+3 more)

### Community 86 - "testTimeout"
Cohesion: 0.17
Nodes (12): strictMode, tdd, testTimeout, default, description, type, additionalProperties, properties (+4 more)

### Community 87 - "format-converter.ts"
Cohesion: 0.27
Nodes (11): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+3 more)

### Community 88 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 89 - "ui.ts"
Cohesion: 0.26
Nodes (10): colorize(), elapsed(), FG, pad(), padLeft(), printFeatureSelection(), printSummary(), renderDashboard() (+2 more)

### Community 90 - "dependencies"
Cohesion: 0.18
Nodes (11): citty, mermaidtui, dependencies, citty, ink, mermaidtui, react, yaml (+3 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "ADDED Requirements"
Cohesion: 0.18
Nodes (10): ADDED Requirements, Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo (+2 more)

### Community 94 - "enum"
Cohesion: 0.18
Nodes (11): backlog, blocked, cancelled, done, in_progress, in_review, planned, status (+3 more)

### Community 95 - "task.schema.json"
Cohesion: 0.18
Nodes (10): id, status, title, additionalProperties, description, $id, required, $schema (+2 more)

### Community 96 - "properties"
Cohesion: 0.18
Nodes (11): description, type, description, pattern, type, properties, description, effort (+3 more)

### Community 97 - "validate.ts"
Cohesion: 0.45
Nodes (8): fail(), ok(), validateBranchName(), validateDuration(), validateEnum(), validateId(), validateText(), ValidationResult

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "Problem Trace"
Cohesion: 0.20
Nodes (9): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+1 more)

### Community 101 - "openspec/specs/safe-tmp-worktree-placement/spec.md"
Cohesion: 0.20
Nodes (9): Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo, Scenario: syncQuestBranch creates tmp worktree outside the repo (+1 more)

### Community 102 - "defaultViewport"
Cohesion: 0.20
Nodes (10): additionalProperties, properties, type, default, type, defaultViewport, height, width (+2 more)

### Community 103 - "ended_at"
Cohesion: 0.22
Nodes (10): description, format, type, null, string, ended_at, started_at, description (+2 more)

### Community 104 - "step-wizard.tsx"
Cohesion: 0.22
Nodes (5): DEFAULT_RAW_INPUTS, MultiLineInputProps, SelectionListProps, SingleLineInputProps, StepWizard()

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 109 - "2026-03-21-fix-maxconcurrent-reset-on-rebuild/design.md"
Cohesion: 0.22
Nodes (8): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs

### Community 110 - "Requirement: Concurrency value is pinned after first set"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: Concurrency value is pinned after first set, Requirement: Daemon restart re-applies config value, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Fresh daemon start after restart, Scenario: Watcher re-triggers start after idle — concurrency preserved

### Community 111 - "Requirement: Concurrency value is pinned after first set"
Cohesion: 0.22
Nodes (8): Requirement: Concurrency value is pinned after first set, Requirement: Daemon restart re-applies config value, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Fresh daemon start after restart, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved

### Community 112 - "keywords"
Cohesion: 0.22
Nodes (9): keywords, agent, ai, cli, feature-development, orchestration, parallel, woco (+1 more)

### Community 113 - "wombo-combo"
Cohesion: 0.22
Nodes (8): Commands, Install, Launch options, License, Quick start, Token Usage Tracking, TUI, wombo-combo

### Community 114 - "enum"
Cohesion: 0.22
Nodes (9): easy, hard, medium, trivial, very_hard, description, enum, type (+1 more)

### Community 115 - "maxBackups"
Cohesion: 0.22
Nodes (9): additionalProperties, properties, type, default, description, minimum, type, backup (+1 more)

### Community 116 - "wishlist.ts"
Cohesion: 0.22
Nodes (6): addCommand, deleteCommand, listCommand, moveCommand, NOTE: No run() handler here. Default "list" is injected by the router, wishlistCommand

### Community 117 - "modal.tsx"
Cohesion: 0.31
Nodes (4): ConfirmDialog(), ConfirmDialogProps, Modal(), ModalProps

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "Requirement: Concurrency value is pinned after first set"
Cohesion: 0.25
Nodes (7): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved

### Community 121 - "2026-03-21-fix-wide-fake-task-parallelism/design.md"
Cohesion: 0.25
Nodes (7): Context, Decision 1: Skip stagger for fake agents at the queue-processing level, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs

### Community 122 - "enum"
Cohesion: 0.25
Nodes (8): critical, high, low, wishlist, description, enum, type, priority

### Community 123 - "global-flags.ts"
Cohesion: 0.39
Nodes (4): extractGlobalFlags(), ExtractResult, GlobalFlags, ResolvedCommand

### Community 124 - "select-input.tsx"
Cohesion: 0.32
Nodes (6): SelectInput(), SelectInputItem, SelectInputProps, createTestStreams(), ITEMS, renderLive()

### Community 125 - "fake-agent-runner.ts"
Cohesion: 0.54
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 126 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 127 - "templates/quest-planner-agent.md"
Cohesion: 0.25
Nodes (7): Output Format, Planning Process, Quality Checklist, Task Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 128 - "errand-planner-agent.md"
Cohesion: 0.29
Nodes (6): Field Reference, Operational Rules, Task Design Principles, What You Must Never Do, YAML Output Schema, Your Task

### Community 129 - "agents/genesis-planner-agent.md"
Cohesion: 0.29
Nodes (6): Field Reference, Operational Rules, Quest Design Principles, What You Must Never Do, YAML Output Schema, Your Task

### Community 130 - "agents/quest-planner-agent.md"
Cohesion: 0.29
Nodes (6): Field Reference, Operational Rules, Task Design Principles, What You Must Never Do, YAML Output Schema, Your Task

### Community 131 - "2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

### Community 132 - "2026-03-21-fix-merge-worktree-leak/design.md"
Cohesion: 0.29
Nodes (6): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs

### Community 133 - "2026-03-21-fix-merge-worktree-leak/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

### Community 134 - "2026-03-21-fix-scheduler-launch-and-concurrency/design.md"
Cohesion: 0.29
Nodes (6): Context, Decision: Submit ALL candidates when `maxConcurrent=0`, regardless of `slotsForNew`, Decision: Track whether concurrency has been explicitly set this session, Decisions, Goals / Non-Goals, Risks / Trade-offs

### Community 135 - "2026-03-21-fix-scheduler-launch-and-concurrency/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

### Community 136 - "2026-03-21-fix-scheduler-oversubscription/design.md"
Cohesion: 0.29
Nodes (6): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs

### Community 137 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

### Community 138 - "2026-03-21-fix-wide-fake-task-parallelism/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

### Community 139 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 140 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 141 - "Discoveries"
Cohesion: 0.29
Nodes (7): Architecture files read, Discoveries, Key architectural insight, On Temporal vs Dapr, Reproduction path (exact), The REAL bug — partially identified, investigation cut off, What the previous fix (`fix-maxconcurrent-reset-on-rebuild`) actually addressed

### Community 142 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/bun, @types/react, typescript, @types/bun, @types/react, typescript

### Community 143 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, start, test, typecheck, woco

### Community 144 - "config.schema.json"
Cohesion: 0.29
Nodes (6): additionalProperties, description, $id, $schema, title, type

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "2026-03-21-fix-concurrency-boot-reset/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Impact, Modified Capabilities, What Changes, Why

### Community 147 - "Requirement: maxConcurrent is preserved when Scheduler is reconstructed"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: maxConcurrent is preserved when Scheduler is reconstructed, Scenario: Fresh cold-start still applies config default, Scenario: Quest selection preserves config-applied concurrency, Scenario: Quest selection preserves user-set infinite concurrency

### Community 148 - "Requirement: All dep-free tasks are submitted in a single tick at infinite concurrency"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: All dep-free tasks are submitted in a single tick at infinite concurrency, Scenario: Finite concurrency still caps per-tick submission, Scenario: Infinite concurrency burst does not exceed candidate count, Scenario: Ten dep-free tasks spring to life within two ticks

### Community 149 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 150 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 151 - "quest-wizard.test.tsx"
Cohesion: 0.40
Nodes (3): createTestStreams(), noopSave, renderLive()

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 153 - "2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md"
Cohesion: 0.40
Nodes (4): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification

### Community 154 - "2026-03-21-fix-scheduler-launch-and-concurrency/tasks.md"
Cohesion: 0.40
Nodes (3): 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification

### Community 155 - "2026-03-21-fix-wide-fake-task-parallelism/tasks.md"
Cohesion: 0.40
Nodes (4): 1. AgentRunner — Per-entry stagger flag, 2. TUI — Batch task writes in handleToggleAll, 3. Unit Tests, 4. Verification

### Community 156 - "Requirement: All dep-free tasks are submitted in a single tick at infinite concurrency"
Cohesion: 0.40
Nodes (4): Requirement: All dep-free tasks are submitted in a single tick at infinite concurrency, Scenario: Finite concurrency still caps per-tick submission, Scenario: Infinite concurrency burst does not exceed candidate count, Scenario: Ten dep-free tasks spring to life within two ticks

### Community 157 - "Requirement: maxConcurrent is preserved when Scheduler is reconstructed"
Cohesion: 0.40
Nodes (4): Requirement: maxConcurrent is preserved when Scheduler is reconstructed, Scenario: Fresh cold-start still applies config default, Scenario: Quest selection preserves config-applied concurrency, Scenario: Quest selection preserves user-set infinite concurrency

### Community 158 - "files"
Cohesion: 0.40
Nodes (5): files, src/**/*.ts, src/**/*.tsx, schemas/**, src/templates/**

### Community 159 - "completion"
Cohesion: 0.40
Nodes (5): description, maximum, minimum, type, completion

### Community 160 - "subtasks"
Cohesion: 0.40
Nodes (5): $ref, subtasks, description, items, type

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

### Community 162 - "Fake Agent"
Cohesion: 0.50
Nodes (3): Behavior, Fake Agent, Usage

### Community 163 - "Tasks: fix-concurrency-boot-reset"
Cohesion: 0.50
Nodes (3): Implementation, Tasks: fix-concurrency-boot-reset, Verification

### Community 164 - "2026-03-21-fix-scheduler-oversubscription/tasks.md"
Cohesion: 0.50
Nodes (3): 1. Fix Status Set Membership in state.ts, 2. Update Unit Tests, 3. Verification

### Community 165 - "Accomplished"
Cohesion: 0.50
Nodes (4): Accomplished, Completed and archived:, Currently in progress:, What needs to happen next:

### Community 166 - "What we did"
Cohesion: 0.50
Nodes (4): Fix applied (`fix-concurrency-boot-reset`), Results, Root cause confirmed, What we did

### Community 167 - "Relevant files / directories"
Cohesion: 0.50
Nodes (4): OpenSpec:, Relevant files / directories, Source files (read and relevant):, Test files:

### Community 168 - "agent_type"
Cohesion: 0.50
Nodes (4): description, pattern, type, agent_type

### Community 169 - "constraints"
Cohesion: 0.50
Nodes (4): description, items, type, constraints

### Community 170 - "id"
Cohesion: 0.50
Nodes (4): description, pattern, type, id

### Community 171 - "references"
Cohesion: 0.50
Nodes (4): references, description, items, type

### Community 174 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **974 isolated node(s):** `$schema`, `read`, `edit`, `glob`, `grep` (+969 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `DaemonState`, `verifier.ts`, `toon.ts`, `commands/launch.ts`, `protocol.ts`, `commands/resume.ts`, `lib/launcher.ts`, `lib/tasks.ts`, `config.ts`, `commands/quest.ts`, `splash-screen.tsx`, `run-tui-app.tsx`, `scheduler.ts`, `commands/tui.ts`, `run-task-browser.tsx`, `worktree.ts`, `list.ts`, `prompt.ts`, `quest-store.ts`, `agent-registry.ts`, `lib/quest.ts`, `run-wave-monitor.tsx`, `task-schema.ts`, `Daemon`, `InkWomboTUI`, `run-daemon-monitor.tsx`, `errand-planner.ts`, `daemon/state.ts`, `init-writer.ts`, `genesis-planner.ts`, `run-onboarding.ts`, `graph.ts`, `onboarding-app.tsx`, `InkDaemonTUI`, `commands/usage.ts`, `commands/stats.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `TextBuffer` connect `TextBuffer` to `fake-task-wizard.tsx`, `ink/index.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Task` connect `DaemonState` to `agent-registry.ts`, `lib/quest.ts`, `toon.ts`, `commands/launch.ts`, `commands/resume.ts`, `task-schema.ts`, `UsageTotals`, `fake-task-wizard.tsx`, `lib/tasks.ts`, `errand-planner.ts`, `commands/quest.ts`, `scheduler.ts`, `task-browser.tsx`, `run-task-browser.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `cmdResume()` (e.g. with `.isRunning()` and `.killAll()`) actually correct?**
  _`cmdResume()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `read`, `edit` to the rest of the system?**
  _974 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.018018018018018018 - nodes in this community are weakly interconnected._
- **Should `DaemonState` be split into smaller, more focused modules?**
  _Cohesion score 0.05467856325783574 - nodes in this community are weakly interconnected._