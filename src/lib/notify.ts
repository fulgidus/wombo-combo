/**
 * notify.ts — best-effort desktop notifications.
 *
 * Used when an agent needs a human (HITL question) so the operator does not
 * have to be staring at the Wave Monitor. Never throws and never blocks; set
 * WOMBO_NO_NOTIFY=1 to turn it off. Text comes from agents, so it is passed
 * as argv (never through a shell) and stripped of control characters.
 */

export type NotifySpawner = (cmd: string[]) => void;

const MAX_BODY = 200;

function clean(text: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  const flat = text.replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** The notifier command for a platform, or null when none is known. */
export function desktopNotifyCommand(platform: string, title: string, body: string): string[] | null {
  const t = clean(title, 80);
  const b = clean(body, MAX_BODY);
  if (platform === "linux") {
    return ["notify-send", "--urgency=critical", "--app-name=wombo-combo", t, b];
  }
  if (platform === "darwin") {
    return ["osascript", "-e", `display notification ${JSON.stringify(b)} with title ${JSON.stringify(t)} sound name "Glass"`];
  }
  return null;
}

const defaultSpawn: NotifySpawner = (cmd) => {
  const proc = Bun.spawn(cmd, { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
  proc.unref();
};

/** Fire a desktop notification. Returns true when a notifier was launched. */
export function notifyDesktop(
  title: string,
  body: string,
  opts: { platform?: string; env?: Record<string, string | undefined>; spawn?: NotifySpawner } = {},
): boolean {
  const env = opts.env ?? process.env;
  if (env.WOMBO_NO_NOTIFY) return false;
  const cmd = desktopNotifyCommand(opts.platform ?? process.platform, title, body);
  if (!cmd) return false;
  try {
    (opts.spawn ?? defaultSpawn)(cmd);
    return true;
  } catch {
    return false; // notifier not installed
  }
}
