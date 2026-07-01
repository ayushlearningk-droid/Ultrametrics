"use client";

/**
 * Production Asset Inspector — InspectorActions (Sprint 63 · stabilized 64K).
 * Only actions that actually work are rendered. Export is live (Sprint 63.7);
 * unconnected actions are not shown (no disabled placeholders).
 */

import { ExportButton } from "@/components/studio/generation/export-center";
import { InspectorSection } from "./inspector-section";

export function InspectorActions() {
  return (
    <InspectorSection title="Quick actions">
      <div className="flex flex-col gap-1.5">
        <ExportButton />
      </div>
    </InspectorSection>
  );
}
