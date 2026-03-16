/**
 * wishlist-helpers.ts — Shared rendering helpers for wishlist Ink components.
 *
 * Used by both WishlistPicker (full-screen) and WishlistOverlay (modal popup).
 * Provides formatting utilities that were previously inline in tui-wishlist.ts.
 */

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Extract a YYYY-MM-DD date string from an ISO timestamp.
 * Returns "unknown" if the input is too short or empty.
 */
export function formatDate(isoTimestamp: string): string {
  if (!isoTimestamp || isoTimestamp.length < 10) {
    return "unknown";
  }
  return isoTimestamp.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Text truncation
// ---------------------------------------------------------------------------

/**
 * Truncate text to a maximum length, appending an ellipsis if needed.
 *
 * @param text - The text to truncate.
 * @param maxLen - Maximum length (default: 48). Includes the ellipsis character.
 * @returns The truncated text, or original if within bounds.
 */
export function truncateText(text: string, maxLen: number = 48): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "\u2026";
}
