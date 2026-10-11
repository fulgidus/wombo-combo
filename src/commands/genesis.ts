/**
 * genesis.ts — CLI command for project-level inception (Genesis).
 *
 * Genesis is the top of the Quest system hierarchy:
 *   Genesis → Quests → Tasks
 *
 * It takes a project vision, tech stack, and constraints, runs the genesis
 * planner agent, and produces a set of quests that decompose the vision
 * into scoped missions.
 *
 * Usage:
 *   woco genesis "Project vision..." [--tech-stack "..."] [--constraint "..."] [--model "..."] [--dry-run]
 *   woco g "Vision text" --tech-stack "React, Node, Postgres"
 *
 * The command:
 *   1. Accepts vision, constraints, tech stack via CLI args or interactive prompts
 *   2. Runs the genesis planner agent (headless, read-only)
 *   3. Shows a genesis review TUI for interactive accept/reject/edit
 *   4. On approve: creates Quest objects for each accepted quest
 *   5. Saves genesis knowledge if provided
 */

import type { WomboConfig } from "../config";
import type { OutputFormat } from "../lib/output";
import type { ProposedQuest, GenesisResult } from "../lib/genesis-planner";
import { runGenesisPlanner } from "../lib/genesis-planner";
import { createBlankQuest } from "../lib/quest";
import {
  saveQuest,
  saveQuestKnowledge,
  listQuestIds,
} from "../lib/quest-store";
import { runGenesisReviewInk, type GenesisReviewAction } from "../ink/run-review";
import { output, outputError, outputMessage } from "../lib/output";
import { msg, t } from "../lib/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenesisCommandOptions {
  projectRoot: string;
  config: WomboConfig;
  /** The project vision text (first positional arg) */
  vision?: string;
  /** Tech stack description */
  techStack?: string;
  /** Constraints (can be passed multiple times) */
  constraints?: string[];
  /** Model override for the planner agent */
  model?: string;
  /** Show what would happen without actually creating quests */
  dryRun?: boolean;
  /** Skip the TUI review and auto-approve all quests */
  noTui?: boolean;
  /** Output format */
  outputFmt?: OutputFormat;
}

// ---------------------------------------------------------------------------
// ANSI Helpers
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";

// ---------------------------------------------------------------------------
// Main Command
// ---------------------------------------------------------------------------

export async function cmdGenesis(opts: GenesisCommandOptions): Promise<void> {
  const { projectRoot, config } = opts;
  const fmt = opts.outputFmt ?? "text";

  if (!opts.vision) {
    outputError(fmt, msg("cli.genesis.usage"));
    return;
  }

  const vision = opts.vision.trim();
  if (!vision) {
    outputError(fmt, msg("cli.genesis.emptyVision"));
    return;
  }

  // Gather existing quest IDs (so the planner can see what already exists)
  const existingQuestIds = listQuestIds(projectRoot);

  if (fmt === "text") {
    console.log(`\n${BOLD}${t("cli.genesis.title")}${RESET}`);
    console.log(`  ${t("cli.genesis.vision")} ${DIM}${vision.slice(0, 100)}${vision.length > 100 ? "..." : ""}${RESET}`);
    if (opts.techStack) {
      console.log(`  ${t("cli.genesis.techStack")} ${DIM}${opts.techStack}${RESET}`);
    }
    if (opts.constraints && opts.constraints.length > 0) {
      console.log(`  ${t("cli.genesis.constraints")} ${DIM}${t("cli.genesis.constraintsCount", { count: opts.constraints.length })}${RESET}`);
    }
    if (existingQuestIds.length > 0) {
      console.log(`  ${t("cli.genesis.existingQuests")} ${DIM}${existingQuestIds.length} (${existingQuestIds.join(", ")})${RESET}`);
    }
    console.log(`\n  ${t("cli.genesis.running")}\n`);
  }

  // Show a planning spinner
  const spinChars = ["\u2802", "\u2806", "\u2807", "\u2803", "\u2809", "\u280C", "\u280E", "\u280B"];
  let spinIdx = 0;
  let lastProgress = "";
  const spinTimer =
    fmt === "text"
      ? setInterval(() => {
          const ch = spinChars[spinIdx % spinChars.length];
          spinIdx++;
          process.stdout.write(`\r  ${ch} ${lastProgress}`);
        }, 120)
      : null;

  let result: GenesisResult;
  try {
    result = await runGenesisPlanner(vision, projectRoot, config, {
      techStack: opts.techStack,
      constraints: opts.constraints,
      existingQuestIds,
      model: opts.model,
      onProgress: (progress) => {
        lastProgress = progress;
      },
    });
  } catch (err: unknown) {
    if (spinTimer) {
      clearInterval(spinTimer);
      process.stdout.write("\r" + " ".repeat(80) + "\r");
    }
    const reason = err instanceof Error ? err.message : String(err);
    outputError(fmt, msg("cli.genesis.plannerFailed", { reason }));
    return;
  }

  if (spinTimer) {
    clearInterval(spinTimer);
    process.stdout.write("\r" + " ".repeat(80) + "\r");
  }

  // Report initial results
  if (fmt === "text") {
    console.log(`  ${t("cli.genesis.produced", { count: result.quests.length })}`);
    if (result.issues.length > 0) {
      const errors = result.issues.filter((i) => i.level === "error").length;
      const warnings = result.issues.filter((i) => i.level === "warning").length;
      if (errors > 0) console.log(`  ${RED}${t("cli.genesis.validationErrors", { count: errors })}${RESET}`);
      if (warnings > 0) console.log(`  ${YELLOW}${t("cli.genesis.validationWarnings", { count: warnings })}${RESET}`);
    }
  }

  if (!result.success && result.quests.length === 0) {
    // Total failure
    output(
      fmt,
      { success: false, quests: [], error: result.error, issues: result.issues },
      () => {
        console.log(`\n  ${RED}${t("cli.genesis.failed", { reason: result.error ?? t("cli.genesis.noQuests") })}${RESET}\n`);
      }
    );
    return;
  }

  // Dry run — show results without creating anything
  if (opts.dryRun) {
    output(
      fmt,
      {
        dry_run: true,
        success: result.success,
        quests: result.quests.map((q) => ({
          id: q.id,
          title: q.title,
          priority: q.priority,
          difficulty: q.difficulty,
          hitl_mode: q.hitl_mode,
          depends_on: q.depends_on,
        })),
        knowledge: result.knowledge ? `${result.knowledge.length} chars` : null,
        issues: result.issues,
      },
      () => {
        console.log(`\n  ${BOLD}${t("cli.genesis.proposed")}${RESET}`);
        for (const q of result.quests) {
          const deps =
            q.depends_on.length > 0 ? ` ${DIM}${t("cli.genesis.deps", { deps: q.depends_on.join(", ") })}${RESET}` : "";
          console.log(
            `    ${CYAN}${q.id}${RESET} — ${q.title} [${q.priority}/${q.difficulty}] ${DIM}hitl:${q.hitl_mode}${RESET}${deps}`
          );
        }
        if (result.knowledge) {
          console.log(`\n  ${BOLD}${t("cli.genesis.knowledge")}${RESET} ${DIM}${t("cli.genesis.chars", { count: result.knowledge.length })}${RESET}`);
        }
        console.log(`\n  ${GREEN}${t("cli.genesis.dryRunTag")}${RESET} ${t("cli.genesis.dryRunNone")}\n`);
      }
    );
    return;
  }

  // Non-interactive mode (--no-tui) — auto-approve all quests
  if (opts.noTui) {
    const created = applyGenesisResult(result.quests, result.knowledge, projectRoot, config);
    output(
      fmt,
      {
        success: true,
        quests_created: created.length,
        quest_ids: created.map((q) => q.id),
        has_knowledge: result.knowledge !== null,
      },
      () => {
        console.log(`\n  ${GREEN}${t("cli.genesis.applied")}${RESET} ${t("cli.genesis.created", { count: created.length })}`);
        for (const q of created) {
          console.log(`    ${CYAN}${q.id}${RESET} — ${q.title}`);
        }
        if (result.knowledge) {
          console.log(`  ${t("cli.genesis.savedKnowledge")}`);
        }
        console.log(`\n  ${t("cli.genesis.useList", { cmd: `${BOLD}woco quest list${RESET}` })}`);
        console.log(`  ${t("cli.genesis.usePlan", { cmd: `${BOLD}woco quest plan <id>${RESET}` })}\n`);
      }
    );
    return;
  }

  // Interactive mode — show the Genesis Review TUI
  if (fmt === "text") {
    console.log(`  ${t("cli.genesis.opening")}\n`);
    await sleep(1000);
  }

  // Clear terminal before showing TUI
  process.stdout.write("\x1B[2J\x1B[H");

  const reviewAction = await showGenesisReview(result);

  if (reviewAction.type === "cancel") {
    console.log(`\n  ${t("cli.genesis.discarded")}\n`);
    return;
  }

  // User approved — create the quests
  const created = applyGenesisResult(
    reviewAction.quests,
    reviewAction.knowledge,
    projectRoot,
    config
  );

  output(
    fmt,
    {
      success: true,
      quests_created: created.length,
      quest_ids: created.map((q) => q.id),
      has_knowledge: reviewAction.knowledge !== null,
    },
    () => {
      console.log(`\n  ${GREEN}${t("cli.genesis.approved")}${RESET} ${t("cli.genesis.created", { count: created.length })}`);
      for (const q of created) {
        console.log(`    ${CYAN}${q.id}${RESET} — ${q.title}`);
      }
      if (reviewAction.knowledge) {
        console.log(`  ${t("cli.genesis.savedKnowledge")}`);
      }
      console.log(`\n  ${t("cli.genesis.useList", { cmd: `${BOLD}woco quest list${RESET}` })}`);
      console.log(`  ${t("cli.genesis.usePlanEach", { cmd: `${BOLD}woco quest plan <id>${RESET}` })}\n`);
    }
  );
}

// ---------------------------------------------------------------------------
// Apply Genesis Result — creates Quest objects from approved ProposedQuests
// ---------------------------------------------------------------------------

interface CreatedQuest {
  id: string;
  title: string;
}

function applyGenesisResult(
  acceptedQuests: ProposedQuest[],
  knowledge: string | null,
  projectRoot: string,
  config: WomboConfig
): CreatedQuest[] {
  const baseBranch = config.baseBranch;
  const created: CreatedQuest[] = [];

  for (const proposed of acceptedQuests) {
    const quest = createBlankQuest(proposed.id, proposed.title, proposed.goal, baseBranch, {
      priority: proposed.priority,
      difficulty: proposed.difficulty,
      hitlMode: proposed.hitl_mode,
    });

    // Apply constraints from the genesis planner
    quest.constraints = {
      add: proposed.constraints.add ?? [],
      ban: proposed.constraints.ban ?? [],
      override: {},
    };

    // Apply dependencies
    quest.depends_on = proposed.depends_on ?? [];

    // Apply notes
    quest.notes = proposed.notes ?? [];

    // Save the quest to the store
    saveQuest(projectRoot, quest);

    created.push({ id: quest.id, title: quest.title });
  }

  // Save knowledge to the first quest (project-level knowledge)
  if (knowledge && created.length > 0) {
    saveQuestKnowledge(projectRoot, created[0].id, knowledge);
  }

  return created;
}

// ---------------------------------------------------------------------------
// Genesis Review TUI — Promise-based wrapper
// ---------------------------------------------------------------------------

type GenesisReviewResult =
  | { type: "approve"; quests: ProposedQuest[]; knowledge: string | null }
  | { type: "cancel" };

async function showGenesisReview(genesisResult: GenesisResult): Promise<GenesisReviewResult> {
  const action = await runGenesisReviewInk({ genesisResult });
  return action;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
