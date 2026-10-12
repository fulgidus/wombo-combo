/**
 * run-plan-all.tsx — standalone Ink screen for the plan-all flow.
 *
 * PlanAllScreen renders the aggregate progress (PlanAllView) from a live
 * PlanAllRun; Esc aborts every in-flight planner. Once all planners settled:
 * right/Enter reviews proposals one quest at a time, `a` approves all valid
 * plans, left/q goes back without applying anything.
 */

import React, { useEffect, useState } from "react";
import { render } from "ink";
import { getStableStdin, createIsolatedStdout } from "./bun-stdin";
import { PlanAllView } from "./plan-all-view";
import { useScreenInput } from "./esc-menu";
import { useSpinner } from "./use-spinner";
import { useTerminalSize } from "./use-terminal-size";
import {
  runPlanAll,
  splitValidPlans,
  type PlanAllOptions,
  type PlanAllRow,
  type PlanAllRun,
  type SkippedQuest,
} from "../lib/quest-plan-all";

export type PlanAllOutcome =
  | { type: "review"; rows: PlanAllRow[] }
  | { type: "approve-all"; rows: PlanAllRow[] }
  | { type: "cancel"; rows: PlanAllRow[] };

export function PlanAllScreen({
  run,
  skipped,
  onDone,
}: {
  run: PlanAllRun;
  skipped: SkippedQuest[];
  onDone: (outcome: PlanAllOutcome) => void;
}): React.ReactElement {
  const [rows, setRows] = useState<PlanAllRow[]>(() => run.rows());
  const [finished, setFinished] = useState(false);
  const frame = useSpinner(!finished);
  const { rows: termRows } = useTerminalSize();

  useEffect(() => {
    const id = setInterval(() => setRows(run.rows()), 150);
    let live = true;
    void run.done.then((final) => {
      if (!live) return;
      setRows(final);
      setFinished(true);
    });
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [run]);

  const { valid } = splitValidPlans(rows);

  useScreenInput((input, key) => {
    if (!finished) {
      if (key.escape) run.abort();
      return;
    }
    if (key.leftArrow || input === "q" || key.escape) onDone({ type: "cancel", rows });
    else if (key.rightArrow || key.return) onDone({ type: "review", rows });
    else if (input === "a") onDone({ type: "approve-all", rows });
  });

  return (
    <PlanAllView
      rows={rows}
      totals={run.totals()}
      finished={finished}
      skipped={skipped}
      spinFrame={frame}
      height={Math.max(6, termRows - 1)}
      validCount={valid.length}
    />
  );
}

/**
 * Start the planners and show the aggregate screen. Resolves with the user's
 * choice once every planner settled (or was aborted) and they picked an action.
 */
export function runPlanAllInk(
  opts: PlanAllOptions & { skipped: SkippedQuest[] },
): Promise<PlanAllOutcome> {
  return new Promise<PlanAllOutcome>((resolve) => {
    const run = runPlanAll(opts);
    process.stdin.resume(); // keep event loop alive between renders
    const instance = render(
      <PlanAllScreen
        run={run}
        skipped={opts.skipped}
        onDone={(outcome) => {
          instance.unmount();
          resolve(outcome);
        }}
      />,
      { exitOnCtrlC: false, stdin: getStableStdin(), stdout: createIsolatedStdout() },
    );
  });
}
