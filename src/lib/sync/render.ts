/**
 * render.ts — Pure render/parse between woco tasks, quests, comments and
 * their GitHub Issue representations. No I/O, no network.
 *
 * Issue body layout (task and quest share it; for a quest the "description"
 * is the goal, Constraints/Forbidden are constraints.add/ban):
 *
 *   <description>
 *
 *   ## Constraints      (bullet list, omitted when empty)
 *   ## Forbidden
 *   ## References       (tasks only)
 *   ## Blocked by       (depends_on ids)
 *
 *   <!-- woco:task:<id> -->
 *
 * Known limitation: a description that itself contains a line exactly equal
 * to one of the section headings above is read back as that section.
 *
 * Conflict policy lives in mapping.mergeFields: local wins, the conflict is
 * reported, nothing is silently lost.
 */

import type { Comment, CommentRole } from "../comments";
import type { Quest, QuestStatus } from "../quest";
import type { Difficulty, Priority, Task, TaskStatus } from "../tasks";
import { SAFE_ID_RE, findMarker, markerFor, stripMarker } from "./mapping";
import {
  applyTriageRole,
  cleanList,
  cleanText,
  issueStateToQuestStatus,
  issueStateToStatus,
  parseTriageRole,
  questStatusToIssueState,
  questSyncable,
  statusToIssueState,
  taskSyncable,
} from "./syncable";
import type { IssueDraft, RemoteComment, RemoteIssue } from "./types";

export {
  applyTriageRole,
  issueStateToQuestStatus,
  issueStateToStatus,
  parseTriageRole,
  questStatusToIssueState,
  questSyncable,
  statusToIssueState,
  taskSyncable,
};

const PRIORITIES: readonly Priority[] = ["critical", "high", "medium", "low", "wishlist"];
const DIFFICULTIES: readonly Difficulty[] = ["trivial", "easy", "medium", "hard", "very_hard"];

export const SPEC_LABEL = "spec";

// ---------------------------------------------------------------------------
// Body building / parsing
// ---------------------------------------------------------------------------

const SECTION_RE = /^## (Constraints|Forbidden|References|Blocked by)[ \t]*$/;

function buildBody(
  text: string,
  sections: Array<[string, string[]]>,
  marker: string,
): string {
  const parts: string[] = [];
  const t = cleanText(text);
  if (t) parts.push(t);
  for (const [name, items] of sections) {
    const list = cleanList(items);
    if (list.length) parts.push(`## ${name}\n${list.map((i) => `- ${i}`).join("\n")}`);
  }
  parts.push(marker);
  return parts.join("\n\n");
}

function parseBody(body: string): { text: string; sections: Record<string, string[]> } {
  const lines = stripMarker(body ?? "").replace(/\r\n/g, "\n").split("\n");
  const textLines: string[] = [];
  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  for (const line of lines) {
    const m = SECTION_RE.exec(line);
    if (m) {
      current = m[1]!;
      sections[current] ??= [];
      continue;
    }
    if (current === null) textLines.push(line);
    else if (line.startsWith("- ")) sections[current]!.push(line.slice(2));
  }
  for (const k of Object.keys(sections)) sections[k] = cleanList(sections[k]);
  return { text: cleanText(textLines.join("\n")), sections };
}

function titleWithId(id: string, title: string): string {
  return `[${id}] ${cleanText(title).replace(/\s*\n\s*/g, " ")}`;
}

/** Strip a leading `[id] ` prefix, but only when it names the expected id (or any safe id when expected is null and strict is false). */
function stripTitleId(title: string, id: string | null): string {
  const m = /^\[([^\]]+)\]\s+(.*)$/.exec(title ?? "");
  if (m && id !== null && m[1] === id) return m[2]!;
  return (title ?? "").trim();
}

function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug || "untitled";
}

function labelValue(labels: readonly string[], prefix: string): string | null {
  const l = labels.find((x) => x.startsWith(prefix));
  return l ? l.slice(prefix.length) : null;
}

function parsePriority(labels: readonly string[]): Priority {
  const v = labelValue(labels, "priority:");
  return PRIORITIES.includes(v as Priority) ? (v as Priority) : "medium";
}

function parseDifficulty(labels: readonly string[]): Difficulty {
  const v = labelValue(labels, "difficulty:");
  return DIFFICULTIES.includes(v as Difficulty) ? (v as Difficulty) : "medium";
}

// ---------------------------------------------------------------------------
// Task <-> issue
// ---------------------------------------------------------------------------

/** Task -> issue draft: title '[id] title', body, labels, state. */
export function renderTaskIssue(task: Task): IssueDraft {
  const labels = [`priority:${task.priority}`, `difficulty:${task.difficulty}`];
  if (task.quest?.trim()) labels.push(`quest:${task.quest.trim()}`);
  const triage = parseTriageRole(task.notes);
  if (triage) labels.push(triage);
  return {
    title: titleWithId(task.id, task.title),
    body: buildBody(
      task.description,
      [
        ["Constraints", task.constraints],
        ["Forbidden", task.forbidden],
        ["References", task.references],
        ["Blocked by", task.depends_on],
      ],
      markerFor("task", task.id),
    ),
    labels,
    ...statusToIssueState(task.status),
  };
}

export interface ParsedTask {
  /** The marker id for issues we rendered, else `gh-<number>-<slug>` */
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  difficulty: Difficulty;
  depends_on: string[];
  constraints: string[];
  forbidden: string[];
  references: string[];
  quest?: string;
  /** Triage label, only detected when it is in ParseOptions.triageLabels */
  triage: string | null;
  /** True when the id came from a woco marker in the body */
  fromMarker: boolean;
}

export interface ParseOptions {
  /**
   * Labels that count as triage roles (e.g. from config). Needed because a
   * triage role is a plain label; without this list none is detected.
   */
  triageLabels?: readonly string[];
}

function pickTriage(labels: readonly string[], opts?: ParseOptions): string | null {
  const known = opts?.triageLabels ?? [];
  return labels.find((l) => known.includes(l)) ?? null;
}

/** Issue -> task fields (reverse of renderTaskIssue). Lossy for fine-grained statuses (see issueStateToStatus). */
export function parseIssueToTask(issue: RemoteIssue, opts?: ParseOptions): ParsedTask {
  const marker = findMarker(issue.body);
  const markerId = marker?.kind === "task" ? marker.id : null;
  const { text, sections } = parseBody(issue.body);
  const title = stripTitleId(issue.title, markerId);
  const quest = labelValue(issue.labels, "quest:");
  const parsed: ParsedTask = {
    id: markerId ?? `gh-${issue.number}-${slugify(title)}`,
    title,
    description: text,
    status: issueStateToStatus(issue.state, issue.stateReason),
    priority: parsePriority(issue.labels),
    difficulty: parseDifficulty(issue.labels),
    depends_on: sections["Blocked by"] ?? [],
    constraints: sections["Constraints"] ?? [],
    forbidden: sections["Forbidden"] ?? [],
    references: sections["References"] ?? [],
    triage: pickTriage(issue.labels, opts),
    fromMarker: markerId !== null,
  };
  if (quest && SAFE_ID_RE.test(quest)) parsed.quest = quest;
  return parsed;
}

/** Build a full Task from parsed issue fields, filling woco defaults. */
export function parsedToTask(p: ParsedTask): Task {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    completion: p.status === "done" ? 100 : 0,
    difficulty: p.difficulty,
    priority: p.priority,
    depends_on: [...p.depends_on],
    effort: "",
    started_at: null,
    ended_at: null,
    constraints: [...p.constraints],
    forbidden: [...p.forbidden],
    references: [...p.references],
    notes: applyTriageRole([], p.triage),
    subtasks: [],
    ...(p.quest ? { quest: p.quest } : {}),
  };
}

// ---------------------------------------------------------------------------
// Quest <-> issue
// ---------------------------------------------------------------------------

/** Quest -> issue draft, labelled `spec`. */
export function renderQuestIssue(quest: Quest): IssueDraft {
  return {
    title: titleWithId(quest.id, quest.title),
    body: buildBody(
      quest.goal,
      [
        ["Constraints", quest.constraints?.add ?? []],
        ["Forbidden", quest.constraints?.ban ?? []],
        ["Blocked by", quest.depends_on],
      ],
      markerFor("quest", quest.id),
    ),
    labels: [SPEC_LABEL, `priority:${quest.priority}`, `difficulty:${quest.difficulty}`],
    ...questStatusToIssueState(quest.status),
  };
}

export interface ParsedQuest {
  id: string;
  title: string;
  goal: string;
  status: QuestStatus;
  priority: Priority;
  difficulty: Difficulty;
  depends_on: string[];
  constraints_add: string[];
  constraints_ban: string[];
  fromMarker: boolean;
}

export function parseIssueToQuest(issue: RemoteIssue): ParsedQuest {
  const marker = findMarker(issue.body);
  const markerId = marker?.kind === "quest" ? marker.id : null;
  const { text, sections } = parseBody(issue.body);
  const title = stripTitleId(issue.title, markerId);
  return {
    id: markerId ?? `gh-${issue.number}-${slugify(title)}`,
    title,
    goal: text,
    status: issueStateToQuestStatus(issue.state, issue.stateReason),
    priority: parsePriority(issue.labels),
    difficulty: parseDifficulty(issue.labels),
    depends_on: sections["Blocked by"] ?? [],
    constraints_add: sections["Constraints"] ?? [],
    constraints_ban: sections["Forbidden"] ?? [],
    fromMarker: markerId !== null,
  };
}

/** Syncable views of parsed issues, for hashing and merging against local. */
export function parsedTaskSyncable(p: ParsedTask) {
  return taskSyncable(parsedToTask(p));
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

const ROLES: readonly CommentRole[] = ["agent", "human", "system"];
const ATTRIBUTION_RE = /^_\*\*(.*)\*\* \((agent|human|system)\) · woco comment `([A-Za-z0-9][A-Za-z0-9._-]*)`_$/;

/** Attribution line + body + marker. */
export function renderCommentBody(c: Pick<Comment, "id" | "author" | "role" | "body">): string {
  const author = c.author.replace(/\s*\n\s*/g, " ").trim() || "unknown";
  return [`_**${author}** (${c.role}) · woco comment \`${c.id}\`_`, c.body.trim(), markerFor("comment", c.id)].join("\n\n");
}

export interface ParsedCommentBody {
  /** woco comment id from the marker, or null for a foreign GitHub comment */
  id: string | null;
  author: string | null;
  role: CommentRole | null;
  body: string;
}

/** Reverse of renderCommentBody. Foreign comments yield id/author/role null and the body as-is. */
export function parseCommentBody(text: string): ParsedCommentBody {
  const marker = findMarker(text);
  const id = marker?.kind === "comment" ? marker.id : null;
  let rest = stripMarker(text ?? "").replace(/\r\n/g, "\n");
  let author: string | null = null;
  let role: CommentRole | null = null;
  const nl = rest.indexOf("\n");
  const first = nl === -1 ? rest : rest.slice(0, nl);
  const m = ATTRIBUTION_RE.exec(first);
  if (m && id !== null && m[3] === id && ROLES.includes(m[2] as CommentRole)) {
    author = m[1]!;
    role = m[2] as CommentRole;
    rest = nl === -1 ? "" : rest.slice(nl + 1);
  }
  return { id, author, role, body: rest.trim() };
}

/**
 * GitHub comment -> woco comment. Our own comments keep their woco id,
 * author and role; foreign ones become human comments with id `gh-<id>`.
 */
export function parseRemoteComment(rc: RemoteComment, ref: { kind: "task" | "quest"; id: string }): Comment {
  const p = parseCommentBody(rc.body);
  return {
    id: p.id ?? `gh-${rc.id}`,
    ref_kind: ref.kind,
    ref_id: ref.id,
    author: p.author ?? rc.user,
    role: p.role ?? "human",
    created_at: rc.createdAt,
    body: p.body,
    github_url: rc.url,
  };
}
