/**
 * config.ts — Load .wombo-combo/config.json, merge with defaults, validate, expose typed config.
 *
 * The config file lives at .wombo-combo/config.json inside the target project root.
 * All values have sensible defaults so minimal config works out of the box.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { HARNESS_IDS, OPERATIONS, isHarnessId, type HarnessId, type Operation } from "./lib/harness/ids";
import type { CustomCommandSpec, HarnessCapabilities } from "./lib/harness/types";
import type { Difficulty } from "./lib/tasks";
import type { TaskWeight } from "./lib/task-weight";

// ---------------------------------------------------------------------------
// .wombo-combo directory constant
// ---------------------------------------------------------------------------

/** Name of the directory that holds all wombo-combo files */
export const WOMBO_DIR = ".wombo-combo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Agent registry download mode */
export type AgentRegistryMode = "auto" | "monitored" | "disabled";

export interface WomboConfig {
  /** Directory name for task files relative to .wombo-combo/ (folder-based storage) */
  tasksDir: string;
  /** Directory name for archived task files relative to .wombo-combo/ */
  archiveDir: string;
  /** @deprecated Use tasksDir. Legacy single-file path relative to .wombo-combo/ */
  tasksFile?: string;
  /** @deprecated Use archiveDir. Legacy single-file path relative to .wombo-combo/ */
  archiveFile?: string;
  /** Base branch to create feature branches from */
  baseBranch: string;
  /** Build configuration */
  build: {
    /** Build command to run in worktrees */
    command: string;
    /** Build timeout in milliseconds */
    timeout: number;
    /** Build artifact directory (for quick "did it build?" checks) */
    artifactDir: string;
  };
  /** Install configuration */
  install: {
    /** Install command to run in worktrees */
    command: string;
    /** Install timeout in milliseconds */
    timeout: number;
  };
  /** Git configuration */
  git: {
    /** Branch name prefix for feature branches */
    branchPrefix: string;
    /** Git remote name */
    remote: string;
    /** Merge strategy flag */
    mergeStrategy: string;
  };
  /** Agent configuration */
  agent: {
    /** Path to agent binary (null = auto-detect) */
    bin: string | null;
    /** Agent name to pass via --agent flag */
    name: string;
    /** Config files/dirs to copy into worktrees */
    configFiles: string[];
  };
  /** Portless integration for localhost server testing */
  portless: {
    /** Whether portless is enabled for agent worktrees */
    enabled: boolean;
    /** Path to portless binary (null = auto-detect via PATH) */
    bin: string | null;
    /** Proxy port (portless default is 1355) */
    proxyPort: number;
    /** Whether to use HTTPS mode */
    https: boolean;
  };
  /** Backup configuration for tasks file */
  backup: {
    /** Maximum number of timestamped backups to keep */
    maxBackups: number;
  };
  /** Default runtime values */
  defaults: {
    /** Max concurrent agents */
    maxConcurrent: number;
    /** Max retries per agent */
    maxRetries: number;
    /**
     * Kill and restart (through the restart policy) an agent process that shows
     * no activity for this many ms. Optional; absent or 0 disables the watchdog.
     */
    agentIdleTimeoutMs?: number;
  };
  /** Browser testing configuration */
  browser: BrowserConfig;
  /** Agent registry configuration for specialized agent downloads */
  agentRegistry: AgentRegistryConfig;
  /** Test-Driven Development configuration */
  tdd: TddConfig;
  /** Merge conflict resolution configuration */
  merge: MergeEscalationConfig;
  /** Developer mode: enables hidden features like fake task seeding in TUI */
  devMode: boolean;
  /** TUI appearance configuration */
  tui: TuiConfig;
  /**
   * Post-merge publication (changelog + GitHub PR). Optional so older config
   * files and manually constructed configs keep working; read it through
   * normalizePostMergeConfig().
   */
  postMerge?: PostMergeConfig;
  /**
   * Session replay retention. Optional so older config files and manually
   * constructed configs keep working; read it through normalizeReplayConfig().
   */
  replay?: ReplayConfig;
  /**
   * Multi-developer coordination (git-tracked task claims). Optional so older
   * config files keep working; read it through normalizeTeamConfig().
   */
  team?: TeamConfig;
  /**
   * Task/quest comments in agent prompts and daemon lifecycle comments.
   * Optional so older config files keep working; read it through
   * normalizeCommentsConfig().
   */
  comments?: CommentsConfig;
  /**
   * Optional reviewer-agent stage between verification and merge (off by
   * default). Optional so older config files keep working; read it through
   * normalizeReviewConfig().
   */
  review?: ReviewConfig;
  /**
   * Integrations that sync woco data with external services (GitHub issues).
   * Optional so older config files keep working; read it through
   * normalizeSyncGithubConfig().
   */
  sync?: SyncConfig;
  /** Per-task model routing: task weight → model (undefined entry = session model) */
  modelRouting?: {
    light?: string | null;
    medium?: string | null;
    heavy?: string | null;
  };
  /**
   * Named agent profiles (harness + binary + model + provider + account env
   * references). Optional: without it every operation runs through the legacy
   * agent.bin / modelRouting path (opencode unless agent.bin is another CLI).
   */
  agentProfiles?: Record<string, AgentProfile>;
  /** Which profile handles which task weight / difficulty / operation, plus fallback chains */
  routing?: RoutingConfig;
}

/**
 * A named way to run an agent. Never contains secrets: credentials are
 * referenced by environment variable NAME through `envFrom`.
 */
export interface AgentProfile {
  /** Which CLI adapter to use */
  harness: HarnessId;
  /** Executable path/name; null/undefined = the harness default (or legacy agent.bin for opencode) */
  bin?: string | null;
  /** Model passed to the CLI; null = CLI default */
  model?: string | null;
  /** Provider passed to the CLI where it has such a setting */
  provider?: string | null;
  /** Extra CLI arguments placed before the prompt */
  args?: string[];
  /** Literal, NON-secret environment variables for the child process */
  env?: Record<string, string>;
  /** Child env var name -> NAME of a variable in wombo's own environment (account/API key routing) */
  envFrom?: Record<string, string>;
  /** Free-form account label shown in the UI */
  account?: string;
  /** Override the adapter's capability flags (for example for custom commands) */
  capabilities?: Partial<HarnessCapabilities>;
  /** Command template (required for harness "custom") */
  command?: CustomCommandSpec;
}

/** Routing from task attributes and operations to profile names */
export interface RoutingConfig {
  /** Profile used when nothing more specific matches */
  default?: string;
  byWeight?: Partial<Record<TaskWeight, string>>;
  byDifficulty?: Partial<Record<Difficulty, string>>;
  byOperation?: Partial<Record<Operation, string>>;
  /** profile name -> ordered list of profiles to try when it cannot start */
  fallbacks?: Record<string, string[]>;
}

/** How a post-merge pull request is published */
export type PostMergePrMode = "open" | "draft" | "skip";

export const POST_MERGE_PR_MODES: readonly PostMergePrMode[] = ["open", "draft", "skip"];

/** Configuration for changelog generation and PR publication after merges */
export interface PostMergeConfig {
  /** open = ready PR, draft = draft PR, skip = no GitHub publication (default) */
  prMode: PostMergePrMode;
  /** PR target branch; null = the configured remote's default branch */
  prBaseBranch: string | null;
  /** Append a CHANGELOG.md entry after successful merges (independent of prMode) */
  changelog: boolean;
}

/** Multi-developer coordination via git-tracked claim files (.wombo-combo/claims/) */
export interface TeamConfig {
  /** Enable task claims; disabled keeps single-developer behaviour unchanged */
  enabled: boolean;
  /** Claim owner override; null = git config user.email */
  owner: string | null;
  /** Hours until a claim expires */
  claimTtlHours: number;
}

/** Comments on tasks and quests (.wombo-combo/comments/) in agent prompts */
export interface CommentsConfig {
  /** Include recent comments in agent prompts and tell agents how to comment */
  enabled: boolean;
  /** Maximum number of recent comments per task/quest in the prompt */
  promptMaxItems: number;
  /** Maximum total characters of comment text in the prompt */
  promptMaxChars: number;
  /** Daemon posts system comments on lifecycle events (started, failed, merged, retried) */
  autoLifecycle: boolean;
}

export const REVIEW_BLOCK_ON = ["blocking", "major"] as const;
export type ReviewBlockOn = (typeof REVIEW_BLOCK_ON)[number];
/** Allowed range of `review.maxRounds` */
export const REVIEW_MIN_ROUNDS = 1;
export const REVIEW_MAX_ROUNDS = 5;

/** Review gate: a reviewer agent checks the task diff before merge */
export interface ReviewConfig {
  /** Master switch; the review stage is skipped when false */
  enabled: boolean;
  /** Lowest finding severity that sends the implementing agent back */
  blockOn: ReviewBlockOn;
  /** Maximum review rounds per task (1-5) */
  maxRounds: number;
  /** Diff characters shown to the reviewer; the rest is cut with a marker */
  maxDiffChars: number;
}

export const SYNC_GITHUB_MODES = ["manual", "auto"] as const;
export type SyncGithubMode = (typeof SYNC_GITHUB_MODES)[number];
/** Smallest allowed `sync.github.intervalSeconds` */
export const SYNC_MIN_INTERVAL_SECONDS = 15;

/** A GitHub repository reference: "owner/name" (or "host/owner/name") or an object. */
export type SyncRepoRef = string | { owner: string; name: string; host?: string };

/** GitHub issue sync (`woco sync`) */
export interface SyncGithubConfig {
  /** Master switch for the automatic behaviour (manual `woco sync` commands always work) */
  enabled: boolean;
  /** manual: only explicit `woco sync ...`; auto: write-through push, daemon/watch cycles */
  mode: SyncGithubMode;
  /** Repository to sync with; unset = the git `origin` remote */
  repo?: SyncRepoRef;
  /** Seconds between automatic pull+push cycles (daemon and `sync watch`), minimum 15 */
  intervalSeconds: number;
  /** In auto mode, push an item right after it is changed locally */
  pushOnWrite: boolean;
  /** In auto mode, cycles also pull remote changes */
  pull: boolean;
  /**
   * Mirror finished work (done/cancelled tasks, completed/abandoned quests, closed issues)
   * that has no mapping yet. Default false: already-mapped items keep syncing.
   */
  includeFinished: boolean;
}

export interface SyncConfig {
  github?: Partial<SyncGithubConfig>;
}

/** Retention of recorded agent session replays (.wombo-combo/replays/) */
export interface ReplayConfig {
  /** Executions kept per task (0 = keep none once finished) */
  keepPerTask: number;
  /** Delete replays older than this many days; null = no age limit */
  maxAgeDays: number | null;
  /** Total size cap of all replays in MB (oldest removed first); null = no cap */
  maxTotalMB: number | null;
}

/** Configuration for browser-based verification and testing */
export interface BrowserConfig {
  /** Enable browser testing in the verify pipeline */
  enabled: boolean;
  /** Path to browser binary (null = auto-detect) */
  bin: string | null;
  /** Run browser in headless mode (required for CI) */
  headless: boolean;
  /** Custom test command to run browser tests (overrides script discovery) */
  testCommand: string | null;
  /** Timeout for launching a browser instance (ms) */
  launchTimeout: number;
  /** Timeout for each browser test script (ms) */
  testTimeout: number;
  /** Default viewport size */
  defaultViewport: {
    width: number;
    height: number;
  };
}

/** Configuration for the external agent registry (e.g. agency-agents) */
export interface AgentRegistryConfig {
  /**
   * Download mode:
   * - "auto"      — download agents without asking (default)
   * - "monitored" — user reviews/edits/rejects each agent before launch
   * - "disabled"  — always use the generalist agent
   */
  mode: AgentRegistryMode;
  /** GitHub repo in "owner/repo" format to pull agent definitions from */
  source: string;
  /** Cache directory name (relative to .wombo-combo/) */
  cacheDir: string;
  /** Cache TTL in milliseconds. Cached agents older than this are re-fetched. Default 24h. */
  cacheTTL: number;
}

/** Configuration for Test-Driven Development workflow */
export interface TddConfig {
  /** Enable TDD red-green-refactor instructions in agent prompts */
  enabled: boolean;
  /** Test command to run (default: "bun test") */
  testCommand: string;
  /** Strict TDD mode: fail verification if new files are missing tests */
  strictTdd: boolean;
  /** Test command timeout in milliseconds (default: 120_000) */
  testTimeout: number;
}

/** TUI (terminal user interface) configuration */
export interface TuiConfig {
  /**
   * Active color/icon theme preset.
   * @see src/ink/theme.ts for available presets.
   */
  theme: "default" | "high-contrast" | "minimal";
  /**
   * Locale for CLI and TUI text: a shipped locale code (e.g. 'en', 'it') or
   * 'auto' (default) to detect from WOMBO_LOCALE / LC_ALL / LC_MESSAGES / LANG,
   * falling back to 'en'. An explicit value here wins over the environment.
   * @see src/lib/i18n.ts
   */
  locale: string;
  /**
   * When true, the splash screen checks npm for a newer version of
   * wombo-combo on startup and notifies the user if one is available.
   * Default: true
   */
  checkForUpdates: boolean;
  /**
   * When true, any available update found during the splash preflight
   * check is installed automatically (bun add -g wombo-combo@<version>)
   * without requiring a keypress.
   * Default: false
   */
  autoInstallUpdates: boolean;
}

/** Maximum tier the merge conflict pipeline will escalate to */
export type MaxEscalationTier = "tier3" | "tier3.5" | "tier4";

/** Configuration for the merge conflict resolution escalation pipeline */
export interface MergeEscalationConfig {
  /**
   * Maximum escalation tier for conflict resolution.
   *
   * Controls how aggressively the system tries to resolve merge conflicts:
   *   - "tier3":   Stop at enriched single-shot LLM resolution (1 LLM call)
   *   - "tier3.5": Also try rebase strategy with per-commit resolution (1+ LLM calls)
   *   - "tier4":   Also try nuclear re-run — re-implement feature from scratch (1 expensive LLM call)
   *
   * Tiers 1, 2, and 2.5 (programmatic resolution) always run regardless of this setting.
   * Default: "tier4"
   */
  maxEscalation: MaxEscalationTier;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: WomboConfig = {
  tasksDir: "tasks",
  archiveDir: "archive",
  baseBranch: "develop",
  build: {
    command: "bun run build",
    timeout: 300_000,
    artifactDir: "dist",
  },
  install: {
    command: "bun install",
    timeout: 120_000,
  },
  git: {
    branchPrefix: "feature/",
    remote: "origin",
    mergeStrategy: "--no-ff",
  },
  agent: {
    bin: null,
    name: "generalist-agent",
    configFiles: [".opencode/", "opencode.json", "AGENTS.md"],
  },
  portless: {
    enabled: true,
    bin: null,
    proxyPort: 1355,
    https: false,
  },
  backup: {
    maxBackups: 5,
  },
  defaults: {
    maxConcurrent: 6,
    maxRetries: 2,
  },
  browser: {
    enabled: false,
    bin: null,
    headless: true,
    testCommand: null,
    launchTimeout: 30_000,
    testTimeout: 60_000,
    defaultViewport: {
      width: 1280,
      height: 720,
    },
  },
  agentRegistry: {
    mode: "auto",
    source: "msitarzewski/agency-agents",
    cacheDir: "agents-cache",
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  },
  tdd: {
    enabled: false,
    testCommand: "bun test",
    strictTdd: false,
    testTimeout: 120_000,
  },
  merge: {
    maxEscalation: "tier4",
  },
  postMerge: {
    prMode: "skip",
    prBaseBranch: null,
    changelog: true,
  },
  replay: {
    keepPerTask: 20,
    maxAgeDays: null,
    maxTotalMB: null,
  },
  team: {
    enabled: false,
    owner: null,
    claimTtlHours: 24,
  },
  comments: {
    enabled: true,
    promptMaxItems: 10,
    promptMaxChars: 4000,
    autoLifecycle: false,
  },
  review: {
    enabled: false,
    blockOn: "blocking",
    maxRounds: 2,
    maxDiffChars: 60000,
  },
  sync: {
    github: {
      enabled: false,
      mode: "manual",
      intervalSeconds: 60,
      pushOnWrite: true,
      pull: true,
      includeFinished: false,
    },
  },
  devMode: false,
  tui: {
    theme: "default",
    locale: "auto",
    checkForUpdates: true,
    autoInstallUpdates: false,
  },
};

// ---------------------------------------------------------------------------
// Config File Name
// ---------------------------------------------------------------------------

export const CONFIG_FILE = `${WOMBO_DIR}/config.json`;

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Deep-merge source into target. Only merges plain objects, not arrays.
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal !== undefined &&
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal) &&
      tgtVal !== null
    ) {
      result[key] = deepMerge(tgtVal as any, srcVal as any);
    } else if (srcVal !== undefined) {
      result[key] = srcVal as T[keyof T];
    }
  }
  return result;
}

/**
 * Load .wombo-combo/config.json from the given project root and merge with defaults.
 * Returns the full config. If no config file exists, returns defaults.
 */
export function loadConfig(projectRoot: string): WomboConfig {
  const configPath = resolve(projectRoot, CONFIG_FILE);

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const partial = JSON.parse(raw) as Partial<WomboConfig>;

    // Migrate legacy single-file config keys to folder-based
    if ((partial as any).tasksFile && !partial.tasksDir) {
      // Legacy "tasks.yml" → strip extension for dir name, or use as-is
      const legacy = (partial as any).tasksFile as string;
      partial.tasksDir = legacy.replace(/\.ya?ml$/i, "") || "tasks";
      delete (partial as any).tasksFile;
    }
    if ((partial as any).archiveFile && !partial.archiveDir) {
      const legacy = (partial as any).archiveFile as string;
      partial.archiveDir = legacy.replace(/\.ya?ml$/i, "") || "archive";
      delete (partial as any).archiveFile;
    }

    return deepMerge(DEFAULT_CONFIG, partial);
  } catch (err: any) {
    throw new Error(`Failed to load ${CONFIG_FILE}: ${err.message}`);
  }
}

/**
 * Fill in post-merge defaults for legacy or manually constructed configs.
 * Never throws; validateConfig() is responsible for rejecting bad values.
 */
export function normalizePostMergeConfig(
  block?: Partial<PostMergeConfig> | null
): PostMergeConfig {
  const d = DEFAULT_CONFIG.postMerge!;
  const src = block && typeof block === "object" ? block : {};
  const base =
    typeof src.prBaseBranch === "string" ? src.prBaseBranch.trim() : src.prBaseBranch;
  return {
    prMode: src.prMode ?? d.prMode,
    prBaseBranch: base === undefined ? d.prBaseBranch : (base as string | null),
    changelog: src.changelog ?? d.changelog,
  };
}

/** Fill in team defaults for legacy or manually constructed configs. */
export function normalizeTeamConfig(block?: Partial<TeamConfig> | null): TeamConfig {
  const d = DEFAULT_CONFIG.team!;
  const src = block && typeof block === "object" ? block : {};
  return {
    enabled: src.enabled ?? d.enabled,
    owner: src.owner === undefined ? d.owner : src.owner,
    claimTtlHours: src.claimTtlHours ?? d.claimTtlHours,
  };
}

/** Fill in comments defaults for legacy or manually constructed configs. */
export function normalizeCommentsConfig(block?: Partial<CommentsConfig> | null): CommentsConfig {
  const d = DEFAULT_CONFIG.comments!;
  const src = block && typeof block === "object" ? block : {};
  return {
    enabled: src.enabled ?? d.enabled,
    promptMaxItems: src.promptMaxItems ?? d.promptMaxItems,
    promptMaxChars: src.promptMaxChars ?? d.promptMaxChars,
    autoLifecycle: src.autoLifecycle ?? d.autoLifecycle,
  };
}

/** Fill in review defaults for legacy or manually constructed configs. Never throws. */
export function normalizeReviewConfig(block?: Partial<ReviewConfig> | null): ReviewConfig {
  const d = DEFAULT_CONFIG.review!;
  const src = block && typeof block === "object" ? block : {};
  const rounds =
    typeof src.maxRounds === "number" && Number.isFinite(src.maxRounds)
      ? Math.min(REVIEW_MAX_ROUNDS, Math.max(REVIEW_MIN_ROUNDS, Math.floor(src.maxRounds)))
      : d.maxRounds;
  const chars =
    typeof src.maxDiffChars === "number" && Number.isInteger(src.maxDiffChars) && src.maxDiffChars >= 1
      ? src.maxDiffChars
      : d.maxDiffChars;
  return {
    enabled: typeof src.enabled === "boolean" ? src.enabled : d.enabled,
    blockOn: REVIEW_BLOCK_ON.includes(src.blockOn as ReviewBlockOn) ? (src.blockOn as ReviewBlockOn) : d.blockOn,
    maxRounds: rounds,
    maxDiffChars: chars,
  };
}

/** Fill in sync.github defaults for legacy or manually constructed configs. Never throws. */
export function normalizeSyncGithubConfig(block?: Partial<SyncConfig> | null): SyncGithubConfig {
  const d = DEFAULT_CONFIG.sync!.github as SyncGithubConfig;
  const g = (block && typeof block === "object" ? block.github : undefined) ?? {};
  const src = g && typeof g === "object" ? g : {};
  const mode = SYNC_GITHUB_MODES.includes(src.mode as SyncGithubMode) ? (src.mode as SyncGithubMode) : d.mode;
  const iv = typeof src.intervalSeconds === "number" && Number.isFinite(src.intervalSeconds) ? src.intervalSeconds : d.intervalSeconds;
  const out: SyncGithubConfig = {
    enabled: typeof src.enabled === "boolean" ? src.enabled : d.enabled,
    mode,
    intervalSeconds: Math.max(SYNC_MIN_INTERVAL_SECONDS, iv),
    pushOnWrite: typeof src.pushOnWrite === "boolean" ? src.pushOnWrite : d.pushOnWrite,
    pull: typeof src.pull === "boolean" ? src.pull : d.pull,
    includeFinished: typeof src.includeFinished === "boolean" ? src.includeFinished : d.includeFinished,
  };
  const repo = src.repo;
  if (typeof repo === "string" && repo.trim()) out.repo = repo.trim();
  else if (repo && typeof repo === "object" && typeof repo.owner === "string" && typeof repo.name === "string") {
    out.repo = { owner: repo.owner, name: repo.name, ...(typeof repo.host === "string" ? { host: repo.host } : {}) };
  }
  return out;
}

/** True when automatic GitHub sync is switched on (enabled and mode auto). */
export function isSyncAuto(cfg: SyncGithubConfig): boolean {
  return cfg.enabled && cfg.mode === "auto";
}

/** Fill in replay retention defaults for legacy or manually constructed configs. */
export function normalizeReplayConfig(block?: Partial<ReplayConfig> | null): ReplayConfig {
  const d = DEFAULT_CONFIG.replay!;
  const src = block && typeof block === "object" ? block : {};
  return {
    keepPerTask: src.keepPerTask ?? d.keepPerTask,
    maxAgeDays: src.maxAgeDays === undefined ? d.maxAgeDays : src.maxAgeDays,
    maxTotalMB: src.maxTotalMB === undefined ? d.maxTotalMB : src.maxTotalMB,
  };
}

/** Convert replay config into ReplayStore.prune() options. */
export function replayRetentionOptions(block?: Partial<ReplayConfig> | null): {
  keepPerFeature: number;
  maxAgeMs?: number;
  maxTotalBytes?: number;
} {
  const r = normalizeReplayConfig(block);
  return {
    keepPerFeature: r.keepPerTask,
    ...(r.maxAgeDays != null ? { maxAgeMs: r.maxAgeDays * 86_400_000 } : {}),
    ...(r.maxTotalMB != null ? { maxTotalBytes: r.maxTotalMB * 1024 * 1024 } : {}),
  };
}

/**
 * Resolve the agent binary path. Priority:
 *   1. config.agent.bin (explicit)
 *   2. OPENCODE_BIN env var
 *   3. ~/.opencode/bin/opencode (default install location, if it exists)
 *   4. `opencode` found on PATH (absolute path via Bun.which)
 *   5. ~/.opencode/bin/opencode even if missing (callers report it as not found)
 */
export function resolveAgentBin(config: WomboConfig): string {
  if (config.agent.bin) return config.agent.bin;
  if (process.env.OPENCODE_BIN) return process.env.OPENCODE_BIN;
  const installed = resolve(process.env.HOME || "~", ".opencode/bin/opencode");
  if (existsSync(installed)) return installed;
  return Bun.which("opencode", { PATH: process.env.PATH }) ?? installed;
}

const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SECRET_KEY_RE = /key|token|secret|passw|credential/i;
const SECRET_VALUE_RE = /^(sk-|ghp_|gho_|github_pat_|xox[abp]-|AKIA[0-9A-Z]{8})/;
const WEIGHTS: readonly string[] = ["light", "medium", "heavy"];
const DIFFICULTIES: readonly string[] = ["trivial", "easy", "medium", "hard", "very_hard"];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Validate agentProfiles and routing. Throws with a config-path-prefixed message. */
function validateAgentRouting(config: WomboConfig): void {
  const profiles = config.agentProfiles;
  if (profiles !== undefined) {
    if (!isPlainObject(profiles)) throw new Error("config.agentProfiles must be an object");
    for (const [name, p] of Object.entries(profiles)) {
      const at = `config.agentProfiles.${name}`;
      if (!name.trim()) throw new Error("config.agentProfiles names must be non-empty");
      if (!isPlainObject(p)) throw new Error(`${at} must be an object`);
      if (!isHarnessId(p.harness)) {
        throw new Error(`${at}.harness must be one of: ${HARNESS_IDS.join(", ")}`);
      }
      for (const field of ["bin", "model", "provider"] as const) {
        const v = p[field];
        if (v !== undefined && v !== null && (typeof v !== "string" || v.trim() === "")) {
          throw new Error(`${at}.${field} must be null or a non-empty string`);
        }
      }
      if (p.account !== undefined && typeof p.account !== "string") {
        throw new Error(`${at}.account must be a string`);
      }
      if (p.args !== undefined && (!Array.isArray(p.args) || p.args.some((a) => typeof a !== "string"))) {
        throw new Error(`${at}.args must be an array of strings`);
      }
      if (p.env !== undefined) {
        if (!isPlainObject(p.env)) throw new Error(`${at}.env must be an object of strings`);
        for (const [k, v] of Object.entries(p.env)) {
          if (typeof v !== "string") throw new Error(`${at}.env.${k} must be a string`);
          if (!ENV_NAME_RE.test(k)) throw new Error(`${at}.env key "${k}" is not a valid environment variable name`);
          if (SECRET_KEY_RE.test(k) || SECRET_VALUE_RE.test(v)) {
            throw new Error(
              `${at}.env.${k} looks like a secret; never put secrets in config. Use envFrom to reference an environment variable by name`
            );
          }
        }
      }
      if (p.envFrom !== undefined) {
        if (!isPlainObject(p.envFrom)) throw new Error(`${at}.envFrom must be an object of environment variable names`);
        for (const [k, v] of Object.entries(p.envFrom)) {
          if (!ENV_NAME_RE.test(k)) throw new Error(`${at}.envFrom key "${k}" is not a valid environment variable name`);
          if (typeof v !== "string" || !ENV_NAME_RE.test(v)) {
            throw new Error(
              `${at}.envFrom.${k} must be the NAME of an environment variable (not a secret value)`
            );
          }
        }
      }
      if (p.capabilities !== undefined) {
        if (!isPlainObject(p.capabilities)) throw new Error(`${at}.capabilities must be an object`);
        for (const [k, v] of Object.entries(p.capabilities)) {
          if (typeof v !== "boolean") throw new Error(`${at}.capabilities.${k} must be a boolean`);
        }
      }
      if (p.harness === "custom") {
        const c = p.command;
        if (!isPlainObject(c) || !Array.isArray(c.args) || c.args.some((a) => typeof a !== "string")) {
          throw new Error(`${at}.command.args (array of strings) is required for harness "custom"`);
        }
        if (!p.bin) throw new Error(`${at}.bin is required for harness "custom"`);
        if (c.output !== undefined && c.output !== "text" && c.output !== "opencode-jsonl") {
          throw new Error(`${at}.command.output must be "text" or "opencode-jsonl"`);
        }
      }
    }
  }

  const routing = config.routing;
  if (routing === undefined) return;
  if (!isPlainObject(routing)) throw new Error("config.routing must be an object");
  const known = (n: unknown): boolean => typeof n === "string" && !!profiles && Object.hasOwn(profiles, n);
  const ref = (at: string, n: unknown): void => {
    if (!known(n)) throw new Error(`${at} references unknown profile "${String(n)}"`);
  };
  if (routing.default !== undefined) ref("config.routing.default", routing.default);
  const tables: [string, unknown, readonly string[]][] = [
    ["byWeight", routing.byWeight, WEIGHTS],
    ["byDifficulty", routing.byDifficulty, DIFFICULTIES],
    ["byOperation", routing.byOperation, OPERATIONS],
  ];
  for (const [label, table, keys] of tables) {
    if (table === undefined) continue;
    if (!isPlainObject(table)) throw new Error(`config.routing.${label} must be an object`);
    for (const [k, v] of Object.entries(table)) {
      if (!keys.includes(k)) {
        throw new Error(`config.routing.${label} has unknown key "${k}" (expected one of: ${keys.join(", ")})`);
      }
      if (v !== undefined) ref(`config.routing.${label}.${k}`, v);
    }
  }
  if (routing.fallbacks !== undefined) {
    if (!isPlainObject(routing.fallbacks)) throw new Error("config.routing.fallbacks must be an object");
    for (const [name, list] of Object.entries(routing.fallbacks)) {
      ref(`config.routing.fallbacks key`, name);
      if (!Array.isArray(list)) throw new Error(`config.routing.fallbacks.${name} must be an array of profile names`);
      for (const n of list) ref(`config.routing.fallbacks.${name}`, n);
    }
    // Cycle detection over the fallback graph
    const graph = routing.fallbacks as Record<string, string[]>;
    const state = new Map<string, 1 | 2>();
    const visit = (n: string, path: string[]): void => {
      if (state.get(n) === 2) return;
      if (state.get(n) === 1) {
        throw new Error(`config.routing.fallbacks contains a cycle: ${[...path, n].join(" -> ")}`);
      }
      state.set(n, 1);
      for (const next of graph[n] ?? []) visit(next, [...path, n]);
      state.set(n, 2);
    };
    for (const n of Object.keys(graph)) visit(n, []);
  }
}

/**
 * Validate the config for obvious issues. Throws on error.
 */
export function validateConfig(config: WomboConfig): void {
  if (!config.tasksDir) {
    throw new Error("config.tasksDir must be a non-empty string");
  }
  if (!config.archiveDir) {
    throw new Error("config.archiveDir must be a non-empty string");
  }
  if (!config.baseBranch) {
    throw new Error("config.baseBranch must be a non-empty string");
  }
  if (!config.build.command) {
    throw new Error("config.build.command must be a non-empty string");
  }
  if (!config.install.command) {
    throw new Error("config.install.command must be a non-empty string");
  }
  if (!config.git.branchPrefix) {
    throw new Error("config.git.branchPrefix must be a non-empty string");
  }
  if (config.defaults.maxConcurrent < 0) {
    throw new Error("config.defaults.maxConcurrent must be >= 0 (0 = unlimited)");
  }
  if (config.defaults.maxRetries < 0) {
    throw new Error("config.defaults.maxRetries must be >= 0");
  }
  const idleTimeout = config.defaults.agentIdleTimeoutMs;
  if (idleTimeout !== undefined && (!Number.isFinite(idleTimeout) || idleTimeout < 0)) {
    throw new Error("config.defaults.agentIdleTimeoutMs must be >= 0 (0 = disabled)");
  }
  if (config.backup.maxBackups < 0) {
    throw new Error("config.backup.maxBackups must be >= 0");
  }
  const validModes: AgentRegistryMode[] = ["auto", "monitored", "disabled"];
  if (!validModes.includes(config.agentRegistry.mode)) {
    throw new Error(`config.agentRegistry.mode must be one of: ${validModes.join(", ")}`);
  }
  if (!config.agentRegistry.source) {
    throw new Error("config.agentRegistry.source must be a non-empty string");
  }
  if (!config.agentRegistry.cacheDir) {
    throw new Error("config.agentRegistry.cacheDir must be a non-empty string");
  }
  if (config.tdd.enabled && !config.tdd.testCommand) {
    throw new Error("config.tdd.testCommand must be a non-empty string when TDD is enabled");
  }
  validateAgentRouting(config);
  if (config.replay !== undefined) {
    const rp = config.replay as Partial<ReplayConfig>;
    if (rp.keepPerTask !== undefined && (!Number.isInteger(rp.keepPerTask) || rp.keepPerTask < 0)) {
      throw new Error("config.replay.keepPerTask must be an integer >= 0");
    }
    for (const k of ["maxAgeDays", "maxTotalMB"] as const) {
      const v = rp[k];
      if (v !== undefined && v !== null && (typeof v !== "number" || !Number.isFinite(v) || v <= 0)) {
        throw new Error(`config.replay.${k} must be null or a number > 0`);
      }
    }
  }
  if (config.team !== undefined) {
    const tm = config.team as Partial<TeamConfig>;
    if (tm.enabled !== undefined && typeof tm.enabled !== "boolean") {
      throw new Error("config.team.enabled must be a boolean");
    }
    if (tm.owner !== undefined && tm.owner !== null && (typeof tm.owner !== "string" || !tm.owner.trim())) {
      throw new Error("config.team.owner must be null or a non-empty string");
    }
    if (
      tm.claimTtlHours !== undefined &&
      (typeof tm.claimTtlHours !== "number" || !Number.isFinite(tm.claimTtlHours) || tm.claimTtlHours <= 0)
    ) {
      throw new Error("config.team.claimTtlHours must be a number > 0");
    }
  }
  if (config.comments !== undefined) {
    const cm = config.comments as Partial<CommentsConfig>;
    for (const k of ["enabled", "autoLifecycle"] as const) {
      if (cm[k] !== undefined && typeof cm[k] !== "boolean") {
        throw new Error(`config.comments.${k} must be a boolean`);
      }
    }
    for (const k of ["promptMaxItems", "promptMaxChars"] as const) {
      const v = cm[k];
      if (v !== undefined && (typeof v !== "number" || !Number.isInteger(v) || v < 1)) {
        throw new Error(`config.comments.${k} must be an integer >= 1`);
      }
    }
  }
  if (config.review !== undefined) {
    const rv = config.review as Partial<ReviewConfig>;
    if (rv === null || typeof rv !== "object" || Array.isArray(rv)) {
      throw new Error("config.review must be an object");
    }
    if (rv.enabled !== undefined && typeof rv.enabled !== "boolean") {
      throw new Error("config.review.enabled must be a boolean");
    }
    if (rv.blockOn !== undefined && !REVIEW_BLOCK_ON.includes(rv.blockOn)) {
      throw new Error(`config.review.blockOn must be one of: ${REVIEW_BLOCK_ON.join(", ")}`);
    }
    if (
      rv.maxRounds !== undefined &&
      (typeof rv.maxRounds !== "number" || !Number.isInteger(rv.maxRounds) ||
        rv.maxRounds < REVIEW_MIN_ROUNDS || rv.maxRounds > REVIEW_MAX_ROUNDS)
    ) {
      throw new Error(`config.review.maxRounds must be an integer between ${REVIEW_MIN_ROUNDS} and ${REVIEW_MAX_ROUNDS}`);
    }
    if (rv.maxDiffChars !== undefined && (typeof rv.maxDiffChars !== "number" || !Number.isInteger(rv.maxDiffChars) || rv.maxDiffChars < 1)) {
      throw new Error("config.review.maxDiffChars must be an integer >= 1");
    }
  }
  if (config.sync !== undefined) {
    if (config.sync === null || typeof config.sync !== "object" || Array.isArray(config.sync)) {
      throw new Error("config.sync must be an object");
    }
    const g = (config.sync as SyncConfig).github;
    if (g !== undefined) {
      if (g === null || typeof g !== "object" || Array.isArray(g)) throw new Error("config.sync.github must be an object");
      for (const k of ["enabled", "pushOnWrite", "pull", "includeFinished"] as const) {
        if (g[k] !== undefined && typeof g[k] !== "boolean") {
          throw new Error(`config.sync.github.${k} must be a boolean`);
        }
      }
      if (g.mode !== undefined && !SYNC_GITHUB_MODES.includes(g.mode)) {
        throw new Error(`config.sync.github.mode must be one of: ${SYNC_GITHUB_MODES.join(", ")}`);
      }
      if (
        g.intervalSeconds !== undefined &&
        (typeof g.intervalSeconds !== "number" || !Number.isFinite(g.intervalSeconds) || g.intervalSeconds < SYNC_MIN_INTERVAL_SECONDS)
      ) {
        throw new Error(`config.sync.github.intervalSeconds must be a number >= ${SYNC_MIN_INTERVAL_SECONDS}`);
      }
      if (g.repo !== undefined) {
        const r = g.repo as unknown;
        const ok =
          (typeof r === "string" && r.trim().length > 0) ||
          (r !== null && typeof r === "object" && typeof (r as any).owner === "string" && typeof (r as any).name === "string");
        if (!ok) throw new Error("config.sync.github.repo must be an \"owner/name\" string or an { owner, name } object");
      }
    }
  }
  if (config.postMerge !== undefined) {
    const pm = config.postMerge as Partial<PostMergeConfig>;
    if (pm.prMode !== undefined && !POST_MERGE_PR_MODES.includes(pm.prMode)) {
      throw new Error(
        `config.postMerge.prMode must be one of: ${POST_MERGE_PR_MODES.join(", ")}`
      );
    }
    if (pm.changelog !== undefined && typeof pm.changelog !== "boolean") {
      throw new Error("config.postMerge.changelog must be a boolean");
    }
    if (
      pm.prBaseBranch !== undefined &&
      pm.prBaseBranch !== null &&
      (typeof pm.prBaseBranch !== "string" || pm.prBaseBranch.trim() === "")
    ) {
      throw new Error(
        "config.postMerge.prBaseBranch must be null or a non-empty branch name"
      );
    }
  }
}

/**
 * Check whether the project has been initialized (i.e. .wombo-combo/config.json exists).
 * This is the canonical "is this a wombo-combo project?" check.
 */
export function isProjectInitialized(projectRoot: string): boolean {
  return existsSync(resolve(projectRoot, CONFIG_FILE));
}

/**
 * Generate the default .wombo-combo/config.json content string (for `woco init`).
 */
export function generateDefaultConfig(): string {
  return JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n";
}

/**
 * Persist a (partial) config object to .wombo-combo/config.json.
 *
 * The on-disk file is updated with only the keys present in `partial` — existing
 * keys that are not in `partial` are preserved. This makes it safe to call from
 * the settings screen without accidentally wiping fields the UI doesn't expose.
 * Keys listed in `opts.replace` are overwritten (or removed when undefined) instead of merged.
 *
 * If the config file does not exist yet, a fresh one is created.
 */
export function saveConfig(
  projectRoot: string,
  partial: Partial<WomboConfig>,
  opts: { replace?: (keyof WomboConfig)[] } = {},
): void {
  const configPath = resolve(projectRoot, CONFIG_FILE);
  const dir = dirname(configPath);

  // Ensure .wombo-combo/ directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Read existing on-disk config (if any) to preserve fields we're not updating
  let existing: Partial<WomboConfig> = {};
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<WomboConfig>;
    } catch {
      // If it's unreadable, start fresh
    }
  }

  const merged = deepMerge(existing as WomboConfig, partial);
  // Replaced keys take the new value wholesale (deepMerge cannot delete entries);
  // an undefined value removes the key.
  for (const key of opts.replace ?? []) {
    if (partial[key] === undefined) delete merged[key];
    else (merged as unknown as Record<string, unknown>)[key] = partial[key];
  }
  writeFileSync(configPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}
