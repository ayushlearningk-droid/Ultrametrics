"use client";

/**
 * AI Movie (Sprint 63I · execution-driven since 64H · stabilized 64K).
 *
 * The cinematic is driven solely by the Execution Runtime (Generation Store).
 * There are no playback controls and no scripted conversation bus — the team
 * appears only once a campaign is generated. Honest empty state otherwise.
 */

import { Clapperboard } from "lucide-react";
import { useGeneration } from "@/components/studio/generation/generation-store";
import { MovieProvider } from "./movie-context";
import { EmployeeSpotlight } from "./employee-spotlight";
import { ExecutionPath } from "./execution-path";

function MovieBody() {
  const gen = useGeneration();
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 md:px-10">
      <header className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Clapperboard className="h-3.5 w-3.5 text-brand" />
          AI Movie
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Watch your AI company work
        </h1>
        <p className="max-w-xl type-body text-foreground-muted">
          Execution-driven — the team appears as your campaign executes.
        </p>
      </header>

      {!gen ? (
        <div className="studio-card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="type-body font-semibold text-foreground">No generation has started yet.</p>
          <p className="type-caption text-foreground-muted">Generate a campaign from Studio Home to begin execution.</p>
        </div>
      ) : (
        <>
          <EmployeeSpotlight />
          <section className="flex flex-col gap-3">
            <h2 className="type-eyebrow text-foreground-muted">Execution Path</h2>
            <ExecutionPath />
          </section>
        </>
      )}
    </div>
  );
}

export function AiMovie() {
  return (
    <MovieProvider>
      <MovieBody />
    </MovieProvider>
  );
}
