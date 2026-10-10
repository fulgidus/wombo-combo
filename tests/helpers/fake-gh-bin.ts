/**
 * An executable stand-in for the GitHub CLI, for tests that spawn the real
 * `woco` CLI as a subprocess. It never touches the network: it records every
 * invocation to $FAKE_GH_DIR/calls.log and keeps pull requests in
 * $FAKE_GH_DIR/state.json.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = `#!/usr/bin/env bun
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
const dir = process.env.FAKE_GH_DIR;
const args = process.argv.slice(2);
let input = "";
if (args.includes("--body-file")) input = readFileSync(0, "utf-8");
appendFileSync(dir + "/calls.log", JSON.stringify({ args, input }) + "\\n");
const statePath = dir + "/state.json";
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf-8")) : { prs: [] };
const save = () => writeFileSync(statePath, JSON.stringify(state));
const flag = (n) => args[args.indexOf(n) + 1];
const [a, b] = args;
if (a === "--version") {
  console.log("gh version 2.40.0");
} else if (a === "auth") {
  if (process.env.FAKE_GH_UNAUTH) { console.error("You are not logged in"); process.exit(1); }
  console.log("Logged in");
} else if (a === "repo" && b === "view") {
  console.log(JSON.stringify({ defaultBranchRef: { name: process.env.FAKE_GH_DEFAULT_BRANCH || "main" } }));
} else if (a === "pr" && b === "list") {
  const head = flag("--head"), base = flag("--base");
  console.log(JSON.stringify(state.prs.filter((p) => p.headRefName === head && p.baseRefName === base)
    .map((p) => ({ ...p, isCrossRepository: false }))));
} else if (a === "pr" && b === "create") {
  const number = state.prs.length + 1;
  const pr = { number, url: "https://github.com/acme/widgets/pull/" + number, title: flag("--title"),
    body: input, isDraft: args.includes("--draft"), headRefName: flag("--head"), baseRefName: flag("--base") };
  state.prs.push(pr); save();
  console.log(pr.url);
} else if (a === "pr" && b === "edit") {
  const pr = state.prs.find((p) => p.number === Number(args[2]));
  if (!pr) { console.error("no such pr"); process.exit(1); }
  pr.body = input; save();
  console.log(pr.url);
} else {
  console.error("unexpected gh call: " + args.join(" "));
  process.exit(1);
}
`;

export interface FakeGhBin {
  /** Directory to prepend to PATH (contains an executable named gh) */
  binDir: string;
  /** Directory holding calls.log and state.json (pass as FAKE_GH_DIR) */
  stateDir: string;
  calls(): Array<{ args: string[]; input: string }>;
  prs(): Array<{ number: number; url: string; title: string; body: string; isDraft: boolean; headRefName: string; baseRefName: string }>;
}

export function installFakeGh(root: string): FakeGhBin {
  const binDir = join(root, "bin");
  const stateDir = join(root, "state");
  mkdirSync(binDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });
  const exe = join(binDir, "gh");
  writeFileSync(exe, SCRIPT);
  chmodSync(exe, 0o755);
  return {
    binDir,
    stateDir,
    calls() {
      const p = join(stateDir, "calls.log");
      if (!existsSync(p)) return [];
      return readFileSync(p, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    },
    prs() {
      const p = join(stateDir, "state.json");
      return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")).prs : [];
    },
  };
}

/** A PATH directory with only bun and git, so that no gh can be found. */
export function installBinWithoutGh(root: string): string {
  const dir = join(root, "bin-no-gh");
  mkdirSync(dir, { recursive: true });
  for (const tool of ["bun", "git"]) {
    const found = spawnSync("which", [tool], { encoding: "utf-8" }).stdout.trim();
    if (!found) throw new Error(`${tool} not found on PATH`);
    symlinkSync(found, join(dir, tool));
  }
  // `sh` is needed by some git helpers
  for (const sh of ["sh"]) {
    const found = spawnSync("which", [sh], { encoding: "utf-8" }).stdout.trim();
    if (found && !existsSync(join(dir, sh))) symlinkSync(found, join(dir, sh));
  }
  void dirname;
  return dir;
}
