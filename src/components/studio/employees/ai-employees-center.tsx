"use client";

/**
 * AI Employees Runtime — center (Sprint 63H).
 *
 * The live workforce: a grid of alive employees, the public conversation bus,
 * and the event timeline, driven by the deterministic runtime. Mounts inside the
 * shell's Workspace Region. Reuses Studio 2.0 tokens; no business logic, no LLM.
 */

import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { EmployeesProvider, useEmployees } from "./employees-context";
import { EmployeeCard } from "./employee-card";
import { ConversationBus } from "./conversation-bus";
import { EmployeeTimeline } from "./employee-timeline";

function Controls() {
  const { isRunning, isComplete, pause, resume, reset } = useEmployees();
  return (
    <div className="flex items-center gap-2">
      {!isComplete &&
        (isRunning ? (
          <button
            type="button"
            onClick={pause}
            className="studio-focusable flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-3 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={resume}
            className="studio-focusable flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] border border-white/[0.08] px-3 py-1.5 type-caption text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <Play className="h-3.5 w-3.5" /> Resume
          </button>
        ))}
      <button
        type="button"
        onClick={reset}
        className="studio-focusable flex items-center gap-1.5 rounded-[var(--studio-radius-sm)] bg-brand/15 px-3 py-1.5 type-caption font-semibold text-brand transition-colors hover:bg-brand/25"
      >
        <RotateCcw className="h-3.5 w-3.5" /> {isComplete ? "Run again" : "Restart"}
      </button>
    </div>
  );
}

function CenterBody() {
  const { employees } = useEmployees();
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 md:px-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            AI Team
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Your AI employees, live
          </h1>
          <p className="max-w-xl type-body text-foreground-muted">
            A deterministic look at how the team collaborates — from brief to render.
          </p>
        </div>
        <Controls />
      </header>

      {/* Workforce + bus */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((view) => (
            <EmployeeCard key={view.identity.id} view={view} />
          ))}
        </div>
        <div className="flex min-h-[420px] flex-col">
          <ConversationBus />
        </div>
      </div>

      {/* Timeline */}
      <EmployeeTimeline />
    </div>
  );
}

export function AiEmployeesCenter() {
  return (
    <EmployeesProvider>
      <CenterBody />
    </EmployeesProvider>
  );
}
