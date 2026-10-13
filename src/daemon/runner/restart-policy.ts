/**
 * restart-policy.ts — The one place that decides "may this agent be restarted".
 *
 * Wraps the supervisor-core transient policy around the persisted
 * agent.retries / agent.maxRetries counters. Trackers are rehydrated from
 * those counters (so a daemon restart or user retry keeps the count) and
 * dropped when the agent ends. Review-gate send-backs and merge/conflict
 * flows are not restarts and never come through here.
 */

import {
  createRestartTracker,
  type ExitReason,
  type RestartDecision,
  type RestartTracker,
} from "../../lib/supervisor-core";
import type { DaemonState } from "../state";

interface Counters {
  retries: number;
  maxRetries: number;
}

const trackers = new Map<string, RestartTracker>();

/** Tracker for an agent, rebuilt whenever it drifts from the persisted counters. */
function trackerFor(featureId: string, agent: Counters): RestartTracker {
  let tracker = trackers.get(featureId);
  if (!tracker || tracker.restarts !== agent.retries || tracker.maxRestarts !== agent.maxRetries) {
    tracker = createRestartTracker({
      maxRestarts: agent.maxRetries,
      initialRestarts: agent.retries,
    });
    trackers.set(featureId, tracker);
  }
  return tracker;
}

/** Forget an agent's tracker (agent ended or was removed). */
export function dropRestartTracker(featureId: string): void {
  trackers.delete(featureId);
}

/**
 * Side-effect free: would an abnormal exit be restarted? Used by the
 * reapDeadProcesses safety net and DaemonState.retryAgent.
 */
export function mayRestart(agent: Counters): boolean {
  const probe = createRestartTracker({
    maxRestarts: agent.maxRetries,
    initialRestarts: agent.retries,
  });
  return probe.decide({ kind: "crash", error: "" }).action === "restart";
}

/** Consume one restart if the policy allows it for this exit reason. */
export function decideRestart(featureId: string, agent: Counters, reason: ExitReason): RestartDecision {
  const decision = trackerFor(featureId, agent).decide(reason);
  if (decision.action === "give-up") dropRestartTracker(featureId);
  return decision;
}

export interface RestartOutcomeContext {
  state: DaemonState;
  handleRetry(featureId: string): void;
  rescueChainPredecessors(featureId: string): void;
  /** Shutdown hook for an agent the policy gave up on. */
  giveUp?(featureId: string): void;
  pauseScheduler?(reason: string, autoResumeMs?: number | null): void;
  raiseNeedsYouAlert?(featureId: string, alertText: string): void;
}

/** Agent process crashed or hung: restart under the policy or fail it. */
export function onProcessFailed(
  ctx: RestartOutcomeContext,
  featureId: string,
  error: string,
  reason: ExitReason = { kind: "crash", error },
): void {
  const agent = ctx.state.getAgent(featureId);
  if (!agent) return;
  const decision = decideRestart(featureId, agent, reason);
  if (decision.action === "restart") {
    ctx.state.updateAgent(featureId, { retries: decision.attempt, error });
    // QUIRK (pinned by the characterization suite): `agent` is the live state
    // object, already bumped by updateAgent, so the message runs one ahead.
    ctx.state.updateAgentStatus(featureId, "retry", `Retry ${agent.retries + 1}/${decision.max}: ${error}`);
    ctx.handleRetry(featureId);
  } else if (decision.action === "pause-limit") {
    const rawReset = decision.usageLimit?.resetRaw;
    const resetMsg = rawReset ? ` (resets ${rawReset})` : "";
    const displayMsg = `Usage limit reached${resetMsg}: ${decision.error}`;

    ctx.state.updateAgent(featureId, { error: decision.error });
    ctx.state.updateAgentStatus(featureId, "retry", `Paused: usage limit${resetMsg}`);

    ctx.raiseNeedsYouAlert?.(featureId, displayMsg);
    ctx.pauseScheduler?.(`Usage limit on ${featureId}${resetMsg}`, decision.usageLimit?.resetsAtMs);
  } else {
    ctx.state.updateAgentStatus(featureId, "failed", error);
    ctx.state.updateAgent(featureId, { error });
    ctx.state.cancelDownstream(featureId);
    ctx.giveUp?.(featureId);
    ctx.rescueChainPredecessors(featureId);
  }
}
