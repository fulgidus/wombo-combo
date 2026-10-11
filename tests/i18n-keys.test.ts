/**
 * i18n-keys.test.ts — key consistency.
 *
 *  1. Every literal key passed to t() / msg() / renderMsg-style helpers in
 *     src/** exists in the `en` resources (plural base names resolve through
 *     their _one/_other/... forms).
 *  2. Every locale has the same key set as `en` (plural forms compared by base
 *     name; each plural base has the CLDR categories of that language), and the
 *     same {{placeholders}}.
 *  3. A key is defined in only one domain file per locale.
 *
 * Dynamic keys (template literals with ${...}) cannot be checked statically
 * and are skipped; prefer literal keys.
 */

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { RESOURCES } from "../src/locales";

const SRC = resolve(import.meta.dir, "../src");
const LOCALES_DIR = join(SRC, "locales");
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function isSourceFile(p: string): boolean {
  return /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) && !p.startsWith(LOCALES_DIR);
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** t("a.b") / tFn("a.b") / defaultT("a.b") / msg("a.b") / getFixedT(...)("a.b") */
const KEY_CALL = /(?:^|[^\w$])(?:t|tFn|defaultT|msg)\(\s*(["'`])([A-Za-z][\w]*(?:\.[\w]+)+)\1/g;

export function collectUsedKeys(): { key: string; file: string }[] {
  const used: { key: string; file: string }[] = [];
  for (const file of walk(SRC).filter(isSourceFile)) {
    const code = stripComments(readFileSync(file, "utf-8"));
    for (const m of code.matchAll(KEY_CALL)) {
      used.push({ key: m[2], file: relative(SRC, file) });
    }
  }
  return used;
}

function baseKey(key: string): string {
  return key.replace(PLURAL_SUFFIX, "");
}

function placeholders(value: string): string[] {
  return [...new Set([...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))].sort();
}

/** base key -> { plural: boolean, forms: Set<suffix|"">, vars: Set<string> } */
function describeResource(res: Record<string, string>) {
  const out = new Map<string, { plural: boolean; forms: Set<string>; vars: Set<string> }>();
  for (const [key, value] of Object.entries(res)) {
    const base = baseKey(key);
    const m = key.match(PLURAL_SUFFIX);
    const entry = out.get(base) ?? { plural: false, forms: new Set(), vars: new Set() };
    if (m) entry.plural = true;
    entry.forms.add(m ? m[1] : "");
    for (const v of placeholders(value)) entry.vars.add(v);
    out.set(base, entry);
  }
  return out;
}

const EN = RESOURCES.en;
const EN_DESC = describeResource(EN);
const OTHER_LOCALES = Object.keys(RESOURCES).filter((l) => l !== "en");

// ---------------------------------------------------------------------------
// 1. Keys used in code exist in en
// ---------------------------------------------------------------------------

describe("keys used in code", () => {
  const used = collectUsedKeys();

  test("scanner finds usages (guards against a broken regex)", () => {
    expect(used.length).toBeGreaterThan(5);
  });

  test("every literal key exists in en", () => {
    const missing = used.filter((u) => !EN_DESC.has(u.key));
    const report = missing.map((m) => `  ${m.key}  (${m.file})`).join("\n");
    expect(missing.length === 0 ? "" : `Keys used in code but missing from src/locales/en:\n${report}`).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 2. Locale parity with en
// ---------------------------------------------------------------------------

describe("locale files", () => {
  test("en values are non-empty strings", () => {
    for (const [k, v] of Object.entries(EN)) {
      expect(typeof v, k).toBe("string");
      expect(v.length, k).toBeGreaterThan(0);
    }
  });

  test("en plural keys have one/other", () => {
    for (const [base, d] of EN_DESC) {
      if (!d.plural) continue;
      expect([...d.forms].sort(), base).toEqual(["one", "other"]);
    }
  });

  test("plural keys use {{count}}", () => {
    for (const [key, value] of Object.entries(EN)) {
      if (PLURAL_SUFFIX.test(key) && /_other$/.test(key)) {
        expect(placeholders(value), key).toContain("count");
      }
    }
  });

  for (const lng of OTHER_LOCALES) {
    describe(`locale ${lng}`, () => {
      const res = RESOURCES[lng];
      const desc = describeResource(res);
      const categories = new Intl.PluralRules(lng).resolvedOptions().pluralCategories as string[];

      test("has the same keys as en", () => {
        const missing = [...EN_DESC.keys()].filter((k) => !desc.has(k));
        const extra = [...desc.keys()].filter((k) => !EN_DESC.has(k));
        const lines = [
          ...missing.map((k) => `  missing: ${k}`),
          ...extra.map((k) => `  extra:   ${k}`),
        ];
        expect(lines.length === 0 ? "" : `Key mismatch in ${lng}:\n${lines.join("\n")}`).toBe("");
      });

      test("plural keys have the CLDR forms of the language", () => {
        const problems: string[] = [];
        for (const [base, d] of desc) {
          const enD = EN_DESC.get(base);
          if (!enD) continue;
          if (enD.plural !== d.plural) problems.push(`  ${base}: plural-ness differs from en`);
          else if (d.plural) {
            const need = categories.filter((c) => c !== "zero" || d.forms.has("zero"));
            for (const c of need) if (!d.forms.has(c)) problems.push(`  ${base}: missing _${c}`);
            if (!d.forms.has("other")) problems.push(`  ${base}: missing _other`);
          }
        }
        expect(problems.length === 0 ? "" : `Plural problems in ${lng}:\n${problems.join("\n")}`).toBe("");
      });

      test("placeholders match en", () => {
        const problems: string[] = [];
        for (const [base, d] of desc) {
          const enD = EN_DESC.get(base);
          if (!enD) continue;
          const norm = (s: Set<string>) => [...s].filter((v) => !(v === "count" && d.plural)).sort();
          const a = norm(enD.vars);
          const b = norm(d.vars);
          if (a.join() !== b.join()) problems.push(`  ${base}: en {{${a.join(",")}}} vs ${lng} {{${b.join(",")}}}`);
        }
        expect(problems.length === 0 ? "" : `Placeholder mismatch in ${lng}:\n${problems.join("\n")}`).toBe("");
      });

      test("values are non-empty strings", () => {
        for (const [k, v] of Object.entries(res)) {
          expect(typeof v, k).toBe("string");
          expect(v.length, k).toBeGreaterThan(0);
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 3. No key defined in two domain files of the same locale
// ---------------------------------------------------------------------------

describe("domain files", () => {
  for (const lng of Object.keys(RESOURCES)) {
    test(`${lng}: keys are unique across domain files`, () => {
      const seen = new Map<string, string>();
      const dupes: string[] = [];
      const dir = join(LOCALES_DIR, lng);
      for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        const data = JSON.parse(readFileSync(join(dir, file), "utf-8")) as Record<string, unknown>;
        for (const [k, v] of Object.entries(data)) {
          expect(typeof v, `${file}:${k}`).toBe("string");
          if (seen.has(k)) dupes.push(`  ${k}: ${seen.get(k)} and ${file}`);
          seen.set(k, file);
        }
      }
      expect(dupes.length === 0 ? "" : `Duplicate keys in ${lng}:\n${dupes.join("\n")}`).toBe("");
    });
  }
});
