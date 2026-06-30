"use client";

/**
 * Living AI Workforce (Sprint 63.3).
 *
 * Every AI employee, alive, driven ENTIRELY by the existing deterministic
 * Generation Runtime — each card's current task, progress state, status,
 * dependency and latest activity are derived from the active campaign's timeline
 * + activity bus (which together cover all seven employees). Clicking an employee
 * focuses their asset and opens the existing Explain panel for their current
 * stage. Reuses the Employees registry; no timers, no fake loading, no duplicated
 * runtime. Calm idle state until a campaign is generated.
 */

import { CheckCircle2, Sparkles, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeneration, selectAsset } from "@/components/studio/generation/generation-store";
import { openExplanation } from "@/components/studio/generation/explanation-store";
import { EMPLOYEES, EMPLOYEE_ICON, employeeName } from "./employees-data";
import type { EmployeeId } from "./types";
import type { GenerationResult } from "@/components/studio/generation/generation-runtime";

interface WorkforceView {
  idle: boolean;
  task: string;
  progressStage: string;
  status: string;
  ready: boolean;
  dependency: EmployeeId | null;
  activity: string;
  stage: string | null;
  assetId?: string;
}

/** Derive one employee's live view from the Generation Runtime. Pure. */
function viewFor(id: EmployeeId, gen: GenerationResult | null): WorkforceView {
  if (!gen) {
    return { idle: true, task: "Awaiting brief", progressStage: "—", status: "Idle", ready: false, dependency: null, activity: "Idle", stage: null };
  }
  const acts = gen.activity.filter((a) => a.authorId === id);
  const latest = acts[acts.length - 1];
  if (!latest) {
    return { idle: true, task: "Standing by", progressStage: "—", status: "Idle", ready: false, dependency: null, activity: "No assigned stage", stage: null };
  }
  const stage = latest.stage ?? null;
  const tlIdx = stage ? gen.timeline.findIndex((t) => t.stage === stage) : -1;
  const tl = tlIdx >= 0 ? gen.timeline[tlIdx] : undefined;
  const dependency = tlIdx > 0 ? gen.timeline[tlIdx - 1].ownerId : null;
  const ready = tl?.status === "ready";
  return {
    idle: false,
    task: latest.title,
    progressStage: stage ?? "—",
    status: ready ? "Ready" : "Complete",
    ready: true,
    dependency,
    activity: latest.description,
    stage,
    assetId: latest.assetId,
  };
}

function WorkforceCard({ id, view }: { id: EmployeeId; view: WorkforceView }) {
  const identity = EMPLOYEES.find((e) => e.id === id);
  const Icon = EMPLOYEE_ICON[id];

  const open = () => {
    if (view.idle || !view.stage) return;
    if (view.assetId) selectAsset(view.assetId);
    openExplanation(view.stage);
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={view.idle}
      title={view.idle ? undefined : "Explain this employee's current decision"}
      className={cn(
        "studio-card flex flex-col gap-3 p-4 text-left",
        !view.idle && "studio-card-interactive studio-focusable",
        view.ready && !view.idle && "studio-glow"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="studio-tile relative flex h-10 w-10 items-center justify-center text-foreground-muted">
          <Icon className="h-4 w-4" />
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[hsl(222_44%_6%)]", view.idle ? "bg-foreground-muted/50" : "bg-brand")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body font-semibold text-foreground">{identity?.name ?? id}</p>
          <p className="truncate type-caption text-foreground-muted">{identity?.role}</p>
        </div>
        <span className={cn("chip", view.idle ? "chip-slate" : "chip-emerald")}>{view.status}</span>
      </div>

      {/* Current task + progress state */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 type-caption">
          {view.idle ? (
            <CircleDashed className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" />
          )}
          <span className="font-semibold text-foreground">{view.task}</span>
        </span>
        <span className="type-caption text-foreground-muted">Stage · {view.progressStage}</span>
      </div>

      {/* Dependency + latest activity */}
      <div className="mt-auto flex flex-col gap-1 border-t border-white/[0.06] pt-2.5">
        <span className="type-caption text-foreground-muted">
          {view.dependency ? `Depends on ${employeeName(view.dependency)}` : "No dependency"}
        </span>
        <span className="flex items-start gap-1.5 type-caption text-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
          {view.activity}
        </span>
      </div>
    </button>
  );
}

export function CompanyDashboard() {
  const gen = useGeneration();
  const campaign = gen?.campaignPlan.name ?? null;

  return (
    <div className="flex flex-col gap-4 p-1">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          AI Workforce
        </span>
        {campaign && (
          <span className="chip chip-slate max-w-[60%] truncate" title={campaign}>
            {campaign}
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EMPLOYEES.map((e) => (
          <WorkforceCard key={e.id} id={e.id} view={viewFor(e.id, gen)} />
        ))}
      </div>
    </div>
  );
}
