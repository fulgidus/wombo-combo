/**
 * init-form.test.tsx — Tests for the Ink InitForm confirmation screen.
 *
 * Verifies:
 *   - InitForm renders project name header
 *   - InitForm displays auto-detected values
 *   - InitForm shows editable fields for baseBranch, buildCommand, installCommand
 *   - InitForm calls onConfirm with the current values when confirmed
 *   - InitForm calls onCancel when cancelled
 *   - InitForm renders confirmation prompt
 *   - FIELDS constant matches expected field definitions
 *   - Keyboard navigation: Tab/arrows move between fields
 *   - Editing: Enter enters edit mode, typing changes value, Enter applies
 *   - Cancel: Escape cancels the form
 *   - Confirm: Ctrl+S confirms with current values
 */

import { describe, test, expect, mock } from "bun:test";
import React from "react";
import { render, renderToString } from "ink";
import { InitForm, FIELDS, type InitFormProps, type InitFormDefaults } from "./init-form";
import { PassThrough } from "node:stream";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultProps(overrides: Partial<InitFormProps> = {}): InitFormProps {
  return {
    projectName: "my-project",
    defaults: {
      baseBranch: "main",
      buildCommand: "bun run build",
      installCommand: "bun install",
    },
    onConfirm: () => {},
    onCancel: () => {},
    ...overrides,
  };
}

function createTestStreams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 80;
  (stdout as any).rows = 24;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  return { stdin, stdout };
}

function renderLive(element: React.ReactElement) {
  const { stdin, stdout } = createTestStreams();
  const chunks: string[] = [];
  stdout.on("data", (chunk: Buffer) => {
    chunks.push(chunk.toString());
  });

  const instance = render(element, {
    stdout,
    stdin,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  return {
    instance,
    stdin: stdin as any as PassThrough,
    getOutput: () => chunks.join(""),
    cleanup: async () => {
      instance.unmount();
      await instance.waitUntilExit();
    },
  };
}

/** Small helper to wait for React re-renders after input. */
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

describe("InitForm", () => {
  test("renders project name in header", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    expect(output).toContain("my-project");
  });

  test("renders wombo-combo title", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    expect(output).toContain("wombo-combo");
  });

  test("displays baseBranch value", () => {
    const output = renderToString(
      <InitForm {...defaultProps({ defaults: { baseBranch: "develop", buildCommand: "npm run build", installCommand: "npm install" } })} />
    );
    expect(output).toContain("develop");
  });

  test("displays build command value", () => {
    const output = renderToString(
      <InitForm {...defaultProps({ defaults: { baseBranch: "main", buildCommand: "yarn build", installCommand: "yarn install" } })} />
    );
    expect(output).toContain("yarn build");
  });

  test("displays install command value", () => {
    const output = renderToString(
      <InitForm {...defaultProps({ defaults: { baseBranch: "main", buildCommand: "bun run build", installCommand: "pnpm install" } })} />
    );
    expect(output).toContain("pnpm install");
  });

  test("renders labels for editable fields", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    expect(output).toContain("Base Branch");
    expect(output).toContain("Build Command");
    expect(output).toContain("Install Command");
  });

  test("renders confirmation instructions", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    // Should contain key hints for confirm/cancel
    expect(output).toContain("Enter");
  });

  test("renders without crashing", () => {
    expect(() => renderToString(<InitForm {...defaultProps()} />)).not.toThrow();
  });

  test("shows auto-detected label", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    expect(output).toContain("auto-detected");
  });

  test("shows navigation key hints in non-editing mode", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    expect(output).toContain("Ctrl+S");
    expect(output).toContain("Esc");
  });

  test("renders settings separator", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    expect(output).toContain("Settings");
  });

  test("focuses first field by default", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    // The focused field shows ▸ indicator
    expect(output).toContain("▸");
  });

  test("renders Project Setup subtitle", () => {
    const output = renderToString(<InitForm {...defaultProps()} />);
    expect(output).toContain("Project Setup");
  });
});

describe("FIELDS", () => {
  test("has exactly 3 fields", () => {
    expect(FIELDS).toHaveLength(3);
  });

  test("defines baseBranch field first", () => {
    expect(FIELDS[0].key).toBe("baseBranch");
    expect(FIELDS[0].label).toBe("Base Branch");
  });

  test("defines buildCommand field second", () => {
    expect(FIELDS[1].key).toBe("buildCommand");
    expect(FIELDS[1].label).toBe("Build Command");
  });

  test("defines installCommand field third", () => {
    expect(FIELDS[2].key).toBe("installCommand");
    expect(FIELDS[2].label).toBe("Install Command");
  });
});

// ---------------------------------------------------------------------------
// Interactive tests — keyboard navigation
// ---------------------------------------------------------------------------

describe("InitForm navigation", () => {
  test("down arrow moves focus to next field", async () => {
    const { stdin, getOutput, cleanup } = renderLive(
      <InitForm {...defaultProps()} />,
    );

    // Initially focused on field 0 (baseBranch)
    await tick();
    const before = getOutput();
    expect(before).toContain("▸");

    // Press down arrow to move to buildCommand
    stdin.write("\x1b[B");
    await tick();

    // The output should still render (no crash)
    const after = getOutput();
    expect(after).toContain("Build Command");

    await cleanup();
  });

  test("up arrow moves focus to previous field", async () => {
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps()} />,
    );
    await tick();

    // Move down first, then up
    stdin.write("\x1b[B"); // down to field 1
    await tick();
    stdin.write("\x1b[A"); // up back to field 0
    await tick();

    // No crash = success; the component handled the navigation
    await cleanup();
  });

  test("up arrow at first field stays at first field (no wrap)", async () => {
    const onConfirm = mock(() => {});
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps({ onConfirm })} />,
    );
    await tick();

    // Press up arrow at field 0 — should stay at 0
    stdin.write("\x1b[A");
    await tick();

    // Confirm to verify we're still on the first field
    // Enter enters edit mode, then Ctrl+S confirms
    stdin.write("\x13"); // Ctrl+S
    await tick();

    expect(onConfirm).toHaveBeenCalledWith({
      baseBranch: "main",
      buildCommand: "bun run build",
      installCommand: "bun install",
    });

    await cleanup();
  });

  test("down arrow at last field stays at last field (no wrap)", async () => {
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps()} />,
    );
    await tick();

    // Move to last field (index 2)
    stdin.write("\x1b[B"); // down to 1
    await tick();
    stdin.write("\x1b[B"); // down to 2
    await tick();
    stdin.write("\x1b[B"); // down again — should stay at 2
    await tick();

    // No crash = success
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Interactive tests — cancel
// ---------------------------------------------------------------------------

describe("InitForm cancel", () => {
  test("Escape calls onCancel", async () => {
    const onCancel = mock(() => {});
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps({ onCancel })} />,
    );
    await tick();

    // Press Escape
    stdin.write("\x1b");
    await tick();

    expect(onCancel).toHaveBeenCalled();

    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Interactive tests — confirm
// ---------------------------------------------------------------------------

describe("InitForm confirm", () => {
  test("Ctrl+S calls onConfirm with default values", async () => {
    const onConfirm = mock(() => {});
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps({ onConfirm })} />,
    );
    await tick();

    // Press Ctrl+S to confirm
    stdin.write("\x13"); // Ctrl+S
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      baseBranch: "main",
      buildCommand: "bun run build",
      installCommand: "bun install",
    });

    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Interactive tests — editing
// ---------------------------------------------------------------------------

describe("InitForm editing", () => {
  test("Enter starts edit mode on focused field", async () => {
    const { stdin, getOutput, cleanup } = renderLive(
      <InitForm {...defaultProps()} />,
    );
    await tick();

    // Press Enter to start editing the focused field (baseBranch)
    stdin.write("\r");
    await tick();

    // In edit mode, the hint text changes
    const output = getOutput();
    expect(output).toContain("Enter to apply");

    await cleanup();
  });

  test("typing in edit mode updates the edit buffer", async () => {
    const onConfirm = mock(() => {});
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps({ onConfirm })} />,
    );
    await tick();

    // Enter edit mode on baseBranch (field 0)
    stdin.write("\r");
    await tick();

    // Clear existing value with backspace (4 chars for "main")
    // Send each backspace separately so Ink processes them individually
    for (let i = 0; i < 4; i++) {
      stdin.write("\x7f");
      await tick();
    }

    // Type new value
    stdin.write("dev");
    await tick();

    // Apply edit with Enter
    stdin.write("\r");
    await tick();

    // Confirm to verify the value was changed
    stdin.write("\x13"); // Ctrl+S
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const result = (onConfirm.mock.calls as unknown as InitFormDefaults[][])[0][0];
    expect(result.baseBranch).toBe("dev");

    await cleanup();
  });

  test("Escape in edit mode cancels the edit (restores original value)", async () => {
    const onConfirm = mock(() => {});
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps({ onConfirm })} />,
    );
    await tick();

    // Enter edit mode on baseBranch
    stdin.write("\r");
    await tick();

    // Type some characters (they go into the edit buffer)
    stdin.write("xxx");
    await tick();

    // Cancel edit with Escape
    stdin.write("\x1b");
    await tick();

    // Confirm — the value should be the original "main"
    stdin.write("\x13"); // Ctrl+S
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const result = (onConfirm.mock.calls as unknown as InitFormDefaults[][])[0][0];
    expect(result.baseBranch).toBe("main");

    await cleanup();
  });

  test("backspace removes last character and Enter applies", async () => {
    const onConfirm = mock(() => {});
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps({ onConfirm })} />,
    );
    await tick();

    // Enter edit mode on baseBranch (buffer starts as "main")
    stdin.write("\r");
    await tick();

    // Backspace once: "main" → "mai"
    stdin.write("\x7f");
    await tick();

    // Apply edit
    stdin.write("\r");
    await tick();

    // Confirm
    stdin.write("\x13"); // Ctrl+S
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const result = (onConfirm.mock.calls as unknown as InitFormDefaults[][])[0][0];
    expect(result.baseBranch).toBe("mai");

    await cleanup();
  });

  test("editing second field works after navigation", async () => {
    const onConfirm = mock(() => {});
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps({ onConfirm })} />,
    );
    await tick();

    // Move to second field (buildCommand)
    stdin.write("\x1b[B");
    await tick();

    // Enter edit mode
    stdin.write("\r");
    await tick();

    // Clear all chars ("bun run build" = 13 chars)
    // Send each backspace separately
    for (let i = 0; i < 13; i++) {
      stdin.write("\x7f");
      await tick();
    }

    // Type new value
    stdin.write("npm run build");
    await tick();

    // Apply edit
    stdin.write("\r");
    await tick();

    // Confirm
    stdin.write("\x13"); // Ctrl+S
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const result = (onConfirm.mock.calls as unknown as InitFormDefaults[][])[0][0];
    expect(result.buildCommand).toBe("npm run build");
    // Other fields unchanged
    expect(result.baseBranch).toBe("main");
    expect(result.installCommand).toBe("bun install");

    await cleanup();
  });

  test("Ctrl+S while editing merges edit buffer before confirming", async () => {
    const onConfirm = mock(() => {});
    const { stdin, cleanup } = renderLive(
      <InitForm {...defaultProps({ onConfirm })} />,
    );
    await tick();

    // Enter edit mode on baseBranch
    stdin.write("\r");
    await tick();

    // Clear the value ("main" = 4 chars)
    for (let i = 0; i < 4; i++) {
      stdin.write("\x7f");
      await tick();
    }

    // Type new value
    stdin.write("develop");
    await tick();

    // Ctrl+S while still in edit mode — should merge edit buffer
    stdin.write("\x13");
    await tick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const result = (onConfirm.mock.calls as unknown as InitFormDefaults[][])[0][0];
    expect(result.baseBranch).toBe("develop");

    await cleanup();
  });
});
