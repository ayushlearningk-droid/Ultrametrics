"use client";

/**
 * Production Media — UGCCard (Sprint 63).
 *
 * A vertical (9:16) creator-style card: edge-to-edge media, creator handle, the
 * hook line, and optional metric pills. Reuses MediaFrame + badges + tokens.
 */

import { cn } from "@/lib/utils";
import { MediaFrame } from "./media-frame";
import { PerformanceBadge } from "./performance-badge";
import type { MediaSource, PerformanceMetric, PlatformId } from "./types";
import { PlatformBadge } from "./platform-badge";

export function UGCCard({
  src,
  poster,
  handle,
  hook,
  platform,
  metrics,
  className,
}: {
  src?: string;
  poster?: string;
  handle: string;
  hook: string;
  platform?: PlatformId;
  metrics?: PerformanceMetric[];
  className?: string;
}) {
  const media: MediaSource = { kind: "video", src, poster, alt: hook };
  return (
    <div className={cn("studio-poster relative w-[184px] shrink-0 md:w-[200px]", className)}>
      <div className="relative aspect-[9/16]">
        <MediaFrame media={media} />

        {platform && <PlatformBadge platform={platform} className="absolute left-2.5 top-2.5" />}
        {metrics && metrics.length > 0 && (
          <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
            {metrics.map((m) => (
              <PerformanceBadge key={m.label} metric={m} />
            ))}
          </div>
        )}

        <div className="studio-poster-overlay absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
          <span className="type-caption font-semibold text-brand">@{handle}</span>
          <p className="line-clamp-2 type-caption text-foreground/90">{hook}</p>
        </div>
      </div>
    </div>
  );
}
