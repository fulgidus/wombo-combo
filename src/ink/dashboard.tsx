/**
 * dashboard.tsx — Default TUI screen: live wave status overview.
 *
 * Replaces the SharedStore/DaemonStore polling hack with a proper React
 * context. Callers (InkWomboTUI / InkDaemonTUI) push updates by calling
 * their `notify()` refs, which call `setStore()` — the state flows
 * reactively with no polling interval required.
 *
 * Components:
 *   DashboardScreen      — the main dashboard screen component
 *   DashboardAgentRow    — a single agent row in the agent table
 *
 * Context:
 *   DashboardStoreContext — React context holding the live wave state
 *   useDashboardStore()   — hook to read the dashboard store
 *
 * Usage (in ScreenRouter):
 *   const SCREENS: ScreenMap = {
 *     splash: SplashScreen,
 *     dashboard: DashboardScreen,
 *     settings: SettingsScreen,
 *   };
 *
 *   // Outer wrapper provides the context:
 *   <DashboardStoreContext.Provider value={liveStore}>
 *     <ScreenRouter screens={SCREENS} initialScreen="splash" />
 *   </DashboardStoreContext.Provider>
 */

import React, { createContext, useContext } from "react";
import { Box, Text, useInput } from "ink";
import { t as defaultT, useI18n } from "./i18n";
import { useTheme } from "./theme";
import { useTerminalSize } from "./use-terminal-size";
import { useEscMenu } from "./esc-menu";
import { formatCost, formatTokenCount } from "./usage-overlay";
import { Sparkline } from "./sparkline";
import { useDashboardMetrics, type DashboardMetricsValue } from "./dashboard-metrics-context";
import {
  sanitizeLine,
  type ActivityEntry,
  type QuestUsageEntry,
  type RemainingEstimate,
} from "../lib/dashboard-metrics";
import type { AgentStatus } from "../daemon/agent-status";
import type { SchedulerState } from "../daemon/protocol";
import type { HitlQuestion } from "../lib/hitl-channel";

// ---------------------------------------------------------------------------
// DashboardStore type
// ---------------------------------------------------------------------------

/**
 * A single agent row displayed in the dashboard. The optional detail fields
 * carry everything the daemon monitor's WaveMonitorView needs, so the
 * monitor screen can render LIVE data from DashboardStoreContext instead of
 * ScreenRouter-frozen props.
 */
export interface DashboardAgent {
  id: string;
  status: AgentStatus;
  branch?: string;
  activity?: string | null;
  startedAt?: string | null;
  retries?: number;
  effortEstimateMs?: number | null;
  buildPassed?: boolean | null;
  buildOutput?: string | null;
}

/** The live wave state fed into DashboardStoreContext. */
export interface DashboardStore {
  agents: DashboardAgent[];
  running: number;
  done: number;
  failed: number;
  total: number;
  /** Live scheduler state (optional — daemon monitor reads it for the header). */
  scheduler?: SchedulerState | null;
  /** Whether all agents are in terminal states (optional — live completion). */
  allComplete?: boolean;
  /** Pending HITL questions rebuilt from the last snapshot (optional). */
  pendingQuestions?: HitlQuestion[];
}

const DEFAULT_STORE: DashboardStore = {
  agents: [],
  running: 0,
  done: 0,
  failed: 0,
  total: 0,
};

// ---------------------------------------------------------------------------
// DashboardStoreContext
// ---------------------------------------------------------------------------

export const DashboardStoreContext = createContext<DashboardStore>(DEFAULT_STORE);

/**
 * Hook to read the current live wave state from anywhere inside the TUI tree.
 */
export function useDashboardStore(): DashboardStore {
  return useContext(DashboardStoreContext);
}

// ---------------------------------------------------------------------------
// DashboardAgentRow
// ---------------------------------------------------------------------------

const STATUS_COLOR: Partial<Record<AgentStatus, string>> = {
  queued: "gray",
  installing: "cyan",
  running: "blue",
  completed: "yellow",
  verified: "green",
  failed: "red",
  merged: "magenta",
  retry: "yellow",
  resolving_conflict: "cyan",
};

const STATUS_ICON: Partial<Record<AgentStatus, string>> = {
  queued: "·",
  installing: "⟳",
  running: "●",
  completed: "○",
  verified: "✓",
  failed: "✗",
  merged: "◆",
  retry: "↻",
  resolving_conflict: "⚡",
};

export interface DashboardAgentRowProps {
  agent: DashboardAgent;
}

export function DashboardAgentRow({ agent }: DashboardAgentRowProps): React.ReactElement {
  const color = STATUS_COLOR[agent.status] ?? "white";
  const icon = STATUS_ICON[agent.status] ?? "?";
  const label = defaultT(`status.${agent.status}`) ?? agent.status;

  return (
    <Box flexDirection="row" gap={1} paddingLeft={2}>
      <Text color={color}>{icon}</Text>
      <Text color={color} bold={agent.status === "running"}>
        {agent.id}
      </Text>
      {agent.branch && (
        <Text dimColor>({agent.branch})</Text>
      )}
      <Text dimColor>{label}</Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// DashboardScreen
// ---------------------------------------------------------------------------

export interface DashboardScreenProps {
  /**
   * Screen-local back action (key `b`). Disabled while the ESC menu is open.
   * Only used by the realtime layout.
   */
  onBack?: () => void;
}

/**
 * Legacy store-based rendering, kept verbatim for consumers that do not mount
 * a DashboardMetricsProvider.
 */
function LegacyDashboard(): React.ReactElement {
  const t = defaultT;
  const store = useDashboardStore();

  if (store.agents.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
        <Text dimColor>{t("wave.noWave")}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press ESC to open the menu.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
      {/* Summary */}
      <Box flexDirection="row" gap={2} marginBottom={1}>
        <Text color="blue">
          {t("wave.running")} {store.running}
        </Text>
        <Text color="green">
          {t("wave.completed")} {store.done}
        </Text>
        <Text color="red">
          {t("wave.failed")} {store.failed}
        </Text>
        <Text dimColor>
          / {store.total} {t("wave.agents")}
        </Text>
      </Box>

      {/* Agent rows */}
      <Box flexDirection="column">
        {store.agents.map((agent) => (
          <DashboardAgentRow key={agent.id} agent={agent} />
        ))}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>ESC menu  q quit</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Realtime dashboard (metrics-provider based)
// ---------------------------------------------------------------------------

/** Rows reserved for ChromeLayout's top and bottom bars plus screen padding. */
export const DASHBOARD_RESERVED_ROWS = 4;
/** Below this many content rows the compact layout is used. */
export const DASHBOARD_COMPACT_ROWS = 14;
/** Below this many columns the narrow layout is used. */
export const DASHBOARD_NARROW_COLUMNS = 60;

/** Format a duration for the ETA line: "<1m", "12m", "1h 05m", "2d 3h". */
export function formatEta(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "<1m";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** HH:MM:SS (local time) for an activity entry. */
export function formatClock(at: number): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Render untrusted text (ids, activity) as one safe line: remove complete
 * ANSI escape sequences first, then collapse remaining control characters.
 */
export function safeText(value: unknown, max = 200): string {
  const raw = typeof value === "string" ? value : String(value ?? "");
  const stripped = raw
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]?/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b./g, "");
  return sanitizeLine(stripped, max);
}

/** Clip to a number of terminal columns (code points; glyphs here are 1 column). */
function clip(text: string, width: number): string {
  const chars = [...text];
  if (chars.length <= width) return text;
  return width <= 1 ? chars.slice(0, Math.max(0, width)).join("") : chars.slice(0, width - 1).join("") + "…";
}

type Tfn = (key: string, vars?: Record<string, string | number>) => string;

function connectionLabel(c: DashboardMetricsValue["connection"], t: Tfn): string {
  switch (c) {
    case "connected":
      return t("dashboard.live");
    case "connecting":
      return t("dashboard.connecting");
    case "reconnecting":
      return t("dashboard.reconnecting");
    case "disconnected":
      return t("dashboard.disconnected");
    default:
      return t("dashboard.unavailable");
  }
}

function etaText(eta: RemainingEstimate, stale: boolean, t: Tfn): string {
  if (stale) return t("dashboard.etaStale");
  switch (eta.kind) {
    case "none":
      return t("dashboard.etaNone");
    case "unknown":
      return eta.reason === "paused" ? t("dashboard.etaPaused") : t("dashboard.etaUnknown");
    case "estimate": {
      const base = t("dashboard.etaApprox", { time: formatEta(eta.ms) });
      return eta.unestimated > 0
        ? `${base}, ${t("dashboard.etaUnestimated", { count: eta.unestimated })}`
        : base;
    }
  }
}

function questLabel(q: QuestUsageEntry, t: Tfn): string {
  return q.questId === null ? t("dashboard.unknownQuest") : safeText(q.questId, 40);
}

interface LineSpec {
  key: string;
  node: React.ReactNode;
}

function RowLine({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <Box height={1} flexShrink={0}>
      <Text wrap="truncate-end">{children}</Text>
    </Box>
  );
}

function pick(color: string | undefined): string | undefined {
  return color ? color : undefined;
}

function RealtimeDashboard({
  metrics,
  onBack,
}: {
  metrics: DashboardMetricsValue;
  onBack?: () => void;
}): React.ReactElement {
  const t = useI18n();
  const theme = useTheme();
  const { rows, columns } = useTerminalSize();
  const esc = useEscMenu();

  // Screen-local back action; ESC stays with the global menu.
  useInput(
    (input) => {
      if (input === "b") onBack?.();
    },
    { isActive: Boolean(onBack) && !esc.open },
  );

  const width = Math.max(20, columns - 2); // paddingX=1 each side
  const avail = Math.max(1, rows - DASHBOARD_RESERVED_ROWS);
  const compact = avail < DASHBOARD_COMPACT_ROWS;
  const narrow = columns < DASHBOARD_NARROW_COLUMNS;
  const stale = metrics.connection !== "connected";
  const live = metrics.connection === "connected";
  const { counts, throughput, activity } = metrics.state;
  const run = pick(theme.statusColors.running);
  const done = pick(theme.statusColors.verified);
  const fail = pick(theme.statusColors.failed);

  // ---- throughput numbers -------------------------------------------------
  const graphWidth = Math.max(4, Math.min(60, compact ? Math.min(24, width - 28) : width - 2));
  const shown = throughput.buckets.slice(-Math.min(graphWidth, throughput.buckets.length));
  const nowRate = shown.length ? shown[shown.length - 1]! : 0;
  const peak = shown.reduce((m, v) => Math.max(m, v), 0);

  const header = (
    <RowLine>
      <Text bold>{t("screen.dashboard")}</Text>
      <Text dimColor> · </Text>
      <Text color={live ? done : undefined} dimColor={!live}>
        {live ? "● " : "○ "}
        {connectionLabel(metrics.connection, t)}
      </Text>
    </RowLine>
  );

  const countsSegments = (
    <>
      <Text color={run}>
        {theme.statusIcons.running} {t("dashboard.running")} {counts.running}
      </Text>
      <Text>  </Text>
      <Text color={done}>
        {theme.statusIcons.verified} {t("dashboard.done")} {counts.done}
      </Text>
      <Text>  </Text>
      <Text color={fail}>
        {theme.statusIcons.failed} {t("dashboard.failed")} {counts.failed}
      </Text>
    </>
  );
  const extraCounts = (
    <Text dimColor>
      {counts.queued > 0 ? `${t("dashboard.queued")} ${counts.queued}  ` : ""}
      {counts.retry > 0 ? `${t("dashboard.retrying")} ${counts.retry}  ` : ""}
      {t("dashboard.tracked", { count: counts.total })}
    </Text>
  );

  const lines: LineSpec[] = [];
  const add = (key: string, node: React.ReactNode): void => {
    lines.push({ key, node });
  };

  const sparkColor = live ? run : undefined;
  const throughputDetails = `${t("dashboard.throughputNow", { n: nowRate })}  ${t("dashboard.throughputPeak", { n: peak })}`;

  if (compact) {
    // Compact: one line per metric.
    add(
      "head",
      <RowLine>
        <Text bold dimColor={!live}>
          {live ? "●" : "○"}{" "}
        </Text>
        {countsSegments}
      </RowLine>,
    );
    add(
      "tput",
      <Box key="t" height={1} flexShrink={0}>
        <Text>{clip(t("dashboard.throughput"), 10)} </Text>
        <Sparkline samples={shown} width={graphWidth} color={sparkColor} />
        <Text dimColor wrap="truncate-end"> {throughputDetails}</Text>
      </Box>,
    );
    add(
      "eta",
      <RowLine>
        <Text>{t("dashboard.eta")}: </Text>
        <Text dimColor={stale}>{etaText(metrics.eta, stale, t)}</Text>
      </RowLine>,
    );
  } else {
    add("head", header);
    if (narrow) {
      add("c1", <RowLine>{countsSegments}</RowLine>);
      add("c2", <RowLine>{extraCounts}</RowLine>);
    } else {
      add(
        "c1",
        <RowLine>
          {countsSegments}
          <Text>  </Text>
          {extraCounts}
        </RowLine>,
      );
    }
    add(
      "tputh",
      <RowLine>
        <Text bold>{t("dashboard.throughput")}</Text>
        <Text dimColor> ({t("dashboard.throughputUnit", { minutes: shown.length })})  {throughputDetails}</Text>
      </RowLine>,
    );
    add(
      "tput",
      <Box key="t" height={1} flexShrink={0} paddingLeft={1}>
        <Sparkline samples={shown} width={graphWidth} color={sparkColor} />
      </Box>,
    );
    add(
      "eta",
      <RowLine>
        <Text bold>{t("dashboard.eta")}: </Text>
        <Text dimColor={stale}>{etaText(metrics.eta, stale, t)}</Text>
      </RowLine>,
    );
  }

  // ---- panels share the remaining rows -------------------------------------
  const quests = metrics.quests;
  const barWidth = narrow ? 0 : 8;
  const maxTokens = quests.reduce((m, q) => Math.max(m, q.totals.total_tokens), 0);
  const footerRows = 1;
  const panelBudget = Math.max(0, avail - lines.length - footerRows);

  const questHeader = compact ? 0 : 1;
  const activityHeader = compact ? 0 : 1;
  const bodyBudget = Math.max(0, panelBudget - questHeader - activityHeader);
  // Tokens get up to ~40% of body rows (at least 1 when there is data); activity the rest.
  const wantQuests = Math.max(1, quests.length);
  const wantActivity = Math.max(1, activity.length);
  let questRows = Math.min(wantQuests, Math.max(compact ? 1 : 2, Math.ceil(bodyBudget * 0.4)));
  let activityRows = Math.min(wantActivity, Math.max(0, bodyBudget - questRows));
  if (activityRows < 1 && bodyBudget >= 2) {
    activityRows = 1;
    questRows = Math.max(1, bodyBudget - 1);
  }
  // Give unused activity rows back to quests.
  questRows = Math.min(wantQuests, questRows + Math.max(0, bodyBudget - questRows - activityRows));
  if (bodyBudget < 1) {
    questRows = 0;
    activityRows = 0;
  }

  const renderQuestRows = (): void => {
    if (questRows <= 0) return;
    if (quests.length === 0) {
      add(
        "q-empty",
        <RowLine>
          <Text dimColor>{metrics.usageAvailable ? t("dashboard.tokensEmpty") : t("dashboard.tokensUnavailable")}</Text>
        </RowLine>,
      );
      return;
    }
    const truncated = quests.length > questRows;
    const visible = truncated ? Math.max(0, questRows - 1) : quests.length;
    const labelWidth = Math.max(8, Math.min(24, Math.floor(width / 3)));
    for (const q of quests.slice(0, visible)) {
      const total = q.totals.total_tokens;
      const filled = maxTokens > 0 && barWidth > 0 ? Math.max(total > 0 ? 1 : 0, Math.round((total / maxTokens) * barWidth)) : 0;
      const bar =
        barWidth > 0
          ? theme.progressFilled.repeat(filled) + theme.progressEmpty.repeat(Math.max(0, barWidth - filled))
          : "";
      const cost = q.totals.total_cost > 0 ? ` ${formatCost(q.totals.total_cost)}` : "";
      add(
        `q-${q.questId ?? "unknown"}`,
        <RowLine>
          <Text>{clip(questLabel(q, t), labelWidth).padEnd(labelWidth)} </Text>
          {bar ? <Text color={sparkColor}>{bar} </Text> : null}
          <Text>{formatTokenCount(total)}</Text>
          <Text dimColor>{cost}</Text>
        </RowLine>,
      );
    }
    if (truncated) {
      add("q-more", <RowLine><Text dimColor>{t("dashboard.more", { count: quests.length - visible })}</Text></RowLine>);
    }
  };

  const renderActivityRows = (): void => {
    if (activityRows <= 0) return;
    if (activity.length === 0) {
      add(
        "a-empty",
        <RowLine>
          <Text dimColor>{counts.total === 0 && live ? t("dashboard.noAgents") : t("dashboard.activityEmpty")}</Text>
        </RowLine>,
      );
      return;
    }
    const list: readonly ActivityEntry[] = activity.slice(0, activityRows);
    list.forEach((entry, i) => {
      const who = entry.featureId ? `${clip(safeText(entry.featureId, 40), 20)} ` : "";
      add(
        `a-${i}`,
        <RowLine>
          <Text dimColor>{formatClock(entry.at)} </Text>
          <Text>{who}</Text>
          <Text dimColor={stale}>{safeText(entry.text)}</Text>
        </RowLine>,
      );
    });
  };

  if (!compact && bodyBudget >= 1) {
    add("qh", <RowLine><Text bold>{t("dashboard.tokens")}</Text></RowLine>);
  }
  renderQuestRows();
  if (!compact && bodyBudget >= 1) {
    add("ah", <RowLine><Text bold>{t("dashboard.activity")}</Text></RowLine>);
  }
  renderActivityRows();

  const hint = onBack ? `${t("dashboard.hintBack")}  ${t("dashboard.hintMenu")}` : t("dashboard.hintMenu");
  add("foot", <RowLine><Text dimColor>{hint}</Text></RowLine>);

  // Hard bound: never exceed the rows available to this screen; the footer
  // line always survives so the back hint stays visible.
  const bounded = lines.length > avail ? [...lines.slice(0, Math.max(0, avail - 1)), lines[lines.length - 1]!] : lines;

  return (
    <Box flexDirection="column" paddingX={1} height={avail} flexShrink={1} overflow="hidden">
      {bounded.map((l) => (
        <React.Fragment key={l.key}>{l.node}</React.Fragment>
      ))}
    </Box>
  );
}

/**
 * DashboardScreen — realtime dashboard when a DashboardMetricsProvider is
 * mounted above it; otherwise the legacy DashboardStoreContext rendering.
 *
 * The screen never reads files, subscribes to the daemon or starts timers:
 * all sampling lives in DashboardMetricsProvider.
 */
export function DashboardScreen({ onBack }: DashboardScreenProps = {}): React.ReactElement {
  const metrics = useDashboardMetrics();
  if (!metrics) return <LegacyDashboard />;
  return <RealtimeDashboard metrics={metrics} onBack={onBack} />;
}
