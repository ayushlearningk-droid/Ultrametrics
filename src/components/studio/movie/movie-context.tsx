"use client";

/**
 * AI Movie — context (Sprint 63I · execution-driven since 64H).
 *
 * The Movie is now a presentation layer over the EXECUTION RUNTIME (the
 * Generation Store's execution state) — the single source of truth. It no longer
 * derives from the scripted employees timer; the movie advances only as execution
 * advances. Employees provider stays mounted (idle, timer-free) for the reused
 * message bus, but the MovieState comes from execution.
 */

import { createContext, useContext, useMemo } from "react";
import {
  EmployeesProvider,
  useEmployees,
} from "@/components/studio/employees/employees-context";
import type {
  ConversationMessage,
} from "@/components/studio/employees/types";
import { useGeneration } from "@/components/studio/generation/generation-store";
import type { GenerationResult } from "@/components/studio/generation/generation-runtime";
import type { MovieEvent, MovieStage, MovieStageStatus, MovieState } from "./movie-runtime";

interface MovieContextValue {
  movie: MovieState;
  events: MovieEvent[];
  messages: ConversationMessage[];
  isRunning: boolean;
  isComplete: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const MovieContext = createContext<MovieContextValue | null>(null);

/** Derive the cinematic MovieState from the deterministic execution state. Pure. */
function buildMovieFromExecution(gen: GenerationResult | null): MovieState {
  const creatives = gen?.creatives ?? [];
  const stages: MovieStage[] = creatives.map((c) => {
    const s = c.execution?.status ?? "queued";
    // Terminal states (completed / failed / cancelled) read as finished.
    const status: MovieStageStatus =
      s === "running" ? "current" : s === "queued" ? "upcoming" : "finished";
    return { id: c.id, ownerId: c.ownerId, label: c.title, status };
  });
  const currentIdx = stages.findIndex((s) => s.status === "current");
  const current = currentIdx >= 0 ? stages[currentIdx] : null;
  const next = currentIdx >= 0 ? stages[currentIdx + 1] ?? null : null;
  const execStatus = gen?.execution.status;
  const terminal = execStatus === "completed" || execStatus === "failed" || execStatus === "cancelled";
  return {
    status: terminal ? "complete" : execStatus === "running" ? "running" : "idle",
    stages,
    currentStageId: current?.id ?? null,
    finishedIds: stages.filter((s) => s.status === "finished").map((s) => s.id),
    upcomingIds: stages.filter((s) => s.status === "upcoming").map((s) => s.id),
    currentOwnerId: current?.ownerId ?? null,
    nextOwnerId: next?.ownerId ?? null,
    artifact: current?.label ?? null,
    etaMs: 0,
    isThinking: false,
  };
}

function MovieBridge({ children }: { children: React.ReactNode }) {
  const emp = useEmployees();
  const gen = useGeneration();
  const value = useMemo<MovieContextValue>(
    () => ({
      movie: buildMovieFromExecution(gen),
      events: emp.timeline,
      messages: emp.messages,
      isRunning: gen?.execution.status === "running",
      isComplete: gen?.execution.status === "completed",
      pause: emp.pause,
      resume: emp.resume,
      reset: emp.reset,
    }),
    [emp, gen]
  );
  return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
}

export function MovieProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmployeesProvider>
      <MovieBridge>{children}</MovieBridge>
    </EmployeesProvider>
  );
}

export function useMovie(): MovieContextValue {
  const ctx = useContext(MovieContext);
  if (!ctx) throw new Error("useMovie must be used within a MovieProvider");
  return ctx;
}
