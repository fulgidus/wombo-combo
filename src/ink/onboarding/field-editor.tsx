/**
 * field-editor.tsx — Single-section editor Ink component.
 *
 * Opens a text editor pre-populated with the serialized content of a
 * profile section. The user edits the text, then either saves (Ctrl+S)
 * or discards (Escape).
 *
 * On save, the edited text is parsed back into profile data and the
 * updated profile is passed to onSave.
 *
 * On discard, the original profile is returned unchanged via onDiscard.
 */

import React, { useState, useCallback } from "react";
import { Box, Text } from "ink";
import { TextInput } from "../text-input";
import { useChromeHideQuitHint } from "../chrome";
import {
  type ProfileSection,
  type ProjectProfile,
} from "../../lib/project-store";
import {
  serializeSectionForEdit,
  parseSectionEdit,
} from "./onboarding-utils";
import { useScreenInput } from "../esc-menu";
import { useI18n } from "../i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldEditorProps {
  /** The current project profile. */
  profile: ProjectProfile;
  /** Which section to edit. */
  section: ProfileSection;
  /** Called with the updated profile when the user saves (Ctrl+S). */
  onSave: (updatedProfile: ProjectProfile) => void;
  /** Called when the user discards changes (Escape). */
  onDiscard: () => void;
}

// ---------------------------------------------------------------------------
// FieldEditor
// ---------------------------------------------------------------------------

/**
 * FieldEditor — text editor for a single profile section.
 *
 * Pre-populates a multi-line TextInput with the serialized section content.
 * Ctrl+S parses the edited text, applies it to the profile, and calls onSave.
 * Escape discards changes and calls onDiscard.
 */
export function FieldEditor({
  profile,
  section,
  onSave,
  onDiscard,
}: FieldEditorProps): React.ReactElement {
  const t = useI18n();
  const sectionName = t(`onboarding.section.${section}`);
  const initialText = serializeSectionForEdit(section, profile);
  const [editText, setEditText] = useState(initialText);
  // Text field: q types a letter here, so don't advertise "q quit"
  useChromeHideQuitHint(true);

  const handleSave = useCallback(
    (value: string) => {
      // Deep-clone the profile so edits are non-destructive
      const workingProfile: ProjectProfile = JSON.parse(
        JSON.stringify(profile),
      );

      const patch = parseSectionEdit(section, value, workingProfile);

      // Apply patch
      Object.assign(workingProfile, patch);

      // Deep-merge for nested objects
      if (patch.tech_stack) {
        workingProfile.tech_stack = {
          ...workingProfile.tech_stack,
          ...patch.tech_stack,
        };
      }
      if (patch.conventions) {
        workingProfile.conventions = {
          ...workingProfile.conventions,
          ...patch.conventions,
        };
      }

      workingProfile.updated_at = new Date().toISOString();

      onSave(workingProfile);
    },
    [profile, section, onSave],
  );

  useScreenInput((_input, key) => {
    if (key.escape) {
      onDiscard();
      return;
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="magenta">
          {t("onboarding.fieldEditor.title")}
        </Text>
        <Text> — </Text>
        <Text bold>{sectionName}</Text>
      </Box>

      {/* Edit mode indicator */}
      <Box marginBottom={1}>
        <Text dimColor>{t("onboarding.fieldEditor.editMode")}</Text>
      </Box>

      {/* Editor area */}
      <Box flexDirection="column" marginBottom={1}>
        <TextInput
          value={editText}
          onChange={setEditText}
          onSubmit={handleSave}
          multiline={true}
          focus={true}
        />
      </Box>

      {/* Key hints */}
      <Box>
        <Text bold color="green">
          Ctrl+S
        </Text>
        <Text>{` ${t("onboarding.fieldEditor.save")}  |  `}</Text>
        <Text bold color="red">
          Escape
        </Text>
        <Text>{` ${t("onboarding.fieldEditor.discard")}`}</Text>
      </Box>
    </Box>
  );
}
