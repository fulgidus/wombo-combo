/**
 * dashboard-provider.tsx — Live sampling provider for the realtime dashboard.
 *
 * Owns ALL dashboard sampling:
 *   - subscribes (BEFORE requesting state) to the caller-owned DaemonClient's
 *     typed events, snapshots and connection changes;
 *   - one interval (default 1s) that advances throughput buckets, recomputes
 *     the ETA, reads appended bytes of usage.jsonl and (less often) refreshes
 *     task/archive quest attribution metadata;
 *   - feeds the pure reducers in lib/dashboard-metrics and the incremental
 *     reader in lib/dashboard-usage into immutable context values.
 *
 * Mount it ONCE above the ScreenRouter so history survives navigation.
 * Screens only consume `useDashboardMetrics()`; they never sample.
 *
 * Quest token totals come exclusively from usage.jsonl. `evt:token-usage`
 * carries cumulative per-agent totals without quest ids; it only triggers a
 * (coalesced) file refresh and is never added to anything.
 *
 * The provider never connects or disconnects the client; it only calls
 * `sendCommand("cmd:get-state")` on (re)connection so no second connection
 * and no extra pending-reply timer is created.
 */

import React, { useEffect, useState, type ReactNode } from "react";
import type { DaemonClient, ConnectionState } from "../daemon/client";
import type { EventMap, EventType } from "../daemon/protocol";
import { loadConfig } from "../config";
import { loadArchive, loadTasks } from "../lib/tasks";
import {
  applyDashboardEvent,
  createDashboardMetrics,
  estimateRemaining,
  tickDashboardMetrics,
  type DashboardConnection,
  type DashboardEvent,
  type DashboardMetricsState,
} from "../lib/dashboard-metrics";
import { DashboardUsageReader, buildTaskQuestMap } from "../lib/dashboard-usage";
import {
  DashboardMetricsContext,
  type DashboardMetricsValue,
} from "./dashboard-metrics-context";

// ---------------------------------------------------------------------------
// Injectable timers / clock (test seams)
// ---------------------------------------------------------------------------

export interface TimerApi {
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const REAL_TIMERS: TimerApi = {
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Subset of DaemonClient the provider relies on (allows fakes in tests). */
export type DashboardDaemonClient = Pick<
  DaemonClient,
  "on" | "onStateChange" | "getLastSnapshot" | "getState" | "sendCommand"
>;

export interface DashboardMetricsProviderProps {
  projectRoot: string;
  /** Caller-owned client. Never connected/disconnected by the provider. */
  daemonClient?: DashboardDaemonClient | null;
  /** Clock returning epoch ms. Default: Date.now. */
  now?: () => number;
  /** Sampling interval. Default 1000ms. */
  sampleIntervalMs?: number;
  /** Minimum gap between task/archive metadata refreshes. Default 30000ms. */
  metadataRefreshMs?: number;
  /** Event-burst coalescing delay. Default 100ms. */
  coalesceMs?: number;
  timers?: TimerApi;
  /** Override task -> quest metadata loading (default reads tasks + archive). */
  loadTaskQuests?: (projectRoot: string) => ReadonlyMap<string, string | null>;
  children?: ReactNode;
}

const DASHBOARD_EVENTS = [
  "evt:state-snapshot",
  "evt:agent-status-change",
  "evt:agent-activity",
  "evt:build-result",
  "evt:merge-result",
  "evt:scheduler-status",
  "evt:task-picked",
] as const satisfies readonly EventType[];

function mapConnection(state: ConnectionState | undefined): DashboardConnection {
  switch (state) {
    case "connected":
    case "connecting":
    case "reconnecting":
    case "disconnected":
      return state;
    default:
      return "disconnected";
  }
}

function defaultLoadTaskQuests(projectRoot: string): ReadonlyMap<string, string | null> {
  const config = loadConfig(projectRoot);
  const tasks = loadTasks(projectRoot, config).tasks;
  const archive = loadArchive(projectRoot, config).tasks;
  return buildTaskQuestMap(tasks, archive);
}

function initialValue(
  now: number,
  connection: DashboardConnection,
): DashboardMetricsValue {
  const state = createDashboardMetrics(now);
  return {
    state,
    eta: estimateRemaining(state, now),
    connection,
    quests: [],
    usageAvailable: false,
    now,
  };
}

export function DashboardMetricsProvider({
  projectRoot,
  daemonClient = null,
  now: clock = Date.now,
  sampleIntervalMs = 1000,
  metadataRefreshMs = 30_000,
  coalesceMs = 100,
  timers = REAL_TIMERS,
  loadTaskQuests = defaultLoadTaskQuests,
  children,
}: DashboardMetricsProviderProps): React.ReactElement {
  const [value, setValue] = useState<DashboardMetricsValue>(() =>
    initialValue(clock(), daemonClient ? mapConnection(daemonClient.getState()) : "unavailable"),
  );

  useEffect(() => {
    let disposed = false;
    const reader = new DashboardUsageReader(projectRoot);
    let metrics: DashboardMetricsState = createDashboardMetrics(clock());
    let connection: DashboardConnection = daemonClient
      ? mapConnection(daemonClient.getState())
      : "unavailable";
    let quests = reader.snapshot();
    let usageDirty = false;
    let flushHandle: unknown = null;
    let lastMetadataAt = Number.NEGATIVE_INFINITY;
    const unsubs: Array<() => void> = [];

    const publish = (): void => {
      if (disposed) return;
      const t = clock();
      setValue({
        state: metrics,
        eta: estimateRemaining(metrics, t),
        connection,
        quests,
        usageAvailable: reader.isAvailable(),
        now: t,
      });
    };

    const refreshMetadata = (force: boolean): void => {
      const t = clock();
      if (!force && t - lastMetadataAt < metadataRefreshMs) return;
      lastMetadataAt = t;
      try {
        reader.setTaskQuests(loadTaskQuests(projectRoot));
      } catch {
        // Keep previous attribution metadata on failure.
      }
    };

    const refreshUsage = (): void => {
      reader.refresh();
      quests = reader.snapshot();
      usageDirty = false;
    };

    const flush = (): void => {
      flushHandle = null;
      if (disposed) return;
      if (usageDirty) refreshUsage();
      publish();
    };

    const scheduleFlush = (): void => {
      if (flushHandle !== null || disposed) return;
      flushHandle = timers.setTimeout(flush, coalesceMs);
    };

    const requestState = (): void => {
      if (!daemonClient) return;
      try {
        daemonClient.sendCommand("cmd:get-state", {});
      } catch {
        // Not connected yet; the snapshot arrives on (re)connection.
      }
    };

    const onEvent = <T extends (typeof DASHBOARD_EVENTS)[number]>(type: T) =>
      (payload: EventMap[T]): void => {
        if (disposed) return;
        metrics = applyDashboardEvent(metrics, { type, payload } as DashboardEvent, clock());
        scheduleFlush();
      };

    // 1. Initial usage + metadata so historical totals show without a daemon.
    refreshMetadata(true);
    refreshUsage();

    // 2. Subscribe FIRST, then bootstrap from the cached snapshot and request
    //    fresh state, so nothing is lost during initialization.
    if (daemonClient) {
      for (const type of DASHBOARD_EVENTS) {
        unsubs.push(daemonClient.on(type, onEvent(type) as never));
      }
      unsubs.push(
        daemonClient.on("evt:token-usage", () => {
          // Cumulative, unattributed totals: only a hint to reread the JSONL.
          if (disposed) return;
          usageDirty = true;
          scheduleFlush();
        }),
      );
      unsubs.push(
        daemonClient.onStateChange((state) => {
          if (disposed) return;
          connection = mapConnection(state);
          if (connection === "connected") requestState();
          scheduleFlush();
        }),
      );

      const cached = daemonClient.getLastSnapshot();
      if (cached) {
        metrics = applyDashboardEvent(metrics, { type: "evt:state-snapshot", payload: cached }, clock());
      }
      connection = mapConnection(daemonClient.getState());
      if (connection === "connected") requestState();
    }

    publish();

    // 3. The single sampling interval.
    const interval = timers.setInterval(() => {
      if (disposed) return;
      const t = clock();
      metrics = tickDashboardMetrics(metrics, t);
      refreshMetadata(false);
      refreshUsage();
      publish();
    }, sampleIntervalMs);

    return () => {
      disposed = true;
      timers.clearInterval(interval);
      if (flushHandle !== null) timers.clearTimeout(flushHandle);
      flushHandle = null;
      for (const off of unsubs) off();
      unsubs.length = 0;
      reader.close();
    };
    // clock/timers/loaders are treated as stable seams; client or project
    // replacement restarts sampling with fresh state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRoot, daemonClient]);

  return <DashboardMetricsContext.Provider value={value}>{children}</DashboardMetricsContext.Provider>;
}
