"use client";

/**
 * Unified Workspace — region content map (Sprint 63K).
 *
 * Maps each RegionId to REUSED presentation from the existing runtimes — no
 * duplicated components. Everything shares one provider stack (Outcome + Movie +
 * Employees), so regions stay in sync deterministically.
 */

import { CheckCircle2 } from "lucide-react";
import { useEmployees } from "@/components/studio/employees/employees-context";
import { EmployeeCard } from "@/components/studio/employees/employee-card";
import { ConversationBus } from "@/components/studio/employees/conversation-bus";
import { EmployeeTimeline } from "@/components/studio/employees/employee-timeline";
import { EmployeeSpotlight } from "@/components/studio/movie/employee-spotlight";
import { ExecutionPath } from "@/components/studio/movie/execution-path";
import { useMovie } from "@/components/studio/movie/movie-context";
import { OutcomePicker } from "@/components/studio/outcomes/outcome-picker";
import { OutcomePlan } from "@/components/studio/outcomes/outcome-plan";
import { useOutcome } from "@/components/studio/outcomes/outcome-engine";
import { StudioHome } from "@/components/studio/home/studio-home";
import { StudioCanvas } from "@/components/studio/canvas/studio-canvas";
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

function ApprovalRegion() {
  const { isComplete } = useMovie();
  if (!isComplete) {
    return (
      <p className="p-3 type-caption text-foreground-muted">
        Approval appears here when the team finishes the campaign.
      </p>
    );
  }
  return (
    <div className="studio-card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-brand" />
        <p className="type-body font-semibold text-foreground">Campaign ready for approval</p>
      </div>
      <p className="type-caption text-foreground-muted">
        Brief to render — on-brand, predicted CTR +12%, budget approved.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          aria-disabled
          title="Coming soon"
          className="studio-focusable flex-1 cursor-default rounded-[var(--studio-radius-sm)] bg-brand/15 px-3 py-2 type-caption font-semibold text-brand"
        >
          Approve & publish
        </button>
        <button
          type="button"
          aria-disabled
          title="Coming soon"
          className="studio-focusable cursor-default rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-3 py-2 type-caption text-foreground-muted"
        >
          Request changes
        </button>
      </div>
    </div>
  );
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
      return <ApprovalRegion />;
    case "home":
      return <StudioHome />;
    case "canvas":
      return <CanvasRegion />;
    default:
      return null;
  }
}
