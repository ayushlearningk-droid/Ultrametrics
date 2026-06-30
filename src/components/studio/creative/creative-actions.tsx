"use client";

/**
 * Production Creative Browser — CreativeActions (Sprint 63).
 * Bookmark · Quick preview · Variants · Approve. Preview is functional; the rest
 * are inert (no backend). Keyboard + focus. Token-based.
 */

import { Bookmark, Eye, GitBranch, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreativeItem } from "./creative-data";

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  active,
  inert,
}: {
  icon: typeof Eye;
  label: string;
  onClick?: () => void;
  active?: boolean;
  inert?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={inert}
      title={inert ? `${label} (coming soon)` : label}
      onClick={onClick}
      className={cn(
        "studio-focusable flex h-7 w-7 items-center justify-center rounded-[var(--studio-radius-sm)] transition-colors",
        active ? "text-brand" : "text-foreground-muted hover:bg-white/[0.06] hover:text-foreground",
        inert && "cursor-default"
      )}
    >
      <Icon className="h-3.5 w-3.5" fill={active ? "currentColor" : "none"} />
    </button>
  );
}

export function CreativeActions({ item, onPreview }: { item: CreativeItem; onPreview: () => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <ActionBtn icon={Bookmark} label={item.bookmarked ? "Bookmarked" : "Bookmark"} active={item.bookmarked} inert />
      <ActionBtn icon={Eye} label="Quick preview" onClick={onPreview} />
      <ActionBtn icon={GitBranch} label={`${item.variants} variants`} inert />
      <ActionBtn icon={Check} label="Approve" active={item.status === "approved"} inert />
    </div>
  );
}
