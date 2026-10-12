# Graph Report - wombo-combo  (2026-10-12)

## Corpus Check
- 716 files · ~778,835 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: .log 18, .jsonl 7, (none) 4)

## Summary
- 6121 nodes · 17995 edges · 265 communities (219 shown, 46 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 747 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7c7a14a1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- project-store.ts
- agent-runner.ts
- protocol.ts
- review.ts
- ReplayStore
- task-store.ts
- lib/quest.ts
- auto.ts
- t
- toon.ts
- replay-viewer.test.tsx
- ink/index.ts
- dashboard-metrics.ts
- analytics-measurements.test.ts
- onboarding/index.ts
- github-client.ts
- dashboard.tsx
- push.ts
- comments.ts
- lib/i18n.ts
- worktree.ts
- lib/output.ts
- ref_node_path
- hitl-channel.ts
- index.md
- schema.ts
- lib/retro.ts
- DaemonClient
- agent-registry.ts
- config.ts
- agents-routing-screen.tsx
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
- ref_bun_test
- run-quest-picker.tsx
- test-baseline-capture.ts
- post-merge-integration.test.ts
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- msg
- quest.md
- commands/launch.ts
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- loadConfig
- dashboard-provider.test.tsx
- lib/launcher.ts
- commands/tui.ts
- useI18n
- AGENTS.md — Instructions for AI agents working on wombo-combo
- run-daemon-monitor.tsx
- analytics.ts
- ProcessMonitor
- merge-driver.ts
- i18n-keys.test.ts
- graphify-pre-push.py
- commands/merge.ts
- InkDaemonTUI
- templates.ts
- agents/generalist-agent.md
- package.json
- docs/package.json
- leak-check.ts
- commands/usage.ts
- commands/status.ts
- tdd-verifier.test.ts
- Triage
- commands/completion.ts
- daemon-agent-runner.test.ts
- monitor.ts
- settings-screen.tsx
- tdd-verifier.ts
- wishlist.md
- dashboard-usage.ts
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- verifier.ts
- models.ts
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- Scheduler
- prompt-compress.ts
- replay-browser.test.tsx
- test-runner.ts
- UsageRecord
- retro-cli.test.ts
- harness/index.ts
- quest-store.ts
- .handleStart
- maxConcurrent
- daemon.md
- gen-command-docs.ts
- daemon-profile-wiring.test.ts
- output
- wishlist-store.ts
- graph.ts
- commands/upgrade.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- chrome.tsx
- routing.ts
- tdd-baseline-pipeline.test.ts
- changelog.ts
- state.ts
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- saveTaskToStore
- Process
- pull.ts
- react-devtools-core.ts
- c
- Domain Docs
- DashboardMetricsProvider
- StubDaemonClient
- scout.ts
- genesis.md
- tasks set-status
- Codebase Design
- README.md
- quest-planner.ts
- merge-resolver-agent.md
- During the session
- overview.md
- PlannerTelemetry
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- Changelog
- install.md
- docs/tsconfig.json
- HTML Report Format
- template.sh
- esc-menu.tsx
- replay.md
- Ask Matt
- wombo-combo Agent Context
- Diagnosing Bugs
- eval.md
- history.md
- launch.md
- hitl-ask.ts
- analytics-browser.test.tsx
- CONTEXT.md — For AI agents using wombo as a tool
- lib/tasks.ts
- commands/triage.md
- claims.ts
- commands/logs.ts
- Steps
- LiveFakeClient
- fake-agent-runner.ts
- commands/retro.md
- ADDED Requirements
- citty-bridge.ts
- Test-Driven Development
- format-converter.ts
- Process
- comment.md
- writing-for-agents/SKILL.md
- StubDaemonClient
- Steps
- sync.md
- otp-supervision-spike/knowledge.md
- Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)
- wayfinder/SKILL.md
- Domain Docs
- replay-diff.ts
- github-sync.md
- Process
- Migrate to Shoehorn
- stripAiAttribution
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- locales/index.ts
- comments.md
- <Questionnaire title>
- writing-shape/SKILL.md
- cli-smoke.test.ts
- Triage Labels
- Sections
- writing-beats/SKILL.md
- analytics-git.ts
- loop-me/SKILL.md
- daemon-project-context.test.ts
- chief-of-staff/SKILL.md
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- guides/retro.md
- review-gate.md
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md
- running-agents.md
- Local changes to vendored skills
- guides/triage.md
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- describe.md
- init-app.tsx
- config.md
- tdd-baseline-integration.test.ts
- onboarding-helpers.ts
- harness-opencode.test.ts
- lock.ts
- ReplayRecorder
- genesis-planner.ts
- gen-config-docs.ts
- openspec/specs/scheduler-concurrency-accounting/spec.md
- portless.ts
- Process

## God Nodes (most connected - your core abstractions)
1. `t()` - 210 edges
2. `WomboConfig` - 161 edges
3. `react` - 129 edges
4. `ink` - 122 edges
5. `useI18n()` - 117 edges
6. `Explore mode guidelines and usage rules` - 114 edges
7. `DaemonState` - 110 edges
8. `AgentRunner` - 108 edges
9. `t` - 101 edges
10. `loadConfig()` - 88 edges

## Surprising Connections (you probably didn't know these)
- `Wayfinding operations (used by `/wayfinder`)` --references--> `done()`  [INFERRED]
  docs/agents/issue-tracker.md → src/commands/sync.ts
- `Flags` --references--> `done()`  [INFERRED]
  docs/src/content/docs/reference/commands/tasks.md → src/commands/sync.ts
- `Daemon` --references--> `AgentRunner`  [INFERRED]
  docs/src/content/docs/architecture/overview.md → src/daemon/agent-runner.ts
- `Modified Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-concurrency-boot-reset/proposal.md → src/lib/eval-score.ts
- `New Capabilities` --references--> `maxConcurrent()`  [INFERRED]
  openspec/changes/archive/2026-03-21-fix-maxconcurrent-reset-on-rebuild/proposal.md → src/lib/eval-score.ts

## Import Cycles
- 2-file cycle: `src/lib/monitor.ts -> src/lib/token-collector.ts -> src/lib/monitor.ts`
- 4-file cycle: `src/lib/sync/auto.ts -> src/lib/sync/cycle.ts -> src/lib/sync/pull.ts -> src/lib/triage.ts -> src/lib/sync/auto.ts`
- 4-file cycle: `src/lib/sync/auto.ts -> src/lib/sync/push.ts -> src/lib/sync/pull.ts -> src/lib/triage.ts -> src/lib/sync/auto.ts`
- 5-file cycle: `src/lib/sync/auto.ts -> src/lib/sync/cycle.ts -> src/lib/sync/push.ts -> src/lib/sync/pull.ts -> src/lib/triage.ts -> src/lib/sync/auto.ts`

## Communities (265 total, 46 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (101): Accomplished, Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s) (+93 more)

### Community 1 - "AgentRunner"
Cohesion: 0.10
Nodes (16): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected, ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently (+8 more)

### Community 2 - "browser.ts"
Cohesion: 0.12
Nodes (16): Daemon and TUI, BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult (+8 more)

### Community 3 - "WomboConfig"
Cohesion: 0.12
Nodes (33): AbortCommandOptions, ParsedLaunchArgs, parseLaunchArgs(), CleanupOptions, EvalCommandOptions, GenesisCommandOptions, HistoryCommandOptions, LaunchCommandOptions (+25 more)

### Community 4 - "project-store.ts"
Cohesion: 0.14
Nodes (26): addObjective(), addRule(), atomicWrite(), bumpGenesisCount(), ensureDir(), formatProjectContext(), linkQuestToObjective(), loadProject() (+18 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.04
Nodes (73): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+65 more)

### Community 6 - "protocol.ts"
Cohesion: 0.05
Nodes (69): DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile(), DaemonStatus (+61 more)

### Community 7 - "review.ts"
Cohesion: 0.08
Nodes (32): ReviewConfig, buildSpecText(), formatFindingComment(), formatReviewFeedback(), REVIEWER_ATTEMPTS, REVIEWER_AUTHOR, ReviewOutcome, ReviewStageDeps (+24 more)

### Community 8 - "ReplayStore"
Cohesion: 0.22
Nodes (10): assertSafe(), isSafeSegment(), replaysDir(), ReplayStore, summarize(), collectExecutions(), seedReplay(), seed() (+2 more)

### Community 9 - "task-store.ts"
Cohesion: 0.09
Nodes (49): Top-level options, Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities (+41 more)

### Community 10 - "lib/quest.ts"
Cohesion: 0.06
Nodes (37): row(), fakeRun(), mountScreen(), streams(), wait(), createBlankQuest(), deepMerge(), emptyConstraints() (+29 more)

### Community 11 - "auto.ts"
Cohesion: 0.15
Nodes (19): buildCittyArgs(), injectDefaultSubcommand(), isCittyCommand(), resolveGlobalFlagsAndCommand(), runCittyCommand(), checkDevModeGuard(), initCliLocale(), main() (+11 more)

### Community 12 - "t"
Cohesion: 0.04
Nodes (94): Architecture, citty, cmdAbort(), abortCommand, cleanupCommand, daemonCommand, startCommand, statusCommand (+86 more)

### Community 13 - "toon.ts"
Cohesion: 0.08
Nodes (53): evalCommand, cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG (+45 more)

### Community 14 - "replay-viewer.test.tsx"
Cohesion: 0.17
Nodes (13): parseReplay(), ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay() (+5 more)

### Community 15 - "ink/index.ts"
Cohesion: 0.07
Nodes (60): buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES (+52 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.09
Nodes (49): DashboardMetricsContext, DashboardMetricsValue, DASHBOARD_EVENTS, DashboardMetricsProviderProps, initialValue(), REAL_TIMERS, ActivityEntry, advanceThroughput() (+41 more)

### Community 17 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 18 - "onboarding/index.ts"
Cohesion: 0.07
Nodes (62): useChromeHideQuitHint(), ConfirmDialog(), ConfirmDialogProps, press(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase (+54 more)

### Community 19 - "github-client.ts"
Cohesion: 0.09
Nodes (33): apiUrlFor(), createGitHubClient(), json(), paginate(), rateLimitWaitMs(), request(), CreateGitHubClientOptions, CreateIssueInput (+25 more)

### Community 20 - "dashboard.tsx"
Cohesion: 0.06
Nodes (62): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+54 more)

### Community 21 - "push.ts"
Cohesion: 0.04
Nodes (90): SyncOptions, CheckResult, mergeSchemaIssues(), Quest, loadAllArchivedQuests(), attributionBreakerPath(), AttributionTrip, AttributionTripped (+82 more)

### Community 22 - "comments.ts"
Cohesion: 0.07
Nodes (47): addComment(), AddCommentInput, assertSafeId(), Comment, COMMENTS_DIR, commentsDir(), compareComments(), findCommentPath() (+39 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.06
Nodes (55): cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution(), cmdRetro() (+47 more)

### Community 24 - "worktree.ts"
Cohesion: 0.11
Nodes (28): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createWorktree(), deleteQuestBranch(), featureBranchName() (+20 more)

### Community 25 - "lib/output.ts"
Cohesion: 0.09
Nodes (35): addCommand, commentCommand, ensureInitialized(), linkCommand, listCommand, outputArg, refArg, showCommand (+27 more)

### Community 26 - "ref_node_path"
Cohesion: 0.05
Nodes (36): 1. Are agents spawned with `detached: true` and `unref()`?, root, DEFAULT_CONFIG, InitWriterConfig, InitWriterResult, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness() (+28 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (22): Arguments, Global flags, Arguments, Global flags, Global flags, Global flags, Flags, Global flags (+14 more)

### Community 29 - "schema.ts"
Cohesion: 0.18
Nodes (18): hasKey(), aliasHint(), allCommandSchemas(), buildAliasMap(), descriptionOf(), findCommandDef(), flagDescriptionOf(), flagKeyName() (+10 more)

### Community 30 - "lib/retro.ts"
Cohesion: 0.07
Nodes (42): RetroResult, CommentRef, loadEvalReport(), analyzeReplay(), candidate(), collectComments(), collectEvals(), CollectOptions (+34 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (4): DaemonClient, CommandMap, EvtStateSnapshot, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.14
Nodes (24): AgentRegistryMode, InkPreflightResult, PreflightResult, PreflightViewProps, agentNameFromType(), AgentResolution, cacheAgent(), cacheDir() (+16 more)

### Community 33 - "config.ts"
Cohesion: 0.06
Nodes (35): genesisCommand, cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), AgentRegistryConfig, CommentsConfig (+27 more)

### Community 34 - "agents-routing-screen.tsx"
Cohesion: 0.10
Nodes (35): resolveAgentBin(), RoutingConfig, saveConfig(), AgentsRoutingScreen(), AgentsRoutingScreenProps, EditField, editFields(), HARNESS_PICKER (+27 more)

### Community 35 - "eval-score.ts"
Cohesion: 0.10
Nodes (28): clampScore(), intervalsOverlap(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), ScoreReport, scoreRouting(), scoreSession() (+20 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.12
Nodes (33): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandResult, CreateOrUpdatePrOptions, createOrUpdatePullRequest() (+25 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.16
Nodes (10): allocateExecutionId(), AnalyticsTracker, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState, StatusObserverInfo (+2 more)

### Community 39 - "Issue tracker: GitLab"
Cohesion: 0.08
Nodes (19): Conventions, Issue tracker: GitLab, Merge requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Conventions, Issue tracker: Local Markdown (+11 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.16
Nodes (18): META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema, SchemaIssue, TASK_ARRAY_FIELDS, TASK_REQUIRED_FIELDS, VALID_DIFFICULTIES, VALID_PRIORITIES (+10 more)

### Community 41 - "Daemon"
Cohesion: 0.14
Nodes (4): Assistant (Build · claude-sonnet-4.6 · 9.4s), Daemon, CommandMessage, AutoSyncLoop

### Community 42 - "test-baseline.ts"
Cohesion: 0.10
Nodes (36): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+28 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "analytics-summary.ts"
Cohesion: 0.21
Nodes (15): buildAnalyticsSummary(), AnalyticsMergeOutcome, AnalyticsOutcome, AnalyticsUsageCoverage, aggregateMetrics, AnalyticsFilter, AnalyticsGroup, dedupeExecutions() (+7 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.11
Nodes (41): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+33 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.07
Nodes (34): ReplayRecorderOptions, Tracked, TaskRow, boundValue(), DEFAULT_KEEP_PER_TASK, FileState, firstLine(), normalizeHarnessEvent() (+26 more)

### Community 48 - "ref_bun_test"
Cohesion: 0.04
Nodes (73): ink, react, App(), AppProps, ErrandWizardProps, ErrandWizardStep, STEPS, FakeTaskWizardProps (+65 more)

### Community 49 - "run-quest-picker.tsx"
Cohesion: 0.13
Nodes (21): FakeTaskConfig, generateFakeTasks(), shuffleArr(), shuffledTitles(), summarizeQuest(), defaultProps(), EMPTY_USAGE, makeQuest() (+13 more)

### Community 50 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (16): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+8 more)

### Community 51 - "post-merge-integration.test.ts"
Cohesion: 0.06
Nodes (60): defaultIsDaemonAlive(), SelectedAgentInfo, PostMergeConfig, createDaemonAgentState(), setupMergeDriver(), VerificationSummary, createBlankTask(), feature (+52 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (33): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+25 more)

### Community 54 - "msg"
Cohesion: 0.11
Nodes (54): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+46 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "commands/launch.ts"
Cohesion: 0.11
Nodes (22): Behavior, Fake Agent, Usage, analyzeBarrelFile(), BarrelFile, cmdLaunch(), DaemonProgress, delegateToDaemon() (+14 more)

### Community 57 - "prompt.ts"
Cohesion: 0.17
Nodes (15): normalizeCommentsConfig(), formatHunksForLLM(), portlessUrl(), capComments(), formatCommentList(), formatCommentsSection(), formatSubtask(), formatTestBaselineSection() (+7 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.06
Nodes (31): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags, Flags (+23 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "loadConfig"
Cohesion: 0.14
Nodes (23): briefCommand, ensureInitialized(), listCommand, outputArg, setCommand, showCommand, taskArg, triageCommand (+15 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.11
Nodes (9): ConnectionState, EventMap, DashboardDaemonClient, FakeClient, FakeTimers, mount(), streams(), T0 (+1 more)

### Community 63 - "lib/launcher.ts"
Cohesion: 0.12
Nodes (24): AgentProfile, EditState, HarnessRow, HarnessId, ResolvedRoute, HarnessCapabilities, Normalizer, AgentType (+16 more)

### Community 64 - "commands/tui.ts"
Cohesion: 0.09
Nodes (45): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), defaultPlanAllDeps() (+37 more)

### Community 65 - "useI18n"
Cohesion: 0.07
Nodes (65): ChromeTopBar(), ConfirmDialog(), ConfirmDialogProps, ErrandWizard(), useScreenInput(), FakeTaskWizard(), t, useI18n() (+57 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.09
Nodes (22): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, 6. Never author or attribute anything as Claude Code, Claude or any other AI, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo (+14 more)

### Community 67 - "run-daemon-monitor.tsx"
Cohesion: 0.04
Nodes (80): DaemonAgentState, SchedulerState, ChromeLayout(), DashboardStore, DashboardStoreContext, useDashboardStore(), EscMenuProvider(), createI18n() (+72 more)

### Community 68 - "analytics.ts"
Cohesion: 0.06
Nodes (35): Flags, Global flags, props(), rec(), sampleRecords(), ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES (+27 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.11
Nodes (14): 2. Does `ProcessMonitor.killAll()` kill child processes?, 3. Does `screen.destroy()` affect agent processes?, Agent Process Lifecycle Audit, Files with Audit Annotations, Findings, Graceful Shutdown (SIGINT / TUI quit / SIGTERM / SIGHUP), Interactive Mode Shutdown, Recommendations (+6 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.20
Nodes (18): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+10 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "commands/merge.ts"
Cohesion: 0.08
Nodes (50): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), evidenceFor(), git(), gitOk(), isAncestor() (+42 more)

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

### Community 79 - "leak-check.ts"
Cohesion: 0.14
Nodes (22): gitRaw(), assertNoLeaks(), Exitable, fakeAgentDescendants(), isAlive(), LeakCheckOptions, listBranches(), listWorktreeDirEntries() (+14 more)

### Community 80 - "commands/usage.ts"
Cohesion: 0.15
Nodes (26): coverageNote(), FG, formatAnalyticsDuration(), formatAnalyticsRate(), formatCost(), formatNumber(), groupedToJSON(), groupKeyLabel() (+18 more)

### Community 81 - "commands/status.ts"
Cohesion: 0.18
Nodes (18): statusCommand, agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot() (+10 more)

### Community 82 - "tdd-verifier.test.ts"
Cohesion: 0.29
Nodes (8): result(), applyFeatureChanges(), baselineConfig(), captureBaseline(), git(), initMainRepo(), makeConfig(), writeRepoFiles()

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.17
Nodes (29): completionCommand, aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk() (+21 more)

### Community 85 - "daemon-agent-runner.test.ts"
Cohesion: 0.10
Nodes (16): defaultCommandRunner(), PostMergeRequest, Env, EnvOpts, makeEnv(), ReentrantRunner, SpyRunner, TestableAgentRunner (+8 more)

### Community 86 - "monitor.ts"
Cohesion: 0.10
Nodes (18): UsageOverlayViewProps, extractActivity(), formatEventForLog(), OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd(), shortPath() (+10 more)

### Community 87 - "settings-screen.tsx"
Cohesion: 0.08
Nodes (26): APPEARANCE_FIELD_IDS, cycleOption(), FieldDef, FieldId, FIELDS, GENERAL_FIELD_IDS, LOCALE_OPTIONS, MODEL_FIELD_WEIGHT (+18 more)

### Community 88 - "tdd-verifier.ts"
Cohesion: 0.14
Nodes (26): buildSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationResult, TestBaselineComparison, DEFAULT_TEST_DETECTION_CONFIG (+18 more)

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "dashboard-usage.ts"
Cohesion: 0.18
Nodes (10): addInto(), buildTaskQuestMap(), cloneTotals(), emptyTotals(), mergeInto(), normalizeUsageRecord(), TaskQuestLookup, UsageRefreshResult (+2 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (19): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+11 more)

### Community 94 - "verifier.ts"
Cohesion: 0.18
Nodes (11): QuestPromptContext, extractTddErrorSummary(), TddVerificationOptions, TestBaseline, BuildResult, extractErrorSummary(), FullVerificationOptions, runBuild() (+3 more)

### Community 95 - "models.ts"
Cohesion: 0.23
Nodes (8): BUILTIN_MODELS, CommandRunner, HarnessModel, LIST_COMMANDS, listHarnessModels(), parseOpencodeModels(), parsePiModels(), PARSERS

### Community 96 - "tui-smoke.test.ts"
Cohesion: 0.22
Nodes (8): generateDefaultConfig(), ENTRY, launchTui(), makeProject(), reachQuestPicker(), start(), stripAnsi(), TuiSession

### Community 97 - "wombo-combo"
Cohesion: 0.08
Nodes (23): Commands, Agent Analytics, Commands, Comments, Coverage limitations, Install, Languages, Launch options (+15 more)

### Community 98 - "opsx-explore.prompt.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 99 - "opsx-explore.md"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 100 - "DaemonState"
Cohesion: 0.05
Nodes (29): Files Changed, Minimal, surgical fix, Solution, What does NOT change, Why this is correct, Capabilities, Impact, Modified Capabilities (+21 more)

### Community 101 - "Scheduler"
Cohesion: 0.05
Nodes (34): Problem Trace, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, Why `concurrencyPinned` doesn't protect persisted state, 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification (+26 more)

### Community 102 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 103 - "replay-browser.test.tsx"
Cohesion: 0.23
Nodes (6): setStdoutSize(), Harness, h, seedTask(), wait(), waitFor()

### Community 104 - "test-runner.ts"
Cohesion: 0.23
Nodes (15): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), lastCount(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests() (+7 more)

### Community 105 - "UsageRecord"
Cohesion: 0.29
Nodes (4): MonitorCallbacks, UsageRecord, appendUsageRecord(), UsageStore

### Community 107 - "harness/index.ts"
Cohesion: 0.13
Nodes (26): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+18 more)

### Community 108 - "quest-store.ts"
Cohesion: 0.17
Nodes (26): applyGenesisResult(), normalizeQuest(), applyPlanToQuest(), archivedKnowledgeDir(), archivedKnowledgeFilePath(), archivedQuestFilePath(), archiveQuest(), atomicWrite() (+18 more)

### Community 109 - ".handleStart"
Cohesion: 0.07
Nodes (36): Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+28 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.04
Nodes (67): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+59 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "gen-command-docs.ts"
Cohesion: 0.31
Nodes (15): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+7 more)

### Community 113 - "daemon-profile-wiring.test.ts"
Cohesion: 0.29
Nodes (6): cfg(), ExposedRunner, heavy, light, routed(), task()

### Community 114 - "output"
Cohesion: 0.12
Nodes (38): ensureInitialized(), labelsCommand, outputArg, pullCommand, pushCommand, runCommand, statusCommand, syncCommand (+30 more)

### Community 115 - "wishlist-store.ts"
Cohesion: 0.24
Nodes (16): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, addItem(), atomicWrite(), deleteItem() (+8 more)

### Community 116 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 117 - "commands/upgrade.ts"
Cohesion: 0.17
Nodes (17): upgradeCommand, channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm() (+9 more)

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "commands/team.md"
Cohesion: 0.11
Nodes (18): Arguments, Arguments, Arguments, Flags, Flags, Flags, Global flags, Global flags (+10 more)

### Community 121 - "chrome.tsx"
Cohesion: 0.15
Nodes (17): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBarProps, DaemonStats, dashboardHint() (+9 more)

### Community 122 - "routing.ts"
Cohesion: 0.13
Nodes (22): AvailabilityProbes, fallbackChain(), legacyModel(), legacyRoute(), MissingEnvError, pickProfileName(), resolveRoute(), resolveRouteEnv() (+14 more)

### Community 123 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.39
Nodes (7): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles()

### Community 124 - "changelog.ts"
Cohesion: 0.24
Nodes (11): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+3 more)

### Community 125 - "state.ts"
Cohesion: 0.06
Nodes (24): ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, StatusObserver, analyticsDir(), FAKE_AGENT_SENTINEL, commitFile() (+16 more)

### Community 126 - "teach/SKILL.md"
Cohesion: 0.07
Nodes (25): Learning Record Format, Numbering, Optional sections, Supersession, Template, What does _not_ qualify, When to write a learning record, MISSION.md Format (+17 more)

### Community 127 - "templates/quest-planner-agent.md"
Cohesion: 0.22
Nodes (8): Output Format, Planning Process, Prerequisite Quests, Quality Checklist, Task Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 128 - "errand-planner-agent.md"
Cohesion: 0.29
Nodes (6): Field Reference, Operational Rules, Task Design Principles, What You Must Never Do, YAML Output Schema, Your Task

### Community 129 - "agents/genesis-planner-agent.md"
Cohesion: 0.29
Nodes (6): Field Reference, Operational Rules, Quest Design Principles, What You Must Never Do, YAML Output Schema, Your Task

### Community 130 - "agents/quest-planner-agent.md"
Cohesion: 0.29
Nodes (6): Field Reference, Operational Rules, Task Design Principles, What You Must Never Do, YAML Output Schema, Your Task

### Community 131 - "saveTaskToStore"
Cohesion: 0.05
Nodes (55): autoSyncBusy(), configureAutoSync(), resetAutoSync(), chain, emptyPush(), runCycleSingleFlight(), runExclusive(), runSyncCycle() (+47 more)

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "pull.ts"
Cohesion: 0.06
Nodes (74): CommentRole, QuestStatus, CycleReport, remoteQuestView(), remoteSyncHash(), remoteTaskView, TRIAGE_LABELS, triageLabelsFor() (+66 more)

### Community 135 - "c"
Cohesion: 0.25
Nodes (7): Flags, Global flags, Arguments, Flags, Global flags, quest create, c()

### Community 136 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 137 - "DashboardMetricsProvider"
Cohesion: 0.21
Nodes (5): clientState(), DashboardMetricsProvider(), mapConnection(), TimerApi, DashboardUsageReader

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (18): buildKeywords(), buildScoutIndex(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex() (+10 more)

### Community 140 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 141 - "tasks set-status"
Cohesion: 0.50
Nodes (4): Arguments, Flags, Global flags, tasks set-status

### Community 142 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 143 - "README.md"
Cohesion: 0.08
Nodes (19): Forbidden, everywhere, How it is enforced, Limits, No AI attribution, Configuration, Custom command template, Fallback chains, Profile fields (+11 more)

### Community 144 - "quest-planner.ts"
Cohesion: 0.10
Nodes (37): extractTextFromJsonEvents(), runErrandPlanner(), canonicalizeOutput(), launchPlanner(), createPlannerTelemetry(), fmtTok(), formatPlannerTelemetry(), PlannerTelemetryOptions (+29 more)

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 149 - "first-task.md"
Cohesion: 0.29
Nodes (6): 1. Initialize the project, 2. Add a task, 3. Preview, then launch, 4. Verify and merge, 5. Clean up, Where to go next

### Community 150 - "quests.md"
Cohesion: 0.29
Nodes (6): Branches, Constraints, Lifecycle, Planning, Planning every unplanned quest, TDD

### Community 151 - "tdd-baseline.md"
Cohesion: 0.22
Nodes (8): Comparison rules, Fail-closed behavior, Known limitation: passing tests are not always listed, Lifecycle, Location, Non-quest fallback, Supported test output, What is recorded

### Community 152 - "wombo-combo Operational Constraints"
Cohesion: 0.33
Nodes (5): Commit Guidelines, Constraints, Error Recovery, What You Must Never Do, wombo-combo Operational Constraints

### Community 153 - "Changelog"
Cohesion: 0.11
Nodes (18): 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12 (+10 more)

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

### Community 158 - "esc-menu.tsx"
Cohesion: 0.06
Nodes (55): AgentStatus, DashboardAgent, defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps (+47 more)

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

### Community 166 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 167 - "analytics-browser.test.tsx"
Cohesion: 0.14
Nodes (10): Harness, mount(), h, wait(), waitFor(), stripAnsi(), mount(), mount() (+2 more)

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 169 - "lib/tasks.ts"
Cohesion: 0.04
Nodes (66): checkTasks(), hasCycle(), collectAllItems(), defaultLoadTaskQuests(), ANALYTICS_REFRESH_MS, analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES (+58 more)

### Community 171 - "commands/triage.md"
Cohesion: 0.13
Nodes (14): Arguments, Arguments, Arguments, Flags, Flags, Global flags, Global flags, Global flags (+6 more)

### Community 173 - "claims.ts"
Cohesion: 0.22
Nodes (19): normalizeTeamConfig(), assertSafeId(), Claim, ClaimInfo, ClaimOptions, claimPath(), ClaimResult, CLAIMS_DIR (+11 more)

### Community 174 - "commands/logs.ts"
Cohesion: 0.29
Nodes (9): logsCommand, cmdLogs(), colorize(), followLog(), LogLine, LogsCommandOptions, readLogLines(), renderText() (+1 more)

### Community 175 - "Steps"
Cohesion: 0.15
Nodes (12): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 7. Verify, 8. Commit (+4 more)

### Community 180 - "fake-agent-runner.ts"
Cohesion: 0.16
Nodes (23): AttemptStore, FAULT_STAGES, FaultAction, faultAt(), FaultSpec, FaultStage, faultStateDir(), fileAttemptStore() (+15 more)

### Community 187 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 191 - "citty-bridge.ts"
Cohesion: 0.30
Nodes (11): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+3 more)

### Community 192 - "Test-Driven Development"
Cohesion: 0.15
Nodes (10): Designing for Mockability, When to Mock, Anti-patterns, Rules of the loop, Seams: where tests go, Test-Driven Development, What a good test is, Bad Tests (+2 more)

### Community 193 - "format-converter.ts"
Cohesion: 0.27
Nodes (11): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+3 more)

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

### Community 202 - "Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror)"
Cohesion: 0.10
Nodes (21): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Claim, progress, resolve, Comments (+13 more)

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 206 - "replay-diff.ts"
Cohesion: 0.27
Nodes (11): defaultCaptureReviewDiff(), EXCLUDED_PATH_PREFIXES, captureWorktreeDiff(), DiffLineKind, MAX_UNTRACKED_FILES, parseNumstat(), pathspecs(), runGit() (+3 more)

### Community 207 - "github-sync.md"
Cohesion: 0.07
Nodes (23): Vocabulary, Authentication, Checking the mirror, Commands, Concurrency, Configuration, Conflicts, Finished work (+15 more)

### Community 208 - "Process"
Cohesion: 0.25
Nodes (7): 1. Pin the fixed point, 2. Identify the spec source, 3. Identify the standards sources, 4. Spawn both sub-agents in parallel, 5. Aggregate, Process, Why two axes

### Community 209 - "Migrate to Shoehorn"
Cohesion: 0.20
Nodes (9): `as Type` → `fromPartial()`, `as unknown as Type` → `fromAny()`, Install, Large objects with few needed properties, Migrate to Shoehorn, Migration patterns, When to use each, Why shoehorn? (+1 more)

### Community 210 - "stripAiAttribution"
Cohesion: 0.24
Nodes (11): ALLOWLIST, Finding, git(), scanCommits(), scanText(), scanTrackedFiles(), AI_ATTRIBUTION_LINE_PATTERNS, containsAiAttribution() (+3 more)

### Community 211 - "Steps"
Cohesion: 0.22
Nodes (8): 1. Ask scope, 2. Copy the hook script, 3. Add hook to settings, 4. Ask about customization, 5. Verify, Setup Git Guardrails, Steps, What Gets Blocked

### Community 212 - "Scaffold Exercises"
Cohesion: 0.22
Nodes (8): Directory naming, Example: stubbing from a plan, Exercise variants, Lint rules summary, Moving/renaming exercises, Required files, Scaffold Exercises, Workflow

### Community 213 - "to-spec/SKILL.md"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Process, Solution, Testing Decisions, User Stories

### Community 214 - "locales/index.ts"
Cohesion: 0.18
Nodes (4): availableLocales(), FALLBACK_LOCALE, FlatResource, ENTRY

### Community 215 - "comments.md"
Cohesion: 0.25
Nodes (7): Author resolution, CLI, How comments reach agents, In the TUI, Merge-friendliness, Roles, Storage layout

### Community 217 - "<Questionnaire title>"
Cohesion: 0.25
Nodes (7): Anything else?, Context, Document structure, How to answer, <Questionnaire title>, <Theme heading>, What load is the system expected to handle at launch?

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

### Community 224 - "analytics-git.ts"
Cohesion: 0.24
Nodes (11): git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry, parseNumstatZ() (+3 more)

### Community 225 - "loop-me/SKILL.md"
Cohesion: 0.40
Nodes (4): Definition of done, The loop lens, The workspace, Vocabulary

### Community 226 - "daemon-project-context.test.ts"
Cohesion: 0.08
Nodes (26): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+18 more)

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

### Community 233 - "guides/retro.md"
Cohesion: 0.25
Nodes (7): Acting on a retro, Categories, Example, Moving a rule out of AGENTS.md, Saving retros, Severity thresholds, What is collected

### Community 234 - "review-gate.md"
Cohesion: 0.25
Nodes (7): Configuration, Findings as task comments, Limits, Retry rounds, Routing: operation `review`, What is reviewed, Writing CODING_STANDARDS.md

### Community 249 - "running-agents.md"
Cohesion: 0.33
Nodes (5): Cleanup, Launch, Merge, Monitoring and recovery, Verification

### Community 250 - "Local changes to vendored skills"
Cohesion: 0.50
Nodes (3): `code-review` renamed to `code-review-spec`, Local changes to vendored skills, `triage`: no AI disclaimer

### Community 251 - "guides/triage.md"
Cohesion: 0.33
Nodes (5): Commands, GitHub labels, States, Transitions, With sync and comments

### Community 254 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 262 - "init-app.tsx"
Cohesion: 0.13
Nodes (23): InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp(), detectBaseBranch(), detectBuildCommand(), detectInstallCommand() (+15 more)

### Community 264 - "config.md"
Cohesion: 0.11
Nodes (18): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `comments`, `defaults`, `git` (+10 more)

### Community 272 - "tdd-baseline-integration.test.ts"
Cohesion: 0.17
Nodes (10): Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode, tmpDirs (+2 more)

### Community 275 - "onboarding-helpers.ts"
Cohesion: 0.60
Nodes (5): buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks(), formatProfileAsMarkdown(), runLlmSynthesis()

### Community 276 - "harness-opencode.test.ts"
Cohesion: 0.24
Nodes (8): HARNESS_IDS, Operation, OPERATIONS, listHarnesses(), ResolveRouteOptions, detectAgentType(), base, oc

### Community 278 - "lock.ts"
Cohesion: 0.19
Nodes (12): acquire(), held, isStale(), LOCK_STALE_MS, LOCK_WAIT_MS, LockInfo, lockPath(), pidAlive() (+4 more)

### Community 280 - "ReplayRecorder"
Cohesion: 0.15
Nodes (3): errMsg(), ReplayRecorder, truncateText()

### Community 281 - "genesis-planner.ts"
Cohesion: 0.16
Nodes (18): generateErrandPrompt(), detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput (+10 more)

### Community 286 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 288 - "openspec/specs/scheduler-concurrency-accounting/spec.md"
Cohesion: 0.25
Nodes (7): Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded, Scenario: Scheduler tick continues while agents are verifying

### Community 300 - "portless.ts"
Cohesion: 0.47
Nodes (8): ensureProxyRunning(), isPortlessAvailable(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus(), resolvePortlessBin(), wrapWithPortless()

### Community 308 - "Process"
Cohesion: 0.29
Nodes (6): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2048 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `agent-runner.ts`, `task-store.ts`, `auto.ts`, `toon.ts`, `README.md`, `ink/index.ts`, `dashboard.tsx`, `push.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/output.ts`, `schema.ts`, `esc-menu.tsx`, `agent-registry.ts`, `config.ts`, `task-schema.ts`, `lib/tasks.ts`, `portless.ts`, `commands/logs.ts`, `ref_bun_test`, `msg`, `commands/launch.ts`, `commands/tasks.md`, `loadConfig`, `commands/tui.ts`, `useI18n`, `run-daemon-monitor.tsx`, `commands/merge.ts`, `templates.ts`, `github-sync.md`, `commands/usage.ts`, `commands/status.ts`, `commands/completion.ts`, `tdd-verifier.ts`, `output`, `graph.ts`, `commands/upgrade.ts`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.0196078431372549 - nodes in this community are weakly interconnected._
- **Why does `AgentRunner` connect `AgentRunner` to `WomboConfig`, `agent-runner.ts`, `protocol.ts`, `review.ts`, `task-store.ts`, `analytics-measurements.test.ts`, `overview.md`, `ReplayRecorder`, `AnalyticsTracker`, `Daemon`, `claims.ts`, `lib/replay.ts`, `post-merge-integration.test.ts`, `ProcessMonitor`, `commands/merge.ts`, `daemon-agent-runner.test.ts`, `daemon-test-baseline.test.ts`, `verifier.ts`, `daemon-project-context.test.ts`, `DaemonState`, `Scheduler`, `.handleStart`, `daemon-profile-wiring.test.ts`, `state.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.10400682011935208 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `agent-runner.ts`, `protocol.ts`, `pull.ts`, `task-store.ts`, `lib/quest.ts`, `t`, `toon.ts`, `quest-planner.ts`, `analytics-measurements.test.ts`, `onboarding/index.ts`, `onboarding-helpers.ts`, `harness-opencode.test.ts`, `push.ts`, `tdd-baseline-integration.test.ts`, `lib/i18n.ts`, `worktree.ts`, `lib/output.ts`, `ref_node_path`, `genesis-planner.ts`, `DaemonClient`, `agent-registry.ts`, `config.ts`, `agents-routing-screen.tsx`, `eval-score.ts`, `Daemon`, `lib/tasks.ts`, `portless.ts`, `claims.ts`, `lib/replay.ts`, `run-quest-picker.tsx`, `test-baseline-capture.ts`, `post-merge-integration.test.ts`, `msg`, `commands/launch.ts`, `prompt.ts`, `lib/launcher.ts`, `commands/tui.ts`, `useI18n`, `run-daemon-monitor.tsx`, `analytics.ts`, `commands/merge.ts`, `InkDaemonTUI`, `templates.ts`, `commands/usage.ts`, `commands/status.ts`, `tdd-verifier.test.ts`, `daemon-agent-runner.test.ts`, `tdd-verifier.ts`, `daemon-test-baseline.test.ts`, `verifier.ts`, `daemon-project-context.test.ts`, `Scheduler`, `daemon-profile-wiring.test.ts`, `graph.ts`, `routing.ts`, `tdd-baseline-pipeline.test.ts`, `state.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._