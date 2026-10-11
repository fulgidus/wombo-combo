/**
 * pull.ts — Pull engine for the woco <-> GitHub Issues sync (engine only; no
 * CLI wiring). Reads GitHub, writes woco data, NEVER writes to GitHub.
 *
 * Rules:
 *  - Issues without a woco marker become backlog tasks `gh-<n>-<slug>`
 *    (collision-safe) with notes `triage: needs-triage` and `github: #N`.
 *  - GitHub comments without a woco comment marker become woco comments
 *    (author = login, role human, github_url set). Idempotent through the
 *    mapping `comments` map, the comment marker and github_url.
 *  - Issue close/reopen maps to done/cancelled/backlog (only done/cancelled
 *    tasks are reopened).
 *  - Field edits are compared against the last-synced hashes. Only-remote
 *    change: applied. Both sides changed: LOCAL WINS, the conflict is put in
 *    the report, a system comment (author woco) is left on the woco item and
 *    a notice for GitHub is returned in `pendingRemoteNotices` for the push
 *    side to post. The remote hash is acknowledged but the local hash is not,
 *    so the next push still sends the local values.
 *  - Quest spec issues: comments only.
 *  - Deleted/transferred issues (404) are skipped; mappings are kept and no
 *    woco data is ever deleted. Rate limits stop the pull with a partial
 *    report (`rateLimited: true`).
 */

import { loadConfig, type WomboConfig } from "../../config";
import { addComment, listComments, type CommentRef } from "../comments";
import { loadQuest, loadArchivedQuest } from "../quest-store";
import { deleteTaskFile, getArchiveDir } from "../task-store";
import {
  loadArchive,
  loadTasks,
  saveTaskToArchive,
  saveTaskToStore,
  type Task,
  type TaskStatus,
} from "../tasks";
import {
  GitHubNotFoundError,
  GitHubRateLimitError,
  type GitHubComment,
  type GitHubClient,
  type GitHubIssue,
} from "./github-client";
import {
  findMarker,
  hashFields,
  hashTask,
  listMappings,
  mergeFields,
  readMapping,
  writeMapping,
  type MappingEntry,
} from "./mapping";
import { applyTriageRole, parseIssueToTask, parsedToTask, parseRemoteComment, taskSyncable } from "./render";
import { SPEC_LABEL } from "./render";
import type { RemoteComment, RemoteIssue } from "./types";

export interface PullOptions {
  projectRoot: string;
  client: GitHubClient;
  /** Compute the report only; write nothing */
  dryRun?: boolean;
  /** ISO timestamp; only issues updated at or after it are listed */
  since?: string;
  /** Override the loaded config (tests) */
  config?: WomboConfig;
  /** Clock override (tests) */
  now?: () => Date;
}

export interface PullReport {
  tasksCreated: string[];
  tasksUpdated: string[];
  statusChanged: Array<{ ref: string; from: TaskStatus; to: TaskStatus }>;
  commentsAdded: Array<{ ref: string; commentId: string; githubId: number }>;
  conflicts: Array<{ ref: string; fields: string[] }>;
  skipped: Array<{ ref: string; reason: string }>;
  errors: Array<{ ref: string; error: string }>;
  /** True when a rate limit stopped the pull early; the report is partial */
  rateLimited: boolean;
  /** Notices the push side should post on the GitHub issue (pull never writes to GitHub) */
  pendingRemoteNotices: Array<{ issue: number; ref: string; body: string }>;
  dryRun: boolean;
}

/** Labels that are triage roles (see LABEL_CATALOG). */
export const TRIAGE_LABELS = ["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"] as const;
export const DEFAULT_TRIAGE = "needs-triage";
export const WOCO_AUTHOR = "woco";

class StopPull extends Error {}

function toRemoteIssue(i: GitHubIssue): RemoteIssue {
  const reason = i.state_reason === "completed" || i.state_reason === "not_planned" || i.state_reason === "reopened"
    ? i.state_reason
    : null;
  return {
    number: i.number,
    url: i.html_url,
    title: i.title ?? "",
    body: i.body ?? "",
    state: i.state,
    stateReason: reason,
    labels: (i.labels ?? []).map((l) => (typeof l === "string" ? l : l.name)),
    updatedAt: i.updated_at,
    user: i.user?.login ?? "",
  };
}

function toRemoteComment(c: GitHubComment): RemoteComment {
  return {
    id: c.id,
    body: c.body ?? "",
    user: c.user?.login ?? "unknown",
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    url: c.html_url,
  };
}

const refString = (kind: "task" | "quest", id: string) => (kind === "quest" ? `quest:${id}` : id);

export async function pullFromGitHub(opts: PullOptions): Promise<PullReport> {
  const { projectRoot, client } = opts;
  const dryRun = opts.dryRun === true;
  const now = opts.now ?? (() => new Date());
  const config = opts.config ?? loadConfig(projectRoot);
  const report: PullReport = {
    tasksCreated: [],
    tasksUpdated: [],
    statusChanged: [],
    commentsAdded: [],
    conflicts: [],
    skipped: [],
    errors: [],
    rateLimited: false,
    pendingRemoteNotices: [],
    dryRun,
  };

  // -- local indexes ---------------------------------------------------------
  const active = loadTasks(projectRoot, config).tasks;
  const archived = loadArchive(projectRoot, config).tasks;
  const local = new Map<string, { task: Task; archived: boolean }>();
  for (const t of archived) local.set(t.id, { task: t, archived: true });
  for (const t of active) local.set(t.id, { task: t, archived: false });
  const usedIds = new Set(local.keys());

  const taskMaps = listMappings(projectRoot, "task");
  const questMaps = listMappings(projectRoot, "quest");
  const taskByIssue = new Map(taskMaps.map((m) => [m.entry.issue_number, m.id]));
  const questByIssue = new Map(questMaps.map((m) => [m.entry.issue_number, m.id]));
  const seenIssues = new Set<number>();

  const questExists = (id: string) => loadQuest(projectRoot, id) !== null || loadArchivedQuest(projectRoot, id) !== null;

  const saveTask = (task: Task, wasArchived: boolean) => {
    if (dryRun) return;
    if (wasArchived && task.status !== "done" && task.status !== "cancelled") {
      saveTaskToStore(projectRoot, config, task);
      deleteTaskFile(getArchiveDir(projectRoot, config), task.id);
    } else if (wasArchived) {
      saveTaskToArchive(projectRoot, config, task);
    } else {
      saveTaskToStore(projectRoot, config, task);
    }
  };

  const rateGuard = (err: unknown): never | void => {
    if (err instanceof GitHubRateLimitError) {
      report.rateLimited = true;
      throw new StopPull();
    }
  };

  // -- comments ----------------------------------------------------------------
  async function pullComments(kind: "task" | "quest", id: string, issueNumber: number, entry: MappingEntry): Promise<MappingEntry> {
    const ref: CommentRef = { kind, id };
    const rs = refString(kind, id);
    let raw: GitHubComment[];
    try {
      raw = await client.listComments(issueNumber);
    } catch (err) {
      rateGuard(err);
      if (err instanceof GitHubNotFoundError) {
        report.skipped.push({ ref: rs, reason: `comments of issue #${issueNumber} not found` });
        return entry;
      }
      throw err;
    }
    const known = new Set(Object.values(entry.comments));
    const comments = { ...entry.comments };
    let existing = listComments(projectRoot, ref);
    for (const rc of raw.map(toRemoteComment)) {
      if (known.has(rc.id)) continue;
      const marker = findMarker(rc.body);
      if (marker?.kind === "comment") {
        const mine = existing.find((c) => c.id === marker.id);
        if (mine) {
          comments[mine.id] = rc.id;
          known.add(rc.id);
        } else {
          // One of ours that has not reached this clone yet (it arrives via git): never duplicate it.
          report.skipped.push({ ref: rs, reason: `woco comment ${marker.id} not present locally` });
        }
        continue;
      }
      const byUrl = existing.find((c) => c.github_url === rc.url);
      if (byUrl) {
        comments[byUrl.id] = rc.id;
        known.add(rc.id);
        continue;
      }
      const parsed = parseRemoteComment(rc, ref);
      if (!parsed.body.trim()) continue;
      if (dryRun) {
        report.commentsAdded.push({ ref: rs, commentId: "(dry-run)", githubId: rc.id });
        continue;
      }
      try {
        const added = addComment(projectRoot, ref, {
          body: parsed.body,
          author: parsed.author,
          role: "human",
          github_url: rc.url,
        });
        comments[added.id] = rc.id;
        known.add(rc.id);
        existing = [...existing, added];
        report.commentsAdded.push({ ref: rs, commentId: added.id, githubId: rc.id });
      } catch (err) {
        report.errors.push({ ref: rs, error: `comment ${rc.id}: ${(err as Error).message}` });
      }
    }
    return { ...entry, comments };
  }

  // -- existing task -----------------------------------------------------------
  function remoteTaskView(issue: RemoteIssue, taskId: string) {
    const parsed = parseIssueToTask(issue, { triageLabels: TRIAGE_LABELS });
    parsed.id = taskId;
    const view = taskSyncable(parsedToTask(parsed));
    return { parsed, view, hash: hashFields(view) };
  }

  const knownDeps = (self: string, deps: string[]) => deps.filter((d) => d !== self && usedIds.has(d));

  function reconcileTask(id: string, issue: RemoteIssue, mapping: MappingEntry | null): MappingEntry | null {
    const entryLocal = local.get(id);
    if (!entryLocal) {
      report.skipped.push({ ref: id, reason: "task missing locally; mapping kept" });
      return null;
    }
    const lt = entryLocal.task;
    const { parsed, view: remoteView, hash: remoteHash } = remoteTaskView(issue, id);
    const localView = taskSyncable(lt);
    const localHash = hashTask(lt);
    const stamp = now().toISOString();
    const base = (over: Partial<MappingEntry>): MappingEntry => ({
      issue_number: issue.number,
      issue_url: issue.url,
      remote_updated_at: issue.updatedAt,
      local_hash: localHash,
      remote_hash: remoteHash,
      last_synced_at: stamp,
      comments: mapping?.comments ?? {},
      ...over,
    });

    const localChanged = mapping ? localHash !== mapping.local_hash : true;
    const remoteChanged = mapping ? remoteHash !== mapping.remote_hash : true;
    if (!remoteChanged) {
      return mapping ? { ...mapping, issue_url: issue.url, remote_updated_at: issue.updatedAt } : base({});
    }

    const diff = mergeFields(null, localView, remoteView).conflicts.map((c) => c.field);
    if (diff.length === 0) return base({});

    if (localChanged) {
      // Both sides changed (or never synced): local wins, nothing is lost.
      report.conflicts.push({ ref: id, fields: diff });
      const fieldList = diff.join(", ");
      const remoteValues = diff
        .map((f) => `- ${f}: ${JSON.stringify((remoteView as Record<string, unknown>)[f])}`)
        .join("\n");
      if (!dryRun) {
        try {
          addComment(projectRoot, { kind: "task", id }, {
            author: WOCO_AUTHOR,
            role: "system",
            body: `GitHub sync conflict on #${issue.number} (${fieldList}). The local values were kept. The GitHub values were:\n${remoteValues}`,
          });
        } catch (err) {
          report.errors.push({ ref: id, error: `conflict comment: ${(err as Error).message}` });
        }
      }
      report.pendingRemoteNotices.push({
        issue: issue.number,
        ref: id,
        body: `woco sync conflict (${fieldList}): both sides changed since the last sync. The woco values win and will be pushed; the GitHub values seen were:\n${remoteValues}`,
      });
      // Acknowledge the remote change but keep the old local hash so push still sends local.
      return base({ local_hash: mapping ? mapping.local_hash : "" });
    }

    // Only remote changed: apply.
    const next: Task = { ...lt };
    const changed: string[] = [];
    const set = <K extends keyof Task>(k: K, v: Task[K], f: string) => {
      if (JSON.stringify(next[k]) !== JSON.stringify(v)) {
        next[k] = v;
        changed.push(f);
      }
    };
    set("title", parsed.title, "title");
    set("description", parsed.description, "description");
    set("priority", parsed.priority, "priority");
    set("difficulty", parsed.difficulty, "difficulty");
    set("constraints", parsed.constraints, "constraints");
    set("forbidden", parsed.forbidden, "forbidden");
    set("references", parsed.references, "references");
    set("depends_on", knownDeps(id, parsed.depends_on), "depends_on");
    if ((lt.quest?.trim() || null) !== (parsed.quest ?? null)) {
      if (parsed.quest && questExists(parsed.quest)) {
        next.quest = parsed.quest;
        changed.push("quest");
      } else if (!parsed.quest) {
        delete next.quest;
        changed.push("quest");
      }
    }
    if (remoteView.triage !== localView.triage) {
      next.notes = applyTriageRole(lt.notes, remoteView.triage);
      changed.push("triage");
    }
    if (remoteView.state !== localView.state) {
      const from = lt.status;
      let to: TaskStatus = from;
      if (remoteView.state === "done") to = "done";
      else if (remoteView.state === "cancelled") to = "cancelled";
      else if (from === "done" || from === "cancelled") to = "backlog";
      if (to !== from) {
        next.status = to;
        if (to === "done") {
          next.completion = 100;
          next.ended_at = next.ended_at ?? stamp;
        } else if (to === "backlog") {
          next.completion = 0;
          next.ended_at = null;
        } else {
          next.ended_at = next.ended_at ?? stamp;
        }
        report.statusChanged.push({ ref: id, from, to });
        changed.push("status");
      }
    }
    if (changed.length) {
      report.tasksUpdated.push(id);
      saveTask(next, entryLocal.archived);
      if (!dryRun) local.set(id, { task: next, archived: entryLocal.archived && (next.status === "done" || next.status === "cancelled") });
    }
    return base({ local_hash: hashTask(next) });
  }

  // -- new task ----------------------------------------------------------------
  function createTask(issue: RemoteIssue): MappingEntry | null {
    const parsed = parseIssueToTask(issue, { triageLabels: TRIAGE_LABELS });
    const remoteHash = hashFields(taskSyncable(parsedToTask(parsed)));
    let id = parsed.id;
    for (let n = 2; usedIds.has(id); n++) id = `${parsed.id}-${n}`;
    usedIds.add(id);
    parsed.id = id;
    parsed.depends_on = knownDeps(id, parsed.depends_on);
    if (parsed.quest && !questExists(parsed.quest)) delete parsed.quest;
    parsed.triage = parsed.triage ?? DEFAULT_TRIAGE;
    const task = parsedToTask(parsed);
    task.effort = "PT1H";
    task.notes = [...task.notes, `github: #${issue.number}`];
    report.tasksCreated.push(id);
    if (dryRun) return null;
    saveTaskToStore(projectRoot, config, task);
    local.set(id, { task, archived: false });
    return {
      issue_number: issue.number,
      issue_url: issue.url,
      remote_updated_at: issue.updatedAt,
      local_hash: hashTask(task),
      remote_hash: remoteHash,
      last_synced_at: now().toISOString(),
      comments: {},
    };
  }

  const findByNote = (n: number): string | null => {
    const note = `github: #${n}`;
    for (const [id, { task }] of local) {
      if (id.startsWith(`gh-${n}-`) && task.notes?.some((x) => x.trim() === note)) return id;
    }
    return null;
  };

  // -- main --------------------------------------------------------------------
  let issues: GitHubIssue[];
  try {
    issues = await client.listIssues({ state: "all", ...(opts.since ? { since: opts.since } : {}) });
  } catch (err) {
    if (err instanceof GitHubRateLimitError) {
      report.rateLimited = true;
      return report;
    }
    throw err;
  }

  try {
    for (const gi of issues.sort((a, b) => a.number - b.number)) {
      if (gi.pull_request) continue;
      seenIssues.add(gi.number);
      const issue = toRemoteIssue(gi);
      const marker = findMarker(issue.body);
      let kind: "task" | "quest" = "task";
      let id: string | null = null;
      let isNew = false;

      if (marker?.kind === "quest") {
        kind = "quest";
        id = marker.id;
      } else if (marker?.kind === "task") {
        id = marker.id;
      } else {
        id = taskByIssue.get(issue.number) ?? questByIssue.get(issue.number) ?? findByNote(issue.number);
        if (id && questByIssue.get(issue.number) === id) kind = "quest";
      }
      const rs = id ? refString(kind, id) : `#${issue.number}`;

      try {
        if (id === null) {
          if (issue.labels.includes(SPEC_LABEL)) {
            report.skipped.push({ ref: rs, reason: "spec issue without woco quest marker" });
            continue;
          }
          isNew = true;
        } else if (kind === "task") {
          // A mapping for a different issue number means the marker was copied; do not adopt blindly.
          const mapped = readMapping(projectRoot, "task", id);
          if (mapped && mapped.issue_number !== issue.number) {
            report.skipped.push({ ref: rs, reason: `task already mapped to issue #${mapped.issue_number}` });
            continue;
          }
          if (!local.has(id)) {
            report.skipped.push({ ref: rs, reason: "task not present locally; mapping kept" });
            continue;
          }
        } else if (!questExists(id)) {
          report.skipped.push({ ref: rs, reason: "quest not present locally; mapping kept" });
          continue;
        }

        let entry: MappingEntry | null;
        if (isNew) {
          entry = createTask(issue);
          id = report.tasksCreated[report.tasksCreated.length - 1]!;
        } else if (kind === "task") {
          entry = reconcileTask(id!, issue, readMapping(projectRoot, "task", id!));
        } else {
          // Quest spec issue: comments only.
          const m = readMapping(projectRoot, "quest", id!);
          entry = m ?? {
            issue_number: issue.number,
            issue_url: issue.url,
            remote_updated_at: issue.updatedAt,
            local_hash: "",
            remote_hash: "",
            last_synced_at: now().toISOString(),
            comments: {},
          };
        }
        if (!entry) {
          if (!dryRun) continue;
          // dry run of a new task: report the comments that would be added, nothing else
          if (isNew) {
            const synthetic: MappingEntry = {
              issue_number: issue.number, issue_url: issue.url, remote_updated_at: issue.updatedAt,
              local_hash: "", remote_hash: "", last_synced_at: "", comments: {},
            };
            await dryNewTaskComments(id!, issue.number, synthetic);
          }
          continue;
        }
        const withComments = await pullComments(kind, id!, issue.number, entry);
        if (!dryRun) {
          withComments.remote_updated_at = issue.updatedAt;
          writeMapping(projectRoot, kind, id!, withComments);
        }
      } catch (err) {
        if (err instanceof StopPull) throw err;
        rateGuard(err);
        report.errors.push({ ref: rs, error: (err as Error).message });
      }
    }

    // Mapped items whose issue was not listed: deleted/transferred? (only knowable on a full pull)
    if (!opts.since) {
      const gone = [
        ...taskMaps.map((m) => ({ kind: "task" as const, ...m })),
        ...questMaps.map((m) => ({ kind: "quest" as const, ...m })),
      ].filter((m) => !seenIssues.has(m.entry.issue_number));
      for (const m of gone) {
        const rs = refString(m.kind, m.id);
        try {
          await client.getIssue(m.entry.issue_number);
          // Exists but was not listed (e.g. restricted view): leave it alone.
        } catch (err) {
          rateGuard(err);
          if (err instanceof GitHubNotFoundError) {
            report.skipped.push({ ref: rs, reason: `issue #${m.entry.issue_number} deleted or transferred; mapping kept` });
          } else {
            report.errors.push({ ref: rs, error: (err as Error).message });
          }
        }
      }
    }
  } catch (err) {
    if (!(err instanceof StopPull)) throw err;
  }

  async function dryNewTaskComments(id: string, issueNumber: number, entry: MappingEntry): Promise<void> {
    const rs = id;
    const raw = await client.listComments(issueNumber);
    for (const rc of raw.map(toRemoteComment)) {
      if (findMarker(rc.body)?.kind === "comment") continue;
      report.commentsAdded.push({ ref: rs, commentId: "(dry-run)", githubId: rc.id });
    }
    void entry;
  }

  return report;
}
