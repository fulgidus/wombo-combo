/**
 * spinner.tsx — The one spinner used across the TUI.
 *
 * Frames come from the active theme (`spinnerFrames`). By default the
 * component animates itself; pass `frame` to drive it from a parent tick
 * (e.g. the splash screen) or from a test.
 *
 * Usage:
 *   <Spinner color="cyan" />
 *   <Spinner frame={tick} />
 */

import React from "react";
import { Text } from "ink";
import { useTheme } from "./theme";
import { useSpinner } from "./use-spinner";

export interface SpinnerProps {
  /** Externally driven frame index. When omitted the spinner animates itself. */
  frame?: number;
  /** Ink text color. */
  color?: string;
  /** Interval for the self-driven animation. */
  intervalMs?: number;
}

export function Spinner({ frame, color, intervalMs }: SpinnerProps): React.ReactElement {
  const { spinnerFrames } = useTheme();
  // Hooks cannot be conditional: the internal timer is idle when `frame` is given.
  const ownFrame = useSpinner(frame === undefined, intervalMs);
  const index = (frame ?? ownFrame) % spinnerFrames.length;
  return <Text color={color as any}>{spinnerFrames[index]}</Text>;
}
