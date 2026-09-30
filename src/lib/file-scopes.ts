/**
 * file-scopes.ts — File-scope steering for collision-minimizing parallelism.
 *
 * Tasks may declare the file paths they intend to touch (`paths:` field in
 * the task YAML). The scheduler uses these declarations to steer execution:
 *
 *   - Tasks with DISJOINT scopes run in parallel (no merge conflicts by
 *     construction — each branch touches different files).
 *   - Tasks with OVERLAPPING scopes are forced to run sequentially: the
 *     scheduler defers a candidate whose paths overlap the paths of an
 *     active agent (or of a task submitted earlier in the same scheduling
 *     pass) until the overlapping agent reaches a terminal state.
 *
 * This keeps merges trivial: when the deferred task finally launches, it
 * branches from base AFTER its predecessor's merge landed, so its merge is
 * a fast-forward-like trivial merge.
 *
 * Path matching is segment-prefix based: "src" overlaps "src/lib/a.ts"
 * (ancestor), "src/lib" overlaps "src/lib" (exact), but "src" does not
 * overlap "srcx" or "docs/src". Tasks without declared paths are never
 * scope-conflicted (opt-in steering).
 */

/** Normalize a declared scope path for comparison. */
export function normalizeScopePath(p: string): string {
  let out = p.trim();
  while (out.startsWith("./")) out = out.slice(2);
  out = out.replace(/^\/+/, "");
  while (out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

function segments(p: string): string[] {
  return normalizeScopePath(p).split("/").filter((s) => s.length > 0);
}

function isSegmentPrefix(a: string[], b: string[]): boolean {
  if (a.length > b.length) return false;
  return a.every((seg, i) => seg === b[i]);
}

/**
 * True when any declared path in `a` overlaps any declared path in `b`
 * (same path, or one is a segment-prefix ancestor of the other).
 * Empty arrays never overlap.
 */
export function pathsOverlap(a: string[], b: string[]): boolean {
  for (const pa of a) {
    const segA = segments(pa);
    if (segA.length === 0) continue;
    for (const pb of b) {
      const segB = segments(pb);
      if (segB.length === 0) continue;
      if (isSegmentPrefix(segA, segB) || isSegmentPrefix(segB, segA)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Partition tasks into scope groups: tasks whose declared paths overlap are
 * merged into the same group (they must run sequentially); tasks with no
 * declared paths are unscoped and can always run in parallel.
 *
 * Returns groups of task ids, each group sorted in input order. Unscoped
 * tasks each get their own singleton group.
 */
export function scopePartitions(
  tasks: Array<{ id: string; paths?: string[] }>
): string[][] {
  // Union-find over tasks with declared paths.
  const parent = new Map<number, number>();
  const find = (i: number): number => {
    let root = i;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression
    let cur = i;
    while (parent.get(cur) !== cur) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (i: number, j: number): void => {
    parent.set(find(i), find(j));
  };

  const scoped: Array<{ index: number; id: string; paths: string[] }> = [];
  for (let i = 0; i < tasks.length; i++) {
    const paths = tasks[i].paths ?? [];
    if (paths.length > 0) scoped.push({ index: i, id: tasks[i].id, paths });
  }

  for (let i = 0; i < scoped.length; i++) parent.set(i, i);
  for (let i = 0; i < scoped.length; i++) {
    for (let j = i + 1; j < scoped.length; j++) {
      if (pathsOverlap(scoped[i].paths, scoped[j].paths)) union(i, j);
    }
  }

  const groups = new Map<number, string[]>();
  const unscoped: string[][] = [];
  const scopedById = new Map(scoped.map((s) => [s.id, s]));
  for (const task of tasks) {
    const s = scopedById.get(task.id);
    if (!s) {
      unscoped.push([task.id]);
      continue;
    }
    const root = find(scoped.indexOf(s));
    const group = groups.get(root) ?? [];
    group.push(task.id);
    groups.set(root, group);
  }

  return [...groups.values(), ...unscoped];
}

/**
 * Render scope partitions as text for dry-run output. Groups with more than
 * one member run sequentially; singleton groups run in parallel.
 */
export function formatScopePartitions(partitions: string[][]): string {
  if (partitions.length === 0) return "";
  const lines: string[] = ["", "File scope partitions:"];
  for (const group of partitions) {
    if (group.length > 1) {
      lines.push(`  sequential: ${group.join(" → ")} (overlapping file scopes)`);
    } else {
      lines.push(`  parallel:   ${group[0]}`);
    }
  }
  return lines.join("\n");
}
