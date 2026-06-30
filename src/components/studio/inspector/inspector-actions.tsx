"use client";

/**
 * Production Asset Inspector — InspectorActions (Sprint 63).
 * Quick actions (inert this sprint) + a future AI-suggestions seam.
 */

import { Check, Bookmark, Copy, Upload, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorSection } from "./inspector-section";

function ActionRow({ icon: Icon, label, primary }: { icon: typeof Check; label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      aria-disabled
      title={`${label} (coming soon)`}
      className={cn(
        "studio-focusable flex w-full cursor-default items-center gap-2 rounded-[var(--studio-radius-sm)] px-3 py-2 type-caption transition-colors",
        primary ? "bg-brand/15 font-semibold text-brand" : "text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function InspectorActions({ item }: { item: CreativeItem }) {
  return (
    <InspectorSection title="Quick actions">
      <div className="flex flex-col gap-1.5">
        <ActionRow icon={LayoutGrid} label="Open in canvas" primary />
        <ActionRow icon={Check} label={item.status === "approved" ? "Approved" : "Approve"} />
        <ActionRow icon={Bookmark} label={item.bookmarked ? "Bookmarked" : "Bookmark"} />
        <ActionRow icon={Copy} label="Duplicate" />
        <ActionRow icon={Upload} label="Export" />
      </div>
    </InspectorSection>
  );
}
