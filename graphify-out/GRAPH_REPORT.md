# Graph Report - wombo-combo  (2026-10-13)

## Corpus Check
- 751 files · ~803,875 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: .log 18, .jsonl 7, (none) 4)

## Summary
- 6423 nodes · 18827 edges · 274 communities (231 shown, 43 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 888 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b514780c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Explore mode guidelines and usage rules
- AgentRunner
- browser.ts
- WomboConfig
- onboarding/index.ts
- agent-runner.ts
- protocol.ts
- review.ts
- ReplayStore
- task-store.ts
- lib/quest.ts
- project-store.ts
- config.ts
- eval-score.ts
- replay-viewer.test.tsx
- useI18n
- dashboard-metrics.ts
- toon.ts
- Summary table
- verifier.ts
- t
- mapping.ts
- commands/tui.ts
- lib/i18n.ts
- worktree.ts
- dashboard.tsx
- ref_node_path
- hitl-channel.ts
- index.md
- schema.ts
- lib/retro.ts
- DaemonClient
- agent-registry.ts
- lib/tasks.ts
- agents-routing-screen.tsx
- commands/stats.ts
- generate-fake-tasks.ts
- github-pr.ts
- AnalyticsTracker
- setup-matt-pocock-skills/SKILL.md
- task-schema.ts
- Daemon
- test-baseline.ts
- compilerOptions
- test-runner.ts
- merge-report.ts
- conflict-hunks.ts
- lib/replay.ts
- ref_bun_test
- ADR 0001: OTP-style supervision for the wombo-combo daemon
- comments.ts
- saveTaskToStore
- dashboard-realtime.test.tsx
- replay-viewer.tsx
- msg
- quest.md
- commands/upgrade.ts
- prompt.ts
- TextBuffer
- commands/tasks.md
- permission
- run-task-browser.tsx
- dashboard-provider.test.tsx
- lib/launcher.ts
- quest-plan-all.ts
- wishlist-store.ts
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
- config.md
- t
- commands/status.ts
- test-detection.ts
- Triage
- commands/completion.ts
- tdd-baseline-integration.test.ts
- monitor.ts
- settings-screen.tsx
- replay-browser.test.tsx
- wishlist.md
- chrome.tsx
- .github/skills/openspec-explore/SKILL.md
- .opencode/skills/openspec-explore/SKILL.md
- daemon-test-baseline.test.ts
- post-merge.ts
- saveAllTasksToStore
- tui-smoke.test.ts
- wombo-combo
- opsx-explore.prompt.md
- opsx-explore.md
- DaemonState
- analytics-git.ts
- .load
- github-sync.md
- format-converter.ts
- prompt-compress.ts
- commands/retro.ts
- harness/index.ts
- supervision/index.ts
- Scheduler
- maxConcurrent
- daemon.md
- gen-command-docs.ts
- LiveFakeClient
- output
- AgentStatus
- graph.ts
- supervision/supervisor.ts
- templates/generalist-agent.md
- templates/genesis-planner-agent.md
- commands/team.md
- Supervisor
- routing.ts
- supervisor-strategies.test.ts
- tdd-baseline-pipeline.test.ts
- analytics-integration.test.ts
- teach/SKILL.md
- templates/quest-planner-agent.md
- errand-planner-agent.md
- agents/genesis-planner-agent.md
- agents/quest-planner-agent.md
- github-client.ts
- Process
- pull.ts
- react-devtools-core.ts
- c
- esc-menu.tsx
- DashboardMetricsProvider
- test-baseline-capture.ts
- scout.ts
- genesis.md
- validate.ts
- Codebase Design
- README.md
- run-preflight.tsx
- merge-resolver-agent.md
- During the session
- overview.md
- TypedEmitter
- first-task.md
- quests.md
- tdd-baseline.md
- wombo-combo Operational Constraints
- Changelog
- install.md
- docs/tsconfig.json
- HTML Report Format
- template.sh
- FakeClock
- replay.md
- Ask Matt
- wombo-combo Agent Context
- Diagnosing Bugs
- ink/index.ts
- check-attribution.ts
- ChildSpec
- hitl-ask.ts
- architecture/supervision.md
- CONTEXT.md — For AI agents using wombo as a tool
- analytics-overlay.tsx
- commands/triage.md
- claims.ts
- loadConfig
- Steps
- analytics-lifecycle.test.ts
- fake-agent-runner.ts
- DaemonAgentState
- ADDED Requirements
- registry-parity.test.ts
- Test-Driven Development
- child-state.ts
- Process
- comment.md
- writing-for-agents/SKILL.md
- portless.ts
- Steps
- sync.md
- otp-supervision-spike/knowledge.md
- gh
- wayfinder/SKILL.md
- Domain Docs
- comments.md
- done
- Process
- Migrate to Shoehorn
- push.ts
- Steps
- Scaffold Exercises
- to-spec/SKILL.md
- IntensityTracker
- Process
- <Questionnaire title>
- writing-shape/SKILL.md
- cli-smoke.test.ts
- Triage Labels
- Sections
- writing-beats/SKILL.md
- Staying in TypeScript/Bun versus the Elixir/OTP daemon (closed PR #3)
- loop-me/SKILL.md
- .submitTask
- chief-of-staff/SKILL.md
- hitl-loop.template.sh
- GLOSSARY.md Format
- writing-fragments/SKILL.md
- Supervisor
- guides/retro.md
- review-gate.md
- block-dangerous-git.sh
- implement-spec/SKILL.md
- CREDITS.md
- Issue tracker: GitLab
- Requirement: Fake-agent tasks bypass inter-launch stagger
- Local changes to vendored skills
- guides/triage.md
- Requirement: Fake-agent tasks bypass inter-launch stagger
- 2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md
- 2026-03-21-fix-scheduler-oversubscription/proposal.md
- analytics-measurements.test.ts
- supervision.md
- resume.md
- retry.md
- Domain Docs
- 2026-03-21-fix-scheduler-launch-and-concurrency/tasks.md
- completion.md
- upgrade.md
- usage.md
- 2026-03-21-fix-scheduler-oversubscription/tasks.md
- StubDaemonClient
- quest-planner.ts
- NoLaunchRunner
- sync-roundtrip.test.ts
- replay-recorder.ts
- genesis-planner.ts
- gen-config-docs.ts
- .allComplete

## God Nodes (most connected - your core abstractions)
1. `t()` - 210 edges
2. `WomboConfig` - 161 edges
3. `react` - 129 edges
4. `ink` - 122 edges
5. `useI18n()` - 117 edges
6. `Explore mode guidelines and usage rules` - 114 edges
7. `AgentRunner` - 112 edges
8. `DaemonState` - 112 edges
9. `t` - 101 edges
10. `loadConfig()` - 88 edges

## Surprising Connections (you probably didn't know these)
- `Daemon` --references--> `AgentRunner`  [INFERRED]
  docs/src/content/docs/architecture/overview.md → src/daemon/agent-runner.ts
- `1. What PR #3 proposed` --references--> `DaemonClient`  [INFERRED]
  docs/adr/0001-otp-supervision/ts-vs-elixir.md → src/daemon/client.ts
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

## Communities (274 total, 43 thin omitted)

### Community 0 - "Explore mode guidelines and usage rules"
Cohesion: 0.02
Nodes (98): Archive Complete, Assistant (Build · claude-sonnet-4.6 · 11.9s), Assistant (Build · claude-sonnet-4.6 · 12.1s), Assistant (Build · claude-sonnet-4.6 · 13.3s), Assistant (Build · claude-sonnet-4.6 · 13.7s), Assistant (Build · claude-sonnet-4.6 · 13.8s), Assistant (Build · claude-sonnet-4.6 · 14.0s), Assistant (Build · claude-sonnet-4.6 · 14.2s) (+90 more)

### Community 1 - "AgentRunner"
Cohesion: 0.13
Nodes (9): The actual bug — found it, AgentRunner, getConflictDiffs(), isTierAllowed(), runSafeCmd(), TaskEditorProps, QuestPromptContext, Task (+1 more)

### Community 2 - "browser.ts"
Cohesion: 0.12
Nodes (15): Daemon and TUI, BrowserConfig, allocateDebugPort(), allocatedPorts, BrowserInstance, BrowserManager, BrowserTestResult, BrowserVerifyResult (+7 more)

### Community 3 - "WomboConfig"
Cohesion: 0.10
Nodes (38): AbortCommandOptions, cmdAbort(), ParsedLaunchArgs, ParsedMergeArgs, ParsedResumeArgs, ParsedRetryArgs, CleanupOptions, CommentOptions (+30 more)

### Community 4 - "onboarding/index.ts"
Cohesion: 0.10
Nodes (50): useChromeHideQuitHint(), ConfirmDialog(), ConfirmDialogProps, press(), FieldEditor(), FieldEditorProps, CreateFlowPhase, EditFlowPhase (+42 more)

### Community 5 - "agent-runner.ts"
Cohesion: 0.05
Nodes (72): Context, Decision: Apply the same pattern to both `mergeBranch` and `syncQuestBranch`, Decision: Sibling directory next to the project root, Decisions, Goals / Non-Goals, Risks / Trade-offs, Capabilities, Impact (+64 more)

### Community 6 - "protocol.ts"
Cohesion: 0.06
Nodes (71): 4. The CLI/TUI boundary, DaemonClientOptions, EventHandler, ClientData, ConnectedClient, DaemonOptions, ServerWebSocket, cleanupPidFile() (+63 more)

### Community 7 - "review.ts"
Cohesion: 0.08
Nodes (32): ReviewConfig, buildSpecText(), formatFindingComment(), formatReviewFeedback(), REVIEWER_ATTEMPTS, REVIEWER_AUTHOR, ReviewOutcome, ReviewStageDeps (+24 more)

### Community 8 - "ReplayStore"
Cohesion: 0.21
Nodes (10): assertSafe(), isSafeSegment(), ReplayStore, summarize(), collectExecutions(), seedReplay(), seed(), seed() (+2 more)

### Community 9 - "task-store.ts"
Cohesion: 0.16
Nodes (34): Top-level options, validateTask(), archiveDir(), atomicWrite(), createBackup(), defaultMeta(), ensureDir(), flattenTask() (+26 more)

### Community 10 - "lib/quest.ts"
Cohesion: 0.07
Nodes (46): applyGenesisResult(), cmdGenesis(), CreatedQuest, GenesisReviewResult, showGenesisReview(), sleep(), createBlankQuest(), deepMerge() (+38 more)

### Community 11 - "project-store.ts"
Cohesion: 0.09
Nodes (43): OnboardingResult, OnboardingScreen(), OnboardingScreenProps, runOnboardingInk(), RunOnboardingOptions, buildSynthesisPrompt(), extractTextFromJsonEvents(), extractYamlFromFencedBlocks() (+35 more)

### Community 12 - "config.ts"
Cohesion: 0.07
Nodes (28): cmdInit(), InitOptions, AgentRegistryConfig, CommentsConfig, CONFIG_FILE, deepMerge(), DIFFICULTIES, isPlainObject() (+20 more)

### Community 13 - "eval-score.ts"
Cohesion: 0.16
Nodes (15): clampScore(), intervalsOverlap(), parseEffortMinutes(), RoutingMismatch, scoreFlow(), ScoreReport, scoreRouting(), scoreSession() (+7 more)

### Community 14 - "replay-viewer.test.tsx"
Cohesion: 0.17
Nodes (13): parseReplay(), ReplayPayload, BASE, Harness, live, makeReplay(), mount(), smallReplay() (+5 more)

### Community 15 - "useI18n"
Cohesion: 0.07
Nodes (66): buildGenesisConfig(), buildGenesisEditFields(), DIFFICULTIES, GENESIS_EDIT_FIELDS, GenesisReviewApp(), GenesisReviewAppProps, HITL_MODES, PRIORITIES (+58 more)

### Community 16 - "dashboard-metrics.ts"
Cohesion: 0.09
Nodes (48): DashboardMetricsContext, DashboardMetricsValue, clientState(), DASHBOARD_EVENTS, DashboardMetricsProviderProps, initialValue(), mapConnection(), REAL_TIMERS (+40 more)

### Community 17 - "toon.ts"
Cohesion: 0.07
Nodes (55): cmdEval(), FG, formatScore(), renderScorecard(), scoreColor(), cmdHistory(), FG, formatDate() (+47 more)

### Community 18 - "Summary table"
Cohesion: 0.12
Nodes (19): 1. Summary table, 2. Supervisor, 4. Restart strategies, one_for_all, one_for_one, rest_for_one, Context, Follow-ups (+11 more)

### Community 19 - "verifier.ts"
Cohesion: 0.15
Nodes (21): extractBrowserErrorSummary(), buildSummary(), extractTddErrorSummary(), isNonTestableChangeOnly(), renderTddVerificationReport(), runTddVerification(), summarizeBaselineComparison(), TddVerificationOptions (+13 more)

### Community 20 - "t"
Cohesion: 0.07
Nodes (59): t, AllTasksDetail(), AllTasksItem(), ErrandsDetail(), ErrandsItem(), Header(), QuestDetail(), QuestListItem() (+51 more)

### Community 21 - "mapping.ts"
Cohesion: 0.08
Nodes (49): ensureLabels(), assertId(), assertKind(), deleteMapping(), FieldConflict, findMappingByIssue(), hashComment(), hashFields() (+41 more)

### Community 22 - "commands/tui.ts"
Cohesion: 0.12
Nodes (33): cmdTui(), handleErrandFlow(), handleGenesisFlow(), handlePlanFlow(), handleWishlistFlow(), maybeDeleteWishlistItem(), NullTree(), defaultPlanAllDeps() (+25 more)

### Community 23 - "lib/i18n.ts"
Cohesion: 0.09
Nodes (32): Architecture, cmdReplayList(), cmdReplayShow(), fmtTime(), pad(), renderText(), ReplayCommandOptions, resolveExecution() (+24 more)

### Community 24 - "worktree.ts"
Cohesion: 0.08
Nodes (45): cmdCleanup(), branchHasChanges(), cleanupAllWorktrees(), copyConfigFiles(), createBranch(), createQuestBranch(), createWorktree(), featureBranchName() (+37 more)

### Community 25 - "dashboard.tsx"
Cohesion: 0.07
Nodes (41): clip(), connectionLabel(), DASHBOARD_COMPACT_ROWS, DASHBOARD_NARROW_COLUMNS, DASHBOARD_RESERVED_ROWS, DashboardAgent, DashboardAgentRow(), DashboardAgentRowProps (+33 more)

### Community 26 - "ref_node_path"
Cohesion: 0.04
Nodes (43): root, DEFAULT_CONFIG, ACTIVE_STATUSES, AgentRemovalObserver, AgentRemovalReason, DEP_SATISFIED_STATUSES, PersistedDaemonState, StatusObserver (+35 more)

### Community 27 - "hitl-channel.ts"
Cohesion: 0.23
Nodes (18): answerFilePath(), atomicWriteJson(), cleanupAgent(), cleanupAll(), ensureDir(), getAnswer(), getHitlDir(), getPendingQuestions() (+10 more)

### Community 28 - "index.md"
Cohesion: 0.06
Nodes (23): Arguments, Global flags, Arguments, Global flags, Arguments, Global flags, Global flags, Arguments (+15 more)

### Community 29 - "schema.ts"
Cohesion: 0.18
Nodes (18): hasKey(), aliasHint(), allCommandSchemas(), descriptionOf(), findCommandDef(), flagDescriptionOf(), flagKeyName(), getVersion() (+10 more)

### Community 30 - "lib/retro.ts"
Cohesion: 0.07
Nodes (38): CommentRef, loadEvalReport(), analyzeReplay(), candidate(), collectComments(), collectEvals(), CollectOptions, collectRetroInput() (+30 more)

### Community 31 - "DaemonClient"
Cohesion: 0.12
Nodes (3): DaemonClient, EvtStateSnapshot, TuiAppProps

### Community 32 - "agent-registry.ts"
Cohesion: 0.18
Nodes (19): agentNameFromType(), cacheAgent(), cacheDir(), cachePath(), contentsApiUrl(), extractDescription(), fetchAgent(), GeneralistFallback (+11 more)

### Community 33 - "lib/tasks.ts"
Cohesion: 0.03
Nodes (100): addCommand, archiveCommand, checkCommand, graphCommand, listCommand, setDifficultyCommand, setPriorityCommand, setQuestCommand (+92 more)

### Community 34 - "agents-routing-screen.tsx"
Cohesion: 0.08
Nodes (46): AgentProfile, RoutingConfig, saveConfig(), AgentsRoutingScreen(), AgentsRoutingScreenProps, EditField, editFields(), EditState (+38 more)

### Community 35 - "commands/stats.ts"
Cohesion: 0.21
Nodes (14): aggregateByModel(), aggregateStats(), cmdStats(), computeTrend(), filterWavesByDate(), formatDuration(), formatPercent(), formatStatsTable() (+6 more)

### Community 36 - "generate-fake-tasks.ts"
Cohesion: 0.14
Nodes (24): ALL_PRESETS, DIFFICULTIES, Difficulty, EFFORTS, FakeTask, generateDeepTree(), generateDiamond(), generateFakeTasks() (+16 more)

### Community 37 - "github-pr.ts"
Cohesion: 0.08
Nodes (43): PostMergePrMode, checkGhAuthenticated(), checkGhAvailable(), commandError(), CommandOptions, CommandRunner, CreateOrUpdatePrOptions, createOrUpdatePullRequest() (+35 more)

### Community 38 - "AnalyticsTracker"
Cohesion: 0.13
Nodes (10): allocateExecutionId(), AnalyticsTracker, AnalyticsTrackerOptions, errMsg(), ExecutionContext, isActive(), isFinished(), InternalAgentState (+2 more)

### Community 39 - "setup-matt-pocock-skills/SKILL.md"
Cohesion: 0.11
Nodes (13): Conventions, Issue tracker: Local Markdown, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", 1. Explore, 2. Present findings and ask, 3. Confirm and edit (+5 more)

### Community 40 - "task-schema.ts"
Cohesion: 0.18
Nodes (11): DIFFICULTY_ORDER, META_INNER_REQUIRED_FIELDS, META_REQUIRED_FIELDS, MetaSchema, PRIORITY_ORDER, SchemaIssue, TASK_ARRAY_FIELDS, TASK_REQUIRED_FIELDS (+3 more)

### Community 41 - "Daemon"
Cohesion: 0.13
Nodes (3): Assistant (Build · claude-sonnet-4.6 · 9.4s), Daemon, AutoSyncLoop

### Community 42 - "test-baseline.ts"
Cohesion: 0.11
Nodes (31): assertSafeQuestId(), baselineFailingTestIds(), BASELINES_DIR, BaselineTestResults, checkBaselineUsable(), compareTestRunToBaseline(), countIds(), EXECUTION_STATUSES (+23 more)

### Community 43 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, jsx, module, moduleResolution, noUnusedLocals (+10 more)

### Community 44 - "test-runner.ts"
Cohesion: 0.18
Nodes (18): BUN_GLYPHS, classifyExecution(), extractTestErrorSummary(), lastCount(), normalizeTestPath(), parseStructuredResults(), parseTestCounts(), runTests() (+10 more)

### Community 45 - "merge-report.ts"
Cohesion: 0.09
Nodes (46): assertSafeRef(), codeSpan(), collectChangedFiles(), collectComparisonFiles(), collectCumulativeReport(), collectMergeReport(), compareStrings(), CumulativeMergeReport (+38 more)

### Community 46 - "conflict-hunks.ts"
Cohesion: 0.16
Nodes (23): applyResolutions(), classifyFileHunks(), classifyHunk(), ConflictHunk, extractAddedLines(), extractHunkBase(), FileHunkResult, getMergeBaseContent() (+15 more)

### Community 47 - "lib/replay.ts"
Cohesion: 0.10
Nodes (24): boundValue(), FileState, firstLine(), normalizeHarnessEvent(), normalizeOpenCodeEvent(), num(), recordLabel(), REPLAY_NORMALIZERS (+16 more)

### Community 48 - "ref_bun_test"
Cohesion: 0.05
Nodes (57): ink, react, App(), ErrandWizard(), ErrandWizardStep, STEPS, useScreenInput(), FakeTaskWizard() (+49 more)

### Community 49 - "ADR 0001: OTP-style supervision for the wombo-combo daemon"
Cohesion: 0.13
Nodes (10): ADR 0001: OTP-style supervision for the wombo-combo daemon, Consequences, Contradictions with existing docs, Decision, Decision in one line, Options considered, Recovery map: today's ad hoc failure handling vs. OTP supervision, Vocabulary (+2 more)

### Community 50 - "comments.ts"
Cohesion: 0.07
Nodes (48): TaskBrowserViewProps, addComment(), AddCommentInput, assertSafeId(), Comment, COMMENTS_DIR, commentsDir(), compareComments() (+40 more)

### Community 51 - "saveTaskToStore"
Cohesion: 0.06
Nodes (54): PostMergeConfig, createDaemonAgentState(), setupMergeDriver(), saveTaskToStore(), createBlankTask(), feature, dirs, Env (+46 more)

### Community 52 - "dashboard-realtime.test.tsx"
Cohesion: 0.10
Nodes (10): App, cleanup, eventually(), FakeDaemonClient, makeConfig(), mount(), openDashboard(), setTermSize() (+2 more)

### Community 53 - "replay-viewer.tsx"
Cohesion: 0.14
Nodes (33): entryColor(), fit(), REPLAY_TICK_MS, ReplayViewer(), ReplayViewerProps, ReplayViewerView(), ReplayViewerViewProps, classifyDiffLine() (+25 more)

### Community 54 - "msg"
Cohesion: 0.12
Nodes (60): cmdCommentAdd(), cmdCommentLink(), cmdCommentList(), cmdCommentShow(), commentsForShow(), fmtWhen(), parseRefOrFail(), printComment() (+52 more)

### Community 55 - "quest.md"
Cohesion: 0.06
Nodes (30): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+22 more)

### Community 56 - "commands/upgrade.ts"
Cohesion: 0.19
Nodes (16): channelLabel(), ChannelResult, checkGithubLatest(), checkNpmLatest(), cmdUpgrade(), compareSemver(), confirm(), detectInstallSource() (+8 more)

### Community 57 - "prompt.ts"
Cohesion: 0.18
Nodes (14): formatHunksForLLM(), portlessUrl(), capComments(), formatCommentList(), formatCommentsSection(), formatSubtask(), formatTestBaselineSection(), generateConflictResolutionPrompt() (+6 more)

### Community 58 - "TextBuffer"
Cohesion: 0.14
Nodes (3): lineColToPos(), posToLineCol(), TextBuffer

### Community 59 - "commands/tasks.md"
Cohesion: 0.06
Nodes (32): Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Arguments, Flags (+24 more)

### Community 60 - "permission"
Cohesion: 0.11
Nodes (17): permission, bash, codesearch, edit, external_directory, glob, grep, list (+9 more)

### Community 61 - "run-task-browser.tsx"
Cohesion: 0.07
Nodes (40): ANALYTICS_REFRESH_MS, analyticsScopeFilter(), CONCURRENCY_LEVELS, PRIORITIES, runTaskBrowserInk(), RunTaskBrowserOptions, SORT_FIELDS, TaskBrowserApp() (+32 more)

### Community 62 - "dashboard-provider.test.tsx"
Cohesion: 0.10
Nodes (10): ConnectionState, useDashboardMetrics(), DashboardDaemonClient, FakeClient, FakeTimers, Harness, mount(), streams() (+2 more)

### Community 63 - "lib/launcher.ts"
Cohesion: 0.10
Nodes (34): 7. Verify, 1. Are agents spawned with `detached: true` and `unref()`?, ResolvedRoute, inlineAgentDefinition(), PROMPT_ARG_MAX, spawnHarness(), SpawnTarget, stripFrontmatter() (+26 more)

### Community 64 - "quest-plan-all.ts"
Cohesion: 0.08
Nodes (41): handlePlanAllFlow(), PlanAllFlowDeps, reviewable(), PlanAllView(), PlanAllViewProps, RowLine(), STATE_COLOR, stats() (+33 more)

### Community 65 - "wishlist-store.ts"
Cohesion: 0.11
Nodes (35): yaml, HookResult, TestComponent(), useWishlistStore(), UseWishlistStoreOptions, UseWishlistStoreResult, formatDate(), truncateText() (+27 more)

### Community 66 - "AGENTS.md — Instructions for AI agents working on wombo-combo"
Cohesion: 0.09
Nodes (22): 1. Always use `bun dev`, never the global binary, 2. Never publish manually — use the release workflow, 3. Keep bun.lock committed, 4. Commit project artifacts, ignore runtime artifacts, 5. Never silently work around bugs, 6. Never author or attribute anything as Claude Code, Claude or any other AI, Agent skills, AGENTS.md — Instructions for AI agents working on wombo-combo (+14 more)

### Community 67 - "run-daemon-monitor.tsx"
Cohesion: 0.05
Nodes (68): ChromeLayout(), DashboardScreen(), DashboardStore, DashboardStoreContext, EscMenuProvider(), createI18n(), EN_STRINGS, getLocaleT() (+60 more)

### Community 68 - "analytics.ts"
Cohesion: 0.08
Nodes (29): validateUsageOptions(), ANALYTICS_DIR, ANALYTICS_MEASUREMENT_PHASES, ANALYTICS_MERGE_OUTCOMES, ANALYTICS_OUTCOMES, ANALYTICS_SCHEMA_VERSION, ANALYTICS_USAGE_COVERAGES, analyticsDir() (+21 more)

### Community 69 - "ProcessMonitor"
Cohesion: 0.07
Nodes (25): 10. Proposed TypeScript shape, 11. Open questions for the ADR, 3. Child spec, 5. Restart intensity, period, and escalation, 6. Restart types, 7. Shutdown semantics, 8. Links versus monitors, 9. Limits of the model in single-threaded JS (+17 more)

### Community 70 - "merge-driver.ts"
Cohesion: 0.20
Nodes (18): ABSENT, Conflict, DEFAULT_DRIVER_COMMAND, eq(), GITATTRIBUTES_LINES, isObj(), merge3(), MERGE_DRIVER_NAME (+10 more)

### Community 71 - "i18n-keys.test.ts"
Cohesion: 0.23
Nodes (12): baseKey(), collectUsedKeys(), describeResource(), domainLiteral(), EN_DESC, isSourceFile(), LOCALES_DIR, OTHER_LOCALES (+4 more)

### Community 73 - "commands/merge.ts"
Cohesion: 0.09
Nodes (37): agentsById(), branchExists(), chainPredecessors(), cmdMerge(), defaultIsDaemonAlive(), evidenceFor(), git(), gitOk() (+29 more)

### Community 75 - "templates.ts"
Cohesion: 0.15
Nodes (18): Behavior, Fake Agent, Usage, AGENT_TEMPLATE_PATH, applyHitlAwareness(), applyPlaceholders(), buildTddBlock(), ensureAgentDefinition() (+10 more)

### Community 76 - "agents/generalist-agent.md"
Cohesion: 0.14
Nodes (13): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Server Testing (portless), Task Structure, TDD Rules, Test-Driven Development (TDD) (+5 more)

### Community 77 - "package.json"
Cohesion: 0.05
Nodes (42): author, bin, woco, bugs, url, dependencies, citty, i18next (+34 more)

### Community 78 - "docs/package.json"
Cohesion: 0.11
Nodes (15): dependencies, astro, @astrojs/starlight, description, name, private, scripts, build (+7 more)

### Community 79 - "config.md"
Cohesion: 0.11
Nodes (18): `agent`, `agentRegistry`, `backup`, `browser`, `build`, `comments`, `defaults`, `git` (+10 more)

### Community 80 - "t"
Cohesion: 0.09
Nodes (46): startCommand, statusCommand, stopCommand, addCommand, deleteCommand, listCommand, moveCommand, cmdLogs() (+38 more)

### Community 81 - "commands/status.ts"
Cohesion: 0.20
Nodes (17): agentToJson(), buildStatusJson(), cmdStatus(), elapsedMs(), formatElapsed(), loadSessionSnapshot(), readPersistedSnapshot(), colorize() (+9 more)

### Community 82 - "test-detection.ts"
Cohesion: 0.23
Nodes (16): DEFAULT_TEST_DETECTION_CONFIG, detectTests(), DiffFile, DiffStatus, filterSourceFiles(), findTestFiles(), getChangedFiles(), isBarrelFile() (+8 more)

### Community 83 - "Triage"
Cohesion: 0.06
Nodes (29): Bad agent brief, Behavioral, not procedural, Complete acceptance criteria, Durability over precision, Examples, Explicit scope boundaries, Good agent brief (bug), Good agent brief (enhancement) (+21 more)

### Community 84 - "commands/completion.ts"
Cohesion: 0.19
Nodes (28): aliasHint(), allCommandNames(), bashScript(), cmdCompletion(), cmdShortName(), collectEnumFlags(), walk(), collectFreeFormFlags() (+20 more)

### Community 85 - "tdd-baseline-integration.test.ts"
Cohesion: 0.16
Nodes (11): captureMain(), Case, checkoutNewBranch(), commit(), git(), MAIN_SUITE, makeRepo(), Mode (+3 more)

### Community 86 - "monitor.ts"
Cohesion: 0.08
Nodes (22): Normalizer, extractActivity(), formatEventForLog(), MonitoredProcess, OpenCodeEvent, ParsedOutput, parseEvents(), shortCmd() (+14 more)

### Community 87 - "settings-screen.tsx"
Cohesion: 0.06
Nodes (30): TFunction, APPEARANCE_FIELD_IDS, FieldDef, FieldId, FIELDS, GENERAL_FIELD_IDS, LOCALE_OPTIONS, MODEL_FIELD_WEIGHT (+22 more)

### Community 88 - "replay-browser.test.tsx"
Cohesion: 0.23
Nodes (7): setStdoutSize(), Harness, mount(), h, seedTask(), wait(), waitFor()

### Community 89 - "wishlist.md"
Cohesion: 0.14
Nodes (13): Arguments, Arguments, Arguments, Flags, Global flags, Global flags, Global flags, Global flags (+5 more)

### Community 90 - "chrome.tsx"
Cohesion: 0.15
Nodes (18): ChromeBottomBar(), ChromeBottomBarProps, ChromeHideQuitContext, ChromeLayoutProps, ChromeTitleContext, ChromeTopBar(), ChromeTopBarProps, DaemonStats (+10 more)

### Community 91 - ".github/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 92 - ".opencode/skills/openspec-explore/SKILL.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 93 - "daemon-test-baseline.test.ts"
Cohesion: 0.16
Nodes (19): addWorktree(), AgentCall, agentCalls(), Ctx, FAILING_TEST(), git(), launchWithQuestBranch(), mainSha() (+11 more)

### Community 94 - "post-merge.ts"
Cohesion: 0.09
Nodes (32): appendChangelogEntry(), assertValidOperationId(), atomicWrite(), CHANGELOG_FILE, ChangelogEntryInput, ChangelogTask, ChangelogWriteResult, entryDate() (+24 more)

### Community 95 - "saveAllTasksToStore"
Cohesion: 0.17
Nodes (13): Context, Decision 2: Batch task writes in `handleToggleAll`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Capabilities, Impact (+5 more)

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
Cohesion: 0.06
Nodes (21): SchedulerDeps, DaemonState, setup(), Ctx, git(), launchAndCapturePrompt(), makeTask(), recordedPrompts() (+13 more)

### Community 101 - "analytics-git.ts"
Cohesion: 0.24
Nodes (11): git(), GitResult, HeadCapture, isExcludedPath(), LineChangeMeasurement, measureLineChanges(), NumstatEntry, parseNumstatZ() (+3 more)

### Community 102 - ".load"
Cohesion: 0.07
Nodes (25): Files Changed, Minimal, surgical fix, Problem Trace, Solution, State loading sequence (daemon boot), The TUI sequence that triggers the visible symptom, What does NOT change, Why `concurrencyPinned` doesn't protect persisted state (+17 more)

### Community 103 - "github-sync.md"
Cohesion: 0.14
Nodes (13): Authentication, Checking the mirror, Commands, Concurrency, Configuration, Conflicts, Known limits, Labels (+5 more)

### Community 104 - "format-converter.ts"
Cohesion: 0.27
Nodes (11): AgencyAgentFrontmatter, AgencyAgentSections, cleanEmojiHeaders(), convertAgencyToWoco(), extractSections(), isAgencyAgentFormat(), joinContent(), matchesSection() (+3 more)

### Community 105 - "prompt-compress.ts"
Cohesion: 0.26
Nodes (11): abbreviateConstraintLine(), collapseConsecutiveBlanks(), compressConstraints(), CompressPromptOptions, compressPromptText(), compressSource(), CompressSourceOptions, estimateTokens() (+3 more)

### Community 106 - "commands/retro.ts"
Cohesion: 0.16
Nodes (19): cmdRetro(), CmdRetroOptions, groupByCategory(), parseSince(), renderBody(), renderRetroMarkdown(), renderRetroText(), RetroOptions (+11 more)

### Community 107 - "harness/index.ts"
Cohesion: 0.10
Nodes (35): Adding a harness, claudeCodeHarness, codexHarness, build(), customHarness, expand(), errorEvent(), normalizeToolInput() (+27 more)

### Community 108 - "supervision/index.ts"
Cohesion: 0.20
Nodes (16): Shutdown ordering, Clock, systemClock, ShutdownTimeoutError, stopChild(), stopChildrenInOrder(), StopItem, StopOptions (+8 more)

### Community 109 - "Scheduler"
Cohesion: 0.07
Nodes (33): The scheduler is the root supervisor's start policy, Context, D1: Pass `initialMaxConcurrent` in `SchedulerConfig`, not as a constructor argument, D2: Mark `concurrencyPinned = true` when `initialMaxConcurrent` is supplied, D3: Read `state.getMaxConcurrent()` in `handleStart()` before destroying the old Scheduler, Decisions, Goals / Non-Goals, Migration Plan (+25 more)

### Community 110 - "maxConcurrent"
Cohesion: 0.05
Nodes (61): MODIFIED Requirements, Requirement: Concurrency value is pinned after first set, Scenario: Config value applied on first start, Scenario: Explicit override preserved across start re-trigger, Scenario: Explicit start payload takes precedence, Scenario: Scheduler reconstruction carries forward pinned value, Scenario: Watcher re-triggers start after idle — concurrency preserved, ADDED Requirements (+53 more)

### Community 111 - "daemon.md"
Cohesion: 0.18
Nodes (10): daemon start, daemon status, daemon stop, Flags, Flags, Flags, Global flags, Global flags (+2 more)

### Community 112 - "gen-command-docs.ts"
Cohesion: 0.31
Nodes (15): code(), commandBody(), commandSlug(), escapeCell(), flagTable(), formatDefault(), generateCommandDocs(), GENERATED_BANNER (+7 more)

### Community 114 - "output"
Cohesion: 0.07
Nodes (59): ensureInitialized(), labelsCommand, outputArg, pullCommand, pushCommand, runCommand, statusCommand, watchCommand (+51 more)

### Community 115 - "AgentStatus"
Cohesion: 0.31
Nodes (9): AgentStatus, TrackedAgent, AgentHistoryRecord, computeDuration(), daemonSessionToHistory(), ensureHistoryDir(), exportDaemonHistory(), HistoryAgentSource (+1 more)

### Community 116 - "graph.ts"
Cohesion: 0.24
Nodes (15): buildMermaidSource(), checkSubtaskDeps(), cmdTasksGraph(), collectAllIds(), collectSubtaskEdges(), collectSubtaskIds(), collectSubtaskItems(), detectCycles() (+7 more)

### Community 117 - "supervision/supervisor.ts"
Cohesion: 0.15
Nodes (17): Strategies, computeBackoff(), DEFAULT_BACKOFF, DEFAULT_BACKOFF_RESET_MS, shouldResetAttempt(), filterRestartable(), planRestart(), RestartPlan (+9 more)

### Community 118 - "templates/generalist-agent.md"
Cohesion: 0.22
Nodes (8): Commit Guidelines, Constraints, Error Recovery, Operational Rules, Task Structure, What You Must Never Do, Workflow, Your Environment

### Community 119 - "templates/genesis-planner-agent.md"
Cohesion: 0.22
Nodes (8): Field Guidelines, Output Format, Planning Process, Quality Checklist, Quest Decomposition Rules, What You Must Never Do, Your Environment, Your Mission

### Community 120 - "commands/team.md"
Cohesion: 0.11
Nodes (18): Arguments, Arguments, Arguments, Flags, Flags, Flags, Global flags, Global flags (+10 more)

### Community 121 - "Supervisor"
Cohesion: 0.26
Nodes (4): ChildRecord, makeRecord(), Supervisor, crash()

### Community 122 - "routing.ts"
Cohesion: 0.13
Nodes (23): resolveAgentBin(), AvailabilityProbes, fallbackChain(), LEGACY_PROFILE, legacyModel(), legacyRoute(), MissingEnvError, pickProfileName() (+15 more)

### Community 123 - "supervisor-strategies.test.ts"
Cohesion: 0.16
Nodes (15): Files, Notes, Observed behaviour, OTP supervision spike (throwaway), Run, Supervisor changes, BackoffOptions, RestartStrategy (+7 more)

### Community 124 - "tdd-baseline-pipeline.test.ts"
Cohesion: 0.29
Nodes (9): createTestBaseline(), applyFeatureChanges(), captureBaseline(), git(), makeMainRepo(), tmpDirs, writeRepoFiles(), captureBaseline() (+1 more)

### Community 125 - "analytics-integration.test.ts"
Cohesion: 0.17
Nodes (10): commitFile(), FixtureRunner, git(), makeTask(), REPO_ROOT, seedFromRunner(), session(), SRC_ENTRY (+2 more)

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

### Community 131 - "github-client.ts"
Cohesion: 0.04
Nodes (55): apiUrlFor(), createGitHubClient(), json(), paginate(), rateLimitWaitMs(), request(), CreateGitHubClientOptions, CreateIssueInput (+47 more)

### Community 132 - "Process"
Cohesion: 0.07
Nodes (25): 1. State the question, 2. Isolate the logic in a portable module, 3. Build the shareable HTML file, 4. Hand it over, 5. Capture the answer and the prototype, Anti-patterns, Logic Prototype, Process (+17 more)

### Community 133 - "pull.ts"
Cohesion: 0.06
Nodes (79): defaultLoadTaskQuests(), CommentRole, QuestStatus, remoteQuestView(), remoteSyncHash(), remoteTaskView, TRIAGE_LABELS, triageLabelsFor() (+71 more)

### Community 135 - "c"
Cohesion: 0.25
Nodes (7): Flags, Global flags, Arguments, Flags, Global flags, quest create, c()

### Community 136 - "esc-menu.tsx"
Cohesion: 0.07
Nodes (39): ErrandWizardProps, defaultEscMenuState, EscMenu(), EscMenuContext, EscMenuItem(), EscMenuItemProps, EscMenuProps, EscMenuProviderProps (+31 more)

### Community 137 - "DashboardMetricsProvider"
Cohesion: 0.10
Nodes (16): DashboardMetricsProvider(), TimerApi, addInto(), buildTaskQuestMap(), cloneTotals(), DashboardUsageReader, emptyTotals(), mergeInto() (+8 more)

### Community 138 - "test-baseline-capture.ts"
Cohesion: 0.13
Nodes (17): BaselineCaptureError, BaselineCaptureErrorCode, ensureInner(), ensureQuestTestBaseline(), EnsureQuestTestBaselineOptions, EnsureQuestTestBaselineResult, git(), inFlight (+9 more)

### Community 139 - "scout.ts"
Cohesion: 0.14
Nodes (18): buildKeywords(), buildScoutIndex(), shouldIgnoreDir(), walkDir(), DEFAULT_IGNORE_DIRS, extractSymbols(), INDEXABLE_EXTENSIONS, queryScoutIndex() (+10 more)

### Community 140 - "genesis.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 141 - "validate.ts"
Cohesion: 0.53
Nodes (8): assertValid(), fail(), ok(), validateBranchName(), validateDuration(), validateEnum(), validateId(), validateText()

### Community 142 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 143 - "README.md"
Cohesion: 0.08
Nodes (19): Forbidden, everywhere, How it is enforced, Limits, No AI attribution, Configuration, Custom command template, Fallback chains, Profile fields (+11 more)

### Community 144 - "run-preflight.tsx"
Cohesion: 0.42
Nodes (8): AgentRegistryMode, inkPreflightConfirm(), InkPreflightResult, PreflightResult, PreflightRow, PreflightView(), PreflightViewProps, AgentResolution

### Community 145 - "merge-resolver-agent.md"
Cohesion: 0.29
Nodes (6): Error Recovery, Resolution Strategy, Rules, What You Must Never Do, Workflow, Your Environment

### Community 146 - "During the session"
Cohesion: 0.09
Nodes (19): ADR Format, Numbering, Optional sections, Template, What qualifies, When to offer an ADR, GLOSSARY.md Format, Rules (+11 more)

### Community 147 - "overview.md"
Cohesion: 0.29
Nodes (6): Command registry, Daemon, Layers, Runtime files, The pipeline, This documentation site

### Community 148 - "TypedEmitter"
Cohesion: 0.18
Nodes (7): Entry, Listener, ListenerErrorHandler, SupervisorEmitter, TypedEmitter, SupervisorEvents, Ev

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
Cohesion: 0.06
Nodes (34): 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12, 2026-10-12 (+26 more)

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

### Community 158 - "FakeClock"
Cohesion: 0.19
Nodes (3): TimerHandle, FakeClock, Timer

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

### Community 163 - "ink/index.ts"
Cohesion: 0.06
Nodes (50): AppProps, ConfirmDialog(), ConfirmDialogProps, InitApp(), InitAppProps, InitState, installAgentTemplate(), renderInitApp() (+42 more)

### Community 164 - "check-attribution.ts"
Cohesion: 0.39
Nodes (6): ALLOWLIST, Finding, git(), scanCommits(), scanText(), scanTrackedFiles()

### Community 165 - "ChildSpec"
Cohesion: 0.28
Nodes (4): ChildSpec, RestartType, FakeChild, setup()

### Community 166 - "hitl-ask.ts"
Cohesion: 0.29
Nodes (7): answerFile, args, pollForAnswer(), question, questionFile, sleep(), startTime

### Community 167 - "architecture/supervision.md"
Cohesion: 0.18
Nodes (10): Backoff, Children, Events, Example, Intensity and escalation, Purpose, Restart types, Time and randomness (+2 more)

### Community 168 - "CONTEXT.md — For AI agents using wombo as a tool"
Cohesion: 0.22
Nodes (8): Configuration, CONTEXT.md — For AI agents using wombo as a tool, How you were launched, Input validation, Querying wombo for state, Rules for agents, Task file schema, What is wombo?

### Community 169 - "analytics-overlay.tsx"
Cohesion: 0.10
Nodes (38): ANALYTICS_GROUPINGS, AnalyticsOverlayView(), AnalyticsOverlayViewProps, coverageWarning(), DEFAULT_MAX_VISIBLE_ROWS, formatAnalyticsDuration(), formatAnalyticsRate(), GROUPING_LABEL_KEYS (+30 more)

### Community 171 - "commands/triage.md"
Cohesion: 0.13
Nodes (14): Arguments, Arguments, Arguments, Flags, Flags, Global flags, Global flags, Global flags (+6 more)

### Community 173 - "claims.ts"
Cohesion: 0.22
Nodes (19): normalizeTeamConfig(), assertSafeId(), Claim, ClaimInfo, ClaimOptions, claimPath(), ClaimResult, CLAIMS_DIR (+11 more)

### Community 174 - "loadConfig"
Cohesion: 0.04
Nodes (102): citty, abortCommand, cleanupCommand, addCommand, commentCommand, ensureInitialized(), linkCommand, listCommand (+94 more)

### Community 175 - "Steps"
Cohesion: 0.17
Nodes (11): 1. Detect package manager, 2. Install dependencies, 3. Initialize Husky, 4. Create `.husky/pre-commit`, 5. Create `.lintstagedrc`, 6. Create `.prettierrc` (if missing), 8. Commit, Notes (+3 more)

### Community 177 - "analytics-lifecycle.test.ts"
Cohesion: 0.25
Nodes (5): makeConfig(), makeTask(), NoLaunchRunner, setup(), submit()

### Community 180 - "fake-agent-runner.ts"
Cohesion: 0.13
Nodes (29): AttemptStore, FAULT_STAGES, FaultAction, faultAt(), FaultSpec, FaultStage, faultStateDir(), fileAttemptStore() (+21 more)

### Community 184 - "DaemonAgentState"
Cohesion: 0.42
Nodes (9): DaemonAgentState, SchedulerState, QuestionPopupViewProps, DaemonAdapterProps, DaemonMonitorScreenProps, DaemonStore, HitlQuestion, ActivityEntry (+1 more)

### Community 187 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Requirement: Concurrency limit is enforced through the full agent lifecycle, Requirement: Downstream task unblocking is unaffected by this change, Requirement: Retry after merge failure is picked up by the scheduler, Requirement: Scheduler remains active while verified agents await merge, Scenario: allComplete does not return true with verified agents present, Scenario: Downstream task proceeds when dependency reaches verified, Scenario: Merge failure retry is not stranded (+3 more)

### Community 191 - "registry-parity.test.ts"
Cohesion: 0.19
Nodes (12): BridgeCommandMeta, camelToKebab(), cittyArgToFlagDef(), cittyArgToPositionalDef(), cittyCommandToCommandDef(), FlagOverride, GLOBAL_FLAG_NAMES, RegistryEntry (+4 more)

### Community 192 - "Test-Driven Development"
Cohesion: 0.15
Nodes (10): Designing for Mockability, When to Mock, Anti-patterns, Rules of the loop, Seams: where tests go, Test-Driven Development, What a good test is, Bad Tests (+2 more)

### Community 193 - "child-state.ts"
Cohesion: 0.25
Nodes (9): Snapshot, DEFAULT_SHUTDOWN_TIMEOUT_MS, serializeError(), serializeEscalation(), serializeExit(), snapshotChild(), ChildSnapshot, ChildState (+1 more)

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
Cohesion: 0.47
Nodes (8): ensureProxyRunning(), isPortlessAvailable(), isProxyRunning(), portlessEnv(), portlessRunCommand(), portlessStatus(), resolvePortlessBin(), wrapWithPortless()

### Community 199 - "Steps"
Cohesion: 0.11
Nodes (16): Files, Implementation vs Review, Reference, Steps, 1. Detect the environment, 2. Install dependency-cruiser, 3. Write the config, 4. Wire it into the checks (+8 more)

### Community 200 - "sync.md"
Cohesion: 0.11
Nodes (18): Flags, Flags, Flags, Flags, Flags, Global flags, Global flags, Global flags (+10 more)

### Community 202 - "gh"
Cohesion: 0.12
Nodes (17): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Rules, Mirroring to GitHub (+9 more)

### Community 203 - "wayfinder/SKILL.md"
Cohesion: 0.17
Nodes (11): Chart the map, Fog of war, Invocation, Out of scope, Plan, don't do, Refer by name, The Map, The map body (+3 more)

### Community 204 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 206 - "comments.md"
Cohesion: 0.25
Nodes (7): Author resolution, CLI, How comments reach agents, In the TUI, Merge-friendliness, Roles, Storage layout

### Community 207 - "done"
Cohesion: 0.07
Nodes (22): Claim, progress, resolve, Comments, Issue tracker: woco tasks (primary) + GitHub Issues (lockstep mirror), Pull requests as a triage surface, The mirror is automated, Vocabulary, Wayfinding operations (used by `/wayfinder`), When a skill says "fetch the relevant ticket" (+14 more)

### Community 208 - "Process"
Cohesion: 0.25
Nodes (7): 1. Pin the fixed point, 2. Identify the spec source, 3. Identify the standards sources, 4. Spawn both sub-agents in parallel, 5. Aggregate, Process, Why two axes

### Community 209 - "Migrate to Shoehorn"
Cohesion: 0.20
Nodes (9): `as Type` → `fromPartial()`, `as unknown as Type` → `fromAny()`, Install, Large objects with few needed properties, Migrate to Shoehorn, Migration patterns, When to use each, Why shoehorn? (+1 more)

### Community 210 - "push.ts"
Cohesion: 0.06
Nodes (48): AI_ATTRIBUTION_LINE_PATTERNS, containsAiAttribution(), lineHasAiAttribution(), stripAiAttribution(), attributionBreakerPath(), AttributionTrip, AttributionTripped, clearAttributionTrip() (+40 more)

### Community 211 - "Steps"
Cohesion: 0.22
Nodes (8): 1. Ask scope, 2. Copy the hook script, 3. Add hook to settings, 4. Ask about customization, 5. Verify, Setup Git Guardrails, Steps, What Gets Blocked

### Community 212 - "Scaffold Exercises"
Cohesion: 0.22
Nodes (8): Directory naming, Example: stubbing from a plan, Exercise variants, Lint rules summary, Moving/renaming exercises, Required files, Scaffold Exercises, Workflow

### Community 213 - "to-spec/SKILL.md"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Process, Solution, Testing Decisions, User Stories

### Community 214 - "IntensityTracker"
Cohesion: 0.27
Nodes (3): DEFAULT_INTENSITY, IntensityTracker, IntensityOptions

### Community 215 - "Process"
Cohesion: 0.29
Nodes (6): 1. Scope the procedure, 2. Map each stage's journey, 3. Author the wizard, 4. Verify and hand off, Process, Wizard

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

### Community 224 - "Staying in TypeScript/Bun versus the Elixir/OTP daemon (closed PR #3)"
Cohesion: 0.29
Nodes (7): 1. What PR #3 proposed, 2. Migration cost, 3. Risk, 5. What OTP gives versus what wombo needs, 6. Recommendation, How this could be wrong, Staying in TypeScript/Bun versus the Elixir/OTP daemon (closed PR #3)

### Community 225 - "loop-me/SKILL.md"
Cohesion: 0.40
Nodes (4): Definition of done, The loop lens, The workspace, Vocabulary

### Community 226 - ".submitTask"
Cohesion: 0.09
Nodes (18): Decision 1: Skip stagger for fake agents at the queue-processing level, ADDED Requirements, Requirement: Launch stagger applies only to real-agent launches, Scenario: Default behavior preserves existing stagger, Scenario: skipStagger flag removes the wait, Scenario: submitTask does not set skipStagger for real agents, Scenario: submitTask sets skipStagger for fake agents, 1. AgentRunner — Per-entry stagger flag (+10 more)

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

### Community 232 - "Supervisor"
Cohesion: 0.10
Nodes (26): Spike evidence, agents(), crashIsolation(), describeEvent(), escalation(), Log, restartTypes(), restForOne() (+18 more)

### Community 233 - "guides/retro.md"
Cohesion: 0.25
Nodes (7): Acting on a retro, Categories, Example, Moving a rule out of AGENTS.md, Saving retros, Severity thresholds, What is collected

### Community 234 - "review-gate.md"
Cohesion: 0.25
Nodes (7): Configuration, Findings as task comments, Limits, Retry rounds, Routing: operation `review`, What is reviewed, Writing CODING_STANDARDS.md

### Community 248 - "Issue tracker: GitLab"
Cohesion: 0.33
Nodes (6): Conventions, Issue tracker: GitLab, Merge requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 249 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 250 - "Local changes to vendored skills"
Cohesion: 0.50
Nodes (3): `code-review` renamed to `code-review-spec`, Local changes to vendored skills, `triage`: no AI disclaimer

### Community 251 - "guides/triage.md"
Cohesion: 0.33
Nodes (5): Commands, GitHub labels, States, Transitions, With sync and comments

### Community 252 - "Requirement: Fake-agent tasks bypass inter-launch stagger"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Fake-agent tasks bypass inter-launch stagger, Scenario: All fake-agent tasks start concurrently, Scenario: Mixed queue preserves stagger only for real agents, Scenario: Real-agent launches are unaffected

### Community 253 - "2026-03-21-fix-maxconcurrent-reset-on-rebuild/tasks.md"
Cohesion: 0.40
Nodes (4): 1. Extend SchedulerConfig, 2. Update handleStart in daemon.ts, 3. Tests, 4. Verification

### Community 254 - "2026-03-21-fix-scheduler-oversubscription/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 255 - "analytics-measurements.test.ts"
Cohesion: 0.23
Nodes (6): commitFile(), git(), make(), makeTask(), NoLaunchRunner, submit()

### Community 256 - "supervision.md"
Cohesion: 0.50
Nodes (3): Further reading, OTP terms in daemon terms, Outcome

### Community 257 - "resume.md"
Cohesion: 0.50
Nodes (3): Flags, Global flags, r()

### Community 258 - "retry.md"
Cohesion: 0.50
Nodes (3): Arguments, Flags, Global flags

### Community 259 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 260 - "2026-03-21-fix-scheduler-launch-and-concurrency/tasks.md"
Cohesion: 0.50
Nodes (3): 2. Infinite-Concurrency Burst — Tick Loop, 3. Unit Tests, 4. Verification

### Community 268 - "quest-planner.ts"
Cohesion: 0.07
Nodes (46): QuestSummary, QuestWizardProps, extractTextFromJsonEvents(), generateErrandPrompt(), runErrandPlanner(), canonicalizeOutput(), launchPlanner(), createPlannerTelemetry() (+38 more)

### Community 278 - "sync-roundtrip.test.ts"
Cohesion: 0.10
Nodes (29): SYNC_MIN_INTERVAL_SECONDS, chain, CycleReport, emptyPush(), runExclusive(), runSyncCycle(), acquire(), held (+21 more)

### Community 280 - "replay-recorder.ts"
Cohesion: 0.12
Nodes (19): defaultCaptureReviewDiff(), errMsg(), ReplayRecorder, ReplayRecorderOptions, Tracked, EXCLUDED_PATH_PREFIXES, DEFAULT_KEEP_PER_TASK, captureWorktreeDiff() (+11 more)

### Community 281 - "genesis-planner.ts"
Cohesion: 0.16
Nodes (18): detectCycles(), dfs(), extractGenesisYaml(), extractTextFromJsonEvents(), generateDirectoryTree(), generateGenesisPrompt(), GenesisOutput, parseGenesisYaml() (+10 more)

### Community 286 - "gen-config-docs.ts"
Cohesion: 0.29
Nodes (10): code(), ConfigRow, escapeCell(), flattenSchema(), formatType(), GENERATED_BANNER, renderConfigPage(), row() (+2 more)

### Community 288 - ".allComplete"
Cohesion: 0.10
Nodes (17): Context, Context, Decision: Add `verified` to `ACTIVE_STATUSES`, remove from `TERMINAL_STATUSES`, Decisions, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Requirement: Concurrency limit is enforced through the full agent lifecycle (+9 more)

## Knowledge Gaps
- **4 isolated node(s):** `astro/tsconfigs/strict`, `@types/bun`, `@types/react`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2124 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `WomboConfig`, `agent-runner.ts`, `esc-menu.tsx`, `task-store.ts`, `lib/quest.ts`, `config.ts`, `validate.ts`, `README.md`, `useI18n`, `toon.ts`, `run-preflight.tsx`, `verifier.ts`, `commands/tui.ts`, `lib/i18n.ts`, `worktree.ts`, `dashboard.tsx`, `schema.ts`, `agent-registry.ts`, `lib/tasks.ts`, `commands/stats.ts`, `analytics-overlay.tsx`, `loadConfig`, `ref_bun_test`, `msg`, `commands/upgrade.ts`, `commands/tasks.md`, `quest-plan-all.ts`, `run-daemon-monitor.tsx`, `portless.ts`, `commands/merge.ts`, `templates.ts`, `done`, `commands/status.ts`, `commands/completion.ts`, `commands/retro.ts`, `output`, `graph.ts`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `t()` (e.g. with `Architecture` and `Writing translatable code`) actually correct?**
  _`t()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `@types/bun`, `@types/react` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Explore mode guidelines and usage rules` be split into smaller, more focused modules?**
  _Cohesion score 0.020202020202020204 - nodes in this community are weakly interconnected._
- **Why does `AgentRunner` connect `AgentRunner` to `WomboConfig`, `agent-runner.ts`, `protocol.ts`, `review.ts`, `NoLaunchRunner`, `Summary table`, `overview.md`, `replay-recorder.ts`, `ref_node_path`, `lib/tasks.ts`, `github-pr.ts`, `AnalyticsTracker`, `Daemon`, `claims.ts`, `loadConfig`, `ADR 0001: OTP-style supervision for the wombo-combo daemon`, `analytics-lifecycle.test.ts`, `saveTaskToStore`, `ProcessMonitor`, `commands/merge.ts`, `daemon-test-baseline.test.ts`, `post-merge.ts`, `saveAllTasksToStore`, `.submitTask`, `DaemonState`, `Scheduler`, `Requirement: Fake-agent tasks bypass inter-launch stagger`, `Requirement: Fake-agent tasks bypass inter-launch stagger`, `analytics-integration.test.ts`, `analytics-measurements.test.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `AgentRunner` be split into smaller, more focused modules?**
  _Cohesion score 0.12580943570767808 - nodes in this community are weakly interconnected._
- **Why does `WomboConfig` connect `WomboConfig` to `AgentRunner`, `browser.ts`, `onboarding/index.ts`, `agent-runner.ts`, `protocol.ts`, `pull.ts`, `esc-menu.tsx`, `task-store.ts`, `lib/quest.ts`, `project-store.ts`, `config.ts`, `quest-planner.ts`, `eval-score.ts`, `test-baseline-capture.ts`, `run-preflight.tsx`, `toon.ts`, `verifier.ts`, `mapping.ts`, `commands/tui.ts`, `worktree.ts`, `genesis-planner.ts`, `ref_node_path`, `DaemonClient`, `agent-registry.ts`, `lib/tasks.ts`, `agents-routing-screen.tsx`, `commands/stats.ts`, `Daemon`, `claims.ts`, `analytics-lifecycle.test.ts`, `saveTaskToStore`, `msg`, `DaemonAgentState`, `prompt.ts`, `run-task-browser.tsx`, `lib/launcher.ts`, `quest-plan-all.ts`, `run-daemon-monitor.tsx`, `analytics.ts`, `portless.ts`, `commands/merge.ts`, `InkDaemonTUI`, `templates.ts`, `t`, `commands/status.ts`, `push.ts`, `tdd-baseline-integration.test.ts`, `daemon-test-baseline.test.ts`, `post-merge.ts`, `DaemonState`, `harness/index.ts`, `graph.ts`, `routing.ts`, `tdd-baseline-pipeline.test.ts`, `analytics-integration.test.ts`, `analytics-measurements.test.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._