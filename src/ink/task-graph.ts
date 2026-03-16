/**
 * task-graph.ts — Build a dependency graph from tasks and organize into streams.
 *
 * Extracted from the neo-blessed tui-browser.ts. Produces the `TaskNode[]`
 * and `Stream` structures that TaskBrowserView expects.
 *
 * Algorithm:
 *   1. Build forward + reverse dependency maps
 *   2. Find connected components via undirected DFS
 *   3. Compute depth (longest path from leaf) within each component
 *   4. Sort topologically within each stream (depth ascending, then priority)
 *   5. Sort streams by highest-priority task
 */

import type { Task } from "../lib/tasks";
import type { TaskNode } from "./task-browser";
import { PRIORITY_ORDER } from "../lib/task-schema";
import { areDependenciesMet } from "../lib/tasks";
import type { SortField } from "../lib/tui-session";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Stream {
  /** ID of the stream (deepest/root task's ID). */
  id: string;
  /** Ordered task nodes in this stream. */
  nodes: TaskNode[];
}

// ---------------------------------------------------------------------------
// Duration parser (for effort sort)
// ---------------------------------------------------------------------------

/**
 * Parse an ISO 8601 duration string to minutes. Returns Infinity for
 * unparseable or missing values (sorts to end).
 */
function parseDurationMinutes(effort: string | undefined | null): number {
  if (!effort) return Infinity;
  const m = effort.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!m) return Infinity;
  return (parseInt(m[1] ?? "0", 10) * 60) + parseInt(m[2] ?? "0", 10);
}

// ---------------------------------------------------------------------------
// Status sort order
// ---------------------------------------------------------------------------

const STATUS_SORT: Record<string, number> = {
  in_progress: 0,
  backlog: 1,
  planned: 2,
  blocked: 3,
  in_review: 4,
  done: 5,
  cancelled: 6,
};

// ---------------------------------------------------------------------------
// Graph Building
// ---------------------------------------------------------------------------

/**
 * Build a dependency graph from all tasks and organize them into streams
 * (connected components). Within each stream, tasks are topologically sorted.
 *
 * @param tasks     All tasks to include
 * @param doneIds   Set of completed task IDs (for computing `depsReady`)
 * @returns         Array of streams, sorted by highest-priority task
 */
export function buildTaskGraph(tasks: Task[], doneIds: Set<string>): Stream[] {
  const taskMap = new Map<string, Task>();
  for (const t of tasks) taskMap.set(t.id, t);

  // Build reverse dependency map (who depends on me?)
  const dependedOnBy = new Map<string, string[]>();
  for (const t of tasks) {
    for (const dep of t.depends_on) {
      if (!dependedOnBy.has(dep)) dependedOnBy.set(dep, []);
      dependedOnBy.get(dep)!.push(t.id);
    }
  }

  // Find connected components using undirected graph traversal
  const visited = new Set<string>();
  const components: string[][] = [];

  function dfs(id: string, component: string[]): void {
    if (visited.has(id)) return;
    if (!taskMap.has(id)) return;
    visited.add(id);
    component.push(id);
    const task = taskMap.get(id)!;
    for (const dep of task.depends_on) dfs(dep, component);
    for (const rev of (dependedOnBy.get(id) ?? [])) dfs(rev, component);
  }

  for (const t of tasks) {
    if (!visited.has(t.id)) {
      const comp: string[] = [];
      dfs(t.id, comp);
      components.push(comp);
    }
  }

  // For each component, compute depths and sort topologically
  const streams: Stream[] = [];
  for (const comp of components) {
    const depthMap = new Map<string, number>();
    const compSet = new Set(comp);

    function computeDepth(id: string, visiting: Set<string>): number {
      if (depthMap.has(id)) return depthMap.get(id)!;
      if (visiting.has(id)) return 0; // cycle protection
      visiting.add(id);
      const task = taskMap.get(id);
      if (!task) return 0;
      let maxDepth = 0;
      for (const dep of task.depends_on) {
        if (compSet.has(dep)) {
          maxDepth = Math.max(maxDepth, 1 + computeDepth(dep, visiting));
        }
      }
      visiting.delete(id);
      depthMap.set(id, maxDepth);
      return maxDepth;
    }

    for (const id of comp) computeDepth(id, new Set());

    // Sort by depth ascending (leaves first), then priority
    const sorted = [...comp].sort((a, b) => {
      const dA = depthMap.get(a) ?? 0;
      const dB = depthMap.get(b) ?? 0;
      if (dA !== dB) return dA - dB;
      const tA = taskMap.get(a)!;
      const tB = taskMap.get(b)!;
      return PRIORITY_ORDER[tA.priority] - PRIORITY_ORDER[tB.priority];
    });

    const maxDepthId = sorted[sorted.length - 1];
    const streamId = maxDepthId;

    const nodes: TaskNode[] = sorted.map((id) => ({
      task: taskMap.get(id)!,
      depth: depthMap.get(id) ?? 0,
      streamId,
      dependedOnBy: (dependedOnBy.get(id) ?? []).filter((d) => compSet.has(d)),
      depsReady: areDependenciesMet(taskMap.get(id)!, doneIds),
    }));

    streams.push({ id: streamId, nodes });
  }

  // Sort streams by highest-priority task in each
  streams.sort((a, b) => {
    const bestA = Math.min(...a.nodes.map((n) => PRIORITY_ORDER[n.task.priority]));
    const bestB = Math.min(...b.nodes.map((n) => PRIORITY_ORDER[n.task.priority]));
    return bestA - bestB;
  });

  return streams;
}

// ---------------------------------------------------------------------------
// Stream Sorting
// ---------------------------------------------------------------------------

/**
 * Compute a numeric sort key for a stream based on the given field.
 */
function streamSortKey(stream: Stream, field: SortField): number {
  switch (field) {
    case "priority":
      return Math.min(...stream.nodes.map((n) => PRIORITY_ORDER[n.task.priority]));
    case "effort":
      return Math.min(...stream.nodes.map((n) => parseDurationMinutes(n.task.effort)));
    case "status":
      return Math.min(...stream.nodes.map((n) => STATUS_SORT[n.task.status] ?? 99));
    case "name":
      return 0; // alpha sort is not meaningfully differentiated at stream level
    default:
      return 0;
  }
}

/**
 * Sort streams according to the given sort field and order.
 *
 * @param streams   The streams to sort
 * @param sortBy    Which field to sort by
 * @param sortOrder Sort direction (asc or desc)
 * @returns         Sorted copy of the streams array
 */
export function sortStreams(
  streams: Stream[],
  sortBy: SortField,
  sortOrder: "asc" | "desc" = "desc"
): Stream[] {
  if (sortBy === "stream") return streams; // natural grouping
  const order = sortOrder === "asc" ? 1 : -1;
  return [...streams].sort((a, b) => {
    return (streamSortKey(a, sortBy) - streamSortKey(b, sortBy)) * order;
  });
}

/**
 * Flatten streams into a single ordered TaskNode[] for display.
 *
 * @param streams   Sorted streams
 * @param hideDone  Whether to filter out done tasks
 * @returns         Flat ordered list of task nodes
 */
export function flattenStreams(
  streams: Stream[],
  hideDone: boolean = false
): TaskNode[] {
  const result: TaskNode[] = [];
  for (const stream of streams) {
    for (const node of stream.nodes) {
      if (hideDone && node.task.status === "done") continue;
      result.push(node);
    }
  }
  return result;
}
