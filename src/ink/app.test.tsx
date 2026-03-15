/**
 * app.test.tsx — Tests for the Ink app shell component.
 *
 * Verifies:
 *   - App renders a welcome message
 *   - App displays status text
 *   - App can mount and unmount cleanly
 *   - renderToString produces expected output
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import { App } from "./app";

describe("App shell", () => {
  test("renders welcome text", () => {
    const output = renderToString(<App />);
    expect(output).toContain("wombo-combo");
  });

  test("renders status indicator", () => {
    const output = renderToString(<App />);
    expect(output).toContain("ready");
  });

  test("accepts a title prop", () => {
    const output = renderToString(<App title="Test Shell" />);
    expect(output).toContain("Test Shell");
  });

  test("renders without crashing (mount/unmount cycle)", () => {
    // renderToString does a full mount + render + unmount synchronously
    expect(() => renderToString(<App />)).not.toThrow();
  });
});
