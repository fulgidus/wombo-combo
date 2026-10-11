# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 646 files · ~697,695 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 5566 nodes · 16171 edges · 251 communities (213 shown, 38 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 827 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1190400`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- splash-screen.tsx
- agent-runner.ts
- protocol.ts
- run-tui-app.tsx
- pull.ts
- task-store.ts
- commands/history.ts
- router.ts
- commands/launch.ts
- routing.ts
- commands/sync.ts
- review-list.tsx
- dashboard-metrics.ts
- t
- useScreenInput
- github-client.ts
- dashboard.tsx
- push.ts
- chrome.tsx
- lib/i18n.ts
- worktree.ts
- lib/tasks.ts
- monitor.ts
- hitl-channel.ts
- index.md
- schema.ts
- UsageTotals
- DaemonClient
- agent-registry.ts
- commands/merge.ts
- harness/types.ts
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
- ref_node_os
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- msg
- quest.md
- run-daemon-monitor.tsx
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- init-app.tsx
- dashboard-provider.tsx
- commands/status.ts
- ink/index.ts
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
- config.ts
- tdd-verifier.test.ts
- Triage
- commands/completion.ts
- Requirement: Launch stagger applies only to real-agent launches
- run-quest-picker.tsx
- esc-menu.tsx
- test-detection.ts
- wishlist.md
- ref_bun_test
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- changelog.ts
- ReplayRecorder
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- gen-command-docs.ts
- multi-cli-support — architecture
- analytics-integration.test.ts
- test-runner.ts
- ReplayStore
- harness/index.ts
- lib/launcher.ts
- quest-store.ts
- Scheduler
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
- scheduler.ts
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- comments.ts
- Process
- render.ts
- react-devtools-core.ts
- wishlist-picker.tsx
- scout.ts
- ref_node_path
- Codebase Design
- daemon-profile-wiring.test.ts
- quest-planner.ts
- merge-resolver-agent.md
- During the session
- overview.md
- github-sync.md
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
- format-converter.ts
- session-replay — knowledge
- Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)
- auto.ts
- CONTEXT.md — For AI agents using wombo as a tool
- run-task-browser.tsx
- i18n.md
- locales/index.ts
- gh
- Steps
- daemon-project-context.test.ts
- citty-merge.test.ts
- lib/history.ts
- openspec/specs/scheduler-concurrency-accounting/spec.md
- ref_node_child_process
- Test-Driven Development
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- Process
- comment.md
- writing-for-agents/SKILL.md
- portless.ts
- Steps
- json
- Requirement: Launch stagger applies only to real-agent launches
- done
- wayfinder/SKILL.md
- Domain Docs
- Domain Docs
- replay-diff.ts
- Process
- Process
- Migrate to Shoehorn
- FakeDaemonClient
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- ADDED Requirements
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
- genesis.md
- chief-of-staff/SKILL.md
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- dependencies
- Issue tracker: GitLab
- tasks archive
- merge.md
- NoLaunchRunner
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md
- devDependencies
- Local changes to vendored skills
- retry.md

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

## Communities (251 total, 38 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (98): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+90 more)

### Community 1 - "AgentRunner"
Cohesion: 0.08
Nodes (24): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected, 1. AgentRunner — Per-entry stagger flag, 2. TUI — Batch task writes in handleToggleAll (+16 more)

### Community 2 - "browser.ts"
Cohesion: 0.10
Nodes (18): Daemon and TUI, Commands, Token Usage Tracking, BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager (+10 more)

### Community 3 - "WomboConfig"
Cohesion: 0.10
Nodes (37): AbortCommandOptions, cmdAbort(), ParsedLaunchArgs, ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, EvalCommandOptions (+29 more)

### Community 4 - "splash-screen.tsx"
Cohesion: 0.06
Nodes (41): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard, channelLabel(), ChannelResult (+33 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.12
Nodes (34): MaxEscalationTier, FAKE_AGENT_VERIFICATION, isTierAllowed(), Tier25Result, abortRebase(), beginRebase(), canMerge(), cleanupRebaseBranch() (+26 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (64): startCommand, statusCommand, stopCommand, loadSessionSnapshot(), readPersistedSnapshot(), DaemonClientOptions, EventHandler, ClientData (+56 more)

### Community 7 - "run-tui-app.tsx"
Cohesion: 0.04
Nodes (79): saveConfig(), createI18n(), getLocaleT(), StringsMap, TFunction, groupByTask(), latestWhen(), ReplayScreen() (+71 more)

### Community 8 - "pull.ts"
Cohesion: 0.08
Nodes (47): defaultLoadTaskQuests(), assertId(), assertKind(), deleteMapping(), FieldConflict, findMappingByIssue(), hashComment(), hashFields() (+39 more)

### Community 9 - "task-store.ts"
Cohesion: 0.06
Nodes (65): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `comments`, `defaults`, `git` (+57 more)

### Community 10 - "commands/history.ts"
Cohesion: 0.44
Nodes (9): cmdHistory(), FG, formatDate(), formatDurationMs(), pad(), padLeft(), renderWaveDetails(), renderWaveList() (+1 more)

### Community 11 - "router.ts"
Cohesion: 0.05
Nodes (76): citty, abortCommand, cleanupCommand, commentCommand, completionCommand, daemonCommand, describeCommand, evalCommand (+68 more)

### Community 12 - "commands/launch.ts"
Cohesion: 0.10
Nodes (30): Behavior, Fake Agent, Usage, analyzeBarrelFile(), BarrelFile, cmdLaunch(), detectUnprotectedBarrels(), findIndexFiles() (+22 more)

### Community 13 - "routing.ts"
Cohesion: 0.10
Nodes (29): AgentProfile, resolveAgentBin(), Operation, AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel(), MissingEnvError (+21 more)

### Community 14 - "commands/sync.ts"
Cohesion: 0.08
Nodes (45): clientFor(), cmdSyncLabels(), cmdSyncPull(), cmdSyncPush(), cmdSyncRun(), cmdSyncStatus(), cmdSyncWatch(), failure() (+37 more)

### Community 15 - "review-list.tsx"
Cohesion: 0.08
Nodes (50): buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES (+42 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.09
Nodes (44): AgentStatus, DaemonAgentState, EvtAgentStatusChange, EvtSchedulerStatus, SchedulerStatus, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason (+36 more)

### Community 17 - "t"
Cohesion: 0.09
Nodes (37): addCommand, ensureInitialized(), linkCommand, listCommand, outputArg, refArg, showCommand, addCommand (+29 more)

### Community 18 - "useScreenInput"
Cohesion: 0.06
Nodes (94): useChromeHideQuitHint(), useScreenInput(), FakeTaskWizard(), ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase (+86 more)

### Community 19 - "github-client.ts"
Cohesion: 0.09
Nodes (33): apiUrlFor(), createGitHubClient(), paginate(), rateLimitWaitMs(), request(), CreateIssueInput, CreateLabelInput, DetectedRepo (+25 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.09
Nodes (36): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreen() (+28 more)

### Community 21 - "push.ts"
Cohesion: 0.08
Nodes (42): Pending, ensureLabels(), SAFE_ID_RE, SyncKind, MirrorFinding, MAX_NOTICE_ATTEMPTS, PendingNotice, pendingNoticesPath() (+34 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.13
Nodes (22): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayout(), ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps (+14 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.07
Nodes (49): Architecture, cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution() (+41 more)

### Community 24 - "worktree.ts"
Cohesion: 0.14
Nodes (25): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), featureBranchName(), installDeps() (+17 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.05
Nodes (62): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+54 more)

### Community 26 - "monitor.ts"
Cohesion: 0.08
Nodes (19): UsageOverlayViewProps, extractActivity(), formatEventForLog(), MonitorCallbacks, OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd() (+11 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.05
Nodes (26): Arguments, Global flags, Arguments, Global flags, Arguments, Global flags, Arguments, Global flags (+18 more)

### Community 29 - "schema.ts"
Cohesion: 0.19
Nodes (20): hasKey(), aliasHint(), allCommandSchemas(), commandToSchema(), descriptionOf(), findCommandDef(), flagDescriptionOf(), flagKeyName() (+12 more)

### Community 30 - "UsageTotals"
Cohesion: 0.36
Nodes (7): QuestPickerViewProps, defaultProps(), EMPTY_USAGE, makeQuest(), makeSummary(), QuestSummary, UsageTotals

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (5): delegateToDaemon(), waitForDaemonCompletion(), DaemonClient, CommandMap, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.12
Nodes (29): AgentRegistryMode, consolePreflightConfirm(), inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps (+21 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.19
Nodes (20): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+12 more)

### Community 34 - "harness/types.ts"
Cohesion: 0.17
Nodes (18): Adding a harness, build(), expand(), errorEvent(), normalizeToolInput(), parseJsonLine(), resultText(), stepFinishEvent() (+10 more)

### Community 35 - "toon.ts"
Cohesion: 0.06
Nodes (55): clampScore(), intervalsOverlap(), loadEvalReport(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), ScoreReport, scoreRouting() (+47 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.12
Nodes (35): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CommandRunner, CreateOrUpdatePrOptions (+27 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.11
Nodes (21): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+13 more)

### Community 39 - "setup-matt-pocock-skills/SKILL.md"
Cohesion: 0.17
Nodes (7): Conventions, Issue tracker: Local Markdown, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Setup Matt Pocock's Skills, Triage Labels

### Community 40 - "task-schema.ts"
Cohesion: 0.14
Nodes (22): DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema, PRIORITY_ORDER, SchemaIssue, TASK_ARRAY_FIELDS, TASK_REQUIRED_FIELDS (+14 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (35): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES, isObject() (+27 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics-summary.ts"
Cohesion: 0.24
Nodes (13): AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions(), filterExecutions() (+5 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (42): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+34 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.09
Nodes (33): ReplayRecorderOptions, Tracked, boundValue(), DEFAULT_KEEP_PER_TASK, FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent() (+25 more)

### Community 48 - "quest-wizard.tsx"
Cohesion: 0.14
Nodes (16): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), PRIORITY_COLORS, QuestWizard(), QuestWizardProps, STEPS, WizardPhase (+8 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (15): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight, resolveCommitSha() (+7 more)

### Community 51 - "ref_node_os"
Cohesion: 0.08
Nodes (44): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), VerificationSummary, createBlankTask(), addVerifiedAgent(), makeAgent() (+36 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (32): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine(), LoadedReplay (+24 more)

### Community 54 - "msg"
Cohesion: 0.13
Nodes (53): cmdCommentAdd(), cmdCommentLink(), parseRefOrFail(), applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview() (+45 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "run-daemon-monitor.tsx"
Cohesion: 0.11
Nodes (26): EvtAgentActivity, EvtBuildResult, EvtHitlQuestion, EvtLog, EvtMergeResult, EvtTokenUsage, SchedulerState, DashboardAgent (+18 more)

### Community 57 - "prompt.ts"
Cohesion: 0.11
Nodes (25): formatHunksForLLM(), portlessUrl(), capComments(), abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText() (+17 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.06
Nodes (31): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags (+23 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "init-app.tsx"
Cohesion: 0.14
Nodes (22): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+14 more)

### Community 62 - "dashboard-provider.tsx"
Cohesion: 0.05
Nodes (29): ConnectionState, EventMap, clientState(), DASHBOARD_EVENTS, DashboardDaemonClient, DashboardMetricsProvider(), DashboardMetricsProviderProps, mapConnection() (+21 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.23
Nodes (15): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), colorize(), elapsed(), FG (+7 more)

### Community 64 - "ink/index.ts"
Cohesion: 0.07
Nodes (64): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+56 more)

### Community 65 - "useI18n"
Cohesion: 0.07
Nodes (76): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+68 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.10
Nodes (20): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions (+12 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.09
Nodes (9): escMenuCursor(), eventually(), selectFromEscMenu(), waitFor(), LiveFakeClient, makeMinimalConfig(), mountShell(), openDashboardFromMenu() (+1 more)

### Community 68 - "analytics.ts"
Cohesion: 0.08
Nodes (30): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+22 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (15): 1. Are agents spawned with `detached: true` and `unref()`?, 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown (+7 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.16
Nodes (23): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+15 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.10
Nodes (34): MergeCommandDeps, normalizePostMergeConfig(), AgentRunnerConfig, Git, isComplete(), isJournal(), Journal, JournalOperation (+26 more)

### Community 74 - "InkDaemonTUI"
Cohesion: 0.11
Nodes (5): InkDaemonTUI, getStdin(), stdinIsTTY, TuiSession, TuiSessionOptions

### Community 75 - "templates.ts"
Cohesion: 0.20
Nodes (15): isPortlessAvailable(), AGENT_TEMPLATE_PATH, applyHitlAwareness(), applyPlaceholders(), buildTddBlock(), joinFrontmatter(), PATCH_BODY_END_PATH, PATCH_BODY_START_PATH (+7 more)

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
Cohesion: 0.14
Nodes (31): buildAnalyticsSummary(), cmdUsage(), cmdUsageAnalytics(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost() (+23 more)

### Community 81 - "config.ts"
Cohesion: 0.08
Nodes (23): cmdInit(), InitOptions, AgentRegistryConfig, CommentsConfig, CONFIG_FILE, deepMerge(), DIFFICULTIES, isPlainObject() (+15 more)

### Community 82 - "tdd-verifier.test.ts"
Cohesion: 0.11
Nodes (28): buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions, TddVerificationResult (+20 more)

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.18
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 86 - "run-quest-picker.tsx"
Cohesion: 0.13
Nodes (16): FakeTaskConfig, generateFakeTasks(), shuffleArr(), shuffledTitles(), QuestPickerAction, QuestPickerApp(), QuestPickerScreenProps, runQuestPickerInk() (+8 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.14
Nodes (19): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProvider(), EscMenuProviderProps (+11 more)

### Community 88 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.05
Nodes (49): ink, react, App(), AppProps, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardProps (+41 more)

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

### Community 95 - "ReplayRecorder"
Cohesion: 0.14
Nodes (3): errMsg(), ReplayRecorder, ReplayEndOutcome

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
Nodes (32): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+24 more)

### Community 101 - "gen-command-docs.ts"
Cohesion: 0.31
Nodes (15): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+7 more)

### Community 102 - "multi-cli-support — architecture"
Cohesion: 0.24
Nodes (9): Fallback chains, Routing, plan(), Config (src/config.ts, schemas/config.schema.json), Constraints, Core idea: normalize at the edge, keep the pipeline untouched, File ownership (mostly sequential; tasks 2 and 3 can run in parallel), multi-cli-support — architecture (+1 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.18
Nodes (9): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+1 more)

### Community 104 - "test-runner.ts"
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 105 - "ReplayStore"
Cohesion: 0.20
Nodes (8): assertSafe(), isSafeSegment(), replaysDir(), ReplayStore, seedReplay(), seed(), seed(), SRC_ENTRY

### Community 106 - "harness/index.ts"
Cohesion: 0.16
Nodes (17): claudeCodeHarness, codexHarness, customHarness, HARNESS_IDS, isHarnessId(), OPERATIONS, detectHarnessFromBin(), getHarness() (+9 more)

### Community 107 - "lib/launcher.ts"
Cohesion: 0.10
Nodes (28): 7. Verify, HarnessId, ResolvedRoute, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness(), SpawnTarget, stripFrontmatter() (+20 more)

### Community 108 - "quest-store.ts"
Cohesion: 0.24
Nodes (19): archivedKnowledgeDir(), archivedKnowledgeFilePath(), archivedQuestFilePath(), archiveQuest(), atomicWrite(), deleteQuest(), ensureDir(), getQuestsDir() (+11 more)

### Community 109 - "Scheduler"
Cohesion: 0.05
Nodes (50): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+42 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.04
Nodes (67): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+59 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "citty-bridge.ts"
Cohesion: 0.23
Nodes (13): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, buildRegistry() (+5 more)

### Community 113 - "daemon-agent-runner.test.ts"
Cohesion: 0.11
Nodes (14): PostMergeRequest, Env, EnvOpts, ReentrantRunner, SpyRunner, TestableAgentRunner, FakeGh, FakeGhOptions (+6 more)

### Community 114 - "saveTaskToStore"
Cohesion: 0.07
Nodes (28): autoSyncBusy(), configureAutoSync(), resetAutoSync(), createTask(), saveTaskToStore(), FakeComment, FakeGitHub, FakeGitHubOptions (+20 more)

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
Nodes (13): ReplayViewer(), parseReplay(), BASE, Harness, live, makeReplay(), mount(), smallReplay() (+5 more)

### Community 122 - "tmpDir"
Cohesion: 0.06
Nodes (35): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+27 more)

### Community 123 - "tdd-baseline-integration.test.ts"
Cohesion: 0.16
Nodes (12): ensureQuestTestBaseline(), captureMain(), Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo() (+4 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 125 - "scheduler.ts"
Cohesion: 0.17
Nodes (14): SchedulerDeps, TERMINAL_STATUSES, buildChainFrom(), buildDepGraph(), buildSchedulePlan(), computeTopologicalOrder(), DepChain, DepGraph (+6 more)

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
Cohesion: 0.13
Nodes (26): DEFAULT_CONFIG, addComment(), AddCommentInput, assertSafeId(), CommentRef, COMMENTS_DIR, commentsDir(), compareComments() (+18 more)

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "render.ts"
Cohesion: 0.08
Nodes (57): CommentRole, Quest, QuestStatus, remoteQuestView(), remoteSyncHash(), remoteTaskView, TRIAGE_LABELS, triageLabelsFor() (+49 more)

### Community 137 - "wishlist-picker.tsx"
Cohesion: 0.22
Nodes (15): UseWishlistStoreResult, formatDate(), truncateText(), AddInput(), OverlayFooter(), OverlayItemList(), WishlistOverlay(), WishlistOverlayProps (+7 more)

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 140 - "ref_node_path"
Cohesion: 0.07
Nodes (25): root, code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage() (+17 more)

### Community 142 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 143 - "daemon-profile-wiring.test.ts"
Cohesion: 0.31
Nodes (6): cfg(), ExposedRunner, heavy, light, routed(), task()

### Community 144 - "quest-planner.ts"
Cohesion: 0.07
Nodes (45): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree() (+37 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "github-sync.md"
Cohesion: 0.17
Nodes (11): Authentication, Checking the mirror, Commands, Configuration, Conflicts, Known limits, Labels, Manual and auto mode (+3 more)

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

### Community 158 - "daemon-scheduler.test.ts"
Cohesion: 0.18
Nodes (3): makeAgent(), makeConfig(), makeScopeScheduler()

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

### Community 164 - "format-converter.ts"
Cohesion: 0.27
Nodes (11): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+3 more)

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)"
Cohesion: 0.20
Nodes (9): Claim, progress, resolve, Comments, Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror), Pull requests as a triage surface, Rules, The mirror is automated, When a skill says "fetch the relevant ticket", When a skill says "publish a spec to the issue tracker" (+1 more)

### Community 167 - "auto.ts"
Cohesion: 0.12
Nodes (23): extractGlobalFlags(), ExtractResult, GlobalFlags, buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), ResolvedCommand, resolveGlobalFlagsAndCommand() (+15 more)

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 169 - "run-task-browser.tsx"
Cohesion: 0.07
Nodes (39): ANALYTICS_REFRESH_MS, analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction, TaskBrowserApp() (+31 more)

### Community 171 - "i18n.md"
Cohesion: 0.12
Nodes (13): Configuration, Custom command template, Profile fields, Secrets never go in config, Supported harnesses and verification status, Adding a locale, Checks, Choosing a language (+5 more)

### Community 173 - "locales/index.ts"
Cohesion: 0.18
Nodes (4): availableLocales(), FALLBACK_LOCALE, FlatResource, ENTRY

### Community 174 - "gh"
Cohesion: 0.24
Nodes (10): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Entry points, GitHub sync (+2 more)

### Community 175 - "Steps"
Cohesion: 0.17
Nodes (11): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 8. Commit, Notes (+3 more)

### Community 177 - "daemon-project-context.test.ts"
Cohesion: 0.25
Nodes (10): Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states (+2 more)

### Community 180 - "citty-merge.test.ts"
Cohesion: 0.22
Nodes (4): BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), buildAliasMap()

### Community 184 - "lib/history.ts"
Cohesion: 0.36
Nodes (9): computeDuration(), daemonSessionToHistory(), ensureHistoryDir(), exportDaemonHistory(), HistoryAgentSource, historyDir(), listHistory(), loadHistory() (+1 more)

### Community 187 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.25
Nodes (7): Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 191 - "ref_node_child_process"
Cohesion: 0.25
Nodes (4): FAKE_AGENT_SENTINEL, dirs, runners, states

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

### Community 198 - "portless.ts"
Cohesion: 0.54
Nodes (7): ensureProxyRunning(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus(), resolvePortlessBin(), wrapWithPortless()

### Community 199 - "Steps"
Cohesion: 0.11
Nodes (16): Files, Implementation vs Review, Reference, Steps, 1. Detect the environment, 2. Install dependency-cruiser, 3. Write the config, 4. Wire it into the checks (+8 more)

### Community 200 - "json"
Cohesion: 0.11
Nodes (21): Flags, Flags, Flags, Flags, Flags, Global flags, Global flags, Global flags (+13 more)

### Community 201 - "Requirement: Launch stagger applies only to real-agent launches"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents

### Community 202 - "done"
Cohesion: 0.13
Nodes (10): Vocabulary, Wayfinding operations (used by `/wayfinder`), Commands, Dependencies and ordering, Fields, Flags, Global flags, tasks list (+2 more)

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 205 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 206 - "replay-diff.ts"
Cohesion: 0.31
Nodes (10): EXCLUDED_PATH_PREFIXES, captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat(), pathspecs(), runGit(), untrackedPaths() (+2 more)

### Community 207 - "Process"
Cohesion: 0.33
Nodes (6): 1. Explore, 2. Present findings and ask, 3. Confirm and edit, 4. Write, 5. Done, Process

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

### Community 214 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 215 - "comments.md"
Cohesion: 0.22
Nodes (8): Author resolution, CLI, How comments reach agents, In the TUI, Merge-friendliness, Mirroring to GitHub, Roles, Storage layout

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

### Community 231 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, citty, i18next, ink, mermaidtui, react, yaml

### Community 232 - "Issue tracker: GitLab"
Cohesion: 0.33
Nodes (6): Conventions, Issue tracker: GitLab, Merge requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 233 - "tasks archive"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks archive

### Community 248 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, @types/bun, @types/react, typescript

### Community 252 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1784 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `splash-screen.tsx`, `agent-runner.ts`, `protocol.ts`, `run-tui-app.tsx`, `task-store.ts`, `commands/history.ts`, `router.ts`, `commands/launch.ts`, `ref_node_path`, `commands/sync.ts`, `review-list.tsx`, `dashboard.tsx`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `schema.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `auto.ts`, `task-schema.ts`, `i18n.md`, `lib/replay.ts`, `msg`, `run-daemon-monitor.tsx`, `commands/tasks.md`, `commands/status.ts`, `ink/index.ts`, `useI18n`, `portless.ts`, `done`, `templates.ts`, `commands/usage.ts`, `config.ts`, `tdd-verifier.test.ts`, `commands/completion.ts`, `esc-menu.tsx`, `graph.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.020202020202020204 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `comments.ts`, `splash-screen.tsx`, `agent-runner.ts`, `protocol.ts`, `run-tui-app.tsx`, `pull.ts`, `task-store.ts`, `commands/history.ts`, `commands/launch.ts`, `ref_node_path`, `routing.ts`, `commands/sync.ts`, `quest-planner.ts`, `t`, `useScreenInput`, `daemon-profile-wiring.test.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/tasks.ts`, `analytics-lifecycle.test.ts`, `daemon-scheduler.test.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `toon.ts`, `Daemon`, `run-task-browser.tsx`, `analytics-measurements.test.ts`, `test-baseline-capture.ts`, `daemon-project-context.test.ts`, `ref_node_os`, `msg`, `run-daemon-monitor.tsx`, `prompt.ts`, `commands/status.ts`, `ink/index.ts`, `analytics.ts`, `portless.ts`, `post-merge.ts`, `InkDaemonTUI`, `templates.ts`, `claims.ts`, `commands/usage.ts`, `config.ts`, `tdd-verifier.test.ts`, `run-quest-picker.tsx`, `daemon-test-baseline.test.ts`, `analytics-integration.test.ts`, `lib/launcher.ts`, `daemon-agent-runner.test.ts`, `graph.ts`, `tdd-baseline-integration.test.ts`, `tdd-baseline-pipeline.test.ts`, `scheduler.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.08291708291708291 - nodes in this community are weakly interconnected._
- **Why does `json()` connect `json` to `wombo-combo`, `genesis.md`, `comment.md`, `tasks archive`, `merge.md`, `done`, `commands/team.md`, `daemon.md`, `github-client.ts`, `retry.md`, `quest.md`, `c`, `wishlist.md`, `commands/tasks.md`, `index.md`, `replay.md`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._