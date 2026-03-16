/**
 * errand-wizard.tsx — Multi-step Errand Wizard Ink component.
 *
 * Replaces the duplicated `showErrandWizard()` / `showErrandModal()` blessed
 * modals from tui-quest-picker.ts and tui-browser.ts with a single reusable
 * React component.
 *
 * 4-step wizard:
 *   1. Description (required, single-line)
 *   2. Scope (optional, multi-line)
 *   3. Objectives (optional, multi-line)
 *   4. Review & confirm
 *
 * Props-driven: parent manages visibility, component calls onSubmit/onCancel.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { Modal } from "./modal";
import { TextInput } from "./text-input";
import type { ErrandSpec } from "../lib/errand-planner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ErrandWizardStep = "description" | "scope" | "objectives" | "review";

const STEPS: ErrandWizardStep[] = ["description", "scope", "objectives", "review"];

export interface ErrandWizardProps {
  /** Called with the completed ErrandSpec when user confirms on the review step. */
  onSubmit: (spec: ErrandSpec) => void;
  /** Called when user cancels (Esc on the first step). */
  onCancel: () => void;
  /** Whether the component is focused. Default: true. */
  focus?: boolean;
}

// ---------------------------------------------------------------------------
// Step Labels
// ---------------------------------------------------------------------------

const STEP_TITLES: Record<ErrandWizardStep, string> = {
  description: "Description",
  scope: "Scope",
  objectives: "Objectives",
  review: "Review",
};

const STEP_INSTRUCTIONS: Record<ErrandWizardStep, string> = {
  description: "What needs to be done? (required)",
  scope: "What areas/files should this focus on? (optional — Enter to skip)",
  objectives: "Key objectives or acceptance criteria (optional — Enter to skip)",
  review: "Review your errand details below.",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ErrandWizard({
  onSubmit,
  onCancel,
  focus = true,
}: ErrandWizardProps): React.ReactElement {
  const [stepIndex, setStepIndex] = useState(0);
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [objectives, setObjectives] = useState("");
  const [error, setError] = useState("");

  const step = STEPS[stepIndex];
  const stepLabel = `Step ${stepIndex + 1}/${STEPS.length}`;

  const goBack = useCallback(() => {
    setError("");
    if (stepIndex <= 0) {
      onCancel();
      return;
    }
    setStepIndex((prev) => prev - 1);
  }, [stepIndex, onCancel]);

  const advance = useCallback(() => {
    setError("");
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const handleDescriptionSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setError("Description cannot be empty");
        return;
      }
      setDescription(trimmed);
      advance();
    },
    [advance],
  );

  const handleScopeSubmit = useCallback(
    (value: string) => {
      setScope(value.trim());
      advance();
    },
    [advance],
  );

  const handleObjectivesSubmit = useCallback(
    (value: string) => {
      setObjectives(value.trim());
      advance();
    },
    [advance],
  );

  // Escape key handler for text input steps (TextInput ignores Escape)
  useInput(
    (_input, key) => {
      if (key.escape && step !== "review") {
        goBack();
      }
    },
    { isActive: focus && step !== "review" },
  );

  // Review step keybindings
  useInput(
    (_input, key) => {
      if (key.return) {
        const spec: ErrandSpec = { description };
        if (scope) spec.scope = scope;
        if (objectives) spec.objectives = objectives;
        onSubmit(spec);
        return;
      }
      if (key.escape) {
        goBack();
        return;
      }
    },
    { isActive: focus && step === "review" },
  );

  // Footer keybind hints
  const footerHint =
    step === "description"
      ? "Ctrl+S: next  |  Esc: cancel"
      : step === "review"
        ? "Enter: launch errand planner  |  Esc: go back"
        : "Ctrl+S: next  |  Esc: go back";

  return (
    <Modal title="New Errand" borderColor="magenta" footer={<Text dimColor>{footerHint}</Text>}>
      {/* Step header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>
          {stepLabel} — {STEP_TITLES[step]}
        </Text>
        <Text color="cyan">{STEP_INSTRUCTIONS[step]}</Text>
      </Box>

      {/* Error message */}
      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* Step content */}
      {step === "description" && (
        <TextInput
          value={description}
          onChange={setDescription}
          onSubmit={handleDescriptionSubmit}
          placeholder="Describe what needs to be done..."
          focus={focus}
        />
      )}

      {step === "scope" && (
        <TextInput
          value={scope}
          onChange={setScope}
          onSubmit={handleScopeSubmit}
          placeholder="Areas/files to focus on (optional)..."
          focus={focus}
        />
      )}

      {step === "objectives" && (
        <TextInput
          value={objectives}
          onChange={setObjectives}
          onSubmit={handleObjectivesSubmit}
          placeholder="Objectives or acceptance criteria (optional)..."
          focus={focus}
        />
      )}

      {step === "review" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color="magenta">
              Description:
            </Text>
          </Box>
          <Box marginBottom={1} marginLeft={2}>
            <Text>{description}</Text>
          </Box>

          <Box marginBottom={1}>
            <Text bold color="cyan">
              Scope:
            </Text>
          </Box>
          <Box marginBottom={1} marginLeft={2}>
            <Text dimColor={!scope}>{scope || "(none)"}</Text>
          </Box>

          <Box marginBottom={1}>
            <Text bold color="cyan">
              Objectives:
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text dimColor={!objectives}>{objectives || "(none)"}</Text>
          </Box>
        </Box>
      )}
    </Modal>
  );
}
