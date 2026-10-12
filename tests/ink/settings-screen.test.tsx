/**
 * settings-screen.test.tsx — Tests for the SettingsScreen TUI component.
 *
 * TDD: written before the implementation.
 *
 * Covers:
 *   - Module exports: SettingsScreen, SettingsSection, SettingsField
 *   - SettingsScreen renders a title ("Settings")
 *   - SettingsScreen renders category sections
 *   - SettingsSectionrendered with a heading label
 *   - SettingsField renders a key and a value
 *   - SettingsField shows edit cursor when selected
 *   - Theme picker renders theme names
 *   - Locale picker renders locale options
 *   - "Reset to defaults" option present
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";

describe("settings-screen module exports", () => {
  test("exports SettingsScreen, SettingsSection, SettingsField", async () => {
    const mod = await import("../../src/ink/settings-screen");
    expect(mod.SettingsScreen).toBeDefined();
    expect(mod.SettingsSection).toBeDefined();
    expect(mod.SettingsField).toBeDefined();
  });
});

describe("SettingsScreen rendering", () => {
  test("renders 'Settings' title", async () => {
    const { SettingsScreen } = await import("../../src/ink/settings-screen");
    const output = renderToString(
      React.createElement(SettingsScreen, {
        config: {},
        onSave: () => {},
        onBack: () => {},
      })
    );
    expect(output).toContain("Settings");
  });

  test("renders tui section", async () => {
    const { SettingsScreen } = await import("../../src/ink/settings-screen");
    const output = renderToString(
      React.createElement(SettingsScreen, {
        config: {},
        onSave: () => {},
        onBack: () => {},
      })
    );
    // Should show a TUI / Appearance section
    expect(output.toLowerCase()).toMatch(/tui|appearance|theme/i);
  });

  test("renders theme picker with theme names", async () => {
    const { SettingsScreen } = await import("../../src/ink/settings-screen");
    const output = renderToString(
      React.createElement(SettingsScreen, {
        config: { tui: { theme: "default", locale: "en" } },
        onSave: () => {},
        onBack: () => {},
      })
    );
    expect(output).toContain("default");
  });

  test("renders reset-to-defaults option", async () => {
    const { SettingsScreen } = await import("../../src/ink/settings-screen");
    const output = renderToString(
      React.createElement(SettingsScreen, {
        config: {},
        onSave: () => {},
        onBack: () => {},
      })
    );
    expect(output.toLowerCase()).toContain("reset");
  });
});

describe("SettingsSection", () => {
  test("renders section heading", async () => {
    const { SettingsSection } = await import("../../src/ink/settings-screen");
    const { Text } = await import("ink");
    const output = renderToString(
      React.createElement(
        SettingsSection,
        { title: "My Section" },
        React.createElement(Text, {}, "content")
      )
    );
    expect(output).toContain("My Section");
    expect(output).toContain("content");
  });
});

describe("SettingsField", () => {
  test("renders field key and value", async () => {
    const { SettingsField } = await import("../../src/ink/settings-screen");
    const output = renderToString(
      React.createElement(SettingsField, {
        label: "Theme",
        value: "default",
        selected: false,
        onEdit: () => {},
      })
    );
    expect(output).toContain("Theme");
    expect(output).toContain("default");
  });

  test("shows selection indicator when selected", async () => {
    const { SettingsField } = await import("../../src/ink/settings-screen");
    const selected = renderToString(
      React.createElement(SettingsField, {
        label: "Theme",
        value: "default",
        selected: true,
        onEdit: () => {},
      })
    );
    const notSelected = renderToString(
      React.createElement(SettingsField, {
        label: "Theme",
        value: "default",
        selected: false,
        onEdit: () => {},
      })
    );
    expect(selected).not.toBe(notSelected);
  });
});

describe("provider and model settings", () => {
  const config = {
    agentProfiles: {
      fast: { harness: "claude-code", model: "haiku", provider: "anthropic" },
      deep: { harness: "codex", model: "gpt-x" },
    },
    routing: { default: "fast" },
    modelRouting: { light: "haiku", medium: null, heavy: null },
  } as const;

  test("renders profiles, default routing profile and model routing", async () => {
    const { SettingsScreen } = await import("../../src/ink/settings-screen");
    const output = renderToString(
      React.createElement(SettingsScreen, { config: config as any, onSave: () => {}, onBack: () => {} })
    );
    expect(output).toContain("Providers & models");
    expect(output).toContain("deep");
    expect(output).toContain("claude-code");
    expect(output).toContain("gpt-x");
    expect(output).toContain("Default profile");
    expect(output).toContain("Light model");
    expect(output).toContain("haiku");
  });

  test("cycleOption wraps and starts at the first option for unknown values", async () => {
    const { cycleOption } = await import("../../src/ink/settings-screen");
    expect(cycleOption(["a", "b"], "a")).toBe("b");
    expect(cycleOption(["a", "b"], "b")).toBe("a");
    expect(cycleOption(["a", "b"], "zzz")).toBe("a");
    expect(cycleOption([null, "m"], null)).toBe("m");
  });

  test("modelOptions lists null, profile models and the current value", async () => {
    const { modelOptions } = await import("../../src/ink/settings-screen");
    expect(modelOptions(config as any, "custom-model")).toEqual([null, "haiku", "gpt-x", "custom-model"]);
  });
});
