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
import { MovieProvider } from "@/components/studio/movie/movie-context";
import { useGeneration } from "@/components/studio/generation/generation-store";
import { ExplanationOverlay } from "@/components/studio/generation/explanation-panel";
import { ExportDrawer } from "@/components/studio/generation/export-center";
import { RegionManagerProvider, useRegions } from "./region-manager";
import { WorkspaceDock } from "./workspace-dock";
import { WorkspaceGuide } from "./workspace-guide";

/** Progressive reveal (Sprint 64AA): surfaces regions only as real work reaches
 * them — Movie when the AI team starts, Gallery + Inspector when the first asset
 * exists, Approval when the run completes. Reuses showRegion (hidden→zone only),
 * never disturbing an arranged layout. Purely UI sequencing over the store. */
function Orchestrator() {
  const gen = useGeneration();
  const { showRegion } = useRegions();
  const prevGen = useRef<string | null>(null);
  const revealed = useRef<{ assets: boolean }>({ assets: false });

  const id = gen?.id ?? null;
  const status = gen?.execution.status ?? null;
  const completed = gen?.execution.completedJobs ?? 0;

  // New campaign → the AI team starts. Reveal the Movie in the guided center column.
  useEffect(() => {
    if (id && id !== prevGen.current) {
      revealed.current = { assets: false };
      showRegion("movie", "center");
    }
    prevGen.current = id;
  }, [id, showRegion]);

  // First asset produced → reveal the Gallery (center column, below the Movie).
  useEffect(() => {
    if (completed > 0 && !revealed.current.assets) {
      revealed.current.assets = true;
      showRegion("creative", "center");
    }
  }, [completed, showRegion]);

  // Run complete → reveal Approval (center column).
  useEffect(() => {
    if (status === "completed") showRegion("approval", "center");
  }, [status, showRegion]);

  return null;
}

export function UnifiedWorkspace() {
  return (
    <OutcomeEngineProvider>
      <MovieProvider>
        <RegionManagerProvider>
          <Orchestrator />
          <div className="mx-auto w-full max-w-[1600px] px-3 py-5 md:px-6">
            <WorkspaceGuide />
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
