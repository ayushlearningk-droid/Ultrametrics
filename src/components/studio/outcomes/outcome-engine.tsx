"use client";

/**
 * Outcome Engine — context (Sprint 63J).
 *
 * Holds the selected outcome and its deterministically-assembled plan. No
 * generation, no I/O — selecting an outcome simply assembles the plan chain.
 */

import { createContext, useContext, useMemo, useState } from "react";
import { buildPlan, outcomeById, type Outcome, type PlanStep } from "./outcomes-data";

interface OutcomeEngineValue {
  outcome: Outcome | null;
  plan: PlanStep[];
  selectOutcome: (id: string) => void;
  clear: () => void;
}

const OutcomeEngineContext = createContext<OutcomeEngineValue | null>(null);

export function OutcomeEngineProvider({ children }: { children: React.ReactNode }) {
  const [outcomeId, setOutcomeId] = useState<string | null>(null);

  const value = useMemo<OutcomeEngineValue>(
    () => ({
      outcome: outcomeId ? outcomeById(outcomeId) ?? null : null,
      plan: outcomeId ? buildPlan(outcomeId) : [],
      selectOutcome: (id: string) => setOutcomeId(id),
      clear: () => setOutcomeId(null),
    }),
    [outcomeId]
  );

  return <OutcomeEngineContext.Provider value={value}>{children}</OutcomeEngineContext.Provider>;
}

export function useOutcome(): OutcomeEngineValue {
  const ctx = useContext(OutcomeEngineContext);
  if (!ctx) throw new Error("useOutcome must be used within an OutcomeEngineProvider");
  return ctx;
}
