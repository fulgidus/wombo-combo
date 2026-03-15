/**
 * profile-review.test.tsx — Tests for the ProfileReview Ink component.
 *
 * The ProfileReview walks through each of the 6 profile sections,
 * showing formatted section content. The user can:
 *   - A: approve the current section and advance
 *   - R: revise (enter edit mode)
 *   - B: go back to previous section
 *   - Q/Esc: cancel the review
 *
 * Tests verify:
 *   - Renders "Profile Review" header
 *   - Renders section counter (e.g. "Section 1/6")
 *   - Renders the first section name (Identity)
 *   - Renders the formatted section content
 *   - Renders approval status (PENDING/APPROVED)
 *   - Renders key hints (A, R, B, Q)
 *   - Renders approved count
 *   - Renders without crashing
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import { ProfileReview, type ProfileReviewProps } from "./profile-review";
import { createBlankProfile } from "../../lib/project-store";

// ---------------------------------------------------------------------------
// Static render tests (renderToString)
// ---------------------------------------------------------------------------

describe("ProfileReview (static rendering)", () => {
  const profile = createBlankProfile("test-project");
  profile.description = "A test project";
  profile.vision = "To test everything";

  const defaultProps: ProfileReviewProps = {
    profile,
    onApprove: () => {},
    onCancel: () => {},
  };

  test("renders Profile Review header", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    expect(output).toContain("Profile Review");
  });

  test("renders section counter", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    expect(output).toContain("Section 1/6");
  });

  test("renders first section name", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    expect(output).toContain("Identity");
  });

  test("renders pending status for first section", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    expect(output).toContain("PENDING");
  });

  test("renders approve key hint", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    expect(output).toContain("approve");
  });

  test("renders revise key hint", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    expect(output).toContain("revise");
  });

  test("renders cancel key hint", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    expect(output).toContain("cancel");
  });

  test("renders approved count", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    // Should show 0/6 approved initially
    expect(output).toContain("0");
    expect(output).toContain("6");
  });

  test("renders section content for identity", () => {
    const output = renderToString(<ProfileReview {...defaultProps} />);
    // formatSectionForDisplay for identity should show the project name
    expect(output).toContain("test-project");
  });

  test("renders without crashing", () => {
    expect(() =>
      renderToString(<ProfileReview {...defaultProps} />),
    ).not.toThrow();
  });
});
