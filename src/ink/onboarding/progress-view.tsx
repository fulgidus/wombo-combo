/**
 * progress-view.tsx — Spinner / progress view Ink component.
 *
 * Displays a title, optional subtitle, animated spinner, and status message.
 * Can transition to a result state (success/error/info) with a colored icon.
 *
 * Used for:
 *   - Brownfield codebase scout progress
 *   - LLM synthesis progress
 *   - Generic async operation feedback
 *
 * The spinner uses Braille dot characters (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏) which animate
 * via the shared Spinner. When a `result` is provided, the spinner
 * stops and a result icon + message is shown instead.
 */

import React from "react";
import { Box, Text } from "ink";
import { Spinner } from "../spinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result state for when the async operation completes. */
export interface ProgressResult {
  /** Type of result determines the icon and color. */
  type: "success" | "error" | "info";
  /** Message to display alongside the result icon. */
  message: string;
}

export interface ProgressViewProps {
  /** Title displayed as a header. */
  title: string;
  /** Optional subtitle (e.g., project name or path). */
  subtitle?: string;
  /** Current status message shown alongside the spinner. */
  status: string;
  /** When set, the spinner stops and the result is displayed. */
  result?: ProgressResult;
}

// ---------------------------------------------------------------------------
// ProgressView
// ---------------------------------------------------------------------------

/**
 * ProgressView — animated spinner with status text.
 *
 * Shows a spinner while an async operation is in progress, then
 * transitions to a result state (success ✔, error ✘, info ℹ) when
 * the `result` prop is set.
 */
export function ProgressView({
  title,
  subtitle,
  status,
  result,
}: ProgressViewProps): React.ReactElement {
  // Result icons and colors
  const resultIcon = result
    ? result.type === "success"
      ? "✔"
      : result.type === "error"
        ? "✘"
        : "ℹ"
    : null;

  const resultColor = result
    ? result.type === "success"
      ? "green"
      : result.type === "error"
        ? "red"
        : "blue"
    : undefined;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="magenta">
          {title}
        </Text>
        {subtitle && (
          <>
            <Text dimColor> — </Text>
            <Text dimColor>{subtitle}</Text>
          </>
        )}
      </Box>

      {/* Spinner + status or result */}
      {result ? (
        <Box>
          <Text color={resultColor} bold>
            {resultIcon}{" "}
          </Text>
          <Text>{result.message}</Text>
        </Box>
      ) : (
        <Box>
          <Spinner color="cyan" />
          <Text> </Text>
          <Text>{status}</Text>
        </Box>
      )}
    </Box>
  );
}
