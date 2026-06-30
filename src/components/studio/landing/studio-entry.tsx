"use client";

/**
 * AI Studio entry (Sprint 63N).
 *
 * The user lands on the AI Studio Home, not inside the workspace. The Unified
 * Workspace mounts only after they start an outcome, resume work, or open it.
 * Page-level composition — does not modify the workspace, runtimes, or
 * architecture.
 */

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AiStudioCommandCenter } from "@/components/studio/command/command-center";
import { UnifiedWorkspace } from "@/components/studio/workspace/unified-workspace";
import { AiStudioHome } from "@/components/studio/home/studio-home-experience";

type StudioMode = "home" | "command" | "workspace";

/** Persistent control to return to Home (Sprint 63.8A). */
function BackToHome({ onHome }: { onHome: () => void }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/[0.06] bg-[hsl(222_44%_6%)]/80 px-4 py-2 backdrop-blur-sm">
      <button
        type="button"
        onClick={onHome}
        className="studio-focusable inline-flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] px-2.5 py-1.5 type-caption font-semibold text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Home
      </button>
    </div>
  );
}

export function StudioEntry() {
  // The premium outcome-first Home (Sprint 63.1) is the default landing. From it
  // the user can generate (→ workspace) or open the advanced brief (→ command).
  // The Unified Workspace and Command Center are unchanged; a back control keeps
  // Home reachable from either.
  const [mode, setMode] = useState<StudioMode>("home");

  if (mode === "workspace") {
    return (
      <div className="flex flex-col">
        <BackToHome onHome={() => setMode("home")} />
        <UnifiedWorkspace />
      </div>
    );
  }
  if (mode === "command") {
    return (
      <div className="flex flex-col">
        <BackToHome onHome={() => setMode("home")} />
        <AiStudioCommandCenter onOpen={() => setMode("workspace")} />
      </div>
    );
  }
  return <AiStudioHome onOpen={() => setMode("workspace")} onAdvanced={() => setMode("command")} />;
}
