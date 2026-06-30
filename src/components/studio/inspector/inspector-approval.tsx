"use client";

/**
 * Production Asset Inspector — InspectorApproval (Sprint 63).
 * Status + a deterministic approval step trail. Future approval-workflow seam.
 */

import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreativeStatus } from "@/components/studio/creative/creative-status";
import type { CreativeItem, CreativeStatusId } from "@/components/studio/creative/creative-data";
import { InspectorSection } from "./inspector-section";

const STEPS = ["Submitted", "Brand check", "Approved"];

function doneCount(status: CreativeStatusId): number {
  switch (status) {
    case "approved":
      return 3;
    case "pending":
      return 2;
    case "generated":
      return 1;
    case "archived":
    default:
      return 1;
  }
}

export function InspectorApproval({ item }: { item: CreativeItem }) {
  const done = doneCount(item.status);
  return (
    <InspectorSection
      icon={<ShieldCheck className="h-3.5 w-3.5 text-brand" />}
      title="Approval status"
      action={<CreativeStatus status={item.status} />}
    >
      <ol className="flex flex-col gap-1.5">
        {STEPS.map((label, i) => {
          const complete = i < done;
          const current = i === done && item.status === "pending";
          return (
            <li key={label} className="flex items-center gap-2">
              {complete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
              ) : (
                <Circle className={cn("h-3.5 w-3.5", current ? "text-amber-400" : "text-foreground-muted/40")} />
              )}
              <span className={cn("type-caption", complete ? "text-foreground/90" : current ? "text-amber-400" : "text-foreground-muted")}>
                {label}
                {current && " · in review"}
              </span>
            </li>
          );
        })}
      </ol>
    </InspectorSection>
  );
}
