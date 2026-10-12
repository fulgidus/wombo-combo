# Graph Report - wombo-combo  (2026-10-12)

## Corpus Check
- 652 files · ~702,106 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 5598 nodes · 16291 edges · 256 communities (219 shown, 37 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 831 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7608b2ef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- verifier.ts
- WomboConfig
- splash-screen.tsx
- planner-project-context.test.ts
- protocol.ts
- run-tui-app.tsx
- mapping.ts
- task-store.ts
- dashboard-usage.ts
- config.ts
- config.md
- routing.ts
- commands/sync.ts
- ink/index.ts
- dashboard-metrics.ts
- Scheduler
- project-store.ts
- github-client.ts
- dashboard.tsx
- push.ts
- toon.ts
- lib/i18n.ts
- worktree.ts
- Difficulty
- ref_bun_test
- hitl-channel.ts
- index.md
- schema.ts
- genesis-planner.ts
- DaemonClient
- agent-registry.ts
- commands/merge.ts
- harness/index.ts
- eval-score.ts
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- setup-matt-pocock-skills/SKILL.md
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- analytics-summary.ts
- merge-report.ts
- conflict-hunks.ts
- lib/replay.ts
- quest-wizard.tsx
- analytics-measurements.test.ts
- tdd-baseline-integration.test.ts
- saveTaskToStore
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- msg
- quest.md
- output
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- init-app.tsx
- dashboard-provider.test.tsx
- ui.ts
- commands/tui.ts
- useI18n
- AGENTS.md — Instructions for AI agents working on wombo-combo
- monitor-router.test.tsx
- analytics.ts
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
- t
- tdd-verifier.test.ts
- Triage
- commands/completion.ts
- .submitTask
- monitor.ts
- esc-menu.tsx
- test-detection.ts
- wishlist.md
- react
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- changelog.ts
- commands/launch.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- .load
- gen-command-docs.ts
- lib/tasks.ts
- analytics-integration.test.ts
- test-runner.ts
- ReplayStore
- harness-opencode.test.ts
- lib/launcher.ts
- quest-store.ts
- .handleStart
- maxConcurrent
- daemon.md
- citty-bridge.ts
- daemon-agent-runner.test.ts
- sync-push.test.ts
- wishlist-store.ts
- graph.ts
- cli-smoke.test.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- replay-viewer.test.tsx
- agent-runner.ts
- saveAllTasksToStore
- tdd-baseline-pipeline.test.ts
- run-daemon-monitor.tsx
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- comments.ts
- Process
- pull.ts
- react-devtools-core.ts
- wishlist-picker.tsx
- scout.ts
- gen-config-docs.ts
- Codebase Design
- lib/quest.ts
- quest-planner.ts
- merge-resolver-agent.md
- During the session
- overview.md
- replay-browser.test.tsx
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- analytics-lifecycle.test.ts
- install.md
- docs/tsconfig.json
- HTML Report Format
- template.sh
- DaemonState
- replay.md
- Ask Matt
- wombo-combo Agent Context
- Diagnosing Bugs
- docs-starlight knowledge
- github-sync.md
- session-replay — knowledge
- hitl-ask.ts
- analytics-browser.test.tsx
- CONTEXT.md — For AI agents using wombo as a tool
- run-task-browser.tsx
- i18n.md
- registry-parity.test.ts
- gh
- Steps
- format-converter.ts
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Source files (read and relevant):
- analytics-git.ts
- Test-Driven Development
- README.md
- Process
- comment.md
- writing-for-agents/SKILL.md
- StubDaemonClient
- Steps
- json
- prompt-compress.ts
- done
- wayfinder/SKILL.md
- Domain Docs
- onboarding-helpers.ts
- ref_node_child_process
- Commands
- Process
- Migrate to Shoehorn
- check-attribution.ts
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- ADDED Requirements
- comments.md
- portless.ts
- <Questionnaire title>
- fake-agent-runner.ts
- writing-shape/SKILL.md
- openspec/specs/scheduler-concurrency-accounting/spec.md
- Triage Labels
- Sections
- writing-beats/SKILL.md
- running-agents.md
- loop-me/SKILL.md
- genesis.md
- chief-of-staff/SKILL.md
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- global-flags.ts
- Issue tracker: GitLab
- spawn.ts
- Domain Docs
- Issue tracker: Local Markdown
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- quest complete
- Local changes to vendored skills
- resume.md
- retry.md
- Fake Agent
- 2026-03-21-fix-scheduler-launch-and-concurrency/tasks.md
- describe.md

## God Nodes (most connected - your core abstractions)
1. `t()` - 198 edges
2. `WomboConfig` - 150 edges
3. `react` - 118 edges
4. `Explore mode guidelines and usage rules` - 114 edges
5. `useI18n()` - 113 edges
6. `ink` - 111 edges
7. `DaemonState` - 106 edges
8. `AgentRunner` - 101 edges
9. `t` - 97 edges
10. `json()` - 76 edges

## Surprising Connections (you probably didn't know these)
- `Flags` --references--> `done()`  [INFERRED]
  docs/src/content/docs/reference/commands/tasks.md → src/commands/sync.ts
- `Daemon` --references--> `AgentRunner`  [INFERRED]
  docs/src/content/docs/architecture/overview.md → src/daemon/agent-runner.ts
- `Seams` --references--> `ReplayRecorder`  [INFERRED]
  .wombo-combo/quests/session-replay/knowledge.md → src/daemon/replay-recorder.ts
- `Why `concurrencyPinned` doesn't protect persisted state` --references--> `Scheduler`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/design.md → src/daemon/scheduler.ts
- `Modified Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/proposal.md → src/lib/eval-score.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (256 total, 37 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (94): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+86 more)

### Community 1 - "AgentRunner"
Cohesion: 0.14
Nodes (7): Assistant (Build · claude-sonnet-4.6 · 6.2s), AgentRunner, getConflictDiffs(), runSafeCmd(), TaskEditorProps, QuestPromptContext, Task

### Community 2 - "verifier.ts"
Cohesion: 0.09
Nodes (23): Daemon and TUI, BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult (+15 more)

### Community 3 - "WomboConfig"
Cohesion: 0.09
Nodes (38): AbortCommandOptions, cmdAbort(), ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, EvalCommandOptions, GenesisCommandOptions (+30 more)

### Community 4 - "splash-screen.tsx"
Cohesion: 0.06
Nodes (44): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard, channelLabel(), ChannelResult (+36 more)

### Community 5 - "planner-project-context.test.ts"
Cohesion: 0.29
Nodes (4): ErrandWizardProps, ErrandSpec, formatProjectContext(), tempDirs

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (60): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+52 more)

### Community 7 - "run-tui-app.tsx"
Cohesion: 0.04
Nodes (70): saveConfig(), ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayout(), ChromeLayoutProps, ChromeTitleContext, ChromeTopBar() (+62 more)

### Community 8 - "mapping.ts"
Cohesion: 0.12
Nodes (27): loadAllArchivedQuests(), assertId(), assertKind(), deleteMapping(), FieldConflict, hashComment(), hashQuest(), hashTask() (+19 more)

### Community 9 - "task-store.ts"
Cohesion: 0.15
Nodes (34): Top-level options, archiveDir(), atomicWrite(), createBackup(), defaultMeta(), ensureDir(), flattenTask(), getArchiveDir() (+26 more)

### Community 10 - "dashboard-usage.ts"
Cohesion: 0.14
Nodes (10): addInto(), cloneTotals(), DashboardUsageReader, emptyTotals(), mergeInto(), normalizeUsageRecord(), TaskQuestLookup, UsageRefreshResult (+2 more)

### Community 11 - "config.ts"
Cohesion: 0.05
Nodes (86): citty, abortCommand, cleanupCommand, commentCommand, completionCommand, daemonCommand, describeCommand, evalCommand (+78 more)

### Community 12 - "config.md"
Cohesion: 0.11
Nodes (17): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `comments`, `defaults`, `git` (+9 more)

### Community 13 - "routing.ts"
Cohesion: 0.08
Nodes (32): AgentProfile, resolveAgentBin(), Operation, detectHarnessFromBin(), getHarness(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE (+24 more)

### Community 14 - "commands/sync.ts"
Cohesion: 0.08
Nodes (49): clientFor(), cmdSyncLabels(), cmdSyncPull(), cmdSyncPush(), cmdSyncRun(), cmdSyncStatus(), cmdSyncWatch(), failure() (+41 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.07
Nodes (73): buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES (+65 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.09
Nodes (48): DashboardStoreContext, DashboardMetricsContext, DashboardMetricsValue, DASHBOARD_EVENTS, DashboardMetricsProviderProps, defaultLoadTaskQuests(), initialValue(), REAL_TIMERS (+40 more)

### Community 17 - "Scheduler"
Cohesion: 0.07
Nodes (22): D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, 1. Extend SchedulerConfig, 1. Concurrency Pinning — Scheduler.start(), Scheduler, SchedulerConfig, SchedulerDeps, buildChainFrom(), buildDepGraph() (+14 more)

### Community 18 - "project-store.ts"
Cohesion: 0.07
Nodes (75): useChromeHideQuitHint(), ConfirmDialog(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps (+67 more)

### Community 19 - "github-client.ts"
Cohesion: 0.08
Nodes (31): apiUrlFor(), createGitHubClient(), paginate(), rateLimitWaitMs(), request(), CreateIssueInput, CreateLabelInput, DetectedRepo (+23 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.08
Nodes (37): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRowProps, DashboardScreenProps, DEFAULT_STORE (+29 more)

### Community 21 - "push.ts"
Cohesion: 0.07
Nodes (41): SyncOptions, AI_ATTRIBUTION_LINE_PATTERNS, containsAiAttribution(), lineHasAiAttribution(), stripAiAttribution(), setCommentGithubUrl(), Pending, CycleOptions (+33 more)

### Community 22 - "toon.ts"
Cohesion: 0.12
Nodes (34): commandToSchema(), encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGraph() (+26 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.06
Nodes (54): Architecture, buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), resolveGlobalFlagsAndCommand(), runCittyCommand(), isSyncAuto(), checkDevModeGuard() (+46 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (24): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), installDeps(), isWorktreesDirEmpty() (+16 more)

### Community 25 - "Difficulty"
Cohesion: 0.06
Nodes (39): ParsedLaunchArgs, abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand, pauseCommand (+31 more)

### Community 26 - "ref_bun_test"
Cohesion: 0.04
Nodes (31): root, CONFIG_FILE, DEFAULT_CONFIG, normalizeReplayConfig(), replayRetentionOptions(), InitWriterConfig, createTestStreams(), renderLive() (+23 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.05
Nodes (25): Arguments, Global flags, Flags, Global flags, Arguments, Global flags, Arguments, Global flags (+17 more)

### Community 29 - "schema.ts"
Cohesion: 0.26
Nodes (17): hasKey(), aliasHint(), allCommandSchemas(), descriptionOf(), findCommandDef(), flagDescriptionOf(), flagKeyName(), getVersion() (+9 more)

### Community 30 - "genesis-planner.ts"
Cohesion: 0.20
Nodes (14): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput, parseGenesisYaml() (+6 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (5): DaemonClient, CommandMap, EvtStateSnapshot, DaemonMonitorAdapter(), TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (29): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+21 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.19
Nodes (20): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+12 more)

### Community 34 - "harness/index.ts"
Cohesion: 0.14
Nodes (24): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+16 more)

### Community 35 - "eval-score.ts"
Cohesion: 0.08
Nodes (41): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+33 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.13
Nodes (32): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+24 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.16
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - "setup-matt-pocock-skills/SKILL.md"
Cohesion: 0.17
Nodes (8): 1. Explore, 2. Present findings and ask, 3. Confirm and edit, 4. Write, 5. Done, Process, Setup Matt Pocock's Skills, Triage Labels

### Community 40 - "task-schema.ts"
Cohesion: 0.16
Nodes (19): DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema, PRIORITY_ORDER, SchemaIssue, TASK_ARRAY_FIELDS, TASK_REQUIRED_FIELDS (+11 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (34): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES, isObject() (+26 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics-summary.ts"
Cohesion: 0.21
Nodes (15): UsageOverlayViewProps, AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions() (+7 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (40): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+32 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.10
Nodes (24): boundValue(), DEFAULT_KEEP_PER_TASK, FileState, firstLine(), normalizeOpenCodeEvent(), num(), recordLabel(), REPLAY_SCHEMA_VERSION (+16 more)

### Community 48 - "quest-wizard.tsx"
Cohesion: 0.08
Nodes (29): QuestPickerViewProps, QuestSummary, defaultProps(), EMPTY_USAGE, makeQuest(), makeSummary(), QuestSummary, buildDifficultyItems() (+21 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "tdd-baseline-integration.test.ts"
Cohesion: 0.08
Nodes (27): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+19 more)

### Community 51 - "saveTaskToStore"
Cohesion: 0.06
Nodes (60): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), setupMergeDriver(), POST_MERGE_JOURNAL, VerificationSummary, saveTaskToStore() (+52 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.15
Nodes (32): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+24 more)

### Community 54 - "msg"
Cohesion: 0.12
Nodes (51): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+43 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "output"
Cohesion: 0.09
Nodes (34): cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), cmdLogs(), colorize(), followLog() (+26 more)

### Community 57 - "prompt.ts"
Cohesion: 0.14
Nodes (21): renderStatusGroups(), Comment, formatHunksForLLM(), portlessUrl(), capComments(), formatCommentList(), formatCommentsSection(), formatSubtask() (+13 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.06
Nodes (35): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+27 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "init-app.tsx"
Cohesion: 0.14
Nodes (22): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+14 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.09
Nodes (15): ConnectionState, EventMap, useDashboardMetrics(), clientState(), DashboardDaemonClient, DashboardMetricsProvider(), mapConnection(), TimerApi (+7 more)

### Community 63 - "ui.ts"
Cohesion: 0.31
Nodes (10): colorize(), elapsed(), FG, pad(), padLeft(), printDashboard(), printFeatureSelection(), renderDashboard() (+2 more)

### Community 64 - "commands/tui.ts"
Cohesion: 0.06
Nodes (54): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+46 more)

### Community 65 - "useI18n"
Cohesion: 0.07
Nodes (77): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+69 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.09
Nodes (22): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, 6. Never author or attribute anything as Claude Code, Claude or any other AI, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo (+14 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.06
Nodes (13): escMenuCursor(), eventually(), selectFromEscMenu(), waitFor(), stripAnsi(), LiveFakeClient, makeMinimalConfig(), openDashboardFromMenu() (+5 more)

### Community 68 - "analytics.ts"
Cohesion: 0.07
Nodes (29): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+21 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (14): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+6 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.20
Nodes (18): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+10 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.16
Nodes (25): MergeCommandDeps, normalizePostMergeConfig(), Git, isComplete(), isJournal(), Journal, JournalOperation, journalPath() (+17 more)

### Community 74 - "InkDaemonTUI"
Cohesion: 0.12
Nodes (5): InkDaemonTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 75 - "templates.ts"
Cohesion: 0.21
Nodes (14): AGENT_TEMPLATE_PATH, applyHitlAwareness(), applyPlaceholders(), buildTddBlock(), joinFrontmatter(), PATCH_BODY_END_PATH, PATCH_BODY_START_PATH, PATCH_DESCRIPTION_END_PATH (+6 more)

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
Cohesion: 0.13
Nodes (33): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+25 more)

### Community 81 - "t"
Cohesion: 0.09
Nodes (34): addCommand, ensureInitialized(), linkCommand, listCommand, outputArg, refArg, showCommand, startCommand (+26 more)

### Community 82 - "tdd-verifier.test.ts"
Cohesion: 0.17
Nodes (20): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions, TddVerificationResult, TestBaseline (+12 more)

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.18
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - ".submitTask"
Cohesion: 0.09
Nodes (18): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+10 more)

### Community 86 - "monitor.ts"
Cohesion: 0.08
Nodes (20): extractActivity(), formatEventForLog(), MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd() (+12 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.09
Nodes (24): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+16 more)

### Community 88 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "react"
Cohesion: 0.05
Nodes (54): ink, react, App(), AppProps, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardStep (+46 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (20): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+12 more)

### Community 94 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 95 - "commands/launch.ts"
Cohesion: 0.16
Nodes (23): analyzeBarrelFile(), BarrelFile, cmdLaunch(), delegateToDaemon(), detectUnprotectedBarrels(), findIndexFiles(), getGitattributesUnionFiles(), waitForDaemonCompletion() (+15 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.12
Nodes (17): Agent Analytics, Commands, Comments, Coverage limitations, Install, Languages, Launch options, License (+9 more)

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
Cohesion: 0.33
Nodes (14): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+6 more)

### Community 102 - "lib/tasks.ts"
Cohesion: 0.15
Nodes (18): deleteTaskFile(), removeTaskFromStore(), allTaskIds(), areDependenciesMet(), ensureFeaturesFile, ensureWomboDir(), FEATURES_TEMPLATE_PATH, findInList() (+10 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "test-runner.ts"
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 105 - "ReplayStore"
Cohesion: 0.28
Nodes (7): assertSafe(), isSafeSegment(), ReplayStore, summarize(), seedReplay(), seed(), seed()

### Community 106 - "harness-opencode.test.ts"
Cohesion: 0.13
Nodes (17): Fallback chains, Routing, HARNESS_IDS, isHarnessId(), OPERATIONS, listHarnesses(), detectAgentType(), base (+9 more)

### Community 107 - "lib/launcher.ts"
Cohesion: 0.14
Nodes (27): 7. Verify, 1. Are agents spawned with `detached: true` and `unref()`?, HarnessId, ResolvedRoute, resolveRoute(), resolveRouteEnv(), spawnHarness(), Normalizer (+19 more)

### Community 108 - "quest-store.ts"
Cohesion: 0.23
Nodes (21): applyGenesisResult(), normalizeQuest(), archivedKnowledgeDir(), archivedKnowledgeFilePath(), archivedQuestFilePath(), archiveQuest(), atomicWrite(), deleteQuest() (+13 more)

### Community 109 - ".handleStart"
Cohesion: 0.07
Nodes (26): Task file schema, Context, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+18 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (62): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+54 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "citty-bridge.ts"
Cohesion: 0.28
Nodes (11): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+3 more)

### Community 113 - "daemon-agent-runner.test.ts"
Cohesion: 0.09
Nodes (18): CommandResult, CommandRunner, defaultCommandRunner(), PostMergeRequest, Env, EnvOpts, makeEnv(), ReentrantRunner (+10 more)

### Community 114 - "sync-push.test.ts"
Cohesion: 0.07
Nodes (33): ensureLabels(), LABEL_CATALOG, labelsForQuest(), findMappingByIssue(), readMapping(), validateEntry(), writeMapping(), norm() (+25 more)

### Community 115 - "wishlist-store.ts"
Cohesion: 0.24
Nodes (16): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, addItem(), atomicWrite(), deleteItem() (+8 more)

### Community 116 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

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
Cohesion: 0.16
Nodes (14): parseReplay(), ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay() (+6 more)

### Community 122 - "agent-runner.ts"
Cohesion: 0.05
Nodes (71): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+63 more)

### Community 123 - "saveAllTasksToStore"
Cohesion: 0.16
Nodes (14): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+6 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.33
Nodes (8): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles(), makeBaseline()

### Community 125 - "run-daemon-monitor.tsx"
Cohesion: 0.08
Nodes (38): AgentStatus, DaemonAgentState, EvtAgentActivity, EvtAgentStatusChange, EvtBuildResult, EvtHitlQuestion, EvtMergeResult, EvtSchedulerStatus (+30 more)

### Community 126 - "teach/SKILL.md"
Cohesion: 0.07
Nodes (25): Learning Record Format, Numbering, Optional sections, Supersession, Template, What does _not_ qualify, When to write a learning record, MISSION.md Format (+17 more)

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

### Community 131 - "comments.ts"
Cohesion: 0.09
Nodes (28): addComment(), AddCommentInput, assertSafeId(), CommentRef, COMMENTS_DIR, commentsDir(), compareComments(), findCommentPath() (+20 more)

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "pull.ts"
Cohesion: 0.07
Nodes (68): CommentRole, listComments(), QuestStatus, remoteQuestView(), remoteSyncHash(), remoteTaskView, TRIAGE_LABELS, triageLabelsFor() (+60 more)

### Community 137 - "wishlist-picker.tsx"
Cohesion: 0.22
Nodes (15): UseWishlistStoreResult, formatDate(), truncateText(), AddInput(), OverlayFooter(), OverlayItemList(), WishlistOverlay(), WishlistOverlayProps (+7 more)

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (18): buildKeywords(), buildScoutIndex(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex() (+10 more)

### Community 140 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 142 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 143 - "lib/quest.ts"
Cohesion: 0.16
Nodes (14): createBlankQuest(), deepMerge(), emptyConstraints(), QUEST_ARRAY_FIELDS, QUEST_REQUIRED_FIELDS, QUEST_STATUS_ORDER, QuestConstraints, QuestFile (+6 more)

### Community 144 - "quest-planner.ts"
Cohesion: 0.14
Nodes (26): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), canonicalizeOutput(), loadProjectContext(), abortedPlanners, activePlanners, applyPlanToQuest() (+18 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "replay-browser.test.tsx"
Cohesion: 0.27
Nodes (6): Harness, mount(), h, seedTask(), wait(), waitFor()

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

### Community 153 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 154 - "install.md"
Cohesion: 0.40
Nodes (4): Install, Next, Shell completions, Working on wombo-combo itself

### Community 155 - "docs/tsconfig.json"
Cohesion: 0.40
Nodes (4): exclude, extends, include, astro/tsconfigs/strict

### Community 156 - "HTML Report Format"
Cohesion: 0.10
Nodes (18): Call-graph collapse, Candidate card, Cross-section (good for layered shallowness), Diagram patterns, Hand-built boxes-and-arrows (when Mermaid's layout fights you), Header, HTML Report Format, Mass diagram (good for "interface as wide as implementation") (+10 more)

### Community 157 - "template.sh"
Cohesion: 0.22
Nodes (18): ask(), ask_secret(), banner(), _clear(), _existing(), finish(), note(), open_url() (+10 more)

### Community 158 - "DaemonState"
Cohesion: 0.08
Nodes (13): Assistant (Build · claude-sonnet-4.6 · 7.5s), normalizeCommentsConfig(), DaemonState, Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts() (+5 more)

### Community 159 - "replay.md"
Cohesion: 0.22
Nodes (8): Arguments, Arguments, Flags, Global flags, Global flags, Global flags, replay list, replay show

### Community 160 - "Ask Matt"
Cohesion: 0.12
Nodes (14): Phase boundaries, Primary and secondary sources, The five options, The tree, These are judgement calls, Ask Matt, Codebase health, Context hygiene (+6 more)

### Community 161 - "wombo-combo Agent Context"
Cohesion: 0.40
Nodes (4): Operational Rules, Task Structure, wombo-combo Agent Context, Your Environment

### Community 162 - "Diagnosing Bugs"
Cohesion: 0.13
Nodes (14): Completion criterion: a tight loop that goes red, Diagnosing Bugs, Minimise, Non-deterministic bugs, Phase 1: Build a feedback loop, Phase 2: Reproduce + minimise, Phase 3: Hypothesise, Phase 4: Instrument (+6 more)

### Community 163 - "docs-starlight knowledge"
Cohesion: 0.50
Nodes (3): Decisions, docs-starlight knowledge, File ownership

### Community 164 - "github-sync.md"
Cohesion: 0.15
Nodes (12): Authentication, Checking the mirror, Commands, Configuration, Conflicts, Known limits, Labels, Manual and auto mode (+4 more)

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 167 - "analytics-browser.test.tsx"
Cohesion: 0.22
Nodes (7): ANALYTICS_REFRESH_MS, Harness, mount(), h, result(), wait(), waitFor()

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.25
Nodes (7): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, What is wombo?

### Community 169 - "run-task-browser.tsx"
Cohesion: 0.13
Nodes (28): QuestPickerApp(), QuestPickerScreenProps, runQuestPickerInk(), analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions (+20 more)

### Community 171 - "i18n.md"
Cohesion: 0.40
Nodes (4): Adding a locale, Checks, Choosing a language, Writing translatable code

### Community 173 - "registry-parity.test.ts"
Cohesion: 0.14
Nodes (6): BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), buildAliasMap(), GLOBAL_FLAGS, ENTRY

### Community 174 - "gh"
Cohesion: 0.20
Nodes (12): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Rules, Mirroring to GitHub (+4 more)

### Community 175 - "Steps"
Cohesion: 0.17
Nodes (11): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 8. Commit, Notes (+3 more)

### Community 177 - "format-converter.ts"
Cohesion: 0.27
Nodes (11): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+3 more)

### Community 180 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 184 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 187 - "Source files (read and relevant):"
Cohesion: 0.09
Nodes (26): Context, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Impact (+18 more)

### Community 191 - "analytics-git.ts"
Cohesion: 0.22
Nodes (12): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+4 more)

### Community 192 - "Test-Driven Development"
Cohesion: 0.15
Nodes (10): Designing for Mockability, When to Mock, Anti-patterns, Rules of the loop, Seams: where tests go, Test-Driven Development, What a good test is, Bad Tests (+2 more)

### Community 193 - "README.md"
Cohesion: 0.12
Nodes (13): Forbidden, everywhere, How it is enforced, Limits, No AI attribution, Configuration, Custom command template, Profile fields, Secrets never go in config (+5 more)

### Community 195 - "Process"
Cohesion: 0.15
Nodes (12): 1. Gather context, 2. Explore the codebase (optional), 3. Draft vertical slices, 4. Quiz the user, 5. Publish the tickets to the configured tracker, Acceptance criteria, Blocked by, <NN>: <Ticket title> (+4 more)

### Community 196 - "comment.md"
Cohesion: 0.12
Nodes (15): Arguments, Arguments, Arguments, Arguments, comment add, comment link, comment list, comment show (+7 more)

### Community 197 - "writing-for-agents/SKILL.md"
Cohesion: 0.15
Nodes (11): Context pointers, Information hierarchy, Leading words, Invocation, Router skills, Skill mechanics, Splitting by invocation, Pruning (+3 more)

### Community 199 - "Steps"
Cohesion: 0.11
Nodes (16): Files, Implementation vs Review, Reference, Steps, 1. Detect the environment, 2. Install dependency-cruiser, 3. Write the config, 4. Wire it into the checks (+8 more)

### Community 200 - "json"
Cohesion: 0.11
Nodes (21): Flags, Flags, Flags, Flags, Flags, Global flags, Global flags, Global flags (+13 more)

### Community 201 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 202 - "done"
Cohesion: 0.10
Nodes (16): Claim, progress, resolve, Comments, Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror), Pull requests as a triage surface, The mirror is automated, Vocabulary, Wayfinding operations (used by `/wayfinder`), When a skill says "fetch the relevant ticket" (+8 more)

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 205 - "onboarding-helpers.ts"
Cohesion: 0.33
Nodes (9): buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks(), formatProfileAsMarkdown(), runBrownfieldScout(), runLlmSynthesis(), formatScoutTree(), countFiles() (+1 more)

### Community 206 - "ref_node_child_process"
Cohesion: 0.08
Nodes (19): errMsg(), ReplayRecorder, ReplayRecorderOptions, Tracked, captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat() (+11 more)

### Community 207 - "Commands"
Cohesion: 0.22
Nodes (7): Commands, Dependencies and ordering, Fields, Commands, Token Usage Tracking, usage(), tasks()

### Community 208 - "Process"
Cohesion: 0.25
Nodes (7): 1. Pin the fixed point, 2. Identify the spec source, 3. Identify the standards sources, 4. Spawn both sub-agents in parallel, 5. Aggregate, Process, Why two axes

### Community 209 - "Migrate to Shoehorn"
Cohesion: 0.20
Nodes (9): `as Type` → `fromPartial()`, `as unknown as Type` → `fromAny()`, Install, Large objects with few needed properties, Migrate to Shoehorn, Migration patterns, When to use each, Why shoehorn? (+1 more)

### Community 210 - "check-attribution.ts"
Cohesion: 0.39
Nodes (6): ALLOWLIST, Finding, git(), scanCommits(), scanText(), scanTrackedFiles()

### Community 211 - "Steps"
Cohesion: 0.22
Nodes (8): 1. Ask scope, 2. Copy the hook script, 3. Add hook to settings, 4. Ask about customization, 5. Verify, Setup Git Guardrails, Steps, What Gets Blocked

### Community 212 - "Scaffold Exercises"
Cohesion: 0.22
Nodes (8): Directory naming, Example: stubbing from a plan, Exercise variants, Lint rules summary, Moving/renaming exercises, Required files, Scaffold Exercises, Workflow

### Community 213 - "to-spec/SKILL.md"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Process, Solution, Testing Decisions, User Stories

### Community 214 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 215 - "comments.md"
Cohesion: 0.25
Nodes (7): Author resolution, CLI, How comments reach agents, In the TUI, Merge-friendliness, Roles, Storage layout

### Community 216 - "portless.ts"
Cohesion: 0.47
Nodes (8): ensureProxyRunning(), isPortlessAvailable(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus(), resolvePortlessBin(), wrapWithPortless()

### Community 217 - "<Questionnaire title>"
Cohesion: 0.25
Nodes (7): Anything else?, Context, Document structure, How to answer, <Questionnaire title>, <Theme heading>, What load is the system expected to handle at launch?

### Community 218 - "fake-agent-runner.ts"
Cohesion: 0.44
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 219 - "writing-shape/SKILL.md"
Cohesion: 0.25
Nodes (7): Conversational feel, Format arguments to actually have, Grounding, Out of scope, Pulling from the pile, The loop, Writing rhythm

### Community 220 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.25
Nodes (7): Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 222 - "Sections"
Cohesion: 0.33
Nodes (5): Evidence, Guidance, Merge Danger, Sections, Summary

### Community 223 - "writing-beats/SKILL.md"
Cohesion: 0.33
Nodes (5): Ending the journey, Grounding, Pulling from the pile, What is a beat, Writing rhythm

### Community 224 - "running-agents.md"
Cohesion: 0.33
Nodes (5): Cleanup, Launch, Merge, Monitoring and recovery, Verification

### Community 225 - "loop-me/SKILL.md"
Cohesion: 0.40
Nodes (4): Definition of done, The loop lens, The workspace, Vocabulary

### Community 226 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 227 - "chief-of-staff/SKILL.md"
Cohesion: 0.50
Nodes (3): Schedules, Strategic View, Subagents

### Community 228 - "hitl-loop.template.sh"
Cohesion: 0.83
Nodes (3): capture(), hitl-loop.template.sh script, step()

### Community 229 - "GLOSSARY.md Format"
Cohesion: 0.50
Nodes (3): GLOSSARY.md Format, Rules, Structure

### Community 230 - "writing-fragments/SKILL.md"
Cohesion: 0.50
Nodes (3): File format, What is a fragment, Writing rhythm

### Community 231 - "global-flags.ts"
Cohesion: 0.39
Nodes (4): extractGlobalFlags(), ExtractResult, GlobalFlags, ResolvedCommand

### Community 232 - "Issue tracker: GitLab"
Cohesion: 0.33
Nodes (6): Conventions, Issue tracker: GitLab, Merge requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 233 - "spawn.ts"
Cohesion: 0.33
Nodes (6): inlineAgentDefinition(), PROMPT_ARG_MAX, SpawnTarget, stripFrontmatter(), TEMPLATES_DIR, GENERALIST_TEMPLATE_PATH

### Community 234 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 235 - "Issue tracker: Local Markdown"
Cohesion: 0.33
Nodes (5): Conventions, Issue tracker: Local Markdown, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 248 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 249 - "quest complete"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest complete

### Community 251 - "resume.md"
Cohesion: 0.50
Nodes (3): Flags, Global flags, r()

### Community 252 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 253 - "Fake Agent"
Cohesion: 0.50
Nodes (3): Behavior, Fake Agent, Usage

### Community 254 - "2026-03-21-fix-scheduler-launch-and-concurrency/tasks.md"
Cohesion: 0.50
Nodes (3): 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1794 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `splash-screen.tsx`, `run-tui-app.tsx`, `task-store.ts`, `config.ts`, `commands/sync.ts`, `ink/index.ts`, `dashboard.tsx`, `toon.ts`, `lib/i18n.ts`, `worktree.ts`, `Difficulty`, `schema.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `eval-score.ts`, `task-schema.ts`, `i18n.md`, `lib/replay.ts`, `msg`, `output`, `commands/tasks.md`, `ui.ts`, `commands/tui.ts`, `useI18n`, `templates.ts`, `Commands`, `commands/usage.ts`, `tdd-verifier.test.ts`, `commands/completion.ts`, `esc-menu.tsx`, `portless.ts`, `react`, `commands/launch.ts`, `lib/tasks.ts`, `graph.ts`, `agent-runner.ts`, `run-daemon-monitor.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._
- **Why does `json()` connect `json` to `replay.md`, `wishlist.md`, `genesis.md`, `wombo-combo`, `comment.md`, `commands/tasks.md`, `done`, `daemon.md`, `github-client.ts`, `retry.md`, `quest.md`, `commands/team.md`, `quest complete`, `resume.md`, `index.md`, `describe.md`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.14404223227752638 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `verifier.ts`, `splash-screen.tsx`, `pull.ts`, `protocol.ts`, `run-tui-app.tsx`, `mapping.ts`, `task-store.ts`, `planner-project-context.test.ts`, `config.ts`, `routing.ts`, `ink/index.ts`, `quest-planner.ts`, `Scheduler`, `project-store.ts`, `lib/quest.ts`, `push.ts`, `worktree.ts`, `Difficulty`, `ref_bun_test`, `analytics-lifecycle.test.ts`, `genesis-planner.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `DaemonState`, `eval-score.ts`, `Daemon`, `run-task-browser.tsx`, `analytics-measurements.test.ts`, `tdd-baseline-integration.test.ts`, `saveTaskToStore`, `msg`, `output`, `prompt.ts`, `commands/tui.ts`, `analytics.ts`, `post-merge.ts`, `InkDaemonTUI`, `templates.ts`, `onboarding-helpers.ts`, `ref_node_child_process`, `claims.ts`, `commands/usage.ts`, `t`, `tdd-verifier.test.ts`, `portless.ts`, `daemon-test-baseline.test.ts`, `commands/launch.ts`, `lib/tasks.ts`, `analytics-integration.test.ts`, `lib/launcher.ts`, `daemon-agent-runner.test.ts`, `graph.ts`, `agent-runner.ts`, `tdd-baseline-pipeline.test.ts`, `run-daemon-monitor.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._