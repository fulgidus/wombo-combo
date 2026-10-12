/**
 * spinner.test.tsx — Tests for the shared Spinner component.
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import { Spinner } from "./spinner";
import { THEMES, ThemeContext } from "./theme";

const DEFAULT_THEME = THEMES.default;

describe("Spinner", () => {
  test("renders the theme frame for a given frame index", () => {
    const frames = DEFAULT_THEME.spinnerFrames;
    for (let i = 0; i < frames.length; i++) {
      expect(renderToString(<Spinner frame={i} />)).toContain(frames[i]);
    }
  });

  test("wraps the frame index around the frame set", () => {
    const frames = DEFAULT_THEME.spinnerFrames;
    expect(renderToString(<Spinner frame={frames.length + 2} />)).toContain(frames[2]);
  });

  test("uses the frames of the active theme", () => {
    const theme = THEMES["high-contrast"];
    const out = renderToString(
      <ThemeContext.Provider value={theme}>
        <Spinner frame={1} />
      </ThemeContext.Provider>,
    );
    expect(out).toContain(theme.spinnerFrames[1]);
  });

  test("default frames form a rotating sequence, not an unrelated set", () => {
    // Adjacent braille frames must differ by exactly one rotating dot step;
    // the old ProgressView set (⠂⠆⠇⠃⠉⠌⠎⠋) did not.
    expect(DEFAULT_THEME.spinnerFrames).toEqual(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]);
  });
});
