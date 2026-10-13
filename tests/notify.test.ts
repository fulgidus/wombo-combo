import { describe, test, expect } from "bun:test";
import { desktopNotifyCommand, notifyDesktop } from "../src/lib/notify";

describe("notify", () => {
  test("linux uses notify-send with argv, control characters stripped", () => {
    const cmd = desktopNotifyCommand("linux", "wombo: a has a question", "line1\nline2\u0007 $(rm -rf /)")!;
    expect(cmd[0]).toBe("notify-send");
    expect(cmd.at(-1)).toBe("line1 line2 $(rm -rf /)");
    expect(cmd).toContain("--urgency=critical");
  });

  test("macOS builds a quoted osascript line; unknown platforms return null", () => {
    const cmd = desktopNotifyCommand("darwin", "t", 'say "hi"')!;
    expect(cmd[0]).toBe("osascript");
    expect(cmd[2]).toContain('display notification "say \\"hi\\""');
    expect(desktopNotifyCommand("win32", "t", "b")).toBeNull();
  });

  test("long bodies are truncated", () => {
    expect(desktopNotifyCommand("linux", "t", "x".repeat(500))!.at(-1)!.length).toBeLessThanOrEqual(200);
  });

  test("WOMBO_NO_NOTIFY disables, spawn failure is swallowed", () => {
    const calls: string[][] = [];
    expect(notifyDesktop("t", "b", { platform: "linux", env: { WOMBO_NO_NOTIFY: "1" }, spawn: (c) => calls.push(c) })).toBe(false);
    expect(calls).toEqual([]);
    expect(notifyDesktop("t", "b", { platform: "linux", env: {}, spawn: (c) => calls.push(c) })).toBe(true);
    expect(calls).toHaveLength(1);
    expect(notifyDesktop("t", "b", { platform: "linux", env: {}, spawn: () => { throw new Error("ENOENT"); } })).toBe(false);
  });
});
