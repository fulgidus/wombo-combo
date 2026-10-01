The current TUI uses Ink 6 and React 19, not neo-blessed. Source imports
are extensionless ESM; verification uses Bun and strict TypeScript.

DashboardScreen already exists, but the unified TuiApp neither registers
it nor supplies live dashboard state: its legacy DashboardStoreContext
currently receives an empty store. The standalone DaemonMonitorShell has
a separate reactive legacy store and its own ScreenRouter.

Keep that legacy contract intact and add a separate dashboard metrics
context/provider. Register the same enhanced screen in both active shells.
Menu navigation uses navRef because chrome/menu wrappers sit outside the
router's navigation context.

DaemonClient exposes typed payload subscriptions, cached snapshots, and
connection-state subscriptions. Subscribers do not receive envelope
timestamps or sequence numbers. Dashboard activity therefore uses receipt
time, while snapshot timestamps can seed known agent history.

Token usage events are cumulative agent input/output totals and do not
carry quest IDs. ProcessMonitor persists per-step UsageRecords to
.wombo-combo/usage.jsonl. Use that file alone for quest token aggregation;
never add cumulative WebSocket totals to persisted usage. Explicit quest
IDs win; legacy null IDs may be resolved through task/archive metadata.

Throughput is successful tracked-agent completions per minute. Counts
follow current agent lifecycle states. ETA is an approximate estimate for
tracked unfinished agents, not a prediction for all unlaunched quest work.

The quest definition declares agent-analytics as an upstream quest
dependency. Respect that external ordering; do not fabricate prerequisite
completion or broaden this quest into a replacement analytics system.

Initial independent work owns separate files. Both shell wiring tasks
depend on shared components but edit different roots. The final integration
task is the only task permitted to fix cross-task integration after both
roots have merged. Preserve pre-existing working-tree changes.
