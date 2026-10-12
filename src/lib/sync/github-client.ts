/**
 * Minimal fetch-based GitHub REST client for issue sync.
 *
 * - No dependencies; `fetch` and the sleep function are injectable.
 * - The token is only ever placed in the Authorization header. It is scrubbed
 *   from every error message and never logged or persisted.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RepoRef {
  owner: string;
  name: string;
  /** Hostname, e.g. github.com or ghe.example.com */
  host?: string;
}

export interface GitHubLabel {
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubUser {
  login: string;
}

export interface GitHubIssue {
  number: number;
  id: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  state_reason?: string | null;
  labels: Array<GitHubLabel | string>;
  assignees?: GitHubUser[];
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  user?: GitHubUser | null;
  /** Present when the item is a pull request (listIssues filters these out). */
  pull_request?: unknown;
}

export interface GitHubComment {
  id: number;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user?: GitHubUser | null;
}

export interface ListIssuesOptions {
  /** ISO timestamp; only issues updated at or after it */
  since?: string;
  /** Default "all" */
  state?: "open" | "closed" | "all";
  /** Restrict to these labels (comma-joined) */
  labels?: string[];
}

export interface CreateIssueInput {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

export interface UpdateIssueInput {
  title?: string;
  body?: string;
  state?: "open" | "closed";
  state_reason?: "completed" | "not_planned" | "reopened" | null;
  labels?: string[];
  assignees?: string[];
}

export interface CreateLabelInput {
  name: string;
  color: string;
  description?: string;
}

export interface GitHubClient {
  readonly repo: RepoRef;
  listIssues(opts?: ListIssuesOptions): Promise<GitHubIssue[]>;
  getIssue(number: number): Promise<GitHubIssue>;
  createIssue(input: CreateIssueInput): Promise<GitHubIssue>;
  updateIssue(number: number, patch: UpdateIssueInput): Promise<GitHubIssue>;
  listComments(issue: number, opts?: { since?: string }): Promise<GitHubComment[]>;
  createComment(issue: number, body: string): Promise<GitHubComment>;
  updateComment(commentId: number, body: string): Promise<GitHubComment>;
  listLabels(): Promise<GitHubLabel[]>;
  createLabel(input: CreateLabelInput): Promise<GitHubLabel>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class GitHubError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

/** 401, or 403 that is not a rate limit (bad/insufficient token). */
export class GitHubAuthError extends GitHubError {}
export class GitHubNotFoundError extends GitHubError {}
export class GitHubRateLimitError extends GitHubError {
  readonly retryAfterMs: number;
  constructor(message: string, retryAfterMs: number, status = 429) {
    super(message, status);
    this.retryAfterMs = retryAfterMs;
  }
}
export class GitHubNetworkError extends GitHubError {}
/** Any other non-2xx response (422 validation, 5xx after retries...). */
export class GitHubApiError extends GitHubError {}

// ---------------------------------------------------------------------------
// Token resolution
// ---------------------------------------------------------------------------

export type TokenRunner = (command: string, args: string[]) => Promise<{ code: number; stdout: string }> | { code: number; stdout: string };

async function defaultRunner(command: string, args: string[]): Promise<{ code: number; stdout: string }> {
  try {
    const proc = Bun.spawn([command, ...args], { stdout: "pipe", stderr: "ignore", stdin: "ignore" });
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    return { code, stdout };
  } catch {
    return { code: 127, stdout: "" };
  }
}

/** GITHUB_TOKEN, then GH_TOKEN, then `gh auth token`. Returns null when none. */
export async function resolveToken(
  env: Record<string, string | undefined> = process.env,
  run: TokenRunner = defaultRunner,
): Promise<string | null> {
  for (const key of ["GITHUB_TOKEN", "GH_TOKEN"]) {
    const v = env[key]?.trim();
    if (v) return v;
  }
  try {
    const res = await run("gh", ["auth", "token"]);
    const t = res.stdout.trim();
    if (res.code === 0 && t) return t;
  } catch {
    // gh missing or failing: no token
  }
  return null;
}

// ---------------------------------------------------------------------------
// Repo detection
// ---------------------------------------------------------------------------

export interface DetectedRepo {
  owner: string;
  name: string;
  host: string;
}

/** Parse https, ssh://, and scp-style git remote URLs. */
export function parseRemoteUrl(url: string): DetectedRepo | null {
  const u = url.trim();
  if (!u) return null;
  let host: string | undefined;
  let path: string | undefined;
  let m = u.match(/^(?:https?|ssh|git):\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/(.+)$/i);
  if (m) {
    host = m[1];
    path = m[2];
  } else {
    m = u.match(/^(?:[^@/\s]+@)?([^:/\s]+):(?!\/\/)(.+)$/);
    if (m) {
      host = m[1];
      path = m[2];
    }
  }
  if (!host || !path) return null;
  path = path.replace(/\/+$/, "").replace(/\.git$/i, "");
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const name = parts[parts.length - 1]!;
  const owner = parts.slice(0, -1).join("/");
  return { owner, name, host: host.toLowerCase() };
}

/** Parse "owner/name" or "host/owner/name" (config value). */
export function parseRepoSpec(spec: string): DetectedRepo | null {
  const parts = spec.trim().replace(/\.git$/i, "").split("/").filter(Boolean);
  if (parts.length === 2) return { owner: parts[0]!, name: parts[1]!, host: "github.com" };
  if (parts.length === 3 && parts[0]!.includes(".")) {
    return { owner: parts[1]!, name: parts[2]!, host: parts[0]!.toLowerCase() };
  }
  return null;
}

/**
 * Repo from config (`sync.github.repo`: "owner/name", "host/owner/name" or
 * {owner,name,host?}) else the `origin` remote of projectRoot.
 */
export function detectRepo(
  projectRoot: string,
  configRepo?: string | { owner: string; name: string; host?: string } | null,
): DetectedRepo | null {
  if (configRepo) {
    if (typeof configRepo === "string") {
      const parsed = parseRepoSpec(configRepo) ?? parseRemoteUrl(configRepo);
      if (parsed) return parsed;
    } else if (configRepo.owner && configRepo.name) {
      return { owner: configRepo.owner, name: configRepo.name, host: (configRepo.host ?? "github.com").toLowerCase() };
    }
  }
  try {
    const proc = Bun.spawnSync(["git", "remote", "get-url", "origin"], {
      cwd: projectRoot,
      stdout: "pipe",
      stderr: "ignore",
    });
    if (proc.exitCode !== 0) return null;
    return parseRemoteUrl(proc.stdout.toString());
  } catch {
    return null;
  }
}

/** API base URL: GITHUB_API_URL, else api.github.com or https://<host>/api/v3. */
export function apiUrlFor(host: string = "github.com", env: Record<string, string | undefined> = process.env): string {
  const fromEnv = env.GITHUB_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (host === "github.com") return "https://api.github.com";
  return `https://${host}/api/v3`;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface CreateGitHubClientOptions {
  token: string;
  repo: { owner: string; name: string; host?: string };
  /** Defaults to apiUrlFor(repo.host) */
  apiUrl?: string;
  fetch?: typeof fetch;
  /** Max retries for rate limits / 5xx / network errors (default 3) */
  maxRetries?: number;
  /** Longest single wait honoured; longer rate-limit waits throw (default 60000) */
  maxWaitMs?: number;
  /** Base backoff for 5xx / network errors (default 500) */
  baseBackoffMs?: number;
  /** Injectable sleep so tests are instant */
  sleep?: (ms: number) => Promise<void>;
  /** Clock for x-ratelimit-reset (default Date.now) */
  now?: () => number;
  perPage?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function parseNextLink(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="?next"?/);
    if (m) return m[1]!;
  }
  return null;
}

export function createGitHubClient(opts: CreateGitHubClientOptions): GitHubClient {
  const token = opts.token;
  const repo: RepoRef = { owner: opts.repo.owner, name: opts.repo.name, host: opts.repo.host };
  const base = (opts.apiUrl ?? apiUrlFor(repo.host)).replace(/\/+$/, "");
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? Date.now;
  const maxRetries = opts.maxRetries ?? 3;
  const maxWaitMs = opts.maxWaitMs ?? 60_000;
  const baseBackoff = opts.baseBackoffMs ?? 500;
  const perPage = opts.perPage ?? 100;
  const repoPath = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;

  const scrub = (s: string) => (token ? s.split(token).join("***") : s);

  function rateLimitWaitMs(res: Response): number | null {
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) {
      const secs = Number(retryAfter);
      if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
      const date = Date.parse(retryAfter);
      if (!Number.isNaN(date)) return Math.max(0, date - now());
    }
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      if (Number.isFinite(reset) && reset > 0) return Math.max(0, reset * 1000 - now());
      return 1000;
    }
    return res.status === 429 ? 1000 : null;
  }

  async function request(method: string, urlOrPath: string, body?: unknown): Promise<Response> {
    const url = urlOrPath.startsWith("http") ? urlOrPath : base + urlOrPath;
    const label = `${method} ${url.replace(base, "") || "/"}`;
    let attempt = 0;
    for (;;) {
      let res: Response;
      try {
        res = await doFetch(url, {
          method,
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "x-github-api-version": "2022-11-28",
            "user-agent": "wombo-combo-sync",
            ...(body !== undefined ? { "content-type": "application/json" } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        if (attempt < maxRetries) {
          await sleep(baseBackoff * 2 ** attempt);
          attempt++;
          continue;
        }
        const msg = err instanceof Error ? err.message : String(err);
        throw new GitHubNetworkError(scrub(`Network error on ${label}: ${msg}`));
      }

      if (res.ok) return res;

      const status = res.status;
      let detail = "";
      try {
        const j = (await res.clone().json()) as { message?: string };
        if (j?.message) detail = `: ${j.message}`;
      } catch {
        // non-JSON body
      }

      if (status === 429 || status === 403) {
        const wait = rateLimitWaitMs(res);
        if (wait !== null && (status === 429 || res.headers.get("retry-after") || res.headers.get("x-ratelimit-remaining") === "0" || /rate limit/i.test(detail))) {
          if (wait <= maxWaitMs && attempt < maxRetries) {
            await sleep(wait);
            attempt++;
            continue;
          }
          throw new GitHubRateLimitError(scrub(`GitHub rate limit hit on ${label}${detail}`), wait, status);
        }
      }
      if (status === 401) throw new GitHubAuthError(scrub(`GitHub authentication failed (401) on ${label}${detail}`), 401);
      if (status === 403) throw new GitHubAuthError(scrub(`GitHub access forbidden (403) on ${label}${detail}`), 403);
      if (status === 404) throw new GitHubNotFoundError(scrub(`GitHub resource not found (404) on ${label}`), 404);
      if (status >= 500 && attempt < maxRetries) {
        await sleep(baseBackoff * 2 ** attempt);
        attempt++;
        continue;
      }
      throw new GitHubApiError(scrub(`GitHub API error ${status} on ${label}${detail}`), status);
    }
  }

  async function json<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await request(method, path, body);
    return (await res.json()) as T;
  }

  async function paginate<T>(path: string, params: Record<string, string | undefined>): Promise<T[]> {
    const qs = new URLSearchParams({ per_page: String(perPage) });
    for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, v);
    let next: string | null = `${path}?${qs}`;
    const out: T[] = [];
    let guard = 0;
    while (next && guard++ < 1000) {
      const res = await request("GET", next);
      out.push(...((await res.json()) as T[]));
      next = parseNextLink(res.headers.get("link"));
    }
    return out;
  }

  return {
    repo,
    async listIssues(o = {}) {
      const items = await paginate<GitHubIssue>(`${repoPath}/issues`, {
        state: o.state ?? "all",
        since: o.since,
        labels: o.labels?.length ? o.labels.join(",") : undefined,
        sort: "updated",
        direction: "asc",
      });
      return items.filter((i) => !i.pull_request);
    },
    getIssue: (n) => json("GET", `${repoPath}/issues/${n}`),
    createIssue: (input) => json("POST", `${repoPath}/issues`, input),
    updateIssue: (n, patch) => json("PATCH", `${repoPath}/issues/${n}`, patch),
    listComments: (issue, o = {}) => paginate(`${repoPath}/issues/${issue}/comments`, { since: o.since }),
    createComment: (issue, body) => json("POST", `${repoPath}/issues/${issue}/comments`, { body }),
    updateComment: (id, body) => json("PATCH", `${repoPath}/issues/comments/${id}`, { body }),
    listLabels: () => paginate(`${repoPath}/labels`, {}),
    createLabel: (input) => json("POST", `${repoPath}/labels`, input),
  };
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface LabelSpec {
  name: string;
  /** Hex without '#' */
  color: string;
  description: string;
}

export const LABEL_CATALOG: readonly LabelSpec[] = [
  { name: "needs-triage", color: "ededed", description: "Maintainer needs to evaluate this issue" },
  { name: "needs-info", color: "fbca04", description: "Waiting on more information from the reporter" },
  { name: "ready-for-agent", color: "0e8a16", description: "Fully specified, ready for an AFK agent" },
  { name: "ready-for-human", color: "1d76db", description: "Needs human implementation" },
  { name: "wontfix", color: "ffffff", description: "Will not be worked on" },
  { name: "bug", color: "d73a4a", description: "Category: something is broken" },
  { name: "enhancement", color: "a2eeef", description: "Category: new feature or improvement" },
  { name: "spec", color: "5319e7", description: "Specification / design document" },
  { name: "wayfinder:map", color: "bfd4f2", description: "Wayfinder: map of the territory" },
  { name: "wayfinder:research", color: "c5def5", description: "Wayfinder: research step" },
  { name: "wayfinder:prototype", color: "d4c5f9", description: "Wayfinder: prototype step" },
  { name: "wayfinder:grilling", color: "f9d0c4", description: "Wayfinder: grilling / decision step" },
  { name: "wayfinder:task", color: "c2e0c6", description: "Wayfinder: implementation task" },
  { name: "priority:critical", color: "b60205", description: "Priority: critical" },
  { name: "priority:high", color: "d93f0b", description: "Priority: high" },
  { name: "priority:medium", color: "fbca04", description: "Priority: medium" },
  { name: "priority:low", color: "0e8a16", description: "Priority: low" },
  { name: "difficulty:trivial", color: "c2e0c6", description: "Difficulty: trivial" },
  { name: "difficulty:easy", color: "bfe5bf", description: "Difficulty: easy" },
  { name: "difficulty:medium", color: "fef2c0", description: "Difficulty: medium" },
  { name: "difficulty:hard", color: "f9c9a5", description: "Difficulty: hard" },
  { name: "difficulty:very_hard", color: "e99695", description: "Difficulty: very hard" },
];

/** On-demand label for a quest. */
export function labelsForQuest(id: string): LabelSpec {
  return { name: `quest:${id}`, color: "0052cc", description: `Quest: ${id}` };
}

export interface EnsureLabelsResult {
  created: string[];
  existing: string[];
  /** Labels that could not be created (forbidden); sync continues without them */
  skipped: string[];
}

/**
 * Create any missing labels. Name comparison is case-insensitive. When label
 * creation is forbidden, warns once (via opts.warn, default console.warn) and
 * continues. Other errors propagate. A 422 "already exists" race is tolerated.
 */
export async function ensureLabels(
  client: Pick<GitHubClient, "listLabels" | "createLabel">,
  specs: readonly LabelSpec[] = LABEL_CATALOG,
  opts: { warn?: (msg: string) => void } = {},
): Promise<EnsureLabelsResult> {
  const warn = opts.warn ?? ((m: string) => console.warn(m));
  const have = new Set((await client.listLabels()).map((l) => l.name.toLowerCase()));
  const result: EnsureLabelsResult = { created: [], existing: [], skipped: [] };
  let warned = false;
  for (const spec of specs) {
    const key = spec.name.toLowerCase();
    if (have.has(key)) {
      result.existing.push(spec.name);
      continue;
    }
    try {
      await client.createLabel({ name: spec.name, color: spec.color, description: spec.description });
      have.add(key);
      result.created.push(spec.name);
    } catch (err) {
      if (err instanceof GitHubAuthError && err.status === 403) {
        if (!warned) {
          warned = true;
          warn("GitHub sync: not permitted to create labels; continuing without creating missing labels");
        }
        result.skipped.push(spec.name);
      } else if (err instanceof GitHubApiError && err.status === 422) {
        have.add(key);
        result.existing.push(spec.name);
      } else {
        throw err;
      }
    }
  }
  return result;
}
