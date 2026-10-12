/**
 * quest-prerequisites.ts — propaedeutic (prerequisite) analysis between quests.
 *
 * Quest `depends_on` lists quests that must complete first. Before a quest is
 * planned, this module checks that list against reality (missing, unfinished or
 * still-unplanned prerequisites), describes every other in-flight quest so the
 * planner can avoid colliding with or rewriting their work, and validates any
 * extra prerequisites the planner proposes (existence, no self-reference, no
 * cycles) before they are merged into `depends_on`.
 */

import type { Quest } from "./quest";
import type { Task } from "./tasks";

const FINISHED_QUEST_STATUSES = new Set<Quest["status"]>(["completed", "abandoned"]);
const FINISHED_TASK_STATUSES = new Set<string>(["done", "cancelled"]);

export type PrerequisiteProblem = "missing" | "unfinished" | "unplanned";

export interface PrerequisiteFinding {
  questId: string;
  problem: PrerequisiteProblem;
  /** True when reached only through another prerequisite */
  transitive: boolean;
}

export interface InFlightQuest {
  id: string;
  title: string;
  goal: string;
  status: Quest["status"];
  depends_on: string[];
  /** Unfinished tasks of that quest */
  openTasks: { id: string; title: string; paths: string[] }[];
}

export interface PrerequisiteAnalysis {
  /** Declared prerequisites (transitive) that are not yet satisfied */
  findings: PrerequisiteFinding[];
  /** Every other unfinished quest, for collision/rewrite awareness */
  inFlight: InFlightQuest[];
}

/** Walk `depends_on` transitively and report every unsatisfied prerequisite. */
export function analyzePrerequisites(
  quest: Quest,
  allQuests: Quest[],
  tasks: Task[],
): PrerequisiteAnalysis {
  const byId = new Map(allQuests.map((q) => [q.id, q]));
  const findings: PrerequisiteFinding[] = [];
  const seen = new Set<string>([quest.id]);

  const visit = (ids: string[], transitive: boolean) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const dep = byId.get(id);
      if (!dep) {
        findings.push({ questId: id, problem: "missing", transitive });
        continue;
      }
      if (dep.status !== "completed") {
        const planned = tasks.some((t) => t.quest === id);
        findings.push({
          questId: id,
          problem: planned || dep.status === "abandoned" ? "unfinished" : "unplanned",
          transitive,
        });
      }
      visit(dep.depends_on ?? [], true);
    }
  };
  visit(quest.depends_on ?? [], false);

  const inFlight: InFlightQuest[] = allQuests
    .filter((q) => q.id !== quest.id && !FINISHED_QUEST_STATUSES.has(q.status))
    .map((q) => ({
      id: q.id,
      title: q.title,
      goal: q.goal,
      status: q.status,
      depends_on: q.depends_on ?? [],
      openTasks: tasks
        .filter((t) => t.quest === q.id && !FINISHED_TASK_STATUSES.has(t.status))
        .map((t) => ({ id: t.id, title: t.title, paths: t.paths ?? [] })),
    }));

  return { findings, inFlight };
}

/** One-line human warnings for the unsatisfied declared prerequisites. */
export function describeFindings(findings: PrerequisiteFinding[]): string[] {
  return findings.map((f) => {
    const via = f.transitive ? " (transitive)" : "";
    switch (f.problem) {
      case "missing":
        return `Prerequisite quest "${f.questId}"${via} does not exist`;
      case "unplanned":
        return `Prerequisite quest "${f.questId}"${via} is not planned yet — plan and run it first`;
      case "unfinished":
        return `Prerequisite quest "${f.questId}"${via} is not completed yet`;
    }
  });
}

/** Prompt section: prerequisite state plus what other quests are doing. */
export function formatPrerequisiteSection(analysis: PrerequisiteAnalysis): string {
  const lines: string[] = [];
  if (analysis.findings.length > 0) {
    lines.push("\n## Prerequisite Quests (not yet satisfied)\n");
    lines.push(
      "This quest depends on the quests below, which are not finished. Do NOT plan tasks " +
        "that re-implement or rewrite their work; assume their output will exist.\n",
    );
    for (const w of describeFindings(analysis.findings)) lines.push(`- ${w}`);
  }
  if (analysis.inFlight.length > 0) {
    lines.push("\n## Other Quests In Flight\n");
    lines.push(
      "These quests are not finished. Avoid touching the same files or redoing the same work. " +
        "If this quest's goal overlaps one of them or needs its output first, list that quest " +
        "under `prerequisite_quests` in your output instead of duplicating it.\n",
    );
    for (const q of analysis.inFlight) {
      lines.push(`- \`${q.id}\` [${q.status}] ${q.title}: ${q.goal.trim().replace(/\s+/g, " ").slice(0, 300)}`);
      for (const t of q.openTasks.slice(0, 12)) {
        const paths = t.paths.length ? ` — ${t.paths.join(", ")}` : "";
        lines.push(`  - task \`${t.id}\`: ${t.title}${paths}`);
      }
      if (q.openTasks.length > 12) lines.push(`  - … ${q.openTasks.length - 12} more open tasks`);
    }
  }
  return lines.join("\n");
}

/**
 * Keep only planner-proposed prerequisite quest IDs that exist, are not the
 * quest itself, are unfinished-or-completed (never abandoned), and would not
 * create a dependency cycle. Returns accepted IDs and a reason per rejection.
 */
export function validateProposedPrerequisites(
  quest: Quest,
  proposed: string[],
  allQuests: Quest[],
): { accepted: string[]; rejected: { id: string; reason: string }[] } {
  const byId = new Map(allQuests.map((q) => [q.id, q]));
  const accepted: string[] = [];
  const rejected: { id: string; reason: string }[] = [];

  const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return (byId.get(from)?.depends_on ?? []).some((d) => reaches(d, target, seen));
  };

  for (const id of proposed) {
    const dep = byId.get(id);
    if (id === quest.id) rejected.push({ id, reason: "a quest cannot depend on itself" });
    else if (!dep) rejected.push({ id, reason: "no such quest" });
    else if (dep.status === "abandoned") rejected.push({ id, reason: "quest is abandoned" });
    else if ((quest.depends_on ?? []).includes(id) || accepted.includes(id)) continue;
    else if (reaches(id, quest.id)) rejected.push({ id, reason: "would create a dependency cycle" });
    else accepted.push(id);
  }
  return { accepted, rejected };
}
