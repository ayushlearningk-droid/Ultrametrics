"use client";

/** Production Asset Inspector — InspectorPreview (Sprint 63). Reuses media. */

import { VideoPreviewCard, CreativeThumbnail, PlatformBadge } from "@/components/studio/media";
import { CreativeStatus } from "@/components/studio/creative/creative-status";
import type { CreativeItem } from "@/components/studio/creative/creative-data";

export function InspectorPreview({ item }: { item: CreativeItem }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--studio-radius-lg)]">
      {item.media.kind === "video" ? (
        <VideoPreviewCard platform={item.platform} metrics={item.metrics} />
      ) : (
        <>
          <CreativeThumbnail media={item.media} aspect="video" />
          <PlatformBadge platform={item.platform} className="absolute left-2.5 top-2.5" />
        </>
      )}
      <CreativeStatus status={item.status} className="absolute right-2.5 top-2.5" />
    </div>
  );
}
