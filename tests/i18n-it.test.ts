/**
 * i18n-it.test.ts — the shipped Italian locale is complete and usable.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { RESOURCES } from "../src/locales";
import { AVAILABLE_LOCALES, getFixedT, initI18n, msg, normalizeLocale, setLocale, t } from "../src/lib/i18n";
import { renderForFormat } from "../src/lib/output";

const en = RESOURCES.en;
const it = RESOURCES.it;

const placeholders = (s: string): string[] => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();

afterEach(() => {
  initI18n({ env: { WOMBO_LOCALE: "en" } });
});

describe("Italian locale resources", () => {
  test("is registered and detectable", () => {
    expect(AVAILABLE_LOCALES).toContain("it");
    expect(normalizeLocale("it_IT.UTF-8")).toBe("it");
  });

  test("has exactly the English key set", () => {
    const missing = Object.keys(en).filter((k) => !(k in it));
    // Italian also has the CLDR "many" plural category (1 000 000 …), which English lacks.
    const extra = Object.keys(it).filter((k) => !(k in en) && !(k.endsWith("_many") && k.slice(0, -5) + "_other" in en));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  test("keeps every interpolation placeholder", () => {
    const bad = Object.keys(en).filter(
      (k) => JSON.stringify(placeholders(en[k])) !== JSON.stringify(placeholders(it[k] ?? "")),
    );
    expect(bad).toEqual([]);
  });

  test("has no empty values", () => {
    expect(Object.keys(it).filter((k) => !it[k].trim() && en[k].trim())).toEqual([]);
  });
});

describe("switching to Italian", () => {
  test("TUI strings come from the it resource", () => {
    const it_t = getFixedT("it");
    const key = Object.keys(en).find((k) => en[k] !== it[k] && !k.includes("_"))!;
    expect(it_t(key)).toBe(it[key]);
  });

  test("WOMBO_LOCALE=it switches CLI text and plurals", () => {
    initI18n({ env: { WOMBO_LOCALE: "it" } });
    const one = t("cli.tasks.archive.done", { count: 1 });
    const many = t("cli.tasks.archive.done", { count: 3 });
    expect(one).not.toBe(many);
    expect(one).toContain("1");
    expect(many).toContain("3");
    expect(many).not.toBe(getFixedT("en")("cli.tasks.archive.done", { count: 3 }));
  });

  test("interpolates values", () => {
    setLocale("it");
    expect(t("cli.tasks.add.added", { id: "my-task", title: "T" })).toContain("my-task");
  });

  test("machine-readable output stays English", () => {
    setLocale("it");
    const m = msg("cli.tasks.add.added", { id: "x", title: "T" });
    expect(renderForFormat("json", m)).toBe(getFixedT("en")("cli.tasks.add.added", { id: "x", title: "T" }));
    expect(renderForFormat("text", m)).toBe(t("cli.tasks.add.added", { id: "x", title: "T" }));
  });
});
