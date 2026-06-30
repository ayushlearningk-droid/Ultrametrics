"use client";

/**
 * Production Creative Browser — CreativeCard (grid unit, Sprint 63).
 * Reuses CreativeThumbnail + badges + metadata + actions. No duplicated media UI.
 */

import { cn } from "@/lib/utils";
import { CreativeThumbnail, PlatformBadge, PerformanceBadge } from "@/components/studio/media";
import { useCreativeBrowser } from "./creative-context";
import { CreativeStatus } from "./creative-status";
import { CreativeMetadata } from "./creative-metadata";
import { CreativeActions } from "./creative-actions";
import type { CreativeItem } from "./creative-data";

export function CreativeCard({ item }: { item: CreativeItem }) {
  const { setPreviewId } = useCreativeBrowser();
  return (
    <div className="studio-card studio-card-interactive flex flex-col overflow-hidden">
      <div className="relative">
        <CreativeThumbnail media={item.media} aspect="video" />
        <PlatformBadge platform={item.platform} className="absolute left-2.5 top-2.5" />
        <CreativeStatus status={item.status} className="absolute right-2.5 top-2.5" />
        {item.metrics && item.metrics.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 flex gap-1">
            {item.metrics.map((m) => (
              <PerformanceBadge key={m.label} metric={m} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <p className="truncate type-body font-semibold text-foreground">{item.title}</p>
        <CreativeMetadata item={item} compact />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {item.tags.slice(0, 2).map((t) => (
              <span key={t} className={cn("chip chip-slate")}>#{t}</span>
            ))}
          </div>
          <CreativeActions item={item} onPreview={() => setPreviewId(item.id)} />
        </div>
      </div>
    </div>
  );
}
