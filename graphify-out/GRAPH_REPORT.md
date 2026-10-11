# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 470 files · ~537,986 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: .log 18, (none) 4, .jsonc 2)

## Summary
- 4050 nodes · 11692 edges · 184 communities (154 shown, 30 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 660 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9207d95f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- Source files (read and relevant):
- agent-runner.ts
- protocol.ts
- run-daemon-monitor.tsx
- task-graph.ts
- task-store.ts
- citty/tasks.ts
- output.ts
- templates.ts
- chrome.tsx
- commands/tui.ts
- review-list.tsx
- dashboard-metrics.ts
- commands/quest.ts
- project-store.ts
- commands/upgrade.ts
- dashboard.tsx
- commands/launch.ts
- ink/index.ts
- quest-picker.tsx
- worktree.ts
- lib/tasks.ts
- monitor.ts
- hitl-channel.ts
- index.md
- commands/completion.ts
- scout.ts
- DaemonClient
- agent-registry.ts
- init-app.tsx
- citty-registry.ts
- task-browser.tsx
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- Minimal, surgical fix
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- analytics.ts
- merge-report.ts
- conflict-hunks.ts
- genesis-planner.ts
- lib/launcher.ts
- ref_node_child_process
- test-baseline-capture.ts
- ref_node_fs
- dashboard-realtime.test.tsx
- commands/merge.ts
- quest-store.ts
- quest.md
- quest-planner.ts
- eval-score.ts
- TextBuffer
- commands/tasks.md
- permission
- changelog.ts
- dashboard-provider.test.tsx
- commands/status.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- analytics-overlay.tsx
- tdd-verifier.test.ts
- monitor-router.test.tsx
- graph.ts
- ProcessMonitor
- daemon-scheduler.test.ts
- schema.ts
- graphify-pre-push.py
- post-merge.ts
- InkDaemonTUI
- daemon-agent-runner.test.ts
- agents/generalist-agent.md
- package.json
- docs/package.json
- prompt-compress.ts
- commands/usage.ts
- ADDED Requirements
- test-detection.ts
- test-runner.ts
- toon.ts
- Requirement: Launch stagger applies only to real-agent launches
- DashboardMetricsProvider
- outputError
- config.ts
- .text
- ref_bun_test
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- gen-command-docs.ts
- analytics-lifecycle.test.ts
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- run-quest-picker.tsx
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- citty/quest.ts
- gen-config-docs.ts
- analytics-integration.test.ts
- run-task-browser.tsx
- cli-smoke.test.ts
- hitl-ask.ts
- daemon-project-context.test.ts
- CONTEXT.md — For AI agents using wombo as a tool
- Scheduler
- maxConcurrent
- daemon.md
- Agent Process Lifecycle Audit
- openspec/specs/scheduler-concurrency-accounting/spec.md
- TuiSession
- commands/stats.ts
- resume.md
- tdd-baseline.md
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/logs.ts
- theme.ts
- SchedulerConfig
- splash-screen.tsx
- tdd-baseline-pipeline.test.ts
- StubDaemonClient
- onboarding-helpers.ts
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- toon-spec.ts
- tmpDir
- build.ts
- react-devtools-core.ts
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- token-usage.ts
- commands/history.ts
- commands/eval.ts
- fake-agent-runner.ts
- router.ts
- merge-resolver-agent.md
- file-scopes.ts
- overview.md
- Requirement: Launch stagger applies only to real-agent launches
- first-task.md
- quests.md
- Requirement: Fake-agent tasks bypass inter-launch stagger
- wombo-combo Operational Constraints
- Requirement: Fake-agent tasks bypass inter-launch stagger
- install.md
- docs/tsconfig.json
- genesis.md
- logs.md
- quest create
- quest archive
- tasks add
- wombo-combo Agent Context
- tasks archive
- docs-starlight knowledge
- abort.md
- cleanup.md
- describe.md
- eval.md
- merge.md

## God Nodes (most connected - your core abstractions)
1. `WomboConfig` - 132 edges
2. `Explore mode guidelines and usage rules` - 114 edges
3. `react` - 113 edges
4. `ink` - 106 edges
5. `DaemonState` - 97 edges
6. `AgentRunner` - 87 edges
7. `useScreenInput()` - 66 edges
8. `maxConcurrent()` - 59 edges
9. `OutputFormat` - 57 edges
10. `outputError()` - 48 edges

## Surprising Connections (you probably didn't know these)
- `Daemon` --references--> `AgentRunner`  [INFERRED]
  docs/src/content/docs/architecture/overview.md → src/daemon/agent-runner.ts
- `Why `concurrencyPinned` doesn't protect persisted state` --references--> `Scheduler`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/design.md → src/daemon/scheduler.ts
- `Modified Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/proposal.md → src/lib/eval-score.ts
- `New Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md → src/lib/eval-score.ts
- `Goals / Non-Goals` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-scheduler-oversubscription/design.md → src/lib/eval-score.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (184 total, 30 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (94): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+86 more)

### Community 1 - "AgentRunner"
Cohesion: 0.10
Nodes (12): Decision 1: Skip stagger for fake agents at the queue-processing level, 1. AgentRunner — Per-entry stagger flag, 3. Unit Tests, 4. Verification, Assistant (Build · claude-sonnet-4.6 · 6.2s), AgentRunner, getConflictDiffs(), runSafeCmd() (+4 more)

### Community 2 - "browser.ts"
Cohesion: 0.05
Nodes (35): Cleanup, Daemon and TUI, Launch, Merge, Monitoring and recovery, Verification, Commands, Agent Analytics (+27 more)

### Community 3 - "WomboConfig"
Cohesion: 0.12
Nodes (31): AbortCommandOptions, cmdAbort(), CleanupOptions, EvalCommandOptions, GenesisCommandOptions, HistoryCommandOptions, LaunchCommandOptions, MergeCommandOptions (+23 more)

### Community 4 - "Source files (read and relevant):"
Cohesion: 0.08
Nodes (29): Context, 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals (+21 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.10
Nodes (37): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), FileHunkResult, Tier25Result, abortRebase(), beginRebase(), canMerge() (+29 more)

### Community 6 - "protocol.ts"
Cohesion: 0.05
Nodes (70): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+62 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.05
Nodes (68): ChromeLayout(), DashboardScreen(), defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps (+60 more)

### Community 8 - "task-graph.ts"
Cohesion: 0.20
Nodes (13): TaskBrowserViewProps, TaskNode, defaultProps(), EMPTY_USAGE, makeNode(), makeTask(), flattenStreams(), parseDurationMinutes() (+5 more)

### Community 9 - "task-store.ts"
Cohesion: 0.06
Nodes (73): Top-level options, Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities (+65 more)

### Community 10 - "citty/tasks.ts"
Cohesion: 0.13
Nodes (10): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setStatusCommand (+2 more)

### Community 11 - "output.ts"
Cohesion: 0.13
Nodes (20): citty, daemonCommand, startCommand, statusCommand, stopCommand, parseLaunchArgs(), loadProjectConfigSync(), statsCommand (+12 more)

### Community 12 - "templates.ts"
Cohesion: 0.06
Nodes (61): Behavior, Fake Agent, Usage, yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions (+53 more)

### Community 13 - "chrome.tsx"
Cohesion: 0.11
Nodes (21): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+13 more)

### Community 14 - "commands/tui.ts"
Cohesion: 0.11
Nodes (36): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+28 more)

### Community 15 - "review-list.tsx"
Cohesion: 0.06
Nodes (66): buildGenesisConfig(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES, questStash (+58 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.08
Nodes (52): EvtAgentActivity, EvtBuildResult, EvtMergeResult, SchedulerStatus, DashboardMetricsContext, DashboardMetricsValue, clientState(), DASHBOARD_EVENTS (+44 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.10
Nodes (46): ParsedLaunchArgs, handleQuestSubcommand(), questAbandon(), questActivate(), QuestCommandOptions, questComplete(), questCreate(), questHelp() (+38 more)

### Community 18 - "project-store.ts"
Cohesion: 0.06
Nodes (83): useChromeHideQuitHint(), ConfirmDialog(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps (+75 more)

### Community 19 - "commands/upgrade.ts"
Cohesion: 0.21
Nodes (16): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+8 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.12
Nodes (27): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+19 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.09
Nodes (40): analyzeBarrelFile(), BarrelFile, cmdLaunch(), delegateToDaemon(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), waitForDaemonCompletion() (+32 more)

### Community 22 - "ink/index.ts"
Cohesion: 0.08
Nodes (34): App(), AppProps, ConfirmDialogProps, EditableField(), EditableFieldProps, FieldDef, FIELDS, InitForm() (+26 more)

### Community 23 - "quest-picker.tsx"
Cohesion: 0.20
Nodes (16): AllTasksDetail(), AllTasksItem(), ErrandsDetail(), ErrandsItem(), Header(), QuestDetail(), QuestListItem(), QuestPickerView() (+8 more)

### Community 24 - "worktree.ts"
Cohesion: 0.15
Nodes (23): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), featureBranchName(), installDeps() (+15 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.07
Nodes (42): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, formatHunksForLLM(), DepGraphNode (+34 more)

### Community 26 - "monitor.ts"
Cohesion: 0.09
Nodes (16): extractActivity(), formatEventForLog(), MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, shortCmd(), shortPath() (+8 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.07
Nodes (19): Arguments, Global flags, Global flags, Arguments, Global flags, Global flags, Flags, Global flags (+11 more)

### Community 29 - "commands/completion.ts"
Cohesion: 0.19
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 30 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 31 - "DaemonClient"
Cohesion: 0.11
Nodes (7): DaemonClient, CommandMap, parseMessage(), DaemonMonitorAdapter(), DaemonMonitorShellProps, InkDaemonTUIOptions, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (29): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+21 more)

### Community 33 - "init-app.tsx"
Cohesion: 0.18
Nodes (15): initCommand, cmdInit(), InitOptions, InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp() (+7 more)

### Community 34 - "citty-registry.ts"
Cohesion: 0.15
Nodes (20): completionCommand, upgradeCommand, BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride (+12 more)

### Community 35 - "task-browser.tsx"
Cohesion: 0.11
Nodes (33): AgentStatus, DashboardAgent, agentStatusColor(), Header(), PRIORITY_ABBREV, StatusBar(), TaskBrowserView(), TaskDetail() (+25 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.12
Nodes (34): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CreateOrUpdatePrOptions, createOrUpdatePullRequest() (+26 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.13
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - "Minimal, surgical fix"
Cohesion: 0.20
Nodes (9): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+1 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (31): cmdTasksAdd(), CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER (+23 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (32): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES, isObject() (+24 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.08
Nodes (29): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+21 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (40): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+32 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.17
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), getMergeBaseContent(), getOursContent() (+14 more)

### Community 47 - "genesis-planner.ts"
Cohesion: 0.20
Nodes (13): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), GenesisOutput, parseGenesisYaml(), runGenesisPlanner() (+5 more)

### Community 48 - "lib/launcher.ts"
Cohesion: 0.18
Nodes (16): 1. Are agents spawned with `detached: true` and `unref()`?, resolveAgentBin(), agentEnv(), AgentType, ConflictResolverOptions, detectAgentType(), launchConflictResolver(), launchHeadless() (+8 more)

### Community 49 - "ref_node_child_process"
Cohesion: 0.07
Nodes (31): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `defaults`, `git`, `install` (+23 more)

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.12
Nodes (19): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+11 more)

### Community 51 - "ref_node_fs"
Cohesion: 0.07
Nodes (48): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), POST_MERGE_JOURNAL, VerificationSummary, createBlankTask(), addVerifiedAgent() (+40 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "commands/merge.ts"
Cohesion: 0.19
Nodes (20): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+12 more)

### Community 54 - "quest-store.ts"
Cohesion: 0.16
Nodes (26): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), archivedKnowledgeDir(), archivedKnowledgeFilePath() (+18 more)

### Community 55 - "quest.md"
Cohesion: 0.07
Nodes (26): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags (+18 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.11
Nodes (30): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), generateGenesisPrompt(), loadProjectContext(), abortedPlanners, activePlanners, detectCycles() (+22 more)

### Community 57 - "eval-score.ts"
Cohesion: 0.14
Nodes (17): clampScore(), intervalsOverlap(), loadEvalReport(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), ScoreReport, scoreRouting() (+9 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.07
Nodes (26): Arguments, Arguments, Arguments, Arguments, Flags, Flags, Flags, Flags (+18 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.10
Nodes (12): ConnectionState, EventMap, EvtStateSnapshot, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, Harness (+4 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.15
Nodes (26): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), DaemonAgentState (+18 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "analytics-overlay.tsx"
Cohesion: 0.12
Nodes (34): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABELS (+26 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.12
Nodes (27): extractBrowserErrorSummary(), buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions (+19 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.09
Nodes (6): LiveFakeClient, makeMinimalConfig(), mountShell(), openDashboardFromMenu(), sleep(), StubDaemonClient

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.18
Nodes (5): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Findings, isProcessRunning(), ProcessMonitor

### Community 70 - "daemon-scheduler.test.ts"
Cohesion: 0.18
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

### Community 71 - "schema.ts"
Cohesion: 0.13
Nodes (16): describeCommand, mergeCommand, ParsedMergeArgs, parseMergeArgs(), parseTaskList(), aliasHint(), allCommandSchemas(), buildAliasMap() (+8 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.14
Nodes (29): MergeCommandDeps, normalizePostMergeConfig(), AgentRunnerConfig, CommandRunner, sanitizeInline(), Git, isComplete(), isJournal() (+21 more)

### Community 75 - "daemon-agent-runner.test.ts"
Cohesion: 0.10
Nodes (16): FAKE_AGENT_SENTINEL, PostMergeRequest, Env, EnvOpts, makeEnv(), ReentrantRunner, SpyRunner, TestableAgentRunner (+8 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.05
Nodes (40): author, bin, woco, bugs, url, dependencies, citty, ink (+32 more)

### Community 78 - "docs/package.json"
Cohesion: 0.11
Nodes (15): dependencies, astro, @astrojs/starlight, description, name, private, scripts, build (+7 more)

### Community 79 - "prompt-compress.ts"
Cohesion: 0.27
Nodes (10): abbreviateConstraintLine(), collapseConsecutiveBlanks(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens(), measureCompression() (+2 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.14
Nodes (30): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+22 more)

### Community 81 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded (+3 more)

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.22
Nodes (15): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+7 more)

### Community 84 - "toon.ts"
Cohesion: 0.28
Nodes (22): encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGeneric(), renderGraph() (+14 more)

### Community 85 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 86 - "DashboardMetricsProvider"
Cohesion: 0.10
Nodes (14): DashboardMetricsProvider(), TimerApi, addInto(), buildTaskQuestMap(), cloneTotals(), DashboardUsageReader, emptyTotals(), mergeInto() (+6 more)

### Community 87 - "outputError"
Cohesion: 0.35
Nodes (14): questArchive(), cmdTasksArchive(), cmdTasksSetDifficulty(), cmdTasksSetPriority(), cmdTasksSetStatus(), cmdTasksShow(), renderSubtask(), statusColor() (+6 more)

### Community 88 - "config.ts"
Cohesion: 0.09
Nodes (20): ParsedResumeArgs, parseResumeArgs(), ParsedRetryArgs, parseRetryArgs(), retryCommand, AgentRegistryConfig, CONFIG_FILE, deepMerge() (+12 more)

### Community 89 - ".text"
Cohesion: 0.18
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.04
Nodes (63): ink, react, ConfirmDialog(), ErrandWizard(), ErrandWizardStep, STEP_INSTRUCTIONS, STEP_TITLES, STEPS (+55 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "gen-command-docs.ts"
Cohesion: 0.36
Nodes (13): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+5 more)

### Community 94 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.16
Nodes (11): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+3 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.23
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "run-quest-picker.tsx"
Cohesion: 0.24
Nodes (13): questList(), defaultLoadTaskQuests(), QuestSummary, QuestPickerApp(), QuestPickerScreenProps, runQuestPickerInk(), RunQuestPickerOptions, getQuestTaskIds() (+5 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.06
Nodes (23): Capabilities, Impact, Modified Capabilities, What Changes, Why, Implementation, Tasks: fix-concurrency-boot-reset, Verification (+15 more)

### Community 101 - "citty/quest.ts"
Cohesion: 0.14
Nodes (10): abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand, pauseCommand, planCommand (+2 more)

### Community 102 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.16
Nodes (9): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), SRC_ENTRY, store() (+1 more)

### Community 104 - "run-task-browser.tsx"
Cohesion: 0.07
Nodes (25): ErrandWizardProps, ANALYTICS_REFRESH_MS, analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS (+17 more)

### Community 105 - "cli-smoke.test.ts"
Cohesion: 0.20
Nodes (12): buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess(), runSrc() (+4 more)

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "daemon-project-context.test.ts"
Cohesion: 0.25
Nodes (10): Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states (+2 more)

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.13
Nodes (13): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo? (+5 more)

### Community 109 - "Scheduler"
Cohesion: 0.09
Nodes (23): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+15 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (55): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+47 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "Agent Process Lifecycle Audit"
Cohesion: 0.22
Nodes (8): Agent Process Lifecycle Audit, Files with Audit Annotations, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations, Shutdown Flows, Summary, Ungraceful Shutdown (SIGKILL / crash / OOM)

### Community 113 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.18
Nodes (10): Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: New agents are not launched to fill slots held by verified agents (+2 more)

### Community 114 - "TuiSession"
Cohesion: 0.24
Nodes (4): getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 115 - "commands/stats.ts"
Cohesion: 0.29
Nodes (12): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+4 more)

### Community 116 - "resume.md"
Cohesion: 0.50
Nodes (3): Flags, Global flags, r()

### Community 117 - "tdd-baseline.md"
Cohesion: 0.22
Nodes (8): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Supported test output, What is recorded

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "commands/logs.ts"
Cohesion: 0.36
Nodes (8): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), renderLogs()

### Community 121 - "theme.ts"
Cohesion: 0.19
Nodes (14): ASCII_LEVELS, clean(), formatSparkline(), Sparkline(), SparklineOptions, SparklineProps, UNICODE_LEVELS, useAsciiGraphics() (+6 more)

### Community 122 - "SchedulerConfig"
Cohesion: 0.33
Nodes (5): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification, SchedulerConfig

### Community 123 - "splash-screen.tsx"
Cohesion: 0.13
Nodes (19): ALL_LOGO_LINES, CheckFn, CheckStatus, COMBO_LINES, getLogoCharColor(), hslToHex(), PreflightCheck, runCheck() (+11 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 126 - "onboarding-helpers.ts"
Cohesion: 0.60
Nodes (5): buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks(), formatProfileAsMarkdown(), runLlmSynthesis()

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

### Community 131 - "toon-spec.ts"
Cohesion: 0.12
Nodes (13): TaskStatus, buildToonSpec(), renderToonLegend(), TOON_COMMAND_SPECS, TOON_DIFFICULTY_DECODE, TOON_DIFFICULTY_ENCODE, TOON_PRIORITY_DECODE, TOON_PRIORITY_ENCODE (+5 more)

### Community 132 - "tmpDir"
Cohesion: 0.06
Nodes (35): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+27 more)

### Community 137 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 139 - "token-usage.ts"
Cohesion: 0.28
Nodes (11): formatCost(), GROUPING_FIELDS, GROUPING_LABELS, GroupItem(), OverallSummary(), makeGroups(), makeTotals(), UsageOverlayView() (+3 more)

### Community 140 - "commands/history.ts"
Cohesion: 0.40
Nodes (10): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+2 more)

### Community 142 - "commands/eval.ts"
Cohesion: 0.23
Nodes (15): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), saveEvalReport(), computeDuration(), daemonSessionToHistory() (+7 more)

### Community 143 - "fake-agent-runner.ts"
Cohesion: 0.54
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 144 - "router.ts"
Cohesion: 0.09
Nodes (29): abortCommand, cleanupCommand, evalCommand, genesisCommand, extractGlobalFlags(), ExtractResult, GlobalFlags, helpCommand (+21 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "file-scopes.ts"
Cohesion: 0.54
Nodes (6): formatScopePartitions(), isSegmentPrefix(), normalizeScopePath(), pathsOverlap(), scopePartitions(), segments()

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 149 - "first-task.md"
Cohesion: 0.29
Nodes (6): 1. Initialize the project, 2. Add a task, 3. Preview, then launch, 4. Verify and merge, 5. Clean up, Where to go next

### Community 150 - "quests.md"
Cohesion: 0.33
Nodes (5): Branches, Constraints, Lifecycle, Planning, TDD

### Community 151 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 153 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 154 - "install.md"
Cohesion: 0.40
Nodes (4): Install, Next, Shell completions, Working on wombo-combo itself

### Community 155 - "docs/tsconfig.json"
Cohesion: 0.40
Nodes (4): exclude, extends, include, astro/tsconfigs/strict

### Community 156 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 157 - "logs.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 158 - "quest create"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest create

### Community 159 - "quest archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest archive

### Community 160 - "tasks add"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks add

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

### Community 162 - "tasks archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks archive

### Community 163 - "docs-starlight knowledge"
Cohesion: 0.50
Nodes (3): Decisions, docs-starlight knowledge, File ownership

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1188 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `agent-runner.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `task-store.ts`, `commands/history.ts`, `templates.ts`, `commands/eval.ts`, `commands/tui.ts`, `commands/quest.ts`, `project-store.ts`, `commands/launch.ts`, `worktree.ts`, `lib/tasks.ts`, `DaemonClient`, `agent-registry.ts`, `task-schema.ts`, `Daemon`, `analytics.ts`, `genesis-planner.ts`, `lib/launcher.ts`, `ref_node_child_process`, `test-baseline-capture.ts`, `ref_node_fs`, `commands/merge.ts`, `quest-store.ts`, `quest-planner.ts`, `eval-score.ts`, `commands/status.ts`, `tdd-verifier.test.ts`, `graph.ts`, `daemon-scheduler.test.ts`, `post-merge.ts`, `InkDaemonTUI`, `daemon-agent-runner.test.ts`, `commands/usage.ts`, `outputError`, `config.ts`, `analytics-lifecycle.test.ts`, `tdd-baseline-integration.test.ts`, `run-quest-picker.tsx`, `analytics-integration.test.ts`, `run-task-browser.tsx`, `daemon-project-context.test.ts`, `commands/stats.ts`, `SchedulerConfig`, `splash-screen.tsx`, `tdd-baseline-pipeline.test.ts`, `onboarding-helpers.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `Source files (read and relevant):`, `agent-runner.ts`, `protocol.ts`, `task-store.ts`, `commands/launch.ts`, `AnalyticsTracker`, `Minimal, surgical fix`, `Daemon`, `analytics.ts`, `ref_node_child_process`, `ref_node_fs`, `commands/merge.ts`, `commands/status.ts`, `daemon-scheduler.test.ts`, `daemon-agent-runner.test.ts`, `analytics-lifecycle.test.ts`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `maxConcurrent`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.10048076923076923 - nodes in this community are weakly interconnected._
- **Why does `AgentRunner` connect `AgentRunner` to `WomboConfig`, `Source files (read and relevant):`, `agent-runner.ts`, `protocol.ts`, `task-store.ts`, `commands/quest.ts`, `overview.md`, `Requirement: Launch stagger applies only to real-agent launches`, `commands/launch.ts`, `Requirement: Fake-agent tasks bypass inter-launch stagger`, `Requirement: Fake-agent tasks bypass inter-launch stagger`, `AnalyticsTracker`, `Daemon`, `ref_node_child_process`, `ref_node_fs`, `ProcessMonitor`, `daemon-scheduler.test.ts`, `post-merge.ts`, `daemon-agent-runner.test.ts`, `Requirement: Launch stagger applies only to real-agent launches`, `analytics-lifecycle.test.ts`, `DaemonState`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053877551020408164 - nodes in this community are weakly interconnected._