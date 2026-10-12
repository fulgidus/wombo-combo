import { describe, test, expect } from "bun:test";
import { FakeClock } from "./helpers/fake-clock";
import {
  Supervisor,
  computeBackoff,
  crash,
  type ChildHandle,
  type ChildSpec,
  type ExitReason,
} from "../src/lib/supervision";

describe("supervision barrel", () => {
  test("restarts a crashed child after the backoff delay", async () => {
    const clock = new FakeClock(0);
    const finishers: Array<(r: ExitReason) => void> = [];
    const spec: ChildSpec = {
      id: "worker",
      start: (): ChildHandle => {
        let finish!: (r: ExitReason) => void;
        const exit = new Promise<ExitReason>((r) => (finish = r));
        finishers.push(finish);
        return { exit, abort: () => finish({ kind: "shutdown" }) };
      },
    };
    const sup = new Supervisor({
      name: "root",
      clock,
      random: () => 0.5,
      backoff: { initialMs: 100, maxMs: 1000, factor: 2 },
      children: [spec],
    });
    const events: string[] = [];
    sup.on("child_started", (e) => events.push(`started:${e.attempt}`));
    sup.on("child_restarted", (e) => events.push(`restarted:${e.delayMs}`));

    await sup.start();
    expect(finishers).toHaveLength(1);

    finishers[0]!(crash(new Error("boom")));
    await clock.advanceAsync(0);
    expect(finishers).toHaveLength(1);

    await clock.advanceAsync(computeBackoff(1, { initialMs: 100, maxMs: 1000, factor: 2 }));
    expect(finishers).toHaveLength(2);
    expect(events).toContain("restarted:100");
    expect(sup.snapshot().children[0]!.restarts).toBe(1);

    await sup.stop();
    expect(sup.snapshot().state).toBe("stopped");
  });
});
