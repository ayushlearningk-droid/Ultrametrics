"use client";

/**
 * Production Asset Inspector (Sprint 63).
 *
 * The Creative Intelligence Inspector — not a properties sidebar. Composes the
 * reusable inspector sections over a selected creative, reusing the Creative
 * Browser data, media components, Forecast Foundation, and Employees registry.
 * Plugs into the Unified Workspace as the Inspector region. Presentation only.
 */

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExplainButton } from "@/components/studio/generation/explanation-panel";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorProvider, useInspector } from "./inspector-context";
import { InspectorPreview } from "./inspector-preview";
import { InspectorMetadata } from "./inspector-metadata";
import { InspectorExecution } from "./inspector-execution";
import { InspectorForecast } from "./inspector-forecast";
import { InspectorPerformance } from "./inspector-performance";
import { InspectorVersions } from "./inspector-versions";
import { InspectorApproval } from "./inspector-approval";
import { InspectorOwnership } from "./inspector-ownership";
import { InspectorVariants } from "./inspector-variants";
import { InspectorHistory } from "./inspector-history";
import { InspectorNotes } from "./inspector-notes";
import { InspectorActions } from "./inspector-actions";

function AssetPicker() {
  const { items, selectedId, setSelectedId } = useInspector();
  return (
    <div className="studio-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={selectedId === c.id}
          onClick={() => setSelectedId(c.id)}
          className={cn(
            "studio-focusable shrink-0 rounded-full px-2.5 py-1 type-caption transition-colors",
            selectedId === c.id ? "bg-brand/10 text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          )}
        >
          {c.title}
        </button>
      ))}
    </div>
  );
}

function Body() {
  const { asset } = useInspector();

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-4 px-1 py-3">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Creative Intelligence
          </span>
          <ExplainButton stage="Creative Generated" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Inspector</h2>
        <AssetPicker />
      </header>

      {!asset ? (
        <div className="studio-card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="type-body font-semibold text-foreground">No creative selected</p>
          <p className="type-caption text-foreground-muted">Pick a creative above to inspect it.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <InspectorPreview item={asset} />
          <InspectorActions />
          <InspectorExecution item={asset} />
          <InspectorMetadata item={asset} />
          <InspectorPerformance item={asset} />
          <InspectorForecast item={asset} />
          <InspectorApproval item={asset} />
          <InspectorOwnership item={asset} />
          <InspectorVersions item={asset} />
          <InspectorVariants item={asset} />
          <InspectorHistory item={asset} />
          <InspectorNotes />
        </div>
      )}
    </div>
  );
}

export function AssetInspector({
  initialId,
  source,
}: {
  initialId?: string | null;
  source?: CreativeItem[];
}) {
  return (
    <InspectorProvider initialId={initialId} source={source}>
      <Body />
    </InspectorProvider>
  );
}
