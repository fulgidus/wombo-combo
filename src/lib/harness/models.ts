/**
 * models.ts — Which models can a harness run?
 *
 * Multi-provider harnesses (opencode, pi) are asked directly: their CLIs list
 * every model they can reach (opencode, pi, antigravity). Vendor harnesses (claude-code, codex, gemini)
 * have no listing command, so they propose their own vendor's models from a
 * built-in list. `custom` proposes nothing; the user types a model.
 */

import type { HarnessId } from "./ids";

export interface HarnessModel {
  /** Provider the model belongs to; null when implied by the harness */
  provider: string | null;
  model: string;
}

export interface ModelCatalog {
  /** "harness": asked the CLI; "builtin": the vendor's own models */
  source: "harness" | "builtin" | "none";
  models: HarnessModel[];
  /** Set when asking the CLI failed and the catalog is empty */
  error?: string;
}

/** Runs a command and returns combined stdout+stderr, or throws. */
export type CommandRunner = (bin: string, args: string[], timeoutMs: number) => Promise<string>;

const vendor = (...models: string[]): HarnessModel[] => models.map((model) => ({ provider: null, model }));

/** Vendor models proposed by harnesses that cannot list them. */
export const BUILTIN_MODELS: Partial<Record<HarnessId, HarnessModel[]>> = {
  "claude-code": vendor(
    "opus", "sonnet", "haiku",
    "claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5",
  ),
  codex: vendor("gpt-5-codex", "gpt-5", "gpt-5-mini"),
  gemini: vendor("gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"),
};

/** Harnesses whose CLI is asked for the model list, with the command to run. */
const LIST_COMMANDS: Partial<Record<HarnessId, string[]>> = {
  opencode: ["models"],
  antigravity: ["models"],
  pi: ["--list-models"],
};

/** opencode prints `provider/model` per line (model ids may contain slashes). */
export function parseOpencodeModels(out: string): HarnessModel[] {
  const models: HarnessModel[] = [];
  for (const raw of out.split("\n")) {
    const line = raw.trim();
    const slash = line.indexOf("/");
    if (!line || /\s/.test(line) || slash <= 0 || slash === line.length - 1) continue;
    models.push({ provider: line.slice(0, slash), model: line.slice(slash + 1) });
  }
  return models;
}

/** pi prints a table: `provider  model  context  max-out ...` under a header row. */
export function parsePiModels(out: string): HarnessModel[] {
  const models: HarnessModel[] = [];
  for (const raw of out.split("\n")) {
    const cols = raw.trim().split(/\s+/);
    if (cols.length < 2 || cols[0] === "provider") continue;
    models.push({ provider: cols[0]!, model: cols[1]! });
  }
  return models;
}

/** agy prints `id<TAB>Label` per model after a "Fetching…" line. */
export function parseAntigravityModels(out: string): HarnessModel[] {
  const models: HarnessModel[] = [];
  for (const raw of out.split("\n")) {
    const [id] = raw.split("\t");
    if (raw.includes("\t") && id && !/\s/.test(id)) models.push({ provider: null, model: id });
  }
  return models;
}

const PARSERS: Partial<Record<HarnessId, (out: string) => HarnessModel[]>> = {
  opencode: parseOpencodeModels,
  antigravity: parseAntigravityModels,
  pi: parsePiModels,
};

const defaultRunner: CommandRunner = async (bin, args, timeoutMs) => {
  const proc = Bun.spawn([bin, ...args], { stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  const timer = setTimeout(() => proc.kill(), timeoutMs);
  try {
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    const code = await proc.exited;
    if (code !== 0) throw new Error(`${bin} ${args.join(" ")} exited with ${code}`);
    return `${out}\n${err}`;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * List the models a harness can run. Never throws: a failed CLI query yields an
 * empty catalog with `error`, so the UI can fall back to free text.
 */
export async function listHarnessModels(
  harness: HarnessId,
  bin: string,
  opts: { run?: CommandRunner; timeoutMs?: number } = {},
): Promise<ModelCatalog> {
  const builtin = BUILTIN_MODELS[harness];
  if (builtin) return { source: "builtin", models: builtin };

  const args = LIST_COMMANDS[harness];
  const parse = PARSERS[harness];
  if (!args || !parse) return { source: "none", models: [] };

  try {
    const out = await (opts.run ?? defaultRunner)(bin, args, opts.timeoutMs ?? 15_000);
    const models = parse(out);
    return models.length > 0
      ? { source: "harness", models }
      : { source: "harness", models: [], error: `${bin} listed no models` };
  } catch (err: unknown) {
    return { source: "harness", models: [], error: err instanceof Error ? err.message : String(err) };
  }
}
