/**
 * modal-opaque.test.tsx — A Modal overlaid on other content must hide it.
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import { Box, Text, render } from "ink";
import { PassThrough } from "node:stream";
import { Modal } from "./modal";

function streams() {
  const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
  (stdout as any).columns = 40;
  (stdout as any).rows = 12;
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream;
  (stdin as any).isTTY = true;
  (stdin as any).setRawMode = () => stdin;
  (stdin as any).ref = () => stdin;
  (stdin as any).unref = () => stdin;
  return { stdout, stdin };
}

describe("Modal", () => {
  test("is opaque: content behind it does not show through", async () => {
    const { stdout, stdin } = streams();
    let out = "";
    stdout.on("data", (c: Buffer) => { out += c.toString(); });
    const background = Array.from({ length: 12 }, () => "#".repeat(40)).join("\n");
    const instance = render(
      <Box width={40} height={12}>
        <Text>{background}</Text>
        <Box position="absolute" width={40} height={12} alignItems="center" justifyContent="center">
          <Modal title="Hi">
            <Text>body</Text>
            <Text> </Text>
            <Text>x</Text>
          </Modal>
        </Box>
      </Box>,
      { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await new Promise((r) => setTimeout(r, 120));
    instance.unmount();
    const last = out.slice(out.lastIndexOf("╭") - 40);
    const rows = last.split("\n").filter((l) => /[╭│╰]/.test(l));
    expect(rows.length).toBeGreaterThan(2);
    expect(out).toContain("body");
    for (const line of rows) {
      const start = line.search(/[╭│╰]/);
      const end = Math.max(line.lastIndexOf("╮"), line.lastIndexOf("│"), line.lastIndexOf("╯"));
      expect(line.slice(start + 1, end)).not.toContain("#");
    }
  });
});
