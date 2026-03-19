/**
 * splash-screen.test.tsx — Tests for the SplashScreen TUI component.
 *
 * TDD: written before the implementation.
 *
 * Covers:
 *   - Module exports: SplashScreen, SPLASH_TEXTS, type SplashScreenProps
 *   - SplashScreen renders the "woco" / "wombo" logo text
 *   - SplashScreen renders a splash tagline from EN_STRINGS
 *   - SplashScreen renders the version string when provided
 *   - SPLASH_TEXTS is an array of non-empty strings
 *   - SplashScreen accepts onDone callback prop
 *   - SplashScreen accepts durationMs prop
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";

describe("splash-screen module exports", () => {
  test("exports SplashScreen, SPLASH_TEXTS", async () => {
    const mod = await import("../../src/ink/splash-screen");
    expect(mod.SplashScreen).toBeDefined();
    expect(mod.SPLASH_TEXTS).toBeDefined();
  });
});

describe("SPLASH_TEXTS", () => {
  test("is a non-empty array", async () => {
    const { SPLASH_TEXTS } = await import("../../src/ink/splash-screen");
    expect(Array.isArray(SPLASH_TEXTS)).toBe(true);
    expect(SPLASH_TEXTS.length).toBeGreaterThan(0);
  });

  test("all entries are non-empty strings", async () => {
    const { SPLASH_TEXTS } = await import("../../src/ink/splash-screen");
    for (const text of SPLASH_TEXTS) {
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

describe("SplashScreen rendering", () => {
  test("renders 'woco' app name", async () => {
    const { SplashScreen } = await import("../../src/ink/splash-screen");
    const output = renderToString(
      React.createElement(SplashScreen, {
        onDone: () => {},
        durationMs: 0,
      })
    );
    expect(output.toLowerCase()).toMatch(/woco|wombo/i);
  });

  test("renders tagline from splash.tagline i18n key", async () => {
    const { SplashScreen } = await import("../../src/ink/splash-screen");
    const output = renderToString(
      React.createElement(SplashScreen, {
        onDone: () => {},
        durationMs: 0,
      })
    );
    // EN_STRINGS["splash.tagline"] = "Parallel AI development, orchestrated."
    expect(output).toContain("Parallel");
  });

  test("renders version string when provided", async () => {
    const { SplashScreen } = await import("../../src/ink/splash-screen");
    const output = renderToString(
      React.createElement(SplashScreen, {
        onDone: () => {},
        durationMs: 0,
        version: "1.2.3",
      })
    );
    expect(output).toContain("1.2.3");
  });

  test("renders a splash text from SPLASH_TEXTS", async () => {
    const { SplashScreen, SPLASH_TEXTS } = await import("../../src/ink/splash-screen");
    const output = renderToString(
      React.createElement(SplashScreen, {
        onDone: () => {},
        durationMs: 0,
        splashTextIndex: 0,
      })
    );
    expect(output).toContain(SPLASH_TEXTS[0]);
  });
});
