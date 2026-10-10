# Graph Report - wombo-combo  (2026-10-10)

## Corpus Check
- 436 files · ~528,323 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: .log 19, (none) 3, .jsonc 2)

## Summary
- 3754 nodes · 11181 edges · 161 communities (139 shown, 22 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 596 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ab165c2e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- verifier.ts
- WomboConfig
- toon.ts
- agent-runner.ts
- protocol.ts
- commands/merge.ts
- lib/launcher.ts
- task-store.ts
- useScreenInput
- config.ts
- wishlist-store.ts
- chrome.tsx
- router.ts
- review-list.tsx
- dashboard-metrics.ts
- commands/quest.ts
- react
- commands/upgrade.ts
- ink/index.ts
- scheduler.ts
- commands/tui.ts
- run-task-browser.tsx
- worktree.ts
- lib/tasks.ts
- monitor.ts
- templates.ts
- commands/completion.ts
- schema.ts
- quest-store.ts
- DaemonClient
- agent-registry.ts
- init-app.tsx
- lib/quest.ts
- wave-monitor.tsx
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- project-store.ts
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- analytics.ts
- merge-report.ts
- conflict-hunks.ts
- DashboardMetricsProvider
- daemon-agent-runner.test.ts
- ref_node_child_process
- test-baseline-capture.ts
- ref_node_os
- dashboard-realtime.test.tsx
- post-merge.ts
- run-quest-picker.tsx
- usage-overlay.tsx
- quest-planner.ts
- commands/eval.ts
- TextBuffer
- hitl-channel.ts
- permission
- ref_node_path
- dashboard-provider.test.tsx
- genesis-planner.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- analytics-overlay.tsx
- tdd-verifier.test.ts
- monitor-router.test.tsx
- graph.ts
- ProcessMonitor
- esc-menu.tsx
- ref_bun_test
- eval-score.ts
- quest-picker.tsx
- InkDaemonTUI
- daemon-test-baseline.test.ts
- agents/generalist-agent.md
- package.json
- post-merge-types.ts
- citty/quest.ts
- commands/usage.ts
- ADDED Requirements
- test-detection.ts
- test-runner.ts
- commands/stats.ts
- .allComplete
- dashboard-provider.tsx
- splash-screen.tsx
- prompt.ts
- DaemonAgentState
- dependencies
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- ADDED Requirements
- toon-spec.ts
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- analytics-summary.ts
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- openspec/specs/safe-tmp-worktree-placement/spec.md
- changelog.ts
- analytics-integration.test.ts
- analytics-browser.test.tsx
- cli-smoke.test.ts
- StubDaemonClient
- StubDaemonClient
- CONTEXT.md — For AI agents using wombo as a tool
- .start
- maxConcurrent
- citty/tasks.ts
- task-browser.tsx
- wombo-combo
- commands/history.ts
- check.ts
- analytics-lifecycle.test.ts
- Quest test baselines
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/logs.ts
- saveTaskToStore
- sparkline.tsx
- tdd-baseline-pipeline.test.ts
- analytics-usage-command.test.ts
- fake-agent-runner.ts
- hitl-ask.ts
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- file-scopes.ts
- tmpDir
- collectSubtaskItems
- react-devtools-core.ts
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- Requirement: Launch stagger applies only to real-agent launches
- Requirement: Launch stagger applies only to real-agent launches
- devDependencies
- scripts
- merge-resolver-agent.md
- wombo-combo Operational Constraints
- wombo-combo Agent Context
- repository

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
- `New Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md → src/lib/eval-score.ts
- `Goals / Non-Goals` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-scheduler-oversubscription/design.md → src/lib/eval-score.ts
- `Why` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-scheduler-oversubscription/proposal.md → src/lib/eval-score.ts
- `Scenario: Concurrent mergeBranch calls do not collide` --references--> `mergeBranch()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-merge-worktree-leak/specs/safe-tmp-worktree-placement/spec.md → src/lib/merger.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (161 total, 22 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (102): Accomplished, Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s) (+94 more)

### Community 1 - "AgentRunner"
Cohesion: 0.09
Nodes (20): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected, 1. AgentRunner — Per-entry stagger flag, 3. Unit Tests (+12 more)

### Community 2 - "verifier.ts"
Cohesion: 0.10
Nodes (21): BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult, discoverBrowserBin() (+13 more)

### Community 3 - "WomboConfig"
Cohesion: 0.09
Nodes (41): AbortCommandOptions, cmdAbort(), ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, EvalCommandOptions, GenesisCommandOptions, HistoryCommandOptions (+33 more)

### Community 4 - "toon.ts"
Cohesion: 0.28
Nodes (22): encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGeneric(), renderGraph() (+14 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.10
Nodes (37): MaxEscalationTier, AgentRunnerConfig, FAKE_AGENT_VERIFICATION, isTierAllowed(), Tier25Result, LaunchResult, abortRebase(), beginRebase() (+29 more)

### Community 6 - "protocol.ts"
Cohesion: 0.05
Nodes (62): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, DaemonStatus, StartDaemonOptions (+54 more)

### Community 7 - "commands/merge.ts"
Cohesion: 0.18
Nodes (21): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), defaultIsDaemonAlive(), evidenceFor(), git(), gitOk() (+13 more)

### Community 8 - "lib/launcher.ts"
Cohesion: 0.19
Nodes (15): 1. Are agents spawned with `detached: true` and `unref()`?, resolveAgentBin(), agentEnv(), AgentType, ConflictResolverOptions, detectAgentType(), launchConflictResolver(), launchHeadless() (+7 more)

### Community 9 - "task-store.ts"
Cohesion: 0.17
Nodes (32): archiveDir(), atomicWrite(), createBackup(), defaultMeta(), deleteTaskFile(), ensureDir(), flattenTask(), getArchiveDir() (+24 more)

### Community 10 - "useScreenInput"
Cohesion: 0.08
Nodes (31): ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardProps, ErrandWizardStep, STEP_INSTRUCTIONS, STEP_TITLES, STEPS (+23 more)

### Community 11 - "config.ts"
Cohesion: 0.12
Nodes (24): citty, parseLaunchArgs(), loadProjectConfigSync(), parseResumeArgs(), parseRetryArgs(), statsCommand, loadProjectConfig(), addCommand (+16 more)

### Community 12 - "wishlist-store.ts"
Cohesion: 0.12
Nodes (33): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, formatDate(), truncateText() (+25 more)

### Community 13 - "chrome.tsx"
Cohesion: 0.09
Nodes (30): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+22 more)

### Community 14 - "router.ts"
Cohesion: 0.07
Nodes (43): abortCommand, cleanupCommand, completionCommand, daemonCommand, describeCommand, evalCommand, genesisCommand, extractGlobalFlags() (+35 more)

### Community 15 - "review-list.tsx"
Cohesion: 0.07
Nodes (62): buildGenesisConfig(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES, questStash (+54 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.11
Nodes (37): EvtBuildResult, EvtMergeResult, EvtTaskPicked, initialValue(), ActivityEntry, advanceThroughput(), alignBucket(), applyDashboardEvent() (+29 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.19
Nodes (34): cmdLaunch(), handleQuestSubcommand(), questAbandon(), questActivate(), questArchive(), questComplete(), questCreate(), questHelp() (+26 more)

### Community 18 - "react"
Cohesion: 0.13
Nodes (40): react, ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp() (+32 more)

### Community 19 - "commands/upgrade.ts"
Cohesion: 0.21
Nodes (16): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+8 more)

### Community 20 - "ink/index.ts"
Cohesion: 0.04
Nodes (99): ChromeLayout(), clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgent, DashboardAgentRow() (+91 more)

### Community 21 - "scheduler.ts"
Cohesion: 0.08
Nodes (22): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification, SchedulerConfig, SchedulerDeps, buildChainFrom(), buildDepGraph() (+14 more)

### Community 22 - "commands/tui.ts"
Cohesion: 0.09
Nodes (43): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+35 more)

### Community 23 - "run-task-browser.tsx"
Cohesion: 0.12
Nodes (28): analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction, TaskBrowserApp() (+20 more)

### Community 24 - "worktree.ts"
Cohesion: 0.15
Nodes (22): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), featureBranchName(), isWorktreesDirEmpty() (+14 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.08
Nodes (40): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), renderSubtask() (+32 more)

### Community 26 - "monitor.ts"
Cohesion: 0.09
Nodes (16): extractActivity(), formatEventForLog(), MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, shortCmd(), shortPath() (+8 more)

### Community 27 - "templates.ts"
Cohesion: 0.08
Nodes (38): Behavior, Fake Agent, Usage, AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections() (+30 more)

### Community 28 - "commands/completion.ts"
Cohesion: 0.19
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 29 - "schema.ts"
Cohesion: 0.10
Nodes (27): mergeCommand, ParsedMergeArgs, parseMergeArgs(), parseTaskList(), BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef() (+19 more)

### Community 30 - "quest-store.ts"
Cohesion: 0.24
Nodes (19): archivedKnowledgeDir(), archivedKnowledgeFilePath(), archivedQuestFilePath(), archiveQuest(), atomicWrite(), deleteQuest(), ensureDir(), getQuestsDir() (+11 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (4): DaemonClient, CommandMap, EvtStateSnapshot, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (30): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+22 more)

### Community 33 - "init-app.tsx"
Cohesion: 0.14
Nodes (21): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+13 more)

### Community 34 - "lib/quest.ts"
Cohesion: 0.08
Nodes (38): ParsedLaunchArgs, QuestCommandOptions, TasksAddOptions, TasksListOptions, QuestSummary, QuestSummary, buildDifficultyItems(), buildHitlItems() (+30 more)

### Community 35 - "wave-monitor.tsx"
Cohesion: 0.14
Nodes (24): AgentStatus, AGENT_STATUS_COLORS, AGENT_STATUS_ICONS, elapsed(), progressBar(), QUEST_STATUS_ABBREV, QUEST_STATUS_COLORS, TASK_PRIORITY_COLORS (+16 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.13
Nodes (32): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+24 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.15
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - "project-store.ts"
Cohesion: 0.10
Nodes (37): OnboardingResult, OnboardingScreen(), OnboardingScreenProps, runOnboardingInk(), RunOnboardingOptions, buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks() (+29 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.16
Nodes (19): cmdTasksAdd(), META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema, TASK_ARRAY_FIELDS, TASK_REQUIRED_FIELDS, VALID_DIFFICULTIES, VALID_PRIORITIES (+11 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (32): QuestPromptContext, assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+24 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.09
Nodes (27): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+19 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.17
Nodes (29): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), escapeMarkdown() (+21 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "DashboardMetricsProvider"
Cohesion: 0.11
Nodes (12): DashboardMetricsProvider(), TimerApi, addInto(), cloneTotals(), DashboardUsageReader, emptyTotals(), mergeInto(), normalizeUsageRecord() (+4 more)

### Community 48 - "daemon-agent-runner.test.ts"
Cohesion: 0.09
Nodes (18): CommandResult, defaultCommandRunner(), FAKE_AGENT_SENTINEL, PostMergeRequest, Env, EnvOpts, makeEnv(), ReentrantRunner (+10 more)

### Community 49 - "ref_node_child_process"
Cohesion: 0.12
Nodes (20): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+12 more)

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.12
Nodes (20): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+12 more)

### Community 51 - "ref_node_os"
Cohesion: 0.08
Nodes (46): SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), POST_MERGE_JOURNAL, VerificationSummary, createBlankTask(), addVerifiedAgent(), SeedSpec (+38 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "post-merge.ts"
Cohesion: 0.17
Nodes (22): MergeCommandDeps, normalizePostMergeConfig(), CommandRunner, Git, isComplete(), isJournal(), Journal, journalPath() (+14 more)

### Community 54 - "run-quest-picker.tsx"
Cohesion: 0.12
Nodes (23): aggregateStats(), computeTrend(), FakeTaskConfig, FakeTaskWizardProps, Field, generateFakeTasks(), shuffleArr(), shuffledTitles() (+15 more)

### Community 55 - "usage-overlay.tsx"
Cohesion: 0.27
Nodes (11): formatCost(), GROUPING_FIELDS, GROUPING_LABELS, GroupItem(), OverallSummary(), makeGroups(), makeTotals(), UsageOverlayView() (+3 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.08
Nodes (42): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), abortedPlanners, activePlanners, detectCycles(), dfs(), detectFileOverlaps() (+34 more)

### Community 57 - "commands/eval.ts"
Cohesion: 0.14
Nodes (18): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), loadEvalReport(), saveEvalReport(), ScoreReport (+10 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "ref_node_path"
Cohesion: 0.08
Nodes (25): root, startCommand, statusCommand, stopCommand, cmdInit(), InitOptions, cmdResume(), CONFIG_FILE (+17 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.11
Nodes (9): ConnectionState, DashboardDaemonClient, FakeClient, FakeTimers, Harness, mount(), streams(), T0 (+1 more)

### Community 63 - "genesis-planner.ts"
Cohesion: 0.14
Nodes (21): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), detectCycles(), dfs() (+13 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (15): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+7 more)

### Community 65 - "analytics-overlay.tsx"
Cohesion: 0.19
Nodes (23): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABELS (+15 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.17
Nodes (20): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions, TddVerificationResult, TestBaseline (+12 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.11
Nodes (5): LiveFakeClient, makeMinimalConfig(), mountShell(), openDashboardFromMenu(), sleep()

### Community 68 - "graph.ts"
Cohesion: 0.26
Nodes (14): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), emitConnectedSubtasks(), nodeId() (+6 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (13): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+5 more)

### Community 70 - "esc-menu.tsx"
Cohesion: 0.12
Nodes (19): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+11 more)

### Community 71 - "ref_bun_test"
Cohesion: 0.04
Nodes (36): ink, App(), AppProps, createTestStreams(), noopSave, renderLive(), makeQuestion(), makeQuestions() (+28 more)

### Community 72 - "eval-score.ts"
Cohesion: 0.17
Nodes (19): clampScore(), intervalsOverlap(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), scoreRouting(), scoreSession(), scoreSteering() (+11 more)

### Community 73 - "quest-picker.tsx"
Cohesion: 0.23
Nodes (14): AllTasksDetail(), AllTasksItem(), ErrandsDetail(), ErrandsItem(), Header(), QuestDetail(), QuestListItem(), QuestPickerView() (+6 more)

### Community 75 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (19): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+11 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.10
Nodes (19): author, bin, woco, bugs, url, description, engines, bun (+11 more)

### Community 78 - "post-merge-types.ts"
Cohesion: 0.13
Nodes (17): CumulativeMergeReport, CumulativeReportInput, JournalOperation, PublicationOutcome, ChangedFile, ChangedFileStatus, ChangelogOutcome, ChangelogOutcomeStatus (+9 more)

### Community 79 - "citty/quest.ts"
Cohesion: 0.15
Nodes (9): abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand, pauseCommand, planCommand (+1 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.14
Nodes (29): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+21 more)

### Community 81 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.20
Nodes (16): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+8 more)

### Community 84 - "commands/stats.ts"
Cohesion: 0.33
Nodes (9): aggregateByModel(), cmdStats(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable(), loadWaveHistory(), PeriodStats (+1 more)

### Community 85 - ".allComplete"
Cohesion: 0.14
Nodes (13): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler (+5 more)

### Community 86 - "dashboard-provider.tsx"
Cohesion: 0.19
Nodes (16): Known quirks, DashboardMetricsContext, DashboardMetricsValue, clientState(), DASHBOARD_EVENTS, DashboardMetricsProviderProps, defaultLoadTaskQuests(), mapConnection() (+8 more)

### Community 87 - "splash-screen.tsx"
Cohesion: 0.13
Nodes (16): ALL_LOGO_LINES, CheckFn, CheckStatus, COMBO_LINES, getLogoCharColor(), hslToHex(), PreflightCheck, runCheck() (+8 more)

### Community 88 - "prompt.ts"
Cohesion: 0.12
Nodes (22): formatHunksForLLM(), portlessUrl(), abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource() (+14 more)

### Community 89 - "DaemonAgentState"
Cohesion: 0.20
Nodes (17): DaemonAgentState, SchedulerState, DaemonAdapterProps, DaemonMonitorScreenProps, DaemonStore, ActivityEntry, colorize(), DaemonSnapshotView (+9 more)

### Community 90 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, citty, ink, mermaidtui, react, yaml

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "ADDED Requirements"
Cohesion: 0.18
Nodes (10): ADDED Requirements, Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo (+2 more)

### Community 94 - "toon-spec.ts"
Cohesion: 0.12
Nodes (13): TaskStatus, buildToonSpec(), renderToonLegend(), TOON_COMMAND_SPECS, TOON_DIFFICULTY_DECODE, TOON_DIFFICULTY_ENCODE, TOON_PRIORITY_DECODE, TOON_PRIORITY_ENCODE (+5 more)

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.16
Nodes (11): captureMain(), Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode (+3 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "analytics-summary.ts"
Cohesion: 0.24
Nodes (13): AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions(), filterExecutions() (+5 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.05
Nodes (28): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+20 more)

### Community 101 - "openspec/specs/safe-tmp-worktree-placement/spec.md"
Cohesion: 0.20
Nodes (9): Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo, Scenario: syncQuestBranch creates tmp worktree outside the repo (+1 more)

### Community 102 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.18
Nodes (9): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+1 more)

### Community 104 - "analytics-browser.test.tsx"
Cohesion: 0.21
Nodes (8): ANALYTICS_REFRESH_MS, TaskBrowserScreen(), Harness, mount(), h, result(), wait(), waitFor()

### Community 105 - "cli-smoke.test.ts"
Cohesion: 0.20
Nodes (12): buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess(), runSrc() (+4 more)

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 109 - ".start"
Cohesion: 0.05
Nodes (53): Why, Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan (+45 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (51): Capabilities, Modified Capabilities, MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value (+43 more)

### Community 111 - "citty/tasks.ts"
Cohesion: 0.15
Nodes (9): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setStatusCommand (+1 more)

### Community 112 - "task-browser.tsx"
Cohesion: 0.27
Nodes (11): agentStatusColor(), Header(), PRIORITY_ABBREV, StatusBar(), TaskBrowserView(), TaskDetail(), TaskListItem(), defaultProps() (+3 more)

### Community 113 - "wombo-combo"
Cohesion: 0.12
Nodes (15): Agent Analytics, Commands, Coverage limitations, Entry points, Install, Launch options, License, Merge, changelog and pull requests (+7 more)

### Community 114 - "commands/history.ts"
Cohesion: 0.40
Nodes (10): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+2 more)

### Community 115 - "check.ts"
Cohesion: 0.25
Nodes (10): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), SchemaIssue, VALID_STATUSES (+2 more)

### Community 116 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

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

### Community 121 - "saveTaskToStore"
Cohesion: 0.16
Nodes (16): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+8 more)

### Community 122 - "sparkline.tsx"
Cohesion: 0.38
Nodes (8): ASCII_LEVELS, clean(), formatSparkline(), Sparkline(), SparklineOptions, SparklineProps, UNICODE_LEVELS, useAsciiGraphics()

### Community 123 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 124 - "analytics-usage-command.test.ts"
Cohesion: 0.25
Nodes (4): rec(), REPO_ROOT, seed(), SRC_ENTRY

### Community 125 - "fake-agent-runner.ts"
Cohesion: 0.44
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

### Community 131 - "file-scopes.ts"
Cohesion: 0.54
Nodes (6): formatScopePartitions(), isSegmentPrefix(), normalizeScopePath(), pathsOverlap(), scopePartitions(), segments()

### Community 132 - "tmpDir"
Cohesion: 0.13
Nodes (16): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+8 more)

### Community 133 - "collectSubtaskItems"
Cohesion: 0.67
Nodes (3): collectSubtaskItems(), detectCycles(), dfs()

### Community 137 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 139 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 140 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 142 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, @types/bun, @types/react, typescript

### Community 143 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, start, test, typecheck, woco

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

### Community 174 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **3 isolated node(s):** `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1060 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `verifier.ts`, `agent-runner.ts`, `protocol.ts`, `commands/merge.ts`, `lib/launcher.ts`, `task-store.ts`, `config.ts`, `commands/quest.ts`, `react`, `ink/index.ts`, `scheduler.ts`, `commands/tui.ts`, `run-task-browser.tsx`, `worktree.ts`, `lib/tasks.ts`, `templates.ts`, `DaemonClient`, `agent-registry.ts`, `lib/quest.ts`, `project-store.ts`, `task-schema.ts`, `Daemon`, `daemon-agent-runner.test.ts`, `ref_node_child_process`, `test-baseline-capture.ts`, `ref_node_os`, `post-merge.ts`, `run-quest-picker.tsx`, `quest-planner.ts`, `commands/eval.ts`, `ref_node_path`, `genesis-planner.ts`, `tdd-verifier.test.ts`, `graph.ts`, `eval-score.ts`, `InkDaemonTUI`, `daemon-test-baseline.test.ts`, `commands/usage.ts`, `commands/stats.ts`, `splash-screen.tsx`, `prompt.ts`, `DaemonAgentState`, `tdd-baseline-integration.test.ts`, `analytics-integration.test.ts`, `commands/history.ts`, `check.ts`, `analytics-lifecycle.test.ts`, `tdd-baseline-pipeline.test.ts`, `analytics-usage-command.test.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `@types/bun`, `@types/react`, `typescript` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.019417475728155338 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `agent-runner.ts`, `AnalyticsTracker`, `commands/merge.ts`, `protocol.ts`, `Daemon`, `analytics-integration.test.ts`, `daemon-test-baseline.test.ts`, `analytics.ts`, `.start`, `daemon-agent-runner.test.ts`, `ref_node_child_process`, `ref_node_os`, `analytics-lifecycle.test.ts`, `scheduler.ts`, `.allComplete`, `DaemonAgentState`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.09438103599648814 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `useScreenInput`, `wishlist-store.ts`, `chrome.tsx`, `review-list.tsx`, `ink/index.ts`, `commands/tui.ts`, `run-task-browser.tsx`, `agent-registry.ts`, `init-app.tsx`, `lib/quest.ts`, `wave-monitor.tsx`, `project-store.ts`, `dashboard-realtime.test.tsx`, `run-quest-picker.tsx`, `usage-overlay.tsx`, `dashboard-provider.test.tsx`, `analytics-overlay.tsx`, `monitor-router.test.tsx`, `esc-menu.tsx`, `ref_bun_test`, `quest-picker.tsx`, `package.json`, `dashboard-provider.tsx`, `splash-screen.tsx`, `analytics-browser.test.tsx`, `task-browser.tsx`, `sparkline.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `verifier.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09682539682539683 - nodes in this community are weakly interconnected._