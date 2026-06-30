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

import { CheckCircle2, Sparkles } from "lucide-react";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { useRegions } from "@/components/studio/workspace/region-manager";
import { useGeneration } from "./generation-store";

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

/**
 * Production Live Timeline (Sprint 63V) — the deterministic 12-stage timeline
 * the Generation Runtime emits for the active campaign. Each event shows its
 * time, responsible AI employee, stage, status and duration; selecting one opens
 * the existing Inspector region. Reuses Movie stage labels (as the detail line).
 */
export function GenerationTimeline() {
  const gen = useGeneration();
  const { showRegion } = useRegions();
  if (!gen) return null;
  return (
    <section className="studio-card flex flex-col gap-2 p-3">
      <header className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
        <span className="truncate">{gen.campaignPlan.name}</span>
      </header>
      <ol className="flex flex-col">
        {gen.timeline.map((e) => {
          const Icon = EMPLOYEE_ICON[e.ownerId];
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => showRegion("inspector", "float")}
                title="Open in Inspector"
                className="studio-focusable flex w-full items-start gap-2.5 rounded-[var(--studio-radius-sm)] p-1.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="studio-tile flex h-7 w-7 shrink-0 items-center justify-center text-foreground-muted">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate type-caption font-semibold text-foreground">{e.stage}</p>
                    <span className="chip chip-emerald shrink-0">{e.status === "ready" ? "Ready" : "Done"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 type-caption text-foreground-muted">
                    <span>{employeeName(e.ownerId)}</span>
                    {e.detail && <span className="text-brand">{e.detail}</span>}
                    <span className="tabular-nums">{fmtTime(e.at)}</span>
                    <span className="tabular-nums">{e.durationSec}s</span>
                  </div>
                </div>
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Production AI Activity Bus (Sprint 63W) — the deterministic activity stream the
 * Generation Runtime emits for the active campaign. Each event shows the
 * employee, icon, timestamp, category, title and short description; clicking one
 * opens the existing Inspector to focus the linked asset. Reuses the Employees
 * registry + Studio tokens. Presentation only.
 */
export function GenerationActivity() {
  const gen = useGeneration();
  const { showRegion } = useRegions();
  if (!gen) return null;
  return (
    <section className="flex flex-col gap-2">
      {gen.activity.map((a) => {
        const Icon = EMPLOYEE_ICON[a.authorId];
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => showRegion("inspector", "float")}
            title="Open in Inspector"
            className="studio-card studio-focusable flex w-full items-start gap-2.5 p-3 text-left transition-colors hover:bg-white/[0.04]"
          >
            <div className="studio-tile flex h-8 w-8 shrink-0 items-center justify-center text-foreground-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate type-caption font-semibold text-foreground">{employeeName(a.authorId)}</p>
                <span className="chip chip-slate shrink-0">{a.category}</span>
                <span className="ml-auto shrink-0 type-caption tabular-nums text-foreground-muted">{fmtTime(a.at)}</span>
              </div>
              <p className="type-caption font-medium text-foreground">{a.title}</p>
              <p className="type-caption text-foreground-muted">{a.description}</p>
              {a.stage && <p className="type-caption text-brand">{a.stage}</p>}
            </div>
          </button>
        );
      })}
    </section>
  );
}
