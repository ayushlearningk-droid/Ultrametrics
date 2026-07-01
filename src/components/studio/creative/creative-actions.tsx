"use client";

/**
 * Production Creative Browser — CreativeActions (Sprint 63 · stabilized 64K).
 * Only the working action (Quick preview) is rendered. Unconnected actions
 * (bookmark / variants / approve) are not shown — no disabled placeholders.
 */

import { Eye } from "lucide-react";

export function CreativeActions({ onPreview }: { onPreview: () => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Quick preview"
        title="Quick preview"
        onClick={onPreview}
        className="studio-focusable flex h-7 w-7 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
