/**
 * claims.ts — Git-tracked task claims for multi-developer teams.
 *
 * A claim is one YAML file per task at .wombo-combo/claims/<task-id>.yml
 * naming the owner (git user.email, or config team.owner), the host, and a
 * TTL-bound expiry. Claims are plain files committed to git: no server, no
 * network. A claim held by someone else blocks claiming unless it has
 * expired or `force` is set. Callers gate on isTeamEnabled(config).
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, userInfo } from "node:os";
import { join } from "node:path";
import YAML from "yaml";
import { WOMBO_DIR, normalizeTeamConfig, type WomboConfig } from "../config";

export const CLAIMS_DIR = "claims";

export interface Claim {
  task_id: string;
  owner: string;
  host: string;
  claimed_at: string;
  expires_at: string;
}

export interface ClaimInfo extends Claim {
  expired: boolean;
  /** True when the claim belongs to the resolved current owner */
  mine: boolean;
}

export interface ClaimOptions {
  /** Take over a claim held by someone else */
  force?: boolean;
  /** Clock override (tests) */
  now?: Date;
}

export type ClaimResult =
  | { ok: true; claim: Claim; takenOver: boolean }
  | { ok: false; reason: "claimed_by_other"; claim: Claim };

export type ReleaseResult =
  | { ok: true; released: true; claim: Claim }
  | { ok: false; reason: "not_claimed" }
  | { ok: false; reason: "claimed_by_other"; claim: Claim };

export function claimsDir(projectRoot: string): string {
  return join(projectRoot, WOMBO_DIR, CLAIMS_DIR);
}

function assertSafeId(taskId: string): void {
  if (!taskId || !/^[A-Za-z0-9._-]+$/.test(taskId) || taskId.startsWith(".")) {
    throw new Error(`invalid task id: ${JSON.stringify(taskId)}`);
  }
}

export function claimPath(projectRoot: string, taskId: string): string {
  assertSafeId(taskId);
  return join(claimsDir(projectRoot), `${taskId}.yml`);
}

/** Whether claims are active for this config (team.enabled). */
export function isTeamEnabled(config: WomboConfig): boolean {
  return normalizeTeamConfig(config.team).enabled;
}

/** Claim owner: config team.owner > git config user.email > OS user name. */
export function resolveOwner(projectRoot: string, config: WomboConfig): string {
  const configured = normalizeTeamConfig(config.team).owner;
  if (configured && configured.trim()) return configured.trim();
  try {
    const res = spawnSync("git", ["config", "user.email"], { cwd: projectRoot, encoding: "utf-8" });
    const email = res.status === 0 ? res.stdout.trim() : "";
    if (email) return email;
  } catch {
    // fall through
  }
  try {
    return userInfo().username;
  } catch {
    return "unknown";
  }
}

export function isExpired(claim: Pick<Claim, "expires_at">, now: Date = new Date()): boolean {
  const t = Date.parse(claim.expires_at);
  return Number.isNaN(t) || t <= now.getTime();
}

/** Read one claim; null when absent or unparseable. */
export function readClaim(projectRoot: string, taskId: string): Claim | null {
  let path: string;
  try {
    path = claimPath(projectRoot, taskId);
  } catch {
    return null;
  }
  if (!existsSync(path)) return null;
  try {
    const parsed = YAML.parse(readFileSync(path, "utf-8"));
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.owner !== "string" || typeof parsed.expires_at !== "string") return null;
    return {
      task_id: String(parsed.task_id ?? taskId),
      owner: parsed.owner,
      host: String(parsed.host ?? ""),
      claimed_at: String(parsed.claimed_at ?? ""),
      expires_at: parsed.expires_at,
    };
  } catch {
    return null;
  }
}

function writeClaimAtomic(projectRoot: string, claim: Claim): void {
  const path = claimPath(projectRoot, claim.task_id);
  mkdirSync(claimsDir(projectRoot), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, YAML.stringify(claim));
  renameSync(tmp, path);
}

/** All claims (expired ones included, flagged), sorted by task id. */
export function listClaims(
  projectRoot: string,
  config: WomboConfig,
  now: Date = new Date(),
): ClaimInfo[] {
  const dir = claimsDir(projectRoot);
  if (!existsSync(dir)) return [];
  const me = resolveOwner(projectRoot, config);
  const out: ClaimInfo[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".yml")) continue;
    const claim = readClaim(projectRoot, file.slice(0, -4));
    if (!claim) continue;
    out.push({ ...claim, expired: isExpired(claim, now), mine: claim.owner === me });
  }
  return out;
}

/** True when a live (non-expired) claim by a different owner exists. */
export function isClaimedByOther(
  projectRoot: string,
  config: WomboConfig,
  taskId: string,
  now: Date = new Date(),
): boolean {
  const claim = readClaim(projectRoot, taskId);
  if (!claim || isExpired(claim, now)) return false;
  return claim.owner !== resolveOwner(projectRoot, config);
}

/** Claim a task for the current owner (refreshes own claims). */
export function claimTask(
  projectRoot: string,
  config: WomboConfig,
  taskId: string,
  opts: ClaimOptions = {},
): ClaimResult {
  const now = opts.now ?? new Date();
  const owner = resolveOwner(projectRoot, config);
  const existing = readClaim(projectRoot, taskId);
  const live = existing !== null && !isExpired(existing, now);
  if (existing && live && existing.owner !== owner && !opts.force) {
    return { ok: false, reason: "claimed_by_other", claim: existing };
  }
  const ttlMs = normalizeTeamConfig(config.team).claimTtlHours * 3_600_000;
  const keepStart = existing && live && existing.owner === owner && existing.claimed_at;
  const claim: Claim = {
    task_id: taskId,
    owner,
    host: hostname(),
    claimed_at: keepStart ? existing!.claimed_at : now.toISOString(),
    expires_at: new Date(now.getTime() + ttlMs).toISOString(),
  };
  writeClaimAtomic(projectRoot, claim);
  return { ok: true, claim, takenOver: !!existing && live && existing.owner !== owner };
}

/** Release a claim held by the current owner (or expired / forced). */
export function releaseTask(
  projectRoot: string,
  config: WomboConfig,
  taskId: string,
  opts: ClaimOptions = {},
): ReleaseResult {
  const now = opts.now ?? new Date();
  const existing = readClaim(projectRoot, taskId);
  if (!existing) return { ok: false, reason: "not_claimed" };
  const owner = resolveOwner(projectRoot, config);
  if (existing.owner !== owner && !isExpired(existing, now) && !opts.force) {
    return { ok: false, reason: "claimed_by_other", claim: existing };
  }
  rmSync(claimPath(projectRoot, taskId), { force: true });
  return { ok: true, released: true, claim: existing };
}
