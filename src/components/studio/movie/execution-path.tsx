"use client";

/**
 * AI Movie — execution path / stage timeline (Sprint 63I).
 *
 * Horizontal rail of the workforce: finished · current · upcoming workers, with
 * an animated handoff (the connector into the current worker flows). Reuses the
 * existing anim-flow + Studio motion tokens. No progress bars.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useMovie } from "./movie-context";

export function ExecutionPath() {
  const { movie } = useMovie();

  return (
    <div className="studio-scroll flex items-stretch gap-0 overflow-x-auto pb-2">
      {movie.stages.map((stage, i) => {
        const Icon = EMPLOYEE_ICON[stage.ownerId];
        const isCurrent = stage.status === "current";
        const isFinished = stage.status === "finished";
        // The connector LEADING INTO this node flows when this node is current
        // (the live handoff). The connector before the first node is omitted.
        const flowing = isCurrent;

        return (
          <div key={stage.id} className="flex shrink-0 items-center">
            {i > 0 && (
              <div className="relative h-0.5 w-10 self-center overflow-hidden rounded-full bg-white/[0.08]">
                {flowing && <div className="anim-flow absolute inset-0" />}
                {isFinished && <div className="absolute inset-0 bg-brand/50" />}
              </div>
            )}

            <div
              className={cn(
                "flex w-[112px] flex-col items-center gap-1.5 rounded-[var(--studio-radius-lg)] px-2 py-3 text-center transition-colors",
                isCurrent && "studio-glow studio-breathe bg-brand/[0.06]",
                stage.status === "upcoming" && "opacity-50"
              )}
            >
              <div
                className={cn(
                  "studio-tile relative flex h-10 w-10 items-center justify-center",
                  isCurrent ? "text-brand" : "text-foreground-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {isFinished && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[hsl(222_44%_6%)] bg-brand">
                    <Check className="h-2 w-2 text-[hsl(222_44%_6%)]" />
                  </span>
                )}
              </div>
              <span className="type-caption font-semibold text-foreground">
                {employeeName(stage.ownerId)}
              </span>
              <span className="type-caption leading-tight text-foreground-muted">
                {isCurrent ? stage.label : isFinished ? "Done" : "Up next"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
