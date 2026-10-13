/**
 * routes.ts — Per-operation agent route selection for the daemon.
 *
 * Extracted from agent-runner.ts as a behaviour-preserving move. Resolves the
 * harness/profile route for an operation on a task and walks its fallback
 * chain when a binary or account variable is unavailable.
 */

import type { WomboConfig } from "../../config";
import type { Task } from "../../lib/tasks";
import { resolveRoute, selectAvailableRoute, type ResolvedRoute, type RouteSelection } from "../../lib/harness/routing";
import type { DaemonState } from "../state";

export type RouteOperation = "code" | "conflict" | "review";

export interface RouteContext {
  config: WomboConfig;
  state: DaemonState;
}

/**
 * Resolve the route for an operation on a task. The profile recorded on the
 * agent state is forced so retries and later operations stay on the same
 * profile; "default" (the synthesized legacy profile) is never forced.
 */
export function resolveAgentRoute(
  ctx: RouteContext,
  operation: RouteOperation,
  featureId: string,
  task: Task | null | undefined,
  sessionModel?: string | null,
): ResolvedRoute {
  const agent = ctx.state.getAgent(featureId);
  const forced = operation === "code" && agent?.profile && agent.profile !== "default" ? agent.profile : undefined;
  return resolveRoute(ctx.config, {
    operation,
    task: task ?? null,
    sessionModel: sessionModel ?? agent?.model ?? ctx.state.getModel(),
    profile: forced,
  });
}

/** Resolve the route and walk its fallback chain; legacy routes are not probed. */
export function selectRoute(
  ctx: RouteContext,
  operation: RouteOperation,
  featureId: string,
  task: Task | null,
  sessionModel?: string | null,
): RouteSelection {
  const route = resolveAgentRoute(ctx, operation, featureId, task, sessionModel);
  if (route.legacy) return { route, skipped: [] };
  const agent = ctx.state.getAgent(featureId);
  return selectAvailableRoute(ctx.config, route, {
    operation,
    task,
    sessionModel: sessionModel ?? agent?.model ?? ctx.state.getModel(),
    profile: route.profile,
  });
}

/**
 * Route for a conflict-resolver launch (operation "conflict"). When no
 * configured profile can start, the failure is logged on the agent and the
 * launcher falls back to the legacy agent.bin route.
 */
export function conflictRoute(
  ctx: RouteContext,
  featureId: string,
  task: Task,
  model: string | undefined,
): ResolvedRoute | undefined {
  try {
    return selectRoute(ctx, "conflict", featureId, task, model ?? null).route;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.state.updateAgentActivity(featureId, `conflict profile unavailable, using default agent: ${msg}`.slice(0, 200));
    return undefined;
  }
}
