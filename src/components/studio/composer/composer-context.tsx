"use client";

/**
 * Production Prompt Composer — brief state (Sprint 63).
 *
 * Holds the outcome-first brief the composer assembles. Presentation/state only
 * — no generation, no I/O. Every selector reads/writes one field via setField,
 * which keeps each selector independently reusable.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PlatformId } from "@/components/studio/media";

export interface Brief {
  outcome?: string;
  audience?: string;
  platform?: PlatformId;
  brand?: string;
  campaign?: string;
  objective?: string;
  budget: number;
  tone?: string;
  duration?: string;
  language?: string;
  creativeStyle?: string;
  offer: string;
  cta?: string;
}

const INITIAL: Brief = { budget: 5000, offer: "", brand: "default", language: "en" };

/** Fields that count toward completeness / cost (excludes always-set defaults). */
const COUNTED_FIELDS: (keyof Brief)[] = [
  "outcome",
  "audience",
  "platform",
  "campaign",
  "objective",
  "tone",
  "duration",
  "creativeStyle",
  "cta",
];

interface ComposerValue {
  brief: Brief;
  setField: <K extends keyof Brief>(key: K, value: Brief[K]) => void;
  reset: () => void;
  /** How many meaningful fields are filled (drives the cost estimate). */
  filledCount: number;
  /** Whether the brief has enough to "generate" (an outcome + offer). */
  ready: boolean;
}

const ComposerContext = createContext<ComposerValue | null>(null);

export function ComposerProvider({ children }: { children: React.ReactNode }) {
  const [brief, setBrief] = useState<Brief>(INITIAL);

  const setField = useCallback(<K extends keyof Brief>(key: K, value: Brief[K]) => {
    setBrief((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = useMemo<ComposerValue>(() => {
    const filledCount = COUNTED_FIELDS.filter((k) => Boolean(brief[k])).length + (brief.offer ? 1 : 0);
    return {
      brief,
      setField,
      reset: () => setBrief(INITIAL),
      filledCount,
      ready: Boolean(brief.outcome) && brief.offer.trim().length > 0,
    };
  }, [brief, setField]);

  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

export function useComposer(): ComposerValue {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error("useComposer must be used within a ComposerProvider");
  return ctx;
}
