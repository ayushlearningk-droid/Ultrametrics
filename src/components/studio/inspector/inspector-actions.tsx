"use client";

/**
 * Production Asset Inspector — InspectorActions (Sprint 63).
 * Quick actions (inert this sprint) + a future AI-suggestions seam.
 */

import { Check, Bookmark, Copy, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { ExportButton } from "@/components/studio/generation/export-center";
import { InspectorSection } from "./inspector-section";

/** A not-yet-connected action — rendered clearly disabled (not a live button). */
function ActionRow({ icon: Icon, label }: { icon: typeof Check; label: string }) {
  return (
    <button
      type="button"
      disabled
      title={`${label} — not available yet`}
      className={cn(
        "flex w-full cursor-not-allowed items-center gap-2 rounded-[var(--studio-radius-sm)] px-3 py-2 type-caption text-foreground-muted/50"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <span className="ml-auto type-caption text-foreground-muted/40">Soon</span>
    </button>
  );
}

export function InspectorActions({ item }: { item: CreativeItem }) {
  return (
    <InspectorSection title="Quick actions">
      <div className="flex flex-col gap-1.5">
        {/* Export is live; the rest are not yet connected and are clearly disabled. */}
        <ExportButton />
        <ActionRow icon={LayoutGrid} label="Open in canvas" />
        <ActionRow icon={Check} label={item.status === "approved" ? "Approved" : "Approve"} />
        <ActionRow icon={Bookmark} label={item.bookmarked ? "Bookmarked" : "Bookmark"} />
        <ActionRow icon={Copy} label="Duplicate" />
      </div>
    </InspectorSection>
  );
}
