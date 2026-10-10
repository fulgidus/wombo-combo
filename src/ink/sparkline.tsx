/**
 * sparkline.tsx — Bounded terminal sparkline graphs.
 *
 * `formatSparkline` is a pure formatter (no timers, no data collection).
 * `Sparkline` is a thin Ink presentation component around it. The ASCII mode
 * is chosen from existing theme tokens: a theme whose progress glyphs are
 * plain ASCII (the "minimal" preset) renders ASCII-only graphs.
 */

import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "./theme";

/** Unicode levels: index 0 is the zero level, 1..7 are increasing nonzero levels. */
export const UNICODE_LEVELS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;
/** ASCII levels, same layout as UNICODE_LEVELS. */
export const ASCII_LEVELS = ["_", ".", "-", ":", "=", "+", "*", "#"] as const;

export interface SparklineOptions {
  /** Use ASCII-only characters. */
  ascii?: boolean;
  /**
   * Explicit scale maximum for consistent scaling across several graphs.
   * Defaults to the largest sample. Non-finite or non-positive values are ignored.
   */
  max?: number;
}

/** Coerce a sample to a finite nonnegative number (invalid values become 0). */
function clean(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Format samples as a sparkline of at most `width` terminal columns.
 *
 * - Every glyph is exactly one column wide, so the result never exceeds `width`.
 * - When there are more samples than columns the most recent samples are kept.
 * - Invalid (NaN, infinite, negative, non-number) samples render as zero.
 * - Zero maps to the lowest level; any positive sample is strictly higher, so
 *   zero-only (and empty-scale) data is flat and never implies activity.
 * - Empty input (or width <= 0) yields an empty string.
 */
export function formatSparkline(
  samples: readonly number[] | null | undefined,
  width: number,
  options: SparklineOptions = {},
): string {
  const cols = Number.isFinite(width) ? Math.floor(width) : 0;
  if (!samples || samples.length === 0 || cols <= 0) return "";
  const levels = options.ascii ? ASCII_LEVELS : UNICODE_LEVELS;
  const visible = samples.length > cols ? samples.slice(samples.length - cols) : samples;
  const values = Array.from(visible, clean);

  const explicit = options.max;
  const scale =
    typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0
      ? explicit
      : Math.max(...values, 0);

  let out = "";
  for (const v of values) {
    if (v <= 0 || scale <= 0) {
      out += levels[0];
    } else {
      const idx = Math.min(7, Math.max(1, Math.ceil((v / scale) * 7)));
      out += levels[idx];
    }
  }
  return out;
}

export interface SparklineProps extends SparklineOptions {
  samples: readonly number[];
  /** Maximum graph width in terminal columns (excluding label). */
  width: number;
  /** Caller-supplied numeric label (e.g. "peak 3/min"), shown after the graph. */
  label?: string;
  color?: string;
}

/** True when the active theme should render ASCII-only graphics. */
export function useAsciiGraphics(): boolean {
  const theme = useTheme();
  // eslint-disable-next-line no-control-regex
  return /^[ -~]*$/.test(theme.progressFilled + theme.progressEmpty);
}

export function Sparkline({
  samples,
  width,
  label,
  color,
  ascii,
  max,
}: SparklineProps): React.ReactElement {
  const themeAscii = useAsciiGraphics();
  const graph = formatSparkline(samples, width, { ascii: ascii ?? themeAscii, max });
  return (
    <Box flexDirection="row" gap={label ? 1 : 0}>
      <Text color={color || undefined}>{graph}</Text>
      {label ? <Text dimColor>{label}</Text> : null}
    </Box>
  );
}
