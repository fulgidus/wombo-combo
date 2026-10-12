/**
 * tui-plan-all.ts — TUI flow for planning every unplanned quest at once.
 *
 * Selects the quests that need planning, runs them through the aggregate
 * progress screen, then applies plans only after the user chose: review one
 * quest at a time (ReviewList), or approve every valid plan in one go.
 */

import type { WomboConfig } from "../config";
import { loadAllQuests, loadQuest } from "../lib/quest-store";
import { loadTasksFromStore, loadArchiveFromStore } from "../lib/task-store";
import { applyPlanToQuest } from "../lib/quest-planner";
import type { PlanResult } from "../lib/quest-planner";
import { selectPlannableQuests, splitValidPlans, type PlanAllRow } from "../lib/quest-plan-all";
import { runPlanAllInk, type PlanAllOutcome } from "../ink/run-plan-all";
import { runPlanReviewInk } from "../ink/run-review";
import type { PlanReviewAction } from "../ink/run-review";
import { runProgressInk } from "../ink/run-progress";
import { t } from "../lib/i18n";

export interface PlanAllFlowDeps {
  runPlanAll: (
    quests: ReturnType<typeof selectPlannableQuests>,
    opts: { concurrency?: number; model?: string },
  ) => Promise<PlanAllOutcome>;
  reviewPlan: (o: { questId: string; questTitle: string; planResult: PlanResult }) => Promise<PlanReviewAction>;
  notify: (title: string, message: string) => Promise<void>;
}

export function defaultPlanAllDeps(projectRoot: string, config: WomboConfig): PlanAllFlowDeps {
  return {
    runPlanAll: (sel, o) =>
      runPlanAllInk({
        quests: sel.plannable,
        skipped: sel.skipped,
        concurrency: o.concurrency,
        model: o.model,
        projectRoot,
        config,
      }),
    reviewPlan: (o) => runPlanReviewInk(o),
    notify: (title, message) => runProgressInk({ title }).finish({ type: "info", message }),
  };
}

/** Rows whose planner returned something reviewable (even with validation issues). */
function reviewable(rows: PlanAllRow[]): PlanAllRow[] {
  return rows.filter((r) => r.state !== "aborted" && (r.result?.tasks.length ?? 0) > 0);
}

export async function handlePlanAllFlow(
  projectRoot: string,
  config: WomboConfig,
  opts: { model?: string; concurrency?: number },
  deps: PlanAllFlowDeps = defaultPlanAllDeps(projectRoot, config),
): Promise<void> {
  const title = t("cli.tui.planAllTitle");
  const selection = selectPlannableQuests(
    loadAllQuests(projectRoot),
    loadTasksFromStore(projectRoot, config).tasks,
    loadArchiveFromStore(projectRoot, config).tasks,
  );
  if (selection.plannable.length === 0) {
    await deps.notify(title, t("cli.tui.planAllNothing"));
    return;
  }

  const outcome = await deps.runPlanAll(selection, { concurrency: opts.concurrency, model: opts.model });
  if (outcome.type === "cancel") return;

  const applied: string[] = [];
  const apply = (row: PlanAllRow, plan: PlanResult): void => {
    const quest = loadQuest(projectRoot, row.quest.id) ?? row.quest;
    applyPlanToQuest(plan, quest, projectRoot, config);
    applied.push(quest.id);
  };

  if (outcome.type === "approve-all") {
    for (const row of splitValidPlans(outcome.rows).valid) apply(row, row.result!);
  } else {
    for (const row of reviewable(outcome.rows)) {
      const action = await deps.reviewPlan({
        questId: row.quest.id,
        questTitle: row.quest.title,
        planResult: row.result!,
      });
      if (action.type === "approve") {
        apply(row, { ...row.result!, tasks: action.tasks, knowledge: action.knowledge });
      }
    }
  }

  await deps.notify(title, t("cli.tui.planAllApplied", { count: applied.length }));
}
