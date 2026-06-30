"use client";

/**
 * Campaign Generation Runtime — workspace feeds (Sprint 63O · live in 63P).
 *
 * Renders the active generated campaign's execution timeline and activity into
 * the Unified Workspace's Timeline and Activity regions, alongside the existing
 * Movie feeds. The timeline is the LIVE AI Movie: it reflects the real-time
 * Movie Runtime state (finished · current · upcoming workers + ETA) for the
 * generated campaign — no static checklist, no fake loading. Reads the
 * generation store + the reused Movie Runtime. Presentation only.
 */

import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useMovie } from "@/components/studio/movie/movie-context";
import { formatEta } from "@/components/studio/movie/movie-runtime";
import { useGeneration } from "./generation-store";

export function GenerationTimeline() {
  const gen = useGeneration();
  const { movie, isComplete } = useMovie();
  if (!gen) return null;
  return (
    <section className="studio-card flex flex-col gap-2 p-3">
      <header className="flex items-center justify-between gap-2 type-eyebrow text-foreground-muted">
        <span className="flex min-w-0 items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
          <span className="truncate">{gen.campaignPlan.name}</span>
        </span>
        <span className="shrink-0 tabular-nums">{isComplete ? "Ready" : formatEta(movie.etaMs)}</span>
      </header>
      <ol className="flex flex-col gap-1.5">
        {movie.stages.map((s) => {
          const finished = s.status === "finished";
          const current = s.status === "current";
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 type-caption ${current || finished ? "text-foreground" : "text-foreground-muted"}`}
            >
              {finished ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" />
              ) : current ? (
                <span className="anim-pulse h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-foreground-muted/60" />
              )}
              <span className="truncate">
                <span className="font-semibold">{employeeName(s.ownerId)}</span>
                <span className="text-foreground-muted"> · {current ? s.label : finished ? "Done" : "Up next"}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function GenerationActivity() {
  const gen = useGeneration();
  if (!gen) return null;
  return (
    <section className="flex flex-col gap-2">
      {gen.activity.map((a) => {
        const Icon = EMPLOYEE_ICON[a.authorId];
        return (
          <div key={a.id} className="studio-card flex items-start gap-2.5 p-3">
            <div className="studio-tile flex h-8 w-8 shrink-0 items-center justify-center text-foreground-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="type-caption font-semibold text-foreground">{employeeName(a.authorId)}</p>
              <p className="type-caption text-foreground-muted">{a.text}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
