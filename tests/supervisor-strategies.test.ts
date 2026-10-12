import { describe, test, expect } from "bun:test";
import { FakeClock } from "./helpers/fake-clock";
import { Supervisor, SupervisorEscalation } from "../src/lib/supervision/supervisor";
import type {
  BackoffOptions,
  ChildHandle,
  ChildSpec,
  ExitReason,
  IntensityOptions,
  RestartStrategy,
  RestartType,
} from "../src/lib/supervision/types";

/** A controllable child that records start/abort order into a shared log. */
class FakeChild {
  starts = 0;
  aborts = 0;
  hang = false;
  private finishers: Array<(r: ExitReason) => void> = [];

  constructor(
    readonly id: string,
    private readonly log: string[],
    readonly restart: RestartType = "permanent",
    readonly shutdownTimeoutMs = 1000,
  ) {}

  spec(): ChildSpec {
    return {
      id: this.id,
      restart: this.restart,
      shutdownTimeoutMs: this.shutdownTimeoutMs,
      start: () => {
        this.starts++;
        this.log.push(`start:${this.id}`);
        let finish!: (r: ExitReason) => void;
        const exit = new Promise<ExitReason>((r) => (finish = r));
        this.finishers.push(finish);
        const handle: ChildHandle = {
          exit,
          abort: () => {
            this.aborts++;
            this.log.push(`abort:${this.id}`);
            if (!this.hang) finish({ kind: "shutdown" });
          },
        };
        return handle;
      },
    };
  }

  crash(msg = "boom") {
    this.finishers[this.finishers.length - 1]!({ kind: "crash", error: new Error(msg) });
  }
}

interface SetupOpts {
  strategy?: RestartStrategy;
  intensity?: IntensityOptions;
  backoff?: BackoffOptions;
}

function setup(opts: SetupOpts = {}) {
  const clock = new FakeClock(1000);
  const log: string[] = [];
  const mk = (id: string, restart: RestartType = "permanent", timeout = 1000) =>
    new FakeChild(id, log, restart, timeout);
  const sup = new Supervisor({
    name: "root",
    clock,
    random: () => 0.5,
    strategy: opts.strategy,
    intensity: opts.intensity ?? { maxRestarts: 100, periodMs: 60000 },
    backoff: opts.backoff ?? { initialMs: 100, maxMs: 5000, factor: 2 },
  });
  const events: string[] = [];
  const restartDelays: number[] = [];
  sup.on("child_started", (p) => events.push(`started:${p.childId}`));
  sup.on("child_exited", (p) => events.push(`exited:${p.childId}:${p.reason.kind}`));
  sup.on("child_restarted", (p) => {
    events.push(`restarted:${p.childId}`);
    restartDelays.push(p.delayMs);
  });
  sup.on("supervisor_escalated", () => events.push("escalated"));
  const add = (...children: FakeChild[]) => children.forEach((c) => sup.addChild(c.spec()));
  return { clock, log, sup, mk, add, events, restartDelays };
}

const mark = (log: string[]) => log.length;
const since = (log: string[], from: number) => log.slice(from);

describe("one_for_one", () => {
  test("only the failed child restarts; siblings are untouched", async () => {
    const { sup, mk, add, clock, log } = setup({ strategy: "one_for_one" });
    const [a, b, c] = [mk("a"), mk("b"), mk("c")];
    add(a, b, c);
    await sup.start();
    const m = mark(log);
    b.crash();
    await clock.advanceAsync(100);
    expect(since(log, m)).toEqual(["start:b"]);
    expect([a.starts, b.starts, c.starts]).toEqual([1, 2, 1]);
    expect([a.aborts, b.aborts, c.aborts]).toEqual([0, 0, 0]);
    await sup.stop();
  });

  test("the restart waits for the backoff delay", async () => {
    const { sup, mk, add, clock } = setup();
    const a = mk("a");
    add(a);
    await sup.start();
    a.crash();
    await clock.advanceAsync(99);
    expect(a.starts).toBe(1);
    await clock.advanceAsync(1);
    expect(a.starts).toBe(2);
    await sup.stop();
  });
});

describe("one_for_all", () => {
  test("stops the others in reverse start order, then restarts all in start order after the delay", async () => {
    const { sup, mk, add, clock, log } = setup({ strategy: "one_for_all" });
    const [a, b, c] = [mk("a"), mk("b"), mk("c")];
    add(a, b, c);
    await sup.start();
    const m = mark(log);
    b.crash();
    await clock.advanceAsync(0);
    expect(since(log, m)).toEqual(["abort:c", "abort:a"]);
    await clock.advanceAsync(99);
    expect(since(log, m)).toEqual(["abort:c", "abort:a"]);
    await clock.advanceAsync(1);
    expect(since(log, m)).toEqual(["abort:c", "abort:a", "start:a", "start:b", "start:c"]);
    await sup.stop();
  });

  test("a temporary sibling is stopped but not restarted", async () => {
    const { sup, mk, add, clock, log } = setup({ strategy: "one_for_all" });
    const [a, t, c] = [mk("a"), mk("t", "temporary"), mk("c")];
    add(a, t, c);
    await sup.start();
    const m = mark(log);
    a.crash();
    await clock.advanceAsync(0);
    await clock.advanceAsync(100);
    expect(since(log, m)).toEqual(["abort:c", "abort:t", "start:a", "start:c"]);
    expect(t.starts).toBe(1);
    await sup.stop();
  });
});

describe("rest_for_one", () => {
  async function crashAndCollect(failing: string) {
    const ctx = setup({ strategy: "rest_for_one" });
    const kids = { a: ctx.mk("a"), b: ctx.mk("b"), c: ctx.mk("c") };
    ctx.add(kids.a, kids.b, kids.c);
    await ctx.sup.start();
    const m = mark(ctx.log);
    kids[failing as "a"].crash();
    await ctx.clock.advanceAsync(0);
    await ctx.clock.advanceAsync(100);
    const out = since(ctx.log, m);
    await ctx.sup.stop();
    return out;
  }

  test("crash of the first child restarts everything, stopping later ones in reverse", async () => {
    expect(await crashAndCollect("a")).toEqual(["abort:c", "abort:b", "start:a", "start:b", "start:c"]);
  });

  test("crash of a middle child restarts it and later children only", async () => {
    expect(await crashAndCollect("b")).toEqual(["abort:c", "start:b", "start:c"]);
  });

  test("crash of the last child restarts only it", async () => {
    expect(await crashAndCollect("c")).toEqual(["start:c"]);
  });
});

describe("restart intensity", () => {
  const intensity = { maxRestarts: 3, periodMs: 1000 };
  const backoff = { initialMs: 1, maxMs: 1, factor: 1 };

  test("3 restarts in the window succeed; the 4th crash escalates", async () => {
    const { sup, mk, add, clock, events } = setup({ intensity, backoff });
    const a = mk("a");
    add(a);
    await sup.start();
    for (let i = 0; i < 3; i++) {
      a.crash();
      await clock.advanceAsync(1);
    }
    expect(a.starts).toBe(4);
    expect(events).not.toContain("escalated");
    a.crash();
    await clock.advanceAsync(0);
    expect(events).toContain("escalated");
    expect(sup.snapshot().state).toBe("escalated");
    expect(sup.snapshot().escalation?.kind).toBe("max_intensity");
    const exit = await sup.exit;
    expect(exit.kind).toBe("crash");
    expect(exit.kind === "crash" && exit.error).toBeInstanceOf(SupervisorEscalation);
  });

  test("remaining children are stopped in reverse order and nothing restarts afterwards", async () => {
    const { sup, mk, add, clock, log } = setup({ intensity, backoff });
    const [a, b, c] = [mk("a"), mk("b"), mk("c")];
    add(a, b, c);
    await sup.start();
    for (let i = 0; i < 3; i++) {
      b.crash();
      await clock.advanceAsync(1);
    }
    const m = mark(log);
    b.crash();
    await clock.advanceAsync(0);
    expect(since(log, m)).toEqual(["abort:c", "abort:a"]);
    await clock.advanceAsync(10000);
    expect(since(log, m)).toEqual(["abort:c", "abort:a"]);
    expect(b.starts).toBe(4);
  });

  test("restarts spaced further apart than the window never escalate", async () => {
    const { sup, mk, add, clock, events } = setup({ intensity, backoff });
    const a = mk("a");
    add(a);
    await sup.start();
    for (let i = 0; i < 10; i++) {
      a.crash();
      await clock.advanceAsync(1001);
    }
    expect(a.starts).toBe(11);
    expect(events).not.toContain("escalated");
    await sup.stop();
  });

  test("maxRestarts=0 escalates on the first crash", async () => {
    const { sup, mk, add, clock, events } = setup({ intensity: { maxRestarts: 0, periodMs: 1000 }, backoff });
    const a = mk("a");
    add(a);
    await sup.start();
    a.crash();
    await clock.advanceAsync(0);
    expect(events).toContain("escalated");
    expect(a.starts).toBe(1);
    expect((await sup.exit).kind).toBe("crash");
  });
});

describe("backoff", () => {
  test("delays grow by factor and are capped at maxMs", async () => {
    const { sup, mk, add, clock, restartDelays } = setup({ backoff: { initialMs: 100, maxMs: 500, factor: 2 } });
    const a = mk("a");
    add(a);
    await sup.start();
    for (let i = 0; i < 5; i++) {
      a.crash();
      await clock.advanceAsync(500);
    }
    expect(restartDelays).toEqual([100, 200, 400, 500, 500]);
    await sup.stop();
  });

  test("timing matches the reported delay", async () => {
    const { sup, mk, add, clock } = setup({ backoff: { initialMs: 100, maxMs: 500, factor: 2 } });
    const a = mk("a");
    add(a);
    await sup.start();
    a.crash();
    await clock.advanceAsync(100);
    a.crash();
    await clock.advanceAsync(199);
    expect(a.starts).toBe(2);
    await clock.advanceAsync(1);
    expect(a.starts).toBe(3);
    await sup.stop();
  });

  test("attempt resets after a long healthy run", async () => {
    const { sup, mk, add, clock, restartDelays } = setup();
    const a = mk("a");
    add(a);
    await sup.start();
    a.crash();
    await clock.advanceAsync(100);
    a.crash();
    await clock.advanceAsync(200);
    await clock.advanceAsync(60000);
    a.crash();
    await clock.advanceAsync(100);
    expect(restartDelays).toEqual([100, 200, 100]);
    await sup.stop();
  });
});

describe("nested supervisors", () => {
  const noBackoff = { initialMs: 10, maxMs: 10, factor: 1 };

  function inner(clock: FakeClock, log: string[], leaves: FakeChild[], name = "inner") {
    return () => {
      const leaf = new FakeChild(`${name}-leaf`, log);
      leaves.push(leaf);
      return new Supervisor({
        name,
        clock,
        intensity: { maxRestarts: 0, periodMs: 1000 },
        backoff: noBackoff,
        children: [leaf.spec()],
      });
    };
  }

  test("child supervisor escalation is a crash for the parent, which restarts a fresh supervisor", async () => {
    const clock = new FakeClock(0);
    const log: string[] = [];
    const leaves: FakeChild[] = [];
    const parent = new Supervisor({
      name: "parent",
      clock,
      backoff: noBackoff,
      children: [Supervisor.childSpec("inner", inner(clock, log, leaves))],
    });
    const exits: string[] = [];
    parent.on("child_exited", (p) => exits.push(`${p.childId}:${p.reason.kind}`));
    await parent.start();
    leaves[0]!.crash();
    await clock.advanceAsync(0);
    expect(exits).toEqual(["inner:crash"]);
    await clock.advanceAsync(10);
    expect(leaves).toHaveLength(2);
    expect(parent.snapshot().children[0]!.state).toBe("running");
    expect(parent.snapshot().children[0]!.restarts).toBe(1);
    await parent.stop();
  });

  test("parent escalation propagates to the grandparent", async () => {
    const clock = new FakeClock(0);
    const log: string[] = [];
    const leaves: FakeChild[] = [];
    const mkParent = () =>
      new Supervisor({
        name: "parent",
        clock,
        intensity: { maxRestarts: 0, periodMs: 1000 },
        backoff: noBackoff,
        children: [Supervisor.childSpec("inner", inner(clock, log, leaves))],
      });
    const grand = new Supervisor({
      name: "grand",
      clock,
      intensity: { maxRestarts: 0, periodMs: 1000 },
      backoff: noBackoff,
      children: [Supervisor.childSpec("parent", mkParent)],
    });
    await grand.start();
    leaves[0]!.crash();
    await clock.advanceAsync(0);
    const exit = await grand.exit;
    expect(exit.kind).toBe("crash");
    expect(exit.kind === "crash" && exit.error).toBeInstanceOf(SupervisorEscalation);
    expect(grand.snapshot().state).toBe("escalated");
  });

  test("root snapshot includes nested supervisors", async () => {
    const clock = new FakeClock(0);
    const leaves: FakeChild[] = [];
    const root = new Supervisor({
      name: "root",
      clock,
      children: [Supervisor.childSpec("inner", inner(clock, [], leaves))],
    });
    await root.start();
    const snap = root.snapshot();
    expect(snap.supervisors?.map((s) => s.name)).toEqual(["inner"]);
    expect(snap.supervisors![0]!.children[0]!.id).toBe("inner-leaf");
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    await root.stop();
  });
});

describe("shutdown", () => {
  test("stops children in reverse start order", async () => {
    const { sup, mk, add, log } = setup();
    add(mk("a"), mk("b"), mk("c"));
    await sup.start();
    const m = mark(log);
    await sup.stop();
    expect(since(log, m)).toEqual(["abort:c", "abort:b", "abort:a"]);
    expect((await sup.exit).kind).toBe("shutdown");
  });

  test("a hung child is abandoned after its shutdownTimeoutMs and the others still stop", async () => {
    const { sup, mk, add, clock, log } = setup();
    const [a, b, c] = [mk("a"), mk("b", "permanent", 300), mk("c")];
    b.hang = true;
    add(a, b, c);
    await sup.start();
    const m = mark(log);
    let stopped = false;
    const p = sup.stop().then(() => (stopped = true));
    await clock.advanceAsync(299);
    expect(stopped).toBe(false);
    await clock.advanceAsync(1);
    await p;
    expect(since(log, m)).toEqual(["abort:c", "abort:b", "abort:a"]);
    expect(stopped).toBe(true);
  });

  test("stop() during backoff cancels the pending restart", async () => {
    const { sup, mk, add, clock } = setup();
    const a = mk("a");
    add(a);
    await sup.start();
    a.crash();
    await clock.advanceAsync(50);
    await sup.stop();
    await clock.advanceAsync(10000);
    expect(a.starts).toBe(1);
    expect(clock.pendingTimers()).toBe(0);
  });
});

describe("event sequence", () => {
  test("crash-restart cycle emits child_started, child_exited, child_restarted", async () => {
    const { sup, mk, add, clock, events } = setup();
    const a = mk("a");
    add(a);
    await sup.start();
    a.crash();
    await clock.advanceAsync(100);
    expect(events).toEqual(["started:a", "exited:a:crash", "started:a", "restarted:a"]);
    await sup.stop();
  });
});
