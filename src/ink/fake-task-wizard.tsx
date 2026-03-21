/**
 * fake-task-wizard.tsx — Pop-up wizard for generating fake tasks.
 *
 * Shown when the user presses F in the quest picker (devMode only).
 * Three fields, cycled with Tab:
 *   1. Task count   — ← / → to adjust
 *   2. Workflow     — ← / → to cycle topology
 *   3. Quest name   — free text; empty → errands (no quest)
 *
 * Ctrl+S or Enter (on the name field) confirms; Escape cancels.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { Modal } from "./modal";
import { TextInput } from "./text-input";
import { useTextInput } from "./use-text-input";
import type { Task } from "../lib/tasks";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type WorkflowKind = "flat" | "chain" | "branching" | "diamond" | "random";

export interface FakeTaskConfig {
  count: number;
  workflow: WorkflowKind;
  questName: string; // empty = errands (no quest)
}

const WORKFLOWS: WorkflowKind[] = ["flat", "chain", "branching", "diamond", "random"];

const WORKFLOW_LABELS: Record<WorkflowKind, string> = {
  flat:      "flat       (independent tasks, no deps)",
  chain:     "chain      (A→B→C→D linear sequence)",
  branching: "branching  (root fans out to leaves)",
  diamond:   "diamond    (fork–join: A→B,C→D)",
  random:    "random DAG (randomly wired dependencies)",
};

const WORKFLOW_DESCRIPTIONS: Record<WorkflowKind, string> = {
  flat:      "All tasks are independent.",
  chain:     "Each task depends on the previous one.",
  branching: "One root fans out to all others.",
  diamond:   "Tasks fan out then converge on a sink.",
  random:    "Random deps across tasks (~30% density).",
};

const COUNT_MIN = 1;
const COUNT_MAX = 100;

// ---------------------------------------------------------------------------
// Fake task name pool
// ---------------------------------------------------------------------------

const TASK_TITLE_POOL = [
  "Refactor authentication module",
  "Add unit tests for parser",
  "Update dependency versions",
  "Implement caching layer",
  "Fix memory leak in worker",
  "Write API documentation",
  "Optimize database queries",
  "Add error handling middleware",
  "Create deployment script",
  "Review security vulnerabilities",
  "Implement feature flag system",
  "Clean up unused imports",
  "Add structured logging",
  "Setup CI pipeline",
  "Migrate to new schema",
  "Implement rate limiting",
  "Add telemetry hooks",
  "Refactor routing logic",
  "Update test fixtures",
  "Fix flaky integration test",
  "Add pagination support",
  "Implement retry logic",
  "Extract shared utilities",
  "Add health check endpoint",
  "Profile and optimise hot path",
];

// ---------------------------------------------------------------------------
// Task generation
// ---------------------------------------------------------------------------

/** Build a depends_on list for task at index `i` given `n` total tasks. */
function buildDeps(i: number, n: number, kind: WorkflowKind): string[] {
  return []; // resolved after all IDs are known
}

/** Generate fake Task objects for the given config. */
export function generateFakeTasks(cfg: FakeTaskConfig): Task[] {
  const { count, workflow, questName } = cfg;
  const slug = questName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "errand";
  const ts = Date.now();

  // Build IDs first so deps can reference them
  const ids = Array.from({ length: count }, (_, i) => `fake-${slug}-${i + 1}-${(ts + i).toString(36)}`);

  const titles = shuffledTitles(count);
  const sleepBase = { flat: 600, chain: 800, branching: 500, diamond: 900, random: 700 }[workflow];

  const tasks: Task[] = ids.map((id, i) => ({
    id,
    title: titles[i],
    description: `FAKE_SLEEP_MS=${sleepBase + Math.floor(Math.random() * 400)} ${WORKFLOW_DESCRIPTIONS[workflow]}`,
    status: "backlog" as const,
    completion: 0,
    difficulty: (["trivial", "easy", "medium", "medium", "hard"] as const)[Math.floor(Math.random() * 5)],
    priority: (["low", "medium", "medium", "high"] as const)[Math.floor(Math.random() * 4)],
    depends_on: [],
    effort: `PT${15 + Math.floor(Math.random() * 45)}M`,
    started_at: null,
    ended_at: null,
    constraints: [],
    forbidden: [],
    references: [],
    notes: [],
    subtasks: [],
    agent: "fake-agent",
    ...(questName.trim() ? { quest: slug } : {}),
  }));

  // Wire dependencies by topology
  switch (workflow) {
    case "chain":
      // T[i] depends on T[i-1]
      for (let i = 1; i < count; i++) tasks[i].depends_on = [ids[i - 1]];
      break;

    case "branching":
      // T[0] is root; all others depend on T[0]
      for (let i = 1; i < count; i++) tasks[i].depends_on = [ids[0]];
      break;

    case "diamond": {
      // T[0] = source → middle group → T[last] = sink
      if (count >= 3) {
        const sink = count - 1;
        const midStart = 1;
        const midEnd = sink; // exclusive
        // middle tasks depend on T[0]
        for (let i = midStart; i < midEnd; i++) tasks[i].depends_on = [ids[0]];
        // sink depends on all middle tasks
        tasks[sink].depends_on = ids.slice(midStart, midEnd);
      } else if (count === 2) {
        tasks[1].depends_on = [ids[0]];
      }
      break;
    }

    case "random": {
      // For each task i > 0, pick 0-2 random predecessors from [0..i-1]
      for (let i = 1; i < count; i++) {
        const candidates = ids.slice(0, i);
        const k = Math.min(candidates.length, Math.random() < 0.3 ? 0 : Math.random() < 0.6 ? 1 : 2);
        if (k === 0) continue;
        const chosen = shuffleArr([...candidates]).slice(0, k);
        tasks[i].depends_on = chosen;
      }
      break;
    }

    case "flat":
    default:
      // no deps
      break;
  }

  return tasks;
}

function shuffledTitles(n: number): string[] {
  const pool = shuffleArr([...TASK_TITLE_POOL]);
  const result: string[] = [];
  for (let i = 0; i < n; i++) result.push(pool[i % pool.length] + (i >= pool.length ? ` (${Math.floor(i / pool.length) + 1})` : ""));
  return result;
}

function shuffleArr<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Wizard component
// ---------------------------------------------------------------------------

type Field = 0 | 1 | 2; // count | workflow | questName

export interface FakeTaskWizardProps {
  onConfirm: (cfg: FakeTaskConfig) => void;
  onCancel: () => void;
}

export function FakeTaskWizard({ onConfirm, onCancel }: FakeTaskWizardProps): React.ReactElement {
  const [focused, setFocused] = useState<Field>(0);
  const [count, setCount] = useState(5);
  const [workflowIdx, setWorkflowIdx] = useState(0);
  const questInput = useTextInput({ initialValue: "" });

  const workflow = WORKFLOWS[workflowIdx];

  const handleConfirm = useCallback(() => {
    onConfirm({ count, workflow, questName: questInput.value });
  }, [count, workflow, questInput.value, onConfirm]);

  useInput((input, key) => {
    // Cancel
    if (key.escape) { onCancel(); return; }

    // Confirm
    if (key.ctrl && input === "s") { handleConfirm(); return; }

    // Tab / Shift+Tab cycle fields
    if (key.tab) {
      setFocused((f) => ((f + (key.shift ? -1 : 1) + 3) % 3) as Field);
      return;
    }
    if (key.upArrow) { setFocused((f) => ((f - 1 + 3) % 3) as Field); return; }
    if (key.downArrow && focused !== 2) { setFocused((f) => ((f + 1) % 3) as Field); return; }

    // Field-specific controls
    if (focused === 0) {
      if (key.leftArrow || input === "-") setCount((c) => Math.max(COUNT_MIN, c - 1));
      if (key.rightArrow || input === "+" || input === "=") setCount((c) => Math.min(COUNT_MAX, c + 1));
    }
    if (focused === 1) {
      if (key.leftArrow) setWorkflowIdx((i) => (i - 1 + WORKFLOWS.length) % WORKFLOWS.length);
      if (key.rightArrow || input === " ") setWorkflowIdx((i) => (i + 1) % WORKFLOWS.length);
    }
    // focused === 2 → text input handles its own keys
  });

  const fieldColor = (f: Field) => (focused === f ? "cyan" : "gray");

  return (
    <Box width={62}>
        <Modal
          title="⚡ Fake Task Generator"
          borderColor="yellow"
          footer={
            <Box flexDirection="row" gap={2}>
              <Text dimColor>Tab</Text><Text> next field</Text>
              <Text dimColor>  ← →</Text><Text> adjust</Text>
              <Text dimColor>  Ctrl+S</Text><Text> confirm</Text>
              <Text dimColor>  ESC</Text><Text> cancel</Text>
            </Box>
          }
        >
          {/* Task count */}
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={fieldColor(0)} bold={focused === 0}>Tasks:</Text>
            <Text color={focused === 0 ? "yellow" : "gray"}>←</Text>
            <Text bold color={focused === 0 ? "white" : undefined}> {String(count).padStart(2)} </Text>
            <Text color={focused === 0 ? "yellow" : "gray"}>→</Text>
            <Text dimColor>  (1–{COUNT_MAX})</Text>
          </Box>

          {/* Workflow */}
          <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="row" gap={1}>
              <Text color={fieldColor(1)} bold={focused === 1}>Workflow:</Text>
              <Text color={focused === 1 ? "yellow" : "gray"}>←</Text>
              <Text bold color={focused === 1 ? "white" : undefined}> {workflow} </Text>
              <Text color={focused === 1 ? "yellow" : "gray"}>→</Text>
            </Box>
            <Text dimColor>  {WORKFLOW_DESCRIPTIONS[workflow]}</Text>
          </Box>

          {/* Quest name */}
          <Box flexDirection="column">
            <Text color={fieldColor(2)} bold={focused === 2}>Quest name:</Text>
            <Box
              borderStyle="round"
              borderColor={focused === 2 ? "cyan" : "gray"}
              paddingX={1}
              width={54}
            >
              <TextInput
                value={questInput.value}
                onChange={questInput.onChange}
                onSubmit={handleConfirm}
                placeholder="(empty → create as errands)"
                focus={focused === 2}
              />
            </Box>
          </Box>
        </Modal>
    </Box>
  );
}
