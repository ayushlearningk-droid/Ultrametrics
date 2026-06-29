"use client";

/**
 * AI Movie — context (Sprint 63I).
 *
 * Composes the existing EmployeesProvider (the deterministic runtime, unchanged)
 * and exposes a derived MovieState + the bus/timeline + controls. The Movie is a
 * presentation layer over the employees runtime — it reuses it, never modifies
 * it.
 */

import { createContext, useContext, useMemo } from "react";
import {
  EmployeesProvider,
  useEmployees,
} from "@/components/studio/employees/employees-context";
import type {
  ConversationMessage,
} from "@/components/studio/employees/types";
import { buildMovie, buildMovieEvents, type MovieEvent, type MovieState } from "./movie-runtime";

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

function MovieBridge({ children }: { children: React.ReactNode }) {
  const emp = useEmployees();
  const value = useMemo<MovieContextValue>(
    () => ({
      movie: buildMovie(emp.state),
      events: buildMovieEvents(emp.state),
      messages: emp.messages,
      isRunning: emp.isRunning,
      isComplete: emp.isComplete,
      pause: emp.pause,
      resume: emp.resume,
      reset: emp.reset,
    }),
    [emp]
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
