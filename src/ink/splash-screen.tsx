/**
 * splash-screen.tsx — Animated splash screen for the TUI.
 *
 * Shown briefly when the TUI starts. Features:
 *   - ASCII art "woco" logo
 *   - Tagline from i18n (splash.tagline)
 *   - Version string
 *   - Rotating splash texts (Minecraft-style)
 *   - Auto-navigates after durationMs (default 1500ms) or any keypress
 *
 * Props:
 *   onDone()       — called when the splash ends (timer or keypress)
 *   durationMs     — how long to show (0 = display but skip timer)
 *   version        — displayed as "v<version>" if provided
 *   splashTextIndex — override which SPLASH_TEXTS entry to show (useful in tests)
 */

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { t } from "./i18n";
import { useTerminalSize } from "./use-terminal-size";

// ---------------------------------------------------------------------------
// Splash texts (Minecraft-style rotating copy)
// ---------------------------------------------------------------------------

export const SPLASH_TEXTS: string[] = [
  "Now with 100% fewer merge conflicts!",
  "Parallel AI, orchestrated.",
  "Agents working while you sleep.",
  "Git worktrees: not just for power users anymore.",
  "Zero context switches.",
  "Automated. Verified. Merged.",
  "Your backlog fears us.",
  "Built with Bun. 🐰",
  "The future of parallel development.",
  "When one AI just isn't enough.",
  "Press any key to feel important.",
  "Wombo combo, indeed.",
];

// ---------------------------------------------------------------------------
// ASCII logo
// ---------------------------------------------------------------------------

const LOGO_LINES = [
  "  ██╗    ██╗ ██████╗  ██████╗ ██████╗ ",
  "  ██║    ██║██╔═══██╗██╔════╝██╔═══██╗",
  "  ██║ █╗ ██║██║   ██║██║     ██║   ██║",
  "  ██║███╗██║██║   ██║██║     ██║   ██║",
  "  ╚███╔███╔╝╚██████╔╝╚██████╗╚██████╔╝",
  "   ╚══╝╚══╝  ╚═════╝  ╚═════╝ ╚═════╝ ",
];

// ---------------------------------------------------------------------------
// SplashScreen
// ---------------------------------------------------------------------------

export interface SplashScreenProps {
  /** Called when the splash ends (timer elapsed or keypress). */
  onDone: () => void;
  /** Display duration in milliseconds. 0 = render once without auto-dismiss. */
  durationMs?: number;
  /** Version string to display (e.g. "0.4.2"). */
  version?: string;
  /**
   * Index into SPLASH_TEXTS to display. Defaults to a random index.
   * Pass a fixed value in tests for deterministic output.
   */
  splashTextIndex?: number;
}

export function SplashScreen({
  onDone,
  durationMs = 1500,
  version,
  splashTextIndex,
}: SplashScreenProps): React.ReactElement {
  const [done, setDone] = useState(false);

  // Stable splash text: pick once, never change
  const [textIdx] = useState(
    () => splashTextIndex ?? Math.floor(Math.random() * SPLASH_TEXTS.length)
  );
  const splashText = SPLASH_TEXTS[textIdx];

  // Auto-dismiss timer
  useEffect(() => {
    if (durationMs <= 0 || done) return;
    const id = setTimeout(() => {
      setDone(true);
      onDone();
    }, durationMs);
    return () => clearTimeout(id);
  }, [durationMs, done, onDone]);

  // Skip on any keypress
  useInput(() => {
    if (!done) {
      setDone(true);
      onDone();
    }
  });

  const versionLabel = version
    ? t("splash.version", { version })
    : undefined;

  const { rows } = useTerminalSize();

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height={rows}
    >
      {/* ASCII logo */}
      <Box flexDirection="column" alignItems="center">
        {LOGO_LINES.map((line, i) => (
          <Text key={i} color="cyan" bold>
            {line}
          </Text>
        ))}
        <Text bold color="cyan">woco — wombo-combo</Text>
      </Box>

      {/* Tagline */}
      <Box marginTop={1}>
        <Text dimColor>{t("splash.tagline")}</Text>
      </Box>

      {/* Version */}
      {versionLabel && (
        <Box marginTop={0}>
          <Text dimColor>{versionLabel}</Text>
        </Box>
      )}

      {/* Rotating splash text */}
      <Box marginTop={2}>
        <Text color="yellow">✦ {splashText} ✦</Text>
      </Box>

      {/* Loading hint */}
      <Box marginTop={1}>
        <Text dimColor>{t("splash.loading")}</Text>
      </Box>
    </Box>
  );
}
