/**
 * daemon-agent-runner.test.ts — Unit tests for AgentRunner launch stagger queue.
 *
 * Tests the skipStagger flag added to enqueueLaunch/processLaunchQueue:
 *   - Fake-agent tasks bypass the 250ms inter-launch stagger
 *   - Real-agent tasks still respect the 250ms stagger
 *   - submitTask passes skipStagger=true for fake-agent, false for real agents
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DaemonState } from "../src/daemon/state";
import { AgentRunner } from "../src/daemon/agent-runner";
import { FAKE_AGENT_SENTINEL } from "../src/lib/launcher";
import type { WomboConfig } from "../src/config";
import type { Task } from "../src/lib/tasks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "agent-runner-test-"));
  // Create minimal .wombo-combo/tasks structure expected by DaemonState
  mkdirSync(join(dir, ".wombo-combo", "tasks"), { recursive: true });
  return dir;
}

function makeConfig(overrides: Partial<WomboConfig> = {}): WomboConfig {
  return {
    baseBranch: "main",
    maxConcurrent: 4,
    model: null,
    git: { branchPrefix: "feature/", remote: "origin", mergeStrategy: "--no-ff" },
    agent: { name: "test-agent", provider: "anthropic" },
    build: { command: "echo ok", enabled: false },
    merge: { strategy: "merge", maxEscalation: "tier4" },
    browser: { enabled: false },
    tdd: { enabled: false },
    tui: {},
    quest: {},
    defaults: { maxConcurrent: 4, maxRetries: 2 },
    ...overrides,
  } as WomboConfig;
}

function makeTask(id: string, agentName?: string): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    status: "planned",
    completion: 0,
    difficulty: "medium",
    priority: "medium",
    effort: "1h",
    depends_on: [],
    started_at: null,
    ended_at: null,
    constraints: [],
    forbidden: [],
    references: [],
    notes: [],
    subtasks: [],
    ...(agentName ? { agent: agentName } : {}),
  };
}

/**
 * Testable subclass of AgentRunner that exposes enqueueLaunch as public
 * and records which entries had skipStagger set.
 */
class TestableAgentRunner extends AgentRunner {
  public staggerLog: Array<{ skipStagger: boolean; startedAt: number }> = [];

  public testEnqueue(skipStagger: boolean): void {
    const self = this;
    this.enqueueLaunch(async () => {
      self.staggerLog.push({ skipStagger, startedAt: Date.now() });
    }, skipStagger);
  }
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AgentRunner launch stagger queue", () => {
  let tempDir: string;
  let state: DaemonState;
  let runner: TestableAgentRunner;

  beforeEach(() => {
    tempDir = makeTempDir();
    state = new DaemonState(tempDir);
    runner = new TestableAgentRunner(
      { projectRoot: tempDir, config: makeConfig() },
      state
    );
  });

  test("3.1: N fake-agent entries (skipStagger=true) all fire immediately, no waiting", async () => {
    const N = 5;
    for (let i = 0; i < N; i++) {
      runner.testEnqueue(true);
    }

    // All fire-and-forget callbacks should fire on the next microtask tick.
    // With skipStagger=true, no setTimeout delays are inserted.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(runner.staggerLog.length).toBe(N);
    // All start times should be clustered within 20ms of each other
    const times = runner.staggerLog.map((e) => e.startedAt);
    const spread = Math.max(...times) - Math.min(...times);
    expect(spread).toBeLessThan(20);
  });

  test("3.2: Real-agent entries enqueued while queue is running are staggered by ~250ms", async () => {
    // The stagger applies to items enqueued WHILE the queue is already processing.
    // Items enqueued synchronously (before the async loop starts) each get their own
    // processLaunchQueue call and are not staggered against each other.
    //
    // This test enqueues a second item from within the first item's fn,
    // which is the case where the stagger truly matters (re-entrant enqueue mid-flight).
    const timestamps: number[] = [];

    // Item 1: enqueues item 2 from within its body while queue is running
    runner.testEnqueue(false);
    // Small delay to let processQueue start processing item 1
    await new Promise((resolve) => setTimeout(resolve, 10));
    // Now enqueue item 2 while processQueue is "running" (technically isProcessing=false
    // again since item1 had an empty queue after it). We test the skip=true vs skip=false
    // at the semantic level: when skipStagger=true, the processor does NOT wait.

    // Reset log and test with an in-flight enqueue scenario
    runner.staggerLog.length = 0;

    // Use a custom TestableAgentRunner that enqueues a second item from within the first
    class ReentrantRunner extends AgentRunner {
      public log: number[] = [];
      private triggered = false;

      protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
        (this as any).launchQueue.push({ fn, skipStagger });
        if (!(this as any).isProcessingQueue) {
          (this as any).processLaunchQueue();
        }
      }

      testReentrant(skipStagger: boolean): void {
        const self = this;
        this.enqueueLaunch(async () => {
          self.log.push(Date.now());
          if (!self.triggered) {
            self.triggered = true;
            // Enqueue item 2 while queue is processing item 1
            self.enqueueLaunch(async () => {
              self.log.push(Date.now());
            }, skipStagger);
          }
        }, skipStagger);
      }
    }

    const reentrantState = new DaemonState(tempDir);
    const rr = new ReentrantRunner({ projectRoot: tempDir, config: makeConfig() }, reentrantState);

    // With skipStagger=false: second item should be delayed ~250ms after first
    rr.testReentrant(false);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(rr.log.length).toBe(2);
    const gap = rr.log[1] - rr.log[0];
    expect(gap).toBeGreaterThanOrEqual(200);
  });

  test("3.3a: submitTask with fake-agent sets skipStagger=true", () => {
    // We observe skipStagger indirectly: for a fake-agent task, after submitTask,
    // the launch queue entry should have skipStagger=true.
    // We verify this by checking that all N fire without the stagger delay.
    const N = 5;
    // Use a spy AgentRunner with overridden doLaunch to avoid real I/O
    const spyLog: Array<{ skipStagger: boolean }> = [];
    class SpyRunner extends AgentRunner {
      protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
        spyLog.push({ skipStagger });
        // Don't actually run the fn — we only care about the skipStagger value
      }
    }

    const spyRunner = new SpyRunner(
      { projectRoot: tempDir, config: makeConfig() },
      new DaemonState(tempDir)
    );

    const fakeTask = makeTask("fake-1", FAKE_AGENT_SENTINEL);
    spyRunner.submitTask(fakeTask);

    expect(spyLog.length).toBe(1);
    expect(spyLog[0].skipStagger).toBe(true);
  });

  test("3.3b: submitTask with real agent sets skipStagger=false", () => {
    const spyLog: Array<{ skipStagger: boolean }> = [];
    class SpyRunner extends AgentRunner {
      protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
        spyLog.push({ skipStagger });
      }
    }

    const spyRunner = new SpyRunner(
      { projectRoot: tempDir, config: makeConfig() },
      new DaemonState(tempDir)
    );

    const realTask = makeTask("real-1", "opencode");
    spyRunner.submitTask(realTask);

    expect(spyLog.length).toBe(1);
    expect(spyLog[0].skipStagger).toBe(false);
  });

  test("3.3c: submitTask with no agent name sets skipStagger=false", () => {
    const spyLog: Array<{ skipStagger: boolean }> = [];
    class SpyRunner extends AgentRunner {
      protected enqueueLaunch(fn: () => Promise<void>, skipStagger = false): void {
        spyLog.push({ skipStagger });
      }
    }

    const spyRunner = new SpyRunner(
      { projectRoot: tempDir, config: makeConfig() },
      new DaemonState(tempDir)
    );

    const noAgentTask = makeTask("no-agent-1");
    spyRunner.submitTask(noAgentTask);

    expect(spyLog.length).toBe(1);
    expect(spyLog[0].skipStagger).toBe(false);
  });
});
