import { expect, test } from "bun:test";
import { runDemo } from "./demo";

async function capture(): Promise<string[]> {
  const lines: string[] = [];
  await runDemo((l) => lines.push(l));
  return lines;
}

test("demo prints all four scenarios and shows escalation reaching the parent", async () => {
  const out = (await capture()).join("\n");
  for (const n of ["1. crash isolation", "2. rest_for_one", "3. restart-intensity escalation", "4. permanent vs transient vs temporary"]) {
    expect(out).toContain(n);
  }
  expect(out).toContain("[inner] ESCALATE");
  expect(out).toContain("[parent] INTENSITY");
  expect(out).toContain("[A] starts: permanent=2 transient=1 temporary=1");
  expect(out).toContain("[B] starts: permanent=2 transient=2 temporary=1");
});

test("demo output is deterministic", async () => {
  expect(await capture()).toEqual(await capture());
});
