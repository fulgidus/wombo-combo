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
import { Box, Text, useInput } from "ink";
import { TextInput } from "../text-input";
import {
  type ProfileSection,
  type ProjectProfile,
} from "../../lib/project-store";
import {
  SECTION_NAMES,
  serializeSectionForEdit,
  parseSectionEdit,
} from "./onboarding-utils";

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
  const sectionName = SECTION_NAMES[section];
  const initialText = serializeSectionForEdit(section, profile);
  const [editText, setEditText] = useState(initialText);

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

  useInput((_input, key) => {
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
          Edit Section
        </Text>
        <Text> — </Text>
        <Text bold>{sectionName}</Text>
      </Box>

      {/* Edit mode indicator */}
      <Box marginBottom={1}>
        <Text dimColor>Edit mode — modify the content below</Text>
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
        <Text> save  |  </Text>
        <Text bold color="red">
          Escape
        </Text>
        <Text> discard</Text>
      </Box>
    </Box>
  );
}
