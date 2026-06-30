"use client";

/**
 * Production Asset Inspector — InspectorPerformance (Sprint 63).
 * Reuses PerformanceBadge. Honest empty state — no fabricated analytics.
 */

import { BarChart3 } from "lucide-react";
import { PerformanceBadge } from "@/components/studio/media";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorSection } from "./inspector-section";

export function InspectorPerformance({ item }: { item: CreativeItem }) {
  const has = Boolean(item.metrics && item.metrics.length > 0);
  return (
    <InspectorSection icon={<BarChart3 className="h-3.5 w-3.5 text-brand" />} title="Performance summary">
      {has ? (
        <div className="flex flex-wrap gap-1.5">
          {item.metrics!.map((m) => (
            <PerformanceBadge key={m.label} metric={m} />
          ))}
        </div>
      ) : (
        <p className="type-caption text-foreground-muted">No performance captured yet — publish to measure.</p>
      )}
    </InspectorSection>
  );
}
