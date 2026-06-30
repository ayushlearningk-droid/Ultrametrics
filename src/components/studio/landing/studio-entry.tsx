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
import { AiStudioCommandCenter } from "@/components/studio/command/command-center";
import { UnifiedWorkspace } from "@/components/studio/workspace/unified-workspace";
import { AiStudioHome } from "@/components/studio/home/studio-home-experience";

type StudioMode = "home" | "command" | "workspace";

export function StudioEntry() {
  // The premium outcome-first Home (Sprint 63.1) is the default landing. From it
  // the user can generate (→ workspace) or open the advanced brief (→ command).
  // The Unified Workspace and Command Center are unchanged.
  const [mode, setMode] = useState<StudioMode>("home");

  if (mode === "workspace") return <UnifiedWorkspace />;
  if (mode === "command") return <AiStudioCommandCenter onOpen={() => setMode("workspace")} />;
  return <AiStudioHome onOpen={() => setMode("workspace")} onAdvanced={() => setMode("command")} />;
}
