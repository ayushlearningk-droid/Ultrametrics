"use client";

/**
 * AI Company Dashboard (Sprint 63Q).
 *
 * Every AI employee, alive, fed directly from the existing runtimes — Employees
 * Runtime (live views), Movie Runtime (stage + ETA), and the Generation Runtime
 * store (assigned campaign). Each employee shows a rich live state, current task,
 * confidence, assigned campaign, and estimated completion. Reuses EmployeeCard
 * verbatim; no duplicated runtime, no fake timers (the runtime tick is the only
 * clock), no placeholder cards. Updates automatically as generation progresses.
 */

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMovie } from "@/components/studio/movie/movie-context";
import { formatEta, type MovieState } from "@/components/studio/movie/movie-runtime";
import { useGeneration } from "@/components/studio/generation/generation-store";
import { useEmployees } from "./employees-context";
import { EmployeeCard } from "./employee-card";
import type { EmployeeId, EmployeeView } from "./types";

/** The eight required live states. */
export type LiveState =
  | "Thinking"
  | "Researching"
  | "Writing"
  | "Designing"
  | "Forecasting"
  | "Rendering"
  | "Waiting Approval"
  | "Idle";

/** What each employee does while actively working (their pipeline role). */
const ACTIVE_STATE: Record<EmployeeId, LiveState> = {
  ceo: "Thinking",
  "creative-director": "Designing",
  copywriter: "Writing",
  "brand-guardian": "Waiting Approval",
  "media-buyer": "Forecasting",
  finance: "Forecasting",
  automation: "Rendering",
};

const STATE_DOT: Record<LiveState, string> = {
  Thinking: "bg-amber-400",
  Researching: "bg-amber-400",
  Writing: "bg-brand",
  Designing: "bg-brand",
  Forecasting: "bg-brand",
  Rendering: "bg-brand",
  "Waiting Approval": "bg-amber-400",
  Idle: "bg-foreground-muted/50",
};

/** Derive the rich live state from the employee's live runtime view. Pure. */
function liveState(view: EmployeeView): LiveState {
  if (view.status === "idle" || view.status === "complete") return "Idle";
  if (view.status === "waiting") return "Waiting Approval";
  // The creative director researches while thinking, designs while working.
  if (view.identity.id === "creative-director") {
    return view.status === "thinking" ? "Researching" : "Designing";
  }
  return ACTIVE_STATE[view.identity.id];
}

/** Estimated completion for this employee, read from the live Movie state. */
function estimatedCompletion(view: EmployeeView, movie: MovieState): string {
  const stage = movie.stages.find((s) => s.ownerId === view.identity.id);
  if (!stage) return "—";
  if (stage.status === "finished") return "Done";
  if (stage.status === "current") return formatEta(movie.etaMs);
  return "Queued";
}

export function CompanyDashboard() {
  const { employees } = useEmployees();
  const { movie } = useMovie();
  const gen = useGeneration();
  const campaign = gen?.campaignPlan.name ?? null;

  return (
    <div className="flex flex-col gap-4 p-1">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          AI Company
        </span>
        {campaign && (
          <span className="chip chip-slate max-w-[60%] truncate" title={campaign}>
            {campaign}
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {employees.map((view) => {
          const state = liveState(view);
          return (
            <div key={view.identity.id} className="flex flex-col gap-1.5">
              {/* Reused live employee card (current task · confidence · status). */}
              <EmployeeCard view={view} />

              {/* Generation-fed meta: live state · assigned campaign · ETA. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1">
                <span className="flex items-center gap-1.5 type-caption font-semibold text-foreground">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[state])} aria-hidden />
                  {state}
                </span>
                <span className="min-w-0 truncate type-caption text-foreground-muted">
                  {campaign ?? "No campaign assigned"}
                </span>
                <span className="ml-auto shrink-0 type-caption tabular-nums text-foreground-muted">
                  {estimatedCompletion(view, movie)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
