/**
 * push.ts — Push engine for the woco -> GitHub Issues sync.
 *
 *  - ensures the label catalog (+ `quest:<id>` per quest) first
 *  - creates or updates one issue per task / quest, idempotently: an issue is
 *    only updated when the local hash changed since the last sync, and before
 *    creating one the repo's issues are searched for the woco marker so two
 *    clients (or a lost mapping file) never produce duplicates
 *  - mirrors every woco comment that has no GitHub id yet, oldest first
 *  - never stops on a per-item failure: errors are collected in the report
 *  - a dry run performs reads only and writes nothing, locally or remotely
 *
 * Archived tasks / quests are only pushed when they already have a mapping
 * (so their issue gets closed); they are never newly created.
 */

import { MAX_NOTICE_ATTEMPTS, readPendingNotices, writePendingNotices, type PendingNotice } from "./pending-notices";
import { loadConfig, normalizeSyncGithubConfig } from "../../config";
import { listComments, setCommentGithubUrl, type Comment } from "../comments";
import { loadAllArchivedQuests, loadAllQuests } from "../quest-store";
import { loadFeatures } from "../tasks";
import {
  LABEL_CATALOG,
  ensureLabels,
  labelsForQuest,
  type GitHubClient,
  type GitHubIssue,
  type LabelSpec,
} from "./github-client";
import { TRIAGE_LABELS, remoteSyncHash } from "./hashing";
import { conflictCommentPrefix } from "./pull";
import {
  SAFE_ID_RE,
  findMappingByIssue,
  findMarker,
  hashFields,
  hashQuest,
  markerFor,
  hashTask,
  NOTICE_ID_PREFIX,
  readMapping,
  writeMapping,
  type MappingEntry,
  type SyncKind,
} from "./mapping";
import {
  SPEC_LABEL,
  renderCommentBody,
  renderQuestIssue,
  renderTaskIssue,
} from "./render";
import { isFinishedQuest, isFinishedTask, parseTriageRole } from "./syncable";
import type { IssueDraft, IssueStateReason, RemoteIssue } from "./types";

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface PushItem {
  /** Task id, or `quest:<id>` */
  ref: string;
  kind: SyncKind;
  id: string;
  /** GitHub issue number (absent for a dry-run create) */
  issue?: number;
  url?: string;
  /** Why the item was left alone (`finished`: unmapped done/cancelled work, see sync.github.includeFinished) */
  reason?: "finished";
}

export interface PushedComment {
  ref: string;
  /** woco comment id */
  comment: string;
  issue?: number;
  /** GitHub comment id (absent on a dry run) */
  githubId?: number;
}

export interface PushError {
  /** Item ref, `labels`, or `<ref>#<comment-id>` */
  ref: string;
  error: string;
}

export interface PushReport {
  dryRun: boolean;
  created: PushItem[];
  updated: PushItem[];
  unchanged: PushItem[];
  commented: PushedComment[];
  /** Labels created (or, on a dry run, that would be created) */
  labelsCreated: string[];
  errors: PushError[];
}

export interface PushOptions {
  projectRoot: string;
  client: GitHubClient;
  dryRun?: boolean;
  only?: { kind: SyncKind; id: string };
  /** Receives label warnings (default console.warn) */
  warn?: (msg: string) => void;
}

export type ItemSyncState =
  | "new"
  | "unmapped-remote"
  | "in-sync"
  | "local-changed"
  | "remote-changed"
  | "conflict"
  | "remote-missing";

export interface StatusItem {
  ref: string;
  kind: SyncKind;
  id: string;
  state: ItemSyncState;
  issue?: number;
  url?: string;
  pendingComments: number;
}

export interface SyncStatusReport {
  items: StatusItem[];
  /** Issues on GitHub that no local task / quest corresponds to */
  remoteOnly: Array<{ issue: number; title: string; url: string }>;
  /** Catalog / quest labels not yet on GitHub */
  labelsMissing: string[];
}

// ---------------------------------------------------------------------------
// Local items
// ---------------------------------------------------------------------------

interface LocalItem {
  kind: SyncKind;
  id: string;
  ref: string;
  draft: IssueDraft;
  hash: string;
  triage: string | null;
  archived: boolean;
  /** Task done/cancelled, or quest completed/abandoned */
  finished: boolean;
  /** Quest this task belongs to (for label bootstrap) */
  quest?: string;
}

export function itemRef(kind: SyncKind, id: string): string {
  return kind === "quest" ? `quest:${id}` : id;
}

/** Parse a `--only` style ref (`<task-id>` or `quest:<id>`). Throws on a malformed id. */
export function parseSyncRef(ref: string): { kind: SyncKind; id: string } {
  const raw = (ref ?? "").trim();
  const kind: SyncKind = raw.startsWith("quest:") ? "quest" : "task";
  const id = kind === "quest" ? raw.slice("quest:".length) : raw;
  if (!SAFE_ID_RE.test(id)) throw new Error(`invalid ref: ${JSON.stringify(ref)}`);
  return { kind, id };
}

interface Collected {
  items: LocalItem[];
  errors: PushError[];
  /** Every local id incl. archived, for remote-only detection */
  knownIds: Set<string>;
}

function collectLocal(projectRoot: string): Collected {
  const items: LocalItem[] = [];
  const errors: PushError[] = [];
  const knownIds = new Set<string>();

  const add = (kind: SyncKind, id: string, archived: boolean, build: () => Omit<LocalItem, "kind" | "id" | "ref" | "archived">) => {
    knownIds.add(`${kind}:${id}`);
    if (archived && !readMapping(projectRoot, kind, id)) return;
    try {
      items.push({ kind, id, ref: itemRef(kind, id), archived, ...build() });
    } catch (err) {
      errors.push({ ref: itemRef(kind, id), error: errMsg(err) });
    }
  };

  const data = loadFeatures(projectRoot, loadConfig(projectRoot));
  const taskItem = (t: (typeof data.tasks)[number]) => () => ({
    finished: isFinishedTask(t),
    draft: renderTaskIssue(t),
    hash: hashTask(t),
    triage: parseTriageRole(t.notes),
    quest: t.quest?.trim() || undefined,
  });
  for (const q of loadAllQuests(projectRoot)) {
    add("quest", q.id, false, () => ({ finished: isFinishedQuest(q), draft: renderQuestIssue(q), hash: hashQuest(q), triage: null }));
  }
  for (const q of loadAllArchivedQuests(projectRoot)) {
    add("quest", q.id, true, () => ({ finished: isFinishedQuest(q), draft: renderQuestIssue(q), hash: hashQuest(q), triage: null }));
  }
  for (const t of data.tasks) add("task", t.id, false, taskItem(t));
  for (const t of data.archive ?? []) add("task", t.id, true, taskItem(t));
  return { items, errors, knownIds };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const TRIAGE_CATALOG: readonly string[] = TRIAGE_LABELS;
const MANAGED_PREFIXES = ["priority:", "difficulty:", "quest:"];

export function toRemoteIssue(i: GitHubIssue): RemoteIssue {
  return {
    number: i.number,
    url: i.html_url,
    title: i.title,
    body: i.body ?? "",
    state: i.state,
    stateReason: (i.state_reason ?? null) as IssueStateReason,
    labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)),
    updatedAt: i.updated_at,
    user: i.user?.login ?? "",
  };
}

/** Hash of the syncable fields of a remote issue; shared with pull (see hashing.ts). */
export function remoteHash(kind: SyncKind, remote: RemoteIssue, localTriage: string | null): string {
  return remoteSyncHash(kind, remote, localTriage);
}

function isManagedLabel(name: string, draftLabels: readonly string[]): boolean {
  if (draftLabels.includes(name)) return true;
  return name === SPEC_LABEL || MANAGED_PREFIXES.some((p) => name.startsWith(p)) || TRIAGE_CATALOG.includes(name);
}

/** Draft labels plus any remote label woco does not manage (kept as-is). */
function mergeLabels(draft: readonly string[], remote: readonly string[]): string[] {
  const kept = remote.filter((l) => !isManagedLabel(l, draft));
  return [...draft, ...kept];
}

const norm = (s: string) => s.replace(/\r\n/g, "\n").trim();

function patchFor(draft: IssueDraft, remote: RemoteIssue): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  if (norm(remote.title) !== norm(draft.title)) patch.title = draft.title;
  if (norm(remote.body) !== norm(draft.body)) patch.body = draft.body;
  const want = mergeLabels(draft.labels, remote.labels);
  if ([...want].sort().join("\n") !== [...remote.labels].sort().join("\n")) patch.labels = want;
  if (remote.state !== draft.state || (draft.state === "closed" && remote.stateReason !== draft.stateReason)) {
    patch.state = draft.state;
    patch.state_reason = draft.state === "open" ? "reopened" : draft.stateReason;
  }
  return Object.keys(patch).length ? patch : null;
}

function commentIdFromUrl(url: string | undefined): number | null {
  const m = /#issuecomment-(\d+)/.exec(url ?? "");
  return m ? Number(m[1]) : null;
}

function wantedLabels(items: LocalItem[]): LabelSpec[] {
  const quests = new Set<string>();
  for (const i of items) {
    if (i.kind === "quest") quests.add(i.id);
    if (i.quest) quests.add(i.quest);
  }
  return [...LABEL_CATALOG, ...[...quests].sort().map(labelsForQuest)];
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

export async function pushToGitHub(opts: PushOptions): Promise<PushReport> {
  const { projectRoot, client } = opts;
  const dryRun = opts.dryRun === true;
  const report: PushReport = {
    dryRun,
    created: [],
    updated: [],
    unchanged: [],
    commented: [],
    labelsCreated: [],
    errors: [],
  };

  const includeFinished = normalizeSyncGithubConfig(loadConfig(projectRoot).sync).includeFinished;
  const collected = collectLocal(projectRoot);
  report.errors.push(...collected.errors);
  const only = opts.only;
  const items = collected.items.filter((i) => !only || (i.kind === only.kind && i.id === only.id));
  if (only && items.length === 0 && collected.errors.length === 0) {
    report.errors.push({ ref: itemRef(only.kind, only.id), error: `${only.kind} not found: ${only.id}` });
  }

  // 1. Labels
  try {
    // Quest labels only for items that will actually be synced: unmapped finished
    // work is skipped (see includeFinished), so its quest gets no label either.
    const syncable = items.filter((i) => includeFinished || !i.finished || readMapping(projectRoot, i.kind, i.id) !== null);
    const specs = wantedLabels(syncable);
    if (dryRun) {
      const have = new Set((await client.listLabels()).map((l) => l.name.toLowerCase()));
      report.labelsCreated.push(...specs.filter((s) => !have.has(s.name.toLowerCase())).map((s) => s.name));
    } else {
      const res = await ensureLabels(client, specs, { warn: opts.warn });
      report.labelsCreated.push(...res.created);
    }
  } catch (err) {
    report.errors.push({ ref: "labels", error: errMsg(err) });
  }

  // 2. Issues: remote issues are listed lazily, only when an item has no mapping
  let remoteIssues: GitHubIssue[] | null = null;
  const findByMarker = async (item: LocalItem): Promise<GitHubIssue | null> => {
    remoteIssues ??= await client.listIssues({ state: "all" });
    return (
      remoteIssues.find((i) => {
        const m = findMarker(i.body ?? "");
        return m !== null && m.kind === item.kind && m.id === item.id;
      }) ?? null
    );
  };

  for (const item of items) {
    try {
      await pushItem(item);
    } catch (err) {
      report.errors.push({ ref: item.ref, error: errMsg(err) });
    }
  }
  return report;

  async function pushItem(item: LocalItem): Promise<void> {
    const mapping = readMapping(projectRoot, item.kind, item.id);
    const base = { ref: item.ref, kind: item.kind, id: item.id };
    let entry: MappingEntry | null = mapping;
    let issueNumber: number | undefined = mapping?.issue_number;
    let issueUrl = mapping?.issue_url;
    let existedRemotely = mapping !== null;

    if (mapping) {
      if (mapping.local_hash !== item.hash) {
        const updated = await updateExisting(item, mapping.issue_number, null);
        report.updated.push({ ...base, issue: mapping.issue_number, url: mapping.issue_url });
        if (updated) entry = updated;
      } else {
        report.unchanged.push({ ...base, issue: mapping.issue_number, url: mapping.issue_url });
      }
    } else if (item.finished && !includeFinished) {
      report.unchanged.push({ ...base, reason: "finished" });
      return;
    } else {
      const found = await findByMarker(item);
      if (found) {
        existedRemotely = true;
        issueNumber = found.number;
        issueUrl = found.html_url;
        const remote = toRemoteIssue(found);
        const patch = patchFor(item.draft, remote);
        if (patch) {
          const updated = await updateExisting(item, found.number, remote);
          report.updated.push({ ...base, issue: found.number, url: found.html_url });
          if (updated) entry = updated;
        } else {
          report.unchanged.push({ ...base, issue: found.number, url: found.html_url });
          if (!dryRun) entry = saveEntry(item, found, {});
        }
      } else if (dryRun) {
        report.created.push({ ...base });
        existedRemotely = false;
      } else {
        const created = await client.createIssue({
          title: item.draft.title,
          body: item.draft.body,
          labels: item.draft.labels,
        });
        let final = created;
        if (item.draft.state === "closed") {
          final = await client.updateIssue(created.number, {
            state: "closed",
            state_reason: item.draft.stateReason as "completed" | "not_planned" | null,
          });
        }
        issueNumber = created.number;
        issueUrl = created.html_url;
        entry = saveEntry(item, final, {});
        report.created.push({ ...base, issue: created.number, url: created.html_url });
      }
    }

    await mirrorComments(item, issueNumber, issueUrl, entry, existedRemotely);
  }

  /** PATCH an existing issue to match the draft and persist the mapping. */
  async function updateExisting(item: LocalItem, number: number, known: RemoteIssue | null): Promise<MappingEntry | null> {
    if (dryRun) return null;
    const remote = known ?? toRemoteIssue(await client.getIssue(number));
    const patch = patchFor(item.draft, remote);
    let issue: GitHubIssue | null = null;
    if (patch) issue = await client.updateIssue(number, patch);
    const prev = readMapping(projectRoot, item.kind, item.id);
    return saveEntry(item, issue ?? (await client.getIssue(number)), prev?.comments ?? {});
  }

  function saveEntry(item: LocalItem, issue: GitHubIssue, comments: Record<string, number>): MappingEntry {
    const existing = readMapping(projectRoot, item.kind, item.id);
    const entry: MappingEntry = {
      issue_number: issue.number,
      issue_url: issue.html_url,
      remote_updated_at: issue.updated_at,
      local_hash: item.hash,
      remote_hash: remoteHash(item.kind, toRemoteIssue(issue), item.triage),
      last_synced_at: new Date().toISOString(),
      comments: { ...(existing?.comments ?? {}), ...comments },
    };
    writeMapping(projectRoot, item.kind, item.id, entry);
    return entry;
  }

  async function mirrorComments(
    item: LocalItem,
    issueNumber: number | undefined,
    _issueUrl: string | undefined,
    entry: MappingEntry | null,
    existedRemotely: boolean,
  ): Promise<void> {
    let all: Comment[];
    try {
      all = listComments(projectRoot, { kind: item.kind, id: item.id });
    } catch (err) {
      report.errors.push({ ref: item.ref, error: errMsg(err) });
      return;
    }
    const known = { ...(entry?.comments ?? {}) };
    let dirty = false;
    let pending: Comment[] = [];
    for (const c of all) {
      if (known[c.id]) continue;
      if (c.github_url) {
        // Already on GitHub (pulled or linked): remember its id when the url has one
        const gid = commentIdFromUrl(c.github_url);
        if (gid) {
          known[c.id] = gid;
          dirty = true;
        }
        continue;
      }
      pending.push(c);
    }
    const persist = () => {
      if (dryRun || !entry) return;
      entry = { ...entry, comments: { ...known } };
      writeMapping(projectRoot, item.kind, item.id, entry);
      dirty = false;
    };

    if (pending.length > 0 && existedRemotely && issueNumber !== undefined) {
      // Adopt comments that are already on GitHub (e.g. mapping file lost)
      const remoteComments = await client.listComments(issueNumber);
      const byMarker = new Map<string, number>();
      const urls = new Map<number, string>();
      for (const rc of remoteComments) {
        const m = findMarker(rc.body ?? "");
        if (m?.kind === "comment") {
          byMarker.set(m.id, rc.id);
          urls.set(rc.id, rc.html_url);
        }
      }
      const rest: Comment[] = [];
      for (const c of pending) {
        const gid = byMarker.get(c.id);
        if (gid) {
          known[c.id] = gid;
          dirty = true;
          if (!dryRun) setCommentGithubUrl(projectRoot, c.id, urls.get(gid)!);
        } else {
          rest.push(c);
        }
      }
      pending = rest;
    }
    if (dirty) persist();

    for (const c of pending) {
      const cref = { ref: item.ref, comment: c.id, issue: issueNumber };
      if (dryRun) {
        report.commented.push(cref);
        continue;
      }
      if (issueNumber === undefined) break;
      try {
        const gh = await client.createComment(issueNumber, renderCommentBody(c));
        known[c.id] = gh.id;
        persist();
        report.commented.push({ ...cref, githubId: gh.id });
        if (!c.github_url) setCommentGithubUrl(projectRoot, c.id, gh.html_url);
      } catch (err) {
        // Stop here to keep GitHub chronological; later comments retry next run
        report.errors.push({ ref: `${item.ref}#${c.id}`, error: errMsg(err) });
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Remote notices (conflict notices produced by pull)
// ---------------------------------------------------------------------------

export interface PostedNotice {
  issue: number;
  ref: string;
  githubId?: number;
}

export interface NoticeReport {
  posted: PostedNotice[];
  errors: PushError[];
}

function linkConflictComment(projectRoot: string, n: { issue: number; ref: string }, url: string): void {
  try {
    const prefix = conflictCommentPrefix(n.issue);
    const mine = listComments(projectRoot, { kind: "task", id: n.ref }).filter(
      (c) => c.role === "system" && !c.github_url && c.body.startsWith(prefix),
    );
    const last = mine[mine.length - 1];
    if (last) setCommentGithubUrl(projectRoot, last.id, url);
  } catch {
    // best effort: worst case the conflict is mentioned twice
  }
}

/**
 * Post the notices a pull produced (`PullReport.pendingRemoteNotices`) as issue
 * comments. Each carries a `woco:comment:notice-<hash>` marker so pull does not
 * import it back as a human comment, and a notice already on the issue (same
 * marker) is not posted twice. A dry run posts nothing. Never throws.
 */
export async function postRemoteNotices(
  client: GitHubClient,
  notices: ReadonlyArray<{ issue: number; ref: string; body: string }>,
  opts: { dryRun?: boolean; projectRoot?: string } = {},
): Promise<NoticeReport> {
  const out: NoticeReport = { posted: [], errors: [] };
  // Notices that failed earlier are retried first (persisted by projectRoot).
  const persist = !!opts.projectRoot && !opts.dryRun;
  const queue: PendingNotice[] = persist ? readPendingNotices(opts.projectRoot!) : [];
  for (const n of notices) {
    if (!queue.some((q) => q.issue === n.issue && q.body === n.body)) queue.push({ ...n, attempts: 0 });
  }
  const failed: PendingNotice[] = [];
  for (const n of queue) {
    try {
      const id = `${NOTICE_ID_PREFIX}${hashFields({ issue: n.issue, body: n.body }).slice(0, 16)}`;
      const body = `${n.body.trim()}\n\n${markerFor("comment", id)}`;
      if (opts.dryRun) {
        out.posted.push({ issue: n.issue, ref: n.ref });
        continue;
      }
      const existing = await client.listComments(n.issue);
      const dup = existing.find((c) => {
        const m = findMarker(c.body ?? "");
        return m?.kind === "comment" && m.id === id;
      });
      if (dup) continue;
      const created = await client.createComment(n.issue, body);
      out.posted.push({ issue: n.issue, ref: n.ref, githubId: created.id });
      // The local system comment pull left for this conflict says the same thing: link it so push does not mirror it too.
      if (opts.projectRoot) linkConflictComment(opts.projectRoot, n, created.html_url);
    } catch (err) {
      out.errors.push({ ref: n.ref, error: errMsg(err) });
      if (n.attempts + 1 < MAX_NOTICE_ATTEMPTS) failed.push({ ...n, attempts: n.attempts + 1 });
    }
  }
  if (persist) writePendingNotices(opts.projectRoot!, failed);
  return out;
}

// ---------------------------------------------------------------------------
// Status (read-only)
// ---------------------------------------------------------------------------

export async function syncStatus(opts: { projectRoot: string; client: GitHubClient }): Promise<SyncStatusReport> {
  const { projectRoot, client } = opts;
  const includeFinished = normalizeSyncGithubConfig(loadConfig(projectRoot).sync).includeFinished;
  const { items: allItems, knownIds } = collectLocal(projectRoot);
  const items = allItems.filter((i) => includeFinished || !i.finished || readMapping(projectRoot, i.kind, i.id) !== null);
  const remote = await client.listIssues({ state: "all" });
  const byNumber = new Map(remote.map((i) => [i.number, i]));
  const have = new Set((await client.listLabels()).map((l) => l.name.toLowerCase()));

  const out: StatusItem[] = [];
  const claimed = new Set<number>();
  for (const item of items) {
    const mapping = readMapping(projectRoot, item.kind, item.id);
    let issue: GitHubIssue | undefined = mapping ? byNumber.get(mapping.issue_number) : undefined;
    let state: ItemSyncState;
    if (mapping) {
      if (!issue) state = "remote-missing";
      else {
        const localChanged = mapping.local_hash !== item.hash;
        const remoteChanged = remoteHash(item.kind, toRemoteIssue(issue), item.triage) !== mapping.remote_hash;
        state = localChanged && remoteChanged ? "conflict" : localChanged ? "local-changed" : remoteChanged ? "remote-changed" : "in-sync";
      }
    } else {
      issue = remote.find((i) => {
        const m = findMarker(i.body ?? "");
        return m !== null && m.kind === item.kind && m.id === item.id;
      });
      state = issue ? "unmapped-remote" : "new";
    }
    if (issue) claimed.add(issue.number);
    const known = mapping?.comments ?? {};
    let pendingComments = 0;
    try {
      pendingComments = listComments(projectRoot, { kind: item.kind, id: item.id }).filter(
        (c) => !known[c.id] && !c.github_url,
      ).length;
    } catch {
      // unreadable comments: report none
    }
    out.push({
      ref: item.ref,
      kind: item.kind,
      id: item.id,
      state,
      ...(issue ? { issue: issue.number, url: issue.html_url } : {}),
      pendingComments,
    });
  }

  const remoteOnly = remote
    .filter((i) => {
      if (claimed.has(i.number)) return false;
      const m = findMarker(i.body ?? "");
      if (m && (m.kind === "task" || m.kind === "quest") && knownIds.has(`${m.kind}:${m.id}`)) return false;
      return !findMappingByIssue(projectRoot, "task", i.number) && !findMappingByIssue(projectRoot, "quest", i.number);
    })
    .map((i) => ({ issue: i.number, title: i.title, url: i.html_url }));

  return {
    items: out,
    remoteOnly,
    labelsMissing: wantedLabels(items)
      .map((s) => s.name)
      .filter((n) => !have.has(n.toLowerCase())),
  };
}
