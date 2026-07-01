"use client";

/**
 * AI Team center (Sprint 63H · execution-driven since 64H · stabilized 64K).
 *
 * The workforce is driven solely by the Execution Runtime (Generation Store) via
 * the reused Company Dashboard. No runtime controls, no scripted conversation
 * bus/timeline, and no "live" claim — employees show their real execution state
 * only after a campaign is generated. Honest empty state otherwise.
 */

import { Users } from "lucide-react";
import { useGeneration } from "@/components/studio/generation/generation-store";
import { CompanyDashboard } from "./company-dashboard";

export function AiEmployeesCenter() {
  const gen = useGeneration();
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 md:px-10">
      <header className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Users className="h-3.5 w-3.5 text-brand" />
          AI Team
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Your AI employees</h1>
        <p className="max-w-xl type-body text-foreground-muted">
          Execution-driven — each employee shows its real state once a campaign is generated.
        </p>
      </header>

      {!gen ? (
        <div className="studio-card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="type-body font-semibold text-foreground">No generation has started yet.</p>
          <p className="type-caption text-foreground-muted">Generate a campaign from Studio Home to see the team work.</p>
        </div>
      ) : (
        <CompanyDashboard />
      )}
    </div>
  );
}
