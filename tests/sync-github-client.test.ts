import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  GitHubApiError,
  GitHubAuthError,
  GitHubNetworkError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  LABEL_CATALOG,
  apiUrlFor,
  createGitHubClient,
  detectRepo,
  ensureLabels,
  labelsForQuest,
  parseRemoteUrl,
  resolveToken,
} from "../src/lib/sync/github-client";
import { startFakeGitHub, type FakeGitHub } from "./helpers/fake-github";

const TOKEN = "ghp_SUPERSECRETTOKEN123";
let fake: FakeGitHub;
let sleeps: number[];

function mk(extra: Partial<Parameters<typeof createGitHubClient>[0]> = {}) {
  return createGitHubClient({
    token: TOKEN,
    repo: { owner: fake.owner, name: fake.repo },
    apiUrl: fake.url,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    ...extra,
  });
}

beforeEach(() => {
  fake = startFakeGitHub({ token: TOKEN });
  sleeps = [];
});
afterEach(() => fake.stop());

describe("issues", () => {
  test("create, get, update, close", async () => {
    const c = mk();
    const created = await c.createIssue({ title: "Hello", body: "b", labels: ["spec"] });
    expect(created.number).toBe(1);
    expect((await c.getIssue(1)).title).toBe("Hello");
    const upd = await c.updateIssue(1, { title: "Hi", state: "closed", state_reason: "not_planned" });
    expect(upd.title).toBe("Hi");
    expect(upd.state).toBe("closed");
    expect(upd.state_reason).toBe("not_planned");
    expect(fake.requests[0]!.headers.authorization).toBe(`Bearer ${TOKEN}`);
  });

  test("listIssues paginates via Link headers and skips pull requests", async () => {
    for (let i = 0; i < 7; i++) fake.seedIssue({ title: `i${i}` });
    fake.seedIssue({ title: "pr", pull_request: {} });
    const out = await mk({ perPage: 3 }).listIssues({ state: "all" });
    expect(out.map((i) => i.title)).toEqual(["i0", "i1", "i2", "i3", "i4", "i5", "i6"]);
    expect(fake.count("GET", `/repos/acme/widgets/issues`)).toBe(3);
  });

  test("listIssues honours state and since", async () => {
    const a = fake.seedIssue({ title: "old" });
    fake.seedIssue({ title: "closed", state: "closed" });
    const since = new Date().toISOString();
    fake.setClock("2030-01-01T00:00:00Z");
    fake.seedIssue({ title: "new" });
    const c = mk();
    expect((await c.listIssues({ state: "open" })).map((i) => i.title)).toEqual(["old", "new"]);
    expect((await c.listIssues({ state: "all", since })).map((i) => i.title)).toEqual(["new"]);
    expect(a.number).toBe(1);
  });
});

describe("comments", () => {
  test("create, update, list with since", async () => {
    const c = mk();
    await c.createIssue({ title: "x" });
    const c1 = await c.createComment(1, "first");
    const mid = new Date(Date.parse(c1.updated_at) + 500).toISOString();
    await c.createComment(1, "second");
    const edited = await c.updateComment(c1.id, "first!");
    expect(edited.body).toBe("first!");
    expect((await c.listComments(1)).length).toBe(2);
    expect((await c.listComments(1, { since: mid })).map((x) => x.body).sort()).toEqual(["first!", "second"]);
  });

  test("paginates comments", async () => {
    fake.seedIssue({ title: "x" });
    for (let i = 0; i < 5; i++) fake.seedComment(1, `c${i}`);
    expect((await mk({ perPage: 2 }).listComments(1)).length).toBe(5);
  });
});

describe("errors and retries", () => {
  test("401 -> GitHubAuthError, no token leak", async () => {
    const c = createGitHubClient({
      token: "wrong-token-value",
      repo: { owner: "acme", name: "widgets" },
      apiUrl: fake.url,
      sleep: async () => {},
    });
    const err = await c.listLabels().catch((e) => e);
    expect(err).toBeInstanceOf(GitHubAuthError);
    expect(err.status).toBe(401);
    expect(String(err.message)).not.toContain("wrong-token-value");
  });

  test("403 non-rate-limit -> GitHubAuthError (no retry)", async () => {
    fake.inject({ status: 403 });
    await expect(mk().listLabels()).rejects.toBeInstanceOf(GitHubAuthError);
    expect(sleeps).toEqual([]);
  });

  test("404 -> GitHubNotFoundError", async () => {
    await expect(mk().getIssue(99)).rejects.toBeInstanceOf(GitHubNotFoundError);
  });

  test("429 with Retry-After is retried after the stated wait", async () => {
    fake.inject({ status: 429, headers: { "retry-after": "2" } });
    expect(await mk().listLabels()).toEqual([]);
    expect(sleeps).toEqual([2000]);
  });

  test("403 with x-ratelimit-remaining 0 uses reset time", async () => {
    const nowMs = 1_000_000_000_000;
    fake.inject({ status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(nowMs / 1000 + 5) } });
    await mk({ now: () => nowMs }).listLabels();
    expect(sleeps).toEqual([5000]);
  });

  test("persistent 429 beyond retries throws GitHubRateLimitError with retryAfterMs", async () => {
    fake.inject({ status: 429, headers: { "retry-after": "1" }, times: Infinity });
    const err = await mk({ maxRetries: 2 }).listLabels().catch((e) => e);
    expect(err).toBeInstanceOf(GitHubRateLimitError);
    expect(err.retryAfterMs).toBe(1000);
    expect(sleeps.length).toBe(2);
  });

  test("rate-limit wait over the cap throws immediately", async () => {
    fake.inject({ status: 429, headers: { "retry-after": "3600" } });
    const err = await mk({ maxWaitMs: 1000 }).listLabels().catch((e) => e);
    expect(err).toBeInstanceOf(GitHubRateLimitError);
    expect(err.retryAfterMs).toBe(3_600_000);
    expect(sleeps).toEqual([]);
  });

  test("5xx retried with exponential backoff, then succeeds", async () => {
    fake.inject({ status: 502, times: 2 });
    await mk({ baseBackoffMs: 100 }).listLabels();
    expect(sleeps).toEqual([100, 200]);
  });

  test("persistent 5xx -> GitHubApiError", async () => {
    fake.inject({ status: 500, times: Infinity });
    const err = await mk({ maxRetries: 1 }).listLabels().catch((e) => e);
    expect(err).toBeInstanceOf(GitHubApiError);
    expect(err.status).toBe(500);
  });

  test("network failure -> GitHubNetworkError after retries; token scrubbed", async () => {
    const f = (async () => {
      throw new Error(`connect failed for Bearer ${TOKEN}`);
    }) as unknown as typeof fetch;
    const err = await mk({ fetch: f, maxRetries: 2 }).listLabels().catch((e) => e);
    expect(err).toBeInstanceOf(GitHubNetworkError);
    expect(sleeps.length).toBe(2);
    expect(err.message).not.toContain(TOKEN);
    expect(err.stack ?? "").not.toContain(TOKEN);
  });

  test("token never appears in any error message", async () => {
    const msgs: string[] = [];
    for (const st of [401, 403, 404, 422, 500]) {
      fake.inject({ status: st, body: { message: `boom ${TOKEN}` } });
      const err = await mk({ maxRetries: 0 }).getIssue(1).catch((e) => e);
      msgs.push(String(err.message));
    }
    expect(msgs.length).toBe(5);
    for (const m of msgs) expect(m).not.toContain(TOKEN);
  });
});

describe("labels", () => {
  test("ensureLabels creates only missing ones (case-insensitive)", async () => {
    fake.labels.push({ name: "Spec", color: "000000", description: null });
    const c = mk();
    const r = await ensureLabels(c, LABEL_CATALOG);
    expect(r.existing).toEqual(["spec"]);
    expect(r.created.length).toBe(LABEL_CATALOG.length - 1);
    expect(fake.labels.find((l) => l.name === "wayfinder:map")?.color).toBe(
      LABEL_CATALOG.find((l) => l.name === "wayfinder:map")!.color,
    );
    const again = await ensureLabels(c, LABEL_CATALOG);
    expect(again.created).toEqual([]);
    expect(fake.count("POST", /labels$/)).toBe(LABEL_CATALOG.length - 1);
  });

  test("catalog covers the required names", () => {
    const names = LABEL_CATALOG.map((l) => l.name);
    for (const n of [
      "needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix", "spec",
      "wayfinder:map", "wayfinder:research", "wayfinder:prototype", "wayfinder:grilling", "wayfinder:task",
    ]) expect(names).toContain(n);
    expect(names.some((n) => n.startsWith("priority:"))).toBe(true);
    expect(names.some((n) => n.startsWith("difficulty:"))).toBe(true);
    for (const l of LABEL_CATALOG) expect(l.color).toMatch(/^[0-9a-f]{6}$/);
    expect(labelsForQuest("github-sync").name).toBe("quest:github-sync");
  });

  test("forbidden creation warns once and continues", async () => {
    fake.inject({ method: "POST", path: /labels$/, status: 403, times: Infinity });
    const warns: string[] = [];
    const r = await ensureLabels(mk(), [...LABEL_CATALOG, labelsForQuest("q")], { warn: (m) => warns.push(m) });
    expect(warns.length).toBe(1);
    expect(r.created).toEqual([]);
    expect(r.skipped.length).toBe(LABEL_CATALOG.length + 1);
    expect(warns[0]).not.toContain(TOKEN);
  });

  test("other errors propagate", async () => {
    fake.inject({ method: "POST", path: /labels$/, status: 401 });
    await expect(ensureLabels(mk(), [labelsForQuest("q")])).rejects.toBeInstanceOf(GitHubAuthError);
  });
});

describe("resolveToken", () => {
  const noGh = async () => ({ code: 1, stdout: "" });
  test("prefers GITHUB_TOKEN, then GH_TOKEN", async () => {
    expect(await resolveToken({ GITHUB_TOKEN: "a", GH_TOKEN: "b" }, noGh)).toBe("a");
    expect(await resolveToken({ GH_TOKEN: "b" }, noGh)).toBe("b");
  });
  test("falls back to gh auth token", async () => {
    const calls: string[][] = [];
    const t = await resolveToken({}, async (cmd, args) => {
      calls.push([cmd, ...args]);
      return { code: 0, stdout: "tok123\n" };
    });
    expect(t).toBe("tok123");
    expect(calls).toEqual([["gh", "auth", "token"]]);
  });
  test("null when nothing available or runner throws", async () => {
    expect(await resolveToken({}, noGh)).toBeNull();
    expect(await resolveToken({}, () => { throw new Error("ENOENT"); })).toBeNull();
  });
});

describe("repo detection", () => {
  test("parses remote URL forms", () => {
    expect(parseRemoteUrl("https://github.com/fulgidus/wombo-combo.git")).toEqual({ owner: "fulgidus", name: "wombo-combo", host: "github.com" });
    expect(parseRemoteUrl("https://user:pw@github.com/o/r")).toEqual({ owner: "o", name: "r", host: "github.com" });
    expect(parseRemoteUrl("git@github.com:o/r.git")).toEqual({ owner: "o", name: "r", host: "github.com" });
    expect(parseRemoteUrl("ssh://git@ghe.corp.example:2222/team/proj.git")).toEqual({ owner: "team", name: "proj", host: "ghe.corp.example" });
    expect(parseRemoteUrl("git@GHE.corp.example:team/proj")).toEqual({ owner: "team", name: "proj", host: "ghe.corp.example" });
    expect(parseRemoteUrl("/local/path/repo")).toBeNull();
    expect(parseRemoteUrl("")).toBeNull();
  });

  test("config repo wins; otherwise origin remote", async () => {
    expect(detectRepo("/nonexistent", "o/r")).toEqual({ owner: "o", name: "r", host: "github.com" });
    expect(detectRepo("/nonexistent", "ghe.x.io/o/r")).toEqual({ owner: "o", name: "r", host: "ghe.x.io" });
    expect(detectRepo("/nonexistent", { owner: "a", name: "b" })).toEqual({ owner: "a", name: "b", host: "github.com" });
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "detect-repo-"));
    Bun.spawnSync(["git", "init", "-q", dir]);
    expect(detectRepo(dir)).toBeNull();
    Bun.spawnSync(["git", "-C", dir, "remote", "add", "origin", "git@ghe.corp.io:team/app.git"]);
    expect(detectRepo(dir)).toEqual({ owner: "team", name: "app", host: "ghe.corp.io" });
  });

  test("apiUrlFor", () => {
    expect(apiUrlFor("github.com", {})).toBe("https://api.github.com");
    expect(apiUrlFor("ghe.x.io", {})).toBe("https://ghe.x.io/api/v3");
    expect(apiUrlFor("github.com", { GITHUB_API_URL: "http://localhost:1/" })).toBe("http://localhost:1");
  });
});
