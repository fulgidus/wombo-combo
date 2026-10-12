The supervision library (quests supervisor-core, wave-supervision-tree, agent-process-supervision)
does not exist yet; this quest only observes. src/daemon/supervision-observer.ts is the single
entry point: supervisor code calls observer.record(event). Protocol types live in
src/daemon/protocol.ts; the pure tree reducer and formatter in src/lib/supervision-tree.ts is
shared by the dashboard metrics, the TUI view and the CLI. Dashboard state gets a `supervision`
field through applyDashboardEvent (not through evt:state-snapshot, whose shape must not change).
All user-facing strings go in src/locales/<lng>/{tui,cli}.json. Update COMMAND_REGISTRY when adding
CLI surface. Tasks touching locale files are split by file (tui.json vs cli.json) to avoid conflicts.
