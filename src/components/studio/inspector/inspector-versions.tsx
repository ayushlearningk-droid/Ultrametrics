"use client";

/**
 * Production Asset Inspector — InspectorVersions (Sprint 63).
 * Version list with a future "Compare" (diff) seam (inert).
 */

import { GitBranch, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { InspectorSection } from "./inspector-section";

export function InspectorVersions({ item }: { item: CreativeItem }) {
  const versions = Array.from({ length: item.version }, (_, i) => item.version - i); // latest first
  return (
    <InspectorSection
      icon={<GitBranch className="h-3.5 w-3.5 text-brand" />}
      title="Versions"
      action={
        <button
          type="button"
          aria-disabled
          title="Compare versions (coming soon)"
          className="studio-focusable flex cursor-default items-center gap-1 type-caption text-foreground-muted/70 hover:text-foreground"
        >
          <GitCompare className="h-3 w-3" /> Compare
        </button>
      }
    >
      <div className="flex flex-col gap-1">
        {versions.map((v) => {
          const current = v === item.version;
          return (
            <div
              key={v}
              className={cn(
                "flex items-center justify-between rounded-[var(--studio-radius-sm)] px-2 py-1.5",
                current ? "bg-brand/10" : "hover:bg-white/[0.03]"
              )}
            >
              <span className={cn("type-caption", current ? "font-semibold text-brand" : "text-foreground/90")}>v{v}</span>
              {current && <span className="chip chip-emerald">Latest</span>}
            </div>
          );
        })}
      </div>
    </InspectorSection>
  );
}
