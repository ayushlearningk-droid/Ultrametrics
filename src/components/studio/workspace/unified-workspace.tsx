"use client";

/**
 * Unified Workspace (Sprint 63K).
 *
 * One living workspace: Home · Outcome · Movie · Employees · Timeline · Activity
 * · Approval · Canvas as dockable regions over ONE shared runtime stack
 * (Outcome + Movie + Employees). Selecting an outcome deterministically wakes the
 * team, begins the movie, flows the activity/timeline, and reveals approval on
 * completion. Reuses every existing component — no duplication, no new page.
 */

import { useEffect, useRef } from "react";
import {
  OutcomeEngineProvider,
  useOutcome,
} from "@/components/studio/outcomes/outcome-engine";
import { MovieProvider, useMovie } from "@/components/studio/movie/movie-context";
import { useGeneration } from "@/components/studio/generation/generation-store";
import { RegionManagerProvider, useRegions } from "./region-manager";
import { WorkspaceDock } from "./workspace-dock";

/** Wires outcome selection → runtime start → approval reveal. Deterministic. */
function Orchestrator() {
  const { outcome } = useOutcome();
  const gen = useGeneration();
  const { reset: startRun, pause, isComplete } = useMovie();
  const { showRegion } = useRegions();
  const prevOutcome = useRef<string | null>(null);
  const prevGen = useRef<string | null>(null);

  // Idle until an outcome is chosen (the team "wakes up" on selection).
  useEffect(() => {
    pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outcome selected → (re)start the team: movie begins, employees wake,
  // activity + timeline flow.
  useEffect(() => {
    const id = outcome?.id ?? null;
    if (id && id !== prevOutcome.current) startRun();
    prevOutcome.current = id;
  }, [outcome, startRun]);

  // Campaign generated (Sprint 63P/63S) → play the live AI Movie of the team
  // building it AND surface the runtime flow automatically: the queued jobs,
  // the new creatives, and the review item appear without any manual docking
  // (Inspector is already in the right zone). Reuses showRegion — hidden→zone
  // only, so it never disturbs a layout the operator has already arranged.
  useEffect(() => {
    const id = gen?.id ?? null;
    if (id && id !== prevGen.current) {
      startRun();
      showRegion("queue", "float");
      showRegion("creative", "float");
      showRegion("approval", "float");
    }
    prevGen.current = id;
  }, [gen, startRun, showRegion]);

  // Run complete → approval appears.
  useEffect(() => {
    if (isComplete) showRegion("approval", "float");
  }, [isComplete, showRegion]);

  return null;
}

export function UnifiedWorkspace() {
  return (
    <OutcomeEngineProvider>
      <MovieProvider>
        <RegionManagerProvider>
          <Orchestrator />
          <div className="mx-auto w-full max-w-[1600px] px-3 py-5 md:px-6">
            <WorkspaceDock />
          </div>
        </RegionManagerProvider>
      </MovieProvider>
    </OutcomeEngineProvider>
  );
}
