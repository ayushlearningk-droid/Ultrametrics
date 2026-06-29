"use client";

/**
 * Production Media — ImagePreviewCard (Sprint 63).
 *
 * A real image card: framed image (4:3) with optional platform tag, metric
 * pills, title, and meta. Reuses MediaFrame + badges + studio-card tokens.
 */

import { cn } from "@/lib/utils";
import { MediaFrame } from "./media-frame";
import { PlatformBadge } from "./platform-badge";
import { PerformanceBadge } from "./performance-badge";
import type { MediaSource, PerformanceMetric, PlatformId } from "./types";

export function ImagePreviewCard({
  src,
  alt,
  title,
  meta,
  platform,
  metrics,
  className,
}: {
  src?: string;
  alt?: string;
  title?: string;
  meta?: string;
  platform?: PlatformId;
  metrics?: PerformanceMetric[];
  className?: string;
}) {
  const media: MediaSource = { kind: "image", src, alt: alt ?? title };
  return (
    <div className={cn("studio-card studio-card-interactive overflow-hidden", className)}>
      <div className="relative aspect-[4/3]">
        <MediaFrame media={media} />
        {platform && <PlatformBadge platform={platform} className="absolute left-2.5 top-2.5" />}
        {metrics && metrics.length > 0 && (
          <div className="absolute right-2.5 top-2.5 flex gap-1">
            {metrics.map((m) => (
              <PerformanceBadge key={m.label} metric={m} />
            ))}
          </div>
        )}
      </div>
      {(title || meta) && (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          {title && <p className="truncate type-body font-semibold text-foreground">{title}</p>}
          {meta && <span className="shrink-0 type-caption text-foreground-muted">{meta}</span>}
        </div>
      )}
    </div>
  );
}
