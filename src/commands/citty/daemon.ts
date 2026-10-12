/**
 * daemon.ts -- Citty command definition for `woco daemon`.
 *
 * Manages the persistent background daemon process.
 * Subcommands: start, stop, status.
 */

import { defineCommand } from "citty";
import { resolve } from "node:path";
import { loadConfig, validateConfig, isProjectInitialized } from "../../config";
import { t } from "../../lib/i18n";
import { resolveOutputFormat, output } from "../../lib/output";
import {
  startDaemon,
  stopDaemon,
  getDaemonHealthStatus,
} from "../../daemon/launcher";
import { DEFAULT_WS_PORT } from "../../daemon/protocol";

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

const startCommand = defineCommand({
  meta: {
    name: "start",
    description: "Start the daemon process in the background",
  },
  args: {
    port: {
      type: "string",
      alias: "p",
      description: `WebSocket port (default: ${DEFAULT_WS_PORT})`,
      required: false,
    },
    verbose: {
      type: "boolean",
      alias: "v",
      description: "Enable verbose daemon logging to stderr",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text, json, or toon",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    if (!isProjectInitialized(projectRoot)) {
      console.error(t("cli.daemon.notInitialized"));
      process.exit(1);
    }
    loadConfig(projectRoot); // Validate config exists

    const port = args.port ? parseInt(args.port, 10) : undefined;
    const fmt = resolveOutputFormat(args.output);

    try {
      const pid = await startDaemon({
        projectRoot,
        port,
        verbose: args.verbose,
      });

      output(fmt, { pid, port: port ?? DEFAULT_WS_PORT, status: "started" }, () => {
        console.log(t("cli.daemon.started", { pid, port: port ?? DEFAULT_WS_PORT }));
      });
    } catch (err: any) {
      console.error(t("cli.daemon.startFailed", { error: err.message }));
      process.exit(1);
    }
  },
});

const stopCommand = defineCommand({
  meta: {
    name: "stop",
    description: "Stop the running daemon process",
  },
  args: {
    force: {
      type: "boolean",
      alias: "f",
      description: "Force kill (SIGKILL) instead of graceful shutdown",
      required: false,
    },
    port: {
      type: "string",
      alias: "p",
      description: "WebSocket port (if non-default)",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text, json, or toon",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    const port = args.port ? parseInt(args.port, 10) : undefined;
    const fmt = resolveOutputFormat(args.output);

    const stopped = await stopDaemon(projectRoot, port, args.force);

    output(fmt, { stopped }, () => {
      if (stopped) {
        console.log(t("cli.daemon.stopped"));
      } else {
        console.log(t("cli.daemon.noneRunning"));
      }
    });
  },
});

const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Show daemon process status",
  },
  args: {
    port: {
      type: "string",
      alias: "p",
      description: "WebSocket port (if non-default)",
      required: false,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output format: text, json, or toon",
      required: false,
    },
  },
  async run({ args }) {
    const projectRoot = resolve(process.cwd());
    const port = args.port ? parseInt(args.port, 10) : undefined;
    const fmt = resolveOutputFormat(args.output);

    const status = await getDaemonHealthStatus(projectRoot, port);

    output(fmt, status, () => {
      if (status.running) {
        console.log(t("cli.daemon.running", { pid: status.pid ?? "", port: status.port }));
        if (status.health) {
          const uptimeSec = Math.floor(status.health.uptime / 1000);
          console.log(t("cli.daemon.uptime", { seconds: uptimeSec }));
          console.log(t("cli.daemon.clients", { count: status.health.clients }));
          console.log(t("cli.daemon.scheduler", { status: status.health.schedulerStatus }));
          const max = status.health.maxConcurrent === 0 ? t("cli.daemon.unlimited") : String(status.health.maxConcurrent);
          console.log(t("cli.daemon.concurrency", { active: status.health.activeAgents, queued: status.health.queuedReadyAgents, max, free: status.health.availableSlots }));
        }
      } else {
        console.log(t("cli.daemon.notRunning"));
      }
    });
  },
});

// ---------------------------------------------------------------------------
// Parent command
// ---------------------------------------------------------------------------

export const daemonCommand = defineCommand({
  meta: {
    name: "daemon",
    description: "Manage the persistent background daemon",
  },
  // NOTE: No run() handler — default subcommand is injected by the router.
  subCommands: {
    start: startCommand,
    stop: stopCommand,
    status: statusCommand,
    // Aliases
    st: statusCommand,
  },
});
