import { describe, expect, test } from "bun:test";
import { FakeClock, flush, stubAgent } from "./fakes";
import { Supervisor, type SupervisorEvent } from "./supervisor";

function make(opts: Partial<ConstructorParameters<typeof Supervisor>[0]> & { children: ReturnType<typeof stubAgent>[] }) {
  const clock = new FakeClock();
  const events: SupervisorEvent[] = [];
  const { children, ...rest } = opts;
  const sup = new Supervisor({
    strategy: "one_for_one",
    maxRestarts: 5,
    periodMs: 1000,
    clock,
    onEvent: (e) => events.push(e),
    ...rest,
    children: children.map((c) => c.spec),
  });
  const result = sup.run();
  result.catch(() => {});
  return { sup, clock, events, result };
}

describe("crash isolation (one_for_one)", () => {
  test("a crash restarts only the crashed child", async () => {
    const [a, b, c] = ["A", "B", "C"].map((id) => stubAgent(id));
    const { sup } = make({ children: [a, b, c] });
    await flush();
    a.crash();
    await flush();
    expect([a.starts, b.starts, c.starts]).toEqual([2, 1, 1]);
    expect(b.running && c.running && a.running).toBe(true);
    expect(b.aborts + c.aborts).toBe(0);
    await sup.stop();
  });
});

describe("rest_for_one", () => {
  test("a crash restarts the crashed child and the ones after it, not the ones before", async () => {
    const [plan, build, test] = ["plan", "build", "test"].map((id) => stubAgent(id));
    const { sup, events } = make({ strategy: "rest_for_one", children: [plan, build, test] });
    await flush();
    build.crash();
    await flush();
    expect([plan.starts, build.starts, test.starts]).toEqual([1, 2, 2]);
    expect(plan.aborts).toBe(0);
    expect(test.aborts).toBe(1);
    const restarted = events.filter((e) => e.type === "child_restarted").map((e) => (e as { id: string }).id);
    expect(restarted).toEqual(["build", "test"]);
    await sup.stop();
  });
});

describe("restart intensity escalation", () => {
  const loop = () => stubAgent("looper", { onStart: (s) => s.crash() });

  test("exceeding maxRestarts in periodMs stops children, emits events and rejects run", async () => {
    const looper = loop();
    const bystander = stubAgent("bystander");
    const { events, result } = make({ maxRestarts: 2, periodMs: 1000, children: [bystander, looper] });
    await expect(result).rejects.toThrow(/restart intensity exceeded: more than 2 restarts in 1000ms/);
    expect(looper.starts).toBe(3); // initial + 2 allowed restarts, 3rd crash trips it
    expect(bystander.aborts).toBe(1);
    const types = events.map((e) => e.type);
    expect(types.indexOf("intensity_exceeded")).toBeLessThan(types.indexOf("escalated"));
  });

  test("crashes spread beyond periodMs never escalate", async () => {
    const a = stubAgent("A");
    const { sup, clock, events } = make({ maxRestarts: 2, periodMs: 1000, children: [a] });
    await flush();
    for (let i = 0; i < 5; i++) {
      a.crash();
      await clock.advance(600);
    }
    expect(a.starts).toBe(6);
    expect(events.some((e) => e.type === "intensity_exceeded")).toBe(false);
    await sup.stop();
  });

  test("a child supervisor escalates to its parent, which applies its own policy", async () => {
    const looper = loop();
    const inner = new Supervisor({ strategy: "one_for_one", maxRestarts: 1, periodMs: 1000, clock: new FakeClock(), children: [looper.spec] });
    const sibling = stubAgent("sibling");
    const parentEvents: SupervisorEvent[] = [];
    const parent = new Supervisor({
      strategy: "one_for_all",
      maxRestarts: 1,
      periodMs: 1000,
      clock: new FakeClock(),
      onEvent: (e) => parentEvents.push(e),
      children: [sibling.spec, inner.asChild("workers")],
    });
    const result = parent.run();
    await expect(result).rejects.toThrow(/restart intensity exceeded: more than 1 restarts/);
    // Parent restarted everything once (one_for_all) before giving up.
    expect(parentEvents.filter((e) => e.type === "child_restarted").map((e) => (e as { id: string }).id)).toEqual(["sibling", "workers"]);
    expect(sibling.starts).toBe(2);
  });
});

describe("restart types on normal exit and crash", () => {
  test("permanent restarts on normal exit; transient and temporary do not", async () => {
    const perm = stubAgent("perm", { restart: "permanent" });
    const trans = stubAgent("trans", { restart: "transient" });
    const temp = stubAgent("temp", { restart: "temporary" });
    const { sup } = make({ children: [perm, trans, temp] });
    await flush();
    perm.exit();
    trans.exit();
    temp.exit();
    await flush();
    expect([perm.starts, trans.starts, temp.starts]).toEqual([2, 1, 1]);
    await sup.stop();
  });

  test("transient restarts on crash; temporary does not", async () => {
    const trans = stubAgent("trans", { restart: "transient" });
    const temp = stubAgent("temp", { restart: "temporary" });
    const { sup } = make({ children: [trans, temp] });
    await flush();
    trans.crash();
    temp.crash();
    await flush();
    expect([trans.starts, temp.starts]).toEqual([2, 1]);
    await sup.stop();
  });

  test("run resolves once every child has retired", async () => {
    const a = stubAgent("A", { restart: "transient" });
    const b = stubAgent("B", { restart: "temporary" });
    const { result } = make({ children: [a, b] });
    await flush();
    a.exit();
    b.exit();
    await expect(result).resolves.toBeUndefined();
  });
});

describe("shutdown", () => {
  test("stop aborts children in reverse start order", async () => {
    const order: string[] = [];
    const kids = ["A", "B", "C"].map((id) => stubAgent(id, { onAbort: (x) => order.push(x) }));
    const { sup, result } = make({ children: kids });
    await flush();
    await sup.stop();
    expect(order).toEqual(["C", "B", "A"]);
    await expect(result).resolves.toBeUndefined();
  });

  test("a child that ignores abort is abandoned after shutdownMs", async () => {
    const stuck = stubAgent("stuck", { ignoreAbort: true, shutdownMs: 100 });
    const { sup, clock, events } = make({ children: [stuck] });
    await flush();
    let stopped = false;
    const stopping = sup.stop().then(() => (stopped = true));
    await clock.advance(99);
    expect(stopped).toBe(false);
    await clock.advance(1);
    await stopping;
    expect(stopped).toBe(true);
    expect(events.find((e) => e.type === "child_exit" && (e as { timedOut?: boolean }).timedOut)).toBeDefined();
  });

  test("aborting the run signal shuts the supervisor down", async () => {
    const a = stubAgent("A");
    const ctrl = new AbortController();
    const sup = new Supervisor({ strategy: "one_for_one", maxRestarts: 1, periodMs: 1000, clock: new FakeClock(), children: [a.spec] });
    const result = sup.run(ctrl.signal);
    await flush();
    ctrl.abort();
    await expect(result).resolves.toBeUndefined();
    expect(a.aborts).toBe(1);
  });
});
