"use client";

/**
 * Production Media — CreativeThumbnail (Sprint 63).
 *
 * The smallest reusable media tile: a framed asset in a chosen aspect, with the
 * premium poster hover. Reuses MediaFrame + studio-poster tokens.
 */

import { cn } from "@/lib/utils";
import { MediaFrame } from "./media-frame";
import type { MediaSource } from "./types";

const ASPECT = {
  square: "aspect-square",
  portrait: "aspect-[2/3]",
  video: "aspect-video",
} as const;

export function CreativeThumbnail({
  media,
  aspect = "square",
  className,
}: {
  media: MediaSource;
  aspect?: keyof typeof ASPECT;
  className?: string;
}) {
  return (
    <div className={cn("studio-poster relative w-full", ASPECT[aspect], className)}>
      <MediaFrame media={media} />
    </div>
  );
}
