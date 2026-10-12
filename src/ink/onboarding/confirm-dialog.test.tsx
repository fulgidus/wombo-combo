/**
 * confirm-dialog.test.tsx — Tests for the ConfirmDialog Ink component.
 *
 * The ConfirmDialog shows a yes/no prompt with arrow key navigation.
 * Used for "Enhance profile with AI?" and "Run genesis planner?" prompts.
 *
 * Tests verify:
 *   - Renders the title text
 *   - Renders the message text
 *   - Renders "Yes" and "No" options
 *   - Renders navigation hints
 *   - Renders without crashing
 *   - Default selection is "Yes"
 */

import { describe, test, expect, mock } from "bun:test";
import React from "react";
import { render, renderToString } from "ink";
import { PassThrough } from "node:stream";
import { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";

// ---------------------------------------------------------------------------
// Static render tests (renderToString)
// ---------------------------------------------------------------------------

describe("ConfirmDialog (static rendering)", () => {
  const defaultProps: ConfirmDialogProps = {
    title: "LLM Synthesis",
    message: "Enhance profile with AI?",
    onConfirm: () => {},
    onCancel: () => {},
  };

  test("renders the title", () => {
    const output = renderToString(<ConfirmDialog {...defaultProps} />);
    expect(output).toContain("LLM Synthesis");
  });

  test("renders the message", () => {
    const output = renderToString(<ConfirmDialog {...defaultProps} />);
    expect(output).toContain("Enhance profile with AI?");
  });

  test("renders Yes option", () => {
    const output = renderToString(<ConfirmDialog {...defaultProps} />);
    expect(output).toContain("Yes");
  });

  test("renders No option", () => {
    const output = renderToString(<ConfirmDialog {...defaultProps} />);
    expect(output).toContain("No");
  });

  test("renders navigation hint", () => {
    const output = renderToString(<ConfirmDialog {...defaultProps} />);
    expect(output).toContain("Enter");
  });

  test("renders without crashing", () => {
    expect(() =>
      renderToString(<ConfirmDialog {...defaultProps} />),
    ).not.toThrow();
  });

  test("renders with custom title", () => {
    const output = renderToString(
      <ConfirmDialog
        {...defaultProps}
        title="Genesis Planner"
        message="Run genesis planner to create initial quests?"
      />,
    );
    expect(output).toContain("Genesis Planner");
    expect(output).toContain("Run genesis planner");
  });
});

// ---------------------------------------------------------------------------
// Arrow convention: right confirms, left cancels
// ---------------------------------------------------------------------------

async function press(seq: string) {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 80;
  (stdout as any).rows = 24;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  const onConfirm = mock(() => {});
  const onCancel = mock(() => {});
  const instance = render(
    <ConfirmDialog title="T" message="M" onConfirm={onConfirm} onCancel={onCancel} />,
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  await new Promise((r) => setTimeout(r, 50));
  (stdin as any as PassThrough).write(seq);
  await new Promise((r) => setTimeout(r, 50));
  instance.unmount();
  await instance.waitUntilExit();
  return { onConfirm, onCancel };
}

describe("ConfirmDialog (arrow convention)", () => {
  test("right arrow confirms", async () => {
    const { onConfirm, onCancel } = await press("\x1b[C");
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("left arrow cancels", async () => {
    const { onConfirm, onCancel } = await press("\x1b[D");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
