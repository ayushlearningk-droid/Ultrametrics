"use client";

/**
 * AI Employees Runtime — context/provider (Sprint 63H).
 *
 * Hosts the deterministic reducer and drives it with a fixed-interval TICK while
 * running. Exposes live employee views + bus + timeline + controls. The interval
 * is the only clock; the simulation logic itself is pure/deterministic.
 */

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { initState, reducer, allEmployeeViews } from "./runtime";
import type { ConversationMessage, EmployeeView, EmployeesState, TimelineEvent } from "./types";

interface EmployeesContextValue {
  state: EmployeesState;
  employees: EmployeeView[];
  messages: ConversationMessage[];
  timeline: TimelineEvent[];
  isRunning: boolean;
  isComplete: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const EmployeesContext = createContext<EmployeesContextValue | null>(null);

export function EmployeesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  // Sprint 64H: the scripted TICK timer is removed — the Execution Runtime is the
  // only source of truth. Nothing auto-advances; no timer-driven fake progress.

  const value = useMemo<EmployeesContextValue>(
    () => ({
      state,
      employees: allEmployeeViews(state),
      messages: state.messages,
      timeline: state.timeline,
      isRunning: state.status === "running",
      isComplete: state.status === "complete",
      pause: () => dispatch({ type: "PAUSE" }),
      resume: () => dispatch({ type: "RESUME" }),
      reset: () => dispatch({ type: "RESET" }),
    }),
    [state]
  );

  return <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>;
}

export function useEmployees(): EmployeesContextValue {
  const ctx = useContext(EmployeesContext);
  if (!ctx) throw new Error("useEmployees must be used within an EmployeesProvider");
  return ctx;
}
