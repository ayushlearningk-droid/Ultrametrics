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
import { OutcomeEngineProvider } from "@/components/studio/outcomes/outcome-engine";
import { MovieProvider, useMovie } from "@/components/studio/movie/movie-context";
import { useGeneration } from "@/components/studio/generation/generation-store";
import { ExplanationOverlay } from "@/components/studio/generation/explanation-panel";
import { ExportDrawer } from "@/components/studio/generation/export-center";
import { RegionManagerProvider, useRegions } from "./region-manager";
import { WorkspaceDock } from "./workspace-dock";

/** Wires outcome selection → runtime start → approval reveal. Deterministic. */
function Orchestrator() {
  const gen = useGeneration();
  const { isComplete } = useMovie();
  const { showRegion } = useRegions();
  const prevGen = useRef<string | null>(null);

  // Campaign generated (Sprint 64H) → surface the execution flow: the queued jobs
  // and new creatives. The Movie/Team are execution-driven now — nothing is
  // "started"; they advance only as execution advances. Reuses showRegion
  // (hidden→zone only), never disturbing an arranged layout.
  useEffect(() => {
    const id = gen?.id ?? null;
    if (id && id !== prevGen.current) {
      showRegion("queue", "float");
      showRegion("creative", "float");
    }
    prevGen.current = id;
  }, [gen, showRegion]);

  // Approval appears only after execution completes.
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
          {/* AI Explainability Layer (Sprint 63Y) — single overlay for every surface. */}
          <ExplanationOverlay />
          {/* Production Export Center (Sprint 63.7) — single drawer for the shared selection. */}
          <ExportDrawer />
        </RegionManagerProvider>
      </MovieProvider>
    </OutcomeEngineProvider>
  );
}
