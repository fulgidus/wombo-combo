/**
 * retro.ts — Pure, offline retro signal collectors and candidate derivation.
 *
 * `collectRetroInput` reads existing project files (analytics snapshots,
 * replays, eval reports, comments) and condenses them into a plain
 * `RetroInput`. Missing sources are skipped, never errors.
 * `deriveCandidates` turns that input into improvement candidates grouped by
 * the categories of `.claude/skills/retro/SKILL.md`. Both are deterministic:
 * the same files (and `now`) always give the same output. All thresholds are
 * the named constants below.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { WOMBO_DIR } from "../config";
import { AnalyticsStore } from "./analytics";
import { ReplayStore } from "./replay";
import type { LoadedReplay, ReplayEvent } from "./replay";
import { loadEvalReport } from "./eval-score";
import { commentsDir, listComments } from "./comments";
import type { CommentRef } from "./comments";

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Read/Grep/Glob calls before the first edit that count as a navigation problem. */
export const NAV_READS_THRESHOLD = 15;
/** Tool output length (chars) that counts as "very large" (replays cap at 8 KiB). */
export const LARGE_OUTPUT_CHARS = 6000;
/** Times the same command must fail within one execution to count as repeated. */
export const REPEATED_FAILURE_THRESHOLD = 3;
/** Ordinary retries at which an execution counts as retry-heavy. */
export const RETRY_THRESHOLD = 2;
/** Distinct executions at which a pattern is "high" severity. */
export const HIGH_EXECUTIONS = 3;
/** Distinct executions at which a pattern is "medium" severity. */
export const MEDIUM_EXECUTIONS = 2;
/** Evidence entries kept per candidate. */
export const MAX_EVIDENCE = 5;
/** Max characters of an evidence quote. */
export const QUOTE_CHARS = 160;

export const EDIT_TOOLS: readonly string[] = ["edit", "write", "multiedit", "patch", "apply_patch", "notebookedit"];
export const EXPLORE_TOOLS: readonly string[] = ["read", "grep", "glob"];
const CHECK_COMMAND = /\b(bun\s+(run\s+)?(test|typecheck|build|lint)|tsc|eslint|biome|vitest|jest|pytest|cargo\s+(test|build|check)|go\s+(test|build|vet))\b/i;
const CHECK_FAILURE_OUTPUT = /\b(\d+\s+fail|error TS\d+|FAIL\b|failed|error:)/i;
const ACCESS_ERROR = /(permission denied|EACCES|unauthorized|forbidden|\b40[13]\b|ENOTFOUND|ECONNREFUSED|network|not logged in|no access)/i;
const MISSING_PATH_ERROR = /(ENOENT|no such file|not found|does not exist)/i;
const BLOCKER_COMMENT = /\b(blocked|blocker|cannot access|can't access|missing (docs?|info|access|credentials?)|no access|unable to find)\b/i;
const REVIEW_COMMENT = /\b(review(er)?|finding|nit|should (not )?use|please (use|rename|avoid))\b/i;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RetroCategory =
  | "navigation"
  | "automated-checks"
  | "coding-standards"
  | "steering-files"
  | "tool-economy"
  | "information-access";

/** Category order used for stable sorting and display. */
export const RETRO_CATEGORIES: readonly RetroCategory[] = [
  "navigation",
  "automated-checks",
  "coding-standards",
  "steering-files",
  "tool-economy",
  "information-access",
];

export type RetroSeverity = "high" | "medium" | "low";
const SEVERITY_RANK: Record<RetroSeverity, number> = { high: 0, medium: 1, low: 2 };

export interface RetroScope {
  task?: string;
  quest?: string;
  sinceDays?: number;
}

export interface RetroToolError {
  tool: string;
  message: string;
}

export interface ReplaySignals {
  toolErrors: RetroToolError[];
  /** Commands that failed REPEATED_FAILURE_THRESHOLD+ times, with counts. */
  repeatedFailingCommands: { command: string; count: number }[];
  /** Read/Grep/Glob calls before the first edit; null when nothing was edited. */
  exploreCallsBeforeFirstEdit: number | null;
  /** Paths read (read tool) before the first edit, in order. */
  pathsReadBeforeFirstEdit: string[];
  largeOutputs: { tool: string; chars: number }[];
  /** Build/test/lint commands that failed, with a short quote. */
  checkFailures: { command: string; quote: string }[];
  /** Reasons recorded for retry attempts. */
  retryReasons: string[];
  /** End record detail when the execution did not succeed. */
  endDetail: string | null;
}

export interface ExecutionSignal {
  taskId: string;
  executionId: string;
  questId: string | null;
  startedAt: string | null;
  outcome: string;
  mergeOutcome: string | null;
  retryCount: number;
  buildAttempts: number;
  buildPasses: number;
  replay: ReplaySignals | null;
}

export interface CommentSignal {
  refKind: "task" | "quest";
  refId: string;
  id: string;
  author: string;
  role: string;
  createdAt: string;
  body: string;
}

export interface EvalSignal {
  waveId: string;
  overall: number | null;
  steeringViolations: { a: string; b: string; path: string }[];
  routingMismatches: { taskId: string; expected: string | null; actual: string | null }[];
  failed: number;
  totalRetries: number;
}

export interface RetroInput {
  scope: RetroScope;
  /** ISO lower bound derived from sinceDays, or null. */
  since: string | null;
  executions: ExecutionSignal[];
  comments: CommentSignal[];
  evals: EvalSignal[];
}

export interface RetroEvidence {
  taskId: string;
  executionId: string | null;
  quote: string;
}

export interface RetroCandidate {
  /** Stable id: `<category>:<pattern>`. */
  id: string;
  category: RetroCategory;
  severity: RetroSeverity;
  title: string;
  /** Concrete change to make to the agent's environment. */
  suggestion: string;
  evidence: RetroEvidence[];
}

export interface CollectOptions {
  projectRoot: string;
  scope?: RetroScope;
  /** Clock override for deterministic tests (ms since epoch). */
  now?: number;
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

function quote(s: string): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > QUOTE_CHARS ? flat.slice(0, QUOTE_CHARS - 1) + "…" : flat;
}

function toolName(e: ReplayEvent): string {
  return (e.tool ?? "").toLowerCase();
}

function inputString(e: ReplayEvent, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = e.input?.[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

/** Derive per-execution signals from one loaded replay. Pure. */
export function analyzeReplay(replay: LoadedReplay): ReplaySignals {
  const out: ReplaySignals = {
    toolErrors: [],
    repeatedFailingCommands: [],
    exploreCallsBeforeFirstEdit: null,
    pathsReadBeforeFirstEdit: [],
    largeOutputs: [],
    checkFailures: [],
    retryReasons: [],
    endDetail: null,
  };
  let explore = 0;
  let edited = false;
  const failCounts = new Map<string, number>();

  for (const rec of replay.records) {
    if (rec.kind === "attempt") {
      if (rec.reason === "retry" && rec.text) out.retryReasons.push(quote(rec.text));
      continue;
    }
    if (rec.kind !== "event") continue;
    const e = rec.event;
    if (e.type === "error" && e.error) {
      out.toolErrors.push({ tool: "agent", message: quote(e.error) });
      continue;
    }
    if (e.type !== "tool") continue;
    const tool = toolName(e);
    const failed = e.status === "error" || Boolean(e.error);

    if (!edited) {
      if (EDIT_TOOLS.includes(tool)) {
        edited = true;
        out.exploreCallsBeforeFirstEdit = explore;
      } else if (EXPLORE_TOOLS.includes(tool)) {
        explore++;
        if (tool === "read") {
          const p = inputString(e, "filePath", "file_path", "path");
          if (p) out.pathsReadBeforeFirstEdit.push(p);
        }
      }
    }

    if (e.output && (e.output.length >= LARGE_OUTPUT_CHARS || e.truncated)) {
      out.largeOutputs.push({ tool: tool || "unknown", chars: e.output.length });
    }
    if (failed) {
      out.toolErrors.push({ tool: tool || "unknown", message: quote(e.error ?? e.output ?? "tool failed") });
    }
    const command = inputString(e, "command", "cmd");
    if (command) {
      const outputFailed = Boolean(e.output && CHECK_FAILURE_OUTPUT.test(e.output));
      if (failed) {
        const key = command.replace(/\s+/g, " ").trim();
        failCounts.set(key, (failCounts.get(key) ?? 0) + 1);
      }
      if (CHECK_COMMAND.test(command) && (failed || outputFailed)) {
        out.checkFailures.push({ command: quote(command), quote: quote(e.error ?? e.output ?? "failed") });
      }
    }
  }

  out.repeatedFailingCommands = [...failCounts.entries()]
    .filter(([, n]) => n >= REPEATED_FAILURE_THRESHOLD)
    .map(([command, count]) => ({ command: quote(command), count }))
    .sort((a, b) => b.count - a.count || a.command.localeCompare(b.command));

  if (replay.end && replay.end.outcome !== "succeeded") {
    out.endDetail = quote(replay.end.detail ?? replay.end.outcome);
  }
  return out;
}

function listCommentRefs(projectRoot: string): CommentRef[] {
  const refs: CommentRef[] = [];
  for (const kind of ["task", "quest"] as const) {
    const dir = join(commentsDir(projectRoot), kind);
    if (!existsSync(dir)) continue;
    try {
      for (const d of readdirSync(dir, { withFileTypes: true })) {
        if (d.isDirectory()) refs.push({ kind, id: d.name });
      }
    } catch {
      /* unreadable source: skip */
    }
  }
  return refs.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

function collectExecutions(projectRoot: string, scope: RetroScope, since: number | null): ExecutionSignal[] {
  const byId = new Map<string, ExecutionSignal>();

  try {
    for (const r of new AnalyticsStore(projectRoot).load().records) {
      byId.set(r.execution_id, {
        taskId: r.task_id,
        executionId: r.execution_id,
        questId: r.quest_id,
        startedAt: r.first_started_at,
        outcome: r.outcome,
        mergeOutcome: r.merge_outcome,
        retryCount: r.retry_count,
        buildAttempts: r.build_attempts,
        buildPasses: r.build_passes,
        replay: null,
      });
    }
  } catch {
    /* skip analytics */
  }

  try {
    const store = new ReplayStore(projectRoot);
    for (const s of store.list()) {
      const loaded = store.load(s.task_id, s.execution_id);
      if (!loaded) continue;
      const signals = analyzeReplay(loaded);
      const existing = byId.get(s.execution_id);
      if (existing) {
        existing.replay = signals;
      } else {
        byId.set(s.execution_id, {
          taskId: s.task_id,
          executionId: s.execution_id,
          questId: s.quest_id,
          startedAt: s.started_at,
          outcome: s.outcome,
          mergeOutcome: null,
          retryCount: Math.max(0, s.attempts - 1),
          buildAttempts: 0,
          buildPasses: 0,
          replay: signals,
        });
      }
    }
  } catch {
    /* skip replays */
  }

  return [...byId.values()]
    .filter((x) => !scope.task || x.taskId === scope.task)
    .filter((x) => !scope.quest || x.questId === scope.quest)
    .filter((x) => since === null || !x.startedAt || Date.parse(x.startedAt) >= since)
    .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? "") || a.executionId.localeCompare(b.executionId));
}

function collectComments(projectRoot: string, scope: RetroScope, taskIds: Set<string>, since: number | null): CommentSignal[] {
  let refs: CommentRef[];
  if (scope.task) refs = [{ kind: "task", id: scope.task }];
  else if (scope.quest) {
    refs = [{ kind: "quest", id: scope.quest }, ...[...taskIds].sort().map((id) => ({ kind: "task" as const, id }))];
  } else refs = listCommentRefs(projectRoot);

  const out: CommentSignal[] = [];
  for (const ref of refs) {
    try {
      for (const c of listComments(projectRoot, ref)) {
        if (since !== null && Date.parse(c.created_at) < since) continue;
        out.push({
          refKind: c.ref_kind,
          refId: c.ref_id,
          id: c.id,
          author: c.author,
          role: c.role,
          createdAt: c.created_at,
          body: c.body,
        });
      }
    } catch {
      /* skip unreadable refs */
    }
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

function collectEvals(projectRoot: string, scope: RetroScope, taskIds: Set<string>, since: number | null): EvalSignal[] {
  const dir = join(projectRoot, WOMBO_DIR, "evals");
  if (!existsSync(dir)) return [];
  const scoped = Boolean(scope.task || scope.quest);
  const out: EvalSignal[] = [];
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  for (const f of files) {
    const report = loadEvalReport(projectRoot, f.slice(0, -".json".length));
    if (!report || typeof report !== "object") continue;
    if (since !== null && report.evaluated_at && Date.parse(report.evaluated_at) < since) continue;
    const inScope = (id: string) => !scoped || taskIds.has(id);
    const steeringViolations = (report.steering?.violations ?? []).filter((v) => inScope(v.a) || inScope(v.b));
    const routingMismatches = (report.routing?.mismatches ?? [])
      .filter((m) => inScope(m.feature_id))
      .map((m) => ({ taskId: m.feature_id, expected: m.expected_model, actual: m.actual_model }));
    if (scoped && steeringViolations.length === 0 && routingMismatches.length === 0) continue;
    out.push({
      waveId: report.wave_id ?? f.slice(0, -5),
      overall: report.overall ?? null,
      steeringViolations,
      routingMismatches,
      failed: report.flow?.failed ?? 0,
      totalRetries: report.flow?.total_retries ?? 0,
    });
  }
  return out;
}

/** Gather retro signals from project files. Offline; missing sources are skipped. */
export function collectRetroInput(opts: CollectOptions): RetroInput {
  const scope = opts.scope ?? {};
  const now = opts.now ?? Date.now();
  const sinceMs = scope.sinceDays !== undefined ? now - scope.sinceDays * 86_400_000 : null;
  const executions = collectExecutions(opts.projectRoot, scope, sinceMs);
  const taskIds = new Set(executions.map((e) => e.taskId));
  if (scope.task) taskIds.add(scope.task);
  return {
    scope,
    since: sinceMs === null ? null : new Date(sinceMs).toISOString(),
    executions,
    comments: collectComments(opts.projectRoot, scope, taskIds, sinceMs),
    evals: collectEvals(opts.projectRoot, scope, taskIds, sinceMs),
  };
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

function severityFor(distinctExecutions: number): RetroSeverity {
  if (distinctExecutions >= HIGH_EXECUTIONS) return "high";
  if (distinctExecutions >= MEDIUM_EXECUTIONS) return "medium";
  return "low";
}

function candidate(
  category: RetroCategory,
  pattern: string,
  severity: RetroSeverity,
  title: string,
  suggestion: string,
  evidence: RetroEvidence[],
): RetroCandidate {
  return { id: `${category}:${pattern}`, category, severity, title, suggestion, evidence: evidence.slice(0, MAX_EVIDENCE) };
}

function distinct(evidence: RetroEvidence[]): number {
  return new Set(evidence.map((e) => e.executionId ?? e.taskId)).size;
}

function topPaths(paths: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const p of paths) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([p]) => p);
}

/** Turn collected signals into candidates, most severe first. Pure and deterministic. */
export function deriveCandidates(input: RetroInput): RetroCandidate[] {
  const out: RetroCandidate[] = [];
  const withReplay = input.executions.filter((e) => e.replay);

  // Navigation: many explore calls before the first edit.
  const nav = withReplay.filter(
    (e) => (e.replay!.exploreCallsBeforeFirstEdit ?? 0) >= NAV_READS_THRESHOLD,
  );
  if (nav.length > 0) {
    const targets = topPaths(nav.flatMap((e) => e.replay!.pathsReadBeforeFirstEdit), 3);
    const reads = nav.map((e) => e.replay!.exploreCallsBeforeFirstEdit!);
    const max = Math.max(...reads);
    const where = targets.length > 0 ? ` (most read: ${targets.join(", ")})` : "";
    out.push(
      candidate(
        "navigation",
        "explore-before-edit",
        severityFor(nav.length),
        "Agents explore a lot before their first edit",
        `Add a navigation pointer from AGENTS.md to the doc or directory that explains where this work lives${where}, because ${nav.length} agent(s) spent up to ${max} Read/Grep/Glob calls before editing.`,
        nav.map((e) => ({
          taskId: e.taskId,
          executionId: e.executionId,
          quote: `${e.replay!.exploreCallsBeforeFirstEdit} Read/Grep/Glob calls before the first edit`,
        })),
      ),
    );
  }

  // Navigation: reads of paths that do not exist.
  const missing = withReplay.flatMap((e) =>
    e.replay!.toolErrors
      .filter((t) => MISSING_PATH_ERROR.test(t.message) && EXPLORE_TOOLS.includes(t.tool))
      .map((t) => ({ taskId: e.taskId, executionId: e.executionId, quote: t.message })),
  );
  if (missing.length > 0) {
    out.push(
      candidate(
        "navigation",
        "missing-paths",
        severityFor(distinct(missing)),
        "Agents look for files that are not where they expect",
        "Fix stale file references in AGENTS.md and docs, or add a navigation pointer to the real location of the files agents tried to read.",
        missing,
      ),
    );
  }

  // Automated checks: build/test/lint failures, verification failures.
  const checks = withReplay.flatMap((e) =>
    e.replay!.checkFailures.map((c) => ({ taskId: e.taskId, executionId: e.executionId, quote: `${c.command}: ${c.quote}` })),
  );
  if (checks.length > 0) {
    out.push(
      candidate(
        "automated-checks",
        "check-failures",
        severityFor(distinct(checks)),
        "Agents hit failing build, test or lint runs",
        "Run the failing check earlier: add it to a pre-commit hook or the agent's per-commit routine, and turn the recurring failure into a deterministic lint rule if it is mechanical.",
        checks,
      ),
    );
  }
  const verify = input.executions.filter((e) => e.buildAttempts > e.buildPasses);
  if (verify.length > 0) {
    out.push(
      candidate(
        "automated-checks",
        "verification-failures",
        severityFor(verify.length),
        "Verification failed before an execution passed",
        "Make the verification command available to agents during implementation (document it in AGENTS.md) so failures are caught before the orchestrator verifies.",
        verify.map((e) => ({
          taskId: e.taskId,
          executionId: e.executionId,
          quote: `${e.buildAttempts - e.buildPasses} of ${e.buildAttempts} build attempts failed`,
        })),
      ),
    );
  }

  // Coding standards: reviewer findings in comments.
  const review = input.comments.filter((c) => c.role !== "system" && REVIEW_COMMENT.test(c.body));
  if (review.length > 0) {
    const ev = review.map((c) => ({ taskId: c.refId, executionId: null, quote: quote(c.body) }));
    out.push(
      candidate(
        "coding-standards",
        "reviewer-findings",
        severityFor(new Set(review.map((c) => c.refId)).size),
        "Reviewers raised findings that agents should not need to be told",
        "Classify each finding: if mechanical (banned API, import shape, file location), add a lint rule or CI check; if a judgement call, add it to CODING_STANDARDS.md for the reviewer agent.",
        ev,
      ),
    );
  }

  // Steering files: eval steering violations, retried or failed executions.
  const steering = input.evals.flatMap((ev) =>
    ev.steeringViolations.map((v) => ({
      taskId: v.a,
      executionId: null,
      quote: `${v.a} and ${v.b} both touch ${v.path} (wave ${ev.waveId})`,
    })),
  );
  if (steering.length > 0) {
    const paths = [...new Set(input.evals.flatMap((ev) => ev.steeringViolations.map((v) => v.path)))].sort();
    out.push(
      candidate(
        "steering-files",
        "shared-paths",
        severityFor(steering.length),
        "Tasks share files and conflict-prone paths",
        `Scope tasks away from the shared paths (${paths.slice(0, 3).join(", ")}) or document ownership of them in AGENTS.md.`,
        steering,
      ),
    );
  }
  const troubled = input.executions.filter((e) => e.outcome === "failed" || e.retryCount >= RETRY_THRESHOLD);
  if (troubled.length > 0) {
    out.push(
      candidate(
        "steering-files",
        "retries-and-failures",
        troubled.some((e) => e.outcome === "failed") ? (troubled.length >= MEDIUM_EXECUTIONS ? "high" : "medium") : severityFor(troubled.length),
        "Executions failed or needed repeated retries",
        "Read the retry reasons and tighten the task spec or the matching AGENTS.md instruction; remove steering lines that did not change the outcome.",
        troubled.map((e) => ({
          taskId: e.taskId,
          executionId: e.executionId,
          quote: e.replay?.retryReasons[0] ?? e.replay?.endDetail ?? `outcome ${e.outcome}, ${e.retryCount} retries`,
        })),
      ),
    );
  }

  // Tool economy: very large outputs and repeated failing commands.
  const large = withReplay.flatMap((e) =>
    e.replay!.largeOutputs.map((o) => ({ taskId: e.taskId, executionId: e.executionId, quote: `${o.tool} returned ${o.chars} chars` })),
  );
  if (large.length > 0) {
    out.push(
      candidate(
        "tool-economy",
        "large-outputs",
        severityFor(distinct(large)),
        "Tool calls returned very large outputs",
        "Add an output-limiting flag or a summarising wrapper (for example --output json with a field filter) to the tool that produced them, and mention it in AGENTS.md.",
        large,
      ),
    );
  }
  const repeated = withReplay.flatMap((e) =>
    e.replay!.repeatedFailingCommands.map((c) => ({
      taskId: e.taskId,
      executionId: e.executionId,
      quote: `${c.command} failed ${c.count} times`,
    })),
  );
  if (repeated.length > 0) {
    out.push(
      candidate(
        "tool-economy",
        "repeated-failing-commands",
        severityFor(distinct(repeated)),
        "Agents retried the same failing command",
        "Document the correct invocation of this command (or make the tool's error message say how to fix it) so agents stop repeating it.",
        repeated,
      ),
    );
  }

  // Information access: blockers in comments, access errors in tool calls.
  const blockers = input.comments
    .filter((c) => BLOCKER_COMMENT.test(c.body))
    .map((c) => ({ taskId: c.refId, executionId: null, quote: quote(c.body) }));
  const access = withReplay.flatMap((e) =>
    e.replay!.toolErrors
      .filter((t) => ACCESS_ERROR.test(t.message))
      .map((t) => ({ taskId: e.taskId, executionId: e.executionId, quote: `${t.tool}: ${t.message}` })),
  );
  const info = [...blockers, ...access];
  if (info.length > 0) {
    out.push(
      candidate(
        "information-access",
        "blocked-on-information",
        blockers.length > 0 ? (distinct(info) >= MEDIUM_EXECUTIONS ? "high" : "medium") : severityFor(distinct(info)),
        "Agents were blocked on information or access they lacked",
        "Give agents the missing information: add the doc to the repo, tee the relevant logs to a readable file, or grant read-only access to the service they could not reach.",
        info,
      ),
    );
  }

  return out.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      RETRO_CATEGORIES.indexOf(a.category) - RETRO_CATEGORIES.indexOf(b.category) ||
      a.id.localeCompare(b.id),
  );
}
