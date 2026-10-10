import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendChangelogEntry,
  formatChangelogEntry,
  hasOperationMarker,
  operationMarker,
} from "../src/lib/changelog";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "wombo-changelog-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const TS = "2026-03-20T10:15:00.000Z";
const read = () => readFileSync(join(dir, "CHANGELOG.md"), "utf-8");

function entry(over: Partial<Parameters<typeof appendChangelogEntry>[1]> = {}) {
  return {
    operationId: "main-abc1234",
    timestamp: TS,
    tasks: [
      { id: "task-b", title: "Second" },
      { id: "task-a", title: "First" },
    ],
    ...over,
  };
}

describe("formatChangelogEntry", () => {
  test("is dated, contains the marker, and sorts tasks", () => {
    const text = formatChangelogEntry(entry());
    expect(text).toBe(
      [
        "## 2026-03-20",
        "",
        "<!-- wombo-combo:operation:main-abc1234 -->",
        "",
        "- **task-a**: First",
        "- **task-b**: Second",
      ].join("\n")
    );
  });

  test("uses the supplied timestamp, not the clock", () => {
    expect(formatChangelogEntry(entry({ timestamp: "2001-02-03T04:05:06Z" }))).toContain("## 2001-02-03");
  });

  test("rejects invalid timestamps and unsafe operation IDs", () => {
    expect(() => formatChangelogEntry(entry({ timestamp: "nope" }))).toThrow(/timestamp/);
    expect(() => formatChangelogEntry(entry({ operationId: "x --> <b>" }))).toThrow(/operation ID/);
    expect(() => formatChangelogEntry(entry({ operationId: "" }))).toThrow(/operation ID/);
  });

  test("escapes markdown in titles and deduplicates task ids", () => {
    const text = formatChangelogEntry(
      entry({ tasks: [{ id: "t", title: "Use *glob* <x>" }, { id: "t", title: "Use *glob* <x>" }] })
    );
    expect(text).toContain("Use \\*glob\\* \\<x\\>");
    expect(text.match(/\*\*t\*\*/g)).toHaveLength(1);
  });

  test("handles empty task lists", () => {
    expect(formatChangelogEntry(entry({ tasks: [] }))).toContain("no task details recorded");
  });
});

describe("appendChangelogEntry", () => {
  test("creates a minimal document when no file exists", () => {
    const res = appendChangelogEntry(dir, entry());
    expect(res.changed).toBe(true);
    expect(res.action).toBe("created");
    expect(read().startsWith("# Changelog\n\n## 2026-03-20\n")).toBe(true);
    expect(read().endsWith("\n")).toBe(true);
  });

  test("appends to existing content without modifying it", () => {
    const original = "# Changelog\n\n## 1.0.0\n\n- Manual entry\n- Another *manual* one\n";
    writeFileSync(join(dir, "CHANGELOG.md"), original);
    const res = appendChangelogEntry(dir, entry());
    expect(res.action).toBe("appended");
    const out = read();
    expect(out.startsWith(original)).toBe(true);
    expect(out).toContain("<!-- wombo-combo:operation:main-abc1234 -->");
    expect(out.slice(original.length).startsWith("\n## 2026-03-20")).toBe(true);
  });

  test("handles a missing trailing newline", () => {
    const original = "# Changelog\n\n- manual";
    writeFileSync(join(dir, "CHANGELOG.md"), original);
    appendChangelogEntry(dir, entry());
    const out = read();
    expect(out.startsWith(original + "\n\n## 2026-03-20")).toBe(true);
  });

  test("does not add extra blank lines when the file already ends with one", () => {
    writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\n\n");
    appendChangelogEntry(dir, entry());
    expect(read().startsWith("# Changelog\n\n## 2026-03-20")).toBe(true);
  });

  test("is idempotent per operation (no second entry, unchanged)", () => {
    appendChangelogEntry(dir, entry());
    const first = read();
    const again = appendChangelogEntry(dir, entry({ timestamp: "2030-01-01T00:00:00Z" }));
    expect(again.changed).toBe(false);
    expect(again.action).toBe("duplicate");
    expect(read()).toBe(first);
  });

  test("distinct operations each get an entry", () => {
    appendChangelogEntry(dir, entry());
    const res = appendChangelogEntry(dir, entry({ operationId: "main-def5678" }));
    expect(res.changed).toBe(true);
    const out = read();
    expect(hasOperationMarker(out, "main-abc1234")).toBe(true);
    expect(hasOperationMarker(out, "main-def5678")).toBe(true);
  });

  test("marker for a prefix id does not match a longer id", () => {
    appendChangelogEntry(dir, entry({ operationId: "op-12" }));
    expect(hasOperationMarker(read(), "op-1")).toBe(false);
    expect(appendChangelogEntry(dir, entry({ operationId: "op-1" })).changed).toBe(true);
  });

  test("preserves Unicode content and writes Unicode titles", () => {
    writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\n\n- 日本語の項目 ✓ café\n");
    appendChangelogEntry(dir, entry({ tasks: [{ id: "uni", title: "Añadir soporte 日本語 🚀" }] }));
    const out = read();
    expect(out).toContain("日本語の項目 ✓ café");
    expect(out).toContain("Añadir soporte 日本語 🚀");
  });

  test("preserves CRLF line endings of existing files", () => {
    writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\r\n\r\n- manual\r\n");
    appendChangelogEntry(dir, entry());
    const out = read();
    expect(out.startsWith("# Changelog\r\n\r\n- manual\r\n")).toBe(true);
    expect(out.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });

  test("treats a blank existing file like a new one", () => {
    writeFileSync(join(dir, "CHANGELOG.md"), "\n\n");
    appendChangelogEntry(dir, entry());
    expect(read().startsWith("# Changelog\n\n## 2026-03-20")).toBe(true);
  });

  test("leaves no temporary files behind", () => {
    appendChangelogEntry(dir, entry());
    appendChangelogEntry(dir, entry({ operationId: "other" }));
    expect(readdirSync(dir)).toEqual(["CHANGELOG.md"]);
  });

  test("refuses to rewrite a symlinked changelog", () => {
    writeFileSync(join(dir, "real.md"), "# real\n");
    symlinkSync(join(dir, "real.md"), join(dir, "CHANGELOG.md"));
    expect(() => appendChangelogEntry(dir, entry())).toThrow(/symlink/);
    expect(readFileSync(join(dir, "real.md"), "utf-8")).toBe("# real\n");
  });

  test("invalid input does not create the file", () => {
    expect(() => appendChangelogEntry(dir, entry({ operationId: "bad id" }))).toThrow();
    expect(readdirSync(dir)).toEqual([]);
  });
});
