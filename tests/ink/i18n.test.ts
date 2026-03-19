/**
 * i18n.test.ts — Tests for the TUI i18n skeleton.
 *
 * TDD: written before the implementation.
 *
 * Covers:
 *   - Module exports: t(), createI18n(), I18nContext, useI18n(), EN_STRINGS
 *   - t() looks up a key from the strings map
 *   - t() returns the key itself when no match (safe fallback)
 *   - t() interpolates {{var}} placeholders
 *   - t() handles missing variables gracefully (leaves placeholder as-is)
 *   - createI18n() returns a bound t() for a given locale
 *   - English locale covers all required string categories
 */

import { describe, test, expect } from "bun:test";

describe("i18n module exports", () => {
  test("exports t, createI18n, I18nContext, useI18n, EN_STRINGS", async () => {
    const mod = await import("../../src/ink/i18n");
    expect(mod.t).toBeDefined();
    expect(mod.createI18n).toBeDefined();
    expect(mod.I18nContext).toBeDefined();
    expect(mod.useI18n).toBeDefined();
    expect(mod.EN_STRINGS).toBeDefined();
  });
});

describe("t() key lookup", () => {
  test("returns string value for a known key", async () => {
    const { t } = await import("../../src/ink/i18n");
    // The English strings map must have at least some key we can test
    const result = t("status.running");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("returns the key itself for an unknown key (safe fallback)", async () => {
    const { t } = await import("../../src/ink/i18n");
    const key = "totally.unknown.key.xyz";
    expect(t(key)).toBe(key);
  });
});

describe("t() interpolation", () => {
  test("interpolates {{var}} placeholders", async () => {
    const { t } = await import("../../src/ink/i18n");
    // Use a key that has an interpolation placeholder, or test createI18n with custom strings
    const { createI18n } = await import("../../src/ink/i18n");
    const myT = createI18n({ "hello": "Hello, {{name}}!" });
    expect(myT("hello", { name: "World" })).toBe("Hello, World!");
  });

  test("handles multiple placeholders in one string", async () => {
    const { createI18n } = await import("../../src/ink/i18n");
    const myT = createI18n({ "msg": "{{a}} and {{b}}" });
    expect(myT("msg", { a: "foo", b: "bar" })).toBe("foo and bar");
  });

  test("leaves placeholder as-is when variable is missing", async () => {
    const { createI18n } = await import("../../src/ink/i18n");
    const myT = createI18n({ "msg": "Hello, {{name}}!" });
    // No vars passed — placeholder stays
    expect(myT("msg")).toBe("Hello, {{name}}!");
  });

  test("extra variables are silently ignored", async () => {
    const { createI18n } = await import("../../src/ink/i18n");
    const myT = createI18n({ "msg": "Hi {{name}}" });
    expect(myT("msg", { name: "Alice", extra: "ignored" })).toBe("Hi Alice");
  });
});

describe("createI18n()", () => {
  test("returns a function", async () => {
    const { createI18n } = await import("../../src/ink/i18n");
    expect(typeof createI18n({})).toBe("function");
  });

  test("returned t() falls back to key for unknown keys", async () => {
    const { createI18n } = await import("../../src/ink/i18n");
    const myT = createI18n({ "a.b": "value" });
    expect(myT("not.here")).toBe("not.here");
  });
});

describe("EN_STRINGS completeness", () => {
  test("has status category keys", async () => {
    const { EN_STRINGS } = await import("../../src/ink/i18n");
    // Must have entries for agent statuses
    expect(EN_STRINGS["status.running"]).toBeDefined();
    expect(EN_STRINGS["status.queued"]).toBeDefined();
    expect(EN_STRINGS["status.completed"]).toBeDefined();
    expect(EN_STRINGS["status.failed"]).toBeDefined();
    expect(EN_STRINGS["status.verified"]).toBeDefined();
    expect(EN_STRINGS["status.merged"]).toBeDefined();
    expect(EN_STRINGS["status.retry"]).toBeDefined();
    expect(EN_STRINGS["status.installing"]).toBeDefined();
    expect(EN_STRINGS["status.resolving_conflict"]).toBeDefined();
  });

  test("has ui category keys", async () => {
    const { EN_STRINGS } = await import("../../src/ink/i18n");
    expect(EN_STRINGS["ui.quit"]).toBeDefined();
    expect(EN_STRINGS["ui.back"]).toBeDefined();
    expect(EN_STRINGS["ui.confirm"]).toBeDefined();
    expect(EN_STRINGS["ui.cancel"]).toBeDefined();
  });

  test("all values are non-empty strings", async () => {
    const { EN_STRINGS } = await import("../../src/ink/i18n");
    for (const [key, val] of Object.entries(EN_STRINGS)) {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

describe("I18nContext and useI18n()", () => {
  test("I18nContext is a valid React context", async () => {
    const { I18nContext } = await import("../../src/ink/i18n");
    expect(I18nContext).toBeDefined();
    expect(typeof I18nContext.Provider).toBe("object");
  });

  test("useI18n returns a function", async () => {
    const { useI18n } = await import("../../src/ink/i18n");
    expect(typeof useI18n).toBe("function");
  });
});
