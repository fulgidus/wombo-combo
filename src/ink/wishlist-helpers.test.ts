/**
 * wishlist-helpers.test.ts — Tests for shared wishlist rendering helpers.
 *
 * These helpers are used by both WishlistPicker and WishlistOverlay.
 */

import { describe, test, expect } from "bun:test";
import { formatDate, truncateText } from "./wishlist-helpers";

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  test("extracts YYYY-MM-DD from ISO timestamp", () => {
    expect(formatDate("2025-12-01T10:30:00.000Z")).toBe("2025-12-01");
  });

  test("extracts date from timestamp without timezone", () => {
    expect(formatDate("2025-01-15T08:00:00")).toBe("2025-01-15");
  });

  test("returns 'unknown' for empty string", () => {
    expect(formatDate("")).toBe("unknown");
  });

  test("returns 'unknown' for string shorter than 10 chars", () => {
    expect(formatDate("2025")).toBe("unknown");
  });

  test("handles date-only strings", () => {
    expect(formatDate("2025-06-15")).toBe("2025-06-15");
  });
});

// ---------------------------------------------------------------------------
// truncateText
// ---------------------------------------------------------------------------

describe("truncateText", () => {
  test("returns text unchanged if shorter than max length", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  test("returns text unchanged if exactly max length", () => {
    expect(truncateText("1234567890", 10)).toBe("1234567890");
  });

  test("truncates text longer than max length with ellipsis", () => {
    const result = truncateText("this is a long text", 10);
    expect(result.length).toBe(10);
    expect(result.endsWith("\u2026")).toBe(true);
  });

  test("uses default max length of 48", () => {
    const longText = "a".repeat(60);
    const result = truncateText(longText);
    expect(result.length).toBe(48);
    expect(result.endsWith("\u2026")).toBe(true);
  });

  test("handles empty string", () => {
    expect(truncateText("", 10)).toBe("");
  });
});
