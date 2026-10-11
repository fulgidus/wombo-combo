# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 511 files · ~573,935 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 4398 nodes · 12738 edges · 191 communities (161 shown, 30 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 671 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fdecf2b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- .getAgent
- browser.ts
- WomboConfig
- Source files (read and relevant):
- agent-runner.ts
- protocol.ts
- run-tui-app.tsx
- run-task-browser.tsx
- task-store.ts
- toon.ts
- WOMBO_DIR
- templates.ts
- routing.ts
- commands/tui.ts
- useScreenInput
- dashboard-metrics.ts
- commands/quest.ts
- onboarding/index.ts
- project-store.ts
- dashboard.tsx
- commands/launch.ts
- chrome.tsx
- quest-picker.tsx
- worktree.ts
- lib/tasks.ts
- monitor.ts
- hitl-channel.ts
- index.md
- schema.ts
- scout.ts
- DaemonClient
- agent-registry.ts
- quest-planner.ts
- harness/index.ts
- ink/index.ts
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
- lib/replay.ts
- lib/launcher.ts
- analytics-measurements.test.ts
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- quest-store.ts
- quest.md
- genesis-planner.ts
- config.ts
- TextBuffer
- commands/tasks.md
- permission
- ref_bun_test
- dashboard-provider.tsx
- commands/status.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- analytics-overlay.tsx
- tdd-verifier.test.ts
- monitor-router.test.tsx
- graph.ts
- ProcessMonitor
- daemon-scheduler.test.ts
- QuestWizard
- graphify-pre-push.py
- commands/merge.ts
- InkDaemonTUI
- fake-gh.ts
- agents/generalist-agent.md
- package.json
- docs/package.json
- prompt-compress.ts
- commands/usage.ts
- ADDED Requirements
- test-detection.ts
- test-runner.ts
- commands/completion.ts
- .submitTask
- dashboard-usage.ts
- esc-menu.tsx
- ReplayRecorder
- wishlist.md
- react
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- post-merge.test.ts
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- citty/quest.ts
- run-daemon-monitor.tsx
- analytics-integration.test.ts
- analytics-browser.test.tsx
- ReplayStore
- hitl-ask.ts
- daemon-project-context.test.ts
- CONTEXT.md — For AI agents using wombo as a tool
- Scheduler
- maxConcurrent
- daemon.md
- harnesses.md
- openspec/specs/scheduler-concurrency-accounting/spec.md
- analytics-summary.ts
- run-quest-picker.tsx
- config.md
- tdd-baseline.md
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- src/index.ts
- replay-viewer.test.tsx
- splash-screen.tsx
- commands/upgrade.ts
- tdd-baseline-pipeline.test.ts
- StubDaemonClient
- run-onboarding.ts
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- plan-review.tsx
- syncQuestBranch
- harness-opencode.test.ts
- react-devtools-core.ts
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- run-progress.tsx
- step-wizard.tsx
- replay-browser.test.tsx
- gen-config-docs.ts
- router.ts
- merge-resolver-agent.md
- Task
- overview.md
- init-form.tsx
- first-task.md
- quests.md
- AgentRunner
- wombo-combo Operational Constraints
- onboarding-app.tsx
- install.md
- docs/tsconfig.json
- genesis.md
- analytics-git.ts
- quest create
- replay.md
- citty/merge.ts
- wombo-combo Agent Context
- tasks archive
- docs-starlight knowledge
- TaskBrowserApp
- session-replay — knowledge
- describe.md
- retry.md
- StubDaemonClient
- tasks set-status
- saveTaskToStore
- tasksDir
- cleanup.md

## God Nodes (most connected - your core abstractions)
1. `WomboConfig` - 142 edges
2. `react` - 116 edges
3. `Explore mode guidelines and usage rules` - 114 edges
4. `ink` - 109 edges
5. `DaemonState` - 103 edges
6. `AgentRunner` - 96 edges
7. `useScreenInput()` - 68 edges
8. `OutputFormat` - 61 edges
9. `maxConcurrent()` - 59 edges
10. `Task` - 55 edges

## Surprising Connections (you probably didn't know these)
- `Daemon` --references--> `AgentRunner`  [INFERRED]
  docs/src/content/docs/architecture/overview.md → src/daemon/agent-runner.ts
- `Seams` --references--> `ReplayRecorder`  [INFERRED]
  .wombo-combo/quests/session-replay/knowledge.md → src/daemon/replay-recorder.ts
- `Why `concurrencyPinned` doesn't protect persisted state` --references--> `Scheduler`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/design.md → src/daemon/scheduler.ts
- `Modified Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/proposal.md → src/lib/eval-score.ts
- `New Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md → src/lib/eval-score.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (191 total, 30 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (94): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+86 more)

### Community 2 - "browser.ts"
Cohesion: 0.09
Nodes (20): Cleanup, Daemon and TUI, Launch, Merge, Monitoring and recovery, Verification, BrowserConfig, allocateDebugPort() (+12 more)

### Community 3 - "WomboConfig"
Cohesion: 0.08
Nodes (47): AbortCommandOptions, cmdAbort(), CleanupOptions, EvalCommandOptions, GenesisCommandOptions, HistoryCommandOptions, cmdLogs(), colorize() (+39 more)

### Community 4 - "Source files (read and relevant):"
Cohesion: 0.08
Nodes (29): Context, 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals (+21 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.11
Nodes (36): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), runTier25(), Tier25Result, abortRebase(), beginRebase(), canMerge() (+28 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (59): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+51 more)

### Community 7 - "run-tui-app.tsx"
Cohesion: 0.08
Nodes (35): ChromeLayout(), DashboardScreen(), EscMenuProvider(), getLocaleT(), defaultNav, NavigationContext, NavigationState, ScreenComponent (+27 more)

### Community 8 - "run-task-browser.tsx"
Cohesion: 0.08
Nodes (40): ErrandWizardProps, QuestPickerScreenProps, CONCURRENCY_LEVELS, PRIORITIES, RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction, TaskBrowserScreenProps (+32 more)

### Community 9 - "task-store.ts"
Cohesion: 0.19
Nodes (25): validateTask(), archiveDir(), atomicWrite(), createBackup(), ensureDir(), flattenTask(), getArchiveDir(), legacyArchiveFile() (+17 more)

### Community 10 - "toon.ts"
Cohesion: 0.13
Nodes (35): TaskStatus, encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGeneric() (+27 more)

### Community 11 - "WOMBO_DIR"
Cohesion: 0.10
Nodes (25): citty, parseLaunchArgs(), loadProjectConfigSync(), ensureInitialized(), listCommand, replayCommand, showCommand, ParsedResumeArgs (+17 more)

### Community 12 - "templates.ts"
Cohesion: 0.05
Nodes (67): Behavior, Fake Agent, Usage, yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions (+59 more)

### Community 13 - "routing.ts"
Cohesion: 0.12
Nodes (24): AgentProfile, resolveAgentBin(), Operation, detectHarnessFromBin(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel() (+16 more)

### Community 14 - "commands/tui.ts"
Cohesion: 0.11
Nodes (36): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+28 more)

### Community 15 - "useScreenInput"
Cohesion: 0.09
Nodes (50): useScreenInput(), buildGenesisConfig(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES (+42 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.08
Nodes (46): Commands, Dependencies and ordering, Fields, EvtAgentActivity, EvtBuildResult, EvtMergeResult, EvtTaskPicked, SchedulerStatus (+38 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.13
Nodes (43): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+35 more)

### Community 18 - "onboarding/index.ts"
Cohesion: 0.18
Nodes (29): FieldEditor(), FieldEditorProps, formatSectionForDisplay(), INPUT_STEPS, InputStep, parseConventions(), parseObjectives(), parseRules() (+21 more)

### Community 19 - "project-store.ts"
Cohesion: 0.10
Nodes (32): addObjective(), addRule(), atomicWrite(), bumpGenesisCount(), createBlankProfile(), ensureDir(), linkQuestToObjective(), loadProject() (+24 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.10
Nodes (34): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+26 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.10
Nodes (28): analyzeBarrelFile(), BarrelFile, detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), cmdResume(), prepareAgentDefinitions(), buildChainFrom() (+20 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.14
Nodes (19): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+11 more)

### Community 23 - "quest-picker.tsx"
Cohesion: 0.19
Nodes (16): AllTasksDetail(), AllTasksItem(), ErrandsDetail(), ErrandsItem(), Header(), QuestDetail(), QuestListItem(), QuestPickerView() (+8 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (24): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), deleteQuestBranch(), featureBranchName() (+16 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.06
Nodes (50): cmdTasksShow(), renderSubtask(), statusColor(), formatHunksForLLM(), ensureProxyRunning(), isPortlessAvailable(), isProxyRunning(), portlessEnv() (+42 more)

### Community 26 - "monitor.ts"
Cohesion: 0.08
Nodes (20): extractActivity(), formatEventForLog(), MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd() (+12 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (23): Arguments, Global flags, Arguments, Global flags, Arguments, Global flags, Global flags, Arguments (+15 more)

### Community 29 - "schema.ts"
Cohesion: 0.10
Nodes (34): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+26 more)

### Community 30 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 31 - "DaemonClient"
Cohesion: 0.11
Nodes (9): delegateToDaemon(), waitForDaemonCompletion(), DaemonClient, CommandMap, parseMessage(), DaemonMonitorAdapter(), DaemonMonitorShellProps, InkDaemonTUIOptions (+1 more)

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (29): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+21 more)

### Community 33 - "quest-planner.ts"
Cohesion: 0.08
Nodes (35): ParsedLaunchArgs, LaunchCommandOptions, QuestCommandOptions, TasksAddOptions, HITL_DESCRIPTIONS, PRIORITY_COLORS, QuestWizardPrefill, QuestWizardProps (+27 more)

### Community 34 - "harness/index.ts"
Cohesion: 0.14
Nodes (25): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+17 more)

### Community 35 - "ink/index.ts"
Cohesion: 0.06
Nodes (53): deepMerge(), saveConfig(), createI18n(), I18nContext, LOCALE_STRINGS, StringsMap, TFunction, useI18n() (+45 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.12
Nodes (27): Flags, Global flags, task(), ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask (+19 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.12
Nodes (33): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+25 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.17
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - "Minimal, surgical fix"
Cohesion: 0.20
Nodes (9): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+1 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.12
Nodes (25): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS (+17 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.09
Nodes (35): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+27 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.06
Nodes (32): Flags, Global flags, AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION (+24 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (39): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+31 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+14 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.08
Nodes (33): ReplayRecorderOptions, Tracked, boundValue(), DEFAULT_KEEP_PER_TASK, captureWorktreeDiff(), DiffLineKind, pathspecs(), runGit() (+25 more)

### Community 48 - "lib/launcher.ts"
Cohesion: 0.07
Nodes (41): 1. Are agents spawned with `detached: true` and `unref()`?, HarnessId, getHarness(), ResolvedRoute, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness(), SpawnTarget (+33 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.12
Nodes (20): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+12 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.07
Nodes (51): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), PostMergeRequest, VerificationSummary, createBlankTask(), addVerifiedAgent() (+43 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (33): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+25 more)

### Community 54 - "quest-store.ts"
Cohesion: 0.13
Nodes (31): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), createBlankQuest(), emptyConstraints() (+23 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "genesis-planner.ts"
Cohesion: 0.09
Nodes (36): Known quirks, defaultLoadTaskQuests(), extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), detectCycles(), dfs(), extractGenesisYaml() (+28 more)

### Community 57 - "config.ts"
Cohesion: 0.06
Nodes (56): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+48 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags, Flags (+22 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "ref_bun_test"
Cohesion: 0.04
Nodes (46): root, cmdInit(), InitOptions, CONFIG_FILE, DEFAULT_CONFIG, InitApp(), InitAppProps, InitState (+38 more)

### Community 62 - "dashboard-provider.tsx"
Cohesion: 0.07
Nodes (26): ConnectionState, EventMap, EvtStateSnapshot, DashboardMetricsContext, DashboardMetricsValue, useDashboardMetrics(), clientState(), DASHBOARD_EVENTS (+18 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.21
Nodes (16): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize() (+8 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (15): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+7 more)

### Community 65 - "analytics-overlay.tsx"
Cohesion: 0.13
Nodes (31): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABELS (+23 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.12
Nodes (28): extractBrowserErrorSummary(), buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions (+20 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.10
Nodes (4): LiveFakeClient, makeMinimalConfig(), openDashboardFromMenu(), sleep()

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (14): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+6 more)

### Community 70 - "daemon-scheduler.test.ts"
Cohesion: 0.18
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

### Community 71 - "QuestWizard"
Cohesion: 0.12
Nodes (13): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), QuestWizard(), createTestStreams(), noopSave, renderLive(), SelectInput() (+5 more)

### Community 73 - "commands/merge.ts"
Cohesion: 0.08
Nodes (51): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+43 more)

### Community 74 - "InkDaemonTUI"
Cohesion: 0.11
Nodes (5): InkDaemonTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 75 - "fake-gh.ts"
Cohesion: 0.25
Nodes (5): FakeGh, FakeGhOptions, FakePr, ok(), RecordedCall

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
Nodes (29): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+21 more)

### Community 81 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded (+3 more)

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.18
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - ".submitTask"
Cohesion: 0.10
Nodes (16): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+8 more)

### Community 86 - "dashboard-usage.ts"
Cohesion: 0.12
Nodes (11): addInto(), buildTaskQuestMap(), cloneTotals(), DashboardUsageReader, emptyTotals(), mergeInto(), normalizeUsageRecord(), TaskQuestLookup (+3 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.13
Nodes (18): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+10 more)

### Community 88 - "ReplayRecorder"
Cohesion: 0.13
Nodes (3): errMsg(), ReplayRecorder, ReplayEndOutcome

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "react"
Cohesion: 0.05
Nodes (53): ink, react, App(), AppProps, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardStep (+45 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (20): removeTaskFromStore(), addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch() (+12 more)

### Community 94 - "post-merge.test.ts"
Cohesion: 0.12
Nodes (17): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+9 more)

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.17
Nodes (10): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+2 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.10
Nodes (20): generateDefaultConfig(), buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess() (+12 more)

### Community 97 - "wombo-combo"
Cohesion: 0.11
Nodes (18): Commands, Agent Analytics, Commands, Coverage limitations, Entry points, Install, Launch options, License (+10 more)

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

### Community 102 - "run-daemon-monitor.tsx"
Cohesion: 0.11
Nodes (29): AgentStatus, DaemonAgentState, EvtAgentStatusChange, EvtSchedulerStatus, SchedulerState, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason (+21 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.18
Nodes (9): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+1 more)

### Community 104 - "analytics-browser.test.tsx"
Cohesion: 0.20
Nodes (8): ANALYTICS_REFRESH_MS, analyticsScopeFilter(), Harness, mount(), h, result(), wait(), waitFor()

### Community 105 - "ReplayStore"
Cohesion: 0.19
Nodes (13): cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution(), assertSafe() (+5 more)

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
Nodes (28): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+20 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (55): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+47 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "harnesses.md"
Cohesion: 0.22
Nodes (7): Configuration, Custom command template, Fallback chains, Profile fields, Routing, Secrets never go in config, Supported harnesses and verification status

### Community 113 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.18
Nodes (10): Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: New agents are not launched to fill slots held by verified agents (+2 more)

### Community 114 - "analytics-summary.ts"
Cohesion: 0.24
Nodes (13): AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions(), filterExecutions() (+5 more)

### Community 115 - "run-quest-picker.tsx"
Cohesion: 0.17
Nodes (21): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+13 more)

### Community 116 - "config.md"
Cohesion: 0.14
Nodes (13): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `defaults`, `git`, `install` (+5 more)

### Community 117 - "tdd-baseline.md"
Cohesion: 0.22
Nodes (8): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Supported test output, What is recorded

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "src/index.ts"
Cohesion: 0.16
Nodes (13): extractGlobalFlags(), ExtractResult, GlobalFlags, helpCommand, buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), ResolvedCommand (+5 more)

### Community 121 - "replay-viewer.test.tsx"
Cohesion: 0.17
Nodes (13): parseReplay(), ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay() (+5 more)

### Community 122 - "splash-screen.tsx"
Cohesion: 0.13
Nodes (16): ALL_LOGO_LINES, CheckFn, CheckStatus, COMBO_LINES, getLogoCharColor(), hslToHex(), PreflightCheck, runCheck() (+8 more)

### Community 123 - "commands/upgrade.ts"
Cohesion: 0.21
Nodes (16): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+8 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 126 - "run-onboarding.ts"
Cohesion: 0.29
Nodes (12): OnboardingApp(), OnboardingResult, OnboardingScreen(), runOnboardingInk(), RunOnboardingOptions, buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks() (+4 more)

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

### Community 131 - "plan-review.tsx"
Cohesion: 0.24
Nodes (14): buildPlanConfig(), DIFFICULTIES, PLAN_EDIT_FIELDS, PlanReviewApp(), PlanReviewAppProps, PRIORITIES, reviewItemToTask(), taskStash (+6 more)

### Community 132 - "syncQuestBranch"
Cohesion: 0.06
Nodes (34): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+26 more)

### Community 133 - "harness-opencode.test.ts"
Cohesion: 0.29
Nodes (8): HARNESS_IDS, isHarnessId(), OPERATIONS, listHarnesses(), detectAgentType(), base, oc, Contracts (src/lib/harness/)

### Community 137 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 139 - "run-progress.tsx"
Cohesion: 0.20
Nodes (11): ProgressResult, ProgressView(), ProgressViewProps, SPIN_CHARS, ProgressApp(), ProgressController, RunConfirmOptions, RunProgressOptions (+3 more)

### Community 140 - "step-wizard.tsx"
Cohesion: 0.22
Nodes (11): DEFAULT_RAW_INPUTS, MultiLineInput(), MultiLineInputProps, SelectionList(), SelectionListProps, SingleLineInput(), SingleLineInputProps, StepWizard() (+3 more)

### Community 142 - "replay-browser.test.tsx"
Cohesion: 0.23
Nodes (7): stripAnsi(), Harness, mount(), h, seedTask(), wait(), waitFor()

### Community 143 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 144 - "router.ts"
Cohesion: 0.08
Nodes (32): abortCommand, cleanupCommand, completionCommand, daemonCommand, startCommand, statusCommand, stopCommand, describeCommand (+24 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "Task"
Cohesion: 0.36
Nodes (6): Task, cfg(), ExposedRunner, heavy, light, routed()

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "init-form.tsx"
Cohesion: 0.23
Nodes (9): EditableField(), EditableFieldProps, FieldDef, FIELDS, InitForm(), InitFormDefaults, InitFormProps, createTestStreams() (+1 more)

### Community 149 - "first-task.md"
Cohesion: 0.29
Nodes (6): 1. Initialize the project, 2. Add a task, 3. Preview, then launch, 4. Verify and merge, 5. Clean up, Where to go next

### Community 150 - "quests.md"
Cohesion: 0.33
Nodes (5): Branches, Constraints, Lifecycle, Planning, TDD

### Community 151 - "AgentRunner"
Cohesion: 0.10
Nodes (13): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected, ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently (+5 more)

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 153 - "onboarding-app.tsx"
Cohesion: 0.27
Nodes (7): CreateFlowPhase, EditFlowPhase, OnboardingAppProps, ProgressResult, ProgressView(), ProgressViewProps, SPINNER_FRAMES

### Community 154 - "install.md"
Cohesion: 0.40
Nodes (4): Install, Next, Shell completions, Working on wombo-combo itself

### Community 155 - "docs/tsconfig.json"
Cohesion: 0.40
Nodes (4): exclude, extends, include, astro/tsconfigs/strict

### Community 156 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 157 - "analytics-git.ts"
Cohesion: 0.27
Nodes (10): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+2 more)

### Community 158 - "quest create"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest create

### Community 159 - "replay.md"
Cohesion: 0.22
Nodes (8): Arguments, Arguments, Flags, Global flags, Global flags, Global flags, replay list, replay show

### Community 160 - "citty/merge.ts"
Cohesion: 0.33
Nodes (6): mergeCommand, ParsedMergeArgs, parseMergeArgs(), parseTaskList(), findBridgeCommandDef(), matchByNameOrAlias()

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

### Community 162 - "tasks archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks archive

### Community 163 - "docs-starlight knowledge"
Cohesion: 0.50
Nodes (3): Decisions, docs-starlight knowledge, File ownership

### Community 164 - "TaskBrowserApp"
Cohesion: 0.33
Nodes (9): runTaskBrowserInk(), TaskBrowserApp(), validateMeta(), defaultMeta(), listTaskFiles(), loadArchiveFromStore(), loadMeta(), loadTasksFromStore() (+1 more)

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 167 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 169 - "tasks set-status"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks set-status

### Community 171 - "saveTaskToStore"
Cohesion: 0.16
Nodes (16): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+8 more)

### Community 173 - "tasksDir"
Cohesion: 0.50
Nodes (4): Top-level options, getTasksDir(), tasksDir(), tasksStoreExists()

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1328 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `browser.ts`, `agent-runner.ts`, `protocol.ts`, `run-tui-app.tsx`, `run-task-browser.tsx`, `task-store.ts`, `templates.ts`, `routing.ts`, `commands/tui.ts`, `commands/quest.ts`, `onboarding/index.ts`, `Task`, `project-store.ts`, `commands/launch.ts`, `AgentRunner`, `worktree.ts`, `lib/tasks.ts`, `onboarding-app.tsx`, `DaemonClient`, `agent-registry.ts`, `quest-planner.ts`, `task-schema.ts`, `Daemon`, `analytics.ts`, `lib/launcher.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `quest-store.ts`, `genesis-planner.ts`, `config.ts`, `ref_bun_test`, `commands/status.ts`, `tdd-verifier.test.ts`, `graph.ts`, `daemon-scheduler.test.ts`, `commands/merge.ts`, `InkDaemonTUI`, `commands/usage.ts`, `daemon-test-baseline.test.ts`, `tdd-baseline-integration.test.ts`, `run-daemon-monitor.tsx`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `run-quest-picker.tsx`, `splash-screen.tsx`, `tdd-baseline-pipeline.test.ts`, `run-onboarding.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `.getAgent`, `Source files (read and relevant):`, `agent-runner.ts`, `protocol.ts`, `Task`, `AgentRunner`, `lib/tasks.ts`, `AnalyticsTracker`, `Minimal, surgical fix`, `Daemon`, `analytics.ts`, `lib/replay.ts`, `.reapDeadProcesses`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `ref_bun_test`, `daemon-scheduler.test.ts`, `commands/merge.ts`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `run-daemon-monitor.tsx`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `maxConcurrent`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0928030303030303 - nodes in this community are weakly interconnected._
- **Why does `AgentRunner` connect `AgentRunner` to `.getAgent`, `WomboConfig`, `Source files (read and relevant):`, `agent-runner.ts`, `protocol.ts`, `Task`, `overview.md`, `lib/tasks.ts`, `AnalyticsTracker`, `Daemon`, `saveTaskToStore`, `.reapDeadProcesses`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `ref_bun_test`, `ProcessMonitor`, `daemon-scheduler.test.ts`, `commands/merge.ts`, `.submitTask`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `DaemonState`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `Scheduler`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `WomboConfig` be split into smaller, more focused modules?**
  _Cohesion score 0.07878787878787878 - nodes in this community are weakly interconnected._