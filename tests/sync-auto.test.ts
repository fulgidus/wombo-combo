import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DEFAULT_CONFIG, loadConfig } from "../src/config";
import { cmdSyncWatch } from "../src/commands/sync";
import { addComment, listComments } from "../src/lib/comments";
import { msg } from "../src/lib/i18n";
import { autoSyncBusy, configureAutoSync, flushAutoSync, maybeSyncItem, resetAutoSync } from "../src/lib/sync/auto";
import { configuredRepo } from "../src/lib/sync/context";
import { runCycleSingleFlight, runSyncCycle, watchDelayMs } from "../src/lib/sync/cycle";
import { createGitHubClient } from "../src/lib/sync/github-client";
import { AutoSyncLoop } from "../src/lib/sync/loop";
import { readMapping } from "../src/lib/sync/mapping";
import { saveQuest } from "../src/lib/quest-store";
import { saveTaskToStore } from "../src/lib/task-store";
import { loadTasks, type Task } from "../src/lib/tasks";
import { startFakeGitHub, type FakeGitHub } from "./helpers/fake-github";
import { mkQuest, mkTask } from "./helpers/sync-fixtures";

const ENTRY = join(resolve(import.meta.dir, ".."), "src", "index.ts");
let root: string;
let fake: FakeGitHub;
const client = () =>
  createGitHubClient({ token: "tok", repo: { owner: "acme", name: "widgets" }, apiUrl: fake.url, sleep: async () => {}, maxRetries: 0 });
const ok = () => Promise.resolve({ ok: true as const, client: client() });
const writeConfig = (github: Record<string, unknown>) =>
  writeFileSync(join(root, ".wombo-combo", "config.json"), JSON.stringify({ sync: { github } }));
const saveTask = (t: Task) => saveTaskToStore(root, loadConfig(root), t);
const posts = (re: RegExp | string) => fake.count("POST", re);
let warnings: string[];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-auto-"));
  mkdirSync(join(root, ".wombo-combo"), { recursive: true });
  writeConfig({ enabled: true, mode: "auto" });
  fake = startFakeGitHub();
  warnings = [];
  resetAutoSync();
  configureAutoSync({ resolveContext: ok, warn: (m) => warnings.push(m), debounceMs: 250 });
  saveTask(mkTask());
  saveTask(mkTask({ id: "t2", title: "Other" }));
});
afterEach(() => {
  jest.useRealTimers();
  resetAutoSync();
  fake.stop();
  rmSync(root, { recursive: true, force: true });
});

describe("maybeSyncItem", () => {
  test("is a no-op unless enabled + auto + pushOnWrite", async () => {
    for (const github of [{}, { enabled: true }, { enabled: false, mode: "auto" }, { enabled: true, mode: "auto", pushOnWrite: false }]) {
      writeConfig(github);
      maybeSyncItem(root, { kind: "task", id: "t1" });
      expect(autoSyncBusy()).toBe(false);
    }
    expect(await flushAutoSync()).toBe(true);
    expect(fake.requests).toHaveLength(0);
  });

  test("never throws, even with a broken config or bad ref", () => {
    writeFileSync(join(root, ".wombo-combo", "config.json"), "{ not json");
    expect(() => maybeSyncItem(root, { kind: "task", id: "t1" })).not.toThrow();
    writeConfig({ enabled: true, mode: "auto" });
    expect(() => maybeSyncItem(root, { kind: "task", id: "../bad" })).not.toThrow();
  });

  test("pushes just that item, debounced, on a fake clock", async () => {
    jest.useFakeTimers();
    maybeSyncItem(root, { kind: "task", id: "t1" });
    maybeSyncItem(root, { kind: "task", id: "t1" });
    maybeSyncItem(root, { kind: "task", id: "t1" });
    jest.advanceTimersByTime(249);
    expect(autoSyncBusy()).toBe(true);
    expect(fake.requests).toHaveLength(0);
    jest.advanceTimersByTime(1);
    jest.useRealTimers();
    expect(await flushAutoSync()).toBe(true);
    expect(fake.issues).toHaveLength(1);
    expect(fake.issues[0]!.title).toContain("[t1]");
    expect(readMapping(root, "task", "t1")).not.toBeNull();
    expect(readMapping(root, "task", "t2")).toBeNull();
    expect(posts(/\/issues$/)).toBe(1);
    expect(warnings).toEqual([]);
  });

  test("flush pushes immediately without waiting for the debounce; comments and quests work", async () => {
    saveQuest(root, mkQuest());
    addComment(root, { kind: "task", id: "t1" }, { body: "hello", role: "human" });
    maybeSyncItem(root, { kind: "task", id: "t1" });
    maybeSyncItem(root, { kind: "quest", id: "q1" });
    expect(await flushAutoSync()).toBe(true);
    expect(fake.issues.map((i) => i.title).sort()).toEqual(["[q1] Quest one", "[t1] Task one"]);
    expect(posts(/comments$/)).toBe(1);
    expect(listComments(root, { kind: "task", id: "t1" })[0]!.github_url).toBeTruthy();
  });

  test("a failing push warns once and is retried by the next cycle", async () => {
    fake.inject({ method: "POST", path: /\/issues$/, status: 500, times: Infinity });
    maybeSyncItem(root, { kind: "task", id: "t1" });
    expect(await flushAutoSync()).toBe(true);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("t1");
    expect(readMapping(root, "task", "t1")).toBeNull();
    fake.clearInjections();
    const r = await runSyncCycle({ projectRoot: root, client: client() });
    expect(r.push.errors).toEqual([]);
    expect(r.push.created.map((c) => c.ref).sort()).toEqual(["t1", "t2"]);
  });

  test("no token or repo: one warning per process, nothing sent", async () => {
    configureAutoSync({ resolveContext: async () => ({ ok: false, error: msg("cli.sync.noToken") }) });
    for (let i = 0; i < 3; i++) {
      maybeSyncItem(root, { kind: "task", id: "t1" });
      await flushAutoSync();
    }
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("GITHUB_TOKEN");
    expect(fake.requests).toHaveLength(0);
  });

  test("flush abandons a stuck push after the timeout", async () => {
    configureAutoSync({ resolveContext: () => new Promise(() => {}) });
    maybeSyncItem(root, { kind: "task", id: "t1" });
    const t0 = Date.now();
    expect(await flushAutoSync(80)).toBe(false);
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(warnings).toHaveLength(1);
  });
});

describe("cycle", () => {
  test("a conflict posts one notice on the issue; it is not imported back; local wins", async () => {
    await runSyncCycle({ projectRoot: root, client: client() });
    const issue = fake.issues.find((i) => i.title.startsWith("[t1]"))!;
    issue.title = "[t1] Remote title";
    saveTask(mkTask({ title: "Local title" }));
    const r = await runSyncCycle({ projectRoot: root, client: client() });
    expect(r.pull!.conflicts).toEqual([{ ref: "t1", fields: ["title"] }]);
    expect(r.notices.posted).toHaveLength(1);
    expect(issue.title).toBe("[t1] Local title");
    const notices = fake.comments.filter((c) => c.issue === issue.number);
    expect(notices).toHaveLength(1);
    expect(notices[0]!.body).toContain("woco sync conflict (title)");
    const again = await runSyncCycle({ projectRoot: root, client: client() });
    expect(again.pull!.commentsAdded).toEqual([]);
    expect(again.pull!.conflicts).toEqual([]);
    expect(again.notices.posted).toEqual([]);
    expect(fake.comments.filter((c) => c.issue === issue.number)).toHaveLength(1);
  });

  test("a conflict notice that failed to post is kept and retried by the next cycle", async () => {
    await runSyncCycle({ projectRoot: root, client: client() });
    const issue = fake.issues.find((i) => i.title.startsWith("[t1]"))!;
    issue.title = "[t1] Remote title";
    saveTask(mkTask({ title: "Local title" }));
    fake.inject({ method: "POST", path: /comments$/, status: 500, times: Infinity });
    const r = await runSyncCycle({ projectRoot: root, client: client() });
    expect(r.notices.errors).toHaveLength(1);
    expect(r.notices.posted).toEqual([]);
    const file = join(root, ".wombo-combo", "sync", "pending-notices.json");
    expect(existsSync(file)).toBe(true);
    expect(JSON.parse(readFileSync(file, "utf-8"))).toHaveLength(1);
    // still failing: kept, not duplicated
    await runSyncCycle({ projectRoot: root, client: client() });
    expect(JSON.parse(readFileSync(file, "utf-8"))).toHaveLength(1);
    expect(JSON.parse(readFileSync(file, "utf-8"))[0].attempts).toBe(2);
    fake.clearInjections();
    const retry = await runSyncCycle({ projectRoot: root, client: client() });
    expect(retry.notices.posted).toHaveLength(1);
    expect(existsSync(file)).toBe(false);
    expect(fake.comments.filter((c) => c.issue === issue.number && c.body.includes("woco sync conflict"))).toHaveLength(1);
    // pull:false cycles retry too
    const none = await runSyncCycle({ projectRoot: root, client: client(), pull: false });
    expect(none.notices.posted).toEqual([]);
  });

  test("single flight: a second cycle is refused while one runs", async () => {
    const first = runCycleSingleFlight({ projectRoot: root, client: client() });
    expect(first).not.toBeNull();
    expect(runCycleSingleFlight({ projectRoot: root, client: client() })).toBeNull();
    await first;
    const next = runCycleSingleFlight({ projectRoot: root, client: client() });
    expect(next).not.toBeNull();
    await next;
  });

  test("watchDelayMs: jitter up to 10%, doubling backoff, capped", () => {
    expect(watchDelayMs(60, 0, () => 0)).toBe(60_000);
    expect(watchDelayMs(60, 0, () => 1)).toBe(66_000);
    expect(watchDelayMs(60, 2, () => 0)).toBe(240_000);
    expect(watchDelayMs(60, 20, () => 0)).toBe(900_000);
    expect(watchDelayMs(1, 0, () => 0)).toBe(15_000);
  });
});

describe("AutoSyncLoop (daemon)", () => {
  function mkLoop(extra: Record<string, unknown> = {}) {
    const timers: Array<{ fn: () => void; ms: number }> = [];
    const logs: Array<[string, string]> = [];
    const loop = new AutoSyncLoop({
      projectRoot: root,
      log: (l, m) => logs.push([l, m]),
      resolveContext: ok,
      random: () => 0,
      setTimer: (fn, ms) => {
        const h = { fn, ms };
        timers.push(h);
        return h;
      },
      clearTimer: (h) => {
        const i = timers.indexOf(h as never);
        if (i >= 0) timers.splice(i, 1);
      },
      ...extra,
    });
    return { loop, timers, logs };
  }

  test("idles (no network) while auto mode is off", async () => {
    writeConfig({ enabled: true, mode: "manual" });
    const { loop, timers, logs } = mkLoop();
    expect(loop.start()).toBe(true);
    expect(timers.map((t) => t.ms)).toEqual([2000]);
    timers.shift()!.fn();
    await loop.idle();
    expect(fake.requests).toHaveLength(0);
    expect(logs).toEqual([]);
    expect(timers.map((t) => t.ms)).toEqual([30_000]);
    loop.stop();
  });

  test("enabling auto mode after start begins syncing without a restart", async () => {
    writeConfig({ enabled: false });
    const { loop, timers, logs } = mkLoop();
    loop.start();
    timers.shift()!.fn();
    await loop.idle();
    expect(fake.issues).toHaveLength(0);
    writeConfig({ enabled: true, mode: "auto", intervalSeconds: 30 });
    timers.shift()!.fn();
    await loop.idle();
    expect(fake.issues.filter((i) => i.title.startsWith("[t1]"))).toHaveLength(1);
    expect(logs.some(([l, m]) => l === "info" && m.includes("auto-sync on"))).toBe(true);
    expect(timers.map((t) => t.ms)).toEqual([30_000]);
    // and turning it off again idles
    writeConfig({ enabled: true, mode: "manual" });
    const before = fake.requests.length;
    timers.shift()!.fn();
    await loop.idle();
    expect(fake.requests.length).toBe(before);
    expect(timers.map((t) => t.ms)).toEqual([30_000]);
    loop.stop();
  });

  test("ticks pull+push and reschedules at the interval; stop cancels", async () => {
    writeConfig({ enabled: true, mode: "auto", intervalSeconds: 30 });
    fake.seedIssue({ title: "From GitHub", body: "x" });
    const { loop, timers, logs } = mkLoop();
    expect(loop.start()).toBe(true);
    expect(timers.map((t) => t.ms)).toEqual([2000]);
    timers.shift()!.fn();
    await loop.idle();
    expect(loadTasks(root, DEFAULT_CONFIG).tasks.map((t) => t.id)).toContain("gh-1-from-github");
    expect(fake.issues.filter((i) => i.title.startsWith("[t1]"))).toHaveLength(1);
    expect(timers.map((t) => t.ms)).toEqual([30_000]);
    expect(logs.filter(([l]) => l === "warn")).toEqual([]);
    loop.stop();
    expect(timers).toHaveLength(0);
    expect(loop.running).toBe(false);
  });

  test("errors are warnings, never throw, and back off", async () => {
    writeConfig({ enabled: true, mode: "auto", intervalSeconds: 30 });
    fake.inject({ method: "GET", path: /\/issues$/, status: 500, times: Infinity });
    const { loop, timers, logs } = mkLoop();
    loop.start();
    timers.shift()!.fn();
    await loop.idle();
    expect(logs.filter(([l]) => l === "warn")).toHaveLength(1);
    expect(timers.map((t) => t.ms)).toEqual([60_000]);
    timers.shift()!.fn();
    await loop.idle();
    expect(timers.map((t) => t.ms)).toEqual([120_000]);
    fake.clearInjections();
    timers.shift()!.fn();
    await loop.idle();
    expect(timers.map((t) => t.ms)).toEqual([30_000]);
    loop.stop();
  });

  test("missing token: one warning, keeps retrying quietly", async () => {
    const { loop, timers, logs } = mkLoop({ resolveContext: async () => ({ ok: false, error: msg("cli.sync.noToken") }) });
    loop.start();
    for (let i = 0; i < 3; i++) {
      timers.shift()!.fn();
      await loop.idle();
    }
    expect(logs.filter(([l]) => l === "warn")).toHaveLength(1);
    expect(fake.requests).toHaveLength(0);
    loop.stop();
  });
});

describe("sync watch", () => {
  const silence = async (fn: () => Promise<void>) => {
    const log = console.log;
    const lines: string[] = [];
    console.log = (...a: unknown[]) => void lines.push(a.join(" "));
    try {
      await fn();
    } finally {
      console.log = log;
    }
    return lines;
  };

  test("--once runs a single cycle", async () => {
    const lines = await silence(() => cmdSyncWatch({ projectRoot: root, client: client(), once: true, outputFmt: "json" }));
    expect(fake.issues).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toMatchObject({ cycle: 1, ok: true, pushed: 2 });
  });

  test("loops with jitter, backs off on errors, stops on abort", async () => {
    const ac = new AbortController();
    const delays: number[] = [];
    fake.inject({ method: "GET", path: /\/issues$/, status: 500, times: Infinity });
    let n = 0;
    const lines = await silence(() =>
      cmdSyncWatch({
        projectRoot: root,
        client: client(),
        outputFmt: "json",
        intervalSeconds: 20,
        random: () => 0.5,
        signal: ac.signal,
        sleep: async (ms) => {
          delays.push(ms);
          if (++n === 2) fake.clearInjections();
          if (n === 4) ac.abort();
        },
      }),
    );
    expect(delays).toEqual([42_000, 84_000, 21_000, 21_000]);
    const parsed = lines.map((l) => JSON.parse(l));
    expect(parsed.map((p) => p.ok)).toEqual([false, false, true, true]);
    process.exitCode = 0;
  });

  test("SIGINT stops it gracefully", async () => {
    const lines = await silence(() =>
      cmdSyncWatch({
        projectRoot: root,
        client: client(),
        outputFmt: "text",
        sleep: (_ms, signal) =>
          new Promise<void>((resolve) => {
            signal.addEventListener("abort", () => resolve());
            process.emit("SIGINT");
          }),
      }),
    );
    expect(lines.some((l) => l.includes("Sync watch stopped"))).toBe(true);
  });
});

describe("config repo", () => {
  test("configuredRepo reads the typed block", () => {
    writeConfig({ repo: "acme/widgets" });
    expect(configuredRepo(root)).toBe("acme/widgets");
    writeConfig({ repo: { owner: "a", name: "b" } });
    expect(configuredRepo(root)).toEqual({ owner: "a", name: "b" });
    writeConfig({ repo: 5 });
    expect(configuredRepo(root)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Real CLI processes
// ---------------------------------------------------------------------------

async function woco(args: string[], env: Record<string, string> = {}) {
  const base: Record<string, string | undefined> = { ...process.env, CI: "1", NO_COLOR: "1" };
  for (const k of ["WOMBO_OUTPUT", "WOMBO_LOCALE", "LANG", "LC_ALL", "LANGUAGE", "GITHUB_TOKEN", "GH_TOKEN", "GITHUB_API_URL"]) delete base[k];
  Object.assign(base, env);
  const p = Bun.spawn([process.execPath, ENTRY, ...args], { cwd: root, env: base as Record<string, string>, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code: await p.exited, out, err };
}

describe("CLI", () => {
  const gh = () => ({ GITHUB_TOKEN: "tok", GITHUB_API_URL: fake.url });
  beforeEach(() => writeConfig({ enabled: true, mode: "auto", repo: "acme/widgets" }));

  test("tasks set-status in auto mode pushes the item in the background and exits 0", async () => {
    const r = await woco(["tasks", "set-status", "t1", "in_progress"], gh());
    expect(r.code).toBe(0);
    expect(r.err).toBe("");
    expect(fake.issues.map((i) => i.title)).toEqual(["[t1] Task one"]);
  });

  test("tasks add and comment add are synced too", async () => {
    expect((await woco(["tasks", "add", "t3", "Third"], gh())).code).toBe(0);
    expect(fake.issues.some((i) => i.title.startsWith("[t3]"))).toBe(true);
    expect((await woco(["comment", "add", "t3", "a note", "--role", "human"], gh())).code).toBe(0);
    expect(posts(/comments$/)).toBe(1);
  });

  test("tasks archive and comment link are synced too", async () => {
    await woco(["sync", "push"], gh());
    fake.requests.length = 0;
    expect((await woco(["tasks", "set-status", "t2", "done"], gh())).code).toBe(0);
    fake.requests.length = 0;
    const a = await woco(["tasks", "archive", "t2"], gh());
    expect(a.code).toBe(0);
    expect(fake.requests.length).toBeGreaterThan(0); // the hook ran a push for the archived item
    const c = await woco(["comment", "add", "t1", "note", "--role", "human", "--github-url", "https://github.com/acme/widgets/issues/1#issuecomment-1"], gh());
    expect(c.code).toBe(0);
    const id = JSON.parse((await woco(["comment", "list", "t1", "-o", "json"], gh())).out).comments?.[0]?.id;
    expect(id).toBeTruthy();
    fake.requests.length = 0;
    const l = await woco(["comment", "link", id, "https://github.com/acme/widgets/issues/1#issuecomment-2"], gh());
    expect(l.code).toBe(0);
    expect(fake.requests.length).toBeGreaterThan(0);
  });

  test("manual mode never touches GitHub", async () => {
    writeConfig({ enabled: true, mode: "manual", repo: "acme/widgets" });
    expect((await woco(["tasks", "set-priority", "t1", "low"], gh())).code).toBe(0);
    expect(fake.requests).toHaveLength(0);
  });

  test("unreachable GitHub: one warning, exit code unchanged, local change kept", async () => {
    const env = { GITHUB_TOKEN: "tok", GITHUB_API_URL: "http://127.0.0.1:9" };
    const r = await woco(["tasks", "set-status", "t1", "in_progress"], env);
    expect(r.code).toBe(0);
    expect(r.err.trim().split("\n").filter((l) => l.includes("auto-sync"))).toHaveLength(1);
    expect(loadTasks(root, DEFAULT_CONFIG).tasks.find((t) => t.id === "t1")!.status).toBe("in_progress");
  }, 20_000);

  test("no token: one warning, exit 0", async () => {
    const r = await woco(["tasks", "set-status", "t1", "in_progress"], { PATH: dirname(process.execPath) });
    expect(r.code).toBe(0);
    expect(r.err.match(/auto-sync/g)?.length).toBe(1);
  });

  test("sync run, sync pull, sync watch --once", async () => {
    fake.seedIssue({ title: "Incoming", body: "x" });
    const run = await woco(["sync", "run", "-o", "json"], gh());
    expect(run.code).toBe(0);
    const rep = JSON.parse(run.out);
    expect(rep.pull.tasksCreated).toEqual(["gh-1-incoming"]);
    expect(rep.push.created.map((c: any) => c.ref).sort()).toEqual(["t1", "t2"]);
    fake.requests.length = 0;
    const pull = await woco(["sync", "pull", "-o", "json"], gh());
    expect(pull.code).toBe(0);
    expect(JSON.parse(pull.out)).toMatchObject({ tasksCreated: [], conflicts: [], noticesPosted: [] });
    const watch = await woco(["sync", "watch", "--once", "-o", "json"], gh());
    expect(watch.code).toBe(0);
    expect(JSON.parse(watch.out.trim().split("\n")[0]!)).toMatchObject({ ok: true, pulled: 0, pushed: 0 });
    expect(fake.requests.filter((q) => q.method !== "GET")).toEqual([]);
  });

  test("sync pull posts conflict notices to GitHub", async () => {
    await woco(["sync", "push"], gh());
    fake.issues.find((i) => i.title.startsWith("[t1]"))!.title = "[t1] Remote";
    saveTask(mkTask({ title: "Local" }));
    const pull = await woco(["sync", "pull", "-o", "json"], gh());
    expect(pull.code).toBe(0);
    expect(JSON.parse(pull.out).noticesPosted).toHaveLength(1);
    expect(fake.comments.some((c) => c.body.includes("woco sync conflict"))).toBe(true);
  });
});
