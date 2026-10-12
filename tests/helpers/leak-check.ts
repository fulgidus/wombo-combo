/**
 * Leak detection for resilience scenarios. Call `snapshotResources` before a
 * scenario and `assertNoLeaks` in afterEach: it fails when child processes,
 * worktrees, feature/quest branches or prunable worktree admin entries were
 * left behind. Survivor processes are killed so a failure does not cascade
 * into the next test.
 */

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { worktreesDir } from "../../src/lib/worktree";
import { gitRaw } from "./git-repo";
import { waitFor } from "./wait-for";

export interface ResourceSnapshot {
  worktrees: string[];
  worktreeDirEntries: string[];
  branches: string[];
}

export interface LeakCheckOptions {
  /** Branches that may legitimately exist after the scenario. */
  allowBranches?: string[];
  /** Extra PIDs that must be dead (in addition to the registry). */
  trackedPids?: number[];
  /** Overall deadline for tracked processes to exit. Default 5000ms. */
  deadlineMs?: number;
}

interface Exitable {
  pid: number;
  exited: Promise<unknown>;
}

const PROCESS_MARKER = "fake-agent-runner.ts";
const trackedPids = new Set<number>();
const trackedProcs = new Map<number, Exitable>();

/** Register a PID that must be dead when the scenario ends. */
export function trackPid(pid: number): void {
  trackedPids.add(pid);
}

/** Register a spawned subprocess that must have exited when the scenario ends. */
export function trackProcess(proc: Exitable): void {
  trackedProcs.set(proc.pid, proc);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Descendants of this process whose command line mentions the fake agent runner. */
function fakeAgentDescendants(): number[] {
  // `ps -A -o pid=,ppid=,command=` works on both Linux and macOS.
  const res = spawnSync("ps", ["-A", "-o", "pid=,ppid=,command="], { encoding: "utf-8" });
  if (res.status !== 0) return [];
  const children = new Map<number, number[]>();
  const commands = new Map<number, string>();
  for (const line of res.stdout.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (!m) continue;
    const pid = Number(m[1]);
    const ppid = Number(m[2]);
    commands.set(pid, m[3]!);
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  const found: number[] = [];
  const stack = [...(children.get(process.pid) ?? [])];
  while (stack.length > 0) {
    const pid = stack.pop()!;
    if (commands.get(pid)?.includes(PROCESS_MARKER)) found.push(pid);
    stack.push(...(children.get(pid) ?? []));
  }
  return found;
}

function listWorktreePaths(projectRoot: string): string[] {
  const res = gitRaw(projectRoot, "worktree", "list", "--porcelain");
  if (res.status !== 0) return [];
  return res.stdout
    .split("\n")
    .filter((l) => l.startsWith("worktree "))
    .map((l) => l.slice("worktree ".length));
}

function listBranches(projectRoot: string): string[] {
  const res = gitRaw(
    projectRoot,
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads/feature/",
    "refs/heads/quest/",
  );
  if (res.status !== 0) return [];
  return res.stdout.split("\n").filter(Boolean);
}

function listWorktreeDirEntries(projectRoot: string): string[] {
  const dir = worktreesDir(projectRoot);
  return existsSync(dir) ? readdirSync(dir) : [];
}

/** Capture the resources that exist before a scenario starts. */
export function snapshotResources(projectRoot: string): ResourceSnapshot {
  return {
    worktrees: listWorktreePaths(projectRoot),
    worktreeDirEntries: listWorktreeDirEntries(projectRoot),
    branches: listBranches(projectRoot),
  };
}

async function reapProcesses(opts: LeakCheckOptions): Promise<string[]> {
  const deadlineMs = opts.deadlineMs ?? 5_000;
  const procs = new Map(trackedProcs);
  const pids = new Set<number>([...trackedPids, ...(opts.trackedPids ?? []), ...procs.keys()]);
  trackedPids.clear();
  trackedProcs.clear();

  // Event-driven: wait on each subprocess's `exited` promise, bounded by one deadline.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"timeout">((r) => {
    timer = setTimeout(() => r("timeout"), deadlineMs);
  });
  try {
    await Promise.race([
      Promise.all([...procs.values()].map((p) => p.exited)).then(() => "done" as const),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
  // Bare PIDs have no exit event; poll liveness until the same overall budget is spent.
  const bare = [...pids].filter((p) => !procs.has(p));
  if (bare.length > 0) {
    await waitFor(() => bare.every((p) => !isAlive(p)), "tracked pids to exit", deadlineMs, 10).catch(
      () => {},
    );
  }

  const survivors = new Set<number>([...pids].filter(isAlive));
  for (const pid of fakeAgentDescendants()) survivors.add(pid);
  for (const pid of survivors) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
  for (const pid of survivors) {
    const proc = procs.get(pid);
    if (proc) await proc.exited.catch(() => {});
  }
  return [...survivors].map((pid) => `process ${pid} was still running`);
}

/** Fail when the scenario left processes, worktrees or branches behind. */
export async function assertNoLeaks(
  projectRoot: string,
  before: ResourceSnapshot,
  opts: LeakCheckOptions = {},
): Promise<void> {
  const problems: string[] = [];

  problems.push(...(await reapProcesses(opts)));

  for (const wt of listWorktreePaths(projectRoot)) {
    if (!before.worktrees.includes(wt)) problems.push(`leaked worktree: ${wt}`);
  }
  const dir = worktreesDir(projectRoot);
  for (const entry of listWorktreeDirEntries(projectRoot)) {
    if (!before.worktreeDirEntries.includes(entry)) {
      problems.push(`leftover directory under worktrees dir: ${dir}/${entry}`);
    }
  }

  const allowed = new Set([...before.branches, ...(opts.allowBranches ?? [])]);
  for (const branch of listBranches(projectRoot)) {
    if (!allowed.has(branch)) problems.push(`leaked branch: ${branch}`);
  }

  const prune = gitRaw(projectRoot, "worktree", "prune", "--dry-run", "--verbose");
  const pruneOut = `${prune.stdout}${prune.stderr}`.trim();
  if (pruneOut) problems.push(`prunable worktree admin entries:\n${pruneOut}`);

  if (problems.length > 0) {
    throw new Error(`resource leaks detected:\n- ${problems.join("\n- ")}`);
  }
}
