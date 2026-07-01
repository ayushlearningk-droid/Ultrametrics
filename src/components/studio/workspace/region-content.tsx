"use client";

/**
 * Unified Workspace — region content map (Sprint 63K).
 *
 * Maps each RegionId to REUSED presentation from the existing runtimes — no
 * duplicated components. Everything shares one provider stack (Outcome + Movie +
 * Employees), so regions stay in sync deterministically.
 */

import { CompanyDashboard } from "@/components/studio/employees/company-dashboard";
import { EmployeeSpotlight } from "@/components/studio/movie/employee-spotlight";
import { ExecutionPath } from "@/components/studio/movie/execution-path";
import { ApprovalCenter } from "@/components/studio/approval/approval-center";
import { OutcomePicker } from "@/components/studio/outcomes/outcome-picker";
import { OutcomePlan } from "@/components/studio/outcomes/outcome-plan";
import { useOutcome } from "@/components/studio/outcomes/outcome-engine";
import { StudioCanvas } from "@/components/studio/canvas/studio-canvas";
import { CreativeBrowser } from "@/components/studio/creative/creative-browser";
import { CreativeWarRoom } from "@/components/studio/creative/creative-war-room";
import { AssetInspector } from "@/components/studio/inspector/asset-inspector";
import { GenerationQueue } from "@/components/studio/queue/generation-queue";
import { useGeneration, useSelectedAsset } from "@/components/studio/generation/generation-store";
import { GenerationTimeline, GenerationActivity } from "@/components/studio/generation/generation-feed";
import { DreamMode } from "@/components/studio/generation/dream-mode";
import type { RegionId } from "./region-manager";

function EmployeesRegion() {
  // The AI Company Dashboard (Sprint 63Q): every employee live, fed from the
  // Employees + Movie + Generation runtimes. Reuses EmployeeCard internally.
  return <CompanyDashboard />;
}

function MovieRegion() {
  return (
    <div className="flex flex-col gap-4 p-1">
      <EmployeeSpotlight />
      <ExecutionPath />
    </div>
  );
}

function OutcomeRegion() {
  const { outcome } = useOutcome();
  return <div className="p-1">{outcome ? <OutcomePlan /> : <OutcomePicker />}</div>;
}


function CanvasRegion() {
  return (
    <div className="relative min-h-[480px] w-full overflow-hidden rounded-[var(--studio-radius-lg)]">
      <StudioCanvas />
    </div>
  );
}

/** Honest empty state before any generation (Sprint 64K) — never sample data. */
function EmptyState({ text }: { text: string }) {
  return (
    <div className="studio-card px-6 py-12 text-center">
      <p className="type-caption text-foreground-muted">{text}</p>
    </div>
  );
}

/* Generated campaign (Sprint 63O) flows into these regions via the store. Before
   any generation they show an honest empty state — never sample data. */
function CreativeRegion() {
  const gen = useGeneration();
  if (!gen) return <EmptyState text="No creative generated yet." />;
  // AI War Room (Sprint 63.4) sits above the reused Creative Browser.
  return (
    <div className="flex flex-col gap-6">
      <CreativeWarRoom />
      <CreativeBrowser source={gen.creatives} />
    </div>
  );
}

function InspectorRegion() {
  const gen = useGeneration();
  // Follow the shared selection reactively (Sprint 63.8A) — no remount, and never
  // fall back to sample creatives: show only generated assets (empty until then).
  const selected = useSelectedAsset();
  const newestId = gen?.creatives[gen.creatives.length - 1]?.id;
  const id = selected ?? newestId ?? null;
  return <AssetInspector source={gen?.creatives ?? []} initialId={id} />;
}

function QueueRegion() {
  const gen = useGeneration();
  if (!gen) return <EmptyState text="No queue yet." />;
  // Queue status is derived from each asset's execution state (Sprint 64.3).
  const source = gen.queueItems.map((q) => {
    const ex = gen.creatives.find((c) => c.id === q.creativeId)?.execution;
    return ex ? { ...q, status: ex.status } : q;
  });
  return <GenerationQueue source={source} />;
}

function ApprovalRegion() {
  const gen = useGeneration();
  if (!gen) return <EmptyState text="No approvals yet." />;
  // Only completed creatives reach approval (Sprint 64.3).
  const source = gen.approvalItems.filter(
    (a) => gen.creatives.find((c) => c.id === a.creativeId)?.execution?.status === "completed"
  );
  return <ApprovalCenter source={source} />;
}

function TimelineRegion() {
  // Execution events only (Sprint 64H) — honest empty state before generation.
  const gen = useGeneration();
  if (!gen) return <EmptyState text="No execution history yet." />;
  return (
    <div className="flex flex-col gap-3">
      <GenerationTimeline />
    </div>
  );
}

function ActivityRegion() {
  // Execution-derived activity only (Sprint 64H) — honest empty state otherwise.
  const gen = useGeneration();
  if (!gen) return <EmptyState text="No activity yet." />;
  return (
    <div className="flex h-full min-h-[280px] flex-col gap-3">
      <DreamMode />
      <GenerationActivity />
    </div>
  );
}

export function RegionContent({ id }: { id: RegionId }) {
  switch (id) {
    case "outcome":
      return <OutcomeRegion />;
    case "movie":
      return <MovieRegion />;
    case "employees":
      return <EmployeesRegion />;
    case "activity":
      return <ActivityRegion />;
    case "timeline":
      return <TimelineRegion />;
    case "approval":
      return <ApprovalRegion />;
    case "canvas":
      return <CanvasRegion />;
    case "creative":
      return <CreativeRegion />;
    case "inspector":
      return <InspectorRegion />;
    case "queue":
      return <QueueRegion />;
    default:
      return null;
  }
}
