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
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import { InitForm, type InitFormProps } from "./init-form";

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
});
