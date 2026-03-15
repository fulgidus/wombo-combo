/**
 * profile-review.tsx — Section-by-section profile review Ink component.
 *
 * Walks through each of the 6 profile sections, showing formatted content.
 * The user reviews each section and can:
 *   - A: approve the current section and advance to the next
 *   - R: revise (enter inline edit mode for the current section)
 *   - B: go back to the previous section
 *   - Q/Esc: cancel the entire review
 *
 * When all 6 sections are approved, calls onApprove with the final profile.
 * If cancelled, calls onCancel.
 *
 * In revise mode, an inline FieldEditor is shown. On save, the section's
 * approval resets. On discard, returns to view mode.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import {
  PROFILE_SECTIONS,
  type ProfileSection,
  type ProjectProfile,
} from "../../lib/project-store";
import { TextInput } from "../text-input";
import {
  SECTION_NAMES,
  formatSectionForDisplay,
  serializeSectionForEdit,
  parseSectionEdit,
} from "./onboarding-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfileReviewProps {
  /** The profile to review (will be deep-cloned internally). */
  profile: ProjectProfile;
  /** Called when all sections are approved with the final profile. */
  onApprove: (approvedProfile: ProjectProfile) => void;
  /** Called when the user cancels the review. */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// ProfileReview
// ---------------------------------------------------------------------------

/**
 * ProfileReview — section-by-section review of the project profile.
 *
 * Displays each section's formatted content with approve/revise/back/cancel
 * keybinds. Tracks per-section approval status. When all sections are
 * approved, resolves with the (possibly edited) profile.
 */
export function ProfileReview({
  profile,
  onApprove,
  onCancel,
}: ProfileReviewProps): React.ReactElement {
  // Deep-clone the profile so edits are non-destructive until approved
  const [workingProfile, setWorkingProfile] = useState<ProjectProfile>(
    () => JSON.parse(JSON.stringify(profile)),
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [approvedSections, setApprovedSections] = useState<
    Record<ProfileSection, boolean>
  >({
    identity: false,
    vision: false,
    objectives: false,
    tech_stack: false,
    conventions: false,
    rules: false,
  });
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");

  const section = PROFILE_SECTIONS[currentIdx];
  const sectionName = SECTION_NAMES[section];
  const totalSections = PROFILE_SECTIONS.length;
  const approvedCount = Object.values(approvedSections).filter(Boolean).length;
  const isApproved = approvedSections[section];

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const advanceSection = useCallback(() => {
    if (currentIdx < totalSections - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // On last section — check if all approved
      const nextApproved = { ...approvedSections, [section]: true };
      if (Object.values(nextApproved).every(Boolean)) {
        onApprove(workingProfile);
      } else {
        // Find first unapproved section
        const firstUnapproved = PROFILE_SECTIONS.findIndex(
          (s) => !nextApproved[s],
        );
        if (firstUnapproved >= 0) {
          setCurrentIdx(firstUnapproved);
        }
      }
    }
  }, [currentIdx, totalSections, approvedSections, section, workingProfile, onApprove]);

  const goBack = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  }, [currentIdx]);

  // -------------------------------------------------------------------------
  // Edit mode
  // -------------------------------------------------------------------------

  const enterEditMode = useCallback(() => {
    const text = serializeSectionForEdit(section, workingProfile);
    setEditText(text);
    setEditMode(true);
  }, [section, workingProfile]);

  const saveEdit = useCallback(() => {
    const updatedProfile: ProjectProfile = JSON.parse(
      JSON.stringify(workingProfile),
    );
    const patch = parseSectionEdit(section, editText, updatedProfile);

    Object.assign(updatedProfile, patch);

    // Deep-merge for nested objects
    if (patch.tech_stack) {
      updatedProfile.tech_stack = {
        ...updatedProfile.tech_stack,
        ...patch.tech_stack,
      };
    }
    if (patch.conventions) {
      updatedProfile.conventions = {
        ...updatedProfile.conventions,
        ...patch.conventions,
      };
    }

    updatedProfile.updated_at = new Date().toISOString();
    setWorkingProfile(updatedProfile);

    // Reset approval for this section since content changed
    setApprovedSections((prev) => ({ ...prev, [section]: false }));
    setEditMode(false);
  }, [workingProfile, section, editText]);

  const discardEdit = useCallback(() => {
    setEditMode(false);
  }, []);

  // -------------------------------------------------------------------------
  // Input handling
  // -------------------------------------------------------------------------

  useInput(
    (input, key) => {
      if (editMode) return; // Edit mode handles its own input

      if (input === "a" || input === "A") {
        setApprovedSections((prev) => ({ ...prev, [section]: true }));
        advanceSection();
        return;
      }
      if (input === "r" || input === "R") {
        enterEditMode();
        return;
      }
      if (input === "b" || input === "B") {
        goBack();
        return;
      }
      if (input === "q" || input === "Q" || key.escape) {
        onCancel();
        return;
      }
    },
    { isActive: !editMode },
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (editMode) {
    return (
      <Box flexDirection="column" padding={1}>
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold>Profile Review</Text>
          <Text dimColor> | </Text>
          <Text color="magenta">EDITING</Text>
        </Box>

        <Box marginBottom={1}>
          <Text bold>
            Section {currentIdx + 1}/{totalSections} — {sectionName}
          </Text>
          <Text color="magenta"> ✎ Edit mode</Text>
        </Box>

        {/* Editor */}
        <Box flexDirection="column" marginBottom={1}>
          <TextInput
            value={editText}
            onChange={setEditText}
            onSubmit={saveEdit}
            multiline={true}
            focus={true}
          />
        </Box>

        {/* Key hints */}
        <Box>
          <Text dimColor>
            Ctrl+S save | Escape discard
          </Text>
        </Box>
      </Box>
    );
  }

  // View mode
  const displayContent = formatSectionForDisplay(section, workingProfile);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Profile Review</Text>
        <Text dimColor> | </Text>
        <Text color="green">{approvedCount}</Text>
        <Text dimColor>/{totalSections} approved</Text>
      </Box>

      {/* Section counter and name */}
      <Box marginBottom={1}>
        <Text bold>
          Section {currentIdx + 1}/{totalSections} — {sectionName}
        </Text>
        {isApproved ? (
          <Text color="green"> ✔ APPROVED</Text>
        ) : (
          <Text color="yellow"> ● PENDING</Text>
        )}
      </Box>

      {/* Section content */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginBottom={1}
      >
        <Text>{displayContent}</Text>
      </Box>

      {/* Key hints */}
      <Box>
        <Text color="green" bold>
          A
        </Text>
        <Text> approve  </Text>
        <Text color="magenta" bold>
          R
        </Text>
        <Text> revise  </Text>
        {currentIdx > 0 && (
          <>
            <Text color="cyan" bold>
              B
            </Text>
            <Text> back  </Text>
          </>
        )}
        <Text color="red" bold>
          Q
        </Text>
        <Text> cancel</Text>
      </Box>
    </Box>
  );
}
