/**
 * quest-planner.ts — Quest planner execution pipeline.
 *
 * Launches the quest-planner agent as a single-agent headless process,
 * captures its structured YAML output, validates the plan (DAG check,
 * file overlap detection), and stores the proposed plan on the quest.
 *
 * The planner runs in the project root (not a worktree) since it only
 * reads code — it never writes to the codebase.
 */

import { loadProjectContext } from "./project-store";
import type { ChildProcess } from "node:child_process";
import { existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, basename, dirname } from "node:path";
import { parse as parseYaml } from "yaml";
import type { WomboConfig } from "../config";
import { launchPlanner, canonicalizeOutput } from "./launcher";
import type { Quest } from "./quest";
import { getQuestTaskIds } from "./quest";
import type { Task, Priority, Difficulty } from "./tasks";
import { createBlankTask, saveTaskToStore } from "./tasks";
import { loadTasksFromStore, loadArchiveFromStore } from "./task-store";
import { loadQuestKnowledge, saveQuest, saveQuestKnowledge, loadAllQuests } from "./quest-store";
import {
  analyzePrerequisites,
  describeFindings,
  formatPrerequisiteSection,
  validateProposedPrerequisites,
} from "./quest-prerequisites";
import { buildScoutIndex, formatScoutTree } from "./subagents/scout";
import {
  createPlannerTelemetry,
  formatPlannerTelemetry,
  type PlannerTelemetrySnapshot,
} from "./planner-telemetry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A proposed task from the planner (before validation/normalization). */
export interface ProposedTask {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  difficulty: Difficulty;
  effort: string;
  depends_on: string[];
  constraints: string[];
  forbidden: string[];
  references: string[];
  notes: string[];
  agent?: string;
}

/** Raw planner output shape (parsed from YAML). */
export interface PlannerOutput {
  tasks: ProposedTask[];
  knowledge?: string;
  /** Other quests the planner says must run before this one */
  prerequisite_quests?: string[];
}

/** Validation issue found in the proposed plan. */
export interface PlanValidationIssue {
  level: "error" | "warning";
  taskId?: string;
  message: string;
}

/** A plan proposed earlier in the same batch (plan-all) but not applied yet. */
export interface PendingPlan {
  questId: string;
  title: string;
  tasks: { id: string; title: string; references: string[] }[];
}

/** Result of running the quest planner. */
export interface PlanResult {
  success: boolean;
  tasks: ProposedTask[];
  knowledge: string | null;
  issues: PlanValidationIssue[];
  rawOutput: string;
  error?: string;
  /** Pre-flight warnings about unsatisfied or proposed prerequisite quests */
  prerequisiteWarnings?: string[];
  /** Accepted planner-proposed prerequisite quest IDs (merged on apply) */
  prerequisiteQuests?: string[];
}

// ---------------------------------------------------------------------------
// Prompt Generation
// ---------------------------------------------------------------------------

/**
 * Generate the prompt for the quest planner agent.
 * Includes the quest goal, constraints, and a codebase outline.
 */
export async function generatePlannerPrompt(
  quest: Quest,
  projectRoot: string,
  config: WomboConfig,
  extra?: { pendingPlans?: PendingPlan[] }
): Promise<string> {
  const sections: string[] = [];

  sections.push(`# Plan Quest: ${quest.title}`);
  sections.push(`**Quest ID:** \`${quest.id}\``);
  sections.push(`**Branch:** \`${quest.branch}\` (forked from \`${quest.baseBranch}\`)`);
  sections.push(`**Priority:** ${quest.priority} | **Difficulty:** ${quest.difficulty}`);

  sections.push(`\n## Quest Goal\n`);
  sections.push(quest.goal.trim());

  // Project profile: tasks must fit the project's rules and conventions
  const projectContext = loadProjectContext(projectRoot);
  if (projectContext) {
    sections.push("");
    sections.push(projectContext);
  }

  // Previous planning feedback — steer re-plans away from rejected approaches
  if (quest.notes.length > 0) {
    sections.push(`\n## Previous Planning Feedback\n`);
    sections.push(
      "The user rejected or aborted earlier planning runs. The notes below " +
        "record what happened — plan DIFFERENTLY this time:\n"
    );
    for (const note of quest.notes.slice(-10)) {
      sections.push(`- ${note}`);
    }
  }

  // Quest constraints
  if (quest.constraints.add.length > 0) {
    sections.push(`\n## Quest Constraints\n`);
    sections.push("All tasks must follow these constraints:\n");
    for (const c of quest.constraints.add) {
      sections.push(`- ${c}`);
    }
  }

  if (quest.constraints.ban.length > 0) {
    sections.push(`\n## Quest Forbidden Items\n`);
    sections.push("All tasks must NOT do any of the following:\n");
    for (const b of quest.constraints.ban) {
      sections.push(`- ${b}`);
    }
  }

  // Codebase outline — use scout index for richer information
  sections.push(`\n## Codebase Outline\n`);
  sections.push(
    "Below is the project structure with exported symbol counts. Use your tools to explore " +
    "specific files in depth.\n"
  );
  sections.push("```");
  try {
    const scoutIndex = await buildScoutIndex(projectRoot);
    sections.push(formatScoutTree(scoutIndex, { maxDepth: 4, showSymbolCounts: true, maxLines: 150 }));
  } catch {
    // Fall back to basic directory tree if scout fails
    sections.push(generateDirectoryTree(projectRoot, 3));
  }
  sections.push("```");

  // Existing knowledge
  const knowledge = loadQuestKnowledge(projectRoot, quest.id);
  if (knowledge) {
    sections.push(`\n## Existing Quest Knowledge\n`);
    sections.push("Previous planning sessions produced this knowledge:\n");
    sections.push("---");
    sections.push(knowledge.trim());
    sections.push("---");
  }

  // Existing task IDs (if re-planning)
  const existingTaskIds = getQuestTaskIds(quest.id, loadTasksFromStore(projectRoot, config).tasks);
  if (existingTaskIds.length > 0) {
    sections.push(`\n## Existing Tasks\n`);
    sections.push(
      "This quest already has tasks. Your plan should either replace them " +
      "entirely or extend them. Existing task IDs:\n"
    );
    for (const tid of existingTaskIds) {
      sections.push(`- \`${tid}\``);
    }
  }

  // Prerequisite quests + other in-flight work (collision / rewrite awareness)
  const prereqSection = formatPrerequisiteSection(
    analyzePrerequisites(
      quest,
      loadAllQuests(projectRoot),
      [
        ...loadTasksFromStore(projectRoot, config).tasks,
        ...loadArchiveFromStore(projectRoot, config).tasks,
      ],
    ),
  );
  if (prereqSection) sections.push(prereqSection);

  // Plans from the same plan-all batch that are proposed but not applied yet
  if (extra?.pendingPlans?.length) {
    sections.push("\n## Plans Proposed Earlier In This Batch (not applied yet)\n");
    sections.push(
      "These quests were planned just before this one. Their tasks will exist when this quest " +
        "runs. Do not duplicate or rewrite them.\n",
    );
    for (const p of extra.pendingPlans) {
      sections.push(`- \`${p.questId}\`: ${p.title}`);
      for (const t of p.tasks.slice(0, 15)) {
        const refs = t.references.length ? ` — ${t.references.join(", ")}` : "";
        sections.push(`  - task \`${t.id}\`: ${t.title}${refs}`);
      }
    }
  }

  // Build info
  sections.push(`\n## Build System\n`);
  sections.push(`Build command: \`${config.build.command}\``);
  if (config.build.timeout) {
    sections.push(`Build timeout: ${config.build.timeout}ms`);
  }

  // Notes from the quest
  if (quest.notes.length > 0) {
    sections.push(`\n## Quest Notes\n`);
    for (const n of quest.notes) {
      sections.push(`- ${n}`);
    }
  }

  sections.push(`\n## Instructions\n`);
  sections.push(
    "Explore the codebase thoroughly, then produce a task breakdown as specified " +
    "in your agent definition. Output a single YAML fenced code block as your " +
    "final output."
  );

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Directory Tree Generator (lightweight codebase outline)
// ---------------------------------------------------------------------------

/** Directories to always skip in the tree. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".wombo-combo",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  ".tox",
  "target",
  ".idea",
  ".vscode",
]);

/**
 * Generate a simple directory tree string, limited to `maxDepth` levels.
 * Shows directories and files, skipping common non-source directories.
 */
function generateDirectoryTree(
  rootPath: string,
  maxDepth: number,
  prefix: string = "",
  currentDepth: number = 0
): string {
  if (currentDepth >= maxDepth) return "";

  let entries: string[];
  try {
    entries = readdirSync(rootPath).sort();
  } catch {
    return "";
  }

  const lines: string[] = [];
  const filtered = entries.filter(
    (e) => !e.startsWith(".") || e === ".opencode"
  );

  // Separate dirs and files
  const dirs: string[] = [];
  const files: string[] = [];
  for (const entry of filtered) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = resolve(rootPath, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        dirs.push(entry);
      } else {
        files.push(entry);
      }
    } catch {
      // skip unreadable
    }
  }

  // Show files at this level
  for (const file of files) {
    lines.push(`${prefix}${file}`);
  }

  // Recurse into directories
  for (const dir of dirs) {
    lines.push(`${prefix}${dir}/`);
    const sub = generateDirectoryTree(
      resolve(rootPath, dir),
      maxDepth,
      prefix + "  ",
      currentDepth + 1
    );
    if (sub) lines.push(sub);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// YAML Extraction from Agent Output
// ---------------------------------------------------------------------------

/**
 * Extract the YAML task plan from the agent's raw text output.
 * Looks for the last ```yaml ... ``` fenced code block.
 */
export function extractPlanYaml(rawOutput: string): string | null {
  // Find all yaml fenced blocks
  const pattern = /```ya?ml\s*\n([\s\S]*?)```/gi;
  let lastMatch: string | null = null;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(rawOutput)) !== null) {
    lastMatch = m[1];
  }

  return lastMatch?.trim() ?? null;
}

/**
 * Parse the extracted YAML into a PlannerOutput.
 */
export function parsePlanYaml(yaml: string): PlannerOutput {
  const parsed = parseYaml(yaml);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Planner output is not a valid YAML object.");
  }

  const tasks: ProposedTask[] = [];
  const rawTasks = (parsed as any).tasks;

  if (!Array.isArray(rawTasks)) {
    throw new Error("Planner output missing 'tasks' array.");
  }

  for (const raw of rawTasks) {
    if (!raw || typeof raw !== "object") continue;

    tasks.push({
      id: String(raw.id ?? ""),
      title: String(raw.title ?? ""),
      description: String(raw.description ?? ""),
      priority: String(raw.priority ?? "medium") as Priority,
      difficulty: String(raw.difficulty ?? "medium") as Difficulty,
      effort: String(raw.effort ?? "PT1H"),
      depends_on: Array.isArray(raw.depends_on) ? raw.depends_on.map(String) : [],
      constraints: Array.isArray(raw.constraints) ? raw.constraints.map(String) : [],
      forbidden: Array.isArray(raw.forbidden) ? raw.forbidden.map(String) : [],
      references: Array.isArray(raw.references) ? raw.references.map(String) : [],
      notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
      agent: raw.agent ? String(raw.agent) : undefined,
    });
  }

  const knowledge = typeof (parsed as any).knowledge === "string"
    ? (parsed as any).knowledge
    : null;

  const rawPrereqs = (parsed as any).prerequisite_quests;
  const prerequisite_quests = Array.isArray(rawPrereqs) ? rawPrereqs.map(String) : [];

  return { tasks, knowledge, prerequisite_quests };
}

// ---------------------------------------------------------------------------
// Plan Validation
// ---------------------------------------------------------------------------

const VALID_PRIORITIES = new Set(["critical", "high", "medium", "low", "wishlist"]);
const VALID_DIFFICULTIES = new Set(["trivial", "easy", "medium", "hard", "very_hard"]);
const ID_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

/**
 * Validate a proposed plan:
 * - Unique task IDs
 * - Valid kebab-case IDs
 * - Valid priority/difficulty enums
 * - DAG check (no cycles)
 * - Dependencies reference existing task IDs
 * - No file overlap between independent tasks
 */
export function validatePlan(plan: PlannerOutput): PlanValidationIssue[] {
  const issues: PlanValidationIssue[] = [];
  const ids = new Set<string>();

  // Pass 1: basic field validation
  for (const task of plan.tasks) {
    // Duplicate ID
    if (ids.has(task.id)) {
      issues.push({
        level: "error",
        taskId: task.id,
        message: `Duplicate task ID: "${task.id}"`,
      });
    }
    ids.add(task.id);

    // ID format
    if (!ID_RE.test(task.id)) {
      issues.push({
        level: "error",
        taskId: task.id,
        message: `Task ID must be kebab-case: "${task.id}"`,
      });
    }

    // Empty title
    if (!task.title.trim()) {
      issues.push({
        level: "error",
        taskId: task.id,
        message: "Task has no title.",
      });
    }

    // Empty description
    if (!task.description.trim()) {
      issues.push({
        level: "warning",
        taskId: task.id,
        message: "Task has no description.",
      });
    }

    // Priority/difficulty enum
    if (!VALID_PRIORITIES.has(task.priority)) {
      issues.push({
        level: "warning",
        taskId: task.id,
        message: `Invalid priority "${task.priority}", will default to "medium".`,
      });
    }
    if (!VALID_DIFFICULTIES.has(task.difficulty)) {
      issues.push({
        level: "warning",
        taskId: task.id,
        message: `Invalid difficulty "${task.difficulty}", will default to "medium".`,
      });
    }
  }

  // Pass 2: dependency validation
  for (const task of plan.tasks) {
    for (const dep of task.depends_on) {
      if (!ids.has(dep)) {
        issues.push({
          level: "error",
          taskId: task.id,
          message: `Depends on unknown task ID: "${dep}"`,
        });
      }
    }
  }

  // Pass 3: cycle detection (DFS-based)
  const cycleErrors = detectCycles(plan.tasks);
  issues.push(...cycleErrors);

  // Pass 4: file overlap detection between independent tasks
  const overlapWarnings = detectFileOverlaps(plan.tasks);
  issues.push(...overlapWarnings);

  return issues;
}

/**
 * Detect cycles in the task dependency graph using DFS.
 */
function detectCycles(tasks: ProposedTask[]): PlanValidationIssue[] {
  const issues: PlanValidationIssue[] = [];
  const adj = new Map<string, string[]>();
  const taskIds = new Set<string>();

  for (const t of tasks) {
    taskIds.add(t.id);
    adj.set(t.id, t.depends_on.filter((d) => taskIds.has(d)));
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of taskIds) color.set(id, WHITE);

  function dfs(node: string, path: string[]): boolean {
    color.set(node, GRAY);
    path.push(node);

    for (const neighbor of adj.get(node) ?? []) {
      if (color.get(neighbor) === GRAY) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart).concat(neighbor);
        issues.push({
          level: "error",
          message: `Dependency cycle detected: ${cycle.join(" → ")}`,
        });
        return true;
      }
      if (color.get(neighbor) === WHITE) {
        if (dfs(neighbor, path)) return true;
      }
    }

    path.pop();
    color.set(node, BLACK);
    return false;
  }

  for (const id of taskIds) {
    if (color.get(id) === WHITE) {
      dfs(id, []);
    }
  }

  return issues;
}

/**
 * Detect file overlaps between tasks that can run in parallel
 * (i.e., tasks with no dependency path between them).
 *
 * Uses the `references` field as a proxy for which files a task touches.
 */
function detectFileOverlaps(tasks: ProposedTask[]): PlanValidationIssue[] {
  const issues: PlanValidationIssue[] = [];

  // Build transitive dependency sets
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const transitiveDeps = new Map<string, Set<string>>();

  function getTransitiveDeps(id: string): Set<string> {
    if (transitiveDeps.has(id)) return transitiveDeps.get(id)!;

    const deps = new Set<string>();
    const task = taskMap.get(id);
    if (task) {
      for (const dep of task.depends_on) {
        deps.add(dep);
        for (const td of getTransitiveDeps(dep)) {
          deps.add(td);
        }
      }
    }
    transitiveDeps.set(id, deps);
    return deps;
  }

  for (const t of tasks) getTransitiveDeps(t.id);

  // Check pairs
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const a = tasks[i];
      const b = tasks[j];

      // Are they independent? (no dep path in either direction)
      const aDeps = transitiveDeps.get(a.id) ?? new Set();
      const bDeps = transitiveDeps.get(b.id) ?? new Set();
      if (aDeps.has(b.id) || bDeps.has(a.id)) continue;

      // Check file overlap in references
      const aFiles = new Set(a.references);
      const overlap = b.references.filter((f) => aFiles.has(f));

      if (overlap.length > 0) {
        issues.push({
          level: "warning",
          message: `Independent tasks "${a.id}" and "${b.id}" both reference: ${overlap.join(", ")}. Consider adding a dependency.`,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Planner Execution
// ---------------------------------------------------------------------------

/** Error marker used when a planner run is aborted by the user (Esc/q). */
export const PLANNER_ABORTED = "PLANNER_ABORTED_BY_USER";

/** Registry of currently running planner child processes, by quest id. */
const activePlanners = new Map<string, ChildProcess>();

/** Quest ids whose planner run was aborted via abortQuestPlanner(). */
const abortedPlanners = new Set<string>();

/**
 * Abort the running planner for a quest, if any.
 *
 * Kills the planner child process and marks the run aborted. The pending
 * runQuestPlanner() call observes the marker after the child exits and
 * returns a PlanResult whose error is PLANNER_ABORTED.
 *
 * Returns true if a planner was running and got killed.
 */
export function abortQuestPlanner(questId: string): boolean {
  const child = activePlanners.get(questId);
  abortedPlanners.add(questId);
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return false;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // Best effort — the close handler still settles the exit promise
  }
  return true;
}

/**
 * Run the quest planner agent and capture its output.
 *
 * The planner runs headlessly in the project root (it only reads code).
 * Its stdout is captured and parsed for the YAML task plan.
 */
export async function runQuestPlanner(
  quest: Quest,
  projectRoot: string,
  config: WomboConfig,
  opts?: {
    model?: string;
    /** Callback for progress updates */
    onProgress?: (message: string) => void;
    /** Structured telemetry (model, tokens, provider cost) for aggregate views */
    onTelemetry?: (snapshot: PlannerTelemetrySnapshot) => void;
    /** Plans already proposed in the same plan-all batch */
    pendingPlans?: PendingPlan[];
  }
): Promise<PlanResult> {
  const onProgress = opts?.onProgress ?? (() => {});

  // Pre-flight: is something else supposed to run (or be planned) before this quest?
  const allQuests = loadAllQuests(projectRoot);
  const allTasks = [
    ...loadTasksFromStore(projectRoot, config).tasks,
    ...loadArchiveFromStore(projectRoot, config).tasks,
  ];
  const prerequisiteWarnings = describeFindings(analyzePrerequisites(quest, allQuests, allTasks).findings);
  for (const w of prerequisiteWarnings) onProgress(`Warning: ${w}`);

  // Generate the prompt
  onProgress("Generating planner prompt...");
  const prompt = await generatePlannerPrompt(quest, projectRoot, config, {
    pendingPlans: opts?.pendingPlans,
  });

  // Launch the planner agent
  onProgress("Launching quest planner agent...");
  const agentName = "quest-planner-agent";

  // Route the planner through the "plan" operation profile; verifies the binary / account env first
  const launch = launchPlanner({
    config,
    projectRoot,
    prompt,
    agentName,
    title: `woco: plan ${quest.id}`,
    model: opts?.model,
  });
  if (!launch.ok) {
    return {
      success: false,
      tasks: [],
      knowledge: null,
      issues: [],
      rawOutput: "",
      error: launch.error,
    };
  }

  const child = launch.result.process;

  // Track this planner for abortQuestPlanner() (Esc/q during planning)
  activePlanners.set(quest.id, child);
  abortedPlanners.delete(quest.id);

  // Transcript log for this quest — written once after the planner exits.
  // (Per-chunk appendSync(fd) silently fails in Bun — single final write instead.)
  const logPath = resolve(projectRoot, ".wombo-combo", "logs", `planner-${quest.id}.log`);

  // Stream planner stdout: collect chunks + live token/tool activity feed
  const chunks: Buffer[] = [];
  let stderrText = "";

  // Shared stream parser: model, tokens, provider cost, latest activity
  const telemetry = createPlannerTelemetry({
    model: launch.result.route.model,
    normalize: launch.result.normalize,
    onUpdate: (snap) => {
      opts?.onTelemetry?.(snap);
      const text = formatPlannerTelemetry(snap);
      if (text) onProgress(text);
    },
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
    telemetry.feed(chunk);
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    stderrText += chunk.toString();
  });

  // Wait for process to exit with a 10-minute timeout (quest planning is heavier)
  const PLANNER_TIMEOUT_MS = 10 * 60 * 1000;
  const exitCode = await new Promise<number>((resolve) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          child.kill("SIGTERM");
        } catch {
          // Best effort
        }
        resolve(-1);
      }
    }, PLANNER_TIMEOUT_MS);

    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(code ?? 1);
      }
    });

    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        stderrText += `\nSpawn error: ${err.message}`;
        resolve(1);
      }
    });
  });

  const rawOutput = Buffer.concat(chunks).toString("utf-8");

  // Flush the final partial line through the live feed
  telemetry.flush();

  // Persist the full transcript for post-mortem (single write — per-chunk
  // appendSync with an fd silently fails in Bun)
  try {
    const logDir = resolve(projectRoot, ".wombo-combo", "logs");
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    writeFileSync(logPath, rawOutput);
  } catch {
    // Best-effort transcript; planning continues without it
  }

  // Planner no longer running — drop from the abort registry
  activePlanners.delete(quest.id);

  // User aborted via abortQuestPlanner() — return the marker error so the
  // UI can show a clean "aborted" message instead of a planner failure.
  if (abortedPlanners.has(quest.id)) {
    abortedPlanners.delete(quest.id);
    return {
      success: false,
      tasks: [],
      knowledge: null,
      issues: [],
      rawOutput,
      error: PLANNER_ABORTED,
    };
  }

  if (exitCode === -1) {
    return {
      success: false,
      tasks: [],
      knowledge: null,
      issues: [],
      rawOutput,
      error: `Quest planner timed out after ${PLANNER_TIMEOUT_MS / 1000}s. The agent process was killed.`,
    };
  }

  if (exitCode !== 0 && !rawOutput.trim()) {
    return {
      success: false,
      tasks: [],
      knowledge: null,
      issues: [],
      rawOutput,
      error: `Planner agent exited with code ${exitCode}. stderr: ${stderrText.slice(0, 500)}`,
    };
  }

  // Extract text events from the JSON output stream
  // The agent outputs JSON events to stdout; text events contain the plan
  const textContent = extractTextFromJsonEvents(canonicalizeOutput(rawOutput, launch.result.route));

  // Extract YAML from the text content
  const yamlStr = extractPlanYaml(textContent);

  if (!yamlStr) {
    return {
      success: false,
      tasks: [],
      knowledge: null,
      issues: [],
      rawOutput: textContent,
      error: "Planner agent did not produce a YAML task plan in a fenced code block.",
    };
  }

  // Parse the YAML
  let plan: PlannerOutput;
  try {
    plan = parsePlanYaml(yamlStr);
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      tasks: [],
      knowledge: null,
      issues: [],
      rawOutput: textContent,
      error: `Failed to parse planner YAML: ${reason}`,
    };
  }

  // Validate the plan
  onProgress(`Validating plan (${plan.tasks.length} tasks)...`);
  const issues = validatePlan(plan);
  const hasErrors = issues.some((i) => i.level === "error");

  const { accepted, rejected } = validateProposedPrerequisites(
    quest,
    plan.prerequisite_quests ?? [],
    allQuests,
  );
  for (const id of accepted) {
    prerequisiteWarnings.push(`Planner says quest "${id}" should run before "${quest.id}" — added as a prerequisite on apply`);
  }
  for (const r of rejected) {
    issues.push({ level: "warning", message: `Ignored proposed prerequisite quest "${r.id}": ${r.reason}` });
  }

  return {
    success: !hasErrors,
    tasks: plan.tasks,
    knowledge: plan.knowledge ?? null,
    prerequisiteWarnings,
    prerequisiteQuests: accepted,
    issues,
    rawOutput: textContent,
    error: hasErrors ? "Plan has validation errors — review and fix before approving." : undefined,
  };
}

/**
 * Extract text content from the JSON event stream.
 * Looks for "text" type events and concatenates their part.text fields.
 */
function extractTextFromJsonEvents(rawOutput: string): string {
  const lines = rawOutput.split("\n");
  const textParts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const event = JSON.parse(trimmed);
      if (event.type === "text" && event.part?.text) {
        textParts.push(event.part.text);
      }
    } catch {
      // Not JSON — might be plain text output, include it
      textParts.push(trimmed);
    }
  }

  return textParts.join("");
}

// ---------------------------------------------------------------------------
// Plan Application
// ---------------------------------------------------------------------------

/**
 * Convert proposed tasks into proper Task objects and apply them to a quest.
 * Updates the quest's taskIds and saves both tasks and quest to disk.
 */
export function applyPlanToQuest(
  plan: PlanResult,
  quest: Quest,
  projectRoot: string,
  config: WomboConfig
): Task[] {
  const tasks: Task[] = [];

  for (const proposed of plan.tasks) {
    const task = createBlankTask(proposed.id, proposed.title, proposed.description, {
      priority: proposed.priority,
      difficulty: proposed.difficulty,
      effort: proposed.effort,
    });

    // Copy over planner fields
    task.depends_on = proposed.depends_on;
    task.constraints = proposed.constraints;
    task.forbidden = proposed.forbidden;
    task.references = proposed.references;
    task.notes = proposed.notes;
    task.quest = quest.id;
    if (proposed.agent) {
      task.agent = proposed.agent;
    }

    // Save each task to the task store
    saveTaskToStore(projectRoot, config, task);
    tasks.push(task);
  }

  // Planner-proposed prerequisite quests become hard dependencies
  for (const id of plan.prerequisiteQuests ?? []) {
    if (!quest.depends_on.includes(id)) quest.depends_on.push(id);
  }

  // Update quest
  quest.status = "active";
  if (!quest.started_at) {
    quest.started_at = new Date().toISOString();
  }

  // Save knowledge if the planner produced any. Never clobber existing
  // knowledge: the planner sees it in its prompt, so a plan that contains it
  // is a deliberate rewrite; anything else is appended as new notes.
  if (plan.knowledge) {
    const existing = loadQuestKnowledge(projectRoot, quest.id)?.trim();
    const next =
      existing && !plan.knowledge.includes(existing)
        ? `${existing}\n\n## Planner notes\n\n${plan.knowledge.trim()}\n`
        : plan.knowledge;
    saveQuestKnowledge(projectRoot, quest.id, next);
  }

  // Save updated quest
  saveQuest(projectRoot, quest);

  return tasks;
}
