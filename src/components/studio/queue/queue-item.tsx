"use client";

/**
 * Production Generation Queue — QueueItem (Sprint 63).
 * One pipeline item: preview · outcome · stage · employee · priority · ETA ·
 * forecast · status · actions. Reuses media + employees + forecast.
 */

import { Clock, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreativeThumbnail } from "@/components/studio/media";
import { resolveCreative } from "@/components/studio/creative/creative-data";
import { selectAsset, useSelectedAsset } from "@/components/studio/generation/generation-store";
import { CreativeForecastChip } from "@/components/studio/creative/creative-metadata";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { MOVIE_LABEL } from "@/components/studio/movie/movie-runtime";
import { outcomeById } from "@/components/studio/outcomes/outcomes-data";
import { QueueStatus } from "./queue-status";
import { QueueActions } from "./queue-actions";
import type { QueueItem as QueueItemType } from "./queue-data";

const PRIORITY_CLASS = { high: "text-brand", normal: "text-foreground-muted", low: "text-foreground-muted/60" } as const;

function etaLabel(item: QueueItemType): string {
  if (item.status === "running" || item.status === "queued" || item.status === "paused") return `~${item.etaSec}s`;
  return "—";
}

export function QueueItem({ item }: { item: QueueItemType }) {
  const creative = resolveCreative(item.creativeId);
  const OwnerIcon = EMPLOYEE_ICON[item.assignedId];
  const outcome = outcomeById(item.outcomeId);
  const stage = item.stageId ? MOVIE_LABEL[item.stageId] : null;
  const isSelected = useSelectedAsset() === item.creativeId;

  return (
    <div className={cn("studio-card flex items-center gap-3 p-2.5", isSelected && "ring-1 ring-brand/50")}>
      <button
        type="button"
        onClick={() => selectAsset(item.creativeId)}
        aria-pressed={isSelected}
        title="Focus this asset"
        className={cn(
          "studio-focusable w-20 shrink-0 overflow-hidden rounded-[var(--studio-radius-md)]",
          isSelected && "ring-2 ring-brand"
        )}
      >
        {creative ? <CreativeThumbnail media={creative.media} aspect="video" /> : <div className="studio-media aspect-video" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <p className="truncate type-body font-semibold text-foreground">{creative?.title ?? item.creativeId}</p>
          <QueueStatus status={item.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 type-caption text-foreground-muted">
          {outcome && <span>{outcome.label}</span>}
          {stage && <span className="text-brand">{stage}</span>}
          <span className="inline-flex items-center gap-1">
            <OwnerIcon className="h-3 w-3" /> {employeeName(item.assignedId)}
          </span>
          <span className={cn("inline-flex items-center gap-1", PRIORITY_CLASS[item.priority])}>
            <Flag className="h-3 w-3" /> {item.priority}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3" /> {etaLabel(item)}
          </span>
          <CreativeForecastChip budget={item.budget} />
          {item.dnaVersion && <span className="chip chip-slate">DNA {item.dnaVersion}</span>}
        </div>
      </div>

      <QueueActions item={item} />
    </div>
  );
}
