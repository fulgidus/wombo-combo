/**
 * loop.ts — The periodic pull+push cycle of auto mode, used by the daemon.
 *
 *  - always ticking, but only syncs while `sync.github` is enabled with mode
 *    "auto": config is re-read every tick, so switching auto mode on or off
 *    takes effect without restarting the daemon (it idles while disabled)
 *  - single-flight (a tick is skipped while a cycle is still running) and
 *    serialised with the write-through hook
 *  - failures never escape: they are reported through `log` as warnings and
 *    the next attempt backs off exponentially (with jitter)
 *  - no token / repo: one warning, then it keeps trying quietly at the backoff
 *    pace in case the environment gets fixed
 */

import { isSyncAuto, loadConfig, normalizeSyncGithubConfig, type SyncGithubConfig } from "../../config";
import { renderMsg, t } from "../i18n";
import { resolveSyncContext, type SyncContext } from "./context";
import { cycleProblem, runCycleSingleFlight, watchDelayMs } from "./cycle";

export type LoopLogLevel = "debug" | "info" | "warn" | "error";

export interface AutoSyncLoopOptions {
  projectRoot: string;
  log: (level: LoopLogLevel, message: string) => void;
  /** Test seams */
  getConfig?: () => SyncGithubConfig;
  resolveContext?: (projectRoot: string) => Promise<SyncContext>;
  random?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Delay before the first cycle (default 2s) */
  initialDelayMs?: number;
  /** How often to re-check the config while auto mode is off (default 30s) */
  idleCheckMs?: number;
}

const DEFAULT_IDLE_CHECK_MS = 30_000;

export class AutoSyncLoop {
  private timer: unknown = null;
  private stopped = true;
  private failures = 0;
  private warnedContext = false;
  private ctx: SyncContext | null = null;
  private current: Promise<void> | null = null;
  private active = false;

  constructor(private readonly opts: AutoSyncLoopOptions) {}

  private config(): SyncGithubConfig {
    if (this.opts.getConfig) return this.opts.getConfig();
    return normalizeSyncGithubConfig(loadConfig(this.opts.projectRoot).sync);
  }

  /**
   * Start ticking. Starts unconditionally: while auto mode is off each tick
   * only re-reads the config, so enabling it later begins syncing without a
   * restart. Returns whether the loop is running.
   */
  start(): boolean {
    if (!this.stopped) return true;
    this.stopped = false;
    this.schedule(this.opts.initialDelayMs ?? 2000);
    return true;
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) (this.opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>)))(this.timer);
    this.timer = null;
  }

  get running(): boolean {
    return !this.stopped;
  }

  /** Resolves when the cycle in progress (if any) has finished. */
  idle(): Promise<void> {
    return this.current ?? Promise.resolve();
  }

  private schedule(ms: number): void {
    if (this.stopped) return;
    const set = this.opts.setTimer ?? ((fn, d) => {
      const h = setTimeout(fn, d);
      (h as { unref?: () => void }).unref?.();
      return h;
    });
    this.timer = set(() => {
      this.timer = null;
      void this.tick();
    }, ms);
  }

  /** One tick: never throws. Exposed for tests. */
  tick(): Promise<void> {
    const p = this.runTick().finally(() => {
      if (this.current === p) this.current = null;
    });
    this.current = p;
    return p;
  }

  private async runTick(): Promise<void> {
    let interval = 60;
    let idle = false;
    try {
      let cfg: SyncGithubConfig | null = null;
      try {
        cfg = this.config();
      } catch {
        // unreadable config: stay idle and look again later
      }
      if (!cfg || !isSyncAuto(cfg)) {
        if (this.active) this.opts.log("info", "GitHub auto-sync off");
        this.active = false;
        this.failures = 0;
        idle = true;
        return;
      }
      interval = cfg.intervalSeconds;
      if (!this.active) {
        this.active = true;
        this.opts.log("info", `GitHub auto-sync on: pull+push every ${cfg.intervalSeconds}s`);
      }
      if (!this.ctx || !this.ctx.ok) {
        this.ctx = await (this.opts.resolveContext ?? ((r) => resolveSyncContext(r)))(this.opts.projectRoot);
      }
      if (!this.ctx.ok) {
        if (!this.warnedContext) {
          this.warnedContext = true;
          this.opts.log("warn", t("cli.sync.auto.skipped", { reason: renderMsg(this.ctx.error) }));
        }
        this.failures++;
        return;
      }
      const run = runCycleSingleFlight({
        projectRoot: this.opts.projectRoot,
        client: this.ctx.client,
        pull: cfg.pull,
      });
      if (!run) return; // previous cycle still running
      const report = await run;
      const problem = cycleProblem(report);
      if (problem) {
        this.failures++;
        this.opts.log("warn", t("cli.sync.auto.cycleFailed", { error: problem }));
      } else {
        this.failures = 0;
      }
    } catch (err) {
      this.failures++;
      this.opts.log("warn", t("cli.sync.auto.cycleFailed", { error: err instanceof Error ? err.message : String(err) }));
    } finally {
      this.schedule(idle ? (this.opts.idleCheckMs ?? DEFAULT_IDLE_CHECK_MS) : watchDelayMs(interval, this.failures, this.opts.random));
    }
  }
}
