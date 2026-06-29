"use client";

/**
 * Production Media — VideoPreviewCard (Sprint 63).
 *
 * A real, autoplay-on-hover video card (16:9) with optional duration, platform
 * tag, metric pills, title, and subtitle. Reuses MediaFrame + badges + tokens.
 */

import { cn } from "@/lib/utils";
import { MediaFrame } from "./media-frame";
import { PlatformBadge } from "./platform-badge";
import { PerformanceBadge } from "./performance-badge";
import type { MediaSource, PerformanceMetric, PlatformId } from "./types";

export function VideoPreviewCard({
  src,
  poster,
  title,
  subtitle,
  duration,
  platform,
  metrics,
  className,
}: {
  src?: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  duration?: string;
  platform?: PlatformId;
  metrics?: PerformanceMetric[];
  className?: string;
}) {
  const media: MediaSource = { kind: "video", src, poster, alt: title };
  return (
    <div className={cn("studio-card studio-card-interactive overflow-hidden", className)}>
      <div className="relative aspect-video">
        <MediaFrame media={media} />
        {platform && <PlatformBadge platform={platform} className="absolute left-2.5 top-2.5" />}
        {metrics && metrics.length > 0 && (
          <div className="absolute right-2.5 top-2.5 flex gap-1">
            {metrics.map((m) => (
              <PerformanceBadge key={m.label} metric={m} />
            ))}
          </div>
        )}
        {duration && (
          <span className="absolute bottom-2.5 right-2.5 rounded-[var(--studio-radius-sm)] bg-black/55 px-1.5 py-0.5 type-caption tabular-nums text-foreground/90 backdrop-blur-sm">
            {duration}
          </span>
        )}
      </div>
      {(title || subtitle) && (
        <div className="flex flex-col gap-0.5 px-3 py-2.5">
          {title && <p className="truncate type-body font-semibold text-foreground">{title}</p>}
          {subtitle && <p className="truncate type-caption text-foreground-muted">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
