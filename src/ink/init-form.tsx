/**
 * init-form.tsx — Ink confirmation screen for `woco init`.
 *
 * Replaces the 20+ prompt interactive wizard with a minimal Ink form.
 * Shows auto-detected defaults in a confirmation screen with 3 editable
 * fields (baseBranch, buildCommand, installCommand).
 *
 * Navigation:
 *   - Tab / Up / Down to move between fields
 *   - Type to edit a field
 *   - Enter to confirm and write files
 *   - Escape to cancel
 *
 * The form uses the existing TextInput component from ink-input-system.
 */

import React, { useState, useCallback } from "react";
import { Box, Text } from "ink";
import { useScreenInput } from "./esc-menu";
import { getLocaleT, useI18n } from "./i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InitFormDefaults {
  baseBranch: string;
  buildCommand: string;
  installCommand: string;
}

export interface InitFormProps {
  /** Project name (auto-detected from folder). */
  projectName: string;
  /** Auto-detected default values. */
  defaults: InitFormDefaults;
  /** Called when the user confirms. Receives the final values. */
  onConfirm: (values: InitFormDefaults) => void;
  /** Called when the user cancels (Escape). */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

export interface FieldDef {
  key: keyof InitFormDefaults;
  /** English label, kept for backward compatibility; the form renders `labelKey`. */
  label: string;
  /** Locale key of the label shown in the form. */
  labelKey: string;
}

const enT = getLocaleT("en");

function fieldDef(key: keyof InitFormDefaults, labelKey: string): FieldDef {
  return { key, label: enT(labelKey), labelKey };
}

export const FIELDS: FieldDef[] = [
  fieldDef("baseBranch", "init.field.baseBranch"),
  fieldDef("buildCommand", "init.field.buildCommand"),
  fieldDef("installCommand", "init.field.installCommand"),
];

// ---------------------------------------------------------------------------
// EditableField — a single form row
// ---------------------------------------------------------------------------

interface EditableFieldProps {
  label: string;
  value: string;
  focused: boolean;
}

function EditableField({ label, value, focused }: EditableFieldProps): React.ReactElement {
  // When focused, we render a simple inline text input
  // For renderToString compatibility, we render the value directly
  return (
    <Box>
      <Box width={20}>
        <Text bold={focused} color={focused ? "cyan" : undefined}>
          {focused ? "▸ " : "  "}
          {label}:
        </Text>
      </Box>
      <Box>
        {focused ? (
          <Text inverse>{value || " "}</Text>
        ) : (
          <Text>{value}</Text>
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// InitForm — the confirmation screen component
// ---------------------------------------------------------------------------

/**
 * InitForm — minimal Ink form for project initialization.
 *
 * Shows auto-detected project settings with 3 editable fields.
 * Uses Tab/arrows to navigate, Enter to confirm, Escape to cancel.
 */
export function InitForm({
  projectName,
  defaults,
  onConfirm,
  onCancel,
}: InitFormProps): React.ReactElement {
  const t = useI18n();
  const [values, setValues] = useState<InitFormDefaults>({ ...defaults });
  const [focusedField, setFocusedField] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState("");

  const handleConfirm = useCallback(() => {
    // If editing, merge the edit buffer into values before confirming.
    // We compute finalValues inline because setValues is async and the
    // state update won't have applied when onConfirm runs.
    let finalValues = values;
    if (editing) {
      const field = FIELDS[focusedField];
      finalValues = { ...values, [field.key]: editBuffer };
      setValues(finalValues);
      setEditing(false);
    }
    onConfirm(finalValues);
  }, [values, onConfirm, editing, editBuffer, focusedField]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  useScreenInput((input, key) => {
    if (editing) {
      // In edit mode
      if (key.escape) {
        // Cancel edit, restore original value
        setEditing(false);
        return;
      }
      if (key.return) {
        // Apply edit
        const field = FIELDS[focusedField];
        const newValues = { ...values, [field.key]: editBuffer };
        setValues(newValues);
        setEditing(false);
        return;
      }
      // Ctrl+S — confirm directly from edit mode
      if (key.ctrl && input === "s") {
        handleConfirm();
        return;
      }
      if (key.backspace || key.delete) {
        setEditBuffer((prev) => prev.slice(0, -1));
        return;
      }
      if (!key.ctrl && !key.meta && input && input.length > 0) {
        setEditBuffer((prev) => prev + input);
        return;
      }
      return;
    }

    // Normal navigation mode
    if (key.escape) {
      handleCancel();
      return;
    }

    if (key.return) {
      // Start editing the focused field
      const field = FIELDS[focusedField];
      setEditBuffer(values[field.key]);
      setEditing(true);
      return;
    }

    // Tab or Down — move to next field
    if (key.tab || key.downArrow) {
      setFocusedField((prev) => Math.min(prev + 1, FIELDS.length - 1));
      return;
    }

    // Shift+Tab or Up — move to previous field
    if (key.upArrow) {
      setFocusedField((prev) => Math.max(prev - 1, 0));
      return;
    }

    // Ctrl+S or Enter while at the end — confirm
    if (key.ctrl && input === "s") {
      handleConfirm();
      return;
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          wombo-combo
        </Text>
        <Text> {t("init.setup")}</Text>
      </Box>

      {/* Project info (auto-detected, read-only) */}
      <Box marginBottom={1}>
        <Text dimColor>{t("init.project")}</Text>
        <Text bold>{projectName}</Text>
        <Text dimColor>{t("init.autoDetected")}</Text>
      </Box>

      {/* Editable fields */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text dimColor>{t("init.settings")}</Text>
        </Box>
        {FIELDS.map((field, idx) => (
          <EditableField
            key={field.key}
            label={t(field.labelKey)}
            value={
              editing && idx === focusedField
                ? editBuffer
                : values[field.key]
            }
            focused={idx === focusedField}
          />
        ))}
      </Box>

      {/* Key hints */}
      <Box>
        <Text dimColor>
          {editing
            ? t("init.hint.editing")
            : t("init.hint.browsing")}
        </Text>
      </Box>
    </Box>
  );
}
