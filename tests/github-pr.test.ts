import { describe, test, expect } from "bun:test";
import {
  PR_SECTION_END,
  PR_SECTION_START,
  checkGhAuthenticated,
  checkGhAvailable,
  createOrUpdatePullRequest,
  defaultCommandRunner,
  hasGeneratedSection,
  parseGithubRemoteUrl,
  replaceGeneratedSection,
  resolveGithubRepo,
  resolveRemoteDefaultBranch,
  wrapGeneratedSection,
  type CommandResult,
  type CommandRunner,
} from "../src/lib/github-pr";

interface Call {
  command: string;
  args: string[];
  input?: string;
}

type Handler = (call: Call) => Partial<CommandResult> | undefined;

function fakeRunner(handler: Handler) {
  const calls: Call[] = [];
  const runner: CommandRunner = async (command, args, options) => {
    const call = { command, args, input: options.input };
    calls.push(call);
    const custom = handler(call);
    if (custom) return { exitCode: 0, stdout: "", stderr: "", ...custom };
    return defaultOk(call);
  };
  return { runner, calls };
}

function defaultOk(call: Call): CommandResult {
  const ok = (stdout = ""): CommandResult => ({ exitCode: 0, stdout, stderr: "" });
  if (call.command === "git") return ok("git@github.com:acme/widgets.git\n");
  const [a, b] = call.args;
  if (a === "--version") return ok("gh version 2.0.0\n");
  if (a === "auth") return ok("Logged in\n");
  if (a === "repo" && b === "view") return ok(JSON.stringify({ defaultBranchRef: { name: "trunk" } }));
  if (a === "pr" && b === "list") return ok("[]");
  if (a === "pr" && b === "create") return ok("https://github.com/acme/widgets/pull/42\n");
  if (a === "pr" && b === "edit") return ok("https://github.com/acme/widgets/pull/7\n");
  return ok();
}

const base = {
  cwd: "/repo",
  remote: "origin",
  head: "integration",
  base: "main",
  title: "Merge 2 tasks",
  body: "## Summary\n\nHello",
};

const ghCalls = (calls: Call[]) => calls.filter((c) => c.command === "gh");

describe("parseGithubRemoteUrl", () => {
  test("parses https, ssh and scp-style urls", () => {
    for (const url of [
      "https://github.com/acme/widgets.git",
      "https://github.com/acme/widgets",
      "https://user@github.com/acme/widgets.git",
      "git@github.com:acme/widgets.git",
      "ssh://git@github.com/acme/widgets.git",
      "https://github.com/acme/widgets/",
    ]) {
      expect(parseGithubRemoteUrl(url)?.slug).toBe("acme/widgets");
    }
  });
  test("rejects non-GitHub hosts and malformed urls", () => {
    expect(parseGithubRemoteUrl("https://gitlab.com/acme/widgets.git")).toBeNull();
    expect(parseGithubRemoteUrl("https://github.com.evil.test/acme/widgets")).toBeNull();
    expect(parseGithubRemoteUrl("/local/path")).toBeNull();
    expect(parseGithubRemoteUrl("")).toBeNull();
  });
});

describe("generated section markers", () => {
  test("wrap, detect and replace preserving surrounding text", () => {
    const body = `Intro by hand\n\n${wrapGeneratedSection("old")}\n\nFooter by hand`;
    expect(hasGeneratedSection(body)).toBe(true);
    const next = replaceGeneratedSection(body, "new")!;
    expect(next).toContain("Intro by hand");
    expect(next).toContain("Footer by hand");
    expect(next).toContain("new");
    expect(next).not.toContain("old");
    expect(next.match(new RegExp(PR_SECTION_START, "g"))).toHaveLength(1);
  });
  test("bodies without a well-formed section are not replaceable", () => {
    expect(replaceGeneratedSection("manual text", "x")).toBeNull();
    expect(replaceGeneratedSection(`${PR_SECTION_END} ${PR_SECTION_START}`, "x")).toBeNull();
    expect(replaceGeneratedSection(`${PR_SECTION_START} only start`, "x")).toBeNull();
  });
  test("generated markdown cannot inject markers", () => {
    const wrapped = wrapGeneratedSection(`a ${PR_SECTION_END} b`);
    expect(wrapped.match(new RegExp(PR_SECTION_END, "g"))).toHaveLength(1);
  });
  test("oversized reports are truncated", () => {
    expect(wrapGeneratedSection("x".repeat(100_000)).length).toBeLessThan(61_000);
  });
});

describe("availability and authentication", () => {
  test("missing gh gives an actionable failure", async () => {
    const { runner } = fakeRunner((c) =>
      c.command === "gh" ? { exitCode: 127, spawnError: "spawn gh ENOENT" } : undefined
    );
    const res = await checkGhAvailable({ cwd: "/r", runner });
    expect(res?.reason).toBe("gh-missing");
    expect(res?.message).toContain("cli.github.com");
  });

  test("unauthenticated gh is reported without leaking output", async () => {
    const { runner } = fakeRunner((c) =>
      c.args[0] === "auth" ? { exitCode: 1, stderr: "token ghp_" + "a".repeat(30) } : undefined
    );
    const res = await checkGhAuthenticated({ cwd: "/r", runner }, "github.com");
    expect(res?.reason).toBe("unauthenticated");
    expect(res?.message).toContain("gh auth login");
    expect(JSON.stringify(res)).not.toContain("ghp_");
  });

  test("auth check never requests token output", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    await checkGhAuthenticated({ cwd: "/r", runner }, "github.com");
    expect(calls[0]!.args).not.toContain("--show-token");
    expect(calls[0]!.args).not.toContain("-t");
  });
});

describe("repository resolution", () => {
  test("uses the configured remote only", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    const res = await resolveGithubRepo({ cwd: "/r", runner }, "upstream");
    expect("repo" in res && res.repo.slug).toBe("acme/widgets");
    expect(calls[0]!.args).toEqual(["remote", "get-url", "upstream"]);
  });

  test("non-GitHub remote is an actionable failure", async () => {
    const { runner } = fakeRunner((c) =>
      c.command === "git" ? { stdout: "https://gitlab.com/a/b.git\n" } : undefined
    );
    const res = await resolveGithubRepo({ cwd: "/r", runner }, "origin");
    expect("error" in res && res.error.reason).toBe("non-github-remote");
  });

  test("missing remote is reported", async () => {
    const { runner } = fakeRunner((c) =>
      c.command === "git" ? { exitCode: 2, stderr: "No such remote" } : undefined
    );
    const res = await resolveGithubRepo({ cwd: "/r", runner }, "origin");
    expect("error" in res && res.error.reason).toBe("no-remote");
  });

  test("rejects option-like remote names", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    const res = await resolveGithubRepo({ cwd: "/r", runner }, "--upload-pack=x");
    expect("error" in res).toBe(true);
    expect(calls).toHaveLength(0);
  });

  test("resolves the remote default branch", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    const res = await resolveRemoteDefaultBranch({ cwd: "/r", runner }, "origin");
    expect("branch" in res && res.branch).toBe("trunk");
    expect(ghCalls(calls).some((c) => c.args.includes("--repo") || c.args[1] === "view")).toBe(true);
  });

  test("unparseable default branch response is a failure", async () => {
    const { runner } = fakeRunner((c) =>
      c.args[0] === "repo" ? { stdout: "{}" } : undefined
    );
    const res = await resolveRemoteDefaultBranch({ cwd: "/r", runner }, "origin");
    expect("error" in res && res.error.reason).toBe("default-branch");
  });
});

describe("createOrUpdatePullRequest", () => {
  test("skip mode executes no commands", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    const res = await createOrUpdatePullRequest({ ...base, mode: "skip", runner });
    expect(res.status).toBe("skipped");
    expect(calls).toHaveLength(0);
  });

  test("creates a ready PR after querying for existing ones", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res).toMatchObject({ status: "created", number: 42, url: "https://github.com/acme/widgets/pull/42" });

    const gh = ghCalls(calls);
    const listIdx = gh.findIndex((c) => c.args[0] === "pr" && c.args[1] === "list");
    const createIdx = gh.findIndex((c) => c.args[0] === "pr" && c.args[1] === "create");
    expect(listIdx).toBeGreaterThanOrEqual(0);
    expect(createIdx).toBeGreaterThan(listIdx);

    const create = gh[createIdx]!;
    expect(create.args).not.toContain("--draft");
    expect(create.args).not.toContain("--dry-run");
    expect(create.args.slice(create.args.indexOf("--head"), create.args.indexOf("--head") + 2)).toEqual(["--head", "integration"]);
    expect(create.args.slice(create.args.indexOf("--base"), create.args.indexOf("--base") + 2)).toEqual(["--base", "main"]);
    expect(create.args).toContain("--title");
    expect(create.args.slice(create.args.indexOf("--repo"), create.args.indexOf("--repo") + 2)).toEqual(["--repo", "acme/widgets"]);
    // body goes through stdin, wrapped in ownership markers
    expect(create.args[create.args.indexOf("--body-file") + 1]).toBe("-");
    expect(create.input).toContain(PR_SECTION_START);
    expect(create.input).toContain("## Summary");
  });

  test("draft mode adds --draft only on create", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    await createOrUpdatePullRequest({ ...base, mode: "draft", runner });
    const create = ghCalls(calls).find((c) => c.args[1] === "create")!;
    expect(create.args).toContain("--draft");
  });

  test("updates only the generated section of an automation-owned PR", async () => {
    const existingBody = `Hand written intro\n\n${wrapGeneratedSection("old report")}\n\nReviewer notes`;
    const { runner, calls } = fakeRunner((c) =>
      c.args[0] === "pr" && c.args[1] === "list"
        ? {
            stdout: JSON.stringify([
              { number: 7, url: "https://github.com/acme/widgets/pull/7", body: existingBody, isDraft: true,
                headRefName: "integration", baseRefName: "main", isCrossRepository: false },
            ]),
          }
        : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner, body: "new report" });
    expect(res).toMatchObject({ status: "updated", number: 7 });
    expect(ghCalls(calls).some((c) => c.args[1] === "create")).toBe(false);

    const edit = ghCalls(calls).find((c) => c.args[1] === "edit")!;
    expect(edit.args.slice(0, 3)).toEqual(["pr", "edit", "7"]);
    expect(edit.input).toContain("Hand written intro");
    expect(edit.input).toContain("Reviewer notes");
    expect(edit.input).toContain("new report");
    expect(edit.input).not.toContain("old report");
    // draft status and title are never silently changed
    for (const flag of ["--draft", "--ready", "--title", "--base"]) {
      expect(edit.args).not.toContain(flag);
    }
  });

  test("an unchanged generated section is not re-edited", async () => {
    const body = wrapGeneratedSection("same");
    const { runner, calls } = fakeRunner((c) =>
      c.args[1] === "list"
        ? { stdout: JSON.stringify([{ number: 7, url: "https://github.com/acme/widgets/pull/7", body,
            headRefName: "integration", baseRefName: "main", isCrossRepository: false }]) }
        : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner, body: "same" });
    expect(res.status).toBe("skipped");
    expect(res.reason).toBe("up-to-date");
    expect(ghCalls(calls).some((c) => c.args[1] === "edit")).toBe(false);
  });

  test("never overwrites a manually authored PR description", async () => {
    const { runner, calls } = fakeRunner((c) =>
      c.args[1] === "list"
        ? { stdout: JSON.stringify([{ number: 9, url: "https://github.com/acme/widgets/pull/9", body: "Written by a human",
            headRefName: "integration", baseRefName: "main", isCrossRepository: false }]) }
        : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res).toMatchObject({ status: "skipped", reason: "unowned-pr", number: 9 });
    expect(ghCalls(calls).some((c) => c.args[1] === "edit" || c.args[1] === "create")).toBe(false);
  });

  test("ignores PRs from forks or other head/base pairs", async () => {
    const { runner, calls } = fakeRunner((c) =>
      c.args[1] === "list"
        ? { stdout: JSON.stringify([
            { number: 1, url: "https://github.com/acme/widgets/pull/1", body: wrapGeneratedSection("x"),
              headRefName: "integration", baseRefName: "main", isCrossRepository: true },
            { number: 2, url: "https://github.com/acme/widgets/pull/2", body: wrapGeneratedSection("x"),
              headRefName: "integration", baseRefName: "other", isCrossRepository: false },
          ]) }
        : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res.status).toBe("created");
    expect(ghCalls(calls).some((c) => c.args[1] === "edit")).toBe(false);
  });

  test("missing gh stops before any API call", async () => {
    const { runner, calls } = fakeRunner((c) =>
      c.command === "gh" ? { exitCode: 127, spawnError: "ENOENT" } : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res).toMatchObject({ status: "failed", reason: "gh-missing" });
    expect(ghCalls(calls)).toHaveLength(1);
  });

  test("unauthenticated gh fails before listing or creating", async () => {
    const { runner, calls } = fakeRunner((c) =>
      c.args[0] === "auth" ? { exitCode: 1, stderr: "not logged in" } : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res).toMatchObject({ status: "failed", reason: "unauthenticated" });
    expect(ghCalls(calls).some((c) => c.args[0] === "pr")).toBe(false);
  });

  test("non-GitHub remote fails without calling gh pr", async () => {
    const { runner, calls } = fakeRunner((c) =>
      c.command === "git" ? { stdout: "https://example.com/a/b.git\n" } : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "draft", runner });
    expect(res).toMatchObject({ status: "failed", reason: "non-github-remote" });
    expect(ghCalls(calls).some((c) => c.args[0] === "pr")).toBe(false);
  });

  test("API errors on create are sanitized failures", async () => {
    const { runner } = fakeRunner((c) =>
      c.args[1] === "create"
        ? { exitCode: 1, stderr: "GraphQL: boom\npassword=hunter2 token ghp_" + "z".repeat(30) }
        : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res.status).toBe("failed");
    expect(res.reason).toBe("api-error");
    expect(res.message).not.toContain("hunter2");
    expect(res.message).not.toContain("ghp_");
  });

  test("timeouts are reported as such", async () => {
    const { runner } = fakeRunner((c) =>
      c.args[1] === "list" ? { exitCode: 124, timedOut: true } : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res).toMatchObject({ status: "failed", reason: "timeout" });
  });

  test("unparseable list output is a failure, not a duplicate PR", async () => {
    const { runner, calls } = fakeRunner((c) =>
      c.args[1] === "list" ? { stdout: "not json" } : undefined
    );
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res.status).toBe("failed");
    expect(ghCalls(calls).some((c) => c.args[1] === "create")).toBe(false);
  });

  test("create without a reported URL is a failure", async () => {
    const { runner } = fakeRunner((c) => (c.args[1] === "create" ? { stdout: "ok" } : undefined));
    const res = await createOrUpdatePullRequest({ ...base, mode: "open", runner });
    expect(res.status).toBe("failed");
  });

  test("rejects invalid or identical head/base without running anything", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    expect((await createOrUpdatePullRequest({ ...base, mode: "open", runner, head: "main" })).status).toBe("failed");
    expect((await createOrUpdatePullRequest({ ...base, mode: "open", runner, head: "--evil" })).status).toBe("failed");
    expect(calls).toHaveLength(0);
  });

  test("titles are single-line and shell metacharacters stay literal args", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    await createOrUpdatePullRequest({ ...base, mode: "open", runner, title: "x $(rm -rf /)\nsecond `line`" });
    const create = ghCalls(calls).find((c) => c.args[1] === "create")!;
    const title = create.args[create.args.indexOf("--title") + 1]!;
    expect(title).not.toContain("\n");
    expect(title).toContain("$(rm -rf /)");
  });

  test("never uses --web, --fill or interactive flags", async () => {
    const { runner, calls } = fakeRunner(() => undefined);
    await createOrUpdatePullRequest({ ...base, mode: "draft", runner });
    for (const c of ghCalls(calls)) {
      for (const bad of ["--web", "--fill", "--editor", "-w", "--dry-run"]) {
        expect(c.args).not.toContain(bad);
      }
    }
  });
});

describe("defaultCommandRunner", () => {
  test("reports a missing executable instead of throwing", async () => {
    const res = await defaultCommandRunner("definitely-not-a-real-binary-xyz", [], { timeoutMs: 2000 });
    expect(res.exitCode).not.toBe(0);
    expect(res.spawnError).toBeDefined();
  });

  test("passes stdin and captures stdout", async () => {
    const res = await defaultCommandRunner("cat", [], { timeoutMs: 5000, input: "hello" });
    expect(res.stdout).toBe("hello");
    expect(res.exitCode).toBe(0);
  });

  test("kills commands that exceed the timeout", async () => {
    const res = await defaultCommandRunner("sleep", ["5"], { timeoutMs: 100 });
    expect(res.timedOut).toBe(true);
  });
});
