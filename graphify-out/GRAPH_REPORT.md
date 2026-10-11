# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 426 files · ~520,772 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 24 file(s) not represented in the graph (top: .log 18, (none) 3, .jsonc 2)

## Summary
- 3764 nodes · 11196 edges · 145 communities (123 shown, 22 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 596 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9b74fbbd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- run-daemon-monitor.tsx
- agent-runner.ts
- protocol.ts
- state.ts
- run-task-browser.tsx
- task-store.ts
- react
- config.ts
- wishlist-store.ts
- ink/index.ts
- citty-registry.ts
- useScreenInput
- dashboard-metrics.ts
- commands/quest.ts
- project-store.ts
- splash-screen.tsx
- dashboard.tsx
- commands/launch.ts
- commands/tui.ts
- router.ts
- worktree.ts
- lib/tasks.ts
- monitor.ts
- lib/launcher.ts
- commands/completion.ts
- schema.ts
- genesis-planner.ts
- DaemonClient
- agent-registry.ts
- init-app.tsx
- lib/quest.ts
- wave-monitor.tsx
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- .load
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- analytics.ts
- merge-report.ts
- conflict-hunks.ts
- genesis-review.tsx
- daemon-agent-runner.test.ts
- ref_node_child_process
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- post-merge.ts
- Scheduler
- esc-menu.tsx
- quest-planner.ts
- toon.ts
- TextBuffer
- commands/merge.ts
- permission
- ref_node_path
- dashboard-provider.test.tsx
- config.test.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- analytics-overlay.tsx
- tdd-verifier.test.ts
- monitor-router.test.tsx
- graph.ts
- ProcessMonitor
- daemon-scheduler.test.ts
- run-progress.tsx
- graphify-pre-push.py
- outputError
- InkDaemonTUI
- analytics-browser.test.tsx
- agents/generalist-agent.md
- package.json
- task-browser.tsx
- prompt.ts
- commands/usage.ts
- .allComplete
- test-detection.ts
- test-runner.ts
- citty/tasks.ts
- .submitTask
- DashboardMetricsProvider
- analytics-summary.ts
- prompt-compress.ts
- commands/status.ts
- usage-overlay.tsx
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- ADDED Requirements
- analytics-lifecycle.test.ts
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- fake-agent-runner.ts
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- wishlist.ts
- select-input.tsx
- analytics-integration.test.ts
- ref_bun_test
- cli-smoke.test.ts
- hitl-ask.ts
- citty/merge.ts
- CONTEXT.md — For AI agents using wombo as a tool
- .handleStart
- maxConcurrent
- wombo-combo
- .doLaunch
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/logs.ts
- tdd-baseline-pipeline.test.ts
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- mergeBranch
- react-devtools-core.ts
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- merge-resolver-agent.md
- wombo-combo Operational Constraints
- wombo-combo Agent Context

## God Nodes (most connected - your core abstractions)
1. `WomboConfig` - 129 edges
2. `Explore mode guidelines and usage rules` - 114 edges
3. `react` - 113 edges
4. `ink` - 106 edges
5. `DaemonState` - 95 edges
6. `AgentRunner` - 84 edges
7. `useScreenInput()` - 66 edges
8. `maxConcurrent()` - 59 edges
9. `OutputFormat` - 57 edges
10. `outputError()` - 48 edges

## Surprising Connections (you probably didn't know these)
- `Why `concurrencyPinned` doesn't protect persisted state` --references--> `Scheduler`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/design.md → src/daemon/scheduler.ts
- `Modified Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/proposal.md → src/lib/eval-score.ts
- `New Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md → src/lib/eval-score.ts
- `Goals / Non-Goals` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-scheduler-oversubscription/design.md → src/lib/eval-score.ts
- `Why` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-scheduler-oversubscription/proposal.md → src/lib/eval-score.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (145 total, 22 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (94): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+86 more)

### Community 1 - "AgentRunner"
Cohesion: 0.16
Nodes (5): AgentRunner, getConflictDiffs(), runSafeCmd(), TaskEditorProps, Task

### Community 2 - "browser.ts"
Cohesion: 0.13
Nodes (14): BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult, discoverBrowserBin() (+6 more)

### Community 3 - "WomboConfig"
Cohesion: 0.12
Nodes (27): AbortCommandOptions, cmdAbort(), ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, EvalCommandOptions, HistoryCommandOptions (+19 more)

### Community 4 - "run-daemon-monitor.tsx"
Cohesion: 0.12
Nodes (34): ChromeLayout(), DashboardScreen(), DashboardStoreContext, EscMenuProvider(), getLocaleT(), I18nContext, defaultNav, NavigationContext (+26 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.14
Nodes (27): MaxEscalationTier, AgentRunnerConfig, FAKE_AGENT_VERIFICATION, isTierAllowed(), abortRebase(), beginRebase(), canMerge(), cleanupRebaseBranch() (+19 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (64): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+56 more)

### Community 7 - "state.ts"
Cohesion: 0.11
Nodes (16): AgentStatus, EvtAgentStatusChange, EvtSchedulerStatus, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, PersistedDaemonState (+8 more)

### Community 8 - "run-task-browser.tsx"
Cohesion: 0.12
Nodes (30): defaultLoadTaskQuests(), FakeTaskConfig, QuestPickerApp(), QuestPickerScreenProps, runQuestPickerInk(), analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES (+22 more)

### Community 9 - "task-store.ts"
Cohesion: 0.06
Nodes (69): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+61 more)

### Community 10 - "react"
Cohesion: 0.06
Nodes (48): ink, react, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardProps, ErrandWizardStep, STEP_INSTRUCTIONS (+40 more)

### Community 11 - "config.ts"
Cohesion: 0.10
Nodes (32): citty, parseLaunchArgs(), abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand (+24 more)

### Community 12 - "wishlist-store.ts"
Cohesion: 0.11
Nodes (35): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, formatDate(), truncateText() (+27 more)

### Community 13 - "ink/index.ts"
Cohesion: 0.04
Nodes (57): App(), AppProps, ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar() (+49 more)

### Community 14 - "citty-registry.ts"
Cohesion: 0.11
Nodes (18): abortCommand, cleanupCommand, completionCommand, daemonCommand, startCommand, statusCommand, stopCommand, evalCommand (+10 more)

### Community 15 - "useScreenInput"
Cohesion: 0.09
Nodes (46): useScreenInput(), buildPlanConfig(), DIFFICULTIES, PLAN_EDIT_FIELDS, PlanReviewApp(), PRIORITIES, reviewItemToTask(), taskStash (+38 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.09
Nodes (47): DashboardMetricsContext, DashboardMetricsValue, DASHBOARD_EVENTS, DashboardMetricsProviderProps, initialValue(), REAL_TIMERS, advanceThroughput(), alignBucket() (+39 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.13
Nodes (42): handleQuestSubcommand(), questAbandon(), questActivate(), questComplete(), questCreate(), questHelp(), questList(), questPause() (+34 more)

### Community 18 - "project-store.ts"
Cohesion: 0.06
Nodes (88): useChromeHideQuitHint(), ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp() (+80 more)

### Community 19 - "splash-screen.tsx"
Cohesion: 0.08
Nodes (36): upgradeCommand, channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm() (+28 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.10
Nodes (35): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+27 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.07
Nodes (43): Behavior, Fake Agent, Usage, analyzeBarrelFile(), BarrelFile, cmdLaunch(), detectUnprotectedBarrels(), findIndexFiles() (+35 more)

### Community 22 - "commands/tui.ts"
Cohesion: 0.15
Nodes (28): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+20 more)

### Community 23 - "router.ts"
Cohesion: 0.11
Nodes (24): genesisCommand, extractGlobalFlags(), ExtractResult, GlobalFlags, helpCommand, launchCommand, logsCommand, resumeCommand (+16 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (24): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), featureBranchName(), installDeps() (+16 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.10
Nodes (33): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), renderSubtask() (+25 more)

### Community 26 - "monitor.ts"
Cohesion: 0.06
Nodes (37): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+29 more)

### Community 27 - "lib/launcher.ts"
Cohesion: 0.05
Nodes (67): 1. Are agents spawned with `detached: true` and `unref()`?, resolveAgentBin(), AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat() (+59 more)

### Community 28 - "commands/completion.ts"
Cohesion: 0.18
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 29 - "schema.ts"
Cohesion: 0.11
Nodes (25): describeCommand, BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES (+17 more)

### Community 30 - "genesis-planner.ts"
Cohesion: 0.09
Nodes (32): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput, parseGenesisYaml() (+24 more)

### Community 31 - "DaemonClient"
Cohesion: 0.11
Nodes (8): delegateToDaemon(), waitForDaemonCompletion(), DaemonClient, CommandMap, DaemonMonitorAdapter(), DaemonMonitorShellProps, InkDaemonTUIOptions, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (29): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+21 more)

### Community 33 - "init-app.tsx"
Cohesion: 0.15
Nodes (20): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+12 more)

### Community 34 - "lib/quest.ts"
Cohesion: 0.07
Nodes (44): ParsedLaunchArgs, applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisCommandOptions, GenesisReviewResult, showGenesisReview(), sleep() (+36 more)

### Community 35 - "wave-monitor.tsx"
Cohesion: 0.10
Nodes (36): AllTasksDetail(), AllTasksItem(), ErrandsDetail(), ErrandsItem(), Header(), QuestDetail(), QuestListItem(), QuestPickerView() (+28 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.13
Nodes (32): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+24 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.15
Nodes (11): allocateExecutionId(), AnalyticsTracker, AnalyticsTrackerOptions, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState (+3 more)

### Community 39 - ".load"
Cohesion: 0.08
Nodes (24): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+16 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (27): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS (+19 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (36): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+28 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.11
Nodes (21): ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic, analyticsDir() (+13 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (40): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+32 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "genesis-review.tsx"
Cohesion: 0.14
Nodes (23): buildGenesisConfig(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES, questStash (+15 more)

### Community 48 - "daemon-agent-runner.test.ts"
Cohesion: 0.09
Nodes (18): CommandResult, defaultCommandRunner(), FAKE_AGENT_SENTINEL, PostMergeRequest, Env, EnvOpts, makeEnv(), ReentrantRunner (+10 more)

### Community 49 - "ref_node_child_process"
Cohesion: 0.12
Nodes (20): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+12 more)

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (17): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+9 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.09
Nodes (45): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), POST_MERGE_JOURNAL, VerificationSummary, saveTaskToStore(), createBlankTask() (+37 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "post-merge.ts"
Cohesion: 0.14
Nodes (27): MergeCommandDeps, normalizePostMergeConfig(), CommandRunner, Git, isComplete(), isJournal(), Journal, JournalOperation (+19 more)

### Community 54 - "Scheduler"
Cohesion: 0.14
Nodes (7): Context, 1. Concurrency Pinning — Scheduler.start(), 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification, CommandMessage, Scheduler

### Community 55 - "esc-menu.tsx"
Cohesion: 0.13
Nodes (18): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+10 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.14
Nodes (24): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), abortedPlanners, activePlanners, detectCycles(), dfs(), detectFileOverlaps() (+16 more)

### Community 57 - "toon.ts"
Cohesion: 0.06
Nodes (74): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+66 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/merge.ts"
Cohesion: 0.19
Nodes (20): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+12 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "ref_node_path"
Cohesion: 0.08
Nodes (19): root, appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult (+11 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.09
Nodes (11): ConnectionState, EventMap, EvtStateSnapshot, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, mount() (+3 more)

### Community 63 - "config.test.ts"
Cohesion: 0.14
Nodes (8): initCommand, cmdInit(), InitOptions, CONFIG_FILE, DEFAULT_CONFIG, InitWriterConfig, InitWriterResult, writeInitFiles()

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "analytics-overlay.tsx"
Cohesion: 0.19
Nodes (23): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABELS (+15 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.12
Nodes (27): extractBrowserErrorSummary(), buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions (+19 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.08
Nodes (5): LiveFakeClient, makeMinimalConfig(), openDashboardFromMenu(), sleep(), StubDaemonClient

### Community 68 - "graph.ts"
Cohesion: 0.21
Nodes (17): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+9 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.09
Nodes (13): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+5 more)

### Community 70 - "daemon-scheduler.test.ts"
Cohesion: 0.12
Nodes (9): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification, SchedulerConfig, SchedulerDeps, makeAgent(), makeConfig() (+1 more)

### Community 71 - "run-progress.tsx"
Cohesion: 0.19
Nodes (11): ProgressResult, ProgressView(), ProgressViewProps, SPIN_CHARS, ProgressApp(), ProgressController, RunConfirmOptions, RunProgressOptions (+3 more)

### Community 73 - "outputError"
Cohesion: 0.36
Nodes (14): questArchive(), cmdTasksAdd(), cmdTasksArchive(), cmdTasksSetDifficulty(), cmdTasksSetPriority(), cmdTasksSetStatus(), outputError(), outputMessage() (+6 more)

### Community 75 - "analytics-browser.test.tsx"
Cohesion: 0.14
Nodes (13): ANALYTICS_REFRESH_MS, createAnalyticsRecord(), emptyUsageTotals(), rec(), r(), rec(), Harness, mount() (+5 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.05
Nodes (39): author, bin, woco, bugs, url, dependencies, citty, ink (+31 more)

### Community 78 - "task-browser.tsx"
Cohesion: 0.19
Nodes (16): agentStatusColor(), Header(), PRIORITY_ABBREV, StatusBar(), TaskBrowserView(), TaskBrowserViewProps, TaskDetail(), TaskListItem() (+8 more)

### Community 79 - "prompt.ts"
Cohesion: 0.17
Nodes (14): formatHunksForLLM(), Tier25Result, TieredMergeResult, portlessUrl(), ConflictResolutionContext, formatSubtask(), formatTestBaselineSection(), generateConflictResolutionPrompt() (+6 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.11
Nodes (31): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+23 more)

### Community 81 - ".allComplete"
Cohesion: 0.07
Nodes (27): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle (+19 more)

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 84 - "citty/tasks.ts"
Cohesion: 0.14
Nodes (10): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setStatusCommand (+2 more)

### Community 85 - ".submitTask"
Cohesion: 0.08
Nodes (21): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+13 more)

### Community 86 - "DashboardMetricsProvider"
Cohesion: 0.13
Nodes (10): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, addInto(), cloneTotals(), DashboardUsageReader, emptyTotals() (+2 more)

### Community 87 - "analytics-summary.ts"
Cohesion: 0.26
Nodes (12): AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsGroup, dedupeExecutions(), filterExecutions(), GROUP_KEY (+4 more)

### Community 88 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 89 - "commands/status.ts"
Cohesion: 0.14
Nodes (27): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), DaemonAgentState (+19 more)

### Community 90 - "usage-overlay.tsx"
Cohesion: 0.33
Nodes (8): formatCost(), GROUPING_FIELDS, GROUPING_LABELS, GroupItem(), OverallSummary(), makeGroups(), makeTotals(), UsageOverlayView()

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: mergeBranch creates tmp worktree outside the repo, Scenario: syncQuestBranch creates tmp worktree outside the repo

### Community 94 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.16
Nodes (11): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+3 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "fake-agent-runner.ts"
Cohesion: 0.44
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.10
Nodes (5): Assistant (Build · claude-sonnet-4.6 · 26.9s), Assistant (Build · claude-sonnet-4.6 · 7.5s), The actual bugs — precise diagnosis, DaemonState, makePopulatedState()

### Community 101 - "wishlist.ts"
Cohesion: 0.22
Nodes (5): addCommand, deleteCommand, listCommand, moveCommand, wishlistCommand

### Community 102 - "select-input.tsx"
Cohesion: 0.32
Nodes (5): SelectInput(), SelectInputProps, createTestStreams(), ITEMS, renderLive()

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "ref_bun_test"
Cohesion: 0.07
Nodes (9): createTestStreams(), noopSave, renderLive(), stripAnsi(), FakeDaemonClient, liveStreams(), makeMinimalConfig(), mountTuiApp() (+1 more)

### Community 105 - "cli-smoke.test.ts"
Cohesion: 0.20
Nodes (12): buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess(), runSrc() (+4 more)

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "citty/merge.ts"
Cohesion: 0.60
Nodes (3): mergeCommand, parseMergeArgs(), parseTaskList()

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 109 - ".handleStart"
Cohesion: 0.07
Nodes (34): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+26 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (60): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+52 more)

### Community 113 - "wombo-combo"
Cohesion: 0.12
Nodes (15): Agent Analytics, Commands, Coverage limitations, Entry points, Install, Launch options, License, Merge, changelog and pull requests (+7 more)

### Community 117 - ".doLaunch"
Cohesion: 0.08
Nodes (20): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Quest test baselines, Supported test output (+12 more)

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "commands/logs.ts"
Cohesion: 0.36
Nodes (8): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), renderLogs()

### Community 123 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

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

### Community 132 - "mergeBranch"
Cohesion: 0.07
Nodes (33): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+25 more)

### Community 137 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

## Knowledge Gaps
- **3 isolated node(s):** `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1064 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `run-daemon-monitor.tsx`, `agent-runner.ts`, `protocol.ts`, `run-task-browser.tsx`, `task-store.ts`, `config.ts`, `commands/quest.ts`, `project-store.ts`, `splash-screen.tsx`, `commands/launch.ts`, `commands/tui.ts`, `worktree.ts`, `lib/tasks.ts`, `monitor.ts`, `lib/launcher.ts`, `genesis-planner.ts`, `DaemonClient`, `agent-registry.ts`, `lib/quest.ts`, `task-schema.ts`, `Daemon`, `daemon-agent-runner.test.ts`, `ref_node_child_process`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `post-merge.ts`, `quest-planner.ts`, `toon.ts`, `commands/merge.ts`, `config.test.ts`, `tdd-verifier.test.ts`, `graph.ts`, `daemon-scheduler.test.ts`, `outputError`, `InkDaemonTUI`, `prompt.ts`, `commands/usage.ts`, `commands/status.ts`, `analytics-lifecycle.test.ts`, `tdd-baseline-integration.test.ts`, `analytics-integration.test.ts`, `tdd-baseline-pipeline.test.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `@types/bun`, `@types/react`, `typescript` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._
- **Why does `maxConcurrent()` connect `maxConcurrent` to `DaemonState`, `.load`, `2026-03-21-fix-scheduler-oversubscription/proposal.md`, `.handleStart`, `.allComplete`, `Scheduler`, `toon.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `agent-runner.ts`, `protocol.ts`, `state.ts`, `task-store.ts`, `config.ts`, `commands/launch.ts`, `AnalyticsTracker`, `.load`, `Daemon`, `daemon-agent-runner.test.ts`, `ref_node_child_process`, `post-merge-integration.test.ts`, `commands/merge.ts`, `daemon-scheduler.test.ts`, `.allComplete`, `commands/status.ts`, `analytics-lifecycle.test.ts`, `analytics-integration.test.ts`, `.handleStart`, `maxConcurrent`, `.doLaunch`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `WomboConfig` be split into smaller, more focused modules?**
  _Cohesion score 0.1206896551724138 - nodes in this community are weakly interconnected._