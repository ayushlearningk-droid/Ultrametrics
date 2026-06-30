"use client";

/**
 * Campaign Generation Runtime — workspace feeds (Sprint 63O).
 *
 * Renders the active generated campaign's execution timeline and activity into
 * the Unified Workspace's Timeline and Activity regions, alongside the existing
 * Movie feeds. Reads the generation store; renders nothing until a campaign is
 * generated. Presentation only.
 */

import { CheckCircle2, Sparkles } from "lucide-react";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useGeneration } from "./generation-store";

export function GenerationTimeline() {
  const gen = useGeneration();
  if (!gen) return null;
  return (
    <section className="studio-card flex flex-col gap-2 p-3">
      <header className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        {gen.campaignPlan.name}
      </header>
      <ol className="flex flex-col gap-1.5">
        {gen.stages.map((s) => (
          <li key={s.name} className="flex items-center gap-2 type-caption text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" />
            {s.name}
          </li>
        ))}
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
