"use client";

/**
 * Unified Workspace — region content map (Sprint 63K).
 *
 * Maps each RegionId to REUSED presentation from the existing runtimes — no
 * duplicated components. Everything shares one provider stack (Outcome + Movie +
 * Employees), so regions stay in sync deterministically.
 */

import { useEmployees } from "@/components/studio/employees/employees-context";
import { EmployeeCard } from "@/components/studio/employees/employee-card";
import { ConversationBus } from "@/components/studio/employees/conversation-bus";
import { EmployeeTimeline } from "@/components/studio/employees/employee-timeline";
import { EmployeeSpotlight } from "@/components/studio/movie/employee-spotlight";
import { ExecutionPath } from "@/components/studio/movie/execution-path";
import { ApprovalCenter } from "@/components/studio/approval/approval-center";
import { OutcomePicker } from "@/components/studio/outcomes/outcome-picker";
import { OutcomePlan } from "@/components/studio/outcomes/outcome-plan";
import { useOutcome } from "@/components/studio/outcomes/outcome-engine";
import { StudioHome } from "@/components/studio/home/studio-home";
import { StudioCanvas } from "@/components/studio/canvas/studio-canvas";
import { CreativeBrowser } from "@/components/studio/creative/creative-browser";
import { AssetInspector } from "@/components/studio/inspector/asset-inspector";
import { GenerationQueue } from "@/components/studio/queue/generation-queue";
import type { RegionId } from "./region-manager";

function EmployeesRegion() {
  const { employees } = useEmployees();
  return (
    <div className="grid grid-cols-1 gap-3 p-1 sm:grid-cols-2">
      {employees.map((view) => (
        <EmployeeCard key={view.identity.id} view={view} />
      ))}
    </div>
  );
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

export function RegionContent({ id }: { id: RegionId }) {
  switch (id) {
    case "outcome":
      return <OutcomeRegion />;
    case "movie":
      return <MovieRegion />;
    case "employees":
      return <EmployeesRegion />;
    case "activity":
      return (
        <div className="h-full min-h-[280px]">
          <ConversationBus />
        </div>
      );
    case "timeline":
      return <EmployeeTimeline />;
    case "approval":
      return <ApprovalCenter />;
    case "home":
      return <StudioHome />;
    case "canvas":
      return <CanvasRegion />;
    case "creative":
      return <CreativeBrowser />;
    case "inspector":
      return <AssetInspector />;
    case "queue":
      return <GenerationQueue />;
    default:
      return null;
  }
}
