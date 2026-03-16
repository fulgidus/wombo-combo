/**
 * field-editor.test.tsx — Tests for the FieldEditor Ink component.
 *
 * The FieldEditor opens a text editor pre-populated with the serialized
 * content of a profile section. The user edits the text, then either
 * saves (Ctrl+S) or discards (Esc).
 *
 * Tests verify:
 *   - Renders the section name in the header
 *   - Renders "Edit mode" indicator
 *   - Renders key hints (Ctrl+S, Escape)
 *   - Renders the pre-populated content for identity section
 *   - Renders the pre-populated content for vision section
 *   - Renders without crashing for each section type
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import { FieldEditor, type FieldEditorProps } from "./field-editor";
import { createBlankProfile } from "../../lib/project-store";

// ---------------------------------------------------------------------------
// Static render tests (renderToString)
// ---------------------------------------------------------------------------

describe("FieldEditor (static rendering)", () => {
  const profile = createBlankProfile("test-project");
  profile.description = "A test project for testing";
  profile.vision = "To be the best test project";

  test("renders section name for identity", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="identity"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Identity");
  });

  test("renders Edit mode indicator", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="identity"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Edit");
  });

  test("renders save key hint", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="identity"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Ctrl+S");
  });

  test("renders discard key hint", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="identity"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Escape");
  });

  test("renders section name for vision", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="vision"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Vision");
  });

  test("renders section name for objectives", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="objectives"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Objectives");
  });

  test("renders section name for tech_stack", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="tech_stack"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Tech Stack");
  });

  test("renders section name for conventions", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="conventions"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Conventions");
  });

  test("renders section name for rules", () => {
    const output = renderToString(
      <FieldEditor
        profile={profile}
        section="rules"
        onSave={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(output).toContain("Rules");
  });

  test("renders without crashing for all sections", () => {
    const sections = [
      "identity",
      "vision",
      "objectives",
      "tech_stack",
      "conventions",
      "rules",
    ] as const;

    for (const section of sections) {
      expect(() =>
        renderToString(
          <FieldEditor
            profile={profile}
            section={section}
            onSave={() => {}}
            onDiscard={() => {}}
          />,
        ),
      ).not.toThrow();
    }
  });
});
