"use client";

/**
 * Production Generation Queue — QueueDetails (Sprint 63).
 * A floating details panel for the selected pipeline item: preview · stage
 * timeline · employee · forecast · status · actions. Esc / backdrop close.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import { VideoPreviewCard, CreativeThumbnail } from "@/components/studio/media";
import { SAMPLE_CREATIVES } from "@/components/studio/creative/creative-data";
import { CreativeForecastChip } from "@/components/studio/creative/creative-metadata";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { outcomeById } from "@/components/studio/outcomes/outcomes-data";
import { useQueue, useQueueItem } from "./queue-context";
import { QueueStatus } from "./queue-status";
import { QueueActions } from "./queue-actions";
import { QueueTimeline } from "./queue-timeline";

export function QueueDetails() {
  const { selectedId, setSelectedId } = useQueue();
  const item = useQueueItem(selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    if (selectedId) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, setSelectedId]);

  if (!selectedId || !item) return null;
  const creative = SAMPLE_CREATIVES.find((c) => c.id === item.creativeId);
  const OwnerIcon = EMPLOYEE_ICON[item.assignedId];
  const outcome = outcomeById(item.outcomeId);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onPointerDown={() => setSelectedId(null)} aria-hidden />
      <div role="dialog" aria-modal aria-label="Pipeline item details" className="studio-surface-raised relative z-10 flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="type-body font-semibold text-foreground">{creative?.title ?? item.creativeId}</span>
            <QueueStatus status={item.status} />
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

          <div className="flex flex-wrap items-center gap-2 type-caption text-foreground-muted">
            {outcome && <span>{outcome.label}</span>}
            <span className="inline-flex items-center gap-1">
              <OwnerIcon className="h-3 w-3" /> {employeeName(item.assignedId)}
            </span>
            <span className="capitalize">{item.priority} priority</span>
            <span className="tabular-nums">{item.etaSec ? `~${item.etaSec}s` : "—"}</span>
            <CreativeForecastChip budget={item.budget} />
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="type-eyebrow text-foreground-muted">Production stages</h4>
            <QueueTimeline id={item.id} />
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="type-caption text-foreground-muted">Actions</span>
            <QueueActions item={item} />
          </div>
        </div>
      </div>
    </div>
  );
}
