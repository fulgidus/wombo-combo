# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 537 files · ~609,690 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 4610 nodes · 13888 edges · 198 communities (166 shown, 32 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 698 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3cf5a8fa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- ADDED Requirements
- agent-runner.ts
- protocol.ts
- run-daemon-monitor.tsx
- commands/tui.ts
- task-store.ts
- toon.ts
- config.ts
- Source files (read and relevant):
- lib/launcher.ts
- run-task-browser.tsx
- ink/index.ts
- dashboard-metrics.ts
- lib/output.ts
- project-store.ts
- DaemonState
- dashboard.tsx
- commands/launch.ts
- chrome.tsx
- lib/i18n.ts
- worktree.ts
- lib/tasks.ts
- run-quest-picker.tsx
- hitl-channel.ts
- index.md
- schema.ts
- analytics-overlay.tsx
- DaemonClient
- agent-registry.ts
- commands/merge.ts
- claude-code.ts
- dashboard.test.tsx
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
- types.ts
- analytics-measurements.test.ts
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- commands/quest.ts
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
- output
- test-detection.ts
- test-runner.ts
- commands/completion.ts
- Requirement: Launch stagger applies only to real-agent launches
- dashboard-provider.tsx
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
- .load
- gen-command-docs.ts
- state.ts
- analytics-integration.test.ts
- analytics-browser.test.tsx
- ReplayStore
- hitl-ask.ts
- analytics-summary.ts
- CONTEXT.md — For AI agents using wombo as a tool
- Scheduler
- maxConcurrent
- daemon.md
- citty-bridge.ts
- openspec/specs/scheduler-concurrency-accounting/spec.md
- saveAllTasksToStore
- commands/stats.ts
- config.md
- cli-smoke.test.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- replay-viewer.test.tsx
- tmpDir
- splash-screen.tsx
- verifier.ts
- StubDaemonClient
- i18n.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- daemon-scheduler.test.ts
- router.tsx
- harness/index.ts
- react-devtools-core.ts
- daemon-profile-wiring.test.ts
- citty-merge.test.ts
- analytics-lifecycle.test.ts
- loadTasksFromStore
- gen-config-docs.ts
- src/index.ts
- merge-resolver-agent.md
- HarnessAdapter
- overview.md
- init-form.tsx
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- FakeDaemonClient
- install.md
- docs/tsconfig.json
- TokenCollector
- quest-picker.test.tsx
- running-agents.md
- replay.md
- Requirement: Fake-agent tasks bypass inter-launch stagger
- wombo-combo Agent Context
- logs.md
- docs-starlight knowledge
- replay-diff.ts
- session-replay — knowledge
- tasks add
- retry.md
- i18n-full — design notes
- quest complete
- tasks show
- Fake Agent
- Requirement: Launch stagger applies only to real-agent launches
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- quest plan
- tasks archive
- eval.md
- init.md
- merge.md
- NoLaunchRunner

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

## Communities (198 total, 32 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (95): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+87 more)

### Community 1 - "AgentRunner"
Cohesion: 0.09
Nodes (17): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected, 1. AgentRunner — Per-entry stagger flag, 2. TUI — Batch task writes in handleToggleAll (+9 more)

### Community 2 - "browser.ts"
Cohesion: 0.12
Nodes (15): Daemon and TUI, BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult (+7 more)

### Community 3 - "WomboConfig"
Cohesion: 0.11
Nodes (36): AbortCommandOptions, ParsedLaunchArgs, CleanupOptions, EvalCommandOptions, GenesisCommandOptions, HistoryCommandOptions, LaunchCommandOptions, MergeCommandOptions (+28 more)

### Community 4 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded (+3 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.11
Nodes (36): MaxEscalationTier, FAKE_AGENT_VERIFICATION, runTier25(), Tier25Result, RouteSelection, abortRebase(), beginRebase(), canMerge() (+28 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (60): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+52 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.17
Nodes (28): ChromeLayout(), DashboardScreen(), EscMenuProvider(), getLocaleT(), groupByTask(), latestWhen(), ReplayScreen(), ReplayScreenProps (+20 more)

### Community 8 - "commands/tui.ts"
Cohesion: 0.09
Nodes (43): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+35 more)

### Community 9 - "task-store.ts"
Cohesion: 0.19
Nodes (25): Top-level options, archiveDir(), atomicWrite(), createBackup(), ensureDir(), flattenTask(), getArchiveDir(), getTasksDir() (+17 more)

### Community 10 - "toon.ts"
Cohesion: 0.05
Nodes (75): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+67 more)

### Community 11 - "config.ts"
Cohesion: 0.04
Nodes (93): citty, cmdAbort(), abortCommand, cleanupCommand, completionCommand, daemonCommand, startCommand, statusCommand (+85 more)

### Community 12 - "Source files (read and relevant):"
Cohesion: 0.08
Nodes (29): Context, 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals (+21 more)

### Community 13 - "lib/launcher.ts"
Cohesion: 0.05
Nodes (65): 1. Are agents spawned with `detached: true` and `unref()`?, AgentProfile, PostMergeConfig, resolveAgentBin(), HarnessId, getHarness(), AvailabilityProbes, fallbackChain() (+57 more)

### Community 14 - "run-task-browser.tsx"
Cohesion: 0.09
Nodes (35): ErrandWizardProps, QuestPickerScreenProps, CONCURRENCY_LEVELS, PRIORITIES, RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction, TaskBrowserApp() (+27 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.05
Nodes (75): isAltScreenActive(), buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewAppProps, HITL_MODES, PRIORITIES (+67 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.11
Nodes (37): EvtAgentActivity, EvtBuildResult, EvtMergeResult, EvtTaskPicked, initialValue(), ActivityEntry, advanceThroughput(), alignBucket() (+29 more)

### Community 17 - "lib/output.ts"
Cohesion: 0.15
Nodes (31): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+23 more)

### Community 18 - "project-store.ts"
Cohesion: 0.06
Nodes (80): useChromeHideQuitHint(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps, formatSectionForDisplay() (+72 more)

### Community 19 - "DaemonState"
Cohesion: 0.09
Nodes (13): On Elixir/BEAM architecture as an evolution, DaemonState, Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners (+5 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.10
Nodes (28): AgentStatus, clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgent, DashboardAgentRow() (+20 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.13
Nodes (26): analyzeBarrelFile(), BarrelFile, cmdLaunch(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), prepareAgentDefinitions(), buildChainFrom() (+18 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.12
Nodes (21): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+13 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.09
Nodes (30): Architecture, createI18n(), EN_STRINGS, I18nContext, StringsMap, AVAILABLE_LOCALES, clearMissingKeys(), createInstance() (+22 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (24): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), featureBranchName(), installDeps() (+16 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.08
Nodes (37): buildTaskQuestMap(), cmdTasksList(), renderStatusGroups(), cmdTasksShow(), label(), renderSubtask(), statusColor(), filterFields() (+29 more)

### Community 26 - "run-quest-picker.tsx"
Cohesion: 0.09
Nodes (29): QuestSummary, QuestPickerAction, QuestPickerApp(), runQuestPickerInk(), RunQuestPickerOptions, UsageOverlayViewProps, extractActivity(), formatEventForLog() (+21 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (23): Arguments, Global flags, Flags, Global flags, Arguments, Global flags, Arguments, Global flags (+15 more)

### Community 29 - "schema.ts"
Cohesion: 0.15
Nodes (21): hasKey(), aliasHint(), allCommandSchemas(), commandToSchema(), descriptionOf(), findCommandDef(), flagDescriptionOf(), flagKeyName() (+13 more)

### Community 30 - "analytics-overlay.tsx"
Cohesion: 0.15
Nodes (28): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+20 more)

### Community 31 - "DaemonClient"
Cohesion: 0.10
Nodes (9): delegateToDaemon(), waitForDaemonCompletion(), DaemonClient, CommandMap, EvtStateSnapshot, DaemonMonitorAdapter(), DaemonMonitorShellProps, InkDaemonTUIOptions (+1 more)

### Community 32 - "agent-registry.ts"
Cohesion: 0.13
Nodes (28): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightViewProps, agentNameFromType() (+20 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.17
Nodes (20): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+12 more)

### Community 34 - "claude-code.ts"
Cohesion: 0.28
Nodes (11): errorEvent(), normalizeToolInput(), parseJsonLine(), resultText(), stepFinishEvent(), stepStartEvent(), StepTokens, textEvent() (+3 more)

### Community 35 - "dashboard.test.tsx"
Cohesion: 0.13
Nodes (20): DashboardStoreContext, ASCII_LEVELS, clean(), formatSparkline(), Sparkline(), SparklineOptions, SparklineProps, UNICODE_LEVELS (+12 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.09
Nodes (40): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CommandRunner, CreateOrUpdatePrOptions (+32 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.12
Nodes (20): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, AgentAnalyticsRecord (+12 more)

### Community 39 - "quest-wizard.tsx"
Cohesion: 0.13
Nodes (14): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), PRIORITY_COLORS, QuestWizard(), QuestWizardProps, STEPS, createTestStreams() (+6 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (28): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS (+20 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (35): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+27 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.07
Nodes (29): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+21 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (41): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+33 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+14 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.09
Nodes (31): ReplayRecorderOptions, Tracked, boundValue(), DEFAULT_KEEP_PER_TASK, FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent() (+23 more)

### Community 48 - "types.ts"
Cohesion: 0.26
Nodes (8): build(), customHarness, expand(), Operation, opencodeHarness, ResolveRouteOptions, CustomCommandSpec, HarnessLaunchRequest

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (17): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+9 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.06
Nodes (63): defaultIsDaemonAlive(), SelectedAgentInfo, createDaemonAgentState(), setupMergeDriver(), POST_MERGE_JOURNAL, PostMergeRequest, VerificationSummary, saveTaskToStore() (+55 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (33): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+25 more)

### Community 54 - "commands/quest.ts"
Cohesion: 0.07
Nodes (66): genesisCommand, applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), handleQuestSubcommand() (+58 more)

### Community 55 - "quest.md"
Cohesion: 0.07
Nodes (26): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags (+18 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.05
Nodes (65): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree() (+57 more)

### Community 57 - "prompt.ts"
Cohesion: 0.12
Nodes (22): formatHunksForLLM(), portlessUrl(), abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource() (+14 more)

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
Nodes (32): root, cmdInit(), InitOptions, CONFIG_FILE, DEFAULT_CONFIG, normalizeReplayConfig(), replayRetentionOptions(), InitApp() (+24 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.09
Nodes (11): ConnectionState, EventMap, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, Harness, mount() (+3 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.13
Nodes (26): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), DaemonAgentState (+18 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "useI18n"
Cohesion: 0.07
Nodes (75): ErrandWizard(), useScreenInput(), FakeTaskWizard(), GenesisReviewApp(), questToReviewItem(), t, useI18n(), ConfirmDialog() (+67 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.19
Nodes (17): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationResult, TestBaselineComparison, renderTestDetectionReport() (+9 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.09
Nodes (9): escMenuCursor(), eventually(), selectFromEscMenu(), waitFor(), LiveFakeClient, makeMinimalConfig(), mountShell(), openDashboardFromMenu() (+1 more)

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (14): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+6 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.16
Nodes (21): teamMergeCommands, teamMergeMeta, teamSetup, ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES (+13 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.15
Nodes (27): MergeCommandDeps, normalizePostMergeConfig(), AgentRunnerConfig, Git, isComplete(), isJournal(), Journal, JournalOperation (+19 more)

### Community 74 - "InkDaemonTUI"
Cohesion: 0.11
Nodes (5): InkDaemonTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 75 - "templates.ts"
Cohesion: 0.06
Nodes (56): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, emit(), emitStepFinish(), emitStepStart() (+48 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.05
Nodes (42): author, bin, woco, bugs, url, dependencies, citty, i18next (+34 more)

### Community 78 - "docs/package.json"
Cohesion: 0.11
Nodes (15): dependencies, astro, @astrojs/starlight, description, name, private, scripts, build (+7 more)

### Community 79 - "claims.ts"
Cohesion: 0.22
Nodes (19): normalizeTeamConfig(), assertSafeId(), Claim, ClaimInfo, ClaimOptions, claimPath(), ClaimResult, CLAIMS_DIR (+11 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.15
Nodes (30): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+22 more)

### Community 81 - "output"
Cohesion: 0.12
Nodes (24): evalCommand, logsCommand, cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdLogs() (+16 more)

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "test-runner.ts"
Cohesion: 0.24
Nodes (14): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+6 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.19
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 86 - "dashboard-provider.tsx"
Cohesion: 0.08
Nodes (28): DashboardMetricsContext, DashboardMetricsValue, clientState(), DASHBOARD_EVENTS, DashboardMetricsProvider(), DashboardMetricsProviderProps, defaultLoadTaskQuests(), mapConnection() (+20 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.13
Nodes (18): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+10 more)

### Community 88 - "ReplayRecorder"
Cohesion: 0.15
Nodes (3): errMsg(), ReplayRecorder, truncateText()

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.04
Nodes (67): ink, react, App(), AppProps, ConfirmDialog(), ConfirmDialogProps, ErrandWizardStep, STEPS (+59 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.14
Nodes (22): deleteTaskFile(), removeTaskFromStore(), addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git() (+14 more)

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
Cohesion: 0.11
Nodes (19): Agent Analytics, Commands, Coverage limitations, Entry points, Install, Languages, Launch options, License (+11 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - ".load"
Cohesion: 0.07
Nodes (26): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+18 more)

### Community 101 - "gen-command-docs.ts"
Cohesion: 0.31
Nodes (15): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+7 more)

### Community 102 - "state.ts"
Cohesion: 0.12
Nodes (14): EvtAgentStatusChange, EvtSchedulerStatus, SchedulerStatus, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, PersistedDaemonState (+6 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "analytics-browser.test.tsx"
Cohesion: 0.20
Nodes (8): ANALYTICS_REFRESH_MS, analyticsScopeFilter(), Harness, mount(), h, result(), wait(), waitFor()

### Community 105 - "ReplayStore"
Cohesion: 0.23
Nodes (8): assertSafe(), isSafeSegment(), replaysDir(), ReplayStore, summarize(), seedReplay(), seed(), seed()

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "analytics-summary.ts"
Cohesion: 0.15
Nodes (18): Flags, Global flags, props(), rec(), sampleRecords(), AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage (+10 more)

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.12
Nodes (14): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo? (+6 more)

### Community 109 - "Scheduler"
Cohesion: 0.07
Nodes (27): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+19 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (55): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+47 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "citty-bridge.ts"
Cohesion: 0.28
Nodes (11): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+3 more)

### Community 113 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.18
Nodes (10): Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: New agents are not launched to fill slots held by verified agents (+2 more)

### Community 114 - "saveAllTasksToStore"
Cohesion: 0.17
Nodes (13): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+5 more)

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

### Community 120 - "commands/team.md"
Cohesion: 0.11
Nodes (17): Arguments, Arguments, Arguments, Flags, Flags, Flags, Global flags, Global flags (+9 more)

### Community 121 - "replay-viewer.test.tsx"
Cohesion: 0.17
Nodes (13): parseReplay(), ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay() (+5 more)

### Community 122 - "tmpDir"
Cohesion: 0.06
Nodes (35): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+27 more)

### Community 123 - "splash-screen.tsx"
Cohesion: 0.08
Nodes (37): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+29 more)

### Community 124 - "verifier.ts"
Cohesion: 0.14
Nodes (18): extractBrowserErrorSummary(), extractTddErrorSummary(), TddVerificationOptions, createTestBaseline(), TestBaseline, BuildResult, extractErrorSummary(), FullVerificationOptions (+10 more)

### Community 126 - "i18n.md"
Cohesion: 0.12
Nodes (13): Configuration, Custom command template, Profile fields, Secrets never go in config, Supported harnesses and verification status, Adding a locale, Checks, Choosing a language (+5 more)

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

### Community 132 - "router.tsx"
Cohesion: 0.19
Nodes (12): defaultNav, NavigationContext, NavigationState, ScreenComponent, ScreenKey, ScreenMap, ScreenRouter(), ScreenRouterProps (+4 more)

### Community 133 - "harness/index.ts"
Cohesion: 0.21
Nodes (12): claudeCodeHarness, codexHarness, HARNESS_IDS, isHarnessId(), OPERATIONS, detectHarnessFromBin(), listHarnesses(), REGISTRY (+4 more)

### Community 137 - "daemon-profile-wiring.test.ts"
Cohesion: 0.20
Nodes (10): Fallback chains, Routing, cfg(), ExposedRunner, heavy, light, routed(), task() (+2 more)

### Community 139 - "citty-merge.test.ts"
Cohesion: 0.20
Nodes (6): parseMergeArgs(), parseTaskList(), BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), buildAliasMap()

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
Cohesion: 0.32
Nodes (8): buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), resolveGlobalFlagsAndCommand(), runCittyCommand(), checkDevModeGuard(), initCliLocale(), main()

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "HarnessAdapter"
Cohesion: 0.53
Nodes (3): Adding a harness, HarnessAdapter, Core idea: normalize at the edge, keep the pipeline untouched

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

### Community 157 - "quest-picker.test.tsx"
Cohesion: 0.38
Nodes (6): QuestPickerViewProps, defaultProps(), EMPTY_USAGE, makeQuest(), makeSummary(), QuestSummary

### Community 158 - "running-agents.md"
Cohesion: 0.33
Nodes (5): Cleanup, Launch, Merge, Monitoring and recovery, Verification

### Community 159 - "replay.md"
Cohesion: 0.22
Nodes (8): Arguments, Arguments, Flags, Global flags, Global flags, Global flags, replay list, replay show

### Community 160 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

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
Cohesion: 0.31
Nodes (10): EXCLUDED_PATH_PREFIXES, captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat(), pathspecs(), runGit(), untrackedPaths() (+2 more)

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "tasks add"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks add

### Community 167 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 168 - "i18n-full — design notes"
Cohesion: 0.33
Nodes (5): File ownership (per task), i18n-full — design notes, Key naming, Library and bundling, Tests

### Community 169 - "quest complete"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest complete

### Community 171 - "tasks show"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks show

### Community 173 - "Fake Agent"
Cohesion: 0.50
Nodes (3): Behavior, Fake Agent, Usage

### Community 175 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 193 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 195 - "quest plan"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest plan

### Community 196 - "tasks archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks archive

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1384 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `config.ts` to `WomboConfig`, `agent-runner.ts`, `run-daemon-monitor.tsx`, `commands/tui.ts`, `task-store.ts`, `toon.ts`, `ink/index.ts`, `lib/output.ts`, `dashboard.tsx`, `commands/launch.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `schema.ts`, `analytics-overlay.tsx`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `task-schema.ts`, `i18n-full — design notes`, `lib/replay.ts`, `commands/quest.ts`, `commands/tasks.md`, `ref_node_path`, `commands/status.ts`, `tdd-verifier.test.ts`, `graph.ts`, `merge-driver.ts`, `templates.ts`, `commands/usage.ts`, `output`, `commands/completion.ts`, `esc-menu.tsx`, `ref_bun_test`, `CONTEXT.md — For AI agents using wombo as a tool`, `commands/stats.ts`, `splash-screen.tsx`, `i18n.md`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.020833333333333332 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `Explore mode guidelines and usage rules`, `AgentRunner`, `daemon-scheduler.test.ts`, `agent-runner.ts`, `protocol.ts`, `daemon-profile-wiring.test.ts`, `config.ts`, `Source files (read and relevant):`, `analytics-lifecycle.test.ts`, `commands/launch.ts`, `commands/merge.ts`, `AnalyticsTracker`, `Daemon`, `analytics.ts`, `lib/replay.ts`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `ref_node_path`, `commands/status.ts`, `claims.ts`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `.load`, `state.ts`, `analytics-integration.test.ts`, `maxConcurrent`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.09482001755926252 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `daemon-scheduler.test.ts`, `agent-runner.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `commands/tui.ts`, `task-store.ts`, `toon.ts`, `config.ts`, `analytics-lifecycle.test.ts`, `lib/launcher.ts`, `run-task-browser.tsx`, `daemon-profile-wiring.test.ts`, `lib/output.ts`, `project-store.ts`, `DaemonState`, `commands/launch.ts`, `worktree.ts`, `lib/tasks.ts`, `run-quest-picker.tsx`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `task-schema.ts`, `Daemon`, `analytics.ts`, `types.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `commands/quest.ts`, `quest-planner.ts`, `prompt.ts`, `ref_node_path`, `commands/status.ts`, `tdd-verifier.test.ts`, `graph.ts`, `post-merge.ts`, `InkDaemonTUI`, `templates.ts`, `claims.ts`, `commands/usage.ts`, `output`, `daemon-test-baseline.test.ts`, `tdd-baseline-integration.test.ts`, `analytics-integration.test.ts`, `commands/stats.ts`, `splash-screen.tsx`, `verifier.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._