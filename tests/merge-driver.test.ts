import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import YAML from "yaml";
import {
  mergeMetaYaml,
  mergeTaskYaml,
  mergeDriverMain,
  setupMergeDriver,
  GITATTRIBUTES_LINES,
} from "../src/lib/merge-driver";
import { makeRepo, makeTempDir, writeRepoFile, commitAll, git, gitRaw } from "./helpers/git-repo";

const meta = (updated: string, extra = "") =>
  `version: "1.0"\nmeta:\n  created_at: 2026-04-15T17:34:20.063Z\n  updated_at: ${updated}\n  project: unknown\n${extra}`;

const task = (o: Record<string, unknown>) =>
  YAML.stringify({ id: "a", title: "T", status: "backlog", priority: "low", depends_on: ["x"], notes: [], ...o });

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("mergeMetaYaml", () => {
  test("newest timestamp wins, deterministic", () => {
    const b = meta("2026-01-01T00:00:00.000Z");
    const o = meta("2026-02-01T00:00:00.000Z");
    const t = meta("2026-03-01T00:00:00.000Z");
    const r1 = mergeMetaYaml(b, o, t);
    const r2 = mergeMetaYaml(b, t, o);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(YAML.parse(r1.content).meta.updated_at).toBe("2026-03-01T00:00:00.000Z");
      expect(r1.content).toBe(r2.content);
    }
  });
  test("unions fields added on both sides", () => {
    const b = meta("2026-01-01T00:00:00.000Z");
    const r = mergeMetaYaml(b, meta("2026-02-01T00:00:00.000Z", "  a: 1\n"), meta("2026-03-01T00:00:00.000Z", "  b: 2\n"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(YAML.parse(r.content).meta).toMatchObject({ a: 1, b: 2 });
  });
  test("non-timestamp divergence is a conflict", () => {
    const b = meta("2026-01-01T00:00:00.000Z");
    const r = mergeMetaYaml(b, b.replace("unknown", "p1"), b.replace("unknown", "p2"));
    expect(r.ok).toBe(false);
  });
  test("invalid YAML is a conflict", () => {
    expect(mergeMetaYaml("a: 1\n", "a: [\n", "a: 2\n").ok).toBe(false);
  });
});

describe("mergeTaskYaml", () => {
  test("disjoint field edits merge", () => {
    const b = task({});
    const r = mergeTaskYaml(b, task({ status: "done" }), task({ priority: "high" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(YAML.parse(r.content)).toMatchObject({ status: "done", priority: "high" });
  });
  test("same field different values conflicts", () => {
    expect(mergeTaskYaml(task({}), task({ status: "done" }), task({ status: "in_progress" })).ok).toBe(false);
  });
  test("same field same value merges", () => {
    expect(mergeTaskYaml(task({}), task({ status: "done" }), task({ status: "done", priority: "high" })).ok).toBe(true);
  });
  test("arrays union when both only added", () => {
    const r = mergeTaskYaml(task({}), task({ depends_on: ["x", "y"], notes: ["n1"] }), task({ depends_on: ["x", "z"], notes: ["n2"] }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const d = YAML.parse(r.content);
      expect(d.depends_on).toEqual(["x", "y", "z"]);
      expect(d.notes).toEqual(["n1", "n2"]);
    }
  });
  test("array removal on one side with edit on the other conflicts", () => {
    const r = mergeTaskYaml(task({}), task({ depends_on: [] }), task({ depends_on: ["x", "z"] }));
    expect(r.ok).toBe(false);
  });
  test("one side deleted, other edited conflicts", () => {
    const r = mergeTaskYaml(task({}), task({ priority: undefined }), task({ priority: "high" }));
    expect(r.ok).toBe(false);
  });
});

describe("mergeDriverMain", () => {
  test("writes result to %A and returns 0; 1 on conflict leaving %A", () => {
    const d = makeTempDir("wombo-md-");
    dirs.push(d);
    const [bp, op, tp] = ["b", "o", "t"].map((n) => join(d, n));
    writeFileSync(bp, task({}));
    writeFileSync(op, task({ status: "done" }));
    writeFileSync(tp, task({ priority: "high" }));
    expect(mergeDriverMain([bp, op, tp])).toBe(0);
    expect(YAML.parse(readFileSync(op, "utf-8"))).toMatchObject({ status: "done", priority: "high" });
    writeFileSync(op, task({ status: "done" }));
    writeFileSync(tp, task({ status: "blocked" }));
    expect(mergeDriverMain([bp, op, tp])).toBe(1);
    expect(readFileSync(op, "utf-8")).toBe(task({ status: "done" }));
    expect(mergeDriverMain([bp])).toBe(1);
  });
});

describe("setupMergeDriver", () => {
  test("idempotent", () => {
    const repo = makeRepo();
    dirs.push(repo);
    const first = setupMergeDriver(repo);
    expect(first).toEqual({ gitattributesChanged: true, configChanged: true });
    const second = setupMergeDriver(repo);
    expect(second).toEqual({ gitattributesChanged: false, configChanged: false });
    const attrs = readFileSync(join(repo, ".gitattributes"), "utf-8");
    for (const l of GITATTRIBUTES_LINES) expect(attrs.split("\n").filter((x) => x === l).length).toBe(1);
    expect(git(repo, "config", "--local", "merge.woco-meta.driver")).toContain("merge-meta %O %A %B");
  });
});

describe("real git end-to-end", () => {
  function setup() {
    const repo = makeRepo();
    dirs.push(repo);
    const script = join(repo, "..", `driver-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`);
    const mod = resolve(import.meta.dir, "../src/lib/merge-driver");
    writeFileSync(script, `import { mergeDriverMain } from ${JSON.stringify(mod)};\nprocess.exit(mergeDriverMain(process.argv.slice(2)));\n`);
    dirs.push(script);
    setupMergeDriver(repo, { command: `bun ${script} %O %A %B` });
    writeRepoFile(repo, ".wombo-combo/tasks/_meta.yml", meta("2026-01-01T00:00:00.000Z"));
    writeRepoFile(repo, ".wombo-combo/tasks/a.yml", task({}));
    commitAll(repo, "base");
    return repo;
  }

  test("disjoint edits and timestamps merge cleanly", () => {
    const repo = setup();
    git(repo, "checkout", "-q", "-b", "feat");
    writeRepoFile(repo, ".wombo-combo/tasks/_meta.yml", meta("2026-02-01T00:00:00.000Z"));
    writeRepoFile(repo, ".wombo-combo/tasks/a.yml", task({ status: "done" }));
    commitAll(repo, "feat");
    git(repo, "checkout", "-q", "main");
    writeRepoFile(repo, ".wombo-combo/tasks/_meta.yml", meta("2026-03-01T00:00:00.000Z"));
    writeRepoFile(repo, ".wombo-combo/tasks/a.yml", task({ priority: "high" }));
    commitAll(repo, "main");
    const res = gitRaw(repo, "merge", "feat", "-m", "merge");
    expect(res.status).toBe(0);
    expect(YAML.parse(readFileSync(join(repo, ".wombo-combo/tasks/_meta.yml"), "utf-8")).meta.updated_at).toBe("2026-03-01T00:00:00.000Z");
    expect(YAML.parse(readFileSync(join(repo, ".wombo-combo/tasks/a.yml"), "utf-8"))).toMatchObject({ status: "done", priority: "high" });
  });

  test("same-field edit still conflicts", () => {
    const repo = setup();
    git(repo, "checkout", "-q", "-b", "feat");
    writeRepoFile(repo, ".wombo-combo/tasks/a.yml", task({ status: "done" }));
    commitAll(repo, "feat");
    git(repo, "checkout", "-q", "main");
    writeRepoFile(repo, ".wombo-combo/tasks/a.yml", task({ status: "blocked" }));
    commitAll(repo, "main");
    const res = gitRaw(repo, "merge", "feat", "-m", "merge");
    expect(res.status).not.toBe(0);
    expect(gitRaw(repo, "status", "--porcelain").stdout).toContain("UU .wombo-combo/tasks/a.yml");
    expect(existsSync(join(repo, ".git/MERGE_HEAD"))).toBe(true);
  });
});
