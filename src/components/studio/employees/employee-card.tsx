"use client";

/**
 * AI Employees Runtime — live employee card (Sprint 63H).
 *
 * Renders one employee ALIVE: idle / thinking / working / waiting / complete,
 * with breathing, thinking dots, glow, progress, and a success state. Reuses
 * Studio 2.0 motion tokens (studio-breathe / studio-glow / anim-pulse); no
 * duplicated motion. Reduced-motion safe via the token layer.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPLOYEE_ICON, employeeName } from "./employees-data";
import type { EmployeeStatus, EmployeeView } from "./types";

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  idle: "Idle",
  thinking: "Thinking",
  working: "Working",
  waiting: "Waiting",
  complete: "Done",
};
const STATUS_DOT: Record<EmployeeStatus, string> = {
  idle: "bg-foreground-muted/50",
  thinking: "bg-amber-400",
  working: "bg-brand",
  waiting: "bg-amber-400",
  complete: "bg-brand",
};
const STATUS_CHIP: Record<EmployeeStatus, string> = {
  idle: "chip-slate",
  thinking: "chip-slate",
  working: "chip-emerald",
  waiting: "chip-slate",
  complete: "chip-emerald",
};

function ThinkingDots() {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="anim-pulse h-1.5 w-1.5 rounded-full bg-amber-400" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  );
}

export function EmployeeCard({ view }: { view: EmployeeView }) {
  const { identity, status, progress, currentArtifact, confidence, dependencies, queue } = view;
  const Icon = EMPLOYEE_ICON[identity.id];
  const alive = status === "thinking" || status === "working";

  return (
    <div
      aria-label={`${identity.name}, ${identity.role}, ${STATUS_LABEL[status]}`}
      className={cn(
        "studio-card flex flex-col gap-3 p-4",
        alive && "studio-glow",
        status === "thinking" && "studio-breathe",
        status === "complete" && "studio-elevated"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="studio-tile relative flex h-10 w-10 items-center justify-center text-foreground-muted">
          <Icon className="h-4 w-4" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[hsl(222_44%_6%)]",
              STATUS_DOT[status],
              (status === "thinking" || status === "waiting") && "anim-pulse"
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body font-semibold text-foreground">{identity.name}</p>
          <p className="truncate type-caption text-foreground-muted">{identity.role}</p>
        </div>
        {status === "thinking" ? (
          <ThinkingDots />
        ) : status === "complete" ? (
          <Check className="h-4 w-4 text-brand" />
        ) : (
          <span className={cn("chip", STATUS_CHIP[status])}>{STATUS_LABEL[status]}</span>
        )}
      </div>

      {/* Current task */}
      <div className="flex flex-col gap-1">
        <span className="type-caption text-foreground-muted">
          {status === "idle" ? "No active task" : currentArtifact ?? "—"}
        </span>
        {(status === "working" || status === "thinking") && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
        )}
      </div>

      {/* Meta: confidence · dependencies · queue */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {confidence && <span className="chip chip-slate">{confidence} conf.</span>}
        {dependencies.length > 0 && (
          <span className="type-caption text-foreground-muted">
            after {dependencies.map(employeeName).join(", ")}
          </span>
        )}
        {queue.length > 0 && status !== "working" && status !== "thinking" && (
          <span className="chip chip-slate">{queue.length} queued</span>
        )}
      </div>
    </div>
  );
}
