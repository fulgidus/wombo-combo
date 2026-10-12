import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ENTRY = join(resolve(import.meta.dir, ".."), "src", "index.ts");
let dir: string;

function woco(args: string[]) {
  const env: Record<string, string | undefined> = { ...process.env, CI: "1", NO_COLOR: "1", WOMBO_AUTHOR: "tester" };
  delete env.WOMBO_OUTPUT; delete env.WOMBO_LOCALE; delete env.LANG; delete env.LC_ALL; delete env.LANGUAGE;
  const p = Bun.spawnSync(["bun", ENTRY, ...args], { cwd: dir, env: env as Record<string, string>, stdin: "ignore" });
  return { code: p.exitCode, out: p.stdout.toString().replace(/\x1b\[[0-9;]*m/g, ""), err: p.stderr.toString() };
}
const json = (args: string[]) => JSON.parse(woco([...args, "-o", "json"]).out);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "woco-triage-"));
  mkdirSync(join(dir, ".wombo-combo"), { recursive: true });
  writeFileSync(join(dir, ".wombo-combo", "config.json"), "{}\n");
  expect(woco(["tasks", "add", "t1", "Task one"]).code).toBe(0);
  expect(woco(["tasks", "add", "t2", "Task two"]).code).toBe(0);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("woco triage", () => {
  test("set moves a task and list buckets it", () => {
    const r = woco(["triage", "set", "t1", "needs-triage"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("needs-triage");
    expect(json(["triage", "list"]).needsTriage.map((e: any) => e.task.id)).toEqual(["t1"]);

    expect(woco(["triage", "set", "t1", "ready-for-agent", "--category", "bug", "--comment", "clear repro"]).code).toBe(0);
    const q = json(["triage", "list"]);
    expect(q.needsTriage).toHaveLength(0);
    expect(q.readyForAgent[0].category).toBe("bug");
    expect(woco(["triage", "list"]).out).toContain("t1");
    expect(woco(["triage", "list", "-o", "toon"]).out).toContain("t1");
  });

  test("invalid transition exits 1 with a clear message", () => {
    const r = woco(["triage", "set", "t1", "ready-for-agent", "--category", "bug"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("cannot move t1 from untriaged to ready-for-agent");
    expect(woco(["triage", "set", "t1", "bogus"]).code).toBe(1);
    expect(woco(["triage", "set", "nope", "needs-triage"]).code).toBe(1);
  });

  test("show prints task, state and comments", () => {
    woco(["triage", "set", "t1", "needs-triage", "--comment", "hello there"]);
    const out = woco(["triage", "show", "t1"]).out;
    expect(out).toContain("t1");
    expect(out).toContain("needs-triage");
    expect(out).toContain("hello there");
    const j = json(["triage", "show", "t1"]);
    expect(j.triage.state).toBe("needs-triage");
    expect(j.comments.length).toBe(1);
    expect(woco(["triage", "show", "nope"]).code).toBe(1);
  });

  test("brief adds an agent-brief skeleton comment", () => {
    woco(["triage", "set", "t1", "needs-triage"]);
    const r = json(["triage", "brief", "t1"]);
    expect(r.comment.body).toContain("## Agent Brief");
    for (const h of ["Current behavior", "Desired behavior", "Key interfaces", "Acceptance criteria", "Out of scope"]) {
      expect(r.comment.body).toContain(h);
    }
    expect(json(["comment", "list", "t1"]).comments.some((c: any) => c.body.includes("## Agent Brief"))).toBe(true);
    expect(woco(["triage", "brief", "nope"]).code).toBe(1);
  });

  test("reopen a wontfix task", () => {
    woco(["triage", "set", "t2", "needs-triage"]);
    woco(["triage", "set", "t2", "wontfix", "--category", "bug"]);
    expect(woco(["triage", "set", "t2", "needs-triage"]).code).toBe(1);
    expect(woco(["triage", "set", "t2", "needs-triage", "--reopen"]).code).toBe(0);
  });
});
