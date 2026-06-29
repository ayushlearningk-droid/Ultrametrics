"use client";

/**
 * AI Movie (Sprint 63I).
 *
 * The cinematic that replaces loading spinners: watch the AI company work — a
 * spotlight on the current worker, the execution path with animated handoff, and
 * the live message stream. Presentation only over the deterministic employees
 * runtime. Reuses the employees ConversationBus + Studio tokens (no duplication).
 */

import { Pause, Play, RotateCcw, Clapperboard } from "lucide-react";
import { ConversationBus } from "@/components/studio/employees/conversation-bus";
import { MovieProvider, useMovie } from "./movie-context";
import { EmployeeSpotlight } from "./employee-spotlight";
import { ExecutionPath } from "./execution-path";

function Controls() {
  const { isRunning, isComplete, pause, resume, reset } = useMovie();
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

function MovieBody() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
            <Clapperboard className="h-3.5 w-3.5 text-brand" />
            AI Movie
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Watch your AI company work
          </h1>
          <p className="max-w-xl type-body text-foreground-muted">
            No spinners — a live look at the team moving an Intent from brief to render.
          </p>
        </div>
        <Controls />
      </header>

      {/* Spotlight on the current worker */}
      <EmployeeSpotlight />

      {/* Execution path / stage timeline with animated handoff */}
      <section className="flex flex-col gap-3">
        <h2 className="type-eyebrow text-foreground-muted">Execution Path</h2>
        <ExecutionPath />
      </section>

      {/* Live message stream (reused from the employees runtime) */}
      <section className="flex min-h-[320px] flex-col gap-3">
        <h2 className="type-eyebrow text-foreground-muted">Live Conversation</h2>
        <div className="min-h-[320px]">
          <ConversationBus />
        </div>
      </section>
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
