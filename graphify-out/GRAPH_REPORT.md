# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 493 files · ~555,265 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 4200 nodes · 12205 edges · 186 communities (160 shown, 26 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 697 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `07a5cbe9`
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
- lib/tasks.ts
- task-store.ts
- citty/tasks.ts
- config.ts
- templates.ts
- routing.ts
- commands/tui.ts
- useScreenInput
- dashboard-metrics.ts
- commands/quest.ts
- react
- project-store.ts
- dashboard.tsx
- commands/launch.ts
- ink/index.ts
- run-quest-picker.tsx
- worktree.ts
- features.test.ts
- monitor.ts
- hitl-channel.ts
- index.md
- commands/completion.ts
- scout.ts
- DaemonClient
- agent-registry.ts
- commands/init.ts
- harness/index.ts
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
- analytics-measurements.test.ts
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- commands/merge.ts
- quest-store.ts
- quest.md
- quest-planner.ts
- toon.ts
- TextBuffer
- commands/tasks.md
- permission
- ref_node_path
- dashboard-provider.test.tsx
- commands/status.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- task-browser.tsx
- tdd-verifier.test.ts
- monitor-router.test.tsx
- graph.ts
- ProcessMonitor
- daemon-scheduler.test.ts
- quest-wizard.tsx
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
- test-runner.test.ts
- Scheduler
- Requirement: Launch stagger applies only to real-agent launches
- dashboard-provider.tsx
- esc-menu.tsx
- wishlist-picker.tsx
- .text
- ref_bun_test
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- analytics-lifecycle.test.ts
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- citty/quest.ts
- state.ts
- analytics-integration.test.ts
- analytics-browser.test.tsx
- cli-smoke.test.ts
- hitl-ask.ts
- daemon-project-context.test.ts
- CONTEXT.md — For AI agents using wombo as a tool
- .handleStart
- maxConcurrent
- daemon.md
- multi-cli-support — architecture
- openspec/specs/scheduler-concurrency-accounting/spec.md
- analytics-summary.ts
- commands/stats.ts
- config.md
- tdd-baseline.md
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/logs.ts
- daemon/launcher.ts
- SchedulerConfig
- splash-screen.tsx
- tdd-baseline-pipeline.test.ts
- StubDaemonClient
- onboarding-helpers.ts
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- HarnessAdapter
- tmpDir
- harness-opencode.test.ts
- react-devtools-core.ts
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- wishlist.ts
- TokenCollector
- scripts
- wishlist-store.ts
- router.ts
- merge-resolver-agent.md
- daemon-profile-wiring.test.ts
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
- Configuration
- quest create
- spawn.ts
- dependencies
- wombo-combo Agent Context
- tasks archive
- docs-starlight knowledge
- planner-project-context.test.ts
- quest plan
- describe.md
- retry.md
- tasks set-difficulty
- task
- Capabilities

## God Nodes (most connected - your core abstractions)
1. `WomboConfig` - 139 edges
2. `Explore mode guidelines and usage rules` - 114 edges
3. `react` - 113 edges
4. `ink` - 106 edges
5. `DaemonState` - 98 edges
6. `AgentRunner` - 92 edges
7. `useScreenInput()` - 66 edges
8. `maxConcurrent()` - 59 edges
9. `OutputFormat` - 57 edges
10. `Task` - 52 edges

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

## Communities (186 total, 26 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (94): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+86 more)

### Community 1 - "AgentRunner"
Cohesion: 0.13
Nodes (8): Decision 1: Skip stagger for fake agents at the queue-processing level, 1. AgentRunner — Per-entry stagger flag, 3. Unit Tests, 4. Verification, Assistant (Build · claude-sonnet-4.6 · 6.2s), AgentRunner, TaskEditorProps, Task

### Community 2 - "browser.ts"
Cohesion: 0.09
Nodes (20): Cleanup, Daemon and TUI, Launch, Merge, Monitoring and recovery, Verification, BrowserConfig, allocateDebugPort() (+12 more)

### Community 3 - "WomboConfig"
Cohesion: 0.09
Nodes (40): AbortCommandOptions, cmdAbort(), ParsedLaunchArgs, ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, EvalCommandOptions (+32 more)

### Community 4 - "Source files (read and relevant):"
Cohesion: 0.10
Nodes (26): Context, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Impact (+18 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.10
Nodes (38): MaxEscalationTier, AgentRunnerConfig, FAKE_AGENT_VERIFICATION, getConflictDiffs(), isTierAllowed(), runSafeCmd(), runTier25(), Tier25Result (+30 more)

### Community 6 - "protocol.ts"
Cohesion: 0.07
Nodes (49): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, DaemonStatus, StartDaemonOptions (+41 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.11
Nodes (37): EvtAgentActivity, EvtBuildResult, EvtMergeResult, ChromeLayout(), DashboardScreen(), DashboardStoreContext, EscMenuProvider(), getLocaleT() (+29 more)

### Community 8 - "lib/tasks.ts"
Cohesion: 0.08
Nodes (40): defaultLoadTaskQuests(), analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserApp() (+32 more)

### Community 9 - "task-store.ts"
Cohesion: 0.11
Nodes (45): Top-level options, Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Impact (+37 more)

### Community 10 - "citty/tasks.ts"
Cohesion: 0.15
Nodes (16): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setStatusCommand (+8 more)

### Community 11 - "config.ts"
Cohesion: 0.10
Nodes (33): citty, daemonCommand, startCommand, statusCommand, stopCommand, parseLaunchArgs(), loadProjectConfigSync(), parseResumeArgs() (+25 more)

### Community 12 - "templates.ts"
Cohesion: 0.05
Nodes (58): Behavior, Fake Agent, Usage, InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp() (+50 more)

### Community 13 - "routing.ts"
Cohesion: 0.09
Nodes (29): resolveAgentBin(), Operation, detectHarnessFromBin(), getHarness(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel() (+21 more)

### Community 14 - "commands/tui.ts"
Cohesion: 0.09
Nodes (42): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+34 more)

### Community 15 - "useScreenInput"
Cohesion: 0.06
Nodes (71): useScreenInput(), buildGenesisConfig(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES (+63 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.11
Nodes (37): EvtTaskPicked, initialValue(), advanceThroughput(), alignBucket(), applyDashboardEvent(), applySnapshot(), applyStatusChange(), categorize() (+29 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.10
Nodes (52): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisCommandOptions, GenesisReviewResult, showGenesisReview(), sleep(), cmdLaunch() (+44 more)

### Community 18 - "react"
Cohesion: 0.11
Nodes (48): react, ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp() (+40 more)

### Community 19 - "project-store.ts"
Cohesion: 0.11
Nodes (31): addObjective(), addRule(), atomicWrite(), bumpGenesisCount(), ensureDir(), formatProjectContext(), linkQuestToObjective(), loadProject() (+23 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.09
Nodes (32): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgent, DashboardAgentRow(), DashboardAgentRowProps (+24 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.11
Nodes (28): analyzeBarrelFile(), BarrelFile, delegateToDaemon(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), waitForDaemonCompletion(), buildChainFrom() (+20 more)

### Community 22 - "ink/index.ts"
Cohesion: 0.06
Nodes (46): App(), AppProps, ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar() (+38 more)

### Community 23 - "run-quest-picker.tsx"
Cohesion: 0.08
Nodes (36): FakeTaskConfig, FakeTaskWizardProps, Field, generateFakeTasks(), shuffleArr(), shuffledTitles(), TASK_TITLE_POOL, WORKFLOW_DESCRIPTIONS (+28 more)

### Community 24 - "worktree.ts"
Cohesion: 0.13
Nodes (26): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createQuestBranch(), createWorktree(), featureBranchName() (+18 more)

### Community 25 - "features.test.ts"
Cohesion: 0.09
Nodes (31): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), renderSubtask() (+23 more)

### Community 26 - "monitor.ts"
Cohesion: 0.12
Nodes (18): extractActivity(), formatEventForLog(), MonitoredProcess, OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd(), shortPath() (+10 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (23): Arguments, Global flags, Flags, Global flags, Arguments, Global flags, Arguments, Global flags (+15 more)

### Community 29 - "commands/completion.ts"
Cohesion: 0.06
Nodes (73): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+65 more)

### Community 30 - "scout.ts"
Cohesion: 0.14
Nodes (18): buildKeywords(), buildScoutIndex(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex() (+10 more)

### Community 31 - "DaemonClient"
Cohesion: 0.11
Nodes (7): DaemonClient, CommandMap, EvtStateSnapshot, DaemonMonitorAdapter(), DaemonMonitorShellProps, InkDaemonTUIOptions, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (30): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+22 more)

### Community 33 - "commands/init.ts"
Cohesion: 0.36
Nodes (4): initCommand, cmdInit(), InitOptions, CONFIG_FILE

### Community 34 - "harness/index.ts"
Cohesion: 0.17
Nodes (20): claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput(), parseJsonLine() (+12 more)

### Community 35 - "wave-monitor.tsx"
Cohesion: 0.08
Nodes (38): AgentStatus, ASCII_LEVELS, clean(), formatSparkline(), Sparkline(), SparklineOptions, SparklineProps, UNICODE_LEVELS (+30 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.13
Nodes (32): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+24 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.12
Nodes (9): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, AgentAnalyticsRecord (+1 more)

### Community 39 - ".load"
Cohesion: 0.08
Nodes (24): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+16 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (31): cmdTasksAdd(), CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER (+23 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (38): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+30 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.08
Nodes (29): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+21 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.12
Nodes (38): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+30 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+14 more)

### Community 47 - "genesis-planner.ts"
Cohesion: 0.20
Nodes (14): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput, parseGenesisYaml() (+6 more)

### Community 48 - "lib/launcher.ts"
Cohesion: 0.16
Nodes (22): 1. Are agents spawned with `detached: true` and `unref()`?, HarnessId, ResolvedRoute, spawnHarness(), Normalizer, agentEnv(), AgentType, ConflictResolverOptions (+14 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.12
Nodes (20): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+12 more)

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (17): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+9 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.08
Nodes (44): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), POST_MERGE_JOURNAL, VerificationSummary, createBlankTask(), addVerifiedAgent() (+36 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "commands/merge.ts"
Cohesion: 0.19
Nodes (20): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+12 more)

### Community 54 - "quest-store.ts"
Cohesion: 0.24
Nodes (19): archivedKnowledgeDir(), archivedKnowledgeFilePath(), archivedQuestFilePath(), archiveQuest(), atomicWrite(), deleteQuest(), ensureDir(), getQuestsDir() (+11 more)

### Community 55 - "quest.md"
Cohesion: 0.07
Nodes (26): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags (+18 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.14
Nodes (25): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), canonicalizeOutput(), abortedPlanners, activePlanners, detectCycles(), dfs() (+17 more)

### Community 57 - "toon.ts"
Cohesion: 0.05
Nodes (75): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+67 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.07
Nodes (26): Arguments, Arguments, Arguments, Arguments, Flags, Flags, Flags, Flags (+18 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "ref_node_path"
Cohesion: 0.08
Nodes (20): root, DEFAULT_CONFIG, InitWriterConfig, InitWriterResult, writeInitFiles(), appendChangelogEntry(), assertValidOperationId(), atomicWrite() (+12 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.12
Nodes (7): ConnectionState, EventMap, DashboardDaemonClient, FakeClient, FakeTimers, T0, wait()

### Community 63 - "commands/status.ts"
Cohesion: 0.14
Nodes (27): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), DaemonAgentState (+19 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "task-browser.tsx"
Cohesion: 0.08
Nodes (48): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABELS (+40 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.11
Nodes (28): extractBrowserErrorSummary(), buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions (+20 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.08
Nodes (5): LiveFakeClient, makeMinimalConfig(), openDashboardFromMenu(), sleep(), StubDaemonClient

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (14): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+6 more)

### Community 70 - "daemon-scheduler.test.ts"
Cohesion: 0.18
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

### Community 71 - "quest-wizard.tsx"
Cohesion: 0.11
Nodes (19): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), HITL_DESCRIPTIONS, PRIORITY_COLORS, QuestWizard(), STEPS, createTestStreams() (+11 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.11
Nodes (31): MergeCommandDeps, normalizePostMergeConfig(), CommandRunner, CumulativeReportInput, Git, isComplete(), isJournal(), Journal (+23 more)

### Community 74 - "InkDaemonTUI"
Cohesion: 0.11
Nodes (5): InkDaemonTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 75 - "daemon-agent-runner.test.ts"
Cohesion: 0.09
Nodes (19): CommandResult, defaultCommandRunner(), FAKE_AGENT_SENTINEL, PostMergeRequest, Env, EnvOpts, makeEnv(), ReentrantRunner (+11 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.07
Nodes (26): author, bin, woco, bugs, url, description, devDependencies, @types/bun (+18 more)

### Community 78 - "docs/package.json"
Cohesion: 0.11
Nodes (15): dependencies, astro, @astrojs/starlight, description, name, private, scripts, build (+7 more)

### Community 79 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.14
Nodes (29): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+21 more)

### Community 81 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded (+3 more)

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "test-runner.test.ts"
Cohesion: 0.24
Nodes (11): classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi(), testCaseId() (+3 more)

### Community 84 - "Scheduler"
Cohesion: 0.15
Nodes (5): 1. Concurrency Pinning — Scheduler.start(), 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification, Scheduler

### Community 85 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 86 - "dashboard-provider.tsx"
Cohesion: 0.07
Nodes (29): DashboardMetricsContext, DashboardMetricsValue, useDashboardMetrics(), clientState(), DASHBOARD_EVENTS, DashboardMetricsProvider(), DashboardMetricsProviderProps, mapConnection() (+21 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.11
Nodes (18): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+10 more)

### Community 88 - "wishlist-picker.tsx"
Cohesion: 0.19
Nodes (16): formatDate(), truncateText(), AddInput(), OverlayFooter(), OverlayItemList(), createTestStreams(), renderLive(), WishlistOverlay() (+8 more)

### Community 89 - ".text"
Cohesion: 0.14
Nodes (15): Flags, Global flags, Arguments, Arguments, Arguments, Flags, Global flags, Global flags (+7 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.06
Nodes (43): ink, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardProps, ErrandWizardStep, STEP_INSTRUCTIONS, STEP_TITLES (+35 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (19): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+11 more)

### Community 94 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.17
Nodes (10): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+2 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.23
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.11
Nodes (17): Commands, Agent Analytics, Commands, Coverage limitations, Entry points, Install, Launch options, License (+9 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.09
Nodes (7): Assistant (Build · claude-sonnet-4.6 · 26.9s), Assistant (Build · claude-sonnet-4.6 · 7.5s), On Elixir/BEAM architecture as an evolution, The actual bugs — precise diagnosis, DaemonState, makePopulatedState(), makeRunner()

### Community 101 - "citty/quest.ts"
Cohesion: 0.14
Nodes (10): abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand, pauseCommand, planCommand (+2 more)

### Community 102 - "state.ts"
Cohesion: 0.13
Nodes (13): EventType, EvtAgentStatusChange, EvtSchedulerStatus, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, PersistedDaemonState (+5 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "analytics-browser.test.tsx"
Cohesion: 0.11
Nodes (11): ANALYTICS_REFRESH_MS, Harness, mount(), h, wait(), waitFor(), stripAnsi(), FakeDaemonClient (+3 more)

### Community 105 - "cli-smoke.test.ts"
Cohesion: 0.20
Nodes (12): buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess(), runSrc() (+4 more)

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "daemon-project-context.test.ts"
Cohesion: 0.29
Nodes (9): git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states, tempDirs (+1 more)

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.13
Nodes (13): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo? (+5 more)

### Community 109 - ".handleStart"
Cohesion: 0.09
Nodes (21): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+13 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (55): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+47 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "multi-cli-support — architecture"
Cohesion: 0.16
Nodes (11): Fallback chains, Routing, Supported harnesses and verification status, plan(), Config (src/config.ts, schemas/config.schema.json), Constraints, Core idea: normalize at the edge, keep the pipeline untouched, File ownership (mostly sequential; tasks 2 and 3 can run in parallel) (+3 more)

### Community 113 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.18
Nodes (10): Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: New agents are not launched to fill slots held by verified agents (+2 more)

### Community 114 - "analytics-summary.ts"
Cohesion: 0.24
Nodes (13): AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions(), filterExecutions() (+5 more)

### Community 115 - "commands/stats.ts"
Cohesion: 0.27
Nodes (13): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+5 more)

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

### Community 120 - "commands/logs.ts"
Cohesion: 0.36
Nodes (8): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), renderLogs()

### Community 121 - "daemon/launcher.ts"
Cohesion: 0.33
Nodes (11): cleanupPidFile(), ensureDaemonRunning(), getDaemonHealthStatus(), getDaemonStatus(), resolveDaemonEntry(), startDaemon(), stopDaemon(), waitForDaemonReady() (+3 more)

### Community 122 - "SchedulerConfig"
Cohesion: 0.33
Nodes (5): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification, SchedulerConfig

### Community 123 - "splash-screen.tsx"
Cohesion: 0.09
Nodes (35): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+27 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.33
Nodes (8): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles(), makeBaseline()

### Community 126 - "onboarding-helpers.ts"
Cohesion: 0.48
Nodes (6): yaml, buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks(), formatProfileAsMarkdown(), runLlmSynthesis()

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

### Community 131 - "HarnessAdapter"
Cohesion: 0.29
Nodes (6): Adding a harness, AgentProfile, normalizeOutput(), CustomCommandSpec, HarnessAdapter, HarnessCapabilities

### Community 132 - "tmpDir"
Cohesion: 0.06
Nodes (35): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+27 more)

### Community 133 - "harness-opencode.test.ts"
Cohesion: 0.29
Nodes (8): HARNESS_IDS, isHarnessId(), OPERATIONS, listHarnesses(), detectAgentType(), base, oc, Contracts (src/lib/harness/)

### Community 137 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 139 - "wishlist.ts"
Cohesion: 0.22
Nodes (5): addCommand, deleteCommand, listCommand, moveCommand, wishlistCommand

### Community 142 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, docs:gen, start, test, typecheck, woco

### Community 143 - "wishlist-store.ts"
Cohesion: 0.14
Nodes (25): HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, WishlistPickerProps, emit(), emitStepFinish() (+17 more)

### Community 144 - "router.ts"
Cohesion: 0.07
Nodes (44): abortCommand, cleanupCommand, completionCommand, describeCommand, evalCommand, genesisCommand, extractGlobalFlags(), ExtractResult (+36 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "daemon-profile-wiring.test.ts"
Cohesion: 0.36
Nodes (5): cfg(), ExposedRunner, heavy, light, routed()

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

### Community 157 - "Configuration"
Cohesion: 0.21
Nodes (7): Configuration, Custom command template, Profile fields, Secrets never go in config, Arguments, Flags, Global flags

### Community 158 - "quest create"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest create

### Community 159 - "spawn.ts"
Cohesion: 0.33
Nodes (6): inlineAgentDefinition(), PROMPT_ARG_MAX, SpawnTarget, stripFrontmatter(), TEMPLATES_DIR, GENERALIST_TEMPLATE_PATH

### Community 160 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, citty, ink, mermaidtui, react, yaml

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

### Community 162 - "tasks archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks archive

### Community 163 - "docs-starlight knowledge"
Cohesion: 0.50
Nodes (3): Decisions, docs-starlight knowledge, File ownership

### Community 165 - "quest plan"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest plan

### Community 167 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 168 - "tasks set-difficulty"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks set-difficulty

### Community 169 - "task"
Cohesion: 0.50
Nodes (3): Flags, Global flags, task()

### Community 171 - "Capabilities"
Cohesion: 0.67
Nodes (3): Capabilities, Modified Capabilities, New Capabilities

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1228 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `agent-runner.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `lib/tasks.ts`, `task-store.ts`, `citty/tasks.ts`, `config.ts`, `templates.ts`, `routing.ts`, `commands/tui.ts`, `commands/quest.ts`, `react`, `daemon-profile-wiring.test.ts`, `commands/launch.ts`, `run-quest-picker.tsx`, `worktree.ts`, `features.test.ts`, `DaemonClient`, `agent-registry.ts`, `planner-project-context.test.ts`, `task-schema.ts`, `Daemon`, `analytics.ts`, `genesis-planner.ts`, `lib/launcher.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `commands/merge.ts`, `quest-planner.ts`, `toon.ts`, `ref_node_path`, `commands/status.ts`, `tdd-verifier.test.ts`, `graph.ts`, `daemon-scheduler.test.ts`, `post-merge.ts`, `InkDaemonTUI`, `daemon-agent-runner.test.ts`, `commands/usage.ts`, `daemon-test-baseline.test.ts`, `analytics-lifecycle.test.ts`, `tdd-baseline-integration.test.ts`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `commands/stats.ts`, `SchedulerConfig`, `splash-screen.tsx`, `tdd-baseline-pipeline.test.ts`, `onboarding-helpers.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `Source files (read and relevant):`, `agent-runner.ts`, `protocol.ts`, `config.ts`, `daemon-profile-wiring.test.ts`, `commands/launch.ts`, `AnalyticsTracker`, `.load`, `Daemon`, `analytics.ts`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `commands/merge.ts`, `commands/status.ts`, `daemon-scheduler.test.ts`, `daemon-agent-runner.test.ts`, `daemon-test-baseline.test.ts`, `analytics-lifecycle.test.ts`, `state.ts`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `maxConcurrent`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.13198653198653199 - nodes in this community are weakly interconnected._
- **Why does `AgentRunner` connect `AgentRunner` to `WomboConfig`, `Source files (read and relevant):`, `agent-runner.ts`, `protocol.ts`, `task-store.ts`, `config.ts`, `daemon-profile-wiring.test.ts`, `overview.md`, `Requirement: Launch stagger applies only to real-agent launches`, `commands/launch.ts`, `Requirement: Fake-agent tasks bypass inter-launch stagger`, `Requirement: Fake-agent tasks bypass inter-launch stagger`, `AnalyticsTracker`, `Daemon`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `ProcessMonitor`, `daemon-scheduler.test.ts`, `post-merge.ts`, `daemon-agent-runner.test.ts`, `Requirement: Launch stagger applies only to real-agent launches`, `daemon-test-baseline.test.ts`, `analytics-lifecycle.test.ts`, `DaemonState`, `analytics-integration.test.ts`, `daemon-project-context.test.ts`, `.handleStart`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0928030303030303 - nodes in this community are weakly interconnected._