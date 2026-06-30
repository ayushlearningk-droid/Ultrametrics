"use client";

/**
 * Production Asset Inspector — InspectorHistory (Sprint 63).
 * Timestamped event trail (from the asset, or derived). Future realtime seam.
 */

import { History, CircleDot } from "lucide-react";
import { employeeName } from "@/components/studio/employees/employees-data";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorSection } from "./inspector-section";

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function InspectorHistory({ item }: { item: CreativeItem }) {
  const events = item.history ?? [{ at: item.createdAt, text: `Created by ${employeeName(item.ownerId)}` }];
  return (
    <InspectorSection icon={<History className="h-3.5 w-3.5 text-brand" />} title="History">
      <ol className="flex flex-col gap-1.5">
        {events.map((e, i) => (
          <li key={i} className="flex items-center gap-2">
            <CircleDot className="h-3 w-3 text-foreground-muted" />
            <span className="type-caption text-foreground/90">{e.text}</span>
            <span className="ml-auto type-caption tabular-nums text-foreground-muted">{timeLabel(e.at)}</span>
          </li>
        ))}
      </ol>
    </InspectorSection>
  );
}
