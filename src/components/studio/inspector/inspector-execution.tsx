"use client";

/**
 * Production Asset Inspector — InspectorExecution (Sprint 64.3).
 *
 * Reads the asset's execution state from the Generation Store (via the resolved
 * CreativeItem) and shows status · provider · timestamps · media URL. Renders
 * nothing when the asset has no execution (e.g. sample creatives). No local
 * state, no timers — everything comes from the store.
 */

import { Cpu } from "lucide-react";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { EXECUTION_LABEL } from "@/components/studio/generation/execution";
import { InspectorSection, InspectorRow } from "./inspector-section";

function fmt(ms?: number): string {
  return ms ? new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export function InspectorExecution({ item }: { item: CreativeItem }) {
  const ex = item.execution;
  if (!ex) return null;
  return (
    <InspectorSection icon={<Cpu className="h-3.5 w-3.5 text-brand" />} title="Execution">
      <div className="flex flex-col gap-2">
        <InspectorRow label="Status" value={EXECUTION_LABEL[ex.status]} />
        <InspectorRow label="Provider" value={ex.provider ?? "—"} />
        <InspectorRow label="Started" value={fmt(ex.startedAt)} />
        <InspectorRow label="Completed" value={fmt(ex.completedAt)} />
        <InspectorRow label="Resolution" value={ex.resolution ?? "—"} />
        <InspectorRow label="MIME type" value={ex.mimeType ?? "—"} />
        <InspectorRow label="Latency" value={ex.latencyMs != null ? `${ex.latencyMs} ms (rel.)` : "—"} />
        <InspectorRow label="Cost" value={ex.cost != null ? `${ex.cost} cr (rel.)` : "—"} />
        <InspectorRow label="Generation time" value={ex.generationTimeMs != null ? `${ex.generationTimeMs} ms (rel.)` : "—"} />
        <InspectorRow label="Seed" value={ex.seed != null ? String(ex.seed) : "—"} />
        <InspectorRow label="Media URL" value={ex.mediaUrl ?? "—"} />
        {ex.error && <InspectorRow label="Error" value={ex.error} />}
      </div>
    </InspectorSection>
  );
}
