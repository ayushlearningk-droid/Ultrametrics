"use client";

/**
 * Dream Mode — "While You Were Sleeping" (Sprint 63.5).
 *
 * A production summary of completed work, derived ENTIRELY from the deterministic
 * Generation Runtime — no fabricated AI work. Every figure is traceable: hooks
 * from the creative plan, images/videos from the generated creatives, campaigns
 * from the campaign plan, approvals from the approval items, and a recommended
 * next action from the waiting approvals. Each row opens the corresponding
 * surface — the asset (shared selection → Inspector), the timeline, the approval
 * queue, or the Explain overlay. Presentation only; no backend, no timers.
 */

import { Moon, Sparkles, Image as ImageIcon, Video, Rocket, CheckSquare, ArrowRight, ChevronRight } from "lucide-react";
import { useGeneration, selectAsset } from "./generation-store";
import { openExplanation } from "./explanation-store";
import { useRegions } from "@/components/studio/workspace/region-manager";

function Row({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: typeof Sparkles;
  label: string;
  value: number | string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="studio-focusable flex w-full items-center gap-2.5 rounded-[var(--studio-radius-sm)] p-1.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="studio-tile flex h-8 w-8 shrink-0 items-center justify-center text-foreground-muted">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate type-caption font-semibold text-foreground">{label}</span>
        <span className="block truncate type-caption text-foreground-muted">{hint}</span>
      </span>
      <span className="shrink-0 type-body font-bold tabular-nums text-foreground">{value}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted" />
    </button>
  );
}

export function DreamMode() {
  const gen = useGeneration();
  const { showRegion } = useRegions();
  if (!gen) return null;

  // Only completed creatives count as produced work (Sprint 64.3).
  const done = gen.creatives.filter((c) => c.execution?.status === "completed");
  const images = done.filter((c) => c.media.kind === "image");
  const videos = done.filter((c) => c.media.kind === "video");
  const approvalsWaiting = gen.approvalItems.filter((a) => a.status === "pending").length;

  const openAsset = (id?: string) => {
    if (!id) return;
    selectAsset(id);
    showRegion("inspector", "float");
  };

  const nextAction =
    approvalsWaiting > 0
      ? `Approve ${approvalsWaiting} asset${approvalsWaiting > 1 ? "s" : ""} to launch ${gen.campaignPlan.name}`
      : `Launch ${gen.campaignPlan.name}`;

  return (
    <section className="studio-card flex flex-col gap-3 p-4">
      <header className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        <Moon className="h-3.5 w-3.5 text-brand" />
        While you were sleeping
      </header>

      <div className="flex flex-col">
        <Row icon={Sparkles} label="Hooks generated" value={gen.creativePlan.hooks.length} hint="View the hook decision" onClick={() => openExplanation("Hooks Generated")} />
        <Row icon={ImageIcon} label="Images generated" value={images.length} hint={images.length ? "Open in Inspector" : "None"} onClick={() => openAsset(images[0]?.id)} />
        <Row icon={Video} label="Videos generated" value={videos.length} hint={videos.length ? "Open in Inspector" : "None"} onClick={() => openAsset(videos[0]?.id)} />
        <Row icon={Rocket} label="Campaigns prepared" value={1} hint={gen.campaignPlan.name} onClick={() => showRegion("timeline", "float")} />
        <Row icon={CheckSquare} label="Approvals waiting" value={approvalsWaiting} hint="Open the Approval queue" onClick={() => showRegion("approval", "float")} />
      </div>

      {/* Recommended next action — derived from the waiting approvals. */}
      <button
        type="button"
        onClick={() => showRegion("approval", "float")}
        className="studio-focusable flex items-center gap-2 rounded-[var(--studio-radius-md)] bg-brand/10 px-3 py-2.5 text-left transition-colors hover:bg-brand/20"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1">
          <span className="block type-caption text-foreground-muted">Recommended next action</span>
          <span className="block truncate type-caption font-semibold text-foreground">{nextAction}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
      </button>
    </section>
  );
}
