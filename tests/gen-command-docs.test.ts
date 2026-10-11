import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandDef } from "../src/lib/schema";
import { COMMAND_REGISTRY, GLOBAL_FLAGS } from "../src/lib/schema";
import {
  GENERATED_BANNER,
  commandSlug,
  escapeCell,
  generateCommandDocs,
  renderCommandPage,
  renderIndexPage,
  writeCommandDocs,
} from "../scripts/gen-command-docs";

const sample: CommandDef = {
  name: "demo",
  aliases: ["d"],
  summary: "Demo command",
  description: "Longer text with a | pipe and <angle> brackets.",
  positionals: [{ name: "target", description: "What to act on", required: true }],
  flags: [
    { name: "--mode", alias: "-m", description: "Pick a mode", type: "string", enum: ["a", "b"], default: "a" },
    { name: "--force", description: "Local override", type: "boolean", required: true },
  ],
  mutating: true,
  supportsDryRun: true,
  subcommands: [
    {
      name: "demo run",
      aliases: ["r"],
      summary: "Run it",
      positionals: [],
      flags: [{ name: "--n", description: "Count", type: "number", default: 3 }],
      mutating: false,
      supportsDryRun: false,
    },
  ],
};

describe("escapeCell", () => {
  test("escapes pipes, angle brackets and newlines", () => {
    expect(escapeCell("a | b <c>\nd")).toBe("a \\| b &lt;c&gt; d");
  });
});

describe("commandSlug", () => {
  test("uses the top-level command name", () => {
    expect(commandSlug("tasks")).toBe("tasks");
    expect(commandSlug("tasks list")).toBe("tasks");
  });
});

describe("renderCommandPage", () => {
  const page = renderCommandPage(sample);

  test("has frontmatter, banner and usage", () => {
    expect(page.startsWith("---\ntitle: demo\n")).toBe(true);
    expect(page).toContain(GENERATED_BANNER);
    expect(page).toContain("woco demo <subcommand> <target> [flags]");
    expect(page).toContain("Aliases: `d`");
  });

  test("lists flags with alias, enum and default", () => {
    expect(page).toContain("`--mode`");
    expect(page).toContain("`-m`");
    expect(page).toContain("`a`, `b`");
    expect(page).toContain("`\"a\"`");
  });

  test("does not list global flags overridden by the command twice", () => {
    const top = page.split("## demo run")[0];
    expect((top.match(/`--force`/g) ?? []).length).toBe(1);
    expect(page).toContain("`--output`");
  });

  test("renders subcommands as sections", () => {
    expect(page).toContain("## demo run");
    expect(page).toContain("woco demo run [flags]");
    expect(page).toContain("`--n`");
  });

  test("escapes markdown-sensitive description text", () => {
    expect(page).toContain("a \\| pipe");
    expect(page).toContain("&lt;angle&gt;");
  });

  test("is deterministic", () => {
    expect(renderCommandPage(sample)).toBe(page);
  });
});

describe("renderIndexPage", () => {
  test("links every command and documents global flags", () => {
    const index = renderIndexPage([sample]);
    expect(index).toContain(GENERATED_BANNER);
    expect(index).toContain("[`demo`](./demo/)");
    for (const f of GLOBAL_FLAGS) expect(index).toContain(`\`${f.name}\``);
  });
});

describe("generateCommandDocs", () => {
  test("produces an index and one page per top-level command", () => {
    const files = generateCommandDocs(COMMAND_REGISTRY);
    expect(files.has("index.md")).toBe(true);
    for (const cmd of COMMAND_REGISTRY) expect(files.has(`${commandSlug(cmd.name)}.md`)).toBe(true);
    expect(files.size).toBe(COMMAND_REGISTRY.length + 1);
  });

  test("every real flag appears in its command page", () => {
    const files = generateCommandDocs(COMMAND_REGISTRY);
    for (const cmd of COMMAND_REGISTRY) {
      const page = files.get(`${commandSlug(cmd.name)}.md`)!;
      for (const f of [cmd, ...(cmd.subcommands ?? [])].flatMap((c) => c.flags)) {
        expect(page).toContain(`\`${f.name}\``);
      }
    }
  });

  test("two runs are byte-identical", () => {
    const a = generateCommandDocs(COMMAND_REGISTRY);
    const b = generateCommandDocs(COMMAND_REGISTRY);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
});

describe("writeCommandDocs", () => {
  test("writes files and removes stale generated pages", () => {
    const dir = mkdtempSync(join(tmpdir(), "gen-cmd-docs-"));
    try {
      writeCommandDocs(dir, [sample]);
      expect(readdirSync(dir).sort()).toEqual(["demo.md", "index.md"]);
      expect(readFileSync(join(dir, "demo.md"), "utf-8")).toBe(renderCommandPage(sample));
      // second run with a different registry deletes the stale page
      writeCommandDocs(dir, [{ ...sample, name: "other", subcommands: undefined }]);
      expect(readdirSync(dir).sort()).toEqual(["index.md", "other.md"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
