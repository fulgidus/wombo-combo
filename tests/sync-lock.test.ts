import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { lockPath, withSyncLock } from "../src/lib/sync/lock";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-lock-"));
  mkdirSync(join(root, ".wombo-combo", "sync"), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("withSyncLock", () => {
  test("holds a lock file with pid, host and timestamp, removed afterwards", async () => {
    await withSyncLock(root, async () => {
      const data = JSON.parse(readFileSync(lockPath(root), "utf8"));
      expect(data.pid).toBe(process.pid);
      expect(data.host).toBe(hostname());
      expect(typeof data.at).toBe("number");
    });
    expect(existsSync(lockPath(root))).toBe(false);
  });

  test("serialises concurrent holders in one process", async () => {
    const order: string[] = [];
    const hold = (n: string) => withSyncLock(root, async () => {
      order.push(`in${n}`);
      await new Promise((r) => setTimeout(r, 20));
      order.push(`out${n}`);
    });
    await Promise.all([hold("1"), hold("2")]);
    expect(order).toEqual(["in1", "out1", "in2", "out2"]);
  });

  test("is re-entrant for nested calls", async () => {
    const v = await withSyncLock(root, () => withSyncLock(root, async () => 7));
    expect(v).toBe(7);
  });

  test("takes over a stale lock (old timestamp)", async () => {
    writeFileSync(lockPath(root), JSON.stringify({ pid: process.pid, host: "other", at: Date.now() - 3 * 60_000 }));
    let ran = false;
    await withSyncLock(root, async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test("takes over a lock whose pid is dead on this host", async () => {
    writeFileSync(lockPath(root), JSON.stringify({ pid: 2 ** 22 + 12345, host: hostname(), at: Date.now() }));
    let ran = false;
    await withSyncLock(root, async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test("gives up with a warning when a live lock persists, and still runs", async () => {
    writeFileSync(lockPath(root), JSON.stringify({ pid: process.pid, host: "other-host", at: Date.now() }));
    const warns: string[] = [];
    let ran = false;
    await withSyncLock(root, async () => { ran = true; }, { waitMs: 150, warn: (m) => warns.push(m) });
    expect(ran).toBe(true);
    expect(warns).toHaveLength(1);
    expect(existsSync(lockPath(root))).toBe(true); // not ours, left alone
  });
});
