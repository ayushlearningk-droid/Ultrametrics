"use client";

/**
 * Production Asset Inspector — InspectorVariants (Sprint 63).
 * Reuses CreativeThumbnail for the related-variant rail (no duplicated media).
 */

import { Layers } from "lucide-react";
import { CreativeThumbnail } from "@/components/studio/media";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorSection } from "./inspector-section";

export function InspectorVariants({ item }: { item: CreativeItem }) {
  const variants = Array.from({ length: item.variants }, (_, i) => i + 1);
  return (
    <InspectorSection icon={<Layers className="h-3.5 w-3.5 text-brand" />} title="Related variants">
      <div className="studio-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {variants.map((v) => (
          <div key={v} className="flex w-24 shrink-0 flex-col gap-1">
            <div className="overflow-hidden rounded-[var(--studio-radius-md)]">
              <CreativeThumbnail media={item.media} aspect="video" />
            </div>
            <span className="text-center type-caption text-foreground-muted">v{v}</span>
          </div>
        ))}
      </div>
    </InspectorSection>
  );
}
