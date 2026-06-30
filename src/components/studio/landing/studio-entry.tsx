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

export function StudioEntry() {
  const [opened, setOpened] = useState(false);
  return opened ? <UnifiedWorkspace /> : <AiStudioCommandCenter onOpen={() => setOpened(true)} />;
}
