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
