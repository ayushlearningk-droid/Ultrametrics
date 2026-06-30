"use client";

/**
 * Production Generation Queue — QueueTimeline (Sprint 63).
 * The production pipeline stages for an item, reusing the Movie PIPELINE.
 * Done · current · upcoming · failed states are derived from the item.
 */

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE } from "@/components/studio/employees/employees-data";
import { useQueueItem } from "./queue-context";

export function QueueTimeline({ id }: { id: string }) {
  const item = useQueueItem(id);
  if (!item) return null;

  const currentIdx = item.stageId ? PIPELINE.findIndex((s) => s.id === item.stageId) : -1;

  function stateOf(i: number): "done" | "current" | "failed" | "upcoming" {
    if (item!.status === "completed") return "done";
    if (item!.status === "queued" || item!.status === "cancelled") return "upcoming";
    if (currentIdx < 0) return "upcoming";
    if (i < currentIdx) return "done";
    if (i === currentIdx) return item!.status === "failed" ? "failed" : "current";
    return "upcoming";
  }

  return (
    <div className="studio-scroll -mx-1 flex items-stretch gap-0 overflow-x-auto px-1 pb-1">
      {PIPELINE.map((stage, i) => {
        const st = stateOf(i);
        return (
          <div key={stage.id} className="flex items-center">
            {i > 0 && (
              <span className={cn("h-px w-6 self-center", st === "done" ? "bg-brand/50" : "bg-white/[0.08]")} />
            )}
            <div
              className={cn(
                "flex w-[92px] shrink-0 flex-col items-center gap-1 rounded-[var(--studio-radius-md)] px-1.5 py-2 text-center",
                st === "current" && "bg-brand/[0.06]"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-foreground-muted",
                  st === "done" && "border-brand/40 bg-brand/10 text-brand",
                  st === "current" && "border-brand/40 text-brand anim-pulse",
                  st === "failed" && "border-red-400/40 text-red-400",
                  st === "upcoming" && "border-white/[0.08] opacity-60"
                )}
              >
                {st === "done" ? <Check className="h-3 w-3" /> : st === "failed" ? <X className="h-3 w-3" /> : <span className="text-[10px] tabular-nums">{i + 1}</span>}
              </span>
              <span className={cn("type-caption leading-tight", st === "upcoming" ? "text-foreground-muted/60" : "text-foreground-muted")}>
                {stage.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
