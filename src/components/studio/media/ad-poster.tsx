"use client";

/**
 * Production Media — AdPoster (Sprint 63).
 *
 * The cinematic, edge-to-edge portrait ad poster: framed media (image or video),
 * platform tag, performance pills, a gradient title overlay, and optional
 * actions. Reuses MediaFrame + badges + studio-poster tokens.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MediaFrame } from "./media-frame";
import { PlatformBadge } from "./platform-badge";
import { PerformanceBadge } from "./performance-badge";
import type { MediaSource, PerformanceMetric, PlatformId } from "./types";

export function AdPoster({
  media,
  title,
  subtitle,
  platform,
  metrics,
  actions,
  className,
}: {
  media: MediaSource;
  title: string;
  subtitle?: string;
  platform?: PlatformId;
  metrics?: PerformanceMetric[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("studio-poster relative w-[208px] shrink-0 md:w-[228px]", className)}>
      <div className="relative aspect-[2/3]">
        <MediaFrame media={media} />

        {platform && <PlatformBadge platform={platform} className="absolute left-2.5 top-2.5" />}
        {metrics && metrics.length > 0 && (
          <div className="absolute right-2.5 top-2.5 flex flex-wrap justify-end gap-1">
            {metrics.map((m) => (
              <PerformanceBadge key={m.label} metric={m} />
            ))}
          </div>
        )}

        <div className="studio-poster-overlay absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3">
          <div className="flex flex-col gap-0.5">
            <p className="type-body font-semibold text-foreground">{title}</p>
            {subtitle && <p className="type-caption text-foreground-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      </div>
    </div>
  );
}
