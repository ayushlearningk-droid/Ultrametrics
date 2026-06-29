"use client";

/**
 * AI Studio Shell — composition (Sprint 63I).
 *
 * Assembles the five regions + the L4 floating mount over the (parent-provided)
 * L0 environment. Region visibility is driven by shell state, never hardcoded —
 * each region is independently replaceable. Reuses the parent AskProvider /
 * EnvironmentLayer / CommandPalette (no duplicate providers or chrome).
 *
 * SCOPE: shell only. No canvas, generation, providers, AI employees, or business
 * logic — regions render reserved placeholders. Designed to host every future
 * Roadmap 8.0 module without redesign.
 *
 * Depth: L0 (parent env) · L1 nav/workspace · L2 activity · L3 intent/dock · L4 floating.
 */

import { useEffect } from "react";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { StudioShellProvider, useStudioShell } from "./shell-context";
import { StudioNavRail } from "./studio-nav-rail";
import { StudioIntentBar } from "./intent-bar";
import { StudioWorkspaceRegion } from "./workspace-region";
import { StudioActivityRail } from "./activity-rail";
import { StudioAiDock } from "./ai-dock";
import { StudioFloatingLayer } from "./floating-layer";

function ShellInner({ children }: { children?: React.ReactNode }) {
  const { isCollapsed, toggleRegion, setRegionCollapsed } = useStudioShell();
  const activityHidden = isCollapsed("activity");

  // Responsive default: collapse the activity rail on small screens after mount
  // (avoids a hydration mismatch; lg+ keeps it open). Idempotent → strict-mode safe.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    setRegionCollapsed("activity", mq.matches);
  }, [setRegionCollapsed]);

  // Keyboard-first: toggle the activity rail. ⌘K (palette) + ? (help) come from
  // the global shell; this adds only a studio-scoped binding.
  useKeyboardShortcuts([
    { combo: "mod+j", handler: () => toggleRegion("activity") },
  ]);

  return (
    <div className="relative flex min-h-[78vh] w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.01]">
      {/* L1 — Left AI workspace navigation */}
      <StudioNavRail />

      {/* Center column: intent (L3) · workspace (L1) · dock (L3) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <StudioIntentBar />
        <div className="flex min-h-0 flex-1">
          <StudioWorkspaceRegion>{children}</StudioWorkspaceRegion>
        </div>
        <StudioAiDock />
      </div>

      {/* L2 — Right activity & approval rail (in-flow on lg+, slide-over below) */}
      {!activityHidden && (
        <>
          <div
            aria-hidden
            onClick={() => toggleRegion("activity")}
            className="absolute inset-0 z-20 bg-black/40 lg:hidden"
          />
          <div className="absolute right-0 top-0 z-30 h-full w-[min(88vw,340px)] shadow-floating lg:static lg:z-auto lg:w-[340px] lg:shadow-none">
            <StudioActivityRail />
          </div>
        </>
      )}

      {/* L4 — Floating layer mount (empty this sprint) */}
      <StudioFloatingLayer />
    </div>
  );
}

export function AiStudioShell({ children }: { children?: React.ReactNode }) {
  return (
    <StudioShellProvider>
      <ShellInner>{children}</ShellInner>
    </StudioShellProvider>
  );
}
