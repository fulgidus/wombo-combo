/**
 * team.ts — Task claim commands for multi-developer teams.
 *
 *   woco team claim <task-id> [--force]   Claim a task for yourself
 *   woco team release <task-id> [--force] Release a claim
 *   woco team status                      Who owns what, expired claims, unclaimed tasks
 */

import type { WomboConfig } from "../config";
import { normalizeTeamConfig } from "../config";
import { claimTask, listClaims, releaseTask, resolveOwner } from "../lib/claims";
import { loadFeatures } from "../lib/tasks";
import { msg, t } from "../lib/i18n";
import { output, outputError, outputMessage, type OutputFormat } from "../lib/output";

export interface TeamOptions {
  projectRoot: string;
  config: WomboConfig;
  outputFmt?: OutputFormat;
  taskId?: string;
  force?: boolean;
  now?: Date;
}

export function cmdTeamClaim(opts: TeamOptions): void {
  const fmt = opts.outputFmt ?? "text";
  const id = opts.taskId;
  if (!id) outputError(fmt, msg("cli.team.claim.missingId"));
  let res;
  try {
    res = claimTask(opts.projectRoot, opts.config, id, { force: opts.force, now: opts.now });
  } catch (err) {
    return outputError(fmt, msg("cli.team.invalidId", { id }));
  }
  if (!res.ok) {
    return outputError(
      fmt,
      msg("cli.team.claim.blocked", { id, owner: res.claim.owner, expires: res.claim.expires_at }),
    );
  }
  outputMessage(
    fmt,
    msg(res.takenOver ? "cli.team.claim.takenOver" : "cli.team.claim.done", {
      id,
      owner: res.claim.owner,
      expires: res.claim.expires_at,
    }),
    { claim: res.claim, taken_over: res.takenOver },
  );
}

export function cmdTeamRelease(opts: TeamOptions): void {
  const fmt = opts.outputFmt ?? "text";
  const id = opts.taskId;
  if (!id) outputError(fmt, msg("cli.team.release.missingId"));
  let res;
  try {
    res = releaseTask(opts.projectRoot, opts.config, id, { force: opts.force, now: opts.now });
  } catch {
    return outputError(fmt, msg("cli.team.invalidId", { id }));
  }
  if (!res.ok) {
    if (res.reason === "not_claimed") {
      return outputError(fmt, msg("cli.team.release.notClaimed", { id }));
    }
    return outputError(fmt, msg("cli.team.release.blocked", { id, owner: res.claim.owner }));
  }
  outputMessage(fmt, msg("cli.team.release.done", { id }), { released: true, id });
}

export function cmdTeamStatus(opts: TeamOptions): void {
  const fmt = opts.outputFmt ?? "text";
  const team = normalizeTeamConfig(opts.config.team);
  const me = resolveOwner(opts.projectRoot, opts.config);
  const claims = listClaims(opts.projectRoot, opts.config, opts.now);
  const live = new Set(claims.filter((c) => !c.expired).map((c) => c.task_id));
  let unclaimed: string[] = [];
  try {
    const data = loadFeatures(opts.projectRoot, opts.config);
    unclaimed = data.tasks
      .filter((tk) => tk.status !== "done" && tk.status !== "cancelled" && !live.has(tk.id))
      .map((tk) => tk.id);
  } catch {
    // Task store unreadable: report claims only
  }
  const data = {
    enabled: team.enabled,
    owner: me,
    claim_ttl_hours: team.claimTtlHours,
    claims: claims.map((c) => ({
      task_id: c.task_id,
      owner: c.owner,
      host: c.host,
      claimed_at: c.claimed_at,
      expires_at: c.expires_at,
      expired: c.expired,
      mine: c.mine,
    })),
    unclaimed,
  };
  output(fmt, data, () => {
    console.log(t(team.enabled ? "cli.team.status.enabled" : "cli.team.status.disabled", { owner: me }));
    if (claims.length === 0) {
      console.log(t("cli.team.status.noClaims"));
    } else {
      console.log(t("cli.team.status.claimsHeading"));
      for (const c of claims) {
        console.log(
          t(c.expired ? "cli.team.status.claimExpired" : "cli.team.status.claim", {
            id: c.task_id,
            owner: c.owner + (c.mine ? " " + t("cli.team.status.you") : ""),
            expires: c.expires_at,
          }),
        );
      }
    }
    if (unclaimed.length > 0) {
      console.log(t("cli.team.status.unclaimedHeading", { count: unclaimed.length }));
      for (const id of unclaimed) console.log(`  ${id}`);
    }
  });
}
