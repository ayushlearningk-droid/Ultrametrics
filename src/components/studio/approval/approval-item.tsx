"use client";

/**
 * Production Approval Center — ApprovalItem (Sprint 63).
 * Preview · outcome · assigned · reviewer · priority · forecast · status ·
 * actions. Reuses media + employees + forecast.
 */

import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreativeThumbnail } from "@/components/studio/media";
import { resolveCreative } from "@/components/studio/creative/creative-data";
import { selectAsset, useSelectedAsset } from "@/components/studio/generation/generation-store";
import { CreativeForecastChip } from "@/components/studio/creative/creative-metadata";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { outcomeById } from "@/components/studio/outcomes/outcomes-data";
import { ExplainButton } from "@/components/studio/generation/explanation-panel";
import { ApprovalStatus } from "./approval-status";
import { ReviewerBadge } from "./reviewer-badge";
import { ApprovalActions } from "./approval-actions";
import type { ApprovalItem as ApprovalItemType } from "./approval-data";

const PRIORITY_CLASS = { high: "text-brand", normal: "text-foreground-muted", low: "text-foreground-muted/60" } as const;

export function ApprovalItem({ item }: { item: ApprovalItemType }) {
  const creative = resolveCreative(item.creativeId);
  const AssignedIcon = EMPLOYEE_ICON[item.assignedId];
  const outcome = outcomeById(item.outcomeId);
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
          <ApprovalStatus status={item.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 type-caption text-foreground-muted">
          {outcome && <span>{outcome.label}</span>}
          <span className="inline-flex items-center gap-1">
            <AssignedIcon className="h-3 w-3" /> {employeeName(item.assignedId)}
          </span>
          <ReviewerBadge id={item.reviewerId} />
          <span className={cn("inline-flex items-center gap-1", PRIORITY_CLASS[item.priority])}>
            <Flag className="h-3 w-3" /> {item.priority}
          </span>
          <span className="type-caption">v{item.version}</span>
          <CreativeForecastChip budget={item.budget} />
          {item.dnaVersion && <span className="chip chip-slate">DNA {item.dnaVersion}</span>}
          <ExplainButton stage="Approval Requested" />
        </div>
      </div>

      <ApprovalActions item={item} />
    </div>
  );
}
