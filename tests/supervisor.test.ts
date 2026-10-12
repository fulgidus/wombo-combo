import { describe, test, expect } from "bun:test";
import { FakeClock } from "./helpers/fake-clock";
import { Supervisor, SupervisorEscalation } from "../src/lib/supervision/supervisor";
import type { ChildHandle, ChildSpec, ExitReason, RestartType } from "../src/lib/supervision/types";

/** A controllable child: tests resolve its exit by hand. */
class FakeChild {
  starts = 0;
  aborts = 0;
  handles: Array<{ handle: ChildHandle; finish: (r: ExitReason) => void }> = [];
  failNextStarts = 0;
  /** When true abort() does not make the child exit (hung child). */
  hang = false;

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
        if (this.failNextStarts > 0) {
          this.failNextStarts--;
          throw new Error(`start failed ${this.id}`);
        }
        let finish!: (r: ExitReason) => void;
        const exit = new Promise<ExitReason>((r) => (finish = r));
        const handle: ChildHandle = {
          exit,
          abort: () => {
            this.aborts++;
            this.log.push(`abort:${this.id}`);
            if (!this.hang) finish({ kind: "shutdown" });
          },
        };
        this.handles.push({ handle, finish });
        return handle;
      },
    };
  }

  get current() {
    return this.handles[this.handles.length - 1]!;
  }
  crash(msg = "boom") {
    this.current.finish({ kind: "crash", error: new Error(msg) });
  }
}

function setup(opts: { restarts?: number; strategy?: "one_for_one" | "one_for_all" | "rest_for_one" } = {}) {
  const clock = new FakeClock(1000);
  const log: string[] = [];
  const mk = (id: string, restart: RestartType = "permanent") => new FakeChild(id, log, restart);
  const sup = new Supervisor({
    name: "root",
    clock,
    random: () => 0.5,
    strategy: opts.strategy,
    intensity: { maxRestarts: opts.restarts ?? 5, periodMs: 60000 },
    backoff: { initialMs: 100, maxMs: 5000, factor: 2 },
  });
  const events: string[] = [];
  for (const e of ["child_started", "child_exited", "child_restarted", "supervisor_escalated"] as const) {
    sup.on(e, (p: any) => events.push(`${e}:${p.childId ?? ""}${p.reason?.kind ? ":" + p.reason.kind : ""}`));
  }
  return { clock, log, sup, mk, events };
}

describe("Supervisor start", () => {
  test("starts children in order and emits child_started", async () => {
    const { sup, mk, log, events } = setup();
    const [a, b, c] = [mk("a"), mk("b"), mk("c")];
    sup.addChild(a.spec());
    sup.addChild(b.spec());
    sup.addChild(c.spec());
    await sup.start();
    expect(log).toEqual(["start:a", "start:b", "start:c"]);
    expect(events).toEqual(["child_started:a", "child_started:b", "child_started:c"]);
  });

  test("duplicate id throws", () => {
    const { sup, mk } = setup();
    sup.addChild(mk("a").spec());
    expect(() => sup.addChild(mk("a").spec())).toThrow(/Duplicate/);
  });

  test("addChild after start starts immediately", async () => {
    const { sup, mk, clock, log } = setup();
    await sup.start();
    sup.addChild(mk("late").spec());
    await clock.flush();
    expect(log).toEqual(["start:late"]);
  });
});

describe("restart behaviour", () => {
  test("one_for_one restarts after backoff delay on the fake clock", async () => {
    const { sup, mk, clock, events } = setup();
    const a = mk("a");
    const b = mk("b");
    sup.addChild(a.spec());
    sup.addChild(b.spec());
    await sup.start();
    a.crash();
    await clock.advanceAsync(99);
    expect(a.starts).toBe(1);
    expect(sup.snapshot().children[0]).toMatchObject({ state: "backoff", nextRestartAt: 1100 });
    await clock.advanceAsync(1);
    expect(a.starts).toBe(2);
    expect(b.starts).toBe(1);
    expect(events.slice(2)).toEqual([
      "child_exited:a:crash",
      "child_started:a",
      "child_restarted:a",
    ]);
    // second consecutive crash doubles the delay
    a.crash();
    await clock.advanceAsync(199);
    expect(a.starts).toBe(2);
    await clock.advanceAsync(1);
    expect(a.starts).toBe(3);
    expect(sup.snapshot().children[0]).toMatchObject({ restarts: 2, attempt: 2, state: "running" });
  });

  test("permanent restarts after normal exit; transient and temporary do not", async () => {
    const { sup, mk, clock } = setup();
    const p = mk("p", "permanent");
    const t = mk("t", "transient");
    const x = mk("x", "temporary");
    [p, t, x].forEach((c) => sup.addChild(c.spec()));
    await sup.start();
    for (const c of [p, t, x]) c.current.finish({ kind: "normal" });
    await clock.advanceAsync(100);
    expect(p.starts).toBe(2);
    expect(t.starts).toBe(1);
    expect(x.starts).toBe(1);
    const states = Object.fromEntries(sup.snapshot().children.map((c) => [c.id, c.state]));
    expect(states).toEqual({ p: "running", t: "terminated", x: "terminated" });
  });

  test("transient restarts after crash, temporary does not", async () => {
    const { sup, mk, clock } = setup();
    const t = mk("t", "transient");
    const x = mk("x", "temporary");
    sup.addChild(t.spec());
    sup.addChild(x.spec());
    await sup.start();
    t.crash();
    x.crash();
    await clock.advanceAsync(100);
    expect(t.starts).toBe(2);
    expect(x.starts).toBe(1);
  });

  test("attempt resets after a long healthy run", async () => {
    const { sup, mk, clock } = setup();
    const a = mk("a");
    sup.addChild(a.spec());
    await sup.start();
    a.crash();
    await clock.advanceAsync(100);
    a.crash();
    await clock.advanceAsync(200);
    expect(sup.snapshot().children[0]!.attempt).toBe(2);
    await clock.advanceAsync(10000);
    a.crash();
    await clock.advanceAsync(100);
    expect(a.starts).toBe(4);
    expect(sup.snapshot().children[0]!.attempt).toBe(1);
  });

  test("start failure is handled as a crash and retried", async () => {
    const { sup, mk, clock, events } = setup();
    const a = mk("a");
    a.failNextStarts = 1;
    sup.addChild(a.spec());
    await sup.start();
    expect(events).toEqual(["child_exited:a:crash"]);
    expect(sup.snapshot().children[0]!.state).toBe("backoff");
    await clock.advanceAsync(100);
    expect(a.starts).toBe(2);
    expect(sup.snapshot().children[0]!.state).toBe("running");
  });

  test("restart start failure counts toward intensity and escalates with start_failed", async () => {
    const { sup, mk, clock } = setup({ restarts: 2 });
    const a = mk("a");
    a.failNextStarts = 10;
    sup.addChild(a.spec());
    await sup.start();
    await clock.advanceAsync(100);
    await clock.advanceAsync(200);
    const exit = await sup.exit;
    expect(exit.kind).toBe("crash");
    const err = (exit as { error: SupervisorEscalation }).error;
    expect(err).toBeInstanceOf(SupervisorEscalation);
    expect(err.reason.kind).toBe("start_failed");
    expect(a.starts).toBe(3);
  });

  test("stale exit from a replaced handle is ignored", async () => {
    const { sup, mk, clock, events } = setup();
    const a = mk("a");
    sup.addChild(a.spec());
    await sup.start();
    const first = a.current;
    a.crash();
    await clock.advanceAsync(100);
    const exitedBefore = events.filter((e) => e.startsWith("child_exited")).length;
    first.finish({ kind: "crash", error: new Error("late") });
    await clock.advanceAsync(1000);
    expect(events.filter((e) => e.startsWith("child_exited")).length).toBe(exitedBefore);
    expect(a.starts).toBe(2);
  });
});

describe("escalation smoke", () => {
  test("exceeding maxRestarts resolves exit with crash(SupervisorEscalation)", async () => {
    const { sup, mk, clock, events } = setup({ restarts: 1 });
    const a = mk("a");
    const b = mk("b");
    sup.addChild(a.spec());
    sup.addChild(b.spec());
    await sup.start();
    a.crash();
    await clock.advanceAsync(100);
    a.crash();
    await clock.advanceAsync(0);
    const exit = await sup.exit;
    expect(exit.kind).toBe("crash");
    const err = (exit as { error: SupervisorEscalation }).error;
    expect(err).toBeInstanceOf(SupervisorEscalation);
    expect(err.reason).toMatchObject({ kind: "max_intensity", childId: "a" });
    expect(b.aborts).toBe(1);
    expect(a.starts).toBe(2);
    expect(sup.snapshot().state).toBe("escalated");
    expect(events[events.length - 1]).toBe("supervisor_escalated::max_intensity");
    expect(JSON.parse(JSON.stringify(sup.snapshot())).escalation.kind).toBe("max_intensity");
  });
});

describe("stop", () => {
  test("stops in reverse order, no restarts, reports exits, is idempotent", async () => {
    const { sup, mk, clock, log, events } = setup();
    const [a, b, c] = [mk("a"), mk("b"), mk("c")];
    [a, b, c].forEach((x) => sup.addChild(x.spec()));
    await sup.start();
    log.length = 0;
    events.length = 0;
    const p1 = sup.stop();
    const p2 = sup.stop();
    expect(p2).toBe(p1);
    await p1;
    await clock.advanceAsync(10000);
    expect(log).toEqual(["abort:c", "abort:b", "abort:a"]);
    expect(events).toEqual(["child_exited:c:shutdown", "child_exited:b:shutdown", "child_exited:a:shutdown"]);
    expect(await sup.exit).toEqual({ kind: "shutdown" });
    expect(sup.snapshot().state).toBe("stopped");
    await sup.stop();
    expect(log.length).toBe(3);
    expect(clock.pendingTimers()).toBe(0);
  });

  test("cancels pending backoff timers", async () => {
    const { sup, mk, clock } = setup();
    const a = mk("a");
    sup.addChild(a.spec());
    await sup.start();
    a.crash();
    await clock.advanceAsync(10);
    await sup.stop();
    await clock.advanceAsync(10000);
    expect(a.starts).toBe(1);
    expect(clock.pendingTimers()).toBe(0);
    expect(sup.snapshot().children[0]!.state).toBe("stopped");
  });

  test("hung child is forced after its timeout and reported as a crash", async () => {
    const { sup, mk, clock, events } = setup();
    const a = mk("a");
    a.hang = true;
    sup.addChild(a.spec());
    await sup.start();
    events.length = 0;
    const p = sup.stop();
    await clock.advanceAsync(1000);
    await p;
    expect(events).toEqual(["child_exited:a:crash"]);
    expect(a.starts).toBe(1);
  });

  test("stop before start resolves exit", async () => {
    const { sup } = setup();
    await sup.stop();
    expect(await sup.exit).toEqual({ kind: "shutdown" });
  });
});

describe("snapshot", () => {
  test("is plain JSON-serializable and structuredClone safe, and does not mutate", async () => {
    const { sup, mk, clock } = setup();
    const a = mk("a");
    sup.addChild(a.spec());
    await sup.start();
    a.crash("kaput");
    await clock.advanceAsync(0);
    const before = JSON.stringify(sup.snapshot());
    const snap = sup.snapshot();
    expect(JSON.stringify(sup.snapshot())).toBe(before);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    expect(structuredClone(snap)).toEqual(snap);
    expect(snap).toMatchObject({
      name: "root",
      strategy: "one_for_one",
      state: "running",
      intensity: { maxRestarts: 5, periodMs: 60000 },
      recentRestarts: 1,
    });
    expect(snap.children[0]).toMatchObject({
      id: "a",
      state: "backoff",
      restart: "permanent",
      lastExit: { kind: "crash", error: { name: "Error", message: "kaput" } },
    });
  });

  test("nests supervisors created through Supervisor.childSpec, fresh per restart", async () => {
    const clock = new FakeClock(0);
    const log: string[] = [];
    const leaf = new FakeChild("leaf", log);
    const made: Supervisor[] = [];
    const root = new Supervisor({ name: "root", clock, backoff: { initialMs: 50, maxMs: 50, factor: 1 } });
    root.addChild(
      Supervisor.childSpec("sub", () => {
        const s = new Supervisor({ name: `sub${made.length}`, clock, children: [leaf.spec()] });
        made.push(s);
        return s;
      }),
    );
    await root.start();
    expect(root.snapshot().supervisors?.[0]?.name).toBe("sub0");
    expect(root.snapshot().supervisors?.[0]?.children[0]?.id).toBe("leaf");
    await made[0]!.stop();
    await clock.advanceAsync(50);
    expect(made.length).toBe(2);
    expect(root.snapshot().supervisors?.[0]?.name).toBe("sub1");
    await root.stop();
    expect(made[1]!.snapshot().state).toBe("stopped");
    expect(JSON.parse(JSON.stringify(root.snapshot())).supervisors).toHaveLength(1);
  });
});

describe("event listeners", () => {
  test("a throwing listener does not break supervision", async () => {
    const { sup, mk, clock } = setup();
    sup.on("child_exited", () => {
      throw new Error("listener");
    });
    const a = mk("a");
    sup.addChild(a.spec());
    await sup.start();
    a.crash();
    await clock.advanceAsync(100);
    expect(a.starts).toBe(2);
  });
});
