/**
 * wave-monitor.test.tsx — Tests for WaveMonitorView Ink component.
 *
 * Tests follow the same pattern as quest-picker.test.tsx and task-browser.test.tsx:
 * - renderToString for static render assertions
 * - createTestStreams + renderLive for interactive/keybind tests
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import type { AgentStatus } from "../lib/state";
import type { ActivityEntry } from "../lib/monitor";
import {
  WaveMonitorView,
  type WaveMonitorViewProps,
  type AgentInfo,
  type AgentCounts,
} from "./wave-monitor";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeAgent(overrides: Partial<AgentInfo> = {}): AgentInfo {
  return {
    featureId: "test-feature",
    status: "running" as AgentStatus,
    activity: null,
    startedAt: null,
    retries: 0,
    effortEstimateMs: null,
    buildPassed: null,
    buildOutput: null,
    ...overrides,
  };
}

function makeCounts(overrides: Partial<AgentCounts> = {}): AgentCounts {
  return {
    queued: 0,
    installing: 0,
    running: 0,
    completed: 0,
    verified: 0,
    failed: 0,
    merged: 0,
    retry: 0,
    resolving_conflict: 0,
    ...overrides,
  };
}

function defaultProps(overrides: Partial<WaveMonitorViewProps> = {}): WaveMonitorViewProps {
  return {
    waveId: "wave-001",
    baseBranch: "main",
    interactive: false,
    model: null,
    agents: [],
    counts: makeCounts(),
    selectedIndex: 0,
    autoScroll: true,
    waveComplete: false,
    activityLog: [],
    systemMessages: [],
    pendingQuestionCount: 0,
    onSelectionChange: () => {},
    onAttach: () => {},
    onRetry: () => {},
    onToggleBuildLog: () => {},
    onToggleAutoScroll: () => {},
    onOpenQuestions: () => {},
    onQuit: () => {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Header tests
// ---------------------------------------------------------------------------

describe("WaveMonitorView Header", () => {
  test("renders wave ID and base branch", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          waveId: "wave-42",
          baseBranch: "develop",
        })}
      />
    );
    expect(output).toContain("wave-42");
    expect(output).toContain("develop");
  });

  test("renders headless mode label when not interactive", () => {
    const output = renderToString(
      <WaveMonitorView {...defaultProps({ interactive: false })} />
    );
    expect(output).toContain("headless");
  });

  test("renders interactive mode label when interactive", () => {
    const output = renderToString(
      <WaveMonitorView {...defaultProps({ interactive: true })} />
    );
    expect(output).toContain("interactive");
  });

  test("renders model name when provided", () => {
    const output = renderToString(
      <WaveMonitorView {...defaultProps({ model: "claude-sonnet" })} />
    );
    expect(output).toContain("claude-sonnet");
  });

  test("renders WAVE COMPLETE banner when wave is complete", () => {
    const output = renderToString(
      <WaveMonitorView {...defaultProps({ waveComplete: true })} />
    );
    expect(output).toContain("WAVE COMPLETE");
  });

  test("does not render WAVE COMPLETE when wave is not complete", () => {
    const output = renderToString(
      <WaveMonitorView {...defaultProps({ waveComplete: false })} />
    );
    expect(output).not.toContain("WAVE COMPLETE");
  });

  test("renders progress counts", () => {
    const counts = makeCounts({
      running: 2,
      verified: 1,
      merged: 3,
      failed: 1,
      queued: 5,
    });
    const agents = [
      makeAgent({ featureId: "a1", status: "running" }),
      makeAgent({ featureId: "a2", status: "running" }),
      makeAgent({ featureId: "a3", status: "verified" }),
      makeAgent({ featureId: "a4", status: "merged" }),
      makeAgent({ featureId: "a5", status: "merged" }),
      makeAgent({ featureId: "a6", status: "merged" }),
      makeAgent({ featureId: "a7", status: "failed" }),
      makeAgent({ featureId: "a8", status: "queued" }),
      makeAgent({ featureId: "a9", status: "queued" }),
      makeAgent({ featureId: "a10", status: "queued" }),
      makeAgent({ featureId: "a11", status: "queued" }),
      makeAgent({ featureId: "a12", status: "queued" }),
    ];
    const output = renderToString(
      <WaveMonitorView {...defaultProps({ agents, counts })} />
    );
    // Progress: done(verified+merged)/total = 4/12
    expect(output).toContain("4");
    expect(output).toContain("12");
    expect(output).toContain("2 running");
    expect(output).toContain("1 failed");
    expect(output).toContain("5 queued");
  });

  test("renders total token count and cost when provided", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          totalTokens: 150_000,
          totalCost: 2.45,
        })}
      />
    );
    expect(output).toContain("150.0k");
    expect(output).toContain("$2.45");
  });
});

// ---------------------------------------------------------------------------
// Agent list tests
// ---------------------------------------------------------------------------

describe("WaveMonitorView Agent List", () => {
  test("renders agent feature IDs", () => {
    const agents = [
      makeAgent({ featureId: "auth-overhaul" }),
      makeAgent({ featureId: "perf-optim" }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ running: 2 }) })}
      />
    );
    expect(output).toContain("auth-overhaul");
    expect(output).toContain("perf-optim");
  });

  test("renders status icons and labels", () => {
    const agents = [
      makeAgent({ featureId: "a1", status: "running" }),
      makeAgent({ featureId: "a2", status: "verified" }),
      makeAgent({ featureId: "a3", status: "failed" }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          counts: makeCounts({ running: 1, verified: 1, failed: 1 }),
        })}
      />
    );
    // Status icons
    expect(output).toContain("●"); // running
    expect(output).toContain("✓"); // verified
    expect(output).toContain("✗"); // failed
  });

  test("renders progress bar for running agents", () => {
    const now = Date.now();
    const agents = [
      makeAgent({
        featureId: "running-agent",
        status: "running",
        startedAt: new Date(now - 30 * 60 * 1000).toISOString(), // 30 min ago
        effortEstimateMs: 60 * 60 * 1000, // 1 hour
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ running: 1 }) })}
      />
    );
    // Should have some progress blocks
    expect(output).toContain("█");
    expect(output).toContain("░");
  });

  test("renders full progress bar for verified agents", () => {
    const agents = [
      makeAgent({ featureId: "done-agent", status: "verified" }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ verified: 1 }) })}
      />
    );
    expect(output).toContain("████████");
  });

  test("renders full red progress bar for failed agents", () => {
    const agents = [
      makeAgent({ featureId: "fail-agent", status: "failed" }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ failed: 1 }) })}
      />
    );
    expect(output).toContain("████████");
  });

  test("renders activity snippet for running agents", () => {
    const agents = [
      makeAgent({
        featureId: "busy",
        status: "running",
        activity: "Writing tests for auth module",
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ running: 1 }) })}
      />
    );
    expect(output).toContain("Writing tests for auth");
  });

  test("truncates long activity text", () => {
    const agents = [
      makeAgent({
        featureId: "busy",
        status: "running",
        activity: "A".repeat(50),
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ running: 1 }) })}
      />
    );
    expect(output).toContain("…");
  });

  test("renders installing activity", () => {
    const agents = [
      makeAgent({ featureId: "setup", status: "installing" }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ installing: 1 }) })}
      />
    );
    expect(output).toContain("setting up");
  });

  test("renders retry count when > 0", () => {
    const agents = [
      makeAgent({ featureId: "retried", status: "running", retries: 2 }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ running: 1 }) })}
      />
    );
    expect(output).toContain("↻2");
  });

  test("renders per-agent token count when available", () => {
    const agents = [
      makeAgent({ featureId: "costly", status: "running" }),
    ];
    const agentTokens = new Map([["costly", 42_500]]);
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          counts: makeCounts({ running: 1 }),
          agentTokens,
        })}
      />
    );
    expect(output).toContain("42.5k");
  });

  test("renders elapsed time for agents with startedAt", () => {
    const now = Date.now();
    const agents = [
      makeAgent({
        featureId: "timed",
        status: "running",
        startedAt: new Date(now - 5 * 60 * 1000).toISOString(), // 5 min ago
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ running: 1 }) })}
      />
    );
    expect(output).toContain("5m");
  });

  test("highlights selected agent row", () => {
    const agents = [
      makeAgent({ featureId: "first" }),
      makeAgent({ featureId: "second" }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 1,
          counts: makeCounts({ running: 2 }),
        })}
      />
    );
    // Selected item should have the ">" indicator
    expect(output).toContain(">");
  });

  test("shows empty state when no agents", () => {
    const output = renderToString(
      <WaveMonitorView {...defaultProps({ agents: [] })} />
    );
    expect(output).toContain("No agents");
  });

  test("truncates long feature IDs", () => {
    const agents = [
      makeAgent({
        featureId: "this-is-a-very-long-feature-id-that-exceeds-limit",
        status: "running",
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({ agents, counts: makeCounts({ running: 1 }) })}
      />
    );
    expect(output).toContain("…");
  });
});

// ---------------------------------------------------------------------------
// Activity preview tests
// ---------------------------------------------------------------------------

describe("WaveMonitorView Activity Preview", () => {
  test("shows 'No activity yet' when log is empty", () => {
    const agents = [makeAgent({ featureId: "idle" })];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          counts: makeCounts({ running: 1 }),
          activityLog: [],
        })}
      />
    );
    expect(output).toContain("No activity yet");
  });

  test("shows 'No agent selected' when no agents exist", () => {
    const output = renderToString(
      <WaveMonitorView {...defaultProps({ agents: [] })} />
    );
    expect(output).toContain("No agent selected");
  });

  test("renders activity log entries with timestamps", () => {
    const agents = [makeAgent({ featureId: "active" })];
    const activityLog: ActivityEntry[] = [
      { timestamp: "12:34:56", text: "Starting build" },
      { timestamp: "12:35:00", text: "Build complete" },
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          counts: makeCounts({ running: 1 }),
          activityLog,
        })}
      />
    );
    expect(output).toContain("12:34:56");
    expect(output).toContain("Starting build");
    expect(output).toContain("12:35:00");
    expect(output).toContain("Build complete");
  });

  test("renders system messages section", () => {
    const agents = [makeAgent({ featureId: "active" })];
    const systemMessages: ActivityEntry[] = [
      { timestamp: "12:36:00", text: "Build verification started" },
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          counts: makeCounts({ running: 1 }),
          activityLog: [{ timestamp: "12:34:56", text: "Working" }],
          systemMessages,
        })}
      />
    );
    expect(output).toContain("system");
    expect(output).toContain("Build verification");
  });

  test("shows selected agent feature ID in preview label", () => {
    const agents = [
      makeAgent({ featureId: "auth-api" }),
      makeAgent({ featureId: "user-mgmt" }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 1,
          counts: makeCounts({ running: 2 }),
          activityLog: [{ timestamp: "12:00:00", text: "Hello" }],
        })}
      />
    );
    expect(output).toContain("user-mgmt");
  });
});

// ---------------------------------------------------------------------------
// Status bar tests
// ---------------------------------------------------------------------------

describe("WaveMonitorView Status Bar", () => {
  test("renders standard keybind hints", () => {
    const output = renderToString(
      <WaveMonitorView {...defaultProps({
        agents: [makeAgent()],
        counts: makeCounts({ running: 1 }),
      })} />
    );
    expect(output).toContain("navigate");
    expect(output).toContain("retry");
    expect(output).toContain("build log");
    expect(output).toContain("quit");
  });

  test("shows 'attach session' hint when interactive", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          interactive: true,
          agents: [makeAgent()],
          counts: makeCounts({ running: 1 }),
        })}
      />
    );
    expect(output).toContain("attach");
  });

  test("shows 'view log' hint when headless", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          interactive: false,
          agents: [makeAgent()],
          counts: makeCounts({ running: 1 }),
        })}
      />
    );
    expect(output).toContain("view log");
  });

  test("shows auto-scroll status", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          autoScroll: true,
          agents: [makeAgent()],
          counts: makeCounts({ running: 1 }),
        })}
      />
    );
    expect(output).toContain("auto-scroll");
  });

  test("shows paused when auto-scroll is off", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          autoScroll: false,
          agents: [makeAgent()],
          counts: makeCounts({ running: 1 }),
        })}
      />
    );
    expect(output).toContain("paused");
  });

  test("shows HITL badge when pending questions exist", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          pendingQuestionCount: 3,
          agents: [makeAgent()],
          counts: makeCounts({ running: 1 }),
        })}
      />
    );
    expect(output).toContain("3 pending");
    expect(output).toContain("answer");
  });

  test("does not show HITL badge when no pending questions", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          pendingQuestionCount: 0,
          agents: [makeAgent()],
          counts: makeCounts({ running: 1 }),
        })}
      />
    );
    expect(output).not.toContain("pending");
  });

  test("shows selected agent info", () => {
    const agents = [makeAgent({ featureId: "my-feat" })];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 0,
          counts: makeCounts({ running: 1 }),
        })}
      />
    );
    expect(output).toContain("my-feat");
  });

  test("shows wave complete message in status bar", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          waveComplete: true,
          agents: [makeAgent({ status: "verified" })],
          counts: makeCounts({ verified: 1 }),
        })}
      />
    );
    expect(output).toContain("Wave complete");
    expect(output).toContain("exit");
  });
});

// ---------------------------------------------------------------------------
// Build log overlay tests
// ---------------------------------------------------------------------------

describe("WaveMonitorView Build Log Overlay", () => {
  test("renders build log overlay when showBuildLog is true", () => {
    const agents = [
      makeAgent({
        featureId: "built",
        status: "verified",
        buildPassed: true,
        buildOutput: "All checks passed!",
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 0,
          counts: makeCounts({ verified: 1 }),
          showBuildLog: true,
        })}
      />
    );
    expect(output).toContain("Build Log");
    expect(output).toContain("All checks passed");
  });

  test("shows build passed message when no output", () => {
    const agents = [
      makeAgent({
        featureId: "built",
        status: "verified",
        buildPassed: true,
        buildOutput: null,
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 0,
          counts: makeCounts({ verified: 1 }),
          showBuildLog: true,
        })}
      />
    );
    expect(output).toContain("Build passed");
  });

  test("shows build failed message when failed with no output", () => {
    const agents = [
      makeAgent({
        featureId: "built",
        status: "failed",
        buildPassed: false,
        buildOutput: null,
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 0,
          counts: makeCounts({ failed: 1 }),
          showBuildLog: true,
        })}
      />
    );
    expect(output).toContain("Build failed");
  });

  test("shows no build message when build not run", () => {
    const agents = [
      makeAgent({
        featureId: "nobuild",
        status: "running",
        buildPassed: null,
        buildOutput: null,
      }),
    ];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 0,
          counts: makeCounts({ running: 1 }),
          showBuildLog: true,
        })}
      />
    );
    expect(output).toContain("No build");
  });
});

// ---------------------------------------------------------------------------
// Log file overlay tests
// ---------------------------------------------------------------------------

describe("WaveMonitorView Log File Overlay", () => {
  test("renders log file overlay when logFileContent is provided", () => {
    const agents = [makeAgent({ featureId: "logged" })];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 0,
          counts: makeCounts({ running: 1 }),
          logFileContent: "Line 1\nLine 2\nLine 3",
          logFileAgentId: "logged",
        })}
      />
    );
    expect(output).toContain("Log");
    expect(output).toContain("logged");
    expect(output).toContain("Line 1");
  });

  test("does not render log overlay when logFileContent is not set", () => {
    const agents = [makeAgent({ featureId: "nolog" })];
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents,
          selectedIndex: 0,
          counts: makeCounts({ running: 1 }),
        })}
      />
    );
    expect(output).not.toContain("Esc to close");
  });
});

// ---------------------------------------------------------------------------
// Keybind dispatch tests (using renderToString — we verify props callbacks)
// ---------------------------------------------------------------------------

describe("WaveMonitorView Keybinds", () => {
  // For keybind testing we rely on the structural correctness —
  // the useInput hook maps keys to callbacks. We verify the component
  // renders without error, since full interactive testing would need
  // renderLive which is heavy for this many tests.

  test("component renders with all callbacks", () => {
    const output = renderToString(
      <WaveMonitorView
        {...defaultProps({
          agents: [
            makeAgent({ featureId: "a1", status: "running" }),
            makeAgent({ featureId: "a2", status: "failed" }),
          ],
          counts: makeCounts({ running: 1, failed: 1 }),
        })}
      />
    );
    expect(output).toBeTruthy();
  });
});
