"use client";

/**
 * AI Movie — employee spotlight (Sprint 63I).
 *
 * The current worker, large and alive: breathing/thinking, action label,
 * current artifact, confidence, and an ESTIMATED COMPLETION (never a progress
 * bar). Falls back to a calm completion state. Reuses Studio motion tokens.
 */

import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPLOYEES, EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useMovie } from "./movie-context";
import { formatEta } from "./movie-runtime";

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="anim-pulse h-2 w-2 rounded-full bg-amber-400" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  );
}

export function EmployeeSpotlight() {
  const { movie, isComplete, nextOwnerLabel } = useSpotlight();

  if (isComplete) {
    return (
      <div className="studio-hero flex min-h-[280px] flex-col items-center justify-center gap-3 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-brand" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Campaign complete</h2>
        <p className="type-body text-foreground-muted">
          The team finished — brief to render. Run it again to watch the movie.
        </p>
      </div>
    );
  }

  if (!movie.currentOwnerId) {
    return (
      <div className="studio-hero flex min-h-[280px] items-center justify-center p-10">
        <p className="type-body text-foreground-muted">Paused — resume to keep the team working.</p>
      </div>
    );
  }

  const id = movie.currentOwnerId;
  const Icon = EMPLOYEE_ICON[id];
  const identity = EMPLOYEES.find((e) => e.id === id);

  return (
    <div
      className={cn(
        "studio-hero relative flex min-h-[280px] flex-col justify-center gap-5 overflow-hidden p-8 md:p-10",
        !movie.isThinking && "studio-breathe"
      )}
    >
      <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative flex items-center gap-4">
        <div className={cn("studio-tile flex h-16 w-16 items-center justify-center text-brand", "studio-glow")}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Now working
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {identity?.name}
          </h2>
          <p className="type-caption text-foreground-muted">{identity?.role}</p>
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        {movie.isThinking ? <ThinkingDots /> : null}
        <p className="text-lg font-semibold text-foreground/90">{currentLabel(movie)}</p>
      </div>

      <div className="relative flex flex-wrap items-center gap-2">
        {movie.artifact && <span className="chip chip-slate">{movie.artifact}</span>}
        {movie.confidence && <span className="chip chip-emerald">{movie.confidence} conf.</span>}
        <span className="chip chip-slate">{formatEta(movie.etaMs)}</span>
        {nextOwnerLabel && (
          <span className="type-caption text-foreground-muted">→ next: {nextOwnerLabel}</span>
        )}
      </div>
    </div>
  );
}

function currentLabel(movie: ReturnType<typeof useMovie>["movie"]): string {
  const stage = movie.stages.find((s) => s.id === movie.currentStageId);
  return stage?.label ?? "Working…";
}

/** Small selector hook to keep the component tidy. */
function useSpotlight() {
  const { movie, isComplete } = useMovie();
  const nextOwnerLabel = movie.nextOwnerId ? employeeName(movie.nextOwnerId) : null;
  return { movie, isComplete, nextOwnerLabel };
}
