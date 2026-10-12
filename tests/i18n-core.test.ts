/**
 * i18n-core.test.ts — i18next core: detection, interpolation, pluralization,
 * fallback and dev-mode missing-key reporting.
 */

import { afterEach, describe, expect, test, spyOn } from "bun:test";
import {
  AVAILABLE_LOCALES,
  clearMissingKeys,
  detectLocale,
  getFixedT,
  getLocale,
  getMissingKeys,
  hasKey,
  initI18n,
  isMsg,
  msg,
  normalizeLocale,
  renderMsg,
  setLocale,
  t,
} from "../src/lib/i18n";
import { DEFAULT_CONFIG } from "../src/config";

afterEach(() => {
  setLocale("en");
  initI18n({ env: { WOMBO_LOCALE: "en" } });
  clearMissingKeys();
});

describe("normalizeLocale", () => {
  test("strips encoding and region", () => {
    expect(normalizeLocale("en_US.UTF-8")).toBe("en");
    expect(normalizeLocale("EN")).toBe("en");
    expect(normalizeLocale("en-GB")).toBe("en");
  });
  test("ignores C, POSIX, auto, empty and unsupported", () => {
    for (const v of ["C", "POSIX", "auto", "", undefined, null, "xx_YY"]) {
      expect(normalizeLocale(v as any)).toBeUndefined();
    }
  });
});

describe("detectLocale precedence", () => {
  const locales = AVAILABLE_LOCALES;
  test("defaults to en with an empty env", () => {
    expect(detectLocale({ env: {} })).toBe("en");
  });
  test("env chain order: WOMBO_LOCALE > LC_ALL > LC_MESSAGES > LANG", () => {
    // Use "en" vs unsupported codes to prove which variable was consulted
    expect(detectLocale({ env: { LANG: "xx_XX" } })).toBe("en");
    if (locales.includes("it")) {
      expect(detectLocale({ env: { LANG: "it_IT.UTF-8" } })).toBe("it");
      expect(detectLocale({ env: { LC_MESSAGES: "it_IT", LANG: "en_US" } })).toBe("it");
      expect(detectLocale({ env: { LC_ALL: "it_IT", LC_MESSAGES: "en_US", LANG: "en_US" } })).toBe("it");
      expect(detectLocale({ env: { WOMBO_LOCALE: "it", LC_ALL: "en_US" } })).toBe("it");
      expect(detectLocale({ env: { WOMBO_LOCALE: "en", LC_ALL: "it_IT" } })).toBe("en");
    }
  });
  test("config wins over env; auto and unsupported fall through", () => {
    expect(detectLocale({ configLocale: "en", env: { WOMBO_LOCALE: "xx" } })).toBe("en");
    expect(detectLocale({ configLocale: "auto", env: {} })).toBe("en");
    expect(detectLocale({ configLocale: "klingon", env: {} })).toBe("en");
    if (locales.includes("it")) {
      expect(detectLocale({ configLocale: "en", env: { WOMBO_LOCALE: "it" } })).toBe("en");
      expect(detectLocale({ configLocale: "auto", env: { WOMBO_LOCALE: "it" } })).toBe("it");
    }
  });
  test("config default is auto so env detection works out of the box", () => {
    expect(DEFAULT_CONFIG.tui.locale).toBe("auto");
  });
});

describe("interpolation", () => {
  test("substitutes {{vars}}", () => {
    expect(t("splash.version", { version: "1.2.3" })).toBe("v1.2.3");
    expect(t("dashboard.throughputUnit", { minutes: 10 })).toBe("completions/min, last 10m");
  });
  test("does not HTML-escape values", () => {
    expect(t("splash.version", { version: "<&>" })).toBe("v<&>");
  });
  test("leaves unresolved placeholders visible", () => {
    expect(t("splash.version")).toBe("v{{version}}");
  });
  test("unknown key returns the key", () => {
    expect(t("no.such.key")).toBe("no.such.key");
  });
});

describe("pluralization", () => {
  test("one vs other", () => {
    expect(t("wave.agentCount", { count: 1 })).toBe("1 agent");
    expect(t("wave.agentCount", { count: 0 })).toBe("0 agents");
    expect(t("wave.agentCount", { count: 3 })).toBe("3 agents");
  });
  test("hasKey resolves plural base names", () => {
    expect(hasKey("en", "wave.agentCount")).toBe(true);
    expect(hasKey("en", "wave.nope")).toBe(false);
  });
});

describe("fixed locale and Msg", () => {
  test("getFixedT with unsupported locale resolves to en", () => {
    expect(getFixedT("xx")("status.running")).toBe("Running");
  });
  test("msg/renderMsg", () => {
    const m = msg("wave.agentCount", { count: 2 });
    expect(isMsg(m)).toBe(true);
    expect(renderMsg(m)).toBe("2 agents");
    expect(renderMsg(m, "en")).toBe("2 agents");
    expect(renderMsg("plain")).toBe("plain");
  });
  test("initI18n applies detection and updates getLocale", () => {
    expect(initI18n({ configLocale: "en", env: {} })).toBe("en");
    expect(getLocale()).toBe("en");
  });
});

describe("missing keys", () => {
  test("reported once on stderr in dev mode and recorded", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    initI18n({ env: {}, devMode: true });
    t("missing.key.one");
    t("missing.key.one");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("missing.key.one");
    expect(getMissingKeys()).toContain("en:missing.key.one");
    spy.mockRestore();
  });
  test("silent without dev mode", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    initI18n({ env: {}, devMode: false });
    t("missing.key.two");
    expect(spy).not.toHaveBeenCalled();
    expect(getMissingKeys()).toContain("en:missing.key.two");
    spy.mockRestore();
  });
  test("WOMBO_I18N_DEBUG=1 enables reporting", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    initI18n({ env: { WOMBO_I18N_DEBUG: "1" } });
    t("missing.key.three");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
