# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 528 files · ~602,744 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 4519 nodes · 13622 edges · 202 communities (169 shown, 33 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 698 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `39539083`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- verifier.ts
- WomboConfig
- ADDED Requirements
- agent-runner.ts
- protocol.ts
- run-daemon-monitor.tsx
- commands/tui.ts
- task-store.ts
- toon.ts
- config.ts
- templates.ts
- routing.ts
- run-task-browser.tsx
- review-list.tsx
- dashboard-metrics.ts
- t
- ink
- daemon-project-context.test.ts
- dashboard.tsx
- commands/launch.ts
- chrome.tsx
- lib/i18n.ts
- worktree.ts
- lib/tasks.ts
- monitor.ts
- hitl-channel.ts
- index.md
- schema.ts
- scout.ts
- DaemonClient
- agent-registry.ts
- commands/merge.ts
- harness/index.ts
- ref_bun_test
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- quest-wizard.tsx
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
- run-quest-picker.tsx
- quest.md
- quest-planner.ts
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- ref_node_path
- dashboard-provider.test.tsx
- commands/status.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- useI18n
- tdd-verifier.test.ts
- monitor-router.test.tsx
- graph.ts
- ProcessMonitor
- wishlist-picker.tsx
- i18n-keys.test.ts
- graphify-pre-push.py
- post-merge.ts
- InkDaemonTUI
- wishlist-store.ts
- agents/generalist-agent.md
- package.json
- docs/package.json
- prompt-compress.ts
- commands/usage.ts
- commands/logs.ts
- test-detection.ts
- test-runner.ts
- commands/completion.ts
- Requirement: Launch stagger applies only to real-agent launches
- dashboard-provider.tsx
- esc-menu.tsx
- ReplayRecorder
- wishlist.md
- useScreenInput
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- changelog.ts
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- gen-command-docs.ts
- state.ts
- analytics-integration.test.ts
- analytics-browser.test.tsx
- ReplayStore
- hitl-ask.ts
- analytics-usage-command.test.ts
- CONTEXT.md — For AI agents using wombo as a tool
- Scheduler
- maxConcurrent
- daemon.md
- registry-parity.test.ts
- openspec/specs/scheduler-concurrency-accounting/spec.md
- saveTaskToStore
- commands/stats.ts
- config.md
- cli-smoke.test.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- citty/quest.ts
- replay-viewer.test.tsx
- mergeBranch
- splash-screen.tsx
- tdd-baseline-pipeline.test.ts
- StubDaemonClient
- i18n.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- daemon-scheduler.test.ts
- format-converter.ts
- harness-opencode.test.ts
- react-devtools-core.ts
- openspec/specs/safe-tmp-worktree-placement/spec.md
- fake-agent-runner.ts
- validate.ts
- replay-browser.test.tsx
- gen-config-docs.ts
- router.ts
- merge-resolver-agent.md
- HarnessAdapter
- overview.md
- ink/index.ts
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- FakeDaemonClient
- install.md
- docs/tsconfig.json
- TokenCollector
- analytics-git.ts
- quest create
- replay.md
- commands/init.ts
- wombo-combo Agent Context
- logs.md
- docs-starlight knowledge
- replay-diff.ts
- session-replay — knowledge
- tasks add
- retry.md
- Agent Process Lifecycle Audit
- scripts
- tasks show
- Fake Agent
- portless.ts
- Requirement: Launch stagger applies only to real-agent launches
- dependencies
- harness-adapters.test.ts
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- quest plan
- tasks archive
- devDependencies
- eval.md
- init.md
- merge.md
- NoLaunchRunner

## God Nodes (most connected - your core abstractions)
1. `t()` - 171 edges
2. `WomboConfig` - 142 edges
3. `react` - 118 edges
4. `Explore mode guidelines and usage rules` - 114 edges
5. `useI18n()` - 112 edges
6. `ink` - 111 edges
7. `DaemonState` - 103 edges
8. `AgentRunner` - 96 edges
9. `t` - 96 edges
10. `useScreenInput()` - 70 edges

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

## Communities (202 total, 33 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (98): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+90 more)

### Community 1 - "AgentRunner"
Cohesion: 0.08
Nodes (25): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected, 1. AgentRunner — Per-entry stagger flag, 3. Unit Tests (+17 more)

### Community 2 - "verifier.ts"
Cohesion: 0.08
Nodes (27): Cleanup, Daemon and TUI, Launch, Merge, Monitoring and recovery, Verification, BrowserConfig, allocateDebugPort() (+19 more)

### Community 3 - "WomboConfig"
Cohesion: 0.09
Nodes (36): AbortCommandOptions, ParsedLaunchArgs, parseLaunchArgs(), ParsedRetryArgs, parseRetryArgs(), CleanupOptions, EvalCommandOptions, GenesisCommandOptions (+28 more)

### Community 4 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 5 - "agent-runner.ts"
Cohesion: 0.12
Nodes (31): MaxEscalationTier, AgentRunnerConfig, FAKE_AGENT_VERIFICATION, isTierAllowed(), Tier25Result, abortRebase(), beginRebase(), canMerge() (+23 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (60): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+52 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.05
Nodes (63): DashboardAgentRow(), DashboardScreen(), DashboardStoreContext, LegacyDashboard(), useDashboardStore(), EscMenuProvider(), createI18n(), EN_STRINGS (+55 more)

### Community 8 - "commands/tui.ts"
Cohesion: 0.12
Nodes (35): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+27 more)

### Community 9 - "task-store.ts"
Cohesion: 0.16
Nodes (34): archiveDir(), atomicWrite(), createBackup(), defaultMeta(), deleteTaskFile(), ensureDir(), flattenTask(), getArchiveDir() (+26 more)

### Community 10 - "toon.ts"
Cohesion: 0.05
Nodes (76): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+68 more)

### Community 11 - "config.ts"
Cohesion: 0.07
Nodes (43): citty, daemonCommand, startCommand, statusCommand, stopCommand, ParsedMergeArgs, parseMergeArgs(), parseTaskList() (+35 more)

### Community 12 - "templates.ts"
Cohesion: 0.20
Nodes (15): isPortlessAvailable(), AGENT_TEMPLATE_PATH, applyHitlAwareness(), applyPlaceholders(), buildTddBlock(), joinFrontmatter(), PATCH_BODY_END_PATH, PATCH_BODY_START_PATH (+7 more)

### Community 13 - "routing.ts"
Cohesion: 0.10
Nodes (27): resolveAgentBin(), Operation, detectHarnessFromBin(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel(), legacyRoute() (+19 more)

### Community 14 - "run-task-browser.tsx"
Cohesion: 0.14
Nodes (20): analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction, TaskBrowserApp() (+12 more)

### Community 15 - "review-list.tsx"
Cohesion: 0.07
Nodes (59): buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), HITL_MODES, PRIORITIES, questStash (+51 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.09
Nodes (46): EvtAgentActivity, EvtBuildResult, EvtMergeResult, EvtTaskPicked, DashboardMetricsContext, DashboardMetricsValue, initialValue(), advanceThroughput() (+38 more)

### Community 17 - "t"
Cohesion: 0.10
Nodes (60): cmdAbort(), addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand (+52 more)

### Community 18 - "ink"
Cohesion: 0.06
Nodes (82): ink, ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp() (+74 more)

### Community 19 - "daemon-project-context.test.ts"
Cohesion: 0.25
Nodes (10): Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states (+2 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.10
Nodes (30): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRowProps, DashboardScreenProps, DEFAULT_STORE (+22 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.10
Nodes (30): analyzeBarrelFile(), BarrelFile, cmdLaunch(), delegateToDaemon(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), waitForDaemonCompletion() (+22 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.12
Nodes (23): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayout(), ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps (+15 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.09
Nodes (34): Architecture, getLocaleT(), AVAILABLE_LOCALES, clearMissingKeys(), createInstance(), detectLocale(), DetectOptions, envDev() (+26 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (25): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), featureBranchName(), installDeps() (+17 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.07
Nodes (46): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), buildTaskQuestMap(), cmdTasksList() (+38 more)

### Community 26 - "monitor.ts"
Cohesion: 0.16
Nodes (15): Normalizer, MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, isTokenEvent(), parseUsageFromEvent(), UsageCallback (+7 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (23): Arguments, Global flags, Flags, Global flags, Arguments, Global flags, Arguments, Global flags (+15 more)

### Community 29 - "schema.ts"
Cohesion: 0.12
Nodes (23): describeCommand, mergeCommand, hasKey(), aliasHint(), allCommandSchemas(), commandToSchema(), descriptionOf(), findCommandDef() (+15 more)

### Community 30 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 31 - "DaemonClient"
Cohesion: 0.10
Nodes (8): DaemonClient, CommandMap, EvtStateSnapshot, parseMessage(), DaemonMonitorAdapter(), DaemonMonitorShellProps, InkDaemonTUIOptions, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.14
Nodes (24): AgentRegistryMode, InkPreflightResult, PreflightResult, PreflightViewProps, agentNameFromType(), AgentResolution, cacheAgent(), cacheDir() (+16 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.14
Nodes (24): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+16 more)

### Community 34 - "harness/index.ts"
Cohesion: 0.17
Nodes (20): claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput(), parseJsonLine() (+12 more)

### Community 35 - "ref_bun_test"
Cohesion: 0.08
Nodes (19): react, App(), AppProps, runApp(), RunAppOptions, InputHandler(), Shell(), ShellProps (+11 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.09
Nodes (40): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CommandRunner, CreateOrUpdatePrOptions (+32 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.13
Nodes (15): allocateExecutionId(), AnalyticsTracker, AnalyticsTrackerOptions, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState (+7 more)

### Community 39 - "quest-wizard.tsx"
Cohesion: 0.11
Nodes (18): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), PRIORITY_COLORS, QuestWizard(), QuestWizardProps, STEPS, createTestStreams() (+10 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.19
Nodes (11): DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema, PRIORITY_ORDER, SchemaIssue, TASK_ARRAY_FIELDS, TASK_REQUIRED_FIELDS (+3 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.11
Nodes (30): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES, isObject() (+22 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.10
Nodes (28): ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic, AnalyticsLoadDiagnosticKind (+20 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (42): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+34 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.08
Nodes (28): TaskRow, boundValue(), FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent(), num(), recordLabel() (+20 more)

### Community 48 - "lib/launcher.ts"
Cohesion: 0.12
Nodes (29): AgentProfile, HarnessId, ResolvedRoute, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness(), SpawnTarget, stripFrontmatter() (+21 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (16): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight, resolveCommitSha() (+8 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.07
Nodes (51): defaultIsDaemonAlive(), PostMergeConfig, createDaemonAgentState(), PostMergeRequest, createBlankTask(), addVerifiedAgent(), Env, EnvOpts (+43 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.13
Nodes (35): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+27 more)

### Community 54 - "run-quest-picker.tsx"
Cohesion: 0.07
Nodes (56): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), defaultLoadTaskQuests(), QuestSummary (+48 more)

### Community 55 - "quest.md"
Cohesion: 0.07
Nodes (26): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags (+18 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.08
Nodes (44): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree() (+36 more)

### Community 57 - "prompt.ts"
Cohesion: 0.17
Nodes (13): formatHunksForLLM(), portlessUrl(), formatSubtask(), formatTestBaselineSection(), generateConflictResolutionPrompt(), generatePrompt(), generateRebaseCommitPrompt(), generateTier4RerunPrompt() (+5 more)

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
Cohesion: 0.05
Nodes (24): root, DEFAULT_CONFIG, InitWriterConfig, InitWriterResult, FAKE_AGENT_SENTINEL, REPLAY_LIMITS, cfg(), heavy (+16 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.11
Nodes (10): ConnectionState, EventMap, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, mount(), streams() (+2 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.20
Nodes (17): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize() (+9 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "useI18n"
Cohesion: 0.06
Nodes (84): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+76 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.17
Nodes (20): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions, TddVerificationResult, TestBaseline (+12 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.08
Nodes (8): escMenuCursor(), eventually(), selectFromEscMenu(), waitFor(), LiveFakeClient, makeMinimalConfig(), openDashboardFromMenu(), StubDaemonClient

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.14
Nodes (11): 1. Are agents spawned with `detached: true` and `unref()`?, 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Findings, isProcessRunning(), extractActivity(), formatEventForLog(), ProcessMonitor (+3 more)

### Community 70 - "wishlist-picker.tsx"
Cohesion: 0.14
Nodes (21): RunWishlistPickerOptions, WishlistPickerAction, UseWishlistStoreResult, formatDate(), truncateText(), AddInput(), OverlayFooter(), OverlayItemList() (+13 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.12
Nodes (28): MergeCommandDeps, normalizePostMergeConfig(), Git, isComplete(), isJournal(), Journal, JournalOperation, journalPath() (+20 more)

### Community 75 - "wishlist-store.ts"
Cohesion: 0.24
Nodes (16): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, addItem(), atomicWrite(), deleteItem() (+8 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.08
Nodes (23): author, bin, woco, bugs, url, description, engines, bun (+15 more)

### Community 78 - "docs/package.json"
Cohesion: 0.11
Nodes (15): dependencies, astro, @astrojs/starlight, description, name, private, scripts, build (+7 more)

### Community 79 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.13
Nodes (32): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+24 more)

### Community 81 - "commands/logs.ts"
Cohesion: 0.36
Nodes (8): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), renderLogs()

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.20
Nodes (16): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+8 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.18
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 86 - "dashboard-provider.tsx"
Cohesion: 0.10
Nodes (19): clientState(), DASHBOARD_EVENTS, DashboardMetricsProvider(), DashboardMetricsProviderProps, mapConnection(), REAL_TIMERS, TimerApi, DashboardEvent (+11 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.11
Nodes (23): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+15 more)

### Community 88 - "ReplayRecorder"
Cohesion: 0.12
Nodes (8): errMsg(), ReplayRecorder, ReplayRecorderOptions, Tracked, DEFAULT_KEEP_PER_TASK, PruneOptions, ReplayEndOutcome, truncateText()

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "useScreenInput"
Cohesion: 0.06
Nodes (51): ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardProps, ErrandWizardStep, STEPS, useScreenInput(), FakeTaskConfig (+43 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (19): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+11 more)

### Community 94 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.16
Nodes (12): ensureQuestTestBaseline(), captureMain(), Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo() (+4 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.10
Nodes (19): Commands, Agent Analytics, Commands, Coverage limitations, Entry points, Install, Languages, Launch options (+11 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.05
Nodes (31): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+23 more)

### Community 101 - "gen-command-docs.ts"
Cohesion: 0.31
Nodes (15): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+7 more)

### Community 102 - "state.ts"
Cohesion: 0.13
Nodes (22): AgentStatus, DaemonAgentState, EvtAgentStatusChange, EvtSchedulerStatus, SchedulerState, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason (+14 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.09
Nodes (16): analyticsDir(), commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session() (+8 more)

### Community 104 - "analytics-browser.test.tsx"
Cohesion: 0.22
Nodes (7): ANALYTICS_REFRESH_MS, Harness, mount(), h, result(), wait(), waitFor()

### Community 105 - "ReplayStore"
Cohesion: 0.19
Nodes (14): cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution(), assertSafe() (+6 more)

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "analytics-usage-command.test.ts"
Cohesion: 0.11
Nodes (14): Flags, Global flags, UsageCommandOptions, props(), rec(), sampleRecords(), createAnalyticsRecord(), emptyUsageTotals() (+6 more)

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.14
Nodes (12): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo? (+4 more)

### Community 109 - "Scheduler"
Cohesion: 0.05
Nodes (45): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+37 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.04
Nodes (71): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+63 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "registry-parity.test.ts"
Cohesion: 0.16
Nodes (15): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, BRIDGE_REGISTRY (+7 more)

### Community 113 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.25
Nodes (7): Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 114 - "saveTaskToStore"
Cohesion: 0.16
Nodes (16): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+8 more)

### Community 115 - "commands/stats.ts"
Cohesion: 0.29
Nodes (12): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+4 more)

### Community 116 - "config.md"
Cohesion: 0.12
Nodes (15): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `defaults`, `git`, `install` (+7 more)

### Community 117 - "cli-smoke.test.ts"
Cohesion: 0.20
Nodes (12): buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess(), runSrc() (+4 more)

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "citty/quest.ts"
Cohesion: 0.14
Nodes (10): abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand, pauseCommand, planCommand (+2 more)

### Community 121 - "replay-viewer.test.tsx"
Cohesion: 0.19
Nodes (11): BASE, Harness, live, makeReplay(), mount(), smallReplay(), text(), tool() (+3 more)

### Community 122 - "mergeBranch"
Cohesion: 0.07
Nodes (30): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+22 more)

### Community 123 - "splash-screen.tsx"
Cohesion: 0.08
Nodes (35): upgradeCommand, channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm() (+27 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 126 - "i18n.md"
Cohesion: 0.17
Nodes (9): Configuration, Custom command template, Profile fields, Secrets never go in config, Supported harnesses and verification status, Adding a locale, Checks, Choosing a language (+1 more)

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

### Community 131 - "daemon-scheduler.test.ts"
Cohesion: 0.18
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

### Community 132 - "format-converter.ts"
Cohesion: 0.27
Nodes (11): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+3 more)

### Community 133 - "harness-opencode.test.ts"
Cohesion: 0.29
Nodes (8): HARNESS_IDS, isHarnessId(), OPERATIONS, listHarnesses(), detectAgentType(), base, oc, Contracts (src/lib/harness/)

### Community 137 - "openspec/specs/safe-tmp-worktree-placement/spec.md"
Cohesion: 0.20
Nodes (9): Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo, Scenario: syncQuestBranch creates tmp worktree outside the repo (+1 more)

### Community 139 - "fake-agent-runner.ts"
Cohesion: 0.54
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 140 - "validate.ts"
Cohesion: 0.45
Nodes (9): assertValid(), fail(), ok(), validateBranchName(), validateDuration(), validateEnum(), validateId(), validateText() (+1 more)

### Community 142 - "replay-browser.test.tsx"
Cohesion: 0.31
Nodes (5): Harness, mount(), h, wait(), waitFor()

### Community 143 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 144 - "router.ts"
Cohesion: 0.09
Nodes (35): abortCommand, cleanupCommand, completionCommand, evalCommand, genesisCommand, extractGlobalFlags(), ExtractResult, GlobalFlags (+27 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "HarnessAdapter"
Cohesion: 0.16
Nodes (12): Adding a harness, Fallback chains, Routing, normalizeOutput(), HarnessAdapter, plan(), Config (src/config.ts, schemas/config.schema.json), Constraints (+4 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "ink/index.ts"
Cohesion: 0.07
Nodes (42): isAltScreenActive(), InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand() (+34 more)

### Community 149 - "first-task.md"
Cohesion: 0.29
Nodes (6): 1. Initialize the project, 2. Add a task, 3. Preview, then launch, 4. Verify and merge, 5. Clean up, Where to go next

### Community 150 - "quests.md"
Cohesion: 0.33
Nodes (5): Branches, Constraints, Lifecycle, Planning, TDD

### Community 151 - "tdd-baseline.md"
Cohesion: 0.22
Nodes (8): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Supported test output, What is recorded

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 154 - "install.md"
Cohesion: 0.40
Nodes (4): Install, Next, Shell completions, Working on wombo-combo itself

### Community 155 - "docs/tsconfig.json"
Cohesion: 0.40
Nodes (4): exclude, extends, include, astro/tsconfigs/strict

### Community 157 - "analytics-git.ts"
Cohesion: 0.22
Nodes (12): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+4 more)

### Community 158 - "quest create"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest create

### Community 159 - "replay.md"
Cohesion: 0.22
Nodes (8): Arguments, Arguments, Flags, Global flags, Global flags, Global flags, replay list, replay show

### Community 160 - "commands/init.ts"
Cohesion: 0.43
Nodes (3): initCommand, cmdInit(), InitOptions

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

### Community 162 - "logs.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 163 - "docs-starlight knowledge"
Cohesion: 0.50
Nodes (3): Decisions, docs-starlight knowledge, File ownership

### Community 164 - "replay-diff.ts"
Cohesion: 0.36
Nodes (9): captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat(), pathspecs(), runGit(), untrackedPaths(), WorktreeDiff (+1 more)

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "tasks add"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks add

### Community 167 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 168 - "Agent Process Lifecycle Audit"
Cohesion: 0.22
Nodes (8): Agent Process Lifecycle Audit, Files with Audit Annotations, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations, Shutdown Flows, Summary, Ungraceful Shutdown (SIGKILL / crash / OOM)

### Community 169 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, docs:gen, start, test, typecheck, woco

### Community 171 - "tasks show"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks show

### Community 173 - "Fake Agent"
Cohesion: 0.50
Nodes (3): Behavior, Fake Agent, Usage

### Community 174 - "portless.ts"
Cohesion: 0.54
Nodes (7): ensureProxyRunning(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus(), resolvePortlessBin(), wrapWithPortless()

### Community 175 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 191 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, citty, i18next, ink, mermaidtui, react, yaml

### Community 192 - "harness-adapters.test.ts"
Cohesion: 0.38
Nodes (5): getHarness(), parseEvents(), base, fixture(), run()

### Community 193 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 195 - "quest plan"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest plan

### Community 196 - "tasks archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks archive

### Community 197 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, @types/bun, @types/react, typescript

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1345 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `agent-runner.ts`, `run-daemon-monitor.tsx`, `commands/tui.ts`, `task-store.ts`, `toon.ts`, `config.ts`, `templates.ts`, `validate.ts`, `review-list.tsx`, `dashboard.tsx`, `commands/launch.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `schema.ts`, `DaemonClient`, `commands/init.ts`, `commands/merge.ts`, `agent-registry.ts`, `portless.ts`, `lib/replay.ts`, `run-quest-picker.tsx`, `commands/tasks.md`, `commands/status.ts`, `useI18n`, `tdd-verifier.test.ts`, `graph.ts`, `commands/usage.ts`, `commands/logs.ts`, `commands/completion.ts`, `esc-menu.tsx`, `useScreenInput`, `ReplayStore`, `CONTEXT.md — For AI agents using wombo as a tool`, `commands/stats.ts`, `citty/quest.ts`, `splash-screen.tsx`, `i18n.md`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.020202020202020204 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `daemon-scheduler.test.ts`, `agent-runner.ts`, `protocol.ts`, `config.ts`, `daemon-project-context.test.ts`, `lib/tasks.ts`, `commands/merge.ts`, `AnalyticsTracker`, `Daemon`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `ref_node_path`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `state.ts`, `analytics-integration.test.ts`, `Scheduler`, `maxConcurrent`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.08225108225108226 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `verifier.ts`, `daemon-scheduler.test.ts`, `agent-runner.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `commands/tui.ts`, `task-store.ts`, `toon.ts`, `config.ts`, `templates.ts`, `routing.ts`, `run-task-browser.tsx`, `t`, `ink`, `daemon-project-context.test.ts`, `commands/launch.ts`, `worktree.ts`, `lib/tasks.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `Daemon`, `portless.ts`, `lib/launcher.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `run-quest-picker.tsx`, `quest-planner.ts`, `prompt.ts`, `ref_node_path`, `commands/status.ts`, `tdd-verifier.test.ts`, `graph.ts`, `post-merge.ts`, `InkDaemonTUI`, `commands/usage.ts`, `esc-menu.tsx`, `daemon-test-baseline.test.ts`, `tdd-baseline-integration.test.ts`, `state.ts`, `analytics-integration.test.ts`, `analytics-usage-command.test.ts`, `Scheduler`, `commands/stats.ts`, `splash-screen.tsx`, `tdd-baseline-pipeline.test.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._