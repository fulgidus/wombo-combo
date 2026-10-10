/**
 * dashboard-metrics-context.tsx — Nullable React context for realtime
 * dashboard metrics.
 *
 * Deliberately separate from the legacy DashboardStoreContext in
 * dashboard.tsx. The value is `null` when no DashboardMetricsProvider is
 * mounted, which lets DashboardScreen fall back to legacy store rendering.
 */

import { createContext, useContext } from "react";
import type {
  DashboardConnection,
  DashboardMetricsState,
  QuestUsageEntry,
  RemainingEstimate,
} from "../lib/dashboard-metrics";

/** Immutable snapshot published by the provider. */
export interface DashboardMetricsValue {
  /** Reducer state (counts, throughput, activity, scheduler). */
  state: DashboardMetricsState;
  /** Approximate remaining time for tracked unfinished agents. */
  eta: RemainingEstimate;
  /** Daemon link state; anything but "connected" means data may be stale. */
  connection: DashboardConnection;
  /** Quest-level persisted token totals (from usage.jsonl only), largest first. */
  quests: readonly QuestUsageEntry[];
  /** Whether the persisted usage file was readable at the last sample. */
  usageAvailable: boolean;
  /** Epoch ms of the provider's last sample (injected clock). */
  now: number;
}

export const DashboardMetricsContext = createContext<DashboardMetricsValue | null>(null);

/** Read the dashboard metrics, or null when no provider is mounted. */
export function useDashboardMetrics(): DashboardMetricsValue | null {
  return useContext(DashboardMetricsContext);
}
