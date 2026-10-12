#!/usr/bin/env bun
/**
 * Supervision demo: fake agents under a Supervisor, printed as a timeline.
 * Runs on virtual time (FakeClock), so output is identical on every run.
 * Run: bun spikes/otp-supervision/demo.ts
 */
import { FakeClock, flush, stubAgent, type StubAgent, type StubOptions } from "./fakes";
import { Supervisor, type Strategy, type SupervisorEvent } from "./supervisor";

type Log = (line: string) => void;

function describeEvent(e: SupervisorEvent): string | null {
  switch (e.type) {
    case "child_started": return `start     ${e.id}`;
    case "child_exit":
      if (e.timedOut) return `abandoned ${e.id} (ignored abort past shutdownMs)`;
      return e.crashed ? `CRASH     ${e.id}: ${(e.error as Error)?.message}` : `exit      ${e.id}`;
    case "child_restarted": return `restart   ${e.id} (#${e.restarts})`;
    case "intensity_exceeded": return `INTENSITY exceeded: ${e.restarts} restarts > ${e.maxRestarts} in ${e.periodMs}ms`;
    case "escalated": return `ESCALATE  ${e.reason.message}`;
  }
}

function scenario(log: Log, title: string, note: string) {
  const clock = new FakeClock();
  log("");
  log(`== ${title}`);
  log(`   ${note}`);
  const emitter = (label: string) => (e: SupervisorEvent) => {
    const line = describeEvent(e);
    if (line) log(`   t=${String(clock.now()).padStart(4)}ms [${label}] ${line}`);
  };
  return { clock, emitter, say: (m: string) => log(`   t=${String(clock.now()).padStart(4)}ms ${m}`) };
}

function agents(ids: string[], opts: StubOptions = {}): StubAgent[] {
  return ids.map((id) => stubAgent(id, opts));
}

async function crashIsolation(log: Log) {
  const s = scenario(log, "1. crash isolation (one_for_one)", "agent A crashes; B and C keep running");
  const [a, b, c] = agents(["A", "B", "C"]);
  const sup = new Supervisor({ strategy: "one_for_one", maxRestarts: 3, periodMs: 1000, clock: s.clock, onEvent: s.emitter("root"), children: [a, b, c].map((x) => x.spec) });
  sup.run().catch(() => {});
  await flush();
  await s.clock.advance(200);
  s.say("-> injecting crash into A");
  a.crash(new Error("A: test run failed"));
  await flush();
  s.say(`B.aborts=${b.aborts} C.aborts=${c.aborts} (untouched), A.starts=${a.starts}`);
  await sup.stop();
}

async function restForOne(log: Log) {
  const s = scenario(log, "2. rest_for_one", "build depends on plan, test depends on build; build crashes, plan keeps running");
  const [plan, build, test] = agents(["plan", "build", "test"]);
  const sup = new Supervisor({ strategy: "rest_for_one", maxRestarts: 3, periodMs: 1000, clock: s.clock, onEvent: s.emitter("root"), children: [plan, build, test].map((x) => x.spec) });
  sup.run().catch(() => {});
  await flush();
  await s.clock.advance(150);
  s.say("-> injecting crash into build");
  build.crash(new Error("build: compile error"));
  await flush();
  s.say(`plan.aborts=${plan.aborts} (untouched), test.aborts=${test.aborts} (restarted as a dependent)`);
  await sup.stop();
}

async function escalation(log: Log) {
  const s = scenario(log, "3. restart-intensity escalation", "looper crash-loops; inner supervisor allows 2 restarts per 1000ms, then escalates to the parent (one_for_all, 1 restart per 1000ms)");
  const looper = stubAgent("looper", {
    // Each run does 100ms of work, then dies; the guard ignores timers from superseded runs.
    onStart: (x, attempt) => {
      s.clock.setTimeout(() => x.starts === attempt && x.crash(new Error("boom")), 100);
    },
  });
  const sibling = stubAgent("sibling");
  const inner = new Supervisor({ strategy: "one_for_one", maxRestarts: 2, periodMs: 1000, clock: s.clock, onEvent: s.emitter("inner"), children: [looper.spec] });
  const parent = new Supervisor({
    strategy: "one_for_all" as Strategy,
    maxRestarts: 1,
    periodMs: 1000,
    clock: s.clock,
    onEvent: s.emitter("parent"),
    children: [sibling.spec, inner.asChild("inner")],
  });
  let outcome = "";
  parent.run().then(() => (outcome = "parent finished"), (e: Error) => (outcome = `parent gave up: ${e.message}`));
  for (let step = 0; !outcome && step < 100; step++) await s.clock.advance(50);
  s.say(outcome || "demo bug: parent never settled");
}

async function restartTypes(log: Log) {
  const s = scenario(log, "4. permanent vs transient vs temporary", "round A: all three exit normally; round B (fresh supervisor): all three crash");
  const round = async (label: string, end: (x: StubAgent) => void) => {
    const kids = (["permanent", "transient", "temporary"] as const).map((r) => stubAgent(r, { restart: r }));
    const sup = new Supervisor({ strategy: "one_for_one", maxRestarts: 5, periodMs: 1000, clock: s.clock, onEvent: s.emitter(label), children: kids.map((x) => x.spec) });
    sup.run().catch(() => {});
    await flush();
    await s.clock.advance(100);
    kids.forEach(end);
    await flush();
    s.say(`[${label}] starts: permanent=${kids[0].starts} transient=${kids[1].starts} temporary=${kids[2].starts}`);
    await sup.stop();
  };
  await round("A", (x) => x.exit());
  await round("B", (x) => x.crash(new Error(`${x.spec.id}: crashed`)));
}

export async function runDemo(log: Log = console.log): Promise<void> {
  log("OTP supervision demo (virtual time, fake agents)");
  await crashIsolation(log);
  await restForOne(log);
  await escalation(log);
  await restartTypes(log);
}

if (import.meta.main) await runDemo();
