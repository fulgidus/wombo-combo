# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 523 files · ~593,819 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 4477 nodes · 13457 edges · 195 communities (163 shown, 32 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 692 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a8ec04c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- .availableSlots
- merger.ts
- protocol.ts
- run-task-browser.tsx
- commands/tui.ts
- task-store.ts
- toon.ts
- config.ts
- templates.ts
- routing.ts
- ink/index.ts
- useI18n
- dashboard-metrics.ts
- commands/quest.ts
- onboarding/index.ts
- project-store.ts
- ref_bun_test
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
- run-daemon-monitor.tsx
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
- agent-runner.ts
- analytics-measurements.test.ts
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- quest-store.ts
- quest.md
- quest-planner.ts
- eval-score.ts
- TextBuffer
- commands/tasks.md
- permission
- ref_node_path
- dashboard-provider.test.tsx
- commands/status.ts
- AGENTS.md — Instructions for AI agents working on wombo-combo
- task-browser.tsx
- tdd-verifier.test.ts
- LiveFakeClient
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
- output
- test-detection.ts
- test-runner.ts
- commands/completion.ts
- .submitTask
- dashboard-provider.tsx
- esc-menu.tsx
- ReplayRecorder
- wishlist.md
- react
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
- DaemonAgentState
- analytics-integration.test.ts
- analytics-browser.test.tsx
- ReplayStore
- hitl-ask.ts
- analytics-usage-command.test.ts
- CONTEXT.md — For AI agents using wombo as a tool
- Scheduler
- maxConcurrent
- daemon.md
- citty-bridge.ts
- openspec/specs/scheduler-concurrency-accounting/spec.md
- analytics-summary.ts
- commands/stats.ts
- genesis-planner.ts
- cli-smoke.test.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- src/index.ts
- replay-viewer.test.tsx
- mergeBranch
- splash-screen.tsx
- tdd-baseline-pipeline.test.ts
- StubDaemonClient
- ADDED Requirements
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- analytics-lifecycle.test.ts
- tmpDir
- harness-opencode.test.ts
- react-devtools-core.ts
- openspec/specs/safe-tmp-worktree-placement/spec.md
- fake-agent-runner.ts
- global-flags.ts
- replay-browser.test.tsx
- gen-config-docs.ts
- router.ts
- merge-resolver-agent.md
- Task
- overview.md
- init-app.tsx
- first-task.md
- quests.md
- .doLaunch
- wombo-combo Operational Constraints
- FakeDaemonClient
- install.md
- docs/tsconfig.json
- genesis.md
- analytics-tracker.ts
- quest create
- replay.md
- commands/init.ts
- wombo-combo Agent Context
- logs.md
- docs-starlight knowledge
- quest archive
- session-replay — knowledge
- tasks add
- retry.md
- StubDaemonClient
- tasks set-difficulty
- tasks show
- Fake Agent
- cleanup.md
- What needs to happen next:
- abort.md
- history.md
- Tier25Result

## God Nodes (most connected - your core abstractions)
1. `t()` - 168 edges
2. `WomboConfig` - 142 edges
3. `react` - 116 edges
4. `Explore mode guidelines and usage rules` - 114 edges
5. `useI18n()` - 110 edges
6. `ink` - 109 edges
7. `DaemonState` - 103 edges
8. `AgentRunner` - 96 edges
9. `t` - 95 edges
10. `useScreenInput()` - 68 edges

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

## Communities (195 total, 32 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (94): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+86 more)

### Community 1 - "AgentRunner"
Cohesion: 0.17
Nodes (4): Assistant (Build · claude-sonnet-4.6 · 6.2s), AgentRunner, getConflictDiffs(), runSafeCmd()

### Community 2 - "browser.ts"
Cohesion: 0.10
Nodes (19): Cleanup, Daemon and TUI, Launch, Merge, Monitoring and recovery, Verification, BrowserConfig, allocateDebugPort() (+11 more)

### Community 3 - "WomboConfig"
Cohesion: 0.09
Nodes (41): AbortCommandOptions, cmdAbort(), ParsedLaunchArgs, ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, EvalCommandOptions (+33 more)

### Community 4 - ".availableSlots"
Cohesion: 0.05
Nodes (34): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES` (+26 more)

### Community 5 - "merger.ts"
Cohesion: 0.16
Nodes (23): runTier25(), abortRebase(), beginRebase(), canMerge(), cleanupRebaseBranch(), commitAutoResolvedMerge(), continueRebase(), deleteBranch() (+15 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (61): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+53 more)

### Community 7 - "run-task-browser.tsx"
Cohesion: 0.07
Nodes (57): ChromeLayout(), DashboardScreen(), defaultLoadTaskQuests(), EscMenuProvider(), getLocaleT(), defaultNav, NavigationContext, NavigationState (+49 more)

### Community 8 - "commands/tui.ts"
Cohesion: 0.14
Nodes (25): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+17 more)

### Community 9 - "task-store.ts"
Cohesion: 0.06
Nodes (61): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `defaults`, `git`, `install` (+53 more)

### Community 10 - "toon.ts"
Cohesion: 0.09
Nodes (51): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+43 more)

### Community 11 - "config.ts"
Cohesion: 0.07
Nodes (45): citty, startCommand, statusCommand, stopCommand, parseLaunchArgs(), parseMergeArgs(), parseTaskList(), abandonCommand (+37 more)

### Community 12 - "templates.ts"
Cohesion: 0.10
Nodes (34): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+26 more)

### Community 13 - "routing.ts"
Cohesion: 0.09
Nodes (31): AgentProfile, DEFAULT_CONFIG, resolveAgentBin(), Operation, detectHarnessFromBin(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE (+23 more)

### Community 14 - "ink/index.ts"
Cohesion: 0.07
Nodes (50): createIsolatedStdout(), getStableStdin(), ConfirmDialog(), GenesisReviewAppProps, getEditorCommand(), openEditor(), OpenEditorOptions, ProgressResult (+42 more)

### Community 15 - "useI18n"
Cohesion: 0.07
Nodes (75): Architecture, buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), HITL_MODES, PRIORITIES (+67 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.11
Nodes (37): EvtAgentActivity, EvtBuildResult, EvtMergeResult, EvtSchedulerStatus, EvtTaskPicked, initialValue(), ActivityEntry, advanceThroughput() (+29 more)

### Community 17 - "commands/quest.ts"
Cohesion: 0.12
Nodes (47): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+39 more)

### Community 18 - "onboarding/index.ts"
Cohesion: 0.14
Nodes (36): FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps, formatSectionForDisplay(), INPUT_STEPS (+28 more)

### Community 19 - "project-store.ts"
Cohesion: 0.08
Nodes (43): OnboardingResult, OnboardingScreen(), OnboardingScreenProps, runOnboardingInk(), RunOnboardingOptions, buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks() (+35 more)

### Community 20 - "ref_bun_test"
Cohesion: 0.04
Nodes (55): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+47 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.11
Nodes (24): analyzeBarrelFile(), BarrelFile, delegateToDaemon(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), waitForDaemonCompletion(), TERMINAL_STATUSES (+16 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.09
Nodes (31): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+23 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.11
Nodes (29): AVAILABLE_LOCALES, clearMissingKeys(), createInstance(), detectLocale(), DetectOptions, envDev(), getFixedT(), getLocale() (+21 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (25): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), deleteQuestBranch(), installDeps() (+17 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.06
Nodes (51): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), label() (+43 more)

### Community 26 - "monitor.ts"
Cohesion: 0.09
Nodes (23): extractActivity(), formatEventForLog(), MonitorCallbacks, OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd(), shortPath() (+15 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (22): Arguments, Global flags, Arguments, Global flags, Arguments, Global flags, Global flags, Commands (+14 more)

### Community 29 - "schema.ts"
Cohesion: 0.12
Nodes (17): describeCommand, BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), aliasHint(), allCommandSchemas(), buildAliasMap(), COMMAND_REGISTRY (+9 more)

### Community 30 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (4): DaemonClient, CommandMap, EvtStateSnapshot, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.13
Nodes (28): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightViewProps, agentNameFromType() (+20 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.11
Nodes (31): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), defaultIsDaemonAlive(), evidenceFor(), git(), gitOk() (+23 more)

### Community 34 - "harness/index.ts"
Cohesion: 0.14
Nodes (24): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+16 more)

### Community 35 - "run-daemon-monitor.tsx"
Cohesion: 0.07
Nodes (39): AgentStatus, DashboardAgent, useDashboardStore(), createI18n(), EN_STRINGS, I18nContext, StringsMap, TFunction (+31 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.12
Nodes (27): Flags, Global flags, task(), ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask (+19 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.09
Nodes (41): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CommandRunner, CreateOrUpdatePrOptions (+33 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.16
Nodes (5): AnalyticsTracker, errMsg(), isFinished(), InternalAgentState, AgentAnalyticsRecord

### Community 39 - "Minimal, surgical fix"
Cohesion: 0.20
Nodes (9): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+1 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (30): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS (+22 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (34): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES, isObject() (+26 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.10
Nodes (25): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+17 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.10
Nodes (41): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+33 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+14 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.11
Nodes (24): boundValue(), FileState, firstLine(), normalizeOpenCodeEvent(), PruneOptions, recordLabel(), REPLAY_LIMITS, REPLAY_SCHEMA_VERSION (+16 more)

### Community 48 - "agent-runner.ts"
Cohesion: 0.09
Nodes (37): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), HarnessId, getHarness(), ResolvedRoute, RouteSelection, inlineAgentDefinition() (+29 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.12
Nodes (19): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+11 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.07
Nodes (49): markTaskDone(), finishAgent(), PostMergeConfig, createDaemonAgentState(), POST_MERGE_JOURNAL, saveTaskToStore(), createBlankTask(), addVerifiedAgent() (+41 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (34): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+26 more)

### Community 54 - "quest-store.ts"
Cohesion: 0.08
Nodes (44): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), applyQuestConstraintsToTask(), createBlankQuest() (+36 more)

### Community 55 - "quest.md"
Cohesion: 0.07
Nodes (26): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags (+18 more)

### Community 56 - "quest-planner.ts"
Cohesion: 0.12
Nodes (29): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), generateGenesisPrompt(), loadProjectContext(), abortedPlanners, activePlanners, detectCycles() (+21 more)

### Community 57 - "eval-score.ts"
Cohesion: 0.09
Nodes (29): clampScore(), intervalsOverlap(), loadEvalReport(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), ScoreReport, scoreRouting() (+21 more)

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
Cohesion: 0.04
Nodes (33): root, CONFIG_FILE, SchedulerDeps, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, StatusObserver (+25 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.11
Nodes (10): ConnectionState, EventMap, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, mount(), streams() (+2 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.20
Nodes (17): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize() (+9 more)

### Community 64 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.12
Nodes (16): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions, Feature backlog (+8 more)

### Community 65 - "task-browser.tsx"
Cohesion: 0.06
Nodes (58): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+50 more)

### Community 66 - "tdd-verifier.test.ts"
Cohesion: 0.12
Nodes (28): extractBrowserErrorSummary(), buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions (+20 more)

### Community 67 - "LiveFakeClient"
Cohesion: 0.14
Nodes (3): LiveFakeClient, makeMinimalConfig(), mountShell()

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (15): 1. Are agents spawned with `detached: true` and `unref()`?, 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown (+7 more)

### Community 70 - "wishlist-picker.tsx"
Cohesion: 0.16
Nodes (19): UseWishlistStoreResult, formatDate(), truncateText(), AddInput(), OverlayFooter(), OverlayItemList(), createTestStreams(), renderLive() (+11 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.11
Nodes (16): availableLocales(), FALLBACK_LOCALE, FlatResource, RESOURCES, baseKey(), collectUsedKeys(), describeResource(), domainLiteral() (+8 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.14
Nodes (26): normalizePostMergeConfig(), AgentRunnerConfig, Git, isComplete(), isJournal(), Journal, JournalOperation, journalPath() (+18 more)

### Community 75 - "wishlist-store.ts"
Cohesion: 0.24
Nodes (16): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, addItem(), atomicWrite(), deleteItem() (+8 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.05
Nodes (42): author, bin, woco, bugs, url, dependencies, citty, i18next (+34 more)

### Community 78 - "docs/package.json"
Cohesion: 0.11
Nodes (15): dependencies, astro, @astrojs/starlight, description, name, private, scripts, build (+7 more)

### Community 79 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.17
Nodes (25): buildAnalyticsSummary(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost(), formatNumber() (+17 more)

### Community 81 - "output"
Cohesion: 0.18
Nodes (17): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), cmdReplayList() (+9 more)

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
Cohesion: 0.09
Nodes (18): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+10 more)

### Community 86 - "dashboard-provider.tsx"
Cohesion: 0.08
Nodes (27): DashboardMetricsContext, DashboardMetricsValue, clientState(), DASHBOARD_EVENTS, DashboardMetricsProvider(), DashboardMetricsProviderProps, mapConnection(), REAL_TIMERS (+19 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.18
Nodes (13): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+5 more)

### Community 88 - "ReplayRecorder"
Cohesion: 0.10
Nodes (14): errMsg(), ReplayRecorder, ReplayRecorderOptions, Tracked, EXCLUDED_PATH_PREFIXES, DEFAULT_KEEP_PER_TASK, captureWorktreeDiff(), DiffLineKind (+6 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "react"
Cohesion: 0.04
Nodes (71): ink, react, App(), AppProps, ConfirmDialogProps, ErrandWizard(), ErrandWizardProps, ErrandWizardStep (+63 more)

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
Cohesion: 0.07
Nodes (27): Configuration, Custom command template, Fallback chains, Profile fields, Routing, Secrets never go in config, Supported harnesses and verification status, Adding a locale (+19 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.06
Nodes (22): Capabilities, Impact, Modified Capabilities, What Changes, Why, Implementation, Tasks: fix-concurrency-boot-reset, Verification (+14 more)

### Community 101 - "gen-command-docs.ts"
Cohesion: 0.33
Nodes (14): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+6 more)

### Community 102 - "DaemonAgentState"
Cohesion: 0.23
Nodes (10): DaemonAgentState, SchedulerState, PersistedDaemonState, StateListener, DaemonAdapterProps, DaemonMonitorScreenProps, DaemonStore, ActivityEntry (+2 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "analytics-browser.test.tsx"
Cohesion: 0.22
Nodes (7): ANALYTICS_REFRESH_MS, Harness, mount(), h, result(), wait(), waitFor()

### Community 105 - "ReplayStore"
Cohesion: 0.26
Nodes (6): assertSafe(), isSafeSegment(), replaysDir(), ReplayStore, seedReplay(), seed()

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "analytics-usage-command.test.ts"
Cohesion: 0.18
Nodes (9): cmdUsage(), groupedToJSON(), toGroupableField(), totalsToJSON(), validateUsageOptions(), rec(), REPO_ROOT, seed() (+1 more)

### Community 108 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.13
Nodes (13): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo? (+5 more)

### Community 109 - "Scheduler"
Cohesion: 0.06
Nodes (40): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+32 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.06
Nodes (50): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+42 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "citty-bridge.ts"
Cohesion: 0.33
Nodes (10): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, CommandDef (+2 more)

### Community 113 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.17
Nodes (11): Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: New agents are not launched to fill slots held by verified agents (+3 more)

### Community 114 - "analytics-summary.ts"
Cohesion: 0.20
Nodes (15): Token Usage Tracking, AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions() (+7 more)

### Community 115 - "commands/stats.ts"
Cohesion: 0.29
Nodes (12): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+4 more)

### Community 116 - "genesis-planner.ts"
Cohesion: 0.20
Nodes (13): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), GenesisOutput, parseGenesisYaml(), runGenesisPlanner() (+5 more)

### Community 117 - "cli-smoke.test.ts"
Cohesion: 0.20
Nodes (12): buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess(), runSrc() (+4 more)

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "src/index.ts"
Cohesion: 0.32
Nodes (8): buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), resolveGlobalFlagsAndCommand(), runCittyCommand(), checkDevModeGuard(), initCliLocale(), main()

### Community 121 - "replay-viewer.test.tsx"
Cohesion: 0.18
Nodes (12): ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay(), text() (+4 more)

### Community 122 - "mergeBranch"
Cohesion: 0.17
Nodes (12): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, mergeAll(), mergeBranch() (+4 more)

### Community 123 - "splash-screen.tsx"
Cohesion: 0.08
Nodes (35): upgradeCommand, channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm() (+27 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 126 - "ADDED Requirements"
Cohesion: 0.18
Nodes (10): ADDED Requirements, Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo (+2 more)

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

### Community 131 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 132 - "tmpDir"
Cohesion: 0.21
Nodes (10): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why, 1. Fix Temporary Worktree Paths, 2. Verification (+2 more)

### Community 133 - "harness-opencode.test.ts"
Cohesion: 0.13
Nodes (17): isPlainObject(), validateAgentRouting(), HARNESS_IDS, isHarnessId(), OPERATIONS, listHarnesses(), detectAgentType(), base (+9 more)

### Community 137 - "openspec/specs/safe-tmp-worktree-placement/spec.md"
Cohesion: 0.20
Nodes (9): Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo, Scenario: syncQuestBranch creates tmp worktree outside the repo (+1 more)

### Community 139 - "fake-agent-runner.ts"
Cohesion: 0.44
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 140 - "global-flags.ts"
Cohesion: 0.39
Nodes (4): extractGlobalFlags(), ExtractResult, GlobalFlags, ResolvedCommand

### Community 142 - "replay-browser.test.tsx"
Cohesion: 0.27
Nodes (6): Harness, mount(), h, seedTask(), wait(), waitFor()

### Community 143 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 144 - "router.ts"
Cohesion: 0.11
Nodes (29): abortCommand, cleanupCommand, completionCommand, daemonCommand, evalCommand, genesisCommand, helpCommand, historyCommand (+21 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "Task"
Cohesion: 0.26
Nodes (7): TaskEditorProps, Task, cfg(), ExposedRunner, heavy, light, routed()

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "init-app.tsx"
Cohesion: 0.14
Nodes (22): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+14 more)

### Community 149 - "first-task.md"
Cohesion: 0.29
Nodes (6): 1. Initialize the project, 2. Add a task, 3. Preview, then launch, 4. Verify and merge, 5. Clean up, Where to go next

### Community 150 - "quests.md"
Cohesion: 0.33
Nodes (5): Branches, Constraints, Lifecycle, Planning, TDD

### Community 151 - ".doLaunch"
Cohesion: 0.08
Nodes (19): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Supported test output, What is recorded (+11 more)

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 154 - "install.md"
Cohesion: 0.40
Nodes (4): Install, Next, Shell completions, Working on wombo-combo itself

### Community 155 - "docs/tsconfig.json"
Cohesion: 0.40
Nodes (4): exclude, extends, include, astro/tsconfigs/strict

### Community 156 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 157 - "analytics-tracker.ts"
Cohesion: 0.19
Nodes (14): allocateExecutionId(), ExecutionContext, isActive(), StatusObserverInfo, captureHead(), git(), GitResult, HeadCapture (+6 more)

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

### Community 164 - "quest archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest archive

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "tasks add"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks add

### Community 167 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 169 - "tasks set-difficulty"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks set-difficulty

### Community 171 - "tasks show"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks show

### Community 173 - "Fake Agent"
Cohesion: 0.50
Nodes (3): Behavior, Fake Agent, Usage

### Community 175 - "What needs to happen next:"
Cohesion: 0.50
Nodes (4): Accomplished, Completed and archived:, Currently in progress:, What needs to happen next:

### Community 193 - "Tier25Result"
Cohesion: 0.67
Nodes (3): Tier25Result, TieredMergeResult, ConflictResolutionContext

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1338 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `config.ts` to `WomboConfig`, `merger.ts`, `commands/tui.ts`, `task-store.ts`, `toon.ts`, `templates.ts`, `useI18n`, `commands/quest.ts`, `ref_bun_test`, `commands/launch.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `schema.ts`, `commands/init.ts`, `commands/merge.ts`, `agent-registry.ts`, `run-daemon-monitor.tsx`, `task-schema.ts`, `lib/replay.ts`, `quest-store.ts`, `commands/tasks.md`, `commands/status.ts`, `task-browser.tsx`, `tdd-verifier.test.ts`, `graph.ts`, `commands/usage.ts`, `output`, `commands/completion.ts`, `esc-menu.tsx`, `react`, `wombo-combo`, `analytics-usage-command.test.ts`, `CONTEXT.md — For AI agents using wombo as a tool`, `commands/stats.ts`, `splash-screen.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `analytics-lifecycle.test.ts`, `.availableSlots`, `protocol.ts`, `Task`, `commands/launch.ts`, `analytics-tracker.ts`, `commands/merge.ts`, `AnalyticsTracker`, `Minimal, surgical fix`, `Daemon`, `analytics.ts`, `agent-runner.ts`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `ref_node_path`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `DaemonAgentState`, `analytics-integration.test.ts`, `Scheduler`, `maxConcurrent`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0967741935483871 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `analytics-lifecycle.test.ts`, `merger.ts`, `protocol.ts`, `run-task-browser.tsx`, `commands/tui.ts`, `task-store.ts`, `toon.ts`, `config.ts`, `templates.ts`, `routing.ts`, `ink/index.ts`, `commands/quest.ts`, `Task`, `onboarding/index.ts`, `project-store.ts`, `commands/launch.ts`, `worktree.ts`, `lib/tasks.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `run-daemon-monitor.tsx`, `task-schema.ts`, `Daemon`, `agent-runner.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `quest-store.ts`, `quest-planner.ts`, `eval-score.ts`, `ref_node_path`, `commands/status.ts`, `tdd-verifier.test.ts`, `graph.ts`, `post-merge.ts`, `InkDaemonTUI`, `commands/usage.ts`, `daemon-test-baseline.test.ts`, `tdd-baseline-integration.test.ts`, `DaemonAgentState`, `analytics-integration.test.ts`, `analytics-usage-command.test.ts`, `Scheduler`, `commands/stats.ts`, `genesis-planner.ts`, `splash-screen.tsx`, `tdd-baseline-pipeline.test.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._