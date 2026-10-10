/**
 * strings/en.ts — English string map for the TUI i18n skeleton.
 *
 * Keys use dot-notation namespacing:
 *   status.*   — agent status display labels
 *   ui.*       — generic UI actions / labels
 *   screen.*   — screen titles
 *   wave.*     — wave monitor labels
 *   menu.*     — ESC-menu items
 *   settings.* — settings screen labels
 *   splash.*   — splash screen copy
 */

export const EN_STRINGS: Record<string, string> = {
  // Agent status labels
  "status.queued": "Queued",
  "status.installing": "Installing",
  "status.running": "Running",
  "status.completed": "Completed",
  "status.verified": "Verified",
  "status.failed": "Failed",
  "status.merged": "Merged",
  "status.retry": "Retrying",
  "status.resolving_conflict": "Resolving conflict",

  // Generic UI actions
  "ui.quit": "Quit",
  "ui.back": "Back",
  "ui.confirm": "Confirm",
  "ui.cancel": "Cancel",
  "ui.yes": "Yes",
  "ui.no": "No",
  "ui.select": "Select",
  "ui.loading": "Loading…",
  "ui.error": "Error",
  "ui.unknown": "Unknown",

  // Screen titles
  "screen.dashboard": "Dashboard",
  "screen.settings": "Settings",
  "screen.taskBrowser": "Task Browser",
  "screen.questPicker": "Quest Picker",
  "screen.waveMonitor": "Wave Monitor",

  // Wave monitor labels
  "wave.agents": "Agents",
  "wave.running": "Running",
  "wave.completed": "Completed",
  "wave.failed": "Failed",
  "wave.elapsed": "Elapsed",
  "wave.noWave": "No active wave",
  "wave.agentCount": "{{count}} agent(s)",

  // Realtime dashboard
  "dashboard.live": "live",
  "dashboard.connecting": "connecting - data may be stale",
  "dashboard.reconnecting": "reconnecting - data may be stale",
  "dashboard.disconnected": "disconnected - data may be stale",
  "dashboard.unavailable": "no daemon - saved usage only",
  "dashboard.running": "Running",
  "dashboard.done": "Done",
  "dashboard.failed": "Failed",
  "dashboard.queued": "Queued",
  "dashboard.retrying": "Retrying",
  "dashboard.tracked": "{{count}} tracked",
  "dashboard.throughput": "Throughput",
  "dashboard.throughputUnit": "completions/min, last {{minutes}}m",
  "dashboard.throughputNow": "now {{n}}/min",
  "dashboard.throughputPeak": "peak {{n}}/min",
  "dashboard.eta": "Est. remaining",
  "dashboard.etaApprox": "~{{time}} (approx., tracked agents only)",
  "dashboard.etaUnknown": "unknown (not enough data)",
  "dashboard.etaPaused": "unknown (scheduler paused)",
  "dashboard.etaNone": "nothing pending",
  "dashboard.etaStale": "unavailable while disconnected",
  "dashboard.etaUnestimated": "{{count}} without estimate",
  "dashboard.tokens": "Quest tokens",
  "dashboard.tokensEmpty": "No token usage recorded yet",
  "dashboard.tokensUnavailable": "No usage file yet",
  "dashboard.unknownQuest": "(unknown quest)",
  "dashboard.more": "+{{count}} more",
  "dashboard.activity": "Recent activity",
  "dashboard.activityEmpty": "No activity yet",
  "dashboard.noAgents": "No agents tracked yet",
  "dashboard.hintBack": "b back",
  "dashboard.hintMenu": "ESC menu",

  // ESC-menu items
  "menu.title": "Menu",
  "menu.returnToApp": "Return to app",
  "menu.settings": "Settings",
  "menu.quit": "Quit wombo",

  // Settings screen
  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.locale": "Language",
  "settings.devMode": "Developer mode",
  "settings.checkForUpdates": "Check for updates on startup",
  "settings.autoInstallUpdates": "Auto-install updates",
  "settings.saved": "Settings saved",

  // Splash screen
  "splash.tagline": "Parallel AI development, orchestrated.",
  "splash.version": "v{{version}}",
  "splash.loading": "Starting up…",
};
