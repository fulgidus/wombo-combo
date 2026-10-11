# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 429 files · ~523,594 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 24 file(s) not represented in the graph (top: .log 18, (none) 3, .jsonc 2)

## Summary
- 3788 nodes · 11302 edges · 165 communities (144 shown, 21 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 598 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b9d55ac`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- router.tsx
- agent-runner.ts
- protocol.ts
- esc-menu.tsx
- run-task-browser.tsx
- task-store.ts
- citty/tasks.ts
- config.ts
- wishlist-store.ts
- chrome.tsx
- commands/tui.ts
- ink/index.ts
- dashboard-metrics.ts
- commands/quest.ts
- onboarding/index.ts
- commands/upgrade.ts
- dashboard.tsx
- commands/launch.ts
- run-progress.tsx
- quest-picker.tsx
- worktree.ts
- features.test.ts
- monitor.ts
- hitl-channel.ts
- project-store.ts
- commands/completion.ts
- scout.ts
- DaemonClient
- agent-registry.ts
- init-app.tsx
- quest-wizard.tsx
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
- genesis-planner.ts
- lib/launcher.ts
- ref_node_child_process
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- commands/merge.ts
- genesis-review.tsx
- run-daemon-monitor.tsx
- quest-planner.ts
- eval-score.ts
- TextBuffer
- templates.ts
- permission
- changelog.ts
- dashboard-provider.test.tsx
- state.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- analytics-overlay.tsx
- tdd-verifier.test.ts
- monitor-router.test.tsx
- graph.ts
- ProcessMonitor
- daemon-scheduler.test.ts
- ref_node_stream
- graphify-pre-push.py
- post-merge.ts
- InkDaemonTUI
- fake-gh.ts
- agents/generalist-agent.md
- package.json
- task-browser.tsx
- prompt.ts
- commands/usage.ts
- .allComplete
- tdd-verifier.ts
- test-runner.ts
- toon.ts
- .doLaunch
- DashboardMetricsProvider
- analytics-summary.ts
- lib/tasks.ts
- daemon/launcher.ts
- ref_bun_test
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- analytics-lifecycle.test.ts
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- run-quest-picker.tsx
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- saveTaskToStore
- format-converter.ts
- analytics-integration.test.ts
- tui-app.test.tsx
- cli-smoke.test.ts
- hitl-ask.ts
- daemon-project-context.test.ts
- CONTEXT.md — For AI agents using wombo as a tool
- .handleStart
- maxConcurrent
- openspec/specs/safe-tmp-worktree-placement/spec.md
- Agent Process Lifecycle Audit
- wombo-combo
- portless.ts
- token-usage.ts
- analytics-browser.test.tsx
- Quest test baselines
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/logs.ts
- theme.ts
- Scheduler
- splash-screen.tsx
- post-merge-types.ts
- StubDaemonClient
- run-onboarding.ts
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- toon-spec.ts
- tmpDir
- ref_node_fs
- react-devtools-core.ts
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- usage-overlay.tsx
- commands/history.ts
- lib/history.ts
- post-merge.test.ts
- global-flags.ts
- merge-resolver-agent.md
- file-scopes.ts
- task-weight.ts
- Requirement: Launch stagger applies only to real-agent launches
- ReentrantRunner
- wombo-combo Operational Constraints
- wombo-combo Agent Context

## God Nodes (most connected - your core abstractions)
1. `WomboConfig` - 132 edges
2. `Explore mode guidelines and usage rules` - 114 edges
3. `react` - 113 edges
4. `ink` - 106 edges
5. `DaemonState` - 97 edges
6. `AgentRunner` - 86 edges
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

## Communities (165 total, 21 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (97): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+89 more)

### Community 1 - "AgentRunner"
Cohesion: 0.15
Nodes (5): AgentRunner, getConflictDiffs(), runSafeCmd(), TaskEditorProps, Task

### Community 2 - "browser.ts"
Cohesion: 0.14
Nodes (13): BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult, discoverBrowserBin() (+5 more)

### Community 3 - "WomboConfig"
Cohesion: 0.09
Nodes (39): AbortCommandOptions, ParsedLaunchArgs, ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, cmdEval(), EvalCommandOptions (+31 more)

### Community 4 - "router.tsx"
Cohesion: 0.18
Nodes (14): defaultNav, NavigationContext, NavigationState, ScreenComponent, ScreenKey, ScreenMap, ScreenRouter(), ScreenRouterProps (+6 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.12
Nodes (33): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), Tier25Result, abortRebase(), beginRebase(), canMerge(), cleanupRebaseBranch() (+25 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (53): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, DaemonStatus, StartDaemonOptions (+45 more)

### Community 7 - "esc-menu.tsx"
Cohesion: 0.05
Nodes (39): saveConfig(), defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps (+31 more)

### Community 8 - "run-task-browser.tsx"
Cohesion: 0.13
Nodes (26): QuestPickerApp(), analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction (+18 more)

### Community 9 - "task-store.ts"
Cohesion: 0.17
Nodes (32): validateMeta(), validateTask(), archiveDir(), atomicWrite(), createBackup(), defaultMeta(), ensureDir(), flattenTask() (+24 more)

### Community 10 - "citty/tasks.ts"
Cohesion: 0.12
Nodes (30): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setStatusCommand (+22 more)

### Community 11 - "config.ts"
Cohesion: 0.05
Nodes (70): citty, abortCommand, cleanupCommand, completionCommand, daemonCommand, startCommand, statusCommand, stopCommand (+62 more)

### Community 12 - "wishlist-store.ts"
Cohesion: 0.10
Nodes (38): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, formatDate(), truncateText() (+30 more)

### Community 13 - "chrome.tsx"
Cohesion: 0.09
Nodes (30): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+22 more)

### Community 14 - "commands/tui.ts"
Cohesion: 0.15
Nodes (23): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), NullTree(), promptVisionText(), runDaemonMonitor() (+15 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.10
Nodes (45): useScreenInput(), ModalProps, getEditorCommand(), openEditor(), OpenEditorOptions, ConfirmPopup(), DetailPane(), ListItemRow() (+37 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.08
Nodes (51): DashboardMetricsContext, DashboardMetricsValue, DASHBOARD_EVENTS, DashboardMetricsProviderProps, defaultLoadTaskQuests(), initialValue(), REAL_TIMERS, ActivityEntry (+43 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.09
Nodes (63): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), handleQuestSubcommand(), questAbandon() (+55 more)

### Community 18 - "onboarding/index.ts"
Cohesion: 0.13
Nodes (39): ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps (+31 more)

### Community 19 - "commands/upgrade.ts"
Cohesion: 0.21
Nodes (16): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+8 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.14
Nodes (24): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+16 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.13
Nodes (25): analyzeBarrelFile(), BarrelFile, cmdLaunch(), delegateToDaemon(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), waitForDaemonCompletion() (+17 more)

### Community 22 - "run-progress.tsx"
Cohesion: 0.13
Nodes (21): maybeDeleteWishlistItem(), createIsolatedStdout(), getStableStdin(), ProgressResult, ProgressView(), ProgressViewProps, SPIN_CHARS, runErrandWizardInk() (+13 more)

### Community 23 - "quest-picker.tsx"
Cohesion: 0.18
Nodes (19): AllTasksDetail(), AllTasksItem(), ErrandsDetail(), ErrandsItem(), Header(), QuestDetail(), QuestListItem(), QuestPickerView() (+11 more)

### Community 24 - "worktree.ts"
Cohesion: 0.13
Nodes (28): cmdCleanup(), branchExists(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createQuestBranch(), createWorktree() (+20 more)

### Community 25 - "features.test.ts"
Cohesion: 0.10
Nodes (27): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), renderSubtask() (+19 more)

### Community 26 - "monitor.ts"
Cohesion: 0.10
Nodes (15): extractActivity(), formatEventForLog(), MonitoredProcess, OpenCodeEvent, ParsedOutput, shortCmd(), shortPath(), isTokenEvent() (+7 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "project-store.ts"
Cohesion: 0.11
Nodes (31): addObjective(), addRule(), atomicWrite(), bumpGenesisCount(), ensureDir(), formatProjectContext(), linkQuestToObjective(), loadProject() (+23 more)

### Community 29 - "commands/completion.ts"
Cohesion: 0.06
Nodes (64): parseMergeArgs(), parseTaskList(), buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), runCittyCommand(), aliasHint(), allCommandNames() (+56 more)

### Community 30 - "scout.ts"
Cohesion: 0.14
Nodes (18): buildKeywords(), buildScoutIndex(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex() (+10 more)

### Community 31 - "DaemonClient"
Cohesion: 0.10
Nodes (7): DaemonClient, EventType, EvtStateSnapshot, DaemonMonitorAdapter(), DaemonMonitorShellProps, InkDaemonTUIOptions, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (30): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+22 more)

### Community 33 - "init-app.tsx"
Cohesion: 0.12
Nodes (24): DEFAULT_CONFIG, InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand() (+16 more)

### Community 34 - "quest-wizard.tsx"
Cohesion: 0.11
Nodes (19): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), HITL_DESCRIPTIONS, PRIORITY_COLORS, QuestWizard(), STEPS, createTestStreams() (+11 more)

### Community 35 - "wave-monitor.tsx"
Cohesion: 0.14
Nodes (25): AgentStatus, DashboardAgent, ThemeTokens, AGENT_STATUS_COLORS, AGENT_STATUS_ICONS, elapsed(), progressBar(), QUEST_STATUS_ABBREV (+17 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.13
Nodes (32): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+24 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.13
Nodes (11): allocateExecutionId(), AnalyticsTracker, AnalyticsTrackerOptions, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState (+3 more)

### Community 39 - ".load"
Cohesion: 0.08
Nodes (23): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+15 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.17
Nodes (15): DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema, SchemaIssue, TASK_ARRAY_FIELDS, TASK_REQUIRED_FIELDS, fail() (+7 more)

### Community 41 - "Daemon"
Cohesion: 0.17
Nodes (3): Assistant (Build · claude-sonnet-4.6 · 9.4s), Daemon, CommandMap

### Community 42 - "test-baseline.ts"
Cohesion: 0.11
Nodes (31): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES, isObject() (+23 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.09
Nodes (25): ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic, analyticsDir() (+17 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.15
Nodes (31): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+23 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "genesis-planner.ts"
Cohesion: 0.20
Nodes (14): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput, parseGenesisYaml() (+6 more)

### Community 48 - "lib/launcher.ts"
Cohesion: 0.19
Nodes (18): 1. Are agents spawned with `detached: true` and `unref()`?, 3. Does `screen.destroy()` affect agent processes?, Findings, resolveAgentBin(), agentEnv(), AgentType, ConflictResolverOptions, detectAgentType() (+10 more)

### Community 49 - "ref_node_child_process"
Cohesion: 0.12
Nodes (20): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+12 more)

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.12
Nodes (19): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+11 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.07
Nodes (46): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), PostMergeRequest, VerificationSummary, createBlankTask(), addVerifiedAgent() (+38 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "commands/merge.ts"
Cohesion: 0.15
Nodes (25): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+17 more)

### Community 54 - "genesis-review.tsx"
Cohesion: 0.10
Nodes (34): buildGenesisConfig(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES, questStash (+26 more)

### Community 55 - "run-daemon-monitor.tsx"
Cohesion: 0.19
Nodes (23): ChromeLayout(), DashboardScreen(), DashboardStoreContext, EscMenuProvider(), getLocaleT(), I18nContext, buildDashStore(), createEmptyStore() (+15 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.11
Nodes (26): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), abortedPlanners, activePlanners, detectCycles(), dfs(), detectFileOverlaps() (+18 more)

### Community 57 - "eval-score.ts"
Cohesion: 0.14
Nodes (17): clampScore(), intervalsOverlap(), loadEvalReport(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), ScoreReport, scoreRouting() (+9 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "templates.ts"
Cohesion: 0.14
Nodes (20): Behavior, Fake Agent, Usage, isPortlessAvailable(), AGENT_TEMPLATE_PATH, applyHitlAwareness(), applyPlaceholders(), buildTddBlock() (+12 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.11
Nodes (10): ConnectionState, EventMap, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, mount(), streams() (+2 more)

### Community 63 - "state.ts"
Cohesion: 0.14
Nodes (19): DaemonAgentState, SchedulerState, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, PersistedDaemonState, StateListener (+11 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "analytics-overlay.tsx"
Cohesion: 0.19
Nodes (23): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABELS (+15 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.11
Nodes (25): extractBrowserErrorSummary(), extractTddErrorSummary(), TddVerificationOptions, createTestBaseline(), TestBaseline, BuildResult, extractErrorSummary(), FullVerificationOptions (+17 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.09
Nodes (6): LiveFakeClient, makeMinimalConfig(), mountShell(), openDashboardFromMenu(), sleep(), StubDaemonClient

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.20
Nodes (3): 2. Does `ProcessMonitor.killAll()` kill child processes?, isProcessRunning(), ProcessMonitor

### Community 70 - "daemon-scheduler.test.ts"
Cohesion: 0.17
Nodes (5): SchedulerDeps, makeAgent(), makeConfig(), makePopulatedState(), makeScopeScheduler()

### Community 71 - "ref_node_stream"
Cohesion: 0.12
Nodes (12): runApp(), RunAppOptions, InputHandler(), Shell(), ShellProps, StatusView(), StatusViewProps, FastSpinner() (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.21
Nodes (19): CommandResult, sanitizeInline(), Git, isComplete(), isJournal(), Journal, journalPath(), listIncompleteOperations() (+11 more)

### Community 75 - "fake-gh.ts"
Cohesion: 0.15
Nodes (11): CommandRunner, defaultCommandRunner(), EnvOpts, makeEnv(), FakeGh, FakeGhOptions, FakePr, makeFakeGh() (+3 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.05
Nodes (39): author, bin, woco, bugs, url, dependencies, citty, ink (+31 more)

### Community 78 - "task-browser.tsx"
Cohesion: 0.25
Nodes (13): agentStatusColor(), Header(), PRIORITY_ABBREV, StatusBar(), TaskBrowserView(), TaskBrowserViewProps, TaskDetail(), TaskListItem() (+5 more)

### Community 79 - "prompt.ts"
Cohesion: 0.12
Nodes (22): formatHunksForLLM(), portlessUrl(), abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource() (+14 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.14
Nodes (29): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+21 more)

### Community 81 - ".allComplete"
Cohesion: 0.07
Nodes (27): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle (+19 more)

### Community 82 - "tdd-verifier.ts"
Cohesion: 0.14
Nodes (26): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationResult, TestBaselineComparison, DEFAULT_TEST_DETECTION_CONFIG (+18 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.20
Nodes (16): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+8 more)

### Community 84 - "toon.ts"
Cohesion: 0.28
Nodes (22): encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGeneric(), renderGraph() (+14 more)

### Community 85 - ".doLaunch"
Cohesion: 0.08
Nodes (24): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected, 1. AgentRunner — Per-entry stagger flag, 3. Unit Tests (+16 more)

### Community 86 - "DashboardMetricsProvider"
Cohesion: 0.11
Nodes (14): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, addInto(), cloneTotals(), DashboardUsageReader, emptyTotals() (+6 more)

### Community 87 - "analytics-summary.ts"
Cohesion: 0.24
Nodes (13): AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions(), filterExecutions() (+5 more)

### Community 88 - "lib/tasks.ts"
Cohesion: 0.14
Nodes (18): allTaskIds(), ArchiveFile, areDependenciesMet(), ensureFeaturesFile, ensureWomboDir(), FEATURES_TEMPLATE_PATH, findInList(), findTaskById() (+10 more)

### Community 89 - "daemon/launcher.ts"
Cohesion: 0.14
Nodes (24): cmdAbort(), cmdResume(), cmdRetry(), waitForAgentTerminal(), agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs() (+16 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.05
Nodes (44): ink, react, App(), AppProps, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardStep (+36 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.17
Nodes (18): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+10 more)

### Community 94 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.17
Nodes (10): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+2 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "run-quest-picker.tsx"
Cohesion: 0.32
Nodes (7): ErrandWizardProps, FakeTaskConfig, QuestPickerAction, QuestPickerScreenProps, RunQuestPickerOptions, TuiAppCallbacks, ErrandSpec

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.10
Nodes (5): Assistant (Build · claude-sonnet-4.6 · 26.9s), Assistant (Build · claude-sonnet-4.6 · 7.5s), The actual bugs — precise diagnosis, DaemonState, makeRunner()

### Community 101 - "saveTaskToStore"
Cohesion: 0.15
Nodes (17): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+9 more)

### Community 102 - "format-converter.ts"
Cohesion: 0.27
Nodes (11): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+3 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "tui-app.test.tsx"
Cohesion: 0.17
Nodes (5): stripAnsi(), FakeDaemonClient, liveStreams(), makeMinimalConfig(), mountTuiApp()

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
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 109 - ".handleStart"
Cohesion: 0.08
Nodes (32): Context, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities (+24 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (60): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+52 more)

### Community 111 - "openspec/specs/safe-tmp-worktree-placement/spec.md"
Cohesion: 0.20
Nodes (9): Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo, Scenario: syncQuestBranch creates tmp worktree outside the repo (+1 more)

### Community 112 - "Agent Process Lifecycle Audit"
Cohesion: 0.22
Nodes (8): Agent Process Lifecycle Audit, Files with Audit Annotations, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations, Shutdown Flows, Summary, Ungraceful Shutdown (SIGKILL / crash / OOM)

### Community 113 - "wombo-combo"
Cohesion: 0.12
Nodes (15): Agent Analytics, Commands, Coverage limitations, Entry points, Install, Launch options, License, Merge, changelog and pull requests (+7 more)

### Community 114 - "portless.ts"
Cohesion: 0.54
Nodes (7): ensureProxyRunning(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus(), resolvePortlessBin(), wrapWithPortless()

### Community 115 - "token-usage.ts"
Cohesion: 0.20
Nodes (14): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+6 more)

### Community 116 - "analytics-browser.test.tsx"
Cohesion: 0.16
Nodes (11): ANALYTICS_REFRESH_MS, createAnalyticsRecord(), emptyUsageTotals(), r(), Harness, mount(), h, rec() (+3 more)

### Community 117 - "Quest test baselines"
Cohesion: 0.20
Nodes (9): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Quest test baselines, Supported test output (+1 more)

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
Cohesion: 0.20
Nodes (13): ASCII_LEVELS, clean(), formatSparkline(), Sparkline(), SparklineOptions, SparklineProps, UNICODE_LEVELS, useAsciiGraphics() (+5 more)

### Community 122 - "Scheduler"
Cohesion: 0.11
Nodes (12): D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification, Context, 1. Concurrency Pinning — Scheduler.start(), 2. Infinite-Concurrency Burst — Tick Loop (+4 more)

### Community 123 - "splash-screen.tsx"
Cohesion: 0.13
Nodes (16): ALL_LOGO_LINES, CheckFn, CheckStatus, COMBO_LINES, getLogoCharColor(), hslToHex(), PreflightCheck, runCheck() (+8 more)

### Community 124 - "post-merge-types.ts"
Cohesion: 0.16
Nodes (14): CumulativeReportInput, JournalOperation, PublicationOutcome, ChangedFileStatus, ChangelogOutcome, ChangelogOutcomeStatus, MergeReport, MergeReportInput (+6 more)

### Community 126 - "run-onboarding.ts"
Cohesion: 0.27
Nodes (12): OnboardingResult, OnboardingScreen(), OnboardingScreenProps, runOnboardingInk(), RunOnboardingOptions, buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks() (+4 more)

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
Cohesion: 0.13
Nodes (11): TaskStatus, TOON_COMMAND_SPECS, TOON_DIFFICULTY_DECODE, TOON_DIFFICULTY_ENCODE, TOON_PRIORITY_DECODE, TOON_PRIORITY_ENCODE, TOON_STATUS_DECODE, TOON_STATUS_ENCODE (+3 more)

### Community 132 - "tmpDir"
Cohesion: 0.08
Nodes (26): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+18 more)

### Community 133 - "ref_node_fs"
Cohesion: 0.16
Nodes (3): root, MonitorCallbacks, makeFakeProcess()

### Community 137 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 139 - "usage-overlay.tsx"
Cohesion: 0.28
Nodes (10): formatCost(), GROUPING_FIELDS, GROUPING_LABELS, GroupItem(), OverallSummary(), makeGroups(), makeTotals(), UsageOverlayView() (+2 more)

### Community 140 - "commands/history.ts"
Cohesion: 0.40
Nodes (10): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+2 more)

### Community 142 - "lib/history.ts"
Cohesion: 0.36
Nodes (9): computeDuration(), daemonSessionToHistory(), ensureHistoryDir(), exportDaemonHistory(), HistoryAgentSource, historyDir(), listHistory(), loadHistory() (+1 more)

### Community 143 - "post-merge.test.ts"
Cohesion: 0.22
Nodes (6): POST_MERGE_JOURNAL, gitRaw(), remoteTip(), filesInCommit(), remoteHas(), setup()

### Community 144 - "global-flags.ts"
Cohesion: 0.36
Nodes (5): extractGlobalFlags(), ExtractResult, GlobalFlags, ResolvedCommand, resolveGlobalFlagsAndCommand()

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "file-scopes.ts"
Cohesion: 0.54
Nodes (6): formatScopePartitions(), isSegmentPrefix(), normalizeScopePath(), pathsOverlap(), scopePartitions(), segments()

### Community 147 - "task-weight.ts"
Cohesion: 0.39
Nodes (6): computeTaskWeight(), DIFFICULTY_SCORE, effortScore(), ModelRoutingTable, PRIORITY_SCORE, resolveTaskModel()

### Community 148 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 149 - "ReentrantRunner"
Cohesion: 0.33
Nodes (3): ReentrantRunner, SpyRunner, TestableAgentRunner

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

## Knowledge Gaps
- **3 isolated node(s):** `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1073 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `agent-runner.ts`, `protocol.ts`, `run-task-browser.tsx`, `task-store.ts`, `citty/tasks.ts`, `config.ts`, `commands/history.ts`, `commands/tui.ts`, `commands/quest.ts`, `onboarding/index.ts`, `commands/launch.ts`, `worktree.ts`, `features.test.ts`, `DaemonClient`, `agent-registry.ts`, `init-app.tsx`, `Daemon`, `analytics.ts`, `genesis-planner.ts`, `lib/launcher.ts`, `ref_node_child_process`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `commands/merge.ts`, `run-daemon-monitor.tsx`, `quest-planner.ts`, `eval-score.ts`, `templates.ts`, `state.ts`, `tdd-verifier.test.ts`, `graph.ts`, `daemon-scheduler.test.ts`, `post-merge.ts`, `InkDaemonTUI`, `prompt.ts`, `commands/usage.ts`, `tdd-verifier.ts`, `lib/tasks.ts`, `daemon/launcher.ts`, `daemon-test-baseline.test.ts`, `analytics-lifecycle.test.ts`, `tdd-baseline-integration.test.ts`, `run-quest-picker.tsx`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `portless.ts`, `token-usage.ts`, `Scheduler`, `splash-screen.tsx`, `run-onboarding.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `@types/bun`, `@types/react`, `typescript` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.02040816326530612 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `agent-runner.ts`, `protocol.ts`, `config.ts`, `commands/launch.ts`, `AnalyticsTracker`, `.load`, `Daemon`, `ref_node_child_process`, `post-merge-integration.test.ts`, `commands/merge.ts`, `state.ts`, `daemon-scheduler.test.ts`, `fake-gh.ts`, `.allComplete`, `.doLaunch`, `daemon-test-baseline.test.ts`, `analytics-lifecycle.test.ts`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `.handleStart`, `maxConcurrent`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.14893617021276595 - nodes in this community are weakly interconnected._
- **Why does `Explore mode guidelines and usage rules` connect `Explore mode guidelines and usage rules` to `DaemonState`, `.load`, `Daemon`, `.handleStart`, `maxConcurrent`, `.doLaunch`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._