# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 608 files · ~653,773 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 5076 nodes · 14340 edges · 248 communities (204 shown, 44 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 700 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e9b68640`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- verifier.ts
- WomboConfig
- Source files (read and relevant):
- agent-runner.ts
- protocol.ts
- run-tui-app.tsx
- run-progress.tsx
- task-store.ts
- eval-score.ts
- config.ts
- router.ts
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
- monitor.ts
- hitl-channel.ts
- index.md
- schema.ts
- analytics-overlay.tsx
- DaemonClient
- agent-registry.ts
- commands/merge.ts
- harness/index.ts
- toon.ts
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- Issue tracker: GitHub
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- analytics.ts
- merge-report.ts
- conflict-hunks.ts
- lib/replay.ts
- commands/stats.ts
- analytics-measurements.test.ts
- test-baseline-capture.ts
- ref_node_os
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- commands/tui.ts
- quest.md
- useI18n
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- init-app.tsx
- dashboard-provider.test.tsx
- run-daemon-monitor.tsx
- useScreenInput
- wishlist-picker.tsx
- AGENTS.md — Instructions for AI agents working on wombo-combo
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
- commands/logs.ts
- test-detection.ts
- Triage
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
- ref_node_fs
- tdd-baseline-integration.test.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- gen-command-docs.ts
- commands/eval.ts
- analytics-integration.test.ts
- test-runner.ts
- ReplayStore
- hitl-ask.ts
- lib/launcher.ts
- analytics-summary.ts
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
- syncQuestBranch
- splash-screen.tsx
- tdd-verifier.test.ts
- StubDaemonClient
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- daemon-scheduler.test.ts
- Process
- toon-spec.ts
- react-devtools-core.ts
- daemon-profile-wiring.test.ts
- scout.ts
- analytics-lifecycle.test.ts
- Codebase Design
- ref_node_path
- commands/replay.ts
- merge-resolver-agent.md
- During the session
- overview.md
- daemon/launcher.ts
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- tui-app.test.tsx
- install.md
- docs/tsconfig.json
- HTML Report Format
- template.sh
- citty/quest.ts
- replay.md
- Ask Matt
- wombo-combo Agent Context
- Diagnosing Bugs
- docs-starlight knowledge
- config.test.ts
- session-replay — knowledge
- Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)
- openspec/specs/scheduler-concurrency-accounting/spec.md
- CONTEXT.md — For AI agents using wombo as a tool
- commands/history.ts
- tasks show
- Minimal, surgical fix
- errand-planner.ts
- Steps
- file-scopes.ts
- Test-Driven Development
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- Process
- Process
- writing-for-agents/SKILL.md
- eval.md
- Steps
- merge.md
- replay-recorder.test.ts
- analytics-usage-command.test.ts
- wayfinder/SKILL.md
- Domain Docs
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Requirement: Fake-agent tasks bypass inter-launch stagger
- analytics-git.ts
- replay-browser.test.tsx
- Migrate to Shoehorn
- tdd-baseline-pipeline.test.ts
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- ADDED Requirements
- resume.md
- Process
- <Questionnaire title>
- tasks set-quest
- writing-shape/SKILL.md
- team-merge.ts
- Triage Labels
- Sections
- writing-beats/SKILL.md
- describe.md
- loop-me/SKILL.md
- Reference
- chief-of-staff/SKILL.md
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- logs.md
- quest plan
- tasks add
- init.md
- launch.md
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md

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
- `Modified Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/proposal.md → src/lib/eval-score.ts
- `New Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md → src/lib/eval-score.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`

## Communities (248 total, 44 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (94): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+86 more)

### Community 1 - "AgentRunner"
Cohesion: 0.13
Nodes (5): AgentRunner, getConflictDiffs(), runSafeCmd(), TaskEditorProps, Task

### Community 2 - "verifier.ts"
Cohesion: 0.07
Nodes (29): Cleanup, Daemon and TUI, Launch, Merge, Monitoring and recovery, Verification, Commands, BrowserConfig (+21 more)

### Community 3 - "WomboConfig"
Cohesion: 0.08
Nodes (49): AbortCommandOptions, ParsedLaunchArgs, CleanupOptions, EvalCommandOptions, GenesisCommandOptions, HistoryCommandOptions, LaunchCommandOptions, MergeCommandOptions (+41 more)

### Community 4 - "Source files (read and relevant):"
Cohesion: 0.10
Nodes (26): Context, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Impact (+18 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.10
Nodes (37): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), runTier25(), Tier25Result, RouteSelection, abortRebase(), beginRebase() (+29 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (64): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, isDaemonRunning(), CmdCancelAgent (+56 more)

### Community 7 - "run-tui-app.tsx"
Cohesion: 0.10
Nodes (33): ChromeLayout(), DashboardScreen(), EscMenuProvider(), I18nContext, groupByTask(), latestWhen(), ReplayScreen(), ReplayScreenProps (+25 more)

### Community 8 - "run-progress.tsx"
Cohesion: 0.12
Nodes (20): createIsolatedStdout(), getStableStdin(), ProgressResult, ProgressView(), ProgressViewProps, SPIN_CHARS, runErrandWizardInk(), RunErrandWizardOptions (+12 more)

### Community 9 - "task-store.ts"
Cohesion: 0.14
Nodes (37): Top-level options, validateMeta(), validateTask(), archiveDir(), atomicWrite(), createBackup(), defaultMeta(), deleteTaskFile() (+29 more)

### Community 10 - "eval-score.ts"
Cohesion: 0.13
Nodes (18): RoutingConfig, clampScore(), intervalsOverlap(), loadEvalReport(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), ScoreReport (+10 more)

### Community 11 - "config.ts"
Cohesion: 0.07
Nodes (45): citty, startCommand, statusCommand, stopCommand, parseLaunchArgs(), loadProjectConfigSync(), ensureInitialized(), listCommand (+37 more)

### Community 12 - "router.ts"
Cohesion: 0.07
Nodes (43): abortCommand, cleanupCommand, completionCommand, daemonCommand, describeCommand, evalCommand, genesisCommand, extractGlobalFlags() (+35 more)

### Community 13 - "routing.ts"
Cohesion: 0.13
Nodes (23): AgentProfile, resolveAgentBin(), getHarness(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel(), legacyRoute() (+15 more)

### Community 14 - "run-task-browser.tsx"
Cohesion: 0.06
Nodes (53): defaultLoadTaskQuests(), ErrandWizardProps, generateFakeTasks(), shuffleArr(), shuffledTitles(), QuestPickerAction, QuestPickerApp(), QuestPickerScreen() (+45 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.06
Nodes (79): isAltScreenActive(), AppProps, ConfirmDialogProps, buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp() (+71 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.09
Nodes (47): DashboardStoreContext, DashboardMetricsContext, DashboardMetricsValue, DASHBOARD_EVENTS, DashboardMetricsProviderProps, initialValue(), REAL_TIMERS, advanceThroughput() (+39 more)

### Community 17 - "t"
Cohesion: 0.13
Nodes (47): cmdAbort(), addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand (+39 more)

### Community 18 - "project-store.ts"
Cohesion: 0.06
Nodes (79): ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps (+71 more)

### Community 19 - "daemon-project-context.test.ts"
Cohesion: 0.25
Nodes (10): Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states (+2 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.07
Nodes (41): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+33 more)

### Community 21 - "commands/launch.ts"
Cohesion: 0.10
Nodes (30): Behavior, Fake Agent, Usage, analyzeBarrelFile(), BarrelFile, cmdLaunch(), detectUnprotectedBarrels(), findIndexFiles() (+22 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.15
Nodes (19): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+11 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.08
Nodes (35): Architecture, getLocaleT(), AVAILABLE_LOCALES, clearMissingKeys(), createInstance(), detectLocale(), DetectOptions, envDev() (+27 more)

### Community 24 - "worktree.ts"
Cohesion: 0.13
Nodes (25): cmdCleanup(), branchExists(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createQuestBranch(), createWorktree() (+17 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.07
Nodes (42): buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, cmdTasksShow(), label() (+34 more)

### Community 26 - "monitor.ts"
Cohesion: 0.08
Nodes (21): Normalizer, extractActivity(), formatEventForLog(), MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, parseEvents() (+13 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (22): Arguments, Global flags, Flags, Global flags, Arguments, Global flags, Arguments, Flags (+14 more)

### Community 29 - "schema.ts"
Cohesion: 0.10
Nodes (29): mergeCommand, ParsedMergeArgs, parseMergeArgs(), parseTaskList(), BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), hasKey() (+21 more)

### Community 30 - "analytics-overlay.tsx"
Cohesion: 0.08
Nodes (46): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+38 more)

### Community 31 - "DaemonClient"
Cohesion: 0.11
Nodes (6): delegateToDaemon(), waitForDaemonCompletion(), DaemonClient, EvtStateSnapshot, DaemonMonitorAdapter(), makeClient()

### Community 32 - "agent-registry.ts"
Cohesion: 0.14
Nodes (24): AgentRegistryMode, InkPreflightResult, PreflightResult, PreflightViewProps, agentNameFromType(), AgentResolution, cacheAgent(), cacheDir() (+16 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.10
Nodes (38): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), defaultIsDaemonAlive(), evidenceFor(), git(), gitOk() (+30 more)

### Community 34 - "harness/index.ts"
Cohesion: 0.10
Nodes (33): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+25 more)

### Community 35 - "toon.ts"
Cohesion: 0.28
Nodes (22): encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGeneric(), renderGraph() (+14 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.09
Nodes (40): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CommandRunner, CreateOrUpdatePrOptions (+32 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.12
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - "Issue tracker: GitHub"
Cohesion: 0.06
Nodes (30): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary, Conventions, Issue tracker: GitHub, Pull requests as a triage surface (+22 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.11
Nodes (28): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), Field, DIFFICULTY_ORDER (+20 more)

### Community 41 - "Daemon"
Cohesion: 0.11
Nodes (5): Assistant (Build · claude-sonnet-4.6 · 14.4s), Assistant (Build · claude-sonnet-4.6 · 22.7s), Assistant (Build · claude-sonnet-4.6 · 9.4s), Root Cause — Confirmed, Daemon

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (34): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+26 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.10
Nodes (27): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+19 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (38): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+30 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+14 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.11
Nodes (23): boundValue(), FileState, normalizeHarnessEvent(), normalizeOpenCodeEvent(), num(), REPLAY_LIMITS, REPLAY_NORMALIZERS, REPLAY_SCHEMA_VERSION (+15 more)

### Community 48 - "commands/stats.ts"
Cohesion: 0.30
Nodes (11): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+3 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.11
Nodes (21): Impact, BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git() (+13 more)

### Community 51 - "ref_node_os"
Cohesion: 0.08
Nodes (41): PostMergeConfig, createDaemonAgentState(), POST_MERGE_JOURNAL, createBlankTask(), addVerifiedAgent(), makeAgent(), seedVerifiedAgents(), writeProjectConfig() (+33 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (34): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+26 more)

### Community 54 - "commands/tui.ts"
Cohesion: 0.07
Nodes (65): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), cmdTui(), handleErrandFlow() (+57 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "useI18n"
Cohesion: 0.08
Nodes (58): t, useI18n(), AllTasksDetail(), AllTasksItem(), ErrandsDetail(), ErrandsItem(), Header(), QuestDetail() (+50 more)

### Community 57 - "prompt.ts"
Cohesion: 0.12
Nodes (23): formatHunksForLLM(), portlessUrl(), abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource() (+15 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.07
Nodes (26): Arguments, Arguments, Arguments, Arguments, Flags, Flags, Flags, Flags (+18 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "init-app.tsx"
Cohesion: 0.14
Nodes (22): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+14 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.11
Nodes (9): ConnectionState, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, mount(), streams(), T0 (+1 more)

### Community 63 - "run-daemon-monitor.tsx"
Cohesion: 0.12
Nodes (33): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), AgentStatus (+25 more)

### Community 64 - "useScreenInput"
Cohesion: 0.08
Nodes (37): useScreenInput(), FakeTaskConfig, FakeTaskWizard(), FakeTaskWizardProps, Field, TASK_TITLE_POOL, WORKFLOW_DESCRIPTIONS, WorkflowKind (+29 more)

### Community 65 - "wishlist-picker.tsx"
Cohesion: 0.22
Nodes (15): UseWishlistStoreResult, formatDate(), truncateText(), AddInput(), OverlayFooter(), OverlayItemList(), WishlistOverlay(), WishlistOverlayProps (+7 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.10
Nodes (20): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions (+12 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.09
Nodes (9): escMenuCursor(), eventually(), selectFromEscMenu(), waitFor(), LiveFakeClient, makeMinimalConfig(), mountShell(), openDashboardFromMenu() (+1 more)

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.10
Nodes (15): 1. Are agents spawned with `detached: true` and `unref()`?, 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown (+7 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.16
Nodes (23): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+15 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.14
Nodes (24): CumulativeReportInput, sanitizeInline(), Git, isComplete(), isJournal(), Journal, JournalOperation, journalPath() (+16 more)

### Community 74 - "InkDaemonTUI"
Cohesion: 0.11
Nodes (5): InkDaemonTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 75 - "templates.ts"
Cohesion: 0.10
Nodes (33): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+25 more)

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
Nodes (20): cmdTeamStatus(), normalizeTeamConfig(), assertSafeId(), Claim, ClaimInfo, ClaimOptions, claimPath(), ClaimResult (+12 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.13
Nodes (32): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+24 more)

### Community 81 - "commands/logs.ts"
Cohesion: 0.36
Nodes (8): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), renderLogs()

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.19
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - ".submitTask"
Cohesion: 0.09
Nodes (18): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+10 more)

### Community 86 - "DashboardMetricsProvider"
Cohesion: 0.10
Nodes (16): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, QuestUsageEntry, addInto(), buildTaskQuestMap(), cloneTotals() (+8 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.07
Nodes (35): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps, EscMenuState (+27 more)

### Community 88 - "ReplayRecorder"
Cohesion: 0.12
Nodes (17): errMsg(), ReplayRecorder, ReplayRecorderOptions, Tracked, DEFAULT_KEEP_PER_TASK, captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES (+9 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.05
Nodes (35): ink, react, App(), ConfirmDialog(), ErrandWizard(), ErrandWizardStep, STEPS, Modal() (+27 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (19): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+11 more)

### Community 94 - "ref_node_fs"
Cohesion: 0.18
Nodes (12): root, appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult (+4 more)

### Community 95 - "tdd-baseline-integration.test.ts"
Cohesion: 0.17
Nodes (10): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+2 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.06
Nodes (32): Configuration, Custom command template, Fallback chains, Profile fields, Routing, Secrets never go in config, Supported harnesses and verification status, Adding a locale (+24 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.07
Nodes (22): Capabilities, Impact, Modified Capabilities, What Changes, Why, Implementation, Tasks: fix-concurrency-boot-reset, Verification (+14 more)

### Community 101 - "gen-command-docs.ts"
Cohesion: 0.36
Nodes (13): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+5 more)

### Community 102 - "commands/eval.ts"
Cohesion: 0.23
Nodes (15): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), saveEvalReport(), computeDuration(), daemonSessionToHistory() (+7 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.16
Nodes (9): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), SRC_ENTRY, store() (+1 more)

### Community 104 - "test-runner.ts"
Cohesion: 0.22
Nodes (15): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+7 more)

### Community 105 - "ReplayStore"
Cohesion: 0.23
Nodes (9): cmdReplayShow(), assertSafe(), isSafeSegment(), replaysDir(), ReplayStore, summarize(), seedReplay(), seed() (+1 more)

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "lib/launcher.ts"
Cohesion: 0.07
Nodes (39): DEFAULT_CONFIG, HarnessId, ResolvedRoute, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness(), SpawnTarget, stripFrontmatter() (+31 more)

### Community 108 - "analytics-summary.ts"
Cohesion: 0.22
Nodes (14): Token Usage Tracking, AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsGroup, dedupeExecutions(), filterExecutions() (+6 more)

### Community 109 - "Scheduler"
Cohesion: 0.07
Nodes (28): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+20 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (55): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+47 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "citty-bridge.ts"
Cohesion: 0.28
Nodes (11): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+3 more)

### Community 113 - "daemon-agent-runner.test.ts"
Cohesion: 0.15
Nodes (9): FAKE_AGENT_SENTINEL, Env, EnvOpts, makeEnv(), ReentrantRunner, SpyRunner, TestableAgentRunner, makeFakeGh() (+1 more)

### Community 114 - "saveTaskToStore"
Cohesion: 0.18
Nodes (15): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+7 more)

### Community 115 - "wishlist-store.ts"
Cohesion: 0.16
Nodes (22): HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, emit(), emitStepFinish(), emitStepStart(), emitText() (+14 more)

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
Nodes (12): ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay(), text() (+4 more)

### Community 122 - "syncQuestBranch"
Cohesion: 0.06
Nodes (33): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Modified Capabilities (+25 more)

### Community 123 - "splash-screen.tsx"
Cohesion: 0.08
Nodes (38): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+30 more)

### Community 124 - "tdd-verifier.test.ts"
Cohesion: 0.17
Nodes (20): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions, TddVerificationResult, TestBaseline (+12 more)

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

### Community 131 - "daemon-scheduler.test.ts"
Cohesion: 0.17
Nodes (4): SchedulerDeps, makeAgent(), makeConfig(), makeScopeScheduler()

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "toon-spec.ts"
Cohesion: 0.12
Nodes (12): buildToonSpec(), renderToonLegend(), TOON_COMMAND_SPECS, TOON_DIFFICULTY_DECODE, TOON_DIFFICULTY_ENCODE, TOON_PRIORITY_DECODE, TOON_PRIORITY_ENCODE, TOON_STATUS_DECODE (+4 more)

### Community 137 - "daemon-profile-wiring.test.ts"
Cohesion: 0.29
Nodes (6): cfg(), ExposedRunner, heavy, light, routed(), task()

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (18): buildKeywords(), buildScoutIndex(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex() (+10 more)

### Community 140 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 142 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 143 - "ref_node_path"
Cohesion: 0.12
Nodes (15): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+7 more)

### Community 144 - "commands/replay.ts"
Cohesion: 0.21
Nodes (11): cmdReplayList(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution(), TFunction, firstLine() (+3 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "daemon/launcher.ts"
Cohesion: 0.27
Nodes (12): cmdResume(), cleanupPidFile(), DaemonStatus, ensureDaemonRunning(), getDaemonHealthStatus(), getDaemonStatus(), resolveDaemonEntry(), startDaemon() (+4 more)

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

### Community 153 - "tui-app.test.tsx"
Cohesion: 0.19
Nodes (4): FakeDaemonClient, liveStreams(), makeMinimalConfig(), mountTuiApp()

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

### Community 158 - "citty/quest.ts"
Cohesion: 0.15
Nodes (9): abandonCommand, activateCommand, archiveCommand, completeCommand, createCommand, listCommand, pauseCommand, planCommand (+1 more)

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

### Community 164 - "config.test.ts"
Cohesion: 0.19
Nodes (5): cmdInit(), InitOptions, CONFIG_FILE, normalizeReplayConfig(), replayRetentionOptions()

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)"
Cohesion: 0.18
Nodes (10): Claim, progress, resolve, Comments, Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror), Pull requests as a triage surface, Rules, Vocabulary, Wayfinding operations (used by `/wayfinder`), When a skill says "fetch the relevant ticket" (+2 more)

### Community 167 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.18
Nodes (10): Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: New agents are not launched to fill slots held by verified agents (+2 more)

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.13
Nodes (13): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo? (+5 more)

### Community 169 - "commands/history.ts"
Cohesion: 0.40
Nodes (10): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+2 more)

### Community 171 - "tasks show"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks show

### Community 173 - "Minimal, surgical fix"
Cohesion: 0.20
Nodes (9): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+1 more)

### Community 174 - "errand-planner.ts"
Cohesion: 0.12
Nodes (22): yaml, extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), canonicalizeOutput(), launchPlanner(), buildSynthesisPrompt(), extractTextFromJsonEvents() (+14 more)

### Community 175 - "Steps"
Cohesion: 0.15
Nodes (12): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 7. Verify, 8. Commit (+4 more)

### Community 191 - "file-scopes.ts"
Cohesion: 0.54
Nodes (6): formatScopePartitions(), isSegmentPrefix(), normalizeScopePath(), pathsOverlap(), scopePartitions(), segments()

### Community 192 - "Test-Driven Development"
Cohesion: 0.15
Nodes (10): Designing for Mockability, When to Mock, Anti-patterns, Rules of the loop, Seams: where tests go, Test-Driven Development, What a good test is, Bad Tests (+2 more)

### Community 193 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 195 - "Process"
Cohesion: 0.15
Nodes (12): 1. Gather context, 2. Explore the codebase (optional), 3. Draft vertical slices, 4. Quiz the user, 5. Publish the tickets to the configured tracker, Acceptance criteria, Blocked by, <NN>: <Ticket title> (+4 more)

### Community 196 - "Process"
Cohesion: 0.29
Nodes (6): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard

### Community 197 - "writing-for-agents/SKILL.md"
Cohesion: 0.15
Nodes (11): Context pointers, Information hierarchy, Leading words, Invocation, Router skills, Skill mechanics, Splitting by invocation, Pruning (+3 more)

### Community 199 - "Steps"
Cohesion: 0.17
Nodes (11): 1. Detect the environment, 2. Install dependency-cruiser, 3. Write the config, 4. Wire it into the checks, 5. Scaffold the example package, 6. Prove the rules bite, 7. Document the convention, Notes (+3 more)

### Community 201 - "replay-recorder.test.ts"
Cohesion: 0.29
Nodes (3): makeTask(), NoLaunchRunner, submit()

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 205 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 206 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 207 - "analytics-git.ts"
Cohesion: 0.22
Nodes (12): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+4 more)

### Community 208 - "replay-browser.test.tsx"
Cohesion: 0.18
Nodes (10): stripAnsi(), Harness, mount(), h, seedTask(), wait(), waitFor(), mount() (+2 more)

### Community 209 - "Migrate to Shoehorn"
Cohesion: 0.20
Nodes (9): `as Type` → `fromPartial()`, `as unknown as Type` → `fromAny()`, Install, Large objects with few needed properties, Migrate to Shoehorn, Migration patterns, When to use each, Why shoehorn? (+1 more)

### Community 210 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

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
Cohesion: 0.17
Nodes (11): ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded (+3 more)

### Community 215 - "resume.md"
Cohesion: 0.50
Nodes (3): Flags, Global flags, r()

### Community 216 - "Process"
Cohesion: 0.25
Nodes (7): 1. Pin the fixed point, 2. Identify the spec source, 3. Identify the standards sources, 4. Spawn both sub-agents in parallel, 5. Aggregate, Process, Why two axes

### Community 217 - "<Questionnaire title>"
Cohesion: 0.25
Nodes (7): Anything else?, Context, Document structure, How to answer, <Questionnaire title>, <Theme heading>, What load is the system expected to handle at launch?

### Community 218 - "tasks set-quest"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks set-quest

### Community 219 - "writing-shape/SKILL.md"
Cohesion: 0.25
Nodes (7): Conversational feel, Format arguments to actually have, Grounding, Out of scope, Pulling from the pile, The loop, Writing rhythm

### Community 220 - "team-merge.ts"
Cohesion: 0.50
Nodes (3): teamMergeCommands, teamMergeMeta, teamSetup

### Community 222 - "Sections"
Cohesion: 0.33
Nodes (5): Evidence, Guidance, Merge Danger, Sections, Summary

### Community 223 - "writing-beats/SKILL.md"
Cohesion: 0.33
Nodes (5): Ending the journey, Grounding, Pulling from the pile, What is a beat, Writing rhythm

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

### Community 231 - "logs.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 232 - "quest plan"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest plan

### Community 233 - "tasks add"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks add

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1708 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `agent-runner.ts`, `task-store.ts`, `config.ts`, `ink/index.ts`, `commands/replay.ts`, `daemon/launcher.ts`, `commands/launch.ts`, `dashboard.tsx`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `schema.ts`, `citty/quest.ts`, `DaemonClient`, `analytics-overlay.tsx`, `commands/merge.ts`, `agent-registry.ts`, `config.test.ts`, `CONTEXT.md — For AI agents using wombo as a tool`, `commands/history.ts`, `task-schema.ts`, `lib/replay.ts`, `commands/stats.ts`, `commands/tui.ts`, `useI18n`, `commands/tasks.md`, `run-daemon-monitor.tsx`, `graph.ts`, `templates.ts`, `claims.ts`, `commands/usage.ts`, `commands/logs.ts`, `commands/completion.ts`, `esc-menu.tsx`, `ref_bun_test`, `team-merge.ts`, `wombo-combo`, `commands/eval.ts`, `splash-screen.tsx`, `tdd-verifier.test.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `verifier.ts`, `daemon-scheduler.test.ts`, `agent-runner.ts`, `protocol.ts`, `run-tui-app.tsx`, `task-store.ts`, `eval-score.ts`, `config.ts`, `analytics-lifecycle.test.ts`, `routing.ts`, `run-task-browser.tsx`, `ref_node_path`, `ink/index.ts`, `t`, `project-store.ts`, `daemon-project-context.test.ts`, `daemon/launcher.ts`, `commands/launch.ts`, `worktree.ts`, `lib/tasks.ts`, `agent-registry.ts`, `commands/merge.ts`, `harness/index.ts`, `config.test.ts`, `task-schema.ts`, `commands/history.ts`, `Daemon`, `errand-planner.ts`, `commands/stats.ts`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `daemon-profile-wiring.test.ts`, `ref_node_os`, `commands/tui.ts`, `useI18n`, `prompt.ts`, `run-daemon-monitor.tsx`, `graph.ts`, `post-merge.ts`, `InkDaemonTUI`, `templates.ts`, `analytics-usage-command.test.ts`, `replay-recorder.test.ts`, `claims.ts`, `commands/usage.ts`, `tdd-baseline-pipeline.test.ts`, `daemon-test-baseline.test.ts`, `tdd-baseline-integration.test.ts`, `commands/eval.ts`, `analytics-integration.test.ts`, `lib/launcher.ts`, `daemon-agent-runner.test.ts`, `splash-screen.tsx`, `tdd-verifier.test.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.1292207792207792 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `daemon-scheduler.test.ts`, `Source files (read and relevant):`, `agent-runner.ts`, `protocol.ts`, `daemon-profile-wiring.test.ts`, `analytics-lifecycle.test.ts`, `ref_node_path`, `daemon-project-context.test.ts`, `commands/launch.ts`, `commands/merge.ts`, `AnalyticsTracker`, `Daemon`, `analytics.ts`, `Minimal, surgical fix`, `analytics-measurements.test.ts`, `ref_node_os`, `run-daemon-monitor.tsx`, `replay-recorder.test.ts`, `claims.ts`, `.submitTask`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `analytics-integration.test.ts`, `maxConcurrent`, `daemon-agent-runner.test.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._