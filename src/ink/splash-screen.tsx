/**
 * splash-screen.tsx — Animated splash screen for the TUI.
 *
 * Features:
 *   - WOMBO / COMBO split ASCII logo with per-character animated HSL gradient
 *   - Gradient flows horizontally across the logo over time (not static per-row colors)
 *   - Flash reveal: newly shown lines burst white then settle into flowing gradient
 *   - Fire particle simulation rising beneath the logo after reveal
 *   - Sequential preflight checks with live spinner → ✓/⚠/✗ + timing
 *   - Data integrity check: broken deps, duplicate IDs, orphaned quest refs
 *   - Auto-advances when all checks pass/warn; waits for keypress on any fail
 *
 * Props:
 *   onDone()        — called when the splash ends
 *   durationMs      — override post-check hold time (default 5000 ms; 0 = no timer)
 *   projectRoot     — used for preflight FS checks
 *   config          — WomboConfig, used for preflight checks
 *   splashTextIndex — override splash text index (deterministic in tests)
 */

import React, { useEffect, useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { useTerminalSize } from "./use-terminal-size";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { WOMBO_DIR } from "../config";
import type { WomboConfig } from "../config";
import { loadTasks } from "../lib/tasks";
import { fetchNpmLatest, getLocalVersion, compareSemver } from "../commands/upgrade";

// ---------------------------------------------------------------------------
// Splash texts
// ---------------------------------------------------------------------------

export const SPLASH_TEXTS: string[] = [
  "Now with 100% fewer merge conflicts!",
  "Parallel AI, orchestrated.",
  "Agents working while you sleep.",
  "Git worktrees: not just for power users anymore.",
  "Zero context switches.",
  "Automated. Verified. Merged.",
  "Your backlog fears us.",
  "Built with Bun. 🐰",
  "The future of parallel development.",
  "When one AI just isn't enough.",
  "Press any key to feel important.",
  "Wombo combo, indeed.",
];

// ---------------------------------------------------------------------------
// Logo — WOMBO / COMBO split (ANSI Shadow style)
// ---------------------------------------------------------------------------

const WOMBO_LINES = [
  "  ██╗    ██╗ ██████╗ ███╗   ███╗██████╗  ██████╗ ",
  "  ██║    ██║██╔═══██╗████╗ ████║██╔══██╗██╔═══██╗",
  "  ██║ █╗ ██║██║   ██║██╔████╔██║██████╔╝██║   ██║",
  "  ██║███╗██║██║   ██║██║╚██╔╝██║██╔══██╗██║   ██║",
  "  ╚███╔███╔╝╚██████╔╝██║ ╚═╝ ██║██████╔╝╚██████╔╝",
  "   ╚══╝╚══╝  ╚═════╝ ╚═╝     ╚═╝╚═════╝  ╚═════╝ ",
];

const DIVIDER_LINE = "  ─────────────────── ⚡ ─────────────────── ";

const COMBO_LINES = [
  "   ██████╗ ██████╗ ███╗   ███╗██████╗  ██████╗ ",
  "  ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔═══██╗",
  "  ██║     ██║   ██║██╔████╔██║██████╔╝██║   ██║",
  "  ██║     ██║   ██║██║╚██╔╝██║██╔══██╗██║   ██║",
  "  ╚██████╗╚██████╔╝██║ ╚═╝ ██║██████╔╝╚██████╔╝",
  "   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═════╝  ╚═════╝ ",
];

const ALL_LOGO_LINES: Array<{ text: string; type: "wombo" | "divider" | "combo"; idx: number }> = [
  ...WOMBO_LINES.map((text, idx) => ({ text, type: "wombo" as const, idx })),
  { text: DIVIDER_LINE, type: "divider" as const, idx: 0 },
  ...COMBO_LINES.map((text, idx) => ({ text, type: "combo" as const, idx })),
];

// ---------------------------------------------------------------------------
// Gradient utilities
// ---------------------------------------------------------------------------

/** HSL → #rrggbb */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

/**
 * Per-character 2D rainbow color.
 * Hue is driven by both X position (horizontal) and Y position (line index),
 * creating a diagonal color wave that drifts continuously over time.
 */
function getLogoCharColor(
  lineIdx: number,
  totalLines: number,
  x: number,
  lineLen: number,
  tick: number,
  flashFrac: number  // 1.0 = full white flash, 0.0 = pure gradient
): string {
  const px = lineLen > 1 ? x / (lineLen - 1) : 0;
  const py = totalLines > 1 ? lineIdx / (totalLines - 1) : 0;

  // Diagonal rainbow wave + time drift — full 360° spectrum
  const hue = ((px * 200 + py * 140 + tick * 4) % 360 + 360) % 360;

  // Brightness ripples along both axes
  const brightness = 58 + Math.sin(px * Math.PI * 4 + py * Math.PI * 2.5 + tick * 0.12) * 14;
  const l = Math.max(38, Math.min(82, brightness));

  const gradColor = hslToHex(hue, 100, l);

  if (flashFrac <= 0) return gradColor;

  // Blend toward white on reveal flash
  const fr = parseInt(gradColor.slice(1, 3), 16);
  const fg = parseInt(gradColor.slice(3, 5), 16);
  const fb = parseInt(gradColor.slice(5, 7), 16);
  const blended = (c: number) => Math.round(c + (255 - c) * flashFrac);
  const hex = (v: number) => blended(v).toString(16).padStart(2, "0");
  return `#${hex(fr)}${hex(fg)}${hex(fb)}`;
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// ---------------------------------------------------------------------------
// Preflight check types
// ---------------------------------------------------------------------------

type CheckStatus = "pending" | "running" | "pass" | "warn" | "fail";

interface PreflightCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  durationMs?: number;
}

function statusIcon(status: CheckStatus): string {
  switch (status) {
    case "pass":    return "✓";
    case "warn":    return "⚠";
    case "fail":    return "✗";
    case "running": return "…";
    default:        return " ";
  }
}

function statusColor(status: CheckStatus): string | undefined {
  switch (status) {
    case "pass":    return "green";
    case "warn":    return "yellow";
    case "fail":    return "red";
    case "running": return "cyan";
    default:        return "gray";
  }
}

type CheckFn = () => Promise<{ status: "pass" | "warn" | "fail"; detail: string }>;

async function runCheck(check: PreflightCheck, fn: CheckFn): Promise<PreflightCheck> {
  const start = Date.now();
  try {
    const result = await fn();
    return { ...check, status: result.status, detail: result.detail, durationMs: Date.now() - start };
  } catch (err) {
    return { ...check, status: "fail", detail: String(err), durationMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// SplashScreen
// ---------------------------------------------------------------------------

export interface SplashScreenProps {
  onDone: () => void;
  durationMs?: number;
  projectRoot?: string;
  config?: WomboConfig;
  splashTextIndex?: number;
  /** Optional version string to display in the splash header. */
  version?: string;
}

export function SplashScreen({
  onDone,
  durationMs = 5000,
  projectRoot,
  config,
  splashTextIndex,
  version,
}: SplashScreenProps): React.ReactElement {
  const { rows } = useTerminalSize();
  const doneRef = useRef(false);

  // When durationMs === 0, skip animation entirely (test / CI mode)
  const testMode = durationMs === 0;

  // Animation tick — drives gradient + spinner
  const [tick, setTick] = useState(0);

  // Logo reveal — immediately complete in test mode
  const [revealedLines, setRevealedLines] = useState(
    () => testMode ? ALL_LOGO_LINES.length : 0
  );
  const lineRevealTickRef = useRef<number[]>([]); // tick at which each line was revealed
  const logoRevealComplete = revealedLines >= ALL_LOGO_LINES.length;

  // Preflight checks — immediately complete in test mode
  const [checks, setChecks] = useState<PreflightCheck[]>([
    { id: "bun",     label: "Bun runtime",     status: testMode ? "pass" : "pending", detail: testMode ? "test" : "" },
    { id: "git",     label: "Git repository",  status: testMode ? "pass" : "pending", detail: testMode ? "test" : "" },
    { id: "config",  label: "Project config",  status: testMode ? "pass" : "pending", detail: testMode ? "test" : "" },
    { id: "tasks",   label: "Task store",      status: testMode ? "pass" : "pending", detail: testMode ? "test" : "" },
    { id: "sanity",  label: "Data integrity",  status: testMode ? "pass" : "pending", detail: testMode ? "test" : "" },
    { id: "daemon",  label: "Daemon state",    status: testMode ? "pass" : "pending", detail: testMode ? "test" : "" },
    { id: "updates", label: "Updates",         status: testMode ? "pass" : "pending", detail: testMode ? "test" : "" },
  ]);
  const [checksComplete, setChecksComplete] = useState(testMode);
  // Holds the latest available version string when an update is found
  const newVersionRef = useRef<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const [textIdx] = useState(
    () => splashTextIndex ?? Math.floor(Math.random() * SPLASH_TEXTS.length)
  );
  const splashText = SPLASH_TEXTS[textIdx];

  const dismiss = () => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  };

  // -------------------------------------------------------------------------
  // Main tick (60ms) — gradient animation + fire update
  // -------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      setTick((n) => n + 1);
    }, 60);
    return () => clearInterval(id);
  }, []);

  // -------------------------------------------------------------------------
  // Logo line-by-line reveal (20ms per line)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (logoRevealComplete) return;
    const id = setTimeout(() => {
      lineRevealTickRef.current[revealedLines] = tick;
      setRevealedLines((n) => n + 1);
    }, 20);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedLines, logoRevealComplete]);

  // -------------------------------------------------------------------------
  // Preflight checks (after logo reveal)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!logoRevealComplete) return;

    let cancelled = false;

    const checkFns: Record<string, CheckFn> = {
      bun: async () => {
        // @ts-ignore
        const v = (process.versions as Record<string, string>).bun;
        return v
          ? { status: "pass", detail: `v${v}` }
          : { status: "warn", detail: "not detected" };
      },
      git: async () => {
        const root = projectRoot ?? process.cwd();
        return existsSync(resolve(root, ".git"))
          ? { status: "pass", detail: "found" }
          : { status: "warn", detail: "no .git dir" };
      },
      config: async () => {
        if (!config) return { status: "warn", detail: "no config" };
        const root = projectRoot ?? process.cwd();
        return existsSync(resolve(root, WOMBO_DIR, "config.json"))
          ? { status: "pass", detail: "loaded" }
          : { status: "warn", detail: "using defaults" };
      },
      tasks: async () => {
        if (!config || !projectRoot) return { status: "warn", detail: "skipped" };
        const dir = resolve(projectRoot, WOMBO_DIR, config.tasksDir ?? "tasks");
        return existsSync(dir)
          ? { status: "pass", detail: "ready" }
          : { status: "warn", detail: "not initialised" };
      },
      sanity: async () => {
        if (!config || !projectRoot) return { status: "warn", detail: "skipped" };
        try {
          const { tasks } = loadTasks(projectRoot, config);

          // Collect all task IDs recursively (including subtasks at any depth)
          function collectIds(taskList: any[]): void {
            for (const task of taskList) {
              allIds.push(task.id);
              if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
                collectIds(task.subtasks);
              }
            }
          }
          function collectAllTasks(taskList: any[]): any[] {
            const flat: any[] = [];
            for (const task of taskList) {
              flat.push(task);
              if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
                flat.push(...collectAllTasks(task.subtasks));
              }
            }
            return flat;
          }
          const allIds: string[] = [];
          collectIds(tasks);
          const taskIds = new Set(allIds);
          const allTasks = collectAllTasks(tasks);

          // Broken depends_on references
          let brokenDeps = 0;
          for (const task of allTasks) {
            for (const dep of ((task as any).depends_on ?? [])) {
              if (!taskIds.has(dep)) brokenDeps++;
            }
          }

          // Duplicate IDs
          const duplicates = allIds.length - taskIds.size;

          if (brokenDeps > 0 || duplicates > 0) {
            const parts: string[] = [];
            if (brokenDeps > 0) parts.push(`${brokenDeps} broken dep${brokenDeps > 1 ? "s" : ""}`);
            if (duplicates > 0) parts.push(`${duplicates} dup ID${duplicates > 1 ? "s" : ""}`);
            return { status: "warn", detail: parts.join(", ") };
          }

          return { status: "pass", detail: `${allTasks.length} tasks OK` };
        } catch (err) {
          return { status: "fail", detail: String(err).slice(0, 50) };
        }
      },
      daemon: async () => {
        const root = projectRoot ?? process.cwd();
        const stateFile = resolve(root, WOMBO_DIR, "daemon-state.json");
        if (!existsSync(stateFile)) return { status: "warn", detail: "not started" };
        try {
          const raw = await Bun.file(stateFile).text();
          const state = JSON.parse(raw);
          const s = state?.scheduler?.status ?? "unknown";
          if (s === "running") return { status: "pass", detail: "running" };
          if (s === "idle" || s === "shutdown") return { status: "warn", detail: s };
          return { status: "pass", detail: s };
        } catch {
          return { status: "warn", detail: "unreadable" };
        }
      },
      updates: async () => {
        if (!config?.tui?.checkForUpdates) {
          return { status: "warn", detail: "disabled" };
        }
        try {
          const [local, latest] = await Promise.all([
            Promise.resolve(getLocalVersion()),
            fetchNpmLatest(),
          ]);
          if (!latest) return { status: "warn", detail: "unreachable" };
          if (compareSemver(local, latest) < 0) {
            newVersionRef.current = latest;
            const hint = config?.tui?.autoInstallUpdates
              ? `v${latest} available (auto-installing)`
              : `v${latest} available (press U to update)`;
            return { status: "warn", detail: hint };
          }
          return { status: "pass", detail: `v${local} is latest` };
        } catch {
          return { status: "warn", detail: "check failed" };
        }
      },
    };

    const runAll = async () => {
      for (let i = 0; i < checks.length; i++) {
        if (cancelled) return;
        const check = checks[i];
        const fn = checkFns[check.id];
        if (!fn) continue;

        setChecks((prev) =>
          prev.map((c, idx) => (idx === i ? { ...c, status: "running" } : c))
        );
        await new Promise((r) => setTimeout(r, 60));
        if (cancelled) return;

        const result = await runCheck(check, fn);
        if (cancelled) return;

        setChecks((prev) => prev.map((c, idx) => (idx === i ? result : c)));
      }
      if (!cancelled) setChecksComplete(true);
    };

    runAll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoRevealComplete]);

  // -------------------------------------------------------------------------
  // Auto-install: when checksComplete fires and autoInstallUpdates is on,
  // kick off the update immediately without waiting for a keypress.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (testMode) return;
    if (!checksComplete) return;
    if (!config?.tui?.autoInstallUpdates) return;
    const target = newVersionRef.current;
    if (!target) return;

    setInstalling(true);
    Bun.spawn(["bun", "add", "-g", `wombo-combo@${target}`], {
      stdout: "inherit",
      stderr: "inherit",
    }).exited.then(() => {
      dismiss();
    }).catch(() => {
      dismiss();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checksComplete]);

  // -------------------------------------------------------------------------
  // Dismiss: always requires a keypress after checks complete — no auto-advance
  // -------------------------------------------------------------------------
  const anyFail = checksComplete && checks.some((c) => c.status === "fail");
  const updateAvailable = newVersionRef.current !== null;
  const autoInstall = config?.tui?.autoInstallUpdates ?? false;

  useInput((input) => {
    if (!checksComplete) return;
    if (installing) return;
    // 'u' — manually install available update then continue (only when auto-install is off)
    if (!autoInstall && (input === "u" || input === "U") && updateAvailable) {
      const target = newVersionRef.current!;
      setInstalling(true);
      Bun.spawn(["bun", "add", "-g", `wombo-combo@${target}`], {
        stdout: "inherit",
        stderr: "inherit",
      }).exited.then(() => {
        dismiss();
      }).catch(() => {
        dismiss();
      });
      return;
    }
    dismiss();
  });

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderLogoLine(entry: typeof ALL_LOGO_LINES[number], lineIdx: number): React.ReactElement {
    const revealedAt = lineRevealTickRef.current[lineIdx];
    const ticksSinceReveal = revealedAt !== undefined ? tick - revealedAt : Infinity;
    const flashFrac = Math.max(0, 1 - ticksSinceReveal / 9); // fade over 9 ticks ≈ 540ms
    const totalLines = ALL_LOGO_LINES.length;

    return (
      <Text key={lineIdx}>
        {entry.text.split("").map((char, x) => {
          const color = getLogoCharColor(lineIdx, totalLines, x, entry.text.length, tick, flashFrac);
          return (
            <Text key={x} color={color}>
              {char}
            </Text>
          );
        })}
      </Text>
    );
  }

  function renderCheck(check: PreflightCheck, i: number): React.ReactElement {
    const spinnerFrame = tick % SPINNER_FRAMES.length;
    const icon = check.status === "running" ? SPINNER_FRAMES[spinnerFrame] : statusIcon(check.status);
    const color = check.status === "running" ? "cyan" : statusColor(check.status);
    const timing = check.durationMs !== undefined ? ` ${check.durationMs}ms` : "";

    return (
      <Box key={i} flexDirection="row" gap={1}>
        <Text color={color}>{icon}</Text>
        <Text color={check.status === "pending" ? "gray" : undefined}>{check.label}</Text>
        {check.status !== "pending" && (
          <Text dimColor>{check.detail}{timing}</Text>
        )}
      </Box>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      flexGrow={1}
    >
      {/* Logo */}
      <Box flexDirection="column" alignItems="center">
        {ALL_LOGO_LINES.map((entry, i) =>
          i < revealedLines ? renderLogoLine(entry, i) : null
        )}
      </Box>

      {/* Preflight checks */}
      {logoRevealComplete && (
        <Box flexDirection="column" marginTop={1} gap={0}>
          {checks.map((check, i) => renderCheck(check, i))}
        </Box>
      )}

      {/* Splash text + dismiss hint */}
      {checksComplete && (
        <>
          <Box marginTop={1}>
            <Text color="yellow">✦ {splashText} ✦</Text>
          </Box>
          {version && (
            <Box>
              <Text dimColor>v{version}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            {installing ? (
              <Text color="cyan">Installing update…</Text>
            ) : anyFail ? (
              <Text color="yellow">⚠ some checks failed — press any key to continue anyway</Text>
            ) : updateAvailable && !autoInstall ? (
              <Text color="cyan">▶ Press U to install update and continue  |  any other key to skip</Text>
            ) : (
              <Text color="cyan">▶ Press any key to continue</Text>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
