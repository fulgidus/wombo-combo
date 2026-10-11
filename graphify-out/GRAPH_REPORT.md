# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 429 files · ~523,316 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 24 file(s) not represented in the graph (top: .log 18, (none) 3, .jsonc 2)

## Summary
- 3787 nodes · 11298 edges · 154 communities (132 shown, 22 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 598 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `857326b5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- run-tui-app.tsx
- agent-runner.ts
- protocol.ts
- settings-screen.tsx
- run-task-browser.tsx
- task-store.ts
- errand-wizard.tsx
- config.ts
- wishlist-store.ts
- chrome.tsx
- useScreenInput
- ink/index.ts
- dashboard-metrics.ts
- commands/quest.ts
- onboarding/index.ts
- splash-screen.tsx
- dashboard.tsx
- commands/launch.ts
- commands/tui.ts
- run-quest-picker.tsx
- worktree.ts
- lib/tasks.ts
- ref_node_path
- hitl-channel.ts
- project-store.ts
- commands/completion.ts
- scout.ts
- DaemonClient
- agent-registry.ts
- init-app.tsx
- quest-wizard.tsx
- run-daemon-monitor.tsx
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
- ref_node_os
- analytics-measurements.test.ts
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- commands/merge.ts
- run-review.tsx
- esc-menu.tsx
- quest-planner.ts
- toon.ts
- TextBuffer
- templates.ts
- permission
- changelog.ts
- dashboard-provider.test.tsx
- config.test.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- analytics-overlay.tsx
- tdd-verifier.test.ts
- monitor-router.test.tsx
- citty/tasks.ts
- ProcessMonitor
- daemon-scheduler.test.ts
- use-spinner.test.tsx
- graphify-pre-push.py
- quest-store.ts
- InkDaemonTUI
- fake-gh.ts
- agents/generalist-agent.md
- package.json
- task-browser.tsx
- prompt.ts
- commands/usage.ts
- .allComplete
- test-detection.ts
- test-runner.ts
- analytics-git.ts
- .submitTask
- DashboardMetricsProvider
- analytics-summary.ts
- prompt-compress.ts
- commands/status.ts
- ref_bun_test
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- ADDED Requirements
- analytics-lifecycle.test.ts
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- fake-task-wizard.tsx
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- init-form.tsx
- format-converter.ts
- analytics-integration.test.ts
- tui-app.test.tsx
- cli-smoke.test.ts
- hitl-ask.ts
- daemon-project-context.test.ts
- CONTEXT.md — For AI agents using wombo as a tool
- Scheduler
- maxConcurrent
- openspec/specs/safe-tmp-worktree-placement/spec.md
- Agent Process Lifecycle Audit
- wombo-combo
- portless.ts
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Quest test baselines
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- output
- init-writer.ts
- 2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md
- tdd-baseline-pipeline.test.ts
- step-wizard.test.tsx
- StubDaemonClient
- 2026-03-21-fix-scheduler-oversubscription/tasks.md
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

## Communities (154 total, 22 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (100): Accomplished, Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s) (+92 more)

### Community 1 - "AgentRunner"
Cohesion: 0.17
Nodes (6): AgentRunner, getConflictDiffs(), runSafeCmd(), TaskEditorProps, QuestPromptContext, Task

### Community 2 - "browser.ts"
Cohesion: 0.13
Nodes (14): BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult, discoverBrowserBin() (+6 more)

### Community 3 - "WomboConfig"
Cohesion: 0.09
Nodes (37): AbortCommandOptions, extractGlobalFlags(), ExtractResult, GlobalFlags, ParsedLaunchArgs, ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs (+29 more)

### Community 4 - "run-tui-app.tsx"
Cohesion: 0.09
Nodes (36): ChromeLayout(), DashboardScreen(), EscMenuProvider(), createI18n(), getLocaleT(), I18nContext, LOCALE_STRINGS, StringsMap (+28 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.11
Nodes (34): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), runTier25(), Tier25Result, abortRebase(), beginRebase(), canMerge() (+26 more)

### Community 6 - "protocol.ts"
Cohesion: 0.05
Nodes (69): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+61 more)

### Community 7 - "settings-screen.tsx"
Cohesion: 0.10
Nodes (21): saveConfig(), APPEARANCE_FIELD_IDS, FieldDef, FieldId, FIELDS, GENERAL_FIELD_IDS, LOCALE_OPTIONS, SettingsField() (+13 more)

### Community 8 - "run-task-browser.tsx"
Cohesion: 0.08
Nodes (33): QuestPickerScreenProps, ANALYTICS_REFRESH_MS, analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS (+25 more)

### Community 9 - "task-store.ts"
Cohesion: 0.06
Nodes (66): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+58 more)

### Community 10 - "errand-wizard.tsx"
Cohesion: 0.14
Nodes (13): ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardStep, STEP_INSTRUCTIONS, STEP_TITLES, STEPS, Modal() (+5 more)

### Community 11 - "config.ts"
Cohesion: 0.06
Nodes (65): citty, abortCommand, cleanupCommand, completionCommand, daemonCommand, startCommand, statusCommand, stopCommand (+57 more)

### Community 12 - "wishlist-store.ts"
Cohesion: 0.10
Nodes (38): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, formatDate(), truncateText() (+30 more)

### Community 13 - "chrome.tsx"
Cohesion: 0.14
Nodes (18): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+10 more)

### Community 14 - "useScreenInput"
Cohesion: 0.12
Nodes (28): useChromeHideQuitHint(), useScreenInput(), FakeTaskWizard(), FieldEditor(), FieldEditorProps, DEFAULT_RAW_INPUTS, MultiLineInput(), MultiLineInputProps (+20 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.14
Nodes (36): isAltScreenActive(), getEditorCommand(), openEditor(), OpenEditorOptions, ConfirmPopup(), DetailPane(), ListItemRow(), MessagePopup() (+28 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.09
Nodes (48): DashboardStoreContext, DashboardMetricsContext, DashboardMetricsValue, DASHBOARD_EVENTS, DashboardMetricsProviderProps, initialValue(), REAL_TIMERS, ThemeContext (+40 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.12
Nodes (45): cmdLaunch(), handleQuestSubcommand(), questAbandon(), questActivate(), questArchive(), questComplete(), questCreate(), questHelp() (+37 more)

### Community 18 - "onboarding/index.ts"
Cohesion: 0.14
Nodes (36): CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps, formatSectionForDisplay(), INPUT_STEPS, InputStep, parseConventions() (+28 more)

### Community 19 - "splash-screen.tsx"
Cohesion: 0.09
Nodes (35): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+27 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.10
Nodes (34): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+26 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.08
Nodes (31): Behavior, Fake Agent, Usage, analyzeBarrelFile(), BarrelFile, detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles() (+23 more)

### Community 22 - "commands/tui.ts"
Cohesion: 0.08
Nodes (52): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), cmdTui(), handleErrandFlow() (+44 more)

### Community 23 - "run-quest-picker.tsx"
Cohesion: 0.12
Nodes (31): defaultLoadTaskQuests(), AllTasksDetail(), AllTasksItem(), ErrandsDetail(), ErrandsItem(), Header(), QuestDetail(), QuestListItem() (+23 more)

### Community 24 - "worktree.ts"
Cohesion: 0.12
Nodes (27): cmdCleanup(), getStreamForFeature(), branchExists(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree() (+19 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.09
Nodes (36): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), renderSubtask() (+28 more)

### Community 26 - "ref_node_path"
Cohesion: 0.06
Nodes (33): root, aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent() (+25 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "project-store.ts"
Cohesion: 0.11
Nodes (30): addObjective(), addRule(), atomicWrite(), bumpGenesisCount(), ensureDir(), linkQuestToObjective(), loadProject(), normalizeConventions() (+22 more)

### Community 29 - "commands/completion.ts"
Cohesion: 0.06
Nodes (65): parseMergeArgs(), parseTaskList(), buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), resolveGlobalFlagsAndCommand(), runCittyCommand(), aliasHint() (+57 more)

### Community 30 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (6): delegateToDaemon(), waitForDaemonCompletion(), DaemonClient, CommandMap, DaemonMonitorAdapter(), TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (29): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+21 more)

### Community 33 - "init-app.tsx"
Cohesion: 0.31
Nodes (11): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+3 more)

### Community 34 - "quest-wizard.tsx"
Cohesion: 0.11
Nodes (19): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), HITL_DESCRIPTIONS, PRIORITY_COLORS, QuestWizard(), STEPS, createTestStreams() (+11 more)

### Community 35 - "run-daemon-monitor.tsx"
Cohesion: 0.10
Nodes (36): AgentStatus, DaemonAgentState, EvtAgentActivity, EvtAgentStatusChange, EvtBuildResult, EvtHitlQuestion, EvtLog, EvtMergeResult (+28 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.13
Nodes (33): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+25 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.16
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - ".load"
Cohesion: 0.08
Nodes (24): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+16 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (31): cmdTasksAdd(), CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER (+23 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (36): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+28 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.08
Nodes (31): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+23 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (39): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+31 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+14 more)

### Community 47 - "genesis-planner.ts"
Cohesion: 0.11
Nodes (30): buildGenesisConfig(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES, questStash (+22 more)

### Community 48 - "ref_node_os"
Cohesion: 0.09
Nodes (22): 1. Are agents spawned with `detached: true` and `unref()`?, agentEnv(), AgentType, ConflictResolverOptions, detectAgentType(), FAKE_AGENT_SENTINEL, launchConflictResolver(), launchHeadless() (+14 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.22
Nodes (8): write(), commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit(), repo()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (16): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+8 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.07
Nodes (52): markTaskDone(), finishAgent(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), computeOperationId(), POST_MERGE_JOURNAL, VerificationSummary (+44 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "commands/merge.ts"
Cohesion: 0.09
Nodes (46): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), defaultIsDaemonAlive(), evidenceFor(), git(), gitOk() (+38 more)

### Community 54 - "run-review.tsx"
Cohesion: 0.19
Nodes (17): buildPlanConfig(), DIFFICULTIES, PLAN_EDIT_FIELDS, PlanReviewApp(), PlanReviewAppProps, PRIORITIES, reviewItemToTask(), taskStash (+9 more)

### Community 55 - "esc-menu.tsx"
Cohesion: 0.14
Nodes (15): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+7 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.09
Nodes (38): resolveAgentBin(), ErrandWizardProps, ErrandSpec, extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), generateGenesisPrompt(), buildSynthesisPrompt() (+30 more)

### Community 57 - "toon.ts"
Cohesion: 0.05
Nodes (75): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+67 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "templates.ts"
Cohesion: 0.19
Nodes (16): isPortlessAvailable(), AGENT_TEMPLATE_PATH, applyHitlAwareness(), applyPlaceholders(), buildTddBlock(), GENERALIST_TEMPLATE_PATH, joinFrontmatter(), PATCH_BODY_END_PATH (+8 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.10
Nodes (11): ConnectionState, EventMap, EvtStateSnapshot, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, mount() (+3 more)

### Community 63 - "config.test.ts"
Cohesion: 0.22
Nodes (3): cmdInit(), InitOptions, CONFIG_FILE

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "analytics-overlay.tsx"
Cohesion: 0.15
Nodes (30): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABELS (+22 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.12
Nodes (28): extractBrowserErrorSummary(), buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions (+20 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.09
Nodes (6): LiveFakeClient, makeMinimalConfig(), mountShell(), openDashboardFromMenu(), sleep(), StubDaemonClient

### Community 68 - "citty/tasks.ts"
Cohesion: 0.11
Nodes (25): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setStatusCommand (+17 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (9): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Findings, isProcessRunning(), extractActivity(), formatEventForLog(), ProcessMonitor, shortCmd() (+1 more)

### Community 70 - "daemon-scheduler.test.ts"
Cohesion: 0.18
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

### Community 71 - "use-spinner.test.tsx"
Cohesion: 0.53
Nodes (3): FastSpinner(), SpinnerDisplay(), useSpinner()

### Community 73 - "quest-store.ts"
Cohesion: 0.26
Nodes (17): archivedKnowledgeDir(), archivedKnowledgeFilePath(), archivedQuestFilePath(), archiveQuest(), deleteQuest(), ensureDir(), getQuestsDir(), knowledgeDir() (+9 more)

### Community 74 - "InkDaemonTUI"
Cohesion: 0.11
Nodes (5): InkDaemonTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 75 - "fake-gh.ts"
Cohesion: 0.17
Nodes (11): CommandRunner, defaultCommandRunner(), EnvOpts, makeEnv(), FakeGh, FakeGhOptions, FakePr, makeFakeGh() (+3 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.05
Nodes (39): author, bin, woco, bugs, url, dependencies, citty, ink (+31 more)

### Community 78 - "task-browser.tsx"
Cohesion: 0.11
Nodes (27): useEscMenu(), agentStatusColor(), Header(), PRIORITY_ABBREV, StatusBar(), TaskBrowserView(), TaskBrowserViewProps, TaskDetail() (+19 more)

### Community 79 - "prompt.ts"
Cohesion: 0.21
Nodes (11): formatHunksForLLM(), portlessUrl(), formatSubtask(), formatTestBaselineSection(), generateConflictResolutionPrompt(), generatePrompt(), generateRebaseCommitPrompt(), generateTier4RerunPrompt() (+3 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.14
Nodes (29): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+21 more)

### Community 81 - ".allComplete"
Cohesion: 0.07
Nodes (27): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle (+19 more)

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 84 - "analytics-git.ts"
Cohesion: 0.24
Nodes (12): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+4 more)

### Community 85 - ".submitTask"
Cohesion: 0.10
Nodes (18): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+10 more)

### Community 86 - "DashboardMetricsProvider"
Cohesion: 0.13
Nodes (10): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, addInto(), cloneTotals(), DashboardUsageReader, emptyTotals() (+2 more)

### Community 87 - "analytics-summary.ts"
Cohesion: 0.24
Nodes (13): AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions(), filterExecutions() (+5 more)

### Community 88 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 89 - "commands/status.ts"
Cohesion: 0.21
Nodes (15): agentToJson(), buildStatusJson(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize(), elapsed() (+7 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.07
Nodes (21): ink, react, App(), AppProps, createTestStreams(), renderLive(), runApp(), RunAppOptions (+13 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "ADDED Requirements"
Cohesion: 0.18
Nodes (10): ADDED Requirements, Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo (+2 more)

### Community 94 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.16
Nodes (11): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+3 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "fake-task-wizard.tsx"
Cohesion: 0.19
Nodes (11): FakeTaskConfig, FakeTaskWizardProps, Field, generateFakeTasks(), shuffleArr(), shuffledTitles(), TASK_TITLE_POOL, WORKFLOW_DESCRIPTIONS (+3 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.08
Nodes (8): Assistant (Build · claude-sonnet-4.6 · 26.9s), Assistant (Build · claude-sonnet-4.6 · 4.2s), Assistant (Build · claude-sonnet-4.6 · 7.5s), On Elixir/BEAM architecture as an evolution, The actual bugs — precise diagnosis, DaemonState, makePopulatedState(), makeRunner()

### Community 101 - "init-form.tsx"
Cohesion: 0.23
Nodes (9): EditableField(), EditableFieldProps, FieldDef, FIELDS, InitForm(), InitFormDefaults, InitFormProps, createTestStreams() (+1 more)

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

### Community 109 - "Scheduler"
Cohesion: 0.07
Nodes (38): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+30 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (56): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+48 more)

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

### Community 115 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 116 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

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
Cohesion: 0.14
Nodes (19): cmdAbort(), logsCommand, cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdLogs() (+11 more)

### Community 121 - "init-writer.ts"
Cohesion: 0.53
Nodes (4): DEFAULT_CONFIG, InitWriterConfig, InitWriterResult, writeInitFiles()

### Community 122 - "2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md"
Cohesion: 0.40
Nodes (4): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification

### Community 123 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 124 - "step-wizard.test.tsx"
Cohesion: 0.60
Nodes (3): createTestStreams(), plain(), renderWizardInChrome()

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1072 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `run-tui-app.tsx`, `agent-runner.ts`, `protocol.ts`, `run-task-browser.tsx`, `task-store.ts`, `config.ts`, `commands/quest.ts`, `onboarding/index.ts`, `splash-screen.tsx`, `commands/launch.ts`, `commands/tui.ts`, `run-quest-picker.tsx`, `worktree.ts`, `lib/tasks.ts`, `ref_node_path`, `DaemonClient`, `agent-registry.ts`, `run-daemon-monitor.tsx`, `task-schema.ts`, `Daemon`, `analytics.ts`, `genesis-planner.ts`, `ref_node_os`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `commands/merge.ts`, `quest-planner.ts`, `toon.ts`, `templates.ts`, `config.test.ts`, `tdd-verifier.test.ts`, `citty/tasks.ts`, `daemon-scheduler.test.ts`, `InkDaemonTUI`, `prompt.ts`, `commands/usage.ts`, `commands/status.ts`, `analytics-lifecycle.test.ts`, `tdd-baseline-integration.test.ts`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `portless.ts`, `output`, `init-writer.ts`, `tdd-baseline-pipeline.test.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `@types/bun`, `@types/react`, `typescript` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.019801980198019802 - nodes in this community are weakly interconnected._
- **Why does `Explore mode guidelines and usage rules` connect `Explore mode guidelines and usage rules` to `DaemonState`, `.load`, `Daemon`, `Scheduler`, `maxConcurrent`, `.submitTask`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `agent-runner.ts`, `protocol.ts`, `task-store.ts`, `config.ts`, `commands/launch.ts`, `run-daemon-monitor.tsx`, `AnalyticsTracker`, `.load`, `Daemon`, `analytics.ts`, `ref_node_os`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `commands/merge.ts`, `ProcessMonitor`, `daemon-scheduler.test.ts`, `fake-gh.ts`, `.allComplete`, `analytics-lifecycle.test.ts`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `Scheduler`, `maxConcurrent`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `WomboConfig` be split into smaller, more focused modules?**
  _Cohesion score 0.09175377468060394 - nodes in this community are weakly interconnected._