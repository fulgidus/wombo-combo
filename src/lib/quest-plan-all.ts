/**
 * quest-plan-all.ts — plan every unplanned quest in one batch.
 *
 * Selection picks quests with zero tasks (active + archived) and a plannable
 * status. The runner drives each one through runQuestPlanner (so planner
 * routing, telemetry and provider-reported cost apply unchanged) with a
 * bounded worker pool, and can abort every in-flight planner at once.
 * Plans are only collected here; applying them is the caller's decision.
 */

import type { WomboConfig } from "../config";
import { getQuestTaskIds, type Quest } from "./quest";
import type { Task } from "./tasks";
import {
  runQuestPlanner,
  abortQuestPlanner,
  PLANNER_ABORTED,
  type PlanResult,
} from "./quest-planner";
import type { PlannerTelemetrySnapshot } from "./planner-telemetry";

export const DEFAULT_PLAN_ALL_CONCURRENCY = 2;

/** Quests in these statuses are never planned (same rule as `quest plan`). */
const UNPLANNABLE_STATUSES = new Set<Quest["status"]>(["completed", "abandoned"]);

export type SkipReason = "already-planned" | "status";

export interface SkippedQuest {
  quest: Quest;
  reason: SkipReason;
}

export interface PlannableSelection {
  plannable: Quest[];
  skipped: SkippedQuest[];
}

/** Split quests into those that need planning and those to skip (with why). */
export function selectPlannableQuests(
  quests: Quest[],
  activeTasks: Task[],
  archivedTasks: Task[],
): PlannableSelection {
  const all = [...activeTasks, ...archivedTasks];
  const plannable: Quest[] = [];
  const skipped: SkippedQuest[] = [];
  for (const quest of quests) {
    if (getQuestTaskIds(quest.id, all).length > 0) {
      skipped.push({ quest, reason: "already-planned" });
    } else if (UNPLANNABLE_STATUSES.has(quest.status)) {
      skipped.push({ quest, reason: "status" });
    } else {
      plannable.push(quest);
    }
  }
  return { plannable, skipped };
}

export type PlanAllRowState = "queued" | "running" | "done" | "failed" | "aborted";

export interface PlanAllRow {
  quest: Quest;
  state: PlanAllRowState;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  /** Provider-reported USD cost; null when the provider reported none */
  cost: number | null;
  /** Latest progress line from the planner */
  activity: string;
  result?: PlanResult;
  error?: string;
}

export interface PlanAllTotals {
  tokensIn: number;
  tokensOut: number;
  cost: number | null;
}

export type PlanAllRunner = (
  quest: Quest,
  opts: {
    model?: string;
    onProgress: (message: string) => void;
    onTelemetry: (snapshot: PlannerTelemetrySnapshot) => void;
  },
) => Promise<PlanResult>;

export interface PlanAllOptions {
  quests: Quest[];
  concurrency?: number;
  model?: string;
  /** Defaults to runQuestPlanner bound to projectRoot/config */
  runner?: PlanAllRunner;
  projectRoot?: string;
  config?: WomboConfig;
  /** Defaults to abortQuestPlanner */
  abort?: (questId: string) => boolean;
  onUpdate?: (rows: PlanAllRow[]) => void;
}

export interface PlanAllRun {
  /** Resolves with the final rows once every quest settled */
  done: Promise<PlanAllRow[]>;
  /** Abort every in-flight planner and cancel the queued ones */
  abort(): void;
  rows(): PlanAllRow[];
  totals(): PlanAllTotals;
}

export function sumTotals(rows: PlanAllRow[]): PlanAllTotals {
  let cost: number | null = null;
  let tokensIn = 0;
  let tokensOut = 0;
  for (const r of rows) {
    tokensIn += r.tokensIn;
    tokensOut += r.tokensOut;
    if (r.cost !== null) cost = (cost ?? 0) + r.cost;
  }
  return { tokensIn, tokensOut, cost };
}

export function runPlanAll(opts: PlanAllOptions): PlanAllRun {
  const concurrency = Math.max(1, Math.floor(opts.concurrency ?? DEFAULT_PLAN_ALL_CONCURRENCY));
  const abortFn = opts.abort ?? abortQuestPlanner;
  const runner: PlanAllRunner =
    opts.runner ??
    ((quest, o) => runQuestPlanner(quest, opts.projectRoot!, opts.config!, o));

  const rows: PlanAllRow[] = opts.quests.map((quest) => ({
    quest,
    state: "queued",
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    cost: null,
    activity: "",
  }));
  let aborted = false;
  let next = 0;

  const emit = () => opts.onUpdate?.(rows.map((r) => ({ ...r })));

  const runOne = async (row: PlanAllRow): Promise<void> => {
    row.state = "running";
    emit();
    try {
      const result = await runner(row.quest, {
        model: opts.model,
        onProgress: (message) => {
          row.activity = message;
          emit();
        },
        onTelemetry: (snap) => {
          row.model = snap.model;
          row.tokensIn = snap.tokensIn;
          row.tokensOut = snap.tokensOut;
          row.cost = snap.cost;
        },
      });
      row.result = result;
      if (result.error === PLANNER_ABORTED || aborted) {
        row.state = "aborted";
      } else if (result.success) {
        row.state = "done";
      } else {
        row.state = "failed";
        row.error = result.error ?? "planner produced no valid plan";
      }
    } catch (err: unknown) {
      row.state = aborted ? "aborted" : "failed";
      row.error = err instanceof Error ? err.message : String(err);
    }
    emit();
  };

  const worker = async (): Promise<void> => {
    while (!aborted && next < rows.length) {
      await runOne(rows[next++]!);
    }
  };

  const done = (async () => {
    await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker));
    for (const r of rows) if (r.state === "queued") r.state = "aborted";
    emit();
    return rows.map((r) => ({ ...r }));
  })();

  return {
    done,
    abort() {
      aborted = true;
      for (const r of rows) {
        if (r.state === "running") abortFn(r.quest.id);
        else if (r.state === "queued") r.state = "aborted";
      }
      emit();
    },
    rows: () => rows.map((r) => ({ ...r })),
    totals: () => sumTotals(rows),
  };
}

/** Plans that can be applied as-is: a successful run with at least one task. */
export function splitValidPlans(rows: PlanAllRow[]): { valid: PlanAllRow[]; invalid: PlanAllRow[] } {
  const valid: PlanAllRow[] = [];
  const invalid: PlanAllRow[] = [];
  for (const r of rows) {
    const ok = r.state === "done" && r.result?.success === true && r.result.tasks.length > 0;
    (ok ? valid : invalid).push(r);
  }
  return { valid, invalid };
}
