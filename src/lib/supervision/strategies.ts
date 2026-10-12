import type { ExitReason, RestartStrategy, RestartType } from "./types";

export interface RestartPlan {
  /** Child ids to stop, in the order they must be stopped. */
  stop: string[];
  /** Child ids to start, in the order they must be started. */
  start: string[];
}

/**
 * Whether a child with the given restart type should be restarted after it
 * exited with `reason`. A supervisor that is itself stopping must not restart
 * anything; that is the caller's responsibility.
 */
export function shouldRestart(restart: RestartType, reason: ExitReason): boolean {
  switch (restart) {
    case "permanent":
      return true;
    case "transient":
      return reason.kind === "crash";
    case "temporary":
      return false;
  }
}

/**
 * Computes which children to stop and start after `failedId` died.
 * `order` is the child start order. Stops are in reverse start order and
 * starts in forward start order (Erlang/OTP semantics). The failed child is
 * already dead, so it never appears in `stop`.
 */
export function planRestart(
  strategy: RestartStrategy,
  order: readonly string[],
  failedId: string,
): RestartPlan {
  const index = order.indexOf(failedId);
  if (index < 0) throw new Error(`Unknown child id: ${failedId}`);

  switch (strategy) {
    case "one_for_one":
      return { stop: [], start: [failedId] };
    case "one_for_all":
      return {
        stop: order.filter((id) => id !== failedId).reverse(),
        start: [...order],
      };
    case "rest_for_one": {
      const later = order.slice(index + 1);
      return { stop: [...later].reverse(), start: [failedId, ...later] };
    }
  }
}

/**
 * Separate helper (planRestart stays spec-free): drops "temporary" children
 * from `plan.start`, since temporary children are never restarted. They are
 * still stopped when a sibling's failure requires it. Ids without a spec are
 * kept. Returns a new plan.
 */
export function filterRestartable(
  plan: RestartPlan,
  specs: ReadonlyMap<string, { restart: RestartType }>,
): RestartPlan {
  return {
    stop: [...plan.stop],
    start: plan.start.filter((id) => specs.get(id)?.restart !== "temporary"),
  };
}
