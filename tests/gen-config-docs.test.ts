import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GENERATED_BANNER,
  flattenSchema,
  formatType,
  renderConfigPage,
} from "../scripts/gen-config-docs";

const schema = {
  title: "Demo",
  description: "Demo config",
  type: "object",
  properties: {
    baseBranch: { type: "string", default: "main", description: "Base | branch" },
    build: {
      type: "object",
      properties: {
        command: { type: "string", default: "npm run build", description: "Build command" },
        timeout: { type: "integer", default: 300000, minimum: 0, description: "ms" },
      },
    },
    bin: { type: ["string", "null"], default: null, description: "Binary" },
    files: { type: "array", items: { type: "string" }, default: ["a"], description: "Files" },
    level: { type: "string", enum: ["x", "y"], description: "Level" },
  },
};

describe("formatType", () => {
  test("handles unions, arrays and enums", () => {
    expect(formatType({ type: ["string", "null"] })).toBe("string \\| null");
    expect(formatType({ type: "array", items: { type: "string" } })).toBe("string[]");
    expect(formatType({ type: "string", enum: ["x"] })).toBe("string");
  });
});

describe("flattenSchema", () => {
  test("flattens nested objects to dotted keys, keeping schema order", () => {
    const rows = flattenSchema(schema);
    expect(rows.map((r) => r.key)).toEqual([
      "baseBranch",
      "build.command",
      "build.timeout",
      "bin",
      "files",
      "level",
    ]);
  });
});

describe("renderConfigPage", () => {
  const page = renderConfigPage(schema);

  test("has frontmatter, banner and grouped sections", () => {
    expect(page.startsWith("---\ntitle: Configuration reference\n")).toBe(true);
    expect(page).toContain(GENERATED_BANNER);
    expect(page).toContain("## Top-level options");
    expect(page).toContain("## `build`");
    expect(page).toContain("`build.command`");
  });

  test("renders defaults, enums, minimum and escapes pipes", () => {
    expect(page).toContain('`"npm run build"`');
    expect(page).toContain("`300000`");
    expect(page).toContain("`null`");
    expect(page).toContain("Values: `x`, `y`");
    expect(page).toContain("Minimum: `0`");
    expect(page).toContain("Base \\| branch");
  });

  test("is deterministic", () => {
    expect(renderConfigPage(schema)).toBe(page);
  });
});

describe("real schema", () => {
  const real = JSON.parse(readFileSync(resolve(import.meta.dir, "../schemas/config.schema.json"), "utf-8"));

  test("every leaf property of config.schema.json is documented", () => {
    const page = renderConfigPage(real);
    const rows = flattenSchema(real);
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) expect(page).toContain(`\`${row.key}\``);
  });
});
