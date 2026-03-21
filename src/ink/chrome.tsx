/**
 * chrome.tsx — Persistent top and bottom status bars for the Ink TUI.
 *
 * ChromeLayout wraps any screen component with:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ woco  •  Dashboard          ●2 ✓3 ✗1  [connected]   │  ← ChromeTopBar
 *   ├──────────────────────────────────────────────────────┤
 *   │  (screen content)                                    │
 *   ├──────────────────────────────────────────────────────┤
 *   │ ESC menu  q quit  r retry  b build   🔇 🔕 en        │  ← ChromeBottomBar
 *   └──────────────────────────────────────────────────────┘
 *
 * The bars survive screen navigation because ChromeLayout is rendered by
 * the ScreenRouter wrapper, not by individual screens.
 *
 * ChromeTitleContext allows screens to push a custom title into the top bar.
 */

import React, { createContext, useContext, type ReactNode } from "react";
import { Box, Text } from "ink";
import { useTerminalSize } from "./use-terminal-size";

// ---------------------------------------------------------------------------
// Live daemon stats — shown in top-right chrome at all times
// ---------------------------------------------------------------------------

export type SchedulerStatus = "running" | "idle" | "paused" | "draining" | "stopping" | "shutdown";

export interface DaemonStats {
  /** Agents currently in installing/running/resolving_conflict state. */
  running: number;
  /** Max concurrency setting. */
  maxConcurrent: number;
  /** Scheduler status string (running | idle | paused | stopping | …). */
  schedulerStatus: SchedulerStatus;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Counts for the active wave summary displayed in the top bar. */
export interface WaveSummary {
  running: number;
  done: number;
  failed: number;
}

/** A single keybind hint shown in the bottom bar. */
export interface KeybindHint {
  key: string;
  description: string;
}

// ---------------------------------------------------------------------------
// ChromeTitleContext — screen-level title override
// ---------------------------------------------------------------------------

/**
 * Screens can provide a custom title by wrapping content in:
 *   <ChromeTitleContext.Provider value="My Screen">
 *
 * ChromeTopBar reads this to display the screen title.
 */
export const ChromeTitleContext = createContext<string | null>(null);

/**
 * Hook to read the current custom screen title from context.
 * Returns null if no override is set.
 */
export function useChromTitle(): string | null {
  return useContext(ChromeTitleContext);
}

// ---------------------------------------------------------------------------
// ChromeTopBar
// ---------------------------------------------------------------------------

export interface ChromeTopBarProps {
  /** Name of the current screen (fallback if no ChromeTitleContext override). */
  screenName: string;
  /** Whether the daemon WebSocket connection is active. */
  daemonConnected: boolean;
  /** Optional live wave summary. Omit when no wave is running. */
  waveSummary?: WaveSummary;
  /** Live daemon agent/scheduler stats, polled from daemon-state.json. */
  daemonStats?: DaemonStats;
}

const SCHEDULER_STATUS_UI: Record<SchedulerStatus, { color: string, label: string, labelShort: string }> = {
  running: {
    color: "green",
    label: "▶ Running",
    labelShort: "▶",
  },
  idle: {
    color: "gray",
    label: "💤 Idle",
    labelShort: "💤",
  },
  paused: {
    color: "yellow",
    label: "⏸ Paused",
    labelShort: "⏸",

  },
  draining: {
    color: "yellow",
    label: "⏳ Draining",
    labelShort: "⏳",
  },
  stopping: {
    color: "yellow",
    label: "⏹ Stopping",
    labelShort: "⏹",
  },
  shutdown: {
    color: "red",
    label: "💀 Shutdown",
    labelShort: "💀",
  },
};

/**
 * Fixed top status bar.
 *
 * Layout: [app name] [screen name]    [⚙ N/max  status  ⬤ connected]
 */
export function ChromeTopBar({
  screenName,
  daemonConnected,
  waveSummary,
  daemonStats,
}: ChromeTopBarProps): React.ReactElement {
  const customTitle = useChromTitle();
  const displayName = customTitle ?? screenName;

  const statusColor = daemonStats
    ? (SCHEDULER_STATUS_UI[daemonStats.schedulerStatus]?.color ?? "white")
    : (daemonConnected ? "green" : "red");

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      width="100%"
      paddingX={1}
      borderStyle="single"
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderTop={false}
    >
      {/* Left: app name + screen */}
      <Box flexDirection="row" gap={1}>
        <Text bold>Home</Text>
        <Text dimColor>›</Text>
        <Text bold>{displayName}</Text>
      </Box>

      {/* Center: wave summary (legacy, only shown when explicitly set) */}
      {waveSummary && (
        <Box flexDirection="row" gap={1}>
          <Text color="blue">●{waveSummary.running}</Text>
          <Text color="green">✓{waveSummary.done}</Text>
          <Text color="red">✗{waveSummary.failed}</Text>
        </Box>
      )}

      {/* Right: live agent count + scheduler status + connection dot */}
      <Box flexDirection="row" gap={1}>
        {daemonStats ? (
          <>
            <Text color={daemonStats.running > 0 ? "greenBright" : "gray"}>
              ⧥ {daemonStats.running}/{daemonStats.maxConcurrent === 0 ? "∞" : daemonStats.maxConcurrent}
            </Text>
            <Text dimColor>│</Text>
            <Text color={statusColor}>{SCHEDULER_STATUS_UI[daemonStats.schedulerStatus]?.label ?? daemonStats.schedulerStatus}</Text>
            <Text dimColor>│</Text>
          </>
        ) : null}
        {daemonConnected ? (
          <Text color="greenBright">⬤ connected</Text>
        ) : (
          <Text color="red">⬤ unreachable</Text>
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ChromeBottomBar
// ---------------------------------------------------------------------------

/** Global keybinds always shown regardless of current screen. */
const GLOBAL_HINTS: KeybindHint[] = [
  { key: "ESC", description: "menu" },
  { key: "q", description: "quit" },
];

export interface ChromeBottomBarProps {
  /** Screen-specific keybind hints merged with global ones. */
  contextHints?: KeybindHint[];
  /** Active locale code displayed in the icon strip (default: "en"). */
  locale?: string;
}

/**
 * Fixed bottom bar.
 *
 * Layout: [keybind hints ...]    [🔇 icon] [🔕 icon] [locale]
 */
export function ChromeBottomBar({
  contextHints = [],
  locale = "en",
}: ChromeBottomBarProps): React.ReactElement {
  const allHints = [...GLOBAL_HINTS, ...contextHints];

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      width="100%"
      paddingX={1}
    >
      {/* Keybind hints */}
      <Box flexDirection="row" gap={1} flexWrap="wrap">
        {allHints.map((hint, i) => (
          <Box key={i} flexDirection="row">
            <Text bold color="yellow">
              {hint.key}
            </Text>
            <Text dimColor> {hint.description}</Text>
            {i < allHints.length - 1 && <Text dimColor>  </Text>}
          </Box>
        ))}
      </Box>

      {/* Icon strip: sound / notifications / locale */}
      <Box flexDirection="row" gap={1}>
        {/* Sound — placeholder, navigates to Settings */}
        <Text dimColor>🔇</Text>
        {/* Desktop notifications — placeholder */}
        <Text dimColor>🔕</Text>
        {/* Locale */}
        <Text dimColor>{locale}</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ChromeLayout
// ---------------------------------------------------------------------------

export interface ChromeLayoutProps {
  /** Name of the current screen for the top bar. */
  screenName: string;
  /** Whether the daemon is connected. */
  daemonConnected: boolean;
  /** Optional wave summary for the top bar. */
  waveSummary?: WaveSummary;
  /** Live daemon agent/scheduler stats for the top-right corner. */
  daemonStats?: DaemonStats;
  /** Screen-specific keybind hints for the bottom bar. */
  contextHints?: KeybindHint[];
  /** Active locale code for the bottom bar icon strip. */
  locale?: string;
  /** The screen content (rendered between the bars). */
  children?: ReactNode;
}

/**
 * ChromeLayout — wraps a screen with persistent top and bottom bars.
 *
 * Place this as the outermost wrapper inside the ScreenRouter's children,
 * or use it directly as a layout component within each screen.
 *
 * The bars are always visible and survive screen navigation as long as
 * ChromeLayout itself is never unmounted.
 */
export function ChromeLayout({
  screenName,
  daemonConnected,
  waveSummary,
  daemonStats,
  contextHints,
  locale,
  children,
}: ChromeLayoutProps): React.ReactElement {
  const { rows } = useTerminalSize();

  return (
    <Box flexDirection="column" width="100%" height={rows}>
      <ChromeTopBar
        screenName={screenName}
        daemonConnected={daemonConnected}
        waveSummary={waveSummary}
        daemonStats={daemonStats}
      />
      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>
      <ChromeBottomBar contextHints={contextHints} locale={locale} />
    </Box>
  );
}
