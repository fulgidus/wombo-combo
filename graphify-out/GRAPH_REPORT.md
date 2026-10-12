# Graph Report - wombo-combo  (2026-10-12)

## Corpus Check
- 686 files · ~736,033 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .log 18, .jsonl 5, (none) 4)

## Summary
- 5932 nodes · 17238 edges · 265 communities (224 shown, 41 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 770 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `653335f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- ref_node_fs
- WomboConfig
- sync-pull.test.ts
- agent-runner.ts
- protocol.ts
- review.ts
- ReplayStore
- task-store.ts
- analytics-overlay.tsx
- config.ts
- config.md
- toon.ts
- replay-viewer.test.tsx
- ink/index.ts
- dashboard-metrics.ts
- saveTaskToStore
- ink
- github-client.ts
- dashboard.tsx
- push.ts
- comments.ts
- lib/i18n.ts
- commands/launch.ts
- lib/tasks.ts
- ref_bun_test
- hitl-channel.ts
- index.md
- schema.ts
- lib/retro.ts
- DaemonClient
- agent-registry.ts
- commands/merge.ts
- useI18n
- eval-score.ts
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
- t
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- ref_node_path
- dashboard-provider.test.tsx
- lib/launcher.ts
- commands/tui.ts
- task-browser.tsx
- AGENTS.md — Instructions for AI agents working on wombo-combo
- run-daemon-monitor.tsx
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
- mapping.ts
- commands/usage.ts
- daemon/launcher.ts
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
- daemon-agent-runner.test.ts
- Fake Agent
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- Scheduler
- genesis-planner.ts
- analytics-integration.test.ts
- test-runner.ts
- token-usage.ts
- src/index.ts
- harness/index.ts
- quest-store.ts
- .handleStart
- maxConcurrent
- daemon.md
- gen-command-docs.ts
- Task
- commands/sync.ts
- wishlist-store.ts
- graph.ts
- commands/upgrade.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- chrome.tsx
- routing.ts
- citty-merge.test.ts
- tdd-baseline-integration.test.ts
- state.ts
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- sync-triage.test.ts
- Process
- pull.ts
- react-devtools-core.ts
- DashboardMetricsProvider
- scout.ts
- gen-config-docs.ts
- Codebase Design
- README.md
- quest-planner.ts
- merge-resolver-agent.md
- During the session
- overview.md
- harness-opencode.test.ts
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
- daemon-scheduler.test.ts
- session-replay — knowledge
- hitl-ask.ts
- analytics-browser.test.tsx
- CONTEXT.md — For AI agents using wombo as a tool
- run-task-browser.tsx
- commands/triage.md
- scheduler.ts
- gh
- Steps
- monitor-router.test.tsx
- fake-agent-runner.ts
- init-form.tsx
- .getActiveAgents
- citty-bridge.ts
- Test-Driven Development
- i18n-full — design notes
- Process
- comment.md
- writing-for-agents/SKILL.md
- StubDaemonClient
- Steps
- sync.md
- TokenCollector
- done
- wayfinder/SKILL.md
- Domain Docs
- openspec/specs/scheduler-concurrency-accounting/spec.md
- ReplayRecorder
- github-sync.md
- Process
- Migrate to Shoehorn
- check-attribution.ts
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- lock.ts
- comments.md
- commands/stats.ts
- <Questionnaire title>
- lib/history.ts
- writing-shape/SKILL.md
- cli-smoke.test.ts
- Triage Labels
- Sections
- writing-beats/SKILL.md
- tdd-baseline-pipeline.test.ts
- loop-me/SKILL.md
- daemon-project-context.test.ts
- chief-of-staff/SKILL.md
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- UsageTotals
- saveTaskToArchive
- guides/retro.md
- review-gate.md
- c
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md
- What needs to happen next:
- Process
- Local changes to vendored skills
- guides/triage.md
- Requirement: maxConcurrent is preserved when Scheduler is reconstructed
- 2026-03-21-fix-scheduler-launch-and-concurrency/design.md
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Requirement: Fake-agent tasks bypass inter-launch stagger
- 2026-03-21-fix-concurrency-boot-reset/proposal.md
- 2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md
- TaskBrowserApp
- describe.md
- eval.md
- history.md
- launch.md
- commands/retro.md

## God Nodes (most connected - your core abstractions)
1. `t()` - 210 edges
2. `WomboConfig` - 153 edges
3. `react` - 118 edges
4. `Explore mode guidelines and usage rules` - 114 edges
5. `useI18n()` - 113 edges
6. `ink` - 111 edges
7. `DaemonState` - 110 edges
8. `AgentRunner` - 108 edges
9. `t` - 97 edges
10. `loadConfig()` - 84 edges

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
- 4-file cycle: `src/lib/sync/auto.ts -> src/lib/sync/cycle.ts -> src/lib/sync/pull.ts -> src/lib/triage.ts -> src/lib/sync/auto.ts`
- 4-file cycle: `src/lib/sync/auto.ts -> src/lib/sync/push.ts -> src/lib/sync/pull.ts -> src/lib/triage.ts -> src/lib/sync/auto.ts`
- 5-file cycle: `src/lib/sync/auto.ts -> src/lib/sync/cycle.ts -> src/lib/sync/push.ts -> src/lib/sync/pull.ts -> src/lib/triage.ts -> src/lib/sync/auto.ts`

## Communities (265 total, 41 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (96): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+88 more)

### Community 1 - "AgentRunner"
Cohesion: 0.15
Nodes (4): Assistant (Build · claude-sonnet-4.6 · 6.2s), AgentRunner, getConflictDiffs(), runSafeCmd()

### Community 2 - "ref_node_fs"
Cohesion: 0.08
Nodes (26): Daemon and TUI, root, BrowserConfig, getEditorCommand(), openEditor(), OpenEditorOptions, allocateDebugPort(), allocatedPorts (+18 more)

### Community 3 - "WomboConfig"
Cohesion: 0.08
Nodes (41): AbortCommandOptions, cmdAbort(), extractGlobalFlags(), ExtractResult, GlobalFlags, ParsedLaunchArgs, ParsedMergeArgs, ParsedResumeArgs (+33 more)

### Community 4 - "sync-pull.test.ts"
Cohesion: 0.20
Nodes (12): defaultLoadTaskQuests(), loadArchive(), loadTasks(), getTask(), mkClient(), pull(), pushLike(), roots (+4 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.04
Nodes (72): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+64 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (56): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, DaemonStatus, StartDaemonOptions (+48 more)

### Community 7 - "review.ts"
Cohesion: 0.07
Nodes (37): ReviewConfig, buildSpecText(), formatFindingComment(), formatReviewFeedback(), REVIEWER_ATTEMPTS, REVIEWER_AUTHOR, ReviewOutcome, ReviewStageDeps (+29 more)

### Community 8 - "ReplayStore"
Cohesion: 0.26
Nodes (9): assertSafe(), isSafeSegment(), ReplayStore, summarize(), collectExecutions(), seedReplay(), seed(), seed() (+1 more)

### Community 9 - "task-store.ts"
Cohesion: 0.14
Nodes (27): Top-level options, validateMeta(), validateTask(), createBackup(), defaultMeta(), deleteTaskFile(), flattenTask(), getArchiveDir() (+19 more)

### Community 10 - "analytics-overlay.tsx"
Cohesion: 0.13
Nodes (32): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+24 more)

### Community 11 - "config.ts"
Cohesion: 0.04
Nodes (112): citty, abortCommand, cleanupCommand, addCommand, commentCommand, ensureInitialized(), linkCommand, listCommand (+104 more)

### Community 12 - "config.md"
Cohesion: 0.11
Nodes (18): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `comments`, `defaults`, `git` (+10 more)

### Community 13 - "toon.ts"
Cohesion: 0.09
Nodes (51): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+43 more)

### Community 14 - "replay-viewer.test.tsx"
Cohesion: 0.17
Nodes (14): ReplayViewer(), parseReplay(), buildTimeline(), BASE, Harness, live, makeReplay(), mount() (+6 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.06
Nodes (64): App(), AppProps, buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), HITL_MODES (+56 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.10
Nodes (43): DashboardMetricsContext, DashboardMetricsValue, DASHBOARD_EVENTS, DashboardMetricsProviderProps, initialValue(), REAL_TIMERS, advanceThroughput(), alignBucket() (+35 more)

### Community 17 - "saveTaskToStore"
Cohesion: 0.12
Nodes (21): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+13 more)

### Community 18 - "ink"
Cohesion: 0.07
Nodes (77): ink, useChromeHideQuitHint(), ConfirmDialog(), ConfirmDialogProps, FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase (+69 more)

### Community 19 - "github-client.ts"
Cohesion: 0.09
Nodes (34): apiUrlFor(), createGitHubClient(), json(), paginate(), rateLimitWaitMs(), request(), CreateIssueInput, CreateLabelInput (+26 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.10
Nodes (33): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgentRow(), DashboardAgentRowProps, DashboardScreenProps (+25 more)

### Community 21 - "push.ts"
Cohesion: 0.06
Nodes (62): SyncOptions, AI_ATTRIBUTION_LINE_PATTERNS, containsAiAttribution(), lineHasAiAttribution(), stripAiAttribution(), attributionBreakerPath(), AttributionTrip, AttributionTripped (+54 more)

### Community 22 - "comments.ts"
Cohesion: 0.08
Nodes (45): addComment(), AddCommentInput, assertSafeId(), Comment, COMMENTS_DIR, commentsDir(), compareComments(), findCommentPath() (+37 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.10
Nodes (23): teamMergeCommands, teamMergeMeta, teamSetup, AVAILABLE_LOCALES, clearMissingKeys(), createInstance(), DetectOptions, getFixedT() (+15 more)

### Community 24 - "commands/launch.ts"
Cohesion: 0.08
Nodes (39): cmdCleanup(), analyzeBarrelFile(), BarrelFile, cmdLaunch(), DaemonProgress, delegateToDaemon(), detectUnprotectedBarrels(), evaluateDaemonProgress() (+31 more)

### Community 25 - "lib/tasks.ts"
Cohesion: 0.07
Nodes (45): describeNoLaunchable(), buildTaskQuestMap(), cmdTasksList(), QuestInfo, renderStatusGroups(), STATUS_COLOR, STATUS_ORDER, TasksListOptions (+37 more)

### Community 26 - "ref_bun_test"
Cohesion: 0.04
Nodes (18): commit(), git(), ENTRY, ROOT, tempDirs, SRC_ENTRY, dirs, runners (+10 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (22): Arguments, Global flags, Arguments, Global flags, Global flags, Global flags, Flags, Global flags (+14 more)

### Community 29 - "schema.ts"
Cohesion: 0.18
Nodes (21): getLocale(), hasKey(), aliasHint(), allCommandSchemas(), commandToSchema(), descriptionOf(), findCommandDef(), flagDescriptionOf() (+13 more)

### Community 30 - "lib/retro.ts"
Cohesion: 0.07
Nodes (41): RetroResult, loadEvalReport(), analyzeReplay(), candidate(), collectComments(), collectEvals(), CollectOptions, collectRetroInput() (+33 more)

### Community 31 - "DaemonClient"
Cohesion: 0.10
Nodes (8): DaemonClient, CommandMap, EvtStateSnapshot, parseMessage(), DaemonMonitorAdapter(), DaemonMonitorShellProps, InkDaemonTUIOptions, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.14
Nodes (24): AgentRegistryMode, InkPreflightResult, PreflightResult, PreflightViewProps, agentNameFromType(), AgentResolution, cacheAgent(), cacheDir() (+16 more)

### Community 33 - "commands/merge.ts"
Cohesion: 0.11
Nodes (30): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), defaultIsDaemonAlive(), evidenceFor(), git(), gitOk() (+22 more)

### Community 34 - "useI18n"
Cohesion: 0.07
Nodes (74): useScreenInput(), t, useI18n(), MultiLineInput(), SingleLineInput(), AllTasksDetail(), AllTasksItem(), ErrandsDetail() (+66 more)

### Community 35 - "eval-score.ts"
Cohesion: 0.19
Nodes (19): clampScore(), intervalsOverlap(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), scoreRouting(), scoreSession(), scoreSteering() (+11 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.13
Nodes (32): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CreateOrUpdatePrOptions, createOrUpdatePullRequest(), DEFAULT_COMMAND_TIMEOUT_MS (+24 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.10
Nodes (19): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, AgentAnalyticsRecord (+11 more)

### Community 39 - "Issue tracker: GitLab"
Cohesion: 0.08
Nodes (18): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary, Conventions, Issue tracker: GitLab, Merge requests as a triage surface (+10 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.12
Nodes (27): CheckResult, checkTasks(), hasCycle(), cmdTasksCheck(), collectAllItems(), mergeSchemaIssues(), mirrorMessage(), DIFFICULTY_ORDER (+19 more)

### Community 42 - "test-baseline.ts"
Cohesion: 0.11
Nodes (33): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+25 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics-summary.ts"
Cohesion: 0.12
Nodes (20): Commands, Flags, Global flags, Token Usage Tracking, buildAnalyticsSummary(), AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage (+12 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.10
Nodes (41): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+33 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.07
Nodes (28): boundValue(), FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent(), num(), recordLabel(), REPLAY_LIMITS (+20 more)

### Community 48 - "replay-diff.ts"
Cohesion: 0.31
Nodes (10): defaultCaptureReviewDiff(), captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat(), pathspecs(), runGit(), untrackedPaths() (+2 more)

### Community 49 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.12
Nodes (19): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+11 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.06
Nodes (55): DEFAULT_CONFIG, PostMergeConfig, createDaemonAgentState(), MAX_COMMENT_CHARS, setupMergeDriver(), createBlankTask(), feature, Q (+47 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (31): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine(), LoadedReplay (+23 more)

### Community 54 - "msg"
Cohesion: 0.10
Nodes (66): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+58 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "t"
Cohesion: 0.08
Nodes (43): startCommand, statusCommand, stopCommand, addCommand, deleteCommand, listCommand, moveCommand, cmdLogs() (+35 more)

### Community 57 - "prompt.ts"
Cohesion: 0.11
Nodes (27): normalizeCommentsConfig(), formatHunksForLLM(), portlessUrl(), capComments(), abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions (+19 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.06
Nodes (32): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+24 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "ref_node_path"
Cohesion: 0.09
Nodes (21): cmdInit(), InitOptions, CONFIG_FILE, normalizeReplayConfig(), normalizeReviewConfig(), replayRetentionOptions(), InitApp(), InitAppProps (+13 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.10
Nodes (11): ConnectionState, EventMap, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, Harness, mount() (+3 more)

### Community 63 - "lib/launcher.ts"
Cohesion: 0.12
Nodes (34): 1. Are agents spawned with `detached: true` and `unref()`?, getHarness(), ResolvedRoute, resolveRoute(), inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness(), SpawnTarget (+26 more)

### Community 64 - "commands/tui.ts"
Cohesion: 0.07
Nodes (53): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), promptVisionText() (+45 more)

### Community 65 - "task-browser.tsx"
Cohesion: 0.10
Nodes (33): AgentStatus, DashboardAgent, agentStatusColor(), PRIORITY_ABBREV, ROLE_COLORS, TaskComments(), TaskListItem(), truncateBody() (+25 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.09
Nodes (22): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, 6. Never author or attribute anything as Claude Code, Claude or any other AI, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo (+14 more)

### Community 67 - "run-daemon-monitor.tsx"
Cohesion: 0.04
Nodes (84): DashboardScreen(), DashboardStoreContext, createI18n(), EN_STRINGS, getLocaleT(), I18nContext, StringsMap, OnboardingResult (+76 more)

### Community 68 - "analytics.ts"
Cohesion: 0.06
Nodes (35): AnalyticsTrackerOptions, ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, AnalyticsDiagnostic (+27 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.10
Nodes (14): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+6 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.20
Nodes (18): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+10 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "post-merge.ts"
Cohesion: 0.08
Nodes (41): MergeCommandDeps, normalizePostMergeConfig(), appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask (+33 more)

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

### Community 79 - "mapping.ts"
Cohesion: 0.14
Nodes (26): loadAllArchivedQuests(), assertId(), assertKind(), deleteMapping(), FieldConflict, findMappingByIssue(), hashComment(), hashFields() (+18 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.15
Nodes (28): cmdUsage(), coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost(), formatNumber(), groupedToJSON() (+20 more)

### Community 81 - "daemon/launcher.ts"
Cohesion: 0.14
Nodes (27): cmdResume(), agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot() (+19 more)

### Community 82 - "tdd-verifier.test.ts"
Cohesion: 0.16
Nodes (20): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions, TddVerificationResult, TestBaseline (+12 more)

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.19
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - ".submitTask"
Cohesion: 0.08
Nodes (19): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+11 more)

### Community 86 - "monitor.ts"
Cohesion: 0.16
Nodes (14): extractActivity(), formatEventForLog(), OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd(), shortPath(), isTokenEvent() (+6 more)

### Community 87 - "esc-menu.tsx"
Cohesion: 0.12
Nodes (19): defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProvider(), EscMenuProviderProps (+11 more)

### Community 88 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "react"
Cohesion: 0.05
Nodes (54): react, ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), ErrandWizardProps, ErrandWizardStep, STEPS, FakeTaskConfig (+46 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (20): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+12 more)

### Community 94 - "daemon-agent-runner.test.ts"
Cohesion: 0.10
Nodes (16): CommandResult, defaultCommandRunner(), PostMergeRequest, Env, EnvOpts, ReentrantRunner, SpyRunner, TestableAgentRunner (+8 more)

### Community 95 - "Fake Agent"
Cohesion: 0.50
Nodes (3): Behavior, Fake Agent, Usage

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.10
Nodes (20): Agent Analytics, Commands, Comments, Coverage limitations, Install, Languages, Launch options, License (+12 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.06
Nodes (25): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+17 more)

### Community 101 - "Scheduler"
Cohesion: 0.14
Nodes (7): 1. Concurrency Pinning — Scheduler.start(), Architecture files read, OpenSpec:, Relevant files / directories, Source files (read and relevant):, Test files:, Scheduler

### Community 102 - "genesis-planner.ts"
Cohesion: 0.20
Nodes (13): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), GenesisOutput, parseGenesisYaml(), runGenesisPlanner() (+5 more)

### Community 103 - "analytics-integration.test.ts"
Cohesion: 0.16
Nodes (9): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), SRC_ENTRY, store() (+1 more)

### Community 104 - "test-runner.ts"
Cohesion: 0.19
Nodes (17): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), lastCount(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests() (+9 more)

### Community 105 - "token-usage.ts"
Cohesion: 0.15
Nodes (10): buildTaskQuestMap(), normalizeUsageRecord(), TaskQuestLookup, UsageRefreshResult, validNumber(), MonitorCallbacks, UsageRecord, appendUsageRecord() (+2 more)

### Community 106 - "src/index.ts"
Cohesion: 0.28
Nodes (9): buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), resolveGlobalFlagsAndCommand(), runCittyCommand(), runCommand, checkDevModeGuard(), initCliLocale() (+1 more)

### Community 107 - "harness/index.ts"
Cohesion: 0.14
Nodes (24): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+16 more)

### Community 108 - "quest-store.ts"
Cohesion: 0.09
Nodes (44): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), createBlankQuest(), deepMerge() (+36 more)

### Community 109 - ".handleStart"
Cohesion: 0.09
Nodes (24): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+16 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.07
Nodes (47): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, Capabilities (+39 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "gen-command-docs.ts"
Cohesion: 0.36
Nodes (13): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+5 more)

### Community 113 - "Task"
Cohesion: 0.27
Nodes (8): TaskEditorProps, Task, cfg(), ExposedRunner, heavy, light, routed(), task()

### Community 114 - "commands/sync.ts"
Cohesion: 0.06
Nodes (62): clientFor(), cmdSyncPull(), cmdSyncPush(), cmdSyncRun(), cmdSyncStatus(), cmdSyncWatch(), failure(), printCycle() (+54 more)

### Community 115 - "wishlist-store.ts"
Cohesion: 0.19
Nodes (19): yaml, HookResult, TestComponent(), useWishlistStore(), createTestStreams(), renderLive(), createTestStreams(), renderLive() (+11 more)

### Community 116 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 117 - "commands/upgrade.ts"
Cohesion: 0.18
Nodes (17): 3. Author the wizard, channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm() (+9 more)

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
Cohesion: 0.13
Nodes (22): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayout(), ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps (+14 more)

### Community 122 - "routing.ts"
Cohesion: 0.10
Nodes (30): AgentProfile, resolveAgentBin(), HarnessId, Operation, detectHarnessFromBin(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE (+22 more)

### Community 123 - "citty-merge.test.ts"
Cohesion: 0.13
Nodes (9): parseMergeArgs(), parseTaskList(), BRIDGE_REGISTRY, findBridgeCommandDef(), matchByNameOrAlias(), buildAliasMap(), COMMAND_REGISTRY, GLOBAL_FLAGS (+1 more)

### Community 124 - "tdd-baseline-integration.test.ts"
Cohesion: 0.16
Nodes (11): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+3 more)

### Community 125 - "state.ts"
Cohesion: 0.12
Nodes (22): DaemonAgentState, EvtAgentStatusChange, EvtSchedulerStatus, SchedulerState, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES (+14 more)

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

### Community 131 - "sync-triage.test.ts"
Cohesion: 0.07
Nodes (25): LABEL_CATALOG, syncStatus(), FakeComment, FakeGitHub, FakeGitHubOptions, FakeIssue, Injection, RecordedRequest (+17 more)

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "pull.ts"
Cohesion: 0.07
Nodes (73): CommentRef, CommentRole, Quest, loadArchivedQuest(), remoteQuestView(), remoteTaskView, TRIAGE_LABELS, triageLabelsFor() (+65 more)

### Community 137 - "DashboardMetricsProvider"
Cohesion: 0.13
Nodes (10): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, addInto(), cloneTotals(), DashboardUsageReader, emptyTotals() (+2 more)

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (17): buildKeywords(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex(), scoreFile() (+9 more)

### Community 140 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 142 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 143 - "README.md"
Cohesion: 0.11
Nodes (15): Forbidden, everywhere, How it is enforced, Limits, No AI attribution, Configuration, Custom command template, Fallback chains, Profile fields (+7 more)

### Community 144 - "quest-planner.ts"
Cohesion: 0.10
Nodes (35): extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), generateGenesisPrompt(), canonicalizeOutput(), launchPlanner(), buildSynthesisPrompt(), extractTextFromJsonEvents() (+27 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "harness-opencode.test.ts"
Cohesion: 0.15
Nodes (14): HARNESS_IDS, isHarnessId(), OPERATIONS, listHarnesses(), detectAgentType(), base, oc, plan() (+6 more)

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
Cohesion: 0.11
Nodes (17): 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12 (+9 more)

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

### Community 164 - "daemon-scheduler.test.ts"
Cohesion: 0.15
Nodes (7): SchedulerDeps, FAKE_AGENT_SENTINEL, makeAgent(), makeConfig(), makeMockRunner(), makeScopeScheduler(), setup()

### Community 165 - "session-replay — knowledge"
Cohesion: 0.20
Nodes (9): ReplayEvent, header(), Conventions, File ownership (one task owns each file), Format (src/lib/replay.ts, REPLAY_SCHEMA_VERSION = 1), Goal, Seams, session-replay — knowledge (+1 more)

### Community 166 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 167 - "analytics-browser.test.tsx"
Cohesion: 0.12
Nodes (15): TaskBrowserScreen(), Harness, mount(), h, wait(), waitFor(), stripAnsi(), Harness (+7 more)

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 169 - "run-task-browser.tsx"
Cohesion: 0.11
Nodes (24): ANALYTICS_REFRESH_MS, analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserAction (+16 more)

### Community 171 - "commands/triage.md"
Cohesion: 0.13
Nodes (14): Arguments, Arguments, Arguments, Flags, Flags, Global flags, Global flags, Global flags (+6 more)

### Community 173 - "scheduler.ts"
Cohesion: 0.11
Nodes (31): normalizeTeamConfig(), assertSafeId(), Claim, ClaimInfo, ClaimOptions, claimPath(), ClaimResult, CLAIMS_DIR (+23 more)

### Community 174 - "gh"
Cohesion: 0.09
Nodes (23): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", 1. Explore, 2. Present findings and ask (+15 more)

### Community 175 - "Steps"
Cohesion: 0.15
Nodes (12): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 7. Verify, 8. Commit (+4 more)

### Community 177 - "monitor-router.test.tsx"
Cohesion: 0.06
Nodes (13): escMenuCursor(), eventually(), selectFromEscMenu(), waitFor(), LiveFakeClient, makeMinimalConfig(), mountShell(), openDashboardFromMenu() (+5 more)

### Community 180 - "fake-agent-runner.ts"
Cohesion: 0.44
Nodes (7): emit(), emitStepFinish(), emitStepStart(), emitText(), extractSleepMs(), main(), parseArgs()

### Community 184 - "init-form.tsx"
Cohesion: 0.21
Nodes (12): EditableField(), EditableFieldProps, enT, FieldDef, FIELDS, InitForm(), InitFormDefaults, InitFormProps (+4 more)

### Community 187 - ".getActiveAgents"
Cohesion: 0.08
Nodes (25): Context, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Impact (+17 more)

### Community 191 - "citty-bridge.ts"
Cohesion: 0.30
Nodes (11): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+3 more)

### Community 192 - "Test-Driven Development"
Cohesion: 0.15
Nodes (10): Designing for Mockability, When to Mock, Anti-patterns, Rules of the loop, Seams: where tests go, Test-Driven Development, What a good test is, Bad Tests (+2 more)

### Community 193 - "i18n-full — design notes"
Cohesion: 0.14
Nodes (12): Adding a locale, Architecture, Checks, Choosing a language, Writing translatable code, getMissingKeys(), Detection, File ownership (per task) (+4 more)

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

### Community 202 - "done"
Cohesion: 0.07
Nodes (22): Claim, progress, resolve, Comments, Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror), Pull requests as a triage surface, The mirror is automated, Vocabulary, Wayfinding operations (used by `/wayfinder`), When a skill says "fetch the relevant ticket" (+14 more)

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 205 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.18
Nodes (10): Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: New agents are not launched to fill slots held by verified agents (+2 more)

### Community 206 - "ReplayRecorder"
Cohesion: 0.21
Nodes (8): errMsg(), ReplayRecorder, ReplayRecorderOptions, Tracked, DEFAULT_KEEP_PER_TASK, PruneOptions, ReplayEndOutcome, truncateText()

### Community 207 - "github-sync.md"
Cohesion: 0.14
Nodes (13): Authentication, Checking the mirror, Commands, Concurrency, Configuration, Conflicts, Known limits, Labels (+5 more)

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

### Community 214 - "lock.ts"
Cohesion: 0.19
Nodes (12): acquire(), held, isStale(), LOCK_STALE_MS, LOCK_WAIT_MS, LockInfo, lockPath(), pidAlive() (+4 more)

### Community 215 - "comments.md"
Cohesion: 0.25
Nodes (7): Author resolution, CLI, How comments reach agents, In the TUI, Merge-friendliness, Roles, Storage layout

### Community 216 - "commands/stats.ts"
Cohesion: 0.27
Nodes (13): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+5 more)

### Community 217 - "<Questionnaire title>"
Cohesion: 0.25
Nodes (7): Anything else?, Context, Document structure, How to answer, <Questionnaire title>, <Theme heading>, What load is the system expected to handle at launch?

### Community 218 - "lib/history.ts"
Cohesion: 0.21
Nodes (7): AgentHistoryRecord, computeDuration(), daemonSessionToHistory(), ensureHistoryDir(), exportDaemonHistory(), historyDir(), saveHistory()

### Community 219 - "writing-shape/SKILL.md"
Cohesion: 0.25
Nodes (7): Conversational feel, Format arguments to actually have, Grounding, Out of scope, Pulling from the pile, The loop, Writing rhythm

### Community 220 - "cli-smoke.test.ts"
Cohesion: 0.20
Nodes (12): buildEnv(), CliResult, DIST_ENTRY, DIST_EXISTS, NODE_BIN, REPO_ROOT, runProcess(), runSrc() (+4 more)

### Community 221 - "Triage Labels"
Cohesion: 0.50
Nodes (3): Moving items, Triage Labels, Where the role is recorded

### Community 222 - "Sections"
Cohesion: 0.33
Nodes (5): Evidence, Guidance, Merge Danger, Sections, Summary

### Community 223 - "writing-beats/SKILL.md"
Cohesion: 0.33
Nodes (5): Ending the journey, Grounding, Pulling from the pile, What is a beat, Writing rhythm

### Community 224 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.29
Nodes (9): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles(), captureBaseline() (+1 more)

### Community 225 - "loop-me/SKILL.md"
Cohesion: 0.40
Nodes (4): Definition of done, The loop lens, The workspace, Vocabulary

### Community 226 - "daemon-project-context.test.ts"
Cohesion: 0.25
Nodes (10): Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts(), runners, setupProject(), states (+2 more)

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

### Community 231 - "UsageTotals"
Cohesion: 0.27
Nodes (9): QuestPickerViewProps, defaultProps(), EMPTY_USAGE, makeQuest(), makeSummary(), QuestSummary, UsageOverlayViewProps, GroupableField (+1 more)

### Community 232 - "saveTaskToArchive"
Cohesion: 0.47
Nodes (10): archiveDir(), atomicWrite(), ensureDir(), migrateArchiveIfNeeded(), saveAllArchiveToStore(), saveArchiveMetaToStore(), saveMeta(), saveTaskFile() (+2 more)

### Community 233 - "guides/retro.md"
Cohesion: 0.25
Nodes (7): Acting on a retro, Categories, Example, Moving a rule out of AGENTS.md, Saving retros, Severity thresholds, What is collected

### Community 234 - "review-gate.md"
Cohesion: 0.25
Nodes (7): Configuration, Findings as task comments, Limits, Retry rounds, Routing: operation `review`, What is reviewed, Writing CODING_STANDARDS.md

### Community 235 - "c"
Cohesion: 0.25
Nodes (7): Flags, Global flags, Arguments, Flags, Global flags, quest create, c()

### Community 248 - "What needs to happen next:"
Cohesion: 0.21
Nodes (7): 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification, Accomplished, Completed and archived:, Currently in progress:, What needs to happen next:

### Community 249 - "Process"
Cohesion: 0.33
Nodes (5): 1. Scope the procedure, 2. Map each stage's journey, 4. Verify and hand off, Process, Wizard

### Community 250 - "Local changes to vendored skills"
Cohesion: 0.50
Nodes (3): `code-review` renamed to `code-review-spec`, Local changes to vendored skills, `triage`: no AI disclaimer

### Community 251 - "guides/triage.md"
Cohesion: 0.33
Nodes (5): Commands, GitHub labels, States, Transitions, With sync and comments

### Community 252 - "Requirement: maxConcurrent is preserved when Scheduler is reconstructed"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: maxConcurrent is preserved when Scheduler is reconstructed, Scenario: Fresh cold-start still applies config default, Scenario: Quest selection preserves config-applied concurrency, Scenario: Quest selection preserves user-set infinite concurrency

### Community 253 - "2026-03-21-fix-scheduler-launch-and-concurrency/design.md"
Cohesion: 0.33
Nodes (5): Decision: Submit ALL candidates when `maxConcurrent=0`, regardless of `slotsForNew`, Decision: Track whether concurrency has been explicitly set this session, Decisions, Goals / Non-Goals, Risks / Trade-offs

### Community 254 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 255 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 256 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 257 - "2026-03-21-fix-concurrency-boot-reset/proposal.md"
Cohesion: 0.40
Nodes (4): Capabilities, Impact, Modified Capabilities, Why

### Community 258 - "2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md"
Cohesion: 0.40
Nodes (4): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification

### Community 259 - "TaskBrowserApp"
Cohesion: 0.50
Nodes (4): TaskBrowserApp(), buildTaskGraph(), computeDepth(), dfs()

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2006 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `agent-runner.ts`, `task-store.ts`, `analytics-overlay.tsx`, `config.ts`, `toon.ts`, `ink/index.ts`, `dashboard.tsx`, `lib/i18n.ts`, `commands/launch.ts`, `lib/tasks.ts`, `schema.ts`, `DaemonClient`, `agent-registry.ts`, `commands/merge.ts`, `useI18n`, `session-replay — knowledge`, `task-schema.ts`, `msg`, `commands/tasks.md`, `ref_node_path`, `commands/tui.ts`, `i18n-full — design notes`, `run-daemon-monitor.tsx`, `done`, `templates.ts`, `commands/usage.ts`, `daemon/launcher.ts`, `tdd-verifier.test.ts`, `commands/completion.ts`, `esc-menu.tsx`, `commands/stats.ts`, `saveTaskToArchive`, `quest-store.ts`, `commands/sync.ts`, `graph.ts`, `commands/upgrade.ts`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.020618556701030927 - nodes in this community are weakly interconnected._
- **Why does `DaemonState` connect `DaemonState` to `Explore mode guidelines and usage rules`, `AgentRunner`, `agent-runner.ts`, `protocol.ts`, `ref_bun_test`, `commands/merge.ts`, `daemon-scheduler.test.ts`, `AnalyticsTracker`, `Daemon`, `scheduler.ts`, `lib/replay.ts`, `analytics-measurements.test.ts`, `post-merge-integration.test.ts`, `.getActiveAgents`, `analytics.ts`, `ReplayRecorder`, `daemon-test-baseline.test.ts`, `daemon-agent-runner.test.ts`, `daemon-project-context.test.ts`, `Scheduler`, `analytics-integration.test.ts`, `.handleStart`, `maxConcurrent`, `Task`, `2026-03-21-fix-scheduler-launch-and-concurrency/design.md`, `state.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `ref_node_fs` be split into smaller, more focused modules?**
  _Cohesion score 0.07632850241545894 - nodes in this community are weakly interconnected._
- **Why does `Explore mode guidelines and usage rules` connect `Explore mode guidelines and usage rules` to `AgentRunner`, `DaemonState`, `Scheduler`, `Daemon`, `.handleStart`, `maxConcurrent`, `.submitTask`, `What needs to happen next:`, `.getActiveAgents`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._