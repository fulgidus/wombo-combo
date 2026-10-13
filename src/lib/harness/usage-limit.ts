/**
 * usage-limit.ts — Provider usage-limit and rate-limit detection and reset time parsing.
 *
 * Detects provider rate limit, weekly limit, quota exhaustion and 429 errors
 * across harnesses (claude-code, codex, gemini, opencode, antigravity).
 * Extracts reset timestamps / durations when present so callers can pause
 * schedulers without burning retries and auto-resume when quota resets.
 */

export interface UsageLimitInfo {
  isLimit: true;
  kind: "weekly_limit" | "rate_limit" | "quota_exhausted";
  message: string;
  resetsAt: Date | null;
  resetsAtMs: number | null;
  resetRaw: string | null;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parse relative duration strings like:
 * - "167h51m39s", "2h30m", "45s", "10m"
 * - "20 seconds", "5 minutes", "2 hours"
 */
function parseRelativeDurationMs(text: string): number | null {
  const trimmed = text.trim();

  // Pattern like "167h51m39s" or "2h" or "30m" or "45s"
  const dhmsMatch = /^(\d+h)?(\d+m)?(\d+s)?$/i.exec(trimmed);
  if (dhmsMatch && (dhmsMatch[1] || dhmsMatch[2] || dhmsMatch[3])) {
    const hours = dhmsMatch[1] ? parseInt(dhmsMatch[1].slice(0, -1), 10) : 0;
    const mins = dhmsMatch[2] ? parseInt(dhmsMatch[2].slice(0, -1), 10) : 0;
    const secs = dhmsMatch[3] ? parseInt(dhmsMatch[3].slice(0, -1), 10) : 0;
    return (hours * 3600 + mins * 60 + secs) * 1000;
  }

  // Pattern like "20 seconds", "5 minutes", "2 hours"
  const verboseMatch = /^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?)$/i.exec(trimmed);
  if (verboseMatch) {
    const val = parseInt(verboseMatch[1], 10);
    const unit = verboseMatch[2].toLowerCase();
    if (unit.startsWith("s")) return val * 1000;
    if (unit.startsWith("m")) return val * 60 * 1000;
    if (unit.startsWith("h")) return val * 3600 * 1000;
    if (unit.startsWith("d")) return val * 86400 * 1000;
  }

  return null;
}

/**
 * Parse a reset date or duration string into a Date.
 * Supports:
 * - Relative durations: "167h51m39s", "20s", "5 minutes"
 * - Month Day, Hour format: "Oct 15, 7pm", "Oct 15 at 7:30pm"
 * - ISO formats: "2026-10-15T19:00:00Z"
 */
export function parseResetTime(raw: string, now: Date = new Date()): Date | null {
  const clean = raw.trim().replace(/^in\s+/i, "").replace(/[.]+$/, "");
  if (!clean) return null;

  // 1. Check relative duration
  const relMs = parseRelativeDurationMs(clean);
  if (relMs !== null) {
    return new Date(now.getTime() + relMs);
  }

  // 2. Try standard Date.parse (ISO or RFC formats)
  const parsedIso = Date.parse(clean);
  if (!isNaN(parsedIso)) {
    return new Date(parsedIso);
  }

  // 3. Match formats like "Oct 15, 7pm", "Oct 15 at 7:30pm", "October 15 19:00"
  const dateMatch = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?:,?\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i.exec(clean);
  if (dateMatch) {
    const monthStr = dateMatch[1].toLowerCase();
    const month = MONTH_MAP[monthStr];
    if (month !== undefined) {
      const day = parseInt(dateMatch[2], 10);
      let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();

      let hours = 0;
      let minutes = 0;
      if (dateMatch[4]) {
        hours = parseInt(dateMatch[4], 10);
        if (dateMatch[5]) {
          minutes = parseInt(dateMatch[5], 10);
        }
        const ampm = dateMatch[6]?.toLowerCase();
        if (ampm === "pm" && hours < 12) hours += 12;
        if (ampm === "am" && hours === 12) hours = 0;
      }

      let target = new Date(year, month, day, hours, minutes, 0, 0);
      // If the computed date without explicit year is in the past by more than 1 day, assume next year
      if (!dateMatch[3] && target.getTime() < now.getTime() - 86400000) {
        target = new Date(year + 1, month, day, hours, minutes, 0, 0);
      }
      return target;
    }
  }

  return null;
}

/**
 * Extract raw reset string from error text.
 * Looks for patterns like:
 * - "resets Oct 15, 7pm"
 * - "resets in 167h51m39s"
 * - "try again in 20s"
 * - "retry after 60s"
 */
function extractResetRaw(text: string): string | null {
  // First match specific date-time format: e.g. "resets Oct 15, 7pm" or "resets Oct 15 at 7pm"
  const datePattern = /(?:resets?\s+(?:in\s+|at\s+)?|try again in\s+|retry after\s+)([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?,?\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i.exec(text);
  if (datePattern) {
    return datePattern[1].trim();
  }

  const match = /(?:resets?\s+(?:in\s+|at\s+)?|try again in\s+|retry after\s+)([^.;()]+)/i.exec(text);
  if (match) {
    const candidate = match[1].trim();
    // Ignore long sentences that aren't dates/durations
    if (candidate.length > 0 && candidate.length < 50) {
      return candidate;
    }
  }
  return null;
}

/**
 * Detect usage-limit, rate-limit, weekly-limit, quota errors across harnesses.
 */
export function detectUsageLimit(text: string, now: Date = new Date()): UsageLimitInfo | null {
  if (!text || typeof text !== "string") return null;

  const lower = text.toLowerCase();

  let isLimit = false;
  let kind: UsageLimitInfo["kind"] = "rate_limit";

  if (
    lower.includes("weekly limit") ||
    lower.includes("weekly_limit")
  ) {
    isLimit = true;
    kind = "weekly_limit";
  } else if (
    lower.includes("individual quota reached") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota exceeded") ||
    lower.includes("insufficient_quota") ||
    lower.includes("exceeded your current quota")
  ) {
    isLimit = true;
    kind = "quota_exhausted";
  } else if (
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("rate-limit") ||
    lower.includes("usage limit") ||
    lower.includes("usage_limit") ||
    lower.includes("too many requests") ||
    lower.includes("code 429") ||
    lower.includes("429 too many requests")
  ) {
    isLimit = true;
    kind = "rate_limit";
  }

  if (!isLimit) return null;

  const resetRaw = extractResetRaw(text);
  const resetsAt = resetRaw ? parseResetTime(resetRaw, now) : null;
  const resetsAtMs = resetsAt ? resetsAt.getTime() : null;

  return {
    isLimit: true,
    kind,
    message: text.trim(),
    resetRaw,
    resetsAt,
    resetsAtMs,
  };
}
