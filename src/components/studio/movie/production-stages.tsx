"use client";

/**
 * AI Movie — live production stages (Sprint 64W).
 *
 * The real AI Movie: the eight-stage production pipeline (Planning · Research ·
 * Hooks · Copy · Image Generation · Video Generation · Approval · Publishing),
 * each with a live status, progress, duration, the responsible AI employee, and
 * real outputs. Everything is DERIVED from the Generation Store's execution state
 * (the single source of truth) — no fake status cards, no timers. Plan stages are
 * complete the moment the deterministic runtime produces them; generation stages
 * advance as real provider execution advances; approval and publishing gate on
 * real completion. Clicking a rendered output focuses it in the shared selection.
 */

import { Check, Loader2, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPLOYEE_ICON, employeeName } from "@/components/studio/employees/employees-data";
import { CreativeThumbnail } from "@/components/studio/media";
import type { EmployeeId } from "@/components/studio/employees/types";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import { useGeneration, selectAsset } from "@/components/studio/generation/generation-store";
import type { GenerationResult } from "@/components/studio/generation/generation-runtime";

type StageStatus = "pending" | "active" | "complete" | "failed";

interface StageVM {
  id: string;
  label: string;
  ownerId: EmployeeId;
  status: StageStatus;
  /** 0–100. */
  progress: number;
  durationLabel: string;
  outputs: string;
  /** Rendered creatives to preview (image / video generation stages). */
  assets: CreativeItem[];
}

const STATUS_CHIP: Record<StageStatus, string> = {
  pending: "chip-slate",
  active: "chip-slate",
  complete: "chip-emerald",
  failed: "chip-red",
};
const STATUS_LABEL: Record<StageStatus, string> = {
  pending: "Queued",
  active: "Running",
  complete: "Done",
  failed: "Failed",
};

function fmtDuration(ms: number): string {
  if (ms <= 0) return "—";
  const s = ms / 1000;
  return s >= 10 ? `${Math.round(s)}s` : `${s.toFixed(1)}s`;
}

const isTerminal = (s: string | undefined) => s === "completed" || s === "failed" || s === "cancelled";

/** Summarize a group of creatives' real execution into a stage view. */
function summarizeGeneration(items: CreativeItem[]): {
  status: StageStatus;
  progress: number;
  durationMs: number;
  completed: CreativeItem[];
} {
  const total = items.length;
  const completed = items.filter((c) => c.execution?.status === "completed");
  const running = items.some((c) => c.execution?.status === "running");
  const finished = items.filter((c) => isTerminal(c.execution?.status)).length;
  const durationMs = items.reduce((sum, c) => sum + (c.execution?.generationTimeMs ?? 0), 0);

  let status: StageStatus;
  if (total === 0) status = "pending";
  else if (running) status = "active";
  else if (finished === total) status = completed.length > 0 ? "complete" : "failed";
  else status = "pending";

  const progress = total === 0 ? 0 : Math.round((completed.length / total) * 100);
  return { status, progress, durationMs, completed };
}

/** Build the eight live production stages from the generation. Pure. */
function buildProductionStages(gen: GenerationResult): StageVM[] {
  const planned: StageStatus = "complete"; // plan stages are produced synchronously
  const images = gen.creatives.filter((c) => c.media.kind !== "video");
  const videos = gen.creatives.filter((c) => c.media.kind === "video");
  const img = summarizeGeneration(images);
  const vid = summarizeGeneration(videos);

  const completedCreatives = gen.creatives.filter((c) => c.execution?.status === "completed");
  const allDone = gen.execution.status === "completed";

  return [
    {
      id: "planning",
      label: "Planning",
      ownerId: "ceo",
      status: planned,
      progress: 100,
      durationLabel: "instant",
      outputs: `${gen.campaignPlan.name} · ${gen.campaignPlan.platforms.length} placement${gen.campaignPlan.platforms.length === 1 ? "" : "s"}`,
      assets: [],
    },
    {
      id: "research",
      label: "Research",
      ownerId: "media-buyer",
      status: planned,
      progress: 100,
      durationLabel: "instant",
      outputs: `Audience: ${gen.campaignPlan.audience} · Budget $${gen.campaignPlan.budget.toLocaleString()}`,
      assets: [],
    },
    {
      id: "hooks",
      label: "Hooks",
      ownerId: "creative-director",
      status: planned,
      progress: 100,
      durationLabel: "instant",
      outputs: `${gen.creativePlan.hooks.length} hooks drafted`,
      assets: [],
    },
    {
      id: "copy",
      label: "Copy",
      ownerId: "copywriter",
      status: planned,
      progress: 100,
      durationLabel: "instant",
      outputs: `${gen.creativePlan.headlines.length} headlines · ${gen.creativePlan.descriptions.length} descriptions`,
      assets: [],
    },
    {
      id: "image",
      label: "Image Generation",
      ownerId: "automation",
      status: img.status,
      progress: img.progress,
      durationLabel: images.length === 0 ? "—" : fmtDuration(img.durationMs),
      outputs: images.length === 0 ? "No image assets" : `${img.completed.length}/${images.length} rendered`,
      assets: img.completed,
    },
    {
      id: "video",
      label: "Video Generation",
      ownerId: "automation",
      status: vid.status,
      progress: vid.progress,
      durationLabel: videos.length === 0 ? "—" : fmtDuration(vid.durationMs),
      outputs:
        videos.length === 0
          ? "No video assets"
          : vid.status === "failed"
            ? "No live video provider"
            : `${vid.completed.length}/${videos.length} rendered`,
      assets: vid.completed,
    },
    {
      id: "approval",
      label: "Approval",
      ownerId: "brand-guardian",
      status: completedCreatives.length === 0 ? "pending" : allDone ? "complete" : "active",
      progress: gen.creatives.length === 0 ? 0 : Math.round((completedCreatives.length / gen.creatives.length) * 100),
      durationLabel: "—",
      outputs:
        completedCreatives.length === 0
          ? "Waiting for creatives"
          : `${completedCreatives.length} ready for review`,
      assets: [],
    },
    {
      id: "publishing",
      label: "Publishing",
      ownerId: "ceo",
      status: allDone ? "complete" : "pending",
      progress: allDone ? 100 : 0,
      durationLabel: "—",
      outputs: allDone ? "Ready to launch" : "Awaiting completion",
      assets: [],
    },
  ];
}

function StatusIcon({ status }: { status: StageStatus }) {
  if (status === "complete") return <Check className="h-3.5 w-3.5 text-brand" />;
  if (status === "active") return <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />;
  if (status === "failed") return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
  return <Circle className="h-3.5 w-3.5 text-foreground-muted/50" />;
}

function StageRow({ stage }: { stage: StageVM }) {
  const Icon = EMPLOYEE_ICON[stage.ownerId];
  const active = stage.status === "active";
  return (
    <div
      className={cn(
        "studio-card flex flex-col gap-2 p-3 transition-colors",
        active && "studio-glow studio-breathe bg-brand/[0.05]"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("studio-tile flex h-8 w-8 shrink-0 items-center justify-center", active ? "text-brand" : "text-foreground-muted")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate type-caption font-semibold text-foreground">{stage.label}</p>
            <span className={cn("chip shrink-0", STATUS_CHIP[stage.status])}>{STATUS_LABEL[stage.status]}</span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="type-caption tabular-nums text-foreground-muted">{stage.durationLabel}</span>
              <StatusIcon status={stage.status} />
            </span>
          </div>
          <p className="truncate type-caption text-foreground-muted">
            {employeeName(stage.ownerId)} · {stage.outputs}
          </p>
        </div>
      </div>

      {/* Live progress */}
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-label={`${stage.label} progress`}
        aria-valuenow={stage.progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", stage.status === "failed" ? "bg-red-400/70" : "bg-brand")}
          style={{ width: `${stage.progress}%` }}
        />
      </div>

      {/* Real outputs — rendered creatives */}
      {stage.assets.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {stage.assets.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectAsset(c.id)}
              title={c.title}
              className="studio-focusable overflow-hidden rounded-[var(--studio-radius-sm)]"
            >
              <CreativeThumbnail media={c.media} aspect="square" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductionStages() {
  const gen = useGeneration();
  if (!gen) {
    return (
      <div className="studio-card px-6 py-12 text-center">
        <p className="type-caption text-foreground-muted">No production yet — generate a campaign to start the movie.</p>
      </div>
    );
  }

  const stages = buildProductionStages(gen);
  const overall = gen.execution.progress;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <span className="type-eyebrow text-foreground-muted">Live Production</span>
        <span className="ml-auto type-caption tabular-nums text-foreground-muted">{overall}%</span>
      </header>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-label="Overall production progress"
        aria-valuenow={overall}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${overall}%` }} />
      </div>
      <div className="flex flex-col gap-2">
        {stages.map((s) => (
          <StageRow key={s.id} stage={s} />
        ))}
      </div>
    </section>
  );
}
