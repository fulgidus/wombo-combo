/**
 * status-view.tsx — A child component demonstrating dynamic state rendering.
 *
 * Shows agent count and status, proving that child components can be
 * mounted/unmounted/swapped inside the Shell.
 */

import React from "react";
import { Box, Text } from "ink";
import { useI18n } from "./i18n";

export interface StatusViewProps {
  /** Current status text. */
  status?: string;
  /** Number of agents currently running. */
  agentCount?: number;
}

/**
 * StatusView — displays wave status and agent count.
 * Used to prove child component lifecycle works in the Ink shell.
 */
export function StatusView({
  status = "idle",
  agentCount = 0,
}: StatusViewProps): React.ReactElement {
  const t = useI18n();
  const statusColor =
    status === "idle"
      ? "yellow"
      : status === "running" || status === "active"
        ? "green"
        : "white";

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text dimColor>{t("statusView.status")} </Text>
        <Text color={statusColor}>{status}</Text>
      </Box>
      <Box>
        <Text dimColor>{t("statusView.agents")} </Text>
        <Text bold>{agentCount}</Text>
      </Box>
    </Box>
  );
}
