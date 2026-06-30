"use client";

/**
 * Production Approval Center — ApprovalDetails (Sprint 63).
 * Floating review panel: preview · reviewer · approval timeline · forecast +
 * performance (reused from the Asset Inspector) · comments · history · actions.
 * Esc / backdrop close. No duplicated inspector logic.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import { VideoPreviewCard, CreativeThumbnail } from "@/components/studio/media";
import { resolveCreative } from "@/components/studio/creative/creative-data";
import { InspectorForecast } from "@/components/studio/inspector/inspector-forecast";
import { InspectorPerformance } from "@/components/studio/inspector/inspector-performance";
import { useApproval, useApprovalItem } from "./approval-context";
import { ApprovalStatus } from "./approval-status";
import { ReviewerBadge } from "./reviewer-badge";
import { ApprovalTimeline } from "./approval-timeline";
import { ApprovalComments } from "./approval-comments";
import { ApprovalHistory } from "./approval-history";
import { ApprovalActions } from "./approval-actions";

export function ApprovalDetails() {
  const { selectedId, setSelectedId } = useApproval();
  const item = useApprovalItem(selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    if (selectedId) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, setSelectedId]);

  if (!selectedId || !item) return null;
  const creative = resolveCreative(item.creativeId);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onPointerDown={() => setSelectedId(null)} aria-hidden />
      <div role="dialog" aria-modal aria-label="Approval details" className="studio-surface-raised relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="type-body font-semibold text-foreground">{creative?.title ?? item.creativeId}</span>
            <ApprovalStatus status={item.status} />
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setSelectedId(null)}
            className="studio-focusable flex h-7 w-7 items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <div className="overflow-hidden rounded-[var(--studio-radius-lg)]">
            {creative?.media.kind === "video" ? (
              <VideoPreviewCard platform={creative.platform} metrics={creative.metrics} />
            ) : creative ? (
              <CreativeThumbnail media={creative.media} aspect="video" />
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <ReviewerBadge id={item.reviewerId} />
            <ApprovalActions item={item} />
          </div>

          <div className="studio-card flex flex-col gap-2 p-4">
            <h4 className="type-eyebrow text-foreground-muted">Approval stage</h4>
            <ApprovalTimeline id={item.id} />
          </div>

          {creative && <InspectorForecast item={creative} />}
          {creative && <InspectorPerformance item={creative} />}

          <ApprovalComments item={item} />
          <ApprovalHistory item={item} />
        </div>
      </div>
    </div>
  );
}
