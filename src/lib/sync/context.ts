/**
 * context.ts — Resolve the GitHub repo and token for sync into a client.
 * Shared by the `woco sync` commands, the auto-sync hook and the daemon cycle.
 * The token is never printed or logged.
 */

import { loadConfig, normalizeSyncGithubConfig } from "../../config";
import { msg, type Msg } from "../i18n";
import { createGitHubClient, detectRepo, resolveToken, type CreateGitHubClientOptions, type GitHubClient } from "./github-client";

/** `sync.github.repo` from config, tolerating an absent or malformed block. */
export function configuredRepo(projectRoot: string): string | { owner: string; name: string; host?: string } | null {
  try {
    return normalizeSyncGithubConfig(loadConfig(projectRoot).sync).repo ?? null;
  } catch {
    return null; // unreadable config: fall back to the git remote
  }
}

export type SyncContext = { ok: true; client: GitHubClient } | { ok: false; error: Msg };

/** Resolve repo and token into a client; ok:false carries a clear message. */
export async function resolveSyncContext(
  projectRoot: string,
  env: Record<string, string | undefined> = process.env,
  clientOptions: Partial<CreateGitHubClientOptions> = {},
): Promise<SyncContext> {
  const repo = detectRepo(projectRoot, configuredRepo(projectRoot));
  if (!repo) return { ok: false, error: msg("cli.sync.noRepo") };
  const token = await resolveToken(env);
  if (!token) return { ok: false, error: msg("cli.sync.noToken") };
  return { ok: true, client: createGitHubClient({ token, repo, ...clientOptions }) };
}
