/**
 * post-merge-types.ts — Shared contracts for post-merge reporting, changelog
 * generation and PR publication.
 *
 * Pure type module: it must not import command or daemon runtime modules so
 * that every layer (merge command, daemon, report renderer, coordinator) can
 * depend on it without cycles.
 *
 * Verification fields are deliberately optional. Older persisted state only
 * knows whether the build passed, so absent evidence is rendered as "unknown"
 * and never as a pass.
 */

// ---------------------------------------------------------------------------
// Verification evidence
// ---------------------------------------------------------------------------

/**
 * Outcome of one verification check.
 *   - passed:  the check ran and succeeded
 *   - failed:  the check ran and failed
 *   - skipped: the check was deliberately not run (see `reason`)
 *   - unknown: no evidence is available (e.g. legacy records)
 */
export type VerificationStatus = "passed" | "failed" | "skipped" | "unknown";

/** Compact result of a single check (build, unit tests, browser tests) */
export interface VerificationCheckSummary {
  status: VerificationStatus;
  /** Wall-clock duration when known */
  durationMs?: number;
  /** Test counts when the runner output could be parsed */
  total?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  /** Short explanation for skipped/unknown/failed states (never raw logs) */
  reason?: string;
}

/**
 * Compact verification evidence persisted per agent and embedded in reports.
 * A missing check means "unknown": a passing build never implies passing tests.
 */
export interface VerificationSummary {
  build?: VerificationCheckSummary;
  unitTests?: VerificationCheckSummary;
  browser?: VerificationCheckSummary;
}

// ---------------------------------------------------------------------------
// Report input / output
// ---------------------------------------------------------------------------

/** One task that contributed to a merge operation */
export interface MergeReportTask {
  id: string;
  title: string;
  verification?: VerificationSummary;
}

/** Everything needed to describe a single successful merge operation */
export interface MergeReportInput {
  /** Stable identifier derived from branch and merge commit SHAs */
  operationId: string;
  /** Branch that received the local merges (the PR head) */
  destinationBranch: string;
  /** Destination commit before the first merge of the operation */
  beforeSha: string;
  /** Destination commit after the last merge of the operation */
  afterSha: string;
  tasks: MergeReportTask[];
}

export type ChangedFileStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "type-changed"
  | "other";

export interface ChangedFile {
  path: string;
  status: ChangedFileStatus;
  /** Previous path for renames and copies */
  oldPath?: string;
}

/** Structured report plus its deterministic Markdown rendering */
export interface MergeReport {
  operationId: string;
  destinationBranch: string;
  beforeSha: string;
  afterSha: string;
  /** Sorted by id, deduplicated */
  tasks: MergeReportTask[];
  /** Sorted by path, deduplicated */
  files: ChangedFile[];
  markdown: string;
}

// ---------------------------------------------------------------------------
// Post-merge results
// ---------------------------------------------------------------------------

export type ChangelogOutcomeStatus = "written" | "unchanged" | "skipped" | "failed";
export type PushOutcomeStatus = "pushed" | "skipped" | "failed";
export type PrOutcomeStatus = "created" | "updated" | "skipped" | "failed";

export interface ChangelogOutcome {
  status: ChangelogOutcomeStatus;
  /** Commit holding the changelog entry, when one exists */
  commit?: string;
  message?: string;
}

export interface PushOutcome {
  status: PushOutcomeStatus;
  message?: string;
}

export interface PrOutcome {
  status: PrOutcomeStatus;
  url?: string;
  /** PR head (merge destination) and target branches when resolved */
  head?: string;
  base?: string;
  message?: string;
}

/**
 * Result of the post-merge pipeline. It never changes whether the merge itself
 * succeeded: failures here are reported as phase outcomes and warnings.
 */
export interface PostMergeResult {
  operationId: string;
  changelog: ChangelogOutcome;
  push: PushOutcome;
  pr: PrOutcome;
  warnings: string[];
}
