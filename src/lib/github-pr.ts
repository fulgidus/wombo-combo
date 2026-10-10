/**
 * github-pr.ts — Create or update GitHub pull requests through the GitHub CLI.
 *
 * Every external call goes through an injectable CommandRunner that takes an
 * argument array (never a shell string), enforces a timeout and never prompts.
 * Markdown bodies are passed on stdin (`--body-file -`), not interpolated.
 *
 * Responsibilities:
 *   - Resolve the GitHub repository from config.git.remote (no implicit remote)
 *   - Availability / authentication checks and remote default-branch lookup
 *   - Create-or-update for an explicit head/base pair, one PR per pair
 *   - Update only the automation-owned section of an existing PR body
 *
 * It never pushes branches, edits changelogs, installs `gh`, uses
 * `gh pr create --dry-run` (it can still push), or changes a PR's draft state.
 * In skip mode it executes no commands at all.
 */

import { spawn } from "node:child_process";
import type { PostMergePrMode } from "../config";
import { sanitizeInline } from "./merge-report";

// ---------------------------------------------------------------------------
// Command runner
// ---------------------------------------------------------------------------

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
  /** Set when the process could not be started (e.g. ENOENT) */
  spawnError?: string;
}

export interface CommandOptions {
  cwd?: string;
  /** Text written to stdin (stdin is closed/ignored otherwise) */
  input?: string;
  timeoutMs: number;
}

export type CommandRunner = (
  command: string,
  args: string[],
  options: CommandOptions
) => Promise<CommandResult>;

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
export const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;

/** Real runner: argument-array spawn, bounded time and output, never interactive. */
export const defaultCommandRunner: CommandRunner = (command, args, options) =>
  new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const finish = (r: CommandResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };

    let child;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        stdio: [options.input !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GH_PROMPT_DISABLED: "1",
          GH_NO_UPDATE_NOTIFIER: "1",
          GH_SPINNER_DISABLED: "1",
          GIT_TERMINAL_PROMPT: "0",
          NO_COLOR: "1",
        },
      });
    } catch (err: any) {
      finish({ exitCode: 127, stdout, stderr, spawnError: String(err?.message ?? err) });
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs);

    child.stdout?.on("data", (d) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += d.toString();
    });
    child.on("error", (err: any) => {
      finish({ exitCode: 127, stdout, stderr, spawnError: String(err?.message ?? err) });
    });
    child.on("close", (code) => {
      finish({ exitCode: code ?? (timedOut ? 124 : 1), stdout, stderr, timedOut });
    });
    if (options.input !== undefined && child.stdin) {
      child.stdin.on("error", () => {});
      child.stdin.end(options.input);
    }
  });

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type GithubPrFailureReason =
  | "gh-missing"
  | "unauthenticated"
  | "non-github-remote"
  | "no-remote"
  | "default-branch"
  | "api-error"
  | "timeout"
  | "invalid-input";

export interface GithubPrResult {
  status: "created" | "updated" | "skipped" | "failed";
  url?: string;
  number?: number;
  reason?: GithubPrFailureReason | "up-to-date" | "unowned-pr" | "skip-mode";
  /** Actionable, sanitized explanation */
  message?: string;
}

export interface GithubRepo {
  host: string;
  owner: string;
  name: string;
  /** OWNER/REPO */
  slug: string;
}

const GH_INSTALL_HINT =
  "Install the GitHub CLI (https://cli.github.com) and run `gh auth login`, or set postMerge.prMode to \"skip\".";
const GH_AUTH_HINT =
  "GitHub CLI is not authenticated. Run `gh auth login` (or set GH_TOKEN) and re-run, or set postMerge.prMode to \"skip\".";

function failure(
  reason: GithubPrFailureReason,
  message: string
): GithubPrResult {
  return { status: "failed", reason, message: sanitizeInline(message, 400) };
}

function commandError(what: string, res: CommandResult): GithubPrResult {
  if (res.timedOut) {
    return failure("timeout", `${what} timed out. Check your network connection and retry.`);
  }
  const detail = sanitizeInline(res.stderr || res.stdout || `exit code ${res.exitCode}`, 300);
  return failure("api-error", `${what} failed: ${detail}`);
}

// ---------------------------------------------------------------------------
// Availability, authentication, repository
// ---------------------------------------------------------------------------

export interface GhContext {
  runner?: CommandRunner;
  /** Repository directory (used to read the git remote URL) */
  cwd: string;
  timeoutMs?: number;
}

function run(ctx: GhContext, command: string, args: string[], input?: string) {
  return (ctx.runner ?? defaultCommandRunner)(command, args, {
    cwd: ctx.cwd,
    input,
    timeoutMs: ctx.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
  });
}

/** Check that the GitHub CLI is installed. */
export async function checkGhAvailable(ctx: GhContext): Promise<GithubPrResult | null> {
  const res = await run(ctx, "gh", ["--version"]);
  if (res.spawnError || res.exitCode === 127 || res.exitCode === 126) {
    return failure("gh-missing", `GitHub CLI (gh) was not found. ${GH_INSTALL_HINT}`);
  }
  if (res.exitCode !== 0) return commandError("`gh --version`", res);
  return null;
}

/** Check that gh is authenticated for the host (non-interactive, token not printed). */
export async function checkGhAuthenticated(
  ctx: GhContext,
  host: string
): Promise<GithubPrResult | null> {
  const res = await run(ctx, "gh", ["auth", "status", "--hostname", host]);
  if (res.timedOut) return commandError("`gh auth status`", res);
  if (res.exitCode !== 0) return failure("unauthenticated", GH_AUTH_HINT);
  return null;
}

/** Parse a GitHub remote URL (https, ssh://, scp-style). Only github.com is supported. */
export function parseGithubRemoteUrl(url: string): GithubRepo | null {
  const trimmed = url.trim();
  const patterns = [
    /^(?:https?|ssh|git):\/\/(?:[^@/]+@)?(github\.com)(?::\d+)?\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i,
    /^(?:[^@/\s]+@)?(github\.com):([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i,
  ];
  for (const re of patterns) {
    const m = re.exec(trimmed);
    if (m) {
      const host = m[1]!.toLowerCase();
      const owner = m[2]!;
      const name = m[3]!;
      return { host, owner, name, slug: `${owner}/${name}` };
    }
  }
  return null;
}

/** Resolve the GitHub repository from the named git remote (never another remote). */
export async function resolveGithubRepo(
  ctx: GhContext,
  remote: string
): Promise<{ repo: GithubRepo } | { error: GithubPrResult }> {
  if (!remote || remote.startsWith("-")) {
    return { error: failure("invalid-input", `Invalid git remote name ${JSON.stringify(remote)}.`) };
  }
  const res = await run(ctx, "git", ["remote", "get-url", remote]);
  if (res.exitCode !== 0 || !res.stdout.trim()) {
    return {
      error: failure(
        "no-remote",
        `Git remote "${remote}" is not configured. Add it (git remote add ${remote} <url>) or change git.remote in .wombo-combo/config.json.`
      ),
    };
  }
  const repo = parseGithubRemoteUrl(res.stdout.split("\n")[0]!);
  if (!repo) {
    return {
      error: failure(
        "non-github-remote",
        `Git remote "${remote}" does not point to github.com. Pull requests are only supported for GitHub repositories; set postMerge.prMode to "skip".`
      ),
    };
  }
  return { repo };
}

/** Run availability + authentication + remote resolution in order. */
async function prepare(
  ctx: GhContext,
  remote: string
): Promise<{ repo: GithubRepo } | { error: GithubPrResult }> {
  const missing = await checkGhAvailable(ctx);
  if (missing) return { error: missing };
  const resolved = await resolveGithubRepo(ctx, remote);
  if ("error" in resolved) return resolved;
  const unauth = await checkGhAuthenticated(ctx, resolved.repo.host);
  if (unauth) return { error: unauth };
  return resolved;
}

/** Look up the default branch of the remote repository. */
export async function resolveRemoteDefaultBranch(
  ctx: GhContext,
  remote: string
): Promise<{ branch: string; repo: GithubRepo } | { error: GithubPrResult }> {
  const prep = await prepare(ctx, remote);
  if ("error" in prep) return prep;
  const res = await run(ctx, "gh", [
    "repo",
    "view",
    prep.repo.slug,
    "--json",
    "defaultBranchRef",
  ]);
  if (res.exitCode !== 0) return { error: commandError("Resolving the default branch", res) };
  try {
    const name = JSON.parse(res.stdout)?.defaultBranchRef?.name;
    if (typeof name === "string" && name) return { branch: name, repo: prep.repo };
  } catch {
    // fall through
  }
  return {
    error: failure(
      "default-branch",
      `Could not determine the default branch of ${prep.repo.slug}. Set postMerge.prBaseBranch explicitly.`
    ),
  };
}

// ---------------------------------------------------------------------------
// Generated-section markers
// ---------------------------------------------------------------------------

export const PR_SECTION_START = "<!-- wombo-combo:pr-report:start -->";
export const PR_SECTION_END = "<!-- wombo-combo:pr-report:end -->";
/** GitHub rejects bodies over 65536 characters; stay safely below. */
export const MAX_PR_BODY_LENGTH = 60_000;

/** Wrap generated Markdown in ownership markers (truncating oversized reports). */
export function wrapGeneratedSection(markdown: string): string {
  let body = markdown.replace(/\s+$/, "");
  body = body.split(PR_SECTION_START).join("").split(PR_SECTION_END).join("");
  if (body.length > MAX_PR_BODY_LENGTH) {
    body = body.slice(0, MAX_PR_BODY_LENGTH).trimEnd() + "\n\n_Report truncated._";
  }
  return `${PR_SECTION_START}\n${body}\n${PR_SECTION_END}`;
}

/** True when the body carries a well-formed automation-owned section. */
export function hasGeneratedSection(body: string): boolean {
  const s = body.indexOf(PR_SECTION_START);
  const e = body.indexOf(PR_SECTION_END);
  return s !== -1 && e > s;
}

/**
 * Replace the automation-owned section in an existing body, keeping all text
 * around it. Returns null when the body has no well-formed section.
 */
export function replaceGeneratedSection(body: string, markdown: string): string | null {
  if (!hasGeneratedSection(body)) return null;
  const s = body.indexOf(PR_SECTION_START);
  const e = body.indexOf(PR_SECTION_END, s) + PR_SECTION_END.length;
  return body.slice(0, s) + wrapGeneratedSection(markdown) + body.slice(e);
}

// ---------------------------------------------------------------------------
// Create or update
// ---------------------------------------------------------------------------

export interface CreateOrUpdatePrOptions extends GhContext {
  /** Git remote name (config.git.remote) */
  remote: string;
  mode: PostMergePrMode;
  /** PR head: the branch that received the merges (must already be pushed) */
  head: string;
  /** PR target branch */
  base: string;
  title: string;
  /** Generated Markdown report (will be wrapped in ownership markers) */
  body: string;
}

interface ListedPr {
  number: number;
  url: string;
  body: string | null;
  isDraft?: boolean;
  headRefName?: string;
  baseRefName?: string;
  isCrossRepository?: boolean;
}

function parsePrUrl(text: string): { url: string; number: number } | null {
  const m = /https:\/\/[^\s]+\/pull\/(\d+)/.exec(text);
  return m ? { url: m[0], number: Number(m[1]) } : null;
}

function validRef(ref: string): boolean {
  return !!ref && !ref.startsWith("-") && !/[\u0000- ]/.test(ref);
}

/**
 * Create a pull request for head -> base, or refresh the generated section of
 * the existing open one. Never throws; every failure is a structured result.
 */
export async function createOrUpdatePullRequest(
  opts: CreateOrUpdatePrOptions
): Promise<GithubPrResult> {
  if (opts.mode === "skip") {
    return { status: "skipped", reason: "skip-mode", message: "PR publication is disabled (postMerge.prMode is skip)." };
  }
  if (!validRef(opts.head) || !validRef(opts.base)) {
    return failure("invalid-input", "PR head and base must be valid branch names.");
  }
  if (opts.head === opts.base) {
    return failure("invalid-input", "PR head and base must differ.");
  }

  const prep = await prepare(opts, opts.remote);
  if ("error" in prep) return prep.error;
  const { repo } = prep;

  // 1. Look for an existing open PR for this exact head/base pair
  const listRes = await run(opts, "gh", [
    "pr",
    "list",
    "--repo",
    repo.slug,
    "--state",
    "open",
    "--head",
    opts.head,
    "--base",
    opts.base,
    "--limit",
    "100",
    "--json",
    "number,url,body,isDraft,headRefName,baseRefName,isCrossRepository",
  ]);
  if (listRes.exitCode !== 0) return commandError("Listing pull requests", listRes);

  let existing: ListedPr | undefined;
  try {
    const parsed = JSON.parse(listRes.stdout || "[]") as ListedPr[];
    existing = parsed.find(
      (p) =>
        p.headRefName === opts.head &&
        p.baseRefName === opts.base &&
        !p.isCrossRepository
    );
  } catch {
    return failure("api-error", "Could not parse the pull request list returned by gh.");
  }

  if (existing) {
    const next = replaceGeneratedSection(existing.body ?? "", opts.body);
    if (next === null) {
      return {
        status: "skipped",
        reason: "unowned-pr",
        url: existing.url,
        number: existing.number,
        message: `Open PR #${existing.number} for ${opts.head} -> ${opts.base} is not automation-owned; its description was left unchanged.`,
      };
    }
    if (next === (existing.body ?? "")) {
      return {
        status: "skipped",
        reason: "up-to-date",
        url: existing.url,
        number: existing.number,
        message: `PR #${existing.number} is already up to date.`,
      };
    }
    // Only the body is edited: title and draft state are never touched.
    const editRes = await run(
      opts,
      "gh",
      ["pr", "edit", String(existing.number), "--repo", repo.slug, "--body-file", "-"],
      next
    );
    if (editRes.exitCode !== 0) return commandError(`Updating PR #${existing.number}`, editRes);
    return { status: "updated", url: existing.url, number: existing.number };
  }

  // 2. Create a new PR (--draft only in draft mode)
  const args = [
    "pr",
    "create",
    "--repo",
    repo.slug,
    "--head",
    opts.head,
    "--base",
    opts.base,
    "--title",
    sanitizeInline(opts.title, 250) || `Merge ${opts.head}`,
    "--body-file",
    "-",
  ];
  if (opts.mode === "draft") args.push("--draft");
  const createRes = await run(opts, "gh", args, wrapGeneratedSection(opts.body));
  if (createRes.exitCode !== 0) return commandError("Creating the pull request", createRes);
  const parsed = parsePrUrl(createRes.stdout);
  if (!parsed) {
    return failure("api-error", "gh did not report a pull request URL after creating the PR.");
  }
  return { status: "created", url: parsed.url, number: parsed.number };
}
