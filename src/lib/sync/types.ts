/**
 * types.ts — Shared types for the woco <-> GitHub Issues sync.
 * Pure data shapes; no logic, no network.
 */

export type IssueState = "open" | "closed";
export type IssueStateReason = "completed" | "not_planned" | "reopened" | null;

/** A GitHub issue as the sync layer sees it (normalised from the REST API). */
export interface RemoteIssue {
  number: number;
  url: string;
  title: string;
  body: string;
  state: IssueState;
  stateReason: IssueStateReason;
  labels: string[];
  updatedAt: string;
  user: string;
}

/** A GitHub issue comment as the sync layer sees it. */
export interface RemoteComment {
  id: number;
  body: string;
  user: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

/** What we want an issue to look like; used to create or update. */
export interface IssueDraft {
  title: string;
  body: string;
  labels: string[];
  state: IssueState;
  stateReason: IssueStateReason;
}
