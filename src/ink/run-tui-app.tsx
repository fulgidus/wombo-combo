/**
 * run-tui-app.tsx — Unified TUI root component.
 *
 * Replaces the while-loop of separate inkRender() calls in tui.ts with a
 * single persistent <TuiApp /> component tree that is mounted once and stays
 * alive for the full TUI session.
 *
 * Tree structure:
 *
 *   ThemeContext.Provider
 *     I18nContext.Provider
 *       DashboardStoreContext.Provider
 *         EscMenuProvider (onNavigate via navRef bridge)
 *           ChromeLayout
 *             ScreenRouter (initialScreen: "splash" | "quest-picker" | "onboarding")
 *               NavWire (fills navRef — inside NavigationContext)
 *
 * Screen map:
 *   splash         → SplashScreen   (onDone → nav.replace("quest-picker"))
 *   quest-picker   → QuestPickerScreen
 *   task-browser   → TaskBrowserScreen
 *   daemon-monitor → DaemonMonitorScreen
 *   wave-monitor   → WaveMonitorScreen
 *   settings       → SettingsScreen
 *   onboarding     → OnboardingScreen
 *
 * Usage (from tui.ts):
 *
 *   const instance = inkRender(<TuiApp projectRoot config onExit={...} />);
 *   await instance.waitUntilExit();
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import { Box } from "ink";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WOMBO_DIR } from "../config";
import { useTerminalSize } from "./use-terminal-size";
import { ScreenRouter, useNavigation, type NavigationState } from "./router";
import { ChromeLayout, type DaemonStats } from "./chrome";
import { EscMenuProvider } from "./esc-menu";
import { SplashScreen } from "./splash-screen";
import { SettingsScreen, type SettingsScreenConfig } from "./settings-screen";
import { ThemeContext, getTheme } from "./theme";
import { I18nContext, getLocaleT } from "./i18n";
import {
  DashboardStoreContext,
  type DashboardStore,
} from "./dashboard";
import type { WomboConfig } from "../config";
import type { ErrandSpec } from "../lib/errand-planner";
// Lazy imports — screen components imported statically but their heavy
// data-layer deps are co-located in their own files.
import { QuestPickerScreen } from "./run-quest-picker";
import { TaskBrowserScreen } from "./run-task-browser";
import { DaemonMonitorScreen } from "./run-daemon-monitor";
import { WaveMonitorScreen } from "./run-wave-monitor";
import { OnboardingScreen } from "./onboarding/run-onboarding";

// ---------------------------------------------------------------------------
// TuiAppCallbacks — imperative flow hooks passed from tui.ts
// ---------------------------------------------------------------------------

/**
 * Callbacks for the complex async flows that still live imperatively in
 * tui.ts (plan, genesis, errand, wishlist, quest creation, wave launch).
 *
 * Screens call these when the user triggers an action that requires a
 * multi-step async flow outside the React tree. The callback runs (possibly
 * mounting separate Ink render instances for progress/review), then returns.
 * After it returns, the screen navigates back to quest-picker.
 */
export interface TuiAppCallbacks {
  onPlan?: (questId: string) => Promise<void>;
  onGenesis?: (vision: string) => Promise<void>;
  onErrand?: (spec: ErrandSpec) => Promise<void>;
  onWishlist?: () => Promise<void>;
  onOnboarding?: () => Promise<void>;
  onQuestCreate?: () => Promise<void>;
  /** Navigate to the daemon/wave monitor. Returns when user detaches. */
  onShowMonitor?: () => Promise<void>;
  /**
   * Called whenever the user marks one or more tasks as "planned" in the task
   * browser. Lets tui.ts re-send cmd:start so the scheduler wakes from idle
   * and immediately picks up the newly-planned work.
   */
  onTasksPlanned?: () => void;
  /** Called when user retries a failed task — sends cmd:retry-agent to daemon. */
  onRetryAgent?: (taskId: string) => void;
  /** Called when user changes concurrency — sends cmd:set-concurrency to daemon. */
  onSetConcurrency?: (n: number) => void;
}

// ---------------------------------------------------------------------------
// NavWire — fills a navRef from inside NavigationContext
// ---------------------------------------------------------------------------

function NavWire({ navRef }: { navRef: MutableRefObject<NavigationState | null> }): null {
  const nav = useNavigation();
  navRef.current = nav;
  return null;
}

// ---------------------------------------------------------------------------
// TuiApp props
// ---------------------------------------------------------------------------

export interface TuiAppProps {
  /** Project root directory. */
  projectRoot: string;
  /** Wombo config object. */
  config: WomboConfig;
  /**
   * How long to show the splash screen in milliseconds.
   * Defaults to 1500. Pass 0 to disable auto-dismiss (useful in tests).
   */
  splashDurationMs?: number;
  /**
   * When true, skip the splash screen and go directly to quest-picker.
   * Useful in tests and when re-entering the TUI after an action.
   * Ignored when initialScreen is set explicitly.
   */
  skipSplash?: boolean;
  /**
   * Override which screen to show first.
   * - "splash"       (default) — show splash, auto-advance to quest-picker
   * - "quest-picker" — skip splash, go straight to quest-picker
   * - "onboarding"   — start in onboarding wizard (first-run path)
   *
   * When set, takes precedence over skipSplash.
   */
  initialScreen?: "splash" | "quest-picker" | "onboarding";
  /**
   * Called when the user quits (Q from quest-picker, or ESC → Quit).
   * The caller should unmount the TuiApp / exit the process.
   */
  onExit: () => void;
  /**
   * Optional: DaemonClient to pass to DaemonMonitorScreen.
   * When provided, the daemon-monitor screen is available.
   */
  daemonClient?: unknown;
  /**
   * Whether the daemon is currently connected.
   * Used to display the connection indicator in ChromeLayout.
   */
  daemonConnected?: boolean;
  /**
   * Optional imperative flow callbacks. Screens invoke these for complex
   * async flows (plan, genesis, errand, etc.) that run outside the React tree.
   */
  callbacks?: TuiAppCallbacks;
}

// ---------------------------------------------------------------------------
// TuiApp — the single, persistent TUI root component
// ---------------------------------------------------------------------------

/**
 * TuiApp — mounts once, drives all TUI screen navigation via ScreenRouter.
 *
 * This is the component to pass to inkRender() in tui.ts. All previous
 * while-loop / separate-render() logic should be expressed as React navigation
 * callbacks and screen components instead.
 */
export function TuiApp({
  projectRoot,
  config,
  splashDurationMs = 5000,
  skipSplash = false,
  initialScreen: initialScreenProp,
  onExit,
  daemonClient,
  daemonConnected = false,
  callbacks,
}: TuiAppProps): React.ReactElement {
  const theme = getTheme(config.tui?.theme ?? "default");
  const tFn = getLocaleT(config.tui?.locale ?? "en");

  const emptyDashStore: DashboardStore = {
    agents: [],
    running: 0,
    done: 0,
    failed: 0,
    total: 0,
  };

  const [settingsConfig, setSettingsConfig] = useState<SettingsScreenConfig>({
    tui: config.tui,
    devMode: (config as any).devMode ?? false,
  });

  // Track current screen for chrome title
  const SCREEN_NAMES: Record<string, string> = {
    splash: "Loading",
    "quest-picker": "Quest Picker",
    "task-browser": "Task Browser",
    "daemon-monitor": "Daemon Monitor",
    "wave-monitor": "Wave Monitor",
    settings: "Settings",
    onboarding: "Setup",
  };
  const [currentScreenKey, setCurrentScreenKey] = useState<string>(
    initialScreenProp ?? (skipSplash ? "quest-picker" : "splash")
  );

  // Local override for concurrency to prevent flickering during polling delay
  const [maxConcurrentOverride, setMaxConcurrentOverride] = useState<number | null>(null);

  // navRef bridges EscMenuProvider's onNavigate callback to the inner ScreenRouter
  const navRef = useRef<NavigationState | null>(null);

  const handleEscNavigate = useCallback(
    (action: "settings" | "quit") => {
      if (action === "settings") {
        navRef.current?.push("settings", {
          config: settingsConfig as unknown,
          projectRoot,
          onSave: (patched: SettingsScreenConfig) => setSettingsConfig(patched),
          onBack: () => navRef.current?.pop(),
        } as Record<string, unknown>);
      } else if (action === "quit") {
        onExit();
      }
    },
    [settingsConfig, projectRoot, onExit]
  );

  // Wrapped callbacks to handle local overrides (e.g. concurrency)
  const wrappedCallbacks = useMemo(() => {
    return {
      ...callbacks,
      onSetConcurrency: (n: number) => {
        setMaxConcurrentOverride(n);
        callbacks?.onSetConcurrency?.(n);
      },
    };
  }, [callbacks]);

  // Initial quest-picker props (reused by multiple paths)
  const questPickerProps: Record<string, unknown> = {
    projectRoot,
    config: config as unknown,
    onExit,
    callbacks: wrappedCallbacks as unknown,
  };

  // Initial onboarding props
  const onboardingProps: Record<string, unknown> = {
    projectRoot,
    config: config as unknown,
    onExit,
    callbacks: wrappedCallbacks as unknown,
  };

  // Poll daemon-state.json every second for top-right chrome stats
  const [daemonStats, setDaemonStats] = useState<DaemonStats | undefined>(undefined);
  useEffect(() => {
    const ACTIVE = new Set(["installing", "running", "resolving_conflict"]);
    const poll = () => {
      const stateFile = resolve(projectRoot, WOMBO_DIR, "daemon-state.json");
      if (!existsSync(stateFile)) {
        setDaemonStats(undefined);
        return;
      }
      try {
        const data = JSON.parse(readFileSync(stateFile, "utf8"));
        const running = (data.agents ?? []).filter((a: any) => ACTIVE.has(a.status)).length;
        const polledMax = data.scheduler?.maxConcurrent ?? 4;

        // If override matches polled value, clear the override
        if (maxConcurrentOverride !== null && polledMax === maxConcurrentOverride) {
          setMaxConcurrentOverride(null);
        }

        setDaemonStats({
          running,
          maxConcurrent: maxConcurrentOverride ?? polledMax,
          schedulerStatus: data.scheduler?.status ?? "unknown",
        });
      } catch {
        // non-fatal
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [projectRoot, maxConcurrentOverride]);

  // Resolve initial screen — explicit prop wins, then skipSplash flag
  const resolvedInitialScreen: string =
    initialScreenProp ??
    (skipSplash ? "quest-picker" : "splash");

  let resolvedInitialProps: Record<string, unknown>;
  if (resolvedInitialScreen === "onboarding") {
    resolvedInitialProps = onboardingProps;
  } else if (resolvedInitialScreen === "quest-picker") {
    resolvedInitialProps = questPickerProps;
  } else {
    // splash
    resolvedInitialProps = {
      onDone: () =>
        navRef.current?.replace("quest-picker", {
          ...questPickerProps,
        } as Record<string, unknown>),
      durationMs: splashDurationMs,
      projectRoot,
      config: config as unknown,
    };
  }

  const screens = {
    splash: SplashScreen,
    "quest-picker": QuestPickerScreen,
    "task-browser": TaskBrowserScreen,
    "daemon-monitor": DaemonMonitorScreen,
    "wave-monitor": WaveMonitorScreen,
    settings: SettingsScreen,
    onboarding: OnboardingScreen,
  };

  const { rows, columns } = useTerminalSize();

  return (
    <Box width={columns} height={rows}>
      <ThemeContext.Provider value={theme}>
        <I18nContext.Provider value={tFn}>
          <DashboardStoreContext.Provider value={emptyDashStore}>
            <EscMenuProvider onNavigate={handleEscNavigate}>
              <ChromeLayout
                screenName={SCREEN_NAMES[currentScreenKey] ?? currentScreenKey}
                daemonConnected={daemonConnected}
                daemonStats={daemonStats}
                locale={config.tui?.locale ?? "en"}
              >
                <ScreenRouter
                  screens={screens}
                  initialScreen={resolvedInitialScreen}
                  initialProps={resolvedInitialProps}
                  onScreenChange={setCurrentScreenKey}
                >
                  <NavWire navRef={navRef} />
                </ScreenRouter>
              </ChromeLayout>
            </EscMenuProvider>
          </DashboardStoreContext.Provider>
        </I18nContext.Provider>
      </ThemeContext.Provider>
    </Box>
  );
}
