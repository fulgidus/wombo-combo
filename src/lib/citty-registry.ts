/**
 * citty-registry.ts — Complete command registry derived from citty definitions.
 *
 * This module is the bridge's output: a BRIDGE_REGISTRY array of CommandDef[]
 * that replaces the hand-maintained COMMAND_REGISTRY in schema.ts.
 *
 * Each entry pairs a citty command (from src/commands/citty/) with its
 * wombo-specific extended metadata (aliases, mutating, supportsDryRun, etc.)
 * and runs it through cittyCommandToCommandDef() to produce the final
 * CommandDef.
 *
 * For commands not yet migrated to citty (e.g. genesis), the CommandDef
 * is specified directly.
 */

import type { CommandDef as CittyCommandDef } from "citty";
import { cittyCommandToCommandDef, type BridgeCommandMeta } from "./citty-bridge.js";
import type { CommandDef } from "./schema.js";
import { VALID_STATUSES, VALID_PRIORITIES, VALID_DIFFICULTIES } from "./task-schema.js";

// ---------------------------------------------------------------------------
// Citty command imports
// ---------------------------------------------------------------------------

import { initCommand } from "../commands/citty/init.js";
import { launchCommand } from "../commands/citty/launch.js";
import { resumeCommand } from "../commands/citty/resume.js";
import { retryCommand } from "../commands/citty/retry.js";
import { statusCommand } from "../commands/citty/status.js";
import { verifyCommand } from "../commands/citty/verify.js";
import { mergeCommand } from "../commands/citty/merge.js";
import { abortCommand } from "../commands/citty/abort.js";
import { cleanupCommand } from "../commands/citty/cleanup.js";
import { historyCommand } from "../commands/citty/history.js";
import { logsCommand } from "../commands/citty/logs.js";
import { usageCommand } from "../commands/citty/usage.js";
import { upgradeCommand } from "../commands/citty/upgrade.js";
import { completionCommand } from "../commands/citty/completion.js";
import { tasksCommand } from "../commands/citty/tasks.js";
import { questCommand } from "../commands/citty/quest.js";
import { wishlistCommand } from "../commands/citty/wishlist.js";
import { helpCommand } from "../commands/citty/help.js";
import { versionCommand } from "../commands/citty/version.js";
import { describeCommand } from "../commands/citty/describe.js";

// ---------------------------------------------------------------------------
// Registry entry type
// ---------------------------------------------------------------------------

/**
 * A pairing of a citty command with its extended metadata.
 * Used to build the final CommandDef via the bridge.
 *
 * We use `any` for cittyCmd because citty's CommandDef is generic over
 * its args type, and each command has a different args shape. The bridge
 * only reads the `meta` and `args` properties (both are plain objects),
 * so the generic type parameter doesn't matter for our purposes.
 */
interface RegistryEntry {
  cittyCmd: any;
  meta: BridgeCommandMeta;
  /** Subcommand entries (for parent commands like tasks, quest, wishlist) */
  subEntries?: Array<{
    /** Key in citty's subCommands map (e.g. "list", "add") */
    subKey: string;
    /** The parent command name (for compound name generation) */
    parentName: string;
    meta: BridgeCommandMeta;
  }>;
}

// ---------------------------------------------------------------------------
// Helper: extract a subcommand from a parent citty command
// ---------------------------------------------------------------------------

function getSubCommand(
  parentCmd: CittyCommandDef,
  key: string,
): CittyCommandDef | undefined {
  const subs = (parentCmd as any).subCommands;
  if (!subs || typeof subs !== "object") return undefined;
  return subs[key] as CittyCommandDef | undefined;
}

// ---------------------------------------------------------------------------
// Registry entries
// ---------------------------------------------------------------------------

const ENTRIES: RegistryEntry[] = [
  // --- init ---------------------------------------------------------------
  {
    cittyCmd: initCommand,
    meta: {
      aliases: ["i"],
      mutating: true,
      supportsDryRun: true,
      completionSummary: "Generate config",
      description:
        "Interactive guided setup that walks through every config section. " +
        "Creates .wombo-combo/config.json and .wombo-combo/tasks.yml from template.",
      flagOverrides: {
        force: { default: false },
      },
    },
  },

  // --- launch -------------------------------------------------------------
  {
    cittyCmd: launchCommand,
    meta: {
      aliases: ["l"],
      mutating: true,
      supportsDryRun: true,
      completionSummary: "Launch agents",
      description:
        "Select features from the tasks file, create worktrees, and spawn agents. " +
        "Supports multiple selection strategies.",
      flagOverrides: {
        topPriority: { type: "number" },
        quickestWins: { type: "number" },
        priority: { enum: VALID_PRIORITIES },
        difficulty: { enum: VALID_DIFFICULTIES },
        tasks: { name: "--tasks", description: "Select specific tasks by comma-separated IDs" },
        allReady: { default: false },
        maxConcurrent: { type: "number" },
        interactive: { default: false },
        dryRun: { default: false },
        noTui: { default: false },
        autoPush: { default: false },
        browser: { default: false },
        skipTests: { default: false },
        strictTdd: { default: false },
      },
    },
  },

  // --- resume -------------------------------------------------------------
  {
    cittyCmd: resumeCommand,
    meta: {
      aliases: ["r"],
      mutating: true,
      supportsDryRun: false,
      completionSummary: "Resume wave",
      flagOverrides: {
        maxConcurrent: { type: "number" },
        interactive: { default: false },
        noTui: { default: false },
        autoPush: { default: false },
        maxRetries: { type: "number" },
      },
    },
  },

  // --- status -------------------------------------------------------------
  {
    cittyCmd: statusCommand,
    meta: {
      aliases: ["s"],
      mutating: false,
      supportsDryRun: false,
      completionSummary: "Show wave status",
    },
  },

  // --- verify -------------------------------------------------------------
  {
    cittyCmd: verifyCommand,
    meta: {
      aliases: ["v"],
      mutating: true,
      supportsDryRun: false,
      completionSummary: "Build verification",
      flagOverrides: {
        maxRetries: { type: "number" },
        browser: { default: false },
        skipTests: { default: false },
        strictTdd: { default: false },
      },
    },
  },

  // --- merge --------------------------------------------------------------
  {
    cittyCmd: mergeCommand,
    meta: {
      aliases: ["m"],
      mutating: true,
      supportsDryRun: true,
      completionSummary: "Merge branches",
      flagOverrides: {
        autoPush: { default: false },
        dryRun: { default: false },
      },
    },
  },

  // --- retry --------------------------------------------------------------
  {
    cittyCmd: retryCommand,
    meta: {
      aliases: ["re"],
      mutating: true,
      supportsDryRun: true,
      flagOverrides: {
        interactive: { default: false },
        dryRun: { default: false },
      },
    },
  },

  // --- cleanup ------------------------------------------------------------
  {
    cittyCmd: cleanupCommand,
    meta: {
      aliases: ["c"],
      mutating: true,
      supportsDryRun: true,
      completionSummary: "Remove worktrees",
      description: "Kills multiplexer sessions, removes worktrees, removes state and log files.",
      flagOverrides: {
        dryRun: { default: false },
      },
    },
  },

  // --- history ------------------------------------------------------------
  {
    cittyCmd: historyCommand,
    meta: {
      aliases: ["h"],
      mutating: false,
      supportsDryRun: false,
      completionSummary: "View past waves",
      description:
        "Wave history is auto-exported when a wave completes. Records are stored " +
        "separately from .wombo-combo/state.json and survive cleanup. Use without arguments " +
        "to list all waves, or pass a wave ID to see detailed results.",
      positionalOverrides: {
        waveId: { name: "wave-id" },
      },
    },
  },

  // --- usage --------------------------------------------------------------
  {
    cittyCmd: usageCommand,
    meta: {
      aliases: ["us"],
      mutating: false,
      supportsDryRun: false,
      completionSummary: "Token usage stats",
      description:
        "Displays aggregated token usage data collected during agent runs. " +
        "Can show totals or group by task, quest, model, provider, or harness. " +
        "Supports date range filtering and table or JSON output.",
      flagOverrides: {
        by: { enum: ["task", "quest", "model", "provider", "harness"] },
        format: { default: "table", enum: ["table", "json"] },
      },
    },
  },

  // --- abort --------------------------------------------------------------
  {
    cittyCmd: abortCommand,
    meta: {
      aliases: ["a"],
      mutating: true,
      supportsDryRun: false,
      completionSummary: "Kill running agent",
      description:
        "Kills the multiplexer session and agent process for a specific feature, then " +
        "marks the agent as failed. Use --requeue to return the feature to the " +
        "queue instead of marking it failed.",
      flagOverrides: {
        requeue: { default: false },
      },
    },
  },

  // --- upgrade ------------------------------------------------------------
  {
    cittyCmd: upgradeCommand,
    meta: {
      aliases: ["u"],
      mutating: true,
      supportsDryRun: false,
      completionSummary: "Check for updates",
      flagOverrides: {
        check: { default: false },
        tag: { alias: "--release" },
        force: { default: false },
      },
    },
  },

  // --- logs ---------------------------------------------------------------
  {
    cittyCmd: logsCommand,
    meta: {
      aliases: ["lo"],
      mutating: false,
      supportsDryRun: false,
      completionSummary: "Agent logs",
      description:
        "Reads log files written by agents during headless runs and displays " +
        "them with colorized output. Supports tailing and following.",
      flagOverrides: {
        tail: { type: "number" },
        follow: { default: false },
      },
    },
  },

  // --- tasks (parent with subcommands) ------------------------------------
  {
    cittyCmd: tasksCommand,
    meta: {
      aliases: ["t", "features"],
      mutating: false,
      supportsDryRun: false,
      completionSummary: "Manage tasks",
    },
    subEntries: [
      {
        subKey: "list",
        parentName: "tasks",
        meta: {
          aliases: ["ls"],
          mutating: false,
          supportsDryRun: false,
          completionSummary: "List tasks",
          flagOverrides: {
            status: { enum: VALID_STATUSES },
            priority: { enum: VALID_PRIORITIES },
            difficulty: { enum: VALID_DIFFICULTIES },
            ready: { default: false },
            includeArchive: { default: false, name: "--include-archive" },
          },
        },
      },
      {
        subKey: "add",
        parentName: "tasks",
        meta: {
          aliases: ["a"],
          mutating: true,
          supportsDryRun: true,
          flagOverrides: {
            description: { alias: "--desc" },
            priority: { default: "medium", enum: VALID_PRIORITIES },
            difficulty: { default: "medium", enum: VALID_DIFFICULTIES },
            effort: { default: "PT1H" },
            dependsOn: { name: "--depends-on" },
            dryRun: { default: false },
          },
        },
      },
      {
        subKey: "set-status",
        parentName: "tasks",
        meta: {
          aliases: ["ss"],
          mutating: true,
          supportsDryRun: true,
          positionalOverrides: {
            taskId: { name: "task-id" },
          },
          flagOverrides: {
            dryRun: { default: false },
          },
        },
      },
      {
        subKey: "set-priority",
        parentName: "tasks",
        meta: {
          aliases: ["sp"],
          mutating: true,
          supportsDryRun: true,
          positionalOverrides: {
            taskId: { name: "task-id" },
          },
          flagOverrides: {
            dryRun: { default: false },
          },
        },
      },
      {
        subKey: "set-difficulty",
        parentName: "tasks",
        meta: {
          aliases: ["sd"],
          mutating: true,
          supportsDryRun: true,
          positionalOverrides: {
            taskId: { name: "task-id" },
          },
          flagOverrides: {
            dryRun: { default: false },
          },
        },
      },
      {
        subKey: "check",
        parentName: "tasks",
        meta: {
          aliases: ["ch", "validate"],
          mutating: false,
          supportsDryRun: false,
          completionSummary: "Validate tasks",
          // Note: check has its own --output flag that overrides the global one
          // but for schema purposes we treat it as filtered (global handles it)
        },
      },
      {
        subKey: "archive",
        parentName: "tasks",
        meta: {
          aliases: ["ar"],
          mutating: true,
          supportsDryRun: true,
          completionSummary: "Archive done tasks",
          positionalOverrides: {
            taskId: { name: "task-id" },
          },
          flagOverrides: {
            dryRun: { default: false },
          },
        },
      },
      {
        subKey: "show",
        parentName: "tasks",
        meta: {
          aliases: ["sh"],
          mutating: false,
          supportsDryRun: false,
          completionSummary: "Show task details",
          positionalOverrides: {
            taskId: { name: "task-id" },
          },
        },
      },
      {
        subKey: "graph",
        parentName: "tasks",
        meta: {
          aliases: ["g"],
          mutating: false,
          supportsDryRun: false,
          completionSummary: "Dependency graph",
          description:
            "Builds a Mermaid flowchart from the tasks dependency graph and renders " +
            "it as a Unicode box diagram. Shows dependency edges, status badges, orphan " +
            "detection, dangling dependency warnings, and cycle detection.",
          flagOverrides: {
            status: { enum: VALID_STATUSES },
            ascii: { default: false },
            mermaid: { default: false },
            subtasks: { default: false },
          },
        },
      },
    ],
  },

  // --- help ---------------------------------------------------------------
  {
    cittyCmd: helpCommand,
    meta: {
      mutating: false,
      supportsDryRun: false,
      // help has a plain meta object, but we provide explicit values for consistency
      summary: "Show help text",
    },
  },

  // --- version -----------------------------------------------------------
  {
    cittyCmd: versionCommand,
    meta: {
      // versionCommand uses async meta — can't be resolved at import time
      name: "version",
      summary: "Print version and exit (also: -v, -V)",
      mutating: false,
      supportsDryRun: false,
    },
  },

  // --- describe -----------------------------------------------------------
  {
    cittyCmd: describeCommand,
    meta: {
      aliases: ["d"],
      mutating: false,
      supportsDryRun: false,
      completionSummary: "Emit JSON schema",
      description:
        "Machine-readable introspection for AI agents. Outputs the accepted " +
        "positionals, flags, types, defaults, and constraints for a command.",
    },
  },

  // --- quest (parent with subcommands) -----------------------------------
  {
    cittyCmd: questCommand,
    meta: {
      aliases: ["q"],
      mutating: false,
      supportsDryRun: false,
      completionSummary: "Manage quests",
    },
    subEntries: [
      {
        subKey: "create",
        parentName: "quest",
        meta: {
          aliases: ["c"],
          mutating: true,
          supportsDryRun: true,
          flagOverrides: {
            goal: { required: true },
            priority: { default: "medium", enum: VALID_PRIORITIES },
            difficulty: { default: "medium", enum: VALID_DIFFICULTIES },
            hitl: { default: "yolo", enum: ["yolo", "cautious", "supervised"] },
            dryRun: { default: false },
          },
        },
      },
      {
        subKey: "list",
        parentName: "quest",
        meta: {
          aliases: ["ls"],
          mutating: false,
          supportsDryRun: false,
        },
      },
      {
        subKey: "show",
        parentName: "quest",
        meta: {
          aliases: ["sh"],
          mutating: false,
          supportsDryRun: false,
          positionalOverrides: {
            questId: { name: "quest-id" },
          },
        },
      },
      {
        subKey: "plan",
        parentName: "quest",
        meta: {
          aliases: ["pl"],
          mutating: true,
          supportsDryRun: true,
          positionalOverrides: {
            questId: { name: "quest-id" },
          },
          flagOverrides: {
            dryRun: { default: false },
          },
        },
      },
      {
        subKey: "activate",
        parentName: "quest",
        meta: {
          aliases: ["a"],
          mutating: true,
          supportsDryRun: false,
          positionalOverrides: {
            questId: { name: "quest-id" },
          },
        },
      },
      {
        subKey: "pause",
        parentName: "quest",
        meta: {
          aliases: ["p"],
          mutating: true,
          supportsDryRun: false,
          positionalOverrides: {
            questId: { name: "quest-id" },
          },
        },
      },
      {
        subKey: "complete",
        parentName: "quest",
        meta: {
          aliases: ["co"],
          mutating: true,
          supportsDryRun: false,
          positionalOverrides: {
            questId: { name: "quest-id" },
          },
          flagOverrides: {
            force: { default: false },
          },
        },
      },
      {
        subKey: "abandon",
        parentName: "quest",
        meta: {
          aliases: ["ab"],
          mutating: true,
          supportsDryRun: false,
          positionalOverrides: {
            questId: { name: "quest-id" },
          },
          flagOverrides: {
            force: { default: false },
          },
        },
      },
    ],
  },

  // --- wishlist -----------------------------------------------------------
  {
    cittyCmd: wishlistCommand,
    meta: {
      aliases: ["w", "wl"],
      mutating: false,
      supportsDryRun: false,
      completionSummary: "Capture ideas",
    },
    subEntries: [
      {
        subKey: "add",
        parentName: "wishlist",
        meta: {
          aliases: ["a"],
          mutating: true,
          supportsDryRun: false,
        },
      },
      {
        subKey: "list",
        parentName: "wishlist",
        meta: {
          aliases: ["ls"],
          mutating: false,
          supportsDryRun: false,
        },
      },
      {
        subKey: "delete",
        parentName: "wishlist",
        meta: {
          aliases: ["rm", "del", "d"],
          mutating: true,
          supportsDryRun: false,
        },
      },
    ],
  },

  // --- completion ---------------------------------------------------------
  {
    cittyCmd: completionCommand,
    meta: {
      aliases: ["comp"],
      mutating: true,
      supportsDryRun: false,
      completionSummary: "Shell completions",
      description:
        "Manage shell completion scripts. Use 'install' to auto-configure your " +
        "shell, 'uninstall' to remove, or pass a shell name to emit the raw script.",
      positionalOverrides: {
        shell: { name: "action" },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Build the bridge registry
// ---------------------------------------------------------------------------

function buildRegistry(): CommandDef[] {
  const registry: CommandDef[] = [];

  for (const entry of ENTRIES) {
    const cmd = cittyCommandToCommandDef(entry.cittyCmd, entry.meta);

    // Process subcommands if present
    if (entry.subEntries?.length) {
      cmd.subcommands = [];
      for (const sub of entry.subEntries) {
        const subCmd = getSubCommand(entry.cittyCmd, sub.subKey);
        if (!subCmd) {
          throw new Error(
            `Subcommand "${sub.subKey}" not found on citty command "${cmd.name}"`
          );
        }
        const subDef = cittyCommandToCommandDef(subCmd, sub.meta);
        // Set compound name: "tasks list", "quest create", etc.
        subDef.name = `${sub.parentName} ${subDef.name}`;
        cmd.subcommands.push(subDef);
      }
    }

    registry.push(cmd);
  }

  // --- genesis (not yet migrated to citty) --------------------------------
  // This is a direct CommandDef since there's no citty definition yet.
  registry.push({
    name: "genesis",
    aliases: ["g"],
    summary: "Decompose a project vision into quests",
    completionSummary: "Vision to quests",
    description:
      "Top of the Quest hierarchy: Genesis -> Quests -> Tasks. Takes a project " +
      "vision and produces a set of scoped quests via an AI planner agent.",
    positionals: [
      { name: "vision", description: "Project vision text", required: false },
    ],
    flags: [
      { name: "--tech-stack", description: "Tech stack description (e.g. \"React, Node, Postgres\")", type: "string" },
      { name: "--constraint", description: "Constraint (can be repeated)", type: "string" },
      { name: "--model", alias: "-m", description: "Model for the planner agent", type: "string" },
      { name: "--no-tui", description: "Skip TUI review, auto-approve all quests", type: "boolean", default: false },
      { name: "--dry-run", description: "Show what would happen without creating quests", type: "boolean", default: false },
    ],
    mutating: true,
    supportsDryRun: true,
  });

  return registry;
}

/**
 * The bridge-generated command registry.
 * Drop-in replacement for COMMAND_REGISTRY in schema.ts.
 */
export const BRIDGE_REGISTRY: CommandDef[] = buildRegistry();

// ---------------------------------------------------------------------------
// Lookup helpers (mirrors schema.ts API)
// ---------------------------------------------------------------------------

/**
 * Find a command definition by name. Supports compound names like "tasks list".
 */
export function findBridgeCommandDef(name: string): CommandDef | undefined {
  // Try direct match first
  const direct = BRIDGE_REGISTRY.find((c) => c.name === name);
  if (direct) return direct;

  // Try compound: "tasks list" -> look in tasks subcommands
  const parts = name.split(/\s+/);
  if (parts.length === 2) {
    const parent = BRIDGE_REGISTRY.find((c) => c.name === parts[0]);
    if (parent?.subcommands) {
      return parent.subcommands.find((sc) => sc.name === name || sc.name === parts[1]);
    }
  }

  return undefined;
}
