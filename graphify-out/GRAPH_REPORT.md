# Graph Report - wombo-combo  (2026-10-12)

## Corpus Check
- 655 files · ~705,943 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 5613 nodes · 16321 edges · 242 communities (202 shown, 40 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 832 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e4bdb6f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- commands/upgrade.ts
- tmpDir
- protocol.ts
- run-daemon-monitor.tsx
- ReplayStore
- lib/tasks.ts
- analytics-overlay.tsx
- t
- config.md
- routing.ts
- replay-viewer.test.tsx
- ink/index.ts
- dashboard-metrics.ts
- verifier.ts
- project-store.ts
- github-client.ts
- dashboard.tsx
- push.ts
- commands/stats.ts
- lib/i18n.ts
- worktree.ts
- features.test.ts
- ref_node_path
- hitl-channel.ts
- json
- schema.ts
- analytics-usage-command.test.ts
- DaemonClient
- agent-registry.ts
- commands/merge.ts
- harness/index.ts
- toon.ts
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- Issue tracker: GitLab
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- analytics-summary.ts
- merge-report.ts
- conflict-hunks.ts
- lib/replay.ts
- replay-diff.ts
- analytics-measurements.test.ts
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- msg
- quest.md
- output
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- init-form.tsx
- dashboard-provider.test.tsx
- commands/status.ts
- commands/tui.ts
- useI18n
- AGENTS.md — Instructions for AI agents working on wombo-combo
- tdd-baseline-pipeline.test.ts
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
- router.ts
- tdd-verifier.test.ts
- Triage
- commands/completion.ts
- .submitTask
- run-quest-picker.tsx
- esc-menu.tsx
- test-detection.ts
- wishlist.md
- ref_bun_test
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- changelog.ts
- commands/launch.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- gen-command-docs.ts
- Process
- FixtureRunner
- test-runner.ts
- Issue tracker: Local Markdown
- config.ts
- lib/launcher.ts
- quest-planner.ts
- Scheduler
- maxConcurrent
- daemon.md
- registry-parity.test.ts
- daemon-agent-runner.test.ts
- loadConfig
- ref_node_stream
- graph.ts
- cli-smoke.test.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- chrome.tsx
- agent-runner.ts
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- tdd-baseline-integration.test.ts
- DaemonAgentState
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- comments.ts
- Process
- pull.ts
- react-devtools-core.ts
- dashboard-provider.tsx
- scout.ts
- gen-config-docs.ts
- Codebase Design
- guides/team.md
- genesis-planner.ts
- merge-resolver-agent.md
- During the session
- overview.md
- 2026-03-21-fix-concurrency-boot-reset/proposal.md
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- Changelog
- install.md
- docs/tsconfig.json
- HTML Report Format
- template.sh
- genesis.md
- replay.md
- Ask Matt
- wombo-combo Agent Context
- Diagnosing Bugs
- docs-starlight knowledge
- auto.ts
- session-replay — knowledge
- hitl-ask.ts
- analytics-browser.test.tsx
- CONTEXT.md — For AI agents using wombo as a tool
- run-task-browser.tsx
- Commands
- scheduler.ts
- gh
- Steps
- LiveFakeClient
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Requirement: Fake-agent tasks bypass inter-launch stagger
- .allComplete
- analytics-git.ts
- Test-Driven Development
- README.md
- Process
- comment.md
- writing-for-agents/SKILL.md
- StubDaemonClient
- Steps
- sync.md
- 2026-03-21-fix-scheduler-oversubscription/tasks.md
- github-sync.md
- wayfinder/SKILL.md
- Domain Docs
- ReplayRecorder
- Process
- Migrate to Shoehorn
- check-attribution.ts
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- comments.md
- <Questionnaire title>
- writing-shape/SKILL.md
- Triage Labels
- Sections
- writing-beats/SKILL.md
- loop-me/SKILL.md
- chief-of-staff/SKILL.md
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- Domain Docs
- Process
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md
- No AI attribution
- StubDaemonClient
- Local changes to vendored skills
- Agent Analytics
- NoLaunchRunner

## God Nodes (most connected - your core abstractions)
1. `t()` - 199 edges
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
- `Assistant (Build · claude-sonnet-4.6 · 7.5s)` --references--> `DaemonState`  [INFERRED]
  ._p.md → src/daemon/state.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (242 total, 40 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (99): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+91 more)

### Community 1 - "AgentRunner"
Cohesion: 0.15
Nodes (4): Assistant (Build · claude-sonnet-4.6 · 6.2s), AgentRunner, getConflictDiffs(), runSafeCmd()

### Community 2 - "browser.ts"
Cohesion: 0.10
Nodes (17): Cleanup, Daemon and TUI, Launch, Merge, Monitoring and recovery, Verification, BrowserConfig, allocateDebugPort() (+9 more)

### Community 3 - "WomboConfig"
Cohesion: 0.10
Nodes (39): AbortCommandOptions, ParsedLaunchArgs, CleanupOptions, CommentOptions, EvalCommandOptions, GenesisCommandOptions, HistoryCommandOptions, LaunchCommandOptions (+31 more)

### Community 4 - "commands/upgrade.ts"
Cohesion: 0.19
Nodes (16): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+8 more)

### Community 5 - "tmpDir"
Cohesion: 0.06
Nodes (35): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+27 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (61): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+53 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.03
Nodes (104): ChromeLayout(), DashboardScreen(), DashboardStore, DashboardStoreContext, EscMenuProvider(), createI18n(), EN_STRINGS, getLocaleT() (+96 more)

### Community 8 - "ReplayStore"
Cohesion: 0.17
Nodes (14): cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution(), assertSafe() (+6 more)

### Community 9 - "lib/tasks.ts"
Cohesion: 0.06
Nodes (67): Top-level options, Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities (+59 more)

### Community 10 - "analytics-overlay.tsx"
Cohesion: 0.18
Nodes (22): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+14 more)

### Community 11 - "t"
Cohesion: 0.05
Nodes (58): citty, addCommand, commentCommand, ensureInitialized(), linkCommand, listCommand, outputArg, refArg (+50 more)

### Community 12 - "config.md"
Cohesion: 0.11
Nodes (17): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `comments`, `defaults`, `git` (+9 more)

### Community 13 - "routing.ts"
Cohesion: 0.12
Nodes (24): detectHarnessFromBin(), getHarness(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel(), legacyRoute(), MissingEnvError (+16 more)

### Community 14 - "replay-viewer.test.tsx"
Cohesion: 0.17
Nodes (13): parseReplay(), ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay() (+5 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.07
Nodes (61): buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES (+53 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.11
Nodes (39): EvtAgentActivity, EvtBuildResult, EvtMergeResult, EvtSchedulerStatus, initialValue(), ActivityEntry, advanceThroughput(), alignBucket() (+31 more)

### Community 17 - "verifier.ts"
Cohesion: 0.21
Nodes (11): BrowserVerifyResult, BrowserVerificationResult, extractBrowserErrorSummary(), extractTddErrorSummary(), BuildResult, extractErrorSummary(), FullVerificationResult, runBuild() (+3 more)

### Community 18 - "project-store.ts"
Cohesion: 0.06
Nodes (81): ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps (+73 more)

### Community 19 - "github-client.ts"
Cohesion: 0.09
Nodes (34): apiUrlFor(), createGitHubClient(), paginate(), rateLimitWaitMs(), request(), CreateGitHubClientOptions, CreateIssueInput, CreateLabelInput (+26 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.10
Nodes (33): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+25 more)

### Community 21 - "push.ts"
Cohesion: 0.06
Nodes (69): loadAllArchivedQuests(), Pending, assertId(), assertKind(), deleteMapping(), FieldConflict, findMappingByIssue(), hashComment() (+61 more)

### Community 22 - "commands/stats.ts"
Cohesion: 0.27
Nodes (12): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+4 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.09
Nodes (33): AVAILABLE_LOCALES, clearMissingKeys(), createInstance(), detectLocale(), DetectOptions, envDev(), getFixedT(), getLocale() (+25 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (24): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), featureBranchName(), installDeps() (+16 more)

### Community 25 - "features.test.ts"
Cohesion: 0.09
Nodes (31): commentsForShow(), buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow() (+23 more)

### Community 26 - "ref_node_path"
Cohesion: 0.03
Nodes (54): root, DEFAULT_CONFIG, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, StatusObserver, InitWriterConfig (+46 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "json"
Cohesion: 0.05
Nodes (36): Arguments, Global flags, Flags, Global flags, Arguments, Global flags, Arguments, Global flags (+28 more)

### Community 29 - "schema.ts"
Cohesion: 0.18
Nodes (18): hasKey(), aliasHint(), allCommandSchemas(), descriptionOf(), findCommandDef(), flagDescriptionOf(), flagKeyName(), getVersion() (+10 more)

### Community 30 - "analytics-usage-command.test.ts"
Cohesion: 0.18
Nodes (8): createAnalyticsRecord(), emptyUsageTotals(), rec(), rec(), REPO_ROOT, seed(), SRC_ENTRY, rec()

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (5): delegateToDaemon(), waitForDaemonCompletion(), DaemonClient, CommandMap, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.14
Nodes (24): AgentRegistryMode, InkPreflightResult, PreflightResult, PreflightViewProps, agentNameFromType(), AgentResolution, cacheAgent(), cacheDir() (+16 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.10
Nodes (31): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), defaultIsDaemonAlive(), evidenceFor(), git(), gitOk() (+23 more)

### Community 34 - "harness/index.ts"
Cohesion: 0.14
Nodes (24): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+16 more)

### Community 35 - "toon.ts"
Cohesion: 0.05
Nodes (75): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+67 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.12
Nodes (35): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+27 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.11
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - "Issue tracker: GitLab"
Cohesion: 0.17
Nodes (8): Conventions, Issue tracker: GitLab, Merge requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Setup Matt Pocock's Skills, Triage Labels

### Community 40 - "task-schema.ts"
Cohesion: 0.12
Nodes (26): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), mirrorMessage(), DIFFICULTY_ORDER (+18 more)

### Community 41 - "Daemon"
Cohesion: 0.11
Nodes (7): Assistant (Build · claude-sonnet-4.6 · 9.4s), Fix applied (`fix-concurrency-boot-reset`), Results, Root cause confirmed, What we did, Daemon, AutoSyncLoop

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (36): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+28 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics-summary.ts"
Cohesion: 0.24
Nodes (13): AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions(), filterExecutions() (+5 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (40): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+32 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.08
Nodes (30): TaskRow, boundValue(), FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent(), num(), recordLabel() (+22 more)

### Community 48 - "replay-diff.ts"
Cohesion: 0.31
Nodes (10): EXCLUDED_PATH_PREFIXES, captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat(), pathspecs(), runGit(), untrackedPaths() (+2 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (16): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+8 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.08
Nodes (38): createDaemonAgentState(), POST_MERGE_JOURNAL, addVerifiedAgent(), seedVerifiedAgents(), writeProjectConfig(), FakeGhBin, installBinWithoutGh(), installFakeGh() (+30 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (33): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+25 more)

### Community 54 - "msg"
Cohesion: 0.10
Nodes (62): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+54 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (34): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments (+26 more)

### Community 56 - "output"
Cohesion: 0.10
Nodes (27): cmdAbort(), cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdGenesis(), CreatedQuest (+19 more)

### Community 57 - "prompt.ts"
Cohesion: 0.08
Nodes (37): normalizeCommentsConfig(), formatHunksForLLM(), ensureProxyRunning(), isPortlessAvailable(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus() (+29 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.06
Nodes (35): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+27 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "init-form.tsx"
Cohesion: 0.22
Nodes (10): EditableField(), EditableFieldProps, enT, FieldDef, FIELDS, InitForm(), InitFormDefaults, InitFormProps (+2 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.10
Nodes (10): ConnectionState, EventMap, EvtStateSnapshot, DashboardDaemonClient, FakeClient, FakeTimers, mount(), streams() (+2 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.20
Nodes (17): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize() (+9 more)

### Community 64 - "commands/tui.ts"
Cohesion: 0.07
Nodes (52): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+44 more)

### Community 65 - "useI18n"
Cohesion: 0.06
Nodes (83): AgentStatus, EvtAgentStatusChange, DashboardAgent, useScreenInput(), t, useI18n(), AllTasksDetail(), AllTasksItem() (+75 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.09
Nodes (22): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, 6. Never author or attribute anything as Claude Code, Claude or any other AI, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo (+14 more)

### Community 67 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 68 - "analytics.ts"
Cohesion: 0.10
Nodes (22): buildAnalyticsSummary(), AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES (+14 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.07
Nodes (19): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+11 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.16
Nodes (23): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+15 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.16
Nodes (22): normalizePostMergeConfig(), Git, isComplete(), isJournal(), Journal, JournalOperation, journalPath(), listIncompleteOperations() (+14 more)

### Community 75 - "templates.ts"
Cohesion: 0.08
Nodes (39): cmdInit(), InitOptions, InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch() (+31 more)

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
Nodes (28): cmdUsage(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost(), formatNumber(), groupedToJSON() (+20 more)

### Community 81 - "router.ts"
Cohesion: 0.05
Nodes (54): abortCommand, cleanupCommand, completionCommand, describeCommand, evalCommand, genesisCommand, extractGlobalFlags(), ExtractResult (+46 more)

### Community 82 - "tdd-verifier.test.ts"
Cohesion: 0.17
Nodes (20): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions, TddVerificationResult, TestBaseline (+12 more)

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.19
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - ".submitTask"
Cohesion: 0.10
Nodes (16): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+8 more)

### Community 86 - "run-quest-picker.tsx"
Cohesion: 0.08
Nodes (33): defaultLoadTaskQuests(), QuestSummary, QuestPickerApp(), runQuestPickerInk(), UsageOverlayViewProps, buildTaskQuestMap(), normalizeUsageRecord(), TaskQuestLookup (+25 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.13
Nodes (18): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+10 more)

### Community 88 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.04
Nodes (66): ink, react, App(), AppProps, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardStep (+58 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.10
Nodes (28): git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states, tempDirs (+20 more)

### Community 94 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 95 - "commands/launch.ts"
Cohesion: 0.12
Nodes (22): Behavior, Fake Agent, Usage, analyzeBarrelFile(), BarrelFile, cmdLaunch(), DaemonProgress, describeNoLaunchable() (+14 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.15
Nodes (13): Commands, Comments, Install, Languages, Launch options, License, Multiple agent CLIs and models, No AI attribution (+5 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.07
Nodes (19): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+11 more)

### Community 101 - "gen-command-docs.ts"
Cohesion: 0.31
Nodes (15): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+7 more)

### Community 102 - "Process"
Cohesion: 0.29
Nodes (6): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard

### Community 104 - "test-runner.ts"
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 105 - "Issue tracker: Local Markdown"
Cohesion: 0.33
Nodes (5): Conventions, Issue tracker: Local Markdown, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 106 - "config.ts"
Cohesion: 0.07
Nodes (33): AgentProfile, AgentRegistryConfig, CommentsConfig, CONFIG_FILE, deepMerge(), DIFFICULTIES, isPlainObject(), MergeEscalationConfig (+25 more)

### Community 107 - "lib/launcher.ts"
Cohesion: 0.07
Nodes (42): 1. Are agents spawned with `detached: true` and `unref()`?, HarnessId, listHarnesses(), normalizeOutput(), ResolvedRoute, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness() (+34 more)

### Community 108 - "quest-planner.ts"
Cohesion: 0.10
Nodes (39): yaml, applyGenesisResult(), createBlankQuest(), emptyConstraints(), normalizeQuest(), abortedPlanners, activePlanners, applyPlanToQuest() (+31 more)

### Community 109 - "Scheduler"
Cohesion: 0.06
Nodes (38): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+30 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.04
Nodes (70): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+62 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "registry-parity.test.ts"
Cohesion: 0.19
Nodes (12): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+4 more)

### Community 113 - "daemon-agent-runner.test.ts"
Cohesion: 0.09
Nodes (18): CommandResult, CommandRunner, defaultCommandRunner(), FAKE_AGENT_SENTINEL, PostMergeDeps, Env, EnvOpts, makeEnv() (+10 more)

### Community 114 - "loadConfig"
Cohesion: 0.07
Nodes (54): clientFor(), cmdSyncLabels(), cmdSyncPull(), cmdSyncPush(), cmdSyncRun(), cmdSyncStatus(), cmdSyncWatch(), failure() (+46 more)

### Community 115 - "ref_node_stream"
Cohesion: 0.09
Nodes (41): HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, formatDate(), truncateText(), AddInput() (+33 more)

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

### Community 121 - "chrome.tsx"
Cohesion: 0.09
Nodes (30): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+22 more)

### Community 122 - "agent-runner.ts"
Cohesion: 0.10
Nodes (39): MaxEscalationTier, AgentRunnerConfig, FAKE_AGENT_VERIFICATION, isTierAllowed(), Tier25Result, RouteSelection, abortRebase(), beginRebase() (+31 more)

### Community 123 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 124 - "tdd-baseline-integration.test.ts"
Cohesion: 0.17
Nodes (10): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+2 more)

### Community 125 - "DaemonAgentState"
Cohesion: 0.21
Nodes (12): DaemonAgentState, SchedulerState, PersistedDaemonState, StateListener, QuestionPopupViewProps, DaemonAdapterProps, DaemonMonitorScreenProps, DaemonStore (+4 more)

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
Nodes (36): AI_ATTRIBUTION_LINE_PATTERNS, containsAiAttribution(), lineHasAiAttribution(), stripAiAttribution(), addComment(), AddCommentInput, assertSafeId(), CommentRef (+28 more)

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "pull.ts"
Cohesion: 0.07
Nodes (67): CommentRole, QuestStatus, remoteQuestView(), remoteSyncHash(), remoteTaskView, TRIAGE_LABELS, triageLabelsFor(), findMarker() (+59 more)

### Community 137 - "dashboard-provider.tsx"
Cohesion: 0.10
Nodes (20): DashboardMetricsContext, DashboardMetricsValue, clientState(), DASHBOARD_EVENTS, DashboardMetricsProvider(), DashboardMetricsProviderProps, mapConnection(), REAL_TIMERS (+12 more)

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 140 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 142 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 143 - "guides/team.md"
Cohesion: 0.40
Nodes (4): Conflict-free merges, Daemon behaviour, Recommended workflow, Task claims

### Community 144 - "genesis-planner.ts"
Cohesion: 0.08
Nodes (38): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree() (+30 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "2026-03-21-fix-concurrency-boot-reset/proposal.md"
Cohesion: 0.40
Nodes (4): Capabilities, Impact, Modified Capabilities, Why

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

### Community 153 - "Changelog"
Cohesion: 0.50
Nodes (3): 2026-10-12, 2026-10-12, Changelog

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

### Community 158 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

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

### Community 164 - "auto.ts"
Cohesion: 0.19
Nodes (15): isSyncAuto(), autoSyncBusy(), configureAutoSync(), contextFor(), contexts, DEFAULT_FLUSH_TIMEOUT_MS, drain(), flushAutoSync() (+7 more)

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 167 - "analytics-browser.test.tsx"
Cohesion: 0.16
Nodes (9): ANALYTICS_REFRESH_MS, RunTaskBrowserOptions, TaskBrowserScreenProps, AnalyticsLoadResult, Harness, h, result(), wait() (+1 more)

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 169 - "run-task-browser.tsx"
Cohesion: 0.10
Nodes (32): analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), SORT_FIELDS, TaskBrowserApp(), TaskBrowserViewProps, TaskNode (+24 more)

### Community 171 - "Commands"
Cohesion: 0.50
Nodes (3): Commands, Token Usage Tracking, usage()

### Community 173 - "scheduler.ts"
Cohesion: 0.08
Nodes (22): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification, SchedulerConfig, SchedulerDeps, TERMINAL_STATUSES, buildChainFrom() (+14 more)

### Community 174 - "gh"
Cohesion: 0.20
Nodes (12): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Rules, Mirroring to GitHub (+4 more)

### Community 175 - "Steps"
Cohesion: 0.15
Nodes (12): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 7. Verify, 8. Commit (+4 more)

### Community 180 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 184 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 187 - ".allComplete"
Cohesion: 0.09
Nodes (21): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, ADDED Requirements, Requirement: Downstream task unblocking is unaffected by this change (+13 more)

### Community 191 - "analytics-git.ts"
Cohesion: 0.24
Nodes (11): git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry, parseNumstatZ() (+3 more)

### Community 192 - "Test-Driven Development"
Cohesion: 0.15
Nodes (10): Designing for Mockability, When to Mock, Anti-patterns, Rules of the loop, Seams: where tests go, Test-Driven Development, What a good test is, Bad Tests (+2 more)

### Community 193 - "README.md"
Cohesion: 0.13
Nodes (12): Configuration, Custom command template, Fallback chains, Profile fields, Routing, Secrets never go in config, Supported harnesses and verification status, Adding a locale (+4 more)

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

### Community 200 - "sync.md"
Cohesion: 0.11
Nodes (18): Flags, Flags, Flags, Flags, Flags, Global flags, Global flags, Global flags (+10 more)

### Community 202 - "github-sync.md"
Cohesion: 0.06
Nodes (31): Claim, progress, resolve, Comments, Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror), Pull requests as a triage surface, The mirror is automated, Vocabulary, Wayfinding operations (used by `/wayfinder`), When a skill says "fetch the relevant ticket" (+23 more)

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 206 - "ReplayRecorder"
Cohesion: 0.21
Nodes (8): errMsg(), ReplayRecorder, ReplayRecorderOptions, Tracked, DEFAULT_KEEP_PER_TASK, PruneOptions, ReplayEndOutcome, truncateText()

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

### Community 215 - "comments.md"
Cohesion: 0.25
Nodes (7): Author resolution, CLI, How comments reach agents, In the TUI, Merge-friendliness, Roles, Storage layout

### Community 217 - "<Questionnaire title>"
Cohesion: 0.25
Nodes (7): Anything else?, Context, Document structure, How to answer, <Questionnaire title>, <Theme heading>, What load is the system expected to handle at launch?

### Community 219 - "writing-shape/SKILL.md"
Cohesion: 0.25
Nodes (7): Conversational feel, Format arguments to actually have, Grounding, Out of scope, Pulling from the pile, The loop, Writing rhythm

### Community 222 - "Sections"
Cohesion: 0.33
Nodes (5): Evidence, Guidance, Merge Danger, Sections, Summary

### Community 223 - "writing-beats/SKILL.md"
Cohesion: 0.33
Nodes (5): Ending the journey, Grounding, Pulling from the pile, What is a beat, Writing rhythm

### Community 225 - "loop-me/SKILL.md"
Cohesion: 0.40
Nodes (4): Definition of done, The loop lens, The workspace, Vocabulary

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

### Community 234 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 235 - "Process"
Cohesion: 0.33
Nodes (6): 1. Explore, 2. Present findings and ask, 3. Confirm and edit, 4. Write, 5. Done, Process

### Community 248 - "No AI attribution"
Cohesion: 0.40
Nodes (4): Forbidden, everywhere, How it is enforced, Limits, No AI attribution

### Community 250 - "Local changes to vendored skills"
Cohesion: 0.50
Nodes (3): `code-review` renamed to `code-review-spec`, Local changes to vendored skills, `triage`: no AI disclaimer

### Community 253 - "Agent Analytics"
Cohesion: 0.50
Nodes (4): Agent Analytics, Coverage limitations, Metric definitions, TUI

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1803 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `commands/upgrade.ts`, `run-daemon-monitor.tsx`, `ReplayStore`, `lib/tasks.ts`, `analytics-overlay.tsx`, `ink/index.ts`, `dashboard.tsx`, `commands/stats.ts`, `lib/i18n.ts`, `worktree.ts`, `features.test.ts`, `schema.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `toon.ts`, `auto.ts`, `task-schema.ts`, `Daemon`, `lib/replay.ts`, `msg`, `output`, `prompt.ts`, `commands/tasks.md`, `commands/status.ts`, `commands/tui.ts`, `README.md`, `useI18n`, `github-sync.md`, `templates.ts`, `commands/usage.ts`, `router.ts`, `tdd-verifier.test.ts`, `commands/completion.ts`, `esc-menu.tsx`, `ref_bun_test`, `commands/launch.ts`, `loadConfig`, `graph.ts`, `agent-runner.ts`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `comments.ts`, `pull.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `lib/tasks.ts`, `routing.ts`, `ink/index.ts`, `genesis-planner.ts`, `verifier.ts`, `project-store.ts`, `push.ts`, `commands/stats.ts`, `worktree.ts`, `features.test.ts`, `ref_node_path`, `analytics-usage-command.test.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `toon.ts`, `analytics-browser.test.tsx`, `task-schema.ts`, `Daemon`, `run-task-browser.tsx`, `scheduler.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `msg`, `output`, `prompt.ts`, `commands/status.ts`, `commands/tui.ts`, `useI18n`, `tdd-baseline-pipeline.test.ts`, `post-merge.ts`, `InkDaemonTUI`, `templates.ts`, `claims.ts`, `commands/usage.ts`, `tdd-verifier.test.ts`, `run-quest-picker.tsx`, `daemon-test-baseline.test.ts`, `commands/launch.ts`, `config.ts`, `lib/launcher.ts`, `quest-planner.ts`, `daemon-agent-runner.test.ts`, `loadConfig`, `graph.ts`, `agent-runner.ts`, `tdd-baseline-integration.test.ts`, `DaemonAgentState`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.14980392156862746 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `Explore mode guidelines and usage rules`, `AgentRunner`, `comments.ts`, `protocol.ts`, `ref_node_path`, `commands/merge.ts`, `AnalyticsTracker`, `Daemon`, `scheduler.ts`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `.allComplete`, `analytics.ts`, `ReplayRecorder`, `claims.ts`, `daemon-test-baseline.test.ts`, `Scheduler`, `maxConcurrent`, `daemon-agent-runner.test.ts`, `agent-runner.ts`, `DaemonAgentState`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._