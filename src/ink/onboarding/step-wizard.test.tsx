/**
 * step-wizard.test.tsx — Tests for the StepWizard Ink component.
 *
 * The StepWizard is a multi-step wizard that collects raw input fields
 * from the user. Each step shows a label, prompt, and either a text input,
 * textarea, or selection list.
 *
 * Tests verify:
 *   - Renders the first step with correct label/prompt
 *   - Shows step counter (e.g. "Step 1/8")
 *   - Renders selection list for the type step
 *   - Renders text input for non-selection steps
 *   - Shows navigation hints (Esc to go back)
 */

import { describe, test, expect, mock } from "bun:test";
import React from "react";
import { render, renderToString } from "ink";
import { PassThrough } from "node:stream";
import { StepWizard, type StepWizardProps } from "./step-wizard";
import { ChromeLayout } from "../chrome";

// ---------------------------------------------------------------------------
// Static render tests (renderToString)
// ---------------------------------------------------------------------------

describe("StepWizard (static rendering)", () => {
  const defaultProps: StepWizardProps = {
    onComplete: () => {},
    onCancel: () => {},
  };

  test("renders the first step label", () => {
    const output = renderToString(<StepWizard {...defaultProps} />);
    expect(output).toContain("Project Type");
  });

  test("renders step counter", () => {
    const output = renderToString(<StepWizard {...defaultProps} />);
    expect(output).toContain("Step 1/8");
  });

  test("renders the prompt text for first step", () => {
    const output = renderToString(<StepWizard {...defaultProps} />);
    expect(output).toContain("new project");
  });

  test("renders selection items for type step", () => {
    const output = renderToString(<StepWizard {...defaultProps} />);
    expect(output).toContain("brownfield");
    expect(output).toContain("greenfield");
  });

  test("renders navigation hint", () => {
    const output = renderToString(<StepWizard {...defaultProps} />);
    // First step shows "Esc to cancel" since there's no step to go back to
    expect(output).toContain("Esc");
  });

  test("renders Project Onboarding header", () => {
    const output = renderToString(<StepWizard {...defaultProps} />);
    expect(output).toContain("Project Onboarding");
  });

  test("renders without crashing", () => {
    expect(() =>
      renderToString(<StepWizard {...defaultProps} />),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Keyboard interaction tests (q quits on selection steps, types on text steps)
// ---------------------------------------------------------------------------

function createTestStreams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 80;
  (stdout as any).rows = 40;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  return { stdin, stdout };
}

const tick = () => new Promise((r) => setTimeout(r, 30));

describe("StepWizard (q key)", () => {
  test("q on the selection step calls onQuit", async () => {
    const { stdin, stdout } = createTestStreams();
    const onQuit = mock(() => {});
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const instance = render(
      <StepWizard onComplete={onComplete} onCancel={onCancel} onQuit={onQuit} />,
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await tick();
    stdin.write("q");
    await tick();
    instance.unmount();

    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  test("q typed into a text field is inserted, not treated as quit", async () => {
    const { stdin, stdout } = createTestStreams();
    const onQuit = mock(() => {});
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    let output = "";
    stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    const instance = render(
      <StepWizard onComplete={onComplete} onCancel={onCancel} onQuit={onQuit} />,
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await tick();
    // Select "brownfield" on the type step -> moves to the first text step.
    stdin.write("\r");
    await tick();
    stdin.write("q");
    await tick();
    // Enter submits the field. If q had been swallowed or quit, the field
    // would be empty and the wizard would show "cannot be empty" instead.
    stdin.write("\r");
    await tick();
    instance.unmount();

    expect(onQuit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(output).not.toContain("cannot be empty");
    expect(output).toContain("Step 3/8");
  });
});

// ---------------------------------------------------------------------------
// Bottom chrome quit hint (q quits on selection steps only)
// ---------------------------------------------------------------------------

// Strip ANSI styling so "q" and " quit" (separate styled Text nodes) read as "q quit".
const plain = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

function renderWizardInChrome() {
  const { stdin, stdout } = createTestStreams();
  let output = "";
  stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  const instance = render(
    <ChromeLayout screenName="Setup" daemonConnected={false}>
      <StepWizard onComplete={() => {}} onCancel={() => {}} onQuit={() => {}} />
    </ChromeLayout>,
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );
  return {
    stdin,
    instance,
    /** Output written since the returned offset (only frames rendered after it). */
    mark: () => output.length,
    since: (offset: number) => plain(output.slice(offset)),
    all: () => plain(output),
  };
}

describe("StepWizard quit hint in ChromeLayout", () => {
  test("selection step still advertises q quit", async () => {
    const w = renderWizardInChrome();
    await tick();
    expect(w.all()).toContain("q quit");
    w.instance.unmount();
  });

  test("text step does not advertise q quit", async () => {
    const w = renderWizardInChrome();
    await tick();
    // Select "brownfield" -> first text step (Project Name).
    w.stdin.write("\r");
    await tick();
    const mark = w.mark();
    // Type a letter so a fresh frame of the text step is rendered.
    w.stdin.write("q");
    await tick();
    w.instance.unmount();

    const frames = w.since(mark);
    expect(frames).toContain("Step 2/8");
    expect(frames).toContain("ESC");
    expect(frames).not.toContain("q quit");
  });

  test("q quit hint returns when navigating back to the selection step", async () => {
    const w = renderWizardInChrome();
    await tick();
    w.stdin.write("\r");
    await tick();
    // Esc on the first text step goes back to the selection step.
    w.stdin.write("\x1b");
    await tick();
    const mark = w.mark();
    // Move the cursor to re-render the selection list.
    w.stdin.write("\x1b[B");
    await tick();
    w.instance.unmount();

    const frames = w.since(mark);
    expect(frames).toContain("Step 1/8");
    expect(frames).toContain("q quit");
  });
});
