"use client";

/**
 * Production Asset Inspector — InspectorMetadata (Sprint 63).
 * Creative details + Brand / Audience / Platform / Campaign + Generation + Tags.
 * Reuses PlatformBadge; graceful "—" for absent fields.
 */

import { Info } from "lucide-react";
import { PlatformBadge } from "@/components/studio/media";
import { employeeName } from "@/components/studio/employees/employees-data";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorSection, InspectorRow } from "./inspector-section";

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function InspectorMetadata({ item }: { item: CreativeItem }) {
  return (
    <InspectorSection icon={<Info className="h-3.5 w-3.5 text-brand" />} title="Creative details">
      <div className="flex flex-col gap-2">
        <InspectorRow label="Brand" value={item.brand ?? "—"} />
        <InspectorRow label="Audience" value={item.audience ?? "—"} />
        <InspectorRow label="Platform" value={<PlatformBadge platform={item.platform} className="bg-white/[0.05]" />} />
        <InspectorRow label="Campaign" value={item.campaign ?? "—"} />
        <InspectorRow label="Objective" value={item.objective ?? "—"} />
        <InspectorRow label="Language" value={item.language ?? "—"} />
        <InspectorRow label="Version" value={`v${item.version}`} />
        <InspectorRow label="Variants" value={item.variants} />
        <InspectorRow label="Created by" value={employeeName(item.ownerId)} />
        <InspectorRow label="Created" value={fmtDate(item.createdAt)} />
      </div>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-3">
          {item.tags.map((t) => (
            <span key={t} className="chip chip-slate">#{t}</span>
          ))}
        </div>
      )}
    </InspectorSection>
  );
}
