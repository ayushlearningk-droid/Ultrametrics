"use client";

/**
 * Workspace Memory — editable presentation state (Sprint 63S).
 *
 * The studio's remembered preferences. Unlike the (fixed) Marketing DNA, this is
 * operator-editable — brand/tone/language/audience/campaign/UGC/CTA/creative
 * preferences that the Generation Runtime automatically inherits when building
 * campaign plans. Presentation state only: deterministic defaults, no backend,
 * no persistence, no API.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface WorkspaceMemory {
  brandPreferences: string;
  tone: string;
  language: string;
  audience: string;
  campaignStyle: string;
  ugcPreferences: string;
  ctaPreferences: string;
  creativePreferences: string;
}

export const MEMORY_FIELDS: { key: keyof WorkspaceMemory; label: string; multiline?: boolean }[] = [
  { key: "brandPreferences", label: "Brand preferences", multiline: true },
  { key: "tone", label: "Tone" },
  { key: "language", label: "Language" },
  { key: "audience", label: "Audience" },
  { key: "campaignStyle", label: "Campaign style" },
  { key: "ugcPreferences", label: "UGC preferences", multiline: true },
  { key: "ctaPreferences", label: "CTA preferences" },
  { key: "creativePreferences", label: "Creative preferences", multiline: true },
];

export const DEFAULT_WORKSPACE_MEMORY: WorkspaceMemory = {
  brandPreferences: "Lead with results, keep it warm and editorial, never hypey",
  tone: "Confident, friendly, expert",
  language: "English",
  audience: "Skin-conscious women 25–40 who research before buying",
  campaignStyle: "Problem-first hooks with a clean, bright look",
  ugcPreferences: "Real creators, natural daylight, first-person to-camera",
  ctaPreferences: "Direct and low-friction (\"Start today\")",
  creativePreferences: "Short videos, fast first 3 seconds, captions on",
};

interface WorkspaceMemoryContextValue {
  memory: WorkspaceMemory;
  setField: (key: keyof WorkspaceMemory, value: string) => void;
}

const WorkspaceMemoryContext = createContext<WorkspaceMemoryContextValue | null>(null);

export function WorkspaceMemoryProvider({
  initial = DEFAULT_WORKSPACE_MEMORY,
  children,
}: {
  initial?: WorkspaceMemory;
  children: ReactNode;
}) {
  const [memory, setMemory] = useState<WorkspaceMemory>(initial);
  const value = useMemo<WorkspaceMemoryContextValue>(
    () => ({
      memory,
      setField: (key, val) => setMemory((m) => ({ ...m, [key]: val })),
    }),
    [memory]
  );
  return <WorkspaceMemoryContext.Provider value={value}>{children}</WorkspaceMemoryContext.Provider>;
}

/** Read + edit the active Workspace Memory. Falls back to defaults outside a provider. */
export function useWorkspaceMemory(): WorkspaceMemoryContextValue {
  return (
    useContext(WorkspaceMemoryContext) ?? {
      memory: DEFAULT_WORKSPACE_MEMORY,
      setField: () => {},
    }
  );
}
