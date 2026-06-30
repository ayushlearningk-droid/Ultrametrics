"use client";

/**
 * Production Creative Browser — CreativeRow (list unit, Sprint 63).
 * Reuses CreativeThumbnail + badges + metadata + actions.
 */

import { CreativeThumbnail, PerformanceBadge } from "@/components/studio/media";
import { useCreativeBrowser } from "./creative-context";
import { CreativeStatus } from "./creative-status";
import { CreativeMetadata } from "./creative-metadata";
import { CreativeActions } from "./creative-actions";
import type { CreativeItem } from "./creative-data";

export function CreativeRow({ item }: { item: CreativeItem }) {
  const { setPreviewId } = useCreativeBrowser();
  return (
    <div className="studio-card flex items-center gap-3 p-2.5">
      <div className="w-24 shrink-0 overflow-hidden rounded-[var(--studio-radius-md)]">
        <CreativeThumbnail media={item.media} aspect="video" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="truncate type-body font-semibold text-foreground">{item.title}</p>
          <CreativeStatus status={item.status} />
        </div>
        <CreativeMetadata item={item} />
      </div>
      {item.metrics && item.metrics.length > 0 && (
        <div className="hidden gap-1 md:flex">
          {item.metrics.map((m) => (
            <PerformanceBadge key={m.label} metric={m} />
          ))}
        </div>
      )}
      <CreativeActions item={item} onPreview={() => setPreviewId(item.id)} />
    </div>
  );
}
