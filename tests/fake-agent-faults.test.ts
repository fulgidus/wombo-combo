import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  faultAt,
  faultStateDir,
  fileAttemptStore,
  parseFaultDirectives,
  recordAttempt,
  shouldFailWorktreeCreation,
} from "../src/lib/fake-agent-faults";
import { git, makeRepo, makeTempDir, removeDir } from "./helpers/git-repo";

const RUNNER = join(import.meta.dir, "..", "src", "lib", "fake-agent-runner.ts");

describe("parseFaultDirectives", () => {
  test("returns nothing without directives", () => {
    expect(parseFaultDirectives("do work FAKE_SLEEP_MS=10")).toEqual([]);
  });

  test("parses each kind", () => {
    expect(parseFaultDirectives("FAKE_FAULT=crash@before-commit")).toEqual([
      { kind: "crash", stage: "before-commit" },
    ]);
    expect(parseFaultDirectives("FAKE_FAULT=crash:3@start")).toEqual([
      { kind: "crash", stage: "start", exitCode: 3 },
    ]);
    expect(parseFaultDirectives("FAKE_FAULT=crash:SIGKILL@after-text")).toEqual([
      { kind: "crash", stage: "after-text", signal: "SIGKILL" },
    ]);
    expect(parseFaultDirectives("FAKE_FAULT=hang@after-text")).toEqual([{ kind: "hang", stage: "after-text" }]);
    expect(parseFaultDirectives("FAKE_FAULT=flaky:2@before-commit")).toEqual([
      { kind: "flaky", stage: "before-commit", failTimes: 2 },
    ]);
    expect(parseFaultDirectives("FAKE_FAULT=repeat-crash@start")).toEqual([{ kind: "repeat-crash", stage: "start" }]);
    expect(parseFaultDirectives("FAKE_FAULT=slow-shutdown:ignore")).toEqual([
      { kind: "slow-shutdown", ignoreSigterm: true },
    ]);
    expect(parseFaultDirectives("FAKE_FAULT=slow-shutdown:250")).toEqual([
      { kind: "slow-shutdown", ignoreSigtermMs: 250 },
    ]);
    expect(parseFaultDirectives("FAKE_FAULT=worktree-fail")).toEqual([{ kind: "worktree-fail" }]);
  });

  test("parses several directives in one prompt, in order", () => {
    const specs = parseFaultDirectives("x FAKE_FAULT=slow-shutdown:ignore y FAKE_FAULT=hang@start");
    expect(specs.map((s) => s.kind)).toEqual(["slow-shutdown", "hang"]);
  });

  test("skips malformed directives", () => {
    expect(parseFaultDirectives("FAKE_FAULT=crash@nowhere FAKE_FAULT=flaky@start FAKE_FAULT=bogus")).toEqual([]);
  });
});

describe("shouldFailWorktreeCreation", () => {
  test("detects the worktree-fail directive only", () => {
    expect(shouldFailWorktreeCreation("task FAKE_FAULT=worktree-fail")).toBe(true);
    expect(shouldFailWorktreeCreation("task FAKE_FAULT=crash@start")).toBe(false);
  });
});

describe("faultAt", () => {
  test("flaky crashes until failTimes attempts are used up", () => {
    const specs = parseFaultDirectives("FAKE_FAULT=flaky:2@start");
    expect(faultAt("start", specs, 1)).toEqual({ action: "crash", exitCode: 1 });
    expect(faultAt("start", specs, 2)).toEqual({ action: "crash", exitCode: 1 });
    expect(faultAt("start", specs, 3)).toBeNull();
    expect(faultAt("after-text", specs, 1)).toBeNull();
  });
});

describe("attempt counting", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) removeDir(d);
  });

  test("read-increment-write persists across store instances", () => {
    const dir = makeTempDir("fault-state-");
    dirs.push(dir);
    expect(recordAttempt(fileAttemptStore(dir, "t1"))).toBe(1);
    expect(recordAttempt(fileAttemptStore(dir, "t1"))).toBe(2);
    expect(recordAttempt(fileAttemptStore(dir, "t2"))).toBe(1);
    expect(readFileSync(join(dir, "attempts-t1.txt"), "utf-8").trim()).toBe("2");
  });

  test("state dir prefers FAKE_FAULT_STATE_DIR, else <dir>/.fake-agent", () => {
    expect(faultStateDir("/w", { FAKE_FAULT_STATE_DIR: "/s" })).toBe("/s");
    expect(faultStateDir("/w", {})).toBe(join("/w", ".fake-agent"));
  });
});

// ---------------------------------------------------------------------------
// Real runner processes
// ---------------------------------------------------------------------------

type Child = ReturnType<typeof spawnRunner>;

function spawnRunner(repo: string, prompt: string, env: Record<string, string> = {}) {
  const proc = Bun.spawn(
    ["bun", RUNNER, "run", "--format", "json", "--dir", repo, "--title", "woco: t1", prompt],
    { stdout: "pipe", stderr: "pipe", stdin: "ignore", env: { ...process.env, ...env } },
  );
  const lines: string[] = [];
  const waiters: Array<() => void> = [];
  const reader = (async () => {
    const dec = new TextDecoder();
    let buf = "";
    for await (const chunk of proc.stdout as ReadableStream<Uint8Array>) {
      buf += dec.decode(chunk);
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        lines.push(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
        waiters.splice(0).forEach((w) => w());
      }
    }
    waiters.splice(0).forEach((w) => w());
  })();
  const texts = () =>
    lines.flatMap((l) => {
      try {
        const e = JSON.parse(l);
        return e.type === "text" ? [e.part.text as string] : [];
      } catch {
        return [];
      }
    });
  /** Resolve once a text event contains `needle`; rejects if the process exits first. */
  async function waitForText(needle: string): Promise<void> {
    for (;;) {
      if (texts().some((t) => t.includes(needle))) return;
      if (proc.exitCode !== null) {
        await reader;
        if (texts().some((t) => t.includes(needle))) return;
        throw new Error(`exited (${proc.exitCode}) before "${needle}"; saw ${JSON.stringify(texts())}`);
      }
      await new Promise<void>((r) => {
        waiters.push(r);
        void proc.exited.then(() => r());
      });
    }
  }
  return { proc, lines, texts, waitForText, reader };
}

describe("fake-agent-runner faults", () => {
  const repos: string[] = [];
  const children: Child[] = [];
  const stateDirs: string[] = [];

  function setup() {
    const repo = makeRepo();
    repos.push(repo);
    return repo;
  }
  function run(repo: string, prompt: string, env?: Record<string, string>): Child {
    const c = spawnRunner(repo, prompt, env);
    children.push(c);
    return c;
  }

  afterEach(async () => {
    for (const c of children.splice(0)) {
      if (c.proc.exitCode === null) c.proc.kill("SIGKILL");
      await c.proc.exited;
      await c.reader;
      // no leaked process
      expect(c.proc.exitCode !== null || c.proc.signalCode !== null).toBe(true);
    }
    for (const r of repos.splice(0)) {
      // no leaked worktrees or branches: the runner only ever works in the repo itself
      expect(git(r, "worktree", "list", "--porcelain").match(/^worktree /gm)?.length).toBe(1);
      expect(git(r, "branch", "--format=%(refname:short)")).toBe("main");
      removeDir(r);
    }
    for (const d of stateDirs.splice(0)) removeDir(d);
  });

  test("no directives: unchanged events, a commit, exit 0, no stage markers", async () => {
    const repo = setup();
    const c = run(repo, "FAKE_SLEEP_MS=0");
    expect(await c.proc.exited).toBe(0);
    await c.reader;
    const types = c.lines.map((l) => JSON.parse(l).type);
    expect(types).toEqual(["step_start", "text", "text", "step_finish"]);
    expect(c.texts().some((t) => t.includes("stage:"))).toBe(false);
    expect(git(repo, "log", "-1", "--format=%s")).toBe("fake-agent: t1");
  });

  test("stage markers appear in order for a healthy run when FAKE_STAGES=1", async () => {
    const repo = setup();
    const c = run(repo, "FAKE_SLEEP_MS=0 FAKE_STAGES=1");
    expect(await c.proc.exited).toBe(0);
    await c.reader;
    const stages = c.texts().filter((t) => t.includes("stage:")).map((t) => t.split("stage:")[1]);
    expect(stages).toEqual(["start", "after-text", "before-commit", "after-commit", "before-finish"]);
  });

  test("crash@before-commit exits non-zero and leaves no commit", async () => {
    const repo = setup();
    const c = run(repo, "FAKE_SLEEP_MS=0 FAKE_FAULT=crash:7@before-commit");
    expect(await c.proc.exited).toBe(7);
    await c.reader;
    expect(c.texts()).toContain("[fake-agent] stage:before-commit");
    expect(git(repo, "log", "--format=%s")).toBe("initial");
  });

  test("crash@start with a signal self-kills", async () => {
    const repo = setup();
    const c = run(repo, "FAKE_FAULT=crash:SIGKILL@start");
    await c.proc.exited;
    expect(c.proc.signalCode).toBe("SIGKILL");
  });

  test("repeat-crash fails on every attempt", async () => {
    const repo = setup();
    for (let i = 0; i < 2; i++) {
      const c = run(repo, "FAKE_SLEEP_MS=0 FAKE_FAULT=repeat-crash@after-text");
      expect(await c.proc.exited).toBe(1);
    }
  });

  test("flaky:2 crashes twice across restarts, then runs healthy", async () => {
    const repo = setup();
    const stateDir = makeTempDir("fault-state-");
    stateDirs.push(stateDir);
    const codes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const c = run(repo, "FAKE_SLEEP_MS=0 FAKE_FAULT=flaky:2@before-commit", {
        FAKE_FAULT_STATE_DIR: stateDir,
      });
      codes.push(await c.proc.exited);
    }
    expect(codes).toEqual([1, 1, 0]);
    expect(readFileSync(join(stateDir, "attempts-t1.txt"), "utf-8").trim()).toBe("3");
    expect(git(repo, "log", "-1", "--format=%s")).toBe("fake-agent: t1");
  });

  test("flaky defaults the counter to <dir>/.fake-agent/attempts-<task>.txt", async () => {
    const repo = setup();
    const c = run(repo, "FAKE_SLEEP_MS=0 FAKE_FAULT=flaky:1@start");
    expect(await c.proc.exited).toBe(1);
    expect(existsSync(join(repo, ".fake-agent", "attempts-t1.txt"))).toBe(true);
  });

  test("hang@after-text blocks until SIGTERM", async () => {
    const repo = setup();
    const c = run(repo, "FAKE_SLEEP_MS=0 FAKE_FAULT=hang@after-text");
    await c.waitForText("stage:after-text");
    expect(c.proc.exitCode).toBeNull();
    c.proc.kill("SIGTERM");
    await c.proc.exited;
    expect(c.proc.signalCode).toBe("SIGTERM");
  });

  test("slow-shutdown:ignore survives SIGTERM, reports it, and dies on SIGKILL", async () => {
    const repo = setup();
    const c = run(repo, "FAKE_SLEEP_MS=0 FAKE_FAULT=slow-shutdown:ignore FAKE_FAULT=hang@after-text");
    await c.waitForText("stage:after-text");
    c.proc.kill("SIGTERM");
    await c.waitForText("sigterm-received");
    expect(c.proc.exitCode).toBeNull();
    c.proc.kill("SIGKILL");
    await c.proc.exited;
    expect(c.proc.signalCode).toBe("SIGKILL");
  });

  test("slow-shutdown:<ms> exits after the delay once SIGTERM arrives", async () => {
    const repo = setup();
    const c = run(repo, "FAKE_SLEEP_MS=0 FAKE_FAULT=slow-shutdown:50 FAKE_FAULT=hang@after-text");
    await c.waitForText("stage:after-text");
    c.proc.kill("SIGTERM");
    expect(await c.proc.exited).toBe(143);
    expect(c.texts()).toContain("[fake-agent] sigterm-received");
  });
});
