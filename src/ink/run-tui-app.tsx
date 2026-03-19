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
 *             ScreenRouter (initialScreen: "splash" | "quest-picker")
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
  useRef,
  type MutableRefObject,
} from "react";
import { ScreenRouter, useNavigation, type NavigationState } from "./router";
import { ChromeLayout } from "./chrome";
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
   */
  skipSplash?: boolean;
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
  splashDurationMs = 1500,
  skipSplash = false,
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

  // navRef bridges EscMenuProvider's onNavigate callback to the inner ScreenRouter
  const navRef = useRef<NavigationState | null>(null);

  const handleEscNavigate = useCallback(
    (action: "settings" | "quit") => {
      if (action === "settings") {
        navRef.current?.push("settings", {
          config: settingsConfig as unknown,
          onSave: (patched: SettingsScreenConfig) => setSettingsConfig(patched),
          onBack: () => navRef.current?.pop(),
        } as Record<string, unknown>);
      } else if (action === "quit") {
        onExit();
      }
    },
    [settingsConfig, onExit]
  );

  // Splash screen props — onDone navigates to quest-picker
  const splashProps: Record<string, unknown> = {
    onDone: () =>
      navRef.current?.replace("quest-picker", {
        projectRoot,
        config: config as unknown,
        onExit,
        callbacks: callbacks as unknown,
      } as Record<string, unknown>),
    durationMs: splashDurationMs,
  };

  // Initial quest-picker props
  const questPickerProps: Record<string, unknown> = {
    projectRoot,
    config: config as unknown,
    onExit,
    callbacks: callbacks as unknown,
  };

  const screens = {
    splash: SplashScreen,
    "quest-picker": QuestPickerScreen,
    "task-browser": TaskBrowserScreen,
    "daemon-monitor": DaemonMonitorScreen,
    "wave-monitor": WaveMonitorScreen,
    settings: SettingsScreen,
    onboarding: OnboardingScreen,
  };

  const initialScreen = skipSplash ? "quest-picker" : "splash";
  const initialProps = skipSplash ? questPickerProps : splashProps;

  return (
    <ThemeContext.Provider value={theme}>
      <I18nContext.Provider value={tFn}>
        <DashboardStoreContext.Provider value={emptyDashStore}>
          <EscMenuProvider onNavigate={handleEscNavigate}>
            <ChromeLayout
              screenName="woco"
              daemonConnected={daemonConnected}
              locale={config.tui?.locale ?? "en"}
            >
              <ScreenRouter
                screens={screens}
                initialScreen={initialScreen}
                initialProps={initialProps}
              >
                <NavWire navRef={navRef} />
              </ScreenRouter>
            </ChromeLayout>
          </EscMenuProvider>
        </DashboardStoreContext.Provider>
      </I18nContext.Provider>
    </ThemeContext.Provider>
  );
}
