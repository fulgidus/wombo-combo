/**
 * errand-wizard.tsx — Multi-step Errand Wizard Ink component.
 *
 * Single reusable React component for the errand wizard.
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
import { Box, Text } from "ink";
import { Modal } from "./modal";
import { TextInput } from "./text-input";
import type { ErrandSpec } from "../lib/errand-planner";
import { useScreenInput } from "./esc-menu";
import { useI18n } from "./i18n";

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
// Component
// ---------------------------------------------------------------------------

export function ErrandWizard({
  onSubmit,
  onCancel,
  focus = true,
}: ErrandWizardProps): React.ReactElement {
  const t = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [objectives, setObjectives] = useState("");
  const [error, setError] = useState("");

  const step = STEPS[stepIndex];
  const stepNo = { current: stepIndex + 1, total: STEPS.length };

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
        setError(t("errandWizard.error.descriptionEmpty"));
        return;
      }
      setDescription(trimmed);
      advance();
    },
    [advance, t],
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
  useScreenInput(
    (_input, key) => {
      if (key.escape && step !== "review") {
        goBack();
      }
    },
    { isActive: focus && step !== "review" },
  );

  // Review step keybindings
  useScreenInput(
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
      ? t("errandWizard.footer.first")
      : step === "review"
        ? t("errandWizard.footer.review")
        : t("errandWizard.footer.step");

  return (
    <Modal title={t("errandWizard.title")} borderColor="magenta" footer={<Text dimColor>{footerHint}</Text>}>
      {/* Step header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>
          {t(`errandWizard.stepTitle.${step}`, stepNo)}
        </Text>
        <Text color="cyan">{t(`errandWizard.instruction.${step}`)}</Text>
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
          placeholder={t("errandWizard.placeholder.description")}
          focus={focus}
        />
      )}

      {step === "scope" && (
        <TextInput
          value={scope}
          onChange={setScope}
          onSubmit={handleScopeSubmit}
          placeholder={t("errandWizard.placeholder.scope")}
          focus={focus}
        />
      )}

      {step === "objectives" && (
        <TextInput
          value={objectives}
          onChange={setObjectives}
          onSubmit={handleObjectivesSubmit}
          placeholder={t("errandWizard.placeholder.objectives")}
          focus={focus}
        />
      )}

      {step === "review" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color="magenta">
              {t("errandWizard.review.description")}
            </Text>
          </Box>
          <Box marginBottom={1} marginLeft={2}>
            <Text>{description}</Text>
          </Box>

          <Box marginBottom={1}>
            <Text bold color="cyan">
              {t("errandWizard.review.scope")}
            </Text>
          </Box>
          <Box marginBottom={1} marginLeft={2}>
            <Text dimColor={!scope}>{scope || t("errandWizard.review.none")}</Text>
          </Box>

          <Box marginBottom={1}>
            <Text bold color="cyan">
              {t("errandWizard.review.objectives")}
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text dimColor={!objectives}>{objectives || t("errandWizard.review.none")}</Text>
          </Box>
        </Box>
      )}
    </Modal>
  );
}
