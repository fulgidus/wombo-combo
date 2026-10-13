/**
 * quest-scope.ts — Quest scope and test-baseline helpers for the daemon.
 *
 * Extracted from agent-runner.ts as a behaviour-preserving move. Shared by the
 * spawn/monitor stage (launch, relaunch), build verification and conflict
 * resolution prompts.
 */

import type { WomboConfig } from "../../config";
import type { Task } from "../../lib/tasks";
import type { QuestPromptContext } from "../../lib/prompt";
import { resolveQuestConfig, type Quest } from "../../lib/quest";
import { loadQuest, loadQuestKnowledge } from "../../lib/quest-store";
import { ensureQuestTestBaseline } from "../../lib/test-baseline-capture";
import { toTestBaselineSummary, type TestBaseline } from "../../lib/test-baseline";
import type { DaemonState, InternalAgentState } from "../state";

export interface QuestScopeContext {
  projectRoot: string;
  config: WomboConfig;
  state: DaemonState;
}

/**
 * Quest + effective config for a task's own quest (null when unquested).
 *
 * When the task file is gone (e.g. archived mid-run), fall back to the
 * agent's quest base branch ("quest/<id>") so baseline checks fail closed
 * instead of silently treating the task as unquested.
 */
export function resolveTaskQuestScope(
  ctx: QuestScopeContext,
  task: Task | null,
  agent?: InternalAgentState,
): { quest: Quest; config: WomboConfig } | null {
  const questId =
    task?.quest ??
    (task === null && agent?.baseBranch.startsWith("quest/")
      ? agent.baseBranch.slice("quest/".length)
      : undefined);
  if (!questId) return null;
  const quest = loadQuest(ctx.projectRoot, questId);
  if (!quest) return null;
  return { quest, config: resolveQuestConfig(ctx.config, quest) };
}

/**
 * Ensure the quest test baseline for a task exists (capturing it on first
 * use). Returns null for unquested tasks or when the quest's effective
 * config has TDD disabled. Throws when a snapshot cannot be established.
 */
export async function ensureTaskTestBaseline(
  ctx: QuestScopeContext,
  featureId: string,
  task: Task,
): Promise<TestBaseline | null> {
  const scope = resolveTaskQuestScope(ctx, task);
  if (!scope || !scope.config.tdd?.enabled) return null;
  const { quest, config } = scope;
  ctx.state.updateAgentActivity(
    featureId,
    `Ensuring test baseline for quest ${quest.id} (${quest.baseBranch})...`,
  );
  const result = await ensureQuestTestBaseline({
    projectRoot: ctx.projectRoot,
    questId: quest.id,
    baseBranch: quest.baseBranch,
    config,
    log: (msg) => ctx.state.updateAgentActivity(featureId, msg),
  });
  return result.status === "disabled" ? null : result.baseline;
}

/** Prompt context for a task's quest, including the baseline summary */
export function questPromptContext(
  ctx: QuestScopeContext,
  quest: Quest,
  baseline: TestBaseline | null,
): QuestPromptContext {
  return {
    questId: quest.id,
    goal: quest.goal,
    addedConstraints: quest.constraints.add ?? [],
    addedForbidden: quest.constraints.ban ?? [],
    knowledge: loadQuestKnowledge(ctx.projectRoot, quest.id),
    ...(baseline ? { testBaseline: toTestBaselineSummary(baseline) } : {}),
  };
}

/** Build quest context for conflict resolution prompts. */
export function buildSessionQuestContext(ctx: QuestScopeContext): QuestPromptContext | undefined {
  const questId = ctx.state.getQuestId();
  if (!questId) return undefined;

  const quest = loadQuest(ctx.projectRoot, questId);
  if (!quest) return undefined;

  const knowledge = loadQuestKnowledge(ctx.projectRoot, questId);
  return {
    questId: quest.id,
    goal: quest.goal,
    addedConstraints: quest.constraints.add ?? [],
    addedForbidden: quest.constraints.ban ?? [],
    knowledge,
  };
}
