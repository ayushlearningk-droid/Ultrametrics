"use client";

/**
 * Production Media — PlatformBadge (Sprint 63).
 *
 * A compact, real platform tag (icon + label). Token-based; no hardcoded colors.
 */

import { Instagram, Youtube, Facebook, Music2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformId } from "./types";

const PLATFORM: Record<PlatformId, { label: string; icon: LucideIcon }> = {
  tiktok: { label: "TikTok", icon: Music2 },
  reels: { label: "Reels", icon: Instagram },
  shorts: { label: "Shorts", icon: Youtube },
  meta: { label: "Meta", icon: Facebook },
  youtube: { label: "YouTube", icon: Youtube },
};

export function PlatformBadge({
  platform,
  className,
}: {
  platform: PlatformId;
  className?: string;
}) {
  const { label, icon: Icon } = PLATFORM[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--studio-radius-sm)] bg-black/45 px-1.5 py-0.5 type-caption text-foreground/90 backdrop-blur-sm",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
