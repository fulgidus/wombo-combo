/**
 * run-preflight.tsx — Ink preflight confirmation screen.
 *
 * Replaces the neo-blessed tuiPreflightConfirm() with an Ink-based version.
 * Shows tasks being launched, agent assignments, and allows the user to
 * reject specialized agents (in monitored mode) or cycle registry modes.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │ LAUNCH PREFLIGHT           mode: auto    │
 *   ├──────────────────────────────────────────┤
 *   │ Task ID          Agent          Status   │
 *   │ > my-task        frontend-dev   ✓        │
 *   │   other-task     generalist     ✓        │
 *   ├──────────────────────────────────────────┤
 *   │ Enter: launch  Tab: cycle mode  x: reject│
 *   │ Esc: cancel                               │
 *   └──────────────────────────────────────────┘
 */

import React, { useState, useCallback } from "react";
import { render as inkRender, Box, Text, useInput } from "ink";
import type { AgentResolution } from "../lib/agent-registry";
import { isSpecializedAgent } from "../lib/agent-registry";
import type { Task } from "../lib/tasks";
import type { AgentRegistryMode, WomboConfig } from "../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PreflightResult {
  /** Whether the user confirmed and wants to proceed */
  proceed: boolean;
  /**
   * Final agent assignments after user edits.
   * Task IDs mapped to their resolutions. Rejected agents are replaced
   * with generalist fallbacks (name: null).
   */
  agents: Map<string, AgentResolution>;
  /** Final registry mode (may differ from config if user changed it) */
  mode: AgentRegistryMode;
}

interface PreflightRow {
  taskId: string;
  taskTitle: string;
  agentName: string;
  agentType: string | null;
  isSpecialized: boolean;
  rejected: boolean;
}

interface InkPreflightResult {
  proceed: boolean;
  agents: Map<string, AgentResolution>;
  mode: AgentRegistryMode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PreflightViewProps {
  rows: PreflightRow[];
  initialMode: AgentRegistryMode;
  taskCount: number;
  agents: Map<string, AgentResolution>;
  onFinish: (result: InkPreflightResult) => void;
}

function PreflightView({
  rows: initialRows,
  initialMode,
  taskCount,
  agents,
  onFinish,
}: PreflightViewProps): React.ReactElement {
  const [rows, setRows] = useState<PreflightRow[]>(initialRows);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<AgentRegistryMode>(initialMode);

  const finish = useCallback(
    (proceed: boolean) => {
      const finalAgents = new Map<string, AgentResolution>(agents);
      for (const row of rows) {
        if (row.rejected) {
          finalAgents.set(row.taskId, {
            taskId: row.taskId,
            name: null,
            rawContent: null,
            fromCache: false,
            agentType: null,
          });
        }
      }
      onFinish({ proceed, agents: finalAgents, mode });
    },
    [rows, agents, mode, onFinish]
  );

  useInput((input, key) => {
    // Escape / Ctrl-C — cancel
    if (key.escape || (input === "c" && key.ctrl)) {
      finish(false);
      return;
    }

    // Enter — launch
    if (key.return) {
      finish(true);
      return;
    }

    // Tab — cycle mode
    if (key.tab) {
      const modes: AgentRegistryMode[] = ["auto", "monitored", "disabled"];
      setMode((prev) => {
        const idx = modes.indexOf(prev);
        return modes[(idx + 1) % modes.length];
      });
      return;
    }

    // Up/k
    if (key.upArrow || input === "k") {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }

    // Down/j
    if (key.downArrow || input === "j") {
      setSelectedIndex((i) => Math.min(rows.length - 1, i + 1));
      return;
    }

    // x — reject (monitored mode only)
    if (input === "x" && mode === "monitored") {
      setRows((prev) => {
        const next = [...prev];
        const row = next[selectedIndex];
        if (row && row.isSpecialized) {
          next[selectedIndex] = { ...row, rejected: !row.rejected };
        }
        return next;
      });
      return;
    }
  });

  const modeColor = mode === "auto" ? "green" : mode === "monitored" ? "yellow" : "red";
  const specializedCount = rows.filter((r) => r.isSpecialized && !r.rejected).length;
  const rejectedCount = rows.filter((r) => r.rejected).length;

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box>
        <Text bold> LAUNCH PREFLIGHT</Text>
        <Text>  </Text>
        <Text>mode: </Text>
        <Text bold color={modeColor}>{mode}</Text>
      </Box>
      <Box>
        <Text dimColor> {taskCount} task(s) ready to launch</Text>
      </Box>

      {/* Separator */}
      <Text dimColor>{"─".repeat(60)}</Text>

      {/* Task rows */}
      <Box flexDirection="column">
        {rows.map((row, i) => {
          const isSelected = i === selectedIndex;
          const cursor = isSelected ? ">" : " ";
          const taskId = row.taskId.length > 28 ? row.taskId.slice(0, 27) + "…" : row.taskId;

          let agentDisplay: React.ReactElement;
          if (row.rejected) {
            agentDisplay = <Text color="red">(rejected)</Text>;
          } else if (row.isSpecialized) {
            agentDisplay = <Text color="cyan">{row.agentName.slice(0, 20)}</Text>;
          } else {
            agentDisplay = <Text dimColor>generalist</Text>;
          }

          const statusIcon = row.rejected ? (
            <Text color="red">✗</Text>
          ) : (
            <Text color="green">✓</Text>
          );

          return (
            <Box key={row.taskId}>
              <Text bold={isSelected}>
                {" "}{cursor}{" "}
              </Text>
              <Box width={30}>
                <Text bold={isSelected}>{taskId}</Text>
              </Box>
              <Box width={22}>
                {agentDisplay}
              </Box>
              {statusIcon}
            </Box>
          );
        })}
      </Box>

      {/* Separator */}
      <Text dimColor>{"─".repeat(60)}</Text>

      {/* Status bar */}
      <Box>
        <Text color="green">Enter</Text>
        <Text>: launch  </Text>
        <Text color="yellow">Tab</Text>
        <Text>: cycle mode  </Text>
        <Text color="red">Esc</Text>
        <Text>: cancel</Text>
        {mode === "monitored" && (
          <>
            <Text>  </Text>
            <Text color="yellow">x</Text>
            <Text>: reject agent</Text>
          </>
        )}
      </Box>
      <Box>
        <Text dimColor>
          {" "}Specialized: {specializedCount}  Generalist: {rows.length - specializedCount}  Rejected: {rejectedCount}
        </Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ink-based preflight confirmation. Drop-in replacement for the blessed
 * tuiPreflightConfirm().
 */
export function inkPreflightConfirm(
  tasks: Task[],
  agents: Map<string, AgentResolution>,
  config: WomboConfig
): Promise<InkPreflightResult> {
  return new Promise((resolve) => {
    const rows: PreflightRow[] = tasks.map((task) => {
      const resolution = agents.get(task.id);
      const specialized = resolution && isSpecializedAgent(resolution);
      return {
        taskId: task.id,
        taskTitle: task.title,
        agentName: specialized ? resolution.name : "generalist",
        agentType: specialized ? resolution.agentType : null,
        isSpecialized: !!specialized,
        rejected: false,
      };
    });

    const instance = inkRender(
      <PreflightView
        rows={rows}
        initialMode={config.agentRegistry.mode}
        taskCount={tasks.length}
        agents={agents}
        onFinish={(result) => {
          instance.unmount();
          resolve(result);
        }}
      />
    );
  });
}

// ---------------------------------------------------------------------------
// Console Preflight (fallback for --no-tui / non-TTY)
// ---------------------------------------------------------------------------

/**
 * Console-based preflight confirmation.
 * Displays the launch plan and asks for y/n confirmation.
 * Does NOT support interactive agent rejection (that's TUI-only).
 */
export async function consolePreflightConfirm(
  tasks: Task[],
  agents: Map<string, AgentResolution>,
  config: WomboConfig
): Promise<PreflightResult> {
  const mode = config.agentRegistry.mode;

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  LAUNCH PREFLIGHT`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Registry mode: ${mode}`);
  console.log(`  Tasks: ${tasks.length}`);
  console.log(`${"─".repeat(60)}`);

  for (const task of tasks) {
    const resolution = agents.get(task.id);
    const agentLabel = resolution && isSpecializedAgent(resolution)
      ? `${resolution.name} (${resolution.fromCache ? "cached" : "fetched"})`
      : "generalist";
    console.log(`  ${task.id.padEnd(30)} → ${agentLabel}`);
  }

  console.log(`${"─".repeat(60)}`);

  // In non-interactive environments (piped stdin), just proceed
  if (!process.stdin.isTTY) {
    console.log(`  Non-interactive mode — proceeding automatically.\n`);
    return { proceed: true, agents, mode };
  }

  const answer = await new Promise<string>((resolve) => {
    process.stdout.write("  Proceed? [Y/n] ");
    process.stdin.setEncoding("utf-8");
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(data.toString().trim().toLowerCase());
    });
  });

  const proceed = answer === "" || answer === "y" || answer === "yes";
  if (!proceed) {
    console.log("  Launch cancelled.\n");
  }

  return { proceed, agents, mode };
}
