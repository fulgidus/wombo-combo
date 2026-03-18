/**
 * daemon-protocol.test.ts — Unit tests for WebSocket protocol types and helpers.
 *
 * Coverage:
 *   - makeCommand envelope creation
 *   - makeEvent envelope creation
 *   - parseMessage with valid JSON
 *   - parseMessage with invalid JSON / missing fields
 *   - Envelope structure validation (type, payload, seq, ts)
 *   - CommandMap / EventMap type key correctness
 *   - Protocol constants
 */

import { describe, test, expect } from "bun:test";
import {
  makeCommand,
  makeEvent,
  parseMessage,
  PROTOCOL_VERSION,
  DEFAULT_WS_PORT,
  PID_FILE,
  DEFAULT_IDLE_TIMEOUT_MS,
} from "../src/daemon/protocol";
import type {
  Envelope,
  CommandType,
  EventType,
  CommandMap,
  EventMap,
  CommandMessage,
  EventMessage,
  Message,
  CmdHandshake,
  CmdStart,
  EvtHandshakeAck,
  EvtStateSnapshot,
  EvtAgentStatusChange,
  SchedulerState,
  DaemonAgentState,
  SchedulerStatus,
} from "../src/daemon/protocol";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("protocol constants", () => {
  test("PROTOCOL_VERSION is a positive integer", () => {
    expect(typeof PROTOCOL_VERSION).toBe("number");
    expect(PROTOCOL_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(PROTOCOL_VERSION)).toBe(true);
  });

  test("DEFAULT_WS_PORT is 19420", () => {
    expect(DEFAULT_WS_PORT).toBe(19420);
  });

  test("PID_FILE is daemon.pid", () => {
    expect(PID_FILE).toBe("daemon.pid");
  });

  test("DEFAULT_IDLE_TIMEOUT_MS is 5 minutes", () => {
    expect(DEFAULT_IDLE_TIMEOUT_MS).toBe(5 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// makeCommand
// ---------------------------------------------------------------------------

describe("makeCommand", () => {
  test("creates a valid command envelope", () => {
    const cmd = makeCommand("cmd:handshake", {
      protocolVersion: 1,
      clientId: "test",
    }, 1);

    expect(cmd.type).toBe("cmd:handshake");
    expect(cmd.payload).toEqual({ protocolVersion: 1, clientId: "test" });
    expect(cmd.seq).toBe(1);
    expect(typeof cmd.ts).toBe("string");
    // ts should be a valid ISO date
    expect(new Date(cmd.ts).toISOString()).toBe(cmd.ts);
  });

  test("respects provided seq number", () => {
    const cmd = makeCommand("cmd:start", { taskIds: ["a", "b"] }, 42);
    expect(cmd.seq).toBe(42);
  });

  test("creates cmd:start with all optional fields", () => {
    const cmd = makeCommand("cmd:start", {
      questId: "quest-1",
      maxConcurrent: 8,
      model: "gpt-4",
      taskIds: ["feat-1", "feat-2"],
    }, 3);

    expect(cmd.payload.questId).toBe("quest-1");
    expect(cmd.payload.maxConcurrent).toBe(8);
    expect(cmd.payload.model).toBe("gpt-4");
    expect(cmd.payload.taskIds).toEqual(["feat-1", "feat-2"]);
  });

  test("creates cmd:start with empty payload", () => {
    const cmd = makeCommand("cmd:start", {}, 1);
    expect(cmd.type).toBe("cmd:start");
    expect(cmd.payload).toEqual({});
  });

  test("creates cmd:pin-task", () => {
    const cmd = makeCommand("cmd:pin-task", { taskId: "feat-1" }, 5);
    expect(cmd.type).toBe("cmd:pin-task");
    expect(cmd.payload.taskId).toBe("feat-1");
  });

  test("creates cmd:hitl-answer", () => {
    const cmd = makeCommand("cmd:hitl-answer", {
      featureId: "feat-1",
      questionId: "q-1",
      answer: "Yes, proceed",
    }, 7);
    expect(cmd.payload.featureId).toBe("feat-1");
    expect(cmd.payload.questionId).toBe("q-1");
    expect(cmd.payload.answer).toBe("Yes, proceed");
  });

  test("creates cmd:set-concurrency", () => {
    const cmd = makeCommand("cmd:set-concurrency", { maxConcurrent: 6 }, 10);
    expect(cmd.payload.maxConcurrent).toBe(6);
  });

  test("creates cmd:shutdown with force", () => {
    const cmd = makeCommand("cmd:shutdown", { force: true }, 99);
    expect(cmd.payload.force).toBe(true);
  });

  test("creates cmd:pause / cmd:resume / cmd:stop / cmd:kill with empty payload", () => {
    for (const cmdType of ["cmd:pause", "cmd:resume", "cmd:stop", "cmd:kill"] as const) {
      const cmd = makeCommand(cmdType, {} as any, 1);
      expect(cmd.type).toBe(cmdType);
      expect(cmd.payload).toEqual({});
    }
  });

  test("timestamp is approximately now", () => {
    const before = Date.now();
    const cmd = makeCommand("cmd:get-state", {}, 1);
    const after = Date.now();
    const cmdTime = new Date(cmd.ts).getTime();
    expect(cmdTime).toBeGreaterThanOrEqual(before);
    expect(cmdTime).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// makeEvent
// ---------------------------------------------------------------------------

describe("makeEvent", () => {
  test("creates a valid event envelope", () => {
    const evt = makeEvent("evt:handshake-ack", {
      protocolVersion: 1,
      daemonPid: 12345,
      uptime: 5000,
    }, 1);

    expect(evt.type).toBe("evt:handshake-ack");
    expect(evt.payload).toEqual({
      protocolVersion: 1,
      daemonPid: 12345,
      uptime: 5000,
    });
    expect(evt.seq).toBe(1);
    expect(typeof evt.ts).toBe("string");
  });

  test("creates evt:agent-status-change", () => {
    const evt = makeEvent("evt:agent-status-change", {
      featureId: "feat-1",
      previousStatus: "queued",
      newStatus: "running",
      detail: "Agent spawned",
    }, 5);

    expect(evt.payload.featureId).toBe("feat-1");
    expect(evt.payload.previousStatus).toBe("queued");
    expect(evt.payload.newStatus).toBe("running");
    expect(evt.payload.detail).toBe("Agent spawned");
  });

  test("creates evt:scheduler-status", () => {
    const evt = makeEvent("evt:scheduler-status", {
      status: "running",
      reason: "Scheduler started",
    }, 2);

    expect(evt.payload.status).toBe("running");
    expect(evt.payload.reason).toBe("Scheduler started");
  });

  test("creates evt:build-result", () => {
    const evt = makeEvent("evt:build-result", {
      featureId: "feat-1",
      passed: true,
      output: "Build succeeded",
    }, 10);
    expect(evt.payload.passed).toBe(true);
    expect(evt.payload.output).toBe("Build succeeded");
  });

  test("creates evt:merge-result", () => {
    const evt = makeEvent("evt:merge-result", {
      featureId: "feat-1",
      success: false,
      error: "Merge conflicts",
    }, 11);
    expect(evt.payload.success).toBe(false);
    expect(evt.payload.error).toBe("Merge conflicts");
  });

  test("creates evt:hitl-question", () => {
    const evt = makeEvent("evt:hitl-question", {
      featureId: "feat-1",
      questionId: "q-123",
      questionText: "Should I use a different approach?",
    }, 12);
    expect(evt.payload.questionText).toBe("Should I use a different approach?");
  });

  test("creates evt:token-usage", () => {
    const evt = makeEvent("evt:token-usage", {
      featureId: "feat-1",
      inputTokens: 5000,
      outputTokens: 2000,
      totalTokens: 7000,
      cost: 0.35,
    }, 13);
    expect(evt.payload.totalTokens).toBe(7000);
    expect(evt.payload.cost).toBe(0.35);
  });

  test("creates evt:log", () => {
    const evt = makeEvent("evt:log", {
      level: "warn",
      message: "High memory usage",
      data: { rss: 1024 },
    }, 14);
    expect(evt.payload.level).toBe("warn");
    expect(evt.payload.data?.rss).toBe(1024);
  });

  test("creates evt:shutdown", () => {
    const evt = makeEvent("evt:shutdown", {
      reason: "Idle timeout",
      forced: false,
    }, 15);
    expect(evt.payload.reason).toBe("Idle timeout");
    expect(evt.payload.forced).toBe(false);
  });

  test("creates evt:error", () => {
    const evt = makeEvent("evt:error", {
      commandType: "cmd:start",
      commandSeq: 3,
      message: "Scheduler already running",
      code: "ALREADY_RUNNING",
    }, 16);
    expect(evt.payload.commandType).toBe("cmd:start");
    expect(evt.payload.code).toBe("ALREADY_RUNNING");
  });

  test("creates evt:state-snapshot with full state", () => {
    const scheduler: SchedulerState = {
      status: "running",
      maxConcurrent: 4,
      model: "claude-4",
      baseBranch: "main",
      questId: null,
      startedAt: "2025-01-01T00:00:00Z",
      pinnedTasks: [],
      skippedTasks: [],
      totalProcessed: 5,
      totalCompleted: 3,
      totalFailed: 1,
    };

    const agent: DaemonAgentState = {
      featureId: "feat-1",
      taskTitle: "Test Feature",
      branch: "wombo/feat-1",
      baseBranch: "main",
      worktree: "/tmp/wt",
      status: "running",
      pid: 12345,
      sessionId: "sess-1",
      activity: "Editing file...",
      activityUpdatedAt: "2025-01-01T00:01:00Z",
      retries: 0,
      maxRetries: 2,
      startedAt: "2025-01-01T00:00:30Z",
      completedAt: null,
      buildPassed: null,
      error: null,
      effortEstimateMs: 600000,
      streamIndex: 0,
      dependsOn: [],
      dependedOnBy: ["feat-2"],
      agentName: null,
      agentType: null,
      pendingQuestions: [],
      tokenUsage: { inputTokens: 1000, outputTokens: 500, totalCost: 0.05 },
    };

    const evt = makeEvent("evt:state-snapshot", {
      scheduler,
      agents: [agent],
      uptime: 60000,
    }, 100);

    expect(evt.payload.scheduler.status).toBe("running");
    expect(evt.payload.agents).toHaveLength(1);
    expect(evt.payload.agents[0].featureId).toBe("feat-1");
    expect(evt.payload.uptime).toBe(60000);
  });
});

// ---------------------------------------------------------------------------
// parseMessage
// ---------------------------------------------------------------------------

describe("parseMessage", () => {
  test("parses a valid command message", () => {
    const raw = JSON.stringify({
      type: "cmd:start",
      payload: { taskIds: ["a"] },
      seq: 1,
      ts: new Date().toISOString(),
    });

    const msg = parseMessage(raw);
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe("cmd:start");
    expect(msg!.seq).toBe(1);
  });

  test("parses a valid event message", () => {
    const raw = JSON.stringify({
      type: "evt:agent-status-change",
      payload: {
        featureId: "feat-1",
        previousStatus: "queued",
        newStatus: "running",
      },
      seq: 5,
      ts: new Date().toISOString(),
    });

    const msg = parseMessage(raw);
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe("evt:agent-status-change");
  });

  test("returns null for non-JSON string", () => {
    expect(parseMessage("not json")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseMessage("")).toBeNull();
  });

  test("returns null for JSON array", () => {
    expect(parseMessage("[1, 2, 3]")).toBeNull();
  });

  test("returns null for JSON without type field", () => {
    const raw = JSON.stringify({ payload: {}, seq: 1 });
    expect(parseMessage(raw)).toBeNull();
  });

  test("returns null for JSON without seq field", () => {
    const raw = JSON.stringify({ type: "cmd:start", payload: {} });
    expect(parseMessage(raw)).toBeNull();
  });

  test("returns null for JSON with non-string type", () => {
    const raw = JSON.stringify({ type: 123, payload: {}, seq: 1 });
    expect(parseMessage(raw)).toBeNull();
  });

  test("returns null for JSON with non-number seq", () => {
    const raw = JSON.stringify({ type: "cmd:start", payload: {}, seq: "abc" });
    expect(parseMessage(raw)).toBeNull();
  });

  test("returns null for JSON null", () => {
    expect(parseMessage("null")).toBeNull();
  });

  test("returns null for JSON primitive", () => {
    expect(parseMessage("42")).toBeNull();
    expect(parseMessage('"hello"')).toBeNull();
    expect(parseMessage("true")).toBeNull();
  });

  test("round-trips with makeCommand", () => {
    const cmd = makeCommand("cmd:pin-task", { taskId: "feat-99" }, 7);
    const raw = JSON.stringify(cmd);
    const parsed = parseMessage(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("cmd:pin-task");
    expect(parsed!.seq).toBe(7);
    expect((parsed!.payload as any).taskId).toBe("feat-99");
  });

  test("round-trips with makeEvent", () => {
    const evt = makeEvent("evt:log", {
      level: "info",
      message: "test",
    }, 42);
    const raw = JSON.stringify(evt);
    const parsed = parseMessage(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("evt:log");
    expect(parsed!.seq).toBe(42);
    expect((parsed!.payload as any).level).toBe("info");
  });

  test("preserves payload with unknown extra fields", () => {
    const raw = JSON.stringify({
      type: "cmd:start",
      payload: { taskIds: ["a"], extra: true },
      seq: 1,
      ts: new Date().toISOString(),
    });
    const msg = parseMessage(raw);
    expect(msg).not.toBeNull();
    expect((msg!.payload as any).extra).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Type consistency checks (compile-time validated, runtime sanity)
// ---------------------------------------------------------------------------

describe("type maps", () => {
  test("CommandMap has all expected command types", () => {
    const expectedCommands: CommandType[] = [
      "cmd:handshake",
      "cmd:start",
      "cmd:pause",
      "cmd:resume",
      "cmd:stop",
      "cmd:kill",
      "cmd:pin-task",
      "cmd:skip-task",
      "cmd:pause-agent",
      "cmd:retry-agent",
      "cmd:cancel-agent",
      "cmd:hitl-answer",
      "cmd:get-state",
      "cmd:set-concurrency",
      "cmd:shutdown",
    ];

    // Create a command for each type to verify they're valid
    for (const cmdType of expectedCommands) {
      const cmd = makeCommand(cmdType, {} as any, 1);
      expect(cmd.type).toBe(cmdType);
    }
  });

  test("EventMap has all expected event types", () => {
    const expectedEvents: EventType[] = [
      "evt:handshake-ack",
      "evt:state-snapshot",
      "evt:scheduler-status",
      "evt:agent-status-change",
      "evt:agent-activity",
      "evt:agent-output",
      "evt:hitl-question",
      "evt:build-result",
      "evt:merge-result",
      "evt:task-picked",
      "evt:token-usage",
      "evt:log",
      "evt:shutdown",
      "evt:error",
    ];

    for (const evtType of expectedEvents) {
      const evt = makeEvent(evtType, {} as any, 1);
      expect(evt.type).toBe(evtType);
    }
  });

  test("SchedulerStatus has all expected values", () => {
    const validStatuses: SchedulerStatus[] = [
      "idle",
      "running",
      "paused",
      "stopping",
      "draining",
      "shutdown",
    ];

    // Verify each is a string — can't do much more at runtime
    for (const status of validStatuses) {
      expect(typeof status).toBe("string");
    }
  });
});
