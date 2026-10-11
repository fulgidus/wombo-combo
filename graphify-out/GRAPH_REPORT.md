# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 538 files · ~609,934 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 4612 nodes · 13895 edges · 219 communities (183 shown, 36 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 698 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e41f333d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- verifier.ts
- WomboConfig
- .allComplete
- agent-runner.ts
- protocol.ts
- run-daemon-monitor.tsx
- commands/tui.ts
- task-store.ts
- eval-score.ts
- config.ts
- Accomplished
- routing.ts
- run-task-browser.tsx
- ink/index.ts
- dashboard-metrics.ts
- t
- project-store.ts
- daemon-project-context.test.ts
- dashboard.tsx
- commands/launch.ts
- chrome.tsx
- lib/i18n.ts
- worktree.ts
- lib/tasks.ts
- ref_node_os
- hitl-channel.ts
- index.md
- schema.ts
- analytics-overlay.tsx
- DaemonClient
- agent-registry.ts
- commands/merge.ts
- claude-code.ts
- toon.ts
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- TextInput
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- analytics.ts
- merge-report.ts
- conflict-hunks.ts
- lib/replay.ts
- types.ts
- analytics-measurements.test.ts
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- quest-store.ts
- quest.md
- genesis-planner.ts
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- ref_node_path
- dashboard-provider.tsx
- DaemonAgentState
- AGENTS.md — Instructions for AI agents working on wombo-combo
- useI18n
- quest-planner.ts
- LiveFakeClient
- graph.ts
- ProcessMonitor
- merge-driver.ts
- i18n-keys.test.ts
- graphify-pre-push.py
- post-merge.ts
- InkDaemonTUI
- templates.ts
- agents/generalist-agent.md
- package.json
- docs/package.json
- claims.ts
- commands/usage.ts
- commands/logs.ts
- tdd-verifier.ts
- test-runner.ts
- commands/completion.ts
- .submitTask
- DashboardMetricsProvider
- esc-menu.tsx
- ReplayRecorder
- wishlist.md
- ref_bun_test
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
- lib/launcher.ts
- status
- Scheduler
- maxConcurrent
- daemon.md
- citty-bridge.ts
- daemon-agent-runner.test.ts
- saveTaskToStore
- wishlist-store.ts
- config.md
- cli-smoke.test.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- replay-viewer.test.tsx
- tmpDir
- commands/upgrade.ts
- tdd-verifier.test.ts
- StubDaemonClient
- i18n.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- daemon-scheduler.test.ts
- genesis-review.tsx
- harness/index.ts
- react-devtools-core.ts
- daemon-profile-wiring.test.ts
- scout.ts
- analytics-lifecycle.test.ts
- loadTasksFromStore
- gen-config-docs.ts
- src/index.ts
- merge-resolver-agent.md
- dashboard-usage.ts
- overview.md
- init-form.tsx
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- FakeDaemonClient
- install.md
- docs/tsconfig.json
- config.test.ts
- daemon-client.test.ts
- prompt-compress.ts
- replay.md
- Requirement: Fake-agent tasks bypass inter-launch stagger
- wombo-combo Agent Context
- generateFakeTasks
- docs-starlight knowledge
- ref_node_child_process
- session-replay — knowledge
- fake-agent-runner.ts
- retry.md
- CONTEXT.md — For AI agents using wombo as a tool
- quest complete
- tasks show
- Fake Agent
- scripts
- commands/status.ts
- multi-cli-support — architecture
- dependencies
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- spawn.ts
- tasks archive
- Requirement: Fake-agent tasks bypass inter-launch stagger
- eval.md
- guides/team.md
- merge.md
- replay-recorder.test.ts
- StubDaemonClient
- genesis.md
- quest show
- quest abandon
- tasks set-difficulty
- devDependencies
- Agent Analytics
- abort.md
- describe.md
- tasks list
- tasks check
- upgrade.md
- usage.md
- Capabilities
- Relevant files / directories
- repository
- buildTaskGraph

## God Nodes (most connected - your core abstractions)
1. `t()` - 176 edges
2. `WomboConfig` - 146 edges
3. `react` - 118 edges
4. `Explore mode guidelines and usage rules` - 114 edges
5. `useI18n()` - 112 edges
6. `ink` - 111 edges
7. `DaemonState` - 104 edges
8. `AgentRunner` - 97 edges
9. `t` - 96 edges
10. `useScreenInput()` - 70 edges

## Surprising Connections (you probably didn't know these)
- `Daemon` --references--> `AgentRunner`  [INFERRED]
  docs/src/content/docs/architecture/overview.md → src/daemon/agent-runner.ts
- `Seams` --references--> `ReplayRecorder`  [INFERRED]
  .wombo-combo/quests/session-replay/knowledge.md → src/daemon/replay-recorder.ts
- `Why `concurrencyPinned` doesn't protect persisted state` --references--> `Scheduler`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/design.md → src/daemon/scheduler.ts
- `Assistant (Build · claude-sonnet-4.6 · 7.5s)` --references--> `DaemonState`  [INFERRED]
  ._p.md → src/daemon/state.ts
- `Modified Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/proposal.md → src/lib/eval-score.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (219 total, 36 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (95): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+87 more)

### Community 1 - "AgentRunner"
Cohesion: 0.15
Nodes (6): Assistant (Build · claude-sonnet-4.6 · 6.2s), AgentRunner, getConflictDiffs(), runSafeCmd(), TaskEditorProps, Task

### Community 2 - "verifier.ts"
Cohesion: 0.07
Nodes (28): Cleanup, Daemon and TUI, Launch, Merge, Monitoring and recovery, Verification, BrowserConfig, allocateDebugPort() (+20 more)

### Community 3 - "WomboConfig"
Cohesion: 0.07
Nodes (45): AbortCommandOptions, ParsedLaunchArgs, ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, EvalCommandOptions, GenesisCommandOptions (+37 more)

### Community 4 - ".allComplete"
Cohesion: 0.09
Nodes (21): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, ADDED Requirements, Requirement: Downstream task unblocking is unaffected by this change (+13 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.12
Nodes (34): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), Tier25Result, abortRebase(), beginRebase(), canMerge(), cleanupRebaseBranch() (+26 more)

### Community 6 - "protocol.ts"
Cohesion: 0.07
Nodes (54): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+46 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.04
Nodes (86): ChromeLayout(), DashboardScreen(), DashboardStore, DashboardStoreContext, ErrandWizardProps, EscMenuProvider(), FakeTaskWizard(), createI18n() (+78 more)

### Community 8 - "commands/tui.ts"
Cohesion: 0.12
Nodes (32): cmdTui(), handleErrandFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText(), runDaemonMonitor() (+24 more)

### Community 9 - "task-store.ts"
Cohesion: 0.19
Nodes (25): Top-level options, archiveDir(), atomicWrite(), createBackup(), ensureDir(), flattenTask(), getArchiveDir(), getTasksDir() (+17 more)

### Community 10 - "eval-score.ts"
Cohesion: 0.08
Nodes (42): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+34 more)

### Community 11 - "config.ts"
Cohesion: 0.05
Nodes (85): citty, abortCommand, cleanupCommand, completionCommand, daemonCommand, startCommand, statusCommand, stopCommand (+77 more)

### Community 12 - "Accomplished"
Cohesion: 0.67
Nodes (3): Accomplished, Completed and archived:, Currently in progress:

### Community 13 - "routing.ts"
Cohesion: 0.12
Nodes (25): resolveAgentBin(), getHarness(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel(), legacyRoute(), MissingEnvError (+17 more)

### Community 14 - "run-task-browser.tsx"
Cohesion: 0.07
Nodes (45): AgentStatus, CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction, TaskBrowserScreenProps (+37 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.06
Nodes (60): saveConfig(), AppProps, ConfirmDialogProps, TFunction, ModalProps, buildPlanConfig(), buildPlanEditFields(), DIFFICULTIES (+52 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.11
Nodes (39): EvtAgentActivity, EvtBuildResult, EvtMergeResult, EvtTaskPicked, initialValue(), ActivityEntry, advanceThroughput(), alignBucket() (+31 more)

### Community 17 - "t"
Cohesion: 0.10
Nodes (58): cmdAbort(), addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand (+50 more)

### Community 18 - "project-store.ts"
Cohesion: 0.06
Nodes (82): useChromeHideQuitHint(), ConfirmDialog(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps (+74 more)

### Community 19 - "daemon-project-context.test.ts"
Cohesion: 0.25
Nodes (10): Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states (+2 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.08
Nodes (39): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgent, DashboardAgentRow(), DashboardAgentRowProps (+31 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.10
Nodes (33): analyzeBarrelFile(), BarrelFile, cmdLaunch(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), prepareAgentDefinitions(), buildChainFrom() (+25 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.15
Nodes (18): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+10 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.06
Nodes (46): Architecture, teamMergeCommands, teamMergeMeta, teamSetup, aggregateByModel(), aggregateStats(), cmdStats(), computeTrend() (+38 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (23): cmdCleanup(), branchExists(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), installDeps() (+15 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.08
Nodes (41): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), label() (+33 more)

### Community 26 - "ref_node_os"
Cohesion: 0.08
Nodes (20): MonitorCallbacks, OpenCodeEvent, ParsedOutput, parseEvents(), isTokenEvent(), parseUsageFromEvent(), TokenCollector, UsageCallback (+12 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.07
Nodes (17): Flags, Global flags, Arguments, Global flags, Global flags, Arguments, Global flags, Global flags (+9 more)

### Community 29 - "schema.ts"
Cohesion: 0.11
Nodes (25): BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), getLocale(), hasKey(), aliasHint(), allCommandSchemas(), buildAliasMap() (+17 more)

### Community 30 - "analytics-overlay.tsx"
Cohesion: 0.12
Nodes (36): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+28 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (6): delegateToDaemon(), waitForDaemonCompletion(), DaemonClient, CommandMap, EvtStateSnapshot, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.13
Nodes (28): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightViewProps, agentNameFromType() (+20 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.10
Nodes (32): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), defaultIsDaemonAlive(), evidenceFor(), git(), gitOk() (+24 more)

### Community 34 - "claude-code.ts"
Cohesion: 0.21
Nodes (13): claudeCodeHarness, codexHarness, errorEvent(), normalizeToolInput(), parseJsonLine(), resultText(), stepFinishEvent(), stepStartEvent() (+5 more)

### Community 35 - "toon.ts"
Cohesion: 0.12
Nodes (36): TaskStatus, encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGeneric() (+28 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.12
Nodes (13): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateFakeTasksYaml(), GeneratorOptions, Preset (+5 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.13
Nodes (32): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+24 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.13
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - "TextInput"
Cohesion: 0.09
Nodes (28): FakeTaskConfig, FakeTaskWizardProps, Field, generateFakeTasks(), shuffleArr(), shuffledTitles(), TASK_TITLE_POOL, WORKFLOW_DESCRIPTIONS (+20 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (28): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS (+20 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (36): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+28 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.06
Nodes (44): Flags, Global flags, AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION (+36 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (40): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+32 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.09
Nodes (29): TaskRow, boundValue(), FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent(), num(), recordLabel() (+21 more)

### Community 48 - "types.ts"
Cohesion: 0.17
Nodes (13): Adding a harness, AgentProfile, build(), customHarness, expand(), textEvent(), Operation, opencodeHarness (+5 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (17): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+9 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.08
Nodes (42): PostMergeConfig, createDaemonAgentState(), FAKE_AGENT_SENTINEL, POST_MERGE_JOURNAL, createBlankTask(), addVerifiedAgent(), seedVerifiedAgents(), writeProjectConfig() (+34 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (34): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+26 more)

### Community 54 - "quest-store.ts"
Cohesion: 0.14
Nodes (31): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), handleGenesisFlow(), runGenesisReviewInk() (+23 more)

### Community 55 - "quest.md"
Cohesion: 0.09
Nodes (22): Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags, Flags (+14 more)

### Community 56 - "genesis-planner.ts"
Cohesion: 0.11
Nodes (30): generateErrandPrompt(), detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput (+22 more)

### Community 57 - "prompt.ts"
Cohesion: 0.14
Nodes (20): formatHunksForLLM(), ensureProxyRunning(), isPortlessAvailable(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus(), portlessUrl() (+12 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.12
Nodes (16): Arguments, Arguments, Arguments, Flags, Flags, Flags, Flags, Global flags (+8 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "ref_node_path"
Cohesion: 0.11
Nodes (20): root, DEFAULT_CONFIG, InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch() (+12 more)

### Community 62 - "dashboard-provider.tsx"
Cohesion: 0.08
Nodes (23): ConnectionState, EventMap, DashboardMetricsContext, DashboardMetricsValue, useDashboardMetrics(), DASHBOARD_EVENTS, DashboardDaemonClient, DashboardMetricsProviderProps (+15 more)

### Community 63 - "DaemonAgentState"
Cohesion: 0.16
Nodes (18): DaemonAgentState, SchedulerState, QuestionPopupViewProps, DaemonAdapterProps, DaemonMonitorScreenProps, DaemonStore, HitlQuestion, colorize() (+10 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "useI18n"
Cohesion: 0.07
Nodes (77): useScreenInput(), t, useI18n(), MultiLineInput(), SingleLineInput(), AllTasksDetail(), AllTasksItem(), ErrandsDetail() (+69 more)

### Community 66 - "quest-planner.ts"
Cohesion: 0.11
Nodes (24): PlanReviewAppProps, RunPlanReviewOptions, extractTextFromJsonEvents(), runErrandPlanner(), abortedPlanners, activePlanners, detectCycles(), dfs() (+16 more)

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.09
Nodes (18): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+10 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.16
Nodes (23): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+15 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.14
Nodes (28): MergeCommandDeps, normalizePostMergeConfig(), AgentRunnerConfig, CommandRunner, Git, isComplete(), isJournal(), Journal (+20 more)

### Community 75 - "templates.ts"
Cohesion: 0.11
Nodes (26): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+18 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.10
Nodes (20): author, bin, woco, bugs, url, description, engines, bun (+12 more)

### Community 78 - "docs/package.json"
Cohesion: 0.11
Nodes (15): dependencies, astro, @astrojs/starlight, description, name, private, scripts, build (+7 more)

### Community 79 - "claims.ts"
Cohesion: 0.22
Nodes (19): normalizeTeamConfig(), assertSafeId(), Claim, ClaimInfo, ClaimOptions, claimPath(), ClaimResult, CLAIMS_DIR (+11 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.15
Nodes (30): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+22 more)

### Community 81 - "commands/logs.ts"
Cohesion: 0.36
Nodes (8): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), renderLogs()

### Community 82 - "tdd-verifier.ts"
Cohesion: 0.14
Nodes (26): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationResult, TestBaselineComparison, DEFAULT_TEST_DETECTION_CONFIG (+18 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.18
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - ".submitTask"
Cohesion: 0.10
Nodes (17): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+9 more)

### Community 86 - "DashboardMetricsProvider"
Cohesion: 0.21
Nodes (5): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, DashboardUsageReader

### Community 87 - "esc-menu.tsx"
Cohesion: 0.13
Nodes (18): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+10 more)

### Community 88 - "ReplayRecorder"
Cohesion: 0.12
Nodes (17): errMsg(), ReplayRecorder, ReplayRecorderOptions, Tracked, DEFAULT_KEEP_PER_TASK, captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES (+9 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.05
Nodes (44): ink, react, App(), ConfirmDialog(), ErrandWizard(), ErrandWizardStep, STEPS, Modal() (+36 more)

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
Cohesion: 0.17
Nodes (10): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+2 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.15
Nodes (13): Commands, Entry points, Install, Languages, Launch options, License, Merge, changelog and pull requests, Multiple agent CLIs and models (+5 more)

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
Cohesion: 0.33
Nodes (14): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+6 more)

### Community 102 - "state.ts"
Cohesion: 0.15
Nodes (11): EventType, EvtSchedulerStatus, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, PersistedDaemonState, StateListener (+3 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "analytics-browser.test.tsx"
Cohesion: 0.18
Nodes (8): ANALYTICS_REFRESH_MS, analyticsScopeFilter(), Harness, h, rec(), result(), wait(), waitFor()

### Community 105 - "ReplayStore"
Cohesion: 0.16
Nodes (16): cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution(), TFunction (+8 more)

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "lib/launcher.ts"
Cohesion: 0.14
Nodes (25): 1. Are agents spawned with `detached: true` and `unref()`?, HarnessId, ResolvedRoute, spawnHarness(), HarnessCommand, Normalizer, agentEnv(), AgentType (+17 more)

### Community 108 - "status"
Cohesion: 0.14
Nodes (12): Task file schema, Commands, Dependencies and ordering, Fields, Commands, Arguments, Flags, Global flags (+4 more)

### Community 109 - "Scheduler"
Cohesion: 0.05
Nodes (45): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+37 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (61): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+53 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "citty-bridge.ts"
Cohesion: 0.28
Nodes (11): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+3 more)

### Community 113 - "daemon-agent-runner.test.ts"
Cohesion: 0.11
Nodes (14): CommandResult, defaultCommandRunner(), Env, EnvOpts, makeEnv(), ReentrantRunner, SpyRunner, TestableAgentRunner (+6 more)

### Community 114 - "saveTaskToStore"
Cohesion: 0.19
Nodes (15): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Impact, What Changes (+7 more)

### Community 115 - "wishlist-store.ts"
Cohesion: 0.20
Nodes (19): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, WishlistPickerProps, addItem() (+11 more)

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

### Community 120 - "commands/team.md"
Cohesion: 0.11
Nodes (17): Arguments, Arguments, Arguments, Flags, Flags, Flags, Global flags, Global flags (+9 more)

### Community 121 - "replay-viewer.test.tsx"
Cohesion: 0.18
Nodes (12): parseReplay(), BASE, Harness, live, makeReplay(), mount(), smallReplay(), text() (+4 more)

### Community 122 - "tmpDir"
Cohesion: 0.06
Nodes (35): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+27 more)

### Community 123 - "commands/upgrade.ts"
Cohesion: 0.19
Nodes (16): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+8 more)

### Community 124 - "tdd-verifier.test.ts"
Cohesion: 0.16
Nodes (17): TddVerificationOptions, createTestBaseline(), TestBaseline, FullVerificationOptions, applyFeatureChanges(), captureBaseline(), git(), makeMainRepo() (+9 more)

### Community 126 - "i18n.md"
Cohesion: 0.14
Nodes (11): Configuration, Custom command template, Fallback chains, Profile fields, Routing, Secrets never go in config, Supported harnesses and verification status, Adding a locale (+3 more)

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
Cohesion: 0.17
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

### Community 132 - "genesis-review.tsx"
Cohesion: 0.17
Nodes (19): buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES (+11 more)

### Community 133 - "harness/index.ts"
Cohesion: 0.26
Nodes (10): HARNESS_IDS, OPERATIONS, detectHarnessFromBin(), listHarnesses(), REGISTRY, normalizeOutput(), detectAgentType(), base (+2 more)

### Community 137 - "daemon-profile-wiring.test.ts"
Cohesion: 0.29
Nodes (6): cfg(), ExposedRunner, heavy, light, routed(), task()

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 140 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 142 - "loadTasksFromStore"
Cohesion: 0.43
Nodes (8): defaultMeta(), listTaskFiles(), loadArchiveFromStore(), loadMeta(), loadTaskFile(), loadTasksFromStore(), normalizeTask(), reportSchemaIssues()

### Community 143 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 144 - "src/index.ts"
Cohesion: 0.18
Nodes (12): extractGlobalFlags(), ExtractResult, GlobalFlags, buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), ResolvedCommand, resolveGlobalFlagsAndCommand() (+4 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "dashboard-usage.ts"
Cohesion: 0.20
Nodes (9): addInto(), cloneTotals(), emptyTotals(), mergeInto(), normalizeUsageRecord(), TaskQuestLookup, UsageRefreshResult, validNumber() (+1 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "init-form.tsx"
Cohesion: 0.22
Nodes (10): EditableField(), EditableFieldProps, enT, FieldDef, FIELDS, InitForm(), InitFormDefaults, InitFormProps (+2 more)

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

### Community 156 - "config.test.ts"
Cohesion: 0.19
Nodes (5): cmdInit(), InitOptions, CONFIG_FILE, normalizeReplayConfig(), replayRetentionOptions()

### Community 157 - "daemon-client.test.ts"
Cohesion: 0.19
Nodes (8): EvtAgentStatusChange, makeEvent(), PROTOCOL_VERSION, makeClient(), serverBroadcast(), serverReceived, serverSockets, startTestServer()

### Community 158 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 159 - "replay.md"
Cohesion: 0.22
Nodes (8): Arguments, Arguments, Flags, Global flags, Global flags, Global flags, replay list, replay show

### Community 160 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

### Community 162 - "generateFakeTasks"
Cohesion: 0.40
Nodes (11): generateDeepTree(), generateDiamond(), generateFakeTasks(), generateFanIn(), generateFanOut(), generateLinearChain(), generateMixed(), generateStress() (+3 more)

### Community 163 - "docs-starlight knowledge"
Cohesion: 0.50
Nodes (3): Decisions, docs-starlight knowledge, File ownership

### Community 164 - "ref_node_child_process"
Cohesion: 0.16
Nodes (12): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+4 more)

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "fake-agent-runner.ts"
Cohesion: 0.44
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 167 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.25
Nodes (7): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, What is wombo?

### Community 169 - "quest complete"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest complete

### Community 171 - "tasks show"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks show

### Community 173 - "Fake Agent"
Cohesion: 0.50
Nodes (3): Behavior, Fake Agent, Usage

### Community 174 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, docs:gen, start, test, typecheck, woco

### Community 175 - "commands/status.ts"
Cohesion: 0.54
Nodes (7): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot()

### Community 191 - "multi-cli-support — architecture"
Cohesion: 0.29
Nodes (7): plan(), Config (src/config.ts, schemas/config.schema.json), Constraints, File ownership (mostly sequential; tasks 2 and 3 can run in parallel), multi-cli-support — architecture, Route resolution (pure, src/lib/harness/routing.ts), Wiring

### Community 192 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, citty, i18next, ink, mermaidtui, react, yaml

### Community 193 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 195 - "spawn.ts"
Cohesion: 0.33
Nodes (6): inlineAgentDefinition(), PROMPT_ARG_MAX, SpawnTarget, stripFrontmatter(), TEMPLATES_DIR, GENERALIST_TEMPLATE_PATH

### Community 196 - "tasks archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks archive

### Community 197 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 199 - "guides/team.md"
Cohesion: 0.40
Nodes (4): Conflict-free merges, Daemon behaviour, Recommended workflow, Task claims

### Community 201 - "replay-recorder.test.ts"
Cohesion: 0.29
Nodes (3): makeTask(), NoLaunchRunner, submit()

### Community 203 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 204 - "quest show"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest show

### Community 205 - "quest abandon"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest abandon

### Community 206 - "tasks set-difficulty"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks set-difficulty

### Community 207 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, @types/bun, @types/react, typescript

### Community 208 - "Agent Analytics"
Cohesion: 0.50
Nodes (4): Agent Analytics, Coverage limitations, Metric definitions, TUI

### Community 211 - "tasks list"
Cohesion: 0.67
Nodes (3): Flags, Global flags, tasks list

### Community 212 - "tasks check"
Cohesion: 0.67
Nodes (3): Flags, Global flags, tasks check

### Community 215 - "Capabilities"
Cohesion: 0.67
Nodes (3): Capabilities, Modified Capabilities, New Capabilities

### Community 216 - "Relevant files / directories"
Cohesion: 0.67
Nodes (3): OpenSpec:, Relevant files / directories, Test files:

### Community 217 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 218 - "buildTaskGraph"
Cohesion: 0.67
Nodes (3): buildTaskGraph(), computeDepth(), dfs()

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1385 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `genesis-review.tsx`, `agent-runner.ts`, `run-daemon-monitor.tsx`, `commands/tui.ts`, `task-store.ts`, `eval-score.ts`, `config.ts`, `ink/index.ts`, `dashboard.tsx`, `commands/launch.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `config.test.ts`, `schema.ts`, `analytics-overlay.tsx`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `toon.ts`, `task-schema.ts`, `lib/replay.ts`, `quest-store.ts`, `prompt.ts`, `commands/tasks.md`, `DaemonAgentState`, `graph.ts`, `templates.ts`, `commands/usage.ts`, `commands/logs.ts`, `tdd-verifier.ts`, `commands/completion.ts`, `esc-menu.tsx`, `ref_bun_test`, `ReplayStore`, `status`, `commands/upgrade.ts`, `i18n.md`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.020833333333333332 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `Explore mode guidelines and usage rules`, `AgentRunner`, `daemon-scheduler.test.ts`, `.allComplete`, `agent-runner.ts`, `protocol.ts`, `daemon-profile-wiring.test.ts`, `config.ts`, `analytics-lifecycle.test.ts`, `daemon-project-context.test.ts`, `commands/launch.ts`, `commands/merge.ts`, `AnalyticsTracker`, `Daemon`, `analytics.ts`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `ref_node_path`, `DaemonAgentState`, `replay-recorder.test.ts`, `claims.ts`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `state.ts`, `analytics-integration.test.ts`, `Scheduler`, `maxConcurrent`, `daemon-agent-runner.test.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `verifier.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07399577167019028 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `verifier.ts`, `daemon-scheduler.test.ts`, `agent-runner.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `commands/tui.ts`, `task-store.ts`, `eval-score.ts`, `config.ts`, `analytics-lifecycle.test.ts`, `routing.ts`, `run-task-browser.tsx`, `ink/index.ts`, `daemon-profile-wiring.test.ts`, `t`, `project-store.ts`, `daemon-project-context.test.ts`, `commands/launch.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `config.test.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `task-schema.ts`, `Daemon`, `analytics.ts`, `commands/status.ts`, `types.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `quest-store.ts`, `genesis-planner.ts`, `prompt.ts`, `ref_node_path`, `DaemonAgentState`, `quest-planner.ts`, `graph.ts`, `post-merge.ts`, `InkDaemonTUI`, `templates.ts`, `replay-recorder.test.ts`, `claims.ts`, `commands/usage.ts`, `tdd-verifier.ts`, `daemon-test-baseline.test.ts`, `tdd-baseline-integration.test.ts`, `analytics-integration.test.ts`, `lib/launcher.ts`, `daemon-agent-runner.test.ts`, `tdd-verifier.test.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._