/**
 * merge-driver.ts — git merge driver for tracked wombo-combo YAML files.
 *
 * `tasks/_meta.yml` and `archive/_meta.yml` change their timestamps on every
 * write, so concurrent branches always conflict. This module provides pure
 * 3-way merge functions (newest timestamp wins, disjoint field edits union)
 * plus the git glue (`mergeDriverMain`, `setupMergeDriver`). When unsure the
 * merge returns a conflict signal and git falls back to a normal conflict.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

export type MergeResult = { ok: true; content: string } | { ok: false; reason: string };

export const MERGE_DRIVER_NAME = "woco-meta";
export const DEFAULT_DRIVER_COMMAND = "woco team merge-meta %O %A %B";
export const GITATTRIBUTES_LINES = [
  `.wombo-combo/tasks/_meta.yml merge=${MERGE_DRIVER_NAME}`,
  `.wombo-combo/archive/_meta.yml merge=${MERGE_DRIVER_NAME}`,
  `.wombo-combo/tasks/*.yml merge=${MERGE_DRIVER_NAME}`,
  `.wombo-combo/archive/*.yml merge=${MERGE_DRIVER_NAME}`,
];

class Conflict extends Error {}
const ABSENT = Symbol("absent");
type V = unknown;

const isObj = (v: V): v is Record<string, V> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function eq(a: V, b: V): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => eq(x, b[i]));
  }
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => k in b && eq(a[k], b[k]));
  }
  return false;
}

function newest(a: V, b: V): V {
  if (typeof a !== "string" || typeof b !== "string") throw new Conflict("non-string timestamp");
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) throw new Conflict("unparseable timestamp");
  if (ta === tb) return a <= b ? a : b; // deterministic
  return ta > tb ? a : b;
}

function merge3(base: V, ours: V, theirs: V, meta: boolean, key: string): V {
  if (eq(ours, theirs)) return ours;
  if (eq(base, ours)) return theirs;
  if (eq(base, theirs)) return ours;
  if (ours === ABSENT || theirs === ABSENT) throw new Conflict(`${key}: changed vs deleted`);
  if (meta && /_at$/.test(key) && typeof ours === "string") return newest(ours, theirs);
  if (isObj(ours) && isObj(theirs)) {
    const b = isObj(base) ? base : {};
    const keys = [...Object.keys(ours)];
    for (const k of Object.keys(theirs)) if (!keys.includes(k)) keys.push(k);
    const out: Record<string, V> = {};
    for (const k of keys) {
      const r = merge3(
        k in b ? b[k] : ABSENT,
        k in ours ? ours[k] : ABSENT,
        k in theirs ? theirs[k] : ABSENT,
        meta,
        k,
      );
      if (r !== ABSENT) out[k] = r;
    }
    return out;
  }
  if (Array.isArray(ours) && Array.isArray(theirs) && Array.isArray(base)) {
    // union only when both sides purely added to the base list
    const keeps = (side: V[]) => base.every((x) => side.some((y) => eq(x, y)));
    if (keeps(ours) && keeps(theirs)) {
      const out = [...base];
      for (const x of [...ours, ...theirs]) if (!out.some((y) => eq(x, y))) out.push(x);
      return out;
    }
  }
  throw new Conflict(`${key}: both sides changed`);
}

function parse(text: string): V {
  if (text.trim() === "") return ABSENT;
  const doc = YAML.parse(text);
  if (!isObj(doc)) throw new Conflict("not a YAML mapping");
  return doc;
}

function run(base: string, ours: string, theirs: string, meta: boolean): MergeResult {
  try {
    const b = parse(base), o = parse(ours), t = parse(theirs);
    if (eq(o, t)) return { ok: true, content: ours };
    if (eq(b, o)) return { ok: true, content: theirs };
    if (eq(b, t)) return { ok: true, content: ours };
    if (o === ABSENT || t === ABSENT) return { ok: false, reason: "one side is empty" };
    const merged = merge3(b === ABSENT ? {} : b, o, t, meta, "");
    return { ok: true, content: YAML.stringify(merged) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** 3-way merge for `_meta.yml`: newest `*_at` timestamp wins, other fields union. */
export function mergeMetaYaml(base: string, ours: string, theirs: string): MergeResult {
  return run(base, ours, theirs, true);
}

/** Field-wise 3-way merge for a per-task yml; same-field divergence conflicts. */
export function mergeTaskYaml(base: string, ours: string, theirs: string): MergeResult {
  return run(base, ours, theirs, false);
}

/** Pick the right merge by content: a top-level `id` marks a task file. */
export function mergeAutoYaml(base: string, ours: string, theirs: string): MergeResult {
  let isTask = false;
  try {
    for (const s of [ours, theirs, base]) {
      const d = s.trim() ? YAML.parse(s) : null;
      if (isObj(d) && "id" in d) isTask = true;
    }
  } catch {
    return { ok: false, reason: "invalid YAML" };
  }
  return isTask ? mergeTaskYaml(base, ours, theirs) : mergeMetaYaml(base, ours, theirs);
}

/**
 * git merge-driver entrypoint. argv = [%O, %A, %B]. Writes the merged result
 * to %A and returns 0, or returns 1 (leaving %A untouched) to signal conflict.
 */
export function mergeDriverMain(argv: string[]): number {
  const [basePath, oursPath, theirsPath] = argv;
  if (!basePath || !oursPath || !theirsPath) return 1;
  try {
    const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf-8") : "");
    const res = mergeAutoYaml(read(basePath), read(oursPath), read(theirsPath));
    if (!res.ok) return 1;
    writeFileSync(oursPath, res.content);
    return 0;
  } catch {
    return 1;
  }
}

export interface SetupResult {
  gitattributesChanged: boolean;
  configChanged: boolean;
}

/** Idempotently write .gitattributes lines and the local git merge driver config. */
export function setupMergeDriver(projectRoot: string, opts: { command?: string } = {}): SetupResult {
  const command = opts.command ?? DEFAULT_DRIVER_COMMAND;
  const attrPath = join(projectRoot, ".gitattributes");
  const existing = existsSync(attrPath) ? readFileSync(attrPath, "utf-8") : "";
  const have = new Set(existing.split(/\r?\n/).map((l) => l.trim()));
  const missing = GITATTRIBUTES_LINES.filter((l) => !have.has(l));
  if (missing.length > 0) {
    const sep = existing === "" || existing.endsWith("\n") ? "" : "\n";
    writeFileSync(attrPath, existing + sep + missing.join("\n") + "\n");
  }

  const git = (...args: string[]) =>
    spawnSync("git", ["config", "--local", ...args], { cwd: projectRoot, encoding: "utf-8" });
  let configChanged = false;
  const settings: Array<[string, string]> = [
    [`merge.${MERGE_DRIVER_NAME}.name`, "wombo-combo YAML merge driver"],
    [`merge.${MERGE_DRIVER_NAME}.driver`, command],
  ];
  for (const [k, v] of settings) {
    const cur = git("--get", k);
    if (cur.status === 0 && cur.stdout.trim() === v) continue;
    const set = git(k, v);
    if (set.status !== 0) throw new Error(`git config failed: ${set.stderr.trim()}`);
    configChanged = true;
  }
  return { gitattributesChanged: missing.length > 0, configChanged };
}
