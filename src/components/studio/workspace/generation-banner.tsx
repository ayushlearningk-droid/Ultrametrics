"use client";

/**
 * Live Generation Banner (Sprint 64AD) — the "wow moment".
 *
 * A live status banner shown while a campaign generates. Every phase and number
 * is derived ONLY from real execution state (the Generation Store) — no fake
 * timers, no fabricated progress. Phases: Researching · Planning · Writing ·
 * Generating Images · Saving Assets · Completed. On completion it celebrates
 * ("Your campaign is ready."); on failures it offers an inline retry.
 * Presentation only.
 */

import { useEffect, useState } from "react";
import { Loader2, Check, AlertTriangle, PartyPopper, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeneration } from "@/components/studio/generation/generation-store";
import { executeGeneration } from "@/components/studio/generation/executor";

const PHASES = ["Researching", "Planning", "Writing", "Generating Images", "Saving Assets", "Completed"];

/** Current phase index — derived purely from execution state. */
function phaseIndex(status: string | null, completedJobs: number): number {
  if (status === "completed") return 5;
  if (status === "running") return 3;
  if (completedJobs > 0) return 4;
  return 2; // queued: the plan is done; generation about to start
}

export function GenerationBanner() {
  const gen = useGeneration();
  const [dismissed, setDismissed] = useState(false);

  // Reset the dismissed state whenever a new campaign starts.
  const id = gen?.id ?? null;
  useEffect(() => {
    setDismissed(false);
  }, [id]);

  if (!gen || gen.execution.totalJobs === 0) return null;

  const ex = gen.execution;
  const done = ex.status === "completed";
  if (done && dismissed) return null;

  const failed = gen.creatives.filter((c) => c.execution?.status === "failed" || c.execution?.status === "cancelled");
  const phase = phaseIndex(ex.status, ex.completedJobs);

  return (
    <div className="flex flex-col gap-2 border-t border-white/[0.06] px-3 py-2.5 md:px-6">
      {/* Status line */}
      <div className="flex items-center gap-2">
        {done ? (
          <PartyPopper className="h-4 w-4 shrink-0 text-brand" />
        ) : (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
        )}
        <p className="min-w-0 flex-1 truncate type-caption font-semibold text-foreground">
          {done ? "Your campaign is ready." : `${PHASES[phase]}…`}
          <span className="ml-2 font-normal text-foreground-muted">
            {done
              ? `${ex.completedJobs} asset${ex.completedJobs === 1 ? "" : "s"} completed${failed.length ? ` · ${failed.length} failed` : ""}`
              : `Generating ${Math.min(ex.completedJobs + 1, ex.totalJobs)} of ${ex.totalJobs} assets · ${ex.progress}%`}
          </span>
        </p>
        {failed.length > 0 && (
          <button
            type="button"
            onClick={() => void executeGeneration(gen, failed.map((c) => c.id))}
            className="studio-focusable inline-flex shrink-0 items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-2.5 py-1 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Retry failed
          </button>
        )}
        {done && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="studio-focusable shrink-0 text-foreground-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Global progress bar */}
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-label="Generation progress"
        aria-valuenow={ex.progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${ex.progress}%` }} />
      </div>

      {/* Phase chips — real state, no timers */}
      <div className="studio-scroll flex items-center gap-1 overflow-x-auto">
        {PHASES.map((p, i) => {
          const isDone = i < phase || done;
          const active = i === phase && !done;
          return (
            <span
              key={p}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 type-caption transition-colors",
                active ? "bg-brand/15 font-semibold text-brand" : isDone ? "text-foreground" : "text-foreground-muted"
              )}
            >
              {isDone ? <Check className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted/40" />}
              {p}
            </span>
          );
        })}
      </div>

      {failed.length > 0 && !done && (
        <span className="inline-flex items-center gap-1.5 type-caption text-red-300">
          <AlertTriangle className="h-3 w-3" /> {failed.length} asset{failed.length === 1 ? "" : "s"} failed — retry above.
        </span>
      )}
    </div>
  );
}
