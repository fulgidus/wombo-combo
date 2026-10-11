import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { DEFAULT_CONFIG, validateConfig, type WomboConfig } from "../src/config";
import {
  claimTask, releaseTask, listClaims, isClaimedByOther, readClaim, claimPath, claimsDir, resolveOwner,
} from "../src/lib/claims";
import { makeRepo, git, writeRepoFile } from "./helpers/git-repo";
import { Scheduler } from "../src/daemon/scheduler";
import { DaemonState } from "../src/daemon/state";

let repo: string;
const cfg = (owner: string, extra: Record<string, unknown> = {}): WomboConfig =>
  ({ ...DEFAULT_CONFIG, team: { enabled: true, owner, claimTtlHours: 24, ...extra } }) as WomboConfig;

beforeEach(() => { repo = makeRepo(); });
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe("claims", () => {
  test("owner falls back to git user.email, config overrides", () => {
    git(repo, "config", "user.email", "dev@example.test");
    const c = { ...DEFAULT_CONFIG } as WomboConfig;
    expect(resolveOwner(repo, c)).toBe("dev@example.test");
    expect(resolveOwner(repo, cfg("me@x"))).toBe("me@x");
  });

  test("claim writes file with TTL, release removes it", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const r = claimTask(repo, cfg("a@x", { claimTtlHours: 2 }), "t1", { now });
    expect(r.ok).toBe(true);
    expect(existsSync(claimPath(repo, "t1"))).toBe(true);
    expect(readClaim(repo, "t1")!.expires_at).toBe("2026-01-01T02:00:00.000Z");
    expect(readdirSync(claimsDir(repo)).every((f) => !f.endsWith(".tmp"))).toBe(true);
    expect(releaseTask(repo, cfg("a@x"), "t1").ok).toBe(true);
    expect(readClaim(repo, "t1")).toBeNull();
    expect(releaseTask(repo, cfg("a@x"), "t1")).toEqual({ ok: false, reason: "not_claimed" });
  });

  test("claim by other blocks unless force or expired", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    claimTask(repo, cfg("a@x"), "t1", { now });
    const b = cfg("b@x");
    expect(isClaimedByOther(repo, b, "t1", now)).toBe(true);
    expect(claimTask(repo, b, "t1", { now }).ok).toBe(false);
    expect(releaseTask(repo, b, "t1", { now }).ok).toBe(false);
    const later = new Date("2026-01-03T00:00:00Z");
    expect(isClaimedByOther(repo, b, "t1", later)).toBe(false);
    expect(listClaims(repo, b, later)[0].expired).toBe(true);
    expect(claimTask(repo, b, "t1", { now: later }).ok).toBe(true);
    const forced = claimTask(repo, cfg("a@x"), "t1", { now: later, force: true });
    expect(forced.ok && forced.takenOver).toBe(true);
  });

  test("rejects unsafe task ids", () => {
    expect(() => claimTask(repo, cfg("a@x"), "../evil")).toThrow();
  });

  test("config validation and defaults", () => {
    expect(DEFAULT_CONFIG.team).toEqual({ enabled: false, owner: null, claimTtlHours: 24 });
    expect(() => validateConfig({ ...cfg("a"), team: { enabled: true, owner: null, claimTtlHours: 0 } } as WomboConfig)).toThrow(/claimTtlHours/);
  });
});

describe("team CLI", () => {
  const run = (...args: string[]) =>
    Bun.spawnSync(["bun", `${import.meta.dir}/../src/index.ts`, ...args], {
      cwd: repo, env: { ...process.env, CI: "true", WOMBO_LOCALE: "en", GIT_CONFIG_GLOBAL: "/dev/null" },
    });
  test("claim, status json, release", () => {
    git(repo, "config", "user.email", "cli@x");
    writeRepoFile(repo, ".wombo-combo/config.json", JSON.stringify({ team: { enabled: true } }));
    expect(run("team", "claim", "tk1").exitCode).toBe(0);
    const st = JSON.parse(run("team", "status", "-o", "json").stdout.toString());
    expect(st.claims[0]).toMatchObject({ task_id: "tk1", owner: "cli@x", mine: true });
    expect(run("team", "release", "tk1").exitCode).toBe(0);
    expect(run("team", "release", "tk1").exitCode).toBe(1);
  });
});
