"use client";

/**
 * Unified Workspace — region content map (Sprint 63K).
 *
 * Maps each RegionId to REUSED presentation from the existing runtimes — no
 * duplicated components. Everything shares one provider stack (Outcome + Movie +
 * Employees), so regions stay in sync deterministically.
 */

import { CompanyDashboard } from "@/components/studio/employees/company-dashboard";
import { ConversationBus } from "@/components/studio/employees/conversation-bus";
import { EmployeeTimeline } from "@/components/studio/employees/employee-timeline";
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

/* Generated campaign (Sprint 63O) flows into these regions via the store; they
   fall back to the deterministic sample data when no campaign was generated. */
function CreativeRegion() {
  const gen = useGeneration();
  // AI War Room (Sprint 63.4) sits above the reused Creative Browser.
  return (
    <div className="flex flex-col gap-6">
      <CreativeWarRoom />
      <CreativeBrowser source={gen?.creatives} />
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
  return <GenerationQueue source={gen?.queueItems} />;
}

function ApprovalRegion() {
  const gen = useGeneration();
  return <ApprovalCenter source={gen?.approvalItems} />;
}

function TimelineRegion() {
  return (
    <div className="flex flex-col gap-3">
      <GenerationTimeline />
      <EmployeeTimeline />
    </div>
  );
}

function ActivityRegion() {
  return (
    <div className="flex h-full min-h-[280px] flex-col gap-3">
      <DreamMode />
      <GenerationActivity />
      <ConversationBus />
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
