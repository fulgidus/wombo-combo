# Graph Report - wombo-combo  (2026-10-11)

## Corpus Check
- 616 files · ~662,409 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 5166 nodes · 14629 edges · 256 communities (209 shown, 47 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 708 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f974365`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- 2026-03-21-fix-scheduler-oversubscription/tasks.md
- agent-runner.ts
- protocol.ts
- run-daemon-monitor.tsx
- ink/index.ts
- task-store.ts
- eval-score.ts
- loadConfig
- router.ts
- routing.ts
- run-task-browser.tsx
- review-list.tsx
- dashboard-metrics.ts
- msg
- onboarding/index.ts
- daemon-project-context.test.ts
- dashboard.tsx
- t
- chrome.tsx
- lib/i18n.ts
- worktree.ts
- list.ts
- monitor.ts
- hitl-channel.ts
- index.md
- schema.ts
- useI18n
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
- output
- analytics-measurements.test.ts
- tdd-baseline-integration.test.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- commands/quest.ts
- quest.md
- state.ts
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- init-app.tsx
- daemon-client.test.ts
- commands/status.ts
- commands/tui.ts
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
- scheduler.ts
- commands/usage.ts
- commands/logs.ts
- tdd-verifier.ts
- Triage
- commands/completion.ts
- .submitTask
- dashboard-usage.ts
- esc-menu.tsx
- ReplayRecorder
- wishlist.md
- ref_bun_test
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- changelog.ts
- project-store.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- gen-command-docs.ts
- config.ts
- analytics-integration.test.ts
- test-runner.ts
- ReplayStore
- hitl-ask.ts
- lib/launcher.ts
- Commands
- Scheduler
- maxConcurrent
- daemon.md
- registry-parity.test.ts
- daemon-agent-runner.test.ts
- saveTaskToStore
- WOMBO_DIR
- config.md
- cli-smoke.test.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- replay-viewer.test.tsx
- syncQuestBranch
- commands/upgrade.ts
- ref_node_child_process
- StubDaemonClient
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- comments.ts
- Process
- quest-wizard.tsx
- react-devtools-core.ts
- Task
- scout.ts
- analytics-lifecycle.test.ts
- Codebase Design
- ref_node_path
- genesis-planner.ts
- merge-resolver-agent.md
- During the session
- overview.md
- daemon/launcher.ts
- first-task.md
- quests.md
- .doLaunch
- wombo-combo Operational Constraints
- lib/tasks.ts
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
- commands/init.ts
- session-replay — knowledge
- Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)
- src/index.ts
- CONTEXT.md — For AI agents using wombo as a tool
- run-quest-picker.tsx
- tasks show
- .load
- onboarding-helpers.ts
- Steps
- LiveFakeClient
- Test-Driven Development
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- Process
- comment.md
- writing-for-agents/SKILL.md
- eval.md
- Steps
- Quest
- replay-recorder.test.ts
- task-browser.test.tsx
- wayfinder/SKILL.md
- Domain Docs
- TokenCollector
- replay-diff.ts
- analytics-git.ts
- comments.md
- Migrate to Shoehorn
- harnesses.md
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- .allComplete
- Agent Process Lifecycle Audit
- Process
- <Questionnaire title>
- fake-agent-runner.ts
- writing-shape/SKILL.md
- citty/merge.ts
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
- logs.md
- UsageStore
- multi-cli-support — architecture
- i18n.md
- guides/team.md
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md
- 2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md
- guides/tasks.md
- genesis.md
- quest show
- retry.md
- Agent Analytics
- usage.md
- citty-launch.test.ts

## God Nodes (most connected - your core abstractions)
1. `t()` - 183 edges
2. `WomboConfig` - 147 edges
3. `react` - 118 edges
4. `Explore mode guidelines and usage rules` - 114 edges
5. `useI18n()` - 113 edges
6. `ink` - 111 edges
7. `DaemonState` - 106 edges
8. `AgentRunner` - 101 edges
9. `t` - 97 edges
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

## Communities (256 total, 47 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (97): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+89 more)

### Community 1 - "AgentRunner"
Cohesion: 0.14
Nodes (6): Assistant (Build · claude-sonnet-4.6 · 6.2s), normalizeCommentsConfig(), AgentRunner, getConflictDiffs(), isTierAllowed(), runSafeCmd()

### Community 2 - "browser.ts"
Cohesion: 0.12
Nodes (16): Daemon and TUI, BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult (+8 more)

### Community 3 - "WomboConfig"
Cohesion: 0.08
Nodes (42): AbortCommandOptions, cmdAbort(), ParsedLaunchArgs, ParsedResumeArgs, parseResumeArgs(), ParsedRetryArgs, parseRetryArgs(), CleanupOptions (+34 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.10
Nodes (36): FAKE_AGENT_VERIFICATION, runTier25(), Tier25Result, FAKE_AGENT_SENTINEL, abortRebase(), beginRebase(), canMerge(), cleanupRebaseBranch() (+28 more)

### Community 6 - "protocol.ts"
Cohesion: 0.09
Nodes (43): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, CmdCancelAgent, CmdGetState (+35 more)

### Community 7 - "run-daemon-monitor.tsx"
Cohesion: 0.05
Nodes (64): useDashboardStore(), createI18n(), EN_STRINGS, getLocaleT(), I18nContext, StringsMap, TFunction, defaultNav (+56 more)

### Community 8 - "ink/index.ts"
Cohesion: 0.09
Nodes (37): createIsolatedStdout(), getStableStdin(), ErrandWizardProps, GenesisReviewAppProps, InitWriterResult, getEditorCommand(), openEditor(), OpenEditorOptions (+29 more)

### Community 9 - "task-store.ts"
Cohesion: 0.19
Nodes (30): Top-level options, archiveDir(), atomicWrite(), createBackup(), defaultMeta(), ensureDir(), flattenTask(), getArchiveDir() (+22 more)

### Community 10 - "eval-score.ts"
Cohesion: 0.09
Nodes (37): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+29 more)

### Community 11 - "loadConfig"
Cohesion: 0.11
Nodes (28): citty, addCommand, ensureInitialized(), listCommand, outputArg, refArg, showCommand, genesisCommand (+20 more)

### Community 12 - "router.ts"
Cohesion: 0.10
Nodes (31): abortCommand, cleanupCommand, commentCommand, completionCommand, daemonCommand, describeCommand, evalCommand, helpCommand (+23 more)

### Community 13 - "routing.ts"
Cohesion: 0.10
Nodes (30): CONFIG_FILE, resolveAgentBin(), Operation, detectHarnessFromBin(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel() (+22 more)

### Community 14 - "run-task-browser.tsx"
Cohesion: 0.15
Nodes (21): defaultLoadTaskQuests(), analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserApp(), TaskBrowserScreenProps (+13 more)

### Community 15 - "review-list.tsx"
Cohesion: 0.07
Nodes (63): buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), HITL_MODES, PRIORITIES, questStash (+55 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.11
Nodes (39): EvtAgentActivity, EvtBuildResult, EvtMergeResult, EvtTaskPicked, SchedulerStatus, initialValue(), ActivityEntry, advanceThroughput() (+31 more)

### Community 17 - "msg"
Cohesion: 0.13
Nodes (42): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+34 more)

### Community 18 - "onboarding/index.ts"
Cohesion: 0.13
Nodes (40): useChromeHideQuitHint(), ConfirmDialog(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase, OnboardingApp(), OnboardingAppProps (+32 more)

### Community 19 - "daemon-project-context.test.ts"
Cohesion: 0.25
Nodes (10): Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states (+2 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.04
Nodes (69): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgent, DashboardAgentRow(), DashboardAgentRowProps (+61 more)

### Community 21 - "t"
Cohesion: 0.12
Nodes (30): Behavior, Fake Agent, Usage, analyzeBarrelFile(), BarrelFile, cmdLaunch(), delegateToDaemon(), detectUnprotectedBarrels() (+22 more)

### Community 22 - "chrome.tsx"
Cohesion: 0.13
Nodes (22): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayout(), ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps (+14 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.09
Nodes (32): Architecture, AVAILABLE_LOCALES, clearMissingKeys(), createInstance(), detectLocale(), DetectOptions, envDev(), getFixedT() (+24 more)

### Community 24 - "worktree.ts"
Cohesion: 0.13
Nodes (27): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), deleteQuestBranch(), featureBranchName() (+19 more)

### Community 25 - "list.ts"
Cohesion: 0.09
Nodes (34): commentsForShow(), printRecentComments(), label(), questShow(), CheckResult, checkTasks(), hasCycle(), cmdTasksCheck() (+26 more)

### Community 26 - "monitor.ts"
Cohesion: 0.18
Nodes (15): UsageOverlayViewProps, MonitorCallbacks, MonitoredProcess, OpenCodeEvent, ParsedOutput, parseEvents(), isTokenEvent(), parseUsageFromEvent() (+7 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (22): Arguments, Global flags, Flags, Global flags, Arguments, Global flags, Arguments, Global flags (+14 more)

### Community 29 - "schema.ts"
Cohesion: 0.18
Nodes (21): getLocale(), hasKey(), aliasHint(), allCommandSchemas(), commandToSchema(), descriptionOf(), findCommandDef(), flagDescriptionOf() (+13 more)

### Community 30 - "useI18n"
Cohesion: 0.08
Nodes (68): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+60 more)

### Community 31 - "DaemonClient"
Cohesion: 0.11
Nodes (5): DaemonClient, EvtStateSnapshot, DaemonMonitorShellProps, InkDaemonTUIOptions, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.13
Nodes (27): AgentRegistryMode, inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps, agentNameFromType() (+19 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.18
Nodes (20): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+12 more)

### Community 34 - "harness/index.ts"
Cohesion: 0.14
Nodes (24): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+16 more)

### Community 35 - "toon.ts"
Cohesion: 0.14
Nodes (33): TaskStatus, encodeDifficulty(), encodePriority(), encodeStatus(), fieldsHeader(), renderCleanup(), renderEval(), renderGeneric() (+25 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.12
Nodes (34): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CreateOrUpdatePrOptions, createOrUpdatePullRequest() (+26 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.17
Nodes (11): allocateExecutionId(), AnalyticsTracker, AnalyticsTrackerOptions, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState (+3 more)

### Community 39 - "Issue tracker: GitHub"
Cohesion: 0.06
Nodes (30): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary, Conventions, Issue tracker: GitHub, Pull requests as a triage surface (+22 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.15
Nodes (20): DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema, PRIORITY_ORDER, SchemaIssue, TASK_ARRAY_FIELDS, TASK_REQUIRED_FIELDS (+12 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (36): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+28 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics.ts"
Cohesion: 0.06
Nodes (45): Flags, Global flags, buildAnalyticsSummary(), ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION (+37 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (40): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+32 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (22): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+14 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.10
Nodes (28): boundValue(), DEFAULT_KEEP_PER_TASK, FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent(), num(), recordLabel() (+20 more)

### Community 48 - "output"
Cohesion: 0.17
Nodes (20): cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution(), aggregateByModel() (+12 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "tdd-baseline-integration.test.ts"
Cohesion: 0.08
Nodes (26): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+18 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.08
Nodes (43): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), VerificationSummary, createBlankTask(), addVerifiedAgent(), SeedSpec (+35 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (33): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+25 more)

### Community 54 - "commands/quest.ts"
Cohesion: 0.09
Nodes (50): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), questHelp(), questList() (+42 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "state.ts"
Cohesion: 0.09
Nodes (27): AgentStatus, DaemonAgentState, EvtSchedulerStatus, SchedulerState, ReplayRecorderOptions, Tracked, ACTIVE_STATUSES, AgentRemovalObserver (+19 more)

### Community 57 - "prompt.ts"
Cohesion: 0.11
Nodes (24): formatHunksForLLM(), portlessUrl(), capComments(), abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText() (+16 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.06
Nodes (34): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags (+26 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "init-app.tsx"
Cohesion: 0.14
Nodes (22): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+14 more)

### Community 62 - "daemon-client.test.ts"
Cohesion: 0.12
Nodes (9): ConnectionState, EventMap, makeEvent(), makeClient(), serverBroadcast(), serverReceived, serverSockets, startTestServer() (+1 more)

### Community 63 - "commands/status.ts"
Cohesion: 0.20
Nodes (17): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize() (+9 more)

### Community 64 - "commands/tui.ts"
Cohesion: 0.08
Nodes (43): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+35 more)

### Community 65 - "wishlist-picker.tsx"
Cohesion: 0.16
Nodes (19): UseWishlistStoreResult, formatDate(), truncateText(), AddInput(), OverlayFooter(), OverlayItemList(), createTestStreams(), renderLive() (+11 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.10
Nodes (20): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo, Coding conventions (+12 more)

### Community 67 - "monitor-router.test.tsx"
Cohesion: 0.05
Nodes (27): ANALYTICS_REFRESH_MS, TaskBrowserScreen(), escMenuCursor(), eventually(), selectFromEscMenu(), waitFor(), Harness, mount() (+19 more)

### Community 68 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.15
Nodes (10): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Findings, isProcessRunning(), extractActivity(), formatEventForLog(), ProcessMonitor, shortCmd() (+2 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.16
Nodes (23): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+15 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.10
Nodes (35): MergeCommandDeps, normalizePostMergeConfig(), AgentRunnerConfig, CommandRunner, Git, isComplete(), isJournal(), Journal (+27 more)

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

### Community 79 - "scheduler.ts"
Cohesion: 0.07
Nodes (36): normalizeTeamConfig(), SchedulerDeps, TERMINAL_STATUSES, assertSafeId(), Claim, ClaimInfo, ClaimOptions, claimPath() (+28 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.19
Nodes (22): coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost(), formatNumber(), groupKeyLabel(), lbl() (+14 more)

### Community 81 - "commands/logs.ts"
Cohesion: 0.36
Nodes (8): cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText(), renderLogs()

### Community 82 - "tdd-verifier.ts"
Cohesion: 0.14
Nodes (26): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationResult, TestBaselineComparison, DEFAULT_TEST_DETECTION_CONFIG (+18 more)

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.18
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - ".submitTask"
Cohesion: 0.10
Nodes (16): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+8 more)

### Community 86 - "dashboard-usage.ts"
Cohesion: 0.12
Nodes (11): addInto(), buildTaskQuestMap(), cloneTotals(), DashboardUsageReader, emptyTotals(), mergeInto(), normalizeUsageRecord(), TaskQuestLookup (+3 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.14
Nodes (19): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProvider(), EscMenuProviderProps (+11 more)

### Community 88 - "ReplayRecorder"
Cohesion: 0.13
Nodes (3): errMsg(), ReplayRecorder, ReplayEndOutcome

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "ref_bun_test"
Cohesion: 0.04
Nodes (70): ink, react, App(), AppProps, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardStep (+62 more)

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

### Community 95 - "project-store.ts"
Cohesion: 0.09
Nodes (38): OnboardingResult, OnboardingScreen(), OnboardingScreenProps, runOnboardingInk(), RunOnboardingOptions, runBrownfieldScout(), addObjective(), addRule() (+30 more)

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.14
Nodes (14): Commands, Comments, Entry points, Install, Languages, Launch options, License, Merge, changelog and pull requests (+6 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.09
Nodes (8): Assistant (Build · claude-sonnet-4.6 · 26.9s), Assistant (Build · claude-sonnet-4.6 · 7.5s), On Elixir/BEAM architecture as an evolution, The actual bugs — precise diagnosis, DaemonState, setup(), makePopulatedState(), makeRunner()

### Community 101 - "gen-command-docs.ts"
Cohesion: 0.21
Nodes (16): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+8 more)

### Community 102 - "config.ts"
Cohesion: 0.08
Nodes (31): AgentProfile, AgentRegistryConfig, CommentsConfig, deepMerge(), DIFFICULTIES, isPlainObject(), MaxEscalationTier, MergeEscalationConfig (+23 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

### Community 104 - "test-runner.ts"
Cohesion: 0.26
Nodes (13): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests(), stripAnsi() (+5 more)

### Community 105 - "ReplayStore"
Cohesion: 0.23
Nodes (8): assertSafe(), isSafeSegment(), replaysDir(), ReplayStore, summarize(), seedReplay(), seed(), seed()

### Community 106 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 107 - "lib/launcher.ts"
Cohesion: 0.09
Nodes (35): 1. Are agents spawned with `detached: true` and `unref()`?, HarnessId, getHarness(), normalizeOutput(), ResolvedRoute, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness() (+27 more)

### Community 108 - "Commands"
Cohesion: 0.50
Nodes (3): Commands, Token Usage Tracking, usage()

### Community 109 - "Scheduler"
Cohesion: 0.07
Nodes (39): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+31 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (59): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+51 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "registry-parity.test.ts"
Cohesion: 0.16
Nodes (15): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, BRIDGE_REGISTRY (+7 more)

### Community 113 - "daemon-agent-runner.test.ts"
Cohesion: 0.10
Nodes (16): defaultCommandRunner(), PostMergeRequest, Env, EnvOpts, makeEnv(), ReentrantRunner, SpyRunner, TestableAgentRunner (+8 more)

### Community 114 - "saveTaskToStore"
Cohesion: 0.16
Nodes (16): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+8 more)

### Community 115 - "WOMBO_DIR"
Cohesion: 0.15
Nodes (21): yaml, addCommand, deleteCommand, listCommand, moveCommand, WOMBO_DIR, HookResult, TestComponent() (+13 more)

### Community 116 - "config.md"
Cohesion: 0.12
Nodes (16): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `comments`, `defaults`, `git` (+8 more)

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

### Community 122 - "syncQuestBranch"
Cohesion: 0.06
Nodes (34): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+26 more)

### Community 123 - "commands/upgrade.ts"
Cohesion: 0.12
Nodes (22): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard, channelLabel(), ChannelResult (+14 more)

### Community 124 - "ref_node_child_process"
Cohesion: 0.11
Nodes (24): extractTddErrorSummary(), TddVerificationOptions, createTestBaseline(), TestBaseline, BuildResult, extractErrorSummary(), FullVerificationOptions, runBuild() (+16 more)

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
Nodes (29): cmdCommentAdd(), cmdCommentList(), cmdCommentShow(), CommentOptions, fmtWhen(), parseRefOrFail(), printComment(), refLabel() (+21 more)

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "quest-wizard.tsx"
Cohesion: 0.11
Nodes (18): buildDifficultyItems(), buildHitlItems(), buildPriorityItems(), PRIORITY_COLORS, QuestWizard(), STEPS, createTestStreams(), noopSave (+10 more)

### Community 137 - "Task"
Cohesion: 0.27
Nodes (8): TaskEditorProps, Task, cfg(), ExposedRunner, heavy, light, routed(), task()

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
Cohesion: 0.06
Nodes (22): root, code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage() (+14 more)

### Community 144 - "genesis-planner.ts"
Cohesion: 0.12
Nodes (21): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput, parseGenesisYaml() (+13 more)

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
Cohesion: 0.19
Nodes (16): startCommand, statusCommand, stopCommand, cleanupPidFile(), DaemonStatus, ensureDaemonRunning(), getDaemonHealthStatus(), getDaemonStatus() (+8 more)

### Community 149 - "first-task.md"
Cohesion: 0.29
Nodes (6): 1. Initialize the project, 2. Add a task, 3. Preview, then launch, 4. Verify and merge, 5. Clean up, Where to go next

### Community 150 - "quests.md"
Cohesion: 0.33
Nodes (5): Branches, Constraints, Lifecycle, Planning, TDD

### Community 151 - ".doLaunch"
Cohesion: 0.09
Nodes (19): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Supported test output, What is recorded (+11 more)

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 153 - "lib/tasks.ts"
Cohesion: 0.12
Nodes (23): deleteTaskFile(), removeTaskFromStore(), tasksStoreExists(), allTaskIds(), ArchiveFile, areDependenciesMet(), ensureFeaturesFile, ensureTasksFile() (+15 more)

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

### Community 165 - "session-replay — knowledge"
Cohesion: 0.29
Nodes (6): Conventions, File ownership (one task owns each file), Goal, Seams, session-replay — knowledge, Viewer decisions

### Community 166 - "Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)"
Cohesion: 0.18
Nodes (10): Claim, progress, resolve, Comments, Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror), Pull requests as a triage surface, Rules, Vocabulary, Wayfinding operations (used by `/wayfinder`), When a skill says "fetch the relevant ticket" (+2 more)

### Community 167 - "src/index.ts"
Cohesion: 0.18
Nodes (12): extractGlobalFlags(), ExtractResult, GlobalFlags, buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), ResolvedCommand, resolveGlobalFlagsAndCommand() (+4 more)

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 169 - "run-quest-picker.tsx"
Cohesion: 0.18
Nodes (17): cmdUsage(), groupedToJSON(), toGroupableField(), totalsToJSON(), validateUsageOptions(), generateFakeTasks(), shuffleArr(), shuffledTitles() (+9 more)

### Community 171 - "tasks show"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks show

### Community 173 - ".load"
Cohesion: 0.08
Nodes (24): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+16 more)

### Community 174 - "onboarding-helpers.ts"
Cohesion: 0.24
Nodes (7): canonicalizeOutput(), buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks(), formatProfileAsMarkdown(), runLlmSynthesis(), PLAN

### Community 175 - "Steps"
Cohesion: 0.15
Nodes (12): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 7. Verify, 8. Commit (+4 more)

### Community 191 - "LiveFakeClient"
Cohesion: 0.14
Nodes (3): LiveFakeClient, makeMinimalConfig(), mountShell()

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
Cohesion: 0.15
Nodes (12): Arguments, Arguments, Arguments, comment add, comment list, comment show, Flags, Flags (+4 more)

### Community 197 - "writing-for-agents/SKILL.md"
Cohesion: 0.15
Nodes (11): Context pointers, Information hierarchy, Leading words, Invocation, Router skills, Skill mechanics, Splitting by invocation, Pruning (+3 more)

### Community 199 - "Steps"
Cohesion: 0.17
Nodes (11): 1. Detect the environment, 2. Install dependency-cruiser, 3. Write the config, 4. Wire it into the checks, 5. Scaffold the example package, 6. Prove the rules bite, 7. Document the convention, Notes (+3 more)

### Community 200 - "Quest"
Cohesion: 0.27
Nodes (9): QuestPickerViewProps, QuestSummary, defaultProps(), EMPTY_USAGE, makeQuest(), makeSummary(), QuestSummary, QuestWizardProps (+1 more)

### Community 201 - "replay-recorder.test.ts"
Cohesion: 0.29
Nodes (3): makeTask(), NoLaunchRunner, submit()

### Community 202 - "task-browser.test.tsx"
Cohesion: 0.29
Nodes (8): TaskBrowserViewProps, defaultProps(), EMPTY_USAGE, makeNode(), makeTask(), Comment, PromptComments, SortField

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 206 - "replay-diff.ts"
Cohesion: 0.36
Nodes (9): captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat(), pathspecs(), runGit(), untrackedPaths(), WorktreeDiff (+1 more)

### Community 207 - "analytics-git.ts"
Cohesion: 0.22
Nodes (12): EXCLUDED_PATH_PREFIXES, git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry (+4 more)

### Community 208 - "comments.md"
Cohesion: 0.22
Nodes (8): Author resolution, CLI, How comments reach agents, In the TUI, Merge-friendliness, Mirroring to GitHub, Roles, Storage layout

### Community 209 - "Migrate to Shoehorn"
Cohesion: 0.20
Nodes (9): `as Type` → `fromPartial()`, `as unknown as Type` → `fromAny()`, Install, Large objects with few needed properties, Migrate to Shoehorn, Migration patterns, When to use each, Why shoehorn? (+1 more)

### Community 210 - "harnesses.md"
Cohesion: 0.22
Nodes (7): Configuration, Custom command template, Fallback chains, Profile fields, Routing, Secrets never go in config, Supported harnesses and verification status

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
Cohesion: 0.07
Nodes (27): Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle (+19 more)

### Community 215 - "Agent Process Lifecycle Audit"
Cohesion: 0.22
Nodes (8): Agent Process Lifecycle Audit, Files with Audit Annotations, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations, Shutdown Flows, Summary, Ungraceful Shutdown (SIGKILL / crash / OOM)

### Community 216 - "Process"
Cohesion: 0.25
Nodes (7): 1. Pin the fixed point, 2. Identify the spec source, 3. Identify the standards sources, 4. Spawn both sub-agents in parallel, 5. Aggregate, Process, Why two axes

### Community 217 - "<Questionnaire title>"
Cohesion: 0.25
Nodes (7): Anything else?, Context, Document structure, How to answer, <Questionnaire title>, <Theme heading>, What load is the system expected to handle at launch?

### Community 218 - "fake-agent-runner.ts"
Cohesion: 0.44
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 219 - "writing-shape/SKILL.md"
Cohesion: 0.25
Nodes (7): Conversational feel, Format arguments to actually have, Grounding, Out of scope, Pulling from the pile, The loop, Writing rhythm

### Community 220 - "citty/merge.ts"
Cohesion: 0.48
Nodes (4): mergeCommand, ParsedMergeArgs, parseMergeArgs(), parseTaskList()

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

### Community 231 - "logs.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 233 - "multi-cli-support — architecture"
Cohesion: 0.33
Nodes (5): Config (src/config.ts, schemas/config.schema.json), Constraints, File ownership (mostly sequential; tasks 2 and 3 can run in parallel), multi-cli-support — architecture, Route resolution (pure, src/lib/harness/routing.ts)

### Community 234 - "i18n.md"
Cohesion: 0.40
Nodes (4): Adding a locale, Checks, Choosing a language, Writing translatable code

### Community 235 - "guides/team.md"
Cohesion: 0.40
Nodes (4): Conflict-free merges, Daemon behaviour, Recommended workflow, Task claims

### Community 248 - "2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md"
Cohesion: 0.40
Nodes (4): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification

### Community 249 - "guides/tasks.md"
Cohesion: 0.50
Nodes (3): Commands, Dependencies and ordering, Fields

### Community 250 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 251 - "quest show"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, quest show

### Community 252 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 253 - "Agent Analytics"
Cohesion: 0.50
Nodes (4): Agent Analytics, Coverage limitations, Metric definitions, TUI

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1747 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `comments.ts`, `agent-runner.ts`, `run-daemon-monitor.tsx`, `task-store.ts`, `eval-score.ts`, `loadConfig`, `review-list.tsx`, `msg`, `daemon/launcher.ts`, `dashboard.tsx`, `lib/i18n.ts`, `worktree.ts`, `list.ts`, `lib/tasks.ts`, `schema.ts`, `citty/quest.ts`, `useI18n`, `agent-registry.ts`, `commands/merge.ts`, `commands/init.ts`, `task-schema.ts`, `run-quest-picker.tsx`, `lib/replay.ts`, `output`, `commands/quest.ts`, `commands/tasks.md`, `commands/status.ts`, `commands/tui.ts`, `graph.ts`, `templates.ts`, `commands/usage.ts`, `commands/logs.ts`, `tdd-verifier.ts`, `commands/completion.ts`, `esc-menu.tsx`, `ref_bun_test`, `citty/merge.ts`, `i18n.md`, `WOMBO_DIR`, `guides/tasks.md`, `commands/upgrade.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.02040816326530612 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `agent-runner.ts`, `protocol.ts`, `run-daemon-monitor.tsx`, `task-store.ts`, `eval-score.ts`, `Task`, `analytics-lifecycle.test.ts`, `routing.ts`, `run-task-browser.tsx`, `ref_node_path`, `genesis-planner.ts`, `msg`, `onboarding/index.ts`, `daemon-project-context.test.ts`, `t`, `worktree.ts`, `list.ts`, `lib/tasks.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `Daemon`, `run-quest-picker.tsx`, `analytics.ts`, `onboarding-helpers.ts`, `output`, `analytics-measurements.test.ts`, `tdd-baseline-integration.test.ts`, `post-merge-integration.test.ts`, `commands/quest.ts`, `state.ts`, `prompt.ts`, `commands/status.ts`, `commands/tui.ts`, `graph.ts`, `post-merge.ts`, `InkDaemonTUI`, `templates.ts`, `replay-recorder.test.ts`, `scheduler.ts`, `commands/usage.ts`, `tdd-verifier.ts`, `daemon-test-baseline.test.ts`, `project-store.ts`, `config.ts`, `analytics-integration.test.ts`, `lib/launcher.ts`, `daemon-agent-runner.test.ts`, `ref_node_child_process`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.1445578231292517 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `AgentRunner`, `agent-runner.ts`, `protocol.ts`, `Task`, `loadConfig`, `analytics-lifecycle.test.ts`, `ref_node_path`, `daemon-project-context.test.ts`, `commands/merge.ts`, `AnalyticsTracker`, `Daemon`, `.load`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `state.ts`, `replay-recorder.test.ts`, `scheduler.ts`, `.allComplete`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `analytics-integration.test.ts`, `Scheduler`, `maxConcurrent`, `daemon-agent-runner.test.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._