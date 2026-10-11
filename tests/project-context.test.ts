/**
 * project-context.test.ts — Project profile injection (project-store).
 *
 * Coverage:
 *   - loadProjectContext: null without project.yml, null (no throw) for
 *     unparseable YAML, section content, codebase summary opt-in, truncation
 *   - formatProjectContext: codebase summary included by default when called
 *     without options (backward compatible)
 */

import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createBlankProfile,
  formatProjectContext,
  loadProjectContext,
  PROJECT_CONTEXT_MAX_CHARS,
  saveProject,
  type ProjectProfile,
} from "../src/lib/project-store";

const TRUNCATION_MARKER = "[... project context truncated]";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "project-context-")));
  tempDirs.push(root);
  return root;
}

/** A realistic profile written through the real saveProject helper */
function richProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  const profile = createBlankProfile("acme-tool");
  return {
    ...profile,
    description: "A command line tool for acme widgets",
    type: "brownfield",
    vision: "Make widget deployment boring and reliable",
    objectives: [
      { id: "o1", text: "Ship the v2 CLI", priority: "high", status: "in_progress" } as ProjectProfile["objectives"][number],
    ],
    tech_stack: {
      runtime: "Bun",
      language: "TypeScript",
      frameworks: ["citty"],
      tools: ["bun test"],
      notes: "",
    },
    conventions: {
      commits: "conventional commits",
      branches: "feature/*",
      testing: "bun:test next to source",
      coding_style: "strict TypeScript",
      naming: "kebab-case files",
    },
    rules: [
      {
        scope: "src/",
        text: "Never import with file extensions",
        rigidity: "hard",
        consequences: "Build breaks in bundler resolution",
      } as ProjectProfile["rules"][number],
    ],
    codebase_summary: "SUMMARY-MARKER: src/index.ts exports the CLI entry point",
    ...overrides,
  };
}

function writeProfile(root: string, profile: ProjectProfile): void {
  saveProject(root, profile);
}

describe("loadProjectContext: missing or broken profile", () => {
  test("returns null when there is no project.yml", () => {
    const root = makeRoot();
    expect(loadProjectContext(root)).toBeNull();
  });

  test("returns null (does not throw) for unparseable YAML", () => {
    const root = makeRoot();
    mkdirSync(join(root, ".wombo-combo"), { recursive: true });
    writeFileSync(join(root, ".wombo-combo", "project.yml"), "name: [unclosed\n  vision: : :\n\t- bad");
    expect(() => loadProjectContext(root)).not.toThrow();
    expect(loadProjectContext(root)).toBeNull();
  });
});

describe("loadProjectContext: content", () => {
  test("includes the heading, vision and rules, from a profile saved to disk", () => {
    const root = makeRoot();
    writeProfile(root, richProfile());

    const ctx = loadProjectContext(root);
    expect(ctx).not.toBeNull();
    expect(ctx).toContain("## Project Context");
    expect(ctx).toContain("Make widget deployment boring and reliable");
    expect(ctx).toContain("### Rules");
    expect(ctx).toContain("Never import with file extensions");
    expect(ctx).toContain("[HARD]");
    expect(ctx).toContain("Build breaks in bundler resolution");
    expect(ctx).toContain("### Tech Stack");
    expect(ctx).toContain("### Conventions");
  });

  test("excludes the codebase summary by default", () => {
    const root = makeRoot();
    writeProfile(root, richProfile());

    const ctx = loadProjectContext(root);
    expect(ctx).not.toContain("### Codebase Summary");
    expect(ctx).not.toContain("SUMMARY-MARKER");
  });

  test("includes the codebase summary with includeCodebaseSummary: true", () => {
    const root = makeRoot();
    writeProfile(root, richProfile());

    const ctx = loadProjectContext(root, { includeCodebaseSummary: true });
    expect(ctx).toContain("### Codebase Summary");
    expect(ctx).toContain("SUMMARY-MARKER");
  });

  test("output has no trailing whitespace", () => {
    const root = makeRoot();
    writeProfile(root, richProfile());
    const ctx = loadProjectContext(root)!;
    expect(ctx).toBe(ctx.trimEnd());
  });
});

describe("loadProjectContext: truncation", () => {
  test("a small maxChars cuts the output and appends the truncation marker", () => {
    const root = makeRoot();
    writeProfile(root, richProfile());

    const ctx = loadProjectContext(root, { maxChars: 120 })!;
    expect(ctx.endsWith(TRUNCATION_MARKER)).toBe(true);
    // Body is capped at maxChars; the marker follows it
    const body = ctx.slice(0, ctx.length - `\n\n${TRUNCATION_MARKER}`.length);
    expect(body.length).toBeLessThanOrEqual(120);
    expect(body.startsWith("## Project Context")).toBe(true);
  });

  test("a normal profile under the default cap is not truncated", () => {
    const root = makeRoot();
    writeProfile(root, richProfile());

    const ctx = loadProjectContext(root)!;
    expect(ctx.length).toBeLessThanOrEqual(PROJECT_CONTEXT_MAX_CHARS);
    expect(ctx).not.toContain(TRUNCATION_MARKER);
  });
});

describe("loadProjectContext: malformed profiles never throw", () => {
  test("a non-string convention value returns null or text instead of throwing", () => {
    const root = makeRoot();
    const base = richProfile();
    // `naming: 2026` in YAML loads as a number, which used to crash formatting
    writeProfile(root, richProfile({
      conventions: { ...base.conventions, naming: 2026 as unknown as string },
    }));

    let ctx: string | null | undefined;
    expect(() => {
      ctx = loadProjectContext(root);
    }).not.toThrow();
    expect(ctx === null || typeof ctx === "string").toBe(true);
  });

  test("total output including the truncation marker stays within maxChars", () => {
    const root = makeRoot();
    writeProfile(root, richProfile());
    for (const maxChars of [60, 120, 500]) {
      const ctx = loadProjectContext(root, { maxChars })!;
      expect(ctx.length).toBeLessThanOrEqual(maxChars);
      expect(ctx.endsWith(TRUNCATION_MARKER)).toBe(true);
    }
  });
});

describe("formatProjectContext", () => {
  test("without options still includes the codebase summary (backward compatible)", () => {
    const text = formatProjectContext(richProfile());
    expect(text).toContain("### Codebase Summary");
    expect(text).toContain("SUMMARY-MARKER");
  });

  test("includeCodebaseSummary: false omits it", () => {
    const text = formatProjectContext(richProfile(), { includeCodebaseSummary: false });
    expect(text).not.toContain("### Codebase Summary");
  });
});
