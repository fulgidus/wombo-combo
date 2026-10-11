# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 642 files · ~690,057 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 5512 nodes · 15910 edges · 253 communities (208 shown, 45 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 803 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c05f346`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- verifier.ts
- WomboConfig
- router.ts
- merger.ts
- protocol.ts
- run-daemon-monitor.tsx
- mapping.ts
- task-store.ts
- eval-score.ts
- config.ts
- commands/launch.ts
- routing.ts
- auto.ts
- ink/index.ts
- dashboard-metrics.ts
- msg
- project-store.ts
- github-client.ts
- dashboard.tsx
- push.ts
- chrome.tsx
- lib/i18n.ts
- worktree.ts
- lib/tasks.ts
- monitor.ts
- hitl-channel.ts
- json
- schema.ts
- analytics-overlay.tsx
- DaemonClient
- agent-registry.ts
- agent-runner.ts
- harness/index.ts
- toon.ts
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
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- t
- quest.md
- state.ts
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- ref_node_path
- dashboard-provider.tsx
- commands/status.ts
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
- output
- tdd-verifier.test.ts
- Triage
- commands/completion.ts
- .submitTask
- DashboardMetricsProvider
- esc-menu.tsx
- test-detection.ts
- wishlist.md
- ref_bun_test
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- changelog.ts
- analytics-usage-command.test.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- gen-command-docs.ts
- harness-opencode.test.ts
- analytics-integration.test.ts
- test-runner.ts
- ReplayStore
- hitl-ask.ts
- lib/launcher.ts
- pull.ts
- .start
- maxConcurrent
- daemon.md
- citty-bridge.ts
- daemon-agent-runner.test.ts
- saveTaskToStore
- wishlist-store.ts
- graph.ts
- cli-smoke.test.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- replay-viewer.test.tsx
- tmpDir
- tdd-baseline-integration.test.ts
- tdd-baseline-pipeline.test.ts
- StubDaemonClient
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- comments.ts
- Process
- render.ts
- react-devtools-core.ts
- init-form.tsx
- scout.ts
- gen-config-docs.ts
- Codebase Design
- ref_node_fs
- quest-planner.ts
- merge-resolver-agent.md
- During the session
- overview.md
- citty/quest.ts
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- analytics-lifecycle.test.ts
- install.md
- docs/tsconfig.json
- HTML Report Format
- template.sh
- daemon-scheduler.test.ts
- replay.md
- Ask Matt
- wombo-combo Agent Context
- Diagnosing Bugs
- docs-starlight knowledge
- GitHubClient
- session-replay — knowledge
- Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)
- src/index.ts
- CONTEXT.md — For AI agents using wombo as a tool
- run-task-browser.tsx
- harnesses.md
- prompt-compress.ts
- gh
- Steps
- LiveFakeClient
- Test-Driven Development
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- Process
- comment.md
- writing-for-agents/SKILL.md
- ADDED Requirements
- Steps
- sync.md
- openspec/specs/safe-tmp-worktree-placement/spec.md
- Commands
- wayfinder/SKILL.md
- Domain Docs
- citty/team.ts
- replay-recorder.ts
- analytics-git.ts
- Process
- Migrate to Shoehorn
- FakeDaemonClient
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- .allComplete
- comments.md
- c
- <Questionnaire title>
- fake-agent-runner.ts
- writing-shape/SKILL.md
- scripts
- Triage Labels
- Sections
- writing-beats/SKILL.md
- running-agents.md
- loop-me/SKILL.md
- Reference
- chief-of-staff/SKILL.md
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- dependencies
- Issue tracker: GitLab
- Issue tracker: Local Markdown
- citty/sync.ts
- i18n.md
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md
- devDependencies
- StubDaemonClient
- Local changes to vendored skills
- wishlist-overlay.test.tsx
- retry.md

## God Nodes (most connected - your core abstractions)
1. `t()` - 195 edges
2. `WomboConfig` - 149 edges
3. `react` - 118 edges
4. `Explore mode guidelines and usage rules` - 114 edges
5. `useI18n()` - 113 edges
6. `ink` - 111 edges
7. `DaemonState` - 106 edges
8. `AgentRunner` - 101 edges
9. `t` - 97 edges
10. `msg` - 76 edges

## Surprising Connections (you probably didn't know these)
- `Daemon` --references--> `AgentRunner`  [INFERRED]
  docs/src/content/docs/architecture/overview.md → src/daemon/agent-runner.ts
- `Seams` --references--> `ReplayRecorder`  [INFERRED]
  .wombo-combo/quests/session-replay/knowledge.md → src/daemon/replay-recorder.ts
- `Why `concurrencyPinned` doesn't protect persisted state` --references--> `Scheduler`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/design.md → src/daemon/scheduler.ts
- `New Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md → src/lib/eval-score.ts
- `Goals / Non-Goals` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-scheduler-oversubscription/design.md → src/lib/eval-score.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (253 total, 45 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (102): Accomplished, Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s) (+94 more)

### Community 1 - "AgentRunner"
Cohesion: 0.09
Nodes (18): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected, ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently (+10 more)

### Community 2 - "verifier.ts"
Cohesion: 0.09
Nodes (23): Daemon and TUI, BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult (+15 more)

### Community 3 - "WomboConfig"
Cohesion: 0.13
Nodes (29): AbortCommandOptions, CleanupOptions, CommentOptions, EvalCommandOptions, GenesisCommandOptions, HistoryCommandOptions, LaunchCommandOptions, MergeCommandOptions (+21 more)

### Community 4 - "router.ts"
Cohesion: 0.07
Nodes (41): abortCommand, cleanupCommand, addCommand, commentCommand, ensureInitialized(), linkCommand, listCommand, outputArg (+33 more)

### Community 5 - "merger.ts"
Cohesion: 0.14
Nodes (27): abortRebase(), beginRebase(), canMerge(), cleanupRebaseBranch(), commitAutoResolvedMerge(), continueRebase(), deleteBranch(), finalizeRebase() (+19 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (61): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+53 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.04
Nodes (101): AgentStatus, ChromeLayout(), DashboardAgent, DashboardScreen(), DashboardStore, DashboardStoreContext, EscMenuProvider(), createI18n() (+93 more)

### Community 8 - "mapping.ts"
Cohesion: 0.14
Nodes (22): Comment, assertId(), assertKind(), deleteMapping(), FieldConflict, findMappingByIssue(), hashComment(), hashFields() (+14 more)

### Community 9 - "task-store.ts"
Cohesion: 0.06
Nodes (64): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `comments`, `defaults`, `git` (+56 more)

### Community 10 - "eval-score.ts"
Cohesion: 0.08
Nodes (42): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+34 more)

### Community 11 - "config.ts"
Cohesion: 0.07
Nodes (45): citty, startCommand, statusCommand, stopCommand, parseLaunchArgs(), ParsedMergeArgs, parseMergeArgs(), parseTaskList() (+37 more)

### Community 12 - "commands/launch.ts"
Cohesion: 0.08
Nodes (40): Behavior, Fake Agent, Usage, analyzeBarrelFile(), BarrelFile, cmdLaunch(), delegateToDaemon(), detectUnprotectedBarrels() (+32 more)

### Community 13 - "routing.ts"
Cohesion: 0.10
Nodes (29): AgentProfile, resolveAgentBin(), Operation, detectHarnessFromBin(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel() (+21 more)

### Community 14 - "auto.ts"
Cohesion: 0.07
Nodes (31): Behavioral, not procedural, autoSyncBusy(), AutoSyncSettings, configureAutoSync(), contextFor(), contexts, DEFAULT_FLUSH_TIMEOUT_MS, drain() (+23 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.06
Nodes (74): AppProps, buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES (+66 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.11
Nodes (39): EvtAgentActivity, EvtBuildResult, EvtMergeResult, EvtTaskPicked, initialValue(), ActivityEntry, advanceThroughput(), alignBucket() (+31 more)

### Community 17 - "msg"
Cohesion: 0.11
Nodes (44): cmdAbort(), addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand (+36 more)

### Community 18 - "project-store.ts"
Cohesion: 0.05
Nodes (88): useChromeHideQuitHint(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps, formatSectionForDisplay() (+80 more)

### Community 19 - "github-client.ts"
Cohesion: 0.09
Nodes (34): configuredRepo(), resolveSyncContext(), apiUrlFor(), createGitHubClient(), paginate(), rateLimitWaitMs(), request(), CreateGitHubClientOptions (+26 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.10
Nodes (32): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+24 more)

### Community 21 - "push.ts"
Cohesion: 0.12
Nodes (34): Pending, labelsForQuest(), readMapping(), SyncKind, Collected, collectLocal(), commentIdFromUrl(), errMsg() (+26 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.15
Nodes (17): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBarProps, DaemonStats, dashboardHint() (+9 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.05
Nodes (50): Architecture, cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution() (+42 more)

### Community 24 - "worktree.ts"
Cohesion: 0.15
Nodes (19): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), isWorktreesDirEmpty(), listWomboWorktrees() (+11 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.08
Nodes (42): commentsForShow(), buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow() (+34 more)

### Community 26 - "monitor.ts"
Cohesion: 0.09
Nodes (18): Normalizer, extractActivity(), formatEventForLog(), MonitoredProcess, OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd() (+10 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "json"
Cohesion: 0.06
Nodes (31): Arguments, Global flags, Arguments, Global flags, Arguments, Global flags, Arguments, Global flags (+23 more)

### Community 29 - "schema.ts"
Cohesion: 0.12
Nodes (23): BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), aliasHint(), allCommandSchemas(), buildAliasMap(), COMMAND_REGISTRY, commandToSchema() (+15 more)

### Community 30 - "analytics-overlay.tsx"
Cohesion: 0.08
Nodes (44): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+36 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (4): DaemonClient, CommandMap, EvtStateSnapshot, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.13
Nodes (26): AgentRegistryMode, inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightViewProps, agentNameFromType(), AgentResolution (+18 more)

### Community 33 - "agent-runner.ts"
Cohesion: 0.10
Nodes (36): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+28 more)

### Community 34 - "harness/index.ts"
Cohesion: 0.14
Nodes (24): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+16 more)

### Community 35 - "toon.ts"
Cohesion: 0.13
Nodes (33): encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGraph(), renderHistoryDetail() (+25 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.09
Nodes (40): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CommandRunner, CreateOrUpdatePrOptions (+32 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.09
Nodes (13): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), errMsg(), ReplayRecorder (+5 more)

### Community 39 - "setup-matt-pocock-skills/SKILL.md"
Cohesion: 0.11
Nodes (13): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary, 1. Explore, 2. Present findings and ask, 3. Confirm and edit (+5 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (28): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS (+20 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.11
Nodes (31): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES, isObject() (+23 more)

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
Cohesion: 0.10
Nodes (26): boundValue(), FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent(), num(), recordLabel(), REPLAY_LIMITS (+18 more)

### Community 48 - "quest-wizard.tsx"
Cohesion: 0.12
Nodes (16): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), PRIORITY_COLORS, QuestWizard(), QuestWizardPrefill, QuestWizardProps, STEPS (+8 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.11
Nodes (21): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+13 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.07
Nodes (50): defaultIsDaemonAlive(), PostMergeConfig, createDaemonAgentState(), setupMergeDriver(), POST_MERGE_JOURNAL, createBlankTask(), feature, addVerifiedAgent() (+42 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (33): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+25 more)

### Community 54 - "t"
Cohesion: 0.08
Nodes (64): printRecentComments(), applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), handleQuestSubcommand() (+56 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "state.ts"
Cohesion: 0.13
Nodes (18): DaemonAgentState, EvtAgentStatusChange, EvtSchedulerStatus, SchedulerState, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES (+10 more)

### Community 57 - "prompt.ts"
Cohesion: 0.12
Nodes (25): formatHunksForLLM(), Tier25Result, TieredMergeResult, ensureProxyRunning(), isPortlessAvailable(), isProxyRunning(), portlessEnv(), portlessRunCommand() (+17 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.05
Nodes (38): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+30 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "ref_node_path"
Cohesion: 0.09
Nodes (22): root, cmdInit(), InitOptions, CONFIG_FILE, DEFAULT_CONFIG, normalizeReplayConfig(), replayRetentionOptions(), InitApp() (+14 more)

### Community 62 - "dashboard-provider.tsx"
Cohesion: 0.09
Nodes (20): ConnectionState, EventMap, DashboardMetricsContext, DashboardMetricsValue, useDashboardMetrics(), DASHBOARD_EVENTS, DashboardDaemonClient, DashboardMetricsProviderProps (+12 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.20
Nodes (17): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize() (+9 more)

### Community 64 - "commands/tui.ts"
Cohesion: 0.07
Nodes (52): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+44 more)

### Community 65 - "useI18n"
Cohesion: 0.07
Nodes (69): ChromeTopBar(), ConfirmDialog(), ConfirmDialogProps, useScreenInput(), FakeTaskWizard(), t, useI18n(), ConfirmDialog() (+61 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.10
Nodes (20): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions (+12 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.16
Nodes (10): escMenuCursor(), eventually(), selectFromEscMenu(), waitFor(), makeMinimalConfig(), mountShell(), openDashboardFromMenu(), liveStreams() (+2 more)

### Community 68 - "analytics.ts"
Cohesion: 0.08
Nodes (27): Flags, Global flags, props(), rec(), sampleRecords(), ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES (+19 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (15): 1. Are agents spawned with `detached: true` and `unref()`?, 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown (+7 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.20
Nodes (18): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+10 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.16
Nodes (23): sanitizeInline(), Git, isComplete(), isJournal(), Journal, JournalOperation, journalPath(), listIncompleteOperations() (+15 more)

### Community 75 - "templates.ts"
Cohesion: 0.12
Nodes (25): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+17 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.08
Nodes (23): author, bin, woco, bugs, url, description, engines, bun (+15 more)

### Community 78 - "docs/package.json"
Cohesion: 0.11
Nodes (15): dependencies, astro, @astrojs/starlight, description, name, private, scripts, build (+7 more)

### Community 79 - "claims.ts"
Cohesion: 0.22
Nodes (19): normalizeTeamConfig(), assertSafeId(), Claim, ClaimInfo, ClaimOptions, claimPath(), ClaimResult, CLAIMS_DIR (+11 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.15
Nodes (29): cmdUsage(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost(), formatNumber(), groupedToJSON() (+21 more)

### Community 81 - "output"
Cohesion: 0.15
Nodes (24): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), clientFor() (+16 more)

### Community 82 - "tdd-verifier.test.ts"
Cohesion: 0.16
Nodes (21): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions, TddVerificationResult, TestBaseline (+13 more)

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (28): Bad agent brief, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement), Good agent brief (PR) (+20 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.08
Nodes (50): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard, aliasHint(), allCommandNames() (+42 more)

### Community 85 - ".submitTask"
Cohesion: 0.09
Nodes (19): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+11 more)

### Community 86 - "DashboardMetricsProvider"
Cohesion: 0.11
Nodes (15): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, addInto(), buildTaskQuestMap(), cloneTotals(), DashboardUsageReader (+7 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.10
Nodes (24): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+16 more)

### Community 88 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.05
Nodes (48): ink, react, App(), getEditorCommand(), openEditor(), OpenEditorOptions, runApp(), RunAppOptions (+40 more)

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

### Community 95 - "analytics-usage-command.test.ts"
Cohesion: 0.16
Nodes (9): buildAnalyticsSummary(), AnalyticsTrackerOptions, analyticsFileName(), AnalyticsStore, store(), rec(), REPO_ROOT, seed() (+1 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.12
Nodes (16): Agent Analytics, Commands, Comments, Coverage limitations, Install, Languages, Launch options, License (+8 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.05
Nodes (29): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+21 more)

### Community 101 - "gen-command-docs.ts"
Cohesion: 0.33
Nodes (14): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+6 more)

### Community 102 - "harness-opencode.test.ts"
Cohesion: 0.13
Nodes (17): Fallback chains, Routing, HARNESS_IDS, isHarnessId(), OPERATIONS, listHarnesses(), detectAgentType(), base (+9 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.18
Nodes (9): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+1 more)

### Community 104 - "test-runner.ts"
Cohesion: 0.20
Nodes (16): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+8 more)

### Community 105 - "ReplayStore"
Cohesion: 0.23
Nodes (8): assertSafe(), isSafeSegment(), replaysDir(), ReplayStore, summarize(), seedReplay(), seed(), seed()

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "lib/launcher.ts"
Cohesion: 0.11
Nodes (30): HarnessId, getHarness(), ResolvedRoute, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness(), SpawnTarget, stripFrontmatter() (+22 more)

### Community 108 - "pull.ts"
Cohesion: 0.12
Nodes (32): defaultLoadTaskQuests(), CommentRef, GitHubIssue, findMarker(), hashTask(), DEFAULT_TRIAGE, pullFromGitHub(), createTask() (+24 more)

### Community 109 - ".start"
Cohesion: 0.05
Nodes (57): Why, Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan (+49 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (52): Capabilities, Modified Capabilities, MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value (+44 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "citty-bridge.ts"
Cohesion: 0.28
Nodes (11): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+3 more)

### Community 113 - "daemon-agent-runner.test.ts"
Cohesion: 0.15
Nodes (10): PostMergeRequest, Env, EnvOpts, makeEnv(), ReentrantRunner, SpyRunner, TestableAgentRunner, makeFakeGh() (+2 more)

### Community 114 - "saveTaskToStore"
Cohesion: 0.07
Nodes (23): saveTaskToStore(), FakeComment, FakeGitHub, FakeGitHubOptions, FakeIssue, Injection, RecordedRequest, startFakeGitHub() (+15 more)

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
Cohesion: 0.17
Nodes (13): parseReplay(), ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay() (+5 more)

### Community 122 - "tmpDir"
Cohesion: 0.13
Nodes (16): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+8 more)

### Community 123 - "tdd-baseline-integration.test.ts"
Cohesion: 0.17
Nodes (10): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+2 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

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
Cohesion: 0.17
Nodes (23): addComment(), AddCommentInput, assertSafeId(), COMMENTS_DIR, commentsDir(), compareComments(), findCommentPath(), getComment() (+15 more)

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "render.ts"
Cohesion: 0.08
Nodes (56): ParsedLaunchArgs, QuestSummary, CommentRole, RouteTask, Quest, QuestStatus, remoteQuestView(), remoteSyncHash() (+48 more)

### Community 137 - "init-form.tsx"
Cohesion: 0.22
Nodes (10): EditableField(), EditableFieldProps, enT, FieldDef, FIELDS, InitForm(), InitFormDefaults, InitFormProps (+2 more)

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 140 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 142 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 143 - "ref_node_fs"
Cohesion: 0.06
Nodes (17): FAKE_AGENT_SENTINEL, MonitorCallbacks, ENTRY, cfg(), ExposedRunner, heavy, light, routed() (+9 more)

### Community 144 - "quest-planner.ts"
Cohesion: 0.07
Nodes (49): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree() (+41 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "citty/quest.ts"
Cohesion: 0.15
Nodes (9): abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand, pauseCommand, planCommand (+1 more)

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
Cohesion: 0.21
Nodes (6): analyticsDir(), makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

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

### Community 158 - "daemon-scheduler.test.ts"
Cohesion: 0.17
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

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

### Community 164 - "GitHubClient"
Cohesion: 0.17
Nodes (4): CycleOptions, ensureLabels(), GitHubClient, PullOptions

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)"
Cohesion: 0.20
Nodes (9): Claim, progress, resolve, Comments, Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror), Pull requests as a triage surface, Vocabulary, Wayfinding operations (used by `/wayfinder`), When a skill says "fetch the relevant ticket", When a skill says "publish a spec to the issue tracker" (+1 more)

### Community 167 - "src/index.ts"
Cohesion: 0.18
Nodes (12): extractGlobalFlags(), ExtractResult, GlobalFlags, buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), ResolvedCommand, resolveGlobalFlagsAndCommand() (+4 more)

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 169 - "run-task-browser.tsx"
Cohesion: 0.07
Nodes (43): ErrandWizardProps, FakeTaskConfig, FakeTaskWizardProps, Field, generateFakeTasks(), shuffleArr(), shuffledTitles(), TASK_TITLE_POOL (+35 more)

### Community 171 - "harnesses.md"
Cohesion: 0.17
Nodes (9): Configuration, Custom command template, Profile fields, Secrets never go in config, Supported harnesses and verification status, Conflict-free merges, Daemon behaviour, Recommended workflow (+1 more)

### Community 173 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 174 - "gh"
Cohesion: 0.22
Nodes (11): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Rules, Mirroring to GitHub (+3 more)

### Community 175 - "Steps"
Cohesion: 0.15
Nodes (12): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 7. Verify, 8. Commit (+4 more)

### Community 192 - "Test-Driven Development"
Cohesion: 0.15
Nodes (10): Designing for Mockability, When to Mock, Anti-patterns, Rules of the loop, Seams: where tests go, Test-Driven Development, What a good test is, Bad Tests (+2 more)

### Community 193 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 195 - "Process"
Cohesion: 0.15
Nodes (12): 1. Gather context, 2. Explore the codebase (optional), 3. Draft vertical slices, 4. Quiz the user, 5. Publish the tickets to the configured tracker, Acceptance criteria, Blocked by, <NN>: <Ticket title> (+4 more)

### Community 196 - "comment.md"
Cohesion: 0.12
Nodes (15): Arguments, Arguments, Arguments, Arguments, comment add, comment link, comment list, comment show (+7 more)

### Community 197 - "writing-for-agents/SKILL.md"
Cohesion: 0.15
Nodes (11): Context pointers, Information hierarchy, Leading words, Invocation, Router skills, Skill mechanics, Splitting by invocation, Pruning (+3 more)

### Community 198 - "ADDED Requirements"
Cohesion: 0.18
Nodes (10): ADDED Requirements, Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo (+2 more)

### Community 199 - "Steps"
Cohesion: 0.17
Nodes (11): 1. Detect the environment, 2. Install dependency-cruiser, 3. Write the config, 4. Wire it into the checks, 5. Scaffold the example package, 6. Prove the rules bite, 7. Document the convention, Notes (+3 more)

### Community 200 - "sync.md"
Cohesion: 0.20
Nodes (9): Flags, Flags, Global flags, Global flags, Global flags, Global flags, sync labels, sync push (+1 more)

### Community 201 - "openspec/specs/safe-tmp-worktree-placement/spec.md"
Cohesion: 0.20
Nodes (9): Requirement: Temporary worktree paths are unique per invocation, Requirement: Temporary worktrees are cleaned up after merge operations, Requirement: Temporary worktrees are created outside the project repository, Scenario: Cleanup on failed merge, Scenario: Cleanup on successful merge, Scenario: Concurrent mergeBranch calls do not collide, Scenario: mergeBranch creates tmp worktree outside the repo, Scenario: syncQuestBranch creates tmp worktree outside the repo (+1 more)

### Community 202 - "Commands"
Cohesion: 0.22
Nodes (7): Commands, Dependencies and ordering, Fields, Commands, Token Usage Tracking, usage(), tasks()

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 205 - "citty/team.ts"
Cohesion: 0.25
Nodes (7): claimCommand, teamMergeCommands, teamMergeMeta, teamSetup, outputArg, releaseCommand, statusCommand

### Community 206 - "replay-recorder.ts"
Cohesion: 0.22
Nodes (14): ReplayRecorderOptions, Tracked, DEFAULT_KEEP_PER_TASK, captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat(), pathspecs() (+6 more)

### Community 207 - "analytics-git.ts"
Cohesion: 0.22
Nodes (12): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+4 more)

### Community 208 - "Process"
Cohesion: 0.25
Nodes (7): 1. Pin the fixed point, 2. Identify the spec source, 3. Identify the standards sources, 4. Spawn both sub-agents in parallel, 5. Aggregate, Process, Why two axes

### Community 209 - "Migrate to Shoehorn"
Cohesion: 0.20
Nodes (9): `as Type` → `fromPartial()`, `as unknown as Type` → `fromAny()`, Install, Large objects with few needed properties, Migrate to Shoehorn, Migration patterns, When to use each, Why shoehorn? (+1 more)

### Community 211 - "Steps"
Cohesion: 0.22
Nodes (8): 1. Ask scope, 2. Copy the hook script, 3. Add hook to settings, 4. Ask about customization, 5. Verify, Setup Git Guardrails, Steps, What Gets Blocked

### Community 212 - "Scaffold Exercises"
Cohesion: 0.22
Nodes (8): Directory naming, Example: stubbing from a plan, Exercise variants, Lint rules summary, Moving/renaming exercises, Required files, Scaffold Exercises, Workflow

### Community 213 - "to-spec/SKILL.md"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Process, Solution, Testing Decisions, User Stories

### Community 214 - ".allComplete"
Cohesion: 0.09
Nodes (21): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, ADDED Requirements, Requirement: Downstream task unblocking is unaffected by this change (+13 more)

### Community 215 - "comments.md"
Cohesion: 0.25
Nodes (7): Author resolution, CLI, How comments reach agents, In the TUI, Merge-friendliness, Roles, Storage layout

### Community 216 - "c"
Cohesion: 0.25
Nodes (7): Flags, Global flags, Arguments, Flags, Global flags, quest create, c()

### Community 217 - "<Questionnaire title>"
Cohesion: 0.25
Nodes (7): Anything else?, Context, Document structure, How to answer, <Questionnaire title>, <Theme heading>, What load is the system expected to handle at launch?

### Community 218 - "fake-agent-runner.ts"
Cohesion: 0.44
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 219 - "writing-shape/SKILL.md"
Cohesion: 0.25
Nodes (7): Conversational feel, Format arguments to actually have, Grounding, Out of scope, Pulling from the pile, The loop, Writing rhythm

### Community 220 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, docs:gen, start, test, typecheck, woco

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

### Community 226 - "Reference"
Cohesion: 0.40
Nodes (4): Files, Implementation vs Review, Reference, Steps

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

### Community 231 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, citty, i18next, ink, mermaidtui, react, yaml

### Community 232 - "Issue tracker: GitLab"
Cohesion: 0.33
Nodes (6): Conventions, Issue tracker: GitLab, Merge requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 233 - "Issue tracker: Local Markdown"
Cohesion: 0.33
Nodes (5): Conventions, Issue tracker: Local Markdown, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 234 - "citty/sync.ts"
Cohesion: 0.33
Nodes (5): ensureInitialized(), labelsCommand, outputArg, pushCommand, statusCommand

### Community 235 - "i18n.md"
Cohesion: 0.40
Nodes (4): Adding a locale, Checks, Choosing a language, Writing translatable code

### Community 248 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, @types/bun, @types/react, typescript

### Community 252 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1780 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `router.ts`, `merger.ts`, `run-daemon-monitor.tsx`, `task-store.ts`, `eval-score.ts`, `config.ts`, `commands/launch.ts`, `auto.ts`, `ink/index.ts`, `msg`, `citty/quest.ts`, `dashboard.tsx`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `schema.ts`, `analytics-overlay.tsx`, `agent-registry.ts`, `agent-runner.ts`, `task-schema.ts`, `lib/replay.ts`, `prompt.ts`, `commands/tasks.md`, `ref_node_path`, `commands/status.ts`, `commands/tui.ts`, `Commands`, `templates.ts`, `citty/team.ts`, `commands/usage.ts`, `output`, `tdd-verifier.test.ts`, `commands/completion.ts`, `esc-menu.tsx`, `citty/sync.ts`, `i18n.md`, `graph.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.019417475728155338 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `protocol.ts`, `config.ts`, `commands/launch.ts`, `ref_node_fs`, `project-store.ts`, `analytics-lifecycle.test.ts`, `daemon-scheduler.test.ts`, `agent-runner.ts`, `AnalyticsTracker`, `Daemon`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `state.ts`, `replay-recorder.ts`, `claims.ts`, `.submitTask`, `.allComplete`, `daemon-test-baseline.test.ts`, `analytics-usage-command.test.ts`, `analytics-integration.test.ts`, `.start`, `maxConcurrent`, `daemon-agent-runner.test.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.08713850837138508 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `verifier.ts`, `merger.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `task-store.ts`, `eval-score.ts`, `config.ts`, `commands/launch.ts`, `routing.ts`, `ref_node_fs`, `quest-planner.ts`, `msg`, `project-store.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `analytics-lifecycle.test.ts`, `daemon-scheduler.test.ts`, `DaemonClient`, `agent-registry.ts`, `agent-runner.ts`, `GitHubClient`, `task-schema.ts`, `Daemon`, `run-task-browser.tsx`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `t`, `state.ts`, `prompt.ts`, `ref_node_path`, `commands/status.ts`, `commands/tui.ts`, `post-merge.ts`, `InkDaemonTUI`, `templates.ts`, `claims.ts`, `commands/usage.ts`, `tdd-verifier.test.ts`, `daemon-test-baseline.test.ts`, `analytics-usage-command.test.ts`, `analytics-integration.test.ts`, `lib/launcher.ts`, `pull.ts`, `daemon-agent-runner.test.ts`, `graph.ts`, `tdd-baseline-integration.test.ts`, `tdd-baseline-pipeline.test.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._