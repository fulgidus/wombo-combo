import { describe, test, expect } from "bun:test";
import {
  listHarnessModels,
  parseOpencodeModels,
  parsePiModels,
  BUILTIN_MODELS,
} from "../src/lib/harness/models";
import { matchModels, modelFields } from "../src/ink/agents-routing-screen";

describe("model catalogs", () => {
  test("opencode lines split on the first slash; noise ignored", () => {
    expect(parseOpencodeModels("anthropic/claude-x\nopenrouter/meta/llama-3\nwarning: foo bar\n\n")).toEqual([
      { provider: "anthropic", model: "claude-x" },
      { provider: "openrouter", model: "meta/llama-3" },
    ]);
  });

  test("pi table skips the header", () => {
    expect(parsePiModels("provider  model  context\nopenai  gpt-5  400K\n")).toEqual([
      { provider: "openai", model: "gpt-5" },
    ]);
  });

  test("vendor harnesses propose their own models without running anything", async () => {
    const run = async () => {
      throw new Error("must not run");
    };
    for (const id of ["claude-code", "codex", "gemini"] as const) {
      const c = await listHarnessModels(id, id, { run });
      expect(c.source).toBe("builtin");
      expect(c.models).toEqual(BUILTIN_MODELS[id]!);
    }
    expect(BUILTIN_MODELS.gemini!.every((m) => m.model.startsWith("gemini"))).toBe(true);
  });

  test("multi-provider harnesses are asked; failures degrade to an empty catalog", async () => {
    const asked: string[][] = [];
    const ok = await listHarnessModels("opencode", "oc", {
      run: async (_b, args) => (asked.push(args), "a/b\n"),
    });
    expect(asked).toEqual([["models"]]);
    expect(ok).toEqual({ source: "harness", models: [{ provider: "a", model: "b" }] });

    const bad = await listHarnessModels("pi", "pi", {
      run: async () => {
        throw new Error("boom");
      },
    });
    expect(bad).toMatchObject({ source: "harness", models: [], error: "boom" });
    expect((await listHarnessModels("custom", "x")).source).toBe("none");
  });
});

describe("profile model fields", () => {
  test("opencode folds the provider into the model id; pi keeps them apart", () => {
    const m = { provider: "anthropic", model: "claude-x" };
    expect(modelFields("opencode", m)).toEqual({ model: "anthropic/claude-x", provider: "" });
    expect(modelFields("pi", m)).toEqual({ model: "claude-x", provider: "anthropic" });
    expect(modelFields("claude-code", { provider: null, model: "opus" })).toEqual({ model: "opus", provider: "" });
  });

  test("filter matches typed text against the profile model id", () => {
    const models = [
      { provider: "a", model: "fast" },
      { provider: "b", model: "slow" },
    ];
    expect(matchModels("opencode", models, "b/s")).toEqual([models[1]!]);
    expect(matchModels("opencode", models, "")).toEqual(models);
  });
});
