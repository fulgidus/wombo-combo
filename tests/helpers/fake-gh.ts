/**
 * Fake command runner for post-merge tests: real `git` (against disposable
 * local repositories) plus an in-memory stand-in for the GitHub CLI. No network
 * access ever happens.
 */

import {
  defaultCommandRunner,
  type CommandResult,
  type CommandRunner,
} from "../../src/lib/github-pr";

export interface FakePr {
  number: number;
  url: string;
  title: string;
  body: string;
  isDraft: boolean;
  headRefName: string;
  baseRefName: string;
}

export interface RecordedCall {
  command: string;
  args: string[];
  input?: string;
}

export interface FakeGhOptions {
  /** Simulate a missing gh executable */
  missing?: boolean;
  /** Simulate `gh auth status` failing */
  unauthenticated?: boolean;
  /** Default branch reported by `gh repo view` */
  defaultBranch?: string;
  /** URL reported by `git remote get-url` (the real remote stays a local path) */
  githubUrl?: string;
}

export interface FakeGh {
  runner: CommandRunner;
  calls: RecordedCall[];
  prs: FakePr[];
  ghCalls(): RecordedCall[];
  /** Index in `calls` of the first call matching command and leading args */
  indexOf(command: string, ...leading: string[]): number;
}

const ok = (stdout = ""): CommandResult => ({ exitCode: 0, stdout, stderr: "" });

export function makeFakeGh(options: FakeGhOptions = {}): FakeGh {
  const calls: RecordedCall[] = [];
  const prs: FakePr[] = [];
  const githubUrl = options.githubUrl ?? "git@github.com:acme/widgets.git";

  const runner: CommandRunner = async (command, args, opts) => {
    calls.push({ command, args: [...args], input: opts.input });

    if (command === "git") {
      if (args[0] === "remote" && args[1] === "get-url") return ok(githubUrl + "\n");
      return defaultCommandRunner(command, args, opts);
    }
    if (command !== "gh") return defaultCommandRunner(command, args, opts);

    if (options.missing) {
      return { exitCode: 127, stdout: "", stderr: "", spawnError: "spawn gh ENOENT" };
    }
    const [a, b] = args;
    if (a === "--version") return ok("gh version 2.40.0\n");
    if (a === "auth") {
      return options.unauthenticated
        ? { exitCode: 1, stdout: "", stderr: "You are not logged in" }
        : ok("Logged in\n");
    }
    if (a === "repo" && b === "view") {
      return ok(JSON.stringify({ defaultBranchRef: { name: options.defaultBranch ?? "main" } }));
    }
    if (a === "pr" && b === "list") {
      const head = args[args.indexOf("--head") + 1];
      const base = args[args.indexOf("--base") + 1];
      return ok(
        JSON.stringify(
          prs
            .filter((p) => p.headRefName === head && p.baseRefName === base)
            .map((p) => ({ ...p, isCrossRepository: false }))
        )
      );
    }
    if (a === "pr" && b === "create") {
      const number = prs.length + 1;
      const pr: FakePr = {
        number,
        url: `https://github.com/acme/widgets/pull/${number}`,
        title: args[args.indexOf("--title") + 1]!,
        body: opts.input ?? "",
        isDraft: args.includes("--draft"),
        headRefName: args[args.indexOf("--head") + 1]!,
        baseRefName: args[args.indexOf("--base") + 1]!,
      };
      prs.push(pr);
      return ok(pr.url + "\n");
    }
    if (a === "pr" && b === "edit") {
      const pr = prs.find((p) => p.number === Number(args[2]));
      if (!pr) return { exitCode: 1, stdout: "", stderr: "no such pr" };
      pr.body = opts.input ?? pr.body;
      return ok(pr.url + "\n");
    }
    return { exitCode: 1, stdout: "", stderr: `unexpected gh call: ${args.join(" ")}` };
  };

  return {
    runner,
    calls,
    prs,
    ghCalls: () => calls.filter((c) => c.command === "gh"),
    indexOf: (command, ...leading) =>
      calls.findIndex(
        (c) => c.command === command && leading.every((l, i) => c.args[i] === l)
      ),
  };
}
