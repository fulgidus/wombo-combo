# Graph Report - wombo-combo  (2026-10-10)

## Corpus Check
- 437 files · ~528,620 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: .log 19, (none) 3, .jsonc 2)

## Summary
- 3763 nodes · 11194 edges · 141 communities (120 shown, 21 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 596 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `731d9247`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- toon.ts
- agent-runner.ts
- protocol.ts
- run-daemon-monitor.tsx
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
- project-store.ts
- splash-screen.tsx
- dashboard.tsx
- commands/launch.ts
- commands/tui.ts
- src/index.ts
- worktree.ts
- lib/tasks.ts
- monitor.ts
- templates.ts
- commands/completion.ts
- schema.ts
- scout.ts
- DaemonClient
- agent-registry.ts
- init-form.tsx
- run-quest-picker.tsx
- ink/index.ts
- generate-fake-tasks.ts
- github-pr.ts
- .getAgent
- onboarding-helpers.ts
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- analytics.ts
- merge-report.ts
- conflict-hunks.ts
- dashboard-usage.ts
- ReentrantRunner
- analytics-measurements.test.ts
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- commands/merge.ts
- citty-bridge.ts
- daemon/launcher.ts
- quest-planner.ts
- eval-score.ts
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
- daemon-scheduler.test.ts
- ref_bun_test
- graphify-pre-push.py
- UsageTotals
- InkDaemonTUI
- openspec/specs/scheduler-concurrency-accounting/spec.md
- agents/generalist-agent.md
- package.json
- portless.ts
- generateConflictResolutionPrompt
- commands/usage.ts
- ADDED Requirements
- test-detection.ts
- test-runner.ts
- token-usage.ts
- .doLaunch
- DashboardMetricsProvider
- Accomplished
- prompt-compress.ts
- commands/status.ts
- Relevant files / directories
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- ADDED Requirements
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- mergeBranch
- changelog.ts
- analytics-integration.test.ts
- run-task-browser.tsx
- cli-smoke.test.ts
- StubDaemonClient
- CONTEXT.md — For AI agents using wombo as a tool
- Scheduler
- maxConcurrent
- wombo-combo
- Quest test baselines
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- output
- tdd-baseline-pipeline.test.ts
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- tmpDir
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
- `Assistant (Build · claude-sonnet-4.6 · 7.5s)` --references--> `DaemonState`  [INFERRED]
  ._p.md → src/daemon/state.ts
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

## Communities (141 total, 21 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (99): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+91 more)

### Community 1 - "AgentRunner"
Cohesion: 0.13
Nodes (5): AgentRunner, getConflictDiffs(), runSafeCmd(), QuestPromptContext, Task

### Community 2 - "browser.ts"
Cohesion: 0.13
Nodes (14): BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult, discoverBrowserBin() (+6 more)

### Community 3 - "WomboConfig"
Cohesion: 0.09
Nodes (40): AbortCommandOptions, ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, addCommand, archiveCommand, checkCommand, graphCommand (+32 more)

### Community 4 - "toon.ts"
Cohesion: 0.14
Nodes (33): TaskStatus, encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGeneric() (+25 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.13
Nodes (29): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), Tier25Result, abortRebase(), beginRebase(), canMerge(), cleanupRebaseBranch() (+21 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (57): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, CmdCancelAgent, CmdGetState (+49 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.14
Nodes (24): AgentStatus, DaemonAgentState, EvtAgentActivity, EvtAgentStatusChange, EvtBuildResult, EvtHitlQuestion, EvtLog, EvtMergeResult (+16 more)

### Community 8 - "lib/launcher.ts"
Cohesion: 0.18
Nodes (16): 1. Are agents spawned with `detached: true` and `unref()`?, resolveAgentBin(), agentEnv(), AgentType, ConflictResolverOptions, detectAgentType(), launchConflictResolver(), launchHeadless() (+8 more)

### Community 9 - "task-store.ts"
Cohesion: 0.06
Nodes (70): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+62 more)

### Community 10 - "useScreenInput"
Cohesion: 0.05
Nodes (56): ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardProps, ErrandWizardStep, STEP_INSTRUCTIONS, STEP_TITLES, STEPS (+48 more)

### Community 11 - "config.ts"
Cohesion: 0.08
Nodes (39): citty, startCommand, statusCommand, stopCommand, parseLaunchArgs(), abandonCommand, activateCommand, archiveCommand (+31 more)

### Community 12 - "wishlist-store.ts"
Cohesion: 0.10
Nodes (38): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, formatDate(), truncateText() (+30 more)

### Community 13 - "chrome.tsx"
Cohesion: 0.14
Nodes (19): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+11 more)

### Community 14 - "router.ts"
Cohesion: 0.10
Nodes (30): abortCommand, cleanupCommand, completionCommand, daemonCommand, evalCommand, genesisCommand, helpCommand, historyCommand (+22 more)

### Community 15 - "review-list.tsx"
Cohesion: 0.09
Nodes (45): buildPlanConfig(), DIFFICULTIES, PLAN_EDIT_FIELDS, PlanReviewApp(), PRIORITIES, reviewItemToTask(), taskStash, taskToReviewItem() (+37 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.10
Nodes (46): DashboardMetricsContext, DashboardMetricsValue, DASHBOARD_EVENTS, DashboardMetricsProviderProps, initialValue(), REAL_TIMERS, advanceThroughput(), alignBucket() (+38 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.11
Nodes (55): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), handleQuestSubcommand(), questAbandon() (+47 more)

### Community 18 - "project-store.ts"
Cohesion: 0.07
Nodes (78): ConfirmDialog(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps, formatSectionForDisplay() (+70 more)

### Community 19 - "splash-screen.tsx"
Cohesion: 0.09
Nodes (32): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+24 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.04
Nodes (94): saveConfig(), ChromeLayout(), clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow() (+86 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.08
Nodes (40): analyzeBarrelFile(), BarrelFile, cmdLaunch(), delegateToDaemon(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), waitForDaemonCompletion() (+32 more)

### Community 22 - "commands/tui.ts"
Cohesion: 0.07
Nodes (58): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+50 more)

### Community 23 - "src/index.ts"
Cohesion: 0.18
Nodes (11): extractGlobalFlags(), ExtractResult, GlobalFlags, buildCittyArgs(), isCittyCommand(), ResolvedCommand, resolveGlobalFlagsAndCommand(), runCittyCommand() (+3 more)

### Community 24 - "worktree.ts"
Cohesion: 0.13
Nodes (25): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), featureBranchName(), installDeps() (+17 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.07
Nodes (42): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), renderSubtask() (+34 more)

### Community 26 - "monitor.ts"
Cohesion: 0.09
Nodes (18): extractActivity(), formatEventForLog(), MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, shortCmd(), shortPath() (+10 more)

### Community 27 - "templates.ts"
Cohesion: 0.07
Nodes (44): Behavior, Fake Agent, Usage, cmdInit(), InitOptions, InitApp(), InitAppProps, InitState (+36 more)

### Community 28 - "commands/completion.ts"
Cohesion: 0.18
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 29 - "schema.ts"
Cohesion: 0.11
Nodes (20): describeCommand, mergeCommand, parseMergeArgs(), parseTaskList(), BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), aliasHint() (+12 more)

### Community 30 - "scout.ts"
Cohesion: 0.14
Nodes (18): buildKeywords(), buildScoutIndex(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex() (+10 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (4): DaemonClient, EvtStateSnapshot, DaemonMonitorAdapter(), TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (29): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+21 more)

### Community 33 - "init-form.tsx"
Cohesion: 0.23
Nodes (9): EditableField(), EditableFieldProps, FieldDef, FIELDS, InitForm(), InitFormDefaults, InitFormProps, createTestStreams() (+1 more)

### Community 34 - "run-quest-picker.tsx"
Cohesion: 0.11
Nodes (27): ParsedLaunchArgs, LaunchCommandOptions, QuestCommandOptions, TasksAddOptions, defaultLoadTaskQuests(), QuestSummary, QuestWizardPrefill, QuestPickerApp() (+19 more)

### Community 35 - "ink/index.ts"
Cohesion: 0.05
Nodes (77): isAltScreenActive(), defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps (+69 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.09
Nodes (39): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CommandRunner, CreateOrUpdatePrOptions (+31 more)

### Community 38 - ".getAgent"
Cohesion: 0.08
Nodes (28): allocateExecutionId(), AnalyticsTracker, AnalyticsTrackerOptions, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState (+20 more)

### Community 39 - "onboarding-helpers.ts"
Cohesion: 0.60
Nodes (5): buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks(), formatProfileAsMarkdown(), runLlmSynthesis()

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (31): cmdTasksAdd(), CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER (+23 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (34): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES, isObject() (+26 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.08
Nodes (33): ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic, AnalyticsLoadDiagnosticKind (+25 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (40): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+32 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "dashboard-usage.ts"
Cohesion: 0.16
Nodes (10): addInto(), buildTaskQuestMap(), cloneTotals(), emptyTotals(), mergeInto(), normalizeUsageRecord(), TaskQuestLookup, UsageRefreshResult (+2 more)

### Community 48 - "ReentrantRunner"
Cohesion: 0.33
Nodes (3): ReentrantRunner, SpyRunner, TestableAgentRunner

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.18
Nodes (11): FAKE_AGENT_SENTINEL, commit(), git(), write(), commitFile(), git(), make(), makeTask() (+3 more)

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (16): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight, resolveCommitSha() (+8 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.07
Nodes (53): defaultIsDaemonAlive(), SelectedAgentInfo, createDaemonAgentState(), POST_MERGE_JOURNAL, PostMergeRequest, VerificationSummary, createBlankTask(), addVerifiedAgent() (+45 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "commands/merge.ts"
Cohesion: 0.09
Nodes (47): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+39 more)

### Community 54 - "citty-bridge.ts"
Cohesion: 0.30
Nodes (10): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, CommandDef (+2 more)

### Community 55 - "daemon/launcher.ts"
Cohesion: 0.27
Nodes (12): cleanupPidFile(), DaemonStatus, ensureDaemonRunning(), getDaemonHealthStatus(), getDaemonStatus(), resolveDaemonEntry(), startDaemon(), StartDaemonOptions (+4 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.14
Nodes (24): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), abortedPlanners, activePlanners, detectCycles(), dfs(), detectFileOverlaps() (+16 more)

### Community 57 - "eval-score.ts"
Cohesion: 0.09
Nodes (40): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+32 more)

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
Cohesion: 0.07
Nodes (24): root, DEFAULT_CONFIG, InitWriterConfig, InitWriterResult, writeInitFiles(), getEditorCommand(), openEditor(), OpenEditorOptions (+16 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.10
Nodes (10): ConnectionState, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, Harness, mount(), streams() (+2 more)

### Community 63 - "genesis-planner.ts"
Cohesion: 0.20
Nodes (14): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput, parseGenesisYaml() (+6 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "analytics-overlay.tsx"
Cohesion: 0.13
Nodes (33): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABELS (+25 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.12
Nodes (27): extractBrowserErrorSummary(), buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions (+19 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.08
Nodes (5): LiveFakeClient, makeMinimalConfig(), openDashboardFromMenu(), sleep(), StubDaemonClient

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.10
Nodes (13): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+5 more)

### Community 70 - "daemon-scheduler.test.ts"
Cohesion: 0.18
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

### Community 71 - "ref_bun_test"
Cohesion: 0.05
Nodes (35): ink, react, App(), AppProps, ConfirmDialogProps, createTestStreams(), plain(), renderWizardInChrome() (+27 more)

### Community 73 - "UsageTotals"
Cohesion: 0.36
Nodes (7): QuestPickerViewProps, defaultProps(), EMPTY_USAGE, makeQuest(), makeSummary(), QuestSummary, UsageTotals

### Community 74 - "InkDaemonTUI"
Cohesion: 0.11
Nodes (5): InkDaemonTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 75 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.25
Nodes (7): Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.05
Nodes (39): author, bin, woco, bugs, url, dependencies, citty, ink (+31 more)

### Community 78 - "portless.ts"
Cohesion: 0.54
Nodes (7): ensureProxyRunning(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus(), resolvePortlessBin(), wrapWithPortless()

### Community 79 - "generateConflictResolutionPrompt"
Cohesion: 0.50
Nodes (4): formatHunksForLLM(), generateConflictResolutionPrompt(), generateTier4RerunPrompt(), truncateDiff()

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
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 84 - "token-usage.ts"
Cohesion: 0.27
Nodes (13): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+5 more)

### Community 85 - ".doLaunch"
Cohesion: 0.05
Nodes (48): Context, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Impact (+40 more)

### Community 86 - "DashboardMetricsProvider"
Cohesion: 0.21
Nodes (5): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, DashboardUsageReader

### Community 87 - "Accomplished"
Cohesion: 0.67
Nodes (3): Accomplished, Completed and archived:, Currently in progress:

### Community 88 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 89 - "commands/status.ts"
Cohesion: 0.21
Nodes (16): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize() (+8 more)

### Community 90 - "Relevant files / directories"
Cohesion: 0.67
Nodes (3): OpenSpec:, Relevant files / directories, Test files:

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "ADDED Requirements"
Cohesion: 0.18
Nodes (10): ADDED Requirements, Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo (+2 more)

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.15
Nodes (13): ensureQuestTestBaseline(), captureMain(), Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo() (+5 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.06
Nodes (26): Files Changed, Minimal, surgical fix, Solution, What does NOT change, Why this is correct, Capabilities, Impact, Modified Capabilities (+18 more)

### Community 101 - "mergeBranch"
Cohesion: 0.13
Nodes (15): Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo, Scenario: syncQuestBranch creates tmp worktree outside the repo (+7 more)

### Community 102 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "run-task-browser.tsx"
Cohesion: 0.07
Nodes (24): ANALYTICS_REFRESH_MS, analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction, TaskBrowserScreenProps (+16 more)

### Community 105 - "cli-smoke.test.ts"
Cohesion: 0.20
Nodes (12): buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess(), runSrc() (+4 more)

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 109 - "Scheduler"
Cohesion: 0.05
Nodes (37): Problem Trace, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, Why `concurrencyPinned` doesn't protect persisted state, Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler (+29 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (59): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+51 more)

### Community 113 - "wombo-combo"
Cohesion: 0.12
Nodes (15): Agent Analytics, Commands, Coverage limitations, Entry points, Install, Launch options, License, Merge, changelog and pull requests (+7 more)

### Community 117 - "Quest test baselines"
Cohesion: 0.20
Nodes (9): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Quest test baselines, Supported test output (+1 more)

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "output"
Cohesion: 0.20
Nodes (14): cmdAbort(), cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText() (+6 more)

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

### Community 132 - "tmpDir"
Cohesion: 0.13
Nodes (16): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+8 more)

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1063 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `agent-runner.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `lib/launcher.ts`, `task-store.ts`, `config.ts`, `commands/quest.ts`, `project-store.ts`, `splash-screen.tsx`, `dashboard.tsx`, `commands/launch.ts`, `commands/tui.ts`, `worktree.ts`, `lib/tasks.ts`, `templates.ts`, `DaemonClient`, `agent-registry.ts`, `run-quest-picker.tsx`, `onboarding-helpers.ts`, `task-schema.ts`, `Daemon`, `analytics.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `commands/merge.ts`, `quest-planner.ts`, `eval-score.ts`, `ref_node_path`, `genesis-planner.ts`, `tdd-verifier.test.ts`, `graph.ts`, `daemon-scheduler.test.ts`, `InkDaemonTUI`, `portless.ts`, `commands/usage.ts`, `token-usage.ts`, `commands/status.ts`, `tdd-baseline-integration.test.ts`, `analytics-integration.test.ts`, `run-task-browser.tsx`, `Scheduler`, `output`, `tdd-baseline-pipeline.test.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `@types/bun`, `@types/react`, `typescript` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `Explore mode guidelines and usage rules`, `AgentRunner`, `agent-runner.ts`, `.getAgent`, `protocol.ts`, `daemon-scheduler.test.ts`, `Daemon`, `run-daemon-monitor.tsx`, `config.ts`, `analytics-integration.test.ts`, `task-store.ts`, `maxConcurrent`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `commands/merge.ts`, `commands/launch.ts`, `.doLaunch`, `ref_node_path`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.12670068027210885 - nodes in this community are weakly interconnected._
- **Why does `maxConcurrent()` connect `maxConcurrent` to `Explore mode guidelines and usage rules`, `DaemonState`, `2026-03-21-fix-scheduler-oversubscription/proposal.md`, `Scheduler`, `.doLaunch`, `eval-score.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._