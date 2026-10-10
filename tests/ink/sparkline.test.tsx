import { describe, test, expect } from "bun:test";
import React from "react";
import { renderToString } from "ink";
import {
  ASCII_LEVELS,
  Sparkline,
  UNICODE_LEVELS,
  formatSparkline,
} from "../../src/ink/sparkline";
import { ThemeContext, getTheme } from "../../src/ink/theme";

const UNI = /[▁-█]/;

describe("formatSparkline", () => {
  test("scales samples across levels", () => {
    expect(formatSparkline([0, 1, 2, 3, 4, 5, 6, 7], 8)).toBe("▁▂▃▄▅▆▇█");
    expect(formatSparkline([0, 10], 5)).toBe("▁█");
  });

  test("never exceeds requested width and keeps the most recent samples", () => {
    const s = formatSparkline([9, 9, 9, 0, 1, 2, 3], 4);
    expect(s).toHaveLength(4);
    expect(s).toBe(formatSparkline([0, 1, 2, 3], 4, { max: 3 }));
    for (const w of [0, 1, 2, 10, 100]) {
      expect(formatSparkline(Array.from({ length: 60 }, (_, i) => i), w).length).toBeLessThanOrEqual(Math.max(0, w));
    }
  });

  test("handles width edge cases", () => {
    expect(formatSparkline([1, 2], 0)).toBe("");
    expect(formatSparkline([1, 2], -3)).toBe("");
    expect(formatSparkline([1, 2], NaN)).toBe("");
    expect(formatSparkline([1, 2], 2.9)).toHaveLength(2);
  });

  test("empty samples render nothing", () => {
    expect(formatSparkline([], 10)).toBe("");
    expect(formatSparkline(null, 10)).toBe("");
    expect(formatSparkline(undefined, 10)).toBe("");
  });

  test("invalid values render as zero and never throw", () => {
    const s = formatSparkline([NaN, Infinity, -Infinity, -4, "x" as any, null as any, 5], 7);
    expect(s).toBe("▁▁▁▁▁▁█");
  });

  test("zero-only data is flat at the lowest level", () => {
    expect(formatSparkline([0, 0, 0, 0], 4)).toBe("▁▁▁▁");
    expect(formatSparkline([0, 0, 0], 3, { max: 10 })).toBe("▁▁▁");
  });

  test("constant nonzero data is flat", () => {
    const s = formatSparkline([3, 3, 3, 3], 4);
    expect(new Set(s).size).toBe(1);
    expect(s).not.toContain("▁");
  });

  test("small positive values stay distinguishable from zero", () => {
    const s = formatSparkline([0, 0.0001, 1000], 3);
    expect(s[0]).toBe("▁");
    expect(s[1]).toBe("▂");
    expect(s[2]).toBe("█");
  });

  test("explicit max gives consistent scaling and ignores bad max", () => {
    expect(formatSparkline([1], 1, { max: 7 })).toBe("▂");
    expect(formatSparkline([7], 1, { max: 1 })).toBe("█");
    expect(formatSparkline([4], 1, { max: 0 })).toBe("█");
    expect(formatSparkline([4], 1, { max: NaN })).toBe("█");
  });

  test("ASCII mode emits only ASCII", () => {
    const s = formatSparkline([0, 1, 2, 3, 4, 5, 6, 7], 8, { ascii: true });
    expect(s).toBe(ASCII_LEVELS.join(""));
    expect(s).not.toMatch(UNI);
    // eslint-disable-next-line no-control-regex
    expect(/^[ -~]+$/.test(s)).toBe(true);
    expect(formatSparkline([0, 0], 2, { ascii: true })).toBe("__");
    expect(UNICODE_LEVELS).toHaveLength(8);
  });

  test("one column per glyph for large inputs", () => {
    const s = formatSparkline(Array.from({ length: 1000 }, (_, i) => i % 9), 60);
    expect([...s]).toHaveLength(60);
  });
});

describe("Sparkline component", () => {
  test("renders graph and caller label", () => {
    const out = renderToString(<Sparkline samples={[0, 1, 2]} width={10} label="peak 2/min" />);
    expect(out).toMatch(UNI);
    expect(out).toContain("peak 2/min");
  });

  test("minimal theme renders ASCII only", () => {
    const out = renderToString(
      <ThemeContext.Provider value={getTheme("minimal")}>
        <Sparkline samples={[0, 1, 2, 5]} width={10} />
      </ThemeContext.Provider>,
    );
    expect(out).not.toMatch(UNI);
    expect(out).toBe("_-:#");
  });

  test("default theme renders unicode; explicit ascii overrides", () => {
    expect(renderToString(<Sparkline samples={[1, 2]} width={4} />)).toMatch(UNI);
    expect(renderToString(<Sparkline samples={[1, 2]} width={4} ascii />)).not.toMatch(UNI);
  });

  test("graph honors width", () => {
    const out = renderToString(<Sparkline samples={Array.from({ length: 60 }, (_, i) => i)} width={12} />);
    expect([...out.replace(/\s/g, "")]).toHaveLength(12);
  });
});
