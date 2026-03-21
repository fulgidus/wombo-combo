/**
 * task-editor.tsx — Pop-up editor for modifying an existing task.
 *
 * Fields (Tab / ↑↓ to navigate):
 *   0. Title        — free text
 *   1. Description  — free text
 *   2. Status       — ← / → cycle
 *   3. Priority     — ← / → cycle
 *   4. Effort       — free text (ISO 8601 duration, e.g. PT2H)
 *   5. Notes        — free text; Enter appends a note
 *
 * Ctrl+S confirms; Escape cancels without saving.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { Modal } from "./modal";
import { TextInput } from "./text-input";
import { useTextInput } from "./use-text-input";
import type { Task, TaskStatus, Priority } from "../lib/tasks";
import { VALID_STATUSES, VALID_PRIORITIES } from "../lib/task-schema";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TaskEditorProps {
  task: Task;
  onConfirm: (updated: Task) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Field order
// ---------------------------------------------------------------------------

type Field = 0 | 1 | 2 | 3 | 4 | 5;
const FIELD_COUNT = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cycleIdx<T>(arr: readonly T[], current: T, delta: number): number {
  const idx = arr.indexOf(current);
  if (idx < 0) return 0;
  return (idx + delta + arr.length) % arr.length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskEditor({ task, onConfirm, onCancel }: TaskEditorProps): React.ReactElement {
  const [focused, setFocused] = useState<Field>(0);

  // Text fields
  const titleInput = useTextInput({ initialValue: task.title });
  const descInput = useTextInput({ initialValue: task.description ?? "" });
  const effortInput = useTextInput({ initialValue: task.effort ?? "" });
  const noteInput = useTextInput({ initialValue: "" });

  // Enum fields
  const [statusIdx, setStatusIdx] = useState(() => {
    const i = VALID_STATUSES.indexOf(task.status);
    return i >= 0 ? i : 0;
  });
  const [priorityIdx, setPriorityIdx] = useState(() => {
    const i = VALID_PRIORITIES.indexOf(task.priority);
    return i >= 0 ? i : 2; // default medium
  });

  const handleConfirm = useCallback(() => {
    const updated: Task = {
      ...task,
      title: titleInput.value.trim() || task.title,
      description: descInput.value,
      status: VALID_STATUSES[statusIdx] as TaskStatus,
      priority: VALID_PRIORITIES[priorityIdx] as Priority,
      effort: effortInput.value.trim() || task.effort,
      notes: noteInput.value.trim()
        ? [...(task.notes ?? []), noteInput.value.trim()]
        : task.notes,
    };
    onConfirm(updated);
  }, [task, titleInput.value, descInput.value, statusIdx, priorityIdx, effortInput.value, noteInput.value, onConfirm]);

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }
    if (key.ctrl && input === "s") { handleConfirm(); return; }

    // Tab / Shift+Tab / ↑↓ to cycle fields
    if (key.tab) {
      setFocused((f) => ((f + (key.shift ? -1 : 1) + FIELD_COUNT) % FIELD_COUNT) as Field);
      return;
    }
    if (key.upArrow) { setFocused((f) => ((f - 1 + FIELD_COUNT) % FIELD_COUNT) as Field); return; }
    if (key.downArrow && focused !== 5) { setFocused((f) => ((f + 1) % FIELD_COUNT) as Field); return; }

    // Enum field controls
    if (focused === 2) {
      if (key.leftArrow)  { setStatusIdx((i) => cycleIdx(VALID_STATUSES, VALID_STATUSES[i], -1)); return; }
      if (key.rightArrow) { setStatusIdx((i) => cycleIdx(VALID_STATUSES, VALID_STATUSES[i],  1)); return; }
    }
    if (focused === 3) {
      if (key.leftArrow)  { setPriorityIdx((i) => cycleIdx(VALID_PRIORITIES, VALID_PRIORITIES[i], -1)); return; }
      if (key.rightArrow) { setPriorityIdx((i) => cycleIdx(VALID_PRIORITIES, VALID_PRIORITIES[i],  1)); return; }
    }
  });

  const fc = (f: Field) => (focused === f ? "cyan" : "gray");

  const STATUS_COLORS: Record<string, string> = {
    backlog: "gray", planned: "cyan", in_progress: "yellow",
    blocked: "red", in_review: "magenta", done: "green", cancelled: "gray",
  };
  const PRIORITY_COLORS: Record<string, string> = {
    critical: "red", high: "yellow", medium: "white", low: "gray", wishlist: "blue",
  };

  const currentStatus = VALID_STATUSES[statusIdx];
  const currentPriority = VALID_PRIORITIES[priorityIdx];

  return (
    <Box width={70}>
      <Modal
          title="✏  Edit Task"
          borderColor="cyan"
          footer={
            <Box flexDirection="row" gap={2}>
              <Text dimColor>Tab</Text><Text> next field</Text>
              <Text dimColor>  ← →</Text><Text> cycle enum</Text>
              <Text dimColor>  Ctrl+S</Text><Text> save</Text>
              <Text dimColor>  ESC</Text><Text> cancel</Text>
            </Box>
          }
        >
          {/* ID (read-only) */}
          <Box marginBottom={1}>
            <Text dimColor>id  </Text>
            <Text dimColor>{task.id}</Text>
          </Box>

          {/* Title */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color={fc(0)} bold={focused === 0}>Title</Text>
            <Box borderStyle="round" borderColor={focused === 0 ? "cyan" : "gray"} paddingX={1} width={62}>
              <TextInput
                value={titleInput.value}
                onChange={titleInput.onChange}
                onSubmit={() => setFocused(1)}
                focus={focused === 0}
              />
            </Box>
          </Box>

          {/* Description */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color={fc(1)} bold={focused === 1}>Description</Text>
            <Box borderStyle="round" borderColor={focused === 1 ? "cyan" : "gray"} paddingX={1} width={62}>
              <TextInput
                value={descInput.value}
                onChange={descInput.onChange}
                onSubmit={() => setFocused(2)}
                focus={focused === 1}
              />
            </Box>
          </Box>

          {/* Status */}
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={fc(2)} bold={focused === 2}>Status:</Text>
            <Text color={focused === 2 ? "yellow" : "gray"}>←</Text>
            <Text bold color={STATUS_COLORS[currentStatus] ?? "white"}> {currentStatus} </Text>
            <Text color={focused === 2 ? "yellow" : "gray"}>→</Text>
          </Box>

          {/* Priority */}
          <Box flexDirection="row" gap={1} marginBottom={1}>
            <Text color={fc(3)} bold={focused === 3}>Priority:</Text>
            <Text color={focused === 3 ? "yellow" : "gray"}>←</Text>
            <Text bold color={PRIORITY_COLORS[currentPriority] ?? "white"}> {currentPriority} </Text>
            <Text color={focused === 3 ? "yellow" : "gray"}>→</Text>
          </Box>

          {/* Effort */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color={fc(4)} bold={focused === 4}>Effort <Text dimColor>(ISO 8601, e.g. PT2H PT30M)</Text></Text>
            <Box borderStyle="round" borderColor={focused === 4 ? "cyan" : "gray"} paddingX={1} width={40}>
              <TextInput
                value={effortInput.value}
                onChange={effortInput.onChange}
                onSubmit={() => setFocused(5)}
                focus={focused === 4}
              />
            </Box>
          </Box>

          {/* Notes — append a note */}
          <Box flexDirection="column">
            <Text color={fc(5)} bold={focused === 5}>
              Add note <Text dimColor>({task.notes?.length ?? 0} existing)</Text>
            </Text>
            <Box borderStyle="round" borderColor={focused === 5 ? "cyan" : "gray"} paddingX={1} width={62}>
              <TextInput
                value={noteInput.value}
                onChange={noteInput.onChange}
                onSubmit={handleConfirm}
                placeholder="(leave empty to skip)"
                focus={focused === 5}
              />
            </Box>
          </Box>
      </Modal>
    </Box>
  );
}
